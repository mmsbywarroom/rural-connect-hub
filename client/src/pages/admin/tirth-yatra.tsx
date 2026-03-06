import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Calendar, MapPin } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TirthYatraRequest } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border border-amber-200",
  accepted: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  rejected: "bg-red-100 text-red-800 border border-red-200",
  closed: "bg-slate-100 text-slate-700 border border-slate-200",
};

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Tirth Yatra Requests
          </h1>
          <CardDescription>Review and update status of Tirth Yatra applications.</CardDescription>
        </div>
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
              {sorted.map((req) => {
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
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-emerald-700" />
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selected.aadhaarFrontUrl && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Aadhaar front</p>
                    <img src={selected.aadhaarFrontUrl} alt="" className="rounded border h-28 object-cover" />
                  </div>
                )}
                {selected.aadhaarBackUrl && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Aadhaar back</p>
                    <img src={selected.aadhaarBackUrl} alt="" className="rounded border h-28 object-cover" />
                  </div>
                )}
                {selected.voterCardUrl && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Voter card</p>
                    <img src={selected.voterCardUrl} alt="" className="rounded border h-28 object-cover" />
                  </div>
                )}
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

