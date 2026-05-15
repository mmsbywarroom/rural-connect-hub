export type BlaCompletionInput = {
  bloMobileVerified?: boolean | null;
  aadhaarFront?: string | null;
  aadhaarBack?: string | null;
  aadhaarNumber?: string | null;
  voterCardImage?: string | null;
  epicNumber?: string | null;
  gender?: string | null;
  healthCardMade?: string | null;
  msrRegistered?: string | null;
  blaRelation?: string | null;
  casteCategory?: string | null;
  digitalSkills?: string[] | null;
};

export type BlaCompletionResult = {
  percentage: number;
  filledCount: number;
  totalCount: number;
  missingFields: string[];
  isComplete: boolean;
};

const FIELD_LABELS: { key: keyof BlaCompletionInput; label: string; test: (d: BlaCompletionInput) => boolean }[] = [
  { key: "bloMobileVerified", label: "Mobile OTP verified", test: (d) => !!d.bloMobileVerified },
  { key: "aadhaarFront", label: "Aadhaar front", test: (d) => !!d.aadhaarFront?.trim() },
  { key: "aadhaarBack", label: "Aadhaar back", test: (d) => !!d.aadhaarBack?.trim() },
  { key: "aadhaarNumber", label: "Aadhaar number", test: (d) => !!d.aadhaarNumber?.trim() },
  { key: "voterCardImage", label: "Voter card", test: (d) => !!d.voterCardImage?.trim() },
  { key: "epicNumber", label: "EPIC number", test: (d) => !!d.epicNumber?.trim() },
  { key: "gender", label: "Gender", test: (d) => !!d.gender?.trim() },
  { key: "healthCardMade", label: "Health card", test: (d) => !!d.healthCardMade?.trim() },
  { key: "msrRegistered", label: "MSR registration", test: (d) => !!d.msrRegistered?.trim() },
  { key: "blaRelation", label: "BLA relation", test: (d) => !!d.blaRelation?.trim() },
  { key: "casteCategory", label: "Caste category", test: (d) => !!d.casteCategory?.trim() },
  {
    key: "digitalSkills",
    label: "Digital skills",
    test: (d) => Array.isArray(d.digitalSkills) && d.digitalSkills.some((s) => s.trim().length > 0),
  },
];

export function computeBlaCompletion(data: BlaCompletionInput): BlaCompletionResult {
  const missingFields: string[] = [];
  let filledCount = 0;
  for (const f of FIELD_LABELS) {
    if (f.test(data)) filledCount++;
    else missingFields.push(f.label);
  }
  const totalCount = FIELD_LABELS.length;
  const percentage = totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100);
  return {
    percentage,
    filledCount,
    totalCount,
    missingFields,
    isComplete: filledCount === totalCount,
  };
}
