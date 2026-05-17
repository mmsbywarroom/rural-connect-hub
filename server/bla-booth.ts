/** Normalize Indian mobile to 10 digits for BLA master ↔ submission matching. */
export function normalizeBlaMobile(raw: string): string {
  let digits = String(raw ?? "").trim();
  if (/e\+?/i.test(digits)) {
    const n = Number(digits);
    if (Number.isFinite(n)) digits = String(Math.round(n));
  }
  digits = digits.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits;
}

/** Normalize BLA names for loose CSV ↔ submission matching. */
export function normalizeBlaName(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function submissionBoothForMatch(row: {
  boothNumber?: string | null;
  manualBoothId?: string | null;
  voterMappingBoothId?: string | null;
}): string {
  return normalizeBoothNumber(row.boothNumber || row.manualBoothId || row.voterMappingBoothId || "");
}

/** Prefer complete / highest-percentage submission when re-linking. */
export function blaSubmissionLinkScore(row: {
  completionPercentage?: number | null;
  status?: string | null;
}): number {
  const pct = row.completionPercentage ?? 0;
  const complete = String(row.status ?? "").toLowerCase() === "complete" ? 10_000 : 0;
  return complete + pct;
}

/** Normalize booth numbers so "01", "1 ", and "Booth 1" all match booth 1. */
export function normalizeBoothNumber(booth: string): string {
  const t = String(booth ?? "").trim();
  const digits = t.replace(/[^\d]/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && n > 0) return String(n);
  }
  return t;
}
