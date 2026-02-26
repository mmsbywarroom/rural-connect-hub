import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Clock, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Calendar, User, Phone, MapPin, FileText, CalendarDays, CalendarCheck } from "lucide-react";
import type { Appointment, AppointmentLog } from "@shared/schema";

const PAGE_SIZE = 10;

type AppointmentWithLogs = Appointment & { logs?: AppointmentLog[] };

function StatusBadge({ status, appointmentDate }: { status: string; appointmentDate?: string | null }) {
  if (status === "scheduled") return (
    <Badge className="bg-blue-100 text-blue-800 no-default-hover-elevate no-default-active-elevate">
      <CalendarCheck className="h-3 w-3 mr-1" />Scheduled{appointmentDate ? ` (${appointmentDate})` : ""}
    </Badge>
  );
  if (status === "resolved") return (
    <Badge className="bg-green-100 text-green-800 no-default-hover-elevate no-default-active-elevate">
      <CheckCircle className="h-3 w-3 mr-1" />Resolved
    </Badge>
  );
  return (
    <Badge className="bg-yellow-100 text-yellow-800 no-default-hover-elevate no-default-active-elevate">
      <Clock className="h-3 w-3 mr-1" />Pending
    </Badge>
  );
}

function JourneyTimeline({ logs }: { logs: AppointmentLog[] }) {
  if (!logs || logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No journey logs yet.</p>;
  }

  const sorted = [...logs].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return da - db;
  });

  return (
    <div className="space-y-3">
      {sorted.map((log, idx) => (
        <div key={log.id} className="flex gap-3" data-testid={`timeline-entry-${idx}`}>
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
            {idx < sorted.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
            {log.note && <p className="text-xs text-muted-foreground mt-0.5">{log.note}</p>}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {log.performedByName && <span>{log.performedByName}</span>}
              {log.createdAt && <span>{new Date(log.createdAt).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleDialog({ appointment, open, onClose }: { appointment: Appointment; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [appointmentDate, setAppointmentDate] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("adminUser") || "{}"); } catch { return {}; }
  })();

  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/appointment/appointments/${appointment.id}/schedule`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Appointment scheduled", description: `Date set to ${appointmentDate}` });
      queryClient.invalidateQueries({ queryKey: ["/api/appointment/appointments"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to schedule appointment", variant: "destructive" });
    },
  });

  const handleSchedule = () => {
    if (!appointmentDate) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }
    scheduleMutation.mutate({
      appointmentDate,
      adminNote: adminNote.trim() || undefined,
      performedBy: adminUser.id || adminUser.username || "admin",
      performedByName: adminUser.username || "Admin",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="appointment-date">Appointment Date</Label>
            <Input
              id="appointment-date"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              data-testid="input-appointment-date"
            />
          </div>
          <div>
            <Label htmlFor="admin-note">Note (optional)</Label>
            <Textarea
              id="admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add a note..."
              className="text-sm"
              data-testid="input-schedule-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-schedule">Cancel</Button>
          <Button onClick={handleSchedule} disabled={scheduleMutation.isPending} data-testid="button-confirm-schedule">
            {scheduleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolveDialog({ appointment, open, onClose }: { appointment: Appointment; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [completionNote, setCompletionNote] = useState("");

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("adminUser") || "{}"); } catch { return {}; }
  })();

  const resolveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/appointment/appointments/${appointment.id}/resolve`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Appointment marked as resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/appointment/appointments"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to resolve appointment", variant: "destructive" });
    },
  });

  const handleResolve = () => {
    if (!completionNote.trim()) {
      toast({ title: "Completion note is required", variant: "destructive" });
      return;
    }
    resolveMutation.mutate({
      completionNote: completionNote.trim(),
      performedBy: adminUser.id || adminUser.username || "admin",
      performedByName: adminUser.username || "Admin",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="completion-note">Completion Note (required)</Label>
            <Textarea
              id="completion-note"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Describe how this was resolved..."
              className="text-sm"
              data-testid="input-completion-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-resolve">Cancel</Button>
          <Button onClick={handleResolve} disabled={resolveMutation.isPending} data-testid="button-confirm-resolve">
            {resolveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Mark Resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentDetail({ appointment, onBack }: { appointment: AppointmentWithLogs; onBack: () => void }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const { data: detailData } = useQuery<{ appointment: Appointment; logs: AppointmentLog[] }>({
    queryKey: ["/api/appointment/appointments", appointment.id],
  });

  const logs = detailData?.logs || appointment.logs || [];

  const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium" data-testid={`text-field-${label.toLowerCase().replace(/\s/g, "-")}`}>{value || "\u2014"}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold" data-testid="text-appointment-name">{appointment.personName}</h2>
          <p className="text-sm text-muted-foreground">{appointment.villageName || "Unknown village"}</p>
        </div>
        <StatusBadge status={appointment.status} appointmentDate={appointment.appointmentDate} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Person Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" value={appointment.personName} />
              <Field label="Father/Husband" value={appointment.fatherHusbandName} />
              <Field label="Mobile" value={appointment.mobileNumber} />
              <Field label="Mobile Verified" value={appointment.mobileVerified ? "Yes" : "No"} />
              <Field label="Village" value={appointment.villageName} />
            </div>

            {appointment.address && (
              <div>
                <span className="text-xs text-muted-foreground">Address</span>
                <p className="text-sm font-medium mt-0.5" data-testid="text-address">{appointment.address}</p>
              </div>
            )}

            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mt-4">
              <FileText className="h-4 w-4" /> Appointment Details
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Description</span>
                <p className="text-sm font-medium mt-0.5" data-testid="text-description">{appointment.description}</p>
              </div>
              {appointment.documentPhoto && (
                <div>
                  <span className="text-xs text-muted-foreground">Document / Application</span>
                  <img
                    src={appointment.documentPhoto}
                    alt="Document"
                    className="max-h-60 rounded-lg border border-slate-200 mt-1 cursor-pointer"
                    onClick={() => window.open(appointment.documentPhoto!, "_blank")}
                    data-testid="img-appointment-document"
                  />
                </div>
              )}
              {appointment.audioNote && (
                <div>
                  <span className="text-xs text-muted-foreground">Audio Note</span>
                  <audio controls className="w-full mt-1" data-testid="audio-appointment-note">
                    <source src={appointment.audioNote} />
                  </audio>
                </div>
              )}
            </div>

            {appointment.status !== "pending" && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mt-4">
                  <CalendarDays className="h-4 w-4" /> Schedule & Resolution Info
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Appointment Date" value={appointment.appointmentDate} />
                  <Field label="Admin Note" value={appointment.adminNote} />
                  <Field label="Scheduled At" value={appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString() : undefined} />
                  {appointment.status === "resolved" && (
                    <>
                      <Field label="Completion Note" value={appointment.completionNote} />
                      <Field label="Resolved At" value={appointment.resolvedAt ? new Date(appointment.resolvedAt).toLocaleString() : undefined} />
                    </>
                  )}
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground mt-2">
              Submitted: {appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : "\u2014"}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Journey Timeline</h3>
              <JourneyTimeline logs={logs} />
            </CardContent>
          </Card>

          {appointment.status === "pending" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Actions</h3>
                <Button className="w-full" onClick={() => setScheduleOpen(true)} data-testid="button-schedule-appointment">
                  <CalendarCheck className="h-4 w-4 mr-1" /> Schedule Appointment
                </Button>
                <Button className="w-full bg-green-600" onClick={() => setResolveOpen(true)} data-testid="button-resolve-appointment-pending">
                  <CheckCircle className="h-4 w-4 mr-1" /> Mark as Resolved
                </Button>
              </CardContent>
            </Card>
          )}

          {appointment.status === "scheduled" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Actions</h3>
                <Button className="w-full bg-green-600" onClick={() => setResolveOpen(true)} data-testid="button-resolve-appointment">
                  <CheckCircle className="h-4 w-4 mr-1" /> Mark as Resolved
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleDialog appointment={appointment} open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      )}
      {resolveOpen && (
        <ResolveDialog appointment={appointment} open={resolveOpen} onClose={() => setResolveOpen(false)} />
      )}
    </div>
  );
}

export default function AppointmentSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointment/appointments"],
  });

  const adminAssignedVillages: string[] = (() => {
    try {
      const stored = localStorage.getItem("adminAssignedVillages");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();

  const areaFiltered = adminAssignedVillages.length > 0
    ? (appointments || []).filter(a => a.villageId && adminAssignedVillages.includes(a.villageId))
    : (appointments || []);

  const filtered = areaFiltered.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      a.personName.toLowerCase().includes(q) ||
      a.mobileNumber.includes(search) ||
      (a.villageName || "").toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selected = selectedId ? areaFiltered.find((a) => a.id === selectedId) : null;

  if (selected) {
    return <AppointmentDetail appointment={selected} onBack={() => setSelectedId(null)} />;
  }

  const pendingCount = areaFiltered.filter((a) => a.status === "pending").length;
  const scheduledCount = areaFiltered.filter((a) => a.status === "scheduled").length;
  const resolvedCount = areaFiltered.filter((a) => a.status === "resolved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Calendar className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-appointments-title">Appointments</h1>
          <p className="text-sm text-muted-foreground">Manage appointment requests and scheduling</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-count">{areaFiltered.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarCheck className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-scheduled-count">{scheduledCount}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-resolved-count">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, mobile, village, description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
            data-testid="input-search-appointments"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Father/Husband</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedId(a.id)}
                  data-testid={`row-appointment-${a.id}`}
                >
                  <TableCell data-testid={`text-person-${a.id}`}>{a.personName}</TableCell>
                  <TableCell>{a.fatherHusbandName}</TableCell>
                  <TableCell>{a.mobileNumber}</TableCell>
                  <TableCell>{a.villageName || "\u2014"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{a.description}</TableCell>
                  <TableCell><StatusBadge status={a.status} appointmentDate={a.appointmentDate} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {search || statusFilter !== "all" ? "No appointments match your filters" : "No appointments submitted yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-prev-page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-next-page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
