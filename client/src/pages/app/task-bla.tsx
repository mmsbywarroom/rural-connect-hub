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
      const res = await apiRequest("POST", "/api/bla/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "BLA saved" });
      setStep("description");
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to submit", variant: "destructive" });
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

  const canSubmit =
    bloName.trim() &&
    bloVerified &&
    aadhaarFront &&
    aadhaarBack &&
    ocrVoterId.trim() &&
    (voterMatch?.boothId || manualBoothId.trim());

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
          <h1 className="text-lg font-semibold">Booth Level Agent (BLA)</h1>
        </header>

        <div className="p-4 space-y-4 flex-1">
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm text-slate-700">
                Register Booth Level Agents (BLA) with Aadhaar and Voter Card verification. Voter ID will be matched with
                Voter Mapping Work and booth will be highlighted.
              </p>
              <Button className="w-full mt-2" onClick={() => setStep("select_unit")} data-testid="button-new-bla">
                Start BLA Form
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Your BLA submissions
              </span>
              <Button size="icon" variant="outline" onClick={() => resetForm()} className="h-7 w-7">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            {mySubmissions && mySubmissions.length === 0 && (
              <p className="text-xs text-slate-400">No submissions yet.</p>
            )}
            {mySubmissions && mySubmissions.length > 0 && (
              <div className="space-y-2">
                {mySubmissions.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {s.bloName} – {s.bloMobileNumber}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {s.villageName || "—"} {s.voterMappingBoothId ? `· Booth ${s.voterMappingBoothId}` : ""}
                        </p>
                      </div>
                      {s.bloMobileVerified && (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </Badge>
                      )}
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
          <h1 className="text-lg font-semibold">Select Unit</h1>
        </header>
        <div className="p-4">
          <UnitSelector
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("form");
            }}
            title="Select Unit"
            subtitle="Choose the village/ward for this BLA"
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
          <h1 className="text-lg font-semibold">Booth Level Agent (BLA)</h1>
          <p className="text-xs text-white/80 truncate">{selectedVillageName}</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">BLO Name *</label>
              <Input
                value={bloName}
                onChange={(e) => setBloName(e.target.value)}
                placeholder="Enter BLO name"
                data-testid="input-blo-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">BLO Mobile (OTP Verify) *</label>
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
                  placeholder="9876543210"
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
                    Send OTP
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
                    OTP sent to {bloMobile}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      maxLength={4}
                      value={bloOtp}
                      onChange={(e) => setBloOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="Enter 4-digit OTP"
                      data-testid="input-blo-otp"
                    />
                    <Button
                      size="sm"
                      onClick={() => verifyOtpMutation.mutate()}
                      disabled={bloOtp.length !== 4 || verifyOtpMutation.isPending}
                      data-testid="button-verify-blo-otp"
                    >
                      {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Verify
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Aadhaar (Front & Back) with OCR *</p>
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
                  <span className="text-xs">{aadhaarFront ? "Front captured" : "Capture Front"}</span>
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
                  <span className="text-xs">{aadhaarBack ? "Back captured" : "Capture Back"}</span>
                </Button>
              </div>
            </div>
            {processingType && (processingType === "aadhaarFront" || processingType === "aadhaarBack") && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Reading Aadhaar details…
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
            <p className="text-sm font-semibold text-slate-700">Voter Card with OCR & Booth Match *</p>
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
              <span className="text-xs">{voterCardImage ? "Voter card captured" : "Capture voter card"}</span>
            </Button>
            {processingType === "voterId" && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Reading voter card…
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
                <p className="font-semibold text-green-700">Matched in Voter Mapping</p>
                <p>Booth: {voterMatch.boothId || "—"}</p>
                <p>Name: {voterMatch.name || "—"}</p>
                <p>Father&apos;s Name: {voterMatch.fatherName || "—"}</p>
                <p>Village: {voterMatch.villageName || "—"}</p>
              </div>
            )}
            {!voterMatch && !!ocrVoterId && (
              <div className="space-y-2">
                <p className="text-xs text-red-600">
                  Voter ID not found in Voter Mapping. Please enter Booth Number manually.
                </p>
                <Input
                  value={manualBoothId}
                  onChange={(e) => setManualBoothId(e.target.value)}
                  placeholder="Enter Booth Number"
                  data-testid="input-manual-booth"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={() => {
            if (!canSubmit) {
              toast({ title: "Please complete all required fields", variant: "destructive" });
              return;
            }
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

