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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Loader2, School, Clock, CheckCircle, MapPin, FileText, User, Phone, Mic } from "lucide-react";
import type { GovSchoolSubmission, GovSchoolLog, GovSchoolIssueCategory } from "@shared/schema";

const PAGE_SIZE = 10;

type SubmissionWithLogs = GovSchoolSubmission & { logs?: GovSchoolLog[] };

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") return <Badge className="bg-blue-100 text-blue-800 no-default-hover-elevate no-default-active-elevate"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
  if (status === "resolved") return <Badge className="bg-green-100 text-green-800 no-default-hover-elevate no-default-active-elevate"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 no-default-hover-elevate no-default-active-elevate"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
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

function JourneyTimeline({ logs }: { logs: GovSchoolLog[] }) {
  if (!logs || logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No journey logs yet.</p>;
  }

  const sorted = [...logs].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return da - db;
  });

  return (
    <div className="space-y-3">
      {sorted.map((log, idx) => (
        <div key={log.id} className="flex gap-3" data-testid={`timeline-entry-${idx}`}>
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
            {idx < sorted.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, " ")}</p>
            {log.note && <p className="text-xs text-muted-foreground mt-0.5">{log.note}</p>}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {log.performedByName && <span>{log.performedByName}</span>}
              {log.createdAt && <span>{new Date(log.createdAt).toLocaleString()}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AcceptDialog({ submission, open, onClose }: { submission: GovSchoolSubmission; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [adminNote, setAdminNote] = useState("");

  const acceptMutation = useMutation({
    mutationFn: async (data: { adminNote: string }) => {
      const res = await apiRequest("PATCH", `/api/gov-school/submissions/${submission.id}/accept`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submission accepted" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-school/submissions"] });
      setAdminNote("");
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to accept submission", variant: "destructive" });
    },
  });

  const handleAccept = () => {
    if (!adminNote.trim()) {
      toast({ title: "Admin note is required", variant: "destructive" });
      return;
    }
    acceptMutation.mutate({ adminNote: adminNote.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setAdminNote(""); onClose(); } }}>
      <DialogContent className="max-w-md" data-testid="dialog-accept">
        <DialogHeader>
          <DialogTitle>Accept Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="admin-note">Admin Note (required)</Label>
            <Textarea
              id="admin-note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Write a note for accepting this submission..."
              className="text-sm"
              data-testid="textarea-admin-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setAdminNote(""); onClose(); }} data-testid="button-cancel-accept">Cancel</Button>
          <Button onClick={handleAccept} disabled={!adminNote.trim() || acceptMutation.isPending} data-testid="button-confirm-accept">
            {acceptMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolveDialog({ submission, open, onClose }: { submission: GovSchoolSubmission; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [completionNote, setCompletionNote] = useState("");

  const resolveMutation = useMutation({
    mutationFn: async (data: { completionNote: string }) => {
      const res = await apiRequest("PATCH", `/api/gov-school/submissions/${submission.id}/resolve`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submission resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-school/submissions"] });
      setCompletionNote("");
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to resolve submission", variant: "destructive" });
    },
  });

  const handleResolve = () => {
    if (!completionNote.trim()) {
      toast({ title: "Completion note is required", variant: "destructive" });
      return;
    }
    resolveMutation.mutate({ completionNote: completionNote.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setCompletionNote(""); onClose(); } }}>
      <DialogContent className="max-w-md" data-testid="dialog-resolve">
        <DialogHeader>
          <DialogTitle>Resolve Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="completion-note">Completion Note (required)</Label>
            <Textarea
              id="completion-note"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Describe how this was resolved..."
              className="text-sm"
              data-testid="textarea-completion-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCompletionNote(""); onClose(); }} data-testid="button-cancel-resolve">Cancel</Button>
          <Button onClick={handleResolve} disabled={!completionNote.trim() || resolveMutation.isPending} className="bg-green-600" data-testid="button-confirm-resolve">
            {resolveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ submission, open, onClose }: { submission: GovSchoolSubmission | null; open: boolean; onClose: () => void }) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const { data: detailData } = useQuery<{ submission: GovSchoolSubmission; logs: GovSchoolLog[] }>({
    queryKey: ["/api/gov-school/submissions", submission?.id],
    enabled: !!submission,
  });

  if (!submission) return null;

  const logs = detailData?.logs || [];

  const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium" data-testid={`text-field-${label.toLowerCase().replace(/\s/g, "-")}`}>{value || "\u2014"}</p>
    </div>
  );

  return (
    <>
      <Dialog open={open && !acceptOpen && !resolveOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="School Name" value={submission.schoolName} />
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <div className="mt-1"><StatusBadge status={submission.status} /></div>
              </div>
              <Field label="Principal Name" value={submission.principalName} />
              <Field label="Principal Mobile" value={submission.principalMobile} />
              <Field label="Issue Category" value={(submission as any).issueCategoryNames || submission.issueCategoryName} />
              <Field label="Village" value={submission.villageName} />
              <Field label="Nodal Volunteer Name" value={submission.nodalVolunteerName} />
              <Field label="Nodal Volunteer Mobile" value={submission.nodalVolunteerMobile} />
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Description</span>
              <p className="text-sm font-medium mt-1" data-testid="text-detail-description">{submission.description || "\u2014"}</p>
            </div>

            {submission.audioNote && (
              <div>
                <span className="text-xs text-muted-foreground">Audio Note</span>
                <audio controls className="w-full mt-1" data-testid="audio-detail-note">
                  <source src={submission.audioNote} />
                </audio>
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

            <div>
              <span className="text-xs text-muted-foreground">Date</span>
              <p className="text-sm font-medium" data-testid="text-detail-date">
                {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "\u2014"}
              </p>
            </div>

            {submission.adminNote && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">Admin Note</span>
                </div>
                <p className="text-sm text-blue-900" data-testid="text-detail-admin-note">{submission.adminNote}</p>
                {submission.acceptedAt && (
                  <p className="text-xs text-blue-600 mt-1">Accepted: {new Date(submission.acceptedAt).toLocaleString()}</p>
                )}
              </div>
            )}

            {submission.completionNote && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Completion Note</span>
                </div>
                <p className="text-sm text-green-900" data-testid="text-detail-completion-note">{submission.completionNote}</p>
                {submission.completedAt && (
                  <p className="text-xs text-green-600 mt-1">Resolved: {new Date(submission.completedAt).toLocaleString()}</p>
                )}
              </div>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Journey Timeline</h3>
                <JourneyTimeline logs={logs} />
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            {submission.status === "pending" && (
              <Button onClick={() => setAcceptOpen(true)} className="bg-blue-600" data-testid="button-accept-submission">
                <CheckCircle className="h-4 w-4 mr-1" /> Accept
              </Button>
            )}
            {submission.status === "accepted" && (
              <Button onClick={() => setResolveOpen(true)} className="bg-green-600" data-testid="button-resolve-submission">
                <CheckCircle className="h-4 w-4 mr-1" /> Resolve
              </Button>
            )}
            <Button variant="outline" onClick={onClose} data-testid="button-close-detail">Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {acceptOpen && (
        <AcceptDialog
          submission={submission}
          open={acceptOpen}
          onClose={() => { setAcceptOpen(false); onClose(); }}
        />
      )}
      {resolveOpen && (
        <ResolveDialog
          submission={submission}
          open={resolveOpen}
          onClose={() => { setResolveOpen(false); onClose(); }}
        />
      )}
    </>
  );
}

function CategoryDialog({
  open,
  onClose,
  editCategory,
}: {
  open: boolean;
  onClose: () => void;
  editCategory: GovSchoolIssueCategory | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(editCategory?.name || "");
  const [nameHi, setNameHi] = useState(editCategory?.nameHi || "");
  const [namePa, setNamePa] = useState(editCategory?.namePa || "");
  const [isActive, setIsActive] = useState(editCategory?.isActive !== false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/gov-school/categories", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Category created" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-school/categories"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/gov-school/categories/${editCategory!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Category updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-school/categories"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const data = { name: name.trim(), nameHi: nameHi.trim() || null, namePa: namePa.trim() || null, isActive };
    if (editCategory) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editCategory ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" data-testid="input-category-name" />
          </div>
          <div>
            <Label htmlFor="cat-name-hi">Hindi Name</Label>
            <Input id="cat-name-hi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} placeholder="Hindi name" data-testid="input-category-name-hi" />
          </div>
          <div>
            <Label htmlFor="cat-name-pa">Punjabi Name</Label>
            <Input id="cat-name-pa" value={namePa} onChange={(e) => setNamePa(e.target.value)} placeholder="Punjabi name" data-testid="input-category-name-pa" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cat-active" checked={isActive} onCheckedChange={(c) => setIsActive(!!c)} data-testid="checkbox-category-active" />
            <Label htmlFor="cat-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-category">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-category">
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {editCategory ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab() {
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<GovSchoolIssueCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery<GovSchoolIssueCategory[]>({
    queryKey: ["/api/gov-school/categories"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/gov-school/categories/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Category deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-school/categories"] });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/gov-school/categories/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gov-school/categories"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Categories</h2>
        <Button onClick={() => { setEditCategory(null); setCategoryDialogOpen(true); }} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
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
                <TableHead>Name</TableHead>
                <TableHead>Hindi Name</TableHead>
                <TableHead>Punjabi Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categories || []).map((cat) => (
                <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                  <TableCell data-testid={`text-category-name-${cat.id}`}>{cat.name}</TableCell>
                  <TableCell>{cat.nameHi || "\u2014"}</TableCell>
                  <TableCell>{cat.namePa || "\u2014"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMutation.mutate({ id: cat.id, isActive: !cat.isActive })}
                      data-testid={`button-toggle-status-${cat.id}`}
                    >
                      <Badge className={`no-default-hover-elevate no-default-active-elevate ${cat.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditCategory(cat); setCategoryDialogOpen(true); }}
                        data-testid={`button-edit-category-${cat.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(cat.id)}
                        data-testid={`button-delete-category-${cat.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(categories || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No categories found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {categoryDialogOpen && (
        <CategoryDialog
          open={categoryDialogOpen}
          onClose={() => { setCategoryDialogOpen(false); setEditCategory(null); }}
          editCategory={editCategory}
        />
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this category? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete-category">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-category"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GovSchoolSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<GovSchoolSubmission | null>(null);

  const { data: submissions, isLoading } = useQuery<GovSchoolSubmission[]>({
    queryKey: ["/api/gov-school/submissions"],
  });

  const allSubmissions = submissions || [];

  const filtered = allSubmissions.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      s.schoolName.toLowerCase().includes(q) ||
      (s.villageName || "").toLowerCase().includes(q) ||
      (s.nodalVolunteerName || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pendingCount = allSubmissions.filter((s) => s.status === "pending").length;
  const acceptedCount = allSubmissions.filter((s) => s.status === "accepted").length;
  const resolvedCount = allSubmissions.filter((s) => s.status === "resolved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <School className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-gov-school-title">Gov School Work</h1>
            <p className="text-sm text-muted-foreground">Manage government school submissions</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="submissions">
        <TabsList data-testid="tabs-gov-school">
          <TabsTrigger value="submissions" data-testid="tab-submissions">Submissions</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <School className="h-8 w-8 text-teal-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-count">{allSubmissions.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-accepted-count">{acceptedCount}</p>
                  <p className="text-xs text-muted-foreground">Accepted</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-resolved-count">{resolvedCount}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by school name, village, nodal volunteer..."
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
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
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
                    <TableHead>School Name</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Issue Category</TableHead>
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
                      <TableCell data-testid={`text-school-name-${s.id}`}>{s.schoolName}</TableCell>
                      <TableCell>{s.villageName || "\u2014"}</TableCell>
                      <TableCell>{(s as any).issueCategoryNames || s.issueCategoryName || "\u2014"}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {search || statusFilter !== "all" ? "No submissions match your filters" : "No submissions yet"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page + 1} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>
      </Tabs>

      <DetailDialog
        submission={selectedSubmission}
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}
