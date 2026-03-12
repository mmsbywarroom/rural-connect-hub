import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Download, Trash2, Eye } from "lucide-react";
import type { BlaSubmission } from "@shared/schema";

function escapeCSVField(value: string): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export default function BlaSubmissionsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<BlaSubmission | null>(null);
  const [editBooth, setEditBooth] = useState("");

  const { data, isLoading, refetch } = useQuery<BlaSubmission[]>({
    queryKey: ["/api/bla/submissions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bla/submissions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted" });
      refetch();
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const list = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) =>
      [
        s.bloName,
        s.bloMobileNumber,
        s.villageName,
        s.ocrVoterId,
        s.voterMappingBoothId,
        s.manualBoothId,
      ]
        .map((v) => (v || "").toString().toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [list, search]);

  const boothCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of list) {
      const booth = (s.voterMappingBoothId || s.manualBoothId || "").trim();
      if (!booth) continue;
      counts[booth] = (counts[booth] || 0) + 1;
    }
    return counts;
  }, [list]);

  const handleDownloadCSV = () => {
    if (!list.length) return;
    const headers = [
      "BLO Name",
      "BLO Mobile",
      "Village",
      "Booth (final)",
      "Booth (mapped)",
      "Booth (manual)",
      "Voter ID",
      "Voter Name",
      "Created At",
    ];
    const rows = list.map((s) => [
      s.bloName,
      s.bloMobileNumber,
      s.villageName ?? "",
      s.voterMappingBoothId || s.manualBoothId || "",
      s.voterMappingBoothId ?? "",
      s.manualBoothId ?? "",
      s.ocrVoterId ?? "",
      s.ocrVoterName ?? "",
      s.createdAt ? new Date(s.createdAt).toISOString() : "",
    ]);
    const csv = [
      headers.map(escapeCSVField).join(","),
      ...rows.map((r) => r.map(escapeCSVField).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bla-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalByBooth = Object.entries(boothCounts).sort((a, b) => a[0].localeCompare(b[0]));

  const updateBoothMutation = useMutation({
    mutationFn: async ({ id, booth }: { id: string; booth: string }) => {
      await apiRequest("PATCH", `/api/bla/submissions/${id}`, {
        manualBoothId: booth.trim() || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Updated booth number" });
      setSelected(null);
      refetch();
    },
    onError: () => {
      toast({ title: "Failed to update booth", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Booth Level Agents (BLA)</h1>
        <CardDescription>
          View all BLA entries, see how many BLAs are mapped to each booth, search, download CSV, and delete entries.
        </CardDescription>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Booth wise summary</CardTitle>
          <CardDescription className="text-xs">
            Total BLAs per booth number (from voter mapping or manual booth).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalByBooth.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {totalByBooth.map(([booth, count]) => (
                <Badge key={booth} variant="outline" className="text-xs px-2 py-1">
                  Booth {booth}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">All BLA entries ({filtered.length})</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Search name, mobile, voter ID, booth..."
              className="h-8 w-[220px] text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleDownloadCSV}
              disabled={!list.length}
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No BLA entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>BLO Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Booth (final)</TableHead>
                    <TableHead>Voter ID</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s, idx) => {
                    const booth = (s.voterMappingBoothId || s.manualBoothId || "").trim();
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{s.bloName}</TableCell>
                        <TableCell className="text-sm">{s.bloMobileNumber}</TableCell>
                        <TableCell className="text-sm">{s.villageName ?? "—"}</TableCell>
                        <TableCell className="text-sm">{booth || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{s.ocrVoterId ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 mr-1"
                            onClick={() => {
                              setSelected(s);
                              setEditBooth((s.manualBoothId || s.voterMappingBoothId || "").trim());
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600"
                            onClick={() => deleteMutation.mutate(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Booth Level Agent details</DialogTitle>
                <DialogDescription>
                  View full details, download documents and update booth number if needed.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold">BLO</p>
                  <p>
                    {selected.bloName} &middot; {selected.bloMobileNumber}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-semibold">Village</p>
                    <p>{selected.villageName || "—"}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Booth (final)</p>
                    <p>{(selected.voterMappingBoothId || selected.manualBoothId || "—").toString()}</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold">Aadhaar (OCR data)</p>
                  <p className="text-xs text-muted-foreground">
                    Name: {selected.ocrAadhaarName || "—"} &middot; Aadhaar: {selected.ocrAadhaarNumber || "—"} &middot; DOB:{" "}
                    {selected.ocrAadhaarDob || "—"} &middot; Gender: {selected.ocrAadhaarGender || "—"}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold">Address (from Aadhaar)</span>
                    <br />
                    {selected.ocrAadhaarAddress || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Voter Card (OCR data)</p>
                  <p className="text-xs text-muted-foreground">
                    Voter ID: {selected.ocrVoterId || "—"} &middot; Name: {selected.ocrVoterName || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Voter Mapping</p>
                  <p>
                    Booth: {selected.voterMappingBoothId || "—"} | Name: {selected.voterMappingName || "—"} | Father&apos;s Name:{" "}
                    {selected.voterMappingFatherName || "—"} | Village: {selected.voterMappingVillageName || "—"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selected.aadhaarFront && (
                    <Button asChild variant="outline" size="sm">
                      <a href={selected.aadhaarFront} target="_blank" rel="noreferrer" download={`aadhaar-front-${selected.id}.jpg`}>
                        View / Download Aadhaar Front
                      </a>
                    </Button>
                  )}
                  {selected.aadhaarBack && (
                    <Button asChild variant="outline" size="sm">
                      <a href={selected.aadhaarBack} target="_blank" rel="noreferrer" download={`aadhaar-back-${selected.id}.jpg`}>
                        View / Download Aadhaar Back
                      </a>
                    </Button>
                  )}
                  {selected.voterCardImage && (
                    <Button asChild variant="outline" size="sm">
                      <a href={selected.voterCardImage} target="_blank" rel="noreferrer" download={`voter-card-${selected.id}.jpg`}>
                        View / Download Voter Card
                      </a>
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">Edit booth number (manual override)</p>
                  <Input
                    value={editBooth}
                    onChange={(e) => setEditBooth(e.target.value)}
                    placeholder="Booth number"
                  />
                  <p className="text-xs text-muted-foreground">
                    This value is used when mapping booth-wise BLAs. Leave empty to rely only on voter mapping booth.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (!selected) return;
                    updateBoothMutation.mutate({ id: selected.id, booth: editBooth });
                  }}
                  disabled={updateBoothMutation.isPending}
                >
                  {updateBoothMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

