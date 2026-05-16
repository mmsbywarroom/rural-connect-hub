import type { Language } from "@/lib/i18n";

type L10n = { en: string; hi: string; pa: string };

const labels: Record<string, L10n> = {
  selectBoothTitle: { en: "Select Booth (1–258)", hi: "बूथ चुनें (1–258)", pa: "ਬੂਥ ਚੁਣੋ (1–258)" },
  selectBlaTitle: { en: "Booth {booth} – Select BLA", hi: "बूथ {booth} – BLA चुनें", pa: "ਬੂਥ {booth} – BLA ਚੁਣੋ" },
  formTitle: { en: "BLA Registration Form", hi: "BLA पंजीकरण फॉर्म", pa: "BLA ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਫਾਰਮ" },
  searchBooth: { en: "Search booth number...", hi: "बूथ नंबर खोजें...", pa: "ਬੂਥ ਨੰਬਰ ਖੋਜੋ..." },
  addMoreBla: {
    en: "Add more BLA in booth {booth}",
    hi: "इस बूथ ({booth}) में और BLA जोड़ें",
    pa: "ਇਸ ਬੂਥ ({booth}) ਵਿੱਚ ਹੋਰ BLA ਜੋੜੋ",
  },
  noBlaYet: {
    en: "No BLA for this booth yet. Use the button above to add one.",
    hi: "इस बूथ के लिए अभी कोई BLA नहीं। ऊपर बटन से नया BLA जोड़ें।",
    pa: "ਇਸ ਬੂਥ ਲਈ ਅਜੇ ਕੋਈ BLA ਨਹੀਂ। ਉੱਪਰਲੇ ਬਟਨ ਨਾਲ ਨਵਾਂ BLA ਜੋੜੋ।",
  },
  loadBlaFailed: {
    en: "Could not load BLA list. Tap retry or ask admin to upload CSV again.",
    hi: "BLA सूची लोड नहीं हुई। दोबारा कोशिश करें या admin से CSV upload करवाएं।",
    pa: "BLA ਸੂਚੀ ਲੋਡ ਨਹੀਂ ਹੋਈ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ admin ਤੋਂ CSV upload ਕਰਵਾਓ।",
  },
  retry: { en: "Retry", hi: "दोबारा", pa: "ਦੁਬਾਰਾ" },
  blaAdded: { en: "BLA added to this booth", hi: "BLA जोड़ा गया", pa: "BLA ਇਸ ਬੂਥ ਵਿੱਚ ਜੋੜਿਆ ਗਿਆ" },
  addBlaFailed: { en: "Failed to add BLA", hi: "BLA जोड़ना असफल", pa: "BLA ਜੋੜਨਾ ਅਸਫਲ" },
  otpSent: { en: "OTP sent", hi: "OTP भेजा गया", pa: "OTP ਭੇਜਿਆ ਗਿਆ" },
  otpFailed: { en: "Failed to send OTP", hi: "OTP भेजना असफल", pa: "OTP ਭੇਜਣਾ ਅਸਫਲ" },
  mobileVerified: { en: "Mobile verified", hi: "मोबाइल सत्यापित", pa: "ਮੋਬਾਈਲ ਤਸਦੀਕ ਹੋਈ" },
  invalidOtp: { en: "Invalid OTP", hi: "गलत OTP", pa: "ਗਲਤ OTP" },
  blaSubmitted: { en: "BLA submitted", hi: "BLA सबमिट हो गया", pa: "BLA ਜਮ੍ਹਾਂ ਹੋ ਗਿਆ" },
  savedIncomplete: { en: "Saved as incomplete", hi: "अधूरा सहेजा गया", pa: "ਅਧੂਰਾ ਸੰਭਾਲਿਆ ਗਿਆ" },
  submitFailed: { en: "Submit failed", hi: "सबमिट असफल", pa: "ਜਮ੍ਹਾਂ ਅਸਫਲ" },
  imageError: { en: "Image error", hi: "फोटो त्रुटि", pa: "ਫੋਟੋ ਗਲਤੀ" },
  complete: { en: "Complete", hi: "पूर्ण", pa: "ਪੂਰਨ" },
  incomplete: { en: "Incomplete", hi: "अधूरा", pa: "ਅਧੂਰਾ" },
  remaining: { en: "Remaining:", hi: "बाकी:", pa: "ਬਾਕੀ:" },
  boothLabel: { en: "Booth", hi: "बूथ", pa: "ਬੂਥ" },
  addBlaDialogTitle: { en: "Add BLA to booth {booth}", hi: "बूथ {booth} में BLA जोड़ें", pa: "ਬੂਥ {booth} ਵਿੱਚ BLA ਜੋੜੋ" },
  name: { en: "Name", hi: "नाम", pa: "ਨਾਮ" },
  mobile: { en: "Mobile", hi: "मोबाइल", pa: "ਮੋਬਾਈਲ" },
  cancel: { en: "Cancel", hi: "रद्द", pa: "ਰੱਦ ਕਰੋ" },
  add: { en: "Add", hi: "जोड़ें", pa: "ਜੋੜੋ" },
  blaName: { en: "BLA Name", hi: "BLA नाम", pa: "BLA ਨਾਮ" },
  boothNumber: { en: "Booth Number", hi: "बूथ नंबर", pa: "ਬੂਥ ਨੰਬਰ" },
  mobileOtp: { en: "Mobile (OTP)", hi: "मोबाइल (OTP)", pa: "ਮੋਬਾਈਲ (OTP)" },
  blaLivePhoto: { en: "BLA live photo", hi: "BLA लाइव फोटो", pa: "BLA ਲਾਈਵ ਫੋਟੋ" },
  blaLivePhotoHint: {
    en: "Take a live selfie of the BLA using the camera",
    hi: "कैमरे से BLA की लाइव सेल्फी लें",
    pa: "ਕੈਮਰੇ ਨਾਲ BLA ਦੀ ਲਾਈਵ ਸੈਲਫੀ ਲਓ",
  },
  retakePhoto: { en: "Retake photo", hi: "फोटो दोबारा लें", pa: "ਫੋਟੋ ਦੁਬਾਰਾ ਲਓ" },
  present: { en: "Present", hi: "उपस्थित", pa: "ਹਾਜ਼ਰ" },
  absent: { en: "Absent", hi: "अनुपस्थित", pa: "ਗੈਰਹਾਜ਼ਰ" },
  attendanceToday: { en: "Today's attendance", hi: "आज की उपस्थिति", pa: "ਅੱਜ ਦੀ ਹਾਜ਼ਰੀ" },
  attendanceMarked: { en: "Attendance saved", hi: "उपस्थिति सहेजी गई", pa: "ਹਾਜ਼ਰੀ ਸੰਭਾਲੀ ਗਈ" },
  attendanceFailed: { en: "Failed to save attendance", hi: "उपस्थिति सहेजना असफल", pa: "ਹਾਜ਼ਰੀ ਸੰਭਾਲਣਾ ਅਸਫਲ" },
  sendOtp: { en: "Send OTP", hi: "OTP भेजें", pa: "OTP ਭੇਜੋ" },
  verified: { en: "Verified", hi: "सत्यापित", pa: "ਤਸਦੀਕਿਤ" },
  verify: { en: "Verify", hi: "सत्यापित करें", pa: "ਤਸਦੀਕ ਕਰੋ" },
  aadhaar: { en: "Aadhaar", hi: "आधार", pa: "ਆਧਾਰ" },
  aadhaarFront: { en: "Front", hi: "अगला", pa: "ਅੱਗੇ" },
  aadhaarBack: { en: "Back", hi: "पिछला", pa: "ਪਿੱਛੇ" },
  aadhaarNumber: { en: "Aadhaar Number", hi: "आधार नंबर", pa: "ਆਧਾਰ ਨੰਬਰ" },
  voterCard: { en: "Voter Card", hi: "वोटर कार्ड", pa: "ਵੋਟਰ ਕਾਰਡ" },
  voterCardFront: { en: "Voter card (front)", hi: "वोटर कार्ड (सामने)", pa: "ਵੋਟਰ ਕਾਰਡ (ਸਾਹਮਣੇ)" },
  voterCardBack: { en: "Voter card (back)", hi: "वोटर कार्ड (पीछे)", pa: "ਵੋਟਰ ਕਾਰਡ (ਪਿੱਛੇ)" },
  attached: { en: "Attached", hi: "जोड़ा गया", pa: "ਜੁੜਿਆ" },
  camera: { en: "Camera", hi: "कैमरा", pa: "ਕੈਮਰਾ" },
  upload: { en: "Upload", hi: "अपलोड", pa: "ਅਪਲੋਡ" },
  epicVoterId: { en: "EPIC / Voter ID", hi: "EPIC / वोटर ID", pa: "EPIC / ਵੋਟਰ ID" },
  gender: { en: "Gender", hi: "लिंग", pa: "ਲਿੰਗ" },
  select: { en: "Select", hi: "चुनें", pa: "ਚੁਣੋ" },
  male: { en: "Male", hi: "पुरुष", pa: "ਪੁਰੁਸ਼" },
  female: { en: "Female", hi: "महिला", pa: "ਮਹਿਲਾ" },
  other: { en: "Other", hi: "अन्य", pa: "ਹੋਰ" },
  healthCard: { en: "Health card made?", hi: "हेल्थ कार्ड बना?", pa: "ਹੈਲਥ ਕਾਰਡ ਬਣਿਆ?" },
  msrRegistration: {
    en: "MSR registration done?",
    hi: "MSR में रजिस्ट्रेशन?",
    pa: "MSR ਵਿੱਚ ਰਜਿਸਟ੍ਰੇਸ਼ਨ?",
  },
  yesNo: { en: "Yes / No", hi: "हाँ / नहीं", pa: "ਹਾਂ / ਨਹੀਂ" },
  religion: { en: "Religion", hi: "धर्म", pa: "ਧਰਮ" },
  selectReligion: { en: "Select religion", hi: "धर्म चुनें", pa: "ਧਰਮ ਚੁਣੋ" },
  religionCommunity: {
    en: "Community / caste (by religion)",
    hi: "समुदाय / जाति (धर्म के अनुसार)",
    pa: "ਸਮੁਦਾਇ / ਜਾਤਿ (ਧਰਮ ਅਨੁਸਾਰ)",
  },
  selectCommunity: {
    en: "Select community",
    hi: "समुदाय चुनें",
    pa: "ਸਮੁਦਾਇ ਚੁਣੋ",
  },
  casteCategory: { en: "Caste category", hi: "जाति श्रेणी", pa: "ਜਾਤਿ ਸ਼੍ਰੇਣੀ" },
  castePlaceholder: { en: "GEN / OBC / BC / SC / ST", hi: "GEN / OBC / BC / SC / ST", pa: "GEN / OBC / BC / SC / ST" },
  dob: { en: "Date of birth", hi: "जन्म तिथि", pa: "ਜਨਮ ਤਾਰੀਖ" },
  anniversaryDate: { en: "Anniversary date", hi: "वर्षगाँठ की तारीख", pa: "ਵਿਸ਼ਾ ਤਾਰੀਖ" },
  computerDataEntry: {
    en: "Can you do data entry on computer and mobile?",
    hi: "कंप्यूटर और मोबाइल में डेटा एंट्री करना आता है?",
    pa: "ਕੰਪਿਊਟਰ ਅਤੇ ਮੋਬਾਈਲ ਵਿੱਚ ਡਾਟਾ ਐਂਟਰੀ ਕਰਨੀ ਆਉਂਦੀ ਹੈ?",
  },
  saveSubmit: { en: "Save & Submit", hi: "सहेजें और सबमिट करें", pa: "ਸੰਭਾਲੋ ਅਤੇ ਜਮ੍ਹਾਂ ਕਰੋ" },
  // Completion field labels
  fieldMobileOtp: { en: "Mobile OTP verified", hi: "मोबाइल OTP सत्यापित", pa: "ਮੋਬਾਈਲ OTP ਤਸਦੀਕ" },
  fieldBlaLivePhoto: { en: "BLA live photo", hi: "BLA लाइव फोटो", pa: "BLA ਲਾਈਵ ਫੋਟੋ" },
  fieldAadhaarFront: { en: "Aadhaar front", hi: "आधार अगला", pa: "ਆਧਾਰ ਅੱਗੇ" },
  fieldAadhaarBack: { en: "Aadhaar back", hi: "आधार पिछला", pa: "ਆਧਾਰ ਪਿੱਛੇ" },
  fieldAadhaarNumber: { en: "Aadhaar number", hi: "आधार नंबर", pa: "ਆਧਾਰ ਨੰਬਰ" },
  fieldVoterCardFront: { en: "Voter card (front)", hi: "वोटर कार्ड (सामने)", pa: "ਵੋਟਰ ਕਾਰਡ (ਸਾਹਮਣੇ)" },
  fieldVoterCardBack: { en: "Voter card (back)", hi: "वोटर कार्ड (पीछे)", pa: "ਵੋਟਰ ਕਾਰਡ (ਪਿੱਛੇ)" },
  fieldEpic: { en: "EPIC number", hi: "EPIC नंबर", pa: "EPIC ਨੰਬਰ" },
  fieldGender: { en: "Gender", hi: "लिंग", pa: "ਲਿੰਗ" },
  fieldHealthCard: { en: "Health card", hi: "हेल्थ कार्ड", pa: "ਹੈਲਥ ਕਾਰਡ" },
  fieldMsr: { en: "MSR registration", hi: "MSR रजिस्ट्रेशन", pa: "MSR ਰਜਿਸਟ੍ਰੇਸ਼ਨ" },
  fieldReligion: { en: "Religion", hi: "धर्म", pa: "ਧਰਮ" },
  fieldReligionCommunity: {
    en: "Community / caste",
    hi: "समुदाय / जाति",
    pa: "ਸਮੁਦਾਇ / ਜਾਤਿ",
  },
  fieldCaste: { en: "Caste category", hi: "जाति श्रेणी", pa: "ਜਾਤਿ ਸ਼੍ਰੇਣੀ" },
  fieldDob: { en: "Date of birth", hi: "जन्म तिथि", pa: "ਜਨਮ ਤਾਰੀਖ" },
  fieldAnniversary: { en: "Anniversary date", hi: "वर्षगाँठ की तारीख", pa: "ਵਿਸ਼ਾ ਤਾਰੀਖ" },
  fieldComputerDataEntry: {
    en: "Computer / mobile data entry",
    hi: "कंप्यूटर / मोबाइल डेटा एंट्री",
    pa: "ਕੰਪਿਊਟਰ / ਮੋਬਾਈਲ ਡਾਟਾ ਐਂਟਰੀ",
  },
};

const RELIGION_LABELS: Record<string, L10n> = {
  Hindu: { en: "Hindu", hi: "हिंदू", pa: "ਹਿੰਦੂ" },
  Muslim: { en: "Muslim", hi: "मुस्लिम", pa: "ਮੁਸਲਿਮ" },
  Sikh: { en: "Sikh", hi: "सिख", pa: "ਸਿੱਖ" },
  Christian: { en: "Christian", hi: "ईसाई", pa: "ਇਸਾਈ" },
  Buddhist: { en: "Buddhist", hi: "बौद्ध", pa: "ਬੁੱਧ" },
  Jain: { en: "Jain", hi: "जैन", pa: "ਜੈਨ" },
  Other: { en: "Other", hi: "अन्य", pa: "ਹੋਰ" },
};

const CASTE_LABELS: Record<string, L10n> = {
  GEN: { en: "General (GEN)", hi: "सामान्य (GEN)", pa: "ਆਮ (GEN)" },
  OBC: { en: "OBC", hi: "OBC", pa: "OBC" },
  BC: { en: "BC", hi: "BC", pa: "BC" },
  SC: { en: "SC", hi: "SC", pa: "SC" },
  ST: { en: "ST", hi: "ST", pa: "ST" },
};

/** Map English completion labels from bla-completion to i18n keys */
export const COMPLETION_LABEL_KEY: Record<string, keyof typeof labels> = {
  "Mobile OTP verified": "fieldMobileOtp",
  "BLA live photo": "fieldBlaLivePhoto",
  "Aadhaar front": "fieldAadhaarFront",
  "Aadhaar back": "fieldAadhaarBack",
  "Aadhaar number": "fieldAadhaarNumber",
  "Voter card (front)": "fieldVoterCardFront",
  "Voter card (back)": "fieldVoterCardBack",
  "EPIC number": "fieldEpic",
  Gender: "fieldGender",
  "Health card": "fieldHealthCard",
  "MSR registration": "fieldMsr",
  Religion: "fieldReligion",
  "Community / caste": "fieldReligionCommunity",
  "Caste category": "fieldCaste",
  "Date of birth": "fieldDob",
  "Anniversary date": "fieldAnniversary",
  "Computer / mobile data entry": "fieldComputerDataEntry",
};

export function blaT(key: keyof typeof labels, language: Language, vars?: Record<string, string>): string {
  const entry = labels[key];
  if (!entry) return key;
  let text = language === "hi" ? entry.hi : language === "pa" ? entry.pa : entry.en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

export function blaReligionLabel(value: string, language: Language): string {
  const entry = RELIGION_LABELS[value];
  if (!entry) return value;
  return language === "hi" ? entry.hi : language === "pa" ? entry.pa : entry.en;
}

export function blaCasteLabel(value: string, language: Language): string {
  const entry = CASTE_LABELS[value];
  if (!entry) return value;
  return language === "hi" ? entry.hi : language === "pa" ? entry.pa : entry.en;
}

export function translateCompletionMissing(fields: string[], language: Language): string[] {
  return fields.map((f) => {
    const key = COMPLETION_LABEL_KEY[f];
    return key ? blaT(key, language) : f;
  });
}

export const BLA_RELIGION_VALUES = ["Hindu", "Muslim", "Sikh", "Christian", "Buddhist", "Jain", "Other"] as const;
