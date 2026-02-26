import Tesseract from "tesseract.js";

export interface AadhaarFrontData {
  aadhaarNumber?: string;
  name?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface AadhaarBackData {
  address?: string;
}

export interface VoterIdData {
  voterId?: string;
  name?: string;
}

async function extractText(imageBase64: string): Promise<string> {
  const result = await Tesseract.recognize(imageBase64, "eng+hin", {
    logger: () => {},
  });
  return result.data.text;
}

export function parseAadhaarFront(text: string): AadhaarFrontData {
  const data: AadhaarFrontData = {};
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const aadhaarMatch = text.replace(/\s/g, "").match(/\d{4}\s*\d{4}\s*\d{4}/);
  if (!aadhaarMatch) {
    const digits = text.replace(/[^\d\s]/g, "");
    const fourGroups = digits.match(/(\d{4})\s+(\d{4})\s+(\d{4})/);
    if (fourGroups) {
      data.aadhaarNumber = `${fourGroups[1]}${fourGroups[2]}${fourGroups[3]}`;
    }
  } else {
    data.aadhaarNumber = aadhaarMatch[0].replace(/\s/g, "");
  }

  const dobPatterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    /DOB\s*[:\-]?\s*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i,
    /Date\s*of\s*Birth\s*[:\-]?\s*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i,
    /Year\s*of\s*Birth\s*[:\-]?\s*(\d{4})/i,
  ];
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4) {
        data.dateOfBirth = `${match[1]}/${match[2]}/${match[3]}`;
      } else if (match.length === 2) {
        data.dateOfBirth = match[1];
      }
      break;
    }
  }

  const genderPatterns = [
    /\b(MALE|Male|male)\b/,
    /\b(FEMALE|Female|female)\b/,
    /\b(TRANSGENDER|Transgender)\b/,
  ];
  for (const pattern of genderPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.gender = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      break;
    }
  }

  const skipWords = [
    "government",
    "india",
    "aadhaar",
    "unique",
    "identification",
    "authority",
    "uidai",
    "dob",
    "male",
    "female",
    "year",
    "birth",
    "date",
    "help",
    "enrol",
    "vid",
    "download",
    "maadhaar",
    "address",
  ];

  for (const line of lines) {
    const cleaned = line.replace(/[^a-zA-Z\s]/g, "").trim();
    if (cleaned.length < 3 || cleaned.length > 50) continue;
    const lower = cleaned.toLowerCase();
    if (skipWords.some((w) => lower.includes(w))) continue;
    if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(cleaned) || /^[A-Z]{2,}/.test(cleaned)) {
      const words = cleaned.split(/\s+/);
      if (words.length >= 2 && words.length <= 5) {
        data.name = cleaned
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        break;
      }
    }
  }

  return data;
}

export function parseAadhaarBack(text: string): AadhaarBackData {
  const data: AadhaarBackData = {};
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const addressKeywords = [
    "address",
    "s/o",
    "d/o",
    "w/o",
    "c/o",
    "house",
    "village",
    "dist",
    "state",
    "pin",
    "po",
    "ps",
    "vill",
    "teh",
    "block",
    "ward",
    "nagar",
    "colony",
    "street",
    "road",
    "lane",
    "sector",
  ];

  let addressStartIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes("address") || lower.match(/^(s|d|w|c)\/o/i)) {
      addressStartIdx = i;
      break;
    }
    if (addressKeywords.some((kw) => lower.includes(kw))) {
      addressStartIdx = i;
      break;
    }
  }

  if (addressStartIdx >= 0) {
    const addressLines = [];
    for (let i = addressStartIdx; i < Math.min(addressStartIdx + 6, lines.length); i++) {
      let line = lines[i].replace(/^address\s*[:\-]?\s*/i, "").trim();
      if (line.match(/^\d{4}\s*\d{4}\s*\d{4}$/)) break;
      if (line.length > 2) addressLines.push(line);
    }
    if (addressLines.length > 0) {
      data.address = addressLines.join(", ");
    }
  }

  return data;
}

export function parseVoterId(text: string): VoterIdData {
  const data: VoterIdData = {};

  const voterIdPattern = /\b([A-Z]{2,3}\d{6,8}[A-Z]?)\b/;
  const match = text.match(voterIdPattern);
  if (match) {
    data.voterId = match[1];
  }

  const epicPattern = /EPIC\s*(?:No|Number)?\s*[:\-]?\s*([A-Z]{2,3}\d{6,8}[A-Z]?)/i;
  const epicMatch = text.match(epicPattern);
  if (epicMatch) {
    data.voterId = epicMatch[1].toUpperCase();
  }

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const skipWords = [
    "election",
    "commission",
    "india",
    "voter",
    "identity",
    "card",
    "photo",
    "epic",
    "electoral",
    "elector",
    "polling",
    "section",
    "part",
  ];

  const namePatterns = [
    /Name\s*[:\-]?\s*(.+)/i,
    /Elector.?s?\s*Name\s*[:\-]?\s*(.+)/i,
  ];

  for (const pattern of namePatterns) {
    const nameMatch = text.match(pattern);
    if (nameMatch) {
      const cleaned = nameMatch[1].replace(/[^a-zA-Z\s]/g, "").trim();
      if (cleaned.length >= 3) {
        data.name = cleaned
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        break;
      }
    }
  }

  if (!data.name) {
    for (const line of lines) {
      const cleaned = line.replace(/[^a-zA-Z\s]/g, "").trim();
      if (cleaned.length < 3 || cleaned.length > 50) continue;
      const lower = cleaned.toLowerCase();
      if (skipWords.some((w) => lower.includes(w))) continue;
      const words = cleaned.split(/\s+/);
      if (words.length >= 2 && words.length <= 5 && /^[A-Z]/.test(cleaned)) {
        data.name = words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        break;
      }
    }
  }

  return data;
}

export async function processAadhaarFront(imageBase64: string): Promise<AadhaarFrontData> {
  const text = await extractText(imageBase64);
  return parseAadhaarFront(text);
}

export async function processAadhaarBack(imageBase64: string): Promise<AadhaarBackData> {
  const text = await extractText(imageBase64);
  return parseAadhaarBack(text);
}

export async function processVoterId(imageBase64: string): Promise<VoterIdData> {
  const text = await extractText(imageBase64);
  return parseVoterId(text);
}
