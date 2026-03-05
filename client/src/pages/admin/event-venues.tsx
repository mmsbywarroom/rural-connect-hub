import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Calendar, Building2, MapPin, Phone, ChevronLeft, ChevronRight, Loader2, Navigation } from "lucide-react";
import type { EventVenue } from "@shared/schema";

const PAGE_SIZE = 10;

type EventVenueRow = EventVenue;

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted") {
    return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
  }
  if (status === "rejected") {
    return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
  }
  return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
}

export default function EventVenuesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");
  const [page, setPage] = useState(0);

  const { data: venues, isLoading } = useQuery<EventVenueRow[]>({
    queryKey: ["/api/admin/event-venues"],
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/event-venues/${id}`, {
        status,
        adminMessage: adminMessage.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/event-venues"] });
      setSelectedId(null);
      setAdminMessage("");
      setStatus("pending");
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const filtered = (venues || []).filter((v) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      v.venueName.toLowerCase().includes(q) ||
      (v.requesterName || "").toLowerCase().includes(q) ||
      (v.villageName || "").toLowerCase().includes(q) ||
      (v.locationLabel || "").toLowerCase().includes(q) ||
      (v.mobileNumber || "").includes(q);
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selected = selectedId ? filtered.find((v) => v.id === selectedId) : null;

  const openInMaps = (v: EventVenueRow) => {
    if (!v.latitude || !v.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`;
    window.open(url, "_blank");
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Event Venue</h1>
              <p className="text-sm text-muted-foreground">
                {selected.venueName} • {selected.date} {selected.time}
              </p>
            </div>
          </div>
          <StatusBadge status={selected.status} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Venue details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Venue</div>
                  <div className="font-medium">{selected.venueName}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Village</div>
                  <div className="font-medium">{selected.villageName || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="font-medium">
                    {selected.venueType === "other"
                      ? selected.venueTypeOther || "Other"
                      : selected.venueType?.replace(/_/g, " ") || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Capacity</div>
                  <div className="font-medium">{selected.capacity || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Date</div>
                  <div className="font-medium">{selected.date}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="font-medium">{selected.time}</div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location
                </div>
                <p className="text-sm font-medium">
                  {selected.locationLabel || "—"}
                </p>
                {selected.latitude && selected.longitude && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {selected.latitude}, {selected.longitude}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => openInMaps(selected)}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Open in Maps
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Contact
                </div>
                <p className="text-sm font-medium">
                  {selected.requesterName} ({selected.mobileNumber})
                </p>
              </div>

              {selected.notes && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-muted-foreground">Notes from user</div>
                  <p className="text-sm">{selected.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground mt-3">
                Submitted: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Admin action</h3>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="flex gap-2">
                  {["pending", "accepted", "rejected"].map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={status === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatus(s as any)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Message to user</label>
                <Textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="Write message for the user (visible in app)"
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => selected && updateMutation.mutate(selected.id)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Event Venues</h1>
          <p className="text-sm text-muted-foreground">Review event venue booking requests and open locations in maps.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by venue, name, mobile, village..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
          className="border rounded-md px-2 py-1 text-sm"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue</TableHead>
                <TableHead>Village</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((v) => (
                <TableRow
                  key={v.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    setSelectedId(v.id);
                    setAdminMessage(v.adminMessage || "");
                    setStatus((v.status as any) || "pending");
                  }}
                >
                  <TableCell>{v.venueName}</TableCell>
                  <TableCell>{v.villageName || "—"}</TableCell>
                  <TableCell>{v.date}</TableCell>
                  <TableCell>{v.time}</TableCell>
                  <TableCell>
                    {v.requesterName} ({v.mobileNumber})
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {search || statusFilter !== "all" ? "No bookings match your filters" : "No event venue bookings yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

