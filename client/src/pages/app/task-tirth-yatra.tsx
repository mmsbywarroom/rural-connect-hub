import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOcr, type OcrResult } from "@/hooks/use-ocr";
import { compressImage } from "@/lib/image-compress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Calendar, Phone, Users, Loader2, ChevronRight, Edit2, MapPin, Mic, MicOff, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, TirthYatraRequest } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "form";

interface FamilyMemberForm {
  id: string;
  name: string;
  mobile: string;
  mobileVerified: boolean;
  otp: string;
  otpSent: boolean;
}

type Gender = "male" | "female" | "other" | "";
type Destination =
  | "kashi_vishwanath"
  | "vaishno_devi"
  | "kedarnath"
  | "amarnath"
  | "haridwar"
  | "other"
  | "";

function isIndianMobile(input: string): boolean {
  const cleaned = input.replace(/\D/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

function genId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
      return (crypto as any).randomUUID();
    }
  } catch {
    // ignore and fall back
  }
  return Math.random().toString(36).slice(2);
}

export default function TaskTirthYatra({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [applicantName, setApplicantName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender>("");
  const [withFamily, setWithFamily] = useState<"with" | "without" | "">("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberForm[]>([]);

  const [currentLocationLabel, setCurrentLocationLabel] = useState("");
  const [currentLatitude, setCurrentLatitude] = useState("");
  const [currentLongitude, setCurrentLongitude] = useState("");

  const [destination, setDestination] = useState<Destination>("");
  const [destinationOther, setDestinationOther] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [voterCard, setVoterCard] = useState<string | null>(null);
  const [ocrAadhaarFront, setOcrAadhaarFront] = useState<OcrResult | null>(null);
  const [ocrAadhaarBack, setOcrAadhaarBack] = useState<OcrResult | null>(null);
  const [ocrVoter, setOcrVoter] = useState<OcrResult | null>(null);

  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef = useRef<HTMLInputElement>(null);
  const voterCardRef = useRef<HTMLInputElement>(null);

  const { processImage, processingType } = useOcr();

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [audioNoteUrl, setAudioNoteUrl] = useState<string | null>(null);
  const [audioNoteText, setAudioNoteText] = useState<string>("");
  const speechRecognitionRef = useRef<any | null>(null);

  const { data: myRequests = [] } = useQuery<TirthYatraRequest[]>({
    queryKey: ["/api/tirth-yatra/my", user.id],
  });

  const sendOtp = async (mobile: string, onSuccess: () => void, onError: () => void) => {
    if (!isIndianMobile(mobile)) {
      toast({ title: "Invalid mobile number", description: "Please enter a valid 10-digit mobile number", variant: "destructive" });
      onError();
      return;
    }
    try {
      await apiRequest("POST", "/api/tirth-yatra/send-otp", { mobile });
      onSuccess();
      toast({ title: "OTP sent", description: `OTP sent to ${mobile}` });
    } catch {
      toast({ title: "Failed to send OTP", variant: "destructive" });
      onError();
    }
  };

  const verifyOtp = async (mobile: string, code: string, onSuccess: () => void, onError: () => void) => {
    try {
      await apiRequest("POST", "/api/tirth-yatra/verify-otp", { mobile, otp: code });
      onSuccess();
      toast({ title: "Mobile verified" });
    } catch {
      toast({ title: "Invalid or expired OTP", variant: "destructive" });
      onError();
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId || null,
        villageName: selectedVillageName || null,
        applicantName: applicantName.trim(),
        mobileNumber: mobileNumber.trim(),
        mobileVerified,
        dob: dob || null,
        age,
        gender: gender || null,
        withFamily: withFamily === "with",
        familyMembers: familyMembers.map((m) => ({
          name: m.name.trim(),
          mobileNumber: m.mobile.trim(),
          mobileVerified: m.mobileVerified,
        })),
        currentLocationLabel: currentLocationLabel.trim() || null,
        currentLatitude: currentLatitude || null,
        currentLongitude: currentLongitude || null,
        destination: destination || "other",
        destinationOther: destination === "other" ? destinationOther.trim() || null : null,
        startDate: startDate || null,
        endDate: endDate || null,
        aadhaarFrontUrl: aadhaarFront,
        aadhaarBackUrl: aadhaarBack,
        voterCardUrl: voterCard,
        ocrAadhaarText: (ocrAadhaarFront || ocrAadhaarBack) ? JSON.stringify({ front: ocrAadhaarFront || undefined, back: ocrAadhaarBack || undefined }) : null,
        ocrVoterText: ocrVoter ? JSON.stringify(ocrVoter) : null,
        ocrVoterId: (ocrVoter?.voterId && ocrVoter.voterId.trim()) ? ocrVoter.voterId.trim() : null,
        audioNoteUrl,
        audioNoteText: audioNoteText.trim() || null,
      };
      if (editingId) {
        const res = await apiRequest("PATCH", `/api/tirth-yatra/my/${editingId}`, { ...payload, appUserId: user.id });
        return res.json();
      }
      const res = await apiRequest("POST", "/api/tirth-yatra/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tirth-yatra/my", user.id] });
      toast({ title: editingId ? "Request updated" : "Tirth Yatra request submitted" });
      resetForm();
      setStep("description");
    },
    onError: async (err: any) => {
      const message = err?.message || "Failed to submit request";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setApplicantName("");
    setMobileNumber("");
    setMobileVerified(false);
    setOtp("");
    setOtpSent(false);
    setDob("");
    setAge(null);
    setGender("");
    setWithFamily("");
    setFamilyMembers([]);
    setCurrentLocationLabel("");
    setCurrentLatitude("");
    setCurrentLongitude("");
    setDestination("");
    setDestinationOther("");
    setStartDate("");
    setEndDate("");
    setAadhaarFront(null);
    setAadhaarBack(null);
    setVoterCard(null);
    setOcrAadhaarFront(null);
    setOcrAadhaarBack(null);
    setOcrVoter(null);
    setAudioNoteUrl(null);
    setAudioNoteText("");
  };

  const handleDobChange = (value: string) => {
    setDob(value);
    if (!value) {
      setAge(null);
      return;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      setAge(null);
      return;
    }
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      years--;
    }
    if (years >= 0 && years < 200) {
      setAge(years);
    } else {
      setAge(null);
    }
  };

  const handleAddFamilyMember = () => {
    setFamilyMembers((prev) => [
      ...prev,
      {
        id: genId(),
        name: "",
        mobile: "",
        mobileVerified: false,
        otp: "",
        otpSent: false,
      },
    ]);
  };

  const handleUpdateFamilyMember = (id: string, patch: Partial<FamilyMemberForm>) => {
    setFamilyMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFamilyMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setCurrentLatitude(lat);
        setCurrentLongitude(lng);
        setCurrentLocationLabel(`Lat ${lat}, Lng ${lng}`);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  type OcrDocType = "aadhaarFront" | "aadhaarBack" | "voterId";
  const isOcrTooWeak = (type: OcrDocType, result: OcrResult | null): boolean => {
    if (!result || typeof result !== "object") return true;
    const str = (v: any) => (v && typeof v === "string" ? v.trim() : "");
    if (type === "aadhaarFront") {
      const name = str(result.name);
      const num = str(result.aadhaarNumber).replace(/\s/g, "");
      return name.length < 2 || num.length < 10 || !/^\d+$/.test(num);
    }
    if (type === "aadhaarBack") {
      const addr = str(result.address);
      return addr.length < 15;
    }
    if (type === "voterId") {
      const vid = str(result.voterId);
      const name = str(result.name);
      return vid.length < 8 || name.length < 2;
    }
    return true;
  };

  const handlePhotoCapture = async (
    setter: (v: string | null) => void,
    ref: React.RefObject<HTMLInputElement | null>,
    ocrType: OcrDocType,
    setOcr: (v: OcrResult | null) => void
  ) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setter(base64);
      if (ocrType) {
        try {
          const result = await processImage(ocrType, base64);
          const weak = !result || isOcrTooWeak(ocrType, result);
          if (weak) {
            setter(null);
            setOcr(null);
            toast({
              title: language === "hi" ? "छवि साफ नहीं है" : language === "pa" ? "ਚਿੱਤਰ ਸਾਫ਼ ਨਹੀਂ" : "Image not clear",
              description: language === "hi"
                ? "OCR डेटा नहीं पढ़ सका। कृपया साफ़ छवि कैप्चर या अपलोड करें। पिछली छवि हटा दी गई है।"
                : language === "pa"
                  ? "OCR ਡਾਟਾ ਨਹੀਂ ਪੜ੍ਹ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਸਾਫ਼ ਚਿੱਤਰ ਕੈਪਚਰ ਜਾਂ ਅੱਪਲੋਡ ਕਰੋ। ਪਿਛਲੀ ਚਿੱਤਰ ਹਟਾ ਦਿੱਤੀ ਗਈ।"
                  : "Could not read text from image (blur or unclear). Please capture or upload a clear image. The previous image has been removed.",
              variant: "destructive",
            });
          } else {
            setOcr(result);
          }
        } catch {
          setter(null);
          setOcr(null);
          toast({
            title: language === "hi" ? "छवि साफ नहीं है" : language === "pa" ? "ਚਿੱਤਰ ਸਾਫ਼ ਨਹੀਂ" : "Image not clear",
            description: language === "hi"
              ? "कृपया साफ़ छवि कैप्चर या अपलोड करें। पिछली छवि हटा दी गई है।"
              : language === "pa"
                ? "ਕਿਰਪਾ ਕਰਕੇ ਸਾਫ਼ ਚਿੱਤਰ ਕੈਪਚਰ ਜਾਂ ਅੱਪਲੋਡ ਕਰੋ। ਪਿਛਲੀ ਚਿੱਤਰ ਹਟਾ ਦਿੱਤੀ ਗਈ।"
                : "Please capture or upload a clear image. The previous image has been removed.",
            variant: "destructive",
          });
        }
      }
      if (ref.current) ref.current.value = "";
    } catch {
      setter(null);
      setOcr(null);
      if (ref.current) ref.current.value = "";
    }
  };

  const startAudioRecording = () => {
    chunksRef.current = [];
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          setAudioNoteUrl(reader.result as string);
          setRecording(false);
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      setRecording(true);
    });

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = language === "hi" ? "hi-IN" : language === "pa" ? "pa-IN" : "hi-IN";
      let fullText = "";
      recog.onresult = (event: any) => {
        let text = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        fullText += text;
        setAudioNoteText((prev) => (prev ? prev + " " + text : text));
      };
      recog.onerror = () => {
        speechRecognitionRef.current = null;
      };
      recog.onend = () => {
        if (!fullText && !audioNoteText) {
          setAudioNoteText("");
        }
        speechRecognitionRef.current = null;
      };
      speechRecognitionRef.current = recog;
      try {
        recog.start();
      } catch {
        speechRecognitionRef.current = null;
      }
    }
  };

  const stopAudioRecording = () => {
    mediaRecorderRef.current?.stop();
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  };

  const handleEdit = (req: TirthYatraRequest) => {
    setEditingId(req.id);
    setStep("form");
    setSelectedVillageId(req.villageId || "");
    setSelectedVillageName(req.villageName || "");
    setApplicantName(req.applicantName || "");
    setMobileNumber(req.mobileNumber || "");
    setMobileVerified(!!req.mobileVerified);
    setDob(req.dob ? req.dob.toString().slice(0, 10) : "");
    setAge(req.age ?? null);
    setGender((req.gender as Gender) || "");
    setWithFamily(req.withFamily ? "with" : "without");
    const fam = Array.isArray(req.familyMembers) ? (req.familyMembers as any[]) : [];
    setFamilyMembers(
      fam.map((m, idx) => ({
        id: `${req.id}_${idx}`,
        name: m?.name || "",
        mobile: m?.mobileNumber || "",
        mobileVerified: !!m?.mobileVerified,
        otp: "",
        otpSent: false,
      }))
    );
    setCurrentLocationLabel(req.currentLocationLabel || "");
    setCurrentLatitude(req.currentLatitude || "");
    setCurrentLongitude(req.currentLongitude || "");
    setDestination((req.destination as Destination) || "");
    setDestinationOther(req.destinationOther || "");
    setStartDate(req.startDate ? req.startDate.toString().slice(0, 10) : "");
    setEndDate(req.endDate ? req.endDate.toString().slice(0, 10) : "");
    setAadhaarFront(req.aadhaarFrontUrl || null);
    setAadhaarBack(req.aadhaarBackUrl || null);
    setVoterCard(req.voterCardUrl || null);
    try {
      if (req.ocrAadhaarText && typeof req.ocrAadhaarText === "string") {
        const parsed = JSON.parse(req.ocrAadhaarText) as { front?: OcrResult; back?: OcrResult };
        setOcrAadhaarFront(parsed.front || null);
        setOcrAadhaarBack(parsed.back || null);
      } else {
        setOcrAadhaarFront(null);
        setOcrAadhaarBack(null);
      }
    } catch {
      setOcrAadhaarFront(null);
      setOcrAadhaarBack(null);
    }
    try {
      if (req.ocrVoterText && typeof req.ocrVoterText === "string") {
        setOcrVoter(JSON.parse(req.ocrVoterText) as OcrResult);
      } else {
        setOcrVoter(null);
      }
    } catch {
      setOcrVoter(null);
    }
    setAudioNoteUrl(req.audioNoteUrl || null);
    setAudioNoteText(req.audioNoteText || "");
  };

  if (step === "description") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setLocation("/app")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-base">
              {language === "hi" ? "तीर्थ यात्रा" : language === "pa" ? "ਤੀਰਥ ਯਾਤਰਾ" : "Tirth Yatra"}
            </h1>
            <p className="text-xs text-emerald-50">
              {language === "hi"
                ? "तीर्थ यात्रा के लिए आवेदन भरें"
                : language === "pa"
                ? "ਤੀਰਥ ਯਾਤਰਾ ਲਈ ਅਰਜ਼ੀ ਭਰੋ"
                : "Submit request for pilgrimage journey"}
            </p>
          </div>
        </header>
        <main className="px-4 py-4 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm text-slate-700">
              <p>
                {language === "hi"
                  ? "इस फॉर्म के माध्यम से आप या आपका परिवार तीर्थ यात्रा के लिए आवेदन कर सकते हैं। सभी आवश्यक विवरण ठीक से भरें ताकि प्रशासन आपकी मदद कर सके।"
                  : language === "pa"
                  ? "ਇਸ ਫਾਰਮ ਰਾਹੀਂ ਤੁਸੀਂ ਜਾਂ ਤੁਹਾਡਾ ਪਰਿਵਾਰ ਤੀਰਥ ਯਾਤਰਾ ਲਈ ਅਰਜ਼ੀ ਦੇ ਸਕਦੇ ਹੋ। ਸਾਰੇ ਵੇਰਵੇ ਠੀਕ ਤਰੀਕੇ ਨਾਲ ਭਰੋ ਤਾਂ ਜੋ ਪ੍ਰਸ਼ਾਸਨ ਤੁਹਾਡੀ ਮਦਦ ਕਰ ਸਕੇ।"
                  : "Use this form to request support for a Tirth Yatra (pilgrimage) for yourself or your family. Please fill all details carefully so the admin can review and support."}
              </p>
              <Button className="w-full mt-2" onClick={() => setStep("select_unit")}>
                <ChevronRight className="h-4 w-4 mr-2" />
                {language === "hi" ? "आवेदन शुरू करें" : language === "pa" ? "ਅਰਜ਼ੀ ਸ਼ੁਰੂ ਕਰੋ" : "Start application"}
              </Button>
            </CardContent>
          </Card>
          {myRequests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  {language === "hi" ? "मेरी पूर्व आवेदन" : language === "pa" ? "ਮੇਰੀਆਂ ਪੁਰਾਣੀਆਂ ਅਰਜ਼ੀਆਂ" : "My previous requests"}
                </h2>
              </div>
              <div className="space-y-2">
                {myRequests.map((req) => {
                  const canEdit = req.status === "pending";
                  const title = req.destinationOther || req.destination || "";
                  return (
                    <Card key={req.id} className="overflow-hidden">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {req.applicantName} – {title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {req.startDate
                              ? new Date(req.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={req.status === "accepted" ? "default" : req.status === "rejected" ? "destructive" : "outline"}>
                            {req.status}
                          </Badge>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleEdit(req)}
                              className="text-xs text-emerald-700 flex items-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              {language === "hi" ? "संपादित करें" : language === "pa" ? "ਸੋਧੋ" : "Edit"}
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (step === "select_unit") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setStep("description")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-base">
              {language === "hi" ? "यूनिट चुनें" : language === "pa" ? "ਯੂਨਿਟ ਚੁਣੋ" : "Select unit"}
            </h1>
            <p className="text-xs text-emerald-50">
              {language === "hi"
                ? "जहाँ से यात्रा होगी वह यूनिट चुनें"
                : language === "pa"
                ? "ਜਿੱਥੋਂ ਯਾਤਰਾ ਹੋਵੇਗੀ ਉਹ ਯੂਨਿਟ ਚੁਣੋ"
                : "Choose the unit from which the yatra is planned"}
            </p>
          </div>
        </header>
        <main className="flex-1 p-4">
          <UnitSelector
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("form");
            }}
            title={language === "hi" ? "यूनिट चुनें" : language === "pa" ? "ਯੂਨਿਟ ਚੁਣੋ" : "Select Unit"}
            subtitle={language === "hi" ? "जिस गाँव/वार्ड से यात्रा होगी वह चुनें" : language === "pa" ? "ਜਿੱਥੋਂ ਯਾਤਰਾ ਹੋਵੇਗੀ ਉਹ ਯੂਨਿਟ ਚੁਣੋ" : "Choose a village/ward to work in"}
            defaultVillageId={user?.mappedAreaId || undefined}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setStep("select_unit")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="font-semibold text-base truncate">
            {language === "hi" ? "तीर्थ यात्रा फॉर्म" : language === "pa" ? "ਤੀਰਥ ਯਾਤਰਾ ਫਾਰਮ" : "Tirth Yatra form"}
          </h1>
          <p className="text-xs text-emerald-50 truncate">
            {selectedVillageName
              ? selectedVillageName
              : language === "hi"
              ? "पहले यूनिट चुनें"
              : language === "pa"
              ? "ਪਹਿਲਾਂ ਯੂਨਿਟ ਚੁਣੋ"
              : "Please select unit first"}
          </p>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 space-y-4 pb-24">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "आवेदक का नाम" : language === "pa" ? "ਅਰਜ਼ੀਕਰਤਾ ਦਾ ਨਾਮ" : "Applicant name"}
                </label>
                <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center justify-between">
                  <span>
                    {language === "hi" ? "मोबाइल नंबर" : language === "pa" ? "ਮੋਬਾਈਲ ਨੰਬਰ" : "Mobile number"}
                  </span>
                  {mobileVerified && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {language === "hi" ? "वेरिफाइड" : language === "pa" ? "ਪੁਸ਼ਟ" : "Verified"}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      setMobileVerified(false);
                      setOtp("");
                      setOtpSent(false);
                    }}
                    className="flex-1"
                    inputMode="tel"
                    maxLength={14}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      sendOtp(
                        mobileNumber,
                        () => setOtpSent(true),
                        () => setOtpSent(false)
                      )
                    }
                    disabled={!isIndianMobile(mobileNumber)}
                  >
                    {otpSent ? "Resend OTP" : "Send OTP"}
                  </Button>
                </div>
                {otpSent && !mobileVerified && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="flex-1"
                      placeholder="Enter OTP"
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        verifyOtp(
                          mobileNumber,
                          otp,
                          () => setMobileVerified(true),
                          () => setMobileVerified(false)
                        )
                      }
                    >
                      Verify
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "जन्म तिथि" : language === "pa" ? "ਜਨਮ ਤਾਰੀਖ" : "Date of birth"}
                </label>
                <Input type="date" value={dob} onChange={(e) => handleDobChange(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "आयु (स्वतः)" : language === "pa" ? "ਉਮਰ (ਆਟੋ)" : "Age (auto)"}
                </label>
                <Input value={age != null ? String(age) : ""} readOnly />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "लिंग" : language === "pa" ? "ਲਿੰਗ" : "Gender"}
                </label>
                <select
                  className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                >
                  <option value="">{language === "hi" ? "चुनें" : language === "pa" ? "ਚੁਣੋ" : "Select"}</option>
                  <option value="male">{language === "hi" ? "पुरुष" : language === "pa" ? "ਪੁਰਸ਼" : "Male"}</option>
                  <option value="female">{language === "hi" ? "महिला" : language === "pa" ? "ਇਸਤਰੀ" : "Female"}</option>
                  <option value="other">{language === "hi" ? "अन्य" : language === "pa" ? "ਹੋਰ" : "Other"}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "परिवार के साथ?" : language === "pa" ? "ਪਰਿਵਾਰ ਨਾਲ?" : "With family?"}
                </label>
                <select
                  className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                  value={withFamily}
                  onChange={(e) => setWithFamily(e.target.value as any)}
                >
                  <option value="">{language === "hi" ? "चुनें" : language === "pa" ? "ਚੁਣੋ" : "Select"}</option>
                  <option value="without">
                    {language === "hi" ? "बिना परिवार" : language === "pa" ? "ਬਿਨਾਂ ਪਰਿਵਾਰ" : "Without family"}
                  </option>
                  <option value="with">
                    {language === "hi" ? "परिवार के साथ" : language === "pa" ? "ਪਰਿਵਾਰ ਨਾਲ" : "With family"}
                  </option>
                </select>
              </div>
            </div>

            {withFamily === "with" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">
                    {language === "hi" ? "परिवार के सदस्य" : language === "pa" ? "ਪਰਿਵਾਰਕ ਮੈਂਬਰ" : "Family members"}
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddFamilyMember}>
                    + {language === "hi" ? "जोड़ें" : language === "pa" ? "ਜੋੜੋ" : "Add"}
                  </Button>
                </div>
                {familyMembers.length === 0 && (
                  <p className="text-xs text-slate-500">
                    {language === "hi"
                      ? "परिवार के साथ यात्रा करने वालों की जानकारी जोड़ें।"
                      : language === "pa"
                      ? "ਪਰਿਵਾਰ ਦੇ ਉਹ ਮੈਂਬਰ ਜੋ ਯਾਤਰਾ ਕਰ ਰਹੇ ਹਨ, ਉਨ੍ਹਾਂ ਦੀ ਜਾਣਕਾਰੀ ਜੋੜੋ।"
                      : "Add details of family members who will travel with you."}
                  </p>
                )}
                {familyMembers.map((m) => (
                  <div key={m.id} className="border border-slate-200 rounded-md p-2 space-y-2">
                    <div className="flex justify-between gap-2">
                      <Input
                        className="flex-1"
                        placeholder={language === "hi" ? "नाम" : language === "pa" ? "ਨਾਮ" : "Name"}
                        value={m.name}
                        onChange={(e) => handleUpdateFamilyMember(m.id, { name: e.target.value })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveFamilyMember(m.id)}>
                        ×
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="flex-1"
                        placeholder={language === "hi" ? "मोबाइल" : language === "pa" ? "ਮੋਬਾਈਲ" : "Mobile"}
                        value={m.mobile}
                        inputMode="tel"
                        onChange={(e) => handleUpdateFamilyMember(m.id, { mobile: e.target.value, mobileVerified: false, otp: "", otpSent: false })}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          sendOtp(
                            m.mobile,
                            () => handleUpdateFamilyMember(m.id, { otpSent: true }),
                            () => handleUpdateFamilyMember(m.id, { otpSent: false })
                          )
                        }
                        disabled={!isIndianMobile(m.mobile)}
                      >
                        {m.otpSent ? "Resend" : "OTP"}
                      </Button>
                    </div>
                    {m.otpSent && !m.mobileVerified && (
                      <div className="flex gap-2 mt-1">
                        <Input
                          className="flex-1"
                          placeholder="OTP"
                          inputMode="numeric"
                          value={m.otp}
                          onChange={(e) => handleUpdateFamilyMember(m.id, { otp: e.target.value })}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            verifyOtp(
                              m.mobile,
                              m.otp,
                              () => handleUpdateFamilyMember(m.id, { mobileVerified: true }),
                              () => handleUpdateFamilyMember(m.id, { mobileVerified: false })
                            )
                          }
                        >
                          Verify
                        </Button>
                      </div>
                    )}
                    {m.mobileVerified && (
                      <p className="text-[10px] text-emerald-600 mt-1">
                        {language === "hi" ? "मोबाइल वेरिफाइड" : language === "pa" ? "ਮੋਬਾਈਲ ਪੁਸ਼ਟ" : "Mobile verified"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {language === "hi" ? "वर्तमान स्थान" : language === "pa" ? "ਮੌਜੂਦਾ ਸਥਾਨ" : "Current location"}
                </label>
                <Textarea
                  value={currentLocationLabel}
                  onChange={(e) => setCurrentLocationLabel(e.target.value)}
                  rows={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 inline-flex items-center gap-1"
                  onClick={handleGetCurrentLocation}
                >
                  <MapPin className="h-3 w-3" />
                  {language === "hi" ? "मेरा स्थान उपयोग करें" : language === "pa" ? "ਮੇਰਾ ਸਥਾਨ ਵਰਤੋਂ" : "Use my location"}
                </Button>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {language === "hi" ? "तीर्थ स्थल" : language === "pa" ? "ਤੀਰਥ ਸਥਾਨ" : "Tirth place"}
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value as Destination)}
                  >
                    <option value="">{language === "hi" ? "चुनें" : language === "pa" ? "ਚੁਣੋ" : "Select"}</option>
                    <option value="kashi_vishwanath">Kashi Vishwanath</option>
                    <option value="vaishno_devi">Vaishno Devi</option>
                    <option value="kedarnath">Kedarnath</option>
                    <option value="amarnath">Amarnath</option>
                    <option value="haridwar">Haridwar</option>
                    <option value="other">{language === "hi" ? "अन्य" : language === "pa" ? "ਹੋਰ" : "Other"}</option>
                  </select>
                </div>
                {destination === "other" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {language === "hi" ? "अन्य तीर्थ स्थल का नाम" : language === "pa" ? "ਹੋਰ ਤੀਰਥ ਸਥਾਨ ਦਾ ਨਾਮ" : "Other tirth place"}
                    </label>
                    <Input value={destinationOther} onChange={(e) => setDestinationOther(e.target.value)} />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {language === "hi" ? "कब जाना है" : language === "pa" ? "ਕਦੋਂ ਜਾਣਾ ਹੈ" : "Departure date"}
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {language === "hi" ? "कब आना है" : language === "pa" ? "ਕਦੋਂ ਆਉਣਾ ਹੈ" : "Return date"}
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700">
              {language === "hi" ? "दस्तावेज़ अपलोड" : language === "pa" ? "ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ" : "Documents upload"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "आधार कार्ड फ्रंट" : language === "pa" ? "ਆਧਾਰ ਕਾਰਡ ਫਰੰਟ" : "Aadhaar front"}
                </label>
                <Input
                  ref={aadhaarFrontRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={!!processingType}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoCapture(setAadhaarFront, aadhaarFrontRef, "aadhaarFront", setOcrAadhaarFront);
                  }}
                />
                {(processingType === "aadhaarFront" && (
                  <span className="text-xs text-slate-500 mt-1 block">Reading...</span>
                )) || (aadhaarFront && <img src={aadhaarFront} alt="" className="mt-1 h-20 rounded border object-cover" />)}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "आधार कार्ड बैक" : language === "pa" ? "ਆਧਾਰ ਕਾਰਡ ਬੈਕ" : "Aadhaar back"}
                </label>
                <Input
                  ref={aadhaarBackRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={!!processingType}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoCapture(setAadhaarBack, aadhaarBackRef, "aadhaarBack", setOcrAadhaarBack);
                  }}
                />
                {(processingType === "aadhaarBack" && (
                  <span className="text-xs text-slate-500 mt-1 block">Reading...</span>
                )) || (aadhaarBack && <img src={aadhaarBack} alt="" className="mt-1 h-20 rounded border object-cover" />)}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "hi" ? "वोटर कार्ड" : language === "pa" ? "ਵੋਟਰ ਕਾਰਡ" : "Voter card"}
                </label>
                <Input
                  ref={voterCardRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={!!processingType}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoCapture(setVoterCard, voterCardRef, "voterId", setOcrVoter);
                  }}
                />
                {(processingType === "voterId" && (
                  <span className="text-xs text-slate-500 mt-1 block">Reading...</span>
                )) || (voterCard && <img src={voterCard} alt="" className="mt-1 h-20 rounded border object-cover" />)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Mic className="h-3 w-3" />
              {language === "hi" ? "ऑडियो नोट" : language === "pa" ? "ਆਡੀਓ ਨੋਟ" : "Audio note"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={recording ? "destructive" : "outline"}
                size="icon"
                onClick={() => {
                  if (recording) {
                    stopAudioRecording();
                  } else {
                    startAudioRecording();
                  }
                }}
              >
                {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <p className="text-xs text-slate-600">
                {recording
                  ? language === "hi"
                    ? "बोलते रहें, रिकॉर्ड हो रहा है..."
                    : language === "pa"
                    ? "ਬੋਲਦੇ ਰਹੋ, ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ..."
                    : "Recording... speak your note"
                  : language === "hi"
                  ? "बटन दबाकर ऑडियो नोट रिकॉर्ड करें"
                  : language === "pa"
                  ? "ਬਟਨ ਦਬਾ ਕੇ ਆਡੀਓ ਨੋਟ ਰਿਕਾਰਡ ਕਰੋ"
                  : "Tap to record an audio note"}
              </p>
            </div>
            {audioNoteUrl && (
              <audio controls src={audioNoteUrl} className="w-full mt-2">
                Your browser does not support audio playback.
              </audio>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {language === "hi"
                  ? "ऑडियो से स्वतः टेक्स्ट (आप संपादित कर सकते हैं)"
                  : language === "pa"
                  ? "ਆਡੀਓ ਤੋਂ ਆਟੋ ਟੈਕਸਟ (ਤੁਸੀਂ ਸੋਧ ਸਕਦੇ ਹੋ)"
                  : "Auto text from audio (you can edit)"}
              </label>
              <Textarea
                value={audioNoteText}
                onChange={(e) => setAudioNoteText(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          {language === "hi"
            ? "सभी जानकारी सही भरें।"
            : language === "pa"
            ? "ਸਾਰੀ ਜਾਣਕਾਰੀ ਠੀਕ ਤਰੀਕੇ ਨਾਲ ਭਰੋ।"
            : "Please ensure all information is correct."}
        </div>
        <Button
          type="button"
          onClick={() => submitMutation.mutate()}
          disabled={
            submitMutation.isPending ||
            !applicantName.trim() ||
            !mobileNumber.trim() ||
            !mobileVerified ||
            !destination
          }
          className="inline-flex items-center gap-2"
        >
          {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingId
            ? language === "hi"
              ? "अपडेट करें"
              : language === "pa"
              ? "ਅੱਪਡੇਟ ਕਰੋ"
              : "Update"
            : language === "hi"
            ? "सबमिट करें"
            : language === "pa"
            ? "ਸਬਮਿਟ ਕਰੋ"
            : "Submit"}
        </Button>
      </footer>
    </div>
  );
}

