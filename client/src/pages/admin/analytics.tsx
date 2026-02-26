import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle,
  MapPin,
  Heart,
  Eye,
  Download,
  TrendingUp,
  Activity,
  Trophy,
  Clock,
} from "lucide-react";

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

const summaryCards = [
  { key: "totalSubmissions", label: "Total Submissions", icon: ClipboardList },
  { key: "activeUsers", label: "Active Users", icon: UserCheck },
  { key: "totalUsers", label: "Total Users", icon: Users },
  { key: "totalTasks", label: "Total Tasks", icon: BarChart3 },
  { key: "enabledTasks", label: "Enabled Tasks", icon: CheckCircle },
  { key: "totalVillages", label: "Villages", icon: MapPin },
  { key: "totalVolunteers", label: "Volunteers", icon: Heart },
  { key: "totalVisitors", label: "Visitors", icon: Eye },
] as const;

export default function AnalyticsDashboard() {
  const { data, isLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="analytics-loading">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="analytics-empty">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            data-testid="text-analytics-title"
          >
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Platform overview and insights</p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportToCSV(data)}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const value = data.summary[card.key];
          return (
            <Card key={card.key} data-testid={`card-summary-${card.key}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold"
                  data-testid={`text-summary-${card.key}`}
                >
                  {value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-daily-trend">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailyTrend.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground"
                data-testid="text-no-trend-data"
              >
                No trend data available
              </div>
            ) : (
              <div className="h-64" data-testid="chart-daily-trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={formatDate}
                      contentStyle={{
                        borderRadius: "6px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        color: "hsl(var(--card-foreground))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-task-breakdown">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Task Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.taskBreakdown.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground"
                data-testid="text-no-task-data"
              >
                No task data available
              </div>
            ) : (
              <div className="h-64" data-testid="chart-task-breakdown">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.taskBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      type="number"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="taskName"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "6px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                        color: "hsl(var(--card-foreground))",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--chart-1))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-top-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topUsers.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground"
                data-testid="text-no-top-users"
              >
                No user data available
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Submissions</TableHead>
                      <TableHead className="text-right">Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topUsers.map((user, index) => (
                      <TableRow
                        key={user.userId}
                        data-testid={`row-top-user-${user.userId}`}
                      >
                        <TableCell>
                          <Badge
                            variant={index < 3 ? "default" : "secondary"}
                            data-testid={`badge-rank-${user.userId}`}
                          >
                            {index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="font-medium"
                          data-testid={`text-top-user-name-${user.userId}`}
                        >
                          {user.userName}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          data-testid={`text-top-user-count-${user.userId}`}
                        >
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
          </CardContent>
        </Card>

        <Card data-testid="card-recent-activity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground"
                data-testid="text-no-recent-activity"
              >
                No recent activity
              </div>
            ) : (
              <div className="space-y-3" data-testid="list-recent-activity">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0"
                    data-testid={`item-activity-${activity.id}`}
                  >
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        data-testid={`text-activity-user-${activity.id}`}
                      >
                        {activity.userName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        <Badge
                          variant="outline"
                          className="mr-1"
                          data-testid={`badge-activity-task-${activity.id}`}
                        >
                          {activity.taskName}
                        </Badge>
                      </p>
                    </div>
                    <span
                      className="text-xs text-muted-foreground whitespace-nowrap pt-1"
                      data-testid={`text-activity-time-${activity.id}`}
                    >
                      {formatDateTime(activity.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
