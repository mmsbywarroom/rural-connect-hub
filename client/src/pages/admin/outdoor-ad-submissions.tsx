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
import { Search, Clock, CheckCircle, ChevronLeft, ChevronRight, Loader2, Image, MapPin, Phone, User, Ruler, Frame } from "lucide-react";
import type { OutdoorAdSubmission } from "@shared/schema";

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-800 no-default-hover-elevate no-default-active-elevate"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 no-default-hover-elevate no-default-active-elevate"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
}

function FrameTypeBadge({ frameType }: { frameType: string }) {
  if (frameType === "with_frame") return <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate"><Frame className="h-3 w-3 mr-1" />With Frame</Badge>;
  return <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">Without Frame</Badge>;
}

function StaticMap({ lat, lng }: { lat: string; lng: string }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 mr-1" />
        {lat}, {lng}
      </div>
    );
  }
  const src = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x200&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
  return (
    <img
      src={src}
      alt="Location map"
      className="w-full h-48 rounded-md object-cover"
      data-testid="img-static-map"
    />
  );
}

function ApproveDialog({ submission, open, onClose }: { submission: OutdoorAdSubmission; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [adminNote, setAdminNote] = useState("");

  const approveMutation = useMutation({
    mutationFn: async (data: { adminNote: string }) => {
      const res = await apiRequest("PATCH", `/api/outdoor-ad/submissions/${submission.id}/approve`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submission approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/outdoor-ad/submissions"] });
      setAdminNote("");
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to approve submission", variant: "destructive" });
    },
  });

  const handleApprove = () => {
    if (!adminNote.trim()) {
      toast({ title: "Admin note is required", variant: "destructive" });
      return;
    }
    approveMutation.mutate({ adminNote: adminNote.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAdminNote(""); onClose(); } }}>
      <DialogContent className="max-w-md" data-testid="dialog-approve">
        <DialogHeader>
          <DialogTitle>Approve Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="admin-note">Admin Note (required)</Label>
            <Textarea
              id="admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Write a note for approving this submission..."
              className="text-sm"
              data-testid="textarea-admin-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAdminNote(""); onClose(); }} data-testid="button-cancel-approve">Cancel</Button>
          <Button onClick={handleApprove} disabled={!adminNote.trim() || approveMutation.isPending} data-testid="button-confirm-approve">
            {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ submission, open, onClose }: { submission: OutdoorAdSubmission | null; open: boolean; onClose: () => void }) {
  const [approveOpen, setApproveOpen] = useState(false);

  if (!submission) return null;

  return (
    <>
      <Dialog open={open && !approveOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Owner Name</span>
                <p className="text-sm font-medium" data-testid="text-detail-owner-name">{submission.ownerName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-1"><StatusBadge status={submission.status} /></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Mobile Number</span>
                <p className="text-sm font-medium" data-testid="text-detail-mobile">{submission.mobileNumber}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Mobile Verified</span>
                <p className="text-sm font-medium" data-testid="text-detail-verified">{submission.mobileVerified ? "Yes" : "No"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Wall Size</span>
                <p className="text-sm font-medium" data-testid="text-detail-wall-size">{submission.wallSize}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Frame Type</span>
                <div className="mt-1"><FrameTypeBadge frameType={submission.frameType} /></div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Village</span>
                <p className="text-sm font-medium" data-testid="text-detail-village">{submission.villageName || "\u2014"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Date</span>
                <p className="text-sm font-medium" data-testid="text-detail-date">
                  {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "\u2014"}
                </p>
              </div>
            </div>

            {submission.wallImage && (
              <div>
                <span className="text-xs text-muted-foreground">Wall Image</span>
                <div className="mt-1">
                  <img
                    src={`/api/outdoor-ad/submissions/${submission.id}/wall-image`}
                    alt="Wall"
                    className="w-full h-48 object-cover rounded-md border"
                    data-testid="img-detail-wall"
                  />
                </div>
              </div>
            )}

            {submission.posterImage && (
              <div>
                <span className="text-xs text-muted-foreground">Poster Image</span>
                <div className="mt-1">
                  <img
                    src={`/api/outdoor-ad/submissions/${submission.id}/poster-image`}
                    alt="Poster"
                    className="w-full h-48 object-cover rounded-md border"
                    data-testid="img-detail-poster"
                  />
                </div>
              </div>
            )}

            {submission.latitude && submission.longitude && (
              <div>
                <span className="text-xs text-muted-foreground">Location</span>
                <div className="mt-1">
                  <StaticMap lat={submission.latitude} lng={submission.longitude} />
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-detail-coordinates">
                    {submission.latitude}, {submission.longitude}
                  </p>
                  {submission.locationAddress && (
                    <p className="text-xs text-muted-foreground" data-testid="text-detail-address">{submission.locationAddress}</p>
                  )}
                </div>
              </div>
            )}

            {submission.adminNote && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <span className="text-xs font-semibold text-green-700">Admin Note</span>
                <p className="text-sm text-green-900 mt-1" data-testid="text-detail-admin-note">{submission.adminNote}</p>
                {submission.approvedAt && (
                  <p className="text-xs text-green-600 mt-1">Approved: {new Date(submission.approvedAt).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            {submission.status === "pending" && (
              <Button onClick={() => setApproveOpen(true)} data-testid="button-approve-submission">
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
              </Button>
            )}
            <Button variant="outline" onClick={onClose} data-testid="button-close-detail">Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {approveOpen && (
        <ApproveDialog
          submission={submission}
          open={approveOpen}
          onClose={() => { setApproveOpen(false); onClose(); }}
        />
      )}
    </>
  );
}

export default function OutdoorAdSubmissionsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<OutdoorAdSubmission | null>(null);

  const { data: submissions, isLoading } = useQuery<OutdoorAdSubmission[]>({
    queryKey: ["/api/outdoor-ad/submissions"],
  });

  const allSubmissions = submissions || [];

  const filtered = allSubmissions.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      s.ownerName.toLowerCase().includes(q) ||
      s.mobileNumber.includes(search) ||
      (s.villageName || "").toLowerCase().includes(q) ||
      s.wallSize.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pendingCount = allSubmissions.filter((s) => s.status === "pending").length;
  const approvedCount = allSubmissions.filter((s) => s.status === "approved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Image className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-outdoor-ad-title">Outdoor Advertisements</h1>
          <p className="text-sm text-muted-foreground">Manage outdoor ad submissions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Image className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-count">{allSubmissions.length}</p>
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
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-approved-count">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by owner name, mobile, village..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
            data-testid="input-search-submissions"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
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
                <TableHead>Owner Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Wall Size</TableHead>
                <TableHead>Frame Type</TableHead>
                <TableHead>Images</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedSubmission(s)}
                  data-testid={`row-submission-${s.id}`}
                >
                  <TableCell data-testid={`text-owner-${s.id}`}>{s.ownerName}</TableCell>
                  <TableCell>{s.mobileNumber}</TableCell>
                  <TableCell>{s.villageName || "\u2014"}</TableCell>
                  <TableCell>{s.wallSize}</TableCell>
                  <TableCell><FrameTypeBadge frameType={s.frameType} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {s.wallImage && <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate"><Image className="h-3 w-3 mr-1" />Wall</Badge>}
                      {s.posterImage && <Badge variant="outline" className="text-xs bg-blue-50 no-default-hover-elevate no-default-active-elevate"><Image className="h-3 w-3 mr-1" />Poster</Badge>}
                      {!s.wallImage && !s.posterImage && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {search || statusFilter !== "all" ? "No submissions match your filters" : "No submissions yet"}
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

      <DetailDialog
        submission={selectedSubmission}
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}
