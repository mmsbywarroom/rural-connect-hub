import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, UserCog, Eye, EyeOff } from "lucide-react";
import type { OfficeManager } from "@shared/schema";

const officeManagerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  userId: z.string().min(3, "User ID must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  isActive: z.boolean().optional(),
});

type OfficeManagerFormData = z.infer<typeof officeManagerSchema>;

export default function OfficeManagersPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<OfficeManager | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<OfficeManagerFormData>({
    resolver: zodResolver(officeManagerSchema),
    defaultValues: { name: "", userId: "", password: "", isActive: true },
  });

  const { data: managers, isLoading } = useQuery<OfficeManager[]>({
    queryKey: ["/api/office-managers"],
  });

  const createManager = useMutation({
    mutationFn: async (data: OfficeManagerFormData) => {
      return apiRequest("POST", "/api/office-managers", data);
    },
    onSuccess: () => {
      toast({ title: "Office manager added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/office-managers"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add office manager", variant: "destructive" });
    },
  });

  const updateManager = useMutation({
    mutationFn: async (data: OfficeManagerFormData) => {
      return apiRequest("PATCH", `/api/office-managers/${editingManager?.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Office manager updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/office-managers"] });
      setIsOpen(false);
      setEditingManager(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update office manager", variant: "destructive" });
    },
  });

  const handleEdit = (manager: OfficeManager) => {
    setEditingManager(manager);
    form.reset({
      name: manager.name,
      userId: manager.userId,
      password: manager.password,
      isActive: manager.isActive ?? true,
    });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingManager(null);
    form.reset({ name: "", userId: "", password: "", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: OfficeManagerFormData) => {
    if (editingManager) {
      updateManager.mutate(data);
    } else {
      createManager.mutate(data);
    }
  };

  const toggleStatus = async (manager: OfficeManager) => {
    try {
      await apiRequest("PATCH", `/api/office-managers/${manager.id}`, { isActive: !manager.isActive });
      queryClient.invalidateQueries({ queryKey: ["/api/office-managers"] });
      toast({ title: `Manager ${manager.isActive ? "deactivated" : "activated"}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Office Managers
          </h1>
          <p className="text-muted-foreground text-sm">Manage office portal access</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-office-manager">
              <Plus className="h-4 w-4 mr-2" />
              Add Manager
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>{editingManager ? "Edit Office Manager" : "Add Office Manager"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} data-testid="input-manager-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="Login user ID" {...field} data-testid="input-manager-userid" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Login password" 
                            {...field} 
                            data-testid="input-manager-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {editingManager && (
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                <Button type="submit" className="w-full" disabled={createManager.isPending || updateManager.isPending} data-testid="button-save-manager">
                  {editingManager ? "Update" : "Add"} Office Manager
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <Badge variant="secondary">{managers?.length || 0} managers</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : managers?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No office managers added yet</p>
              <p className="text-sm">Add office managers to enable portal login</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers?.map((manager) => (
                    <TableRow key={manager.id} data-testid={`row-manager-${manager.id}`}>
                      <TableCell className="font-medium">{manager.name}</TableCell>
                      <TableCell className="text-muted-foreground">{manager.userId}</TableCell>
                      <TableCell>
                        <Badge variant={manager.isActive ? "default" : "secondary"}>
                          {manager.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(manager)} data-testid={`button-edit-manager-${manager.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(manager)}>
                          {manager.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
