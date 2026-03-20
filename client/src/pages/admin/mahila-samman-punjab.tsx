import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Users, Calendar, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MahilaSammanPunjabSubmission } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200",
};

const PAGE_SIZE = 25;

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  obc: "OBC",
  sc: "SC",
  st: "ST",
};

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

type MahilaPunjabListResponse = {
  items: MahilaSammanPunjabSubmission[];
  total: number;
  limit: number;
  offset: number;
};

export default function MahilaSammanPunjabAdminPage() {
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

  const adminAssignedVillages: string[] = (() => {
    try {
      const stored = localStorage.getItem("adminAssignedVillages");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();
  const villageIdsParam = adminAssignedVillages.length > 0 ? adminAssignedVillages.join(",") : "";

  const { data: listResponse, isLoading } = useQuery<MahilaPunjabListResponse>({
    queryKey: ["/api/admin/mahila-samman-punjab", page, debouncedSearch, statusFilter, villageIdsParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      const q = debouncedSearch.trim();
      if (q) params.set("search", q);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (villageIdsParam) params.set("villageIds", villageIdsParam);
      const res = await fetch(`/api/admin/mahila-samman-punjab?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      return res.json();
    },
  });

  const { data: selected, isLoading: detailLoading } = useQuery<MahilaSammanPunjabSubmission>({
    queryKey: ["/api/admin/mahila-samman-punjab", selectedId, "detail"],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/mahila-samman-punjab/${selectedId}`);
      return res.json();
    },
  });

  const [status, setStatus] = useState<string>("pending");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (selected) {
      setStatus(selected.status || "pending");
      setAdminNote(selected.adminNote || "");
    }
  }, [selected]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiRequest("PATCH", `/api/admin/mahila-samman-punjab/${selected.id}`, { status, adminNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mahila-samman-punjab"], exact: false });
      setSelectedId(null);
    },
  });

  const paged = listResponse?.items ?? [];
  const listTotal = listResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(listTotal / PAGE_SIZE) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [listTotal, page]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Mahila Samman Rashi through Punjab Gov
        </h1>
        <CardDescription>All submissions serial-wise. Every woman ₹1,000/month; SC/ST women ₹1,500/month.</CardDescription>
      </div>

      <Card>
        <CardHeader className="pb-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, voter ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          <CardTitle className="text-sm font-semibold">Submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : paged.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No submissions yet.</p>
          ) : (
            paged.map((s, idx) => {
              const created = s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
              const badgeClass = STATUS_COLORS[s.status || "pending"] || STATUS_COLORS.pending;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className="w-full text-left border border-slate-200 rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 font-semibold text-purple-700 text-sm">
                    {page * PAGE_SIZE + idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {s.name} – {s.mobileNumber}
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
                      {s.category && (
                        <>
                          <span className="mx-1">•</span>
                          {CATEGORY_LABELS[s.category] || s.category}
                        </>
                      )}
                    </p>
                  </div>
                  <Badge className={badgeClass}>{s.status}</Badge>
                </button>
              );
            })
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
                <span className="text-sm">{page + 1} / {totalPages}</span>
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
            <DialogTitle>Mahila Samman Rashi (Punjab Gov) – Submission Details</DialogTitle>
          </DialogHeader>
          {(detailLoading || !selected) && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!detailLoading && selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-slate-600 text-xs">Name</p>
                  <p className="text-slate-800">{selected.name}</p>
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
                  <p className="font-semibold text-slate-600 text-xs">Category</p>
                  <p className="text-slate-800">{CATEGORY_LABELS[selected.category || ""] || selected.category || "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600 text-xs">Unit / Village</p>
                  <p className="text-slate-800">{selected.villageName || "—"}</p>
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
                  <span className="text-slate-600">Booth ID:</span><span>{selected.voterMappingBoothId || selected.manualBoothId || "—"}</span>
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
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>Cancel</Button>
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
