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
import { Search, Clock, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Megaphone, User, Phone, MapPin, FileText, CalendarDays, Play } from "lucide-react";
import type { SunwaiComplaint, SunwaiLog } from "@shared/schema";

const PAGE_SIZE = 10;

type ComplaintWithLogs = SunwaiComplaint & { logs?: SunwaiLog[] };

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") return <Badge className="bg-blue-100 text-blue-800 no-default-hover-elevate no-default-active-elevate"><Play className="h-3 w-3 mr-1" />Accepted</Badge>;
  if (status === "in-progress") return <Badge className="bg-yellow-100 text-yellow-800 no-default-hover-elevate no-default-active-elevate"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
  if (status === "completed") return <Badge className="bg-green-100 text-green-800 no-default-hover-elevate no-default-active-elevate"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
  return <Badge className="bg-orange-100 text-orange-800 no-default-hover-elevate no-default-active-elevate"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
}

function JourneyTimeline({ logs }: { logs: SunwaiLog[] }) {
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

function AcceptDialog({ complaint, open, onClose }: { complaint: SunwaiComplaint; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [expectedDays, setExpectedDays] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("adminUser") || "{}"); } catch { return {}; }
  })();

  const acceptMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/sunwai/complaints/${complaint.id}/accept`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Complaint accepted", description: `Timeline set to ${expectedDays} days` });
      queryClient.invalidateQueries({ queryKey: ["/api/sunwai/complaints"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept complaint", variant: "destructive" });
    },
  });

  const handleAccept = () => {
    const days = parseInt(expectedDays);
    if (!days || days < 1) {
      toast({ title: "Please enter valid expected days (at least 1)", variant: "destructive" });
      return;
    }
    acceptMutation.mutate({
      expectedDays: days,
      adminNote: adminNote.trim() || undefined,
      performedBy: adminUser.id || adminUser.username || "admin",
      performedByName: adminUser.username || "Admin",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Accept Complaint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="expected-days">Expected Days to Resolve</Label>
            <Input
              id="expected-days"
              type="number"
              min={1}
              value={expectedDays}
              onChange={(e) => setExpectedDays(e.target.value)}
              placeholder="e.g. 7"
              data-testid="input-expected-days"
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
              data-testid="input-accept-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-accept">Cancel</Button>
          <Button onClick={handleAccept} disabled={acceptMutation.isPending} data-testid="button-confirm-accept">
            {acceptMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteDialog({ complaint, open, onClose }: { complaint: SunwaiComplaint; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [completionNote, setCompletionNote] = useState("");

  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem("adminUser") || "{}"); } catch { return {}; }
  })();

  const completeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/sunwai/complaints/${complaint.id}/complete`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Complaint marked as completed" });
      queryClient.invalidateQueries({ queryKey: ["/api/sunwai/complaints"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete complaint", variant: "destructive" });
    },
  });

  const handleComplete = () => {
    if (!completionNote.trim()) {
      toast({ title: "Completion note is required", variant: "destructive" });
      return;
    }
    completeMutation.mutate({
      completionNote: completionNote.trim(),
      performedBy: adminUser.id || adminUser.username || "admin",
      performedByName: adminUser.username || "Admin",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Complaint</DialogTitle>
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
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-complete">Cancel</Button>
          <Button onClick={handleComplete} disabled={completeMutation.isPending} data-testid="button-confirm-complete">
            {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComplaintDetail({ complaint, onBack }: { complaint: ComplaintWithLogs; onBack: () => void }) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const { data: detailData } = useQuery<{ complaint: SunwaiComplaint; logs: SunwaiLog[] }>({
    queryKey: ["/api/sunwai/complaints", complaint.id],
  });

  const logs = detailData?.logs || complaint.logs || [];

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
          <h2 className="text-lg font-semibold" data-testid="text-complaint-name">{complaint.complainantName}</h2>
          <p className="text-sm text-muted-foreground">{complaint.villageName || "Unknown village"}</p>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Complainant Info
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name" value={complaint.complainantName} />
              <Field label="Father/Husband" value={complaint.fatherHusbandName} />
              <Field label="Mobile" value={complaint.mobileNumber} />
              <Field label="Mobile Verified" value={complaint.mobileVerified ? "Yes" : "No"} />
              <Field label="Village" value={complaint.villageName} />
            </div>

            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mt-4">
              <FileText className="h-4 w-4" /> Complaint Details
            </h3>
            <div className="space-y-2">
              <Field label="Issue Category" value={
                (complaint as any).otherCategoryText
                  ? `Other: ${(complaint as any).otherCategoryText}`
                  : (complaint as any).issueCategoryName || "\u2014"
              } />
              <div>
                <span className="text-xs text-muted-foreground">Complaint Note</span>
                <p className="text-sm font-medium mt-0.5" data-testid="text-complaint-note">{complaint.complaintNote}</p>
              </div>
              {complaint.audioNote && (
                <div>
                  <span className="text-xs text-muted-foreground">Audio Note</span>
                  <audio controls className="w-full mt-1" data-testid="audio-complaint-note">
                    <source src={complaint.audioNote} />
                  </audio>
                </div>
              )}
            </div>

            {complaint.status !== "pending" && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mt-4">
                  <CalendarDays className="h-4 w-4" /> Resolution Info
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expected Days" value={complaint.expectedDays} />
                  <Field label="Admin Note" value={complaint.adminNote} />
                  <Field label="Accepted At" value={complaint.acceptedAt ? new Date(complaint.acceptedAt).toLocaleString() : undefined} />
                  {complaint.status === "completed" && (
                    <>
                      <Field label="Completion Note" value={complaint.completionNote} />
                      <Field label="Completed At" value={complaint.completedAt ? new Date(complaint.completedAt).toLocaleString() : undefined} />
                    </>
                  )}
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground mt-2">
              Submitted: {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : "\u2014"}
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

          {complaint.status === "pending" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Actions</h3>
                <Button className="w-full" onClick={() => setAcceptOpen(true)} data-testid="button-accept-complaint">
                  <CheckCircle className="h-4 w-4 mr-1" /> Accept & Set Timeline
                </Button>
              </CardContent>
            </Card>
          )}

          {complaint.status === "accepted" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Actions</h3>
                <Button className="w-full bg-green-600" onClick={() => setCompleteOpen(true)} data-testid="button-complete-complaint">
                  <CheckCircle className="h-4 w-4 mr-1" /> Mark as Completed
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {acceptOpen && (
        <AcceptDialog complaint={complaint} open={acceptOpen} onClose={() => setAcceptOpen(false)} />
      )}
      {completeOpen && (
        <CompleteDialog complaint={complaint} open={completeOpen} onClose={() => setCompleteOpen(false)} />
      )}
    </div>
  );
}

export default function SunwaiSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: complaints, isLoading } = useQuery<SunwaiComplaint[]>({
    queryKey: ["/api/sunwai/complaints"],
  });

  const allComplaints = complaints || [];

  const filtered = allComplaints.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      c.complainantName.toLowerCase().includes(q) ||
      c.mobileNumber.includes(search) ||
      (c.villageName || "").toLowerCase().includes(q) ||
      c.complaintNote.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selected = selectedId ? allComplaints.find((c) => c.id === selectedId) : null;

  if (selected) {
    return <ComplaintDetail complaint={selected} onBack={() => setSelectedId(null)} />;
  }

  const pendingCount = allComplaints.filter((c) => c.status === "pending").length;
  const acceptedCount = allComplaints.filter((c) => c.status === "accepted").length;
  const completedCount = allComplaints.filter((c) => c.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Megaphone className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-sunwai-title">Sunwai (Hearing/Complaint)</h1>
          <p className="text-sm text-muted-foreground">Manage citizen complaints and hearings</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-count">{allComplaints.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Play className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-accepted-count">{acceptedCount}</p>
              <p className="text-xs text-muted-foreground">Accepted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-completed-count">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, mobile, village, complaint..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
            data-testid="input-search-complaints"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
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
                <TableHead>Complaint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedId(c.id)}
                  data-testid={`row-complaint-${c.id}`}
                >
                  <TableCell data-testid={`text-complainant-${c.id}`}>{c.complainantName}</TableCell>
                  <TableCell>{c.fatherHusbandName}</TableCell>
                  <TableCell>{c.mobileNumber}</TableCell>
                  <TableCell>{c.villageName || "\u2014"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.complaintNote}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {search || statusFilter !== "all" ? "No complaints match your filters" : "No complaints submitted yet"}
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
