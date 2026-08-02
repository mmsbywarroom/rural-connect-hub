import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  BarChart3,
  Users,
  UserCheck,
  ClipboardList,
  MapPin,
  Heart,
  Eye,
  Download,
  TrendingUp,
  Activity,
  Trophy,
  Clock,
  UserCog,
  Vote,
  Megaphone,
  FileBarChart,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminStatCard,
  AdminSurface,
  AdminEmptyState,
  AdminQuickLink,
} from "@/components/admin/admin-ui";

interface AnalyticsOverview {
  summary: {
    totalSubmissions: number;
    activeUsers: number;
    totalUsers: number;
    totalTasks: number;
    enabledTasks: number;
    totalVillages: number;
    totalVolunteers: number;
    totalVisitors: number;
  };
  dailyTrend: { date: string; count: number }[];
  taskBreakdown: { taskId: string; taskName: string; count: number }[];
  topUsers: { userId: string; userName: string; count: number; lastActive: string }[];
  recentActivity: { id: string; userName: string; taskName: string; createdAt: string }[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportToCSV(data: AnalyticsOverview) {
  const lines: string[] = [];

  lines.push("Analytics Overview Export");
  lines.push("");
  lines.push("Summary");
  lines.push("Metric,Value");
  lines.push(`Total Submissions,${data.summary.totalSubmissions}`);
  lines.push(`Active Users,${data.summary.activeUsers}`);
  lines.push(`Total Users,${data.summary.totalUsers}`);
  lines.push(`Total Tasks,${data.summary.totalTasks}`);
  lines.push(`Enabled Tasks,${data.summary.enabledTasks}`);
  lines.push(`Total Villages,${data.summary.totalVillages}`);
  lines.push(`Total Volunteers,${data.summary.totalVolunteers}`);
  lines.push(`Total Visitors,${data.summary.totalVisitors}`);

  lines.push("");
  lines.push("Daily Trend");
  lines.push("Date,Count");
  data.dailyTrend.forEach((d) => lines.push(`${d.date},${d.count}`));

  lines.push("");
  lines.push("Task Breakdown");
  lines.push("Task Name,Count");
  data.taskBreakdown.forEach((t) => {
    const name = t.taskName.includes(",") ? `"${t.taskName}"` : t.taskName;
    lines.push(`${name},${t.count}`);
  });

  lines.push("");
  lines.push("Top Users");
  lines.push("User Name,Submissions,Last Active");
  data.topUsers.forEach((u) => {
    const name = u.userName.includes(",") ? `"${u.userName}"` : u.userName;
    lines.push(`${name},${u.count},${u.lastActive}`);
  });

  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analytics-overview-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const chartTooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  color: "#0f172a",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  fontSize: "12px",
};

export default function AnalyticsDashboard() {
  const { data, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="analytics-loading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <AdminEmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title="No analytics data available"
        description="Once field teams start submitting work, insights will appear here."
      />
    );
  }

  const s = data.summary;
  const todayCount = data.dailyTrend.length
    ? data.dailyTrend[data.dailyTrend.length - 1]?.count ?? 0
    : 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operations Dashboard"
        description="Live overview of users, submissions, and field activity"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            onClick={() => exportToCSV(data)}
            data-testid="button-export-csv"
            className="h-9"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      {/* Hero strip */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061a3a] via-[#0a274f] to-[#1565c0] p-5 sm:p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(66,165,245,0.35), transparent 35%)",
          }}
        />
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">Submissions</p>
            <p className="mt-1 text-3xl font-bold tabular-nums" data-testid="text-summary-totalSubmissions">
              {s.totalSubmissions.toLocaleString()}
            </p>
            <p className="text-xs text-blue-100/70 mt-1">All-time field data</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">Active users</p>
            <p className="mt-1 text-3xl font-bold tabular-nums" data-testid="text-summary-activeUsers">
              {s.activeUsers.toLocaleString()}
            </p>
            <p className="text-xs text-blue-100/70 mt-1">of {s.totalUsers.toLocaleString()} total</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">Live tasks</p>
            <p className="mt-1 text-3xl font-bold tabular-nums" data-testid="text-summary-enabledTasks">
              {s.enabledTasks.toLocaleString()}
            </p>
            <p className="text-xs text-blue-100/70 mt-1">of {s.totalTasks} configured</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200/80">Latest day</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{todayCount.toLocaleString()}</p>
            <p className="text-xs text-blue-100/70 mt-1">Submissions recently</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AdminStatCard
          label="Total Users"
          value={s.totalUsers}
          icon={<Users className="h-5 w-5" />}
          accent="blue"
          testId="card-summary-totalUsers"
        />
        <AdminStatCard
          label="Villages"
          value={s.totalVillages}
          icon={<MapPin className="h-5 w-5" />}
          accent="emerald"
          testId="card-summary-totalVillages"
        />
        <AdminStatCard
          label="Volunteers"
          value={s.totalVolunteers}
          icon={<Heart className="h-5 w-5" />}
          accent="rose"
          testId="card-summary-totalVolunteers"
        />
        <AdminStatCard
          label="Office Visitors"
          value={s.totalVisitors}
          icon={<Eye className="h-5 w-5" />}
          accent="amber"
          testId="card-summary-totalVisitors"
        />
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 tracking-tight">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminQuickLink href="/admin/user-management" icon={<UserCog className="h-5 w-5" />} title="User Management" subtitle="Accounts & roles" />
          <AdminQuickLink href="/admin/task-reports" icon={<FileBarChart className="h-5 w-5" />} title="Task Reports" subtitle="Submission reports" />
          <AdminQuickLink href="/admin/voter-database" icon={<Vote className="h-5 w-5" />} title="Voter Database" subtitle="Search & export" />
          <AdminQuickLink href="/admin/outdoor-ads" icon={<Megaphone className="h-5 w-5" />} title="Outdoor Ads" subtitle="Field ad submissions" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminSurface
          title="Daily submissions"
          description="Trend over recent days"
          action={<TrendingUp className="h-4 w-4 text-slate-400" />}
          testId="card-daily-trend"
        >
          {data.dailyTrend.length === 0 ? (
            <AdminEmptyState icon={<TrendingUp className="h-5 w-5" />} title="No trend data yet" />
          ) : (
            <div className="h-64" data-testid="chart-daily-trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyTrend}>
                  <defs>
                    <linearGradient id="adminTrendStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#0a274f" />
                      <stop offset="100%" stopColor="#1565c0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <Tooltip labelFormatter={formatDate} contentStyle={chartTooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="url(#adminTrendStroke)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#1565c0" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminSurface>

        <AdminSurface
          title="Task breakdown"
          description="Submissions by task type"
          action={<Activity className="h-4 w-4 text-slate-400" />}
          testId="card-task-breakdown"
        >
          {data.taskBreakdown.length === 0 ? (
            <AdminEmptyState icon={<Activity className="h-5 w-5" />} title="No task data yet" />
          ) : (
            <div className="h-64" data-testid="chart-task-breakdown">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.taskBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="taskName"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                    tick={{ fill: "#64748b" }}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill="#1565c0" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminSurface>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminSurface
          title="Top contributors"
          description="Highest submission counts"
          action={<Trophy className="h-4 w-4 text-amber-500" />}
          testId="card-top-users"
        >
          {data.topUsers.length === 0 ? (
            <AdminEmptyState icon={<UserCheck className="h-5 w-5" />} title="No user data yet" />
          ) : (
            <div className="overflow-auto -mx-1">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Subs</TableHead>
                    <TableHead className="text-right">Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topUsers.map((user, index) => (
                    <TableRow key={user.userId} data-testid={`row-top-user-${user.userId}`}>
                      <TableCell>
                        <Badge
                          className={
                            index === 0
                              ? "bg-amber-500 hover:bg-amber-500"
                              : index === 1
                                ? "bg-slate-400 hover:bg-slate-400"
                                : index === 2
                                  ? "bg-orange-700 hover:bg-orange-700"
                                  : ""
                          }
                          variant={index < 3 ? "default" : "secondary"}
                          data-testid={`badge-rank-${user.userId}`}
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-top-user-name-${user.userId}`}>
                        {user.userName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold" data-testid={`text-top-user-count-${user.userId}`}>
                        {user.count}
                      </TableCell>
                      <TableCell
                        className="text-right text-muted-foreground whitespace-nowrap"
                        data-testid={`text-top-user-active-${user.userId}`}
                      >
                        {formatDate(user.lastActive)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </AdminSurface>

        <AdminSurface
          title="Recent activity"
          description="Latest field submissions"
          action={<Clock className="h-4 w-4 text-slate-400" />}
          testId="card-recent-activity"
        >
          {data.recentActivity.length === 0 ? (
            <AdminEmptyState icon={<ClipboardList className="h-5 w-5" />} title="No recent activity" />
          ) : (
            <div className="space-y-1" data-testid="list-recent-activity">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-b-0"
                  data-testid={`item-activity-${activity.id}`}
                >
                  <div className="min-w-0 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#eef4ff] text-[#0d47a1] flex items-center justify-center text-[10px] font-bold shrink-0">
                      {activity.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" data-testid={`text-activity-user-${activity.id}`}>
                        {activity.userName}
                      </p>
                      <Badge
                        variant="outline"
                        className="mt-1 max-w-full truncate font-normal"
                        data-testid={`badge-activity-task-${activity.id}`}
                      >
                        {activity.taskName}
                      </Badge>
                    </div>
                  </div>
                  <span
                    className="text-[11px] text-slate-400 whitespace-nowrap pt-1"
                    data-testid={`text-activity-time-${activity.id}`}
                  >
                    {formatDateTime(activity.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminSurface>
      </div>
    </div>
  );
}
