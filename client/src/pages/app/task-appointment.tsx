import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Mic, MicOff, Play, Square, Trash2, Send, Loader2, Phone, CheckCircle, ChevronRight, Calendar, Clock, CalendarCheck, Camera, Upload, X } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, Appointment, AppointmentLog } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "form";

interface AppointmentWithLogs extends Appointment {
  logs: AppointmentLog[];
}

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Appointment", hi: "मुलाकात", pa: "ਮੁਲਾਕਾਤ" },
  description: { en: "Request an appointment and track your scheduled meetings. Submit your request with details and we will schedule a meeting for you.", hi: "मुलाकात का अनुरोध करें और अपनी निर्धारित बैठकों को ट्रैक करें। अपने विवरण के साथ अनुरोध जमा करें और हम आपके लिए बैठक निर्धारित करेंगे।", pa: "ਮੁਲਾਕਾਤ ਦੀ ਬੇਨਤੀ ਕਰੋ ਅਤੇ ਆਪਣੀਆਂ ਤਹਿ ਮੀਟਿੰਗਾਂ ਨੂੰ ਟਰੈਕ ਕਰੋ। ਆਪਣੇ ਵੇਰਵਿਆਂ ਨਾਲ ਬੇਨਤੀ ਜਮ੍ਹਾਂ ਕਰੋ ਅਤੇ ਅਸੀਂ ਤੁਹਾਡੇ ਲਈ ਮੀਟਿੰਗ ਤਹਿ ਕਰਾਂਗੇ।" },
  newAppointment: { en: "Request New Appointment", hi: "नई मुलाकात का अनुरोध करें", pa: "ਨਵੀਂ ਮੁਲਾਕਾਤ ਦੀ ਬੇਨਤੀ ਕਰੋ" },
  previousAppointments: { en: "Your Appointments", hi: "आपकी मुलाकातें", pa: "ਤੁਹਾਡੀਆਂ ਮੁਲਾਕਾਤਾਂ" },
  verifyMobile: { en: "Verify Mobile Number", hi: "मोबाइल नंबर सत्यापित करें", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
  verifyMobileSubtitle: { en: "Enter the applicant's mobile number to verify via OTP", hi: "OTP से सत्यापन के लिए आवेदक का मोबाइल नंबर दर्ज करें", pa: "OTP ਰਾਹੀਂ ਤਸਦੀਕ ਲਈ ਬਿਨੈਕਾਰ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  enterMobile: { en: "Enter applicant's 10-digit mobile number", hi: "आवेदक का 10 अंकों का मोबाइल नंबर दर्ज करें", pa: "ਬਿਨੈਕਾਰ ਦਾ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
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
  selectUnitSubtitle: { en: "Choose the village/ward for the appointment", hi: "मुलाकात के लिए गांव/वार्ड चुनें", pa: "ਮੁਲਾਕਾਤ ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ" },
  applicantName: { en: "Applicant Name", hi: "आवेदक का नाम", pa: "ਬਿਨੈਕਾਰ ਦਾ ਨਾਮ" },
  fatherHusbandName: { en: "Father/Husband Name", hi: "पिता/पति का नाम", pa: "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ" },
  applicantMobile: { en: "Applicant Mobile Number", hi: "आवेदक का मोबाइल नंबर", pa: "ਬਿਨੈਕਾਰ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ" },
  address: { en: "Address", hi: "पता", pa: "ਪਤਾ" },
  addressPlaceholder: { en: "Enter applicant's full address...", hi: "आवेदक का पूरा पता दर्ज करें...", pa: "ਬਿਨੈਕਾਰ ਦਾ ਪੂਰਾ ਪਤਾ ਦਰਜ ਕਰੋ..." },
  appointmentDescription: { en: "Description", hi: "विवरण", pa: "ਵੇਰਵਾ" },
  descriptionPlaceholder: { en: "Describe the purpose of the appointment...", hi: "मुलाकात का उद्देश्य बताएं...", pa: "ਮੁਲਾਕਾਤ ਦਾ ਉਦੇਸ਼ ਦੱਸੋ..." },
  audioNote: { en: "Voice Note (Optional)", hi: "वॉइस नोट (वैकल्पिक)", pa: "ਵੌਇਸ ਨੋਟ (ਵਿਕਲਪਿਕ)" },
  record: { en: "Record", hi: "रिकॉर्ड", pa: "ਰਿਕਾਰਡ" },
  recording: { en: "Recording...", hi: "रिकॉर्ड हो रहा है...", pa: "ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ..." },
  recorded: { en: "Voice note recorded", hi: "वॉइस नोट रिकॉर्ड", pa: "ਵੌਇਸ ਨੋਟ ਰਿਕਾਰਡ" },
  stop: { en: "Stop", hi: "रोकें", pa: "ਰੋਕੋ" },
  play: { en: "Play", hi: "सुनें", pa: "ਸੁਣੋ" },
  delete: { en: "Delete", hi: "हटाएं", pa: "ਹਟਾਓ" },
  submit: { en: "Submit Appointment Request", hi: "मुलाकात अनुरोध जमा करें", pa: "ਮੁਲਾਕਾਤ ਬੇਨਤੀ ਜਮ੍ਹਾਂ ਕਰੋ" },
  submitting: { en: "Submitting...", hi: "जमा हो रहा है...", pa: "ਜਮ੍ਹਾਂ ਹੋ ਰਿਹਾ ਹੈ..." },
  submitted: { en: "Appointment Request Submitted!", hi: "मुलाकात अनुरोध दर्ज हो गया!", pa: "ਮੁਲਾਕਾਤ ਬੇਨਤੀ ਦਰਜ ਹੋ ਗਈ!" },
  back: { en: "Back", hi: "वापस", pa: "ਵਾਪਸ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  scheduled: { en: "Scheduled", hi: "निर्धारित", pa: "ਤਹਿ" },
  resolved: { en: "Resolved", hi: "समाधान", pa: "ਹੱਲ" },
  journey: { en: "Journey", hi: "यात्रा", pa: "ਯਾਤਰਾ" },
  noAppointments: { en: "No appointments yet", hi: "अभी कोई मुलाकात नहीं", pa: "ਅਜੇ ਕੋਈ ਮੁਲਾਕਾਤ ਨਹੀਂ" },
  nameRequired: { en: "Applicant name is required", hi: "आवेदक का नाम आवश्यक है", pa: "ਬਿਨੈਕਾਰ ਦਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  fatherNameRequired: { en: "Father/Husband name is required", hi: "पिता/पति का नाम आवश्यक है", pa: "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ ਲੋੜੀਂਦਾ ਹੈ" },
  descriptionRequired: { en: "Please describe the purpose of the appointment", hi: "कृपया मुलाकात का उद्देश्य बताएं", pa: "ਕਿਰਪਾ ਕਰਕੇ ਮੁਲਾਕਾਤ ਦਾ ਉਦੇਸ਼ ਦੱਸੋ" },
  verified: { en: "Verified", hi: "सत्यापित", pa: "ਤਸਦੀਕਿਤ" },
  verify: { en: "Verify", hi: "सत्यापित करें", pa: "ਤਸਦੀਕ ਕਰੋ" },
  appointmentDate: { en: "Appointment Date", hi: "मुलाकात की तारीख", pa: "ਮੁਲਾਕਾਤ ਦੀ ਤਾਰੀਖ" },
  documentPhoto: { en: "Document / Application (Upload or Capture)", hi: "दस्तावेज़ / आवेदन (अपलोड या कैप्चर करें)", pa: "ਦਸਤਾਵੇਜ਼ / ਅਰਜ਼ੀ (ਅੱਪਲੋਡ ਜਾਂ ਕੈਪਚਰ ਕਰੋ)" },
  uploadPhoto: { en: "Upload", hi: "अपलोड", pa: "ਅੱਪਲੋਡ" },
  capturePhoto: { en: "Capture", hi: "कैप्चर", pa: "ਕੈਪਚਰ" },
  photoAttached: { en: "Document attached", hi: "दस्तावेज़ संलग्न", pa: "ਦਸਤਾਵੇਜ਼ ਨੱਥੀ" },
};

function l(key: string, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as Record<string, string>)[lang] || entry.en;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};

const actionColors: Record<string, string> = {
  submitted: "border-purple-400 bg-purple-50",
  scheduled: "border-blue-400 bg-blue-50",
  resolved: "border-green-400 bg-green-50",
};

function JourneyTimeline({ logs, language }: { logs: AppointmentLog[]; language: string }) {
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
            <div className={`absolute -left-4 top-1 w-3.5 h-3.5 rounded-full border-2 ${i === sorted.length - 1 ? "border-purple-500 bg-purple-100" : "border-slate-300 bg-white"}`} />
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

function AppointmentCard({ appointment, language }: { appointment: AppointmentWithLogs; language: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-visible" data-testid={`appointment-card-${appointment.id}`}>
      <CardContent className="p-3 space-y-2">
        <button
          className="w-full text-left"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-appointment-${appointment.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{appointment.personName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {appointment.villageName} &middot; {appointment.createdAt ? new Date(appointment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
              </p>
            </div>
            <Badge className={statusColors[appointment.status] || ""}>
              {l(appointment.status, language)}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{appointment.description}</p>
        </button>

        {appointment.status === "scheduled" && appointment.appointmentDate && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <CalendarCheck className="h-3 w-3" />
            <span>{l("appointmentDate", language)}: {appointment.appointmentDate}</span>
          </div>
        )}

        {expanded && (
          <JourneyTimeline logs={appointment.logs} language={language} />
        )}

        <button
          className="text-xs text-purple-600 flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-toggle-journey-${appointment.id}`}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          {expanded ? l("back", language) : l("journey", language)}
        </button>
      </CardContent>
    </Card>
  );
}

export default function TaskAppointment({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");
  const [personName, setPersonName] = useState("");
  const [fatherHusbandName, setFatherHusbandName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [documentPhoto, setDocumentPhoto] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: myAppointments } = useQuery<AppointmentWithLogs[]>({
    queryKey: ["/api/appointment/my-appointments", user.id],
    enabled: !!user.id,
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/appointment/send-otp", { mobileNumber });
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
      const res = await apiRequest("POST", "/api/appointment/verify-otp", { mobileNumber, otp });
      return res.json();
    },
    onSuccess: () => {
      setMobileVerified(true);
      toast({ title: l("otpVerified", language) });
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
        personName,
        fatherHusbandName,
        mobileNumber,
        mobileVerified,
        address,
        description,
        audioNote: audioNoteData,
        documentPhoto,
        status: "pending",
      };
      const res = await apiRequest("POST", "/api/appointment/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointment/my-appointments", user.id] });
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocumentPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!personName.trim()) {
      toast({ title: l("nameRequired", language), variant: "destructive" });
      return;
    }
    if (!fatherHusbandName.trim()) {
      toast({ title: l("fatherNameRequired", language), variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: l("descriptionRequired", language), variant: "destructive" });
      return;
    }
    let audioNoteData: string | null = null;
    if (audioBlob) {
      audioNoteData = await blobToBase64(audioBlob);
    }
    submitMutation.mutate(audioNoteData);
  };

  const resetForm = () => {
    setSelectedVillageId("");
    setSelectedVillageName("");
    setPersonName("");
    setFatherHusbandName("");
    setMobileNumber("");
    setMobileVerified(false);
    setOtpSent(false);
    setOtp("");
    setAddress("");
    setDescription("");
    setDocumentPhoto(null);
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleBack = () => {
    switch (step) {
      case "select_unit":
        setStep("description");
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
      <header className="bg-purple-700 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={step === "description" ? () => setLocation("/app") : handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold" data-testid="text-appointment-title">{l("title", language)}</h1>
      </header>

      <div className="p-4 space-y-4">
        {step === "description" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-800" data-testid="text-appointment-heading">{l("title", language)}</h2>
                    <p className="text-sm text-slate-500 mt-1">{l("description", language)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full bg-purple-600"
              onClick={() => setStep("select_unit")}
              data-testid="button-new-appointment"
            >
              <Send className="h-4 w-4 mr-2" />
              {l("newAppointment", language)}
            </Button>

            {myAppointments && myAppointments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider" data-testid="text-previous-appointments">
                    {l("previousAppointments", language)} ({myAppointments.length})
                  </h3>
                </div>
                {myAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} language={language} />
                ))}
              </div>
            )}

            {myAppointments && myAppointments.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">{l("noAppointments", language)}</p>
              </div>
            )}
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
            <div className="px-1">
              <Badge className="bg-purple-100 text-purple-800" data-testid="badge-unit-name">
                {selectedVillageName}
              </Badge>
            </div>

            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("applicantName", language)} *</label>
                  <Input
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder={l("applicantName", language)}
                    data-testid="input-person-name"
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
                  <label className="text-sm font-medium text-slate-700">{l("applicantMobile", language)}</label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      maxLength={10}
                      value={mobileNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setMobileNumber(val);
                        if (val !== mobileNumber) {
                          setMobileVerified(false);
                          setOtpSent(false);
                          setOtp("");
                        }
                      }}
                      placeholder="9876543210"
                      disabled={mobileVerified}
                      data-testid="input-mobile-number"
                    />
                    {!mobileVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => sendOtpMutation.mutate()}
                        disabled={mobileNumber.length !== 10 || sendOtpMutation.isPending}
                        data-testid="button-send-otp"
                      >
                        {sendOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
                        {l("sendOtp", language)}
                      </Button>
                    )}
                    {mobileVerified && (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1 whitespace-nowrap" data-testid="badge-mobile-verified">
                        <CheckCircle className="h-3 w-3" /> {l("verified", language)}
                      </Badge>
                    )}
                  </div>
                  {otpSent && !mobileVerified && (
                    <div className="space-y-2 pt-2 border-t border-purple-200 bg-purple-50 rounded-md p-3">
                      <p className="text-xs text-purple-600" data-testid="text-otp-sent">
                        {l("otpSentTo", language)} {mobileNumber}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          maxLength={4}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder={l("enterOtp", language)}
                          data-testid="input-otp"
                        />
                        <Button
                          size="sm"
                          className="bg-purple-600"
                          onClick={() => verifyOtpMutation.mutate()}
                          disabled={otp.length !== 4 || verifyOtpMutation.isPending}
                          data-testid="button-verify-otp"
                        >
                          {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {l("verify", language)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("address", language)}</label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={l("addressPlaceholder", language)}
                    rows={2}
                    data-testid="textarea-address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("appointmentDescription", language)} *</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={l("descriptionPlaceholder", language)}
                    rows={4}
                    data-testid="textarea-description"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{l("documentPhoto", language)}</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    data-testid="input-file-upload"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                    data-testid="input-camera-capture"
                  />
                  {!documentPhoto && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-document"
                      >
                        <Upload className="h-4 w-4 mr-1" /> {l("uploadPhoto", language)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cameraInputRef.current?.click()}
                        data-testid="button-capture-document"
                      >
                        <Camera className="h-4 w-4 mr-1" /> {l("capturePhoto", language)}
                      </Button>
                    </div>
                  )}
                  {documentPhoto && (
                    <div className="relative inline-block">
                      <img
                        src={documentPhoto}
                        alt="Document"
                        className="max-h-40 rounded-lg border border-slate-200"
                        data-testid="img-document-preview"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white text-red-600"
                        onClick={() => setDocumentPhoto(null)}
                        data-testid="button-remove-document"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-green-600 mt-1">{l("photoAttached", language)}</p>
                    </div>
                  )}
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
              className="w-full bg-purple-600"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              data-testid="button-submit-appointment"
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
