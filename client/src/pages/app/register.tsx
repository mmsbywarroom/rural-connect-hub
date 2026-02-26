import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation, getLocalizedText, translateDynamic } from "@/lib/i18n";
import { Loader2, User, Users, ArrowLeft, Camera, Check, Plus, Trash2, Upload, Search, Building2 } from "lucide-react";
import { useOcr } from "@/hooks/use-ocr";
import { compressImage } from "@/lib/image-compress";
import { LEVELS } from "@shared/schema";
import type { AppUser, Wing, Position, GovWing, GovPosition, Village } from "@shared/schema";

interface RegisterProps {
  email?: string;
  mobile?: string;
  selectedVillageId?: string;
  selectedVillageName?: string;
  onComplete: (user: AppUser) => void;
  onBack: () => void;
}

type Step = "role" | "volunteer_details" | "pph_details" | "pph_roles";

interface OcrData {
  ocrName?: string;
  ocrAadhaarNumber?: string;
  ocrVoterId?: string;
  ocrDob?: string;
  ocrGender?: string;
  ocrAddress?: string;
}

interface RoleAssignment {
  cardType: "party" | "govt";
  wing: string;
  customWing: string;
  position: string;
  customPosition: string;
  level: string;
  govPositionId: string;
  jurisdictionVillageIds: string[];
}

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return (
    <div className="space-y-1" data-testid="progress-bar-container">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500" data-testid="text-progress-label">{filled}/{total}</span>
        <span className="text-xs font-medium text-slate-600" data-testid="text-progress-pct">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
          data-testid="progress-bar-fill"
        />
      </div>
    </div>
  );
}

function RoleAssignmentCard({
  assignment,
  index,
  isPrimary,
  wingsData,
  positionsData,
  govPositionsData,
  govWingsData,
  govWing,
  onGovWingChange,
  villagesData,
  villageSearch,
  onVillageSearchChange,
  onChange,
  onRemove,
  t,
  language,
}: {
  assignment: RoleAssignment;
  index: number;
  isPrimary: boolean;
  wingsData: Wing[];
  positionsData: Position[];
  govPositionsData: GovPosition[];
  govWingsData?: GovWing[];
  govWing?: string;
  onGovWingChange?: (value: string) => void;
  villagesData: Village[];
  villageSearch: string;
  onVillageSearchChange: (value: string) => void;
  onChange: (field: keyof RoleAssignment | string, value: any) => void;
  onRemove?: () => void;
  t: ReturnType<typeof import("@/lib/i18n").useTranslation>["t"];
  language: import("@/lib/i18n").Language;
}) {
  const filteredVillages = (villagesData || []).filter(v => {
    if (!v.isActive) return false;
    if (!villageSearch.trim()) return true;
    const s = villageSearch.toLowerCase();
    return v.name.toLowerCase().includes(s) || v.nameHi?.toLowerCase().includes(s) || v.namePa?.toLowerCase().includes(s);
  });

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-slate-50" data-testid={`role-card-${index}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-blue-700" data-testid={`text-role-label-${index}`}>
          {isPrimary ? t('primaryRole') : `${t('additionalRole')} ${index}`}
        </span>
        {!isPrimary && onRemove && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-700"
            onClick={onRemove}
            data-testid={`button-remove-role-${index}`}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t('removeRole')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2" data-testid={`role-type-selector-${index}`}>
        <button
          type="button"
          className={`flex items-center justify-center gap-1.5 p-2 rounded-md border-2 text-xs font-medium transition-colors ${
            assignment.cardType === "party"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-slate-200 text-slate-500"
          }`}
          onClick={() => onChange("cardType", "party")}
          data-testid={`button-card-type-party-${index}`}
        >
          <Users className="h-4 w-4" />
          {t('partyPostHolder')}
        </button>
        <button
          type="button"
          className={`flex items-center justify-center gap-1.5 p-2 rounded-md border-2 text-xs font-medium transition-colors ${
            assignment.cardType === "govt"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-slate-200 text-slate-500"
          }`}
          onClick={() => onChange("cardType", "govt")}
          data-testid={`button-card-type-govt-${index}`}
        >
          <Building2 className="h-4 w-4" />
          {t('govtPostHolder')}
        </button>
      </div>

      {assignment.cardType === "party" && (
        <>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('level')}</label>
            <Select value={assignment.level} onValueChange={(v) => onChange("level", v)}>
              <SelectTrigger className="h-10" data-testid={`select-level-${index}`}>
                <SelectValue placeholder={t('selectLevel')} />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l} data-testid={`level-option-${l}`}>{translateDynamic(l, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('wing')}</label>
            <Select value={assignment.wing} onValueChange={(v) => onChange("wing", v)}>
              <SelectTrigger className="h-10" data-testid={`select-wing-${index}`}>
                <SelectValue placeholder={t('selectWing')} />
              </SelectTrigger>
              <SelectContent>
                {(wingsData || []).filter(w => w.isActive).map((w) => (
                  <SelectItem key={w.id} value={w.name} data-testid={`wing-option-${w.id}`}>{getLocalizedText(language, w.name, w.nameHi, w.namePa)}</SelectItem>
                ))}
                <SelectItem value="Other" data-testid={`wing-option-other-${index}`}>{t('other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignment.wing === "Other" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('specifyWing')}</label>
              <Input
                placeholder={t('enterWingName')}
                value={assignment.customWing}
                onChange={(e) => onChange("customWing", e.target.value)}
                className="h-10"
                data-testid={`input-custom-wing-${index}`}
              />
            </div>
          )}

          {isPrimary && govWingsData && govWingsData.filter(gw => gw.isActive).length > 0 && onGovWingChange && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('punjabGovWing')}</label>
              <Select value={govWing || "__none__"} onValueChange={(v) => onGovWingChange(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-10" data-testid="select-gov-wing-pph">
                  <SelectValue placeholder={t('selectGovWing')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('none')}</SelectItem>
                  {govWingsData.filter(gw => gw.isActive).map((gw) => (
                    <SelectItem key={gw.id} value={gw.name} data-testid={`gov-wing-pph-option-${gw.id}`}>{getLocalizedText(language, gw.name, gw.nameHi, gw.namePa)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('position')}</label>
            <Select value={assignment.position} onValueChange={(v) => onChange("position", v)}>
              <SelectTrigger className="h-10" data-testid={`select-position-${index}`}>
                <SelectValue placeholder={t('selectPosition')} />
              </SelectTrigger>
              <SelectContent>
                {(positionsData || []).filter(p => p.isActive && p.name?.toLowerCase() !== 'other').map((p) => (
                  <SelectItem key={p.id} value={p.name} data-testid={`position-option-${p.id}`}>{getLocalizedText(language, p.name, p.nameHi, p.namePa)}</SelectItem>
                ))}
                <SelectItem value="__other__" data-testid={`position-option-other-${index}`}>{t('other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignment.position === "__other__" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('customPosition')}</label>
              <Input
                placeholder={t('enterCustomPosition')}
                value={assignment.customPosition}
                onChange={(e) => onChange("customPosition", e.target.value)}
                className="h-10"
                data-testid={`input-custom-position-${index}`}
              />
            </div>
          )}
        </>
      )}

      {assignment.cardType === "govt" && (
        <>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('govtPosition')}</label>
            <Select value={assignment.govPositionId} onValueChange={(v) => onChange("govPositionId", v)}>
              <SelectTrigger className="h-10" data-testid={`select-govt-position-${index}`}>
                <SelectValue placeholder={t('selectGovtPosition')} />
              </SelectTrigger>
              <SelectContent>
                {(govPositionsData || []).filter(gp => gp.isActive).map((gp) => (
                  <SelectItem key={gp.id} value={gp.id} data-testid={`govt-position-option-${gp.id}`}>
                    {getLocalizedText(language, gp.name, gp.nameHi, gp.namePa)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              {t('jurisdictionUnits')} ({assignment.jurisdictionVillageIds.length} {t('unitsSelected')})
            </label>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('selectJurisdictionUnits')}
                value={villageSearch}
                onChange={(e) => onVillageSearchChange(e.target.value)}
                className="h-9 pl-8"
                data-testid={`input-village-search-${index}`}
              />
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange("jurisdictionVillageIds", filteredVillages.map(v => v.id))}
                data-testid={`button-select-all-villages-${index}`}
              >
                {t('selectAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange("jurisdictionVillageIds", [])}
                data-testid={`button-clear-all-villages-${index}`}
              >
                {t('clearAll')}
              </Button>
            </div>

            <div className="border rounded-lg max-h-48 overflow-y-auto p-1 space-y-0.5" data-testid={`village-checklist-${index}`}>
              {filteredVillages.map((village) => (
                <label
                  key={village.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                  data-testid={`village-item-${village.id}`}
                >
                  <Checkbox
                    checked={assignment.jurisdictionVillageIds.includes(village.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange("jurisdictionVillageIds", [...assignment.jurisdictionVillageIds, village.id]);
                      } else {
                        onChange("jurisdictionVillageIds", assignment.jurisdictionVillageIds.filter((id: string) => id !== village.id));
                      }
                    }}
                    data-testid={`checkbox-village-${village.id}`}
                  />
                  <span className="text-sm">
                    {getLocalizedText(language, village.name, village.nameHi, village.namePa)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AppRegister({ email, mobile, selectedVillageId, selectedVillageName, onComplete, onBack }: RegisterProps) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { processingType, processImage } = useOcr();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"volunteer" | "party_post_holder" | null>(null);

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState(mobile || "");
  const [govWing, setGovWing] = useState("");
  const [villageSearch, setVillageSearch] = useState("");
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(null);
  const [aadhaarPhotoBack, setAadhaarPhotoBack] = useState<string | null>(null);
  const [voterCardPhoto, setVoterCardPhoto] = useState<string | null>(null);
  const [voterCardPhotoBack, setVoterCardPhotoBack] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<OcrData>({});

  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([
    { cardType: "party", wing: "", customWing: "", position: "", customPosition: "", level: "", govPositionId: "", jurisdictionVillageIds: [] }
  ]);

  const aadhaarPhotoRef = useRef<HTMLInputElement>(null);
  const aadhaarPhotoBackRef = useRef<HTMLInputElement>(null);
  const voterPhotoRef = useRef<HTMLInputElement>(null);
  const voterPhotoBackRef = useRef<HTMLInputElement>(null);
  const aadhaarGalleryRef = useRef<HTMLInputElement>(null);
  const aadhaarBackGalleryRef = useRef<HTMLInputElement>(null);
  const voterGalleryRef = useRef<HTMLInputElement>(null);
  const voterBackGalleryRef = useRef<HTMLInputElement>(null);

  const { data: wingsData } = useQuery<Wing[]>({
    queryKey: ["/api/wings"],
    enabled: role === "party_post_holder",
  });

  const { data: positionsData } = useQuery<Position[]>({
    queryKey: ["/api/positions"],
    enabled: role === "party_post_holder",
  });

  const { data: govWingsData } = useQuery<GovWing[]>({
    queryKey: ["/api/gov-wings"],
  });

  const { data: govPositionsData } = useQuery<GovPosition[]>({
    queryKey: ["/api/gov-positions"],
    enabled: role === "party_post_holder",
  });

  const { data: villagesData } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
    enabled: role === "party_post_holder",
  });

  const volunteerProgress = useMemo(() => {
    const fields = [name.trim(), mobileNumber.length === 10 ? mobileNumber : "", aadhaarPhoto, aadhaarPhotoBack, voterCardPhoto, voterCardPhotoBack];
    return { filled: fields.filter(Boolean).length, total: fields.length };
  }, [name, mobileNumber, aadhaarPhoto, aadhaarPhotoBack, voterCardPhoto, voterCardPhotoBack]);

  const pphProgress = useMemo(() => {
    const fields = [name.trim(), mobileNumber.length === 10 ? mobileNumber : "", aadhaarPhoto, aadhaarPhotoBack, voterCardPhoto, voterCardPhotoBack];
    return { filled: fields.filter(Boolean).length, total: fields.length };
  }, [name, mobileNumber, aadhaarPhoto, aadhaarPhotoBack, voterCardPhoto, voterCardPhotoBack]);

  const rolesProgress = useMemo(() => {
    let filled = 0;
    let total = 0;
    roleAssignments.forEach(ra => {
      if (ra.cardType === "party") {
        total += 3;
        if (ra.wing) filled++;
        if (ra.position === "__other__" ? ra.customPosition?.trim() : ra.position) filled++;
        if (ra.level) filled++;
      } else if (ra.cardType === "govt") {
        total += 2;
        if (ra.govPositionId) filled++;
        if (ra.jurisdictionVillageIds.length > 0) filled++;
      }
    });
    return { filled, total };
  }, [roleAssignments]);

  const roleProgress = useMemo(() => {
    return { filled: role ? 1 : 0, total: 1 };
  }, [role]);

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/app/register", data);
      return res.json();
    },
    onSuccess: (user) => {
      toast({ title: t('welcome'), description: t('registrationSuccessful') });
      onComplete(user);
    },
    onError: (error: any) => {
      let message = t('registrationFailed');
      try {
        const errorText = error?.message || "";
        const jsonMatch = errorText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error === "already_registered") {
            message = parsed.message || t('alreadyRegistered');
          } else if (parsed.message) {
            message = parsed.message;
          }
        }
      } catch {}
      toast({ title: t('error'), description: message, variant: "destructive" });
    },
  });

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
            if (result.name && !name.trim()) setName(result.name);
            if (result.name) updated.ocrName = result.name;
            if (result.aadhaarNumber) updated.ocrAadhaarNumber = result.aadhaarNumber;
            if (result.dob) updated.ocrDob = result.dob;
            if (result.gender) updated.ocrGender = result.gender;
          } else if (ocrType === "aadhaarBack") {
            if (result.address) updated.ocrAddress = result.address;
          } else if (ocrType === "voterId") {
            if (result.name && !name.trim()) setName(result.name);
            if (result.name && !updated.ocrName) updated.ocrName = result.name;
            if (result.voterId) updated.ocrVoterId = result.voterId;
          }
          return updated;
        });
      }
    } catch {}
  };

  const handlePhotoCapture = async (
    setter: (val: string | null) => void,
    ref: React.RefObject<HTMLInputElement | null>
  ) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setter(base64);
    } catch {}
  };

  const handleRoleSelect = (selectedRole: "volunteer" | "party_post_holder") => {
    setRole(selectedRole);
    setStep(selectedRole === "volunteer" ? "volunteer_details" : "pph_details");
  };

  const handlePphDetailsNextStep = () => {
    if (!name.trim()) {
      toast({ title: t('required'), description: t('enterNameRequired'), variant: "destructive" });
      return;
    }
    if (mobileNumber.length !== 10) {
      toast({ title: t('required'), description: t('enterValidMobile'), variant: "destructive" });
      return;
    }
    setStep("pph_roles");
  };


  const handleRoleAssignmentChange = (index: number, field: keyof RoleAssignment | string, value: any) => {
    setRoleAssignments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "wing" && value !== "Other") {
        updated[index].customWing = "";
      }
      if (field === "position" && value !== "__other__") {
        updated[index].customPosition = "";
      }
      if (field === "cardType") {
        updated[index].wing = "";
        updated[index].customWing = "";
        updated[index].position = "";
        updated[index].customPosition = "";
        updated[index].level = "";
        updated[index].govPositionId = "";
        updated[index].jurisdictionVillageIds = [];
      }
      return updated;
    });
  };

  const addRoleAssignment = () => {
    setRoleAssignments(prev => [...prev, { cardType: "party", wing: "", customWing: "", position: "", customPosition: "", level: "", govPositionId: "", jurisdictionVillageIds: [] }]);
  };

  const removeRoleAssignment = (index: number) => {
    setRoleAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const getPositionValue = (assignment: RoleAssignment) => {
    if (assignment.position === "__other__") return assignment.customPosition.trim();
    return assignment.position;
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: t('required'), description: t('enterNameRequired'), variant: "destructive" });
      return;
    }
    if (mobileNumber.length !== 10) {
      toast({ title: t('required'), description: t('enterValidMobile'), variant: "destructive" });
      return;
    }

    const isPph = role === "party_post_holder";

    if (isPph) {
      for (let i = 0; i < roleAssignments.length; i++) {
        const ra = roleAssignments[i];
        if (ra.cardType === "party") {
          const wingValid = ra.wing && (ra.wing !== "Other" || ra.customWing.trim());
          if (!wingValid || !getPositionValue(ra) || !ra.level) {
            toast({ title: t('required'), description: t('roleAssignmentRequired'), variant: "destructive" });
            return;
          }
        } else if (ra.cardType === "govt") {
          if (!ra.govPositionId) {
            toast({ title: t('required'), description: t('govtPositionRequired'), variant: "destructive" });
            return;
          }
          if (ra.jurisdictionVillageIds.length === 0) {
            toast({ title: t('required'), description: t('atLeastOneUnit'), variant: "destructive" });
            return;
          }
        }
      }
    }

    const getWingValue = (r: RoleAssignment) => r.wing === "Other" ? r.customWing.trim() : r.wing;
    const partyRoles = roleAssignments.filter(r => r.cardType === "party");
    const govtRoles = roleAssignments.filter(r => r.cardType === "govt");
    const primaryParty = partyRoles[0] || null;

    const hasPartyRoles = partyRoles.length > 0;
    const hasGovtRoles = govtRoles.length > 0;
    const roleType = hasPartyRoles && hasGovtRoles ? "both" : hasGovtRoles ? "govt_post_holder" : "party_post_holder";

    const additionalRoles = partyRoles.slice(hasPartyRoles ? 1 : 0)
      .filter(r => r.wing || getPositionValue(r) || r.level)
      .map(r => ({
        wing: getWingValue(r) || null,
        position: getPositionValue(r) || null,
        customPosition: r.position === "__other__" ? r.customPosition.trim() : null,
        level: r.level || null,
      }));

    const primaryOtherWingName = isPph && primaryParty && primaryParty.wing === "Other" ? primaryParty.customWing.trim() : null;
    const firstGovt = govtRoles[0] || null;

    registerMutation.mutate({
      mobileNumber: mobile || mobileNumber.trim(),
      email: email || null,
      name: name.trim(),
      role: role || "volunteer",
      registrationSource: mobile ? "sms_otp" : "email_otp",
      roleType: isPph ? roleType : null,
      currentPosition: primaryParty ? getPositionValue(primaryParty) : null,
      wing: primaryParty ? primaryParty.wing : null,
      otherWingName: primaryOtherWingName,
      level: primaryParty ? primaryParty.level : null,
      govWing: govWing || null,
      govPositionId: firstGovt ? firstGovt.govPositionId : null,
      jurisdictionVillageIds: firstGovt ? firstGovt.jurisdictionVillageIds : [],
      mappedAreaId: selectedVillageId || null,
      mappedAreaName: selectedVillageName || null,
      aadhaarPhoto,
      aadhaarPhotoBack,
      voterCardPhoto,
      voterCardPhotoBack,
      ...ocrData,
      additionalRoles: additionalRoles,
    });
  };

  const renderPhotoFields = (prefix: string) => (
    <>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1.5 block">
          {t('aadhaarCardPhoto')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input type="file" accept="image/*" capture="environment" ref={aadhaarPhotoRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setAadhaarPhoto, aadhaarPhotoRef, "aadhaarFront")} />
            <input type="file" accept="image/*" ref={aadhaarGalleryRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setAadhaarPhoto, aadhaarGalleryRef, "aadhaarFront")} />
            <div className={`w-full border-2 border-dashed rounded-lg p-2 ${aadhaarPhoto ? "border-green-500 bg-green-50" : "border-slate-300"}`}>
              {processingType === "aadhaarFront" ? (
                <div className="flex flex-col items-center justify-center h-10 gap-1">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs">{t('reading')}</span>
                </div>
              ) : aadhaarPhoto ? (
                <div className="flex flex-col items-center justify-center h-10 gap-1">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">{t('frontDone')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => aadhaarPhotoRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-aadhaar-front-camera`}>
                    <Camera className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('camera')}</span>
                  </button>
                  <div className="w-px h-8 bg-slate-300" />
                  <button onClick={() => aadhaarGalleryRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-aadhaar-front-gallery`}>
                    <Upload className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('gallery')}</span>
                  </button>
                </div>
              )}
              <span className="text-xs text-center block mt-1 text-slate-500">{t('front')}</span>
            </div>
          </div>
          <div>
            <input type="file" accept="image/*" capture="environment" ref={aadhaarPhotoBackRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setAadhaarPhotoBack, aadhaarPhotoBackRef, "aadhaarBack")} />
            <input type="file" accept="image/*" ref={aadhaarBackGalleryRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setAadhaarPhotoBack, aadhaarBackGalleryRef, "aadhaarBack")} />
            <div className={`w-full border-2 border-dashed rounded-lg p-2 ${aadhaarPhotoBack ? "border-green-500 bg-green-50" : "border-slate-300"}`}>
              {processingType === "aadhaarBack" ? (
                <div className="flex flex-col items-center justify-center h-10 gap-1">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs">{t('reading')}</span>
                </div>
              ) : aadhaarPhotoBack ? (
                <div className="flex flex-col items-center justify-center h-10 gap-1">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">{t('backDone')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => aadhaarPhotoBackRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-aadhaar-back-camera`}>
                    <Camera className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('camera')}</span>
                  </button>
                  <div className="w-px h-8 bg-slate-300" />
                  <button onClick={() => aadhaarBackGalleryRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-aadhaar-back-gallery`}>
                    <Upload className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('gallery')}</span>
                  </button>
                </div>
              )}
              <span className="text-xs text-center block mt-1 text-slate-500">{t('backSide')}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 mb-1.5 block">
          {t('voterIdPhoto')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input type="file" accept="image/*" capture="environment" ref={voterPhotoRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setVoterCardPhoto, voterPhotoRef, "voterId")} />
            <input type="file" accept="image/*" ref={voterGalleryRef} className="hidden" onChange={() => handlePhotoCaptureWithOcr(setVoterCardPhoto, voterGalleryRef, "voterId")} />
            <div className={`w-full border-2 border-dashed rounded-lg p-2 ${voterCardPhoto ? "border-green-500 bg-green-50" : "border-slate-300"}`}>
              {processingType === "voterId" ? (
                <div className="flex flex-col items-center justify-center h-10 gap-1">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-xs">{t('reading')}</span>
                </div>
              ) : voterCardPhoto ? (
                <div className="flex flex-col items-center justify-center h-10 gap-1">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">{t('frontDone')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => voterPhotoRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-voter-front-camera`}>
                    <Camera className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('camera')}</span>
                  </button>
                  <div className="w-px h-8 bg-slate-300" />
                  <button onClick={() => voterGalleryRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-voter-front-gallery`}>
                    <Upload className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('gallery')}</span>
                  </button>
                </div>
              )}
              <span className="text-xs text-center block mt-1 text-slate-500">{t('front')}</span>
            </div>
          </div>
          <div>
            <input type="file" accept="image/*" capture="environment" ref={voterPhotoBackRef} className="hidden" onChange={() => handlePhotoCapture(setVoterCardPhotoBack, voterPhotoBackRef)} />
            <input type="file" accept="image/*" ref={voterBackGalleryRef} className="hidden" onChange={() => handlePhotoCapture(setVoterCardPhotoBack, voterBackGalleryRef)} />
            <div className={`w-full border-2 border-dashed rounded-lg p-2 ${voterCardPhotoBack ? "border-green-500 bg-green-50" : "border-slate-300"}`}>
              {voterCardPhotoBack ? (
                <div className="flex flex-col items-center justify-center h-10 gap-1">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">{t('backDone')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => voterPhotoBackRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-voter-back-camera`}>
                    <Camera className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('camera')}</span>
                  </button>
                  <div className="w-px h-8 bg-slate-300" />
                  <button onClick={() => voterBackGalleryRef.current?.click()} className="flex flex-col items-center gap-1 p-1" data-testid={`button-${prefix}-voter-back-gallery`}>
                    <Upload className="h-5 w-5 text-slate-500" />
                    <span className="text-[10px] text-slate-500">{t('gallery')}</span>
                  </button>
                </div>
              )}
              <span className="text-xs text-center block mt-1 text-slate-500">{t('backSide')}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">{t('registration')}</CardTitle>
          <CardDescription>
            {email}
            {selectedVillageName && <span className="block text-xs mt-0.5">{t('unit')}: {selectedVillageName}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {step === "role" && (
            <>
              <ProgressBar filled={roleProgress.filled} total={roleProgress.total} />
              <p className="text-center text-sm text-slate-600 mb-4">{t('selectYourRole')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleRoleSelect("volunteer")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  data-testid="button-role-volunteer"
                >
                  <User className="h-10 w-10 text-blue-600" />
                  <span className="font-medium text-sm">{t('volunteer')}</span>
                </button>
                <button
                  onClick={() => handleRoleSelect("party_post_holder")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  data-testid="button-role-pph"
                >
                  <Users className="h-10 w-10 text-blue-600" />
                  <span className="font-medium text-sm text-center leading-tight">{t('partyPostHolder')}</span>
                </button>
              </div>
              <Button variant="ghost" className="w-full mt-4" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToLogin')}
              </Button>
            </>
          )}

          {step === "volunteer_details" && (
            <>
              <ProgressBar filled={volunteerProgress.filled} total={volunteerProgress.total} />

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('yourName')}</label>
                <Input
                  placeholder={t('enterFullName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  data-testid="input-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('mobileNumber')}</label>
                <Input
                  type="tel"
                  placeholder={t('enterMobileNumber')}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="h-12"
                  data-testid="input-mobile-number"
                />
              </div>

              {renderPhotoFields("vol")}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setStep("role"); setRole(null); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={registerMutation.isPending || !name.trim() || mobileNumber.length !== 10}
                  data-testid="button-submit-volunteer"
                >
                  {registerMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('submit')} <Check className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            </>
          )}

          {step === "pph_details" && (
            <>
              <ProgressBar filled={pphProgress.filled} total={pphProgress.total} />

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('yourName')}</label>
                <Input
                  placeholder={t('enterFullName')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  data-testid="input-pph-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">{t('mobileNumber')}</label>
                <Input
                  type="tel"
                  placeholder={t('enterMobileNumber')}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="h-12"
                  data-testid="input-pph-mobile-number"
                />
              </div>

              {renderPhotoFields("pph")}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setStep("role"); setRole(null); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePphDetailsNextStep}
                  disabled={!name.trim() || mobileNumber.length !== 10}
                  data-testid="button-pph-next"
                >
                  {t('next')} <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </div>
            </>
          )}

          {step === "pph_roles" && (
            <>
              <ProgressBar filled={rolesProgress.filled} total={rolesProgress.total} />

              <h3 className="text-base font-semibold text-blue-700" data-testid="text-role-assignment-heading">
                {t('roleAssignment')}
              </h3>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {roleAssignments.map((assignment, index) => (
                  <RoleAssignmentCard
                    key={index}
                    assignment={assignment}
                    index={index}
                    isPrimary={index === 0}
                    wingsData={wingsData || []}
                    positionsData={positionsData || []}
                    govPositionsData={govPositionsData || []}
                    govWingsData={govWingsData || []}
                    govWing={govWing}
                    onGovWingChange={(v) => setGovWing(v)}
                    villagesData={villagesData || []}
                    villageSearch={villageSearch}
                    onVillageSearchChange={setVillageSearch}
                    onChange={(field, value) => handleRoleAssignmentChange(index, field, value)}
                    onRemove={index > 0 ? () => removeRoleAssignment(index) : undefined}
                    t={t}
                    language={language}
                  />
                ))}
                <Button
                  variant="outline"
                  className="w-full border-dashed border-blue-300 text-blue-600"
                  onClick={addRoleAssignment}
                  data-testid="button-add-role"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addAnotherRole')}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("pph_details")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {t('back')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={registerMutation.isPending || roleAssignments.some(ra => {
                    if (ra.cardType === "party") return !ra.wing || (ra.wing === "Other" && !ra.customWing?.trim()) || !getPositionValue(ra) || !ra.level;
                    if (ra.cardType === "govt") return !ra.govPositionId || ra.jurisdictionVillageIds.length === 0;
                    return false;
                  })}
                  data-testid="button-submit-pph"
                >
                  {registerMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{t('submit')} <Check className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
