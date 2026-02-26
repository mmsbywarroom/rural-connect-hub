import type { AppUser } from "@shared/schema";

export interface ProfileField {
  key: string;
  label: string;
  section: string;
  filled: boolean;
}

export interface ProfileCompletion {
  percentage: number;
  filledCount: number;
  totalCount: number;
  fields: ProfileField[];
  missingFields: ProfileField[];
}

export function getProfileCompletion(user: AppUser): ProfileCompletion {
  const baseFields: { key: keyof AppUser; label: string; section: string }[] = [
    { key: "name", label: "Full Name", section: "Personal" },
    { key: "selfPhoto", label: "Self Photo", section: "Personal" },
    { key: "voterId", label: "Voter ID Number", section: "Documents" },
    { key: "aadhaarNumber", label: "Aadhaar Number", section: "Documents" },
    { key: "aadhaarPhoto", label: "Aadhaar Front Photo", section: "Documents" },
    { key: "aadhaarPhotoBack", label: "Aadhaar Back Photo", section: "Documents" },
    { key: "voterCardPhoto", label: "Voter Card Front Photo", section: "Documents" },
    { key: "voterCardPhotoBack", label: "Voter Card Back Photo", section: "Documents" },
    { key: "wing", label: "Wing", section: "Role" },
  ];

  if (user.role === "party_post_holder") {
    baseFields.push(
      { key: "currentPosition", label: "Position", section: "Role" },
      { key: "level", label: "Level", section: "Role" },
    );
  }

  const fields: ProfileField[] = baseFields.map((f) => ({
    key: f.key,
    label: f.label,
    section: f.section,
    filled: !!(user[f.key] && String(user[f.key]).trim()),
  }));

  const filledCount = fields.filter((f) => f.filled).length;
  const totalCount = fields.length;
  const percentage = Math.round((filledCount / totalCount) * 100);
  const missingFields = fields.filter((f) => !f.filled);

  return { percentage, filledCount, totalCount, fields, missingFields };
}
