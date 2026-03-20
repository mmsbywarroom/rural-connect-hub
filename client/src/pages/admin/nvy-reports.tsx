import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldAlert, MapPin, Calendar, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, Mic } from "lucide-react";
import type { NvyReport } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const PAGE_SIZE = 10;

interface ReportDetailProps {
  report: NvyReport;
  onBack: () => void;
}

function ReportDetail({ report, onBack }: ReportDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-nvy-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold" data-testid="text-nvy-village">{report.villageName || "Unknown unit"}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {report.locationAddress || "No address provided"}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {report.createdAt ? new Date(report.createdAt).toLocaleString() : "—"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Report Details
            </h3>
            <div>
              <span className="text-xs text-muted-foreground">Description</span>
              <p className="text-sm font-medium mt-0.5 whitespace-pre-line" data-testid="text-nvy-description">
                {report.description || "—"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Latitude</span>
                <p className="text-sm font-medium">{report.latitude || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Longitude</span>
                <p className="text-sm font-medium">{report.longitude || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Photo
              </h3>
              {report.photo ? (
                <img
                  src={report.photo}
                  alt="Report"
                  className="w-full max-h-80 object-contain rounded-md border"
                  data-testid="img-nvy-detail-photo"
                />
              ) : (
                <p className="text-sm text-muted-foreground">No photo</p>
              )}
            </CardContent>
          </Card>

          {report.audioNote && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Mic className="h-4 w-4" /> Audio Note
                </h3>
                <audio controls className="w-full" data-testid="audio-nvy-note">
                  <source src={report.audioNote} />
                </audio>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

type NvyListRow = Pick<
  NvyReport,
  "id" | "villageId" | "villageName" | "description" | "latitude" | "longitude" | "locationAddress" | "createdAt"
>;

type NvyListResponse = {
  items: NvyListRow[];
  total: number;
  limit: number;
  offset: number;
  scopeStats?: { distinctUnits: number; latestCreatedAt: string | Date | null };
};

export default function NvyReportsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const adminAssignedVillages: string[] = (() => {
    try {
      const stored = localStorage.getItem("adminAssignedVillages");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();
  const villageIdsParam = adminAssignedVillages.length > 0 ? adminAssignedVillages.join(",") : "";

  const { data: listResponse, isLoading } = useQuery<NvyListResponse>({
    queryKey: ["/api/nvy/reports", page, debouncedSearch, villageIdsParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      const q = debouncedSearch.trim();
      if (q) params.set("search", q);
      if (villageIdsParam) params.set("villageIds", villageIdsParam);
      const res = await fetch(`/api/nvy/reports?${params.toString()}`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      return res.json();
    },
  });

  const { data: selectedFull, isLoading: detailLoading } = useQuery<NvyReport>({
    queryKey: ["/api/nvy/reports", selectedId, "detail"],
    enabled: !!selectedId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/nvy/reports/${selectedId}`);
      return res.json();
    },
  });

  const paged = listResponse?.items ?? [];
  const listTotal = listResponse?.total ?? 0;
  const scopeStats = listResponse?.scopeStats;
  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(listTotal / PAGE_SIZE) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [listTotal, page]);

  if (selectedId) {
    if (detailLoading || !selectedFull) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return <ReportDetail report={selectedFull} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-nvy-title">Nasha Viruddh Yuddh</h1>
          <p className="text-sm text-muted-foreground">
            Admin-only view of reports about locations where drug-related activity is happening
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold" data-testid="text-nvy-total-count">{listTotal}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">
                {scopeStats?.distinctUnits ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Distinct Units</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">
                {scopeStats?.latestCreatedAt
                  ? new Date(scopeStats.latestCreatedAt as string).toLocaleDateString()
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Latest Report Date</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by village, address, description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
            data-testid="input-search-nvy"
          />
        </div>
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
                <TableHead>Village / Unit</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedId(r.id)}
                  data-testid={`row-nvy-${r.id}`}
                >
                  <TableCell>{r.villageName || "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {r.locationAddress || (r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : "—")}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">{r.description}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">In detail</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {debouncedSearch ? "No reports match your search" : "No reports submitted yet"}
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
            Showing {listTotal === 0 ? 0 : page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, listTotal)} of {listTotal}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-nvy-prev-page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-nvy-next-page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

