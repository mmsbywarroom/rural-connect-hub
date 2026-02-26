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
import { Plus, Edit, Briefcase, Search, Trash2 } from "lucide-react";
import type { GovPosition } from "@shared/schema";

const govPositionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean().default(true),
});

type GovPositionFormData = z.infer<typeof govPositionFormSchema>;

export default function GovPositionsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingGovPosition, setEditingGovPosition] = useState<GovPosition | null>(null);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<GovPositionFormData>({
    resolver: zodResolver(govPositionFormSchema),
    defaultValues: { name: "", isActive: true },
  });

  const { data: govPositions, isLoading } = useQuery<GovPosition[]>({
    queryKey: ["/api/gov-positions"],
  });

  const createGovPosition = useMutation({
    mutationFn: async (data: GovPositionFormData) => apiRequest("POST", "/api/gov-positions", data),
    onSuccess: () => {
      toast({ title: "Govt Position added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-positions"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add", variant: "destructive" }),
  });

  const updateGovPosition = useMutation({
    mutationFn: async (data: GovPositionFormData) => apiRequest("PATCH", `/api/gov-positions/${editingGovPosition?.id}`, data),
    onSuccess: () => {
      toast({ title: "Govt Position updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-positions"] });
      setIsOpen(false);
      setEditingGovPosition(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/gov-positions/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gov-positions"] });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const deleteGovPosition = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/gov-positions/${id}`),
    onSuccess: () => {
      toast({ title: "Govt Position deleted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/gov-positions"] });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const handleEdit = (gp: GovPosition) => {
    setEditingGovPosition(gp);
    form.reset({ name: gp.name, isActive: gp.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingGovPosition(null);
    form.reset({ name: "", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: GovPositionFormData) => {
    if (editingGovPosition) {
      updateGovPosition.mutate(data);
    } else {
      createGovPosition.mutate(data);
    }
  };

  const filteredGovPositions = govPositions?.filter((gp) =>
    gp.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-gov-positions-title">
            <Briefcase className="h-6 w-6 text-primary" />
            Govt Positions
          </h1>
          <p className="text-muted-foreground">Manage Government Position options for Govt Post Holders</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-gov-position">
              <Plus className="h-4 w-4 mr-2" />
              Add Govt Position
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGovPosition ? "Edit Govt Position" : "Add New Govt Position"}</DialogTitle>
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
                        <Input placeholder="Enter govt position name" {...field} data-testid="input-gov-position-name" />
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
                <Button type="submit" className="w-full" disabled={createGovPosition.isPending || updateGovPosition.isPending} data-testid="button-save-gov-position">
                  {editingGovPosition ? "Update" : "Add"} Govt Position
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
                placeholder="Search govt positions..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-gov-positions"
              />
            </div>
            <Badge variant="secondary">{filteredGovPositions?.length || 0} items</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredGovPositions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No Govt Positions found</p>
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
                {filteredGovPositions?.map((gp) => (
                  <TableRow key={gp.id} data-testid={`row-gov-position-${gp.id}`}>
                    <TableCell className="font-medium">{gp.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={gp.isActive ? "default" : "secondary"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleStatus.mutate({ id: gp.id, isActive: !gp.isActive })}
                        data-testid={`badge-toggle-status-${gp.id}`}
                      >
                        {gp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(gp)} data-testid={`button-edit-gov-position-${gp.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(gp.id)} data-testid={`button-delete-gov-position-${gp.id}`}>
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
            <DialogTitle>Delete Govt Position</DialogTitle>
            <DialogDescription>Are you sure you want to delete this item? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteGovPosition.mutate(deleteId)} disabled={deleteGovPosition.isPending} data-testid="button-confirm-delete-gov-position">
              {deleteGovPosition.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
