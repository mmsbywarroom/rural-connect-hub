import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Users, Calendar, Download, FileText, MapPin, ListOrdered } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MahilaSammanSubmission } from "@shared/schema";

export interface MahilaSammanStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  closed: number;
  voterIdMapped: number;
  boothWise: { boothId: string; count: number }[];
  sakhiVoterListDetails: {
    submissionId: string;
    sakhiName: string;
    mobileNumber: string;
    voterId: string | null;
    voterListSrno: string | null;
    voterMappingSlNo: number | null;
    boothId: string | null;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printToPdf(title: string, htmlContent: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; color: #1e293b; }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    .meta { font-size: 0.875rem; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    .stat-block { margin-bottom: 16px; }
    .stat-row { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 8px; }
    .stat-item { padding: 8px 12px; background: #f8fafc; border-radius: 6px; min-width: 120px; }
    .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
    .stat-value { font-size: 1.25rem; font-weight: 700; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}

function DocLink({ src, label }: { src: string | null | undefined; label: string }) {
  const [viewOpen, setViewOpen] = useState(false);
  if (!src) return <span className="text-xs text-muted-foreground">Not uploaded</span>;
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
    <>
      <span className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setViewOpen(true)} className="text-xs text-blue-600 underline cursor-pointer">
          View {label}
        </button>
        <span className="text-slate-400">|</span>
        <button type="button" onClick={handleDownload} className="text-xs text-blue-600 underline cursor-pointer">
          Download
        </button>
      </span>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
          <img src={src} alt={label} className="w-full rounded-md" />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MahilaSammanAdminPage() {
  const { data: list = [], isLoading } = useQuery<MahilaSammanSubmission[]>({
    queryKey: ["/api/admin/mahila-samman"],
  });
  const { data: stats, isLoading: statsLoading } = useQuery<MahilaSammanStats>({
    queryKey: ["/api/admin/mahila-samman/stats"],
  });
  const [selected, setSelected] = useState<MahilaSammanSubmission | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [adminNote, setAdminNote] = useState("");
  const [search, setSearch] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("PATCH", `/api/admin/mahila-samman/${selected.id}`, { status, adminNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mahila-samman"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mahila-samman/stats"] });
      setSelected(null);
    },
  });

  const sorted = list.slice().sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());
  const filtered = !search.trim()
    ? sorted
    : sorted.filter(
        (s) =>
          (s.sakhiName || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.mobileNumber || "").includes(search) ||
          (s.id || "").toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Mahila Samman Rashi
        </h1>
        <CardDescription>Review submissions. Every woman ₹1,000/month; SC/ST women ₹1,500/month.</CardDescription>
      </div>

      {/* Summary stats */}
      {statsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-slate-50">
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Sakhi</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Has Voter ID</p>
                <p className="text-2xl font-bold text-blue-800">{stats.voterIdMapped}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">No Voter ID</p>
                <p className="text-2xl font-bold text-amber-800">{stats.total - stats.voterIdMapped}</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const html = `
                  <h1>Mahila Samman Rashi – Summary</h1>
                  <p class="meta">Generated on ${new Date().toLocaleString("en-IN")}</p>
                  <div class="stat-block">
                    <div class="stat-row">
                      <div class="stat-item"><div class="stat-label">Total Sakhi</div><div class="stat-value">${stats.total}</div></div>
                      <div class="stat-item"><div class="stat-label">Has Voter ID</div><div class="stat-value">${stats.voterIdMapped}</div></div>
                      <div class="stat-item"><div class="stat-label">No Voter ID</div><div class="stat-value">${stats.total - stats.voterIdMapped}</div></div>
                    </div>
                  </div>
                `;
                printToPdf("Mahila Samman Summary", html);
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Download PDF (Summary)
            </Button>
          </div>

          {/* Booth-wise count */}
          {stats.boothWise.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Booth-wise Sakhi count (all unique booths from voter mapping)
                </CardTitle>
                <p className="text-xs font-medium text-slate-700 mt-1">Count = number of Sakhi mapped to this booth.</p>
                <CardDescription>All booth numbers from voter mapping. Count 0 = booth where no Sakhi has been added yet.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rows = stats.boothWise.map((r) => `<tr><td>${r.boothId}</td><td>${r.count}</td></tr>`).join("");
                      const html = `
                        <h1>Booth-wise Sakhi count</h1>
                        <p class="meta">Count = number of Sakhi mapped to this booth. Generated on ${new Date().toLocaleString("en-IN")}</p>
                        <table><thead><tr><th>Booth Number</th><th>Count</th></tr></thead><tbody>${rows}</tbody></table>
                      `;
                      printToPdf("Mahila Samman Booth-wise Count", html);
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-600">
                        <th className="py-2 pr-4 font-medium">Booth Number</th>
                        <th className="py-2 font-medium">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.boothWise.map((row) => (
                        <tr key={row.boothId} className="border-b border-slate-100">
                          <td className="py-2 pr-4 font-mono">{row.boothId}</td>
                          <td className="py-2 font-semibold">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sakhi – Voter list number details */}
          {stats.sakhiVoterListDetails.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Sakhi – Voter list number (details)
                </CardTitle>
                <CardDescription>All added Sakhi. Voter list Sr No is from voter mapping.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rows = stats.sakhiVoterListDetails.map(
                        (r) =>
                          `<tr><td>${escapeHtml(r.sakhiName)}</td><td>${escapeHtml(r.mobileNumber)}</td><td>${escapeHtml(r.voterId || "—")}</td><td>${r.voterMappingSlNo ?? "—"}</td><td>${escapeHtml(r.boothId ?? "—")}</td></tr>`
                      ).join("");
                      const html = `
                        <h1>Sakhi – Voter list number (details)</h1>
                        <p class="meta">Voter list Sr No from voter mapping. Generated on ${new Date().toLocaleString("en-IN")}</p>
                        <table><thead><tr><th>Sakhi Name</th><th>Mobile</th><th>Voter ID</th><th>Voter list Sr No</th><th>Booth</th></tr></thead><tbody>${rows}</tbody></table>
                      `;
                      printToPdf("Mahila Samman Sakhi Voter List Details", html);
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </Button>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr className="text-left text-slate-600">
                        <th className="py-2 pr-2 font-medium">Sakhi Name</th>
                        <th className="py-2 pr-2 font-medium">Mobile</th>
                        <th className="py-2 pr-2 font-medium">Voter ID</th>
                        <th className="py-2 pr-2 font-medium">Voter list Sr No</th>
                        <th className="py-2 font-medium">Booth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.sakhiVoterListDetails.map((row) => (
                        <tr key={row.submissionId} className="border-b border-slate-100">
                          <td className="py-2 pr-2">{row.sakhiName}</td>
                          <td className="py-2 pr-2">{row.mobileNumber}</td>
                          <td className="py-2 pr-2 font-mono text-xs">{row.voterId || "—"}</td>
                          <td className="py-2 pr-2 font-mono">{row.voterMappingSlNo ?? "—"}</td>
                          <td className="py-2 font-mono text-xs">{row.boothId ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">All Submissions</CardTitle>
          <Input
            placeholder="Search by name, mobile, ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs mt-2"
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No submissions yet.</p>
          ) : (
            filtered.map((s, idx) => {
              const created = s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
              const badgeClass = STATUS_COLORS[s.status || "pending"] || STATUS_COLORS.pending;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelected(s);
                    setStatus(s.status || "pending");
                    setAdminNote(s.adminNote || "");
                  }}
                  className="w-full text-left border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 font-semibold text-purple-700 text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {s.sakhiName} – {s.mobileNumber}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {created}
                      {s.villageName && (
                        <>
                          <span className="mx-1">•</span>
                          {s.villageName}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge className={badgeClass}>{s.status}</Badge>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mahila Samman Rashi – Submission Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-slate-600 text-xs">Sakhi Name</p>
                  <p className="text-slate-800">{selected.sakhiName}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600 text-xs">Mobile</p>
                  <p className="text-slate-800">{selected.mobileNumber} {selected.mobileVerified ? "(Verified)" : ""}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600 text-xs">Father/Husband Name</p>
                  <p className="text-slate-800">{selected.fatherHusbandName || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600 text-xs">Unit / Village</p>
                  <p className="text-slate-800">{selected.villageName || "—"}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1">Consent</p>
                <div className="space-y-1 text-xs">
                  {selected.consentServeSakhi50 != null ? (
                    <p className="text-slate-700">
                      <span className="text-slate-600">Serve as Sakhi, 50 women benefit:</span> {selected.consentServeSakhi50 ? "Yes" : "No"}
                    </p>
                  ) : (
                    <p className="text-slate-500">—</p>
                  )}
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1">OCR Aadhaar Data</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-600">Name:</span><span>{selected.ocrAadhaarName || "—"}</span>
                  <span className="text-slate-600">Number:</span><span>{selected.ocrAadhaarNumber || "—"}</span>
                  <span className="text-slate-600">DOB:</span><span>{selected.ocrAadhaarDob || "—"}</span>
                  <span className="text-slate-600">Gender:</span><span>{selected.ocrAadhaarGender || "—"}</span>
                  <span className="text-slate-600 col-span-2">Address:</span>
                  <span className="col-span-2">{selected.ocrAadhaarAddress || "—"}</span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1">Voter ID & Match</p>
                <p className="text-xs text-slate-600">Voter ID: {selected.ocrVoterId || "—"} | Name: {selected.ocrVoterName || "—"}</p>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-600">Booth ID:</span><span>{selected.voterMappingBoothId || "—"}</span>
                  <span className="text-slate-600">Name:</span><span>{selected.voterMappingName || "—"}</span>
                  <span className="text-slate-600">Father Name:</span><span>{selected.voterMappingFatherName || "—"}</span>
                  <span className="text-slate-600">Village:</span><span>{selected.voterMappingVillageName || "—"}</span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Documents
                </p>
                <div className="space-y-1.5 text-sm">
                  <div><DocLink src={selected.aadhaarFront} label="Aadhaar Front" /></div>
                  <div><DocLink src={selected.aadhaarBack} label="Aadhaar Back" /></div>
                  <div><DocLink src={selected.sakhiPhoto} label="Sakhi Live Photo" /></div>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Status</span>
                  <select
                    className="border rounded-md px-2 py-1 text-xs bg-white"
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
                  <Textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
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
