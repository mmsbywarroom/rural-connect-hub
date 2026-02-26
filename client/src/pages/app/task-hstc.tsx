import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useOcr } from "@/hooks/use-ocr";
import { compressImage } from "@/lib/image-compress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Camera, Upload, Check, Loader2, Home, Plus, X, ChevronRight, IndianRupee, Image, MapPin, FileText, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { UnitSelector } from "@/components/unit-selector";
import type { AppUser, HstcSubmission } from "@shared/schema";

interface Props {
  user: AppUser;
}

type Step = "description" | "select_unit" | "verify_mobile" | "form";

const descriptions = {
  en: `"Harr Sirr te Chatt" is a social welfare initiative aimed at providing a safe and permanent roof to families who are living without proper shelter due to financial hardship, or whose existing roofs are damaged, leaking, or in poor condition. Under this program, we identify needy families in both rural and urban areas and support them by repairing their homes or constructing a new roof, so that every family can have a secure and dignified place to live.`,
  hi: `"हर सिर ते छत" एक सामाजिक कल्याण पहल है जिसका उद्देश्य उन परिवारों को सुरक्षित और स्थायी छत प्रदान करना है जो आर्थिक कठिनाई के कारण उचित आश्रय के बिना रह रहे हैं, या जिनकी मौजूदा छतें क्षतिग्रस्त, टपकने वाली या खराब स्थिति में हैं। इस कार्यक्रम के तहत, हम ग्रामीण और शहरी दोनों क्षेत्रों में जरूरतमंद परिवारों की पहचान करते हैं और उनके घरों की मरम्मत या नई छत का निर्माण करके उनका समर्थन करते हैं, ताकि हर परिवार को एक सुरक्षित और सम्मानजनक स्थान मिल सके।`,
  pa: `"ਹਰ ਸਿਰ ਤੇ ਛੱਤ" ਇੱਕ ਸਮਾਜ ਭਲਾਈ ਪਹਿਲਕਦਮੀ ਹੈ ਜਿਸ ਦਾ ਉਦੇਸ਼ ਉਨ੍ਹਾਂ ਪਰਿਵਾਰਾਂ ਨੂੰ ਸੁਰੱਖਿਅਤ ਅਤੇ ਪੱਕੀ ਛੱਤ ਮੁਹੱਈਆ ਕਰਵਾਉਣਾ ਹੈ ਜੋ ਆਰਥਿਕ ਤੰਗੀ ਕਾਰਨ ਬਿਨਾਂ ਢੁਕਵੀਂ ਛੱਤ ਤੋਂ ਰਹਿ ਰਹੇ ਹਨ, ਜਾਂ ਜਿਨ੍ਹਾਂ ਦੀਆਂ ਮੌਜੂਦਾ ਛੱਤਾਂ ਟੁੱਟੀਆਂ, ਚੋਂਦੀਆਂ ਜਾਂ ਖ਼ਰਾਬ ਹਾਲਤ ਵਿੱਚ ਹਨ। ਇਸ ਪ੍ਰੋਗਰਾਮ ਤਹਿਤ, ਅਸੀਂ ਪੇਂਡੂ ਅਤੇ ਸ਼ਹਿਰੀ ਦੋਵਾਂ ਖੇਤਰਾਂ ਵਿੱਚ ਲੋੜਵੰਦ ਪਰਿਵਾਰਾਂ ਦੀ ਪਛਾਣ ਕਰਦੇ ਹਾਂ ਅਤੇ ਉਨ੍ਹਾਂ ਦੇ ਘਰਾਂ ਦੀ ਮੁਰੰਮਤ ਜਾਂ ਨਵੀਂ ਛੱਤ ਬਣਾ ਕੇ ਉਨ੍ਹਾਂ ਦਾ ਸਹਿਯੋਗ ਕਰਦੇ ਹਾਂ, ਤਾਂ ਜੋ ਹਰ ਪਰਿਵਾਰ ਨੂੰ ਇੱਕ ਸੁਰੱਖਿਅਤ ਅਤੇ ਮਾਣ ਵਾਲੀ ਥਾਂ ਮਿਲ ਸਕੇ।`,
};

const labels: Record<string, { en: string; hi: string; pa: string }> = {
  title: { en: "Harr Sirr te Chatt", hi: "हर सिर ते छत", pa: "ਹਰ ਸਿਰ ਤੇ ਛੱਤ" },
  houseOwnerName: { en: "House Owner Name", hi: "मकान मालिक का नाम", pa: "ਘਰ ਦੇ ਮਾਲਕ ਦਾ ਨਾਮ" },
  fatherHusbandName: { en: "Father/Husband Name", hi: "पिता/पति का नाम", pa: "ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਮ" },
  villageName: { en: "Village Name", hi: "गांव का नाम", pa: "ਪਿੰਡ ਦਾ ਨਾਮ" },
  mobNo: { en: "Mobile Number", hi: "मोबाइल नंबर", pa: "ਮੋਬਾਈਲ ਨੰਬਰ" },
  repairMaterialCost: { en: "Repair Material Cost (₹)", hi: "मरम्मत सामग्री लागत (₹)", pa: "ਮੁਰੰਮਤ ਸਮੱਗਰੀ ਲਾਗਤ (₹)" },
  estimatedLabourCost: { en: "Estimated Labour Cost (₹)", hi: "अनुमानित श्रम लागत (₹)", pa: "ਅੰਦਾਜ਼ਨ ਮਜ਼ਦੂਰੀ ਲਾਗਤ (₹)" },
  totalCost: { en: "Total Cost (₹)", hi: "कुल लागत (₹)", pa: "ਕੁੱਲ ਲਾਗਤ (₹)" },
  aadhaarCard: { en: "Aadhaar Card", hi: "आधार कार्ड", pa: "ਆਧਾਰ ਕਾਰਡ" },
  front: { en: "Front", hi: "आगे", pa: "ਅੱਗੇ" },
  back: { en: "Back", hi: "पीछे", pa: "ਪਿੱਛੇ" },
  voterIdCard: { en: "Voter ID Card", hi: "वोटर आईडी कार्ड", pa: "ਵੋਟਰ ਆਈਡੀ ਕਾਰਡ" },
  application: { en: "Application", hi: "आवेदन पत्र", pa: "ਅਰਜ਼ੀ" },
  numberOfPeople: { en: "No. of People Living in House", hi: "घर में रहने वालों की संख्या", pa: "ਘਰ ਵਿੱਚ ਰਹਿਣ ਵਾਲਿਆਂ ਦੀ ਗਿਣਤੀ" },
  roomSize: { en: "Size of Room", hi: "कमरे का आकार", pa: "ਕਮਰੇ ਦਾ ਆਕਾਰ" },
  bricksQty: { en: "Bricks Qty", hi: "ईंटों की मात्रा", pa: "ਇੱਟਾਂ ਦੀ ਮਾਤਰਾ" },
  sandSqFt: { en: "Sand (Sq. Ft.)", hi: "रेत (वर्ग फीट)", pa: "ਰੇਤ (ਵਰਗ ਫੁੱਟ)" },
  gravelTonKg: { en: "Gravel (Ton/Kg)", hi: "बजरी (टन/किलो)", pa: "ਬੱਜਰੀ (ਟਨ/ਕਿਲੋ)" },
  cementKgQty: { en: "Cement (Kg/Qty)", hi: "सीमेंट (किलो/मात्रा)", pa: "ਸੀਮੈਂਟ (ਕਿਲੋ/ਮਾਤਰਾ)" },
  sariaKtKg: { en: "Saria (KT/Kg)", hi: "सरिया (केटी/किलो)", pa: "ਸਰੀਆ (ਕੇਟੀ/ਕਿਲੋ)" },
  nodalVolunteer: { en: "Nodal Volunteer Name", hi: "नोडल वालंटियर का नाम", pa: "ਨੋਡਲ ਵਾਲੰਟੀਅਰ ਦਾ ਨਾਮ" },
  nodalVolunteerMobile: { en: "Nodal Volunteer Mobile", hi: "नोडल वालंटियर मोबाइल", pa: "ਨੋਡਲ ਵਾਲੰਟੀਅਰ ਮੋਬਾਈਲ" },
  superVolunteer: { en: "Super Volunteer Name", hi: "सुपर वालंटियर का नाम", pa: "ਸੁਪਰ ਵਾਲੰਟੀਅਰ ਦਾ ਨਾਮ" },
  superVolunteerMobile: { en: "Super Volunteer Mobile", hi: "सुपर वालंटियर मोबाइल", pa: "ਸੁਪਰ ਵਾਲੰਟੀਅਰ ਮੋਬਾਈਲ" },
  selectUnit: { en: "Select Unit", hi: "इकाई चुनें", pa: "ਯੂਨਿਟ ਚੁਣੋ" },
  selectUnitSubtitle: { en: "Choose the village/ward where the house is located", hi: "वह गांव/वार्ड चुनें जहां मकान स्थित है", pa: "ਉਹ ਪਿੰਡ/ਵਾਰਡ ਚੁਣੋ ਜਿੱਥੇ ਮਕਾਨ ਸਥਿਤ ਹੈ" },
  yourUnit: { en: "Your Unit", hi: "आपकी इकाई", pa: "ਤੁਹਾਡੀ ਯੂਨਿਟ" },
  workingUnit: { en: "Working Unit", hi: "कार्य इकाई", pa: "ਕੰਮ ਦੀ ਯੂਨਿਟ" },
  houseImages: { en: "House Images (Photos of the house to be repaired)", hi: "घर की तस्वीरें (जिस घर की मरम्मत होनी है)", pa: "ਘਰ ਦੀਆਂ ਤਸਵੀਰਾਂ (ਜਿਸ ਘਰ ਦੀ ਮੁਰੰਮਤ ਕਰਨੀ ਹੈ)" },
  bankDetails: { en: "Bank Details", hi: "बैंक विवरण", pa: "ਬੈਂਕ ਵੇਰਵੇ" },
  bankAccountName: { en: "Account Holder Name", hi: "खाता धारक का नाम", pa: "ਖਾਤਾ ਧਾਰਕ ਦਾ ਨਾਮ" },
  bankAccountNumber: { en: "Account Number", hi: "खाता नंबर", pa: "ਖਾਤਾ ਨੰਬਰ" },
  bankName: { en: "Bank Name", hi: "बैंक का नाम", pa: "ਬੈਂਕ ਦਾ ਨਾਮ" },
  bankIfscCode: { en: "IFSC Code", hi: "IFSC कोड", pa: "IFSC ਕੋਡ" },
  bankBranchName: { en: "Branch Name", hi: "शाखा का नाम", pa: "ਸ਼ਾਖਾ ਦਾ ਨਾਮ" },
  ifscFound: { en: "Bank details found", hi: "बैंक विवरण मिला", pa: "ਬੈਂਕ ਵੇਰਵੇ ਮਿਲੇ" },
  ifscNotFound: { en: "Invalid IFSC code", hi: "अमान्य IFSC कोड", pa: "ਅਵੈਧ IFSC ਕੋਡ" },
  passbookOrCheque: { en: "Passbook / Cheque Photo", hi: "पासबुक / चेक फोटो", pa: "ਪਾਸਬੁੱਕ / ਚੈੱਕ ਫੋਟੋ" },
  submitApplication: { en: "Submit Application", hi: "आवेदन जमा करें", pa: "ਅਰਜ਼ੀ ਜਮ੍ਹਾਂ ਕਰੋ" },
  submittedSuccess: { en: "Application submitted successfully!", hi: "आवेदन सफलतापूर्वक जमा हो गया!", pa: "ਅਰਜ਼ੀ ਸਫਲਤਾਪੂਰਵਕ ਜਮ੍ਹਾਂ ਹੋ ਗਈ!" },
  previousSubmissions: { en: "Previous Submissions", hi: "पिछले आवेदन", pa: "ਪਿਛਲੀਆਂ ਅਰਜ਼ੀਆਂ" },
  completedPhotos: { en: "Upload Completed House Photos", hi: "बने हुए घर की फोटो अपलोड करें", pa: "ਬਣੇ ਹੋਏ ਘਰ ਦੀ ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ" },
  completionNote: { en: "Notes about completion", hi: "पूर्णता के बारे में नोट", pa: "ਮੁਕੰਮਲ ਹੋਣ ਬਾਰੇ ਨੋਟ" },
  uploadCompleted: { en: "Upload Photos", hi: "फोटो अपलोड करें", pa: "ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ" },
  paymentReceived: { en: "Payment Received", hi: "भुगतान प्राप्त", pa: "ਭੁਗਤਾਨ ਪ੍ਰਾਪਤ" },
  paymentAmount: { en: "Amount", hi: "राशि", pa: "ਰਕਮ" },
  paymentMode: { en: "Mode", hi: "माध्यम", pa: "ਮਾਧਿਅਮ" },
  houseCompleted: { en: "House Completed", hi: "घर बन गया", pa: "ਘਰ ਬਣ ਗਿਆ" },
  pending: { en: "Pending", hi: "लंबित", pa: "ਬਕਾਇਆ" },
  approved: { en: "Approved", hi: "स्वीकृत", pa: "ਮਨਜ਼ੂਰ" },
  rejected: { en: "Rejected", hi: "अस्वीकृत", pa: "ਰੱਦ" },
  camera: { en: "Camera", hi: "कैमरा", pa: "ਕੈਮਰਾ" },
  upload: { en: "Upload", hi: "अपलोड", pa: "ਅੱਪਲੋਡ" },
  editApplication: { en: "Edit Application", hi: "आवेदन संपादित करें", pa: "ਅਰਜ਼ੀ ਸੋਧੋ" },
  updateApplication: { en: "Update Application", hi: "आवेदन अपडेट करें", pa: "ਅਰਜ਼ੀ ਅੱਪਡੇਟ ਕਰੋ" },
  editAllowedMsg: {
    en: "You can edit this submission until it is approved",
    hi: "आप इस आवेदन को स्वीकृति से पहले कभी भी संपादित कर सकते हैं",
    pa: "ਤੁਸੀਂ ਮਨਜ਼ੂਰੀ ਤੋਂ ਪਹਿਲਾਂ ਇਸ ਅਰਜ਼ੀ ਨੂੰ ਕਦੇ ਵੀ ਸੋਧ ਸਕਦੇ ਹੋ",
  },
  duplicateError: { en: "You have already submitted for this mobile number", hi: "आपने इस मोबाइल नंबर के लिए पहले ही आवेदन किया है", pa: "ਤੁਸੀਂ ਇਸ ਮੋਬਾਈਲ ਨੰਬਰ ਲਈ ਪਹਿਲਾਂ ਹੀ ਅਰਜ਼ੀ ਦੇ ਚੁੱਕੇ ਹੋ" },
  done: { en: "Done", hi: "हो गया", pa: "ਹੋ ਗਿਆ" },
  reading: { en: "Reading...", hi: "पढ़ रहा है...", pa: "ਪੜ੍ਹ ਰਿਹਾ ਹੈ..." },
  materialDetails: { en: "Material Details", hi: "सामग्री विवरण", pa: "ਸਮੱਗਰੀ ਵੇਰਵੇ" },
  volunteerDetails: { en: "Volunteer Details", hi: "वालंटियर विवरण", pa: "ਵਾਲੰਟੀਅਰ ਵੇਰਵੇ" },
  costDetails: { en: "Cost Details", hi: "लागत विवरण", pa: "ਲਾਗਤ ਵੇਰਵੇ" },
  documents: { en: "Documents", hi: "दस्तावेज़", pa: "ਦਸਤਾਵੇਜ਼" },
  basicInfo: { en: "Basic Information", hi: "बुनियादी जानकारी", pa: "ਮੁੱਢਲੀ ਜਾਣਕਾਰੀ" },
  verifyMobile: { en: "Verify Mobile Number", hi: "मोबाइल नंबर सत्यापित करें", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਤਸਦੀਕ ਕਰੋ" },
  verifyMobileSubtitle: { en: "Enter the beneficiary's mobile number to verify via OTP", hi: "OTP से सत्यापन के लिए लाभार्थी का मोबाइल नंबर दर्ज करें", pa: "OTP ਰਾਹੀਂ ਤਸਦੀਕ ਲਈ ਲਾਭਪਾਤਰੀ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  enterOtp: { en: "Enter OTP", hi: "OTP दर्ज करें", pa: "OTP ਦਰਜ ਕਰੋ" },
  verifyOtp: { en: "Verify OTP", hi: "OTP सत्यापित करें", pa: "OTP ਤਸਦੀਕ ਕਰੋ" },
  otpSentTo: { en: "OTP sent to", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpVerified: { en: "Mobile number verified successfully!", hi: "मोबाइल नंबर सफलतापूर्वक सत्यापित!", pa: "ਮੋਬਾਈਲ ਨੰਬਰ ਸਫਲਤਾਪੂਰਵਕ ਤਸਦੀਕ!" },
  invalidOtp: { en: "Invalid or expired OTP", hi: "अमान्य या समय-सीमा समाप्त OTP", pa: "ਅਵੈਧ ਜਾਂ ਮਿਆਦ ਪੁੱਗੀ OTP" },
  failedToSendOtp: { en: "Failed to send OTP", hi: "OTP भेजने में विफल", pa: "OTP ਭੇਜਣ ਵਿੱਚ ਅਸਫਲ" },
  failedToUpload: { en: "Failed to upload", hi: "अपलोड विफल", pa: "ਅੱਪਲੋਡ ਅਸਫਲ" },
  addPhoto: { en: "Please add at least one photo", hi: "कृपया कम से कम एक फोटो जोड़ें", pa: "ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਫੋਟੋ ਪਾਓ" },
  failedToSubmit: { en: "Failed to submit", hi: "जमा करने में विफल", pa: "ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਅਸਫਲ" },
  failedToUpdate: { en: "Failed to update", hi: "अपडेट विफल", pa: "ਅੱਪਡੇਟ ਅਸਫਲ" },
  roomSizeUnit: { en: "Unit", hi: "इकाई", pa: "ਯੂਨਿਟ" },
  loanConsent: { en: "I hereby declare and assure that no loan of any kind is currently active or outstanding on this bank account.", hi: "मैं एतद्द्वारा घोषणा और आश्वासन देता/देती हूं कि इस बैंक खाते पर किसी भी प्रकार का कोई ऋण वर्तमान में सक्रिय या बकाया नहीं है।", pa: "ਮੈਂ ਇਸ ਦੁਆਰਾ ਐਲਾਨ ਅਤੇ ਭਰੋਸਾ ਦਿੰਦਾ/ਦਿੰਦੀ ਹਾਂ ਕਿ ਇਸ ਬੈਂਕ ਖਾਤੇ ਉੱਤੇ ਕਿਸੇ ਵੀ ਕਿਸਮ ਦਾ ਕੋਈ ਕਰਜ਼ਾ ਵਰਤਮਾਨ ਵਿੱਚ ਸਰਗਰਮ ਜਾਂ ਬਕਾਇਆ ਨਹੀਂ ਹੈ।" },
  mobileVerifiedBadge: { en: "Verified", hi: "सत्यापित", pa: "ਤਸਦੀਕਿਤ" },
};

function l(key: string, lang: string): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as any)[lang] || entry.en;
}

function PhotoField({ label, value, onCapture, onUpload, processing, processingLabel }: {
  label: string;
  value: string;
  onCapture: () => void;
  onUpload: () => void;
  processing: boolean;
  processingLabel: string;
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
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-slate-600 mb-1">{label}</span>
          <div className="flex items-center gap-3">
            <button onClick={onCapture} className="flex flex-col items-center gap-1 p-1" data-testid={`button-hstc-camera-${label.toLowerCase().replace(/\s/g, '-')}`}>
              <Camera className="h-5 w-5 text-slate-500" />
              <span className="text-[10px] text-slate-500">Camera</span>
            </button>
            <button onClick={onUpload} className="flex flex-col items-center gap-1 p-1" data-testid={`button-hstc-upload-${label.toLowerCase().replace(/\s/g, '-')}`}>
              <Upload className="h-5 w-5 text-slate-500" />
              <span className="text-[10px] text-slate-500">Upload</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ sub, language, user, onEdit }: { sub: HstcSubmission; language: string; user: AppUser; onEdit?: (sub: HstcSubmission) => void }) {
  const { toast } = useToast();
  const [showCompletionUpload, setShowCompletionUpload] = useState(false);
  const [completedImages, setCompletedImages] = useState<string[]>([]);
  const [completionNotes, setCompletionNotes] = useState("");
  const [viewPayment, setViewPayment] = useState(false);
  const completedCamRef = useRef<HTMLInputElement>(null);
  const completedUpRef = useRef<HTMLInputElement>(null);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const completionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/hstc/submissions/${sub.id}/completion`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: l("submittedSuccess", language) });
      queryClient.invalidateQueries({ queryKey: ["/api/hstc/my-submissions", user.id] });
      setShowCompletionUpload(false);
      setCompletedImages([]);
      setCompletionNotes("");
    },
    onError: () => {
      toast({ title: l("failedToUpload", language), variant: "destructive" });
    },
  });

  const handleCompletedImageCapture = async (ref: React.RefObject<HTMLInputElement | null>) => {
    const files = ref.current?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const base64 = await compressImage(file);
        setCompletedImages(prev => [...prev, base64]);
      } catch {}
    }
    if (ref.current) ref.current.value = "";
  };

  const handleSubmitCompletion = () => {
    if (completedImages.length === 0) {
      toast({ title: l("addPhoto", language), variant: "destructive" });
      return;
    }
    completionMutation.mutate({ completedHouseImages: completedImages, completionNotes });
  };

  return (
    <div className="p-3 bg-slate-50 rounded-lg space-y-2" data-testid={`hstc-submission-${sub.id}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{sub.houseOwnerName}</p>
          <p className="text-xs text-slate-500">{sub.villageName} - {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : ""}</p>
        </div>
        <Badge className={statusColors[sub.status] || ""}>
          {l(sub.status, language)}
        </Badge>
      </div>

      {sub.reviewNote && (
        <p className="text-xs text-slate-600 bg-white p-2 rounded">{sub.reviewNote}</p>
      )}

      {sub.paymentProofImages && sub.paymentProofImages.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-2 space-y-1">
          <div className="flex items-center gap-1 text-green-700">
            <IndianRupee className="h-3 w-3" />
            <span className="text-xs font-semibold">{l("paymentReceived", language)}</span>
          </div>
          {sub.paymentAmount && (
            <p className="text-sm font-bold text-green-800">₹{sub.paymentAmount.toLocaleString()}</p>
          )}
          {sub.paymentMode && (
            <p className="text-xs text-green-600">{l("paymentMode", language)}: {sub.paymentMode}</p>
          )}
          {sub.paymentNote && (
            <p className="text-xs text-green-600">{sub.paymentNote}</p>
          )}
          <button
            className="text-xs text-green-700 underline cursor-pointer"
            onClick={() => setViewPayment(true)}
            data-testid={`button-view-payment-${sub.id}`}
          >
            View Payment Proof
          </button>
          <Dialog open={viewPayment} onOpenChange={setViewPayment}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{l("paymentReceived", language)}</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {sub.paymentProofImages.map((img, i) => (
                  <img key={i} src={img || ""} alt={`Payment ${i + 1}`} className="w-full rounded-md" />
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {sub.completedHouseImages && sub.completedHouseImages.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 space-y-1">
          <div className="flex items-center gap-1 text-blue-700">
            <Image className="h-3 w-3" />
            <span className="text-xs font-semibold">{l("houseCompleted", language)}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {sub.completedHouseImages.map((img, i) => (
              <img key={i} src={img || ""} alt={`Completed ${i + 1}`} className="w-full h-16 object-cover rounded" />
            ))}
          </div>
          {sub.completionNotes && <p className="text-xs text-blue-600">{sub.completionNotes}</p>}
        </div>
      )}

      {onEdit && sub.status === "pending" && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 space-y-1">
          <p className="text-xs text-blue-700">{l("editAllowedMsg", language)}</p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => onEdit(sub)}
            data-testid={`button-edit-submission-${sub.id}`}
          >
            <FileText className="h-3 w-3 mr-1" /> {l("editApplication", language)}
          </Button>
        </div>
      )}

      {sub.status === "approved" && (!sub.completedHouseImages || sub.completedHouseImages.length === 0) && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowCompletionUpload(!showCompletionUpload)}
            data-testid={`button-completion-upload-${sub.id}`}
          >
            <Camera className="h-3 w-3 mr-1" /> {l("completedPhotos", language)}
          </Button>
          {showCompletionUpload && (
            <div className="space-y-2 p-2 bg-white rounded-md border">
              <input type="file" accept="image/*" capture="environment" ref={completedCamRef} className="hidden" onChange={() => handleCompletedImageCapture(completedCamRef)} />
              <input type="file" accept="image/*" multiple ref={completedUpRef} className="hidden" onChange={() => handleCompletedImageCapture(completedUpRef)} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => completedCamRef.current?.click()} data-testid={`button-completed-camera-${sub.id}`}>
                  <Camera className="h-3 w-3 mr-1" /> {l("camera", language)}
                </Button>
                <Button variant="outline" size="sm" onClick={() => completedUpRef.current?.click()} data-testid={`button-completed-upload-${sub.id}`}>
                  <Upload className="h-3 w-3 mr-1" /> {l("upload", language)}
                </Button>
              </div>
              {completedImages.length > 0 && (
                <div className="grid grid-cols-3 gap-1">
                  {completedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt={`Completed ${idx + 1}`} className="w-full h-16 object-cover rounded" />
                      <button
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        onClick={() => setCompletedImages(prev => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                placeholder={l("completionNote", language)}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="text-sm"
                data-testid={`input-completion-notes-${sub.id}`}
              />
              <Button
                size="sm"
                className="w-full bg-blue-600"
                onClick={handleSubmitCompletion}
                disabled={completionMutation.isPending}
                data-testid={`button-submit-completion-${sub.id}`}
              >
                {completionMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                {l("uploadCompleted", language)}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TaskHstc({ user }: Props) {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { processingType, processImage } = useOcr();
  const [step, setStep] = useState<Step>("description");
  const [selectedVillageId, setSelectedVillageId] = useState<string>("");
  const [selectedVillageName, setSelectedVillageName] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [houseOwnerName, setHouseOwnerName] = useState("");
  const [fatherHusbandName, setFatherHusbandName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [repairMaterialCost, setRepairMaterialCost] = useState("");
  const [estimatedLabourCost, setEstimatedLabourCost] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState("");
  const [roomSize, setRoomSize] = useState("");
  const [bricksQty, setBricksQty] = useState("");
  const [sandSqFt, setSandSqFt] = useState("");
  const [gravelTonKg, setGravelTonKg] = useState("");
  const [cementKgQty, setCementKgQty] = useState("");
  const [sariaKtKg, setSariaKtKg] = useState("");
  const [nodalVolunteerName, setNodalVolunteerName] = useState("");
  const [nodalVolunteerMobile, setNodalVolunteerMobile] = useState("");
  const [superVolunteerName, setSuperVolunteerName] = useState("");
  const [superVolunteerMobile, setSuperVolunteerMobile] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranchName, setBankBranchName] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");
  const [ifscLoading, setIfscLoading] = useState(false);
  const [passbookOrChequeImage, setPassbookOrChequeImage] = useState("");
  const [loanConsent, setLoanConsent] = useState(false);
  const [roomSizeUnit, setRoomSizeUnit] = useState("sq ft");
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otpMobile, setOtpMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const [aadhaarFront, setAadhaarFront] = useState("");
  const [aadhaarBack, setAadhaarBack] = useState("");
  const [voterIdFront, setVoterIdFront] = useState("");
  const [voterIdBack, setVoterIdBack] = useState("");
  const [applicationPhoto, setApplicationPhoto] = useState("");
  const [houseImages, setHouseImages] = useState<string[]>([]);

  const [ocrData, setOcrData] = useState<any>({});

  const aadhaarFrontCamRef = useRef<HTMLInputElement>(null);
  const aadhaarFrontUpRef = useRef<HTMLInputElement>(null);
  const aadhaarBackCamRef = useRef<HTMLInputElement>(null);
  const aadhaarBackUpRef = useRef<HTMLInputElement>(null);
  const voterFrontCamRef = useRef<HTMLInputElement>(null);
  const voterFrontUpRef = useRef<HTMLInputElement>(null);
  const voterBackCamRef = useRef<HTMLInputElement>(null);
  const voterBackUpRef = useRef<HTMLInputElement>(null);
  const appCamRef = useRef<HTMLInputElement>(null);
  const appUpRef = useRef<HTMLInputElement>(null);
  const houseCamRef = useRef<HTMLInputElement>(null);
  const houseUpRef = useRef<HTMLInputElement>(null);
  const passbookCamRef = useRef<HTMLInputElement>(null);
  const passbookUpRef = useRef<HTMLInputElement>(null);
  const completedHouseCamRef = useRef<HTMLInputElement>(null);
  const completedHouseUpRef = useRef<HTMLInputElement>(null);

  const totalCost = (parseInt(repairMaterialCost) || 0) + (parseInt(estimatedLabourCost) || 0);

  const { data: mySubmissions } = useQuery<HstcSubmission[]>({
    queryKey: ["/api/hstc/my-submissions", user.id],
    enabled: !!user.id,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/hstc/submit", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: l("submittedSuccess", language) });
      queryClient.invalidateQueries({ queryKey: ["/api/hstc/my-submissions", user.id] });
      setStep("description");
      setSelectedVillageId("");
      setSelectedVillageName("");
      resetForm();
    },
    onError: (err: any) => {
      if (err?.message?.includes("409") || err?.message?.includes("DUPLICATE")) {
        toast({ title: l("duplicateError", language), variant: "destructive" });
      } else {
        toast({ title: l("failedToSubmit", language), variant: "destructive" });
      }
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/hstc/submissions/${editingId}/edit`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: l("submittedSuccess", language) });
      queryClient.invalidateQueries({ queryKey: ["/api/hstc/my-submissions", user.id] });
      setStep("description");
      setSelectedVillageId("");
      setSelectedVillageName("");
      setEditingId(null);
      resetForm();
    },
    onError: (err: any) => {
      if (err?.message?.includes("409") || err?.message?.includes("DUPLICATE")) {
        toast({ title: l("duplicateError", language), variant: "destructive" });
      } else if (err?.message?.includes("403") || err?.message?.includes("EDIT_LOCKED")) {
        toast({ title: l("editApplication", language), description: "Edit access has been revoked", variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: ["/api/hstc/my-submissions", user.id] });
        setEditingId(null);
        resetForm();
        setStep("description");
      } else {
        toast({ title: l("failedToUpdate", language), variant: "destructive" });
      }
    },
  });

  const resetForm = () => {
    setHouseOwnerName(""); setFatherHusbandName(""); setMobileNumber("");
    setRepairMaterialCost(""); setEstimatedLabourCost("");
    setNumberOfPeople(""); setRoomSize(""); setBricksQty(""); setSandSqFt("");
    setGravelTonKg(""); setCementKgQty(""); setSariaKtKg("");
    setNodalVolunteerName(""); setNodalVolunteerMobile("");
    setSuperVolunteerName(""); setSuperVolunteerMobile("");
    setBankAccountName(""); setBankAccountNumber(""); setBankName(""); setBankIfscCode("");
    setPassbookOrChequeImage("");
    setAadhaarFront(""); setAadhaarBack(""); setVoterIdFront(""); setVoterIdBack("");
    setApplicationPhoto(""); setHouseImages([]); setOcrData({});
    setBankBranchName("");
    setLoanConsent(false); setRoomSizeUnit("sq ft"); setMobileVerified(false);
    setOtpMobile(""); setOtpCode(""); setOtpSent(false);
  };

  const loadForEdit = (sub: HstcSubmission) => {
    setEditingId(sub.id);
    setHouseOwnerName(sub.houseOwnerName || "");
    setFatherHusbandName(sub.fatherHusbandName || "");
    setMobileNumber(sub.mobileNumber || "");
    setRepairMaterialCost(sub.repairMaterialCost?.toString() || "");
    setEstimatedLabourCost(sub.estimatedLabourCost?.toString() || "");
    setNumberOfPeople(sub.numberOfPeople?.toString() || "");
    setRoomSize(sub.roomSize || "");
    setBricksQty(sub.bricksQty || "");
    setSandSqFt(sub.sandSqFt || "");
    setGravelTonKg(sub.gravelTonKg || "");
    setCementKgQty(sub.cementKgQty || "");
    setSariaKtKg(sub.sariaKtKg || "");
    setNodalVolunteerName(sub.nodalVolunteerName || "");
    setNodalVolunteerMobile(sub.nodalVolunteerMobile || "");
    setSuperVolunteerName(sub.superVolunteerName || "");
    setSuperVolunteerMobile(sub.superVolunteerMobile || "");
    setBankAccountName(sub.bankAccountName || "");
    setBankAccountNumber(sub.bankAccountNumber || "");
    setBankName(sub.bankName || "");
    setBankBranchName(sub.bankBranchName || "");
    setBankIfscCode(sub.bankIfscCode || "");
    setPassbookOrChequeImage(sub.passbookOrChequeImage || "");
    setAadhaarFront(sub.aadhaarFront || "");
    setAadhaarBack(sub.aadhaarBack || "");
    setVoterIdFront(sub.voterIdFront || "");
    setVoterIdBack(sub.voterIdBack || "");
    setApplicationPhoto(sub.applicationPhoto || "");
    setHouseImages((sub.houseImages || []).filter((img): img is string => !!img));
    setSelectedVillageId(sub.villageId || "");
    setSelectedVillageName(sub.villageName || "");
    setOcrData({
      ocrName: sub.ocrAadhaarName || "",
      ocrAadhaarNumber: sub.ocrAadhaarNumber || "",
      ocrDob: sub.ocrAadhaarDob || "",
      ocrGender: sub.ocrAadhaarGender || "",
      ocrAddress: sub.ocrAadhaarAddress || "",
      ocrVoterId: sub.ocrVoterId || "",
      ocrVoterName: sub.ocrVoterName || "",
    });
    setLoanConsent(sub.loanConsent || false);
    setRoomSizeUnit(sub.roomSizeUnit || "sq ft");
    setMobileVerified(sub.mobileVerified || false);
    setStep("form");
  };

  const lookupIfsc = async (ifsc: string) => {
    if (ifsc.length !== 11) return;
    setIfscLoading(true);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
      if (res.ok) {
        const data = await res.json();
        setBankName(data.BANK || "");
        setBankBranchName(data.BRANCH || "");
        toast({ title: l("ifscFound", language), description: `${data.BANK} - ${data.BRANCH}` });
      } else {
        setBankName("");
        setBankBranchName("");
        toast({ title: l("ifscNotFound", language), variant: "destructive" });
      }
    } catch {
      toast({ title: l("ifscNotFound", language), variant: "destructive" });
    } finally {
      setIfscLoading(false);
    }
  };

  const handlePhotoCapture = async (setter: (v: string) => void, ref: React.RefObject<HTMLInputElement | null>, ocrType?: "aadhaarFront" | "aadhaarBack" | "voterId") => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setter(base64);
      if (ocrType) {
        try {
          const result = await processImage(ocrType, base64);
          if (result) {
            const mapped: any = {};
            if (result.name) mapped.ocrName = result.name;
            if (result.aadhaarNumber) mapped.ocrAadhaarNumber = result.aadhaarNumber;
            if (result.dob) mapped.ocrDob = result.dob;
            if (result.gender) mapped.ocrGender = result.gender;
            if (result.address) mapped.ocrAddress = result.address;
            if (result.voterId) mapped.ocrVoterId = result.voterId;
            if (ocrType === "voterId" && result.name) mapped.ocrVoterName = result.name;
            setOcrData((prev: any) => ({ ...prev, ...mapped }));
            if (ocrType === "aadhaarFront" && result.name && !houseOwnerName) {
              setHouseOwnerName(result.name);
            }
          }
        } catch {}
      }
      if (ref.current) ref.current.value = "";
    } catch {}
  };

  const handleHouseImageCapture = async (ref: React.RefObject<HTMLInputElement | null>) => {
    const files = ref.current?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const base64 = await compressImage(file);
        setHouseImages(prev => [...prev, base64]);
      } catch {}
    }
    if (ref.current) ref.current.value = "";
  };

  const handleSubmit = () => {
    if (!houseOwnerName.trim()) { toast({ title: l("title", language), description: "House Owner Name is required", variant: "destructive" }); return; }
    if (!fatherHusbandName.trim()) { toast({ title: l("title", language), description: "Father/Husband Name is required", variant: "destructive" }); return; }
    if (!mobileNumber.trim()) { toast({ title: l("title", language), description: "Mobile Number is required", variant: "destructive" }); return; }
    if (!repairMaterialCost) { toast({ title: l("title", language), description: "Repair Material Cost is required", variant: "destructive" }); return; }
    if (!estimatedLabourCost) { toast({ title: l("title", language), description: "Estimated Labour Cost is required", variant: "destructive" }); return; }
    if (!loanConsent) { toast({ title: l("title", language), description: l("loanConsent", language), variant: "destructive" }); return; }

    const formData = {
      villageId: selectedVillageId || user.mappedAreaId || null,
      villageName: selectedVillageName || user.mappedAreaName || "",
      houseOwnerName: houseOwnerName.trim(),
      fatherHusbandName: fatherHusbandName.trim(),
      mobileNumber: mobileNumber.trim(),
      repairMaterialCost: parseInt(repairMaterialCost) || 0,
      estimatedLabourCost: parseInt(estimatedLabourCost) || 0,
      totalCost,
      aadhaarFront: aadhaarFront || null,
      aadhaarBack: aadhaarBack || null,
      voterIdFront: voterIdFront || null,
      voterIdBack: voterIdBack || null,
      applicationPhoto: applicationPhoto || null,
      numberOfPeople: numberOfPeople ? parseInt(numberOfPeople) : null,
      roomSize: roomSize || null,
      bricksQty: bricksQty || null,
      sandSqFt: sandSqFt || null,
      gravelTonKg: gravelTonKg || null,
      cementKgQty: cementKgQty || null,
      sariaKtKg: sariaKtKg || null,
      nodalVolunteerName: nodalVolunteerName || null,
      nodalVolunteerMobile: nodalVolunteerMobile || null,
      superVolunteerName: superVolunteerName || null,
      superVolunteerMobile: superVolunteerMobile || null,
      bankAccountName: bankAccountName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankName: bankName || null,
      bankBranchName: bankBranchName || null,
      bankIfscCode: bankIfscCode || null,
      passbookOrChequeImage: passbookOrChequeImage || null,
      loanConsent,
      roomSizeUnit: roomSizeUnit || null,
      mobileVerified,
      houseImages: houseImages.length > 0 ? houseImages : [],
      ocrAadhaarName: ocrData.ocrName || null,
      ocrAadhaarNumber: ocrData.ocrAadhaarNumber || null,
      ocrAadhaarDob: ocrData.ocrDob || null,
      ocrAadhaarGender: ocrData.ocrGender || null,
      ocrAadhaarAddress: ocrData.ocrAddress || null,
      ocrVoterId: ocrData.ocrVoterId || null,
      ocrVoterName: ocrData.ocrVoterName || null,
    };

    if (editingId) {
      editMutation.mutate(formData);
    } else {
      submitMutation.mutate({ ...formData, appUserId: user.id, status: "pending" });
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const handleSendHstcOtp = async () => {
    const cleaned = otpMobile.replace(/\D/g, "").replace(/^91/, "");
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      toast({ title: l("title", language), description: "Enter valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const res = await apiRequest("POST", "/api/hstc/send-otp", { mobile: cleaned });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtpMobile(cleaned);
        toast({ title: `${l("otpSentTo", language)} ${data.maskedMobile || cleaned}` });
      }
    } catch {
      toast({ title: l("failedToSendOtp", language), variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyHstcOtp = async () => {
    if (!otpCode || otpCode.length !== 4) {
      toast({ title: l("invalidOtp", language), variant: "destructive" });
      return;
    }
    setOtpVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/hstc/verify-otp", { mobile: otpMobile, otp: otpCode });
      const data = await res.json();
      if (data.success) {
        setMobileVerified(true);
        setMobileNumber(otpMobile);
        toast({ title: l("otpVerified", language) });
        setStep("form");
      }
    } catch {
      toast({ title: l("invalidOtp", language), variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  if (step === "verify_mobile") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-orange-600 text-white px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => { setStep("select_unit"); setOtpSent(false); setOtpCode(""); }} data-testid="button-hstc-otp-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <h1 className="font-semibold text-lg">{l("title", language)}</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-6 w-6 text-orange-600" />
                <h2 className="text-lg font-bold text-slate-800">{l("verifyMobile", language)}</h2>
              </div>
              <p className="text-sm text-slate-600">{l("verifyMobileSubtitle", language)}</p>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("mobNo", language)}</label>
                <Input
                  type="tel"
                  maxLength={10}
                  value={otpMobile}
                  onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  disabled={otpSent}
                  data-testid="input-hstc-otp-mobile"
                />
              </div>

              {!otpSent ? (
                <Button className="w-full bg-orange-600" onClick={handleSendHstcOtp} disabled={otpSending} data-testid="button-hstc-send-otp">
                  {otpSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {l("sendOtp", language)}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">{l("enterOtp", language)}</label>
                    <Input
                      type="text"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="1234"
                      className="text-center text-2xl tracking-widest"
                      data-testid="input-hstc-otp-code"
                    />
                  </div>
                  <Button className="w-full bg-orange-600" onClick={handleVerifyHstcOtp} disabled={otpVerifying} data-testid="button-hstc-verify-otp">
                    {otpVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    {l("verifyOtp", language)}
                  </Button>
                  <Button variant="ghost" className="w-full text-sm text-slate-500" onClick={() => { setOtpSent(false); setOtpCode(""); }} data-testid="button-hstc-resend-otp">
                    {l("sendOtp", language)}
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === "select_unit") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-orange-600 text-white px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setStep("description")} data-testid="button-hstc-unit-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <h1 className="font-semibold text-lg">{l("title", language)}</h1>
          </div>
        </header>

        <div className="p-4">
          <UnitSelector
            title={l("selectUnit", language)}
            subtitle={l("selectUnitSubtitle", language)}
            defaultVillageId={user.mappedAreaId || undefined}
            onSelect={(unit) => {
              setSelectedVillageId(unit.villageId);
              setSelectedVillageName(unit.villageName);
              setStep("verify_mobile");
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "description") {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-orange-600 text-white px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white" onClick={() => setLocation("/")} data-testid="button-hstc-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <h1 className="font-semibold text-lg">{l("title", language)}</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-bold text-slate-800">{l("title", language)}</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line" data-testid="text-hstc-description">
                {(descriptions as any)[language] || descriptions.en}
              </p>
              <Button className="w-full mt-4" onClick={() => setStep("select_unit")} data-testid="button-hstc-next">
                {t('next')} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {mySubmissions && mySubmissions.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">{l("previousSubmissions", language)}</h3>
                <div className="space-y-3">
                  {mySubmissions.map((sub) => (
                    <SubmissionCard key={sub.id} sub={sub} language={language} user={user} onEdit={loadForEdit} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-orange-600 text-white px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => { setStep(editingId ? "description" : "select_unit"); if (editingId) { setEditingId(null); resetForm(); } }} data-testid="button-hstc-form-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          <h1 className="font-semibold">{editingId ? l("editApplication", language) : l("title", language)}</h1>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">1</span>
              {l("basicInfo", language)}
            </h3>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("houseOwnerName", language)} *</label>
              <Input value={houseOwnerName} onChange={(e) => setHouseOwnerName(e.target.value)} data-testid="input-hstc-owner-name" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("fatherHusbandName", language)} *</label>
              <Input value={fatherHusbandName} onChange={(e) => setFatherHusbandName(e.target.value)} data-testid="input-hstc-father-name" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("villageName", language)}</label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <Input value={selectedVillageName || user.mappedAreaName || ""} disabled className="bg-slate-100 flex-1" data-testid="input-hstc-village" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("mobNo", language)} *</label>
              <div className="flex items-center gap-2">
                <Input type="tel" maxLength={10} value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))} className="flex-1" data-testid="input-hstc-mobile" />
                {mobileVerified && (
                  <Badge className="bg-green-100 text-green-700 shrink-0" data-testid="badge-hstc-mobile-verified">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    {l("mobileVerifiedBadge", language)}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">2</span>
              {l("costDetails", language)}
            </h3>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("repairMaterialCost", language)} *</label>
              <Input type="number" value={repairMaterialCost} onChange={(e) => setRepairMaterialCost(e.target.value)} data-testid="input-hstc-material-cost" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("estimatedLabourCost", language)} *</label>
              <Input type="number" value={estimatedLabourCost} onChange={(e) => setEstimatedLabourCost(e.target.value)} data-testid="input-hstc-labour-cost" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("totalCost", language)}</label>
              <Input value={totalCost > 0 ? `₹ ${totalCost.toLocaleString()}` : ""} disabled className="bg-slate-100 font-semibold text-green-700" data-testid="input-hstc-total-cost" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">3</span>
              {l("documents", language)}
            </h3>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{l("aadhaarCard", language)}</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="file" accept="image/*" capture="environment" ref={aadhaarFrontCamRef} className="hidden" onChange={() => handlePhotoCapture(setAadhaarFront, aadhaarFrontCamRef, "aadhaarFront")} />
                <input type="file" accept="image/*" ref={aadhaarFrontUpRef} className="hidden" onChange={() => handlePhotoCapture(setAadhaarFront, aadhaarFrontUpRef, "aadhaarFront")} />
                <PhotoField
                  label={l("front", language)}
                  value={aadhaarFront}
                  onCapture={() => aadhaarFrontCamRef.current?.click()}
                  onUpload={() => aadhaarFrontUpRef.current?.click()}
                  processing={processingType === "aadhaarFront"}
                  processingLabel={l("reading", language)}
                />
                <input type="file" accept="image/*" capture="environment" ref={aadhaarBackCamRef} className="hidden" onChange={() => handlePhotoCapture(setAadhaarBack, aadhaarBackCamRef, "aadhaarBack")} />
                <input type="file" accept="image/*" ref={aadhaarBackUpRef} className="hidden" onChange={() => handlePhotoCapture(setAadhaarBack, aadhaarBackUpRef, "aadhaarBack")} />
                <PhotoField
                  label={l("back", language)}
                  value={aadhaarBack}
                  onCapture={() => aadhaarBackCamRef.current?.click()}
                  onUpload={() => aadhaarBackUpRef.current?.click()}
                  processing={processingType === "aadhaarBack"}
                  processingLabel={l("reading", language)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{l("voterIdCard", language)}</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="file" accept="image/*" capture="environment" ref={voterFrontCamRef} className="hidden" onChange={() => handlePhotoCapture(setVoterIdFront, voterFrontCamRef, "voterId")} />
                <input type="file" accept="image/*" ref={voterFrontUpRef} className="hidden" onChange={() => handlePhotoCapture(setVoterIdFront, voterFrontUpRef, "voterId")} />
                <PhotoField
                  label={l("front", language)}
                  value={voterIdFront}
                  onCapture={() => voterFrontCamRef.current?.click()}
                  onUpload={() => voterFrontUpRef.current?.click()}
                  processing={processingType === "voterId"}
                  processingLabel={l("reading", language)}
                />
                <input type="file" accept="image/*" capture="environment" ref={voterBackCamRef} className="hidden" onChange={() => handlePhotoCapture(setVoterIdBack, voterBackCamRef)} />
                <input type="file" accept="image/*" ref={voterBackUpRef} className="hidden" onChange={() => handlePhotoCapture(setVoterIdBack, voterBackUpRef)} />
                <PhotoField
                  label={l("back", language)}
                  value={voterIdBack}
                  onCapture={() => voterBackCamRef.current?.click()}
                  onUpload={() => voterBackUpRef.current?.click()}
                  processing={false}
                  processingLabel=""
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{l("application", language)}</label>
              <input type="file" accept="image/*" capture="environment" ref={appCamRef} className="hidden" onChange={() => handlePhotoCapture(setApplicationPhoto, appCamRef)} />
              <input type="file" accept="image/*" ref={appUpRef} className="hidden" onChange={() => handlePhotoCapture(setApplicationPhoto, appUpRef)} />
              <PhotoField
                label={l("application", language)}
                value={applicationPhoto}
                onCapture={() => appCamRef.current?.click()}
                onUpload={() => appUpRef.current?.click()}
                processing={false}
                processingLabel=""
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">4</span>
              {l("materialDetails", language)}
            </h3>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("numberOfPeople", language)}</label>
              <Input type="number" value={numberOfPeople} onChange={(e) => setNumberOfPeople(e.target.value)} data-testid="input-hstc-people" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("roomSize", language)}</label>
              <div className="flex gap-2">
                <Input value={roomSize} onChange={(e) => setRoomSize(e.target.value)} className="flex-1" data-testid="input-hstc-room-size" />
                <Select value={roomSizeUnit} onValueChange={setRoomSizeUnit}>
                  <SelectTrigger className="w-28" data-testid="select-hstc-room-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq ft">sq ft</SelectItem>
                    <SelectItem value="L × W">L × W</SelectItem>
                    <SelectItem value="sq yd">sq yd</SelectItem>
                    <SelectItem value="sq m">sq m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("bricksQty", language)}</label>
                <Input value={bricksQty} onChange={(e) => setBricksQty(e.target.value)} data-testid="input-hstc-bricks" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("sandSqFt", language)}</label>
                <Input value={sandSqFt} onChange={(e) => setSandSqFt(e.target.value)} data-testid="input-hstc-sand" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("gravelTonKg", language)}</label>
                <Input value={gravelTonKg} onChange={(e) => setGravelTonKg(e.target.value)} data-testid="input-hstc-gravel" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("cementKgQty", language)}</label>
                <Input value={cementKgQty} onChange={(e) => setCementKgQty(e.target.value)} data-testid="input-hstc-cement" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("sariaKtKg", language)}</label>
                <Input value={sariaKtKg} onChange={(e) => setSariaKtKg(e.target.value)} data-testid="input-hstc-saria" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">5</span>
              {l("volunteerDetails", language)}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("nodalVolunteer", language)}</label>
                <Input value={nodalVolunteerName} onChange={(e) => setNodalVolunteerName(e.target.value)} data-testid="input-hstc-nodal-name" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("nodalVolunteerMobile", language)}</label>
                <Input type="tel" maxLength={10} value={nodalVolunteerMobile} onChange={(e) => setNodalVolunteerMobile(e.target.value.replace(/\D/g, ""))} data-testid="input-hstc-nodal-mobile" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("superVolunteer", language)}</label>
                <Input value={superVolunteerName} onChange={(e) => setSuperVolunteerName(e.target.value)} data-testid="input-hstc-super-name" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("superVolunteerMobile", language)}</label>
                <Input type="tel" maxLength={10} value={superVolunteerMobile} onChange={(e) => setSuperVolunteerMobile(e.target.value.replace(/\D/g, ""))} data-testid="input-hstc-super-mobile" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">6</span>
              {l("houseImages", language)}
            </h3>
            <input type="file" accept="image/*" capture="environment" ref={houseCamRef} className="hidden" onChange={() => handleHouseImageCapture(houseCamRef)} />
            <input type="file" accept="image/*" multiple ref={houseUpRef} className="hidden" onChange={() => handleHouseImageCapture(houseUpRef)} />
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => houseCamRef.current?.click()} data-testid="button-hstc-house-camera">
                <Camera className="h-4 w-4 mr-1" /> {l("camera", language)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => houseUpRef.current?.click()} data-testid="button-hstc-house-upload">
                <Upload className="h-4 w-4 mr-1" /> {l("upload", language)}
              </Button>
            </div>
            {houseImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {houseImages.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} alt={`House ${idx + 1}`} className="w-full h-20 object-cover rounded-md" />
                    <button
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      onClick={() => setHouseImages(prev => prev.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-house-image-${idx}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">7</span>
              {l("bankDetails", language)}
            </h3>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("bankAccountName", language)}</label>
              <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} data-testid="input-hstc-bank-name" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("bankAccountNumber", language)}</label>
              <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} data-testid="input-hstc-bank-number" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{l("bankIfscCode", language)}</label>
              <div className="flex gap-2">
                <Input
                  value={bankIfscCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setBankIfscCode(val);
                    if (val.length === 11) lookupIfsc(val);
                  }}
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  className="flex-1"
                  data-testid="input-hstc-bank-ifsc"
                />
                {ifscLoading && <Loader2 className="h-5 w-5 animate-spin text-orange-500 mt-2" />}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("bankName", language)}</label>
                <Input value={bankName} disabled className="bg-slate-100" data-testid="input-hstc-bank-name-auto" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">{l("bankBranchName", language)}</label>
                <Input value={bankBranchName} disabled className="bg-slate-100" data-testid="input-hstc-bank-branch-auto" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">{l("passbookOrCheque", language)}</label>
              <input type="file" accept="image/*" capture="environment" ref={passbookCamRef} className="hidden" onChange={() => handlePhotoCapture(setPassbookOrChequeImage, passbookCamRef)} />
              <input type="file" accept="image/*" ref={passbookUpRef} className="hidden" onChange={() => handlePhotoCapture(setPassbookOrChequeImage, passbookUpRef)} />
              <PhotoField
                label={l("passbookOrCheque", language)}
                value={passbookOrChequeImage}
                onCapture={() => passbookCamRef.current?.click()}
                onUpload={() => passbookUpRef.current?.click()}
                processing={false}
                processingLabel=""
              />
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
              <Checkbox
                id="loan-consent"
                checked={loanConsent}
                onCheckedChange={(checked) => setLoanConsent(checked === true)}
                className="mt-0.5"
                data-testid="checkbox-hstc-loan-consent"
              />
              <label htmlFor="loan-consent" className="text-sm text-slate-700 leading-snug cursor-pointer">
                {l("loanConsent", language)}
              </label>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full bg-orange-600"
          onClick={handleSubmit}
          disabled={submitMutation.isPending || editMutation.isPending}
          data-testid="button-hstc-submit"
        >
          {(submitMutation.isPending || editMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {editingId ? l("updateApplication", language) : l("submitApplication", language)}
        </Button>
      </div>
    </div>
  );
}
