import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Landmark, Search, Trash2 } from "lucide-react";
import type { GovWing } from "@shared/schema";

const govWingFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean().default(true),
});

type GovWingFormData = z.infer<typeof govWingFormSchema>;

export default function GovWingsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingGovWing, setEditingGovWing] = useState<GovWing | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<GovWingFormData>({
    resolver: zodResolver(govWingFormSchema),
    defaultValues: { name: "", isActive: true },
  });

  const { data: govWings, isLoading } = useQuery<GovWing[]>({
    queryKey: ["/api/gov-wings"],
  });

  const createGovWing = useMutation({
    mutationFn: async (data: GovWingFormData) => apiRequest("POST", "/api/gov-wings", data),
    onSuccess: () => {
      toast({ title: "Punjab Gov Wing added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-wings"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add", variant: "destructive" }),
  });

  const updateGovWing = useMutation({
    mutationFn: async (data: GovWingFormData) => apiRequest("PATCH", `/api/gov-wings/${editingGovWing?.id}`, data),
    onSuccess: () => {
      toast({ title: "Punjab Gov Wing updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-wings"] });
      setIsOpen(false);
      setEditingGovWing(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/gov-wings/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gov-wings"] });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const deleteGovWing = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/gov-wings/${id}`),
    onSuccess: () => {
      toast({ title: "Punjab Gov Wing deleted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-wings"] });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const handleEdit = (gw: GovWing) => {
    setEditingGovWing(gw);
    form.reset({ name: gw.name, isActive: gw.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingGovWing(null);
    form.reset({ name: "", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: GovWingFormData) => {
    if (editingGovWing) {
      updateGovWing.mutate(data);
    } else {
      createGovWing.mutate(data);
    }
  };

  const filteredGovWings = govWings?.filter((gw) =>
    gw.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-gov-wings-title">
            <Landmark className="h-6 w-6 text-primary" />
            Punjab Gov Wing
          </h1>
          <p className="text-muted-foreground">Manage Punjab Government Wing options</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-gov-wing">
              <Plus className="h-4 w-4 mr-2" />
              Add Gov Wing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGovWing ? "Edit Gov Wing" : "Add New Gov Wing"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter gov wing name" {...field} data-testid="input-gov-wing-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createGovWing.isPending || updateGovWing.isPending} data-testid="button-save-gov-wing">
                  {editingGovWing ? "Update" : "Add"} Gov Wing
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gov wings..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-gov-wings"
              />
            </div>
            <Badge variant="secondary">{filteredGovWings?.length || 0} items</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredGovWings?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No Punjab Gov Wing items found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGovWings?.map((gw) => (
                  <TableRow key={gw.id} data-testid={`row-gov-wing-${gw.id}`}>
                    <TableCell className="font-medium">{gw.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={gw.isActive ? "default" : "secondary"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleStatus.mutate({ id: gw.id, isActive: !gw.isActive })}
                        data-testid={`badge-toggle-status-${gw.id}`}
                      >
                        {gw.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(gw)} data-testid={`button-edit-gov-wing-${gw.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(gw.id)} data-testid={`button-delete-gov-wing-${gw.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gov Wing</DialogTitle>
            <DialogDescription>Are you sure you want to delete this item? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteGovWing.mutate(deleteId)} disabled={deleteGovWing.isPending} data-testid="button-confirm-delete-gov-wing">
              {deleteGovWing.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
