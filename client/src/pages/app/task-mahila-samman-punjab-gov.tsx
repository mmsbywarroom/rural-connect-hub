import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOcr, type OcrResult } from "@/hooks/use-ocr";
import { compressImage } from "@/lib/image-compress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, ChevronRight, Loader2, Camera, Upload, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, MahilaSammanPunjabSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "log" | "unit" | "form";

function isIndianMobile(input: string): boolean {
  const cleaned = input.replace(/\D/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

const CATEGORY_OPTIONS = [
  { value: "general", en: "General", hi: "सामान्य", pa: "ਆਮ" },
  { value: "obc", en: "OBC", hi: "ओबीसी", pa: "OBC" },
  { value: "sc", en: "SC", hi: "एससी", pa: "SC" },
  { value: "st", en: "ST", hi: "एसटी", pa: "ST" },
];

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Mahila Samman Rashi through Punjab Gov", hi: "पंजाब सरकार के माध्यम से महिला सम्मान राशि", pa: "ਪੰਜਾਬ ਸਰਕਾਰ ਦੁਆਰਾ ਮਹਿਲਾ ਸਨਮਾਨ ਰਾਸ਼ੀ" },
  desc: {
    en: "Every woman in Punjab to get ₹1,000/month Samman Rashi. SC/ST community women to get ₹1,500/month.",
    hi: "पंजाब की हर महिला को ₹1,000/महीना सम्मान राशि। SC/ST समुदाय की महिलाओं को ₹1,500/महीना।",
    pa: "ਪੰਜਾਬ ਦੀ ਹਰ ਔਰਤ ਨੂੰ ₹1,000/ਮਹੀਨਾ ਸਨਮਾਨ ਰਾਸ਼ੀ। SC/ST ਸਮੁਦਾਇ ਦੀਆਂ ਔਰਤਾਂ ਨੂੰ ₹1,500/ਮਹੀਨਾ।",
  },
  next: { en: "Next", hi: "आगे", pa: "ਅੱਗੇ" },
  prev: { en: "Back", hi: "पीछे", pa: "ਪਿੱਛੇ" },
  name: { en: "Name", hi: "नाम", pa: "ਨਾਮ" },
  mobile: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  verify: { en: "Verify", hi: "सत्यापित करें", pa: "ਤਸਦੀਕ ਕਰੋ" },
  enterOtp: { en: "Enter OTP", hi: "OTP दर्ज करें", pa: "OTP ਦਰਜ ਕਰੋ" },
  fatherHusband: { en: "Father/Husband Name", hi: "पिता/पति का नाम", pa: "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ" },
  aadhaarFront: { en: "Aadhaar Front", hi: "आधार अगला भाग", pa: "ਆਧਾਰ ਅੱਗੇ" },
  aadhaarBack: { en: "Aadhaar Back", hi: "आधार पीछे", pa: "ਆਧਾਰ ਪਿੱਛੇ" },
  ocrData: { en: "Extracted Data (editable)", hi: "निकाला गया डेटा (संपादन योग्य)", pa: "ਕੱਢਿਆ ਡਾਟਾ (ਸੰਪਾਦਨ ਯੋਗ)" },
  verifyAadhaarCorrect: {
    en: "I verify that the Aadhaar data (captured by OCR) above is correct",
    hi: "मैं पुष्टि करता/करती हूं कि ऊपर आधार का OCR से निकाला गया डेटा सही है",
    pa: "ਮੈਂ ਪੁਸ਼ਟੀ ਕਰਦਾ/ਕਰਦੀ ਹਾਂ ਕਿ ਉੱਪਰ ਆਧਾਰ ਦਾ OCR ਤੋਂ ਕੱਢਿਆ ਡਾਟਾ ਸਹੀ ਹੈ",
  },
  camera: { en: "Camera", hi: "कैमरा", pa: "ਕੈਮਰਾ" },
  chooseFile: { en: "Choose File", hi: "फाइल चुनें", pa: "ਫਾਈਲ ਚੁਣੋ" },
  voterId: { en: "Voter ID (from document)", hi: "वोटर आईडी (दस्तावेज़ से)", pa: "ਵੋਟਰ ਆਈਡੀ (ਦਸਤਾਵੇਜ਼ ਤੋਂ)" },
  voterMatch: { en: "Matched from Voter List", hi: "वोटर सूची से मिलान", pa: "ਵੋਟਰ ਸੂਚੀ ਤੋਂ ਮਿਲਾਨ" },
  boothId: { en: "Booth ID", hi: "बूथ आईडी", pa: "ਬੂਥ ਆਈਡੀ" },
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
  view: { en: "View", hi: "देखें", pa: "ਦੇਖੋ" },
  submissionLog: { en: "Mahila Samman Rashi", hi: "महिला सम्मान राशि जमा", pa: "ਮਹਿਲਾ ਸਨਮਾਨ ਰਾਸ਼ੀ ਜਮ੍ਹਾਂ" },
  matchNotFound: { en: "Match not found – enter Booth No below", hi: "मिलान नहीं मिला – नीचे बूथ नंबर दर्ज करें", pa: "ਮਿਲਾਨ ਨਹੀਂ ਮਿਲਿਆ – ਹੇਠਾਂ ਬੂਥ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  addNew: { en: "Add new", hi: "नया जोड़ें", pa: "ਨਵਾਂ ਜੋੜੋ" },
  submissionDetails: { en: "Submission details", hi: "जमा विवरण", pa: "ਜਮ੍ਹਾਂ ਵੇਰਵੇ" },
  close: { en: "Close", hi: "बंद करें", pa: "ਬੰਦ ਕਰੋ" },
  reading: { en: "Reading...", hi: "पढ़ रहा है...", pa: "ਪੜ੍ਹ ਰਿਹਾ ਹੈ..." },
  category: { en: "Category (Caste)", hi: "श्रेणी (जाति)", pa: "ਸ਼੍ਰੇਣੀ (ਜਾਤ)" },
};

function L(key: string, lang: string): string {
  const m = labels[key];
  if (!m) return key;
  return lang === "hi" ? m.hi : lang === "pa" ? m.pa : m.en;
}

function categoryLabel(value: string, lang: string): string {
  const o = CATEGORY_OPTIONS.find((c) => c.value === value);
  if (!o) return value;
  return lang === "hi" ? o.hi : lang === "pa" ? o.pa : o.en;
}

export default function TaskMahilaSammanPunjabGov({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();
  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [name, setName] = useState("");
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
  const [manualBoothId, setManualBoothId] = useState("");

  const [category, setCategory] = useState<string>("");
  const [sakhiPhoto, setSakhiPhoto] = useState<string | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef = useRef<HTMLInputElement>(null);
  const aadhaarFrontFileRef = useRef<HTMLInputElement>(null);
  const aadhaarBackFileRef = useRef<HTMLInputElement>(null);
  const voterIdRef = useRef<HTMLInputElement>(null);
  const voterIdFileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);

  const { processImage, processingType } = useOcr();

  const { data: myList = [] } = useQuery<MahilaSammanPunjabSubmission[]>({
    queryKey: ["/api/mahila-samman-punjab/my", user.id],
    enabled: !!user.id,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const isOcrTooWeak = (type: "aadhaarFront" | "aadhaarBack" | "voterId", result: OcrResult | null): boolean => {
    if (!result || typeof result !== "object") return true;
    const str = (v: any) => (v && typeof v === "string" ? v.trim() : "");
    if (type === "aadhaarFront") {
      const n = str(result.name);
      const num = str(result.aadhaarNumber).replace(/\s/g, "");
      return n.length < 2 || num.length < 10 || !/^\d+$/.test(num);
    }
    if (type === "aadhaarBack") return false;
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
          setOcrAadhaarAddress((result.address || "").trim());
        }
      }
      if (ref.current) ref.current.value = "";
    } catch {
      setter(null);
      toast({ title: "Image not clear", variant: "destructive" });
      if (ref.current) ref.current.value = "";
    }
  };

  const handleVoterCaptureWithFile = async (file: File) => {
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
          const res = await fetch(`/api/mahila-samman-punjab/voter-match?voterId=${encodeURIComponent(vid)}`, { credentials: "include" });
          const data = await res.json();
          setVoterMatch(data.match || null);
          setManualBoothId("");
        } else {
          setVoterMatch(null);
          setManualBoothId("");
        }
      }
      if (voterIdRef.current) voterIdRef.current.value = "";
      if (voterIdFileRef.current) voterIdFileRef.current.value = "";
    } catch {
      setVoterIdImage(null);
      setOcrVoterId("");
      setVoterMatch(null);
      toast({ title: "Image not clear", variant: "destructive" });
      if (voterIdRef.current) voterIdRef.current.value = "";
      if (voterIdFileRef.current) voterIdFileRef.current.value = "";
    }
  };

  const sendOtp = async () => {
    if (!isIndianMobile(mobileNumber)) {
      toast({ title: "Invalid mobile", description: "Enter valid 10-digit number", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", "/api/mahila-samman-punjab/send-otp", { mobile: mobileNumber });
      setOtpSent(true);
      toast({ title: "OTP sent" });
    } catch {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    }
  };

  const verifyOtp = async () => {
    try {
      await apiRequest("POST", "/api/mahila-samman-punjab/verify-otp", { mobile: mobileNumber, otp });
      setMobileVerified(true);
      toast({ title: "Mobile verified" });
    } catch {
      toast({ title: "Invalid or expired OTP", variant: "destructive" });
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const boothId = voterMatch?.boothId || manualBoothId.trim() || null;
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId || null,
        villageName: selectedVillageName || null,
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        mobileVerified: true,
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
        manualBoothId: manualBoothId.trim() || null,
        category: category || "general",
        sakhiPhoto,
        declarationChecked: true,
      };
      const res = await apiRequest("POST", "/api/mahila-samman-punjab/submit", payload);
      return res.json();
    },
    onSuccess: (data: MahilaSammanPunjabSubmission) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mahila-samman-punjab/my", user.id] });
      setSubmittedId(data.id);
      resetForm();
      setStep("log");
      toast({ title: "Submitted successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to submit", variant: "destructive" });
    },
  });

  function resetForm() {
    setName("");
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
    setManualBoothId("");
    setCategory("");
    setSakhiPhoto(null);
    setDeclarationChecked(false);
  }

  const hasVoterBooth = !!(voterMatch?.boothId || manualBoothId.trim());
  const canSubmit =
    name.trim() &&
    mobileVerified &&
    fatherHusbandName.trim() &&
    aadhaarFront &&
    aadhaarBack &&
    aadhaarVerifiedSameAsVoter &&
    ocrVoterId.trim() &&
    hasVoterBooth &&
    category &&
    sakhiPhoto &&
    declarationChecked;

  const goPrev = () => {
    if (step === "form") setStep("unit");
    else if (step === "unit") setStep("log");
    else if (step === "log") setStep("description");
    else setLocation("/app");
  };

  if (step === "description") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setLocation("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-base truncate">{L("title", language)}</h1>
        </header>
        <main className="px-4 py-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-slate-700 text-sm leading-relaxed">{L("desc", language)}</p>
              <Button className="w-full mt-4" onClick={() => setStep("log")}>
                {L("next", language)} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (step === "log") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={goPrev}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-base">{L("title", language)}</h1>
        </header>
        <main className="flex-1 px-4 py-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800">{L("submissionLog", language)}</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input placeholder={L("search", language)} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="mb-2" />
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {myList
                  .filter(
                    (s) =>
                      !searchQuery.trim() ||
                      [s.name, s.mobileNumber, s.ocrVoterId, s.id].some((v) =>
                        (v || "").toLowerCase().includes(searchQuery.toLowerCase())
                      )
                  )
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between border rounded px-3 py-2 bg-white text-sm">
                      <span className="truncate">{s.name} – {s.mobileNumber}</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0" onClick={() => setViewingId(s.id)}>
                        {L("view", language)}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button className="w-full mt-4" onClick={() => setStep("unit")}>
                {L("addNew", language)} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </main>
        <Dialog open={!!viewingId} onOpenChange={(open) => !open && setViewingId(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{L("submissionDetails", language)}</DialogTitle>
            </DialogHeader>
            {viewingId && (() => {
              const sub = myList.find((s) => s.id === viewingId);
              if (!sub) return null;
              return (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="font-semibold text-slate-600 text-xs">{L("name", language)}</p>
                      <p className="text-slate-800">{sub.name}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600 text-xs">{L("mobile", language)}</p>
                      <p className="text-slate-800">{sub.mobileNumber} {sub.mobileVerified ? "(Verified)" : ""}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600 text-xs">{L("fatherHusband", language)}</p>
                      <p className="text-slate-800">{sub.fatherHusbandName || "—"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-600 text-xs">{L("category", language)}</p>
                      <p className="text-slate-800">{categoryLabel(sub.category || "", language)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="font-semibold text-slate-600 text-xs">Unit / Village</p>
                      <p className="text-slate-800">{sub.villageName || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">OCR Aadhaar</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-slate-600">Name:</span><span>{sub.ocrAadhaarName || "—"}</span>
                      <span className="text-slate-600">Number:</span><span>{sub.ocrAadhaarNumber || "—"}</span>
                      <span className="text-slate-600">DOB:</span><span>{sub.ocrAadhaarDob || "—"}</span>
                      <span className="text-slate-600">Gender:</span><span>{sub.ocrAadhaarGender || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Voter</p>
                    <p className="text-xs text-slate-600">Voter ID: {sub.ocrVoterId || "—"} | Name: {sub.ocrVoterName || "—"}</p>
                    <p className="text-xs">Booth: {sub.voterMappingBoothId || sub.manualBoothId || "—"}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setViewingId(null)}>{L("close", language)}</Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
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
              setStep("form");
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
      <main className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{L("name", language)}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L("name", language)} />
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

        <Card>
          <CardContent className="p-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">{L("fatherHusband", language)}</label>
            <Input value={fatherHusbandName} onChange={(e) => setFatherHusbandName(e.target.value)} placeholder={L("fatherHusband", language)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{L("aadhaarFront", language)}</label>
              <input ref={aadhaarFrontRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={!!processingType}
                onChange={() => { const f = aadhaarFrontRef.current?.files?.[0]; if (f) handleAadhaarCapture(setAadhaarFront, aadhaarFrontRef, "aadhaarFront"); aadhaarFrontFileRef.current && (aadhaarFrontFileRef.current.value = ""); }} />
              <input ref={aadhaarFrontFileRef} type="file" accept="image/*" className="hidden" disabled={!!processingType}
                onChange={() => { const f = aadhaarFrontFileRef.current?.files?.[0]; if (f) handleAadhaarCapture(setAadhaarFront, aadhaarFrontFileRef, "aadhaarFront"); aadhaarFrontFileRef.current && (aadhaarFrontFileRef.current.value = ""); }} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!!processingType} onClick={() => aadhaarFrontRef.current?.click()}>{L("camera", language)}</Button>
                <Button type="button" variant="outline" size="sm" disabled={!!processingType} onClick={() => aadhaarFrontFileRef.current?.click()}>{L("chooseFile", language)}</Button>
              </div>
              {(processingType === "aadhaarFront" && <p className="text-xs text-slate-500 mt-1">{L("reading", language)}</p>) || (aadhaarFront && <img src={aadhaarFront} alt="" className="mt-1 h-20 rounded border object-cover" />)}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{L("aadhaarBack", language)}</label>
              <input ref={aadhaarBackRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={!!processingType}
                onChange={() => { const f = aadhaarBackRef.current?.files?.[0]; if (f) handleAadhaarCapture(setAadhaarBack, aadhaarBackRef, "aadhaarBack"); aadhaarBackFileRef.current && (aadhaarBackFileRef.current.value = ""); }} />
              <input ref={aadhaarBackFileRef} type="file" accept="image/*" className="hidden" disabled={!!processingType}
                onChange={() => { const f = aadhaarBackFileRef.current?.files?.[0]; if (f) handleAadhaarCapture(setAadhaarBack, aadhaarBackFileRef, "aadhaarBack"); aadhaarBackFileRef.current && (aadhaarBackFileRef.current.value = ""); }} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!!processingType} onClick={() => aadhaarBackRef.current?.click()}>{L("camera", language)}</Button>
                <Button type="button" variant="outline" size="sm" disabled={!!processingType} onClick={() => aadhaarBackFileRef.current?.click()}>{L("chooseFile", language)}</Button>
              </div>
              {(processingType === "aadhaarBack" && <p className="text-xs text-slate-500 mt-1">{L("reading", language)}</p>) || (aadhaarBack && <img src={aadhaarBack} alt="" className="mt-1 h-20 rounded border object-cover" />)}
            </div>
            {(aadhaarFront && aadhaarBack) && (
              <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
                <p className="text-xs font-semibold text-slate-700">{L("ocrData", language)}</p>
                <Input value={ocrAadhaarName} onChange={(e) => setOcrAadhaarName(e.target.value)} placeholder="Name" className="mb-2" />
                <Input value={ocrAadhaarNumber} onChange={(e) => setOcrAadhaarNumber(e.target.value)} placeholder="Aadhaar Number" className="mb-2" />
                <Input value={ocrAadhaarDob} onChange={(e) => setOcrAadhaarDob(e.target.value)} placeholder="DOB" className="mb-2" />
                <Input value={ocrAadhaarGender} onChange={(e) => setOcrAadhaarGender(e.target.value)} placeholder="Gender" className="mb-2" />
                <Textarea value={ocrAadhaarAddress} onChange={(e) => setOcrAadhaarAddress(e.target.value)} placeholder="Address (edit if needed)" rows={3} className="min-h-[72px]" />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox id="verifyVoter" checked={aadhaarVerifiedSameAsVoter} onCheckedChange={(c) => setAadhaarVerifiedSameAsVoter(!!c)} />
              <label htmlFor="verifyVoter" className="text-sm">{L("verifyAadhaarCorrect", language)}</label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{L("voterId", language)}</label>
              <input ref={voterIdRef} type="file" accept="image/*" capture="environment" className="hidden" disabled={!!processingType}
                onChange={() => { const f = voterIdRef.current?.files?.[0]; if (f) handleVoterCaptureWithFile(f); }} />
              <input ref={voterIdFileRef} type="file" accept="image/*" className="hidden" disabled={!!processingType}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVoterCaptureWithFile(f); }} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!!processingType} onClick={() => voterIdRef.current?.click()}>{L("camera", language)}</Button>
                <Button type="button" variant="outline" size="sm" disabled={!!processingType} onClick={() => voterIdFileRef.current?.click()}>{L("chooseFile", language)}</Button>
              </div>
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
            {(ocrVoterId && !voterMatch) && (
              <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">{L("matchNotFound", language)}</p>
                <Input value={manualBoothId} onChange={(e) => setManualBoothId(e.target.value)} placeholder={L("boothId", language)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">{L("category", language)}</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={L("category", language)} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {language === "hi" ? o.hi : language === "pa" ? o.pa : o.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">{L("sakhiPhoto", language)}</label>
            <input ref={photoRef} type="file" accept="image/*" capture="user" className="hidden"
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
                  if (photoFileRef.current) photoFileRef.current.value = "";
                }
              }} />
            <input ref={photoFileRef} type="file" accept="image/*" className="hidden"
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
                  if (photoFileRef.current) photoFileRef.current.value = "";
                }
              }} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => photoRef.current?.click()}>{L("camera", language)}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => photoFileRef.current?.click()}>{L("chooseFile", language)}</Button>
            </div>
            {sakhiPhoto && <img src={sakhiPhoto} alt="" className="mt-2 h-32 rounded border object-cover" />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <Checkbox id="decl" checked={declarationChecked} onCheckedChange={(c) => setDeclarationChecked(!!c)} className="mt-0.5" />
              <label htmlFor="decl" className="text-sm leading-tight">{L("declaration", language)}</label>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => submitMutation.mutate()} disabled={!canSubmit || submitMutation.isPending}>
          {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}{L("submit", language)}
        </Button>
      </main>

      {submittedId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full">
            <CardContent className="p-4 text-center space-y-3">
              <p className="text-green-600 font-medium">Submitted successfully!</p>
              <Button className="w-full" onClick={() => { setSubmittedId(null); setStep("unit"); }}>{L("addAnother", language)}</Button>
              <Button variant="outline" className="w-full" onClick={() => setSubmittedId(null)}>{L("close", language)}</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
