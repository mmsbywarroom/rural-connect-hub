import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useOcr } from "@/hooks/use-ocr";
import { compressImage } from "@/lib/image-compress";
import { ArrowLeft, Camera, Upload, Check, Loader2, User, MapPin, FileCheck, Vote } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, VoterRegistrationSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "unit" | "form";

const AGE_PROOF_OPTIONS = [
  { value: "birth_certificate", label: "Birth Certificate" },
  { value: "tenth_marksheet", label: "10th Marksheet" },
  { value: "passport", label: "Passport" },
  { value: "pan_card", label: "PAN Card" },
];

const ADDRESS_PROOF_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "electricity_bill", label: "Electricity Bill" },
  { value: "bank_passbook", label: "Bank Passbook" },
  { value: "rent_agreement", label: "Rent Agreement" },
  { value: "ration_card", label: "Ration Card" },
  { value: "driving_licence", label: "Driving Licence" },
];

const DISABILITY_OPTIONS = [
  { value: "None", label: "None" },
  { value: "Visual", label: "Visual" },
  { value: "Hearing", label: "Hearing" },
  { value: "Speech", label: "Speech" },
  { value: "Locomotor", label: "Locomotor" },
  { value: "Mental", label: "Mental" },
  { value: "Other", label: "Other" },
];

function DocPhotoField({
  label,
  value,
  onCapture,
  onUpload,
  processing,
  processingLabel,
  ocrAccepted,
}: {
  label: string;
  value: string;
  onCapture: () => void;
  onUpload: () => void;
  processing: boolean;
  processingLabel: string;
  ocrAccepted?: boolean;
}) {
  return (
    <div className={`border-2 border-dashed rounded-lg p-3 ${value ? "border-green-500 bg-green-50" : "border-slate-300"}`}>
      {processing ? (
        <div className="flex flex-col items-center justify-center h-12 gap-1">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs">{processingLabel}</span>
        </div>
      ) : value ? (
        <div className="flex flex-col items-center justify-center h-12 gap-1">
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-xs text-green-600">{label}</span>
          {ocrAccepted !== undefined && (
            <span className="text-[10px] text-slate-500">{ocrAccepted ? "OCR verified" : ""}</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-slate-600 mb-1">{label}</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCapture} className="flex flex-col items-center gap-1 p-1">
              <Camera className="h-5 w-5 text-slate-500" />
              <span className="text-[10px] text-slate-500">Camera</span>
            </button>
            <button type="button" onClick={onUpload} className="flex flex-col items-center gap-1 p-1">
              <Upload className="h-5 w-5 text-slate-500" />
              <span className="text-[10px] text-slate-500">Upload</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskVoterRegistration({ user }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { processingType, processImage } = useOcr();

  const [step, setStep] = useState<Step>("unit");
  const [selectedUnit, setSelectedUnit] = useState<{ villageId: string; villageName: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submissionSearch, setSubmissionSearch] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [relativeName, setRelativeName] = useState("");
  const [relationType, setRelationType] = useState("");

  const [houseNumber, setHouseNumber] = useState("");
  const [streetMohallaVillage, setStreetMohallaVillage] = useState("");
  const [postOffice, setPostOffice] = useState("");
  const [district, setDistrict] = useState("");
  const [pinCode, setPinCode] = useState("");

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");

  const [disability, setDisability] = useState("None");

  const [ageProofType, setAgeProofType] = useState("");
  const [ageProofImage, setAgeProofImage] = useState("");
  const [ageProofOcrData, setAgeProofOcrData] = useState("");

  const [addressProofType, setAddressProofType] = useState("");
  const [addressProofImage, setAddressProofImage] = useState("");
  const [addressProofOcrData, setAddressProofOcrData] = useState("");
  const [addressProofFront, setAddressProofFront] = useState("");
  const [addressProofBack, setAddressProofBack] = useState("");

  const [photograph, setPhotograph] = useState("");
  const [photographOcrData, setPhotographOcrData] = useState("");

  const ageProofCamRef = useRef<HTMLInputElement>(null);
  const ageProofUpRef = useRef<HTMLInputElement>(null);
  const addressProofCamRef = useRef<HTMLInputElement>(null);
  const addressProofUpRef = useRef<HTMLInputElement>(null);
  const addressProofBackCamRef = useRef<HTMLInputElement>(null);
  const addressProofBackUpRef = useRef<HTMLInputElement>(null);
  const photoCamRef = useRef<HTMLInputElement>(null);
  const photoUpRef = useRef<HTMLInputElement>(null);

  const sendMobileOtp = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/voter-registration/send-otp", { mobile: mobileNumber.replace(/\D/g, "").replace(/^91/, "") });
      return res.json();
    },
    onSuccess: () => {
      setMobileOtpSent(true);
      toast({ title: "OTP sent", description: "Check your mobile for OTP" });
    },
    onError: () => toast({ title: "Failed to send OTP", variant: "destructive" }),
  });

  const verifyMobileOtp = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/voter-registration/verify-otp", { mobile: mobileNumber.replace(/\D/g, "").replace(/^91/, ""), otp: mobileOtp });
      return res.json();
    },
    onSuccess: () => {
      setMobileVerified(true);
      setMobileOtpSent(false);
      setMobileOtp("");
      toast({ title: "Mobile verified" });
    },
    onError: () => toast({ title: "Invalid OTP", variant: "destructive" }),
  });

  const sendEmailOtp = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/voter-registration/send-otp", { email: email.trim().toLowerCase() });
      return res.json();
    },
    onSuccess: () => {
      setEmailOtpSent(true);
      toast({ title: "OTP sent", description: "Check your email for OTP" });
    },
    onError: () => toast({ title: "Failed to send OTP", variant: "destructive" }),
  });

  const verifyEmailOtp = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/voter-registration/verify-otp", { email: email.trim().toLowerCase(), otp: emailOtp });
      return res.json();
    },
    onSuccess: () => {
      setEmailVerified(true);
      setEmailOtpSent(false);
      setEmailOtp("");
      toast({ title: "Email verified" });
    },
    onError: () => toast({ title: "Invalid OTP", variant: "destructive" }),
  });

  const handleAgeProofCapture = async (ref: React.RefObject<HTMLInputElement | null>) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      const result = await processImage("ageProof", base64);
      const hasData = result && (result.dob || result.name || (result as any).rawText);
      if (hasData) {
        setAgeProofImage(base64);
        setAgeProofOcrData(JSON.stringify(result || {}));
        toast({ title: "Document accepted", description: "Age proof read successfully" });
      } else {
        toast({ title: "Document not read", description: "Please ensure the document is clear and try again", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not read document", variant: "destructive" });
    }
    if (ref.current) ref.current.value = "";
  };

  const handleAddressProofCaptureSingle = async (ref: React.RefObject<HTMLInputElement | null>) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      const result = await processImage("addressProof", base64);
      const hasData = result && (result.address || (result as any).rawText);
      if (hasData) {
        setAddressProofImage(base64);
        setAddressProofOcrData(JSON.stringify(result || {}));
        toast({ title: "Document accepted", description: "Address proof read successfully" });
      } else {
        toast({
          title: "Document not read",
          description: "Please ensure the document is clear and try again",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Could not read document", variant: "destructive" });
    }
    if (ref.current) ref.current.value = "";
  };

  const handleAddressProofCaptureAadhaar = async (
    which: "front" | "back",
    ref: React.RefObject<HTMLInputElement | null>
  ) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      if (which === "front") {
        const result = await processImage("addressProof", base64);
        const hasData = result && (result.address || (result as any).rawText);
        if (hasData) {
          setAddressProofFront(base64);
          setAddressProofOcrData(JSON.stringify(result || {}));
          toast({ title: "Document accepted", description: "Address proof read successfully" });
        } else {
          toast({
            title: "Document not read",
            description: "Please ensure the Aadhaar front side is clear and try again",
            variant: "destructive",
          });
        }
      } else {
        setAddressProofBack(base64);
      }
    } catch {
      toast({ title: "Could not read document", variant: "destructive" });
    }
    if (ref.current) ref.current.value = "";
  };

  const handlePhotoCapture = async (ref: React.RefObject<HTMLInputElement | null>) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setPhotograph(base64);
    } catch {
      toast({ title: "Failed to add photo", variant: "destructive" });
    }
    if (ref.current) ref.current.value = "";
  };

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingId) {
        const res = await apiRequest("PATCH", `/api/voter-registration/my-submissions/${editingId}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/voter-registration/submit", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Application submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/voter-registration/my-submissions", user.id] });
      setFirstName("");
      setLastName("");
      setGender("");
      setDateOfBirth("");
      setPlaceOfBirth("");
      setRelativeName("");
      setRelationType("");
      setHouseNumber("");
      setStreetMohallaVillage("");
      setPostOffice("");
      setDistrict("");
      setPinCode("");
      setAadhaarNumber("");
      setMobileNumber("");
      setEmail("");
      setMobileVerified(false);
      setEmailVerified(false);
      setDisability("None");
      setAgeProofType("");
      setAgeProofImage("");
      setAgeProofOcrData("");
      setAddressProofType("");
      setAddressProofImage("");
      setAddressProofOcrData("");
      setAddressProofFront("");
      setAddressProofBack("");
      setPhotograph("");
      setPhotographOcrData("");
      setEditingId(null);
    },
    onError: () => toast({ title: "Failed to submit", variant: "destructive" }),
  });

  const { data: mySubmissions = [] } = useQuery<VoterRegistrationSubmission[]>({
    queryKey: ["/api/voter-registration/my-submissions", user.id],
  });

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !gender || !dateOfBirth || !relativeName || !relationType) {
      toast({ title: "Please fill personal details", variant: "destructive" });
      return;
    }
    if (!houseNumber.trim() || !streetMohallaVillage.trim() || !postOffice || !district || !pinCode.trim()) {
      toast({ title: "Please fill address details", variant: "destructive" });
      return;
    }
    const cleanMobile = mobileNumber.replace(/\D/g, "").replace(/^91/, "");
    const hasVerifiedMobile = cleanMobile.length === 10 && mobileVerified;
    const hasVerifiedEmail = !!email.trim() && emailVerified;
    if (!hasVerifiedMobile && !hasVerifiedEmail) {
      toast({
        title: "OTP verification required",
        description: "Please verify either mobile number or email with OTP",
        variant: "destructive",
      });
      return;
    }
    const isAadhaarAddress = addressProofType === "aadhaar";
    if (
      !ageProofType ||
      !ageProofImage ||
      !addressProofType ||
      (isAadhaarAddress ? (!addressProofFront || !addressProofBack) : !addressProofImage) ||
      !photograph
    ) {
      toast({ title: "Please upload all documents and photograph", variant: "destructive" });
      return;
    }

    const cleanMobileForPayload = cleanMobile || null;
    const cleanEmailForPayload = email.trim() || null;
    const addressProofImagePayload = isAadhaarAddress
      ? JSON.stringify({ front: addressProofFront || null, back: addressProofBack || null })
      : addressProofImage;
    submitMutation.mutate({
      appUserId: user.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      dateOfBirth,
      placeOfBirth: placeOfBirth.trim() || null,
      relativeName: relativeName.trim(),
      relationType,
      houseNumber: houseNumber.trim(),
      streetMohallaVillage: streetMohallaVillage.trim(),
      postOffice: postOffice.trim(),
      district: district.trim(),
      state: "Punjab",
      pinCode: pinCode.trim(),
      aadhaarNumber: aadhaarNumber.replace(/\s/g, "") || null,
      mobileNumber: cleanMobileForPayload,
      email: cleanEmailForPayload,
      mobileVerified,
      emailVerified,
      disability: disability || "None",
      ageProofType,
      ageProofImage,
      ageProofOcrData: ageProofOcrData || null,
      addressProofType,
      addressProofImage: addressProofImagePayload,
      addressProofOcrData: addressProofOcrData || null,
      photograph,
      photographOcrData: photographOcrData || null,
    });
  };

  if (step === "unit") {
    const filteredSubs = mySubmissions.filter((s) => {
      const sn = (s as any).serialNumber as number | null | undefined;
      const code = sn ? `B${String(sn).padStart(3, "0")}` : "";
      const q = submissionSearch.toLowerCase();
      return (
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        (s.mobileNumber || "").includes(q) ||
        code.toLowerCase().includes(q)
      );
    });

    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Voter Registration</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          {mySubmissions.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-medium text-sm text-slate-700">Your submissions</h3>
                  <Input
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                    placeholder="Search by ID, name, mobile..."
                    className="h-7 text-xs max-w-[220px]"
                  />
                </div>
                <ul className="space-y-1 text-sm text-slate-700 max-h-60 overflow-y-auto">
                  {filteredSubs.map((s) => {
                    const sn = (s as any).serialNumber as number | null | undefined;
                    const code = sn ? `B${String(sn).padStart(3, "0")}` : "";
                    return (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {code && <span className="text-[11px] font-mono text-slate-500 mr-1">{code}</span>}
                          {s.firstName} {s.lastName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {(s as any).status || "pending"} • {s.district || "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(s as any).cardPdf && (s as any).status === "approved" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`/api/voter-registration/submissions/${s.id}/card`, "_blank");
                            }}
                          >
                            Download Card
                          </Button>
                        )}
                        {((s as any).status || "pending") !== "approved" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStep("form");
                              setEditingId(s.id);
                              setFirstName(s.firstName || "");
                              setLastName(s.lastName || "");
                              setGender(s.gender || "");
                              setDateOfBirth(s.dateOfBirth || "");
                              setPlaceOfBirth(s.placeOfBirth || "");
                              setRelativeName(s.relativeName || "");
                              setRelationType(s.relationType || "");
                              setHouseNumber(s.houseNumber || "");
                              setStreetMohallaVillage(s.streetMohallaVillage || "");
                              setPostOffice(s.postOffice || "");
                              setDistrict(s.district || "");
                              setPinCode(s.pinCode || "");
                              setAadhaarNumber(s.aadhaarNumber || "");
                              setMobileNumber(s.mobileNumber || "");
                              setEmail(s.email || "");
                              setMobileVerified(!!s.mobileVerified);
                              setEmailVerified(!!s.emailVerified);
                              setDisability(s.disability || "None");
                              setAgeProofType(s.ageProofType || "");
                              setAgeProofImage(s.ageProofImage || "");
                              setAgeProofOcrData(s.ageProofOcrData || "");
                              setAddressProofType(s.addressProofType || "");
                              setAddressProofImage(s.addressProofImage || "");
                              setAddressProofOcrData(s.addressProofOcrData || "");
                              setAddressProofFront("");
                              setAddressProofBack("");
                              setPhotograph(s.photograph || "");
                              setPhotographOcrData(s.photographOcrData || "");
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </li>
                  );})}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                  0
                </span>
                Select Unit (यूनिट चुनें / ਯੂਨਿਟ ਚੁਣੋ)
              </h2>
              <p className="text-xs text-slate-700">
                <strong>English:</strong> Important – Select the village/ward (unit) of the person whose voter registration form
                you are filling.
              </p>
              <p className="text-xs text-slate-700">
                <strong>हिन्दी:</strong> महत्वपूर्ण – जिस व्यक्ति का वोटर पंजीकरण फॉर्म भर रहे हैं, उसी व्यक्ति का गाँव/वार्ड (यूनिट) चुनें।
              </p>
              <p className="text-xs text-slate-700">
                <strong>ਪੰਜਾਬੀ:</strong> ਮਹੱਤਵਪੂਰਨ – ਜਿਸ ਵਿਅਕਤੀ ਦਾ ਵੋਟਰ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫਾਰਮ ਭਰ ਰਹੇ ਹੋ, ਉਸੇ ਵਿਅਕਤੀ ਦਾ ਪਿੰਡ/ਵਾਰਡ (ਯੂਨਿਟ)
                ਚੁਣੋ।
              </p>
              <div className="mt-2">
                <UnitSelector
                  title="Select Unit"
                  subtitle="Choose the village/ward where the voter lives"
                  onSelect={(unit) => {
                    setSelectedUnit(unit);
                    setStep("form");
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold leading-tight">Voter Registration</h1>
          {selectedUnit && (
            <span className="text-xs text-slate-500">
              Unit: {selectedUnit.villageName}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
              Personal Details (व्यक्तिगत जानकारी)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1">First Name</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Last Name</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Date of Birth</label>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Place of Birth</label>
              <Input value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} placeholder="Place of Birth" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Father / Mother / Husband Name</label>
              <Input value={relativeName} onChange={(e) => setRelativeName(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Relation Type</label>
              <Select value={relationType} onValueChange={setRelationType}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Husband">Husband</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
              Address (पता) – यही address voter list में आएगा
            </h3>
            <div>
              <label className="text-xs text-slate-600 block mb-1">House Number</label>
              <Input value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} placeholder="House No." />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Street / Mohalla / Village</label>
              <Input value={streetMohallaVillage} onChange={(e) => setStreetMohallaVillage(e.target.value)} placeholder="Street / Mohalla / Village" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Post Office</label>
              <Input value={postOffice} onChange={(e) => setPostOffice(e.target.value)} placeholder="Post Office" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">District</label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">State</label>
              <Input value="Punjab" disabled className="bg-slate-100" />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Pin Code</label>
              <Input value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Pin Code" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>
              Aadhaar & Contact (OTP verification required)
            </h3>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Mobile Number</label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10 digits"
                  className="flex-1"
                />
                {!mobileVerified ? (
                  !mobileOtpSent ? (
                    <Button type="button" size="sm" onClick={() => sendMobileOtp.mutate()} disabled={mobileNumber.replace(/\D/g, "").length !== 10 || sendMobileOtp.isPending}>
                      {sendMobileOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <Input placeholder="OTP" value={mobileOtp} onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-16" />
                      <Button type="button" size="sm" onClick={() => verifyMobileOtp.mutate()} disabled={verifyMobileOtp.isPending}>Verify</Button>
                    </div>
                  )
                ) : (
                  <Badge className="bg-green-100 text-green-800 shrink-0">Verified</Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Email ID</label>
              <div className="flex gap-2 flex-wrap">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="flex-1 min-w-[140px]" />
                {!emailVerified ? (
                  !emailOtpSent ? (
                    <Button type="button" size="sm" onClick={() => sendEmailOtp.mutate()} disabled={!email.includes("@") || sendEmailOtp.isPending}>
                      {sendEmailOtp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <Input placeholder="OTP" value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-16" />
                      <Button type="button" size="sm" onClick={() => verifyEmailOtp.mutate()} disabled={verifyEmailOtp.isPending}>Verify</Button>
                    </div>
                  )
                ) : (
                  <Badge className="bg-green-100 text-green-800 shrink-0">Verified</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">4</span>
              Disability (अगर हो)
            </h3>
            <div>
              <Select value={disability} onValueChange={setDisability}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISABILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Documents
            </h3>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Age Proof – कोई एक</label>
              <Select value={ageProofType} onValueChange={setAgeProofType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {AGE_PROOF_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2">
                <input type="file" accept="image/*" capture="environment" ref={ageProofCamRef} className="hidden" onChange={() => handleAgeProofCapture(ageProofCamRef)} />
                <input type="file" accept="image/*" ref={ageProofUpRef} className="hidden" onChange={() => handleAgeProofCapture(ageProofUpRef)} />
                <DocPhotoField
                  label="Age proof document"
                  value={ageProofImage}
                  onCapture={() => ageProofCamRef.current?.click()}
                  onUpload={() => ageProofUpRef.current?.click()}
                  processing={processingType === "ageProof"}
                  processingLabel="Reading document..."
                  ocrAccepted={!!ageProofOcrData}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Address Proof – कोई एक</label>
              <Select value={addressProofType} onValueChange={setAddressProofType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {ADDRESS_PROOF_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-2">
                {addressProofType === "aadhaar" ? (
                  <>
                    <div>
                      <span className="text-xs text-slate-600 block mb-1">Aadhaar Front</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={addressProofCamRef}
                        className="hidden"
                        onChange={() => handleAddressProofCaptureAadhaar("front", addressProofCamRef)}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        ref={addressProofUpRef}
                        className="hidden"
                        onChange={() => handleAddressProofCaptureAadhaar("front", addressProofUpRef)}
                      />
                      <DocPhotoField
                        label="Aadhaar Front"
                        value={addressProofFront}
                        onCapture={() => addressProofCamRef.current?.click()}
                        onUpload={() => addressProofUpRef.current?.click()}
                        processing={processingType === "addressProof"}
                        processingLabel="Reading document..."
                        ocrAccepted={!!addressProofOcrData}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 block mb-1">Aadhaar Back</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={addressProofBackCamRef}
                        className="hidden"
                        onChange={() => handleAddressProofCaptureAadhaar("back", addressProofBackCamRef)}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        ref={addressProofBackUpRef}
                        className="hidden"
                        onChange={() => handleAddressProofCaptureAadhaar("back", addressProofBackUpRef)}
                      />
                      <DocPhotoField
                        label="Aadhaar Back"
                        value={addressProofBack}
                        onCapture={() => addressProofBackCamRef.current?.click()}
                        onUpload={() => addressProofBackUpRef.current?.click()}
                        processing={false}
                        processingLabel=""
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={addressProofCamRef}
                      className="hidden"
                      onChange={() => handleAddressProofCaptureSingle(addressProofCamRef)}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={addressProofUpRef}
                      className="hidden"
                      onChange={() => handleAddressProofCaptureSingle(addressProofUpRef)}
                    />
                    <DocPhotoField
                      label="Address proof document"
                      value={addressProofImage}
                      onCapture={() => addressProofCamRef.current?.click()}
                      onUpload={() => addressProofUpRef.current?.click()}
                      processing={processingType === "addressProof"}
                      processingLabel="Reading document..."
                      ocrAccepted={!!addressProofOcrData}
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600 block mb-1">Passport size photograph</label>
              <input type="file" accept="image/*" capture="user" ref={photoCamRef} className="hidden" onChange={() => handlePhotoCapture(photoCamRef)} />
              <input type="file" accept="image/*" ref={photoUpRef} className="hidden" onChange={() => handlePhotoCapture(photoUpRef)} />
              <DocPhotoField
                label="Photograph"
                value={photograph}
                onCapture={() => photoCamRef.current?.click()}
                onUpload={() => photoUpRef.current?.click()}
                processing={false}
                processingLabel=""
              />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
          Submit Voter Registration
        </Button>
      </div>
    </div>
  );
}
