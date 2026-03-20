import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Download, MessageSquare, Search, Users } from "lucide-react";

type ContactsHubRow = {
  id: string;
  name: string;
  mobileNumber: string;
  unit: string;
  voterId: string;
  tasks: string[];
  latestTaskAt: string;
};

type ContactsHubResponse = {
  items: ContactsHubRow[];
  total: number;
  limit?: number;
  offset?: number;
};

const PAGE_SIZE = 100;

export default function ContactsHubPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const [selectedMobiles, setSelectedMobiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(0);
  }, [search, taskFilter]);

  const queryUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(page * PAGE_SIZE));
    if (search.trim()) qs.set("search", search.trim());
    if (taskFilter !== "all") qs.set("task", taskFilter);
    return `/api/admin/contacts-hub?${qs.toString()}`;
  }, [search, taskFilter, page]);

  const { data, isLoading, refetch } = useQuery<ContactsHubResponse>({
    queryKey: [queryUrl],
  });

  const rows = data?.items || [];
  const listTotal = data?.total ?? 0;
  const canPrevPage = page > 0;
  const canNextPage = (page + 1) * PAGE_SIZE < listTotal;

  const allTasks = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      for (const t of r.tasks) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const selectedCount = selectedMobiles.size;
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selectedMobiles.has(r.mobileNumber));

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedMobiles);
    if (allOnPageSelected) {
      rows.forEach((r) => next.delete(r.mobileNumber));
    } else {
      rows.forEach((r) => next.add(r.mobileNumber));
    }
    setSelectedMobiles(next);
  };

  const toggleRow = (mobile: string, checked: boolean) => {
    const next = new Set(selectedMobiles);
    if (checked) next.add(mobile);
    else next.delete(mobile);
    setSelectedMobiles(next);
  };

  const sendSmsMutation = useMutation({
    mutationFn: async ({ mobiles }: { mobiles: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/contacts-hub/send-sms", {
        message,
        mobiles,
      });
      return res.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: "SMS request processed",
        description: `Sent: ${result.successCount || 0}, Failed: ${result.failureCount || 0}`,
      });
    },
    onError: (e: any) => {
      toast({
        title: "SMS failed",
        description: e?.message || "Unable to send SMS",
        variant: "destructive",
      });
    },
  });

  const handleSendSelected = () => {
    const mobiles = Array.from(selectedMobiles);
    if (!message.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    if (mobiles.length === 0) {
      toast({ title: "Select at least one contact", variant: "destructive" });
      return;
    }
    sendSmsMutation.mutate({ mobiles });
  };

  const handleSendAllFiltered = () => {
    if (!message.trim()) {
      toast({ title: "Message required", variant: "destructive" });
      return;
    }
    if (rows.length === 0) {
      toast({ title: "No contacts found", variant: "destructive" });
      return;
    }
    const ok = window.confirm(`Send SMS to all ${rows.length} contacts on this page?`);
    if (!ok) return;
    const mobiles = rows.map((r) => r.mobileNumber);
    sendSmsMutation.mutate({ mobiles });
  };

  const handleDownloadCsv = () => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());
    if (taskFilter !== "all") qs.set("task", taskFilter);
    window.open(`/api/admin/contacts-hub/export?${qs.toString()}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Contacts Hub
        </h1>
        <CardDescription>
          Unified contacts from all major tasks. Search, filter, export CSV, and send free-text SMS in one place.
        </CardDescription>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Search</Label>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, mobile, voter id, unit, task"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Task</Label>
              <select
                className="border rounded-md px-2 py-2 text-sm w-full bg-white"
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
              >
                <option value="all">All Tasks</option>
                {allTasks.map((t) => (
                  <option key={t} value={t.toLowerCase()}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Refresh
              </Button>
              <Button variant="outline" onClick={handleDownloadCsv}>
                <Download className="h-4 w-4 mr-1" />
                Download CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Broadcast SMS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type SMS message here..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSendSelected} disabled={sendSmsMutation.isPending}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Send to Selected ({selectedCount})
            </Button>
            <Button variant="outline" onClick={handleSendAllFiltered} disabled={sendSmsMutation.isPending}>
              Send to all on this page ({rows.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contacts ({data?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading contacts...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No contacts found.</p>
          ) : (
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-2">
                      <Checkbox checked={allOnPageSelected} onCheckedChange={(v) => toggleSelectAllOnPage()} />
                    </th>
                    <th className="py-2 pr-2 font-medium">Name</th>
                    <th className="py-2 pr-2 font-medium">Mobile</th>
                    <th className="py-2 pr-2 font-medium">Unit</th>
                    <th className="py-2 pr-2 font-medium">Voter ID</th>
                    <th className="py-2 pr-2 font-medium">Tasks</th>
                    <th className="py-2 pr-2 font-medium">Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        <Checkbox
                          checked={selectedMobiles.has(r.mobileNumber)}
                          onCheckedChange={(v) => toggleRow(r.mobileNumber, !!v)}
                        />
                      </td>
                      <td className="py-2 pr-2">{r.name}</td>
                      <td className="py-2 pr-2 font-mono">{r.mobileNumber}</td>
                      <td className="py-2 pr-2">{r.unit || "—"}</td>
                      <td className="py-2 pr-2 font-mono">{r.voterId || "—"}</td>
                      <td className="py-2 pr-2">{r.tasks.join(", ")}</td>
                      <td className="py-2 pr-2 text-xs text-slate-600">
                        {r.latestTaskAt ? new Date(r.latestTaskAt).toLocaleString("en-IN") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!isLoading && listTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} — showing {listTotal === 0 ? 0 : page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, listTotal)} of {listTotal}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!canPrevPage} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Previous
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={!canNextPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
