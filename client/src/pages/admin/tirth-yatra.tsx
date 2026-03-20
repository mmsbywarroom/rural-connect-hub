import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Calendar, MapPin, Download, FileText, Navigation, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TirthYatraRequest } from "@shared/schema";

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200",
};

function escapeCSVField(value: string): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function AttachmentCard({
  src,
  label,
}: {
  src: string | null | undefined;
  label: string;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  if (!src) return null;
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `${label.replace(/\s+/g, "-")}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  return (
    <div className="border rounded-lg p-2 bg-slate-50">
      <p className="text-xs font-semibold text-slate-700 mb-1">{label}</p>
      <img src={src} alt={label} className="rounded border h-24 object-cover w-full mb-2" />
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setViewOpen(true)}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleDownload}
        >
          <Download className="h-3 w-3 mr-1" />
          Download
        </Button>
      </div>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <img src={src} alt={label} className="w-full rounded-md" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function downloadSelectedAsPDF(req: TirthYatraRequest) {
  const win = window.open("", "_blank");
  if (!win) return;
  const dest = req.destinationOther || req.destination || "";
  const startDate = req.startDate ? new Date(req.startDate).toLocaleDateString("en-IN") : "—";
  const endDate = req.endDate ? new Date(req.endDate).toLocaleDateString("en-IN") : "—";
  const familyRows = Array.isArray(req.familyMembers) && req.familyMembers.length > 0
    ? (req.familyMembers as any[]).map((m, i) => `<tr><td>${i + 1}</td><td>${m?.name || "—"}</td><td>${m?.mobileNumber || "—"}</td></tr>`).join("")
    : "<tr><td colspan='3'>—</td></tr>";
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>Tirth Yatra Request - ${req.applicantName}</title>
    <style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto}
    table{border-collapse:collapse;width:100%;margin:10px 0}
    th,td{border:1px solid #ccc;padding:8px;text-align:left}
    th{background:#f5f5f5}
    h1{color:#047857}
    .section{margin:16px 0}
    img{max-width:150px;height:auto;margin:4px}
    </style></head>
    <body>
    <h1>Tirth Yatra Request</h1>
    <div class="section">
      <p><strong>Applicant:</strong> ${req.applicantName}</p>
      <p><strong>Mobile:</strong> ${req.mobileNumber} ${req.mobileVerified ? "(Verified)" : ""}</p>
      <p><strong>DOB:</strong> ${req.dob || "—"} | <strong>Age:</strong> ${req.age ?? "—"} | <strong>Gender:</strong> ${req.gender || "—"}</p>
      <p><strong>Unit/Village:</strong> ${req.villageName || "—"}</p>
      <p><strong>Destination:</strong> ${dest}</p>
      <p><strong>Dates:</strong> ${startDate} – ${endDate}</p>
      <p><strong>Current Location:</strong> ${req.currentLocationLabel || "—"}</p>
      <p><strong>Status:</strong> ${req.status} | <strong>Admin Note:</strong> ${req.adminNote || "—"}</p>
    </div>
    ${req.withFamily ? `<div class="section"><h3>Family Members</h3><table><tr><th>#</th><th>Name</th><th>Mobile</th></tr>${familyRows}</table></div>` : ""}
    ${req.aadhaarFrontUrl ? `<div class="section"><h3>Aadhaar Front</h3><img src="${req.aadhaarFrontUrl}" alt="Aadhaar front" /></div>` : ""}
    ${req.aadhaarBackUrl ? `<div class="section"><h3>Aadhaar Back</h3><img src="${req.aadhaarBackUrl}" alt="Aadhaar back" /></div>` : ""}
    ${req.voterCardUrl ? `<div class="section"><h3>Voter Card</h3><img src="${req.voterCardUrl}" alt="Voter card" /></div>` : ""}
    ${(req as any).ocrAadhaarText ? `<div class="section"><h3>OCR Aadhaar</h3><pre>${(req as any).ocrAadhaarText}</pre></div>` : ""}
    ${(req as any).ocrVoterText ? `<div class="section"><h3>OCR Voter</h3><pre>${(req as any).ocrVoterText}</pre></div>` : ""}
    ${req.audioNoteText ? `<div class="section"><h3>Audio Note Text</h3><p>${req.audioNoteText}</p></div>` : ""}
    <p style="margin-top:24px;font-size:12px;color:#666">Generated on ${new Date().toLocaleString("en-IN")}</p>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

type TirthListResponse = {
  items: TirthYatraRequest[];
  total: number;
  limit: number;
  offset: number;
};

export default function TirthYatraAdminPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    const openId = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("open");
    if (openId) setSelectedId(openId);
  }, []);

  const adminAssignedVillages: string[] = (() => {
    try {
      const stored = localStorage.getItem("adminAssignedVillages");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();
  const villageIdsParam = adminAssignedVillages.length > 0 ? adminAssignedVillages.join(",") : "";

  const { data: listResponse, isLoading } = useQuery<TirthListResponse>({
    queryKey: ["/api/admin/tirth-yatra", page, debouncedSearch, statusFilter, villageIdsParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      const q = debouncedSearch.trim();
      if (q) params.set("search", q);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (villageIdsParam) params.set("villageIds", villageIdsParam);
      const res = await fetch(`/api/admin/tirth-yatra?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      return res.json();
    },
  });

  const { data: selected, isLoading: detailLoading } = useQuery<TirthYatraRequest>({
    queryKey: ["/api/admin/tirth-yatra", selectedId, "detail"],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/tirth-yatra/${selectedId}`);
      return res.json();
    },
  });

  const [status, setStatus] = useState<string>("pending");
  const [adminNote, setAdminNote] = useState<string>("");

  useEffect(() => {
    if (selected) {
      setStatus(selected.status || "pending");
      setAdminNote(selected.adminNote || "");
    }
  }, [selected]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("PATCH", `/api/admin/tirth-yatra/${selected.id}`, { status, adminNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tirth-yatra"], exact: false });
      setSelectedId(null);
    },
  });

  const openDetails = (id: string) => {
    setSelectedId(id);
  };

  const paged = listResponse?.items ?? [];
  const listTotal = listResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(listTotal / PAGE_SIZE) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [listTotal, page]);

  const openInMaps = (req: TirthYatraRequest) => {
    if (req.currentLatitude && req.currentLongitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${req.currentLatitude},${req.currentLongitude}`;
      window.open(url, "_blank");
    } else if (req.currentLocationLabel) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(req.currentLocationLabel)}`;
      window.open(url, "_blank");
    }
  };

  const handleExportCSV = async () => {
    const params = new URLSearchParams();
    params.set("limit", "25000");
    params.set("offset", "0");
    const q = debouncedSearch.trim();
    if (q) params.set("search", q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (villageIdsParam) params.set("villageIds", villageIdsParam);
    const res = await fetch(`/api/admin/tirth-yatra?${params.toString()}`, { credentials: "include" });
    if (!res.ok) return;
    const json = (await res.json()) as TirthListResponse;
    const sorted = (json.items || []).slice().sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());
    const headers = [
      "S.No", "Applicant", "Mobile", "Village", "Destination", "Start Date", "End Date",
      "Current Location", "Status", "Admin Note", "Created At"
    ];
    const rows = sorted.map((req, idx) => [
      String(idx + 1),
      req.applicantName,
      req.mobileNumber,
      req.villageName || "",
      req.destinationOther || req.destination || "",
      req.startDate || "",
      req.endDate || "",
      (req.currentLocationLabel || "").replace(/\n/g, " "),
      req.status || "",
      (req.adminNote || "").replace(/\n/g, " "),
      req.createdAt ? new Date(req.createdAt).toLocaleString("en-IN") : "",
    ]);
    const csv = [headers.map(escapeCSVField).join(","), ...rows.map(r => r.map(escapeCSVField).join(","))].join("\n");
    downloadCSV(csv, `tirth-yatra-requests-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Tirth Yatra Requests
          </h1>
          <CardDescription>Review and update status of Tirth Yatra applications.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleExportCSV()} disabled={listTotal === 0}>
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, village, destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardTitle className="text-sm font-semibold">Requests</CardTitle>
          <CardDescription className="text-xs">Click a request to see full details and update status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : paged.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {paged.map((req, index) => {
                const created = req.createdAt
                  ? new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "";
                const dest = req.destinationOther || req.destination || "";
                const badgeClass = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => openDetails(req.id)}
                    className="w-full text-left border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 font-semibold text-slate-700 text-sm">
                      {page * PAGE_SIZE + index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {req.applicantName} – {dest}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{created}</span>
                        {req.villageName && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {req.villageName}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <Badge className={badgeClass}>{req.status}</Badge>
                  </button>
                );
              })}
            </div>
          )}
          {listTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Showing {listTotal === 0 ? 0 : page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, listTotal)} of {listTotal}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tirth Yatra Request Details</DialogTitle>
          </DialogHeader>
          {(detailLoading || !selected) && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!detailLoading && selected && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-end gap-2">
                {(selected.currentLatitude && selected.currentLongitude) || selected.currentLocationLabel ? (
                  <Button variant="outline" size="sm" onClick={() => openInMaps(selected)}>
                    <Navigation className="h-3 w-3 mr-1" />
                    Open in Maps
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => downloadSelectedAsPDF(selected)}>
                  <FileText className="h-3 w-3 mr-1" />
                  Download PDF
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-slate-800">Applicant</p>
                  <p className="text-slate-700">{selected.applicantName}</p>
                  <p className="text-xs text-slate-500">
                    {selected.gender && `Gender: ${selected.gender}`}{selected.age != null && ` • Age: ${selected.age}`}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Contact</p>
                  <p className="text-slate-700">{selected.mobileNumber}</p>
                  <p className="text-xs text-slate-500">
                    {selected.mobileVerified ? "Mobile verified" : "Mobile not verified"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Unit / Village</p>
                  <p className="text-slate-700">{selected.villageName || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Tirth place</p>
                  <p className="text-slate-700">{selected.destinationOther || selected.destination}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Journey dates</p>
                  <p className="text-slate-700">
                    {selected.startDate
                      ? new Date(selected.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}{" "}
                    –{" "}
                    {selected.endDate
                      ? new Date(selected.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Current location</p>
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {selected.currentLocationLabel || "—"}
                  </p>
                </div>
              </div>

              {selected.withFamily && Array.isArray(selected.familyMembers) && selected.familyMembers.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-800 mb-1">Family members</p>
                  <div className="space-y-1">
                    {(selected.familyMembers as any[]).map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-slate-50">
                        <span className="font-medium text-slate-700">{m?.name || "—"}</span>
                        <span className="text-slate-600">
                          {m?.mobileNumber}
                          {m?.mobileVerified && <span className="text-emerald-600 ml-1">• verified</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const ocrAadhaar = selected.ocrAadhaarText
                  ? (() => {
                      try {
                        return JSON.parse(selected.ocrAadhaarText as string) as { front?: Record<string, string>; back?: Record<string, string> };
                      } catch {
                        return null;
                      }
                    })()
                  : null;
                const ocrVoter = selected.ocrVoterText
                  ? (() => {
                      try {
                        return JSON.parse(selected.ocrVoterText as string) as Record<string, string>;
                      } catch {
                        return null;
                      }
                    })()
                  : null;
                const hasOcr = ocrAadhaar?.front || ocrAadhaar?.back || ocrVoter;
                if (!hasOcr) return null;
                const dash = "—";
                const front = ocrAadhaar?.front;
                const back = ocrAadhaar?.back;
                return (
                  <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
                    <p className="font-semibold text-slate-800 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      OCR Extracted Data
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-slate-600">Aadhaar Name</span>
                      <span className="text-slate-800">{front?.name || dash}</span>
                      <span className="text-slate-600">Aadhaar Number</span>
                      <span className="text-slate-800">{front?.aadhaarNumber || dash}</span>
                      <span className="text-slate-600">DOB</span>
                      <span className="text-slate-800">{front?.dob || dash}</span>
                      <span className="text-slate-600">Gender</span>
                      <span className="text-slate-800">{front?.gender || dash}</span>
                      <span className="text-slate-600">Address</span>
                      <span className="text-slate-800 col-span-1 sm:col-span-2">{back?.address || dash}</span>
                      <span className="text-slate-600">Voter ID</span>
                      <span className="text-slate-800 font-mono">{ocrVoter?.voterId || selected.ocrVoterId || dash}</span>
                      <span className="text-slate-600">Voter Name</span>
                      <span className="text-slate-800">{ocrVoter?.name || dash}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AttachmentCard src={selected.aadhaarFrontUrl} label="Aadhaar front" />
                <AttachmentCard src={selected.aadhaarBackUrl} label="Aadhaar back" />
                <AttachmentCard src={selected.voterCardUrl} label="Voter card" />
              </div>

              {selected.audioNoteUrl && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Audio note</p>
                  <audio controls src={selected.audioNoteUrl} className="w-full" />
                </div>
              )}
              {selected.audioNoteText && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Audio note text</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{selected.audioNoteText}</p>
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Status</span>
                  <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1">Admin note</p>
                  <Textarea
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
