import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, BarChart3, Users, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { TaskConfig } from "@shared/schema";

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface TaskReportData {
  task: { id: string; name: string; description: string; color: string };
  summary: { totalSubmissions: number; uniqueUsers: number; dateRange: { from: string | null; to: string | null } };
  dailyTrend: { date: string; count: number }[];
  userBreakdown: { userId: string; userName: string; mobile: string; role: string; count: number; lastSubmission: string }[];
  fieldAnalytics: { fieldKey: string; fieldLabel: string; values: { value: string; count: number }[] }[];
  submissions: Record<string, string>[];
  fields: { fieldKey: string; label: string; fieldType: string }[];
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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

const PAGE_SIZE = 20;

export default function TaskReportsPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string>("");
  const [appliedEndDate, setAppliedEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);

  const { data: taskConfigs, isLoading: configsLoading } = useQuery<TaskConfig[]>({
    queryKey: ["/api/task-configs"],
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<TaskReportData>({
    queryKey: ["/api/analytics/task-report", selectedTaskId, appliedStartDate, appliedEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedStartDate) params.set("startDate", appliedStartDate);
      if (appliedEndDate) params.set("endDate", appliedEndDate);
      const qs = params.toString();
      const url = `/api/analytics/task-report/${selectedTaskId}${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch task report");
      return res.json();
    },
    enabled: !!selectedTaskId,
  });

  const handleApplyDates = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(0);
  };

  const handleExportAllSubmissions = () => {
    if (!reportData?.submissions?.length || !reportData.fields) return;
    const headers = ["ID", "User Name", "Mobile", "Created At", ...reportData.fields.map((f) => f.label)];
    const headerRow = headers.map(escapeCSVField).join(",");
    const dataRows = reportData.submissions.map((s) => {
      const fields = [
        s.id ?? "",
        s.userName ?? "",
        s.userMobile ?? "",
        s.createdAt ? new Date(s.createdAt).toLocaleString() : "",
        ...reportData.fields.map((f) => String(s[f.fieldKey] ?? "")),
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV([headerRow, ...dataRows].join("\n"), `task-submissions-${reportData.task.name}.csv`);
  };

  const handleExportUserSummary = () => {
    if (!reportData?.userBreakdown?.length) return;
    const headers = ["User Name", "Mobile", "Role", "Submissions Count", "Last Submission"];
    const headerRow = headers.map(escapeCSVField).join(",");
    const dataRows = reportData.userBreakdown.map((u) => {
      const fields = [
        u.userName,
        u.mobile,
        u.role,
        String(u.count),
        u.lastSubmission ? new Date(u.lastSubmission).toLocaleString() : "",
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV([headerRow, ...dataRows].join("\n"), `user-summary-${reportData.task.name}.csv`);
  };

  const handleExportUserRow = (user: TaskReportData["userBreakdown"][0]) => {
    const headers = ["User Name", "Mobile", "Role", "Submissions Count", "Last Submission"];
    const headerRow = headers.map(escapeCSVField).join(",");
    const dataRow = [
      user.userName,
      user.mobile,
      user.role,
      String(user.count),
      user.lastSubmission ? new Date(user.lastSubmission).toLocaleString() : "",
    ].map(escapeCSVField).join(",");
    downloadCSV([headerRow, dataRow].join("\n"), `user-${user.userName}.csv`);
  };

  const totalPages = reportData?.submissions ? Math.ceil(reportData.submissions.length / PAGE_SIZE) : 0;
  const paginatedSubmissions = reportData?.submissions?.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-task-reports-title">
          <BarChart3 className="h-6 w-6 text-primary" />
          Task Reports
        </h1>
        <p className="text-muted-foreground">Drill-down analytics for each task</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 flex-wrap">
            <div className="w-full sm:w-[250px]">
              <label className="text-sm font-medium mb-1 block">Select Task</label>
              {configsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedTaskId} onValueChange={(val) => { setSelectedTaskId(val); setCurrentPage(0); }}>
                  <SelectTrigger data-testid="select-trigger-task">
                    <SelectValue placeholder="Choose a task" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskConfigs?.map((tc) => (
                      <SelectItem key={tc.id} value={tc.id} data-testid={`select-item-task-${tc.id}`}>
                        {tc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <Button onClick={handleApplyDates} data-testid="button-apply-dates">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedTaskId && (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground" data-testid="text-select-task-prompt">
              Please select a task to view reports
            </p>
          </CardContent>
        </Card>
      )}

      {selectedTaskId && reportLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {selectedTaskId && reportData && !reportLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-submissions">
                  {reportData.summary.totalSubmissions}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-unique-users">
                  {reportData.summary.uniqueUsers}
                </div>
              </CardContent>
            </Card>
          </div>

          {reportData.dailyTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64" data-testid="chart-daily-trend">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={reportData.task.color || "hsl(var(--chart-1))"}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {reportData.fieldAnalytics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Field Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reportData.fieldAnalytics.map((field) => (
                    <div key={field.fieldKey} data-testid={`field-analytics-${field.fieldKey}`}>
                      <h4 className="text-sm font-semibold mb-3">{field.fieldLabel}</h4>
                      {field.values.length <= 5 ? (
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={field.values}
                                dataKey="count"
                                nameKey="value"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                label={({ value }) => value}
                              >
                                {field.values.map((_, idx) => (
                                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={field.values}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="value" tick={{ fontSize: 10 }} />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill="hsl(var(--chart-1))" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>User Breakdown</CardTitle>
              <Button variant="outline" onClick={handleExportUserSummary} disabled={!reportData.userBreakdown?.length} data-testid="button-export-user-summary">
                <Download className="h-4 w-4 mr-2" />
                Export User Summary
              </Button>
            </CardHeader>
            <CardContent>
              {reportData.userBreakdown.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground" data-testid="text-no-user-breakdown">No user data available</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Submissions Count</TableHead>
                        <TableHead>Last Submission</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.userBreakdown.map((user) => (
                        <TableRow key={user.userId} data-testid={`row-user-${user.userId}`}>
                          <TableCell className="font-medium" data-testid={`text-user-name-${user.userId}`}>{user.userName}</TableCell>
                          <TableCell data-testid={`text-user-mobile-${user.userId}`}>{user.mobile}</TableCell>
                          <TableCell>
                            <Badge variant="outline" data-testid={`badge-user-role-${user.userId}`}>{user.role}</Badge>
                          </TableCell>
                          <TableCell data-testid={`text-user-count-${user.userId}`}>{user.count}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap" data-testid={`text-user-last-${user.userId}`}>
                            {user.lastSubmission ? new Date(user.lastSubmission).toLocaleString() : "-"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleExportUserRow(user)} data-testid={`button-export-user-${user.userId}`}>
                              <Download className="h-4 w-4" />
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>Submissions</CardTitle>
              <Button variant="outline" onClick={handleExportAllSubmissions} disabled={!reportData.submissions?.length} data-testid="button-export-all-submissions">
                <Download className="h-4 w-4 mr-2" />
                Export All Submissions
              </Button>
            </CardHeader>
            <CardContent>
              {reportData.submissions.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground" data-testid="text-no-submissions">No submissions found</p>
              ) : (
                <>
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Created At</TableHead>
                          {reportData.fields.map((f) => (
                            <TableHead key={f.fieldKey}>{f.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSubmissions.map((sub, idx) => (
                          <TableRow key={sub.id || idx} data-testid={`row-submission-${sub.id || idx}`}>
                            <TableCell className="font-medium">{sub.userName ?? "-"}</TableCell>
                            <TableCell>{sub.userMobile ?? "-"}</TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "-"}
                            </TableCell>
                            {reportData.fields.map((f) => {
                              const rawValue = sub[f.fieldKey];
                              if (f.fieldKey === "__whatsappConsent") {
                                const consented = rawValue === "true";
                                return (
                                  <TableCell key={f.fieldKey}>
                                    {consented ? "Yes" : "No"}
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={f.fieldKey}>
                                  {String(rawValue ?? "-")}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-4 mt-4">
                      <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                        Page {currentPage + 1} of {totalPages} ({reportData.submissions.length} total)
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 0}
                          onClick={() => setCurrentPage((p) => p - 1)}
                          data-testid="button-prev-page"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages - 1}
                          onClick={() => setCurrentPage((p) => p + 1)}
                          data-testid="button-next-page"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
