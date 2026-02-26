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
import { Plus, Edit, Briefcase, Search } from "lucide-react";
import type { Department } from "@shared/schema";

const departmentFormSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  isActive: z.boolean().default(true),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", isActive: true },
  });

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const createDepartment = useMutation({
    mutationFn: async (data: DepartmentFormData) => apiRequest("POST", "/api/departments", data),
    onSuccess: () => {
      toast({ title: "Department added!" });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to add department", variant: "destructive" }),
  });

  const updateDepartment = useMutation({
    mutationFn: async (data: DepartmentFormData) => apiRequest("PATCH", `/api/departments/${editingDepartment?.id}`, data),
    onSuccess: () => {
      toast({ title: "Department updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsOpen(false);
      setEditingDepartment(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update department", variant: "destructive" }),
  });

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    form.reset({ name: department.name, isActive: department.isActive ?? true });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    form.reset({ name: "", isActive: true });
    setIsOpen(true);
  };

  const onSubmit = (data: DepartmentFormData) => {
    if (editingDepartment) {
      updateDepartment.mutate(data);
    } else {
      createDepartment.mutate(data);
    }
  };

  const filteredDepartments = departments?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-departments-title">
            <Briefcase className="h-6 w-6 text-primary" />
            Departments
          </h1>
          <p className="text-muted-foreground">Manage government departments</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd} data-testid="button-add-department">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDepartment ? "Edit Department" : "Add New Department"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter department name" {...field} data-testid="input-department-name" />
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
                <Button type="submit" className="w-full" disabled={createDepartment.isPending || updateDepartment.isPending} data-testid="button-save-department">
                  {editingDepartment ? "Update" : "Add"} Department
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
                placeholder="Search departments..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-departments"
              />
            </div>
            <Badge variant="secondary">{filteredDepartments?.length || 0} departments</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredDepartments?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No departments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments?.map((department) => (
                  <TableRow key={department.id} data-testid={`row-department-${department.id}`}>
                    <TableCell className="font-medium">{department.name}</TableCell>
                    <TableCell>
                      <Badge variant={department.isActive ? "default" : "secondary"}>
                        {department.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(department)} data-testid={`button-edit-department-${department.id}`}>
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
