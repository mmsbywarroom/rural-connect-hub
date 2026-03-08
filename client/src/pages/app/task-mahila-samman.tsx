import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useOcr, type OcrResult } from "@/hooks/use-ocr";
import { compressImage } from "@/lib/image-compress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, ChevronRight, ChevronLeft, Loader2, Camera, Upload, Phone, User, FileCheck } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, MahilaSammanSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "unit" | "sakhi" | "father" | "aadhaar" | "voter" | "photo" | "declaration";

const STEPS: Step[] = ["description", "unit", "sakhi", "father", "aadhaar", "voter", "photo", "declaration"];

function isIndianMobile(input: string): boolean {
  const cleaned = input.replace(/\D/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Mahila Samman Rashi", hi: "महिला सम्मान राशि", pa: "ਮਹਿਲਾ ਸਨਮਾਨ ਰਾਸ਼ੀ" },
  desc: {
    en: "Every woman in Punjab to get ₹1,000/month Samman Rashi. SC/ST community women to get ₹1,500/month.",
    hi: "पंजाब की हर महिला को ₹1,000/महीना सम्मान राशि। SC/ST समुदाय की महिलाओं को ₹1,500/महीना।",
    pa: "ਪੰਜਾਬ ਦੀ ਹਰ ਔਰਤ ਨੂੰ ₹1,000/ਮਹੀਨਾ ਸਨਮਾਨ ਰਾਸ਼ੀ। SC/ST ਸਮੁਦਾਇ ਦੀਆਂ ਔਰਤਾਂ ਨੂੰ ₹1,500/ਮਹੀਨਾ।",
  },
  next: { en: "Next", hi: "आगे", pa: "ਅੱਗੇ" },
  prev: { en: "Back", hi: "पीछे", pa: "ਪਿੱਛੇ" },
  sakhiName: { en: "Sakhi Name", hi: "सखी का नाम", pa: "ਸਖੀ ਦਾ ਨਾਮ" },
  mobile: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  verify: { en: "Verify", hi: "सत्यापित करें", pa: "ਤਸਦੀਕ ਕਰੋ" },
  enterOtp: { en: "Enter OTP", hi: "OTP दर्ज करें", pa: "OTP ਦਰਜ ਕਰੋ" },
  fatherHusband: { en: "Father/Husband Name", hi: "पिता/पति का नाम", pa: "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ" },
  aadhaarFront: { en: "Aadhaar Front", hi: "आधार अगला भाग", pa: "ਆਧਾਰ ਅੱਗੇ" },
  aadhaarBack: { en: "Aadhaar Back", hi: "आधार पीछे", pa: "ਆਧਾਰ ਪਿੱਛੇ" },
  ocrData: { en: "Extracted Data (editable)", hi: "निकाला गया डेटा (संपादन योग्य)", pa: "ਕੱਢਿਆ ਡਾਟਾ (ਸੰਪਾਦਨ ਯੋਗ)" },
  verifySameAsVoter: {
    en: "I verify Aadhaar data is same as Voter ID",
    hi: "मैं पुष्टि करता/करती हूं कि आधार डेटा वोटर आईडी के समान है",
    pa: "ਮੈਂ ਪੁਸ਼ਟੀ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ ਕਿ ਆਧਾਰ ਡਾਟਾ ਵੋਟਰ ਆਈਡੀ ਵਰਗਾ ਹੈ",
  },
  voterId: { en: "Voter ID (from document)", hi: "वोटर आईडी (दस्तावेज़ से)", pa: "ਵੋਟਰ ਆਈਡੀ (ਦਸਤਾਵੇਜ਼ ਤੋਂ)" },
  voterMatch: { en: "Matched from Voter List", hi: "वोटर सूची से मिलान", pa: "ਵੋਟਰ ਸੂਚੀ ਤੋਂ ਮਿਲਾਨ" },
  boothId: { en: "Booth ID", hi: "बूथ आईडी", pa: "ਬੂਥ ਆਈਡੀ" },
  name: { en: "Name", hi: "नाम", pa: "ਨਾਮ" },
  fatherName: { en: "Father Name", hi: "पिता का नाम", pa: "ਪਿਤਾ ਦਾ ਨਾਮ" },
  village: { en: "Village", hi: "गाँव", pa: "ਪਿੰਡ" },
  sakhiPhoto: { en: "Sakhi Live Photo", hi: "सखी की लाइव फोटो", pa: "ਸਖੀ ਦੀ ਲਾਈਵ ਫੋਟੋ" },
  declaration: {
    en: "I have spoken to this person, they are ready and willing to work for Mahila Samman.",
    hi: "मैंने इस व्यक्ति से बात की है, वे महिला सम्मान के लिए काम करने के लिए तैयार और इच्छुक हैं।",
    pa: "ਮੈਂ ਇਸ ਵਿਅਕਤੀ ਨਾਲ ਗੱਲ ਕੀਤੀ ਹੈ, ਉਹ ਮਹਿਲਾ ਸਨਮਾਨ ਲਈ ਕੰਮ ਕਰਨ ਲਈ ਤਿਆਰ ਅਤੇ ਇੱਛੁਕ ਹਨ।",
  },
  submit: { en: "Submit", hi: "जमा करें", pa: "ਜਮ੍ਹਾਂ ਕਰੋ" },
  addAnother: { en: "Add another response", hi: "एक और जवाब जोड़ें", pa: "ਇੱਕ ਹੋਰ ਜਵਾਬ ਜੋੜੋ" },
  mySubmissions: { en: "My submissions", hi: "मेरी जमा", pa: "ਮੇਰੀਆਂ ਜਮ੍ਹਾਂ" },
  search: { en: "Search by name, mobile, ID", hi: "नाम, मोबाइल, आईडी से खोजें", pa: "ਨਾਮ, ਮੋਬਾਈਲ, ਆਈਡੀ ਨਾਲ ਖੋਜੋ" },
  edit: { en: "Edit", hi: "संपादित करें", pa: "ਸੋਧੋ" },
  reading: { en: "Reading...", hi: "पढ़ रहा है...", pa: "ਪੜ੍ਹ ਰਿਹਾ ਹੈ..." },
};

function L(key: string, lang: string): string {
  const m = labels[key];
  if (!m) return key;
  return lang === "hi" ? m.hi : lang === "pa" ? m.pa : m.en;
}

export default function TaskMahilaSamman({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();
  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [sakhiName, setSakhiName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [fatherHusbandName, setFatherHusbandName] = useState("");

  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [ocrAadhaarName, setOcrAadhaarName] = useState("");
  const [ocrAadhaarNumber, setOcrAadhaarNumber] = useState("");
  const [ocrAadhaarDob, setOcrAadhaarDob] = useState("");
  const [ocrAadhaarGender, setOcrAadhaarGender] = useState("");
  const [ocrAadhaarAddress, setOcrAadhaarAddress] = useState("");
  const [aadhaarVerifiedSameAsVoter, setAadhaarVerifiedSameAsVoter] = useState(false);

  const [voterIdImage, setVoterIdImage] = useState<string | null>(null);
  const [ocrVoterId, setOcrVoterId] = useState("");
  const [ocrVoterName, setOcrVoterName] = useState("");
  const [voterMatch, setVoterMatch] = useState<{ boothId: string; name: string; fatherName: string; villageName: string } | null>(null);

  const [sakhiPhoto, setSakhiPhoto] = useState<string | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef = useRef<HTMLInputElement>(null);
  const voterIdRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const { processImage, processingType } = useOcr();

  const { data: myList = [] } = useQuery<MahilaSammanSubmission[]>({
    queryKey: ["/api/mahila-samman/my", user.id],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const editSubmission = editingId ? myList.find((s) => s.id === editingId) : null;
  useEffect(() => {
    if (!editSubmission || !editingId) return;
    setSelectedVillageId(editSubmission.villageId || "");
    setSelectedVillageName(editSubmission.villageName || "");
    setSakhiName(editSubmission.sakhiName || "");
    setMobileNumber(editSubmission.mobileNumber || "");
    setMobileVerified(!!editSubmission.mobileVerified);
    setOtpSent(false);
    setFatherHusbandName(editSubmission.fatherHusbandName || "");
    setAadhaarFront(editSubmission.aadhaarFront || null);
    setAadhaarBack(editSubmission.aadhaarBack || null);
    setOcrAadhaarName(editSubmission.ocrAadhaarName || "");
    setOcrAadhaarNumber(editSubmission.ocrAadhaarNumber || "");
    setOcrAadhaarDob(editSubmission.ocrAadhaarDob || "");
    setOcrAadhaarGender(editSubmission.ocrAadhaarGender || "");
    setOcrAadhaarAddress(editSubmission.ocrAadhaarAddress || "");
    setAadhaarVerifiedSameAsVoter(!!editSubmission.aadhaarVerifiedSameAsVoter);
    setOcrVoterId(editSubmission.ocrVoterId || "");
    setOcrVoterName(editSubmission.ocrVoterName || "");
    setVoterIdImage(null);
    if (editSubmission.voterMappingBoothId || editSubmission.voterMappingName) {
      setVoterMatch({
        boothId: editSubmission.voterMappingBoothId || "",
        name: editSubmission.voterMappingName || "",
        fatherName: editSubmission.voterMappingFatherName || "",
        villageName: editSubmission.voterMappingVillageName || "",
      });
    } else setVoterMatch(null);
    setSakhiPhoto(editSubmission.sakhiPhoto || null);
    setDeclarationChecked(!!editSubmission.declarationChecked);
    setStep("sakhi");
  }, [editingId, editSubmission?.id, editSubmission?.sakhiName]);

  const isOcrTooWeak = (type: "aadhaarFront" | "aadhaarBack" | "voterId", result: OcrResult | null): boolean => {
    if (!result || typeof result !== "object") return true;
    const str = (v: any) => (v && typeof v === "string" ? v.trim() : "");
    if (type === "aadhaarFront") {
      const name = str(result.name);
      const num = str(result.aadhaarNumber).replace(/\s/g, "");
      return name.length < 2 || num.length < 10 || !/^\d+$/.test(num);
    }
    if (type === "aadhaarBack") {
      return str(result.address).length < 15;
    }
    return str(result.voterId).length < 8 || str(result.name).length < 2;
  };

  const handleAadhaarCapture = async (
    setter: (v: string | null) => void,
    ref: React.RefObject<HTMLInputElement | null>,
    ocrType: "aadhaarFront" | "aadhaarBack"
  ) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setter(base64);
      const result = await processImage(ocrType, base64);
      if (!result || isOcrTooWeak(ocrType, result)) {
        setter(null);
        toast({ title: "Image not clear", description: "Please capture or upload a clear image.", variant: "destructive" });
      } else {
        if (ocrType === "aadhaarFront") {
          setOcrAadhaarName(result.name || "");
          setOcrAadhaarNumber(result.aadhaarNumber || "");
          setOcrAadhaarDob(result.dob || "");
          setOcrAadhaarGender(result.gender || "");
        } else {
          setOcrAadhaarAddress(result.address || "");
        }
      }
      if (ref.current) ref.current.value = "";
    } catch {
      setter(null);
      toast({ title: "Image not clear", variant: "destructive" });
      if (ref.current) ref.current.value = "";
    }
  };

  const handleVoterCapture = async () => {
    const file = voterIdRef.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setVoterIdImage(base64);
      const result = await processImage("voterId", base64);
      if (!result || isOcrTooWeak("voterId", result)) {
        setVoterIdImage(null);
        setOcrVoterId("");
        setOcrVoterName("");
        setVoterMatch(null);
        toast({ title: "Image not clear", description: "Please capture or upload a clear Voter ID image.", variant: "destructive" });
      } else {
        const vid = (result.voterId || "").trim();
        const vname = (result.name || "").trim();
        setOcrVoterId(vid);
        setOcrVoterName(vname);
        if (vid) {
          const res = await fetch(`/api/mahila-samman/voter-match?voterId=${encodeURIComponent(vid)}`, { credentials: "include" });
          const data = await res.json();
          setVoterMatch(data.match || null);
        } else {
          setVoterMatch(null);
        }
      }
      if (voterIdRef.current) voterIdRef.current.value = "";
    } catch {
      setVoterIdImage(null);
      setOcrVoterId("");
      setVoterMatch(null);
      toast({ title: "Image not clear", variant: "destructive" });
      if (voterIdRef.current) voterIdRef.current.value = "";
    }
  };

  const sendOtp = async () => {
    if (!isIndianMobile(mobileNumber)) {
      toast({ title: "Invalid mobile", description: "Enter valid 10-digit number", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", "/api/mahila-samman/send-otp", { mobile: mobileNumber });
      setOtpSent(true);
      toast({ title: "OTP sent" });
    } catch {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    }
  };

  const verifyOtp = async () => {
    try {
      await apiRequest("POST", "/api/mahila-samman/verify-otp", { mobile: mobileNumber, otp });
      setMobileVerified(true);
      toast({ title: "Mobile verified" });
    } catch {
      toast({ title: "Invalid or expired OTP", variant: "destructive" });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId || null,
        villageName: selectedVillageName || null,
        sakhiName: sakhiName.trim(),
        mobileNumber: mobileNumber.trim(),
        mobileVerified,
        fatherHusbandName: fatherHusbandName.trim(),
        aadhaarFront,
        aadhaarBack,
        ocrAadhaarName: ocrAadhaarName.trim() || null,
        ocrAadhaarNumber: ocrAadhaarNumber.trim() || null,
        ocrAadhaarDob: ocrAadhaarDob.trim() || null,
        ocrAadhaarGender: ocrAadhaarGender.trim() || null,
        ocrAadhaarAddress: ocrAadhaarAddress.trim() || null,
        aadhaarVerifiedSameAsVoter,
        ocrVoterId: ocrVoterId.trim() || null,
        ocrVoterName: ocrVoterName.trim() || null,
        voterMappingBoothId: voterMatch?.boothId || null,
        voterMappingName: voterMatch?.name || null,
        voterMappingFatherName: voterMatch?.fatherName || null,
        voterMappingVillageName: voterMatch?.villageName || null,
        sakhiPhoto,
        declarationChecked,
      };
      if (editingId) {
        const res = await apiRequest("PATCH", `/api/mahila-samman/my/${editingId}`, { ...payload, appUserId: user.id });
        return res.json();
      }
      const res = await apiRequest("POST", "/api/mahila-samman/submit", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mahila-samman/my", user.id] });
      setSubmittedId(data.id);
      setEditingId(null);
      resetForm();
      setStep("description");
      toast({ title: editingId ? "Updated" : "Submitted successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to submit", variant: "destructive" });
    },
  });

  function resetForm() {
    setSakhiName("");
    setMobileNumber("");
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
    setFatherHusbandName("");
    setAadhaarFront(null);
    setAadhaarBack(null);
    setOcrAadhaarName("");
    setOcrAadhaarNumber("");
    setOcrAadhaarDob("");
    setOcrAadhaarGender("");
    setOcrAadhaarAddress("");
    setAadhaarVerifiedSameAsVoter(false);
    setVoterIdImage(null);
    setOcrVoterId("");
    setOcrVoterName("");
    setVoterMatch(null);
    setSakhiPhoto(null);
    setDeclarationChecked(false);
  }

  const canSubmit =
    sakhiName.trim() &&
    mobileVerified &&
    fatherHusbandName.trim() &&
    aadhaarFront &&
    aadhaarBack &&
    aadhaarVerifiedSameAsVoter &&
    ocrVoterId.trim() &&
    sakhiPhoto &&
    declarationChecked;

  const stepIndex = STEPS.indexOf(step);
  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  };
  const goPrev = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  if (step === "description") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setLocation("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-base">{L("title", language)}</h1>
        </header>
        <main className="px-4 py-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-slate-700 text-sm leading-relaxed">{L("desc", language)}</p>
              <Button className="w-full mt-4" onClick={goNext}>
                {L("next", language)} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (step === "unit") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={goPrev}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-base">{L("title", language)}</h1>
        </header>
        <main className="flex-1 p-4">
          <UnitSelector
            onSelect={(u) => {
              setSelectedVillageId(u.villageId);
              setSelectedVillageName(u.villageName);
              goNext();
            }}
            title={language === "hi" ? "यूनिट चुनें" : language === "pa" ? "ਯੂਨਿਟ ਚੁਣੋ" : "Select Unit"}
            subtitle={language === "hi" ? "गाँव/वार्ड चुनें" : language === "pa" ? "ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" : "Choose village/ward"}
            defaultVillageId={user?.mappedAreaId || undefined}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={goPrev}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-base truncate">{L("title", language)}</h1>
      </header>
      <main className="flex-1 px-4 py-4 space-y-4">
        {step === "sakhi" && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{L("sakhiName", language)}</label>
                <Input value={sakhiName} onChange={(e) => setSakhiName(e.target.value)} placeholder={L("sakhiName", language)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{L("mobile", language)}</label>
                <div className="flex gap-2">
                  <Input value={mobileNumber} onChange={(e) => { setMobileNumber(e.target.value); setMobileVerified(false); setOtpSent(false); }} inputMode="tel" maxLength={14} className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={sendOtp} disabled={!isIndianMobile(mobileNumber)}>{L("sendOtp", language)}</Button>
                </div>
                {otpSent && !mobileVerified && (
                  <div className="flex gap-2 mt-2">
                    <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder={L("enterOtp", language)} inputMode="numeric" className="flex-1" />
                    <Button type="button" size="sm" onClick={verifyOtp}>{L("verify", language)}</Button>
                  </div>
                )}
                {mobileVerified && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Phone className="h-3 w-3" /> Verified</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {step === "father" && (
          <Card>
            <CardContent className="p-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">{L("fatherHusband", language)}</label>
              <Input value={fatherHusbandName} onChange={(e) => setFatherHusbandName(e.target.value)} placeholder={L("fatherHusband", language)} />
            </CardContent>
          </Card>
        )}

        {step === "aadhaar" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{L("aadhaarFront", language)}</label>
                <Input ref={aadhaarFrontRef} type="file" accept="image/*" capture="environment" disabled={!!processingType}
                  onChange={() => { const f = aadhaarFrontRef.current?.files?.[0]; if (f) handleAadhaarCapture(setAadhaarFront, aadhaarFrontRef, "aadhaarFront"); }} />
                {(processingType === "aadhaarFront" && <p className="text-xs text-slate-500 mt-1">{L("reading", language)}</p>) || (aadhaarFront && <img src={aadhaarFront} alt="" className="mt-1 h-20 rounded border object-cover" />)}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{L("aadhaarBack", language)}</label>
                <Input ref={aadhaarBackRef} type="file" accept="image/*" capture="environment" disabled={!!processingType}
                  onChange={() => { const f = aadhaarBackRef.current?.files?.[0]; if (f) handleAadhaarCapture(setAadhaarBack, aadhaarBackRef, "aadhaarBack"); }} />
                {(processingType === "aadhaarBack" && <p className="text-xs text-slate-500 mt-1">{L("reading", language)}</p>) || (aadhaarBack && <img src={aadhaarBack} alt="" className="mt-1 h-20 rounded border object-cover" />)}
              </div>
              <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
                <p className="text-xs font-semibold text-slate-700">{L("ocrData", language)}</p>
                <Input value={ocrAadhaarName} onChange={(e) => setOcrAadhaarName(e.target.value)} placeholder="Name" className="mb-2" />
                <Input value={ocrAadhaarNumber} onChange={(e) => setOcrAadhaarNumber(e.target.value)} placeholder="Aadhaar Number" className="mb-2" />
                <Input value={ocrAadhaarDob} onChange={(e) => setOcrAadhaarDob(e.target.value)} placeholder="DOB" className="mb-2" />
                <Input value={ocrAadhaarGender} onChange={(e) => setOcrAadhaarGender(e.target.value)} placeholder="Gender" className="mb-2" />
                <Input value={ocrAadhaarAddress} onChange={(e) => setOcrAadhaarAddress(e.target.value)} placeholder="Address" />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="verifyVoter" checked={aadhaarVerifiedSameAsVoter} onCheckedChange={(c) => setAadhaarVerifiedSameAsVoter(!!c)} />
                <label htmlFor="verifyVoter" className="text-sm">{L("verifySameAsVoter", language)}</label>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "voter" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{L("voterId", language)}</label>
                <Input ref={voterIdRef} type="file" accept="image/*" capture="environment" disabled={!!processingType} onChange={handleVoterCapture} />
                {(processingType === "voterId" && <p className="text-xs text-slate-500 mt-1">{L("reading", language)}</p>) || (voterIdImage && <img src={voterIdImage} alt="" className="mt-1 h-20 rounded border object-cover" />)}
              </div>
              {(ocrVoterId || ocrVoterName) && (
                <div className="space-y-1">
                  <Input value={ocrVoterId} onChange={(e) => setOcrVoterId(e.target.value)} placeholder="Voter ID" />
                  <Input value={ocrVoterName} onChange={(e) => setOcrVoterName(e.target.value)} placeholder="Voter Name" />
                </div>
              )}
              {voterMatch && (
                <div className="border rounded-lg p-3 bg-green-50">
                  <p className="text-xs font-semibold text-slate-700 mb-2">{L("voterMatch", language)}</p>
                  <p className="text-xs"><span className="text-slate-600">{L("boothId", language)}:</span> {voterMatch.boothId ?? "—"}</p>
                  <p className="text-xs"><span className="text-slate-600">{L("name", language)}:</span> {voterMatch.name ?? "—"}</p>
                  <p className="text-xs"><span className="text-slate-600">{L("fatherName", language)}:</span> {voterMatch.fatherName ?? "—"}</p>
                  <p className="text-xs"><span className="text-slate-600">{L("village", language)}:</span> {voterMatch.villageName ?? "—"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "photo" && (
          <Card>
            <CardContent className="p-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">{L("sakhiPhoto", language)}</label>
              <Input ref={photoRef} type="file" accept="image/*" capture="user"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    try {
                      const base64 = await compressImage(f);
                      setSakhiPhoto(base64);
                    } catch {
                      toast({ title: "Failed to load image", variant: "destructive" });
                    }
                    if (photoRef.current) photoRef.current.value = "";
                  }
                }} />
              {sakhiPhoto && <img src={sakhiPhoto} alt="" className="mt-2 h-32 rounded border object-cover" />}
            </CardContent>
          </Card>
        )}

        {step === "declaration" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Checkbox id="decl" checked={declarationChecked} onCheckedChange={(c) => setDeclarationChecked(!!c)} className="mt-0.5" />
                <label htmlFor="decl" className="text-sm leading-tight">{L("declaration", language)}</label>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={goPrev} disabled={stepIndex <= 0}>{L("prev", language)}</Button>
          {step === "declaration" ? (
            <Button onClick={() => submitMutation.mutate()} disabled={!canSubmit || submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}{L("submit", language)}
            </Button>
          ) : (
            <Button onClick={goNext}>{L("next", language)} <ChevronRight className="h-4 w-4 ml-1" /></Button>
          )}
        </div>
      </main>

      {submittedId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full">
            <CardContent className="p-4 text-center space-y-3">
              <p className="text-green-600 font-medium">Submitted successfully!</p>
              <Button className="w-full" onClick={() => { setSubmittedId(null); setStep("description"); }}>{L("addAnother", language)}</Button>
              <Button variant="outline" className="w-full" onClick={() => setSubmittedId(null)}>Close</Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 pb-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">{L("mySubmissions", language)}</p>
        <Input placeholder={L("search", language)} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mb-2" />
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {(myList || [])
            .filter((s) => !searchQuery.trim() || [s.sakhiName, s.mobileNumber, s.id].some((v) => (v || "").toLowerCase().includes(searchQuery.toLowerCase())))
            .map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2 bg-white text-sm">
                <span className="truncate">{s.sakhiName} – {s.mobileNumber}</span>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingId(s.id); setStep("sakhi"); /* TODO load s into form */ }}>{L("edit", language)}</Button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
