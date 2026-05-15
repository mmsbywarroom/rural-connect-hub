import { useMemo, useRef, useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Loader2, CheckCircle, Camera, Upload, ChevronRight, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { compressImage } from "@/lib/image-compress";
import { useOcr } from "@/hooks/use-ocr";
import { computeBlaCompletion } from "@/lib/bla-completion";
import {
  blaT,
  blaReligionLabel,
  blaCasteLabel,
  translateCompletionMissing,
  BLA_RELIGION_VALUES,
} from "@/lib/bla-i18n";
import { getBlaCommunityOptions, blaCommunityLabel } from "@/lib/bla-religion-communities";
import type { AppUser, BlaMaster, BlaSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "booth" | "select_bla" | "form";

type BlaMasterWithStatus = BlaMaster & {
  completionPercentage: number;
  status: string;
  submissionId: string | null;
  todayAttendance: "present" | "absent" | null;
};

function localDateYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseApiErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "";
  const msg = err.message;
  const jsonStart = msg.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(msg.slice(jsonStart)) as { error?: string; details?: string };
      return body.details || body.error || msg;
    } catch {
      /* ignore */
    }
  }
  return msg.replace(/^\d+:\s*/, "");
}

const BOOTH_OPTIONS = Array.from({ length: 258 }, (_, i) => String(i + 1));

const CASTE_OPTIONS = [
  { value: "GEN", en: "General (GEN)" },
  { value: "OBC", en: "OBC" },
  { value: "BC", en: "BC" },
  { value: "SC", en: "SC" },
  { value: "ST", en: "ST" },
];

const YES_NO = [
  { value: "yes", en: "Yes", hi: "हाँ", pa: "ਹਾਂ" },
  { value: "no", en: "No", hi: "नहीं", pa: "ਨਹੀਂ" },
];

export default function TaskBla({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();
  const t = (key: Parameters<typeof blaT>[0], vars?: Record<string, string>) => blaT(key, language, vars);
  const { processingType, processImage } = useOcr();

  const [step, setStep] = useState<Step>("booth");
  const [boothSearch, setBoothSearch] = useState("");
  const [selectedBooth, setSelectedBooth] = useState("");
  const [selectedMaster, setSelectedMaster] = useState<BlaMaster | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [blaName, setBlaName] = useState("");
  const [blaMobile, setBlaMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [blaLivePhoto, setBlaLivePhoto] = useState<string | null>(null);

  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState("");

  const [voterCardImage, setVoterCardImage] = useState<string | null>(null);
  const [epicNumber, setEpicNumber] = useState("");
  const [gender, setGender] = useState("");
  const [healthCardMade, setHealthCardMade] = useState("");
  const [msrRegistered, setMsrRegistered] = useState("");
  const [blaRelation, setBlaRelation] = useState("");
  const [religionCommunity, setReligionCommunity] = useState("");
  const [casteCategory, setCasteCategory] = useState("");
  const [dob, setDob] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState("");
  const [computerDataEntry, setComputerDataEntry] = useState("");

  const [addBlaOpen, setAddBlaOpen] = useState(false);
  const [addBlaName, setAddBlaName] = useState("");
  const [addBlaMobile, setAddBlaMobile] = useState("");

  const blaLivePhotoRef = useRef<HTMLInputElement>(null);
  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef = useRef<HTMLInputElement>(null);
  const voterCardRef = useRef<HTMLInputElement>(null);

  const attendanceDate = useMemo(() => localDateYmd(), []);

  const communityOptions = useMemo(
    () => getBlaCommunityOptions(blaRelation, casteCategory),
    [blaRelation, casteCategory],
  );

  useEffect(() => {
    if (!religionCommunity) return;
    const valid = communityOptions.some((c) => c.value === religionCommunity);
    if (!valid) setReligionCommunity("");
  }, [communityOptions, religionCommunity]);

  const filteredBooths = useMemo(() => {
    const q = boothSearch.trim();
    if (!q) return BOOTH_OPTIONS;
    return BOOTH_OPTIONS.filter((b) => b.includes(q));
  }, [boothSearch]);

  const {
    data: boothBlas,
    isLoading: loadingBlas,
    isError: boothBlasError,
    refetch: refetchBoothBlas,
  } = useQuery<BlaMasterWithStatus[]>({
    queryKey: ["/api/bla/master/by-booth", selectedBooth, "withStatus", attendanceDate],
    enabled: step === "select_bla" && !!selectedBooth,
    queryFn: async () => {
      const res = await fetch(
        `/api/bla/master/by-booth/${encodeURIComponent(selectedBooth)}?withStatus=true&attendanceDate=${encodeURIComponent(attendanceDate)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to load BLAs");
      return res.json();
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({
      master,
      status,
    }: {
      master: BlaMasterWithStatus;
      status: "present" | "absent";
    }) => {
      const res = await apiRequest("POST", "/api/bla/attendance", {
        blaMasterId: master.id,
        appUserId: user.id,
        boothNumber: selectedBooth,
        bloName: master.name,
        bloMobileNumber: master.mobileNumber,
        status,
        attendanceDate,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("attendanceMarked") });
      refetchBoothBlas();
    },
    onError: () => toast({ title: t("attendanceFailed"), variant: "destructive" }),
  });

  const addBlaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bla/master/add", {
        name: addBlaName.trim(),
        mobileNumber: addBlaMobile.trim(),
        boothNumber: selectedBooth,
      });
      return res.json() as BlaMaster;
    },
    onSuccess: () => {
      toast({ title: t("blaAdded") });
      setAddBlaOpen(false);
      setAddBlaName("");
      setAddBlaMobile("");
      refetchBoothBlas();
    },
    onError: () => {
      toast({ title: t("addBlaFailed"), variant: "destructive" });
    },
  });

  const completion = useMemo(
    () =>
      computeBlaCompletion({
        bloMobileVerified: mobileVerified,
        blaLivePhoto,
        aadhaarFront,
        aadhaarBack,
        aadhaarNumber,
        voterCardImage,
        epicNumber,
        gender,
        healthCardMade,
        msrRegistered,
        blaRelation,
        religionCommunity,
        casteCategory,
        dob,
        anniversaryDate,
        computerDataEntry,
      }),
    [
      mobileVerified,
      blaLivePhoto,
      aadhaarFront,
      aadhaarBack,
      aadhaarNumber,
      voterCardImage,
      epicNumber,
      gender,
      healthCardMade,
      msrRegistered,
      blaRelation,
      religionCommunity,
      casteCategory,
      dob,
      anniversaryDate,
      computerDataEntry,
    ],
  );

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bla/send-otp", { mobileNumber: blaMobile });
      return res.json();
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({ title: t("otpSent") });
    },
    onError: () => toast({ title: t("otpFailed"), variant: "destructive" }),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bla/verify-otp", { mobileNumber: blaMobile, otp });
      return res.json();
    },
    onSuccess: () => {
      setMobileVerified(true);
      toast({ title: t("mobileVerified") });
    },
    onError: () => toast({ title: t("invalidOtp"), variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appUserId: user.id,
        blaMasterId: selectedMaster?.id ?? null,
        boothNumber: selectedBooth,
        bloName: blaName.trim(),
        bloMobileNumber: blaMobile.trim(),
        bloMobileVerified: mobileVerified,
        blaLivePhoto,
        aadhaarFront,
        aadhaarBack,
        aadhaarNumber: aadhaarNumber.trim() || null,
        voterCardImage,
        epicNumber: epicNumber.trim() || null,
        ocrVoterId: epicNumber.trim() || null,
        gender: gender || null,
        healthCardMade: showHealthCard ? healthCardMade || null : null,
        msrRegistered: showMsr ? msrRegistered || null : null,
        blaRelation: blaRelation || null,
        religionCommunity: religionCommunity || null,
        casteCategory: casteCategory || null,
        dob: dob || null,
        anniversaryDate: anniversaryDate || null,
        computerDataEntry: computerDataEntry || null,
        completionPercentage: completion.percentage,
        status: completion.isComplete ? "complete" : "incomplete",
        manualBoothId: selectedBooth,
      };
      if (editingId) {
        const res = await apiRequest("PATCH", `/api/bla/submissions/${editingId}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/bla/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: completion.isComplete ? t("blaSubmitted") : t("savedIncomplete"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bla/my-submissions", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/bla/master/by-booth", selectedBooth] });
      setStep("booth");
      resetForm();
    },
    onError: (err: unknown) => {
      const detail = parseApiErrorMessage(err);
      toast({
        title: detail || t("submitFailed"),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedBooth("");
    setSelectedMaster(null);
    setEditingId(null);
    setBlaName("");
    setBlaMobile("");
    setOtpSent(false);
    setOtp("");
    setMobileVerified(false);
    setBlaLivePhoto(null);
    setAadhaarFront(null);
    setAadhaarBack(null);
    setAadhaarNumber("");
    setVoterCardImage(null);
    setEpicNumber("");
    setGender("");
    setHealthCardMade("");
    setMsrRegistered("");
    setBlaRelation("");
    setReligionCommunity("");
    setCasteCategory("");
    setDob("");
    setAnniversaryDate("");
    setComputerDataEntry("");
  };

  const loadSubmissionIntoForm = (s: BlaSubmission) => {
    setEditingId(s.id);
    setSelectedBooth(s.boothNumber || s.manualBoothId || "");
    setBlaName(s.bloName);
    setBlaMobile(s.bloMobileNumber);
    setMobileVerified(!!s.bloMobileVerified);
    setBlaLivePhoto(s.blaLivePhoto || null);
    setAadhaarFront(s.aadhaarFront || null);
    setAadhaarBack(s.aadhaarBack || null);
    setAadhaarNumber(s.aadhaarNumber || s.ocrAadhaarNumber || "");
    setVoterCardImage(s.voterCardImage || null);
    setEpicNumber(s.epicNumber || s.ocrVoterId || "");
    setGender(s.gender || "");
    setHealthCardMade(s.healthCardMade || "");
    setMsrRegistered(s.msrRegistered || "");
    setBlaRelation(s.blaRelation || "");
    setReligionCommunity(s.religionCommunity || "");
    setCasteCategory(s.casteCategory || "");
    setDob(s.dob || "");
    setAnniversaryDate(s.anniversaryDate || "");
    setComputerDataEntry(
      s.computerDataEntry ||
        (Array.isArray(s.digitalSkills) && s.digitalSkills.length > 0 ? "yes" : ""),
    );
    setStep("form");
  };

  const pickImage = async (
    input: HTMLInputElement | null,
    setter: (v: string | null) => void,
    ocrType?: "aadhaarFront" | "aadhaarBack" | "voterId",
    after?: (r: Awaited<ReturnType<typeof processImage>> | null) => void,
  ) => {
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setter(base64);
      if (ocrType && base64) {
        const result = await processImage(ocrType, base64);
        after?.(result);
      }
    } catch {
      toast({ title: t("imageError"), variant: "destructive" });
    } finally {
      if (input) input.value = "";
    }
  };

  const handleBack = () => {
    if (step === "booth") setLocation("/app");
    else if (step === "select_bla") setStep("booth");
    else setStep("select_bla");
  };

  const openBlaForm = async (m: BlaMaster) => {
    setSelectedMaster(m);
    setBlaName(m.name);
    setBlaMobile(m.mobileNumber);
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
    try {
      const res = await fetch(`/api/bla/submission-by-master/${encodeURIComponent(m.id)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const existing = (await res.json()) as BlaSubmission | null;
        if (existing?.id) {
          loadSubmissionIntoForm(existing);
          return;
        }
      }
      setEditingId(null);
      resetFormFieldsOnly();
      setBlaName(m.name);
      setBlaMobile(m.mobileNumber);
      setSelectedBooth(m.boothNumber);
      setStep("form");
    } catch {
      setEditingId(null);
      resetFormFieldsOnly();
      setBlaName(m.name);
      setBlaMobile(m.mobileNumber);
      setSelectedBooth(m.boothNumber);
      setStep("form");
    }
  };

  const resetFormFieldsOnly = () => {
    setAadhaarFront(null);
    setAadhaarBack(null);
    setAadhaarNumber("");
    setVoterCardImage(null);
    setEpicNumber("");
    setGender("");
    setHealthCardMade("");
    setMsrRegistered("");
    setBlaRelation("");
    setReligionCommunity("");
    setCasteCategory("");
    setBlaLivePhoto(null);
    setComputerDataEntry("");
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
  };

  const statusBadge = (item: BlaMasterWithStatus) => {
    const isComplete = item.status === "complete";
    const pct = item.completionPercentage ?? 0;
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs font-semibold text-indigo-600">{pct}%</span>
        <Badge
          className={
            isComplete
              ? "bg-green-600 hover:bg-green-600 text-white border-0"
              : "bg-amber-500 hover:bg-amber-500 text-white border-0"
          }
        >
          {isComplete ? t("complete") : t("incomplete")}
        </Badge>
      </div>
    );
  };

  const yesNoLabel = (v: string) => {
    const o = YES_NO.find((x) => x.value === v);
    if (!o) return v;
    return language === "hi" ? o.hi : language === "pa" ? o.pa : o.en;
  };

  const handleGenderChange = (value: string) => {
    setGender(value);
    if (value !== "female") {
      setMsrRegistered("");
    }
  };

  const showHealthCard = gender === "male" || gender === "female" || gender === "other";
  const showMsr = gender === "female";

  const headerTitle =
    step === "booth"
      ? t("selectBoothTitle")
      : step === "select_bla"
      ? t("selectBlaTitle", { booth: selectedBooth })
      : t("formTitle");

  if (step === "booth") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{headerTitle}</h1>
        </header>
        <div className="p-4 space-y-3 flex-1">
          <Input
            placeholder={t("searchBooth")}
            value={boothSearch}
            onChange={(e) => setBoothSearch(e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[65vh] overflow-y-auto">
            {filteredBooths.map((b) => (
              <Button
                key={b}
                variant="outline"
                className="h-10"
                onClick={() => {
                  setSelectedBooth(b);
                  setStep("select_bla");
                }}
              >
                {b}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === "select_bla") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{headerTitle}</h1>
        </header>
        <div className="p-4 space-y-3 flex-1 pb-8">
          <Button
            variant="outline"
            className="w-full border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            onClick={() => setAddBlaOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t("addMoreBla", { booth: selectedBooth })}
          </Button>

          {loadingBlas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : boothBlasError ? (
            <Card>
              <CardContent className="p-4 space-y-3 text-sm text-slate-600">
                <p>{t("loadBlaFailed")}</p>
                <Button variant="outline" size="sm" onClick={() => refetchBoothBlas()}>
                  {t("retry")}
                </Button>
              </CardContent>
            </Card>
          ) : !boothBlas?.length ? (
            <Card>
              <CardContent className="p-4 text-sm text-slate-600">
                {t("noBlaYet")}
              </CardContent>
            </Card>
          ) : (
            boothBlas.map((m, idx) => (
              <Card key={m.id} className="hover:border-indigo-300 hover:shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div
                    className="flex justify-between items-center gap-3 cursor-pointer"
                    onClick={() => openBlaForm(m)}
                  >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      BLA {idx + 1}: {m.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {m.mobileNumber} · {t("boothLabel")} {m.boothNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(m)}
                    <ChevronRight className="h-5 w-5 text-indigo-500" />
                  </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <p className="text-[11px] font-medium text-slate-600 mb-1.5">{t("attendanceToday")}</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={m.todayAttendance === "present" ? "default" : "outline"}
                        className={
                          m.todayAttendance === "present"
                            ? "flex-1 bg-green-600 hover:bg-green-700"
                            : "flex-1"
                        }
                        disabled={attendanceMutation.isPending}
                        onClick={() => attendanceMutation.mutate({ master: m, status: "present" })}
                      >
                        {t("present")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={m.todayAttendance === "absent" ? "default" : "outline"}
                        className={
                          m.todayAttendance === "absent"
                            ? "flex-1 bg-red-600 hover:bg-red-700"
                            : "flex-1"
                        }
                        disabled={attendanceMutation.isPending}
                        onClick={() => attendanceMutation.mutate({ master: m, status: "absent" })}
                      >
                        {t("absent")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          <Dialog open={addBlaOpen} onOpenChange={setAddBlaOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>
                  {t("addBlaDialogTitle", { booth: selectedBooth })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">{t("name")}</label>
                  <Input value={addBlaName} onChange={(e) => setAddBlaName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("mobile")}</label>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={addBlaMobile}
                    onChange={(e) => setAddBlaMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddBlaOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button
                  onClick={() => addBlaMutation.mutate()}
                  disabled={
                    !addBlaName.trim() || addBlaMobile.length !== 10 || addBlaMutation.isPending
                  }
                >
                  {addBlaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("add")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="text-white" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{headerTitle}</h1>
          <p className="text-xs text-white/80 truncate">
            {t("boothLabel")} {selectedBooth} · {blaName}
          </p>
        </div>
      </header>

      <div className="px-4 pt-3">
        <Card className="mb-3">
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {completion.isComplete ? t("complete") : t("incomplete")}
              </span>
              <span className="font-bold text-indigo-600">{completion.percentage}%</span>
            </div>
            <Progress value={completion.percentage} className="h-2" />
            {!completion.isComplete && (completion.missingFields?.length ?? 0) > 0 && (
              <p className="text-[11px] text-slate-500">
                {t("remaining")}{" "}
                {translateCompletionMissing(completion.missingFields ?? [], language).slice(0, 4).join(", ")}
                {(completion.missingFields?.length ?? 0) > 4 ? "…" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <label className="text-sm font-medium">{t("blaName")}</label>
            <Input value={blaName} onChange={(e) => setBlaName(e.target.value)} />
            <label className="text-sm font-medium">{t("boothNumber")}</label>
            <Input value={selectedBooth} onChange={(e) => setSelectedBooth(e.target.value)} />
            <label className="text-sm font-medium">{t("mobileOtp")}</label>
            <div className="flex gap-2">
              <Input
                type="tel"
                maxLength={10}
                value={blaMobile}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setBlaMobile(v);
                  if (v !== blaMobile) {
                    setMobileVerified(false);
                    setOtpSent(false);
                    setOtp("");
                  }
                }}
                disabled={mobileVerified}
              />
              {!mobileVerified && (
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap shrink-0 px-3"
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={blaMobile.length !== 10 || sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("sendOtp")
                  )}
                </Button>
              )}
              {mobileVerified && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" /> {t("verified")}
                </Badge>
              )}
            </div>
            {otpSent && !mobileVerified && (
              <div className="flex gap-2">
                <Input maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                <Button size="sm" onClick={() => verifyOtpMutation.mutate()} disabled={otp.length !== 4}>
                  {t("verify")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("blaLivePhoto")}</p>
            <p className="text-xs text-slate-500">{t("blaLivePhotoHint")}</p>
            <input
              ref={blaLivePhotoRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={() => pickImage(blaLivePhotoRef.current, setBlaLivePhoto)}
            />
            {blaLivePhoto ? (
              <div className="space-y-2">
                <img
                  src={blaLivePhoto}
                  alt={t("blaLivePhoto")}
                  className="w-full max-h-48 object-cover rounded-lg border"
                />
                <Button variant="outline" size="sm" className="w-full" onClick={() => blaLivePhotoRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-1" /> {t("retakePhoto")}
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full h-24 flex-col" onClick={() => blaLivePhotoRef.current?.click()}>
                <Camera className="h-5 w-5 mb-1" /> {t("camera")}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("aadhaar")}</p>
            <div className="grid grid-cols-2 gap-2">
              <input ref={aadhaarFrontRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => pickImage(aadhaarFrontRef.current, setAadhaarFront, "aadhaarFront", (r) => r?.aadhaarNumber && setAadhaarNumber(r.aadhaarNumber))} />
              <input ref={aadhaarBackRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => pickImage(aadhaarBackRef.current, setAadhaarBack, "aadhaarBack")} />
              <Button variant="outline" className="h-20 flex-col" onClick={() => aadhaarFrontRef.current?.click()}>
                <Camera className="h-4 w-4" /> {t("aadhaarFront")}
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => aadhaarBackRef.current?.click()}>
                <Camera className="h-4 w-4" /> {t("aadhaarBack")}
              </Button>
            </div>
            <label className="text-sm font-medium">{t("aadhaarNumber")}</label>
            <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))} maxLength={12} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("voterCard")}</p>
            <input ref={voterCardRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => pickImage(voterCardRef.current, setVoterCardImage, "voterId", (r) => r?.voterId && setEpicNumber(r.voterId))} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-16 flex-col" onClick={() => voterCardRef.current?.click()}>
                <Camera className="h-4 w-4" /> {t("camera")}
              </Button>
              <Button variant="outline" className="flex-1 h-16 flex-col" onClick={() => voterCardRef.current?.click()}>
                <Upload className="h-4 w-4" /> {t("upload")}
              </Button>
            </div>
            <label className="text-sm font-medium">{t("epicVoterId")}</label>
            <Input value={epicNumber} onChange={(e) => setEpicNumber(e.target.value.toUpperCase())} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <label className="text-sm font-medium">{t("gender")}</label>
            <Select value={gender} onValueChange={handleGenderChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("male")}</SelectItem>
                <SelectItem value="female">{t("female")}</SelectItem>
                <SelectItem value="other">{t("other")}</SelectItem>
              </SelectContent>
            </Select>

            {showHealthCard && (
              <>
                <label className="text-sm font-medium">{t("healthCard")}</label>
                <Select value={healthCardMade} onValueChange={setHealthCardMade}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("yesNo")} />
                  </SelectTrigger>
                  <SelectContent>
                    {YES_NO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {yesNoLabel(o.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {showMsr && (
              <>
                <label className="text-sm font-medium">{t("msrRegistration")}</label>
                <Select value={msrRegistered} onValueChange={setMsrRegistered}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("yesNo")} />
                  </SelectTrigger>
                  <SelectContent>
                    {YES_NO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {yesNoLabel(o.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <label className="text-sm font-medium">{t("religion")}</label>
            <Select
              value={blaRelation}
              onValueChange={(v) => {
                setBlaRelation(v);
                setReligionCommunity("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectReligion")} />
              </SelectTrigger>
              <SelectContent>
                {BLA_RELIGION_VALUES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {blaReligionLabel(r, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {blaRelation && (
              <>
                <label className="text-sm font-medium">{t("religionCommunity")}</label>
                <Select value={religionCommunity} onValueChange={setReligionCommunity}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCommunity")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {communityOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {blaCommunityLabel(c.value, blaRelation, casteCategory, language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <label className="text-sm font-medium">{t("casteCategory")}</label>
            <Select
              value={casteCategory}
              onValueChange={(v) => {
                setCasteCategory(v);
                setReligionCommunity("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("castePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CASTE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {blaCasteLabel(c.value, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("dob")}</label>
                <Input
                  type="date"
                  className="h-10"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("anniversaryDate")}</label>
                <Input
                  type="date"
                  className="h-10"
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                />
              </div>
            </div>

            <label className="text-sm font-medium">{t("computerDataEntry")}</label>
            <Select value={computerDataEntry} onValueChange={setComputerDataEntry}>
              <SelectTrigger>
                <SelectValue placeholder={t("yesNo")} />
              </SelectTrigger>
              <SelectContent>
                {YES_NO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {yesNoLabel(o.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {t("saveSubmit")}
        </Button>
      </div>
    </div>
  );
}

