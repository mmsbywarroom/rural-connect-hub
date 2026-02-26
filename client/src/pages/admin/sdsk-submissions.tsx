import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Edit, Trash2, Download, ChevronLeft, ChevronRight, Loader2, Smile, Frown, Mic, X, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import type { SdskSubmission, SdskCategory } from "@shared/schema";

const PAGE_SIZE = 10;

type EnrichedSubmission = SdskSubmission & { userName?: string; userPhone?: string };

function TypeBadge({ type }: { type: string }) {
  if (type === "sukh") return <Badge className="bg-green-100 text-green-800 no-default-hover-elevate no-default-active-elevate"><Smile className="h-3 w-3 mr-1" />Sukh</Badge>;
  return <Badge className="bg-red-100 text-red-800 no-default-hover-elevate no-default-active-elevate"><Frown className="h-3 w-3 mr-1" />Dukh</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") return <Badge className="bg-blue-100 text-blue-800 no-default-hover-elevate no-default-active-elevate"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
  if (status === "closed") return <Badge className="bg-gray-100 text-gray-800 no-default-hover-elevate no-default-active-elevate"><XCircle className="h-3 w-3 mr-1" />Closed</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 no-default-hover-elevate no-default-active-elevate"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
}

function SubmissionDetailDialog({ submission, open, onClose }: { submission: EnrichedSubmission | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [acceptNote, setAcceptNote] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote: string }) => {
      const res = await apiRequest("PATCH", `/api/sdsk/submissions/${id}/accept`, { adminNote });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submission accepted" });
      queryClient.invalidateQueries({ queryKey: ["/api/sdsk/submissions"] });
      setShowAcceptForm(false);
      setAcceptNote("");
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to accept submission", variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async ({ id, completionNote }: { id: string; completionNote: string }) => {
      const res = await apiRequest("PATCH", `/api/sdsk/submissions/${id}/close`, { completionNote });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Submission closed" });
      queryClient.invalidateQueries({ queryKey: ["/api/sdsk/submissions"] });
      setShowCloseForm(false);
      setCloseNote("");
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to close submission", variant: "destructive" });
    },
  });

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setShowAcceptForm(false); setShowCloseForm(false); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-muted-foreground">Type</span>
              <div className="mt-1"><TypeBadge type={submission.type} /></div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Status</span>
              <div className="mt-1"><StatusBadge status={submission.status} /></div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Person Name</span>
              <p className="text-sm font-medium" data-testid="text-detail-person-name">{submission.personName || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Category</span>
              <p className="text-sm font-medium" data-testid="text-detail-category">{submission.categoryName || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Village</span>
              <p className="text-sm font-medium" data-testid="text-detail-village">{submission.selectedVillageName || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Mobile</span>
              <p className="text-sm font-medium" data-testid="text-detail-mobile">{submission.mobileNumber || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Mobile Verified</span>
              <p className="text-sm font-medium" data-testid="text-detail-mobile-verified">{submission.mobileVerified ? "Yes" : "No"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">User Name</span>
              <p className="text-sm font-medium" data-testid="text-detail-user-name">{submission.userName || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">User Phone</span>
              <p className="text-sm font-medium" data-testid="text-detail-user-phone">{submission.userPhone || "—"}</p>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Description</span>
            <p className="text-sm font-medium mt-1" data-testid="text-detail-description">{submission.description || "—"}</p>
          </div>
          {submission.voiceNote && (
            <div>
              <span className="text-xs text-muted-foreground">Voice Note</span>
              <audio controls className="w-full mt-1" data-testid="audio-detail-voice-note">
                <source src={submission.voiceNote} />
              </audio>
            </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground">Date</span>
            <p className="text-sm font-medium" data-testid="text-detail-date">{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "—"}</p>
          </div>

          {submission.adminNote && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Admin Accept Note</span>
              </div>
              <p className="text-sm text-blue-900" data-testid="text-detail-admin-note">{submission.adminNote}</p>
              {submission.acceptedAt && (
                <p className="text-xs text-blue-600 mt-1">{new Date(submission.acceptedAt).toLocaleString()}</p>
              )}
            </div>
          )}

          {submission.completionNote && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle className="h-3.5 w-3.5 text-gray-600" />
                <span className="text-xs font-semibold text-gray-700">Close Note</span>
              </div>
              <p className="text-sm text-gray-900" data-testid="text-detail-completion-note">{submission.completionNote}</p>
              {submission.completedAt && (
                <p className="text-xs text-gray-600 mt-1">{new Date(submission.completedAt).toLocaleString()}</p>
              )}
            </div>
          )}

          {showAcceptForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <Label className="text-sm font-semibold text-blue-700">Accept Note (required)</Label>
              <Textarea
                value={acceptNote}
                onChange={(e) => setAcceptNote(e.target.value)}
                placeholder="Write a note for accepting this submission..."
                className="bg-white"
                data-testid="textarea-accept-note"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowAcceptForm(false)} data-testid="button-cancel-accept">Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => acceptMutation.mutate({ id: submission.id, adminNote: acceptNote })}
                  disabled={!acceptNote.trim() || acceptMutation.isPending}
                  data-testid="button-confirm-accept"
                >
                  {acceptMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Accept
                </Button>
              </div>
            </div>
          )}

          {showCloseForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Close Note (required)</Label>
              <Textarea
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="Write a note for closing this submission..."
                className="bg-white"
                data-testid="textarea-close-note"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowCloseForm(false)} data-testid="button-cancel-close">Cancel</Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => closeMutation.mutate({ id: submission.id, completionNote: closeNote })}
                  disabled={!closeNote.trim() || closeMutation.isPending}
                  data-testid="button-confirm-close"
                >
                  {closeMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {submission.status === "pending" && !showAcceptForm && !showCloseForm && (
            <Button onClick={() => setShowAcceptForm(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="button-accept-submission">
              <CheckCircle className="h-4 w-4 mr-1" /> Accept
            </Button>
          )}
          {submission.status !== "closed" && !showAcceptForm && !showCloseForm && (
            <Button variant="destructive" onClick={() => setShowCloseForm(true)} data-testid="button-close-submission">
              <XCircle className="h-4 w-4 mr-1" /> Close
            </Button>
          )}
          <Button variant="outline" onClick={onClose} data-testid="button-close-detail">Dismiss</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({
  open,
  onClose,
  editCategory,
}: {
  open: boolean;
  onClose: () => void;
  editCategory: SdskCategory | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(editCategory?.name || "");
  const [nameHi, setNameHi] = useState(editCategory?.nameHi || "");
  const [namePa, setNamePa] = useState(editCategory?.namePa || "");
  const [type, setType] = useState(editCategory?.type || "both");
  const [isActive, setIsActive] = useState(editCategory?.isActive !== false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/sdsk/categories", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Category created" });
      queryClient.invalidateQueries({ queryKey: ["/api/sdsk/categories"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/sdsk/categories/${editCategory!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Category updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/sdsk/categories"] });
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
    const data = { name: name.trim(), nameHi: nameHi.trim() || null, namePa: namePa.trim() || null, type, isActive };
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
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-category-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sukh">Sukh</SelectItem>
                <SelectItem value="dukh">Dukh</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
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
  const [editCategory, setEditCategory] = useState<SdskCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery<SdskCategory[]>({
    queryKey: ["/api/sdsk/categories"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sdsk/categories/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Category deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/sdsk/categories"] });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/sdsk/categories/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdsk/categories"] });
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
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categories || []).map((cat) => (
                <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                  <TableCell data-testid={`text-category-name-${cat.id}`}>{cat.name}</TableCell>
                  <TableCell>{cat.nameHi || "—"}</TableCell>
                  <TableCell>{cat.namePa || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate capitalize">{cat.type}</Badge>
                  </TableCell>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No categories found</TableCell>
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

export default function SdskSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<EnrichedSubmission | null>(null);

  const { data: submissions, isLoading } = useQuery<EnrichedSubmission[]>({
    queryKey: ["/api/sdsk/submissions"],
  });

  const adminAssignedVillages: string[] = (() => {
    try {
      const stored = localStorage.getItem("adminAssignedVillages");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();

  const areaFiltered = adminAssignedVillages.length > 0
    ? (submissions || []).filter(s => s.selectedVillageId && adminAssignedVillages.includes(s.selectedVillageId))
    : (submissions || []);

  const filtered = areaFiltered.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      (s.userName || "").toLowerCase().includes(q) ||
      (s.categoryName || "").toLowerCase().includes(q) ||
      (s.selectedVillageName || "").toLowerCase().includes(q) ||
      (s.mobileNumber || "").includes(search);
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalCount = areaFiltered.length;
  const sukhCount = areaFiltered.filter(s => s.type === "sukh").length;
  const dukhCount = areaFiltered.filter(s => s.type === "dukh").length;
  const pendingCount = areaFiltered.filter(s => s.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Smile className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Sukh-Dukh Saanjha Karo</h1>
            <p className="text-sm text-muted-foreground">Community welfare submissions</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="submissions">
        <TabsList data-testid="tabs-sdsk">
          <TabsTrigger value="submissions" data-testid="tab-submissions">Submissions</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Smile className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-count">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Smile className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-sukh-count">{sukhCount}</p>
                  <p className="text-xs text-muted-foreground">Sukh</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Frown className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-dukh-count">{dukhCount}</p>
                  <p className="text-xs text-muted-foreground">Dukh</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Loader2 className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, category, village, mobile..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
                data-testid="input-search-submissions"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sukh">Sukh</SelectItem>
                <SelectItem value="dukh">Dukh</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => window.open("/api/sdsk/export-csv", "_blank")}
              disabled={!submissions || submissions.length === 0}
              data-testid="button-sdsk-export-csv"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
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
                    <TableHead>User Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Village</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Voice Note</TableHead>
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
                      <TableCell data-testid={`text-user-name-${s.id}`}>{s.userName || "—"}</TableCell>
                      <TableCell><TypeBadge type={s.type} /></TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>{s.categoryName || "—"}</TableCell>
                      <TableCell>{s.selectedVillageName || "—"}</TableCell>
                      <TableCell>{s.mobileNumber || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{s.description || "—"}</TableCell>
                      <TableCell>
                        {s.voiceNote ? (
                          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                            <Mic className="h-3 w-3 mr-1" /> Yes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No submissions found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
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

      <SubmissionDetailDialog
        submission={selectedSubmission}
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}
