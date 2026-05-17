import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, FileUp, UserPlus, Pencil } from "lucide-react";
import type { BlaMaster } from "@shared/schema";

export default function BlaUploadCsvPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMobile, setAddMobile] = useState("");
  const [addBooth, setAddBooth] = useState("");
  const [editRow, setEditRow] = useState<BlaMaster | null>(null);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editBooth, setEditBooth] = useState("");

  const { data, isLoading, refetch } = useQuery<BlaMaster[]>({
    queryKey: ["/api/admin/bla-master"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (csvText: string) => {
      const res = await apiRequest("POST", "/api/admin/bla-master/upload-csv", { csvText });
      return res.json();
    },
    onSuccess: (result: { count: number }) => {
      toast({
        title: "CSV uploaded",
        description: `${result.count} BLA rows loaded. Profiles and attendance are re-linked by mobile + booth.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bla-master"] });
      refetch();
    },
    onError: async (err: unknown) => {
      let msg = "Upload failed";
      try {
        const res = (err as { response?: Response })?.response;
        if (res) {
          const body = await res.json();
          if (body?.error) msg = body.error;
        }
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/bla-master/add", {
        name: addName.trim(),
        mobileNumber: addMobile.trim(),
        boothNumber: addBooth.trim(),
      });
      return (await res.json()) as BlaMaster;
    },
    onSuccess: () => {
      toast({ title: "BLA added to master list" });
      setAddOpen(false);
      setAddName("");
      setAddMobile("");
      setAddBooth("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bla-master"] });
      refetch();
    },
    onError: async (err: unknown) => {
      let msg = "Could not add BLA";
      try {
        const res = (err as { response?: Response })?.response;
        if (res) {
          const body = await res.json();
          if (body?.error) msg = body.error;
        }
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) throw new Error("No row selected");
      const res = await apiRequest("PATCH", `/api/admin/bla-master/${editRow.id}`, {
        name: editName.trim(),
        mobileNumber: editMobile.trim(),
        boothNumber: editBooth.trim(),
      });
      return (await res.json()) as BlaMaster;
    },
    onSuccess: () => {
      toast({ title: "BLA updated" });
      setEditRow(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bla-master"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bla/master/by-booth"] });
      refetch();
    },
    onError: async (err: unknown) => {
      let msg = "Could not update BLA";
      try {
        const res = (err as { response?: Response })?.response;
        if (res) {
          const body = await res.json();
          if (body?.error) msg = body.error;
        }
      } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const openEdit = (row: BlaMaster) => {
    setEditRow(row);
    setEditName(row.name);
    setEditMobile(row.mobileNumber);
    setEditBooth(row.boothNumber);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      uploadMutation.mutate(String(reader.result || ""));
    };
    reader.readAsText(file);
  };

  const list = data ?? [];
  const filtered = search.trim()
    ? list.filter((r) =>
        [r.name, r.mobileNumber, r.boothNumber, String(r.serialNumber)]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : list;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">BLA Upload CSV</h1>
        <CardDescription>
          Upload CSV with columns <strong>NAME</strong>, <strong>Mobile Number</strong>, <strong>Booth No</strong>.
          Each upload replaces the master list; completed profiles and attendance are re-linked by mobile + booth.
        </CardDescription>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Upload file</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload CSV
          </Button>
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add BLA manually
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent("NAME,Mobile Number,Booth No\nSample Person,9876543210,1")}`}
              download="bla-master-template.csv"
            >
              <FileUp className="h-4 w-4 mr-1" />
              Download template
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Master log ({filtered.length})</CardTitle>
            <CardDescription className="text-xs">Serial-wise list from last upload — use Edit to fix name, mobile or booth</CardDescription>
          </div>
          <Input
            placeholder="Search name, mobile, booth..."
            className="h-8 w-[220px] text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No BLA master data. Upload a CSV or add manually.</p>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Booth No</TableHead>
                    <TableHead className="w-[80px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.serialNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.mobileNumber}</TableCell>
                      <TableCell className="text-sm">{r.boothNumber}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(r)}
                          title="Edit name, mobile, booth"
                        >
                          <Pencil className="h-4 w-4" />
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add BLA to master list</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="text-sm font-medium">Mobile (10 digits)</label>
              <Input
                type="tel"
                maxLength={10}
                value={addMobile}
                onChange={(e) => setAddMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Booth No</label>
              <Input value={addBooth} onChange={(e) => setAddBooth(e.target.value)} placeholder="e.g. 125" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={
                !addName.trim() || addMobile.length !== 10 || !addBooth.trim() || addMutation.isPending
              }
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit BLA master entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Mobile (10 digits)</label>
              <Input
                type="tel"
                maxLength={10}
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Booth No</label>
              <Input value={editBooth} onChange={(e) => setEditBooth(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={
                !editName.trim() || editMobile.length !== 10 || !editBooth.trim() || editMutation.isPending
              }
            >
              {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
