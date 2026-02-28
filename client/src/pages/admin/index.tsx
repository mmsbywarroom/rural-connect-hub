import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, MapPin, AlertTriangle, Building, Flag, Briefcase, GraduationCap, Settings, ChevronRight, ClipboardList, Upload, Database, BarChart3, FileBarChart, UserCheck, Vote, UserCog, Landmark, Home, Shield, LogIn, LogOut, Loader2, Eye, EyeOff, Heart, ClipboardCheck, Cake, Megaphone, CalendarCheck, ShieldAlert, Route, FolderTree } from "lucide-react";

import VolunteersPage from "./volunteers";
import VillagesPage from "./villages";
import IssuesPage from "./issues";
import DepartmentsPage from "./departments";
import WingsPage from "./wings";
import PositionsPage from "./positions";
import LeadershipFlagsPage from "./leadership-flags";
import VisitorsPage from "./visitors";
import OfficeManagersPage from "./office-managers";
import TaskManagerPage from "./task-manager";
import FormBuilderPage from "./form-builder";
import CsvUploadPage from "./csv-upload";
import DataExportPage from "./data-export";
import AnalyticsDashboard from "./analytics";
import TaskReportsPage from "./task-reports";
import UserReportsPage from "./user-reports";
import VoterDatabasePage from "./voter-database";
import UserManagementPage from "./user-management";
import GovWingsPage from "./gov-wings";
import GovPositionsPage from "./gov-positions";
import HstcSubmissionsPage from "./hstc-submissions";
import SdskSubmissionsPage from "./sdsk-submissions";
import SurveyManagerPage from "./survey-manager";
import RoleManagementPage from "./role-management";
import BirthdayManagerPage from "./birthday-manager";
import SunwaiSubmissionsPage from "./sunwai-submissions";
import OutdoorAdSubmissionsPage from "./outdoor-ad-submissions";
import NvyReportsPage from "./nvy-reports";
import GovSchoolSubmissionsPage from "./gov-school-submissions";
import AppointmentSubmissionsPage from "./appointment-submissions";
import RoadReportsPage from "./road-reports";
import UserTreePage from "./user-tree";

interface AdminUser {
  id: string;
  username: string;
  role: string | null;
  roleId: string | null;
}

const allMenuItems = [
  { id: "user-management", label: "User Management", icon: UserCog, path: "/admin/user-management", group: "Management" },
  { id: "role-management", label: "Role Management", icon: Shield, path: "/admin/role-management", group: "Management" },
  { id: "volunteers", label: "Volunteers", icon: Users, path: "/admin/volunteers", group: "Management" },
  { id: "visitors", label: "Office Visitors", icon: Building, path: "/admin/visitors", group: "Management" },
  { id: "office-managers", label: "Office Managers", icon: Users, path: "/admin/office-managers", group: "Management" },
  { id: "task-manager", label: "Task Manager", icon: ClipboardList, path: "/admin/task-manager", group: "Management" },
  { id: "hstc", label: "Harr Sirr te Chatt", icon: Home, path: "/admin/hstc", group: "Management" },
  { id: "sdsk", label: "Sukh-Dukh Saanjha Karo", icon: Heart, path: "/admin/sdsk", group: "Management" },
  { id: "surveys", label: "Survey Manager", icon: ClipboardCheck, path: "/admin/surveys", group: "Management" },
  { id: "birthdays", label: "Birthday Manager", icon: Cake, path: "/admin/birthdays", group: "Management" },
  { id: "sunwai", label: "Sunwai (Complaints)", icon: Megaphone, path: "/admin/sunwai", group: "Management" },
  { id: "nvy", label: "Nasha Viruddh Yuddh", icon: ShieldAlert, path: "/admin/nvy", group: "Management" },
  { id: "road", label: "Road Reports", icon: Route, path: "/admin/road", group: "Management" },
  { id: "outdoor-ads", label: "Outdoor Ads", icon: Megaphone, path: "/admin/outdoor-ads", group: "Management" },
  { id: "gov-school", label: "Gov School Work", icon: GraduationCap, path: "/admin/gov-school", group: "Management" },
  { id: "appointments", label: "Appointments", icon: CalendarCheck, path: "/admin/appointments", group: "Management" },
  { id: "villages", label: "Villages", icon: MapPin, path: "/admin/villages", group: "Master Data" },
  { id: "issues", label: "Issues", icon: AlertTriangle, path: "/admin/issues", group: "Master Data" },
  { id: "departments", label: "Departments", icon: Briefcase, path: "/admin/departments", group: "Master Data" },
  { id: "wings", label: "Wings", icon: Flag, path: "/admin/wings", group: "Master Data" },
  { id: "gov-wings", label: "Punjab Gov Wing", icon: Landmark, path: "/admin/gov-wings", group: "Master Data" },
  { id: "gov-positions", label: "Govt Positions", icon: Briefcase, path: "/admin/gov-positions", group: "Master Data" },
  { id: "positions", label: "Positions", icon: GraduationCap, path: "/admin/positions", group: "Tools" },
  { id: "leadership", label: "Leadership Flags", icon: Flag, path: "/admin/leadership", group: "Tools" },
  { id: "voter-database", label: "Voter Database", icon: Vote, path: "/admin/voter-database", group: "Tools" },
  { id: "csv-upload", label: "CSV Upload", icon: Upload, path: "/admin/csv-upload", group: "Tools" },
  { id: "data-export", label: "Data Export", icon: Database, path: "/admin/data-export", group: "Tools" },
  { id: "analytics", label: "Dashboard", icon: BarChart3, path: "/admin/analytics", group: "Analytics" },
  { id: "task-reports", label: "Task Reports", icon: FileBarChart, path: "/admin/task-reports", group: "Analytics" },
  { id: "user-reports", label: "User Reports", icon: UserCheck, path: "/admin/user-reports", group: "Analytics" },
  { id: "user-tree", label: "User Tree", icon: FolderTree, path: "/admin/user-tree", group: "Analytics" },
];

const GROUPS = ["Management", "Master Data", "Tools", "Analytics"];

type AdminAuthStep = "login" | "setup_2fa" | "verify_2fa";

function AdminLogin({ onLogin }: { onLogin: (user: AdminUser, permissions: string[], assignedVillages: string[]) => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [step, setStep] = useState<AdminAuthStep>("login");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingUserType, setPendingUserType] = useState<"user" | "manager" | null>(null);
  const [twoFaSecret, setTwoFaSecret] = useState("");
  const [twoFaOtpauthUrl, setTwoFaOtpauthUrl] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");

  const handleLogin = async () => {
    if (step !== "login") return;
    if (!username || !password) {
      toast({ title: "Please enter username and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/login", { username, password });
      const data = await res.json();
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data.mode === "setup") {
        setPendingUserId(data.userId);
        setPendingUserType(data.userType);
        setTwoFaSecret(data.secret || "");
        setTwoFaOtpauthUrl(data.otpauthUrl || "");
        setStep("setup_2fa");
        toast({ title: "Set up 2-factor authentication", description: "Scan the QR or enter the key, then enter the 6-digit code." });
        setLoading(false);
        return;
      }

      if (data.mode === "verify") {
        setPendingUserId(data.userId);
        setPendingUserType(data.userType);
        setStep("verify_2fa");
        toast({ title: "Enter 2-factor code", description: "Open your authenticator app and enter the 6-digit code." });
        setLoading(false);
        return;
      }

      // Fallback (should not normally happen once 2FA is enforced)
      onLogin(data.user, data.permissions || [], data.assignedVillages || []);
    } catch (err: any) {
      const msg = err?.message?.includes("401") ? "Invalid username or password" : "Login failed";
      toast({ title: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleVerify2fa = async () => {
    if (!pendingUserId || !pendingUserType) {
      toast({ title: "Something went wrong", description: "Please try logging in again.", variant: "destructive" });
      setStep("login");
      return;
    }
    if (twoFaCode.trim().length < 6) {
      toast({ title: "Enter 6-digit code", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/admin/2fa/verify", {
        userId: pendingUserId,
        userType: pendingUserType,
        token: twoFaCode.trim(),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }
      onLogin(data.user, data.permissions || [], data.assignedVillages || []);
    } catch {
      toast({ title: "2FA verification failed", variant: "destructive" });
    }
    setLoading(false);
  };

  if (step === "setup_2fa") {
    const qrUrl = twoFaOtpauthUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFaOtpauthUrl)}`
      : "";
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Set up 2-Factor Authentication</CardTitle>
            <CardDescription>Protect your admin account from unauthorized access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>Install an authenticator app (Google Authenticator, Authy, etc.) on your mobile.</li>
              <li>Open the app and choose “Add account” → “Scan QR code” or “Enter setup key”.</li>
              <li>Scan the QR code below, or manually enter the secret key.</li>
              <li>After adding, enter the 6-digit code shown in the app to confirm.</li>
            </ol>

            {qrUrl && (
              <div className="flex justify-center mt-2">
                <img src={qrUrl} alt="2FA QR Code" className="border rounded-md" />
              </div>
            )}

            <div className="space-y-1">
              <div className="text-xs font-medium text-left">Secret key (keep this safe):</div>
              <div className="font-mono text-xs break-all bg-slate-100 rounded px-2 py-1 text-left">
                {twoFaSecret || "—"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-left block">Enter 6-digit code from app</label>
              <Input
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center tracking-[0.5em]"
                placeholder="123456"
              />
            </div>

            <Button className="w-full h-11" onClick={handleVerify2fa} disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enable 2FA & Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "verify_2fa") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl">Enter 2-Factor Code</CardTitle>
            <CardDescription>Open your authenticator app and enter the 6-digit code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium text-left block">6-digit code</label>
              <Input
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center tracking-[0.5em]"
                placeholder="123456"
              />
            </div>
            <Button className="w-full h-11" onClick={handleVerify2fa} disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Login"}
            </Button>
            <p className="text-xs text-orange-100 text-left">
              If you lose your authenticator app, contact the super admin to reset 2FA for your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-orange-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3">
            <Settings className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl" data-testid="text-admin-login-title">Admin Panel</CardTitle>
          <CardDescription>Patiala Rural - Login</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Username</label>
            <Input
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11"
              data-testid="input-admin-username"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
                data-testid="input-admin-password"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPwd(!showPwd)}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button className="w-full h-11" onClick={handleLogin} disabled={loading} data-testid="button-admin-login">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-4 w-4 mr-2" /> Login</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [location] = useLocation();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [assignedVillages, setAssignedVillages] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("adminUser");
    const storedPerms = localStorage.getItem("adminPermissions");
    const storedVillages = localStorage.getItem("adminAssignedVillages");
    if (stored) {
      try {
        setAdminUser(JSON.parse(stored));
        setPermissions(storedPerms ? JSON.parse(storedPerms) : []);
        setAssignedVillages(storedVillages ? JSON.parse(storedVillages) : []);
      } catch {
        localStorage.removeItem("adminUser");
        localStorage.removeItem("adminPermissions");
        localStorage.removeItem("adminAssignedVillages");
      }
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = (user: AdminUser, perms: string[], villages: string[]) => {
    localStorage.setItem("adminUser", JSON.stringify(user));
    localStorage.setItem("adminPermissions", JSON.stringify(perms));
    localStorage.setItem("adminAssignedVillages", JSON.stringify(villages));
    setAdminUser(user);
    setPermissions(perms);
    setAssignedVillages(villages);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminPermissions");
    localStorage.removeItem("adminAssignedVillages");
    setAdminUser(null);
    setPermissions([]);
    setAssignedVillages([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!adminUser) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const isSuperAdmin = adminUser.username === "9625692122" || (permissions.length === 0 && !adminUser.roleId);
  const hasPermission = (id: string) => isSuperAdmin || permissions.includes(id);

  const filteredMenuItems = allMenuItems.filter((item) => hasPermission(item.id));

  const currentPath = location.replace("/admin", "") || "/user-management";

  const getActiveSection = () => {
    if (currentPath.includes("form-builder")) return "form-builder";
    if (currentPath.includes("task-manager")) return "task-manager";
    if (currentPath.includes("outdoor-ads")) return "outdoor-ads";
    if (currentPath.includes("appointments")) return "appointments";
    if (currentPath.includes("gov-school")) return "gov-school";
    if (currentPath.includes("sunwai")) return "sunwai";
    if (currentPath.includes("nvy")) return "nvy";
    if (currentPath.includes("road")) return "road";
    if (currentPath.includes("birthdays")) return "birthdays";
    if (currentPath.includes("surveys")) return "surveys";
    if (currentPath.includes("sdsk")) return "sdsk";
    if (currentPath.includes("hstc")) return "hstc";
    if (currentPath.includes("task-reports")) return "task-reports";
    if (currentPath.includes("user-reports")) return "user-reports";
    if (currentPath.includes("user-tree")) return "user-tree";
    if (currentPath.includes("role-management")) return "role-management";
    if (currentPath.includes("user-management")) return "user-management";
    if (currentPath.includes("analytics")) return "analytics";
    if (currentPath.includes("office-managers")) return "office-managers";
    if (currentPath.includes("volunteers")) return "volunteers";
    if (currentPath.includes("visitors")) return "visitors";
    if (currentPath.includes("villages")) return "villages";
    if (currentPath.includes("issues")) return "issues";
    if (currentPath.includes("departments")) return "departments";
    if (currentPath.includes("gov-positions")) return "gov-positions";
    if (currentPath.includes("gov-wings")) return "gov-wings";
    if (currentPath.includes("wings")) return "wings";
    if (currentPath.includes("positions")) return "positions";
    if (currentPath.includes("leadership")) return "leadership";
    if (currentPath.includes("voter-database")) return "voter-database";
    if (currentPath.includes("csv-upload")) return "csv-upload";
    if (currentPath.includes("data-export")) return "data-export";
    return filteredMenuItems[0]?.id || "user-management";
  };

  const activeSection = getActiveSection();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm">Admin Panel</h2>
                <p className="text-xs text-muted-foreground truncate">{adminUser.username}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={handleLogout} title="Logout" data-testid="button-admin-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {GROUPS.map((group) => {
              const groupItems = filteredMenuItems.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;
              return (
                <SidebarGroup key={group}>
                  <SidebarGroupLabel>{group}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton asChild isActive={activeSection === item.id}>
                            <Link href={item.path}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-4 p-4 border-b bg-background/95 backdrop-blur">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Admin</span>
              <ChevronRight className="h-4 w-4" />
              <span className="capitalize text-foreground">{activeSection.replace(/-/g, " ")}</span>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 bg-muted/30">
            {activeSection === "user-management" && <UserManagementPage />}
            {activeSection === "role-management" && <RoleManagementPage />}
            {activeSection === "volunteers" && <VolunteersPage />}
            {activeSection === "visitors" && <VisitorsPage />}
            {activeSection === "office-managers" && <OfficeManagersPage />}
            {activeSection === "task-manager" && <TaskManagerPage />}
            {activeSection === "hstc" && <HstcSubmissionsPage />}
            {activeSection === "sdsk" && <SdskSubmissionsPage />}
            {activeSection === "surveys" && <SurveyManagerPage />}
            {activeSection === "birthdays" && <BirthdayManagerPage />}
            {activeSection === "sunwai" && <SunwaiSubmissionsPage />}
            {activeSection === "nvy" && <NvyReportsPage />}
            {activeSection === "road" && <RoadReportsPage />}
            {activeSection === "outdoor-ads" && <OutdoorAdSubmissionsPage />}
            {activeSection === "gov-school" && <GovSchoolSubmissionsPage />}
            {activeSection === "appointments" && <AppointmentSubmissionsPage />}
            {activeSection === "form-builder" && <FormBuilderPage />}
            {activeSection === "villages" && <VillagesPage />}
            {activeSection === "issues" && <IssuesPage />}
            {activeSection === "departments" && <DepartmentsPage />}
            {activeSection === "wings" && <WingsPage />}
            {activeSection === "gov-wings" && <GovWingsPage />}
            {activeSection === "gov-positions" && <GovPositionsPage />}
            {activeSection === "positions" && <PositionsPage />}
            {activeSection === "leadership" && <LeadershipFlagsPage />}
            {activeSection === "voter-database" && <VoterDatabasePage />}
            {activeSection === "csv-upload" && <CsvUploadPage />}
            {activeSection === "data-export" && <DataExportPage />}
            {activeSection === "analytics" && <AnalyticsDashboard />}
            {activeSection === "task-reports" && <TaskReportsPage />}
            {activeSection === "user-reports" && <UserReportsPage />}
            {activeSection === "user-tree" && <UserTreePage />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
