import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Vote, Search, Eye, ChevronLeft, ChevronRight, Trash2, Loader2, User, MapPin, FileText, CheckCircle, XCircle, Download, Upload as UploadIcon, Clock } from "lucide-react";
import type { VoterRegistrationSubmission } from "@shared/schema";

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status?: string | null }) {
  const s = status || "pending";
  if (s === "approved") {
    return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</span>;
  }
  if (s === "rejected") {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</span>;
}

function ImageViewer({ src, label }: { src: string | null | undefined; label: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-blue-600 underline cursor-pointer">
        View {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
          <img src={src} alt={label} className="w-full rounded-md" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SubmissionDetail({
  submission,
  onBack,
  onEdit,
  onDelete,
}: {
  submission: VoterRegistrationSubmission;
  onBack: () => void;
  onEdit: (sub: VoterRegistrationSubmission) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [reviewStatus, setReviewStatus] = useState<string>((submission as any).status || "pending");
  const [reviewNote, setReviewNote] = useState(submission.reviewNote || "");
  const [cardPdfLocal, setCardPdfLocal] = useState<string | null>(null);
  const [cardFileName, setCardFileName] = useState<string | null>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );

  let ageOcr: Record<string, string> = {};
  let addressOcr: Record<string, string> = {};
  let addressProofFront: string | null = null;
  let addressProofBack: string | null = null;
  let addressProofSingle: string | null = submission.addressProofImage || null;
  try {
    if (submission.ageProofOcrData) ageOcr = JSON.parse(submission.ageProofOcrData);
    if (submission.addressProofOcrData) addressOcr = JSON.parse(submission.addressProofOcrData);
    if (submission.addressProofImage && submission.addressProofImage.trim().startsWith("{")) {
      const parsed = JSON.parse(submission.addressProofImage);
      addressProofFront = parsed.front || null;
      addressProofBack = parsed.back || null;
      addressProofSingle = null;
    }
  } catch {}

  const reviewMutation = useMutation({
    mutationFn: async (data: { status: string; reviewNote: string }) => {
      const res = await apiRequest("PATCH", `/api/voter-registration/submissions/${submission.id}/review`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/voter-registration/submissions"] });
    },
    onError: () => {
      toast({ title: "Failed to save review", variant: "destructive" });
    },
  });

  const cardMutation = useMutation({
    mutationFn: async (data: { cardPdf: string }) => {
      const res = await apiRequest("PATCH", `/api/voter-registration/submissions/${submission.id}/card`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Card uploaded" });
      queryClient.invalidateQueries({ queryKey: ["/api/voter-registration/submissions"] });
      setCardPdfLocal(null);
      setCardFileName(null);
    },
    onError: () => {
      toast({ title: "Failed to upload card", variant: "destructive" });
    },
  });

  const handleCardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setCardPdfLocal(result);
        setCardFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {(() => {
              const sn = (submission as any).serialNumber as number | null | undefined;
              const code = sn ? `B${String(sn).padStart(3, "0")}` : "";
              return code ? <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{code}</span> : null;
            })()}
            <span>{submission.firstName} {submission.lastName}</span>
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>{submission.district || "—"}</span>
            <StatusBadge status={(submission as any).status} />
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(submission)}>Edit</Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(submission.id)}>Delete</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <Section title="Personal Details" icon={User}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" value={submission.firstName} />
                <Field label="Last Name" value={submission.lastName} />
                <Field label="Gender" value={submission.gender} />
                <Field label="Date of Birth" value={submission.dateOfBirth} />
                <Field label="Place of Birth" value={submission.placeOfBirth} />
                <Field label="Relative Name" value={submission.relativeName} />
                <Field label="Relation Type" value={submission.relationType} />
              </div>
            </Section>

            <Section title="Address" icon={MapPin}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="House No." value={submission.houseNumber} />
                <Field label="Street / Mohalla / Village" value={submission.streetMohallaVillage} />
                <Field label="Post Office" value={submission.postOffice} />
                <Field label="District" value={submission.district} />
                <Field label="State" value={submission.state} />
                <Field label="Pin Code" value={submission.pinCode} />
              </div>
            </Section>

            <Section title="Contact & Aadhaar" icon={User}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Aadhaar" value={submission.aadhaarNumber} />
                <Field label="Mobile" value={submission.mobileNumber} />
                <Field label="Email" value={submission.email} />
                <Field label="Mobile Verified" value={submission.mobileVerified ? "Yes" : "No"} />
                <Field label="Email Verified" value={submission.emailVerified ? "Yes" : "No"} />
                <Field label="Disability" value={submission.disability} />
              </div>
            </Section>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <Section title="Documents" icon={FileText}>
              <div className="space-y-2">
                <Field label="Age Proof Type" value={submission.ageProofType} />
                <ImageViewer src={submission.ageProofImage} label="Age Proof" />
                <Field label="Address Proof Type" value={submission.addressProofType} />
                {addressProofFront || addressProofBack ? (
                  <div className="grid grid-cols-2 gap-2">
                    <ImageViewer src={addressProofFront} label="Address Proof Front" />
                    <ImageViewer src={addressProofBack} label="Address Proof Back" />
                  </div>
                ) : (
                  <ImageViewer src={addressProofSingle} label="Address Proof" />
                )}
                <ImageViewer src={submission.photograph} label="Photograph" />
              </div>
            </Section>

            <Section title="OCR – Age Proof" icon={FileText}>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(ageOcr).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <p className="font-medium break-all">{String(v)}</p>
                  </div>
                ))}
                {Object.keys(ageOcr).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </Section>

            <Section title="OCR – Address Proof" icon={FileText}>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(addressOcr).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-xs text-muted-foreground">{k}</span>
                    <p className="font-medium break-all">{String(v)}</p>
                  </div>
                ))}
                {Object.keys(addressOcr).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </Section>

            <Section title="Review & Status" icon={FileText}>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Current status: <StatusBadge status={(submission as any).status} />
                </p>
                <textarea
                  className="w-full rounded-md border px-2 py-1 text-sm"
                  rows={3}
                  placeholder="Review note..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      setReviewStatus("approved");
                      reviewMutation.mutate({ status: "approved", reviewNote });
                    }}
                  >
                    {reviewMutation.isPending && reviewStatus === "approved" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      setReviewStatus("rejected");
                      reviewMutation.mutate({ status: "rejected", reviewNote });
                    }}
                  >
                    {reviewMutation.isPending && reviewStatus === "rejected" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            </Section>

            <Section title="Voter Card PDF" icon={FileText}>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Upload final voter card PDF after approval. User will be able to download it from their app.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={cardInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleCardFileChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cardInputRef.current?.click()}
                  >
                    <UploadIcon className="h-4 w-4 mr-1" />
                    Choose PDF
                  </Button>
                  {cardFileName && (
                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {cardFileName}
                    </span>
                  )}
                  <Button
                    size="sm"
                    className="bg-blue-600 text-white"
                    disabled={!cardPdfLocal || cardMutation.isPending}
                    onClick={() => cardPdfLocal && cardMutation.mutate({ cardPdf: cardPdfLocal })}
                  >
                    {cardMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UploadIcon className="h-4 w-4 mr-1" />}
                    Upload Card
                  </Button>
                  {submission.cardPdf && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/voter-registration/submissions/${submission.id}/card`, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download current card
                    </Button>
                  )}
                </div>
              </div>
            </Section>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Submitted: {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "—"}
      </p>
    </div>
  );
}

export default function VoterRegistrationSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VoterRegistrationSubmission | null>(null);
  const { toast } = useToast();

  const { data: submissions, isLoading } = useQuery<VoterRegistrationSubmission[]>({
    queryKey: ["/api/voter-registration/submissions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/voter-registration/submissions/${id}`),
    onSuccess: () => {
      toast({ title: "Submission deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/voter-registration/submissions"] });
      setDeleteId(null);
      setSelectedId(null);
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VoterRegistrationSubmission> }) => {
      const res = await apiRequest("PATCH", `/api/voter-registration/submissions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/voter-registration/submissions"] });
      setEditing(null);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const filtered = (submissions || []).filter((s) => {
    const q = search.toLowerCase();
    const sn = (s as any).serialNumber as number | null | undefined;
    const code = sn ? `B${String(sn).padStart(3, "0")}`.toLowerCase() : "";
    return !q ||
      (s.firstName + " " + s.lastName).toLowerCase().includes(q) ||
      (s.mobileNumber || "").includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.district || "").toLowerCase().includes(q) ||
      code.includes(q);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selected = selectedId ? submissions?.find((s) => s.id === selectedId) : null;

  if (selected) {
    return (
      <div className="space-y-4">
        <SubmissionDetail
          submission={selected}
          onBack={() => setSelectedId(null)}
          onEdit={(sub) => setEditing(sub)}
          onDelete={(id) => setDeleteId(id)}
        />
        <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete submission?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Vote className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Voter Registration</h1>
          <p className="text-sm text-muted-foreground">View, edit, delete voter registration submissions</p>
        </div>
      </div>

      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, mobile, email, constituency..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : paged.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Vote className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No submissions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {(() => {
                        const sn = (sub as any).serialNumber as number | null | undefined;
                        return sn ? `B${String(sn).padStart(3, "0")}` : "—";
                      })()}
                    </TableCell>
                    <TableCell className="font-medium">{sub.firstName} {sub.lastName}</TableCell>
                    <TableCell className="text-sm">{sub.district || "—"}</TableCell>
                    <TableCell className="text-sm">{sub.mobileNumber || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedId(sub.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(sub.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!deleteId && !selected} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete submission?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <EditDialog
          submission={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateMutation.mutate({ id: editing.id, data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditDialog({
  submission,
  onClose,
  onSave,
  isPending,
}: {
  submission: VoterRegistrationSubmission;
  onClose: () => void;
  onSave: (data: Partial<VoterRegistrationSubmission>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    firstName: submission.firstName,
    lastName: submission.lastName,
    gender: submission.gender,
    dateOfBirth: submission.dateOfBirth,
    placeOfBirth: submission.placeOfBirth || "",
    relativeName: submission.relativeName,
    relationType: submission.relationType,
    houseNumber: submission.houseNumber || "",
    streetMohallaVillage: submission.streetMohallaVillage || "",
    postOffice: submission.postOffice || "",
    district: submission.district || "",
    pinCode: submission.pinCode || "",
    aadhaarNumber: submission.aadhaarNumber || "",
    mobileNumber: submission.mobileNumber || "",
    email: submission.email || "",
    disability: submission.disability || "None",
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit submission</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(["firstName", "lastName", "gender", "dateOfBirth", "placeOfBirth", "relativeName", "relationType"] as const).map((key) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground block mb-1">{key.replace(/([A-Z])/g, " $1").trim()}</label>
              <Input
                value={form[key] as string}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
          {(["houseNumber", "streetMohallaVillage", "postOffice", "district", "pinCode", "aadhaarNumber", "mobileNumber", "email", "disability"] as const).map((key) => (
            <div key={key} className={key === "streetMohallaVillage" ? "col-span-2" : ""}>
              <label className="text-xs text-muted-foreground block mb-1">{key.replace(/([A-Z])/g, " $1").trim()}</label>
              <Input
                value={form[key] as string}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
