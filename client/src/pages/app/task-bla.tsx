import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, Loader2, Phone, CheckCircle, Camera, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import { compressImage } from "@/lib/image-compress";
import { useOcr } from "@/hooks/use-ocr";
import type { AppUser, BlaSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "form";

export default function TaskBla({ user }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language } = useTranslation();
  const { processingType, processImage } = useOcr();

  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState("");
  const [selectedVillageName, setSelectedVillageName] = useState("");

  const [bloName, setBloName] = useState("");
  const [bloMobile, setBloMobile] = useState("");
  const [bloOtpSent, setBloOtpSent] = useState(false);
  const [bloOtp, setBloOtp] = useState("");
  const [bloVerified, setBloVerified] = useState(false);

  const [aadhaarFront, setAadhaarFront] = useState<string | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<string | null>(null);
  const [ocrAadhaarName, setOcrAadhaarName] = useState("");
  const [ocrAadhaarNumber, setOcrAadhaarNumber] = useState("");
  const [ocrAadhaarDob, setOcrAadhaarDob] = useState("");
  const [ocrAadhaarGender, setOcrAadhaarGender] = useState("");
  const [ocrAadhaarAddress, setOcrAadhaarAddress] = useState("");

  const [voterCardImage, setVoterCardImage] = useState<string | null>(null);
  const [ocrVoterId, setOcrVoterId] = useState("");
  const [ocrVoterName, setOcrVoterName] = useState("");
  const [voterMatch, setVoterMatch] = useState<{
    boothId: string | null;
    name: string | null;
    fatherName: string | null;
    villageName: string | null;
  } | null>(null);
  const [manualBoothId, setManualBoothId] = useState("");

  const aadhaarFrontInputRef = useRef<HTMLInputElement | null>(null);
  const aadhaarBackInputRef = useRef<HTMLInputElement | null>(null);
  const voterCardInputRef = useRef<HTMLInputElement | null>(null);

  const { data: mySubmissions } = useQuery<BlaSubmission[]>({
    queryKey: ["/api/bla/my-submissions", user.id],
    enabled: !!user.id,
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bla/send-otp", { mobileNumber: bloMobile });
      return res.json();
    },
    onSuccess: () => {
      setBloOtpSent(true);
      toast({ title: "OTP sent", description: bloMobile });
    },
    onError: () => {
      toast({ title: "Failed to send OTP", variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bla/verify-otp", { mobileNumber: bloMobile, otp: bloOtp });
      return res.json();
    },
    onSuccess: () => {
      setBloVerified(true);
      toast({ title: "Mobile verified" });
    },
    onError: () => {
      toast({ title: "Invalid or expired OTP", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        appUserId: user.id,
        villageId: selectedVillageId || null,
        villageName: selectedVillageName || null,
        bloName: bloName.trim(),
        bloMobileNumber: bloMobile.trim(),
        bloMobileVerified: bloVerified,
        aadhaarFront,
        aadhaarBack,
        ocrAadhaarName: ocrAadhaarName.trim() || null,
        ocrAadhaarNumber: ocrAadhaarNumber.trim() || null,
        ocrAadhaarDob: ocrAadhaarDob.trim() || null,
        ocrAadhaarGender: ocrAadhaarGender.trim() || null,
        ocrAadhaarAddress: ocrAadhaarAddress.trim() || null,
        voterCardImage,
        ocrVoterId: ocrVoterId.trim() || null,
        ocrVoterName: ocrVoterName.trim() || null,
        voterMappingBoothId: (voterMatch?.boothId || manualBoothId.trim()) || null,
        voterMappingName: voterMatch?.name || null,
        voterMappingFatherName: voterMatch?.fatherName || null,
        voterMappingVillageName: voterMatch?.villageName || null,
        manualBoothId: manualBoothId.trim() || null,
      };
      if (editingId) {
        const res = await apiRequest("PATCH", `/api/bla/submissions/${editingId}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/bla/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: language === "hi" ? "BLA सहेजा गया" : language === "pa" ? "BLA ਸੰਭਾਲਿਆ ਗਿਆ" : "BLA saved" });
      setStep("description");
      setEditingId(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: language === "hi" ? "सबमिट असफल" : language === "pa" ? "ਸਬਮਿਟ ਅਸਫਲ" : "Failed to submit",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedVillageId("");
    setSelectedVillageName("");
    setBloName("");
    setBloMobile("");
    setBloOtpSent(false);
    setBloOtp("");
    setBloVerified(false);
    setAadhaarFront(null);
    setAadhaarBack(null);
    setOcrAadhaarName("");
    setOcrAadhaarNumber("");
    setOcrAadhaarDob("");
    setOcrAadhaarGender("");
    setOcrAadhaarAddress("");
    setVoterCardImage(null);
    setOcrVoterId("");
    setOcrVoterName("");
    setVoterMatch(null);
    setManualBoothId("");
    setEditingId(null);
  };

  const handleBack = () => {
    if (step === "description") {
      setLocation("/app");
    } else if (step === "select_unit") {
      setStep("description");
    } else {
      setStep("select_unit");
    }
  };

  const handleCaptureImage = async (
    ref: React.RefObject<HTMLInputElement>,
    setter: (val: string | null) => void,
    ocrType: "aadhaarFront" | "aadhaarBack" | "voterId",
    afterOcr?: (result: Awaited<ReturnType<typeof processImage>> | null) => void,
  ) => {
    const input = ref.current;
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    try {
      const base64 = await compressImage(file);
      setter(base64);
      if (ocrType && base64) {
        const result = await processImage(ocrType, base64);
        afterOcr?.(result);
      }
    } catch {
      setter(null);
      toast({ title: "Image not clear", variant: "destructive" });
    } finally {
      input.value = "";
    }
  };

  const handleAadhaarFrontChange = () => {
    handleCaptureImage(aadhaarFrontInputRef, setAadhaarFront, "aadhaarFront", (result) => {
      if (!result) return;
      setOcrAadhaarName(result.name || "");
      setOcrAadhaarNumber(result.aadhaarNumber || "");
      setOcrAadhaarDob(result.dob || "");
      setOcrAadhaarGender(result.gender || "");
      setOcrAadhaarAddress(result.address || "");
    });
  };

  const handleAadhaarBackChange = () => {
    handleCaptureImage(aadhaarBackInputRef, setAadhaarBack, "aadhaarBack");
  };

  const handleVoterCardChange = () => {
    handleCaptureImage(voterCardInputRef, setVoterCardImage, "voterId", async (result) => {
      if (!result) return;
      const vid = (result.voterId || "").trim();
      const vname = (result.name || "").trim();
      setOcrVoterId(vid);
      setOcrVoterName(vname);
      if (vid) {
        try {
          const res = await fetch(`/api/mahila-samman/voter-match?voterId=${encodeURIComponent(vid)}`, { credentials: "include" });
          const data = await res.json();
          setVoterMatch(data.match || null);
          setManualBoothId("");
        } catch {
          setVoterMatch(null);
          toast({ title: "Failed to match voter", variant: "destructive" });
        }
      } else {
        setVoterMatch(null);
        setManualBoothId("");
      }
    });
  };

  const fieldLabel = (key: "bloName" | "bloMobile" | "aadhaar" | "voterCard" | "booth"): string => {
    if (language === "hi") {
      switch (key) {
        case "bloName": return "BLO नाम";
        case "bloMobile": return "BLO मोबाइल (OTP)";
        case "aadhaar": return "आधार (फ्रंट/बैक)";
        case "voterCard": return "वोटर कार्ड";
        case "booth": return "बूथ नंबर";
      }
    }
    if (language === "pa") {
      switch (key) {
        case "bloName": return "BLO ਨਾਮ";
        case "bloMobile": return "BLO ਮੋਬਾਈਲ (OTP)";
        case "aadhaar": return "ਆਧਾਰ (ਅੱਗੇ/ਪਿੱਛੇ)";
        case "voterCard": return "ਵੋਟਰ ਕਾਰਡ";
        case "booth": return "ਬੂਥ ਨੰਬਰ";
      }
    }
    switch (key) {
      case "bloName": return "BLO Name";
      case "bloMobile": return "BLO Mobile (OTP)";
      case "aadhaar": return "Aadhaar (Front/Back)";
      case "voterCard": return "Voter Card";
      case "booth": return "Booth Number";
    }
  };

  const validateForm = (): boolean => {
    const missing: string[] = [];
    if (!bloName.trim()) missing.push(fieldLabel("bloName"));
    if (!bloVerified) missing.push(fieldLabel("bloMobile"));
    if (!aadhaarFront || !aadhaarBack) missing.push(fieldLabel("aadhaar"));
    if (!ocrVoterId.trim()) missing.push(fieldLabel("voterCard"));
    if (!(voterMatch?.boothId || manualBoothId.trim())) missing.push(fieldLabel("booth"));

    if (missing.length) {
      const title =
        language === "hi"
          ? "कृपया ये फ़ील्ड भरें"
          : language === "pa"
          ? "ਕਿਰਪਾ ਕਰਕੇ ਇਹ ਫੀਲਡ ਭਰੋ"
          : "Please fill these fields";
      toast({
        title,
        description: missing.join(", "),
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  if (step === "description") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white no-default-hover-elevate"
            onClick={() => setLocation("/app")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {language === "hi"
              ? "Booth Level Agent (BLA)"
              : language === "pa"
              ? "Booth Level Agent (BLA)"
              : "Booth Level Agent (BLA)"}
          </h1>
        </header>

        <div className="p-4 space-y-4 flex-1">
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm text-slate-700">
                {language === "hi"
                  ? "Booth Level Agents (BLA) को Aadhaar और Voter Card से verify करके booth wise register करें। Voter ID voter mapping से match होगी।"
                  : language === "pa"
                  ? "Booth Level Agents (BLA) ਨੂੰ ਆਧਾਰ ਅਤੇ ਵੋਟਰ ਕਾਰਡ ਨਾਲ ਤਸਦੀਕ ਕਰਕੇ ਬੂਥ ਵਾਇਜ਼ ਰਜਿਸਟਰ ਕਰੋ। ਵੋਟਰ ID voter mapping ਨਾਲ ਮਿਲਾਈ ਜਾਵੇਗੀ।"
                  : "Register Booth Level Agents (BLA) with Aadhaar and Voter Card verification. Voter ID will be matched with Voter Mapping Work and booth will be highlighted."}
              </p>
              <Button className="w-full mt-2" onClick={() => setStep("select_unit")} data-testid="button-new-bla">
                {language === "hi" ? "BLA फॉर्म शुरू करें" : language === "pa" ? "BLA ਫਾਰਮ ਸ਼ੁਰੂ ਕਰੋ" : "Start BLA Form"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {language === "hi"
                      ? "आपके BLA सबमिशन"
                      : language === "pa"
                      ? "ਤੁਹਾਡੇ BLA ਸਬਮਿਸ਼ਨ"
                      : "Your BLA submissions"}
                  </span>
              <Button size="icon" variant="outline" onClick={() => resetForm()} className="h-7 w-7">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            {mySubmissions && mySubmissions.length === 0 && (
              <p className="text-xs text-slate-400">
                {language === "hi" ? "अभी कोई सबमिशन नहीं।" : language === "pa" ? "ਹਾਲੇ ਕੋਈ ਸਬਮਿਸ਼ਨ ਨਹੀਂ।" : "No submissions yet."}
              </p>
            )}
            {mySubmissions && mySubmissions.length > 0 && (
              <div className="space-y-2">
                {mySubmissions.map((s, idx) => (
                  <Card key={s.id}>
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {idx + 1}. {s.bloName} – {s.bloMobileNumber}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {s.villageName || "—"} {s.voterMappingBoothId ? `· Booth ${s.voterMappingBoothId}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.bloMobileVerified && (
                          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />{" "}
                            {language === "hi" ? "सत्यापित" : language === "pa" ? "ਤਸਦੀਕਿਤ" : "Verified"}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditingId(s.id);
                            setSelectedVillageId(s.villageId || "");
                            setSelectedVillageName(s.villageName || "");
                            setBloName(s.bloName);
                            setBloMobile(s.bloMobileNumber);
                            setBloVerified(s.bloMobileVerified);
                            setAadhaarFront(s.aadhaarFront || null);
                            setAadhaarBack(s.aadhaarBack || null);
                            setOcrAadhaarName(s.ocrAadhaarName || "");
                            setOcrAadhaarNumber(s.ocrAadhaarNumber || "");
                            setOcrAadhaarDob(s.ocrAadhaarDob || "");
                            setOcrAadhaarGender(s.ocrAadhaarGender || "");
                            setOcrAadhaarAddress(s.ocrAadhaarAddress || "");
                            setVoterCardImage(s.voterCardImage || null);
                            setOcrVoterId(s.ocrVoterId || "");
                            setOcrVoterName(s.ocrVoterName || "");
                            setVoterMatch(
                              s.voterMappingBoothId
                                ? {
                                    boothId: s.voterMappingBoothId,
                                    name: s.voterMappingName,
                                    fatherName: s.voterMappingFatherName,
                                    villageName: s.voterMappingVillageName,
                                  }
                                : null,
                            );
                            setManualBoothId(s.manualBoothId || "");
                            setStep("form");
                          }}
                        >
                          {language === "hi" ? "एडिट" : language === "pa" ? "ਸੰਪਾਦਨ" : "Edit"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "select_unit") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white no-default-hover-elevate"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">
            {language === "hi" ? "यूनिट चुनें" : language === "pa" ? "ਯੂਨਿਟ ਚੁਣੋ" : "Select Unit"}
          </h1>
        </header>
        <div className="p-4">
          <UnitSelector
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("form");
            }}
            title={
              language === "hi"
                ? "यूनिट चुनें"
                : language === "pa"
                ? "ਯੂਨਿਟ ਚੁਣੋ"
                : "Select Unit"
            }
            subtitle={
              language === "hi"
                ? "इस BLA के लिए गांव/वार्ड चुनें"
                : language === "pa"
                ? "ਇਸ BLA ਲਈ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ"
                : "Choose the village/ward for this BLA"
            }
            defaultVillageId={user.mappedAreaId || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white no-default-hover-elevate"
          onClick={handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            {language === "hi"
              ? "Booth Level Agent (BLA)"
              : language === "pa"
              ? "Booth Level Agent (BLA)"
              : "Booth Level Agent (BLA)"}
          </h1>
          <p className="text-xs text-white/80 truncate">{selectedVillageName}</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === "hi" ? "BLO नाम *" : language === "pa" ? "BLO ਨਾਮ *" : "BLO Name *"}
              </label>
              <Input
                value={bloName}
                onChange={(e) => setBloName(e.target.value)}
                placeholder="Enter BLO name"
                data-testid="input-blo-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === "hi"
                  ? "BLO मोबाइल (OTP सत्यापन) *"
                  : language === "pa"
                  ? "BLO ਮੋਬਾਈਲ (OTP ਤਸਦੀਕ) *"
                  : "BLO Mobile (OTP Verify) *"}
              </label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  maxLength={10}
                  value={bloMobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setBloMobile(val);
                    if (val !== bloMobile) {
                      setBloVerified(false);
                      setBloOtpSent(false);
                      setBloOtp("");
                    }
                  }}
                  placeholder={language === "hi" || language === "pa" ? "9876543210" : "9876543210"}
                  disabled={bloVerified}
                  data-testid="input-blo-mobile"
                />
                {!bloVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => sendOtpMutation.mutate()}
                    disabled={bloMobile.length !== 10 || sendOtpMutation.isPending}
                    data-testid="button-send-blo-otp"
                  >
                    {sendOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
                    {language === "hi" ? "OTP भेजें" : language === "pa" ? "OTP ਭੇਜੋ" : "Send OTP"}
                  </Button>
                )}
                {bloVerified && (
                  <Badge className="bg-green-100 text-green-800 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              {bloOtpSent && !bloVerified && (
                <div className="space-y-2 pt-2 border-t border-indigo-200 bg-indigo-50 rounded-md p-3">
                  <p className="text-xs text-indigo-700">
                    {language === "hi"
                      ? `OTP भेजा गया: ${bloMobile}`
                      : language === "pa"
                      ? `OTP ਭੇਜਿਆ ਗਿਆ: ${bloMobile}`
                      : `OTP sent to ${bloMobile}`}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      maxLength={4}
                      value={bloOtp}
                      onChange={(e) => setBloOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder={
                        language === "hi"
                          ? "4 अंकों का OTP डालें"
                          : language === "pa"
                          ? "4 ਅੰਕਾਂ ਦਾ OTP ਦਾਖਲ ਕਰੋ"
                          : "Enter 4-digit OTP"
                      }
                      data-testid="input-blo-otp"
                    />
                    <Button
                      size="sm"
                      onClick={() => verifyOtpMutation.mutate()}
                      disabled={bloOtp.length !== 4 || verifyOtpMutation.isPending}
                      data-testid="button-verify-blo-otp"
                    >
                      {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {language === "hi" ? "सत्यापित करें" : language === "pa" ? "ਤਸਦੀਕ ਕਰੋ" : "Verify"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {language === "hi"
                ? "आधार (फ्रंट और बैक) OCR के साथ *"
                : language === "pa"
                ? "ਆਧਾਰ (ਅੱਗੇ ਅਤੇ ਪਿੱਛੇ) OCR ਨਾਲ *"
                : "Aadhaar (Front & Back) with OCR *"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <input
                  ref={aadhaarFrontInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleAadhaarFrontChange}
                  data-testid="input-aadhaar-front"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center gap-1"
                  onClick={() => aadhaarFrontInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5 text-slate-500" />
                  <span className="text-xs">
                    {aadhaarFront
                      ? language === "hi"
                        ? "फ्रंट कैप्चर हुआ"
                        : language === "pa"
                        ? "ਅੱਗਲਾ ਪਾਸਾ ਕੈਪਚਰ"
                        : "Front captured"
                      : language === "hi"
                      ? "फ्रंट कैप्चर करें"
                      : language === "pa"
                      ? "ਅੱਗਲਾ ਪਾਸਾ ਕੈਪਚਰ ਕਰੋ"
                      : "Capture Front"}
                  </span>
                </Button>
              </div>
              <div className="space-y-2">
                <input
                  ref={aadhaarBackInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleAadhaarBackChange}
                  data-testid="input-aadhaar-back"
                />
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center gap-1"
                  onClick={() => aadhaarBackInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5 text-slate-500" />
                  <span className="text-xs">
                    {aadhaarBack
                      ? language === "hi"
                        ? "बैक कैप्चर हुआ"
                        : language === "pa"
                        ? "ਪਿੱਛਲਾ ਪਾਸਾ ਕੈਪਚਰ"
                        : "Back captured"
                      : language === "hi"
                      ? "बैक कैप्चर करें"
                      : language === "pa"
                      ? "ਪਿੱਛਲਾ ਪਾਸਾ ਕੈਪਚਰ ਕਰੋ"
                      : "Capture Back"}
                  </span>
                </Button>
              </div>
            </div>
            {processingType && (processingType === "aadhaarFront" || processingType === "aadhaarBack") && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                {language === "hi"
                  ? "आधार विवरण पढ़े जा रहे हैं…"
                  : language === "pa"
                  ? "ਆਧਾਰ ਵੇਰਵੇ ਪੜ੍ਹੇ ਜਾ ਰਹੇ ਹਨ…"
                  : "Reading Aadhaar details…"}
              </p>
            )}
            {(ocrAadhaarName || ocrAadhaarNumber) && (
              <div className="text-xs text-slate-600 space-y-0.5">
                {ocrAadhaarName && <p><span className="font-semibold">Name:</span> {ocrAadhaarName}</p>}
                {ocrAadhaarNumber && <p><span className="font-semibold">Aadhaar:</span> {ocrAadhaarNumber}</p>}
                {ocrAadhaarDob && <p><span className="font-semibold">DOB:</span> {ocrAadhaarDob}</p>}
                {ocrAadhaarGender && <p><span className="font-semibold">Gender:</span> {ocrAadhaarGender}</p>}
                {ocrAadhaarAddress && <p><span className="font-semibold">Address:</span> {ocrAadhaarAddress}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {language === "hi"
                ? "वोटर कार्ड OCR और बूथ मैच के साथ *"
                : language === "pa"
                ? "ਵੋਟਰ ਕਾਰਡ OCR ਅਤੇ ਬੂਥ ਮੈਚ ਨਾਲ *"
                : "Voter Card with OCR & Booth Match *"}
            </p>
            <input
              ref={voterCardInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleVoterCardChange}
              data-testid="input-voter-card"
            />
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-1"
              onClick={() => voterCardInputRef.current?.click()}
            >
              <Camera className="h-5 w-5 text-slate-500" />
              <span className="text-xs">
                {voterCardImage
                  ? language === "hi"
                    ? "वोटर कार्ड कैप्चर हुआ"
                    : language === "pa"
                    ? "ਵੋਟਰ ਕਾਰਡ ਕੈਪਚਰ ਕੀਤਾ ਗਿਆ"
                    : "Voter card captured"
                  : language === "hi"
                  ? "वोटर कार्ड कैप्चर करें"
                  : language === "pa"
                  ? "ਵੋਟਰ ਕਾਰਡ ਕੈਪਚਰ ਕਰੋ"
                  : "Capture voter card"}
              </span>
            </Button>
            {processingType === "voterId" && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                {language === "hi"
                  ? "वोटर कार्ड पढ़ा जा रहा है…"
                  : language === "pa"
                  ? "ਵੋਟਰ ਕਾਰਡ ਪੜ੍ਹਿਆ ਜਾ ਰਿਹਾ ਹੈ…"
                  : "Reading voter card…"}
              </p>
            )}
            {(ocrVoterId || ocrVoterName) && (
              <div className="text-xs text-slate-600 space-y-0.5">
                {ocrVoterId && <p><span className="font-semibold">Voter ID:</span> {ocrVoterId}</p>}
                {ocrVoterName && <p><span className="font-semibold">Name:</span> {ocrVoterName}</p>}
              </div>
            )}
            {voterMatch && (
              <div className="border rounded-md p-2 bg-green-50 text-xs text-slate-700 space-y-0.5">
                <p className="font-semibold text-green-700">
                  {language === "hi"
                    ? "Voter Mapping में मैच मिला"
                    : language === "pa"
                    ? "Voter Mapping ਵਿੱਚ ਮੇਚ ਮਿਲਿਆ"
                    : "Matched in Voter Mapping"}
                </p>
                <p>Booth: {voterMatch.boothId || "—"}</p>
                <p>
                  {language === "hi" ? "नाम:" : language === "pa" ? "ਨਾਮ:" : "Name:"}{" "}
                  {voterMatch.name || "—"}
                </p>
                <p>
                  {language === "hi"
                    ? "पिता/पति का नाम:"
                    : language === "pa"
                    ? "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ:"
                    : "Father's Name:"}{" "}
                  {voterMatch.fatherName || "—"}
                </p>
                <p>
                  {language === "hi" ? "गांव:" : language === "pa" ? "ਪਿੰਡ:" : "Village:"}{" "}
                  {voterMatch.villageName || "—"}
                </p>
              </div>
            )}
            {!voterMatch && !!ocrVoterId && (
              <div className="space-y-2">
                <p className="text-xs text-red-600">
                  {language === "hi"
                    ? "Voter Mapping में Voter ID नहीं मिली। कृपया बूथ नंबर मैन्युअली डालें।"
                    : language === "pa"
                    ? "Voter Mapping ਵਿੱਚ ਵੋਟਰ ID ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਬੂਥ ਨੰਬਰ ਹੱਥੋਂ ਭਰੋ।"
                    : "Voter ID not found in Voter Mapping. Please enter Booth Number manually."}
                </p>
                <Input
                  value={manualBoothId}
                  onChange={(e) => setManualBoothId(e.target.value)}
                  placeholder={
                    language === "hi"
                      ? "बूथ नंबर दर्ज करें"
                      : language === "pa"
                      ? "ਬੂਥ ਨੰਬਰ ਦਰਜ ਕਰੋ"
                      : "Enter Booth Number"
                  }
                  data-testid="input-manual-booth"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={() => {
            if (!validateForm()) return;
            submitMutation.mutate();
          }}
          disabled={submitMutation.isPending}
          data-testid="button-submit-bla"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving…
            </>
          ) : (
            "Submit BLA"
          )}
        </Button>
      </div>
    </div>
  );
}

