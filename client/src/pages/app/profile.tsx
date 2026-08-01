import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation, getLocalizedText, translateDynamic } from "@/lib/i18n";
import { ArrowLeft, Camera, Check, CircleAlert, Loader2, Save, X, Trophy, Sparkles, Upload, Users, Plus, Trash2, BadgeCheck } from "lucide-react";
import { useOcr } from "@/hooks/use-ocr";
import { getProfileCompletion } from "@/lib/profile-completion";
import { VoterDetailsCard } from "@/components/voter-details-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Building2 } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import type { AppUser, Village, GovWing, Wing, GovPosition } from "@shared/schema";

interface ProfileRoleAssignment {
  cardType: "party" | "govt";
  wing: string;
  otherWingName: string;
  position: string;
  level: string;
  govPositionId: string;
  jurisdictionVillageIds: string[];
}

interface ProfileProps {
  user: AppUser;
  onBack: () => void;
  onUpdate: (user: AppUser) => void;
}

export default function ProfilePage({ user, onBack, onUpdate }: ProfileProps) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { processingType, processImage } = useOcr();

  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [selectedRole, setSelectedRole] = useState(user.role || "volunteer");
  const [selectedVillageId, setSelectedVillageId] = useState(user.mappedAreaId ? String(user.mappedAreaId) : "");
  const [voterId, setVoterId] = useState(user.voterId || "");
  const [aadhaarNumber, setAadhaarNumber] = useState(user.aadhaarNumber || "");
  const [govWing, setGovWing] = useState(user.govWing || "");
  const [villageSearch, setVillageSearch] = useState("");
  const [profileVillageSearch, setProfileVillageSearch] = useState("");

  const buildInitialRoles = (): ProfileRoleAssignment[] => {
    const roles: ProfileRoleAssignment[] = [];
    const hasParty = user.wing || user.currentPosition || user.level;
    const hasGovt = user.govPositionId;
    if (hasParty) {
      roles.push({
        cardType: "party",
        wing: user.wing || "",
        otherWingName: user.otherWingName || "",
        position: user.currentPosition || "",
        level: user.level || "",
        govPositionId: "",
        jurisdictionVillageIds: [],
      });
    }
    if (hasGovt) {
      roles.push({
        cardType: "govt",
        wing: "",
        otherWingName: "",
        position: "",
        level: "",
        govPositionId: user.govPositionId || "",
        jurisdictionVillageIds: (user.jurisdictionVillageIds as string[]) || [],
      });
    }
    if (roles.length === 0) {
      roles.push({
        cardType: "party",
        wing: "",
        otherWingName: "",
        position: "",
        level: "",
        govPositionId: "",
        jurisdictionVillageIds: [],
      });
    }
    return roles;
  };

  const [profileRoles, setProfileRoles] = useState<ProfileRoleAssignment[]>(buildInitialRoles);
  const [selfPhoto, setSelfPhoto] = useState<string | null>(user.selfPhoto || null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(user.aadhaarPhoto || null);
  const [aadhaarPhotoBack, setAadhaarPhotoBack] = useState<string | null>(user.aadhaarPhotoBack || null);
  const [voterCardPhoto, setVoterCardPhoto] = useState<string | null>(user.voterCardPhoto || null);
  const [voterCardPhotoBack, setVoterCardPhotoBack] = useState<string | null>(user.voterCardPhotoBack || null);
  const [ocrData, setOcrData] = useState({
    ocrName: user.ocrName || "",
    ocrAadhaarNumber: user.ocrAadhaarNumber || "",
    ocrVoterId: user.ocrVoterId || "",
    ocrDob: user.ocrDob || "",
    ocrGender: user.ocrGender || "",
    ocrAddress: user.ocrAddress || "",
  });

  const selfPhotoRef = useRef<HTMLInputElement>(null);
  const aadhaarPhotoRef = useRef<HTMLInputElement>(null);
  const aadhaarPhotoBackRef = useRef<HTMLInputElement>(null);
  const voterPhotoRef = useRef<HTMLInputElement>(null);
  const voterPhotoBackRef = useRef<HTMLInputElement>(null);
  const selfGalleryRef = useRef<HTMLInputElement>(null);
  const aadhaarGalleryRef = useRef<HTMLInputElement>(null);
  const aadhaarBackGalleryRef = useRef<HTMLInputElement>(null);
  const voterGalleryRef = useRef<HTMLInputElement>(null);
  const voterBackGalleryRef = useRef<HTMLInputElement>(null);

  const { data: hierarchy } = useQuery<{ levels: string[]; wings: string[]; villages: Village[] }>({
    queryKey: ["/api/app/hierarchy"],
  });

  const { data: wingsData } = useQuery<Wing[]>({
    queryKey: ["/api/wings"],
  });

  const { data: govWingsData } = useQuery<GovWing[]>({
    queryKey: ["/api/gov-wings"],
  });

  const { data: govPositionsData } = useQuery<GovPosition[]>({
    queryKey: ["/api/gov-positions"],
    enabled: selectedRole === "party_post_holder",
  });

  const { data: villagesData } = useQuery<Village[]>({
    queryKey: ["/api/villages"],
  });

  const handleProfileRoleChange = (index: number, field: string, value: any) => {
    setProfileRoles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "cardType") {
        updated[index].wing = "";
        updated[index].otherWingName = "";
        updated[index].position = "";
        updated[index].level = "";
        updated[index].govPositionId = "";
        updated[index].jurisdictionVillageIds = [];
      }
      return updated;
    });
  };

  const addProfileRole = () => {
    setProfileRoles(prev => [...prev, { cardType: "party", wing: "", otherWingName: "", position: "", level: "", govPositionId: "", jurisdictionVillageIds: [] }]);
  };

  const removeProfileRole = (index: number) => {
    setProfileRoles(prev => prev.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/app/profile/${user.id}`, data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      toast({ title: t('profileSaved'), description: t('profileUpdated') });
      onUpdate(updatedUser);
    },
    onError: () => {
      toast({ title: t('error'), description: t('failedSaveProfile'), variant: "destructive" });
    },
  });

  const handlePhotoCapture = async (
    setter: (val: string) => void,
    ref: React.RefObject<HTMLInputElement>,
    ocrType?: "aadhaarFront" | "aadhaarBack" | "voterId"
  ) => {
    const file = ref.current?.files?.[0];
    if (file) {
      try {
        const dataUrl = await compressImage(file);
        setter(dataUrl);
        if (ocrType) {
          const result = await processImage(ocrType, dataUrl);
          if (result) {
            setOcrData((prev) => {
              const updated = { ...prev };
              if (ocrType === "aadhaarFront") {
                if (result.name && !name) setName(result.name);
                if (result.aadhaarNumber && !aadhaarNumber) setAadhaarNumber(result.aadhaarNumber);
                updated.ocrName = result.name || prev.ocrName;
                updated.ocrAadhaarNumber = result.aadhaarNumber || prev.ocrAadhaarNumber;
                updated.ocrDob = result.dob || prev.ocrDob;
                updated.ocrGender = result.gender || prev.ocrGender;
              } else if (ocrType === "aadhaarBack") {
                updated.ocrAddress = result.address || prev.ocrAddress;
              } else if (ocrType === "voterId") {
                if (result.voterId && !voterId) setVoterId(result.voterId);
                updated.ocrVoterId = result.voterId || prev.ocrVoterId;
              }
              return updated;
            });
          }
        }
      } catch {}
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: t('nameRequired'), variant: "destructive" });
      return;
    }

    if (selectedRole === "party_post_holder") {
      for (const ra of profileRoles) {
        if (ra.cardType === "govt") {
          if (!ra.govPositionId) {
            toast({ title: t('govtPositionRequired'), variant: "destructive" });
            return;
          }
          if (ra.jurisdictionVillageIds.length === 0) {
            toast({ title: t('atLeastOneUnit'), variant: "destructive" });
            return;
          }
        }
      }
    }

    const partyRoles = profileRoles.filter(r => r.cardType === "party");
    const govtRoles = profileRoles.filter(r => r.cardType === "govt");
    const primaryParty = partyRoles[0] || null;
    const firstGovt = govtRoles[0] || null;

    const hasParty = partyRoles.length > 0;
    const hasGovt = govtRoles.length > 0;
    const roleType = hasParty && hasGovt ? "both" : hasGovt ? "govt_post_holder" : "party_post_holder";

    const payload: any = {
      name: name.trim(),
      email: email.trim() || null,
      role: selectedRole,
      villageId: selectedVillageId || null,
      voterId: voterId.trim() || null,
      aadhaarNumber: aadhaarNumber.trim() || null,
      currentPosition: primaryParty ? primaryParty.position || null : null,
      level: primaryParty ? primaryParty.level || null : null,
      wing: primaryParty ? primaryParty.wing || null : null,
      otherWingName: primaryParty && primaryParty.wing === "Other" ? primaryParty.otherWingName.trim() : null,
      govWing: govWing || null,
      selfPhoto,
      aadhaarPhoto,
      aadhaarPhotoBack,
      voterCardPhoto,
      voterCardPhotoBack,
      ...ocrData,
    };
    if (selectedRole === "party_post_holder") {
      payload.roleType = roleType;
      payload.govPositionId = firstGovt ? firstGovt.govPositionId : null;
      payload.jurisdictionVillageIds = firstGovt ? firstGovt.jurisdictionVillageIds : [];
    }
    saveMutation.mutate(payload);
  };

  const primaryPartyForCompletion = profileRoles.find(r => r.cardType === "party");
  const currentUser = {
    ...user,
    name,
    voterId,
    aadhaarNumber,
    currentPosition: primaryPartyForCompletion?.position || "",
    level: primaryPartyForCompletion?.level || "",
    wing: primaryPartyForCompletion?.wing || "",
    selfPhoto,
    aadhaarPhoto,
    aadhaarPhotoBack,
    voterCardPhoto,
    voterCardPhotoBack,
  } as AppUser;

  const completion = getProfileCompletion(currentUser);
  const roleLabel =
    selectedRole === "party_post_holder"
      ? t("partyPostHolder")
      : selectedRole === "mahila_sakhi"
      ? (language === "hi" ? "महिला सखी" : language === "pa" ? "ਮਹਿਲਾ ਸਖੀ" : "Mahila Sakhi")
      : t("volunteer");
  const isComplete = completion.percentage === 100;

  return (
    <div className="min-h-screen app-page">
      <header className="app-header text-white sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-9 w-9 rounded-xl shrink-0"
            onClick={onBack}
            data-testid="button-profile-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-[15px] leading-tight flex items-center gap-1.5" data-testid="text-profile-title">
              {t("myProfile")}
              {user.isApproved && (
                <BadgeCheck className="h-4 w-4 text-amber-300 shrink-0" data-testid="badge-profile-verified" />
              )}
            </h1>
            <p className="text-white/70 text-[11px] mt-0.5">
              {completion.filledCount} {t("of")} {completion.totalCount} {t("fieldsCompleted")}
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 gap-1.5 h-9 px-3 rounded-xl"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-profile"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="text-sm font-medium">{t("save")}</span>
          </Button>
        </div>
      </header>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-28">
        {/* Identity hero */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a274f] to-[#1565c0] ring-2 ring-white shadow-md">
              {selfPhoto ? (
                <img src={selfPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xl font-semibold">
                  {(name || user.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isComplete && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 truncate tracking-tight">{name || user.name}</p>
            <span className="inline-flex mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#eef4ff] text-[#0d47a1]">
              {roleLabel}
            </span>
            {user.mappedAreaName && (
              <p className="text-[11px] text-slate-500 mt-1.5 truncate">{user.mappedAreaName}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p
              className={`text-xl font-bold tabular-nums leading-none ${isComplete ? "text-emerald-600" : "text-[#0d47a1]"}`}
              data-testid="text-profile-percentage"
            >
              {completion.percentage}%
            </p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">complete</p>
          </div>
        </div>

        {/* Completion status */}
        <div
          className={`rounded-2xl p-4 border shadow-sm ${
            isComplete
              ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-100"
              : "bg-gradient-to-br from-[#0a274f] via-[#0d47a1] to-[#1565c0] border-transparent text-white"
          }`}
          data-testid="profile-progress-section"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isComplete ? "bg-emerald-100" : "bg-white/15"
              }`}
            >
              {isComplete ? (
                <Trophy className="h-5 w-5 text-emerald-600" />
              ) : (
                <Sparkles className="h-5 w-5 text-amber-200" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${isComplete ? "text-emerald-900" : "text-white"}`}>
                {isComplete ? t("profileComplete") : t("completeYourProfile")}
              </p>
              <p className={`text-xs mt-0.5 ${isComplete ? "text-emerald-600" : "text-white/70"}`}>
                {completion.filledCount} {t("of")} {completion.totalCount} {t("fieldsCompleted")}
              </p>
            </div>
          </div>
          <div
            className={`h-2 rounded-full overflow-hidden ${isComplete ? "bg-emerald-100" : "bg-white/20"}`}
            data-testid="progress-bar-track"
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${completion.percentage}%`,
                background: isComplete
                  ? "linear-gradient(90deg, #22c55e, #16a34a)"
                  : "linear-gradient(90deg, #fbbf24, #f59e0b)",
              }}
              data-testid="progress-bar-fill"
            />
          </div>
          {completion.missingFields.length > 0 && (
            <div className={`flex items-start gap-2 text-xs mt-2.5 ${isComplete ? "text-emerald-700" : "text-white/80"}`}>
              <CircleAlert className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isComplete ? "text-emerald-500" : "text-amber-300"}`} />
              <span>
                {t("missing")}: {completion.missingFields.map((f) => f.label).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
            <span className="h-5 w-1.5 rounded-full bg-[#1565c0]" aria-hidden />
            <h2 className="text-base font-bold text-black tracking-tight">{t("personalInformation")}</h2>
          </div>
          <div className="px-4 pb-4 space-y-4">
            <FieldBlock label={`${t("fullName")} *`}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("enterFullName")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                data-testid="input-profile-name"
              />
            </FieldBlock>
            <FieldBlock label={t("email")}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("enterEmail") || "Enter email"}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                data-testid="input-profile-email"
              />
            </FieldBlock>
            <FieldBlock label={t("mobileNumber")}>
              <Input
                value={user.mobileNumber || ""}
                disabled
                className="h-11 rounded-xl bg-slate-100 text-slate-500 border-slate-200"
                data-testid="input-profile-mobile"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                {t("mobileCannotChange") || "Mobile number cannot be changed (used for login)"}
              </p>
            </FieldBlock>
            <FieldBlock label={t("villageWard")}>
              <div className="space-y-2">
                <Input
                  value={profileVillageSearch}
                  onChange={(e) => setProfileVillageSearch(e.target.value)}
                  placeholder={t("searchVillage") || "Search village/ward..."}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/50"
                  data-testid="input-profile-village-search"
                />
                <Select value={selectedVillageId} onValueChange={(v) => setSelectedVillageId(v)}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50" data-testid="select-profile-village">
                    <SelectValue placeholder={t("selectVillage") || "Select Village/Ward"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(villagesData || [])
                      .filter((v) => v.isActive)
                      .filter((v) => {
                        if (!profileVillageSearch.trim()) return true;
                        const s = profileVillageSearch.toLowerCase();
                        return (
                          v.name.toLowerCase().includes(s) ||
                          v.nameHi?.toLowerCase().includes(s) ||
                          v.namePa?.toLowerCase().includes(s)
                        );
                      })
                      .map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {getLocalizedText(language, v.name, v.nameHi, v.namePa)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </FieldBlock>
            <PhotoField
              label={t("selfPhoto")}
              photo={selfPhoto}
              inputRef={selfPhotoRef}
              galleryRef={selfGalleryRef}
              onCapture={() => handlePhotoCapture(setSelfPhoto, selfPhotoRef)}
              onGalleryCapture={() => handlePhotoCapture(setSelfPhoto, selfGalleryRef)}
              onClear={() => setSelfPhoto(null)}
              testId="profile-self-photo"
              processing={false}
              t={t}
            />
          </div>
        </section>

        {/* ID Documents */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
            <span className="h-5 w-1.5 rounded-full bg-[#1565c0]" aria-hidden />
            <h2 className="text-base font-bold text-black tracking-tight">{t("idDocuments")}</h2>
          </div>
          <div className="px-4 pb-4 space-y-4">
            <FieldBlock label={t("voterIdNumber")}>
              <Input
                value={voterId}
                onChange={(e) => setVoterId(e.target.value)}
                placeholder={t("enterVoterId")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                data-testid="input-profile-voter-id"
              />
            </FieldBlock>
            <VoterDetailsCard voterId={voterId} />
            <FieldBlock label={t("aadhaarNumber")}>
              <Input
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder={t("enterAadhaar")}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:bg-white"
                data-testid="input-profile-aadhaar"
              />
            </FieldBlock>
            <PhotoField
              label={t("aadhaarFront")}
              photo={aadhaarPhoto}
              inputRef={aadhaarPhotoRef}
              galleryRef={aadhaarGalleryRef}
              onCapture={() => handlePhotoCapture(setAadhaarPhoto, aadhaarPhotoRef, "aadhaarFront")}
              onGalleryCapture={() => handlePhotoCapture(setAadhaarPhoto, aadhaarGalleryRef, "aadhaarFront")}
              onClear={() => setAadhaarPhoto(null)}
              testId="profile-aadhaar-front"
              processing={processingType === "aadhaarFront"}
              t={t}
            />
            <PhotoField
              label={t("aadhaarBack")}
              photo={aadhaarPhotoBack}
              inputRef={aadhaarPhotoBackRef}
              galleryRef={aadhaarBackGalleryRef}
              onCapture={() => handlePhotoCapture(setAadhaarPhotoBack, aadhaarPhotoBackRef, "aadhaarBack")}
              onGalleryCapture={() => handlePhotoCapture(setAadhaarPhotoBack, aadhaarBackGalleryRef, "aadhaarBack")}
              onClear={() => setAadhaarPhotoBack(null)}
              testId="profile-aadhaar-back"
              processing={processingType === "aadhaarBack"}
              t={t}
            />
            <PhotoField
              label={t("voterCardFront")}
              photo={voterCardPhoto}
              inputRef={voterPhotoRef}
              galleryRef={voterGalleryRef}
              onCapture={() => handlePhotoCapture(setVoterCardPhoto, voterPhotoRef, "voterId")}
              onGalleryCapture={() => handlePhotoCapture(setVoterCardPhoto, voterGalleryRef, "voterId")}
              onClear={() => setVoterCardPhoto(null)}
              testId="profile-voter-front"
              processing={processingType === "voterId"}
              t={t}
            />
            <PhotoField
              label={t("voterCardBack")}
              photo={voterCardPhotoBack}
              inputRef={voterPhotoBackRef}
              galleryRef={voterBackGalleryRef}
              onCapture={() => handlePhotoCapture(setVoterCardPhotoBack, voterPhotoBackRef)}
              onGalleryCapture={() => handlePhotoCapture(setVoterCardPhotoBack, voterBackGalleryRef)}
              onClear={() => setVoterCardPhotoBack(null)}
              testId="profile-voter-back"
              processing={false}
              t={t}
            />
          </div>
        </section>

        {/* Role */}
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
            <span className="h-5 w-1.5 rounded-full bg-[#1565c0]" aria-hidden />
            <h2 className="text-base font-bold text-black tracking-tight">{t("roleAndAssignment")}</h2>
          </div>
          <div className="px-4 pb-4 space-y-4">
            <FieldBlock label={t("role")}>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v)}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50" data-testid="select-profile-role">
                  <SelectValue placeholder={t("selectRole") || "Select Role"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">{t("volunteer")}</SelectItem>
                  <SelectItem value="party_post_holder">{t("partyPostHolder")}</SelectItem>
                </SelectContent>
              </Select>
            </FieldBlock>

            {selectedRole === "party_post_holder" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">{t("roleAssignment")}</p>
                {profileRoles.map((ra, index) => {
                  const filteredVillages = (villagesData || []).filter((v) => {
                    if (!v.isActive) return false;
                    if (!villageSearch.trim()) return true;
                    const s = villageSearch.toLowerCase();
                    return (
                      v.name.toLowerCase().includes(s) ||
                      v.nameHi?.toLowerCase().includes(s) ||
                      v.namePa?.toLowerCase().includes(s)
                    );
                  });

                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200/80 p-3.5 space-y-3 bg-slate-50/80"
                      data-testid={`profile-role-card-${index}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-sm font-semibold text-[#0d47a1]"
                          data-testid={`text-profile-role-label-${index}`}
                        >
                          {index === 0 ? t("primaryRole") : `${t("additionalRole")} ${index}`}
                        </span>
                        {index > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 h-8 rounded-lg"
                            onClick={() => removeProfileRole(index)}
                            data-testid={`button-remove-profile-role-${index}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {t("removeRole")}
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${
                            ra.cardType === "party"
                              ? "border-[#1565c0] bg-[#eef4ff] text-[#0d47a1]"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                          onClick={() => handleProfileRoleChange(index, "cardType", "party")}
                          data-testid={`button-profile-card-type-party-${index}`}
                        >
                          <Users className="h-4 w-4" />
                          {t("partyPostHolder")}
                        </button>
                        <button
                          type="button"
                          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${
                            ra.cardType === "govt"
                              ? "border-[#1565c0] bg-[#eef4ff] text-[#0d47a1]"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                          onClick={() => handleProfileRoleChange(index, "cardType", "govt")}
                          data-testid={`button-profile-card-type-govt-${index}`}
                        >
                          <Building2 className="h-4 w-4" />
                          {t("govtPostHolder")}
                        </button>
                      </div>

                      {ra.cardType === "party" && (
                        <>
                          <FieldBlock label={t("wing")}>
                            <Select value={ra.wing} onValueChange={(v) => handleProfileRoleChange(index, "wing", v)}>
                              <SelectTrigger className="h-11 rounded-xl bg-white" data-testid={`select-profile-wing-${index}`}>
                                <SelectValue placeholder={t("selectWing")} />
                              </SelectTrigger>
                              <SelectContent>
                                {wingsData?.filter((w) => w.isActive).map((w) => (
                                  <SelectItem key={w.id} value={w.name}>
                                    {getLocalizedText(language, w.name, w.nameHi, w.namePa)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FieldBlock>
                          {ra.wing === "Other" && (
                            <FieldBlock label={t("otherWingName")}>
                              <Input
                                value={ra.otherWingName}
                                onChange={(e) => handleProfileRoleChange(index, "otherWingName", e.target.value)}
                                placeholder={t("specifyWingName")}
                                className="h-11 rounded-xl bg-white"
                                data-testid={`input-profile-other-wing-${index}`}
                              />
                            </FieldBlock>
                          )}
                          {index === 0 && govWingsData && govWingsData.filter((gw) => gw.isActive).length > 0 && (
                            <FieldBlock label={t("punjabGovWing")}>
                              <Select
                                value={govWing || "__none__"}
                                onValueChange={(v) => setGovWing(v === "__none__" ? "" : v)}
                              >
                                <SelectTrigger className="h-11 rounded-xl bg-white" data-testid="select-profile-gov-wing">
                                  <SelectValue placeholder={t("selectGovWing")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">{t("none")}</SelectItem>
                                  {govWingsData.filter((gw) => gw.isActive).map((gw) => (
                                    <SelectItem key={gw.id} value={gw.name}>
                                      {getLocalizedText(language, gw.name, gw.nameHi, gw.namePa)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FieldBlock>
                          )}
                          <FieldBlock label={t("level")}>
                            <Select value={ra.level} onValueChange={(v) => handleProfileRoleChange(index, "level", v)}>
                              <SelectTrigger className="h-11 rounded-xl bg-white" data-testid={`select-profile-level-${index}`}>
                                <SelectValue placeholder={t("selectLevel")} />
                              </SelectTrigger>
                              <SelectContent>
                                {hierarchy?.levels.map((l) => (
                                  <SelectItem key={l} value={l}>
                                    {translateDynamic(l, language)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FieldBlock>
                          <FieldBlock label={t("position")}>
                            <Input
                              value={ra.position}
                              onChange={(e) => handleProfileRoleChange(index, "position", e.target.value)}
                              placeholder={t("enterPosition")}
                              className="h-11 rounded-xl bg-white"
                              data-testid={`input-profile-position-${index}`}
                            />
                          </FieldBlock>
                        </>
                      )}

                      {ra.cardType === "govt" && (
                        <>
                          <FieldBlock label={t("govtPosition")}>
                            <Select
                              value={ra.govPositionId || ""}
                              onValueChange={(v) => handleProfileRoleChange(index, "govPositionId", v)}
                            >
                              <SelectTrigger
                                className="h-11 rounded-xl bg-white"
                                data-testid={`select-profile-govt-position-${index}`}
                              >
                                <SelectValue placeholder={t("selectGovtPosition")} />
                              </SelectTrigger>
                              <SelectContent>
                                {govPositionsData?.filter((gp) => gp.isActive).map((gp) => (
                                  <SelectItem key={gp.id} value={String(gp.id)}>
                                    {getLocalizedText(language, gp.name, gp.nameHi, gp.namePa)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FieldBlock>
                          <FieldBlock
                            label={`${t("jurisdictionUnits")} (${ra.jurisdictionVillageIds.length} ${t("unitsSelected")})`}
                          >
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                              <div className="p-2.5 border-b border-slate-100">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input
                                    value={villageSearch}
                                    onChange={(e) => setVillageSearch(e.target.value)}
                                    placeholder={t("selectJurisdictionUnits")}
                                    className="pl-8 h-9 text-sm rounded-lg"
                                    data-testid={`input-profile-village-search-${index}`}
                                  />
                                </div>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg h-8"
                                    onClick={() =>
                                      handleProfileRoleChange(
                                        index,
                                        "jurisdictionVillageIds",
                                        filteredVillages.map((v) => String(v.id)),
                                      )
                                    }
                                    data-testid={`button-select-all-villages-${index}`}
                                  >
                                    {t("selectAll")}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-lg h-8"
                                    onClick={() => handleProfileRoleChange(index, "jurisdictionVillageIds", [])}
                                    data-testid={`button-clear-all-villages-${index}`}
                                  >
                                    {t("clearAll")}
                                  </Button>
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
                                {filteredVillages.map((v) => {
                                  const vid = String(v.id);
                                  const checked = ra.jurisdictionVillageIds.includes(vid);
                                  return (
                                    <label
                                      key={v.id}
                                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                                      data-testid={`label-village-${v.id}`}
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(c) => {
                                          if (c) {
                                            handleProfileRoleChange(index, "jurisdictionVillageIds", [
                                              ...ra.jurisdictionVillageIds,
                                              vid,
                                            ]);
                                          } else {
                                            handleProfileRoleChange(
                                              index,
                                              "jurisdictionVillageIds",
                                              ra.jurisdictionVillageIds.filter((id: string) => id !== vid),
                                            );
                                          }
                                        }}
                                        data-testid={`checkbox-village-${v.id}`}
                                      />
                                      <span>{getLocalizedText(language, v.name, v.nameHi, v.namePa)}</span>
                                    </label>
                                  );
                                })}
                                {filteredVillages.length === 0 && (
                                  <p className="text-sm text-slate-400 text-center py-2">{t("noResults")}</p>
                                )}
                              </div>
                            </div>
                          </FieldBlock>
                        </>
                      )}
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  className="w-full border-dashed border-[#93c5fd] text-[#0d47a1] rounded-xl h-11 hover:bg-[#eef4ff]"
                  onClick={addProfileRole}
                  data-testid="button-add-profile-role"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addAnotherRole")}
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40">
        <div className="max-w-lg mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-[#f4f7fb] via-[#f4f7fb]/95 to-transparent">
          <Button
            className="w-full h-12 text-sm rounded-xl bg-[#0d47a1] hover:bg-[#1565c0] text-white shadow-lg shadow-blue-900/20"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-profile-bottom"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            {t("saveProfile")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function PhotoField({
  label,
  photo,
  inputRef,
  galleryRef,
  onCapture,
  onGalleryCapture,
  onClear,
  testId,
  processing,
  t,
}: {
  label: string;
  photo: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  galleryRef: React.RefObject<HTMLInputElement>;
  onCapture: () => void;
  onGalleryCapture: () => void;
  onClear: () => void;
  testId: string;
  processing: boolean;
  t: (key: any) => string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">
        {label}
      </label>
      {photo ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <img src={photo} alt={label} className="w-full h-36 object-cover" data-testid={`img-${testId}`} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/55 text-white h-8 w-8 rounded-full hover:bg-black/70"
            onClick={onClear}
            data-testid={`button-clear-${testId}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {processing && (
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
              <div className="bg-white rounded-xl px-3.5 py-2 flex items-center gap-2 text-sm shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-[#0d47a1]" />
                {t("reading")}
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2">
            <div className="bg-emerald-500 rounded-full p-1 shadow-sm ring-2 ring-white/80">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-28 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/80 flex items-center justify-center gap-8">
          <button
            type="button"
            className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-[#1565c0] transition-colors p-2"
            onClick={() => inputRef.current?.click()}
            data-testid={`button-camera-${testId}`}
          >
            <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Camera className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium">{t("camera")}</span>
          </button>
          <div className="w-px h-12 bg-slate-200" />
          <button
            type="button"
            className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-[#1565c0] transition-colors p-2"
            onClick={() => galleryRef.current?.click()}
            data-testid={`button-gallery-${testId}`}
          >
            <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-medium">{t("gallery")}</span>
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onCapture}
        data-testid={`input-file-${testId}`}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onGalleryCapture}
        data-testid={`input-gallery-${testId}`}
      />
    </div>
  );
}
