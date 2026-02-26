import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, UserPlus, Loader2, Check, Home, Camera, AlertTriangle, X } from "lucide-react";
import { Link } from "wouter";
import { useOcr, type OcrResult } from "@/hooks/use-ocr";
import { useTranslation } from "@/lib/i18n";
import { UnitSelector, UnitSwitcherBar, UnitSubmissionHistory, type SelectedUnit } from "@/components/unit-selector";
import { VoterDetailsCard } from "@/components/voter-details-card";
import { compressImage } from "@/lib/image-compress";
import type { AppUser } from "@shared/schema";

interface SupporterMappingProps {
  user: AppUser;
}

type Step = "select_unit" | "form" | "success";

interface OcrData {
  ocrName?: string;
  ocrAadhaarNumber?: string;
  ocrVoterId?: string;
  ocrDob?: string;
  ocrGender?: string;
  ocrAddress?: string;
}

export default function TaskSupporterMapping({ user }: SupporterMappingProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { processingType, processImage } = useOcr();
  const [step, setStep] = useState<Step>("select_unit");
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null);
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(null);
  const [aadhaarPhotoBack, setAadhaarPhotoBack] = useState<string | null>(null);
  const [voterCardPhoto, setVoterCardPhoto] = useState<string | null>(null);
  const [voterCardPhotoBack, setVoterCardPhotoBack] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [lastCheckedMobile, setLastCheckedMobile] = useState("");
  const [ocrData, setOcrData] = useState<OcrData>({});
  
  const aadhaarPhotoRef = useRef<HTMLInputElement>(null);
  const aadhaarPhotoBackRef = useRef<HTMLInputElement>(null);
  const voterPhotoRef = useRef<HTMLInputElement>(null);
  const voterPhotoBackRef = useRef<HTMLInputElement>(null);

  const checkDuplicateMutation = useMutation({
    mutationFn: async (mobile: string) => {
      const res = await fetch(`/api/supporters/check/${mobile}`);
      const data = await res.json();
      return { ...data, checkedMobile: mobile };
    },
    onSuccess: (data) => {
      setLastCheckedMobile(data.checkedMobile);
      setDuplicateWarning(data.exists);
      setDuplicateConfirmed(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/supporters", {
        addedByUserId: user.id,
        name: name.trim(),
        mobileNumber,
        aadhaarPhoto,
        aadhaarPhotoBack,
        voterCardPhoto,
        voterCardPhotoBack,
        selectedVillageId: selectedUnit?.villageId || null,
        selectedVillageName: selectedUnit?.villageName || null,
        ...ocrData,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/supporters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/app/my-submissions", user.id] });
      setStep("success");
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedAddSupporter'), variant: "destructive" });
    },
  });

  const handlePhotoCapture = async (setter: (val: string | null) => void, ref: React.RefObject<HTMLInputElement | null>) => {
    const file = ref.current?.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        setter(base64);
      } catch {}
    }
  };

  const handlePhotoCaptureWithOcr = async (
    setter: (val: string | null) => void,
    ref: React.RefObject<HTMLInputElement | null>,
    ocrType: "aadhaarFront" | "aadhaarBack" | "voterId"
  ) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setter(base64);
      const result = await processImage(ocrType, base64);
      if (result) {
        setOcrData(prev => {
          const updated = { ...prev };
          if (ocrType === "aadhaarFront") {
            if (result.name) updated.ocrName = result.name;
            if (result.aadhaarNumber) updated.ocrAadhaarNumber = result.aadhaarNumber;
            if (result.dob) updated.ocrDob = result.dob;
            if (result.gender) updated.ocrGender = result.gender;
          } else if (ocrType === "aadhaarBack") {
            if (result.address) updated.ocrAddress = result.address;
          } else if (ocrType === "voterId") {
            if (result.name && !updated.ocrName) updated.ocrName = result.name;
            if (result.voterId) updated.ocrVoterId = result.voterId;
          }
          return updated;
        });
      }
    } catch {}
  };

  const handleMobileChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(cleaned);
    setDuplicateWarning(false);
    setShowDuplicateConfirm(false);
    setDuplicateConfirmed(false);
    setLastCheckedMobile("");
    if (cleaned.length === 10) {
      checkDuplicateMutation.mutate(cleaned);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: t('required'), description: t('enterNameRequired'), variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      toast({ title: t('required'), description: t('invalidMobile'), variant: "destructive" });
      return;
    }
    if (checkDuplicateMutation.isPending) {
      toast({ title: t('loading'), description: "Checking contact number..." });
      return;
    }
    if (mobileNumber.length === 10 && lastCheckedMobile !== mobileNumber) {
      checkDuplicateMutation.mutate(mobileNumber);
      toast({ title: t('loading'), description: "Checking contact number..." });
      return;
    }
    if (duplicateWarning && !duplicateConfirmed) {
      setShowDuplicateConfirm(true);
      return;
    }
    submitMutation.mutate();
  };

  const handleUnitSelect = (unit: SelectedUnit) => {
    setSelectedUnit(unit);
    setStep("form");
  };

  const handleReset = () => {
    setStep("select_unit");
    setSelectedUnit(null);
    setName("");
    setMobileNumber("");
    setAadhaarPhoto(null);
    setAadhaarPhotoBack(null);
    setVoterCardPhoto(null);
    setVoterCardPhotoBack(null);
    setDuplicateWarning(false);
    setShowDuplicateConfirm(false);
    setDuplicateConfirmed(false);
    setLastCheckedMobile("");
    setOcrData({});
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-green-600 text-white px-4 py-3 flex items-center gap-3">
        <Link href="/"><ArrowLeft className="h-5 w-5 cursor-pointer" data-testid="button-back" /></Link>
        <div>
          <h1 className="font-semibold">{t('supporterMapping')}</h1>
          {selectedUnit ? (
            <p className="text-xs text-white/70">{selectedUnit.villageName}</p>
          ) : (
            <p className="text-xs text-white/70">{t('addSupporter')}</p>
          )}
        </div>
      </header>

      {selectedUnit && step === "form" && (
        <UnitSwitcherBar
          villageName={selectedUnit.villageName}
          onSwitch={() => {
            setStep("select_unit");
            setSelectedUnit(null);
            setName("");
            setMobileNumber("");
            setAadhaarPhoto(null);
            setAadhaarPhotoBack(null);
            setVoterCardPhoto(null);
            setVoterCardPhotoBack(null);
            setDuplicateWarning(false);
            setShowDuplicateConfirm(false);
            setDuplicateConfirmed(false);
            setLastCheckedMobile("");
            setOcrData({});
          }}
        />
      )}

      <div className="flex-1 p-4">
        {step === "select_unit" && (
          <Card>
            <CardContent className="p-4">
              <UnitSelector
                onSelect={handleUnitSelect}
                title={t('selectUnit')}
                subtitle={t('chooseVillageForSupporter')}
                defaultVillageId={user.mappedAreaId || undefined}
              />
            </CardContent>
          </Card>
        )}

        {step === "form" && selectedUnit && (
          <UnitSubmissionHistory
            userId={user.id}
            villageId={selectedUnit.villageId}
            taskType="supporter-mapping"
          />
        )}

        {step === "form" && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="font-medium text-slate-800">{t('supporterMapping')}</h2>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('name')} <span className="text-red-500">*</span></label>
                <Input
                  placeholder={t('enterSupporterName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                  data-testid="input-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('phone')} <span className="text-red-500">*</span></label>
                <Input
                  type="tel"
                  placeholder={t('enterMobile')}
                  value={mobileNumber}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  className="h-11"
                  data-testid="input-mobile"
                />
              </div>

              {duplicateWarning && showDuplicateConfirm && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">This contact number already exists!</p>
                      <p className="text-xs">Do you want to proceed anyway?</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowDuplicateConfirm(false); setMobileNumber(""); setDuplicateWarning(false); setDuplicateConfirmed(false); setLastCheckedMobile(""); }}
                      data-testid="button-cancel-duplicate"
                    >
                      <X className="mr-1 h-3 w-3" /> {t('cancel')}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => { setDuplicateConfirmed(true); submitMutation.mutate(); }}
                      disabled={submitMutation.isPending || !name.trim()}
                      data-testid="button-proceed-duplicate"
                    >
                      {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proceed Anyway"}
                    </Button>
                  </div>
                </div>
              )}

              {duplicateWarning && !showDuplicateConfirm && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs text-yellow-800">This number already exists</span>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('aadhaarCardPhoto')} <span className="text-slate-400">({t('optional')})</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="file" accept="image/*" capture="environment" ref={aadhaarPhotoRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setAadhaarPhoto, aadhaarPhotoRef, "aadhaarFront")} />
                    <button
                      onClick={() => aadhaarPhotoRef.current?.click()}
                      className={`w-full h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 ${aadhaarPhoto ? "border-green-500 bg-green-50" : "border-slate-300"}`}
                      data-testid="button-upload-aadhaar-front"
                    >
                      {processingType === "aadhaarFront" ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : aadhaarPhoto ? <Check className="h-4 w-4 text-green-600" /> : <Camera className="h-4 w-4 text-slate-400" />}
                      <span className="text-xs">{processingType === "aadhaarFront" ? t('reading') : aadhaarPhoto ? t('frontDone') : t('front')}</span>
                    </button>
                  </div>
                  <div>
                    <input type="file" accept="image/*" capture="environment" ref={aadhaarPhotoBackRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setAadhaarPhotoBack, aadhaarPhotoBackRef, "aadhaarBack")} />
                    <button
                      onClick={() => aadhaarPhotoBackRef.current?.click()}
                      className={`w-full h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 ${aadhaarPhotoBack ? "border-green-500 bg-green-50" : "border-slate-300"}`}
                      data-testid="button-upload-aadhaar-back"
                    >
                      {processingType === "aadhaarBack" ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : aadhaarPhotoBack ? <Check className="h-4 w-4 text-green-600" /> : <Camera className="h-4 w-4 text-slate-400" />}
                      <span className="text-xs">{processingType === "aadhaarBack" ? t('reading') : aadhaarPhotoBack ? t('backDone') : t('backSide')}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('voterIdPhoto')} <span className="text-slate-400">({t('optional')})</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input type="file" accept="image/*" capture="environment" ref={voterPhotoRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setVoterCardPhoto, voterPhotoRef, "voterId")} />
                    <button
                      onClick={() => voterPhotoRef.current?.click()}
                      className={`w-full h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 ${voterCardPhoto ? "border-green-500 bg-green-50" : "border-slate-300"}`}
                      data-testid="button-upload-voter-front"
                    >
                      {processingType === "voterId" ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : voterCardPhoto ? <Check className="h-4 w-4 text-green-600" /> : <Camera className="h-4 w-4 text-slate-400" />}
                      <span className="text-xs">{processingType === "voterId" ? t('reading') : voterCardPhoto ? t('frontDone') : t('front')}</span>
                    </button>
                  </div>
                  <div>
                    <input type="file" accept="image/*" capture="environment" ref={voterPhotoBackRef} className="hidden" onChange={() => handlePhotoCapture(setVoterCardPhotoBack, voterPhotoBackRef)} />
                    <button
                      onClick={() => voterPhotoBackRef.current?.click()}
                      className={`w-full h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 ${voterCardPhotoBack ? "border-green-500 bg-green-50" : "border-slate-300"}`}
                      data-testid="button-upload-voter-back"
                    >
                      {voterCardPhotoBack ? <Check className="h-4 w-4 text-green-600" /> : <Camera className="h-4 w-4 text-slate-400" />}
                      <span className="text-xs">{voterCardPhotoBack ? t('backDone') : t('backSide')}</span>
                    </button>
                  </div>
                </div>
              </div>
              {ocrData.ocrVoterId && <VoterDetailsCard voterId={ocrData.ocrVoterId} />}
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitMutation.isPending || checkDuplicateMutation.isPending || !name.trim() || mobileNumber.length !== 10}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('addSupporter')} <Check className="ml-2 h-4 w-4" /></>}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <UserPlus className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="font-semibold text-lg text-slate-800">{t('supporterAdded')}!</h2>
              <p className="text-sm text-slate-600">
                <span className="font-medium">{name}</span> has been added as a supporter.
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleReset} data-testid="button-another">
                  {t('addSupporter')}
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full" data-testid="button-home">
                    <Home className="mr-2 h-4 w-4" /> {t('goToHome')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
