import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Mic, MicOff, Play, Square, Trash2, Send, Loader2, Phone, CheckCircle, ChevronRight, Search, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, Issue, SunwaiComplaint, SunwaiLog } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "verify_mobile" | "select_unit" | "form";

interface ComplaintWithLogs extends SunwaiComplaint {
  logs: SunwaiLog[];
}

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Sunwai (Hearing)", hi: "सुनवाई", pa: "ਸੁਣਵਾਈ" },
  description: { en: "Sunwai is a complaint and grievance redressal system. Submit your complaints here and track their resolution progress.", hi: "सुनवाई एक शिकायत और समस्या निवारण प्रणाली है। यहां अपनी शिकायतें दर्ज करें और उनकी समाधान प्रगति को ट्रैक करें।", pa: "ਸੁਣਵਾਈ ਇੱਕ ਸ਼ਿਕਾਇਤ ਅਤੇ ਸਮੱਸਿਆ ਨਿਵਾਰਨ ਪ੍ਰਣਾਲੀ ਹੈ। ਇੱਥੇ ਆਪਣੀਆਂ ਸ਼ਿਕਾਇਤਾਂ ਦਰਜ ਕਰੋ ਅਤੇ ਉਨ੍ਹਾਂ ਦੀ ਹੱਲ ਪ੍ਰਗਤੀ ਨੂੰ ਟ੍ਰੈਕ ਕਰੋ।" },
  newComplaint: { en: "File New Complaint", hi: "नई शिकायत दर्ज करें", pa: "ਨਵੀਂ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ" },
  previousComplaints: { en: "Your Complaints", hi: "आपकी शिकायतें", pa: "ਤੁਹਾਡੀਆਂ ਸ਼ਿਕਾਇਤਾਂ" },
  verifyMobile: { en: "Verify Mobile Number", hi: "मोबाइल नंबर सत्यापित करें", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
  verifyMobileSubtitle: { en: "Enter complainant's mobile number to verify via OTP", hi: "OTP से सत्यापन के लिए शिकायतकर्ता का मोबाइल नंबर दर्ज करें", pa: "OTP ਰਾਹੀਂ ਤਸਦੀਕ ਲਈ ਸ਼ਿਕਾਇਤਕਰਤਾ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterMobile: { en: "Enter complainant's 10-digit mobile number", hi: "शिकायतकर्ता का 10 अंकों का मोबाइल नंबर दर्ज करें", pa: "ਸ਼ਿਕਾਇਤਕਰਤਾ ਦਾ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter 4-digit OTP", hi: "4 अंकों का OTP दर्ज करें", pa: "4 ਅੰਕਾਂ ਦਾ OTP ਦਰਜ ਕਰੋ" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें", pa: "OTP ਤਸਦੀਕ ਕਰੋ" },
  otpSentTo: { en: "OTP sent to", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpVerified: { en: "Mobile number verified!", hi: "मोबाइल नंबर सत्यापित!", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ!" },
  invalidOtp: { en: "Invalid or expired OTP", hi: "अमान्य या समाप्त OTP", pa: "ਅਵੈਧ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ OTP" },
  failedToSendOtp: { en: "Failed to send OTP", hi: "OTP भेजने में विफल", pa: "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ" },
  submissionFailed: { en: "Submission failed", hi: "जमा करने में विफल", pa: "ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" },
  micDenied: { en: "Microphone access denied", hi: "माइक्रोफोन अनुमति अस्वीकृत", pa: "ਮਾਈਕ੍ਰੋਫੋਨ ਪਹੁੰਚ ਅਸਵੀਕਾਰ" },
  selectUnit: { en: "Select Unit", hi: "इकाई चुनें", pa: "ਯੂਨਿਟ ਚੁਣੋ" },
  selectUnitSubtitle: { en: "Choose the village/ward for the complaint", hi: "शिकायत के लिए गांव/वार्ड चुनें", pa: "ਸ਼ਿਕਾਇਤ ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  complainantName: { en: "Complainant Name", hi: "शिकायतकर्ता का नाम", pa: "ਸ਼ਿਕਾਇਤਕਰਤਾ ਦਾ ਨਾਮ" },
  fatherHusbandName: { en: "Father/Husband Name", hi: "पिता/पति का नाम", pa: "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ" },
  mobileNumber: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ" },
  issueCategory: { en: "Issue Category", hi: "समस्या श्रेणी", pa: "ਮੁੱਦੇ ਦੀ ਸ਼੍ਰੇਣੀ" },
  selectCategory: { en: "Select issue category", hi: "समस्या श्रेणी चुनें", pa: "ਮੁੱਦੇ ਦੀ ਸ਼੍ਰੇਣੀ ਚੁਣੋ" },
  searchCategory: { en: "Search categories...", hi: "श्रेणियां खोजें...", pa: "ਸ਼੍ਰੇਣੀਆਂ ਖੋਜੋ..." },
  complaintNote: { en: "Complaint Details", hi: "शिकायत विवरण", pa: "ਸ਼ਿਕਾਇਤ ਵੇਰਵੇ" },
  complaintNotePlaceholder: { en: "Describe your complaint in detail...", hi: "अपनी शिकायत का विस्तार से वर्णन करें...", pa: "ਆਪਣੀ ਸ਼ਿਕਾਇਤ ਦਾ ਵਿਸਤਾਰ ਨਾਲ ਵਰਣਨ ਕਰੋ..." },
  audioNote: { en: "Voice Note (Optional)", hi: "वॉइस नोट (वैकल्पिक)", pa: "ਵੌਇਸ ਨੋਟ (ਵਿਕਲਪਿਕ)" },
  record: { en: "Record", hi: "रिकॉर्ड", pa: "ਰਿਕਾਰਡ" },
  recording: { en: "Recording...", hi: "रिकॉर्ड हो रहा है...", pa: "ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  recorded: { en: "Voice note recorded", hi: "वॉइस नोट रिकॉर्ड", pa: "ਵੌਇਸ ਨੋਟ ਰਿਕਾਰਡ" },
  stop: { en: "Stop", hi: "रोकें", pa: "ਰੋਕੋ" },
  play: { en: "Play", hi: "सुनें", pa: "ਸੁਣੋ" },
  delete: { en: "Delete", hi: "हटाएं", pa: "ਹਟਾਓ" },
  otherCategoryLabel: { en: "Please specify the category", hi: "कृपया श्रेणी बताएं", pa: "ਕਿਰਪਾ ਕਰਕੇ ਸ਼੍ਰੇਣੀ ਦੱਸੋ" },
  otherCategoryPlaceholder: { en: "Enter category name...", hi: "श्रेणी का नाम लिखें...", pa: "ਸ਼੍ਰੇਣੀ ਦਾ ਨਾਮ ਲਿਖੋ..." },
  otherCategoryRequired: { en: "Please specify the category", hi: "कृपया श्रेणी बताएं", pa: "ਕਿਰਪਾ ਕਰਕੇ ਸ਼੍ਰੇਣੀ ਦੱਸੋ" },
  submit: { en: "Submit Complaint", hi: "शिकायत जमा करें", pa: "ਸ਼ਿਕਾਇਤ ਜਮ੍ਹਾਂ ਕਰੋ" },
  submitting: { en: "Submitting...", hi: "जमा हो रहा है...", pa: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ..." },
  submitted: { en: "Complaint Submitted!", hi: "शिकायत दर्ज हो गई!", pa: "ਸ਼ਿਕਾਇਤ ਦਰਜ ਹੋ ਗਈ!" },
  back: { en: "Back", hi: "वापस", pa: "ਵਾਪਸ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  accepted: { en: "Accepted", hi: "स्वीकृत", pa: "ਮਨਜ਼ੂਰ" },
  "in-progress": { en: "In Progress", hi: "प्रगति में", pa: "ਪ੍ਰਗਤੀ ਵਿੱਚ" },
  completed: { en: "Completed", hi: "पूर्ण", pa: "ਪੂਰਾ" },
  expectedDays: { en: "Expected Resolution", hi: "अपेक्षित समाधान", pa: "ਅਨੁਮਾਨਿਤ ਹੱਲ" },
  days: { en: "days", hi: "दिन", pa: "ਦਿਨ" },
  journey: { en: "Journey", hi: "यात्रा", pa: "ਯਾਤਰਾ" },
  noComplaints: { en: "No complaints yet", hi: "अभी कोई शिकायत नहीं", pa: "ਅਜੇ ਕੋਈ ਸ਼ਿਕਾਇਤ ਨਹੀਂ" },
  nameRequired: { en: "Name is required", hi: "नाम आवश्यक है", pa: "ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  fatherNameRequired: { en: "Father/Husband name is required", hi: "पिता/पति का नाम आवश्यक है", pa: "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  categoryRequired: { en: "Please select an issue category", hi: "कृपया समस्या श्रेणी चुनें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਮੁੱਦੇ ਦੀ ਸ਼੍ਰੇਣੀ ਚੁਣੋ" },
  complaintRequired: { en: "Please describe your complaint", hi: "कृपया अपनी शिकायत का वर्णन करें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸ਼ਿਕਾਇਤ ਦਾ ਵਰਣਨ ਕਰੋ" },
  verified: { en: "Verified", hi: "सत्यापित", pa: "ਤਸਦੀਕਿਤ" },
};

function l(key: string, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as Record<string, string>)[lang] || entry.en;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  "in-progress": "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
};

const actionColors: Record<string, string> = {
  submitted: "border-yellow-400 bg-yellow-50",
  accepted: "border-blue-400 bg-blue-50",
  completed: "border-green-400 bg-green-50",
};

function JourneyTimeline({ logs, language }: { logs: SunwaiLog[]; language: string }) {
  if (!logs || logs.length === 0) return null;

  const sorted = [...logs].sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  return (
    <div className="space-y-0 mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">{l("journey", language)}</span>
      </div>
      <div className="relative pl-4 space-y-3">
        <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200" />
        {sorted.map((log, i) => (
          <div key={log.id} className="relative" data-testid={`journey-log-${log.id}`}>
            <div className={`absolute -left-4 top-1 w-3.5 h-3.5 rounded-full border-2 ${i === sorted.length - 1 ? "border-blue-500 bg-blue-100" : "border-slate-300 bg-white"}`} />
            <div className={`p-2 rounded-md border-l-2 ${actionColors[log.action] || "border-slate-300 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700 capitalize">{l(log.action, language)}</span>
                <span className="text-[10px] text-slate-400">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              {log.note && <p className="text-xs text-slate-600 mt-0.5">{log.note}</p>}
              {log.performedByName && <p className="text-[10px] text-slate-400 mt-0.5">{log.performedByName}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplaintCard({ complaint, language }: { complaint: ComplaintWithLogs; language: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-visible" data-testid={`complaint-card-${complaint.id}`}>
      <CardContent className="p-3 space-y-2">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-complaint-${complaint.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{complaint.complainantName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {complaint.villageName} &middot; {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
              </p>
            </div>
            <Badge className={statusColors[complaint.status] || ""}>
              {l(complaint.status, language)}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{complaint.complaintNote}</p>
        </button>

        {complaint.expectedDays && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <Clock className="h-3 w-3" />
            <span>{l("expectedDays", language)}: {complaint.expectedDays} {l("days", language)}</span>
          </div>
        )}

        {expanded && (
          <JourneyTimeline logs={complaint.logs} language={language} />
        )}

        <button
          className="text-xs text-blue-600 flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-toggle-journey-${complaint.id}`}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          {expanded ? l("back", language) : l("journey", language)}
        </button>
      </CardContent>
    </Card>
  );
}

export default function TaskSunwai({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("description");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");
  const [complainantName, setComplainantName] = useState("");
  const [fatherHusbandName, setFatherHusbandName] = useState("");
  const [issueCategoryId, setIssueCategoryId] = useState("");
  const [otherCategoryText, setOtherCategoryText] = useState("");
  const [issueCategorySearch, setIssueCategorySearch] = useState("");
  const [complaintNote, setComplaintNote] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: myComplaints } = useQuery<ComplaintWithLogs[]>({
    queryKey: ["/api/sunwai/my-complaints", user.id],
    enabled: !!user.id,
  });

  const { data: issuesList } = useQuery<Issue[]>({
    queryKey: ["/api/issues"],
    enabled: step === "form",
  });

  const activeIssues = useMemo(() => (issuesList || []).filter(i => i.isActive), [issuesList]);

  const filteredIssues = useMemo(() => {
    if (!issueCategorySearch.trim()) return activeIssues;
    const q = issueCategorySearch.toLowerCase();
    return activeIssues.filter(i => i.name.toLowerCase().includes(q));
  }, [activeIssues, issueCategorySearch]);

  const isOtherSelected = useMemo(() => {
    const selected = activeIssues.find(i => i.id === issueCategoryId);
    return selected?.name?.toLowerCase() === "other";
  }, [activeIssues, issueCategoryId]);

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sunwai/send-otp", { mobileNumber });
      return res.json();
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({ title: `${l("otpSentTo", language)} ${mobileNumber}` });
    },
    onError: () => {
      toast({ title: l("failedToSendOtp", language), variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sunwai/verify-otp", { mobileNumber, otp });
      return res.json();
    },
    onSuccess: () => {
      setMobileVerified(true);
      toast({ title: l("otpVerified", language) });
      setStep("select_unit");
    },
    onError: () => {
      toast({ title: l("invalidOtp", language), variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (audioNoteData: string | null) => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId,
        villageName: selectedVillageName,
        complainantName,
        fatherHusbandName,
        mobileNumber,
        mobileVerified,
        issueCategoryId: issueCategoryId || null,
        otherCategoryText: isOtherSelected ? otherCategoryText.trim() : null,
        complaintNote,
        audioNote: audioNoteData,
        status: "pending",
      };
      const res = await apiRequest("POST", "/api/sunwai/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sunwai/my-complaints", user.id] });
      toast({ title: l("submitted", language) });
      resetForm();
      setStep("description");
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
    if (!complainantName.trim()) {
      toast({ title: l("nameRequired", language), variant: "destructive" });
      return;
    }
    if (!fatherHusbandName.trim()) {
      toast({ title: l("fatherNameRequired", language), variant: "destructive" });
      return;
    }
    if (!issueCategoryId) {
      toast({ title: l("categoryRequired", language), variant: "destructive" });
      return;
    }
    if (isOtherSelected && !otherCategoryText.trim()) {
      toast({ title: l("otherCategoryRequired", language), variant: "destructive" });
      return;
    }
    if (!complaintNote.trim()) {
      toast({ title: l("complaintRequired", language), variant: "destructive" });
      return;
    }
    let audioNoteData: string | null = null;
    if (audioBlob) {
      audioNoteData = await blobToBase64(audioBlob);
    }
    submitMutation.mutate(audioNoteData);
  };

  const resetForm = () => {
    setMobileNumber("");
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
    setSelectedVillageId("");
    setSelectedVillageName("");
    setComplainantName("");
    setFatherHusbandName("");
    setIssueCategoryId("");
    setOtherCategoryText("");
    setIssueCategorySearch("");
    setComplaintNote("");
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleBack = () => {
    switch (step) {
      case "verify_mobile":
        setStep("description");
        break;
      case "select_unit":
        setStep("verify_mobile");
        break;
      case "form":
        setStep("select_unit");
        break;
      default:
        setLocation("/app");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-teal-600 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={step === "description" ? () => setLocation("/app") : handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold" data-testid="text-sunwai-title">{l("title", language)}</h1>
      </header>

      <div className="p-4 space-y-4">
        {step === "description" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800" data-testid="text-sunwai-heading">{l("title", language)}</h2>
                    <p className="text-sm text-slate-500 mt-1">{l("description", language)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={() => setStep("verify_mobile")}
              data-testid="button-new-complaint"
            >
              <Send className="h-4 w-4 mr-2" />
              {l("newComplaint", language)}
            </Button>

            {myComplaints && myComplaints.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider" data-testid="text-previous-complaints">
                    {l("previousComplaints", language)} ({myComplaints.length})
                  </h3>
                </div>
                {myComplaints.map((complaint) => (
                  <ComplaintCard key={complaint.id} complaint={complaint} language={language} />
                ))}
              </div>
            )}

            {myComplaints && myComplaints.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">{l("noComplaints", language)}</p>
              </div>
            )}
          </div>
        )}

        {step === "verify_mobile" && (
          <div className="space-y-4">
            <div className="px-1">
              <h2 className="text-lg font-semibold text-slate-800" data-testid="text-verify-mobile-title">
                {l("verifyMobile", language)}
              </h2>
              <p className="text-sm text-slate-500">{l("verifyMobileSubtitle", language)}</p>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <label className="text-sm font-medium text-slate-700">{l("enterMobile", language)}</label>
                  </div>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    data-testid="input-mobile-number"
                  />
                  <Button
                    className="w-full"
                    onClick={() => sendOtpMutation.mutate()}
                    disabled={mobileNumber.length !== 10 || sendOtpMutation.isPending}
                    data-testid="button-send-otp"
                  >
                    {sendOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {l("sendOtp", language)}
                  </Button>
                </div>

                {otpSent && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs text-green-600" data-testid="text-otp-sent">
                      {l("otpSentTo", language)} {mobileNumber}
                    </p>
                    <Input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder={l("enterOtp", language)}
                      data-testid="input-otp"
                    />
                    <Button
                      className="w-full"
                      onClick={() => verifyOtpMutation.mutate()}
                      disabled={otp.length !== 4 || verifyOtpMutation.isPending}
                      data-testid="button-verify-otp"
                    >
                      {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {l("verifyOtp", language)}
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>
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
            <div className="flex items-center gap-2 px-1 flex-wrap">
              <span className="text-sm text-slate-500">{selectedVillageName}</span>
              {mobileVerified && (
                <Badge className="bg-green-100 text-green-800" data-testid="badge-mobile-verified">
                  <CheckCircle className="h-3 w-3 mr-1" /> {l("verified", language)}
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("complainantName", language)} *</label>
                  <Input
                    value={complainantName}
                    onChange={(e) => setComplainantName(e.target.value)}
                    placeholder={l("complainantName", language)}
                    data-testid="input-complainant-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("fatherHusbandName", language)} *</label>
                  <Input
                    value={fatherHusbandName}
                    onChange={(e) => setFatherHusbandName(e.target.value)}
                    placeholder={l("fatherHusbandName", language)}
                    data-testid="input-father-husband-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("mobileNumber", language)}</label>
                  <Input
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    disabled={mobileVerified}
                    data-testid="input-form-mobile"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("issueCategory", language)} *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={l("searchCategory", language)}
                      value={issueCategorySearch}
                      onChange={(e) => setIssueCategorySearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-category"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                    {filteredIssues.map((issue) => (
                      <button
                        key={issue.id}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${issueCategoryId === issue.id ? "bg-teal-100 text-teal-800 font-medium" : "hover-elevate"}`}
                        onClick={() => setIssueCategoryId(issue.id)}
                        data-testid={`button-issue-${issue.id}`}
                      >
                        {issue.name}
                      </button>
                    ))}
                    {filteredIssues.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">
                        {language === "hi" ? "कोई श्रेणी नहीं मिली" : language === "pa" ? "ਕੋਈ ਸ਼੍ਰੇਣੀ ਨਹੀਂ ਮਿਲੀ" : "No categories found"}
                      </p>
                    )}
                  </div>
                  {isOtherSelected && (
                    <div className="mt-2">
                      <label className="text-sm font-medium text-slate-700">{l("otherCategoryLabel", language)} *</label>
                      <Input
                        value={otherCategoryText}
                        onChange={(e) => setOtherCategoryText(e.target.value)}
                        placeholder={l("otherCategoryPlaceholder", language)}
                        className="mt-1"
                        data-testid="input-other-category"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("complaintNote", language)} *</label>
                  <Textarea
                    value={complaintNote}
                    onChange={(e) => setComplaintNote(e.target.value)}
                    placeholder={l("complaintNotePlaceholder", language)}
                    rows={4}
                    data-testid="textarea-complaint-note"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("audioNote", language)}</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!isRecording && !audioBlob && (
                      <Button variant="outline" size="sm" onClick={startRecording} data-testid="button-start-recording">
                        <Mic className="h-4 w-4 mr-1" /> {l("record", language)}
                      </Button>
                    )}
                    {isRecording && (
                      <Button variant="outline" size="sm" onClick={stopRecording} className="text-red-600" data-testid="button-stop-recording">
                        <Square className="h-4 w-4 mr-1" /> {l("stop", language)}
                      </Button>
                    )}
                    {isRecording && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <MicOff className="h-3 w-3 animate-pulse" /> {l("recording", language)}
                      </span>
                    )}
                    {audioBlob && !isRecording && (
                      <>
                        <Button variant="outline" size="sm" onClick={playAudio} data-testid="button-play-audio">
                          <Play className="h-4 w-4 mr-1" /> {l("play", language)}
                        </Button>
                        <Button variant="outline" size="sm" onClick={deleteAudio} className="text-red-600" data-testid="button-delete-audio">
                          <Trash2 className="h-4 w-4 mr-1" /> {l("delete", language)}
                        </Button>
                        <span className="text-xs text-green-600">{l("recorded", language)}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              data-testid="button-submit-complaint"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {l("submitting", language)}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {l("submit", language)}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
