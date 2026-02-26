import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Search, Users, UserCheck } from "lucide-react";
import { VoterDetailsCard } from "@/components/voter-details-card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface UserReport {
  id: string;
  name: string;
  mobileNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  voterId: string | null;
  mappedAreaName: string | null;
  mappedZone: string | null;
  mappedDistrict: string | null;
  mappedHalka: string | null;
  mappedBlockNumber: string | null;
  totalSubmissions: number;
  tasksCompleted: number;
  lastSubmission: string | null;
}

interface UserListResponse {
  users: UserReport[];
  totalUsers: number;
  activeUsers: number;
}

interface UserDetailResponse {
  user: {
    id: string;
    name: string;
    mobileNumber: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    voterId: string | null;
    mappedAreaName: string | null;
    mappedZone: string | null;
    mappedDistrict: string | null;
    mappedHalka: string | null;
    mappedBlockNumber: string | null;
  };
  totalSubmissions: number;
  taskBreakdown: { taskName: string; count: number }[];
  submissions: {
    id: string;
    taskName: string;
    taskConfigId: string;
    createdAt: string;
    data: Record<string, unknown>;
  }[];
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

export default function UserReportsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: userListData, isLoading: listLoading } = useQuery<UserListResponse>({
    queryKey: ["/api/analytics/user-report"],
  });

  const { data: userDetailData, isLoading: detailLoading } = useQuery<UserDetailResponse>({
    queryKey: ["/api/analytics/user-report", selectedUserId],
    enabled: !!selectedUserId,
  });

  const filteredUsers = userListData?.users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.mobileNumber.includes(searchTerm)
  );

  const handleExportUserList = () => {
    if (!userListData?.users.length) return;
    const headers = ["Name", "Mobile", "Role", "Status", "Zone", "District", "Halka (AC)", "Block", "Unit", "Submissions", "Tasks Completed", "Last Active", "Joined"];
    const headerRow = headers.map(escapeCSVField).join(",");
    const dataRows = userListData.users.map((u) => {
      const fields = [
        u.name,
        u.mobileNumber,
        u.role,
        u.isActive ? "Active" : "Inactive",
        u.mappedZone || "",
        u.mappedDistrict || "",
        u.mappedHalka || "",
        u.mappedBlockNumber || "",
        u.mappedAreaName || "",
        String(u.totalSubmissions),
        String(u.tasksCompleted),
        u.lastSubmission ? new Date(u.lastSubmission).toLocaleDateString() : "",
        u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV([headerRow, ...dataRows].join("\n"), "user-activity-report.csv");
  };

  const handleExportUserSubmissions = () => {
    if (!userDetailData?.submissions.length) return;
    const allDataKeys = new Set<string>();
    userDetailData.submissions.forEach((s) => {
      Object.keys(s.data).forEach((k) => allDataKeys.add(k));
    });
    const dataKeys = Array.from(allDataKeys);
    const headers = ["Task Name", "Date", ...dataKeys];
    const headerRow = headers.map(escapeCSVField).join(",");
    const dataRows = userDetailData.submissions.map((s) => {
      const fields = [
        s.taskName,
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
        ...dataKeys.map((k) => String(s.data[k] ?? "")),
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV(
      [headerRow, ...dataRows].join("\n"),
      `user-submissions-${userDetailData.user.name.replace(/\s+/g, "-")}.csv`
    );
  };

  if (selectedUserId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setSelectedUserId(null)}
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <Button
            variant="outline"
            onClick={handleExportUserSubmissions}
            disabled={!userDetailData?.submissions.length}
            data-testid="button-export-user-submissions"
          >
            <Download className="h-4 w-4 mr-2" />
            Export User Submissions
          </Button>
        </div>

        {detailLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : userDetailData ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-user-detail-name">{userDetailData.user.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Mobile</p>
                    <p className="font-medium" data-testid="text-user-detail-mobile">
                      {userDetailData.user.mobileNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium capitalize" data-testid="text-user-detail-role">
                      {userDetailData.user.role}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={userDetailData.user.isActive ? "default" : "secondary"}
                      data-testid="badge-user-detail-status"
                    >
                      {userDetailData.user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium" data-testid="text-user-detail-joined">
                      {userDetailData.user.createdAt
                        ? new Date(userDetailData.user.createdAt).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Submissions</p>
                    <p className="font-medium" data-testid="text-user-detail-submissions">
                      {userDetailData.totalSubmissions}
                    </p>
                  </div>
                </div>
                {(userDetailData.user.mappedAreaName || userDetailData.user.mappedZone || userDetailData.user.mappedDistrict || userDetailData.user.mappedHalka || userDetailData.user.mappedBlockNumber) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Mapped Hierarchy</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Zone</p>
                        <p className="font-medium" data-testid="text-user-detail-zone">
                          {userDetailData.user.mappedZone || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">District</p>
                        <p className="font-medium" data-testid="text-user-detail-district">
                          {userDetailData.user.mappedDistrict || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Halka (AC)</p>
                        <p className="font-medium" data-testid="text-user-detail-halka">
                          {userDetailData.user.mappedHalka || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Block</p>
                        <p className="font-medium" data-testid="text-user-detail-block">
                          {userDetailData.user.mappedBlockNumber || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Unit</p>
                        <p className="font-medium" data-testid="text-user-detail-unit">
                          {userDetailData.user.mappedAreaName || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {userDetailData.user.voterId && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Voter ID Details</p>
                    <div className="mb-2">
                      <Badge variant="secondary" data-testid="badge-user-voter-id">
                        Voter ID: {userDetailData.user.voterId}
                      </Badge>
                    </div>
                    <VoterDetailsCard voterId={userDetailData.user.voterId} />
                  </div>
                )}
              </CardContent>
            </Card>

            {userDetailData.taskBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle data-testid="text-task-breakdown-title">Task Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64" data-testid="chart-task-breakdown">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userDetailData.taskBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="taskName" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle data-testid="text-submissions-table-title">Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {userDetailData.submissions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground" data-testid="text-no-submissions">
                    No submissions found
                  </p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task Name</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Submitted Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDetailData.submissions.map((s) => (
                          <TableRow key={s.id} data-testid={`row-submission-${s.id}`}>
                            <TableCell className="font-medium" data-testid={`text-submission-task-${s.id}`}>
                              {s.taskName}
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-nowrap" data-testid={`text-submission-date-${s.id}`}>
                              {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1" data-testid={`text-submission-data-${s.id}`}>
                                {Object.entries(s.data).map(([key, val]) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}: {String(val)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-user-reports-title">
          <Users className="h-6 w-6 text-primary" />
          User Activity Reports
        </h1>
        <p className="text-muted-foreground">View registered users and their activity stats</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-users">
                {userListData?.totalUsers ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-active-users">
                {userListData?.activeUsers ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or mobile..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-users"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleExportUserList}
              disabled={!userListData?.users.length}
              data-testid="button-export-user-list"
            >
              <Download className="h-4 w-4 mr-2" />
              Export User List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !filteredUsers?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p data-testid="text-no-users">No users found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Halka (AC)</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Tasks Completed</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedUserId(user.id)}
                      data-testid={`row-user-${user.id}`}
                    >
                      <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                        {user.name}
                      </TableCell>
                      <TableCell data-testid={`text-user-mobile-${user.id}`}>
                        {user.mobileNumber}
                      </TableCell>
                      <TableCell className="capitalize" data-testid={`text-user-role-${user.id}`}>
                        {user.role}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-user-unit-${user.id}`}>
                        {user.mappedAreaName || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-user-block-${user.id}`}>
                        {user.mappedBlockNumber || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-user-halka-${user.id}`}>
                        {user.mappedHalka || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-user-district-${user.id}`}>
                        {user.mappedDistrict || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`text-user-zone-${user.id}`}>
                        {user.mappedZone || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "secondary"}
                          data-testid={`badge-user-status-${user.id}`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-user-submissions-${user.id}`}>
                        {user.totalSubmissions}
                      </TableCell>
                      <TableCell data-testid={`text-user-tasks-${user.id}`}>
                        {user.tasksCompleted}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap" data-testid={`text-user-last-active-${user.id}`}>
                        {user.lastSubmission
                          ? new Date(user.lastSubmission).toLocaleDateString()
                          : "-"}
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
