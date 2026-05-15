import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { ArrowLeft, Loader2, Phone, CheckCircle, Camera, Upload, Plus, Trash2, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { compressImage } from "@/lib/image-compress";
import { useOcr } from "@/hooks/use-ocr";
import { computeBlaCompletion } from "@/lib/bla-completion";
import type { AppUser, BlaMaster, BlaSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "booth" | "select_bla" | "form";

const BOOTH_OPTIONS = Array.from({ length: 258 }, (_, i) => String(i + 1));

const CASTE_OPTIONS = [
  { value: "GEN", en: "General (GEN)" },
  { value: "OBC", en: "OBC" },
  { value: "SC", en: "SC" },
  { value: "ST", en: "ST" },
];

const RELATION_OPTIONS = [
  "Self",
  "Spouse",
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Other",
];

const YES_NO = [
  { value: "yes", en: "Yes", hi: "हाँ", pa: "ਹਾਂ" },
  { value: "no", en: "No", hi: "नहीं", pa: "ਨਹੀਂ" },
];

export default function TaskBla({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();
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

  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState("");

  const [voterCardImage, setVoterCardImage] = useState<string | null>(null);
  const [epicNumber, setEpicNumber] = useState("");
  const [gender, setGender] = useState("");
  const [healthCardMade, setHealthCardMade] = useState("");
  const [msrRegistered, setMsrRegistered] = useState("");
  const [blaRelation, setBlaRelation] = useState("");
  const [casteCategory, setCasteCategory] = useState("");
  const [digitalSkills, setDigitalSkills] = useState<string[]>([""]);

  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef = useRef<HTMLInputElement>(null);
  const voterCardRef = useRef<HTMLInputElement>(null);

  const filteredBooths = useMemo(() => {
    const q = boothSearch.trim();
    if (!q) return BOOTH_OPTIONS;
    return BOOTH_OPTIONS.filter((b) => b.includes(q));
  }, [boothSearch]);

  const { data: boothBlas, isLoading: loadingBlas } = useQuery<BlaMaster[]>({
    queryKey: ["/api/bla/master/by-booth", selectedBooth],
    enabled: step === "select_bla" && !!selectedBooth,
    queryFn: async () => {
      const res = await fetch(`/api/bla/master/by-booth/${encodeURIComponent(selectedBooth)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load BLAs");
      return res.json();
    },
  });

  const completion = useMemo(
    () =>
      computeBlaCompletion({
        bloMobileVerified: mobileVerified,
        aadhaarFront,
        aadhaarBack,
        aadhaarNumber,
        voterCardImage,
        epicNumber,
        gender,
        healthCardMade,
        msrRegistered,
        blaRelation,
        casteCategory,
        digitalSkills,
      }),
    [
      mobileVerified,
      aadhaarFront,
      aadhaarBack,
      aadhaarNumber,
      voterCardImage,
      epicNumber,
      gender,
      healthCardMade,
      msrRegistered,
      blaRelation,
      casteCategory,
      digitalSkills,
    ],
  );

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bla/send-otp", { mobileNumber: blaMobile });
      return res.json();
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({ title: language === "hi" ? "OTP भेजा गया" : "OTP sent" });
    },
    onError: () => toast({ title: "Failed to send OTP", variant: "destructive" }),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bla/verify-otp", { mobileNumber: blaMobile, otp });
      return res.json();
    },
    onSuccess: () => {
      setMobileVerified(true);
      toast({ title: language === "hi" ? "मोबाइल सत्यापित" : "Mobile verified" });
    },
    onError: () => toast({ title: "Invalid OTP", variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const skills = digitalSkills.map((s) => s.trim()).filter(Boolean);
      const payload = {
        appUserId: user.id,
        blaMasterId: selectedMaster?.id ?? null,
        boothNumber: selectedBooth,
        bloName: blaName.trim(),
        bloMobileNumber: blaMobile.trim(),
        bloMobileVerified: mobileVerified,
        aadhaarFront,
        aadhaarBack,
        aadhaarNumber: aadhaarNumber.trim() || null,
        voterCardImage,
        epicNumber: epicNumber.trim() || null,
        ocrVoterId: epicNumber.trim() || null,
        gender: gender || null,
        healthCardMade: healthCardMade || null,
        msrRegistered: msrRegistered || null,
        blaRelation: blaRelation || null,
        casteCategory: casteCategory || null,
        digitalSkills: skills,
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
        title: completion.isComplete
          ? language === "hi"
            ? "BLA सबमिट हो गया"
            : "BLA submitted"
          : language === "hi"
          ? "अधूरा सहेजा गया"
          : "Saved as incomplete",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bla/my-submissions", user.id] });
      setStep("booth");
      resetForm();
    },
    onError: async (err: unknown) => {
      let msg = "Submit failed";
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

  const resetForm = () => {
    setSelectedBooth("");
    setSelectedMaster(null);
    setEditingId(null);
    setBlaName("");
    setBlaMobile("");
    setOtpSent(false);
    setOtp("");
    setMobileVerified(false);
    setAadhaarFront(null);
    setAadhaarBack(null);
    setAadhaarNumber("");
    setVoterCardImage(null);
    setEpicNumber("");
    setGender("");
    setHealthCardMade("");
    setMsrRegistered("");
    setBlaRelation("");
    setCasteCategory("");
    setDigitalSkills([""]);
  };

  const loadSubmissionIntoForm = (s: BlaSubmission) => {
    setEditingId(s.id);
    setSelectedBooth(s.boothNumber || s.manualBoothId || "");
    setBlaName(s.bloName);
    setBlaMobile(s.bloMobileNumber);
    setMobileVerified(!!s.bloMobileVerified);
    setAadhaarFront(s.aadhaarFront || null);
    setAadhaarBack(s.aadhaarBack || null);
    setAadhaarNumber(s.aadhaarNumber || s.ocrAadhaarNumber || "");
    setVoterCardImage(s.voterCardImage || null);
    setEpicNumber(s.epicNumber || s.ocrVoterId || "");
    setGender(s.gender || "");
    setHealthCardMade(s.healthCardMade || "");
    setMsrRegistered(s.msrRegistered || "");
    setBlaRelation(s.blaRelation || "");
    setCasteCategory(s.casteCategory || "");
    setDigitalSkills(
      s.digitalSkills && s.digitalSkills.length > 0 ? s.digitalSkills : [""],
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
      toast({ title: "Image error", variant: "destructive" });
    } finally {
      if (input) input.value = "";
    }
  };

  const handleBack = () => {
    if (step === "booth") setLocation("/app");
    else if (step === "select_bla") setStep("booth");
    else setStep("select_bla");
  };

  const yesNoLabel = (v: string) => {
    const o = YES_NO.find((x) => x.value === v);
    if (!o) return v;
    return language === "hi" ? o.hi : language === "pa" ? o.pa : o.en;
  };

  const headerTitle =
    step === "booth"
      ? language === "hi"
        ? "बूथ चुनें (1–258)"
        : language === "pa"
        ? "ਬੂਥ ਚੁਣੋ (1–258)"
        : "Select Booth (1–258)"
      : step === "select_bla"
      ? language === "hi"
        ? `बूथ ${selectedBooth} – BLA चुनें`
        : `Booth ${selectedBooth} – Select BLA`
      : language === "hi"
      ? "BLA पंजीकरण फॉर्म"
      : "BLA Registration Form";

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
            placeholder={language === "hi" ? "बूथ नंबर खोजें..." : "Search booth number..."}
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
        <div className="p-4 space-y-3 flex-1">
          {loadingBlas ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : !boothBlas?.length ? (
            <Card>
              <CardContent className="p-4 text-sm text-slate-600">
                {language === "hi"
                  ? "इस बूथ के लिए कोई BLA नहीं मिला। Admin से CSV अपलोड करवाएं।"
                  : "No BLA found for this booth. Ask admin to upload CSV."}
              </CardContent>
            </Card>
          ) : (
            boothBlas.map((m, idx) => (
              <Card
                key={m.id}
                className="cursor-pointer hover:border-indigo-300"
                onClick={async () => {
                  setSelectedMaster(m);
                  setBlaName(m.name);
                  setBlaMobile(m.mobileNumber);
                  setMobileVerified(false);
                  setOtpSent(false);
                  setOtp("");
                  try {
                    const res = await fetch(`/api/bla/submission-by-master/${m.id}`, {
                      credentials: "include",
                    });
                    const existing = (await res.json()) as BlaSubmission | null;
                    if (existing) {
                      setSelectedMaster(m);
                      loadSubmissionIntoForm(existing);
                    } else {
                      setEditingId(null);
                      setStep("form");
                    }
                  } catch {
                    setStep("form");
                  }
                }}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800">
                      BLA {idx + 1}: {m.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.mobileNumber} · Booth {m.boothNumber}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-indigo-500" />
                </CardContent>
              </Card>
            ))
          )}
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
            Booth {selectedBooth} · {blaName}
          </p>
        </div>
      </header>

      <div className="px-4 pt-3">
        <Card className="mb-3">
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {completion.isComplete
                  ? language === "hi"
                    ? "पूर्ण"
                    : "Complete"
                  : language === "hi"
                  ? "अधूरा"
                  : "Incomplete"}
              </span>
              <span className="font-bold text-indigo-600">{completion.percentage}%</span>
            </div>
            <Progress value={completion.percentage} className="h-2" />
            {!completion.isComplete && completion.missingFields.length > 0 && (
              <p className="text-[11px] text-slate-500">
                {language === "hi" ? "बाकी:" : "Remaining:"} {completion.missingFields.slice(0, 4).join(", ")}
                {completion.missingFields.length > 4 ? "…" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <label className="text-sm font-medium">{language === "hi" ? "BLA नाम" : "BLA Name"}</label>
            <Input value={blaName} onChange={(e) => setBlaName(e.target.value)} />
            <label className="text-sm font-medium">{language === "hi" ? "बूथ नंबर" : "Booth Number"}</label>
            <Input value={selectedBooth} onChange={(e) => setSelectedBooth(e.target.value)} />
            <label className="text-sm font-medium">{language === "hi" ? "मोबाइल (OTP)" : "Mobile (OTP)"}</label>
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
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={blaMobile.length !== 10 || sendOtpMutation.isPending}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )}
              {mobileVerified && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" /> OK
                </Badge>
              )}
            </div>
            {otpSent && !mobileVerified && (
              <div className="flex gap-2">
                <Input maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))} />
                <Button size="sm" onClick={() => verifyOtpMutation.mutate()} disabled={otp.length !== 4}>
                  {language === "hi" ? "सत्यापित" : "Verify"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">{language === "hi" ? "आधार" : "Aadhaar"}</p>
            <div className="grid grid-cols-2 gap-2">
              <input ref={aadhaarFrontRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => pickImage(aadhaarFrontRef.current, setAadhaarFront, "aadhaarFront", (r) => r?.aadhaarNumber && setAadhaarNumber(r.aadhaarNumber))} />
              <input ref={aadhaarBackRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => pickImage(aadhaarBackRef.current, setAadhaarBack, "aadhaarBack")} />
              <Button variant="outline" className="h-20 flex-col" onClick={() => aadhaarFrontRef.current?.click()}>
                <Camera className="h-4 w-4" /> Front
              </Button>
              <Button variant="outline" className="h-20 flex-col" onClick={() => aadhaarBackRef.current?.click()}>
                <Camera className="h-4 w-4" /> Back
              </Button>
            </div>
            <label className="text-sm font-medium">{language === "hi" ? "आधार नंबर" : "Aadhaar Number"}</label>
            <Input value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))} maxLength={12} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">{language === "hi" ? "वोटर कार्ड" : "Voter Card"}</p>
            <input ref={voterCardRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={() => pickImage(voterCardRef.current, setVoterCardImage, "voterId", (r) => r?.voterId && setEpicNumber(r.voterId))} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-16 flex-col" onClick={() => voterCardRef.current?.click()}>
                <Camera className="h-4 w-4" /> Camera
              </Button>
              <Button variant="outline" className="flex-1 h-16 flex-col" onClick={() => voterCardRef.current?.click()}>
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>
            <label className="text-sm font-medium">EPIC / Voter ID</label>
            <Input value={epicNumber} onChange={(e) => setEpicNumber(e.target.value.toUpperCase())} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <label className="text-sm font-medium">{language === "hi" ? "लिंग" : "Gender"}</label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{language === "hi" ? "पुरुष" : "Male"}</SelectItem>
                <SelectItem value="female">{language === "hi" ? "महिला" : "Female"}</SelectItem>
                <SelectItem value="other">{language === "hi" ? "अन्य" : "Other"}</SelectItem>
              </SelectContent>
            </Select>

            {(gender === "male" || gender === "female") && (
              <>
                <label className="text-sm font-medium">
                  {language === "hi" ? "हेल्थ कार्ड बना?" : "Health card made?"}
                </label>
                <Select value={healthCardMade} onValueChange={setHealthCardMade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Yes / No" />
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

            <label className="text-sm font-medium">
              {language === "hi" ? "MSR में रजिस्ट्रेशन?" : "MSR registration done?"}
            </label>
            <Select value={msrRegistered} onValueChange={setMsrRegistered}>
              <SelectTrigger>
                <SelectValue placeholder="Yes / No" />
              </SelectTrigger>
              <SelectContent>
                {YES_NO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {yesNoLabel(o.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium">{language === "hi" ? "BLA का रिश्ता" : "BLA Relation"}</label>
            <Select value={blaRelation} onValueChange={setBlaRelation}>
              <SelectTrigger>
                <SelectValue placeholder="Select relation" />
              </SelectTrigger>
              <SelectContent>
                {RELATION_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium">{language === "hi" ? "जाति श्रेणी" : "Caste category"}</label>
            <Select value={casteCategory} onValueChange={setCasteCategory}>
              <SelectTrigger>
                <SelectValue placeholder="GEN / OBC / SC / ST" />
              </SelectTrigger>
              <SelectContent>
                {CASTE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium">{language === "hi" ? "डिजिटल स्किल्स" : "Digital skills"}</label>
            {digitalSkills.map((skill, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={skill}
                  onChange={(e) => {
                    const next = [...digitalSkills];
                    next[i] = e.target.value;
                    setDigitalSkills(next);
                  }}
                  placeholder={language === "hi" ? "स्किल दर्ज करें" : "Enter skill"}
                />
                {digitalSkills.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setDigitalSkills(digitalSkills.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setDigitalSkills([...digitalSkills, ""])}>
              <Plus className="h-4 w-4 mr-1" /> {language === "hi" ? "और जोड़ें" : "Add more"}
            </Button>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {language === "hi" ? "सहेजें और सबमिट करें" : "Save & Submit"}
        </Button>
      </div>
    </div>
  );
}
