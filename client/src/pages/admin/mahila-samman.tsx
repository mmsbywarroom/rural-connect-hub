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
  otpVerifiedSakhis: number;
  // Booth clustering coverage (100 voters per cluster, calculated per booth)
  clusterTotal: number;
  otpVerifiedUniqueClusters: number;
  clusterCoveragePercent: number;
  coveredClusters: {
    boothId: string;
    clusterNo: number;
    serialStart: number;
    serialEnd: number;
    mappedSakhiCount: number;
    otpSakhiCount: number;
  }[];
  uncoveredClusters: {
    boothId: string;
    clusterNo: number;
    serialStart: number;
    serialEnd: number;
    mappedSakhiCount: number;
  }[];
  clusterWiseSakhiCounts: {
    boothId: string;
    clusterNo: number;
    serialStart: number;
    serialEnd: number;
    sakhiCount: number;
  }[];
  voterCardUploadedSakhis: number;
  aadhaarUploadedSakhis: number;
  boothKnownSakhis: number;
  boothsMoreThanOneSakhi: number;
  boothsZeroSakhis: number;
  boothsTenSakhis: number;
  boothsExactlyOneSakhi: number;
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

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px 28px; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 1.4rem; margin-bottom: 6px; color: #0f172a; }
    h2 { font-size: 1.1rem; margin: 18px 0 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; color: #0f172a; }
    h2:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
    .meta { font-size: 0.85rem; color: #64748b; margin-bottom: 14px; }
    .section { margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 6px; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; }
    th, td { padding: 7px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #0f172a; color: #f9fafb; font-weight: 600; font-size: 0.8rem; letter-spacing: 0.03em; text-transform: uppercase; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    .stat-block { margin-bottom: 16px; }
    .stat-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
    .stat-item { padding: 8px 12px; background: linear-gradient(135deg,#eff6ff,#e0f2fe); border-radius: 8px; min-width: 150px; border: 1px solid #bfdbfe; }
    .stat-label { font-size: 0.70rem; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .stat-value { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
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

type BoothFilter = "gt1" | "zero" | "tenPlus" | "exactlyOne" | "";
type UncoveredClusterFilter = "mapped" | "zero" | "";

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
  const [boothFilter, setBoothFilter] = useState<BoothFilter>("");
  const [uncoveredClusterFilter, setUncoveredClusterFilter] = useState<UncoveredClusterFilter>("");
  const [uncoveredClusterSearch, setUncoveredClusterSearch] = useState("");
  const [coveredClusterFilter, setCoveredClusterFilter] = useState<UncoveredClusterFilter>("");
  const [coveredClusterSearch, setCoveredClusterSearch] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("DELETE", `/api/admin/mahila-samman/${selected.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mahila-samman"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mahila-samman/stats"] });
      setSelected(null);
    },
  });

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
        <CardDescription>
          Review submissions. Every woman ₹1,000/month; SC/ST women ₹1,500/month. Below summary shows OTP verified
          Sakhis, document uploads, and booth-wise distribution.
        </CardDescription>
      </div>

      {/* Summary stats */}
      {statsLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">OTP Verified Sakhis</p>
                <p className="text-2xl font-bold text-emerald-800">{stats.otpVerifiedSakhis}</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Cluster Coverage (OTP)</p>
                <p className="text-2xl font-bold text-indigo-800">{stats.clusterCoveragePercent}%</p>
                <p className="text-xs font-medium text-indigo-700 mt-1">
                  {stats.otpVerifiedUniqueClusters} / {stats.clusterTotal} clusters covered
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Extended stats as requested */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Voter Card Uploaded Sakhis
                </p>
                <p className="text-2xl font-bold text-slate-900">{stats.voterCardUploadedSakhis}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Aadhaar Uploaded Sakhis
                </p>
                <p className="text-2xl font-bold text-slate-900">{stats.aadhaarUploadedSakhis}</p>
              </CardContent>
            </Card>
            <Card
              role="button"
              className="cursor-pointer hover:border-slate-300"
              onClick={() => setBoothFilter("mapped")}
            >
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Booth Number Known Sakhis
                </p>
                <p className="text-2xl font-bold text-slate-900">{stats.boothKnownSakhis}</p>
              </CardContent>
            </Card>
            <Card
              role="button"
              className="cursor-pointer hover:border-slate-300"
              onClick={() => setBoothFilter("gt1")}
            >
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Booths with &gt; 1 Sakhi
                </p>
                <p className="text-2xl font-bold text-slate-900">{stats.boothsMoreThanOneSakhi}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card
              role="button"
              className="cursor-pointer hover:border-slate-300"
              onClick={() => setBoothFilter("zero")}
            >
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Booths with 0 Sakhis
                </p>
                <p className="text-2xl font-bold text-slate-900">{stats.boothsZeroSakhis}</p>
              </CardContent>
            </Card>
            <Card
              role="button"
              className="cursor-pointer hover:border-slate-300"
              onClick={() => setBoothFilter("tenPlus")}
            >
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Booths with 10+ Sakhis
                </p>
                <p className="text-2xl font-bold text-slate-900">{stats.boothsTenSakhis}</p>
              </CardContent>
            </Card>
            <Card
              role="button"
              className="cursor-pointer hover:border-slate-300"
              onClick={() => setBoothFilter("exactlyOne")}
            >
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Booths with exactly 1 Sakhi
                </p>
                <p className="text-2xl font-bold text-slate-900">{stats.boothsExactlyOneSakhi}</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const summaryHtml = `
                  <div class="section">
                    <h2>1. Summary</h2>
                    <div class="stat-block">
                      <div class="stat-row">
                        <div class="stat-item"><div class="stat-label">Has Voter ID</div><div class="stat-value">${stats.voterIdMapped}</div></div>
                        <div class="stat-item"><div class="stat-label">No Voter ID</div><div class="stat-value">${stats.total - stats.voterIdMapped}</div></div>
                        <div class="stat-item"><div class="stat-label">OTP Verified Sakhis</div><div class="stat-value">${stats.otpVerifiedSakhis}</div></div>
                      </div>
                      <div class="stat-row">
                        <div class="stat-item"><div class="stat-label">Voter Card Uploaded</div><div class="stat-value">${stats.voterCardUploadedSakhis}</div></div>
                        <div class="stat-item"><div class="stat-label">Aadhaar Uploaded</div><div class="stat-value">${stats.aadhaarUploadedSakhis}</div></div>
                        <div class="stat-item"><div class="stat-label">Booth Number Known Sakhis</div><div class="stat-value">${stats.boothKnownSakhis}</div></div>
                      </div>
                      <div class="stat-row">
                        <div class="stat-item"><div class="stat-label">Booths &gt; 1 Sakhi</div><div class="stat-value">${stats.boothsMoreThanOneSakhi}</div></div>
                        <div class="stat-item"><div class="stat-label">Booths with 0 Sakhis</div><div class="stat-value">${stats.boothsZeroSakhis}</div></div>
                        <div class="stat-item"><div class="stat-label">Booths with 10+ Sakhis</div><div class="stat-value">${stats.boothsTenSakhis}</div></div>
                      </div>
                      <div class="stat-row">
                        <div class="stat-item"><div class="stat-label">Booths with exactly 1 Sakhi</div><div class="stat-value">${stats.boothsExactlyOneSakhi}</div></div>
                      </div>
                    </div>
                  </div>
                `;
                const boothRows = stats.boothWise.map((r) => `<tr><td>${r.boothId}</td><td>${r.count}</td></tr>`).join("");
                const boothHtml = stats.boothWise.length > 0 ? `
                  <div class="section">
                    <h2>2. Booth-wise Sakhi count</h2>
                    <p class="meta">Count = number of Sakhi mapped to this booth. Booths with count &gt; 0 at top.</p>
                    <table><thead><tr><th>Booth Number</th><th>Count</th></tr></thead><tbody>${boothRows}</tbody></table>
                  </div>
                ` : "";
                const sakhiRows = stats.sakhiVoterListDetails.map(
                  (r) =>
                    `<tr><td>${escapeHtml(r.sakhiName)}</td><td>${escapeHtml(r.mobileNumber)}</td><td>${escapeHtml(r.voterId || "—")}</td><td>${r.voterMappingSlNo ?? "—"}</td><td>${escapeHtml(r.boothId ?? "—")}</td></tr>`
                ).join("");
                const sakhiHtml = stats.sakhiVoterListDetails.length > 0 ? `
                  <div class="section">
                    <h2>3. Sakhi – Voter list number (details)</h2>
                    <p class="meta">Voter list Sr No from voter mapping.</p>
                    <table><thead><tr><th>Sakhi Name</th><th>Mobile</th><th>Voter ID</th><th>Voter list Sr No</th><th>Booth</th></tr></thead><tbody>${sakhiRows}</tbody></table>
                  </div>
                ` : "";
                const html = `
                  <h1>Mahila Samman Rashi – Full Report</h1>
                  <p class="meta">Generated on ${new Date().toLocaleString("en-IN")}</p>
                  ${summaryHtml}
                  ${boothHtml}
                  ${sakhiHtml}
                `;
                printToPdf("Mahila Samman Full Report", html);
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Download PDF (All)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!stats) return;
                const rows = stats.sakhiVoterListDetails;
                const header = ["Sakhi Name","Mobile Number","Booth ID","Voter ID","Voter list Sr No"].join(",");
                const csvLines = rows.map(r => [
                  `"${(r.sakhiName || "").replace(/"/g, '""')}"`,
                  `"${(r.mobileNumber || "").replace(/"/g, '""')}"`,
                  `"${(r.boothId || "").replace(/"/g, '""')}"`,
                  `"${(r.voterId || "").replace(/"/g, '""')}"`,
                  `"${(r.voterMappingSlNo != null ? String(r.voterMappingSlNo) : r.voterListSrno || "").replace(/"/g, '""')}"`,
                ].join(","));
                const csv = [header, ...csvLines].join("\n");
                downloadCsv(csv, `mahila_samman_sakhis_${new Date().toISOString().slice(0,10)}.csv`);
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Download CSV (Sakhis)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const html = `
                  <h1>Mahila Samman Rashi – Summary</h1>
                  <p class="meta">Generated on ${new Date().toLocaleString("en-IN")}</p>
                  <div class="stat-block">
                    <div class="stat-row">
                      <div class="stat-item"><div class="stat-label">Has Voter ID</div><div class="stat-value">${stats.voterIdMapped}</div></div>
                      <div class="stat-item"><div class="stat-label">No Voter ID</div><div class="stat-value">${stats.total - stats.voterIdMapped}</div></div>
                    </div>
                    <div class="stat-row">
                      <div class="stat-item"><div class="stat-label">OTP Verified Sakhis</div><div class="stat-value">${stats.otpVerifiedSakhis}</div></div>
                      <div class="stat-item"><div class="stat-label">Voter Card Uploaded</div><div class="stat-value">${stats.voterCardUploadedSakhis}</div></div>
                      <div class="stat-item"><div class="stat-label">Aadhaar Uploaded</div><div class="stat-value">${stats.aadhaarUploadedSakhis}</div></div>
                    </div>
                    <div class="stat-row">
                      <div class="stat-item"><div class="stat-label">Booth Number Known Sakhis</div><div class="stat-value">${stats.boothKnownSakhis}</div></div>
                      <div class="stat-item"><div class="stat-label">Booths &gt; 1 Sakhi</div><div class="stat-value">${stats.boothsMoreThanOneSakhi}</div></div>
                      <div class="stat-item"><div class="stat-label">Booths with 0 Sakhis</div><div class="stat-value">${stats.boothsZeroSakhis}</div></div>
                      <div class="stat-item"><div class="stat-label">Booths with 10+ Sakhis</div><div class="stat-value">${stats.boothsTenSakhis}</div></div>
                    </div>
                    <div class="stat-row">
                      <div class="stat-item"><div class="stat-label">Booths with exactly 1 Sakhi</div><div class="stat-value">${stats.boothsExactlyOneSakhi}</div></div>
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

          {/* Booth-wise count (shown only when a filter card is clicked) */}
          {boothFilter && stats.boothWise.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Booth-wise Sakhi count –{" "}
                  {boothFilter === "mapped"
                    ? "booths with at least 1 Sakhi"
                    : boothFilter === "gt1"
                    ? "booths with more than 1 Sakhi (2–9)"
                    : boothFilter === "zero"
                    ? "booths with 0 Sakhis"
                    : boothFilter === "tenPlus"
                    ? "booths with 10+ Sakhis"
                    : "booths with exactly 1 Sakhi"}
                </CardTitle>
                <p className="text-xs font-medium text-slate-700 mt-1">
                  Count = number of Sakhis mapped to each booth. Click a summary card above to change this filter.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rows = stats.boothWise
                        .filter((r) =>
                          boothFilter === "mapped"
                            ? r.count > 0
                            : boothFilter === "gt1"
                            ? r.count > 1 && r.count < 10
                            : boothFilter === "zero"
                            ? r.count === 0
                            : boothFilter === "tenPlus"
                            ? r.count >= 10
                            : r.count === 1
                        )
                        .map((r) => `<tr><td>${r.boothId}</td><td>${r.count}</td></tr>`)
                        .join("");
                      const html = `
                        <h1>Booth-wise Sakhi count</h1>
                        <p class="meta">
                          Count = number of Sakhi mapped to this booth. Filter: ${
                            boothFilter === "mapped"
                              ? "booths with at least 1 Sakhi"
                              : boothFilter === "gt1"
                              ? "booths with more than 1 Sakhi (2–9)"
                              : boothFilter === "zero"
                              ? "booths with 0 Sakhis"
                              : boothFilter === "tenPlus"
                              ? "booths with 10+ Sakhis"
                              : "booths with exactly 1 Sakhi"
                          }. Generated on ${new Date().toLocaleString("en-IN")}
                        </p>
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
                      {stats.boothWise
                        .filter((row) =>
                          boothFilter === "mapped"
                            ? row.count > 0
                            : boothFilter === "gt1"
                            ? row.count > 1 && row.count < 10
                            : boothFilter === "zero"
                            ? row.count === 0
                            : boothFilter === "tenPlus"
                            ? row.count >= 10
                            : row.count === 1
                        )
                        .map((row) => (
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

          {/* Cluster-wise coverage (covered clusters list) */}
          {stats.coveredClusters && stats.coveredClusters.length > 0 && (
            <Card className="border-emerald-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Covered Clusters (OTP verified)
                </CardTitle>
                <CardDescription>
                  Clusters where at least one OTP verified Sakhi is mapped (cluster = 100 voters per booth).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.coveredClusters && stats.coveredClusters.length > 0 && (
                  <div className="flex justify-end mb-2 gap-2 flex-wrap">
                    <Button
                      variant={coveredClusterFilter === "" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCoveredClusterFilter("")}
                    >
                      All
                    </Button>
                    <Button
                      variant={coveredClusterFilter === "mapped" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCoveredClusterFilter("mapped")}
                    >
                      Mapped &gt; 0
                    </Button>
                    <Button
                      variant={coveredClusterFilter === "zero" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCoveredClusterFilter("zero")}
                    >
                      Mapped = 0
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-end mb-2 gap-2 flex-wrap">
                  <Input
                    value={coveredClusterSearch}
                    onChange={(e) => setCoveredClusterSearch(e.target.value)}
                    placeholder="Search booth or cluster"
                    className="max-w-xs"
                  />
                </div>

                <div className="text-xs text-slate-600 mb-2">
                  Total covered clusters:{" "}
                  <span className="font-semibold">{stats.coveredClusters.length}</span>
                </div>

                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr className="text-left text-slate-600">
                        <th className="py-2 pr-2 font-medium">Booth</th>
                        <th className="py-2 pr-2 font-medium">Cluster #</th>
                        <th className="py-2 font-medium">Serial Range</th>
                        <th className="py-2 font-medium text-right pr-2">OTP Sakhi Count</th>
                        <th className="py-2 font-medium text-right pr-2">Mapped Sakhi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.coveredClusters
                        .filter((c) => {
                          const matchesMapped =
                            coveredClusterFilter === "mapped"
                              ? c.mappedSakhiCount > 0
                              : coveredClusterFilter === "zero"
                                ? c.mappedSakhiCount === 0
                                : true;

                          const q = coveredClusterSearch.trim();
                          if (!q) return matchesMapped;

                          const qNum = Number(q);
                          const matchesBooth = (c.boothId || "").toLowerCase().includes(q.toLowerCase());
                          const matchesCluster =
                            Number.isFinite(qNum) && qNum > 0
                              ? c.clusterNo === qNum
                              : String(c.clusterNo).includes(q);

                          return matchesMapped && (matchesBooth || matchesCluster);
                        })
                        .map((c) => (
                          <tr key={`${c.boothId}-${c.clusterNo}`} className="border-b border-slate-100">
                            <td className="py-2 pr-2 font-mono text-xs">{c.boothId}</td>
                            <td className="py-2 pr-2 font-mono text-xs">{c.clusterNo}</td>
                            <td className="py-2 font-mono text-xs">
                              {c.serialStart} - {c.serialEnd}
                            </td>
                            <td className="py-2 pr-2 font-semibold text-right">{c.otpSakhiCount}</td>
                            <td className="py-2 pr-2 font-semibold text-right">{c.mappedSakhiCount}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cluster-wise coverage (uncovered clusters list) */}
          {stats.uncoveredClusters && stats.uncoveredClusters.length > 0 && (
            <Card className="border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Uncovered Clusters (OTP verified)
                </CardTitle>
                <CardDescription>
                  Cluster = 100 voters per booth, based on voter mapping serial number. Coverage uses only OTP verified Sakhis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.uncoveredClusters && stats.uncoveredClusters.length > 0 && (
                  <div className="flex justify-end mb-2 gap-2 flex-wrap">
                    <Button
                      variant={uncoveredClusterFilter === "" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUncoveredClusterFilter("")}
                    >
                      All
                    </Button>
                    <Button
                      variant={uncoveredClusterFilter === "mapped" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUncoveredClusterFilter("mapped")}
                    >
                      Mapped &gt; 0
                    </Button>
                    <Button
                      variant={uncoveredClusterFilter === "zero" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUncoveredClusterFilter("zero")}
                    >
                      Mapped = 0
                    </Button>
                  </div>
                )}
                <div className="text-xs text-slate-600 mb-2">
                  Total uncovered clusters:{" "}
                  <span className="font-semibold">
                    {
                      stats.uncoveredClusters.filter((c) =>
                        uncoveredClusterFilter === "mapped"
                          ? c.mappedSakhiCount > 0
                          : uncoveredClusterFilter === "zero"
                            ? c.mappedSakhiCount === 0
                            : true
                      ).length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-end mb-2 gap-2 flex-wrap">
                  <Input
                    value={uncoveredClusterSearch}
                    onChange={(e) => setUncoveredClusterSearch(e.target.value)}
                    placeholder="Search booth or cluster"
                    className="max-w-xs"
                  />
                </div>
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr className="text-left text-slate-600">
                        <th className="py-2 pr-2 font-medium">Booth</th>
                        <th className="py-2 pr-2 font-medium">Cluster #</th>
                        <th className="py-2 font-medium">Serial Range</th>
                        <th className="py-2 pr-2 font-medium text-right">Mapped Sakhi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.uncoveredClusters
                        .filter((c) => {
                          const matchesMapped =
                            uncoveredClusterFilter === "mapped"
                              ? c.mappedSakhiCount > 0
                              : uncoveredClusterFilter === "zero"
                                ? c.mappedSakhiCount === 0
                                : true;

                          const q = uncoveredClusterSearch.trim();
                          if (!q) return matchesMapped;

                          const qNum = Number(q);
                          const matchesBooth = (c.boothId || "").toLowerCase().includes(q.toLowerCase());
                          const matchesCluster =
                            Number.isFinite(qNum) && qNum > 0
                              ? c.clusterNo === qNum
                              : String(c.clusterNo).includes(q);

                          return matchesMapped && (matchesBooth || matchesCluster);
                        })
                        .map((c) => (
                          <tr key={`${c.boothId}-${c.clusterNo}`} className="border-b border-slate-100">
                            <td className="py-2 pr-2 font-mono text-xs">{c.boothId}</td>
                            <td className="py-2 pr-2 font-mono text-xs">{c.clusterNo}</td>
                            <td className="py-2 font-mono text-xs">
                              {c.serialStart} - {c.serialEnd}
                            </td>
                            <td className="py-2 pr-2 font-semibold text-right">{c.mappedSakhiCount}</td>
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

          {/* Cluster-wise OTP verified Sakhi count */}
          {stats.clusterWiseSakhiCounts && stats.clusterWiseSakhiCounts.length > 0 && (
            <Card className="border-indigo-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Cluster-wise Sakhi count (OTP verified)
                </CardTitle>
                <CardDescription>
                  Shows how many OTP verified sakhis map to each 100-voter cluster (serial range from voter mapping).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr className="text-left text-slate-600">
                        <th className="py-2 pr-2 font-medium">Booth</th>
                        <th className="py-2 pr-2 font-medium">Cluster #</th>
                        <th className="py-2 pr-2 font-medium">Serial Range</th>
                        <th className="py-2 font-medium text-right pr-2">OTP Sakhi Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.clusterWiseSakhiCounts.map((c) => (
                        <tr key={`${c.boothId}-${c.clusterNo}`} className="border-b border-slate-100">
                          <td className="py-2 pr-2 font-mono text-xs">{c.boothId}</td>
                          <td className="py-2 pr-2 font-mono text-xs">{c.clusterNo}</td>
                          <td className="py-2 font-mono text-xs">
                            {c.serialStart} - {c.serialEnd}
                          </td>
                          <td className="py-2 pr-2 font-semibold text-right">{c.sakhiCount}</td>
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
                <p className="text-xs text-slate-600">
                  Voter ID:{" "}
                  {selected.ocrVoterId ? (
                    <a
                      href={`https://voters.eci.gov.in/search?epic=${encodeURIComponent(selected.ocrVoterId)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      {selected.ocrVoterId}
                    </a>
                  ) : (
                    "—"
                  )}{" "}
                  | Name: {selected.ocrVoterName || "—"}
                </p>
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
                  <div><DocLink src={selected.voterCard} label="Voter Card" /></div>
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
                <div className="flex justify-between items-center gap-2 pt-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (!selected) return;
                      const ok = window.confirm("Are you sure you want to delete this submission?");
                      if (ok) deleteMutation.mutate();
                    }}
                  >
                    {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
