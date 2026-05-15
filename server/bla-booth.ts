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
