import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Vote, Search, Download, Upload, Loader2, ExternalLink, Trash2 } from "lucide-react";

const PAGE_SIZE = 50;

type VoterMappingRow = {
  id: string;
  slNo: number | null;
  boothId: string | null;
  name: string | null;
  fatherName: string | null;
  houseNumber: string | null;
  gender: string | null;
  age: string | null;
  voterId: string;
  villageName: string | null;
  tasks: { taskKey: string; taskName: string; submissionId: string }[];
};

type VoterMappingResponse = {
  list: VoterMappingRow[];
  total: number;
  limit: number;
  offset: number;
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          row.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

function escapeCSVField(value: string): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export default function VoterMappingWorkPage() {
  const [search, setSearch] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const queryUrl = `/api/admin/voter-mapping?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ""}${villageFilter ? `&village=${encodeURIComponent(villageFilter)}` : ""}`;
  const { data, isLoading } = useQuery<VoterMappingResponse>({
    queryKey: [queryUrl],
  });

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await apiRequest("POST", "/api/admin/voter-mapping/import", { rows });
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: "Chunk imported", description: `${result.inserted} rows` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/voter-mapping"] });
    },
    onError: () => {
      toast({ title: "Import failed", variant: "destructive" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/voter-mapping");
    },
    onSuccess: () => {
      toast({ title: "Table cleared" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/voter-mapping"] });
    },
    onError: () => toast({ title: "Failed to clear", variant: "destructive" }),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast({ title: "CSV must have header + at least one row", variant: "destructive" });
        setImporting(false);
        return;
      }
      const header = rows[0].map((h) => (h || "").trim().toLowerCase().replace(/\s+/g, " "));
      const col = (name: string) => {
        const i = header.findIndex((h) => h.includes(name) || h === name);
        return i >= 0 ? i : -1;
      };
      const idxSl = header.findIndex((h) => /sl|serial|no\.?/i.test(h));
      const idxBooth = col("boothid") >= 0 ? col("boothid") : header.findIndex((h) => /booth/i.test(h));
      const idxName = col("name") >= 0 ? col("name") : 0;
      const idxFather = header.findIndex((h) => /father|parent/i.test(h));
      const idxHouse = header.findIndex((h) => /house|hr\.?no/i.test(h));
      const idxGender = col("gender") >= 0 ? col("gender") : header.findIndex((h) => /sex|gender/i.test(h));
      const idxAge = col("age") >= 0 ? col("age") : header.findIndex((h) => /age/i.test(h));
      const idxVoter = header.findIndex((h) => /voter|epic|vcard|card\s*id/i.test(h));
      const idxVillage = header.findIndex((h) => /village|gram|gaon/i.test(h));

      const out: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const voterId = idxVoter >= 0 ? (r[idxVoter] || "").trim() : "";
        if (!voterId) continue;
        out.push({
          slNo: idxSl >= 0 && r[idxSl] ? parseInt(r[idxSl], 10) || null : null,
          boothId: idxBooth >= 0 ? r[idxBooth] || null : null,
          name: idxName >= 0 ? r[idxName] || null : null,
          fatherName: idxFather >= 0 ? r[idxFather] || null : null,
          houseNumber: idxHouse >= 0 ? r[idxHouse] || null : null,
          gender: idxGender >= 0 ? r[idxGender] || null : null,
          age: idxAge >= 0 ? r[idxAge] || null : null,
          voterId,
          villageName: idxVillage >= 0 ? r[idxVillage] || null : null,
        });
      }

      const CHUNK = 5000;
      for (let i = 0; i < out.length; i += CHUNK) {
        await importMutation.mutateAsync(out.slice(i, i + CHUNK));
      }
      toast({ title: "Import complete", description: `${out.length} rows imported` });
    } catch (err) {
      toast({ title: "Error parsing CSV", variant: "destructive" });
    } finally {
      setImporting(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadCSV = () => {
    const list = data?.list || [];
    const headers = ["BoothId", "Name", "Father's Name", "Gender", "Age", "Voter ID", "Village Name", "Tasks"];
    const rows = list.map((r) => [
      r.boothId ?? "",
      r.name ?? "",
      r.fatherName ?? "",
      r.gender ?? "",
      r.age ?? "",
      r.voterId ?? "",
      r.villageName ?? "",
      (r.tasks || []).map((t) => `${t.taskName} (${t.submissionId})`).join("; "),
    ]);
    const csv = [headers.map(escapeCSVField).join(","), ...rows.map((r) => r.map(escapeCSVField).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voter-mapping-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const taskLink = (task: { taskKey: string; taskName: string; submissionId: string }) => {
    if (task.taskKey === "hstc") {
      return `/admin/hstc?open=${encodeURIComponent(task.submissionId)}`;
    }
    if (task.taskKey === "tirthYatra") {
      return `/admin/tirth-yatra?open=${encodeURIComponent(task.submissionId)}`;
    }
    return "#";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Vote className="h-6 w-6 text-primary" />
          Voter Mapping Work
        </h1>
        <CardDescription>
          Import voter list (BoothId, Name, Father&apos;s Name, Gender, Age, Voter ID, Village Name). Matches with Voter ID from task OCR (HSTC, Tirth Yatra). Click a task to open its detail view.
        </CardDescription>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Import from CSV / Google Sheet</CardTitle>
          <CardDescription className="text-xs">
            Export from Google Sheet as CSV. Columns: sl no, BoothId, Name, Father&apos;s Name, House Number, Gender, Age, Voter ID, Village Name. Large files (2L+ rows) are sent in chunks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {importing ? "Importing…" : "Choose CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending || total === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear table
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <CardTitle className="text-sm">Mapped voters ({total})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search (name, voter ID, village, booth…)"
                className="max-w-xs h-8 text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
              <Input
                placeholder="Village filter"
                className="max-w-[180px] h-8 text-sm"
                value={villageFilter}
                onChange={(e) => { setVillageFilter(e.target.value); setPage(0); }}
              />
              <Button variant="outline" size="sm" className="h-8" onClick={handleDownloadCSV} disabled={list.length === 0}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No rows. Import a CSV above.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>BoothId</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Father&apos;s Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Voter ID</TableHead>
                      <TableHead>Village Name</TableHead>
                      <TableHead>Tasks (click to open)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell>{r.boothId ?? "—"}</TableCell>
                        <TableCell>{r.name ?? "—"}</TableCell>
                        <TableCell>{r.fatherName ?? "—"}</TableCell>
                        <TableCell>{r.gender ?? "—"}</TableCell>
                        <TableCell>{r.age ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.voterId}</TableCell>
                        <TableCell>{r.villageName ?? "—"}</TableCell>
                        <TableCell>
                          {(r.tasks || []).length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {(r.tasks || []).map((t) => (
                                <Link
                                  key={t.submissionId}
                                  href={taskLink(t)}
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                  {t.taskName}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
