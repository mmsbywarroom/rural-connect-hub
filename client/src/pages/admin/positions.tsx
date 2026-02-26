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
import { Plus, Edit, GraduationCap, Search } from "lucide-react";
import type { Position } from "@shared/schema";

const positionFormSchema = z.object({
  name: z.string().min(1, "Position name is required"),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

type PositionFormData = z.infer<typeof positionFormSchema>;

export default function PositionsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: { name: "", displayOrder: 0, isActive: true },
  });

  const { data: positions, isLoading } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
  });

  const createPosition = useMutation({
    mutationFn: async (data: PositionFormData) => apiRequest("POST", "/api/positions", data),
    onSuccess: () => {
      toast({ title: "Position added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add position", variant: "destructive" }),
  });

  const updatePosition = useMutation({
    mutationFn: async (data: PositionFormData) => apiRequest("PATCH", `/api/positions/${editingPosition?.id}`, data),
    onSuccess: () => {
      toast({ title: "Position updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      setIsOpen(false);
      setEditingPosition(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update position", variant: "destructive" }),
  });

  const handleEdit = (position: Position) => {
    setEditingPosition(position);
    form.reset({ name: position.name, displayOrder: position.displayOrder ?? 0, isActive: position.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingPosition(null);
    form.reset({ name: "", displayOrder: 0, isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: PositionFormData) => {
    if (editingPosition) {
      updatePosition.mutate(data);
    } else {
      createPosition.mutate(data);
    }
  };

  const filteredPositions = positions?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-positions-title">
            <GraduationCap className="h-6 w-6 text-primary" />
            Positions
          </h1>
          <p className="text-muted-foreground">Manage volunteer positions</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-position">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPosition ? "Edit Position" : "Add New Position"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter position name" {...field} data-testid="input-position-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-position-display-order" />
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
                <Button type="submit" className="w-full" disabled={createPosition.isPending || updatePosition.isPending} data-testid="button-save-position">
                  {editingPosition ? "Update" : "Add"} Position
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
                placeholder="Search positions..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-positions"
              />
            </div>
            <Badge variant="secondary">{filteredPositions?.length || 0} positions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredPositions?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No positions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Position Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions?.map((position) => (
                  <TableRow key={position.id} data-testid={`row-position-${position.id}`}>
                    <TableCell className="text-muted-foreground">{position.displayOrder ?? 0}</TableCell>
                    <TableCell className="font-medium">{position.name}</TableCell>
                    <TableCell>
                      <Badge variant={position.isActive ? "default" : "secondary"}>
                        {position.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(position)} data-testid={`button-edit-position-${position.id}`}>
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
