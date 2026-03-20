/**
 * Server-side pagination for admin list APIs (keeps payloads small on Render / RDS).
 */
import { db } from "./db";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AdminPaged } from "./admin-pagination";
import {
  appUsers,
  officeManagers,
  hstcSubmissions,
  sdskSubmissions,
  sunwaiComplaints,
  blaSubmissions,
  roadReports,
  outdoorAdSubmissions,
  govSchoolSubmissions,
  appointments,
  eventVenues,
  tirthYatraRequests,
  mahilaSammanPunjabSubmissions,
  voterRegistrationSubmissions,
  nvyReports,
} from "@shared/schema";

function sanitizeSearch(raw: string): string {
  return raw.trim().replace(/[%_\\]/g, "");
}

function buildHstcWhere(opts: {
  search: string;
  villageIds?: string[];
  status?: string;
}): SQL | undefined {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(hstcSubmissions.houseOwnerName, `%${s}%`),
        ilike(hstcSubmissions.mobileNumber, `%${s}%`),
        ilike(hstcSubmissions.villageName, `%${s}%`),
        ilike(hstcSubmissions.ocrVoterId, `%${s}%`),
        ilike(hstcSubmissions.id, `%${s}%`),
        ilike(hstcSubmissions.fatherHusbandName, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(hstcSubmissions.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(hstcSubmissions.villageId, vids));
  }
  return and(...parts.filter(Boolean)) as SQL | undefined;
}

export async function hstcSubmissionsStatusCounts(opts: {
  villageIds?: string[];
}): Promise<{ pending: number; approved: number; rejected: number }> {
  const w = buildHstcWhere({ search: "", villageIds: opts.villageIds, status: "all" });
  const rows = await db
    .select({
      status: hstcSubmissions.status,
      n: sql<number>`count(*)::int`,
    })
    .from(hstcSubmissions)
    .where(w)
    .groupBy(hstcSubmissions.status);
  const out = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) {
    const k = String(r.status || "").toLowerCase();
    const n = Number(r.n);
    if (k === "pending") out.pending = n;
    else if (k === "approved") out.approved = n;
    else if (k === "rejected") out.rejected = n;
  }
  return out;
}

/** HSTC admin list: same slim projection as storage.getHstcSubmissions (no image blobs). */
const HSTC_ADMIN_LIST_SELECT = {
  id: hstcSubmissions.id,
  appUserId: hstcSubmissions.appUserId,
  villageId: hstcSubmissions.villageId,
  villageName: hstcSubmissions.villageName,
  houseOwnerName: hstcSubmissions.houseOwnerName,
  fatherHusbandName: hstcSubmissions.fatherHusbandName,
  mobileNumber: hstcSubmissions.mobileNumber,
  repairMaterialCost: hstcSubmissions.repairMaterialCost,
  estimatedLabourCost: hstcSubmissions.estimatedLabourCost,
  totalCost: hstcSubmissions.totalCost,
  numberOfPeople: hstcSubmissions.numberOfPeople,
  roomSize: hstcSubmissions.roomSize,
  roomSizeUnit: hstcSubmissions.roomSizeUnit,
  bricksQty: hstcSubmissions.bricksQty,
  sandSqFt: hstcSubmissions.sandSqFt,
  gravelTonKg: hstcSubmissions.gravelTonKg,
  cementKgQty: hstcSubmissions.cementKgQty,
  sariaKtKg: hstcSubmissions.sariaKtKg,
  nodalVolunteerName: hstcSubmissions.nodalVolunteerName,
  nodalVolunteerMobile: hstcSubmissions.nodalVolunteerMobile,
  superVolunteerName: hstcSubmissions.superVolunteerName,
  superVolunteerMobile: hstcSubmissions.superVolunteerMobile,
  bankAccountName: hstcSubmissions.bankAccountName,
  bankAccountNumber: hstcSubmissions.bankAccountNumber,
  bankName: hstcSubmissions.bankName,
  bankBranchName: hstcSubmissions.bankBranchName,
  bankIfscCode: hstcSubmissions.bankIfscCode,
  loanConsent: hstcSubmissions.loanConsent,
  mobileVerified: hstcSubmissions.mobileVerified,
  completionNotes: hstcSubmissions.completionNotes,
  completedAt: hstcSubmissions.completedAt,
  paymentAmount: hstcSubmissions.paymentAmount,
  paymentMode: hstcSubmissions.paymentMode,
  paymentNote: hstcSubmissions.paymentNote,
  paymentUploadedAt: hstcSubmissions.paymentUploadedAt,
  ocrAadhaarName: hstcSubmissions.ocrAadhaarName,
  ocrAadhaarNumber: hstcSubmissions.ocrAadhaarNumber,
  ocrAadhaarDob: hstcSubmissions.ocrAadhaarDob,
  ocrAadhaarGender: hstcSubmissions.ocrAadhaarGender,
  ocrAadhaarAddress: hstcSubmissions.ocrAadhaarAddress,
  ocrVoterId: hstcSubmissions.ocrVoterId,
  ocrVoterName: hstcSubmissions.ocrVoterName,
  status: hstcSubmissions.status,
  reviewNote: hstcSubmissions.reviewNote,
  reviewedBy: hstcSubmissions.reviewedBy,
  reviewedAt: hstcSubmissions.reviewedAt,
  editAllowed: hstcSubmissions.editAllowed,
  createdAt: hstcSubmissions.createdAt,
} as const;

async function pageFullTable(
  table: any,
  orderCol: any,
  limit: number,
  offset: number,
  search: string,
  ilikeCols: any[],
  orderDirection: "asc" | "desc" = "desc",
): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(search);
  const w: SQL | undefined = s
    ? or(...ilikeCols.map((col) => ilike(col, `%${s}%`)))
    : undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(w);
  const ob = orderDirection === "asc" ? asc(orderCol) : desc(orderCol);
  const items = await db
    .select()
    .from(table)
    .where(w)
    .orderBy(ob)
    .limit(limit)
    .offset(offset);
  return { items, total: Number(countRow?.n ?? 0), limit, offset };
}

export async function pagedAppUsers(opts: {
  limit: number;
  offset: number;
  search: string;
  role?: string;
  status?: string;
  villageIds?: string[];
  activeOnly?: boolean;
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];

  if (opts.activeOnly) {
    parts.push(or(eq(appUsers.isActive, true), isNull(appUsers.isActive)));
  }

  if (s) {
    parts.push(
      or(
        ilike(appUsers.name, `%${s}%`),
        ilike(appUsers.mobileNumber, `%${s}%`),
        ilike(appUsers.email, `%${s}%`),
        ilike(appUsers.id, `%${s}%`),
        ilike(appUsers.role, `%${s}%`),
        ilike(appUsers.wing, `%${s}%`),
        ilike(appUsers.voterId, `%${s}%`),
        ilike(appUsers.mappedAreaName, `%${s}%`),
      ),
    );
  }

  const role = (opts.role || "all").trim();
  if (role && role !== "all") {
    parts.push(eq(appUsers.role, role));
  }

  const st = (opts.status || "all").trim();
  if (st === "active") {
    parts.push(or(eq(appUsers.isActive, true), isNull(appUsers.isActive)));
  } else if (st === "blocked") {
    parts.push(eq(appUsers.isActive, false));
  }

  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(appUsers.mappedAreaId, vids));
  }

  const w = and(...parts.filter(Boolean)) as SQL | undefined;

  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(appUsers).where(w);
  const items = await db
    .select()
    .from(appUsers)
    .where(w)
    .orderBy(desc(appUsers.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);

  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function appUserScopeStats(opts: { villageIds?: string[] }): Promise<{
  total: number;
  active: number;
  blocked: number;
  volunteers: number;
  postHolders: number;
  approved: number;
  pending: number;
}> {
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  const w = vids.length > 0 ? inArray(appUsers.mappedAreaId, vids) : undefined;
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where coalesce(${appUsers.isActive}, true) = true)::int`,
      blocked: sql<number>`count(*) filter (where ${appUsers.isActive} = false)::int`,
      volunteers: sql<number>`count(*) filter (where ${appUsers.role} = 'volunteer')::int`,
      postHolders: sql<number>`count(*) filter (where ${appUsers.role} = 'party_post_holder')::int`,
      approved: sql<number>`count(*) filter (where ${appUsers.isApproved} = true)::int`,
      pending: sql<number>`count(*) filter (where coalesce(${appUsers.isApproved}, false) = false)::int`,
    })
    .from(appUsers)
    .where(w);
  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    blocked: Number(row?.blocked ?? 0),
    volunteers: Number(row?.volunteers ?? 0),
    postHolders: Number(row?.postHolders ?? 0),
    approved: Number(row?.approved ?? 0),
    pending: Number(row?.pending ?? 0),
  };
}

export type BirthdayManagerRow = {
  id: string;
  name: string;
  ocrDob: string | null;
  mobileNumber: string | null;
  role: string | null;
  selfPhoto: string | null;
};

function getNextBirthdayFromDob(dobStr: string): Date {
  const now = new Date();
  const parts = dobStr.split(/[-/]/);
  let day: number;
  let month: number;

  if (parts[0].length === 4) {
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (parseInt(parts[2], 10) > 31) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  }

  if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 0 || month > 11) {
    return new Date(9999, 0, 1);
  }

  let nextBday = new Date(now.getFullYear(), month, day, 0, 0, 0, 0);
  if (nextBday < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    nextBday = new Date(now.getFullYear() + 1, month, day, 0, 0, 0, 0);
  }
  return nextBday;
}

function applyBirthdayFilter(
  list: BirthdayManagerRow[],
  filter: string,
): BirthdayManagerRow[] {
  const now = new Date();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  if (filter === "with-dob") {
    return list.filter((u) => !!u.ocrDob);
  }
  if (filter === "no-dob") {
    return list.filter((u) => !u.ocrDob);
  }
  if (filter === "today") {
    return list.filter((u) => {
      if (!u.ocrDob) return false;
      const next = getNextBirthdayFromDob(u.ocrDob);
      return (
        next.getMonth() === todayMonth &&
        next.getDate() === todayDate &&
        next.getFullYear() === now.getFullYear()
      );
    });
  }
  if (filter === "this-week") {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return list.filter((u) => {
      if (!u.ocrDob) return false;
      const next = getNextBirthdayFromDob(u.ocrDob);
      return (
        next >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && next <= weekEnd
      );
    });
  }
  if (filter === "this-month") {
    return list.filter((u) => {
      if (!u.ocrDob) return false;
      const next = getNextBirthdayFromDob(u.ocrDob);
      return next.getMonth() === todayMonth && next.getFullYear() === now.getFullYear();
    });
  }
  return list;
}

function birthdaySummary(rows: BirthdayManagerRow[]) {
  const now = new Date();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;
  let withDob = 0;
  let noDob = 0;

  for (const u of rows) {
    if (u.ocrDob) {
      withDob++;
      const next = getNextBirthdayFromDob(u.ocrDob);
      if (
        next.getMonth() === todayMonth &&
        next.getDate() === todayDate &&
        next.getFullYear() === now.getFullYear()
      ) {
        today++;
      }
      if (
        next >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) &&
        next <= weekEnd
      ) {
        thisWeek++;
      }
      if (next.getMonth() === todayMonth && next.getFullYear() === now.getFullYear()) {
        thisMonth++;
      }
    } else {
      noDob++;
    }
  }

  return {
    all: rows.length,
    today,
    thisWeek,
    thisMonth,
    withDob,
    noDob,
  };
}

/** Slim active users; filter/sort in memory so birthday calendar filters stay correct. */
export async function pagedBirthdayManager(opts: {
  limit: number;
  offset: number;
  search: string;
  filter: string;
}): Promise<AdminPaged<BirthdayManagerRow> & { summary: ReturnType<typeof birthdaySummary> }> {
  const baseW = or(eq(appUsers.isActive, true), isNull(appUsers.isActive));
  const slim = await db
    .select({
      id: appUsers.id,
      name: appUsers.name,
      ocrDob: appUsers.ocrDob,
      mobileNumber: appUsers.mobileNumber,
      role: appUsers.role,
      selfPhoto: appUsers.selfPhoto,
    })
    .from(appUsers)
    .where(baseW);

  const rows: BirthdayManagerRow[] = slim.map((r) => ({
    id: r.id,
    name: r.name,
    ocrDob: r.ocrDob || null,
    mobileNumber: r.mobileNumber || null,
    role: r.role || null,
    selfPhoto: r.selfPhoto || null,
  }));

  const summary = birthdaySummary(rows);

  const s = sanitizeSearch(opts.search);
  let list = rows;
  if (s) {
    const term = s.toLowerCase();
    list = list.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        (u.mobileNumber && u.mobileNumber.includes(term)) ||
        (u.ocrDob && u.ocrDob.toLowerCase().includes(term)),
    );
  }

  list = applyBirthdayFilter(list, (opts.filter || "all").trim());

  list.sort((a, b) => {
    if (!a.ocrDob && !b.ocrDob) return a.name.localeCompare(b.name);
    if (!a.ocrDob) return 1;
    if (!b.ocrDob) return -1;
    const nextA = getNextBirthdayFromDob(a.ocrDob!).getTime();
    const nextB = getNextBirthdayFromDob(b.ocrDob!).getTime();
    return nextA - nextB;
  });

  const total = list.length;
  const items = list.slice(opts.offset, opts.offset + opts.limit);
  return { items, total, limit: opts.limit, offset: opts.offset, summary };
}

export async function pagedOfficeManagers(opts: {
  limit: number;
  offset: number;
  search: string;
}): Promise<AdminPaged<any>> {
  return pageFullTable(
    officeManagers,
    officeManagers.name,
    opts.limit,
    opts.offset,
    opts.search,
    [officeManagers.name, officeManagers.userId, officeManagers.id],
    "asc",
  );
}

export async function pagedHstcSubmissions(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const w = buildHstcWhere({
    search: opts.search,
    villageIds: opts.villageIds,
    status: opts.status,
  });

  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(hstcSubmissions).where(w);
  const items = await db
    .select(HSTC_ADMIN_LIST_SELECT)
    .from(hstcSubmissions)
    .where(w)
    .orderBy(desc(hstcSubmissions.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);

  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function sdskSubmissionsScopedStats(opts: {
  villageIds?: string[];
}): Promise<{ total: number; sukh: number; dukh: number; pending: number }> {
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  const scopeParts: SQL[] = [];
  if (vids.length > 0) {
    scopeParts.push(inArray(sdskSubmissions.selectedVillageId, vids));
  }
  const scopeW = scopeParts.length ? and(...scopeParts) : undefined;
  const [totalRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sdskSubmissions)
    .where(scopeW);
  const [sukhRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sdskSubmissions)
    .where(and(...(scopeW ? [scopeW, eq(sdskSubmissions.type, "sukh")] : [eq(sdskSubmissions.type, "sukh")])));
  const [dukhRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sdskSubmissions)
    .where(and(...(scopeW ? [scopeW, eq(sdskSubmissions.type, "dukh")] : [eq(sdskSubmissions.type, "dukh")])));
  const [pendingRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sdskSubmissions)
    .where(and(...(scopeW ? [scopeW, eq(sdskSubmissions.status, "pending")] : [eq(sdskSubmissions.status, "pending")])));
  return {
    total: Number(totalRow?.n ?? 0),
    sukh: Number(sukhRow?.n ?? 0),
    dukh: Number(dukhRow?.n ?? 0),
    pending: Number(pendingRow?.n ?? 0),
  };
}

export async function pagedSdskSubmissions(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  type?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(sdskSubmissions.personName, `%${s}%`),
        ilike(sdskSubmissions.mobileNumber, `%${s}%`),
        ilike(sdskSubmissions.selectedVillageName, `%${s}%`),
        ilike(sdskSubmissions.description, `%${s}%`),
        ilike(sdskSubmissions.id, `%${s}%`),
        ilike(sdskSubmissions.categoryName, `%${s}%`),
      ),
    );
  }
  const tp = (opts.type || "all").trim();
  if (tp && tp !== "all") {
    parts.push(eq(sdskSubmissions.type, tp));
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(sdskSubmissions.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(sdskSubmissions.selectedVillageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(sdskSubmissions).where(w);
  const items = await db
    .select()
    .from(sdskSubmissions)
    .where(w)
    .orderBy(desc(sdskSubmissions.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function pagedSunwaiComplaints(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(sunwaiComplaints.complainantName, `%${s}%`),
        ilike(sunwaiComplaints.mobileNumber, `%${s}%`),
        ilike(sunwaiComplaints.villageName, `%${s}%`),
        ilike(sunwaiComplaints.complaintNote, `%${s}%`),
        ilike(sunwaiComplaints.id, `%${s}%`),
        ilike(sunwaiComplaints.otherCategoryText, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(sunwaiComplaints.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(sunwaiComplaints.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(sunwaiComplaints).where(w);
  const items = await db
    .select()
    .from(sunwaiComplaints)
    .where(w)
    .orderBy(desc(sunwaiComplaints.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function sunwaiComplaintsScopedStats(opts: {
  villageIds?: string[];
}): Promise<{ total: number; pending: number; accepted: number; completed: number }> {
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  const scopeParts: SQL[] = [];
  if (vids.length > 0) {
    scopeParts.push(inArray(sunwaiComplaints.villageId, vids));
  }
  const scopeW = scopeParts.length ? and(...scopeParts) : undefined;
  const [totalRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sunwaiComplaints)
    .where(scopeW);
  const [pendingRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sunwaiComplaints)
    .where(and(...(scopeW ? [scopeW, eq(sunwaiComplaints.status, "pending")] : [eq(sunwaiComplaints.status, "pending")])));
  const [acceptedRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sunwaiComplaints)
    .where(and(...(scopeW ? [scopeW, eq(sunwaiComplaints.status, "accepted")] : [eq(sunwaiComplaints.status, "accepted")])));
  const [completedRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sunwaiComplaints)
    .where(and(...(scopeW ? [scopeW, eq(sunwaiComplaints.status, "completed")] : [eq(sunwaiComplaints.status, "completed")])));
  return {
    total: Number(totalRow?.n ?? 0),
    pending: Number(pendingRow?.n ?? 0),
    accepted: Number(acceptedRow?.n ?? 0),
    completed: Number(completedRow?.n ?? 0),
  };
}

/** BLA admin list without document image blobs. */
const BLA_ADMIN_LIST_SELECT = {
  id: blaSubmissions.id,
  appUserId: blaSubmissions.appUserId,
  villageId: blaSubmissions.villageId,
  villageName: blaSubmissions.villageName,
  bloName: blaSubmissions.bloName,
  bloMobileNumber: blaSubmissions.bloMobileNumber,
  bloMobileVerified: blaSubmissions.bloMobileVerified,
  ocrAadhaarName: blaSubmissions.ocrAadhaarName,
  ocrAadhaarNumber: blaSubmissions.ocrAadhaarNumber,
  ocrAadhaarDob: blaSubmissions.ocrAadhaarDob,
  ocrAadhaarGender: blaSubmissions.ocrAadhaarGender,
  ocrAadhaarAddress: blaSubmissions.ocrAadhaarAddress,
  ocrVoterId: blaSubmissions.ocrVoterId,
  ocrVoterName: blaSubmissions.ocrVoterName,
  voterMappingBoothId: blaSubmissions.voterMappingBoothId,
  voterMappingName: blaSubmissions.voterMappingName,
  voterMappingFatherName: blaSubmissions.voterMappingFatherName,
  voterMappingVillageName: blaSubmissions.voterMappingVillageName,
  manualBoothId: blaSubmissions.manualBoothId,
  createdAt: blaSubmissions.createdAt,
} as const;

export async function pagedBlaSubmissions(opts: {
  limit: number;
  offset: number;
  search: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(blaSubmissions.bloName, `%${s}%`),
        ilike(blaSubmissions.bloMobileNumber, `%${s}%`),
        ilike(blaSubmissions.villageName, `%${s}%`),
        ilike(blaSubmissions.ocrVoterId, `%${s}%`),
        ilike(blaSubmissions.id, `%${s}%`),
      ),
    );
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(blaSubmissions.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(blaSubmissions).where(w);
  const items = await db
    .select(BLA_ADMIN_LIST_SELECT)
    .from(blaSubmissions)
    .where(w)
    .orderBy(desc(blaSubmissions.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function pagedRoadReports(opts: {
  limit: number;
  offset: number;
  search: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(roadReports.reporterName, `%${s}%`),
        ilike(roadReports.mobileNumber, `%${s}%`),
        ilike(roadReports.villageName, `%${s}%`),
        ilike(roadReports.description, `%${s}%`),
        ilike(roadReports.id, `%${s}%`),
      ),
    );
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(roadReports.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(roadReports).where(w);
  const items = await db
    .select()
    .from(roadReports)
    .where(w)
    .orderBy(desc(roadReports.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

const OUTDOOR_AD_ADMIN_LIST_SELECT = {
  id: outdoorAdSubmissions.id,
  appUserId: outdoorAdSubmissions.appUserId,
  villageId: outdoorAdSubmissions.villageId,
  villageName: outdoorAdSubmissions.villageName,
  ownerName: outdoorAdSubmissions.ownerName,
  mobileNumber: outdoorAdSubmissions.mobileNumber,
  mobileVerified: outdoorAdSubmissions.mobileVerified,
  wallSize: outdoorAdSubmissions.wallSize,
  frameType: outdoorAdSubmissions.frameType,
  latitude: outdoorAdSubmissions.latitude,
  longitude: outdoorAdSubmissions.longitude,
  locationAddress: outdoorAdSubmissions.locationAddress,
  status: outdoorAdSubmissions.status,
  adminNote: outdoorAdSubmissions.adminNote,
  approvedAt: outdoorAdSubmissions.approvedAt,
  createdAt: outdoorAdSubmissions.createdAt,
} as const;

export async function pagedOutdoorAds(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(outdoorAdSubmissions.ownerName, `%${s}%`),
        ilike(outdoorAdSubmissions.mobileNumber, `%${s}%`),
        ilike(outdoorAdSubmissions.villageName, `%${s}%`),
        ilike(outdoorAdSubmissions.id, `%${s}%`),
        ilike(outdoorAdSubmissions.locationAddress, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(outdoorAdSubmissions.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(outdoorAdSubmissions.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(outdoorAdSubmissions).where(w);
  const items = await db
    .select(OUTDOOR_AD_ADMIN_LIST_SELECT)
    .from(outdoorAdSubmissions)
    .where(w)
    .orderBy(desc(outdoorAdSubmissions.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function outdoorAdStatusCounts(villageIds?: string[]): Promise<{ pending: number; approved: number; total: number }> {
  const vids = villageIds?.filter(Boolean) ?? [];
  const w = vids.length > 0 ? inArray(outdoorAdSubmissions.villageId, vids) : undefined;
  const rows = await db
    .select({ status: outdoorAdSubmissions.status, n: sql<number>`count(*)::int` })
    .from(outdoorAdSubmissions)
    .where(w)
    .groupBy(outdoorAdSubmissions.status);
  const out = { pending: 0, approved: 0, total: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    out.total += n;
    const k = String(r.status || "").toLowerCase();
    if (k === "pending") out.pending = n;
    else if (k === "approved") out.approved = n;
  }
  return out;
}

export async function govSchoolStatusCounts(villageIds?: string[]): Promise<{
  pending: number;
  accepted: number;
  resolved: number;
  total: number;
}> {
  const vids = villageIds?.filter(Boolean) ?? [];
  const w = vids.length > 0 ? inArray(govSchoolSubmissions.villageId, vids) : undefined;
  const rows = await db
    .select({ status: govSchoolSubmissions.status, n: sql<number>`count(*)::int` })
    .from(govSchoolSubmissions)
    .where(w)
    .groupBy(govSchoolSubmissions.status);
  const out = { pending: 0, accepted: 0, resolved: 0, total: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    out.total += n;
    const k = String(r.status || "").toLowerCase();
    if (k === "pending") out.pending = n;
    else if (k === "accepted") out.accepted = n;
    else if (k === "resolved") out.resolved = n;
  }
  return out;
}

export async function appointmentStatusCounts(villageIds?: string[]): Promise<{
  pending: number;
  scheduled: number;
  resolved: number;
  total: number;
}> {
  const vids = villageIds?.filter(Boolean) ?? [];
  const w = vids.length > 0 ? inArray(appointments.villageId, vids) : undefined;
  const rows = await db
    .select({ status: appointments.status, n: sql<number>`count(*)::int` })
    .from(appointments)
    .where(w)
    .groupBy(appointments.status);
  const out = { pending: 0, scheduled: 0, resolved: 0, total: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    out.total += n;
    const k = String(r.status || "").toLowerCase();
    if (k === "pending") out.pending = n;
    else if (k === "scheduled") out.scheduled = n;
    else if (k === "resolved") out.resolved = n;
  }
  return out;
}

export async function roadReportsScopeStats(villageIds?: string[]): Promise<{
  distinctUnits: number;
  latestCreatedAt: Date | string | null;
}> {
  const vids = villageIds?.filter(Boolean) ?? [];
  const w = vids.length > 0 ? inArray(roadReports.villageId, vids) : undefined;
  const [distRow] = await db
    .select({
      n: sql<number>`count(distinct concat(coalesce(${roadReports.villageId}, ''), '|', coalesce(${roadReports.villageName}, '')))::int`,
    })
    .from(roadReports)
    .where(w);
  const [latest] = await db
    .select({ createdAt: roadReports.createdAt })
    .from(roadReports)
    .where(w)
    .orderBy(desc(roadReports.createdAt))
    .limit(1);
  return {
    distinctUnits: Number(distRow?.n ?? 0),
    latestCreatedAt: latest?.createdAt ?? null,
  };
}

export async function nvyReportsScopeStats(villageIds?: string[]): Promise<{
  distinctUnits: number;
  latestCreatedAt: Date | string | null;
}> {
  const vids = villageIds?.filter(Boolean) ?? [];
  const w = vids.length > 0 ? inArray(nvyReports.villageId, vids) : undefined;
  const [distRow] = await db
    .select({
      n: sql<number>`count(distinct concat(coalesce(${nvyReports.villageId}, ''), '|', coalesce(${nvyReports.villageName}, '')))::int`,
    })
    .from(nvyReports)
    .where(w);
  const [latest] = await db
    .select({ createdAt: nvyReports.createdAt })
    .from(nvyReports)
    .where(w)
    .orderBy(desc(nvyReports.createdAt))
    .limit(1);
  return {
    distinctUnits: Number(distRow?.n ?? 0),
    latestCreatedAt: latest?.createdAt ?? null,
  };
}

const GOV_SCHOOL_ADMIN_LIST_SELECT = {
  id: govSchoolSubmissions.id,
  appUserId: govSchoolSubmissions.appUserId,
  villageId: govSchoolSubmissions.villageId,
  villageName: govSchoolSubmissions.villageName,
  mobileNumber: govSchoolSubmissions.mobileNumber,
  mobileVerified: govSchoolSubmissions.mobileVerified,
  schoolName: govSchoolSubmissions.schoolName,
  principalName: govSchoolSubmissions.principalName,
  principalMobile: govSchoolSubmissions.principalMobile,
  issueCategoryId: govSchoolSubmissions.issueCategoryId,
  issueCategoryName: govSchoolSubmissions.issueCategoryName,
  issueCategoryIds: govSchoolSubmissions.issueCategoryIds,
  issueCategoryNames: govSchoolSubmissions.issueCategoryNames,
  nodalVolunteerName: govSchoolSubmissions.nodalVolunteerName,
  nodalVolunteerMobile: govSchoolSubmissions.nodalVolunteerMobile,
  description: govSchoolSubmissions.description,
  latitude: govSchoolSubmissions.latitude,
  longitude: govSchoolSubmissions.longitude,
  locationAddress: govSchoolSubmissions.locationAddress,
  status: govSchoolSubmissions.status,
  adminNote: govSchoolSubmissions.adminNote,
  completionNote: govSchoolSubmissions.completionNote,
  acceptedAt: govSchoolSubmissions.acceptedAt,
  completedAt: govSchoolSubmissions.completedAt,
  createdAt: govSchoolSubmissions.createdAt,
} as const;

export async function pagedGovSchoolSubmissions(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(govSchoolSubmissions.principalName, `%${s}%`),
        ilike(govSchoolSubmissions.schoolName, `%${s}%`),
        ilike(govSchoolSubmissions.mobileNumber, `%${s}%`),
        ilike(govSchoolSubmissions.villageName, `%${s}%`),
        ilike(govSchoolSubmissions.id, `%${s}%`),
        ilike(govSchoolSubmissions.description, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(govSchoolSubmissions.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(govSchoolSubmissions.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(govSchoolSubmissions).where(w);
  const items = await db
    .select(GOV_SCHOOL_ADMIN_LIST_SELECT)
    .from(govSchoolSubmissions)
    .where(w)
    .orderBy(desc(govSchoolSubmissions.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

const APPOINTMENT_ADMIN_LIST_SELECT = {
  id: appointments.id,
  appUserId: appointments.appUserId,
  villageId: appointments.villageId,
  villageName: appointments.villageName,
  personName: appointments.personName,
  fatherHusbandName: appointments.fatherHusbandName,
  mobileNumber: appointments.mobileNumber,
  mobileVerified: appointments.mobileVerified,
  address: appointments.address,
  description: appointments.description,
  status: appointments.status,
  appointmentDate: appointments.appointmentDate,
  adminNote: appointments.adminNote,
  completionNote: appointments.completionNote,
  scheduledAt: appointments.scheduledAt,
  resolvedAt: appointments.resolvedAt,
  createdAt: appointments.createdAt,
} as const;

export async function pagedAppointments(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(appointments.personName, `%${s}%`),
        ilike(appointments.mobileNumber, `%${s}%`),
        ilike(appointments.villageName, `%${s}%`),
        ilike(appointments.description, `%${s}%`),
        ilike(appointments.id, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(appointments.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(appointments.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(appointments).where(w);
  const items = await db
    .select(APPOINTMENT_ADMIN_LIST_SELECT)
    .from(appointments)
    .where(w)
    .orderBy(desc(appointments.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function pagedEventVenues(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(eventVenues.requesterName, `%${s}%`),
        ilike(eventVenues.mobileNumber, `%${s}%`),
        ilike(eventVenues.venueName, `%${s}%`),
        ilike(eventVenues.villageName, `%${s}%`),
        ilike(eventVenues.id, `%${s}%`),
        ilike(eventVenues.notes, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(eventVenues.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(eventVenues.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(eventVenues).where(w);
  const items = await db
    .select()
    .from(eventVenues)
    .where(w)
    .orderBy(desc(eventVenues.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

const TIRTH_ADMIN_LIST_SELECT = {
  id: tirthYatraRequests.id,
  appUserId: tirthYatraRequests.appUserId,
  villageId: tirthYatraRequests.villageId,
  villageName: tirthYatraRequests.villageName,
  applicantName: tirthYatraRequests.applicantName,
  mobileNumber: tirthYatraRequests.mobileNumber,
  mobileVerified: tirthYatraRequests.mobileVerified,
  dob: tirthYatraRequests.dob,
  age: tirthYatraRequests.age,
  gender: tirthYatraRequests.gender,
  withFamily: tirthYatraRequests.withFamily,
  currentLocationLabel: tirthYatraRequests.currentLocationLabel,
  currentLatitude: tirthYatraRequests.currentLatitude,
  currentLongitude: tirthYatraRequests.currentLongitude,
  destination: tirthYatraRequests.destination,
  destinationOther: tirthYatraRequests.destinationOther,
  startDate: tirthYatraRequests.startDate,
  endDate: tirthYatraRequests.endDate,
  ocrVoterId: tirthYatraRequests.ocrVoterId,
  status: tirthYatraRequests.status,
  adminNote: tirthYatraRequests.adminNote,
  createdAt: tirthYatraRequests.createdAt,
  updatedAt: tirthYatraRequests.updatedAt,
} as const;

export async function pagedTirthYatraRequests(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(tirthYatraRequests.applicantName, `%${s}%`),
        ilike(tirthYatraRequests.mobileNumber, `%${s}%`),
        ilike(tirthYatraRequests.villageName, `%${s}%`),
        ilike(tirthYatraRequests.destination, `%${s}%`),
        ilike(tirthYatraRequests.destinationOther, `%${s}%`),
        ilike(tirthYatraRequests.ocrVoterId, `%${s}%`),
        ilike(tirthYatraRequests.id, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(tirthYatraRequests.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(tirthYatraRequests.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(tirthYatraRequests).where(w);
  const items = await db
    .select(TIRTH_ADMIN_LIST_SELECT)
    .from(tirthYatraRequests)
    .where(w)
    .orderBy(desc(tirthYatraRequests.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

const MAHILA_PUNJAB_ADMIN_LIST_SELECT = {
  id: mahilaSammanPunjabSubmissions.id,
  appUserId: mahilaSammanPunjabSubmissions.appUserId,
  villageId: mahilaSammanPunjabSubmissions.villageId,
  villageName: mahilaSammanPunjabSubmissions.villageName,
  name: mahilaSammanPunjabSubmissions.name,
  mobileNumber: mahilaSammanPunjabSubmissions.mobileNumber,
  mobileVerified: mahilaSammanPunjabSubmissions.mobileVerified,
  fatherHusbandName: mahilaSammanPunjabSubmissions.fatherHusbandName,
  ocrAadhaarName: mahilaSammanPunjabSubmissions.ocrAadhaarName,
  ocrAadhaarNumber: mahilaSammanPunjabSubmissions.ocrAadhaarNumber,
  ocrAadhaarDob: mahilaSammanPunjabSubmissions.ocrAadhaarDob,
  ocrAadhaarGender: mahilaSammanPunjabSubmissions.ocrAadhaarGender,
  ocrAadhaarAddress: mahilaSammanPunjabSubmissions.ocrAadhaarAddress,
  aadhaarVerifiedSameAsVoter: mahilaSammanPunjabSubmissions.aadhaarVerifiedSameAsVoter,
  ocrVoterId: mahilaSammanPunjabSubmissions.ocrVoterId,
  ocrVoterName: mahilaSammanPunjabSubmissions.ocrVoterName,
  voterMappingBoothId: mahilaSammanPunjabSubmissions.voterMappingBoothId,
  voterMappingName: mahilaSammanPunjabSubmissions.voterMappingName,
  voterMappingFatherName: mahilaSammanPunjabSubmissions.voterMappingFatherName,
  voterMappingVillageName: mahilaSammanPunjabSubmissions.voterMappingVillageName,
  manualBoothId: mahilaSammanPunjabSubmissions.manualBoothId,
  category: mahilaSammanPunjabSubmissions.category,
  declarationChecked: mahilaSammanPunjabSubmissions.declarationChecked,
  status: mahilaSammanPunjabSubmissions.status,
  adminNote: mahilaSammanPunjabSubmissions.adminNote,
  createdAt: mahilaSammanPunjabSubmissions.createdAt,
  updatedAt: mahilaSammanPunjabSubmissions.updatedAt,
} as const;

export async function pagedMahilaPunjabSubmissions(opts: {
  limit: number;
  offset: number;
  search: string;
  status?: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(mahilaSammanPunjabSubmissions.name, `%${s}%`),
        ilike(mahilaSammanPunjabSubmissions.mobileNumber, `%${s}%`),
        ilike(mahilaSammanPunjabSubmissions.villageName, `%${s}%`),
        ilike(mahilaSammanPunjabSubmissions.ocrVoterId, `%${s}%`),
        ilike(mahilaSammanPunjabSubmissions.id, `%${s}%`),
      ),
    );
  }
  const st = (opts.status || "all").trim();
  if (st && st !== "all") {
    parts.push(eq(mahilaSammanPunjabSubmissions.status, st));
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(mahilaSammanPunjabSubmissions.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(mahilaSammanPunjabSubmissions)
    .where(w);
  const items = await db
    .select(MAHILA_PUNJAB_ADMIN_LIST_SELECT)
    .from(mahilaSammanPunjabSubmissions)
    .where(w)
    .orderBy(desc(mahilaSammanPunjabSubmissions.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}

export async function pagedVoterRegistrationSubmissions(opts: {
  limit: number;
  offset: number;
  search: string;
}): Promise<AdminPaged<any>> {
  return pageFullTable(
    voterRegistrationSubmissions,
    voterRegistrationSubmissions.createdAt,
    opts.limit,
    opts.offset,
    opts.search,
    [
      voterRegistrationSubmissions.firstName,
      voterRegistrationSubmissions.lastName,
      voterRegistrationSubmissions.mobileNumber,
      voterRegistrationSubmissions.email,
      voterRegistrationSubmissions.id,
      voterRegistrationSubmissions.assemblyConstituency,
    ],
  );
}

const NVY_ADMIN_LIST_SELECT = {
  id: nvyReports.id,
  appUserId: nvyReports.appUserId,
  villageId: nvyReports.villageId,
  villageName: nvyReports.villageName,
  description: nvyReports.description,
  latitude: nvyReports.latitude,
  longitude: nvyReports.longitude,
  locationAddress: nvyReports.locationAddress,
  createdAt: nvyReports.createdAt,
} as const;

export async function pagedNvyReports(opts: {
  limit: number;
  offset: number;
  search: string;
  villageIds?: string[];
}): Promise<AdminPaged<any>> {
  const s = sanitizeSearch(opts.search);
  const parts: (SQL | undefined)[] = [];
  if (s) {
    parts.push(
      or(
        ilike(nvyReports.villageName, `%${s}%`),
        ilike(nvyReports.description, `%${s}%`),
        ilike(nvyReports.locationAddress, `%${s}%`),
        ilike(nvyReports.id, `%${s}%`),
      ),
    );
  }
  const vids = opts.villageIds?.filter(Boolean) ?? [];
  if (vids.length > 0) {
    parts.push(inArray(nvyReports.villageId, vids));
  }
  const w = and(...parts.filter(Boolean)) as SQL | undefined;
  const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(nvyReports).where(w);
  const items = await db
    .select(NVY_ADMIN_LIST_SELECT)
    .from(nvyReports)
    .where(w)
    .orderBy(desc(nvyReports.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: Number(countRow?.n ?? 0), limit: opts.limit, offset: opts.offset };
}
