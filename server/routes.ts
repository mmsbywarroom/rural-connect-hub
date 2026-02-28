import type { Express } from "express";
import { createServer, type Server } from "http";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { OAuth2Client } from "google-auth-library";
import { storage } from "./storage";
import { sendPushToAll, sendPushToUser, VAPID_PUBLIC_KEY } from "./push";
import { translateBatch } from "./translate";
import { transliterateBatch } from "./transliterate";
import { sendOtpEmail, isEmailConfigured } from "./email";
import { sendOtpSms, isSmsConfigured, isIndianMobile, normalizeMobile, maskMobile } from "./sms";
import { db } from "./db";
import bcrypt from "bcryptjs";
import { sql, count, eq, desc, gte, lte, and, inArray } from "drizzle-orm";
import {
  insertVillageSchema, insertIssueSchema, insertWingSchema, insertGovWingSchema, insertPositionSchema,
  insertDepartmentSchema, insertLeadershipFlagSchema, insertVolunteerSchema,
  insertFamilyMemberSchema, insertVisitorSchema, insertVolunteerVisitSchema,
  insertOfficeManagerSchema, insertAppUserSchema, insertCscSchema, insertCscReportSchema,
  insertMappedVolunteerSchema, insertSupporterSchema, insertTaskCategorySchema, insertTaskConfigSchema,
  insertFormFieldSchema, insertFieldOptionSchema, insertFieldConditionSchema,
  insertTaskSubmissionSchema, insertHstcSubmissionSchema, insertAdminRoleSchema,
  LEVELS, WINGS, villages, issues, wings, govWings, govPositions, positions, departments, leadershipFlags,
  insertGovPositionSchema, adminRoles, users,
  taskSubmissions, taskConfigs, appUsers, voterList, officeManagers, hstcSubmissions,
  mappedVolunteers, supporters, otpCodes, sdskSubmissions, sdskCategories,
  insertSdskSubmissionSchema,
  surveys, surveyQuestions, surveyResponses,
  sunwaiComplaints, sunwaiLogs, insertSunwaiComplaintSchema,
  outdoorAdSubmissions, insertOutdoorAdSchema,
  insertGovSchoolSubmissionSchema, insertGovSchoolIssueCategorySchema,
  insertAppointmentSchema,
  nvyReports, insertNvyReportSchema,
  roadReports, insertRoadReportSchema,
  type InsertOfficeManager,
} from "@shared/schema";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, '');
}

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function storeOTP(identifier: string): Promise<string> {
  const otp = generateOTP();
  const key = normalizeEmail(identifier);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.insert(otpCodes).values({ key, otp, expiresAt })
    .onConflictDoUpdate({ target: otpCodes.key, set: { otp, expiresAt } });
  console.log(`[OTP] Generated OTP for ${identifier} (key: ${key})`);
  return otp;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.length <= 2 ? user[0] : user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

async function verifyOTP(identifier: string, otp: string): Promise<boolean> {
  const key = normalizeEmail(identifier);
  const cleanOtp = (otp || "").replace(/\D/g, '').trim();
  const [stored] = await db.select().from(otpCodes).where(eq(otpCodes.key, key)).limit(1);
  console.log(`[OTP] Verify attempt - identifier: "${identifier}", key: "${key}", otp: "${cleanOtp}", stored: ${stored ? 'yes' : 'no'}`);
  if (!stored) {
    console.log(`[OTP] FAIL - no stored OTP for key "${key}"`);
    return false;
  }
  if (new Date() > stored.expiresAt) {
    console.log(`[OTP] FAIL - OTP expired for "${key}"`);
    await db.delete(otpCodes).where(eq(otpCodes.key, key));
    return false;
  }
  if (stored.otp === cleanOtp) {
    await db.delete(otpCodes).where(eq(otpCodes.key, key));
    console.log(`[OTP] SUCCESS - verified for "${key}"`);
    return true;
  }
  console.log(`[OTP] FAIL - OTP mismatch for "${key}": expected "${stored.otp}", got "${cleanOtp}"`);
  return false;
}

async function cleanExpiredOTPs(): Promise<void> {
  try {
    await db.delete(otpCodes).where(lte(otpCodes.expiresAt, new Date()));
  } catch (e) {}
}

// Password hashing helpers (transition-friendly)
const BCRYPT_ROUNDS = 10;

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  // If stored looks like bcrypt hash, use bcrypt; else fallback to plain compare (for old records)
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    try {
      return await bcrypt.compare(plain, stored);
    } catch {
      return false;
    }
  }
  return plain === stored;
}

// Simple in-memory rate limiter for admin auth endpoints
type RateKey = string;
interface RateEntry {
  count: number;
  first: number;
}

const loginRateStore: Record<RateKey, RateEntry> = {};
const LOGIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOGIN_MAX_ATTEMPTS = 10;

function isRateLimited(key: RateKey): boolean {
  const now = Date.now();
  const entry = loginRateStore[key];
  if (!entry) {
    loginRateStore[key] = { count: 1, first: now };
    return false;
  }
  if (now - entry.first > LOGIN_WINDOW_MS) {
    // window reset
    loginRateStore[key] = { count: 1, first: now };
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

// Simple TOTP implementation (no external library)
import crypto from "crypto";

const TOTP_DIGITS = 6;
const TOTP_STEP = 30; // seconds
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateBase32Secret(length = 20): string {
  const buffer = crypto.randomBytes(length);
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let secret = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    const index = parseInt(chunk, 2);
    secret += BASE32_ALPHABET[index];
  }
  return secret;
}

function base32ToBuffer(secret: string): Buffer {
  let bits = "";
  for (const char of secret.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 7 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secret: string, timeStep: number): string {
  const key = base32ToBuffer(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(timeStep));
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
  return otp;
}

function verifyTotpToken(token: string, secret: string): boolean {
  const t = Math.floor(Date.now() / 1000 / TOTP_STEP);
  const clean = token.replace(/\D/g, "").trim();
  if (!clean) return false;
  for (let drift = -1; drift <= 1; drift++) {
    const expected = generateTotp(secret, t + drift);
    if (expected === clean) return true;
  }
  return false;
}

function buildOtpAuthUrl(secret: string, label: string, issuer: string): string {
  const encLabel = encodeURIComponent(label);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encIssuer}:${encLabel}?secret=${secret}&issuer=${encIssuer}&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
}

// Google Cloud Vision OCR using Service Account
let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient(): ImageAnnotatorClient {
  if (visionClient) return visionClient;

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
  }

  const credentials = JSON.parse(serviceAccountKey);
  visionClient = new ImageAnnotatorClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    projectId: credentials.project_id,
  });
  return visionClient;
}

async function ocrWithVisionAPI(base64Image: string, docType: string): Promise<Record<string, string>> {
  const client = getVisionClient();
  const imageContent = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

  const [result] = await client.documentTextDetection({
    image: { content: imageContent },
  });

  const fullTextAnnotation = result.fullTextAnnotation;
  const textAnnotations = result.textAnnotations;

  let fullText = "";
  if (fullTextAnnotation && fullTextAnnotation.text) {
    fullText = fullTextAnnotation.text;
  } else if (textAnnotations && textAnnotations.length > 0) {
    fullText = textAnnotations[0].description || "";
  }

  if (!fullText.trim()) {
    console.log("[OCR] No text detected in image");
    return {};
  }

  console.log(`[OCR] Full extracted text (${docType}):\n---\n${fullText}\n---`);

  return parseOcrText(fullText, docType);
}

function parseOcrText(text: string, docType: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  if (docType === "aadhaarFront") {
    const aadhaarMatch = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
    if (aadhaarMatch) {
      const digits = aadhaarMatch[1].replace(/\s/g, "");
      if (digits.length === 12) {
        result.aadhaarNumber = digits;
      }
    }

    const dobPatterns = [
      /(?:DOB|D\.O\.B|Date\s*of\s*Birth|Birth|जन्म\s*तिथि)\s*[:\-]?\s*(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/i,
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/,
    ];
    for (const p of dobPatterns) {
      const m = text.match(p);
      if (m) {
        result.dob = `${m[1]}/${m[2]}/${m[3]}`;
        break;
      }
    }
    const yobMatch = text.match(/(?:Year\s*of\s*Birth|YOB|जन्म\s*वर्ष)\s*[:\-]?\s*(\d{4})/i);
    if (!result.dob && yobMatch) {
      result.dob = yobMatch[1];
    }

    if (/\b(MALE|Male|पुरुष)\b/.test(text)) {
      result.gender = "Male";
    } else if (/\b(FEMALE|Female|महिला|स्त्री)\b/.test(text)) {
      result.gender = "Female";
    } else if (/\b(TRANSGENDER|Transgender)\b/i.test(text)) {
      result.gender = "Transgender";
    }

    const headerWords = [
      "government", "india", "aadhaar", "unique", "identification", "authority",
      "uidai", "help", "enrol", "enrollment", "vid", "download", "maadhaar",
      "भारत", "सरकार", "आधार", "पहचान", "प्राधिकरण", "सत्यापन"
    ];
    const dobGenderWords = [
      "dob", "date", "birth", "year", "male", "female", "transgender",
      "जन्म", "तिथि", "वर्ष", "पुरुष", "महिला"
    ];

    let dobLineIdx = -1;
    let aadhaarLineIdx = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (dobLineIdx === -1 && (
        /\b(dob|d\.o\.b|date\s*of\s*birth|birth|जन्म)\b/i.test(lines[i]) ||
        /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/.test(lines[i]) ||
        /year\s*of\s*birth/i.test(lines[i])
      )) {
        dobLineIdx = i;
      }
      if (/\d{4}\s?\d{4}\s?\d{4}/.test(lines[i])) {
        aadhaarLineIdx = i;
      }
    }

    const candidateNames: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (i >= aadhaarLineIdx) break;
      const line = lines[i];
      const lower = line.toLowerCase();
      if (headerWords.some(w => lower.includes(w))) continue;
      if (dobGenderWords.some(w => lower.includes(w))) continue;
      if (/\d{4}/.test(line)) continue;
      if (/\d{4}\s?\d{4}\s?\d{4}/.test(line)) continue;

      const englishOnly = line.replace(/[^a-zA-Z\s.]/g, "").trim();
      if (englishOnly.length >= 3) {
        const words = englishOnly.split(/\s+/).filter(w => w.length >= 2);
        if (words.length >= 1 && words.length <= 6) {
          const isAllCapsOrProperCase = words.every(w => /^[A-Z]/.test(w));
          if (isAllCapsOrProperCase) {
            candidateNames.push(
              words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
            );
          }
        }
      }
    }

    if (candidateNames.length > 0) {
      result.name = candidateNames[candidateNames.length - 1];
    }

  } else if (docType === "aadhaarBack") {
    const addressLines: string[] = [];
    let capturing = false;
    let pinCodeFound = false;

    const addressStartPatterns = [
      /^address\s*[:\-]/i,
      /^पता\s*[:\-]/i,
      /\baddress\b/i,
      /\bपता\b/,
    ];
    const relationPatterns = [
      /\b[SDWC]\/[Oo]\b/,
      /\bS\/O\b/i, /\bD\/O\b/i, /\bW\/O\b/i, /\bC\/O\b/i,
      /\bSON\s+OF\b/i, /\bDAUGHTER\s+OF\b/i, /\bWIFE\s+OF\b/i, /\bCARE\s+OF\b/i,
    ];
    const addressKeywords = [
      "house", "village", "vill", "vpo", "dist", "distt", "district",
      "pin", "nagar", "colony", "street", "road", "sector", "ward",
      "block", "tehsil", "teh", "post", "p.o", "state", "punjab",
      "haryana", "patiala", "mohalla", "gali", "near",
      "गांव", "जिला", "पिन", "मकान", "गली", "मोहल्ला", "पंजाब"
    ];
    const stopPatterns = [
      /^\d{4}\s?\d{4}\s?\d{4}$/,
      /\baadhaar\b/i,
      /\bwww\./i,
      /\buidai\b/i,
      /\bmy\s*aadhaar/i,
      /\benrol/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      if (stopPatterns.some(p => p.test(line))) {
        if (capturing) break;
        continue;
      }

      if (!capturing) {
        if (addressStartPatterns.some(p => p.test(line))) {
          capturing = true;
          const cleaned = line.replace(/^(?:address|पता)\s*[:\-]?\s*/i, "").trim();
          if (cleaned.length > 2) addressLines.push(cleaned);
          continue;
        }
        if (relationPatterns.some(p => p.test(line))) {
          capturing = true;
          addressLines.push(line.trim());
          continue;
        }
        if (addressKeywords.some(kw => lower.includes(kw))) {
          capturing = true;
          addressLines.push(line.trim());
          continue;
        }
      } else {
        if (line.length > 1) {
          addressLines.push(line.trim());
        }
        if (/\b\d{6}\b/.test(line)) {
          pinCodeFound = true;
          break;
        }
        if (addressLines.length >= 10) break;
      }
    }

    if (addressLines.length === 0) {
      let startIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/[SDWC]\/[Oo]/i.test(lines[i]) || /\b(house|village|vpo|dist|nagar|colony|street|road|sector|block|teh|gali|mohalla|near|post)\b/i.test(lines[i])) {
          startIdx = i;
          break;
        }
      }
      if (startIdx >= 0) {
        for (let i = startIdx; i < Math.min(startIdx + 10, lines.length); i++) {
          if (stopPatterns.some(p => p.test(lines[i]))) break;
          if (lines[i].length > 1) addressLines.push(lines[i].trim());
          if (/\b\d{6}\b/.test(lines[i])) break;
        }
      }
    }

    if (addressLines.length > 0) {
      result.address = addressLines.join(", ");
    }

    console.log(`[OCR] Aadhaar back parsed - address: ${result.address}`);
  } else if (docType === "voterId") {
    const voterIdPatterns = [
      /(?:EPIC|No|Number|ID)\s*[:\-]?\s*([A-Z]{2,3}\d{6,8}[A-Z]?)/i,
      /\b([A-Z]{2,3}\d{6,8}[A-Z]?)\b/,
    ];
    for (const p of voterIdPatterns) {
      const m = text.match(p);
      if (m) {
        result.voterId = m[1].toUpperCase();
        break;
      }
    }

    const namePatterns = [
      /(?:Elector['']?s?\s*Name|Elector\s*Name)\s*[:\-]?\s*(.+)/i,
      /(?:Name\s*of\s*Elector)\s*[:\-]?\s*(.+)/i,
      /(?:^Name|^नाम)\s*[:\-]?\s*(.+)/im,
    ];

    for (const p of namePatterns) {
      const m = text.match(p);
      if (m) {
        const rawName = m[1].trim();
        const cleaned = rawName.replace(/[^a-zA-Z\s.]/g, "").trim();
        if (cleaned.length >= 2) {
          result.name = cleaned.split(/\s+/)
            .filter(w => w.length >= 1)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
          break;
        }
      }
    }

    if (!result.name) {
      const skipWords = ["election", "commission", "india", "voter", "identity", "card",
        "photo", "epic", "electoral", "elector", "polling", "section", "part",
        "father", "husband", "mother", "relation", "age", "sex", "date",
        "निर्वाचन", "आयोग", "भारत", "मतदाता"];

      for (const line of lines) {
        const cleaned = line.replace(/[^a-zA-Z\s.]/g, "").trim();
        if (cleaned.length < 3 || cleaned.length > 50) continue;
        const lower = cleaned.toLowerCase();
        if (skipWords.some(w => lower.includes(w))) continue;
        if (/\d{4}/.test(line)) continue;
        const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
        if (words.length >= 2 && words.length <= 5 && /^[A-Z]/.test(cleaned)) {
          result.name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
          break;
        }
      }
    }

    console.log(`[OCR] Voter ID parsed - name: ${result.name}, voterId: ${result.voterId}`);
  }

  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // OCR endpoint using Google Cloud Vision API
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image, docType } = req.body;
      if (!image || !docType) {
        return res.status(400).json({ error: "Missing image or docType" });
      }
      if (!["aadhaarFront", "aadhaarBack", "voterId"].includes(docType)) {
        return res.status(400).json({ error: "Invalid docType" });
      }
      const result = await ocrWithVisionAPI(image, docType);
      res.json(result);
    } catch (error: any) {
      console.error("[OCR] Error:", error.message);
      res.status(500).json({ error: error.message || "OCR processing failed" });
    }
  });

  // Login Page Config (public - for login/welcome screen)
  app.get("/api/login-page-config", async (req, res) => {
    try {
      const config = await storage.getLoginPageConfig();
      res.json(config || {
        imageUrl: null,
        ministerName: "Dr. Balbir Singh",
        ministerTitle: "Health Minister, Punjab Government",
        slogan: "Sewa, Sunwai, Samman, Sangathan, Suraksha, Sangharsh",
      });
    } catch (error) {
      console.error("Login page config error:", error);
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  // Villages
  app.get("/api/villages", async (req, res) => {
    try {
      const villages = await storage.getVillages();
      const showAll = req.query.all === "true";
      res.json(showAll ? villages : villages.filter(v => v.isActive));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch villages" });
    }
  });

  app.post("/api/villages", async (req, res) => {
    try {
      const data = insertVillageSchema.parse(req.body);
      const village = await storage.createVillage(data);
      res.json(village);
    } catch (error) {
      res.status(400).json({ error: "Invalid village data" });
    }
  });

  app.patch("/api/villages/:id", async (req, res) => {
    try {
      const village = await storage.updateVillage(req.params.id, req.body);
      if (!village) {
        return res.status(404).json({ error: "Village not found" });
      }
      res.json(village);
    } catch (error) {
      res.status(400).json({ error: "Failed to update village" });
    }
  });

  // Issues
  app.get("/api/issues", async (req, res) => {
    try {
      const issues = await storage.getIssues();
      res.json(issues);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch issues" });
    }
  });

  app.post("/api/issues", async (req, res) => {
    try {
      const data = insertIssueSchema.parse(req.body);
      const issue = await storage.createIssue(data);
      res.json(issue);
    } catch (error) {
      res.status(400).json({ error: "Invalid issue data" });
    }
  });

  app.patch("/api/issues/:id", async (req, res) => {
    try {
      const issue = await storage.updateIssue(req.params.id, req.body);
      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }
      res.json(issue);
    } catch (error) {
      res.status(400).json({ error: "Failed to update issue" });
    }
  });

  // Wings
  app.get("/api/wings", async (req, res) => {
    try {
      const wings = await storage.getWings();
      res.json(wings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wings" });
    }
  });

  app.post("/api/wings", async (req, res) => {
    try {
      const data = insertWingSchema.parse(req.body);
      const wing = await storage.createWing(data);
      res.json(wing);
    } catch (error) {
      res.status(400).json({ error: "Invalid wing data" });
    }
  });

  app.patch("/api/wings/:id", async (req, res) => {
    try {
      const wing = await storage.updateWing(req.params.id, req.body);
      if (!wing) {
        return res.status(404).json({ error: "Wing not found" });
      }
      res.json(wing);
    } catch (error) {
      res.status(400).json({ error: "Failed to update wing" });
    }
  });

  // Gov Wings (Punjab Gov Wing)
  app.get("/api/gov-wings", async (req, res) => {
    try {
      const gw = await storage.getGovWings();
      res.json(gw);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gov wings" });
    }
  });

  app.post("/api/gov-wings", async (req, res) => {
    try {
      const data = insertGovWingSchema.parse(req.body);
      const gw = await storage.createGovWing(data);
      res.json(gw);
    } catch (error) {
      res.status(400).json({ error: "Invalid gov wing data" });
    }
  });

  app.patch("/api/gov-wings/:id", async (req, res) => {
    try {
      const gw = await storage.updateGovWing(req.params.id, req.body);
      if (!gw) {
        return res.status(404).json({ error: "Gov wing not found" });
      }
      res.json(gw);
    } catch (error) {
      res.status(400).json({ error: "Failed to update gov wing" });
    }
  });

  app.delete("/api/gov-wings/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGovWing(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Gov wing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete gov wing" });
    }
  });

  // Gov Positions
  app.get("/api/gov-positions", async (req, res) => {
    try {
      const gp = await storage.getGovPositions();
      res.json(gp);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gov positions" });
    }
  });

  app.post("/api/gov-positions", async (req, res) => {
    try {
      const data = insertGovPositionSchema.parse(req.body);
      const gp = await storage.createGovPosition(data);
      res.json(gp);
    } catch (error) {
      res.status(400).json({ error: "Invalid gov position data" });
    }
  });

  app.patch("/api/gov-positions/:id", async (req, res) => {
    try {
      const gp = await storage.updateGovPosition(req.params.id, req.body);
      if (!gp) {
        return res.status(404).json({ error: "Gov position not found" });
      }
      res.json(gp);
    } catch (error) {
      res.status(400).json({ error: "Failed to update gov position" });
    }
  });

  app.delete("/api/gov-positions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGovPosition(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Gov position not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete gov position" });
    }
  });

  // Positions
  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  app.post("/api/positions", async (req, res) => {
    try {
      const data = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(data);
      res.json(position);
    } catch (error) {
      res.status(400).json({ error: "Invalid position data" });
    }
  });

  app.patch("/api/positions/:id", async (req, res) => {
    try {
      const position = await storage.updatePosition(req.params.id, req.body);
      if (!position) {
        return res.status(404).json({ error: "Position not found" });
      }
      res.json(position);
    } catch (error) {
      res.status(400).json({ error: "Failed to update position" });
    }
  });

  // Departments
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      res.json(department);
    } catch (error) {
      res.status(400).json({ error: "Invalid department data" });
    }
  });

  app.patch("/api/departments/:id", async (req, res) => {
    try {
      const department = await storage.updateDepartment(req.params.id, req.body);
      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      res.status(400).json({ error: "Failed to update department" });
    }
  });

  // Leadership Flags
  app.get("/api/leadership-flags", async (req, res) => {
    try {
      const flags = await storage.getLeadershipFlags();
      res.json(flags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leadership flags" });
    }
  });

  app.post("/api/leadership-flags", async (req, res) => {
    try {
      const data = insertLeadershipFlagSchema.parse(req.body);
      const flag = await storage.createLeadershipFlag(data);
      res.json(flag);
    } catch (error) {
      res.status(400).json({ error: "Invalid leadership flag data" });
    }
  });

  app.patch("/api/leadership-flags/:id", async (req, res) => {
    try {
      const flag = await storage.updateLeadershipFlag(req.params.id, req.body);
      if (!flag) {
        return res.status(404).json({ error: "Leadership flag not found" });
      }
      res.json(flag);
    } catch (error) {
      res.status(400).json({ error: "Failed to update leadership flag" });
    }
  });

  // Admin Roles
  app.get("/api/admin-roles", async (req, res) => {
    try {
      const roles = await storage.getAdminRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin roles" });
    }
  });

  app.post("/api/admin-roles", async (req, res) => {
    try {
      const data = insertAdminRoleSchema.parse(req.body);
      const role = await storage.createAdminRole(data);
      res.json(role);
    } catch (error) {
      res.status(400).json({ error: "Invalid admin role data" });
    }
  });

  app.patch("/api/admin-roles/:id", async (req, res) => {
    try {
      const role = await storage.updateAdminRole(req.params.id, req.body);
      if (!role) {
        return res.status(404).json({ error: "Admin role not found" });
      }
      res.json(role);
    } catch (error) {
      res.status(400).json({ error: "Failed to update admin role" });
    }
  });

  app.delete("/api/admin-roles/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAdminRole(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Admin role not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete admin role" });
    }
  });

  // Admin Users CRUD
  app.get("/api/admin-users", async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  app.post("/api/admin-users", async (req, res) => {
    try {
      const { username, password, roleId } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }
      const hashed = await hashPassword(password);
      const user = await storage.createUser({ username, password: hashed, role: "admin", roleId: roleId || null });
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Failed to create admin user" });
    }
  });

  app.patch("/api/admin-users/:id", async (req, res) => {
    try {
      const { roleId, password } = req.body;
      const updateData: any = {};
      if (roleId !== undefined) updateData.roleId = roleId || null;
      if (password) updateData.password = await hashPassword(password);
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Failed to update admin user" });
    }
  });

  app.delete("/api/admin-users/:id", async (req, res) => {
    try {
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete admin user" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const rateKey = `admin-login:${username}`;
      if (isRateLimited(rateKey)) {
        return res.status(429).json({ error: "Too many login attempts. Please wait and try again." });
      }

      // Try main admin users table first
      const user = await storage.getUserByUsername(username);
      if (user && await verifyPassword(password, user.password)) {
        // If 2FA already enabled, go to verify step
        if (user.twoFaEnabled) {
          return res.json({ mode: "verify", userType: "user", userId: user.id });
        }
        // First-time login: generate secret and ask to set up 2FA
        const secret = generateBase32Secret();
        const otpauthUrl = buildOtpAuthUrl(secret, username, "PatialaRural-Admin");
        await storage.updateUser(user.id, { twoFaSecret: secret });
        return res.json({
          mode: "setup",
          userType: "user",
          userId: user.id,
          secret,
          otpauthUrl,
        });
      }

      // Then check office managers (admin-style login with area restrictions)
      const manager = await storage.getOfficeManagerByUserId(username);
      if (manager && await verifyPassword(password, manager.password)) {
        if (manager.isActive === false) {
          return res.status(403).json({ error: "Account is inactive. Contact admin." });
        }
        if (manager.twoFaEnabled) {
          return res.json({ mode: "verify", userType: "manager", userId: manager.id });
        }
        const secret = generateBase32Secret();
        const otpauthUrl = buildOtpAuthUrl(username, "PatialaRural-Admin", secret);
        await storage.updateOfficeManager(manager.id, { twoFaSecret: secret });
        return res.json({
          mode: "setup",
          userType: "manager",
          userId: manager.id,
          secret,
          otpauthUrl,
        });
      }

      return res.status(401).json({ error: "Invalid username or password" });
    } catch (error) {
      console.error("[Admin login] error", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Verify 2FA code (both first-time setup and normal login)
  app.post("/api/admin/2fa/verify", async (req, res) => {
    try {
      const { userId, userType, token } = req.body as { userId?: string; userType?: "user" | "manager"; token?: string };
      if (!userId || !userType || !token) {
        return res.status(400).json({ error: "Missing 2FA data" });
      }

      const rateKey = `admin-2fa:${userId}`;
      if (isRateLimited(rateKey)) {
        return res.status(429).json({ error: "Too many 2FA attempts. Please wait and try again." });
      }

      if (userType === "user") {
        const user = await storage.getUser(userId);
        if (!user || !user.twoFaSecret) {
          return res.status(400).json({ error: "2FA not initialized for this user" });
        }
        const isValid = verifyTotpToken(token, user.twoFaSecret);
        if (!isValid) {
          return res.status(401).json({ error: "Invalid 2FA code" });
        }
        // Mark 2FA as enabled (idempotent) and return full login payload
        if (!user.twoFaEnabled) {
          await storage.updateUser(user.id, { twoFaEnabled: true });
        }
        let permissions: string[] = [];
        if (user.roleId) {
          const role = await storage.getAdminRole(user.roleId);
          if (role) {
            permissions = role.permissions;
          }
        }
        return res.json({ user, permissions, assignedVillages: [] });
      }

      if (userType === "manager") {
        const manager = await storage.getOfficeManager(userId);
        if (!manager || !manager.twoFaSecret) {
          return res.status(400).json({ error: "2FA not initialized for this user" });
        }
        const isValid = verifyTotpToken(token, manager.twoFaSecret);
        if (!isValid) {
          return res.status(401).json({ error: "Invalid 2FA code" });
        }
        if (!manager.twoFaEnabled) {
          await storage.updateOfficeManager(manager.id, { twoFaEnabled: true });
        }
        let permissions: string[] = [];
        if (manager.roleId) {
          const role = await storage.getAdminRole(manager.roleId);
          if (role) {
            permissions = role.permissions;
          }
        }
        const adminUser = {
          id: manager.id,
          username: manager.userId,
          password: manager.password,
          role: "admin",
          roleId: manager.roleId || null,
        };
        return res.json({ user: adminUser, permissions, assignedVillages: manager.assignedVillages || [] });
      }

      return res.status(400).json({ error: "Unsupported user type" });
    } catch (error) {
      console.error("[Admin 2FA verify] error", error);
      res.status(500).json({ error: "2FA verification failed" });
    }
  });

  // Super admin: reset 2FA for a target admin account
  app.post("/api/admin/2fa/reset", async (req, res) => {
    try {
      const { superUsername, superPassword, targetType, targetId } = req.body as {
        superUsername?: string;
        superPassword?: string;
        targetType?: "user" | "manager";
        targetId?: string;
      };

      if (!superUsername || !superPassword || !targetType || !targetId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Only allow specific hard-coded super admin username for now
      if (superUsername !== "9625692122") {
        return res.status(403).json({ error: "Not authorized to reset 2FA" });
      }

      const superUser = await storage.getUserByUsername(superUsername);
      if (!superUser || !(await verifyPassword(superPassword, superUser.password))) {
        return res.status(401).json({ error: "Invalid super admin credentials" });
      }

      if (targetType === "user") {
        const updated = await storage.updateUser(targetId, { twoFaEnabled: false, twoFaSecret: null });
        if (!updated) {
          return res.status(404).json({ error: "Target user not found" });
        }
      } else if (targetType === "manager") {
        const updated = await storage.updateOfficeManager(targetId, { twoFaEnabled: false, twoFaSecret: null });
        if (!updated) {
          return res.status(404).json({ error: "Target office manager not found" });
        }
      } else {
        return res.status(400).json({ error: "Unsupported target type" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Admin 2FA reset] error", error);
      res.status(500).json({ error: "Failed to reset 2FA" });
    }
  });

  // Get admin user with role (for permission checking)
  app.get("/api/admin-users/:id/permissions", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      let permissions: string[] = [];
      if (user.roleId) {
        const role = await storage.getAdminRole(user.roleId);
        if (role) {
          permissions = role.permissions;
        }
      }
      res.json({ user, permissions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // Office Managers
  app.get("/api/office-managers", async (req, res) => {
    try {
      const managers = await storage.getOfficeManagers();
      res.json(managers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch office managers" });
    }
  });

  app.post("/api/office-managers", async (req, res) => {
    try {
      const { name, userId, password, isActive, roleId, assignedVillages } = req.body || {};
      if (!name || !userId || !password) {
        return res.status(400).json({ error: "Name, userId and password are required" });
      }

      const payload: InsertOfficeManager = {
        name: String(name).trim(),
        userId: String(userId).trim(),
        password: await hashPassword(String(password)),
        isActive: typeof isActive === "boolean" ? isActive : true,
        roleId: roleId ? String(roleId) : null,
        assignedVillages: Array.isArray(assignedVillages)
          ? assignedVillages.map((v: any) => String(v))
          : [],
        twoFaEnabled: false,
        twoFaSecret: null,
      };

      const manager = await storage.createOfficeManager(payload);
      res.json(manager);
    } catch (error) {
      console.error("[office-managers] create error", error);
      res.status(400).json({ error: "Invalid office manager data" });
    }
  });

  app.patch("/api/office-managers/:id", async (req, res) => {
    try {
      const manager = await storage.updateOfficeManager(req.params.id, req.body);
      if (!manager) {
        return res.status(404).json({ error: "Office manager not found" });
      }
      res.json(manager);
    } catch (error) {
      res.status(400).json({ error: "Failed to update office manager" });
    }
  });

  // Delete Office Manager
  app.delete("/api/office-managers/:id", async (req, res) => {
    try {
      await db.delete(officeManagers).where(eq(officeManagers.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete office manager" });
    }
  });

  // Office Manager Authentication
  app.post("/api/office-managers/login", async (req, res) => {
    try {
      const { userId, password } = req.body;
      if (!userId || !password) {
        return res.status(400).json({ error: "User ID and password required" });
      }
      const manager = await storage.getOfficeManagerByUserId(userId);
      if (!manager || manager.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (!manager.isActive) {
        return res.status(403).json({ error: "Account is inactive" });
      }
      res.json({ success: true, manager: { id: manager.id, name: manager.name, userId: manager.userId } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Volunteers
  app.get("/api/volunteers", async (req, res) => {
    try {
      const volunteers = await storage.getVolunteers();
      res.json(volunteers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch volunteers" });
    }
  });

  app.get("/api/volunteers/:id", async (req, res) => {
    try {
      const volunteer = await storage.getVolunteer(req.params.id);
      if (!volunteer) {
        return res.status(404).json({ error: "Volunteer not found" });
      }
      res.json(volunteer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch volunteer" });
    }
  });

  app.post("/api/volunteers", async (req, res) => {
    try {
      const data = insertVolunteerSchema.parse(req.body);
      const volunteer = await storage.createVolunteer(data);
      res.json(volunteer);
    } catch (error) {
      res.status(400).json({ error: "Invalid volunteer data" });
    }
  });

  app.patch("/api/volunteers/:id", async (req, res) => {
    try {
      const volunteer = await storage.updateVolunteer(req.params.id, req.body);
      if (!volunteer) {
        return res.status(404).json({ error: "Volunteer not found" });
      }
      res.json(volunteer);
    } catch (error) {
      res.status(400).json({ error: "Failed to update volunteer" });
    }
  });

  app.patch("/api/volunteers/:id/pin", async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin || pin.length !== 4) {
        return res.status(400).json({ error: "PIN must be 4 digits" });
      }
      const volunteer = await storage.updateVolunteer(req.params.id, { pin });
      if (!volunteer) {
        return res.status(404).json({ error: "Volunteer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update PIN" });
    }
  });

  app.post("/api/volunteers/login", async (req, res) => {
    try {
      const { mobileNumber, pin } = req.body;
      const volunteer = await storage.getVolunteerByMobile(mobileNumber);
      if (!volunteer) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (volunteer.pin !== pin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({ id: volunteer.id, name: volunteer.name });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Family Members
  app.get("/api/volunteers/:id/family", async (req, res) => {
    try {
      const members = await storage.getFamilyMembers(req.params.id);
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch family members" });
    }
  });

  app.post("/api/family-members", async (req, res) => {
    try {
      const data = insertFamilyMemberSchema.parse(req.body);
      const member = await storage.createFamilyMember(data);
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: "Invalid family member data" });
    }
  });

  app.patch("/api/family-members/:id", async (req, res) => {
    try {
      const member = await storage.updateFamilyMember(req.params.id, req.body);
      if (!member) {
        return res.status(404).json({ error: "Family member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: "Failed to update family member" });
    }
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    try {
      await storage.deleteFamilyMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete family member" });
    }
  });

  // Visitors
  app.get("/api/visitors", async (req, res) => {
    try {
      const visitors = await storage.getVisitors();
      res.json(visitors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visitors" });
    }
  });

  app.get("/api/visitors/by-mobile/:mobile", async (req, res) => {
    try {
      const visitors = await storage.getVisitorsByMobile(req.params.mobile);
      res.json(visitors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visitor history" });
    }
  });

  app.post("/api/visitors", async (req, res) => {
    try {
      const data = insertVisitorSchema.parse(req.body);
      const visitor = await storage.createVisitor(data);
      res.json(visitor);
    } catch (error) {
      res.status(400).json({ error: "Invalid visitor data" });
    }
  });

  app.patch("/api/visitors/:id", async (req, res) => {
    try {
      const visitor = await storage.updateVisitor(req.params.id, req.body);
      if (!visitor) {
        return res.status(404).json({ error: "Visitor not found" });
      }
      res.json(visitor);
    } catch (error) {
      res.status(400).json({ error: "Failed to update visitor" });
    }
  });

  // Volunteer Visits
  app.get("/api/volunteer-visits/:volunteerId", async (req, res) => {
    try {
      const visits = await storage.getVolunteerVisits(req.params.volunteerId);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  app.post("/api/volunteer-visits", async (req, res) => {
    try {
      const data = insertVolunteerVisitSchema.parse(req.body);
      const visit = await storage.createVolunteerVisit(data);
      res.json(visit);
    } catch (error) {
      res.status(400).json({ error: "Invalid visit data" });
    }
  });

  // ===== VOLUNTEER PORTAL APIs =====

  // Google Client ID for frontend
  app.get("/api/auth/google-client-id", (_req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google auth not configured" });
    }
    res.json({ clientId });
  });

  // Google Sign-In: verify ID token from Google Identity Services
  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: "Missing Google credential" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: "Invalid Google token" });
      }

      const email = normalizeEmail(payload.email);
      const name = payload.name || "";

      const user = await storage.getAppUserByEmail(email);
      if (user) {
        if (user.isActive === false) {
          return res.status(403).json({ error: "Your account has been blocked. Please contact admin." });
        }
        return res.json({ exists: true, user });
      } else {
        return res.json({ exists: false, email, name });
      }
    } catch (error: any) {
      console.error("Google auth error:", error?.message || error);
      const msg = error?.message?.includes("Token used too late")
        ? "Session expired. Please try again."
        : "Google authentication failed. Please try again.";
      res.status(500).json({ error: msg });
    }
  });

  // Send OTP via Email or SMS
  app.post("/api/app/send-otp", async (req, res) => {
    try {
      const { email, mobile, context } = req.body;
      const isMobile = mobile && isIndianMobile(mobile);
      const isEmail = email && email.includes("@");

      if (!isMobile && !isEmail) {
        return res.status(400).json({ error: "Valid email address or 10-digit mobile number required" });
      }

      if (isMobile) {
        const normalizedMobile = normalizeMobile(mobile);

        if (context === "register") {
          const existingUser = await storage.getAppUserByMobile(normalizedMobile);
          if (existingUser) {
            return res.status(409).json({ error: "already_registered", message: "This mobile number is already registered. Please login instead." });
          }
        }

        const otp = await storeOTP(normalizedMobile);

        if (isSmsConfigured()) {
          try {
            await sendOtpSms(normalizedMobile, otp);
            console.log(`[OTP] Sent OTP via SMS to ${normalizedMobile}`);
            res.json({ success: true, message: "OTP sent via SMS", smsSent: true, channel: "sms", maskedMobile: maskMobile(normalizedMobile) });
          } catch (smsErr) {
            console.error("[OTP] SMS send failed:", smsErr);
            res.status(500).json({ error: "Failed to send OTP via SMS. Please try again later." });
          }
        } else {
          console.log(`[OTP] FAST2SMS not configured - cannot send SMS OTP`);
          res.status(500).json({ error: "SMS service is not configured. Please contact support." });
        }
      } else {
        const normalizedEmail = normalizeEmail(email);

        if (context === "register") {
          const existingUser = await storage.getAppUserByEmail(normalizedEmail);
          if (existingUser) {
            return res.status(409).json({ error: "already_registered", message: "This email is already registered. Please login instead." });
          }
        }

        const otp = await storeOTP(normalizedEmail);

        if (isEmailConfigured()) {
          try {
            await sendOtpEmail(normalizedEmail, otp);
            console.log(`[OTP] Sent OTP to email ${normalizedEmail}`);
            res.json({ success: true, message: "OTP sent to email", emailSent: true, channel: "email", maskedEmail: maskEmail(normalizedEmail) });
          } catch (emailErr) {
            console.error("[OTP] Email send failed:", emailErr);
            res.status(500).json({ error: "Failed to send OTP email. Please try again later." });
          }
        } else {
          console.log(`[OTP] SMTP not configured - cannot send OTP`);
          res.status(500).json({ error: "Email service is not configured. Please contact support." });
        }
      }
    } catch (error) {
      console.error("[OTP] Send error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP and Login/Check Registration (supports email or mobile)
  app.post("/api/app/verify-otp", async (req, res) => {
    try {
      const { email, mobile, otp } = req.body;
      const isMobile = mobile && isIndianMobile(mobile);

      if (isMobile) {
        const normalizedMobile = normalizeMobile(mobile);
        if (!await verifyOTP(normalizedMobile, otp)) {
          return res.status(401).json({ error: "Invalid or expired OTP" });
        }
        const user = await storage.getAppUserByMobile(normalizedMobile);
        if (user) {
          if (user.isActive === false) {
            return res.status(403).json({ error: "Your account has been blocked. Please contact admin." });
          }
          res.json({ exists: true, user });
        } else {
          res.json({ exists: false, mobile: normalizedMobile });
        }
      } else {
        const normalizedEmail = normalizeEmail(email || "");
        if (!await verifyOTP(normalizedEmail, otp)) {
          return res.status(401).json({ error: "Invalid or expired OTP" });
        }
        const user = await storage.getAppUserByEmail(normalizedEmail);
        if (user) {
          if (user.isActive === false) {
            return res.status(403).json({ error: "Your account has been blocked. Please contact admin." });
          }
          res.json({ exists: true, user });
        } else {
          res.json({ exists: false, email: normalizedEmail });
        }
      }
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Register App User
  app.post("/api/app/register", async (req, res) => {
    try {
      const { additionalRoles, ...userData } = req.body;
      const data = insertAppUserSchema.parse(userData);
      if (data.mappedAreaId) {
        const village = await storage.getVillage(data.mappedAreaId);
        if (village) {
          data.mappedAreaName = village.name;
          data.mappedZone = village.zone || null;
          data.mappedDistrict = village.district || null;
          data.mappedHalka = village.halka || null;
          data.mappedBlockNumber = village.blockNumber || null;
        }
      }
      const user = await storage.createAppUser(data);

      if (Array.isArray(additionalRoles) && additionalRoles.length > 0) {
        for (const role of additionalRoles) {
          await storage.createUserAdditionalRole({
            appUserId: user.id,
            wing: role.wing || null,
            position: role.position || null,
            customPosition: role.customPosition || null,
            level: role.level || null,
          });
        }
      }

      const roles = await storage.getUserAdditionalRoles(user.id);
      res.json({ ...user, additionalRoles: roles });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error?.code === '23505') {
        const detail = error?.detail || "";
        if (detail.includes("mobile_number")) {
          return res.status(409).json({ error: "duplicate_mobile", message: "This mobile number is already registered with another account." });
        }
        return res.status(409).json({ error: "already_registered", message: "This email is already registered. Please login instead." });
      }
      res.status(400).json({ error: "registration_failed", message: "Registration failed. Please try again." });
    }
  });

  app.get("/api/app/user/:id/additional-roles", async (req, res) => {
    try {
      const roles = await storage.getUserAdditionalRoles(req.params.id);
      res.json(roles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch additional roles" });
    }
  });

  // Get App User
  app.get("/api/app/user/:id", async (req, res) => {
    try {
      const user = await storage.getAppUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/app/profile/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getAppUser(id);
      if (!existing) {
        return res.status(404).json({ error: "User not found" });
      }
      const allowedFields = [
        "name", "email", "voterId", "aadhaarNumber", "currentPosition", "level",
        "wing", "otherWingName", "selfPhoto", "aadhaarPhoto", "aadhaarPhotoBack",
        "voterCardPhoto", "voterCardPhotoBack",
        "ocrName", "ocrAadhaarNumber", "ocrVoterId", "ocrDob", "ocrGender", "ocrAddress",
        "roleType", "govPositionId", "jurisdictionVillageIds", "govWing",
        "role",
      ];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
          updates[field] = (req.body as Record<string, unknown>)[field];
        }
      }
      if ("name" in updates && (!updates.name || !String(updates.name).trim())) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }
      if ("villageId" in req.body) {
        const vid = req.body.villageId;
        if (vid) {
          const villages = await storage.getVillages();
          const selectedVillage = villages.find(v => String(v.id) === String(vid));
          if (selectedVillage) {
            updates.mappedAreaId = String(selectedVillage.id);
            updates.mappedAreaName = selectedVillage.name;
            updates.mappedZone = selectedVillage.zone || null;
            updates.mappedDistrict = selectedVillage.district || null;
            updates.mappedHalka = selectedVillage.halka || null;
            updates.mappedBlockNumber = selectedVillage.blockNumber || null;
          }
        }
      }
      const updated = await storage.updateAppUser(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ error: "Failed to update profile" });
    }
  });

  // Get hierarchy options (levels and wings)
  app.get("/api/app/hierarchy", async (req, res) => {
    try {
      const villages = await storage.getVillages();
      res.json({ levels: LEVELS, wings: WINGS, villages: villages.filter(v => v.isActive) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hierarchy" });
    }
  });

  // CSCs
  app.get("/api/cscs", async (req, res) => {
    try {
      const cscs = await storage.getCscs();
      res.json(cscs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch CSCs" });
    }
  });

  app.get("/api/cscs/village/:villageId", async (req, res) => {
    try {
      const cscs = await storage.getCscsByVillage(req.params.villageId);
      res.json(cscs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch CSCs" });
    }
  });

  app.post("/api/cscs", async (req, res) => {
    try {
      const data = insertCscSchema.parse(req.body);
      const csc = await storage.createCsc(data);
      res.json(csc);
    } catch (error) {
      res.status(400).json({ error: "Invalid CSC data" });
    }
  });

  app.patch("/api/cscs/:id", async (req, res) => {
    try {
      const csc = await storage.updateCsc(req.params.id, req.body);
      if (!csc) {
        return res.status(404).json({ error: "CSC not found" });
      }
      res.json(csc);
    } catch (error) {
      res.status(400).json({ error: "Failed to update CSC" });
    }
  });

  // CSC Reports
  app.get("/api/csc-reports", async (req, res) => {
    try {
      const reports = await storage.getCscReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch CSC reports" });
    }
  });

  app.get("/api/csc-reports/user/:userId", async (req, res) => {
    try {
      const { villageId } = req.query;
      if (villageId && typeof villageId === "string") {
        const reports = await storage.getCscReportsByUserAndVillage(req.params.userId, villageId);
        return res.json(reports);
      }
      const reports = await storage.getCscReportsByUser(req.params.userId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch CSC reports" });
    }
  });

  app.post("/api/csc-reports", async (req, res) => {
    try {
      const data = insertCscReportSchema.parse(req.body);
      const report = await storage.createCscReport(data);
      res.json(report);
    } catch (error) {
      res.status(400).json({ error: "Invalid CSC report data" });
    }
  });

  // Mapped Volunteers
  app.get("/api/mapped-volunteers", async (req, res) => {
    try {
      const volunteers = await storage.getMappedVolunteers();
      const allUsers = await storage.getAppUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u.name]));
      const enriched = volunteers.map(v => ({
        ...v,
        addedByName: userMap.get(v.addedByUserId) || v.addedByUserId,
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mapped volunteers" });
    }
  });

  app.get("/api/mapped-volunteers/user/:userId", async (req, res) => {
    try {
      const { villageId } = req.query;
      if (villageId && typeof villageId === "string") {
        const volunteers = await storage.getMappedVolunteersByUserAndVillage(req.params.userId, villageId);
        return res.json(volunteers);
      }
      const volunteers = await storage.getMappedVolunteersByUser(req.params.userId);
      res.json(volunteers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mapped volunteers" });
    }
  });

  app.get("/api/mapped-volunteers/check/:mobile", async (req, res) => {
    try {
      const volunteer = await storage.getMappedVolunteerByMobile(req.params.mobile);
      res.json({ exists: !!volunteer, volunteer });
    } catch (error) {
      res.status(500).json({ error: "Failed to check mobile" });
    }
  });

  app.post("/api/mapped-volunteers", async (req, res) => {
    try {
      const data = insertMappedVolunteerSchema.parse(req.body);
      const volunteer = await storage.createMappedVolunteer(data);
      res.json(volunteer);
    } catch (error) {
      res.status(400).json({ error: "Invalid volunteer data" });
    }
  });

  // OTP for volunteer mapping (Active category) - sends via SMS to volunteer's mobile
  app.post("/api/mapped-volunteers/send-otp", async (req, res) => {
    try {
      const { mobile } = req.body;
      if (!mobile || !isIndianMobile(mobile)) {
        return res.status(400).json({ error: "Valid 10-digit mobile number required" });
      }
      const normalizedMobile = normalizeMobile(mobile);
      const otp = await storeOTP(normalizedMobile);

      if (isSmsConfigured()) {
        try {
          await sendOtpSms(normalizedMobile, otp);
          console.log(`[OTP] Sent volunteer mapping OTP via SMS to ${normalizedMobile}`);
          res.json({ success: true, message: "OTP sent via SMS", smsSent: true, maskedMobile: maskMobile(normalizedMobile) });
        } catch (smsErr) {
          console.error("[OTP] Volunteer mapping SMS send failed:", smsErr);
          res.status(500).json({ error: "Failed to send OTP via SMS. Please try again later." });
        }
      } else {
        console.log(`[OTP] SMS not configured - cannot send OTP`);
        res.status(500).json({ error: "SMS service is not configured. Please contact support." });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/mapped-volunteers/verify-otp", async (req, res) => {
    try {
      const { mobile, otp } = req.body;
      const normalizedMobile = normalizeMobile(mobile || "");
      if (!await verifyOTP(normalizedMobile, otp)) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }
      res.json({ success: true, verified: true });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Supporters
  app.get("/api/supporters", async (req, res) => {
    try {
      const supportersList = await storage.getSupporters();
      const allUsers = await storage.getAppUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u.name]));
      const enriched = supportersList.map(s => ({
        ...s,
        addedByName: userMap.get(s.addedByUserId) || s.addedByUserId,
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supporters" });
    }
  });

  app.get("/api/supporters/user/:userId", async (req, res) => {
    try {
      const { villageId } = req.query;
      if (villageId && typeof villageId === "string") {
        const supporters = await storage.getSupportersByUserAndVillage(req.params.userId, villageId);
        return res.json(supporters);
      }
      const supporters = await storage.getSupportersByUser(req.params.userId);
      res.json(supporters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch supporters" });
    }
  });

  app.get("/api/supporters/check/:mobile", async (req, res) => {
    try {
      const supporter = await storage.getSupporterByMobile(req.params.mobile);
      res.json({ exists: !!supporter, supporter });
    } catch (error) {
      res.status(500).json({ error: "Failed to check mobile" });
    }
  });

  app.post("/api/supporters", async (req, res) => {
    try {
      const data = insertSupporterSchema.parse(req.body);
      const supporter = await storage.createSupporter(data);
      res.json(supporter);
    } catch (error) {
      res.status(400).json({ error: "Invalid supporter data" });
    }
  });

  app.delete("/api/mapped-volunteers/:id", async (req, res) => {
    try {
      await storage.deleteMappedVolunteer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete mapped volunteer" });
    }
  });

  app.delete("/api/supporters/:id", async (req, res) => {
    try {
      await storage.deleteSupporter(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supporter" });
    }
  });

  app.post("/api/admin/app-users/batch-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
      await storage.deleteAppUsersBatch(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to batch delete users" });
    }
  });

  app.post("/api/mapped-volunteers/batch-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
      await storage.deleteMappedVolunteersBatch(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to batch delete volunteers" });
    }
  });

  app.post("/api/supporters/batch-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids array required" });
      await storage.deleteSupportersBatch(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to batch delete supporters" });
    }
  });

  // ===== SDUI / ADMIN CONFIGURATION APIs =====

  // Task Configs CRUD
  app.get("/api/task-categories", async (req, res) => {
    try {
      const categories = await storage.getTaskCategoriesAll();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task categories" });
    }
  });

  app.post("/api/task-categories", async (req, res) => {
    try {
      const data = insertTaskCategorySchema.parse(req.body);
      const category = await storage.createTaskCategory(data);
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.patch("/api/task-categories/:id", async (req, res) => {
    try {
      const { taskIds, ...rest } = req.body || {};
      const category = await storage.updateTaskCategory(req.params.id, rest);
      if (!category) return res.status(404).json({ error: "Category not found" });
      if (Array.isArray(taskIds)) await storage.setTaskCategoryTasks(req.params.id, taskIds);
      res.json(category);
    } catch (error) {
      res.status(400).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/task-categories/:id", async (req, res) => {
    try {
      await storage.deleteTaskCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete category" });
    }
  });

  app.get("/api/task-configs", async (req, res) => {
    try {
      const configs = await storage.getTaskConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task configs" });
    }
  });

  app.get("/api/task-configs/stats", async (req, res) => {
    try {
      const totalUsersResult = await db.select({ count: count() }).from(appUsers).where(eq(appUsers.isActive, true));
      const totalUsers = totalUsersResult[0]?.count || 0;

      const submissionStats = await db
        .select({
          taskConfigId: taskSubmissions.taskConfigId,
          submittedUsers: count(sql`DISTINCT ${taskSubmissions.appUserId}`),
          totalSubmissions: count(),
        })
        .from(taskSubmissions)
        .groupBy(taskSubmissions.taskConfigId);

      const statsMap: Record<string, { submittedUsers: number; totalSubmissions: number }> = {};
      for (const s of submissionStats) {
        statsMap[s.taskConfigId] = { submittedUsers: s.submittedUsers, totalSubmissions: s.totalSubmissions };
      }

      res.json({ totalUsers, stats: statsMap });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task stats" });
    }
  });

  app.get("/api/task-configs/:id", async (req, res) => {
    try {
      const config = await storage.getTaskConfig(req.params.id);
      if (!config) return res.status(404).json({ error: "Task config not found" });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task config" });
    }
  });

  app.post("/api/task-configs", async (req, res) => {
    try {
      const data = insertTaskConfigSchema.parse(req.body);
      const config = await storage.createTaskConfig(data);
      if (config.isEnabled) {
        sendPushToAll(
          "New Task Available",
          `A new task "${config.name}" has been added. Open the app to get started.`,
          "/app"
        ).catch(err => console.error("Push notification error:", err));
      }
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: "Invalid task config data" });
    }
  });

  app.patch("/api/task-configs/:id", async (req, res) => {
    try {
      const previousConfig = await storage.getTaskConfig(req.params.id);
      const config = await storage.updateTaskConfig(req.params.id, req.body);
      if (!config) return res.status(404).json({ error: "Task config not found" });
      if (config.isEnabled && previousConfig && !previousConfig.isEnabled) {
        sendPushToAll(
          "Task Enabled",
          `The task "${config.name}" is now available. Open the app to get started.`,
          "/app"
        ).catch(err => console.error("Push notification error:", err));
      }
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: "Failed to update task config" });
    }
  });

  app.delete("/api/task-configs/:id", async (req, res) => {
    try {
      await storage.deleteTaskConfig(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete task config" });
    }
  });

  // Full task config with fields, options, conditions (for mobile app)
  app.get("/api/task-configs/:id/full", async (req, res) => {
    try {
      const config = await storage.getTaskConfig(req.params.id);
      if (!config) return res.status(404).json({ error: "Task config not found" });
      const fields = await storage.getFormFields(req.params.id);
      const fieldsWithOptions = await Promise.all(
        fields.map(async (field) => {
          const options = await storage.getFieldOptions(field.id);
          const conditions = await storage.getFieldConditions(field.id);
          return { ...field, options, conditions };
        })
      );
      res.json({ ...config, fields: fieldsWithOptions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch full task config" });
    }
  });

  // Enabled tasks for mobile app
  app.get("/api/app/task-categories", async (req, res) => {
    try {
      const categories = await storage.getTaskCategories(true);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task categories" });
    }
  });

  app.get("/api/app/tasks", async (req, res) => {
    try {
      const configs = await storage.getTaskConfigs();
      const enabled = configs.filter((c) => c.isEnabled);
      res.json(enabled);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/app/leaderboard", async (req, res) => {
    try {
      const volCounts = await db
        .select({
          userId: mappedVolunteers.addedByUserId,
          count: count().as("count"),
        })
        .from(mappedVolunteers)
        .groupBy(mappedVolunteers.addedByUserId);

      const supCounts = await db
        .select({
          userId: supporters.addedByUserId,
          count: count().as("count"),
        })
        .from(supporters)
        .groupBy(supporters.addedByUserId);

      const hstcCounts = await db
        .select({
          userId: hstcSubmissions.appUserId,
          count: count().as("count"),
        })
        .from(hstcSubmissions)
        .groupBy(hstcSubmissions.appUserId);

      const sdskCounts = await db
        .select({
          userId: sdskSubmissions.appUserId,
          count: count().as("count"),
        })
        .from(sdskSubmissions)
        .groupBy(sdskSubmissions.appUserId);

      const allUsers = await db
        .select({
          id: appUsers.id,
          name: appUsers.name,
          hasPhoto: sql<boolean>`CASE WHEN ${appUsers.selfPhoto} IS NOT NULL AND ${appUsers.selfPhoto} != '' THEN true ELSE false END`.as("has_photo"),
        })
        .from(appUsers);

      const volMap: Record<string, number> = {};
      volCounts.forEach((r) => { volMap[r.userId] = r.count; });
      const supMap: Record<string, number> = {};
      supCounts.forEach((r) => { supMap[r.userId] = r.count; });
      const hstcMap: Record<string, number> = {};
      hstcCounts.forEach((r) => { hstcMap[r.userId] = r.count; });
      const sdskMap: Record<string, number> = {};
      sdskCounts.forEach((r) => { sdskMap[r.userId] = r.count; });

      const buildBoard = (countMap: Record<string, number>) => {
        return allUsers
          .map((u) => ({
            userId: u.id,
            name: u.name || "Unknown",
            hasPhoto: u.hasPhoto,
            count: countMap[u.id] || 0,
          }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      };

      res.json({
        volunteerMapping: buildBoard(volMap),
        supporterMapping: buildBoard(supMap),
        hstc: buildBoard(hstcMap),
        sdsk: buildBoard(sdskMap),
      });
    } catch (error) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/app/user/:id/photo", async (req, res) => {
    try {
      const [user] = await db
        .select({ selfPhoto: appUsers.selfPhoto })
        .from(appUsers)
        .where(eq(appUsers.id, req.params.id))
        .limit(1);
      if (!user?.selfPhoto) return res.status(404).json({ error: "No photo" });
      const matches = user.selfPhoto.match(/^data:(.+?);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=3600");
        return res.send(buffer);
      }
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(Buffer.from(user.selfPhoto, "base64"));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });

  app.get("/api/app/my-submissions/:userId", async (req, res) => {
    try {
      const { villageId, taskConfigId } = req.query;
      if (villageId && typeof villageId === "string") {
        const submissions = await storage.getTaskSubmissionsByUserAndVillage(
          req.params.userId,
          villageId,
          typeof taskConfigId === "string" ? taskConfigId : undefined
        );
        return res.json({ submissions, count: submissions.length });
      }
      const submissions = await storage.getTaskSubmissionsByUser(req.params.userId);
      const counts: Record<string, number> = {};
      for (const s of submissions) {
        counts[s.taskConfigId] = (counts[s.taskConfigId] || 0) + 1;
      }
      res.json(counts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Form Fields CRUD
  app.get("/api/form-fields/task/:taskConfigId", async (req, res) => {
    try {
      const fields = await storage.getFormFields(req.params.taskConfigId);
      res.json(fields);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form fields" });
    }
  });

  app.get("/api/form-fields/type/:formType", async (req, res) => {
    try {
      const fields = await storage.getFormFieldsByType(req.params.formType);
      res.json(fields);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form fields" });
    }
  });

  app.post("/api/form-fields", async (req, res) => {
    try {
      const data = insertFormFieldSchema.parse(req.body);
      const field = await storage.createFormField(data);
      res.json(field);
    } catch (error) {
      res.status(400).json({ error: "Invalid form field data" });
    }
  });

  app.patch("/api/form-fields/:id", async (req, res) => {
    try {
      const field = await storage.updateFormField(req.params.id, req.body);
      if (!field) return res.status(404).json({ error: "Form field not found" });
      res.json(field);
    } catch (error) {
      res.status(400).json({ error: "Failed to update form field" });
    }
  });

  app.delete("/api/form-fields/:id", async (req, res) => {
    try {
      await storage.deleteFormField(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete form field" });
    }
  });

  // Field Options CRUD
  app.get("/api/field-options/:formFieldId", async (req, res) => {
    try {
      const options = await storage.getFieldOptions(req.params.formFieldId);
      res.json(options);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch field options" });
    }
  });

  app.post("/api/field-options", async (req, res) => {
    try {
      const data = insertFieldOptionSchema.parse(req.body);
      const option = await storage.createFieldOption(data);
      res.json(option);
    } catch (error) {
      res.status(400).json({ error: "Invalid field option data" });
    }
  });

  app.patch("/api/field-options/:id", async (req, res) => {
    try {
      const option = await storage.updateFieldOption(req.params.id, req.body);
      if (!option) return res.status(404).json({ error: "Field option not found" });
      res.json(option);
    } catch (error) {
      res.status(400).json({ error: "Failed to update field option" });
    }
  });

  app.delete("/api/field-options/:id", async (req, res) => {
    try {
      await storage.deleteFieldOption(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete field option" });
    }
  });

  // Field Conditions CRUD
  app.get("/api/field-conditions/:formFieldId", async (req, res) => {
    try {
      const conditions = await storage.getFieldConditions(req.params.formFieldId);
      res.json(conditions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch field conditions" });
    }
  });

  app.post("/api/field-conditions", async (req, res) => {
    try {
      const data = insertFieldConditionSchema.parse(req.body);
      const condition = await storage.createFieldCondition(data);
      res.json(condition);
    } catch (error) {
      res.status(400).json({ error: "Invalid field condition data" });
    }
  });

  app.delete("/api/field-conditions/:id", async (req, res) => {
    try {
      await storage.deleteFieldCondition(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete field condition" });
    }
  });

  // Task Submissions
  app.get("/api/task-submissions", async (req, res) => {
    try {
      const taskConfigId = req.query.taskConfigId as string | undefined;
      const submissions = await storage.getTaskSubmissions(taskConfigId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task submissions" });
    }
  });

  app.get("/api/task-submissions/user/:userId", async (req, res) => {
    try {
      const submissions = await storage.getTaskSubmissionsByUser(req.params.userId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task submissions" });
    }
  });

  app.post("/api/task-submissions", async (req, res) => {
    try {
      const data = insertTaskSubmissionSchema.parse(req.body);
      const submission = await storage.createTaskSubmission(data);
      res.json(submission);
    } catch (error) {
      res.status(400).json({ error: "Invalid task submission data" });
    }
  });

  app.post("/api/admin/auto-translate", async (req, res) => {
    try {
      const { target } = req.body;
      if (!target || !["villages", "wings", "positions", "gov_wings"].includes(target)) {
        return res.status(400).json({ error: "Invalid target. Use: villages, wings, positions, gov_wings" });
      }

      let items: { id: string; text: string }[] = [];
      if (target === "villages") {
        const allVillages = await storage.getVillages();
        items = allVillages.map(v => ({ id: v.id, text: v.name }));
      } else if (target === "wings") {
        const allWings = await storage.getWings();
        items = allWings.map(w => ({ id: w.id, text: w.name }));
      } else if (target === "positions") {
        const allPositions = await storage.getPositions();
        items = allPositions.map(p => ({ id: p.id, text: p.name }));
      } else if (target === "gov_wings") {
        const allGovWings = await storage.getGovWings();
        items = allGovWings.map(gw => ({ id: gw.id, text: gw.name }));
      }

      if (items.length === 0) {
        return res.json({ message: "No items to translate", translated: 0 });
      }

      const batchSize = 50;
      let translatedCount = 0;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const hiMap = transliterateBatch(batch, "hi");
        const paMap = transliterateBatch(batch, "pa");

        for (const item of batch) {
          const hiText = hiMap.get(item.id) || null;
          const paText = paMap.get(item.id) || null;
          if (target === "villages") {
            await storage.updateVillage(item.id, { nameHi: hiText, namePa: paText });
          } else if (target === "wings") {
            await storage.updateWing(item.id, { nameHi: hiText, namePa: paText });
          } else if (target === "positions") {
            await storage.updatePosition(item.id, { nameHi: hiText, namePa: paText });
          } else if (target === "gov_wings") {
            await storage.updateGovWing(item.id, { nameHi: hiText, namePa: paText });
          }
          translatedCount++;
        }
      }

      res.json({ message: `Translated ${translatedCount} ${target}`, translated: translatedCount });
    } catch (error) {
      console.error("Auto-translate error:", error);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  // CSV Upload and Import
  app.post("/api/csv-upload/:target", async (req, res) => {
    try {
      const { target } = req.params;
      const { rows, fileName } = req.body;
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ error: "Rows array required" });
      }

      const targetMap: Record<string, any> = {
        villages, issues, wings, positions, departments, gov_positions: govPositions, voter_list: voterList,
      };

      const table = targetMap[target];
      if (!table) {
        return res.status(400).json({ error: `Invalid target table: ${target}` });
      }

      let insertedCount = 0;
      for (const row of rows) {
        try {
          await db.insert(table).values(row);
          insertedCount++;
        } catch (e) {
          // Skip duplicates
        }
      }

      const upload = await storage.createCsvUpload({
        fileName: fileName || `${target}_upload.csv`,
        targetTable: target,
        rowCount: insertedCount,
        status: "completed",
      });

      res.json({ success: true, inserted: insertedCount, total: rows.length, upload });
    } catch (error) {
      res.status(400).json({ error: "CSV import failed" });
    }
  });

  app.get("/api/csv-uploads", async (req, res) => {
    try {
      const uploads = await storage.getCsvUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch CSV uploads" });
    }
  });

  // Voter List endpoints
  app.get("/api/voter-list", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string || "";
      const records = await storage.getVoterListRecords(limit, offset, search);
      const total = await storage.getVoterListCount(search);
      res.json({ records, total, limit, offset });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch voter list" });
    }
  });

  app.get("/api/voter-lookup/:voterId", async (req, res) => {
    try {
      const { voterId } = req.params;
      if (!voterId || voterId.trim().length === 0) {
        return res.status(400).json({ error: "Voter ID required" });
      }
      const record = await storage.getVoterByVcardId(voterId.trim().toUpperCase());
      if (!record) {
        return res.status(404).json({ error: "Voter not found in voter list" });
      }
      res.json(record);
    } catch (error) {
      res.status(500).json({ error: "Failed to lookup voter" });
    }
  });

  app.delete("/api/voter-list", async (req, res) => {
    try {
      await storage.clearVoterList();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear voter list" });
    }
  });

  // Admin - List All App Users
  app.get("/api/admin/app-users", async (req, res) => {
    try {
      const users = await storage.getAppUsers();
      const lightweight = users.map(({ selfPhoto, aadhaarPhoto, aadhaarPhotoBack, voterCardPhoto, voterCardPhotoBack, ...rest }) => ({
        ...rest,
        selfPhoto: selfPhoto ? true : null,
        aadhaarPhoto: aadhaarPhoto ? true : null,
        aadhaarPhotoBack: aadhaarPhotoBack ? true : null,
        voterCardPhoto: voterCardPhoto ? true : null,
        voterCardPhotoBack: voterCardPhotoBack ? true : null,
      }));
      res.json(lightweight);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin - Create App User
  app.post("/api/admin/app-users", async (req, res) => {
    try {
      const { mobileNumber, name, role, wing, currentPosition, level, mappedAreaId } = req.body;
      if (!mobileNumber || !name || !role) {
        return res.status(400).json({ error: "Mobile number, name, and role are required" });
      }
      const existing = await storage.getAppUserByMobile(mobileNumber);
      if (existing) {
        return res.status(409).json({ error: "A user with this mobile number already exists" });
      }
      const userData: any = { mobileNumber, name, role, isActive: true };
      if (wing) userData.wing = wing;
      if (currentPosition) userData.currentPosition = currentPosition;
      if (level) userData.level = level;
      if (mappedAreaId) {
        userData.mappedAreaId = mappedAreaId;
        const village = await storage.getVillage(mappedAreaId);
        if (village) {
          userData.mappedAreaName = village.name;
          userData.mappedZone = village.zone || null;
          userData.mappedDistrict = village.district || null;
          userData.mappedHalka = village.halka || null;
          userData.mappedBlockNumber = village.blockNumber || null;
        }
      }
      const user = await storage.createAppUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Admin - Manage App Users
  app.patch("/api/admin/app-users/:id", async (req, res) => {
    try {
      const updated = await storage.updateAppUser(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.patch("/api/admin/app-users/:id/approve", async (req, res) => {
    try {
      const user = await storage.getAppUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const updated = await storage.updateAppUser(req.params.id, { isApproved: !user.isApproved } as any);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update approval status" });
    }
  });

  app.patch("/api/admin/app-users/:id/block", async (req, res) => {
    try {
      const user = await storage.getAppUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const updated = await storage.updateAppUser(req.params.id, { isActive: !user.isActive } as any);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle user block status" });
    }
  });

  app.delete("/api/admin/app-users/:id", async (req, res) => {
    try {
      const user = await storage.getAppUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.deleteAppUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.delete("/api/admin/app-users/by-mobile/:mobile", async (req, res) => {
    try {
      const user = await storage.getAppUserByMobile(req.params.mobile);
      if (!user) return res.status(404).json({ error: "User not found" });
      await storage.deleteAppUser(user.id);
      res.json({ success: true, deletedUser: { id: user.id, name: user.name, mobile: user.mobileNumber } });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Birthday Management - Get all users with DOB info
  app.get("/api/admin/birthdays", async (req, res) => {
    try {
      const users = await storage.getAppUsers();
      const birthdayList = users
        .filter((u: any) => u.isActive !== false)
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          ocrDob: u.ocrDob || null,
          selfPhoto: u.selfPhoto || null,
          mobileNumber: u.mobileNumber || null,
          role: u.role || null,
        }));
      res.json(birthdayList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch birthday data" });
    }
  });

  // Birthday Management - Update user name/DOB
  app.patch("/api/admin/birthdays/:id", async (req, res) => {
    try {
      const { name, ocrDob } = req.body;
      const updateData: any = {};
      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({ error: "Name is required and must be a non-empty string" });
        }
        updateData.name = name.trim();
      }
      if (ocrDob !== undefined) {
        if (ocrDob && typeof ocrDob === "string" && ocrDob.trim()) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(ocrDob.trim())) {
            return res.status(400).json({ error: "DOB must be in YYYY-MM-DD format" });
          }
          const parsed = new Date(ocrDob.trim());
          if (isNaN(parsed.getTime())) {
            return res.status(400).json({ error: "Invalid date value" });
          }
          updateData.ocrDob = ocrDob.trim();
        } else {
          updateData.ocrDob = null;
        }
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      const updated = await storage.updateAppUser(req.params.id, updateData);
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ id: updated.id, name: updated.name, ocrDob: updated.ocrDob, selfPhoto: updated.selfPhoto ? true : null, mobileNumber: updated.mobileNumber, role: updated.role });
    } catch (error) {
      res.status(500).json({ error: "Failed to update birthday info" });
    }
  });

  // Birthday Management - Send birthday wish SMS
  app.post("/api/admin/birthdays/:id/wish", async (req, res) => {
    try {
      const users = await storage.getAppUsers();
      const user = users.find(u => u.id === req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (!user.mobileNumber) return res.status(400).json({ error: "User has no mobile number" });

      const apiKey = process.env.FAST2SMS_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "SMS service not configured" });

      const cleanNumber = user.mobileNumber.replace(/\D/g, "").replace(/^91/, "");
      if (cleanNumber.length !== 10) return res.status(400).json({ error: "Invalid mobile number" });

      const firstName = user.name.split(" ")[0];
      const message = `Dear ${firstName}, wishing you a very Happy Birthday! May this special day bring you happiness, good health and success. Warm wishes from Patiala Rural team.`;

      const url = "https://www.fast2sms.com/dev/bulkV2";
      const payload = {
        route: "q",
        message: message,
        flash: "0",
        numbers: cleanNumber,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log(`[Birthday SMS] Response for ${cleanNumber}:`, JSON.stringify(data));

      if (data.return) {
        res.json({ success: true, message: "Birthday wish sent successfully!" });
      } else {
        res.status(500).json({ error: data.message || "Failed to send SMS" });
      }
    } catch (error) {
      console.error("[Birthday SMS] Error:", error);
      res.status(500).json({ error: "Failed to send birthday wish" });
    }
  });

  // Data Export - All app users
  app.get("/api/export/app-users", async (req, res) => {
    try {
      const users = await storage.getAppUsers();
      const lightweight = users.map(({ selfPhoto, aadhaarPhoto, aadhaarPhotoBack, voterCardPhoto, voterCardPhotoBack, ...rest }) => ({
        ...rest,
        selfPhoto: selfPhoto ? true : null,
        aadhaarPhoto: aadhaarPhoto ? true : null,
        aadhaarPhotoBack: aadhaarPhotoBack ? true : null,
        voterCardPhoto: voterCardPhoto ? true : null,
        voterCardPhotoBack: voterCardPhotoBack ? true : null,
      }));
      res.json(lightweight);
    } catch (error) {
      res.status(500).json({ error: "Failed to export app users" });
    }
  });

  app.get("/api/export/app-users/:id/documents", async (req, res) => {
    try {
      const user = await storage.getAppUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        name: user.name,
        aadhaarPhoto: user.aadhaarPhoto,
        aadhaarPhotoBack: user.aadhaarPhotoBack,
        voterCardPhoto: user.voterCardPhoto,
        voterCardPhotoBack: user.voterCardPhotoBack,
        selfPhoto: user.selfPhoto,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/export/mapped-volunteers/:id/documents", async (req, res) => {
    try {
      const vol = await storage.getMappedVolunteer(req.params.id);
      if (!vol) return res.status(404).json({ error: "Volunteer not found" });
      res.json({
        name: vol.name,
        aadhaarPhoto: vol.aadhaarPhoto,
        aadhaarPhotoBack: vol.aadhaarPhotoBack,
        voterCardPhoto: vol.voterCardPhoto,
        voterCardPhotoBack: vol.voterCardPhotoBack,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/export/mapped-volunteers/:id/attachment/:field", async (req, res) => {
    try {
      const vol = await storage.getMappedVolunteer(req.params.id);
      if (!vol) return res.status(404).json({ error: "Volunteer not found" });
      const fieldMap: Record<string, string | null> = {
        aadhaarPhoto: vol.aadhaarPhoto,
        aadhaarPhotoBack: vol.aadhaarPhotoBack,
        voterCardPhoto: vol.voterCardPhoto,
        voterCardPhotoBack: vol.voterCardPhotoBack,
      };
      const data = fieldMap[req.params.field];
      if (!data) return res.status(404).json({ error: "Attachment not found" });
      const match = data.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${vol.name}_${req.params.field}.${mimeType.split('/')[1]}"`);
        return res.send(buffer);
      }
      res.redirect(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attachment" });
    }
  });

  app.get("/api/export/supporters/:id/attachment/:field", async (req, res) => {
    try {
      const sup = await storage.getSupporter(req.params.id);
      if (!sup) return res.status(404).json({ error: "Supporter not found" });
      const fieldMap: Record<string, string | null> = {
        aadhaarPhoto: sup.aadhaarPhoto,
        aadhaarPhotoBack: sup.aadhaarPhotoBack,
        voterCardPhoto: sup.voterCardPhoto,
        voterCardPhotoBack: sup.voterCardPhotoBack,
      };
      const data = fieldMap[req.params.field];
      if (!data) return res.status(404).json({ error: "Attachment not found" });
      const match = data.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `inline; filename="${sup.name}_${req.params.field}.${mimeType.split('/')[1]}"`);
        return res.send(buffer);
      }
      res.redirect(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attachment" });
    }
  });

  app.get("/api/export/supporters/:id/documents", async (req, res) => {
    try {
      const sup = await storage.getSupporter(req.params.id);
      if (!sup) return res.status(404).json({ error: "Supporter not found" });
      res.json({
        name: sup.name,
        aadhaarPhoto: sup.aadhaarPhoto,
        aadhaarPhotoBack: sup.aadhaarPhotoBack,
        voterCardPhoto: sup.voterCardPhoto,
        voterCardPhotoBack: sup.voterCardPhotoBack,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // ===== ANALYTICS APIs =====

  app.get("/api/analytics/overview", async (req, res) => {
    try {
      const allSubmissions = await storage.getTaskSubmissions();
      const allUsers = await storage.getAppUsers();
      const allTasks = await storage.getTaskConfigs();
      const allVillages = await storage.getVillages();
      const allVolunteers = await storage.getVolunteers();
      const allVisitors = await storage.getVisitors();

      const uniqueUserIds = new Set(allSubmissions.map(s => s.appUserId));

      const dailyTrend: Record<string, number> = {};
      const taskBreakdown: Record<string, { taskId: string; taskName: string; count: number }> = {};
      const userSubmissionCount: Record<string, { userId: string; userName: string; count: number; lastActive: string | null }> = {};

      for (const task of allTasks) {
        taskBreakdown[task.id] = { taskId: task.id, taskName: task.name, count: 0 };
      }

      for (const sub of allSubmissions) {
        const dateKey = sub.createdAt ? new Date(sub.createdAt).toISOString().split("T")[0] : "unknown";
        dailyTrend[dateKey] = (dailyTrend[dateKey] || 0) + 1;

        if (taskBreakdown[sub.taskConfigId]) {
          taskBreakdown[sub.taskConfigId].count++;
        }

        if (!userSubmissionCount[sub.appUserId]) {
          const user = allUsers.find(u => u.id === sub.appUserId);
          userSubmissionCount[sub.appUserId] = {
            userId: sub.appUserId,
            userName: user?.name || "Unknown",
            count: 0,
            lastActive: null,
          };
        }
        userSubmissionCount[sub.appUserId].count++;
        const subDate = sub.createdAt ? new Date(sub.createdAt).toISOString() : null;
        if (subDate && (!userSubmissionCount[sub.appUserId].lastActive || subDate > userSubmissionCount[sub.appUserId].lastActive!)) {
          userSubmissionCount[sub.appUserId].lastActive = subDate;
        }
      }

      const trendArray = Object.entries(dailyTrend)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const topUsers = Object.values(userSubmissionCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const recentSubmissions = allSubmissions
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 10)
        .map(sub => {
          const user = allUsers.find(u => u.id === sub.appUserId);
          const task = allTasks.find(t => t.id === sub.taskConfigId);
          return {
            id: sub.id,
            userName: user?.name || "Unknown",
            taskName: task?.name || "Unknown",
            createdAt: sub.createdAt,
          };
        });

      res.json({
        summary: {
          totalSubmissions: allSubmissions.length,
          activeUsers: uniqueUserIds.size,
          totalUsers: allUsers.length,
          totalTasks: allTasks.length,
          enabledTasks: allTasks.filter(t => t.isEnabled).length,
          totalVillages: allVillages.length,
          totalVolunteers: allVolunteers.length,
          totalVisitors: allVisitors.length,
        },
        dailyTrend: trendArray,
        taskBreakdown: Object.values(taskBreakdown),
        topUsers,
        recentActivity: recentSubmissions,
      });
    } catch (error) {
      console.error("Analytics overview error:", error);
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  app.get("/api/analytics/task-report/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { startDate, endDate } = req.query;

      const taskConfig = await storage.getTaskConfig(taskId);
      if (!taskConfig) return res.status(404).json({ error: "Task not found" });

      let submissions = await storage.getTaskSubmissions(taskId);

      if (startDate) {
        submissions = submissions.filter(s => s.createdAt && new Date(s.createdAt) >= new Date(startDate as string));
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        submissions = submissions.filter(s => s.createdAt && new Date(s.createdAt) <= end);
      }

      const allUsers = await storage.getAppUsers();
      const fields = await storage.getFormFields(taskId);

      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const userBreakdown: Record<string, { userId: string; userName: string; mobile: string; role: string; count: number; lastSubmission: string | null }> = {};

      const fieldValueCounts: Record<string, Record<string, number>> = {};
      for (const field of fields) {
        if (["dropdown", "radio", "multi_select", "toggle"].includes(field.fieldType)) {
          fieldValueCounts[field.fieldKey] = {};
        }
      }

      for (const sub of submissions) {
        const user = userMap.get(sub.appUserId);
        if (!userBreakdown[sub.appUserId]) {
          userBreakdown[sub.appUserId] = {
            userId: sub.appUserId,
            userName: user?.name || "Unknown",
            mobile: user?.mobileNumber || "",
            role: user?.role || "",
            count: 0,
            lastSubmission: null,
          };
        }
        userBreakdown[sub.appUserId].count++;
        const subDate = sub.createdAt ? new Date(sub.createdAt).toISOString() : null;
        if (subDate && (!userBreakdown[sub.appUserId].lastSubmission || subDate > userBreakdown[sub.appUserId].lastSubmission!)) {
          userBreakdown[sub.appUserId].lastSubmission = subDate;
        }

        try {
          const data = JSON.parse(sub.data);
          for (const [key, value] of Object.entries(data)) {
            if (fieldValueCounts[key] && typeof value === "string") {
              fieldValueCounts[key][value] = (fieldValueCounts[key][value] || 0) + 1;
            }
          }
        } catch (e) {}
      }

      const dailyTrend: Record<string, number> = {};
      for (const sub of submissions) {
        const dateKey = sub.createdAt ? new Date(sub.createdAt).toISOString().split("T")[0] : "unknown";
        dailyTrend[dateKey] = (dailyTrend[dateKey] || 0) + 1;
      }

      const uniqueUsers = new Set(submissions.map(s => s.appUserId));

      const flatSubmissions = submissions.map(sub => {
        const user = userMap.get(sub.appUserId);
        let parsedData: Record<string, any> = {};
        try { parsedData = JSON.parse(sub.data); } catch (e) {}
        return {
          id: sub.id,
          userName: user?.name || "Unknown",
          userMobile: user?.mobileNumber || "",
          createdAt: sub.createdAt,
          ...parsedData,
        };
      });

      res.json({
        task: taskConfig,
        summary: {
          totalSubmissions: submissions.length,
          uniqueUsers: uniqueUsers.size,
          dateRange: {
            from: startDate || null,
            to: endDate || null,
          },
        },
        dailyTrend: Object.entries(dailyTrend).map(([date, cnt]) => ({ date, count: cnt })).sort((a, b) => a.date.localeCompare(b.date)),
        userBreakdown: Object.values(userBreakdown).sort((a, b) => b.count - a.count),
        fieldAnalytics: Object.entries(fieldValueCounts).map(([fieldKey, values]) => ({
          fieldKey,
          fieldLabel: fields.find(f => f.fieldKey === fieldKey)?.label || fieldKey,
          values: Object.entries(values).map(([value, cnt]) => ({ value, count: cnt })).sort((a, b) => b.count - a.count),
        })),
        submissions: flatSubmissions,
        fields: fields.map(f => ({ fieldKey: f.fieldKey, label: f.label, fieldType: f.fieldType })),
      });
    } catch (error) {
      console.error("Task report error:", error);
      res.status(500).json({ error: "Failed to fetch task report" });
    }
  });

  app.get("/api/analytics/user-report", async (req, res) => {
    try {
      const allUsers = await storage.getAppUsers();
      const allSubmissions = await storage.getTaskSubmissions();
      const allTasks = await storage.getTaskConfigs();

      const userStats = allUsers.map(user => {
        const userSubs = allSubmissions.filter(s => s.appUserId === user.id);
        const taskIds = new Set(userSubs.map(s => s.taskConfigId));
        const lastSubmission = userSubs.length > 0
          ? userSubs.reduce((latest, sub) => {
              const subDate = sub.createdAt ? new Date(sub.createdAt).getTime() : 0;
              const latestDate = latest.createdAt ? new Date(latest.createdAt).getTime() : 0;
              return subDate > latestDate ? sub : latest;
            })
          : null;

        return {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          voterId: user.voterId,
          mappedAreaName: user.mappedAreaName,
          mappedZone: user.mappedZone,
          mappedDistrict: user.mappedDistrict,
          mappedHalka: user.mappedHalka,
          mappedBlockNumber: user.mappedBlockNumber,
          totalSubmissions: userSubs.length,
          tasksCompleted: taskIds.size,
          lastSubmission: lastSubmission?.createdAt || null,
        };
      });

      res.json({
        users: userStats.sort((a, b) => b.totalSubmissions - a.totalSubmissions),
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.isActive).length,
      });
    } catch (error) {
      console.error("User report error:", error);
      res.status(500).json({ error: "Failed to fetch user report" });
    }
  });

  app.get("/api/admin/user-tree", async (req, res) => {
    try {
      const allUsers = await storage.getAppUsers();
      const allVolunteers = await storage.getMappedVolunteers();
      const allSupporters = await storage.getSupporters();

      const volCountByUser = new Map<string, number>();
      const supCountByUser = new Map<string, number>();
      for (const v of allVolunteers) {
        volCountByUser.set(v.addedByUserId, (volCountByUser.get(v.addedByUserId) || 0) + 1);
      }
      for (const s of allSupporters) {
        supCountByUser.set(s.addedByUserId, (supCountByUser.get(s.addedByUserId) || 0) + 1);
      }

      const docFields: { key: string; label: string }[] = [
        { key: "name", label: "Full Name" },
        { key: "selfPhoto", label: "Self Photo" },
        { key: "voterId", label: "Voter ID" },
        { key: "aadhaarNumber", label: "Aadhaar Number" },
        { key: "aadhaarPhoto", label: "Aadhaar Front" },
        { key: "aadhaarPhotoBack", label: "Aadhaar Back" },
        { key: "voterCardPhoto", label: "Voter Card Front" },
        { key: "voterCardPhotoBack", label: "Voter Card Back" },
        { key: "wing", label: "Wing" },
      ];

      const usersWithStats = allUsers.map((u) => {
        const uploaded: string[] = [];
        const missing: string[] = [];
        for (const f of docFields) {
          const val = (u as Record<string, unknown>)[f.key];
          const filled = !!(val && String(val).trim());
          if (filled) uploaded.push(f.label);
          else missing.push(f.label);
        }
        if (u.role === "party_post_holder") {
          const posFilled = !!(u.currentPosition && String(u.currentPosition).trim());
          const lvlFilled = !!(u.level && String(u.level).trim());
          if (posFilled) uploaded.push("Position"); else missing.push("Position");
          if (lvlFilled) uploaded.push("Level"); else missing.push("Level");
        }
        return {
          id: u.id,
          name: u.name,
          mobileNumber: u.mobileNumber,
          email: u.email,
          role: u.role,
          mappedAreaName: u.mappedAreaName,
          volunteerMappingCount: volCountByUser.get(u.id) || 0,
          supporterMappingCount: supCountByUser.get(u.id) || 0,
          documentsUploaded: uploaded,
          documentsMissing: missing,
        };
      });

      res.json({
        users: usersWithStats.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })),
      });
    } catch (error) {
      console.error("User tree error:", error);
      res.status(500).json({ error: "Failed to fetch user tree" });
    }
  });

  app.get("/api/admin/user-tree/:userId/mappings", async (req, res) => {
    try {
      const volunteers = await storage.getMappedVolunteersByUser(req.params.userId);
      const supporters = await storage.getSupportersByUser(req.params.userId);
      res.json({
        volunteers: volunteers.map((v) => ({ id: v.id, name: v.name, mobileNumber: v.mobileNumber })),
        supporters: supporters.map((s) => ({ id: s.id, name: s.name, mobileNumber: s.mobileNumber })),
      });
    } catch (error) {
      console.error("User mappings error:", error);
      res.status(500).json({ error: "Failed to fetch mappings" });
    }
  });

  app.get("/api/admin/login-page-config", async (req, res) => {
    try {
      const config = await storage.getLoginPageConfig();
      res.json(config || {
        imageUrl: null,
        ministerName: "Dr. Balbir Singh",
        ministerTitle: "Health Minister, Punjab Government",
        slogan: "Sewa, Sunwai, Samman, Sangathan, Suraksha, Sangharsh",
      });
    } catch (error) {
      console.error("Login page config error:", error);
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  app.patch("/api/admin/login-page-config", async (req, res) => {
    try {
      const { imageUrl, ministerName, ministerTitle, slogan } = req.body;
      const config = await storage.updateLoginPageConfig({
        imageUrl: imageUrl ?? undefined,
        ministerName: ministerName ?? undefined,
        ministerTitle: ministerTitle ?? undefined,
        slogan: slogan ?? undefined,
      });
      res.json(config);
    } catch (error) {
      console.error("Login page config update error:", error);
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  app.get("/api/analytics/user-report/:userId", async (req, res) => {
    try {
      const user = await storage.getAppUser(req.params.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const submissions = await storage.getTaskSubmissionsByUser(req.params.userId);
      const allTasks = await storage.getTaskConfigs();
      const taskMap = new Map(allTasks.map(t => [t.id, t]));

      const taskBreakdown: Record<string, { taskName: string; count: number }> = {};
      const detailedSubmissions = submissions.map(sub => {
        const task = taskMap.get(sub.taskConfigId);
        const taskName = task?.name || "Unknown";
        if (!taskBreakdown[sub.taskConfigId]) {
          taskBreakdown[sub.taskConfigId] = { taskName, count: 0 };
        }
        taskBreakdown[sub.taskConfigId].count++;

        let parsedData: Record<string, any> = {};
        try { parsedData = JSON.parse(sub.data); } catch (e) {}

        return {
          id: sub.id,
          taskName,
          taskConfigId: sub.taskConfigId,
          createdAt: sub.createdAt,
          data: parsedData,
        };
      });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          mobileNumber: user.mobileNumber,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          voterId: user.voterId,
          mappedAreaName: user.mappedAreaName,
          mappedZone: user.mappedZone,
          mappedDistrict: user.mappedDistrict,
          mappedHalka: user.mappedHalka,
          mappedBlockNumber: user.mappedBlockNumber,
        },
        totalSubmissions: submissions.length,
        taskBreakdown: Object.values(taskBreakdown),
        submissions: detailedSubmissions.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }),
      });
    } catch (error) {
      console.error("User detail report error:", error);
      res.status(500).json({ error: "Failed to fetch user detail report" });
    }
  });

  // Push Notification Subscription Endpoints
  app.get("/api/push/vapid-key", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { appUserId, subscription } = req.body;
      if (!appUserId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: "Missing subscription data" });
      }
      const sub = await storage.createPushSubscription({
        appUserId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
      res.json({ success: true, id: sub.id });
    } catch (error) {
      console.error("Push subscribe error:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  app.post("/api/push/send-all", async (req, res) => {
    try {
      const { title, body, url } = req.body;
      if (!title || !body) return res.status(400).json({ error: "Title and body required" });
      const result = await sendPushToAll(title, body, url);
      res.json(result);
    } catch (error) {
      console.error("Push send error:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // ===== Harr Sirr te Chatt (HSTC) Routes =====

  app.post("/api/hstc/send-otp", async (req, res) => {
    try {
      const { mobile } = req.body;
      if (!mobile || !isIndianMobile(mobile)) {
        return res.status(400).json({ error: "Valid 10-digit mobile number required" });
      }
      const normalizedMobile = normalizeMobile(mobile);
      const otp = await storeOTP(`hstc_${normalizedMobile}`);

      if (isSmsConfigured()) {
        try {
          await sendOtpSms(normalizedMobile, otp);
          console.log(`[OTP] Sent HSTC OTP via SMS to ${normalizedMobile}`);
          res.json({ success: true, maskedMobile: maskMobile(normalizedMobile) });
        } catch (smsErr) {
          console.error("[OTP] HSTC SMS send failed:", smsErr);
          res.status(500).json({ error: "Failed to send OTP via SMS" });
        }
      } else {
        console.log(`[OTP] SMS not configured - cannot send HSTC OTP`);
        res.status(500).json({ error: "SMS service is not configured" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/hstc/verify-otp", async (req, res) => {
    try {
      const { mobile, otp } = req.body;
      const normalizedMobile = normalizeMobile(mobile || "");
      if (!await verifyOTP(`hstc_${normalizedMobile}`, otp)) {
        return res.status(401).json({ error: "Invalid or expired OTP" });
      }
      res.json({ success: true, verified: true });
    } catch (error) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  app.post("/api/hstc/submit", async (req, res) => {
    try {
      const data = { ...req.body };
      data.repairMaterialCost = parseInt(data.repairMaterialCost) || 0;
      data.estimatedLabourCost = parseInt(data.estimatedLabourCost) || 0;
      data.totalCost = data.repairMaterialCost + data.estimatedLabourCost;
      if (data.numberOfPeople) data.numberOfPeople = parseInt(data.numberOfPeople) || null;

      const mobile = (data.mobileNumber || "").trim();
      if (mobile) {
        const existing = await db.select({ id: hstcSubmissions.id })
          .from(hstcSubmissions)
          .where(
            and(
              eq(hstcSubmissions.appUserId, data.appUserId),
              eq(hstcSubmissions.mobileNumber, mobile)
            )
          );
        if (existing.length > 0) {
          return res.status(409).json({ error: "DUPLICATE", message: "You have already submitted an application for this mobile number" });
        }
      }

      const parsed = insertHstcSubmissionSchema.parse(data);
      const submission = await storage.createHstcSubmission(parsed);
      res.json(submission);
    } catch (error: any) {
      console.error("HSTC submit error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(400).json({ error: "Failed to submit application" });
    }
  });

  app.get("/api/hstc/submissions", async (_req, res) => {
    try {
      const submissions = await storage.getHstcSubmissions();
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/hstc/submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getHstcSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  app.get("/api/hstc/my-submissions/:appUserId", async (req, res) => {
    try {
      const submissions = await storage.getHstcSubmissionsByUser(req.params.appUserId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.patch("/api/hstc/submissions/:id/review", async (req, res) => {
    try {
      const { status, reviewNote, reviewedBy } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const submission = await storage.getHstcSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const updated = await storage.updateHstcSubmission(req.params.id, {
        status,
        reviewNote: reviewNote || null,
        reviewedBy: reviewedBy || null,
      } as any);

      if (updated) {
        await db.update(hstcSubmissions)
          .set({ reviewedAt: new Date() })
          .where(eq(hstcSubmissions.id, req.params.id));
      }

      if (updated && submission.appUserId) {
        try {
          const notifTitle = status === "approved"
            ? "Application Approved!"
            : "Application Update";
          const notifBody = status === "approved"
            ? `Your "Harr Sirr te Chatt" application for ${submission.houseOwnerName} has been approved.`
            : `Your "Harr Sirr te Chatt" application for ${submission.houseOwnerName} has been reviewed.${reviewNote ? ` Note: ${reviewNote}` : ""}`;
          await sendPushToUser(submission.appUserId, notifTitle, notifBody, "/app");
        } catch (pushErr) {
          console.error("HSTC push notification error:", pushErr);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("HSTC review error:", error);
      res.status(500).json({ error: "Failed to review submission" });
    }
  });

  // Delete HSTC submission (admin)
  app.delete("/api/hstc/submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getHstcSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });
      await db.delete(hstcSubmissions).where(eq(hstcSubmissions.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("HSTC delete error:", error);
      res.status(500).json({ error: "Failed to delete submission" });
    }
  });

  // Toggle edit access for HSTC submission (admin)
  app.patch("/api/hstc/submissions/:id/toggle-edit", async (req, res) => {
    try {
      const submission = await storage.getHstcSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });
      const newVal = !submission.editAllowed;
      await db.update(hstcSubmissions).set({ editAllowed: newVal }).where(eq(hstcSubmissions.id, req.params.id));
      res.json({ editAllowed: newVal });
    } catch (error) {
      console.error("HSTC toggle edit error:", error);
      res.status(500).json({ error: "Failed to toggle edit access" });
    }
  });

  // Edit HSTC submission (volunteer, only when editAllowed is true)
  app.patch("/api/hstc/submissions/:id/edit", async (req, res) => {
    try {
      const submission = await storage.getHstcSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const data = { ...req.body };
      data.repairMaterialCost = parseInt(data.repairMaterialCost) || 0;
      data.estimatedLabourCost = parseInt(data.estimatedLabourCost) || 0;
      data.totalCost = data.repairMaterialCost + data.estimatedLabourCost;
      if (data.numberOfPeople) data.numberOfPeople = parseInt(data.numberOfPeople) || null;

      const newMobile = (data.mobileNumber || "").trim();
      if (newMobile && newMobile !== submission.mobileNumber) {
        const existing = await db.select({ id: hstcSubmissions.id })
          .from(hstcSubmissions)
          .where(
            and(
              eq(hstcSubmissions.appUserId, submission.appUserId),
              eq(hstcSubmissions.mobileNumber, newMobile)
            )
          );
        const others = existing.filter(e => e.id !== req.params.id);
        if (others.length > 0) {
          return res.status(409).json({ error: "DUPLICATE", message: "Another submission already exists for this mobile number" });
        }
      }

      delete data.id;
      delete data.appUserId;
      delete data.createdAt;
      delete data.reviewedAt;
      delete data.completedAt;
      delete data.paymentUploadedAt;
      delete data.editAllowed;
      delete data.status;

      const updated = await storage.updateHstcSubmission(req.params.id, data);
      if (updated) {
        await db.update(hstcSubmissions).set({ editAllowed: false, status: "pending" }).where(eq(hstcSubmissions.id, req.params.id));
      }
      res.json(updated);
    } catch (error) {
      console.error("HSTC edit error:", error);
      res.status(500).json({ error: "Failed to edit submission" });
    }
  });

  // Upload completed house photos (by volunteer after house is built)
  app.patch("/api/hstc/submissions/:id/completion", async (req, res) => {
    try {
      const { completedHouseImages, completionNotes } = req.body;
      const submission = await storage.getHstcSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      await db.update(hstcSubmissions)
        .set({
          completedHouseImages: completedHouseImages || [],
          completionNotes: completionNotes || null,
          completedAt: new Date(),
        })
        .where(eq(hstcSubmissions.id, req.params.id));

      res.json({ success: true });
    } catch (error) {
      console.error("HSTC completion error:", error);
      res.status(500).json({ error: "Failed to upload completion photos" });
    }
  });

  // Admin uploads payment proof (cheque/transfer image)
  app.patch("/api/hstc/submissions/:id/payment", async (req, res) => {
    try {
      const { paymentProofImages, paymentAmount, paymentMode, paymentNote } = req.body;
      const submission = await storage.getHstcSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      await db.update(hstcSubmissions)
        .set({
          paymentProofImages: paymentProofImages || [],
          paymentAmount: paymentAmount ? parseInt(paymentAmount) : null,
          paymentMode: paymentMode || null,
          paymentNote: paymentNote || null,
          paymentUploadedAt: new Date(),
        })
        .where(eq(hstcSubmissions.id, req.params.id));

      // Send push notification to user about payment
      if (submission.appUserId) {
        try {
          await sendPushToUser(
            submission.appUserId,
            "Payment Received!",
            `Payment of ₹${paymentAmount || 0} has been processed for your "Harr Sirr te Chatt" application for ${submission.houseOwnerName}.`,
            "/app"
          );
        } catch (pushErr) {
          console.error("HSTC payment push error:", pushErr);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("HSTC payment error:", error);
      res.status(500).json({ error: "Failed to upload payment proof" });
    }
  });

  app.get("/api/hstc/submissions/:id/attachment/:field", async (req, res) => {
    try {
      const { id, field } = req.params;
      const submission = await storage.getHstcSubmission(id);
      if (!submission) return res.status(404).json({ error: "Not found" });

      const allowedFields = [
        "aadhaarFront", "aadhaarBack", "voterIdFront", "voterIdBack",
        "applicationPhoto", "passbookOrChequeImage"
      ];
      const arrayFields = ["houseImages", "completedHouseImages", "paymentProofImages"];

      let base64Data: string | null = null;

      if (allowedFields.includes(field)) {
        base64Data = (submission as any)[field] || null;
      } else if (arrayFields.includes(field)) {
        const idx = parseInt(req.query.index as string) || 0;
        const arr = (submission as any)[field] || [];
        base64Data = arr[idx] || null;
      }

      if (!base64Data) return res.status(404).json({ error: "Attachment not found" });

      const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: "Invalid image data" });

      const mimeType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const ext = mimeType.split("/")[1] || "png";
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${field}_${id}.${ext}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to get attachment" });
    }
  });

  app.get("/api/hstc/export-csv", async (_req, res) => {
    try {
      const submissions = await storage.getHstcSubmissions();

      const headers = [
        "ID", "House Owner Name", "Father/Husband Name", "Village", "Mobile Number",
        "Repair Material Cost", "Labour Cost", "Total Cost",
        "No. of People", "Room Size", "Bricks Qty", "Sand (Sq Ft)", "Gravel (Ton/Kg)",
        "Cement (Kg/Qty)", "Saria (Kt/Kg)",
        "Nodal Volunteer", "Nodal Mobile", "Super Volunteer", "Super Mobile",
        "Bank Account Name", "Account Number", "Bank Name", "Branch Name", "IFSC Code",
        "Aadhaar Front", "Aadhaar Back", "Voter ID Front", "Voter ID Back",
        "Application Photo", "Passbook/Cheque", "House Images",
        "Completed House Images", "Completion Notes",
        "Payment Amount", "Payment Mode", "Payment Note", "Payment Proof Images",
        "OCR Aadhaar Name", "OCR Aadhaar Number", "OCR DOB", "OCR Gender",
        "OCR Address", "OCR Voter ID", "OCR Voter Name",
        "Room Size Unit", "Loan Consent", "Mobile Verified",
        "Status", "Review Note", "Reviewed By", "Reviewed At", "Submitted At"
      ];

      const baseUrl = `${_req.protocol}://${_req.get("host")}`;
      const attUrl = (id: string, field: string, idx?: number) => {
        const url = `${baseUrl}/api/hstc/submissions/${id}/attachment/${field}`;
        return idx !== undefined ? `${url}?index=${idx}` : url;
      };
      const hasAtt = (val: any) => val ? "Yes" : "No";

      const escCsv = (val: any) => {
        if (val === null || val === undefined) return "";
        const s = String(val);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const rows = submissions.map(s => [
        s.id,
        s.houseOwnerName,
        s.fatherHusbandName,
        s.villageName || "",
        s.mobileNumber,
        s.repairMaterialCost,
        s.estimatedLabourCost,
        s.totalCost,
        s.numberOfPeople || "",
        s.roomSize || "",
        s.bricksQty || "",
        s.sandSqFt || "",
        s.gravelTonKg || "",
        s.cementKgQty || "",
        s.sariaKtKg || "",
        s.nodalVolunteerName || "",
        s.nodalVolunteerMobile || "",
        s.superVolunteerName || "",
        s.superVolunteerMobile || "",
        s.bankAccountName || "",
        s.bankAccountNumber || "",
        s.bankName || "",
        s.bankBranchName || "",
        s.bankIfscCode || "",
        s.aadhaarFront ? attUrl(s.id, "aadhaarFront") : "No",
        s.aadhaarBack ? attUrl(s.id, "aadhaarBack") : "No",
        s.voterIdFront ? attUrl(s.id, "voterIdFront") : "No",
        s.voterIdBack ? attUrl(s.id, "voterIdBack") : "No",
        s.applicationPhoto ? attUrl(s.id, "applicationPhoto") : "No",
        s.passbookOrChequeImage ? attUrl(s.id, "passbookOrChequeImage") : "No",
        (s.houseImages || []).map((_, i) => attUrl(s.id, "houseImages", i)).join(" | ") || "No",
        (s.completedHouseImages || []).map((_, i) => attUrl(s.id, "completedHouseImages", i)).join(" | ") || "No",
        s.completionNotes || "",
        s.paymentAmount || "",
        s.paymentMode || "",
        s.paymentNote || "",
        (s.paymentProofImages || []).map((_, i) => attUrl(s.id, "paymentProofImages", i)).join(" | ") || "No",
        s.ocrAadhaarName || "",
        s.ocrAadhaarNumber || "",
        s.ocrAadhaarDob || "",
        s.ocrAadhaarGender || "",
        s.ocrAadhaarAddress || "",
        s.ocrVoterId || "",
        s.ocrVoterName || "",
        s.roomSizeUnit || "",
        s.loanConsent ? "Yes" : "No",
        s.mobileVerified ? "Yes" : "No",
        s.status,
        s.reviewNote || "",
        s.reviewedBy || "",
        s.reviewedAt ? new Date(s.reviewedAt).toLocaleString() : "",
        s.createdAt ? new Date(s.createdAt).toLocaleString() : "",
      ].map(escCsv).join(","));

      const csv = [headers.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="hstc_submissions_${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send("\uFEFF" + csv);
    } catch (error) {
      console.error("HSTC CSV export error:", error);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // ===== Google Sheets JSON API endpoints =====
  const sheetsApiKeyMiddleware = (req: any, res: any, next: any) => {
    const apiKey = process.env.SHEETS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Sheets API key not configured" });
    }
    const providedKey = req.headers["x-api-key"];
    if (providedKey !== apiKey) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    next();
  };

  app.get("/api/sheets/hstc", sheetsApiKeyMiddleware, async (_req, res) => {
    try {
      const submissions = await storage.getHstcSubmissions();
      const appUsersList = await storage.getAppUsers();
      const userMap = new Map(appUsersList.map(u => [u.id, u.name]));
      const data = submissions.map(s => ({
        id: s.id,
        houseOwnerName: s.houseOwnerName || "",
        fatherHusbandName: s.fatherHusbandName || "",
        mobileNumber: s.mobileNumber || "",
        villageName: s.villageName || "",
        repairMaterialCost: s.repairMaterialCost || 0,
        estimatedLabourCost: s.estimatedLabourCost || 0,
        totalCost: s.totalCost || 0,
        numberOfPeople: s.numberOfPeople || 0,
        roomSize: s.roomSize || "",
        bricksQty: s.bricksQty || "",
        sandSqFt: s.sandSqFt || "",
        gravelTonKg: s.gravelTonKg || "",
        cementKgQty: s.cementKgQty || "",
        sariaKtKg: s.sariaKtKg || "",
        nodalVolunteerName: s.nodalVolunteerName || "",
        nodalVolunteerMobile: s.nodalVolunteerMobile || "",
        superVolunteerName: s.superVolunteerName || "",
        superVolunteerMobile: s.superVolunteerMobile || "",
        bankAccountName: s.bankAccountName || "",
        bankAccountNumber: s.bankAccountNumber || "",
        bankName: s.bankName || "",
        bankBranchName: s.bankBranchName || "",
        bankIfscCode: s.bankIfscCode || "",
        ocrAadhaarName: s.ocrAadhaarName || "",
        ocrAadhaarNumber: s.ocrAadhaarNumber || "",
        ocrAadhaarDob: s.ocrAadhaarDob || "",
        ocrAadhaarGender: s.ocrAadhaarGender || "",
        ocrAadhaarAddress: s.ocrAadhaarAddress || "",
        ocrVoterId: s.ocrVoterId || "",
        ocrVoterName: s.ocrVoterName || "",
        status: s.status || "pending",
        reviewNote: s.reviewNote || "",
        reviewedBy: s.reviewedBy || "",
        reviewedAt: s.reviewedAt ? new Date(s.reviewedAt).toISOString() : "",
        paymentAmount: s.paymentAmount || 0,
        paymentMode: s.paymentMode || "",
        paymentNote: s.paymentNote || "",
        appUserId: s.appUserId || "",
        addedByName: s.appUserId ? (userMap.get(s.appUserId) || s.appUserId) : "",
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : "",
      }));
      res.json({ count: data.length, data });
    } catch (error) {
      console.error("Sheets HSTC API error:", error);
      res.status(500).json({ error: "Failed to fetch HSTC data" });
    }
  });

  app.get("/api/sheets/mapped-volunteers", sheetsApiKeyMiddleware, async (_req, res) => {
    try {
      const volunteers = await storage.getMappedVolunteers();
      const appUsersList = await storage.getAppUsers();
      const userMap = new Map(appUsersList.map(u => [u.id, u.name]));
      const data = volunteers.map(v => ({
        id: v.id,
        name: v.name || "",
        mobileNumber: v.mobileNumber || "",
        category: v.category || "",
        voterId: v.voterId || "",
        selectedVillageName: v.selectedVillageName || "",
        ocrName: v.ocrName || "",
        ocrAadhaarNumber: v.ocrAadhaarNumber || "",
        ocrVoterId: v.ocrVoterId || "",
        ocrDob: v.ocrDob || "",
        ocrGender: v.ocrGender || "",
        ocrAddress: v.ocrAddress || "",
        addedByUserId: v.addedByUserId || "",
        addedByName: v.addedByUserId ? (userMap.get(v.addedByUserId) || v.addedByUserId) : "",
        createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : "",
      }));
      res.json({ count: data.length, data });
    } catch (error) {
      console.error("Sheets Mapped Volunteers API error:", error);
      res.status(500).json({ error: "Failed to fetch mapped volunteers data" });
    }
  });

  app.get("/api/sheets/supporters", sheetsApiKeyMiddleware, async (_req, res) => {
    try {
      const supporters = await storage.getSupporters();
      const appUsersList = await storage.getAppUsers();
      const userMap = new Map(appUsersList.map(u => [u.id, u.name]));
      const data = supporters.map(s => ({
        id: s.id,
        name: s.name || "",
        mobileNumber: s.mobileNumber || "",
        voterId: s.voterId || "",
        selectedVillageName: s.selectedVillageName || "",
        ocrName: s.ocrName || "",
        ocrAadhaarNumber: s.ocrAadhaarNumber || "",
        ocrVoterId: s.ocrVoterId || "",
        ocrDob: s.ocrDob || "",
        ocrGender: s.ocrGender || "",
        ocrAddress: s.ocrAddress || "",
        addedByUserId: s.addedByUserId || "",
        addedByName: s.addedByUserId ? (userMap.get(s.addedByUserId) || s.addedByUserId) : "",
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : "",
      }));
      res.json({ count: data.length, data });
    } catch (error) {
      console.error("Sheets Supporters API error:", error);
      res.status(500).json({ error: "Failed to fetch supporters data" });
    }
  });

  // ===== SDSK (Sukh-Dukh Saanjha Karo) Routes =====

  // Categories CRUD (Admin)
  app.get("/api/sdsk/categories", async (_req, res) => {
    try {
      const categories = await storage.getSdskCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/sdsk/categories", async (req, res) => {
    try {
      const category = await storage.createSdskCategory(req.body);
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/api/sdsk/categories/:id", async (req, res) => {
    try {
      const category = await storage.updateSdskCategory(req.params.id, req.body);
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/sdsk/categories/:id", async (req, res) => {
    try {
      await storage.deleteSdskCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // SDSK OTP
  app.post("/api/sdsk/send-otp", async (req, res) => {
    try {
      const { mobile } = req.body;
      if (!mobile || !isIndianMobile(mobile)) {
        return res.status(400).json({ error: "Valid 10-digit mobile number required" });
      }
      const normalized = normalizeMobile(mobile);
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await db.insert(otpCodes).values({ key: `sdsk_${normalized}`, otp, expiresAt })
        .onConflictDoUpdate({ target: otpCodes.key, set: { otp, expiresAt } });
      if (isSmsConfigured()) {
        try { await sendOtpSms(normalized, otp); } catch (e) { console.error("SMS send failed:", e); }
      }
      res.json({ success: true, masked: maskMobile(normalized) });
    } catch (error) {
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/sdsk/verify-otp", async (req, res) => {
    try {
      const { mobile, otp } = req.body;
      if (!mobile || !otp) return res.status(400).json({ error: "Mobile and OTP required" });
      const normalized = normalizeMobile(mobile);
      const [record] = await db.select().from(otpCodes).where(eq(otpCodes.key, `sdsk_${normalized}`));
      if (!record) return res.status(400).json({ error: "OTP not found. Please request a new one." });
      if (new Date() > record.expiresAt) return res.status(400).json({ error: "OTP expired. Please request a new one." });
      if (record.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
      await db.delete(otpCodes).where(eq(otpCodes.key, `sdsk_${normalized}`));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // SDSK Submit
  app.post("/api/sdsk/submit", async (req, res) => {
    try {
      const submission = await storage.createSdskSubmission(req.body);
      res.json(submission);
    } catch (error) {
      console.error("SDSK submit error:", error);
      res.status(500).json({ error: "Failed to submit" });
    }
  });

  // SDSK Submissions list
  app.get("/api/sdsk/submissions", async (_req, res) => {
    try {
      const submissions = await storage.getSdskSubmissions();
      const userIds = Array.from(new Set(submissions.map(s => s.appUserId)));
      let userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const users = await db.select().from(appUsers).where(inArray(appUsers.id, userIds));
        users.forEach(u => userMap.set(u.id, u));
      }
      const enriched = submissions.map(s => ({
        ...s,
        userName: userMap.get(s.appUserId)?.name || "",
        userPhone: userMap.get(s.appUserId)?.mobileNumber || userMap.get(s.appUserId)?.email || "",
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // SDSK Single submission
  app.get("/api/sdsk/submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getSdskSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });
      const [user] = await db.select().from(appUsers).where(eq(appUsers.id, submission.appUserId));
      res.json({ ...submission, userName: user?.name || "", userPhone: user?.mobileNumber || user?.email || "" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // SDSK My submissions
  app.get("/api/sdsk/my-submissions/:appUserId", async (req, res) => {
    try {
      const submissions = await storage.getSdskSubmissionsByUser(req.params.appUserId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch my submissions" });
    }
  });

  // SDSK Accept submission
  app.patch("/api/sdsk/submissions/:id/accept", async (req, res) => {
    try {
      const { adminNote } = req.body;
      if (!adminNote || typeof adminNote !== "string" || !adminNote.trim()) {
        return res.status(400).json({ error: "Admin note is required" });
      }
      const [submission] = await db.select().from(sdskSubmissions).where(eq(sdskSubmissions.id, req.params.id));
      if (!submission) return res.status(404).json({ error: "Submission not found" });
      if (submission.status !== "pending") return res.status(400).json({ error: "Only pending submissions can be accepted" });

      const [updated] = await db.update(sdskSubmissions)
        .set({ status: "accepted", adminNote: adminNote.trim(), acceptedAt: new Date() })
        .where(eq(sdskSubmissions.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("SDSK accept error:", error);
      res.status(500).json({ error: "Failed to accept submission" });
    }
  });

  // SDSK Close/Complete submission
  app.patch("/api/sdsk/submissions/:id/close", async (req, res) => {
    try {
      const { completionNote } = req.body;
      if (!completionNote || typeof completionNote !== "string" || !completionNote.trim()) {
        return res.status(400).json({ error: "Completion note is required" });
      }
      const [submission] = await db.select().from(sdskSubmissions).where(eq(sdskSubmissions.id, req.params.id));
      if (!submission) return res.status(404).json({ error: "Submission not found" });
      if (submission.status === "closed") return res.status(400).json({ error: "Submission is already closed" });

      const [updated] = await db.update(sdskSubmissions)
        .set({ status: "closed", completionNote: completionNote.trim(), completedAt: new Date() })
        .where(eq(sdskSubmissions.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("SDSK close error:", error);
      res.status(500).json({ error: "Failed to close submission" });
    }
  });

  // SDSK CSV Export
  app.get("/api/sdsk/export-csv", async (_req, res) => {
    try {
      const submissions = await storage.getSdskSubmissions();
      const userIds = Array.from(new Set(submissions.map(s => s.appUserId)));
      let userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const users = await db.select().from(appUsers).where(inArray(appUsers.id, userIds));
        users.forEach(u => userMap.set(u.id, u));
      }
      const escCsv = (v: any) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
      const headers = ["ID", "Type", "Person Name", "Category", "Village", "Mobile", "Mobile Verified", "Description", "Has Voice Note", "User Name", "User Phone", "Status", "Created At"];
      const rows = submissions.map(s => [
        s.id, s.type, s.personName || "", s.categoryName || "", s.selectedVillageName || "", s.mobileNumber || "",
        s.mobileVerified ? "Yes" : "No", s.description || "", s.voiceNote ? "Yes" : "No",
        userMap.get(s.appUserId)?.name || "", userMap.get(s.appUserId)?.mobileNumber || "",
        s.status, s.createdAt ? new Date(s.createdAt).toISOString() : "",
      ].map(escCsv).join(","));
      const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=sdsk-submissions.csv");
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // ── Survey Routes ──

  // Admin: list all surveys
  app.get("/api/surveys", async (_req, res) => {
    try {
      const all = await storage.getSurveys();
      res.json(all);
    } catch (e) { res.status(500).json({ error: "Failed to fetch surveys" }); }
  });

  // Admin: get survey with questions
  app.get("/api/surveys/:id", async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) return res.status(404).json({ error: "Not found" });
      const questions = await storage.getSurveyQuestions(req.params.id);
      res.json({ ...survey, questions });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  // Admin: create survey with questions
  app.post("/api/surveys", async (req, res) => {
    try {
      const { questions, ...surveyData } = req.body;
      const survey = await storage.createSurvey(surveyData);
      if (questions && Array.isArray(questions)) {
        for (let i = 0; i < questions.length; i++) {
          await storage.createSurveyQuestion({ ...questions[i], surveyId: survey.id, sortOrder: i });
        }
      }
      const qs = await storage.getSurveyQuestions(survey.id);
      res.json({ ...survey, questions: qs });
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to create survey" }); }
  });

  // Admin: update survey
  app.patch("/api/surveys/:id", async (req, res) => {
    try {
      const { questions, ...surveyData } = req.body;
      const survey = await storage.updateSurvey(req.params.id, surveyData);
      if (!survey) return res.status(404).json({ error: "Not found" });
      if (questions && Array.isArray(questions)) {
        await storage.deleteSurveyQuestionsBySurvey(req.params.id);
        for (let i = 0; i < questions.length; i++) {
          await storage.createSurveyQuestion({ ...questions[i], surveyId: req.params.id, sortOrder: i });
        }
      }
      const qs = await storage.getSurveyQuestions(req.params.id);
      res.json({ ...survey, questions: qs });
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to update survey" }); }
  });

  // Admin: delete survey
  app.delete("/api/surveys/:id", async (req, res) => {
    try {
      await storage.deleteSurvey(req.params.id);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to delete survey" }); }
  });

  // Admin: toggle survey active status
  app.patch("/api/surveys/:id/toggle", async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) return res.status(404).json({ error: "Not found" });
      const updated = await storage.updateSurvey(req.params.id, { isActive: !survey.isActive });
      res.json(updated);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  // App: get active surveys for volunteer (filters out already completed ones)
  app.get("/api/app/surveys", async (req, res) => {
    try {
      const userId = typeof req.query.userId === "string" ? req.query.userId : null;
      const all = await storage.getSurveys();
      const active = all.filter(s => s.isActive);
      const result = [];
      for (const s of active) {
        if (userId) {
          const existing = await storage.getSurveyResponseByUser(s.id, userId);
          if (existing) continue;
        }
        const questions = await storage.getSurveyQuestions(s.id);
        result.push({ ...s, questions });
      }
      res.json(result);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  // App: survey leaderboard - count of survey responses per user
  app.get("/api/app/survey-leaderboard", async (_req, res) => {
    try {
      const surveyResps = await db
        .select({
          userId: surveyResponses.appUserId,
          count: count().as("count"),
        })
        .from(surveyResponses)
        .groupBy(surveyResponses.appUserId);

      const userIds = surveyResps.map(r => r.userId);
      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const users = await db.select().from(appUsers).where(inArray(appUsers.id, userIds));
        users.forEach(u => userMap.set(u.id, u));
      }

      const entries = surveyResps
        .map(r => ({
          userId: r.userId,
          name: userMap.get(r.userId)?.name || "Unknown",
          hasPhoto: !!(userMap.get(r.userId)?.selfPhoto),
          count: Number(r.count),
        }))
        .sort((a, b) => b.count - a.count);

      res.json(entries);
    } catch (e) { res.status(500).json({ error: "Failed to fetch survey leaderboard" }); }
  });

  // App: check if user already responded to a survey
  app.get("/api/app/surveys/:surveyId/response/:appUserId", async (req, res) => {
    try {
      const resp = await storage.getSurveyResponseByUser(req.params.surveyId, req.params.appUserId);
      res.json({ responded: !!resp, response: resp || null });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  // App: submit survey response
  app.post("/api/app/surveys/:surveyId/respond", async (req, res) => {
    try {
      const { appUserId, answers } = req.body;
      const existing = await storage.getSurveyResponseByUser(req.params.surveyId, appUserId);
      if (existing) return res.status(400).json({ error: "Already responded" });
      const resp = await storage.createSurveyResponse({
        surveyId: req.params.surveyId,
        appUserId,
        answers: typeof answers === "string" ? answers : JSON.stringify(answers),
      });
      res.json(resp);
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to submit" }); }
  });

  // Admin: get survey responses
  app.get("/api/surveys/:id/responses", async (req, res) => {
    try {
      const responses = await storage.getSurveyResponses(req.params.id);
      const userIds = [...new Set(responses.map(r => r.appUserId))];
      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const users = await db.select().from(appUsers).where(inArray(appUsers.id, userIds));
        users.forEach(u => userMap.set(u.id, u));
      }
      const enriched = responses.map(r => ({
        ...r,
        userName: userMap.get(r.appUserId)?.name || "",
        userPhone: userMap.get(r.appUserId)?.mobileNumber || "",
      }));
      res.json(enriched);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  // Admin: export survey responses as CSV
  app.get("/api/surveys/:id/export-csv", async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) return res.status(404).json({ error: "Not found" });
      const questions = await storage.getSurveyQuestions(req.params.id);
      const responses = await storage.getSurveyResponses(req.params.id);
      const userIds = [...new Set(responses.map(r => r.appUserId))];
      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const users = await db.select().from(appUsers).where(inArray(appUsers.id, userIds));
        users.forEach(u => userMap.set(u.id, u));
      }
      const escCsv = (v: any) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
      const headers = ["Response ID", "User Name", "User Phone", ...questions.map(q => q.label), "Submitted At"];
      const rows = responses.map(r => {
        const ans = JSON.parse(r.answers || "{}");
        return [
          r.id,
          userMap.get(r.appUserId)?.name || "",
          userMap.get(r.appUserId)?.mobileNumber || "",
          ...questions.map(q => ans[q.id] ?? ""),
          r.createdAt ? new Date(r.createdAt).toISOString() : "",
        ].map(escCsv).join(",");
      });
      const csv = "\uFEFF" + [headers.map(escCsv).join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="survey_${survey.title.replace(/\s+/g, "_")}_responses.csv"`);
      res.send(csv);
    } catch (e) { res.status(500).json({ error: "Failed" }); }
  });

  // ===== Sunwai (Hearing/Complaint) Routes =====

  // Send OTP for mobile verification (Sunwai)
  app.post("/api/sunwai/send-otp", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      if (!mobileNumber) {
        return res.status(400).json({ error: "Mobile number is required" });
      }
      if (!isIndianMobile(mobileNumber)) {
        return res.status(400).json({ error: "Invalid Indian mobile number" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const otp = await storeOTP(normalized);
      if (isSmsConfigured()) {
        try {
          await sendOtpSms(normalized, otp);
          console.log(`[Sunwai OTP] SMS sent to ${maskMobile(normalized)}`);
        } catch (smsErr: any) {
          console.error(`[Sunwai OTP] SMS failed:`, smsErr.message);
        }
      }
      res.json({ success: true, masked: maskMobile(normalized) });
    } catch (error: any) {
      console.error("[Sunwai OTP] Error:", error.message);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP (Sunwai)
  app.post("/api/sunwai/verify-otp", async (req, res) => {
    try {
      const { mobileNumber, otp } = req.body;
      if (!mobileNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP are required" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const valid = await verifyOTP(normalized, otp);
      if (!valid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      res.json({ success: true, verified: true });
    } catch (error: any) {
      console.error("[Sunwai OTP] Verify error:", error.message);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Submit complaint
  app.post("/api/sunwai/submit", async (req, res) => {
    try {
      const data = insertSunwaiComplaintSchema.parse(req.body);
      const complaint = await storage.createSunwaiComplaint(data);
      await storage.createSunwaiLog({
        complaintId: complaint.id,
        action: "submitted",
        note: "Complaint submitted",
        performedBy: data.appUserId,
        performedByName: data.complainantName,
      });
      res.json(complaint);
    } catch (error: any) {
      console.error("[Sunwai] Submit error:", error.message);
      res.status(400).json({ error: "Invalid complaint data" });
    }
  });

  // User's complaints with logs
  app.get("/api/sunwai/my-complaints/:appUserId", async (req, res) => {
    try {
      const complaints = await storage.getSunwaiComplaintsByAppUser(req.params.appUserId);
      const complaintsWithLogs = await Promise.all(
        complaints.map(async (c) => {
          const logs = await storage.getSunwaiLogsByComplaint(c.id);
          return { ...c, logs };
        })
      );
      res.json(complaintsWithLogs);
    } catch (error: any) {
      console.error("[Sunwai] My complaints error:", error.message);
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  // Admin: all complaints
  app.get("/api/sunwai/complaints", async (req, res) => {
    try {
      const complaints = await storage.getSunwaiComplaints();
      res.json(complaints);
    } catch (error: any) {
      console.error("[Sunwai] Get complaints error:", error.message);
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  // Single complaint with logs
  app.get("/api/sunwai/complaints/:id", async (req, res) => {
    try {
      const complaint = await storage.getSunwaiComplaintById(req.params.id);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      const logs = await storage.getSunwaiLogsByComplaint(complaint.id);
      res.json({ ...complaint, logs });
    } catch (error: any) {
      console.error("[Sunwai] Get complaint error:", error.message);
      res.status(500).json({ error: "Failed to fetch complaint" });
    }
  });

  // Admin accepts complaint with expectedDays
  app.patch("/api/sunwai/complaints/:id/accept", async (req, res) => {
    try {
      const { expectedDays, adminNote, performedBy, performedByName } = req.body;
      if (!expectedDays || expectedDays < 1) {
        return res.status(400).json({ error: "Expected days must be at least 1" });
      }
      const complaint = await storage.getSunwaiComplaintById(req.params.id);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      const updated = await storage.updateSunwaiComplaint(req.params.id, {
        status: "accepted",
        expectedDays,
        adminNote: adminNote || null,
        acceptedAt: new Date(),
      } as any);
      await storage.createSunwaiLog({
        complaintId: req.params.id,
        action: "accepted",
        note: `Complaint accepted. Expected resolution: ${expectedDays} days.${adminNote ? ` Note: ${adminNote}` : ""}`,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      const logs = await storage.getSunwaiLogsByComplaint(req.params.id);
      res.json({ ...updated, logs });
    } catch (error: any) {
      console.error("[Sunwai] Accept error:", error.message);
      res.status(500).json({ error: "Failed to accept complaint" });
    }
  });

  // Admin completes complaint with note
  app.patch("/api/sunwai/complaints/:id/complete", async (req, res) => {
    try {
      const { completionNote, performedBy, performedByName } = req.body;
      if (!completionNote) {
        return res.status(400).json({ error: "Completion note is required" });
      }
      const complaint = await storage.getSunwaiComplaintById(req.params.id);
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      const updated = await storage.updateSunwaiComplaint(req.params.id, {
        status: "completed",
        completionNote,
        completedAt: new Date(),
      } as any);
      await storage.createSunwaiLog({
        complaintId: req.params.id,
        action: "completed",
        note: `Complaint resolved. Note: ${completionNote}`,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      const logs = await storage.getSunwaiLogsByComplaint(req.params.id);
      res.json({ ...updated, logs });
    } catch (error: any) {
      console.error("[Sunwai] Complete error:", error.message);
      res.status(500).json({ error: "Failed to complete complaint" });
    }
  });

  // ===== Nasha Viruddh Yuddh Routes =====

  // Submit a new report (no OTP, no user-facing list)
  app.post("/api/nvy/report", async (req, res) => {
    try {
      const data = insertNvyReportSchema.parse(req.body);
      const report = await storage.createNvyReport(data);
      res.json(report);
    } catch (error: any) {
      console.error("[NVY] Submit error:", error.message);
      res.status(400).json({ error: "Invalid report data" });
    }
  });

  // Admin: list all reports
  app.get("/api/nvy/reports", async (_req, res) => {
    try {
      const reports = await storage.getNvyReports();
      res.json(reports);
    } catch (error: any) {
      console.error("[NVY] List error:", error.message);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // ===== Outdoor Advertisement Routes =====

  // Send OTP for outdoor ad mobile verification
  app.post("/api/outdoor-ad/send-otp", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      if (!mobileNumber) {
        return res.status(400).json({ error: "Mobile number is required" });
      }
      if (!isIndianMobile(mobileNumber)) {
        return res.status(400).json({ error: "Invalid Indian mobile number" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const otp = await storeOTP(normalized);
      if (isSmsConfigured()) {
        try {
          await sendOtpSms(normalized, otp);
          console.log(`[OutdoorAd] OTP sent via SMS to ${maskMobile(normalized)}`);
        } catch (smsErr: any) {
          console.log(`[OutdoorAd] SMS failed, OTP stored for manual verification: ${otp}`);
        }
      } else {
        console.log(`[OutdoorAd] SMS not configured, OTP for ${normalized}: ${otp}`);
      }
      res.json({ success: true, masked: maskMobile(normalized) });
    } catch (error: any) {
      console.error("[OutdoorAd] Send OTP error:", error.message);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Verify OTP for outdoor ad
  app.post("/api/outdoor-ad/verify-otp", async (req, res) => {
    try {
      const { mobileNumber, otp } = req.body;
      if (!mobileNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP are required" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const valid = await verifyOTP(normalized, otp);
      if (!valid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      res.json({ success: true, verified: true });
    } catch (error: any) {
      console.error("[OutdoorAd] Verify OTP error:", error.message);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Submit outdoor ad
  app.post("/api/outdoor-ad/submit", async (req, res) => {
    try {
      const data = insertOutdoorAdSchema.parse(req.body);
      const submission = await storage.createOutdoorAd(data);
      res.json(submission);
    } catch (error: any) {
      console.error("[OutdoorAd] Submit error:", error.message);
      res.status(400).json({ error: error.message || "Invalid submission data" });
    }
  });

  // Get user's outdoor ad submissions
  app.get("/api/outdoor-ad/my-submissions/:appUserId", async (req, res) => {
    try {
      const submissions = await storage.getOutdoorAdsByUser(req.params.appUserId);
      res.json(submissions);
    } catch (error: any) {
      console.error("[OutdoorAd] Get user submissions error:", error.message);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Get all outdoor ad submissions (admin)
  app.get("/api/outdoor-ad/submissions", async (req, res) => {
    try {
      const submissions = await storage.getOutdoorAds();
      res.json(submissions);
    } catch (error: any) {
      console.error("[OutdoorAd] Get all submissions error:", error.message);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Get single outdoor ad submission
  app.get("/api/outdoor-ad/submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getOutdoorAdById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(submission);
    } catch (error: any) {
      console.error("[OutdoorAd] Get submission error:", error.message);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // Approve outdoor ad submission (admin)
  app.patch("/api/outdoor-ad/submissions/:id/approve", async (req, res) => {
    try {
      const { adminNote } = req.body;
      if (!adminNote) {
        return res.status(400).json({ error: "Admin note is required" });
      }
      const submission = await storage.getOutdoorAdById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      const updated = await storage.updateOutdoorAd(req.params.id, {
        status: "approved",
        adminNote,
      } as any);
      if (updated) {
        await db.update(outdoorAdSubmissions)
          .set({ approvedAt: new Date() })
          .where(eq(outdoorAdSubmissions.id, req.params.id));
      }
      const final = await storage.getOutdoorAdById(req.params.id);
      res.json(final);
    } catch (error: any) {
      console.error("[OutdoorAd] Approve error:", error.message);
      res.status(500).json({ error: "Failed to approve submission" });
    }
  });

  app.patch("/api/outdoor-ad/submissions/:id/upload-poster", async (req, res) => {
    try {
      const { posterImage } = req.body;
      if (!posterImage) {
        return res.status(400).json({ error: "Poster image is required" });
      }
      const submission = await storage.getOutdoorAdById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      await storage.updateOutdoorAd(req.params.id, { posterImage } as any);
      const updated = await storage.getOutdoorAdById(req.params.id);
      res.json(updated);
    } catch (error: any) {
      console.error("[OutdoorAd] Upload poster error:", error.message);
      res.status(500).json({ error: "Failed to upload poster image" });
    }
  });

  app.get("/api/outdoor-ad/submissions/:id/wall-image", async (req, res) => {
    try {
      const submission = await storage.getOutdoorAdById(req.params.id);
      if (!submission || !submission.wallImage) {
        return res.status(404).json({ error: "Image not found" });
      }
      const match = submission.wallImage.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", contentType);
        return res.send(buffer);
      }
      res.status(404).json({ error: "Invalid image data" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch image" });
    }
  });

  app.get("/api/outdoor-ad/submissions/:id/poster-image", async (req, res) => {
    try {
      const submission = await storage.getOutdoorAdById(req.params.id);
      if (!submission || !submission.posterImage) {
        return res.status(404).json({ error: "Image not found" });
      }
      const match = submission.posterImage.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const contentType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", contentType);
        return res.send(buffer);
      }
      res.status(404).json({ error: "Invalid image data" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch image" });
    }
  });

  // ====== Gov School Work Module ======

  // Gov School Issue Categories
  app.get("/api/gov-school/categories", async (req, res) => {
    try {
      const categories = await storage.getGovSchoolCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/gov-school/categories", async (req, res) => {
    try {
      const data = insertGovSchoolIssueCategorySchema.parse(req.body);
      const category = await storage.createGovSchoolCategory(data);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  app.patch("/api/gov-school/categories/:id", async (req, res) => {
    try {
      const category = await storage.updateGovSchoolCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/gov-school/categories/:id", async (req, res) => {
    try {
      await storage.deleteGovSchoolCategory(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Gov School OTP
  app.post("/api/gov-school/send-otp", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      if (!mobileNumber) {
        return res.status(400).json({ error: "Mobile number is required" });
      }
      if (!isIndianMobile(mobileNumber)) {
        return res.status(400).json({ error: "Invalid Indian mobile number" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const otp = await storeOTP(normalized);
      if (isSmsConfigured()) {
        try {
          await sendOtpSms(normalized, otp);
          console.log(`[GovSchool OTP] SMS sent to ${maskMobile(normalized)}`);
        } catch (smsErr: any) {
          console.error(`[GovSchool OTP] SMS failed:`, smsErr.message);
        }
      }
      res.json({ success: true, masked: maskMobile(normalized) });
    } catch (error: any) {
      console.error("[GovSchool OTP] Error:", error.message);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/gov-school/verify-otp", async (req, res) => {
    try {
      const { mobileNumber, otp } = req.body;
      if (!mobileNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP are required" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const valid = await verifyOTP(normalized, otp);
      if (!valid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      res.json({ success: true, verified: true });
    } catch (error: any) {
      console.error("[GovSchool OTP] Verify error:", error.message);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Gov School Submit
  app.post("/api/gov-school/submit", async (req, res) => {
    try {
      const data = insertGovSchoolSubmissionSchema.parse(req.body);
      const submission = await storage.createGovSchoolSubmission(data);
      await storage.createGovSchoolLog({
        submissionId: submission.id,
        action: "submitted",
        note: "Issue reported",
        performedBy: data.appUserId,
        performedByName: data.nodalVolunteerName || data.schoolName,
      });
      res.json(submission);
    } catch (error: any) {
      console.error("[GovSchool] Submit error:", error.message);
      res.status(400).json({ error: "Invalid submission data" });
    }
  });

  // Gov School: User's submissions with logs
  app.get("/api/gov-school/my-submissions/:appUserId", async (req, res) => {
    try {
      const submissions = await storage.getGovSchoolSubmissionsByUser(req.params.appUserId);
      const submissionsWithLogs = await Promise.all(
        submissions.map(async (s) => {
          const logs = await storage.getGovSchoolLogsBySubmission(s.id);
          return { ...s, logs };
        })
      );
      res.json(submissionsWithLogs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Gov School: Admin - all submissions
  app.get("/api/gov-school/submissions", async (req, res) => {
    try {
      const submissions = await storage.getGovSchoolSubmissions();
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Gov School: Single submission with logs
  app.get("/api/gov-school/submissions/:id", async (req, res) => {
    try {
      const submission = await storage.getGovSchoolSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      const logs = await storage.getGovSchoolLogsBySubmission(submission.id);
      res.json({ ...submission, logs });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // Gov School: Admin accepts submission
  app.patch("/api/gov-school/submissions/:id/accept", async (req, res) => {
    try {
      const { adminNote, performedBy, performedByName } = req.body;
      if (!adminNote) {
        return res.status(400).json({ error: "Admin note is required" });
      }
      const submission = await storage.getGovSchoolSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      if (submission.status !== "pending") {
        return res.status(400).json({ error: "Only pending submissions can be accepted" });
      }
      const updated = await storage.updateGovSchoolSubmission(req.params.id, {
        status: "accepted",
        adminNote,
        acceptedAt: new Date(),
      } as any);
      await storage.createGovSchoolLog({
        submissionId: req.params.id,
        action: "accepted",
        note: adminNote,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      res.json(updated);
    } catch (error: any) {
      console.error("[GovSchool] Accept error:", error.message);
      res.status(500).json({ error: "Failed to accept submission" });
    }
  });

  // Gov School: Admin resolves submission
  app.patch("/api/gov-school/submissions/:id/resolve", async (req, res) => {
    try {
      const { completionNote, performedBy, performedByName } = req.body;
      if (!completionNote) {
        return res.status(400).json({ error: "Completion note is required" });
      }
      const submission = await storage.getGovSchoolSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      if (submission.status !== "accepted") {
        return res.status(400).json({ error: "Only accepted submissions can be resolved" });
      }
      const updated = await storage.updateGovSchoolSubmission(req.params.id, {
        status: "resolved",
        completionNote,
        completedAt: new Date(),
      } as any);
      await storage.createGovSchoolLog({
        submissionId: req.params.id,
        action: "resolved",
        note: completionNote,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      res.json(updated);
    } catch (error: any) {
      console.error("[GovSchool] Resolve error:", error.message);
      res.status(500).json({ error: "Failed to resolve submission" });
    }
  });

  // ===== Appointment Routes =====

  app.post("/api/appointment/send-otp", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      if (!mobileNumber) {
        return res.status(400).json({ error: "Mobile number is required" });
      }
      if (!isIndianMobile(mobileNumber)) {
        return res.status(400).json({ error: "Invalid Indian mobile number" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const otp = await storeOTP(normalized);
      if (isSmsConfigured()) {
        try {
          await sendOtpSms(normalized, otp);
          console.log(`[Appointment OTP] SMS sent to ${maskMobile(normalized)}`);
        } catch (smsErr: any) {
          console.error(`[Appointment OTP] SMS failed:`, smsErr.message);
        }
      }
      res.json({ success: true, masked: maskMobile(normalized) });
    } catch (error: any) {
      console.error("[Appointment OTP] Error:", error.message);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/appointment/verify-otp", async (req, res) => {
    try {
      const { mobileNumber, otp } = req.body;
      if (!mobileNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP are required" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const valid = await verifyOTP(normalized, otp);
      if (!valid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      res.json({ success: true, verified: true });
    } catch (error: any) {
      console.error("[Appointment OTP] Verify error:", error.message);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  app.post("/api/appointment/submit", async (req, res) => {
    try {
      const data = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(data);
      await storage.createAppointmentLog({
        appointmentId: appointment.id,
        action: "submitted",
        note: "Appointment request submitted",
        performedBy: data.appUserId,
        performedByName: data.personName,
      });
      res.json(appointment);
    } catch (error: any) {
      console.error("[Appointment] Submit error:", error.message);
      res.status(400).json({ error: "Invalid appointment data" });
    }
  });

  app.get("/api/appointment/my-appointments/:appUserId", async (req, res) => {
    try {
      const appts = await storage.getAppointmentsByUser(req.params.appUserId);
      const withLogs = await Promise.all(
        appts.map(async (a) => {
          const logs = await storage.getAppointmentLogsByAppointment(a.id);
          return { ...a, logs };
        })
      );
      res.json(withLogs);
    } catch (error: any) {
      console.error("[Appointment] My appointments error:", error.message);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointment/appointments", async (req, res) => {
    try {
      const appts = await storage.getAppointments();
      res.json(appts);
    } catch (error: any) {
      console.error("[Appointment] Get appointments error:", error.message);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointment/appointments/:id", async (req, res) => {
    try {
      const appt = await storage.getAppointmentById(req.params.id);
      if (!appt) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      const logs = await storage.getAppointmentLogsByAppointment(appt.id);
      res.json({ ...appt, logs });
    } catch (error: any) {
      console.error("[Appointment] Get appointment error:", error.message);
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  app.patch("/api/appointment/appointments/:id/schedule", async (req, res) => {
    try {
      const { appointmentDate, adminNote, performedBy, performedByName } = req.body;
      if (!appointmentDate) {
        return res.status(400).json({ error: "Appointment date is required" });
      }
      const appt = await storage.getAppointmentById(req.params.id);
      if (!appt) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      const updated = await storage.updateAppointment(req.params.id, {
        status: "scheduled",
        appointmentDate,
        adminNote: adminNote || null,
        scheduledAt: new Date(),
      } as any);
      await storage.createAppointmentLog({
        appointmentId: req.params.id,
        action: "scheduled",
        note: `Appointment scheduled for ${appointmentDate}.${adminNote ? ` Note: ${adminNote}` : ""}`,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      const logs = await storage.getAppointmentLogsByAppointment(req.params.id);
      res.json({ ...updated, logs });
    } catch (error: any) {
      console.error("[Appointment] Schedule error:", error.message);
      res.status(500).json({ error: "Failed to schedule appointment" });
    }
  });

  app.patch("/api/appointment/appointments/:id/resolve", async (req, res) => {
    try {
      const { completionNote, performedBy, performedByName } = req.body;
      if (!completionNote) {
        return res.status(400).json({ error: "Completion note is required" });
      }
      const appt = await storage.getAppointmentById(req.params.id);
      if (!appt) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      const updated = await storage.updateAppointment(req.params.id, {
        status: "resolved",
        completionNote,
        resolvedAt: new Date(),
      } as any);
      await storage.createAppointmentLog({
        appointmentId: req.params.id,
        action: "resolved",
        note: `Resolved. Note: ${completionNote}`,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      const logs = await storage.getAppointmentLogsByAppointment(req.params.id);
      res.json({ ...updated, logs });
    } catch (error: any) {
      console.error("[Appointment] Resolve error:", error.message);
      res.status(500).json({ error: "Failed to resolve appointment" });
    }
  });

  // ===== Road Repair Reports =====

  // OTP for reporter mobile verification
  app.post("/api/road/send-otp", async (req, res) => {
    try {
      const { mobileNumber } = req.body;
      if (!mobileNumber) {
        return res.status(400).json({ error: "Mobile number is required" });
      }
      if (!isIndianMobile(mobileNumber)) {
        return res.status(400).json({ error: "Invalid Indian mobile number" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const otp = await storeOTP(normalized);
      if (isSmsConfigured()) {
        try {
          await sendOtpSms(normalized, otp);
          console.log(`[Road OTP] SMS sent to ${maskMobile(normalized)}`);
        } catch (smsErr: any) {
          console.error("[Road OTP] SMS failed:", smsErr.message);
        }
      }
      res.json({ success: true, masked: maskMobile(normalized) });
    } catch (error: any) {
      console.error("[Road OTP] Error:", error.message);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/road/verify-otp", async (req, res) => {
    try {
      const { mobileNumber, otp } = req.body;
      if (!mobileNumber || !otp) {
        return res.status(400).json({ error: "Mobile number and OTP are required" });
      }
      const normalized = normalizeMobile(mobileNumber);
      const valid = await verifyOTP(normalized, otp);
      if (!valid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      res.json({ success: true, verified: true });
    } catch (error: any) {
      console.error("[Road OTP] Verify error:", error.message);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Submit road report
  app.post("/api/road/report", async (req, res) => {
    try {
      const data = insertRoadReportSchema.parse(req.body);
      const report = await storage.createRoadReport(data);
      await storage.createRoadLog({
        reportId: report.id,
        action: "submitted",
        note: "Road issue reported",
        performedBy: data.appUserId,
        performedByName: data.reporterName,
      });
      res.json(report);
    } catch (error: any) {
      console.error("[Road] Submit error:", error.message);
      res.status(400).json({ error: "Invalid road report data" });
    }
  });

  // User's own road reports with logs
  app.get("/api/road/my-reports/:appUserId", async (req, res) => {
    try {
      const reports = await storage.getRoadReportsByUser(req.params.appUserId);
      const withLogs = await Promise.all(
        reports.map(async (r) => {
          const logs = await storage.getRoadLogsByReport(r.id);
          return { ...r, logs };
        })
      );
      res.json(withLogs);
    } catch (error: any) {
      console.error("[Road] My reports error:", error.message);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Admin: list all road reports
  app.get("/api/road/reports", async (req, res) => {
    try {
      const reports = await storage.getRoadReports();
      res.json(reports);
    } catch (error: any) {
      console.error("[Road] Get reports error:", error.message);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Admin: single road report with logs
  app.get("/api/road/reports/:id", async (req, res) => {
    try {
      const reports = await storage.getRoadReports();
      const report = reports.find((r) => r.id === req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      const logs = await storage.getRoadLogsByReport(report.id);
      res.json({ ...report, logs });
    } catch (error: any) {
      console.error("[Road] Get report error:", error.message);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // Admin: add processing note (does not close)
  app.patch("/api/road/reports/:id/note", async (req, res) => {
    try {
      const { note, performedBy, performedByName } = req.body;
      if (!note) {
        return res.status(400).json({ error: "Note is required" });
      }
      const reports = await storage.getRoadReports();
      const report = reports.find((r) => r.id === req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      await db.update(roadReports)
        .set({ adminNote: note })
        .where(eq(roadReports.id, req.params.id));
      await storage.createRoadLog({
        reportId: req.params.id,
        action: "note",
        note,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      const logs = await storage.getRoadLogsByReport(req.params.id);
      const [updated] = await db.select().from(roadReports).where(eq(roadReports.id, req.params.id));
      res.json({ ...updated, logs });
    } catch (error: any) {
      console.error("[Road] Add note error:", error.message);
      res.status(500).json({ error: "Failed to add note" });
    }
  });

  // Admin: mark report completed with final note
  app.patch("/api/road/reports/:id/complete", async (req, res) => {
    try {
      const { completionNote, performedBy, performedByName } = req.body;
      if (!completionNote) {
        return res.status(400).json({ error: "Completion note is required" });
      }
      const reports = await storage.getRoadReports();
      const report = reports.find((r) => r.id === req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      await db.update(roadReports)
        .set({
          status: "completed",
          completionNote,
          completedAt: new Date(),
        } as any)
        .where(eq(roadReports.id, req.params.id));
      await storage.createRoadLog({
        reportId: req.params.id,
        action: "completed",
        note: completionNote,
        performedBy: performedBy || "admin",
        performedByName: performedByName || "Admin",
      });
      const logs = await storage.getRoadLogsByReport(req.params.id);
      const [updated] = await db.select().from(roadReports).where(eq(roadReports.id, req.params.id));
      res.json({ ...updated, logs });
    } catch (error: any) {
      console.error("[Road] Complete error:", error.message);
      res.status(500).json({ error: "Failed to complete report" });
    }
  });

  setInterval(() => cleanExpiredOTPs(), 10 * 60 * 1000);

  return httpServer;
}
