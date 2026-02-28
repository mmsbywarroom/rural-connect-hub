import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

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

  const { data: categories, isLoading } = useQuery<TaskCategory[]>({
    queryKey: ["/api/task-categories"],
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
    mutationFn: async (data: { name: string; nameHi?: string; namePa?: string; sortOrder: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/task-categories/${editingCategory?.id}`, data),
    onSuccess: () => {
      toast({ title: "Category updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/task-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/task-categories"] });
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
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const data = { name: name.trim(), nameHi: nameHi.trim() || undefined, namePa: namePa.trim() || undefined, sortOrder, isActive };
    if (editingCategory) updateCategory.mutate(data);
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Name (English) *</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Field Work" required />
            </div>
            <div>
              <Label htmlFor="cat-nameHi">Name (Hindi)</Label>
              <Input id="cat-nameHi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="cat-namePa">Name (Punjabi)</Label>
              <Input id="cat-namePa" value={namePa} onChange={(e) => setNamePa(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="cat-sortOrder">Sort Order</Label>
              <Input id="cat-sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="cat-active">Active (show on user dashboard)</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                {editingCategory ? "Update" : "Create"}
              </Button>
            </div>
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

