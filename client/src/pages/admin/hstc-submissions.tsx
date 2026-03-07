import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Home, Search, Eye, CheckCircle, XCircle, Clock, ArrowLeft, ChevronLeft, ChevronRight, IndianRupee, User, Phone, MapPin, FileText, Camera, Package, Users, Upload, CreditCard, Image, X, Loader2, Trash2, Download } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import type { HstcSubmission } from "@shared/schema";

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-800 no-default-hover-elevate no-default-active-elevate"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-800 no-default-hover-elevate no-default-active-elevate"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-800 no-default-hover-elevate no-default-active-elevate"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
}

function ImageViewer({ src, label }: { src: string | null | undefined; label: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return <span className="text-xs text-muted-foreground">Not uploaded</span>;
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 underline cursor-pointer" data-testid={`view-${label.toLowerCase().replace(/\s/g, "-")}`}>
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

function PaymentProofUpload({ submission }: { submission: HstcSubmission }) {
  const { toast } = useToast();
  const [paymentImages, setPaymentImages] = useState<string[]>(
    (submission.paymentProofImages || []).filter((img): img is string => !!img)
  );
  const [paymentAmount, setPaymentAmount] = useState(submission.paymentAmount?.toString() || "");
  const [paymentMode, setPaymentMode] = useState(submission.paymentMode || "");
  const [paymentNote, setPaymentNote] = useState(submission.paymentNote || "");
  const paymentUpRef = useRef<HTMLInputElement>(null);

  const alreadyUploaded = submission.paymentProofImages && submission.paymentProofImages.length > 0;

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/hstc/submissions/${submission.id}/payment`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payment proof saved", description: "User will be notified" });
      queryClient.invalidateQueries({ queryKey: ["/api/hstc/submissions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save payment proof", variant: "destructive" });
    },
  });

  const handleImageUpload = async () => {
    const files = paymentUpRef.current?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const base64 = await compressImage(file);
        setPaymentImages(prev => [...prev, base64]);
      } catch {}
    }
    if (paymentUpRef.current) paymentUpRef.current.value = "";
  };

  const handleSubmitPayment = () => {
    if (paymentImages.length === 0) {
      toast({ title: "Please add payment proof image", variant: "destructive" });
      return;
    }
    paymentMutation.mutate({
      paymentProofImages: paymentImages,
      paymentAmount: paymentAmount || "0",
      paymentMode,
      paymentNote,
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <IndianRupee className="h-4 w-4" />
          {alreadyUploaded ? "Payment Proof (Uploaded)" : "Upload Payment Proof"}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-muted-foreground">Amount (₹)</span>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
              data-testid="input-payment-amount"
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Payment Mode</span>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger data-testid="select-payment-mode">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Textarea
          placeholder="Payment note (optional)..."
          value={paymentNote}
          onChange={(e) => setPaymentNote(e.target.value)}
          className="text-sm"
          data-testid="input-payment-note"
        />

        <input type="file" accept="image/*" multiple ref={paymentUpRef} className="hidden" onChange={handleImageUpload} />
        <Button variant="outline" size="sm" onClick={() => paymentUpRef.current?.click()} data-testid="button-upload-payment">
          <Upload className="h-4 w-4 mr-1" /> Upload Cheque / Transfer Screenshot
        </Button>

        {paymentImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {paymentImages.map((img, idx) => (
              <div key={idx} className="relative">
                <img src={img} alt={`Payment ${idx + 1}`} className="w-full h-20 object-cover rounded-md" />
                <button
                  className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  onClick={() => setPaymentImages(prev => prev.filter((_, i) => i !== idx))}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          className="w-full bg-green-600"
          onClick={handleSubmitPayment}
          disabled={paymentMutation.isPending}
          data-testid="button-submit-payment"
        >
          {paymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <IndianRupee className="h-4 w-4 mr-1" />}
          {alreadyUploaded ? "Update Payment Proof" : "Save & Notify User"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SubmissionDetail({ submission, onBack }: { submission: HstcSubmission; onBack: () => void }) {
  const { toast } = useToast();
  const [reviewNote, setReviewNote] = useState(submission.reviewNote || "");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | null>(null);

  const reviewMutation = useMutation({
    mutationFn: async (data: { status: string; reviewNote: string }) => {
      const res = await apiRequest("PATCH", `/api/hstc/submissions/${submission.id}/review`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review saved", description: `Submission ${reviewAction}` });
      queryClient.invalidateQueries({ queryKey: ["/api/hstc/submissions"] });
      onBack();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save review", variant: "destructive" });
    },
  });

  const toggleEditMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/hstc/submissions/${submission.id}/toggle-edit`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: data.editAllowed ? "Edit access granted" : "Edit access revoked" });
      queryClient.invalidateQueries({ queryKey: ["/api/hstc/submissions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to toggle edit access", variant: "destructive" });
    },
  });

  const handleReview = (action: "approved" | "rejected") => {
    setReviewAction(action);
    reviewMutation.mutate({ status: action, reviewNote });
  };

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{submission.houseOwnerName}</h2>
          <p className="text-sm text-muted-foreground">{submission.villageName || "Unknown village"}</p>
        </div>
        <div className="flex items-center gap-2">
          {submission.editAllowed && <Badge className="bg-blue-100 text-blue-800 no-default-hover-elevate no-default-active-elevate">Edit Open</Badge>}
          <StatusBadge status={submission.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <Section title="Basic Information" icon={User}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="House Owner Name" value={submission.houseOwnerName} />
                <Field label="Father/Husband Name" value={submission.fatherHusbandName} />
                <Field label="Mobile Number" value={submission.mobileNumber} />
                <Field label="Village" value={submission.villageName} />
              </div>
            </Section>

            <Section title="Cost Details" icon={IndianRupee}>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Material Cost" value={`₹${(submission.repairMaterialCost || 0).toLocaleString()}`} />
                <Field label="Labour Cost" value={`₹${(submission.estimatedLabourCost || 0).toLocaleString()}`} />
                <Field label="Total Cost" value={`₹${(submission.totalCost || 0).toLocaleString()}`} />
              </div>
            </Section>

            <Section title="Material Details" icon={Package}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Number of People" value={submission.numberOfPeople} />
                <Field label="Room Size" value={submission.roomSize ? `${submission.roomSize} ${submission.roomSizeUnit || ""}`.trim() : ""} />
                <Field label="Bricks Qty" value={submission.bricksQty} />
                <Field label="Sand (Sq Ft)" value={submission.sandSqFt} />
                <Field label="Gravel (Ton/Kg)" value={submission.gravelTonKg} />
                <Field label="Cement (Kg/Qty)" value={submission.cementKgQty} />
                <Field label="Saria (Kt/Kg)" value={submission.sariaKtKg} />
              </div>
            </Section>

            <Section title="Volunteer Details" icon={Users}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nodal Volunteer" value={submission.nodalVolunteerName} />
                <Field label="Nodal Mobile" value={submission.nodalVolunteerMobile} />
                <Field label="Super Volunteer" value={submission.superVolunteerName} />
                <Field label="Super Mobile" value={submission.superVolunteerMobile} />
              </div>
            </Section>

            <Section title="Bank Details" icon={CreditCard}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Holder" value={submission.bankAccountName} />
                <Field label="Account Number" value={submission.bankAccountNumber} />
                <Field label="Bank Name" value={submission.bankName} />
                <Field label="Branch Name" value={submission.bankBranchName} />
                <Field label="IFSC Code" value={submission.bankIfscCode} />
              </div>
              <ImageViewer src={submission.passbookOrChequeImage} label="Passbook / Cheque" />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Field label="Loan Consent" value={submission.loanConsent ? "Yes - No active loan declared" : "Not declared"} />
                <Field label="Mobile Verified" value={submission.mobileVerified ? "✓ Verified via OTP" : "Not verified"} />
              </div>
            </Section>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <Section title="Documents" icon={FileText}>
                <div className="grid grid-cols-2 gap-2">
                  <ImageViewer src={submission.aadhaarFront} label="Aadhaar Front" />
                  <ImageViewer src={submission.aadhaarBack} label="Aadhaar Back" />
                  <ImageViewer src={submission.voterIdFront} label="Voter ID Front" />
                  <ImageViewer src={submission.voterIdBack} label="Voter ID Back" />
                  <ImageViewer src={submission.applicationPhoto} label="Application Photo" />
                </div>
              </Section>

              {submission.houseImages && submission.houseImages.length > 0 && (
                <Section title="House Images" icon={Camera}>
                  <div className="grid grid-cols-3 gap-2">
                    {submission.houseImages.map((img, i) => (
                      <ImageViewer key={i} src={img} label={`House Image ${i + 1}`} />
                    ))}
                  </div>
                </Section>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <Section title="OCR Extracted Data" icon={FileText}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Aadhaar Name" value={submission.ocrAadhaarName} />
                  <Field label="Aadhaar Number" value={submission.ocrAadhaarNumber} />
                  <Field label="DOB" value={submission.ocrAadhaarDob} />
                  <Field label="Gender" value={submission.ocrAadhaarGender} />
                  <Field label="Address" value={submission.ocrAadhaarAddress} />
                  <Field label="Voter ID" value={submission.ocrVoterId} />
                  <Field label="Voter Name" value={submission.ocrVoterName} />
                </div>
              </Section>
            </CardContent>
          </Card>

          {submission.status === "pending" && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Review Action</h3>
                <Textarea
                  placeholder="Add a review note (optional)..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="text-sm"
                  data-testid="input-review-note"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600"
                    onClick={() => handleReview("approved")}
                    disabled={reviewMutation.isPending}
                    data-testid="button-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReview("rejected")}
                    disabled={reviewMutation.isPending}
                    data-testid="button-reject"
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {submission.status !== "pending" && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Review Info</h3>
                <Field label="Status" value={submission.status} />
                <Field label="Reviewed By" value={submission.reviewedBy} />
                <Field label="Review Note" value={submission.reviewNote} />
                <Field label="Reviewed At" value={submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleString() : undefined} />
              </CardContent>
            </Card>
          )}

          {submission.completedHouseImages && submission.completedHouseImages.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Section title="Completed House Photos" icon={Image}>
                  <div className="grid grid-cols-3 gap-2">
                    {submission.completedHouseImages.map((img, i) => (
                      <ImageViewer key={i} src={img} label={`Completed House ${i + 1}`} />
                    ))}
                  </div>
                  {submission.completionNotes && (
                    <p className="text-sm text-muted-foreground mt-2">{submission.completionNotes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Completed: {submission.completedAt ? new Date(submission.completedAt).toLocaleString() : "—"}
                  </p>
                </Section>
              </CardContent>
            </Card>
          )}

          {submission.status === "approved" && (
            <PaymentProofUpload submission={submission} />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          Submitted: {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "—"}
        </div>
        <Button
          variant={submission.editAllowed ? "destructive" : "outline"}
          size="sm"
          onClick={() => toggleEditMutation.mutate()}
          disabled={toggleEditMutation.isPending}
          data-testid="button-toggle-edit"
        >
          {toggleEditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
          {submission.editAllowed ? "Lock Edit" : "Allow Edit"}
        </Button>
      </div>
    </div>
  );
}

export default function HstcSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hstc/submissions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Submission deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/hstc/submissions"] });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const { data: submissions, isLoading } = useQuery<HstcSubmission[]>({
    queryKey: ["/api/hstc/submissions"],
  });

  const adminAssignedVillages: string[] = (() => {
    try {
      const stored = localStorage.getItem("adminAssignedVillages");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  })();

  const areaFilteredSubmissions = adminAssignedVillages.length > 0
    ? (submissions || []).filter(s => s.villageId && adminAssignedVillages.includes(s.villageId))
    : (submissions || []);

  const filtered = areaFilteredSubmissions.filter((s) => {
    const matchesSearch = !search ||
      s.houseOwnerName.toLowerCase().includes(search.toLowerCase()) ||
      s.mobileNumber.includes(search) ||
      (s.villageName || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Fetch full submission (with images) when a row is selected - list API omits heavy columns
  const { data: selectedSubmission, isLoading: selectedLoading } = useQuery<HstcSubmission>({
    queryKey: ["/api/hstc/submissions", selectedId],
    enabled: !!selectedId,
  });

  if (selectedId && selectedSubmission) {
    return <SubmissionDetail submission={selectedSubmission} onBack={() => setSelectedId(null)} />;
  }
  if (selectedId && selectedLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = areaFilteredSubmissions.filter((s) => s.status === "pending").length;
  const approvedCount = areaFilteredSubmissions.filter((s) => s.status === "approved").length;
  const rejectedCount = areaFilteredSubmissions.filter((s) => s.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Harr Sirr te Chatt</h1>
            <p className="text-sm text-muted-foreground">Social welfare housing applications</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            window.open("/api/hstc/export-csv", "_blank");
          }}
          disabled={!submissions || submissions.length === 0}
          data-testid="button-hstc-export-csv"
        >
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, mobile, village..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
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
              <Home className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No submissions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>House Owner</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((sub) => (
                  <TableRow key={sub.id} data-testid={`row-submission-${sub.id}`}>
                    <TableCell className="font-medium">{sub.houseOwnerName}</TableCell>
                    <TableCell className="text-sm">{sub.villageName || "—"}</TableCell>
                    <TableCell className="text-sm">{sub.mobileNumber}</TableCell>
                    <TableCell className="text-sm">₹{(sub.totalCost || 0).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={sub.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedId(sub.id)} data-testid={`button-view-${sub.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(sub.id)} data-testid={`button-delete-${sub.id}`}>
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
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-prev-page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-next-page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this submission? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
