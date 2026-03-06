import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Calendar, MapPin, Download, FileText, Navigation, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TirthYatraRequest } from "@shared/schema";

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

export default function TirthYatraAdminPage() {
  const { data, isLoading } = useQuery<TirthYatraRequest[]>({
    queryKey: ["/api/admin/tirth-yatra"],
  });

  const [selected, setSelected] = useState<TirthYatraRequest | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [adminNote, setAdminNote] = useState<string>("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("PATCH", `/api/admin/tirth-yatra/${selected.id}`, { status, adminNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tirth-yatra"] });
      setSelected(null);
    },
  });

  const openDetails = (req: TirthYatraRequest) => {
    setSelected(req);
    setStatus(req.status);
    setAdminNote(req.adminNote || "");
  };

  const list = data || [];
  const sorted = list.slice().sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());

  const openInMaps = (req: TirthYatraRequest) => {
    if (req.currentLatitude && req.currentLongitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${req.currentLatitude},${req.currentLongitude}`;
      window.open(url, "_blank");
    } else if (req.currentLocationLabel) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(req.currentLocationLabel)}`;
      window.open(url, "_blank");
    }
  };

  const handleExportCSV = () => {
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
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sorted.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">All Requests</CardTitle>
          <CardDescription className="text-xs">Click a request to see full details and update status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No requests yet.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((req, index) => {
                const created = req.createdAt
                  ? new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "";
                const dest = req.destinationOther || req.destination || "";
                const badgeClass = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => openDetails(req)}
                    className="w-full text-left border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 font-semibold text-slate-700 text-sm">
                      {index + 1}
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
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tirth Yatra Request Details</DialogTitle>
          </DialogHeader>
          {selected && (
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

              {((selected as any).ocrAadhaarText || (selected as any).ocrVoterText) && (
                <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
                  <p className="font-semibold text-slate-800">OCR Data</p>
                  {(selected as any).ocrAadhaarText && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Aadhaar OCR</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-24">{((selected as any).ocrAadhaarText as string)}</pre>
                    </div>
                  )}
                  {(selected as any).ocrVoterText && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Voter ID OCR</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-24">{((selected as any).ocrVoterText as string)}</pre>
                    </div>
                  )}
                </div>
              )}

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
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
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
