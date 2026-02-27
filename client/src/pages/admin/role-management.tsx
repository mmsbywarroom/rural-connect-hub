import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Shield, ShieldCheck, Loader2 } from "lucide-react";
import type { AdminRole } from "@shared/schema";

const ALL_PERMISSIONS = [
  { id: "user-management", label: "User Management", group: "Management", hasSubPerms: true },
  { id: "volunteers", label: "Volunteers", group: "Management", hasSubPerms: true },
  { id: "visitors", label: "Office Visitors", group: "Management", hasSubPerms: true },
  { id: "office-managers", label: "Office Managers", group: "Management", hasSubPerms: true },
  { id: "task-manager", label: "Task Manager", group: "Management", hasSubPerms: true },
  { id: "hstc", label: "Harr Sirr te Chatt", group: "Management", hasSubPerms: true },
  { id: "sdsk", label: "Sukh-Dukh Saanjha Karo", group: "Management", hasSubPerms: true },
  { id: "surveys", label: "Survey Manager", group: "Management", hasSubPerms: true },
  { id: "birthdays", label: "Birthday Manager", group: "Management", hasSubPerms: true },
  { id: "villages", label: "Villages", group: "Master Data", hasSubPerms: true },
  { id: "issues", label: "Issues", group: "Master Data", hasSubPerms: true },
  { id: "departments", label: "Departments", group: "Master Data", hasSubPerms: true },
  { id: "wings", label: "Wings", group: "Master Data", hasSubPerms: true },
  { id: "gov-wings", label: "Punjab Gov Wing", group: "Master Data", hasSubPerms: true },
  { id: "gov-positions", label: "Govt Positions", group: "Master Data", hasSubPerms: true },
  { id: "positions", label: "Positions", group: "Tools", hasSubPerms: true },
  { id: "leadership", label: "Leadership Flags", group: "Tools", hasSubPerms: true },
  { id: "voter-database", label: "Voter Database", group: "Tools", hasSubPerms: true },
  { id: "csv-upload", label: "CSV Upload", group: "Tools", hasSubPerms: true },
  { id: "data-export", label: "Data Export", group: "Tools", hasSubPerms: true },
  { id: "analytics", label: "Analytics Dashboard", group: "Analytics", hasSubPerms: true },
  { id: "task-reports", label: "Task Reports", group: "Analytics", hasSubPerms: true },
  { id: "user-reports", label: "User Reports", group: "Analytics", hasSubPerms: true },
  { id: "role-management", label: "Role Management", group: "Management", hasSubPerms: true },
  { id: "sunwai", label: "Sunwai (Complaints)", group: "Management", hasSubPerms: true },
  { id: "nvy", label: "Nasha Viruddh Yuddh", group: "Management", hasSubPerms: false },
  { id: "outdoor-ads", label: "Outdoor Ads", group: "Management", hasSubPerms: true },
  { id: "gov-school", label: "Gov School Work", group: "Management", hasSubPerms: true },
];

const SUB_PERMISSIONS: Record<string, { id: string; label: string }[]> = {
  "user-management": [
    { id: "user-management:view", label: "View" },
    { id: "user-management:create", label: "Create" },
    { id: "user-management:edit", label: "Edit" },
    { id: "user-management:delete", label: "Delete" },
    { id: "user-management:approve", label: "Approve" },
    { id: "user-management:csv-download", label: "CSV Download" },
  ],
  "volunteers": [
    { id: "volunteers:view", label: "View" },
    { id: "volunteers:create", label: "Create" },
    { id: "volunteers:edit", label: "Edit" },
    { id: "volunteers:delete", label: "Delete" },
    { id: "volunteers:csv-download", label: "CSV Download" },
  ],
  "visitors": [
    { id: "visitors:view", label: "View" },
    { id: "visitors:create", label: "Create" },
    { id: "visitors:edit", label: "Edit" },
    { id: "visitors:delete", label: "Delete" },
    { id: "visitors:csv-download", label: "CSV Download" },
  ],
  "office-managers": [
    { id: "office-managers:view", label: "View" },
    { id: "office-managers:create", label: "Create" },
    { id: "office-managers:edit", label: "Edit" },
    { id: "office-managers:delete", label: "Delete" },
  ],
  "task-manager": [
    { id: "task-manager:view", label: "View" },
    { id: "task-manager:create", label: "Create" },
    { id: "task-manager:edit", label: "Edit" },
    { id: "task-manager:delete", label: "Delete" },
  ],
  "hstc": [
    { id: "hstc:view", label: "View" },
    { id: "hstc:edit", label: "Edit" },
    { id: "hstc:approve", label: "Approve/Reject" },
    { id: "hstc:csv-download", label: "CSV Download" },
  ],
  "sdsk": [
    { id: "sdsk:view", label: "View" },
    { id: "sdsk:accept", label: "Accept" },
    { id: "sdsk:close", label: "Close" },
    { id: "sdsk:manage-categories", label: "Manage Categories" },
    { id: "sdsk:csv-download", label: "CSV Download" },
  ],
  "surveys": [
    { id: "surveys:view", label: "View" },
    { id: "surveys:create", label: "Create" },
    { id: "surveys:edit", label: "Edit" },
    { id: "surveys:delete", label: "Delete" },
    { id: "surveys:csv-download", label: "CSV Download" },
  ],
  "birthdays": [
    { id: "birthdays:view", label: "View" },
    { id: "birthdays:edit", label: "Edit" },
    { id: "birthdays:send-wish", label: "Send Birthday Wish" },
  ],
  "villages": [
    { id: "villages:view", label: "View" },
    { id: "villages:create", label: "Create" },
    { id: "villages:edit", label: "Edit" },
    { id: "villages:delete", label: "Delete" },
    { id: "villages:csv-download", label: "CSV Download" },
  ],
  "issues": [
    { id: "issues:view", label: "View" },
    { id: "issues:create", label: "Create" },
    { id: "issues:edit", label: "Edit" },
    { id: "issues:delete", label: "Delete" },
  ],
  "departments": [
    { id: "departments:view", label: "View" },
    { id: "departments:create", label: "Create" },
    { id: "departments:edit", label: "Edit" },
    { id: "departments:delete", label: "Delete" },
  ],
  "wings": [
    { id: "wings:view", label: "View" },
    { id: "wings:create", label: "Create" },
    { id: "wings:edit", label: "Edit" },
    { id: "wings:delete", label: "Delete" },
  ],
  "gov-wings": [
    { id: "gov-wings:view", label: "View" },
    { id: "gov-wings:create", label: "Create" },
    { id: "gov-wings:edit", label: "Edit" },
    { id: "gov-wings:delete", label: "Delete" },
  ],
  "gov-positions": [
    { id: "gov-positions:view", label: "View" },
    { id: "gov-positions:create", label: "Create" },
    { id: "gov-positions:edit", label: "Edit" },
    { id: "gov-positions:delete", label: "Delete" },
  ],
  "positions": [
    { id: "positions:view", label: "View" },
    { id: "positions:create", label: "Create" },
    { id: "positions:edit", label: "Edit" },
    { id: "positions:delete", label: "Delete" },
  ],
  "leadership": [
    { id: "leadership:view", label: "View" },
    { id: "leadership:create", label: "Create" },
    { id: "leadership:edit", label: "Edit" },
    { id: "leadership:delete", label: "Delete" },
  ],
  "voter-database": [
    { id: "voter-database:view", label: "View" },
    { id: "voter-database:csv-download", label: "CSV Download" },
  ],
  "csv-upload": [
    { id: "csv-upload:view", label: "View" },
    { id: "csv-upload:upload", label: "Upload" },
  ],
  "data-export": [
    { id: "data-export:view", label: "View" },
    { id: "data-export:csv-download", label: "CSV Download" },
  ],
  "analytics": [
    { id: "analytics:view", label: "View" },
    { id: "analytics:csv-download", label: "CSV Download" },
  ],
  "task-reports": [
    { id: "task-reports:view", label: "View" },
    { id: "task-reports:csv-download", label: "CSV Download" },
  ],
  "user-reports": [
    { id: "user-reports:view", label: "View" },
    { id: "user-reports:csv-download", label: "CSV Download" },
  ],
  "role-management": [
    { id: "role-management:view", label: "View" },
    { id: "role-management:create", label: "Create" },
    { id: "role-management:edit", label: "Edit" },
    { id: "role-management:delete", label: "Delete" },
  ],
  "sunwai": [
    { id: "sunwai:view", label: "View" },
    { id: "sunwai:accept", label: "Accept" },
    { id: "sunwai:complete", label: "Complete" },
  ],
  "outdoor-ads": [
    { id: "outdoor-ads:view", label: "View" },
    { id: "outdoor-ads:approve", label: "Approve" },
  ],
  "gov-school": [
    { id: "gov-school:view", label: "View" },
    { id: "gov-school:accept", label: "Accept" },
    { id: "gov-school:resolve", label: "Resolve" },
    { id: "gov-school:categories", label: "Manage Categories" },
  ],
  "appointments": [
    { id: "appointments:view", label: "View" },
    { id: "appointments:schedule", label: "Schedule" },
    { id: "appointments:resolve", label: "Resolve" },
  ],
};

const PERMISSION_GROUPS = ["Management", "Master Data", "Tools", "Analytics"];

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
  isActive: z.boolean().default(true),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

export default function RoleManagementPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      permissions: [],
      isActive: true,
    },
  });

  const { data: roles, isLoading } = useQuery<AdminRole[]>({
    queryKey: ["/api/admin-roles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormData) => apiRequest("POST", "/api/admin-roles", data),
    onSuccess: () => {
      toast({ title: "Role created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-roles"] });
      setIsOpen(false);
      form.reset();
    },
    onError: () => toast({ title: "Failed to create role", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RoleFormData> }) =>
      apiRequest("PATCH", `/api/admin-roles/${id}`, data),
    onSuccess: () => {
      toast({ title: "Role updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-roles"] });
      setIsOpen(false);
      setEditingRole(null);
      form.reset();
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin-roles/${id}`),
    onSuccess: () => {
      toast({ title: "Role deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-roles"] });
      setDeletingRole(null);
    },
    onError: () => toast({ title: "Failed to delete role", variant: "destructive" }),
  });

  const handleOpenCreate = () => {
    setEditingRole(null);
    form.reset({ name: "", permissions: [], isActive: true });
    setIsOpen(true);
  };

  const handleOpenEdit = (role: AdminRole) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      permissions: role.permissions || [],
      isActive: role.isActive ?? true,
    });
    setIsOpen(true);
  };

  const handleSubmit = (data: RoleFormData) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleAllPermissions = (checked: boolean) => {
    if (checked) {
      const allIds = ALL_PERMISSIONS.map((p) => p.id);
      Object.values(SUB_PERMISSIONS).forEach(subs => subs.forEach(sp => allIds.push(sp.id)));
      form.setValue("permissions", allIds);
    } else {
      form.setValue("permissions", []);
    }
  };

  const toggleGroupPermissions = (group: string, checked: boolean) => {
    const current = form.getValues("permissions");
    const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === group);
    const groupIds = groupPerms.map((p) => p.id);
    const subIds: string[] = [];
    groupPerms.forEach(p => { if (SUB_PERMISSIONS[p.id]) SUB_PERMISSIONS[p.id].forEach(sp => subIds.push(sp.id)); });
    if (checked) {
      const combined = Array.from(new Set([...current, ...groupIds, ...subIds]));
      form.setValue("permissions", combined);
    } else {
      form.setValue("permissions", current.filter((id) => !groupIds.includes(id) && !subIds.includes(id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-role-title">Role Management</h1>
          <p className="text-muted-foreground">Create and manage admin roles with specific permissions</p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-create-role">
          <Plus className="h-4 w-4 mr-2" /> Create Role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles?.map((role) => (
          <Card key={role.id} data-testid={`card-role-${role.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base" data-testid={`text-role-name-${role.id}`}>{role.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(role)} data-testid={`button-edit-role-${role.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeletingRole(role)} data-testid={`button-delete-role-${role.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {role.permissions?.length === ALL_PERMISSIONS.length ? (
                  <Badge variant="default" className="bg-green-600">All Access</Badge>
                ) : (
                  role.permissions?.slice(0, 5).map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {ALL_PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                    </Badge>
                  ))
                )}
                {(role.permissions?.length || 0) > 5 && (
                  <Badge variant="outline" className="text-xs">+{role.permissions!.length - 5} more</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {role.permissions?.length || 0} permission{(role.permissions?.length || 0) !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}

        {(!roles || roles.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No roles created yet. Click "Create Role" to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setIsOpen(false); setEditingRole(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-role-form">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Data Manager, Reports Viewer" {...field} data-testid="input-role-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Checkbox
                          checked={field.value.length === ALL_PERMISSIONS.length}
                          onCheckedChange={(checked) => toggleAllPermissions(!!checked)}
                          data-testid="checkbox-select-all"
                        />
                        <span className="text-sm font-medium">Select All</span>
                      </div>

                      {PERMISSION_GROUPS.map((group) => {
                        const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === group);
                        const allChecked = groupPerms.every((p) => field.value.includes(p.id));
                        const someChecked = groupPerms.some((p) => field.value.includes(p.id));
                        return (
                          <div key={group} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={(checked) => toggleGroupPermissions(group, !!checked)}
                                data-testid={`checkbox-group-${group.toLowerCase().replace(/\s/g, "-")}`}
                              />
                              <span className="text-sm font-semibold text-muted-foreground">{group}</span>
                            </div>
                            <div className="ml-6 grid grid-cols-2 gap-1">
                              {groupPerms.map((perm) => {
                                const subPerms = SUB_PERMISSIONS[perm.id];
                                const isChecked = field.value.includes(perm.id);
                                return (
                                  <div key={perm.id} className={subPerms ? "col-span-2" : ""}>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            const newPerms = [...field.value, perm.id];
                                            if (subPerms) {
                                              subPerms.forEach(sp => { if (!newPerms.includes(sp.id)) newPerms.push(sp.id); });
                                            }
                                            field.onChange(newPerms);
                                          } else {
                                            let filtered = field.value.filter((v: string) => v !== perm.id);
                                            if (subPerms) {
                                              filtered = filtered.filter((v: string) => !subPerms.some(sp => sp.id === v));
                                            }
                                            field.onChange(filtered);
                                          }
                                        }}
                                        data-testid={`checkbox-perm-${perm.id}`}
                                      />
                                      <span className="text-sm">{perm.label}</span>
                                    </div>
                                    {subPerms && isChecked && (
                                      <div className="ml-8 mt-1 mb-2 flex flex-wrap gap-x-4 gap-y-1 p-2 bg-slate-50 rounded-md border">
                                        {subPerms.map(sp => (
                                          <div key={sp.id} className="flex items-center gap-1.5">
                                            <Checkbox
                                              checked={field.value.includes(sp.id)}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  field.onChange([...field.value, sp.id]);
                                                } else {
                                                  field.onChange(field.value.filter((v: string) => v !== sp.id));
                                                }
                                              }}
                                              data-testid={`checkbox-perm-${sp.id}`}
                                            />
                                            <span className="text-xs">{sp.label}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setEditingRole(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-role">
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingRole ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingRole} onOpenChange={(open) => { if (!open) setDeletingRole(null); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-delete-role">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the role "{deletingRole?.name}"? Users assigned to this role will lose their permissions.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRole(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingRole && deleteMutation.mutate(deletingRole.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-role">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
