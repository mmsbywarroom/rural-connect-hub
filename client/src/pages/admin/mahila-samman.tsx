import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Users, Calendar, Eye, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MahilaSammanSubmission } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200",
};

export default function MahilaSammanAdminPage() {
  const { data: list = [], isLoading } = useQuery<MahilaSammanSubmission[]>({
    queryKey: ["/api/admin/mahila-samman"],
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

              {selected.aadhaarFront && (
                <div>
                  <p className="font-semibold text-slate-600 text-xs mb-1">Aadhaar Front</p>
                  <img src={selected.aadhaarFront} alt="Aadhaar front" className="rounded border h-24 object-cover" />
                </div>
              )}
              {selected.aadhaarBack && (
                <div>
                  <p className="font-semibold text-slate-600 text-xs mb-1">Aadhaar Back</p>
                  <img src={selected.aadhaarBack} alt="Aadhaar back" className="rounded border h-24 object-cover" />
                </div>
              )}
              {selected.sakhiPhoto && (
                <div>
                  <p className="font-semibold text-slate-600 text-xs mb-1">Sakhi Photo</p>
                  <img src={selected.sakhiPhoto} alt="Sakhi" className="rounded border h-32 object-cover" />
                </div>
              )}

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
