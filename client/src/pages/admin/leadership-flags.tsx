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
import type { LeadershipFlag } from "@shared/schema";

const leadershipFlagFormSchema = z.object({
  name: z.string().min(1, "Flag name is required"),
  color: z.string().default("#3b82f6"),
  isActive: z.boolean().default(true),
});

type LeadershipFlagFormData = z.infer<typeof leadershipFlagFormSchema>;

export default function LeadershipFlagsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<LeadershipFlag | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<LeadershipFlagFormData>({
    resolver: zodResolver(leadershipFlagFormSchema),
    defaultValues: { name: "", color: "#3b82f6", isActive: true },
  });

  const { data: flags, isLoading } = useQuery<LeadershipFlag[]>({
    queryKey: ["/api/leadership-flags"],
  });

  const createFlag = useMutation({
    mutationFn: async (data: LeadershipFlagFormData) => apiRequest("POST", "/api/leadership-flags", data),
    onSuccess: () => {
      toast({ title: "Leadership flag added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/leadership-flags"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add flag", variant: "destructive" }),
  });

  const updateFlag = useMutation({
    mutationFn: async (data: LeadershipFlagFormData) => apiRequest("PATCH", `/api/leadership-flags/${editingFlag?.id}`, data),
    onSuccess: () => {
      toast({ title: "Leadership flag updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/leadership-flags"] });
      setIsOpen(false);
      setEditingFlag(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update flag", variant: "destructive" }),
  });

  const handleEdit = (flag: LeadershipFlag) => {
    setEditingFlag(flag);
    form.reset({ name: flag.name, color: flag.color || "#3b82f6", isActive: flag.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingFlag(null);
    form.reset({ name: "", color: "#3b82f6", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: LeadershipFlagFormData) => {
    if (editingFlag) {
      updateFlag.mutate(data);
    } else {
      createFlag.mutate(data);
    }
  };

  const filteredFlags = flags?.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-leadership-flags-title">
            <Flag className="h-6 w-6 text-primary" />
            Leadership Flags
          </h1>
          <p className="text-muted-foreground">Manage volunteer activity levels</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-leadership-flag">
              <Plus className="h-4 w-4 mr-2" />
              Add Flag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFlag ? "Edit Leadership Flag" : "Add New Leadership Flag"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flag Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Very Active, Active, Inactive" {...field} data-testid="input-flag-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-16 h-10 p-1 cursor-pointer" {...field} />
                          <Input value={field.value} onChange={field.onChange} placeholder="#3b82f6" className="flex-1" />
                        </div>
                      </FormControl>
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
                <Button type="submit" className="w-full" disabled={createFlag.isPending || updateFlag.isPending} data-testid="button-save-leadership-flag">
                  {editingFlag ? "Update" : "Add"} Flag
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
                placeholder="Search flags..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-flags"
              />
            </div>
            <Badge variant="secondary">{filteredFlags?.length || 0} flags</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredFlags?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Flag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No leadership flags found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlags?.map((flag) => (
                  <TableRow key={flag.id} data-testid={`row-flag-${flag.id}`}>
                    <TableCell className="font-medium">{flag.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: flag.color || "#3b82f6" }}
                        />
                        <span className="text-sm text-muted-foreground">{flag.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={flag.isActive ? "default" : "secondary"}>
                        {flag.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(flag)} data-testid={`button-edit-flag-${flag.id}`}>
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
