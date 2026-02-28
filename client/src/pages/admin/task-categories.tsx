import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FolderTree } from "lucide-react";

interface TaskCategory {
  id: string;
  name: string;
  nameHi: string | null;
  namePa: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  fixedTaskSlugs?: string[] | null;
}

interface TaskConfigItem {
  id: string;
  name: string;
  categoryId: string | null;
}

const FIXED_TASKS: { slug: string; name: string }[] = [
  { slug: "nasha-viruddh-yuddh", name: "Nasha Viruddh Yuddh" },
  { slug: "road-report", name: "Road Reports" },
  { slug: "harr-sirr-te-chatt", name: "Harr Sirr te Chatt" },
  { slug: "sukh-dukh-saanjha-karo", name: "Sukh-Dukh Saanjha Karo" },
  { slug: "sunwai", name: "Sunwai (Complaints)" },
  { slug: "outdoor-ad", name: "Outdoor Ads" },
  { slug: "gov-school", name: "Gov School Work" },
  { slug: "appointment", name: "Appointments" },
];

export default function TaskCategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TaskCategory | null>(null);
  const [name, setName] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [namePa, setNamePa] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedFixedSlugs, setSelectedFixedSlugs] = useState<string[]>([]);

  const { data: categories, isLoading } = useQuery<TaskCategory[]>({
    queryKey: ["/api/task-categories"],
  });

  const { data: taskConfigs } = useQuery<TaskConfigItem[]>({
    queryKey: ["/api/task-configs"],
    enabled: isOpen && !!editingCategory,
  });

  const createCategory = useMutation({
    mutationFn: async (data: { name: string; nameHi?: string; namePa?: string; sortOrder: number; isActive: boolean }) =>
      apiRequest("POST", "/api/task-categories", data),
    onSuccess: () => {
      toast({ title: "Category created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/task-categories"] });
      setIsOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" }),
  });

  const updateCategory = useMutation({
    mutationFn: async (data: { name: string; nameHi?: string; namePa?: string; sortOrder: number; isActive: boolean; taskIds?: string[]; fixedTaskSlugs?: string[] }) =>
      apiRequest("PATCH", `/api/task-categories/${editingCategory?.id}`, data),
    onSuccess: () => {
      toast({ title: "Category updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/task-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/task-configs"] });
      setIsOpen(false);
      setEditingCategory(null);
      resetForm();
    },
    onError: () => toast({ title: "Failed to update category", variant: "destructive" }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/task-categories/${id}`),
    onSuccess: () => {
      toast({ title: "Category deleted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/task-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/task-configs"] });
      setDeletingCategory(null);
    },
    onError: () => toast({ title: "Failed to delete category", variant: "destructive" }),
  });

  const resetForm = () => {
    setName("");
    setNameHi("");
    setNamePa("");
    setSortOrder(0);
    setIsActive(true);
    setSelectedTaskIds([]);
    setSelectedFixedSlugs([]);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    resetForm();
    setIsOpen(true);
  };

  const handleEdit = (cat: TaskCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setNameHi(cat.nameHi ?? "");
    setNamePa(cat.namePa ?? "");
    setSortOrder(cat.sortOrder ?? 0);
    setIsActive(cat.isActive ?? true);
    setSelectedTaskIds([]);
    setIsOpen(true);
  };

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  useEffect(() => {
    if (editingCategory && taskConfigs) {
      setSelectedTaskIds(taskConfigs.filter((t) => t.categoryId === editingCategory.id).map((t) => t.id));
    }
  }, [editingCategory?.id, taskConfigs]);

  useEffect(() => {
    if (editingCategory) {
      setSelectedFixedSlugs(editingCategory.fixedTaskSlugs ?? []);
    }
  }, [editingCategory?.id, editingCategory?.fixedTaskSlugs]);

  const toggleFixedSlug = (slug: string) => {
    setSelectedFixedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const data = { name: name.trim(), nameHi: nameHi.trim() || undefined, namePa: namePa.trim() || undefined, sortOrder, isActive };
    if (editingCategory) updateCategory.mutate({ ...data, taskIds: selectedTaskIds, fixedTaskSlugs: selectedFixedSlugs });
    else createCategory.mutate(data);
  };

  const sortedCategories = categories?.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-primary" />
            Task Categories
          </h1>
          <CardDescription>
            Create categories to group tasks on the user dashboard. Assign tasks to categories in Task Manager.
          </CardDescription>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Users will see tasks grouped under these categories. Click a category to see only its tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : sortedCategories?.length === 0 ? (
            <p className="text-muted-foreground">No categories yet. Add one to group tasks on the user dashboard.</p>
          ) : (
            <div className="space-y-2">
              {sortedCategories?.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    {(cat.nameHi || cat.namePa) && (
                      <p className="text-xs text-muted-foreground">{[cat.nameHi, cat.namePa].filter(Boolean).join(" | ")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cat.isActive ? "default" : "secondary"}>{cat.isActive ? "Active" : "Inactive"}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingCategory(cat)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update name and assign tasks to this category." : "Create a new category for the user dashboard."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 overflow-y-auto flex-1 space-y-4 pb-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cat-name">Name (English) *</Label>
                  <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Field Work" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-nameHi">Name (Hindi)</Label>
                  <Input id="cat-nameHi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-namePa">Name (Punjabi)</Label>
                  <Input id="cat-namePa" value={namePa} onChange={(e) => setNamePa(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input id="cat-sortOrder" type="number" className="w-20" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} />
                  <Label htmlFor="cat-sortOrder">Sort order</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
                  <Label htmlFor="cat-active" className="cursor-pointer">Active on dashboard</Label>
                </div>
              </div>
              {editingCategory && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label className="text-base">Assign tasks to this category</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Tasks selected here will appear under this category on the app.</p>
                  </div>
                  <div className="max-h-52 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3">
                    {taskConfigs && taskConfigs.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From Task Manager</p>
                        <div className="space-y-1">
                          {taskConfigs.map((task) => (
                            <label key={task.id} className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-2 hover:bg-background transition-colors">
                              <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={() => toggleTask(task.id)}
                              />
                              <span className="text-sm select-none">{task.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fixed tasks</p>
                      <div className="space-y-1">
                        {FIXED_TASKS.map((ft) => (
                          <label key={ft.slug} className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-2 hover:bg-background transition-colors">
                            <Checkbox
                              checked={selectedFixedSlugs.includes(ft.slug)}
                              onCheckedChange={() => toggleFixedSlug(ft.slug)}
                            />
                            <span className="text-sm select-none">{ft.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-shrink-0 rounded-b-lg">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                {editingCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks in this category will become uncategorized. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategory && deleteCategory.mutate(deletingCategory.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

