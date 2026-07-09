import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Database, FileText, ImageIcon, X, Pencil, Trash2, Ban, ShieldCheck, MoreHorizontal, RefreshCw } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaskConfig, MappedVolunteer, Supporter } from "@shared/schema";

type MappedVolunteerWithName = MappedVolunteer & { addedByName?: string };
type SupporterWithName = Supporter & { addedByName?: string };

type MappedVolunteerBoothSummary = {
  totalVolunteers: number;
  missingVoterId: number;
  missingOcrVoterId: number;
  missingBothIds: number;
  hasEffectiveVoterId: number;
  matchedWithBooth: number;
  unmatchedNoBooth: number;
  boothCounts: { boothId: string; volunteerCount: number }[];
  unmatchedSamples: { id: string; name: string; effectiveVoterId: string }[];
};

function downloadBoothSummaryPdf(summary: MappedVolunteerBoothSummary) {
  const doc = new jsPDF();
  const generatedAt = new Date().toLocaleString("en-IN");

  doc.setFontSize(16);
  doc.text("Mapped Volunteers - Booth Summary Report", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${generatedAt}`, 14, 26);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 34,
    head: [["Metric", "Count"]],
    body: [
      ["Total volunteers", String(summary.totalVolunteers)],
      ["Booth matched", String(summary.matchedWithBooth)],
      ["Missing Voter ID", String(summary.missingVoterId)],
      ["Missing OCR Voter ID", String(summary.missingOcrVoterId)],
      ["Both IDs missing", String(summary.missingBothIds)],
      ["No booth match (has voter ID)", String(summary.unmatchedNoBooth)],
      ["Distinct booths", String(summary.boothCounts.length)],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const afterSummaryY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 90;

  doc.setFontSize(12);
  doc.text("Volunteers per booth", 14, afterSummaryY + 12);

  autoTable(doc, {
    startY: afterSummaryY + 16,
    head: [["Booth ID", "Volunteer count"]],
    body: summary.boothCounts.map((b) => [b.boothId, String(b.volunteerCount)]),
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  if (summary.unmatchedSamples.length > 0) {
    let startY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
    if (startY > 240) {
      doc.addPage();
      startY = 20;
    }
    doc.setFontSize(12);
    doc.text("Unmatched volunteers (sample)", 14, startY + 10);
    autoTable(doc, {
      startY: startY + 14,
      head: [["Name", "Voter ID used for match"]],
      body: summary.unmatchedSamples.map((u) => [u.name, u.effectiveVoterId]),
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] },
    });
  }

  doc.save(`mapped-volunteers-booth-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
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

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + "..." : id;
}

const EXPORT_PAGE_SIZE = 50;

type Paginated<T> = { items: T[]; total: number; limit: number; offset: number };

function ListPagination({
  pageIndex,
  pageSize,
  total,
  onPageChange,
}: {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const canPrev = pageIndex > 0;
  const canNext = (pageIndex + 1) * pageSize < total;
  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <p className="text-xs text-muted-foreground">
        Showing {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onPageChange(pageIndex - 1)}>
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {pageIndex + 1} of {Math.ceil(total / pageSize) || 1}
        </span>
        <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onPageChange(pageIndex + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

async function fetchAllPaginated<T>(baseUrl: string, pageSize = 200): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const res = await fetch(`${baseUrl}${sep}limit=${pageSize}&offset=${offset}`, { credentials: "include" });
    if (!res.ok) throw new Error("Fetch failed");
    const page: Paginated<T> = await res.json();
    all.push(...page.items);
    if (all.length >= page.total || page.items.length === 0) break;
    offset += pageSize;
  }
  return all;
}

interface DocumentData {
  name: string;
  aadhaarPhoto?: string | null;
  aadhaarPhotoBack?: string | null;
  voterCardPhoto?: string | null;
  voterCardPhotoBack?: string | null;
  selfPhoto?: string | null;
}

function DocumentViewerDialog({
  open,
  onOpenChange,
  personName,
  apiUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string;
  apiUrl: string;
}) {
  const { data, isLoading } = useQuery<DocumentData>({
    queryKey: [apiUrl],
    enabled: open && !!apiUrl,
  });

  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const docs = [
    { label: "Self Photo", src: data?.selfPhoto },
    { label: "Aadhaar Card (Front)", src: data?.aadhaarPhoto },
    { label: "Aadhaar Card (Back)", src: data?.aadhaarPhotoBack },
    { label: "Voter ID (Front)", src: data?.voterCardPhoto },
    { label: "Voter ID (Back)", src: data?.voterCardPhotoBack },
  ];

  const hasAnyDocs = docs.some((d) => d.src);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-doc-viewer-title">
              <FileText className="h-5 w-5" />
              Documents - {personName}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !hasAnyDocs ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p data-testid="text-no-documents">No documents uploaded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {docs.map((doc) =>
                doc.src ? (
                  <div key={doc.label} className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">{doc.label}</p>
                    <div
                      className="border rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setExpandedImage(doc.src!)}
                      data-testid={`doc-image-${doc.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    >
                      <img
                        src={doc.src}
                        alt={doc.label}
                        className="w-full max-h-48 object-contain bg-slate-50"
                      />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Expanded Document</DialogTitle>
          </DialogHeader>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 z-10"
            onClick={() => setExpandedImage(null)}
            data-testid="button-close-expanded"
          >
            <X className="h-4 w-4" />
          </Button>
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Document"
              className="w-full max-h-[80vh] object-contain"
              data-testid="img-expanded-document"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DataExportPage() {
  const { toast } = useToast();
  const [selectedTaskConfigId, setSelectedTaskConfigId] = useState<string>("");
  const [docViewer, setDocViewer] = useState<{ open: boolean; name: string; apiUrl: string }>({
    open: false,
    name: "",
    apiUrl: "",
  });
  const [editUser, setEditUser] = useState<{ open: boolean; id: string; name: string; role: string; wing: string; currentPosition: string; level: string }>({
    open: false, id: "", name: "", role: "", wing: "", currentPosition: "", level: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string; type: "user" | "volunteer" | "supporter" }>({
    open: false, id: "", name: "", type: "user",
  });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedVolunteers, setSelectedVolunteers] = useState<Set<string>>(new Set());
  const [selectedSupporters, setSelectedSupporters] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<{ open: boolean; type: "user" | "volunteer" | "supporter"; count: number }>({
    open: false, type: "user", count: 0,
  });
  const [usersPageIndex, setUsersPageIndex] = useState(0);
  const [volunteersPageIndex, setVolunteersPageIndex] = useState(0);
  const [supportersPageIndex, setSupportersPageIndex] = useState(0);

  const editMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Record<string, string> }) => {
      const res = await apiRequest("PATCH", `/api/admin/app-users/${data.id}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export/app-users"] });
      setEditUser({ open: false, id: "", name: "", role: "", wing: "", currentPosition: "", level: "" });
      toast({ title: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/admin/app-users/${id}/block`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/export/app-users"] });
      toast({ title: "User status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update user status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "user" | "volunteer" | "supporter" }) => {
      const urlMap = {
        user: `/api/admin/app-users/${id}`,
        volunteer: `/api/mapped-volunteers/${id}`,
        supporter: `/api/supporters/${id}`,
      };
      await apiRequest("DELETE", urlMap[type]);
      return type;
    },
    onSuccess: (_data, variables) => {
      const keyMap = {
        user: "/api/export/app-users",
        volunteer: "/api/mapped-volunteers",
        supporter: "/api/supporters",
      };
      queryClient.invalidateQueries({ queryKey: [keyMap[variables.type]] });
      setDeleteConfirm({ open: false, id: "", name: "", type: "user" });
      toast({ title: "Deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async ({ ids, type }: { ids: string[]; type: "user" | "volunteer" | "supporter" }) => {
      const urlMap = {
        user: "/api/admin/app-users/batch-delete",
        volunteer: "/api/mapped-volunteers/batch-delete",
        supporter: "/api/supporters/batch-delete",
      };
      await apiRequest("POST", urlMap[type], { ids });
      return type;
    },
    onSuccess: (_data, variables) => {
      const keyMap = {
        user: "/api/export/app-users",
        volunteer: "/api/mapped-volunteers",
        supporter: "/api/supporters",
      };
      queryClient.invalidateQueries({ queryKey: [keyMap[variables.type]] });
      if (variables.type === "user") setSelectedUsers(new Set());
      else if (variables.type === "volunteer") setSelectedVolunteers(new Set());
      else setSelectedSupporters(new Set());
      setBatchDeleteConfirm({ open: false, type: "user", count: 0 });
      toast({ title: `${variables.ids.length} record(s) deleted successfully` });
    },
    onError: () => {
      toast({ title: "Failed to delete selected records", variant: "destructive" });
    },
  });

  const toggleSelection = (set: Set<string>, setFn: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFn(next);
  };

  const toggleSelectAll = (allIds: string[], set: Set<string>, setFn: (s: Set<string>) => void) => {
    if (set.size === allIds.length) setFn(new Set());
    else setFn(new Set(allIds));
  };

  const { data: taskConfigs, isLoading: configsLoading } = useQuery<TaskConfig[]>({
    queryKey: ["/api/task-configs"],
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery<{
    id: string;
    taskConfigId: string;
    appUserId: string;
    data: string;
    createdAt: string | null;
  }[]>({
    queryKey: ["/api/task-submissions", selectedTaskConfigId],
    queryFn: async () => {
      const url = selectedTaskConfigId && selectedTaskConfigId !== "all"
        ? `/api/task-submissions?taskConfigId=${selectedTaskConfigId}`
        : "/api/task-submissions";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch submissions");
      return res.json();
    },
  });

  const { data: appUsersPage, isLoading: usersLoading } = useQuery<Paginated<{
    id: string;
    mobileNumber: string;
    name: string;
    role: string;
    currentPosition: string | null;
    level: string | null;
    mappedAreaName: string | null;
    mappedZone: string | null;
    mappedDistrict: string | null;
    mappedHalka: string | null;
    mappedBlockNumber: string | null;
    wing: string | null;
    voterId: string | null;
    aadhaarNumber: string | null;
    ocrName: string | null;
    ocrAadhaarNumber: string | null;
    ocrVoterId: string | null;
    ocrDob: string | null;
    ocrGender: string | null;
    ocrAddress: string | null;
    aadhaarPhoto: string | null;
    aadhaarPhotoBack: string | null;
    voterCardPhoto: string | null;
    voterCardPhotoBack: string | null;
    selfPhoto: string | null;
    isActive: boolean | null;
    createdAt: string | null;
  }>>({
    queryKey: ["/api/export/app-users", usersPageIndex],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(EXPORT_PAGE_SIZE),
        offset: String(usersPageIndex * EXPORT_PAGE_SIZE),
      });
      const res = await fetch(`/api/export/app-users?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch app users");
      return res.json();
    },
  });
  const appUsers = appUsersPage?.items ?? [];
  const appUsersTotal = appUsersPage?.total ?? 0;

  const { data: mappedVolunteersPage, isLoading: volunteersLoading } = useQuery<Paginated<MappedVolunteerWithName>>({
    queryKey: ["/api/mapped-volunteers", volunteersPageIndex],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(EXPORT_PAGE_SIZE),
        offset: String(volunteersPageIndex * EXPORT_PAGE_SIZE),
      });
      const res = await fetch(`/api/mapped-volunteers?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch mapped volunteers");
      return res.json();
    },
  });
  const mappedVolunteers = mappedVolunteersPage?.items ?? [];
  const mappedVolunteersTotal = mappedVolunteersPage?.total ?? 0;

  const { data: boothSummary } = useQuery<MappedVolunteerBoothSummary>({
    queryKey: ["/api/admin/mapped-volunteers/booth-summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/mapped-volunteers/booth-summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch booth summary");
      return res.json();
    },
  });

  const matchBoothsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/mapped-volunteers/match-booths");
      return res.json() as Promise<MappedVolunteerBoothSummary>;
    },
    onSuccess: (summary) => {
      queryClient.setQueryData(["/api/admin/mapped-volunteers/booth-summary"], summary);
      queryClient.invalidateQueries({ queryKey: ["/api/mapped-volunteers"] });
      toast({
        title: "Booth IDs updated",
        description: `${summary.matchedWithBooth} volunteers matched across ${summary.boothCounts.length} booths`,
      });
    },
    onError: () => {
      toast({ title: "Failed to match booth IDs", variant: "destructive" });
    },
  });

  const { data: supportersPage, isLoading: supportersLoading } = useQuery<Paginated<SupporterWithName>>({
    queryKey: ["/api/supporters", supportersPageIndex],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(EXPORT_PAGE_SIZE),
        offset: String(supportersPageIndex * EXPORT_PAGE_SIZE),
      });
      const res = await fetch(`/api/supporters?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch supporters");
      return res.json();
    },
  });
  const supportersList = supportersPage?.items ?? [];
  const supportersTotal = supportersPage?.total ?? 0;

  const parsedSubmissions = submissions?.map((s) => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(s.data);
    } catch {
      parsed = { raw: s.data };
    }
    return { ...s, parsed };
  });

  const handleExportSubmissions = () => {
    if (!parsedSubmissions?.length) return;
    const allDataKeys = new Set<string>();
    parsedSubmissions.forEach((s) => {
      Object.keys(s.parsed).forEach((k) => allDataKeys.add(k));
    });
    const dataKeys = Array.from(allDataKeys);
    const headerRow = ["ID", "User ID", ...dataKeys, "Date"].map(escapeCSVField).join(",");
    const dataRows = parsedSubmissions.map((s) => {
      const fields = [
        s.id,
        s.appUserId,
        ...dataKeys.map((k) => String(s.parsed[k] ?? "")),
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV([headerRow, ...dataRows].join("\n"), "task-submissions.csv");
  };

  const handleExportUsers = async () => {
    try {
      const all = await fetchAllPaginated<typeof appUsers[0]>("/api/export/app-users");
      if (!all.length) return;
      const headerRow = ["Name", "Mobile", "Role", "Zone", "District", "Halka (AC)", "Block", "Unit", "Position", "Level", "Wing", "Voter ID", "Aadhaar Number", "OCR Name", "OCR Aadhaar", "OCR Voter ID", "OCR DOB", "OCR Gender", "OCR Address", "Created Date"]
        .map(escapeCSVField)
        .join(",");
      const dataRows = all.map((u) => {
        const fields = [
          u.name,
          u.mobileNumber,
          u.role,
          u.mappedZone ?? "",
          u.mappedDistrict ?? "",
          u.mappedHalka ?? "",
          u.mappedBlockNumber ?? "",
          u.mappedAreaName ?? "",
          u.currentPosition ?? "",
          u.level ?? "",
          u.wing ?? "",
          u.voterId ?? "",
          u.aadhaarNumber ?? "",
          u.ocrName ?? "",
          u.ocrAadhaarNumber ?? "",
          u.ocrVoterId ?? "",
          u.ocrDob ?? "",
          u.ocrGender ?? "",
          u.ocrAddress ?? "",
          u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "",
        ];
        return fields.map(escapeCSVField).join(",");
      });
      downloadCSV([headerRow, ...dataRows].join("\n"), "app-users.csv");
    } catch {
      toast({ title: "Failed to export users", variant: "destructive" });
    }
  };

  const attachmentLink = (type: "mapped-volunteers" | "supporters", id: string, field: string, hasData: string | null | undefined) => {
    if (!hasData) return "";
    return `${window.location.origin}/api/export/${type}/${id}/attachment/${field}`;
  };

  const handleExportVolunteers = async () => {
    try {
      const all = await fetchAllPaginated<MappedVolunteerWithName>("/api/mapped-volunteers");
      if (!all.length) return;
    const headerRow = ["Name", "Mobile", "Category", "Voter ID", "Booth ID", "Verified", "Added By", "OCR Name", "OCR Aadhaar", "OCR Voter ID", "OCR DOB", "OCR Gender", "OCR Address", "Aadhaar Photo Front", "Aadhaar Photo Back", "Voter Card Front", "Voter Card Back", "Village/Unit", "Created Date"]
      .map(escapeCSVField)
      .join(",");
    const dataRows = all.map((v) => {
      const fields = [
        v.name,
        v.mobileNumber,
        v.category ?? "",
        v.voterId ?? "",
        v.voterMappingBoothId ?? "",
        v.isVerified ? "Yes" : "No",
        v.addedByName ?? v.addedByUserId ?? "",
        v.ocrName ?? "",
        v.ocrAadhaarNumber ?? "",
        v.ocrVoterId ?? "",
        v.ocrDob ?? "",
        v.ocrGender ?? "",
        v.ocrAddress ?? "",
        attachmentLink("mapped-volunteers", v.id, "aadhaarPhoto", v.aadhaarPhoto),
        attachmentLink("mapped-volunteers", v.id, "aadhaarPhotoBack", v.aadhaarPhotoBack),
        attachmentLink("mapped-volunteers", v.id, "voterCardPhoto", v.voterCardPhoto),
        attachmentLink("mapped-volunteers", v.id, "voterCardPhotoBack", v.voterCardPhotoBack),
        v.selectedVillageName ?? "",
        v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "",
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV([headerRow, ...dataRows].join("\n"), "mapped-volunteers.csv");
    } catch {
      toast({ title: "Failed to export volunteers", variant: "destructive" });
    }
  };

  const handleExportSupporters = async () => {
    try {
      const all = await fetchAllPaginated<SupporterWithName>("/api/supporters");
      if (!all.length) return;
    const headerRow = ["Name", "Mobile", "Added By", "OCR Name", "OCR Aadhaar", "OCR Voter ID", "OCR DOB", "OCR Gender", "OCR Address", "Aadhaar Photo Front", "Aadhaar Photo Back", "Voter Card Front", "Voter Card Back", "Village/Unit", "Created Date"]
      .map(escapeCSVField)
      .join(",");
    const dataRows = all.map((s) => {
      const fields = [
        s.name,
        s.mobileNumber,
        s.addedByName ?? s.addedByUserId ?? "",
        s.ocrName ?? "",
        s.ocrAadhaarNumber ?? "",
        s.ocrVoterId ?? "",
        s.ocrDob ?? "",
        s.ocrGender ?? "",
        s.ocrAddress ?? "",
        attachmentLink("supporters", s.id, "aadhaarPhoto", s.aadhaarPhoto),
        attachmentLink("supporters", s.id, "aadhaarPhotoBack", s.aadhaarPhotoBack),
        attachmentLink("supporters", s.id, "voterCardPhoto", s.voterCardPhoto),
        attachmentLink("supporters", s.id, "voterCardPhotoBack", s.voterCardPhotoBack),
        s.selectedVillageName ?? "",
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "",
      ];
      return fields.map(escapeCSVField).join(",");
    });
    downloadCSV([headerRow, ...dataRows].join("\n"), "supporters.csv");
    } catch {
      toast({ title: "Failed to export supporters", variant: "destructive" });
    }
  };

  const hasUserDocs = (user: { aadhaarPhoto: string | null; aadhaarPhotoBack: string | null; voterCardPhoto: string | null; voterCardPhotoBack: string | null; selfPhoto?: string | null }) => {
    return !!(user.aadhaarPhoto || user.aadhaarPhotoBack || user.voterCardPhoto || user.voterCardPhotoBack || user.selfPhoto);
  };

  const openDocViewer = (name: string, apiUrl: string) => {
    setDocViewer({ open: true, name, apiUrl });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-data-export-title">
          <Database className="h-6 w-6 text-primary" />
          Data Export
        </h1>
        <p className="text-muted-foreground">View and export all field data including OCR-extracted details</p>
      </div>

      <Tabs defaultValue="app-users">
        <TabsList data-testid="tabs-list-export">
          <TabsTrigger value="app-users" data-testid="tab-app-users">App Users</TabsTrigger>
          <TabsTrigger value="mapped-volunteers" data-testid="tab-mapped-volunteers">Mapped Volunteers</TabsTrigger>
          <TabsTrigger value="supporters" data-testid="tab-supporters">Supporters</TabsTrigger>
          <TabsTrigger value="submissions" data-testid="tab-submissions">Task Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="app-users" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>App Users (Volunteers & Party Post Holders)</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedUsers.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBatchDeleteConfirm({ open: true, type: "user", count: selectedUsers.size })}
                      data-testid="button-batch-delete-users"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete {selectedUsers.size} Selected
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleExportUsers}
                    disabled={!appUsersTotal}
                    data-testid="button-export-users"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !appUsersTotal ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p data-testid="text-no-users">No app users found</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={appUsers.length > 0 && selectedUsers.size === appUsers.length}
                            onCheckedChange={() => toggleSelectAll(appUsers.map(u => u.id), selectedUsers, setSelectedUsers)}
                            data-testid="checkbox-select-all-users"
                          />
                        </TableHead>
                        <TableHead>Docs</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Halka (AC)</TableHead>
                        <TableHead>Block</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Wing</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>OCR Name</TableHead>
                        <TableHead>OCR Aadhaar</TableHead>
                        <TableHead>OCR Voter ID</TableHead>
                        <TableHead>OCR DOB</TableHead>
                        <TableHead>OCR Gender</TableHead>
                        <TableHead>OCR Address</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`} className={user.isActive === false ? "opacity-60" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={() => toggleSelection(selectedUsers, setSelectedUsers, user.id)}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            {hasUserDocs(user) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocViewer(user.name, `/api/export/app-users/${user.id}/documents`)}
                                data-testid={`button-view-docs-user-${user.id}`}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.mobileNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.mappedZone ?? "-"}</TableCell>
                          <TableCell>{user.mappedDistrict ?? "-"}</TableCell>
                          <TableCell>{user.mappedHalka ?? "-"}</TableCell>
                          <TableCell>{user.mappedBlockNumber ?? "-"}</TableCell>
                          <TableCell>{user.mappedAreaName ?? "-"}</TableCell>
                          <TableCell>{user.wing ?? "-"}</TableCell>
                          <TableCell>{user.currentPosition ?? "-"}</TableCell>
                          <TableCell>{user.level ?? "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={user.isActive !== false ? "default" : "destructive"}
                              className="cursor-pointer"
                              onClick={() => blockMutation.mutate(user.id)}
                              data-testid={`badge-status-${user.id}`}
                            >
                              {user.isActive !== false ? "Active" : "Blocked"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-actions-${user.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditUser({
                                    open: true,
                                    id: user.id,
                                    name: user.name,
                                    role: user.role,
                                    wing: user.wing ?? "",
                                    currentPosition: user.currentPosition ?? "",
                                    level: user.level ?? "",
                                  })}
                                  data-testid={`action-edit-${user.id}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => blockMutation.mutate(user.id)}
                                  data-testid={`action-block-${user.id}`}
                                >
                                  {user.isActive !== false ? (
                                    <><Ban className="h-4 w-4 mr-2" />Block</>
                                  ) : (
                                    <><ShieldCheck className="h-4 w-4 mr-2" />Unblock</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => setDeleteConfirm({ open: true, id: user.id, name: user.name, type: "user" })}
                                  data-testid={`action-delete-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>{user.ocrName ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{user.ocrAadhaarNumber ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{user.ocrVoterId ?? "-"}</TableCell>
                          <TableCell>{user.ocrDob ?? "-"}</TableCell>
                          <TableCell>{user.ocrGender ?? "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={user.ocrAddress ?? ""}>{user.ocrAddress ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ListPagination
                pageIndex={usersPageIndex}
                pageSize={EXPORT_PAGE_SIZE}
                total={appUsersTotal}
                onPageChange={setUsersPageIndex}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapped-volunteers" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Mapped Volunteers</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedVolunteers.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setBatchDeleteConfirm({ open: true, type: "volunteer", count: selectedVolunteers.size })}
                        data-testid="button-batch-delete-volunteers"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete {selectedVolunteers.size} Selected
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => boothSummary && downloadBoothSummaryPdf(boothSummary)}
                      disabled={!boothSummary}
                      data-testid="button-download-booth-summary-pdf"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => matchBoothsMutation.mutate()}
                      disabled={matchBoothsMutation.isPending}
                      data-testid="button-match-booths"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${matchBoothsMutation.isPending ? "animate-spin" : ""}`} />
                      Match Booth IDs
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportVolunteers}
                      disabled={!mappedVolunteersTotal}
                      data-testid="button-export-volunteers"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
                {mappedVolunteersTotal > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">Total volunteers</p>
                      <p className="text-sm text-slate-900">{boothSummary?.totalVolunteers?.toLocaleString() ?? mappedVolunteersTotal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">Booth matched</p>
                      <p className="text-sm text-green-700">{boothSummary?.matchedWithBooth?.toLocaleString() ?? "-"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">Missing Voter ID</p>
                      <p className="text-sm text-amber-700">{boothSummary?.missingVoterId?.toLocaleString() ?? "-"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">Missing OCR Voter ID</p>
                      <p className="text-sm text-amber-700">{boothSummary?.missingOcrVoterId?.toLocaleString() ?? "-"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">Both IDs missing</p>
                      <p className="text-sm text-red-700">{boothSummary?.missingBothIds?.toLocaleString() ?? "-"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">No booth match</p>
                      <p className="text-sm text-red-700">{boothSummary?.unmatchedNoBooth?.toLocaleString() ?? "-"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">Distinct booths</p>
                      <p className="text-sm text-slate-900">{boothSummary?.boothCounts?.length?.toLocaleString() ?? "-"}</p>
                    </div>
                  </div>
                )}
                {boothSummary && boothSummary.boothCounts.length > 0 && (
                  <div className="rounded-md border p-3 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Volunteers per booth (top 15)</p>
                    <div className="flex flex-wrap gap-2">
                      {boothSummary.boothCounts.slice(0, 15).map((b) => (
                        <Badge key={b.boothId} variant="secondary" className="font-mono text-xs">
                          Booth {b.boothId}: {b.volunteerCount}
                        </Badge>
                      ))}
                      {boothSummary.boothCounts.length > 15 && (
                        <span className="text-xs text-muted-foreground self-center">+{boothSummary.boothCounts.length - 15} more booths</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {volunteersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !mappedVolunteersTotal ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p data-testid="text-no-volunteers">No mapped volunteers found</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={mappedVolunteers.length > 0 && selectedVolunteers.size === mappedVolunteers.length}
                            onCheckedChange={() => toggleSelectAll(mappedVolunteers.map(v => v.id), selectedVolunteers, setSelectedVolunteers)}
                            data-testid="checkbox-select-all-volunteers"
                          />
                        </TableHead>
                        <TableHead>Docs</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Voter ID</TableHead>
                        <TableHead>Booth ID</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Added By</TableHead>
                        <TableHead>OCR Name</TableHead>
                        <TableHead>OCR Aadhaar</TableHead>
                        <TableHead>OCR Voter ID</TableHead>
                        <TableHead>OCR DOB</TableHead>
                        <TableHead>OCR Gender</TableHead>
                        <TableHead>OCR Address</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappedVolunteers.map((vol) => (
                        <TableRow key={vol.id} data-testid={`row-volunteer-${vol.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedVolunteers.has(vol.id)}
                              onCheckedChange={() => toggleSelection(selectedVolunteers, setSelectedVolunteers, vol.id)}
                              data-testid={`checkbox-vol-${vol.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            {(vol.aadhaarPhoto || vol.aadhaarPhotoBack || vol.voterCardPhoto || vol.voterCardPhotoBack) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocViewer(vol.name, `/api/export/mapped-volunteers/${vol.id}/documents`)}
                                data-testid={`button-view-docs-vol-${vol.id}`}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{vol.name}</TableCell>
                          <TableCell>{vol.mobileNumber}</TableCell>
                          <TableCell>
                            <Badge variant={vol.category === "Active" ? "default" : vol.category === "VIP" ? "secondary" : "outline"}>
                              {vol.category ?? "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{vol.voterId ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{vol.voterMappingBoothId ?? "-"}</TableCell>
                          <TableCell>{vol.isVerified ? "Yes" : "No"}</TableCell>
                          <TableCell>{(vol as MappedVolunteerWithName).addedByName ?? "-"}</TableCell>
                          <TableCell>{vol.ocrName ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{vol.ocrAadhaarNumber ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{vol.ocrVoterId ?? "-"}</TableCell>
                          <TableCell>{vol.ocrDob ?? "-"}</TableCell>
                          <TableCell>{vol.ocrGender ?? "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={vol.ocrAddress ?? ""}>{vol.ocrAddress ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {vol.createdAt ? new Date(vol.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm({ open: true, id: vol.id, name: vol.name, type: "volunteer" })}
                              data-testid={`button-delete-vol-${vol.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ListPagination
                pageIndex={volunteersPageIndex}
                pageSize={EXPORT_PAGE_SIZE}
                total={mappedVolunteersTotal}
                onPageChange={setVolunteersPageIndex}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supporters" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Supporters</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedSupporters.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setBatchDeleteConfirm({ open: true, type: "supporter", count: selectedSupporters.size })}
                        data-testid="button-batch-delete-supporters"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete {selectedSupporters.size} Selected
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleExportSupporters}
                      disabled={!supportersTotal}
                      data-testid="button-export-supporters"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
                {supportersTotal > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold text-slate-700 text-xs">Total supporters</p>
                      <p className="text-sm text-slate-900">{supportersTotal.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {supportersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !supportersTotal ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p data-testid="text-no-supporters">No supporters found</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={supportersList.length > 0 && selectedSupporters.size === supportersList.length}
                            onCheckedChange={() => toggleSelectAll(supportersList.map(s => s.id), selectedSupporters, setSelectedSupporters)}
                            data-testid="checkbox-select-all-supporters"
                          />
                        </TableHead>
                        <TableHead>Docs</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Added By</TableHead>
                        <TableHead>OCR Name</TableHead>
                        <TableHead>OCR Aadhaar</TableHead>
                        <TableHead>OCR Voter ID</TableHead>
                        <TableHead>OCR DOB</TableHead>
                        <TableHead>OCR Gender</TableHead>
                        <TableHead>OCR Address</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supportersList.map((sup) => (
                        <TableRow key={sup.id} data-testid={`row-supporter-${sup.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSupporters.has(sup.id)}
                              onCheckedChange={() => toggleSelection(selectedSupporters, setSelectedSupporters, sup.id)}
                              data-testid={`checkbox-sup-${sup.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            {(sup.aadhaarPhoto || sup.aadhaarPhotoBack || sup.voterCardPhoto || sup.voterCardPhotoBack) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocViewer(sup.name, `/api/export/supporters/${sup.id}/documents`)}
                                data-testid={`button-view-docs-sup-${sup.id}`}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{sup.name}</TableCell>
                          <TableCell>{sup.mobileNumber}</TableCell>
                          <TableCell>{(sup as SupporterWithName).addedByName ?? "-"}</TableCell>
                          <TableCell>{sup.ocrName ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{sup.ocrAadhaarNumber ?? "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{sup.ocrVoterId ?? "-"}</TableCell>
                          <TableCell>{sup.ocrDob ?? "-"}</TableCell>
                          <TableCell>{sup.ocrGender ?? "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={sup.ocrAddress ?? ""}>{sup.ocrAddress ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {sup.createdAt ? new Date(sup.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm({ open: true, id: sup.id, name: sup.name, type: "supporter" })}
                              data-testid={`button-delete-sup-${sup.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ListPagination
                pageIndex={supportersPageIndex}
                pageSize={EXPORT_PAGE_SIZE}
                total={supportersTotal}
                onPageChange={setSupportersPageIndex}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Task Submissions</CardTitle>
                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={selectedTaskConfigId} onValueChange={setSelectedTaskConfigId}>
                    <SelectTrigger className="w-[200px]" data-testid="select-trigger-task-config">
                      <SelectValue placeholder="All tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="select-item-all-tasks">All Tasks</SelectItem>
                      {taskConfigs?.map((tc) => (
                        <SelectItem key={tc.id} value={tc.id} data-testid={`select-item-task-${tc.id}`}>
                          {tc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleExportSubmissions}
                    disabled={!parsedSubmissions?.length}
                    data-testid="button-export-submissions"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {configsLoading || submissionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !parsedSubmissions?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p data-testid="text-no-submissions">No submissions found</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedSubmissions.map((s) => (
                        <TableRow key={s.id} data-testid={`row-submission-${s.id}`}>
                          <TableCell className="font-mono text-sm" data-testid={`text-submission-id-${s.id}`}>
                            {truncateId(s.id)}
                          </TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-submission-user-${s.id}`}>
                            {truncateId(s.appUserId)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(s.parsed).map(([key, val]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key}: {String(val)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentViewerDialog
        open={docViewer.open}
        onOpenChange={(open) => setDocViewer((prev) => ({ ...prev, open }))}
        personName={docViewer.name}
        apiUrl={docViewer.apiUrl}
      />

      <Dialog open={editUser.open} onOpenChange={(open) => !open && setEditUser(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-user-title">Edit User</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                value={editUser.name}
                onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role</label>
              <Select value={editUser.role} onValueChange={(v) => setEditUser(prev => ({ ...prev, role: v }))}>
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="party_post_holder">Post Holder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Wing</label>
              <Input
                value={editUser.wing}
                onChange={(e) => setEditUser(prev => ({ ...prev, wing: e.target.value }))}
                data-testid="input-edit-wing"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Position</label>
              <Input
                value={editUser.currentPosition}
                onChange={(e) => setEditUser(prev => ({ ...prev, currentPosition: e.target.value }))}
                data-testid="input-edit-position"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Level</label>
              <Input
                value={editUser.level}
                onChange={(e) => setEditUser(prev => ({ ...prev, level: e.target.value }))}
                data-testid="input-edit-level"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(prev => ({ ...prev, open: false }))} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate({
                id: editUser.id,
                updates: {
                  name: editUser.name,
                  role: editUser.role,
                  wing: editUser.wing || undefined,
                  currentPosition: editUser.currentPosition || undefined,
                  level: editUser.level || undefined,
                } as any,
              })}
              disabled={editMutation.isPending}
              data-testid="button-save-edit"
            >
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle data-testid="text-delete-confirm-title">Delete {deleteConfirm.type === "user" ? "User" : deleteConfirm.type === "volunteer" ? "Mapped Volunteer" : "Supporter"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(prev => ({ ...prev, open: false }))} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: deleteConfirm.id, type: deleteConfirm.type })}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDeleteConfirm.open} onOpenChange={(open) => !open && setBatchDeleteConfirm(prev => ({ ...prev, open: false }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle data-testid="text-batch-delete-title">Delete {batchDeleteConfirm.count} {batchDeleteConfirm.type === "user" ? "User" : batchDeleteConfirm.type === "volunteer" ? "Mapped Volunteer" : "Supporter"}{batchDeleteConfirm.count > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{batchDeleteConfirm.count}</strong> selected record{batchDeleteConfirm.count > 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDeleteConfirm(prev => ({ ...prev, open: false }))} data-testid="button-cancel-batch-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const selMap = {
                  user: selectedUsers,
                  volunteer: selectedVolunteers,
                  supporter: selectedSupporters,
                };
                batchDeleteMutation.mutate({ ids: Array.from(selMap[batchDeleteConfirm.type]), type: batchDeleteConfirm.type });
              }}
              disabled={batchDeleteMutation.isPending}
              data-testid="button-confirm-batch-delete"
            >
              {batchDeleteMutation.isPending ? "Deleting..." : `Delete ${batchDeleteConfirm.count}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
