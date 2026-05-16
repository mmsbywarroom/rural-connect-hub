import type { InsertBlaSubmission } from "@shared/schema";

/** Columns added after initial BLA rollout — omit if DB migration not applied yet. */
const EXTENDED_KEYS = [
  "blaLivePhoto",
  "religionCommunity",
  "dob",
  "anniversaryDate",
  "voterCardImageBack",
  "computerDataEntry",
  "digitalSkills",
] as const;

export function splitBlaSubmissionWrite(data: InsertBlaSubmission): {
  core: Record<string, unknown>;
  extended: Record<string, unknown>;
} {
  const core: Record<string, unknown> = {};
  const extended: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if ((EXTENDED_KEYS as readonly string[]).includes(key)) {
      extended[key] = value;
    } else {
      core[key] = value;
    }
  }
  return { core, extended };
}

export function mergeBlaSubmissionRow<T extends Record<string, unknown>>(
  row: T,
  extended: Record<string, unknown>,
): T & Record<string, unknown> {
  return { ...row, ...extended };
}
