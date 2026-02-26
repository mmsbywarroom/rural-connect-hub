import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getLocalizedText, useTranslation, type Language } from "@/lib/i18n";
import { ArrowLeft, ChevronRight, Smile, Frown, Mic, MicOff, Play, Square, Trash2, Send, CheckCircle, Loader2 } from "lucide-react";
import { Heart, HeartCrack } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser } from "@shared/schema";
import { Input } from "@/components/ui/input";

interface Props {
  user: AppUser;
}

type Step = "type_select" | "select_unit" | "form" | "submitted";
type SdskType = "sukh" | "dukh";

interface SdskCategory {
  id: string;
  name: string;
  nameHi?: string | null;
  namePa?: string | null;
  type: string;
  isActive: boolean;
}

interface SdskSubmission {
  id: string;
  type: string;
  categoryName?: string | null;
  description?: string | null;
  status: string;
  createdAt?: string | null;
  selectedVillageId?: string | null;
  selectedVillageName?: string | null;
}

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Sukh-Dukh Saanjha Karo", hi: "सुख-दुख सांझा करो", pa: "ਸੁੱਖ-ਦੁੱਖ ਸਾਂਝਾ ਕਰੋ" },
  selectType: { en: "What would you like to share?", hi: "आप क्या साझा करना चाहेंगे?", pa: "ਤੁਸੀਂ ਕੀ ਸਾਂਝਾ ਕਰਨਾ ਚਾਹੋਗੇ?" },
  sukh: { en: "Sukh (Joy)", hi: "सुख (खुशी)", pa: "ਸੁੱਖ (ਖੁਸ਼ੀ)" },
  sukhDesc: { en: "Share a happy moment or celebration", hi: "एक खुशी का पल या उत्सव साझा करें", pa: "ਇੱਕ ਖੁਸ਼ੀ ਦਾ ਪਲ ਜਾਂ ਜਸ਼ਨ ਸਾਂਝਾ ਕਰੋ" },
  dukh: { en: "Dukh (Sorrow)", hi: "दुख (दर्द)", pa: "ਦੁੱਖ (ਦਰਦ)" },
  dukhDesc: { en: "Share a difficulty or need help", hi: "कोई कठिनाई साझा करें या सहायता मांगें", pa: "ਕੋਈ ਮੁਸ਼ਕਲ ਸਾਂਝੀ ਕਰੋ ਜਾਂ ਮਦਦ ਮੰਗੋ" },
  selectUnit: { en: "Select Unit", hi: "इकाई चुनें", pa: "ਯੂਨਿਟ ਚੁਣੋ" },
  selectUnitSubtitle: { en: "Choose the village/ward", hi: "गांव/वार्ड चुनें", pa: "ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  verifyMobile: { en: "Verify Mobile Number", hi: "मोबाइल नंबर सत्यापित करें", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
  verifyMobileSubtitle: { en: "Enter mobile number to verify via OTP", hi: "OTP से सत्यापन के लिए मोबाइल नंबर दर्ज करें", pa: "OTP ਰਾਹੀਂ ਤਸਦੀਕ ਲਈ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterMobile: { en: "Enter 10-digit mobile number", hi: "10 अंकों का मोबाइल नंबर दर्ज करें", pa: "10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter 4-digit OTP", hi: "4 अंकों का OTP दर्ज करें", pa: "4 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें", pa: "OTP ਤਸਦੀਕ ਕਰੋ" },
  otpSentTo: { en: "OTP sent to", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpVerified: { en: "Mobile number verified!", hi: "मोबाइल नंबर सत्यापित!", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ!" },
  invalidOtp: { en: "Invalid or expired OTP", hi: "अमान्य या समाप्त OTP", pa: "ਅਵੈਧ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ OTP" },
  failedToSendOtp: { en: "Failed to send OTP", hi: "OTP भेजने में विफल", pa: "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ" },
  submissionFailed: { en: "Submission failed", hi: "जमा करने में विफल", pa: "ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" },
  micDenied: { en: "Microphone access denied", hi: "माइक्रोफोन अनुमति अस्वीकृत", pa: "ਮਾਈਕ੍ਰੋਫੋਨ ਪਹੁੰਚ ਅਸਵੀਕਾਰ" },
  verified: { en: "Verified", hi: "सत्यापित", pa: "ਤਸਦੀਕਿਤ" },
  acceptNoteLabel: { en: "Accept Note", hi: "स्वीकृति नोट", pa: "ਸਵੀਕ੍ਰਿਤੀ ਨੋਟ" },
  closeNoteLabel: { en: "Close Note", hi: "समापन नोट", pa: "ਸਮਾਪਤੀ ਨੋਟ" },
  categorySukh: { en: "Type of joyful occasion", hi: "सुख का प्रकार", pa: "ਖੁਸ਼ੀ ਦੀ ਕਿਸਮ" },
  categoryDukh: { en: "Type of sorrowful occasion", hi: "दुख का प्रकार", pa: "ਦੁੱਖ ਦੀ ਕਿਸਮ" },
  selectCategory: { en: "Select category", hi: "श्रेणी चुनें", pa: "ਸ਼੍ਰੇਣੀ ਚੁਣੋ" },
  descriptionSukh: { en: "Details about the joyful occasion", hi: "सुख के बारे में विवरण", pa: "ਖੁਸ਼ੀ ਬਾਰੇ ਵੇਰਵਾ" },
  descriptionDukh: { en: "Details about the sorrowful occasion", hi: "दुख के बारे में विवरण", pa: "ਦੁੱਖ ਬਾਰੇ ਵੇਰਵਾ" },
  descriptionPlaceholderSukh: { en: "Describe the joyful occasion...", hi: "सुख के बारे में लिखें...", pa: "ਖੁਸ਼ੀ ਬਾਰੇ ਲਿਖੋ..." },
  descriptionPlaceholderDukh: { en: "Describe the sorrowful occasion...", hi: "दुख के बारे में लिखें...", pa: "ਦੁੱਖ ਬਾਰੇ ਲਿਖੋ..." },
  voiceNote: { en: "Voice Note", hi: "वॉइस नोट", pa: "ਵੌਇਸ ਨੋਟ" },
  record: { en: "Record", hi: "रिकॉर्ड", pa: "ਰਿਕਾਰਡ" },
  stop: { en: "Stop", hi: "रोकें", pa: "ਰੋਕੋ" },
  play: { en: "Play", hi: "सुनें", pa: "ਸੁਣੋ" },
  delete: { en: "Delete", hi: "हटाएं", pa: "ਹਟਾਓ" },
  submit: { en: "Submit", hi: "जमा करें", pa: "ਜਮ੍ਹਾਂ ਕਰੋ" },
  submitting: { en: "Submitting...", hi: "जमा हो रहा है...", pa: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ..." },
  submitted: { en: "Submitted Successfully!", hi: "सफलतापूर्वक जमा!", pa: "ਸਫਲਤਾਪੂਰਵਕ ਜਮ੍ਹਾਂ!" },
  submittedDesc: { en: "Your submission has been recorded", hi: "आपका आवेदन दर्ज हो गया है", pa: "ਤੁਹਾਡੀ ਅਰਜ਼ੀ ਦਰਜ ਹੋ ਗਈ ਹੈ" },
  submitAnother: { en: "Submit Another", hi: "एक और जमा करें", pa: "ਇੱਕ ਹੋਰ ਜਮ੍ਹਾਂ ਕਰੋ" },
  goHome: { en: "Go to Home", hi: "होम पर जाएं", pa: "ਹੋਮ 'ਤੇ ਜਾਓ" },
  back: { en: "Back", hi: "वापस", pa: "ਵਾਪਸ" },
  previousSubmissions: { en: "Your Submissions", hi: "आपकी जमा", pa: "ਤੁਹਾਡੇ ਜਮ੍ਹਾਂ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  accepted: { en: "Accepted", hi: "स्वीकृत", pa: "ਸਵੀਕਾਰ" },
  approved: { en: "Approved", hi: "स्वीकृत", pa: "ਮਨਜ਼ੂਰ" },
  closed: { en: "Closed", hi: "बंद", pa: "ਬੰਦ" },
  rejected: { en: "Rejected", hi: "अस्वीकृत", pa: "ਰੱਦ" },
  personNameSukh: { en: "Name of the person whose family has a joyful occasion", hi: "जिसके घर में सुख हुआ है उसका नाम", pa: "ਜਿਸ ਦੇ ਘਰ ਖੁਸ਼ੀ ਹੋਈ ਹੈ ਉਸ ਦਾ ਨਾਮ" },
  personNameDukh: { en: "Name of the person whose family has a sorrowful occasion", hi: "जिसके घर में दुख हुआ है उसका नाम", pa: "ਜਿਸ ਦੇ ਘਰ ਦੁੱਖ ਹੋਇਆ ਹੈ ਉਸ ਦਾ ਨਾਮ" },
  personNamePlaceholderSukh: { en: "Enter the name of the person", hi: "व्यक्ति का नाम दर्ज करें", pa: "ਵਿਅਕਤੀ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ" },
  personNamePlaceholderDukh: { en: "Enter the name of the person", hi: "व्यक्ति का नाम दर्ज करें", pa: "ਵਿਅਕਤੀ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ" },
  mobileNumberSukh: { en: "Mobile number of the person with joy", hi: "जिसके घर सुख हुआ है उसका मोबाइल नंबर", pa: "ਜਿਸ ਦੇ ਘਰ ਖੁਸ਼ੀ ਹੋਈ ਹੈ ਉਸ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ" },
  mobileNumberDukh: { en: "Mobile number of the person with sorrow", hi: "जिसके घर दुख हुआ है उसका मोबाइल नंबर", pa: "ਜਿਸ ਦੇ ਘਰ ਦੁੱਖ ਹੋਇਆ ਹੈ ਉਸ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ" },
  mobileNumberPlaceholder: { en: "Enter 10-digit mobile number", hi: "10 अंकों का मोबाइल नंबर", pa: "10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ" },
  nameRequired: { en: "Name is required", hi: "नाम आवश्यक है", pa: "ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  descriptionRequired: { en: "Description is required", hi: "विवरण आवश्यक है", pa: "ਵੇਰਵਾ ਲੋੜੀਂਦਾ ਹੈ" },
  categoryRequired: { en: "Please select a category", hi: "कृपया श्रेणी चुनें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਸ਼੍ਰੇਣੀ ਚੁਣੋ" },
  recording: { en: "Recording...", hi: "रिकॉर्ड हो रहा है...", pa: "ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  recorded: { en: "Voice note recorded", hi: "वॉइस नोट रिकॉर्ड", pa: "ਵੌਇਸ ਨੋਟ ਰਿਕਾਰਡ" },
};

function l(key: string, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as Record<string, string>)[lang] || entry.en;
}

export default function TaskSdsk({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("type_select");
  const [type, setType] = useState<SdskType | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [personName, setPersonName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: categories } = useQuery<SdskCategory[]>({
    queryKey: ["/api/sdsk/categories"],
    enabled: step === "form",
  });

  const filteredCategories = (categories || []).filter(
    (cat) => cat.isActive && (cat.type === type || cat.type === "both")
  );

  const { data: mySubmissions } = useQuery<SdskSubmission[]>({
    queryKey: ["/api/sdsk/my-submissions", user.id],
    enabled: !!selectedVillageId,
  });

  const filteredSubmissions = (mySubmissions || []).filter(
    (s) => s.selectedVillageId === selectedVillageId
  );

  const submitMutation = useMutation({
    mutationFn: async (voiceNote: string | null) => {
      const payload = {
        appUserId: user.id,
        type,
        categoryId,
        categoryName,
        selectedVillageId,
        selectedVillageName,
        personName,
        mobileNumber,
        mobileVerified,
        description,
        voiceNote,
        status: "pending",
      };
      const res = await apiRequest("POST", "/api/sdsk/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sdsk/my-submissions", user.id] });
      setStep("submitted");
    },
    onError: () => {
      toast({ title: l("submissionFailed", language), variant: "destructive" });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: l("micDenied", language), variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const playAudio = () => {
    if (audioUrl) {
      new Audio(audioUrl).play();
    }
  };

  const deleteAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async () => {
    if (!personName.trim()) {
      toast({ title: l("nameRequired", language), variant: "destructive" });
      return;
    }
    if (!categoryId) {
      toast({ title: l("categoryRequired", language), variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: l("descriptionRequired", language), variant: "destructive" });
      return;
    }
    let voiceNote: string | null = null;
    if (audioBlob) {
      voiceNote = await blobToBase64(audioBlob);
    }
    submitMutation.mutate(voiceNote);
  };

  const handleBack = () => {
    switch (step) {
      case "select_unit":
        setStep("type_select");
        break;
      case "form":
        setStep("select_unit");
        break;
      case "submitted":
        setStep("form");
        break;
      default:
        setLocation("/app");
    }
  };

  const resetForm = () => {
    setStep("type_select");
    setType(null);
    setSelectedVillageId("");
    setSelectedVillageName("");
    setPersonName("");
    setMobileNumber("");
    setMobileVerified(false);
    setCategoryId("");
    setCategoryName("");
    setDescription("");
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className={`${type === "dukh" ? "bg-red-600" : "bg-green-600"} text-white px-4 py-3 flex items-center gap-3`}>
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={step === "type_select" ? () => setLocation("/app") : handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold" data-testid="text-sdsk-title">{l("title", language)}</h1>
      </header>

      <div className="p-4 space-y-4">
        {step === "type_select" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800" data-testid="text-select-type">
              {l("selectType", language)}
            </h2>

            <button
              className="w-full text-left"
              onClick={() => { setType("sukh"); setStep("select_unit"); }}
              data-testid="button-select-sukh"
            >
              <Card className="border-green-200 hover-elevate active-elevate-2">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <Smile className="h-7 w-7 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-green-700">{l("sukh", language)}</p>
                    <p className="text-sm text-slate-500">{l("sukhDesc", language)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Heart className="h-5 w-5 text-green-400" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </CardContent>
              </Card>
            </button>

            <button
              className="w-full text-left"
              onClick={() => { setType("dukh"); setStep("select_unit"); }}
              data-testid="button-select-dukh"
            >
              <Card className="border-red-200 hover-elevate active-elevate-2">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <Frown className="h-7 w-7 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-red-700">{l("dukh", language)}</p>
                    <p className="text-sm text-slate-500">{l("dukhDesc", language)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <HeartCrack className="h-5 w-5 text-red-400" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </CardContent>
              </Card>
            </button>
          </div>
        )}

        {step === "select_unit" && (
          <UnitSelector
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("form");
            }}
            title={l("selectUnit", language)}
            subtitle={l("selectUnitSubtitle", language)}
            defaultVillageId={user.mappedAreaId || undefined}
          />
        )}

        {step === "form" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Badge className={type === "sukh" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {type === "sukh" ? l("sukh", language) : l("dukh", language)}
              </Badge>
              <span className="text-sm text-slate-500">{selectedVillageName}</span>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l(type === "sukh" ? "personNameSukh" : "personNameDukh", language)} *</label>
                  <Input
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder={l(type === "sukh" ? "personNamePlaceholderSukh" : "personNamePlaceholderDukh", language)}
                    data-testid="input-person-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l(type === "sukh" ? "mobileNumberSukh" : "mobileNumberDukh", language)}</label>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={l("mobileNumberPlaceholder", language)}
                    data-testid="input-form-mobile"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l(type === "sukh" ? "categorySukh" : "categoryDukh", language)}</label>
                  <Select
                    value={categoryId}
                    onValueChange={(val) => {
                      setCategoryId(val);
                      const cat = filteredCategories.find((c) => c.id === val);
                      if (cat) {
                        setCategoryName(getLocalizedText(language, cat.name, cat.nameHi, cat.namePa));
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder={l("selectCategory", language)} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} data-testid={`select-category-item-${cat.id}`}>
                          {getLocalizedText(language, cat.name, cat.nameHi, cat.namePa)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l(type === "sukh" ? "descriptionSukh" : "descriptionDukh", language)}</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={l(type === "sukh" ? "descriptionPlaceholderSukh" : "descriptionPlaceholderDukh", language)}
                    rows={4}
                    data-testid="textarea-description"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("voiceNote", language)}</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isRecording && !audioUrl && (
                      <Button
                        variant="outline"
                        onClick={startRecording}
                        data-testid="button-start-recording"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        {l("record", language)}
                      </Button>
                    )}
                    {isRecording && (
                      <Button
                        variant="outline"
                        onClick={stopRecording}
                        className="text-red-600 border-red-300"
                        data-testid="button-stop-recording"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        {l("stop", language)}
                      </Button>
                    )}
                    {isRecording && (
                      <span className="text-xs text-red-500 flex items-center gap-1" data-testid="text-recording">
                        <MicOff className="h-3 w-3 animate-pulse" />
                        {l("recording", language)}
                      </span>
                    )}
                    {audioUrl && !isRecording && (
                      <>
                        <Button
                          variant="outline"
                          onClick={playAudio}
                          data-testid="button-play-audio"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {l("play", language)}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={deleteAudio}
                          data-testid="button-delete-audio"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {l("delete", language)}
                        </Button>
                        <span className="text-xs text-green-600" data-testid="text-recorded">
                          {l("recorded", language)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {submitMutation.isPending ? l("submitting", language) : l("submit", language)}
                </Button>
              </CardContent>
            </Card>

            {filteredSubmissions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-600 px-1" data-testid="text-previous-submissions">
                  {l("previousSubmissions", language)} ({filteredSubmissions.length})
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {filteredSubmissions.map((sub) => (
                    <Card key={sub.id} data-testid={`sdsk-submission-${sub.id}`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {sub.categoryName || sub.type}
                            </p>
                            {sub.description && (
                              <p className="text-xs text-slate-500 truncate">{sub.description}</p>
                            )}
                            {sub.createdAt && (
                              <p className="text-xs text-slate-400">
                                {new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </p>
                            )}
                          </div>
                          <Badge className={statusColors[sub.status] || ""}>
                            {l(sub.status, language)}
                          </Badge>
                        </div>
                        {(sub as any).adminNote && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <p className="text-xs font-semibold text-blue-700 mb-0.5">
                              {l("acceptNoteLabel", language)}
                            </p>
                            <p className="text-xs text-blue-900">{(sub as any).adminNote}</p>
                            {(sub as any).acceptedAt && (
                              <p className="text-xs text-blue-500 mt-0.5">{new Date((sub as any).acceptedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                            )}
                          </div>
                        )}
                        {(sub as any).completionNote && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-2">
                            <p className="text-xs font-semibold text-gray-700 mb-0.5">
                              {l("closeNoteLabel", language)}
                            </p>
                            <p className="text-xs text-gray-900">{(sub as any).completionNote}</p>
                            {(sub as any).completedAt && (
                              <p className="text-xs text-gray-500 mt-0.5">{new Date((sub as any).completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "submitted" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${type === "sukh" ? "bg-green-100" : "bg-red-100"}`}>
              <CheckCircle className={`h-10 w-10 ${type === "sukh" ? "text-green-600" : "text-red-600"}`} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800" data-testid="text-submitted-title">
              {l("submitted", language)}
            </h2>
            <p className="text-sm text-slate-500 text-center" data-testid="text-submitted-desc">
              {l("submittedDesc", language)}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs pt-4">
              <Button
                onClick={resetForm}
                data-testid="button-submit-another"
              >
                {l("submitAnother", language)}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/app")}
                data-testid="button-go-home"
              >
                {l("goHome", language)}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
