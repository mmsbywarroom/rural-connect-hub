import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Ban, ShieldCheck,
  Users, UserCog, Eye, EyeOff, Download, Phone, Mail, Chrome, CheckCircle, BadgeCheck,
} from "lucide-react";
import { getProfileCompletion } from "@/lib/profile-completion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { AppUser, OfficeManager, Wing, Position, Village, GovWing, AdminRole } from "@shared/schema";

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const appUserSchema = z.object({
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  wing: z.string().optional(),
  govWing: z.string().optional(),
  currentPosition: z.string().optional(),
  level: z.string().optional(),
  mappedAreaId: z.string().optional(),
});

const adminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  userId: z.string().min(3, "User ID must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  isActive: z.boolean().optional(),
  roleId: z.string().optional(),
  assignedVillages: z.array(z.string()).optional(),
});

type AppUserFormData = z.infer<typeof appUserSchema>;
type AdminFormData = z.infer<typeof adminSchema>;

const LEVELS = ["State", "Zone", "District", "Halka", "Block", "Village/Ward"];

export default function UserManagementPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState("app-users");
  const [search, setSearch] = useState("");

  const isSuperAdmin = (() => {
    try {
      const stored = localStorage.getItem("adminUser");
      if (stored) {
        const u = JSON.parse(stored);
        return u.username === "9625692122";
      }
    } catch {}
    return false;
  })();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<{ open: boolean; id: string; name: string; role: string; wing: string; govWing: string; currentPosition: string; level: string }>({
    open: false, id: "", name: "", role: "", wing: "", govWing: "", currentPosition: "", level: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | number; name: string; type: "app" | "admin" }>({
    open: false, id: "", name: "", type: "app",
  });

  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<{ open: boolean; manager: OfficeManager | null }>({
    open: false, manager: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [reset2faTarget, setReset2faTarget] = useState<{ open: boolean; id: string; name: string } | null>(null);

  const { data: appUsers, isLoading: usersLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/admin/app-users"],
  });

  const { data: managers, isLoading: managersLoading } = useQuery<OfficeManager[]>({
    queryKey: ["/api/office-managers"],
  });

  const { data: wingsData } = useQuery<Wing[]>({
    queryKey: ["/api/wings"],
  });

  const { data: positionsData } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
  });

  const { data: villagesData } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const { data: govWingsData } = useQuery<GovWing[]>({
    queryKey: ["/api/gov-wings"],
  });

  const activeWings = wingsData?.filter(w => w.isActive) || [];
  const activePositions = positionsData?.filter(p => p.isActive) || [];
  const activeVillages = villagesData?.filter(v => v.isActive) || [];
  const activeGovWings = govWingsData?.filter(gw => gw.isActive) || [];

  const appUserForm = useForm<AppUserFormData>({
    resolver: zodResolver(appUserSchema),
    defaultValues: { mobileNumber: "", name: "", role: "volunteer", wing: "", govWing: "", currentPosition: "", level: "", mappedAreaId: "" },
  });

  const adminForm = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
    defaultValues: { name: "", userId: "", password: "", isActive: true, roleId: "", assignedVillages: [] },
  });

  const [villageSearchAdmin, setVillageSearchAdmin] = useState("");

  const { data: adminRoles } = useQuery<AdminRole[]>({
    queryKey: ["/api/admin-roles"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: AppUserFormData) => {
      const res = await apiRequest("POST", "/api/admin/app-users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/app-users"] });
      setCreateUserOpen(false);
      appUserForm.reset();
      toast({ title: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to create user", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/app-users/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/app-users"] });
      setEditUser({ open: false, id: "", name: "", role: "", wing: "", govWing: "", currentPosition: "", level: "" });
      toast({ title: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/app-users/${id}/block`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/app-users"] });
      toast({ title: "User status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update user status", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/app-users/${id}/approve`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/app-users"] });
      toast({ title: data.isApproved ? "User approved (verified)" : "Approval revoked" });
    },
    onError: () => {
      toast({ title: "Failed to update approval", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string | number; type: "app" | "admin" }) => {
      if (type === "app") {
        await apiRequest("DELETE", `/api/admin/app-users/${id}`);
      } else {
        await apiRequest("DELETE", `/api/office-managers/${id}`);
      }
    },
    onSuccess: () => {
      if (deleteConfirm.type === "app") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/app-users"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/office-managers"] });
      }
      setDeleteConfirm({ open: false, id: "", name: "", type: "app" });
      toast({ title: "Deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: AdminFormData) => {
      return apiRequest("POST", "/api/office-managers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office-managers"] });
      setCreateAdminOpen(false);
      adminForm.reset();
      toast({ title: "Admin account created!" });
    },
    onError: () => {
      toast({ title: "Failed to create admin", variant: "destructive" });
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AdminFormData> }) => {
      return apiRequest("PATCH", `/api/office-managers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office-managers"] });
      setEditAdmin({ open: false, manager: null });
      toast({ title: "Admin updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update admin", variant: "destructive" });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/office-managers/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/office-managers"] });
      toast({ title: "Admin status updated" });
    },
  });

  const reset2faMutation = useMutation({
    mutationFn: async ({ targetId }: { targetId: string }) => {
      const stored = localStorage.getItem("adminUser");
      if (!stored) throw new Error("Not logged in");
      const admin = JSON.parse(stored) as { username: string };
      const superUsername = admin.username;
      const superPassword = window.prompt("Enter your admin password to reset 2FA for this account:");
      if (!superPassword) {
        throw new Error("Password required");
      }
      const res = await apiRequest("POST", "/api/admin/2fa/reset", {
        superUsername,
        superPassword,
        targetType: "manager",
        targetId,
      });
      return res.json();
    },
    onSuccess: () => {
      setReset2faTarget(null);
      toast({ title: "2FA reset successfully. The admin must set it up again on next login." });
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to reset 2FA";
      toast({ title: "Failed to reset 2FA", description: msg, variant: "destructive" });
    },
  });

  const adminAssignedVillages: string[] = (() => {
    try {
      const stored = localStorage.getItem("adminAssignedVillages");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();

  const areaFilteredUsers = adminAssignedVillages.length > 0
    ? appUsers?.filter(u => u.mappedAreaId && adminAssignedVillages.includes(u.mappedAreaId)) || []
    : appUsers || [];

  const filteredUsers = areaFilteredUsers.filter((u) => {
    const matchesSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.mobileNumber || "").includes(search);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && u.isActive !== false) ||
      (statusFilter === "blocked" && u.isActive === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleExportUsers = () => {
    if (!filteredUsers.length) return;
    const headers = ["Name", "Mobile", "Role", "Wing", "Position", "Level", "Village", "Zone", "District", "Halka", "Block", "Source", "Status", "Joined"];
    const rows = filteredUsers.map(u => [
      u.name, u.mobileNumber, u.role === "party_post_holder" ? "Post Holder" : "Volunteer",
      u.wing || "", u.currentPosition || "", u.level || "", u.mappedAreaName || "",
      u.mappedZone || "", u.mappedDistrict || "", u.mappedHalka || "", u.mappedBlockNumber || "",
      u.registrationSource === "google" ? "Google" : "Email OTP",
      u.isActive !== false ? "Active" : "Blocked",
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    downloadCSV(csv, "app_users.csv");
  };

  const stats = {
    total: areaFilteredUsers.length,
    active: areaFilteredUsers.filter(u => u.isActive !== false).length,
    blocked: areaFilteredUsers.filter(u => u.isActive === false).length,
    volunteers: areaFilteredUsers.filter(u => u.role === "volunteer").length,
    postHolders: areaFilteredUsers.filter(u => u.role === "party_post_holder").length,
    approved: areaFilteredUsers.filter(u => u.isApproved).length,
    pending: areaFilteredUsers.filter(u => !u.isApproved).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage all app users and admin accounts</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="tabs-user-type">
          <TabsTrigger value="app-users" data-testid="tab-app-users">
            <Users className="h-4 w-4 mr-1.5" />
            App Users
          </TabsTrigger>
          <TabsTrigger value="admins" data-testid="tab-admins">
            <UserCog className="h-4 w-4 mr-1.5" />
            Admin Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="app-users" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-stat-approved">{stats.approved}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-stat-pending">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-stat-active">{stats.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Volunteers</p>
                <p className="text-2xl font-bold" data-testid="text-stat-volunteers">{stats.volunteers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Post Holders</p>
                <p className="text-2xl font-bold" data-testid="text-stat-postholders">{stats.postHolders}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
              <CardTitle className="text-base">App Users</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleExportUsers} data-testid="button-export-users">
                  <Download className="h-4 w-4 mr-1.5" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={() => { appUserForm.reset(); setCreateUserOpen(true); }} data-testid="button-create-user">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or mobile..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-role-filter">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="party_post_holder">Post Holder</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !filteredUsers.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p data-testid="text-no-users">No users found</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Village</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const profile = getProfileCompletion(user);
                        return (
                        <TableRow key={user.id} className={user.isActive === false ? "opacity-60" : ""} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            <div className="flex items-center gap-1.5">
                              {user.name}
                              {user.isApproved && (
                                <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell data-testid={`text-user-mobile-${user.id}`}>{user.mobileNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${profile.percentage === 100 ? "bg-green-500" : profile.percentage >= 50 ? "bg-yellow-500" : "bg-red-400"}`}
                                  style={{ width: `${profile.percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{profile.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.isApproved ? (
                              <Badge className="bg-blue-100 text-blue-700 gap-1 cursor-pointer" onClick={() => approveMutation.mutate(user.id)} data-testid={`badge-approved-${user.id}`}>
                                <BadgeCheck className="h-3 w-3" /> Verified
                              </Badge>
                            ) : (
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => approveMutation.mutate(user.id)} data-testid={`button-approve-${user.id}`}>
                                <CheckCircle className="h-3 w-3" /> Approve
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" data-testid={`badge-user-role-${user.id}`}>
                              {user.role === "party_post_holder" ? "Post Holder" : "Volunteer"}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.mappedAreaName || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.isActive !== false ? "default" : "destructive"}
                              className="cursor-pointer"
                              onClick={() => blockMutation.mutate(user.id)}
                              data-testid={`badge-user-status-${user.id}`}
                            >
                              {user.isActive !== false ? "Active" : "Blocked"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditUser({
                                    open: true, id: user.id, name: user.name, role: user.role,
                                    wing: user.wing || "", govWing: user.govWing || "", currentPosition: user.currentPosition || "", level: user.level || "",
                                  })}
                                  data-testid={`menu-edit-user-${user.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => approveMutation.mutate(user.id)}
                                  data-testid={`menu-approve-user-${user.id}`}
                                >
                                  <BadgeCheck className="h-4 w-4 mr-2" /> {user.isApproved ? "Revoke Approval" : "Approve"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => blockMutation.mutate(user.id)}
                                  data-testid={`menu-block-user-${user.id}`}
                                >
                                  {user.isActive !== false ? (
                                    <><Ban className="h-4 w-4 mr-2" /> Block</>
                                  ) : (
                                    <><ShieldCheck className="h-4 w-4 mr-2" /> Unblock</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirm({ open: true, id: user.id, name: user.name, type: "app" })}
                                  data-testid={`menu-delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-xs text-muted-foreground" data-testid="text-showing-count">
                Showing {filteredUsers.length} of {areaFilteredUsers.length} users
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
              <CardTitle className="text-base">Admin Accounts (Office Managers)</CardTitle>
              {isSuperAdmin && (
                <Button size="sm" onClick={() => { adminForm.reset(); setCreateAdminOpen(true); }} data-testid="button-create-admin">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Admin
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {managersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !managers?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p data-testid="text-no-admins">No admin accounts found</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        {isSuperAdmin && <TableHead className="w-[60px]">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.map((mgr) => (
                        <TableRow key={mgr.id} className={!mgr.isActive ? "opacity-60" : ""} data-testid={`row-admin-${mgr.id}`}>
                          <TableCell className="font-medium" data-testid={`text-admin-name-${mgr.id}`}>{mgr.name}</TableCell>
                          <TableCell data-testid={`text-admin-userid-${mgr.id}`}>{mgr.userId}</TableCell>
                          <TableCell data-testid={`text-admin-role-${mgr.id}`}>
                            {mgr.roleId ? (adminRoles?.find(r => r.id === mgr.roleId)?.name || "—") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={mgr.isActive ? "default" : "destructive"}
                              className={isSuperAdmin ? "cursor-pointer" : ""}
                              onClick={isSuperAdmin ? () => toggleAdminMutation.mutate({ id: mgr.id, isActive: !(mgr.isActive ?? true) }) : undefined}
                              data-testid={`badge-admin-status-${mgr.id}`}
                            >
                              {mgr.isActive !== false ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          {isSuperAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-admin-actions-${mgr.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditAdmin({ open: true, manager: mgr });
                                    adminForm.reset({
                                      name: mgr.name,
                                      userId: mgr.userId,
                                      password: "",
                                      isActive: mgr.isActive ?? true,
                                      roleId: mgr.roleId || "",
                                      assignedVillages: mgr.assignedVillages || [],
                                    });
                                  }}
                                  data-testid={`menu-edit-admin-${mgr.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleAdminMutation.mutate({ id: mgr.id, isActive: !(mgr.isActive ?? true) })}
                                  data-testid={`menu-toggle-admin-${mgr.id}`}
                                >
                                  {(mgr.isActive ?? true) ? (
                                    <><Ban className="h-4 w-4 mr-2" /> Deactivate</>
                                  ) : (
                                    <><ShieldCheck className="h-4 w-4 mr-2" /> Activate</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setReset2faTarget({ open: true, id: mgr.id, name: mgr.name })}
                                  data-testid={`menu-reset2fa-admin-${mgr.id}`}
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" /> Reset 2FA
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirm({ open: true, id: mgr.id, name: mgr.name, type: "admin" })}
                                  data-testid={`menu-delete-admin-${mgr.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-create-user-title">Add New App User</DialogTitle>
            <DialogDescription>Create a new volunteer or post holder account</DialogDescription>
          </DialogHeader>
          <Form {...appUserForm}>
            <form onSubmit={appUserForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
              <FormField control={appUserForm.control} name="mobileNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="10-digit mobile number" className="pl-9" {...field} data-testid="input-create-mobile" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={appUserForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Full name" {...field} data-testid="input-create-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={appUserForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-role"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="party_post_holder">Post Holder</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={appUserForm.control} name="wing" render={({ field }) => (
                <FormItem>
                  <FormLabel>Wing</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-wing"><SelectValue placeholder="Select wing" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeWings.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {activeGovWings.length > 0 && (
              <FormField control={appUserForm.control} name="govWing" render={({ field }) => (
                <FormItem>
                  <FormLabel>Punjab Gov Wing</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-gov-wing"><SelectValue placeholder="Select gov wing" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeGovWings.map(gw => <SelectItem key={gw.id} value={gw.name}>{gw.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              )}
              <FormField control={appUserForm.control} name="level" render={({ field }) => (
                <FormItem>
                  <FormLabel>Level</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-level"><SelectValue placeholder="Select level" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={appUserForm.control} name="currentPosition" render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-position"><SelectValue placeholder="Select position" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activePositions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={appUserForm.control} name="mappedAreaId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Village/Ward</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-create-village"><SelectValue placeholder="Select village" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeVillages.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setCreateUserOpen(false)} data-testid="button-cancel-create-user">Cancel</Button>
                <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-create-user">
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={editUser.open} onOpenChange={(open) => !open && setEditUser(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-user-title">Edit User</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input value={editUser.name} onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))} data-testid="input-edit-name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role</label>
              <Select value={editUser.role} onValueChange={(v) => setEditUser(prev => ({ ...prev, role: v }))}>
                <SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="party_post_holder">Post Holder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Wing</label>
              <Select value={editUser.wing || "none"} onValueChange={(v) => setEditUser(prev => ({ ...prev, wing: v === "none" ? "" : v }))}>
                <SelectTrigger data-testid="select-edit-wing"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeWings.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {activeGovWings.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Punjab Gov Wing</label>
              <Select value={editUser.govWing || "none"} onValueChange={(v) => setEditUser(prev => ({ ...prev, govWing: v === "none" ? "" : v }))}>
                <SelectTrigger data-testid="select-edit-gov-wing"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeGovWings.map(gw => <SelectItem key={gw.id} value={gw.name}>{gw.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Level</label>
              <Select value={editUser.level || "none"} onValueChange={(v) => setEditUser(prev => ({ ...prev, level: v === "none" ? "" : v }))}>
                <SelectTrigger data-testid="select-edit-level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Position</label>
              <Select value={editUser.currentPosition || "none"} onValueChange={(v) => setEditUser(prev => ({ ...prev, currentPosition: v === "none" ? "" : v }))}>
                <SelectTrigger data-testid="select-edit-position"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activePositions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(prev => ({ ...prev, open: false }))} data-testid="button-cancel-edit">Cancel</Button>
            <Button
              onClick={() => editMutation.mutate({
                id: editUser.id,
                updates: {
                  name: editUser.name,
                  role: editUser.role,
                  wing: editUser.wing || undefined,
                  govWing: editUser.govWing || undefined,
                  currentPosition: editUser.currentPosition || undefined,
                  level: editUser.level || undefined,
                },
              })}
              disabled={editMutation.isPending}
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-create-admin-title">Create Admin Account</DialogTitle>
            <DialogDescription>Add a new admin/office manager login</DialogDescription>
          </DialogHeader>
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit((data) => createAdminMutation.mutate(data))} className="space-y-4">
              <FormField control={adminForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Admin name" {...field} data-testid="input-admin-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="userId" render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl><Input placeholder="Login user ID" {...field} data-testid="input-admin-userid" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="Login password" {...field} data-testid="input-admin-password" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)} data-testid="button-toggle-password">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="roleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-admin-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None (Super Admin)</SelectItem>
                      {adminRoles?.filter(r => r.isActive).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="assignedVillages" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Villages</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal" data-testid="button-select-villages">
                        {(field.value?.length || 0) > 0
                          ? `${field.value?.length} village(s) selected`
                          : "Select villages..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search villages..."
                          value={villageSearchAdmin}
                          onChange={(e) => setVillageSearchAdmin(e.target.value)}
                          data-testid="input-search-admin-villages"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                        {activeVillages
                          .filter(v => {
                            if (!villageSearchAdmin.trim()) return true;
                            return v.name.toLowerCase().includes(villageSearchAdmin.toLowerCase());
                          })
                          .map(v => (
                            <label key={v.id} className="flex items-center gap-2 p-1.5 rounded hover-elevate cursor-pointer text-sm">
                              <Checkbox
                                checked={field.value?.includes(v.id) || false}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, v.id]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== v.id));
                                  }
                                }}
                                data-testid={`checkbox-village-${v.id}`}
                              />
                              <span>{v.name}</span>
                            </label>
                          ))}
                        {activeVillages.filter(v => !villageSearchAdmin.trim() || v.name.toLowerCase().includes(villageSearchAdmin.toLowerCase())).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">No villages found</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setCreateAdminOpen(false)} data-testid="button-cancel-create-admin">Cancel</Button>
                <Button type="submit" disabled={createAdminMutation.isPending} data-testid="button-submit-create-admin">
                  {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {reset2faTarget && (
        <Dialog open={reset2faTarget.open} onOpenChange={(open) => !open && setReset2faTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset 2-Factor Authentication</DialogTitle>
              <DialogDescription>
                This will clear 2FA for <span className="font-semibold">{reset2faTarget.name}</span>. On next login they
                will have to set up 2FA again with a new QR code. Confirm only if this admin has genuinely lost access
                to their authenticator app.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setReset2faTarget(null)}>Cancel</Button>
              <Button
                type="button"
                onClick={() => reset2faMutation.mutate({ targetId: reset2faTarget.id })}
                disabled={reset2faMutation.isPending}
              >
                {reset2faMutation.isPending ? "Resetting..." : "Confirm Reset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={editAdmin.open} onOpenChange={(open) => !open && setEditAdmin({ open: false, manager: null })}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-admin-title">Edit Admin Account</DialogTitle>
            <DialogDescription>Update admin details. Leave password empty to keep current password.</DialogDescription>
          </DialogHeader>
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit((data) => {
              if (!editAdmin.manager) return;
              const updates: any = { name: data.name, userId: data.userId, roleId: data.roleId || null, assignedVillages: data.assignedVillages || [] };
              if (data.password) updates.password = data.password;
              updateAdminMutation.mutate({ id: editAdmin.manager.id, data: updates });
            })} className="space-y-4">
              <FormField control={adminForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-admin-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="userId" render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-admin-userid" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (leave empty to keep current)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="New password" {...field} data-testid="input-edit-admin-password" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="roleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-admin-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None (Super Admin)</SelectItem>
                      {adminRoles?.filter(r => r.isActive).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={adminForm.control} name="assignedVillages" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Villages</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal" data-testid="button-edit-select-villages">
                        {(field.value?.length || 0) > 0
                          ? `${field.value?.length} village(s) selected`
                          : "Select villages..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search villages..."
                          value={villageSearchAdmin}
                          onChange={(e) => setVillageSearchAdmin(e.target.value)}
                          data-testid="input-edit-search-admin-villages"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                        {activeVillages
                          .filter(v => {
                            if (!villageSearchAdmin.trim()) return true;
                            return v.name.toLowerCase().includes(villageSearchAdmin.toLowerCase());
                          })
                          .map(v => (
                            <label key={v.id} className="flex items-center gap-2 p-1.5 rounded hover-elevate cursor-pointer text-sm">
                              <Checkbox
                                checked={field.value?.includes(v.id) || false}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, v.id]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== v.id));
                                  }
                                }}
                                data-testid={`checkbox-edit-village-${v.id}`}
                              />
                              <span>{v.name}</span>
                            </label>
                          ))}
                        {activeVillages.filter(v => !villageSearchAdmin.trim() || v.name.toLowerCase().includes(villageSearchAdmin.toLowerCase())).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">No villages found</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditAdmin({ open: false, manager: null })} data-testid="button-cancel-edit-admin">Cancel</Button>
                <Button type="submit" disabled={updateAdminMutation.isPending} data-testid="button-save-edit-admin">
                  {updateAdminMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle data-testid="text-delete-confirm-title">Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(prev => ({ ...prev, open: false }))} data-testid="button-cancel-delete">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: deleteConfirm.id, type: deleteConfirm.type })}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
