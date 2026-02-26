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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Flag, Search } from "lucide-react";
import type { Wing } from "@shared/schema";

const wingFormSchema = z.object({
  name: z.string().min(1, "Wing name is required"),
  isActive: z.boolean().default(true),
});

type WingFormData = z.infer<typeof wingFormSchema>;

export default function WingsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingWing, setEditingWing] = useState<Wing | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<WingFormData>({
    resolver: zodResolver(wingFormSchema),
    defaultValues: { name: "", isActive: true },
  });

  const { data: wings, isLoading } = useQuery<Wing[]>({
    queryKey: ["/api/wings"],
  });

  const createWing = useMutation({
    mutationFn: async (data: WingFormData) => apiRequest("POST", "/api/wings", data),
    onSuccess: () => {
      toast({ title: "Wing added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/wings"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add wing", variant: "destructive" }),
  });

  const updateWing = useMutation({
    mutationFn: async (data: WingFormData) => apiRequest("PATCH", `/api/wings/${editingWing?.id}`, data),
    onSuccess: () => {
      toast({ title: "Wing updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/wings"] });
      setIsOpen(false);
      setEditingWing(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update wing", variant: "destructive" }),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/wings/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wings"] });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const handleEdit = (wing: Wing) => {
    setEditingWing(wing);
    form.reset({ name: wing.name, isActive: wing.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingWing(null);
    form.reset({ name: "", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: WingFormData) => {
    if (editingWing) {
      updateWing.mutate(data);
    } else {
      createWing.mutate(data);
    }
  };

  const filteredWings = wings?.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-wings-title">
            <Flag className="h-6 w-6 text-primary" />
            Wings
          </h1>
          <p className="text-muted-foreground">Manage organizational wings</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-wing">
              <Plus className="h-4 w-4 mr-2" />
              Add Wing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWing ? "Edit Wing" : "Add New Wing"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wing Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter wing name" {...field} data-testid="input-wing-name" />
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
                <Button type="submit" className="w-full" disabled={createWing.isPending || updateWing.isPending} data-testid="button-save-wing">
                  {editingWing ? "Update" : "Add"} Wing
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
                placeholder="Search wings..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-wings"
              />
            </div>
            <Badge variant="secondary">{filteredWings?.length || 0} wings</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredWings?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Flag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No wings found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wing Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWings?.map((wing) => (
                  <TableRow key={wing.id} data-testid={`row-wing-${wing.id}`}>
                    <TableCell className="font-medium">{wing.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={wing.isActive ? "default" : "secondary"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleStatus.mutate({ id: wing.id, isActive: !wing.isActive })}
                        data-testid={`badge-toggle-status-${wing.id}`}
                      >
                        {wing.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(wing)} data-testid={`button-edit-wing-${wing.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
