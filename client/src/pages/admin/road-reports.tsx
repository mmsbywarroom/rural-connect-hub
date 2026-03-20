import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  MapPin,
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Mic,
  Video,
  Route as RouteIcon,
} from "lucide-react";
import type { RoadReport } from "@shared/schema";

const PAGE_SIZE = 10;

interface ReportWithLogs extends RoadReport {
  logs?: {
    id: string;
    reportId: string;
    action: string;
    note: string | null;
    performedBy: string | null;
    performedByName: string | null;
    createdAt: string | null;
  }[];
}

interface DetailProps {
  report: ReportWithLogs;
  onBack: () => void;
  onRefresh: () => void;
}

function JourneyTimeline({ report }: { report: ReportWithLogs }) {
  if (!report.logs || report.logs.length === 0) return null;
  const sorted = [...report.logs].sort(
    (a, b) => new Date(a.createdAt || "").getTime() - new Date(b.createdAt || "").getTime()
  );
  const actionColor: Record<string, string> = {
    submitted: "border-slate-300 bg-slate-50",
    note: "border-blue-300 bg-blue-50",
    completed: "border-green-400 bg-green-50",
  };
  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <RouteIcon className="h-3.5 w-3.5" />
        Journey / Notes
      </div>
      <div className="relative pl-4 space-y-3">
        <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200" />
        {sorted.map((log, i) => (
          <div key={log.id} className="relative">
            <div
              className={`absolute -left-4 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                i === sorted.length - 1 ? "border-green-500 bg-green-100" : "border-slate-300 bg-white"
              }`}
            />
            <div className={`p-2 rounded-md border-l-2 text-xs ${actionColor[log.action] || "border-slate-300 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold capitalize">
                  {log.action === "note"
                    ? "Note"
                    : log.action === "submitted"
                    ? "Submitted"
                    : "Completed"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                </span>
              </div>
              {log.note && <p className="mt-1 text-slate-700">{log.note}</p>}
              {log.performedByName && <p className="mt-0.5 text-[10px] text-slate-500">{log.performedByName}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportDetail({ report, onBack, onRefresh }: DetailProps) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [completionNote, setCompletionNote] = useState("");

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/road/reports/${report.id}/note`, {
        note: note.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      setNote("");
      toast({ title: "Note added" });
      onRefresh();
    },
    onError: () => {
      toast({ title: "Failed to add note", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/road/reports/${report.id}/complete`, {
        completionNote: completionNote.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      setCompletionNote("");
      toast({ title: "Marked as completed" });
      onRefresh();
    },
    onError: () => {
      toast({ title: "Failed to complete report", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">
            {report.villageName || "Unknown unit"}
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {report.startLatitude && report.startLongitude && report.endLatitude && report.endLongitude
              ? `Start: ${report.startLatitude}, ${report.startLongitude} · End: ${report.endLatitude}, ${report.endLongitude}`
              : "No coordinates"}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <RouteIcon className="h-4 w-4" /> Report Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Reporter</span>
                <p className="font-medium">{report.reporterName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mobile</span>
                <p className="font-medium">
                  {report.mobileNumber}{" "}
                  {report.mobileVerified ? (
                    <span className="text-[10px] text-green-600">(verified)</span>
                  ) : null}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium capitalize">{report.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Distance</span>
                <p className="font-medium">
                  {report.distanceKm ? `${report.distanceKm} km` : "—"}
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Description</span>
              <p className="text-sm font-medium mt-0.5 whitespace-pre-line">
                {report.description || "—"}
              </p>
            </div>
            <JourneyTimeline report={report} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Photos
              </h3>
              {report.photos && report.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {report.photos.map((p, idx) => (
                    <img
                      key={idx}
                      src={p}
                      alt={`Road ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-md border"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No photos</p>
              )}
            </CardContent>
          </Card>

          {report.video && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Video className="h-4 w-4" /> Video
                </h3>
                <video src={report.video} controls className="w-full rounded-md border" />
              </CardContent>
            </Card>
          )}

          {report.audioNote && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Mic className="h-4 w-4" /> Audio Note
                </h3>
                <audio controls className="w-full">
                  <source src={report.audioNote} />
                </audio>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Add processing note</label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a note for this report..."
              />
              <Button
                size="sm"
                onClick={() => addNoteMutation.mutate()}
                disabled={!note.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                Add Note
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mark as completed</label>
              <Textarea
                rows={3}
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Final completion note with brief details..."
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => completeMutation.mutate()}
                disabled={!completionNote.trim() || completeMutation.isPending}
              >
                {completeMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                Mark Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RoadReportsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { data: reports, isLoading, refetch } = useQuery<RoadReport[]>({
    queryKey: ["/api/road/reports"],
  });

  const allReports = (reports || []) as ReportWithLogs[];

  const filtered = allReports.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (r.villageName || "").toLowerCase().includes(q) ||
      (r.reporterName || "").toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.mobileNumber || "").toLowerCase().includes(q)
    );
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const startIndex = currentPage * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const totalUnits = new Set(allReports.map((r) => r.villageId || r.villageName || "")).size;
  const latestDate = allReports[0]?.createdAt
    ? new Date(allReports[0].createdAt).toLocaleString()
    : "—";

  const selectedReport = selectedId
    ? allReports.find((r) => r.id === selectedId) || null
    : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-blue-600" />
            Road Condition Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Review road damage reports, add notes and close after completion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Reports</p>
            <p className="text-lg font-semibold">{allReports.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Distinct Units</p>
            <p className="text-lg font-semibold">{totalUnits}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Latest</p>
            <p className="text-[13px] font-medium">{latestDate}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by unit, reporter, mobile or text..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{total} results</span>
              <span>·</span>
              <span>
                Page {currentPage + 1} of {totalPages}
              </span>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Unit</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                      Loading reports...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && pageItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                )}
                {pageItems.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.villageName || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.reporterName}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.mobileNumber}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "completed"
                            ? "default"
                            : r.status === "in_progress"
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.distanceKm ? `${r.distanceKm} km` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setSelectedId(r.id);
                          // fetch full report with logs
                          try {
                            const res = await apiRequest("GET", `/api/road/reports/${r.id}`);
                            const full: ReportWithLogs = await res.json();
                            // replace in local array so detail screen gets logs
                            const idx = allReports.findIndex((x) => x.id === r.id);
                            if (idx >= 0) {
                              allReports[idx] = full;
                            }
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-xs text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, total)} of {total}
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-3xl">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>Road Report Detail</DialogTitle>
              </DialogHeader>
              <ReportDetail
                report={selectedReport as ReportWithLogs}
                onBack={() => setSelectedId(null)}
                onRefresh={() => {
                  refetch();
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

