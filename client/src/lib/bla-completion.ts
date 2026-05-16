export type BlaCompletionInput = {
  bloMobileVerified?: boolean | null;
  blaLivePhoto?: string | null;
  aadhaarFront?: string | null;
  aadhaarBack?: string | null;
  aadhaarNumber?: string | null;
  voterCardImage?: string | null;
  voterCardImageBack?: string | null;
  epicNumber?: string | null;
  gender?: string | null;
  healthCardMade?: string | null;
  msrRegistered?: string | null;
  blaRelation?: string | null;
  religionCommunity?: string | null;
  casteCategory?: string | null;
  dob?: string | null;
  anniversaryDate?: string | null;
  computerDataEntry?: string | null;
};

export type BlaCompletionResult = {
  percentage: number;
  filledCount: number;
  totalCount: number;
  missingFields: string[];
  isComplete: boolean;
};

type FieldCheck = { label: string; test: (d: BlaCompletionInput) => boolean };

function getBlaFieldChecks(data: BlaCompletionInput): FieldCheck[] {
  const checks: FieldCheck[] = [
    { label: "Mobile OTP verified", test: (d) => !!d.bloMobileVerified },
    { label: "BLA live photo", test: (d) => !!d.blaLivePhoto?.trim() },
    { label: "Aadhaar front", test: (d) => !!d.aadhaarFront?.trim() },
    { label: "Aadhaar back", test: (d) => !!d.aadhaarBack?.trim() },
    { label: "Aadhaar number", test: (d) => !!d.aadhaarNumber?.trim() },
    { label: "Voter card (front)", test: (d) => !!d.voterCardImage?.trim() },
    { label: "Voter card (back)", test: (d) => !!d.voterCardImageBack?.trim() },
    { label: "EPIC number", test: (d) => !!d.epicNumber?.trim() },
    { label: "Gender", test: (d) => !!d.gender?.trim() },
  ];

  const g = (data.gender || "").toLowerCase();
  if (g === "male" || g === "female" || g === "other") {
    checks.push({ label: "Health card", test: (d) => !!d.healthCardMade?.trim() });
  }
  if (g === "female") {
    checks.push({ label: "MSR registration", test: (d) => !!d.msrRegistered?.trim() });
  }

  checks.push(
    { label: "Religion", test: (d) => !!d.blaRelation?.trim() },
    { label: "Community / caste", test: (d) => !!d.religionCommunity?.trim() },
    { label: "Caste category", test: (d) => !!d.casteCategory?.trim() },
    { label: "Date of birth", test: (d) => !!d.dob?.trim() },
    { label: "Anniversary date", test: (d) => !!d.anniversaryDate?.trim() },
    { label: "Computer / mobile data entry", test: (d) => !!d.computerDataEntry?.trim() },
  );

  return checks;
}

export function computeBlaCompletion(data: BlaCompletionInput): BlaCompletionResult {
  const checks = getBlaFieldChecks(data);
  const missingFields: string[] = [];
  let filledCount = 0;
  for (const f of checks) {
    if (f.test(data)) filledCount++;
    else missingFields.push(f.label);
  }
  const totalCount = checks.length;
  const percentage = totalCount === 0 ? 0 : Math.round((filledCount / totalCount) * 100);
  return {
    percentage,
    filledCount,
    totalCount,
    missingFields,
    isComplete: filledCount === totalCount,
  };
}
