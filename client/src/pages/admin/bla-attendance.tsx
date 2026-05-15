import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download } from "lucide-react";
import type { BlaAttendance } from "@shared/schema";

function escapeCSVField(value: string): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function localDateYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type AttendanceResponse = {
  date: string;
  rows: BlaAttendance[];
};

export default function BlaAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(localDateYmd());
  const [boothFilter, setBoothFilter] = useState("");

  const { data, isLoading } = useQuery<AttendanceResponse>({
    queryKey: ["/api/admin/bla-attendance", selectedDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/bla-attendance?date=${encodeURIComponent(selectedDate)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to load attendance");
      return res.json();
    },
  });

  const rows = data?.rows ?? [];

  const filtered = useMemo(() => {
    if (!boothFilter.trim()) return rows;
    const q = boothFilter.trim();
    return rows.filter((r) => r.boothNumber.includes(q));
  }, [rows, boothFilter]);

  const summary = useMemo(() => {
    const present = rows.filter((r) => r.status === "present").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    return { present, absent, total: rows.length };
  }, [rows]);

  const handleDownloadCSV = () => {
    if (!filtered.length) return;
    const headers = ["Date", "Booth", "BLA Name", "Mobile", "Status"];
    const csvRows = filtered.map((r) => [
      r.attendanceDate,
      r.boothNumber,
      r.bloName,
      r.bloMobileNumber,
      r.status === "present" ? "Present" : "Absent",
    ]);
    const csv = [
      headers.map(escapeCSVField).join(","),
      ...csvRows.map((r) => r.map(escapeCSVField).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bla-attendance-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">BLA Daily Attendance</h1>
        <CardDescription>
          Date-wise record of which BLA / BLO was marked Present or Absent by field users.
        </CardDescription>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Select date</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date</label>
            <Input
              type="date"
              className="h-9 w-[180px]"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Filter booth</label>
            <Input
              className="h-9 w-[140px]"
              placeholder="Booth no."
              value={boothFilter}
              onChange={(e) => setBoothFilter(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </div>
          <div className="flex gap-2 text-sm">
            <Badge className="bg-green-600 hover:bg-green-600">Present: {summary.present}</Badge>
            <Badge variant="destructive">Absent: {summary.absent}</Badge>
            <Badge variant="outline">Total marked: {summary.total}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 ml-auto"
            onClick={handleDownloadCSV}
            disabled={!filtered.length}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Attendance on {selectedDate} ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              No attendance marked for this date{boothFilter ? " in this booth" : ""}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Booth</TableHead>
                    <TableHead>BLA / BLO Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{r.attendanceDate}</TableCell>
                      <TableCell className="text-sm">{r.boothNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{r.bloName}</TableCell>
                      <TableCell className="text-sm">{r.bloMobileNumber}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            r.status === "present"
                              ? "bg-green-600 hover:bg-green-600"
                              : "bg-red-600 hover:bg-red-600"
                          }
                        >
                          {r.status === "present" ? "Present" : "Absent"}
                        </Badge>
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
