import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Levels for hierarchy
export const LEVELS = ["State", "Zone", "District", "Halka", "Block", "Village/Ward"] as const;
export type Level = typeof LEVELS[number];

// Wing options
export const WINGS = ["Main", "Youth", "Mahilla", "SC", "BC", "Kisan", "NMM", "Other"] as const;
export type WingType = typeof WINGS[number];

// Volunteer categories
export const VOLUNTEER_CATEGORIES = ["Active", "Inactive", "VIP"] as const;
export type VolunteerCategory = typeof VOLUNTEER_CATEGORIES[number];

// Master Tables

export const villages = pgTable("villages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  zone: text("zone"),
  district: text("district"),
  halka: text("halka"),
  blockNumber: text("block_number"),
  isActive: boolean("is_active").default(true),
});

export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
});

export const wings = pgTable("wings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  isActive: boolean("is_active").default(true),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const govWings = pgTable("gov_wings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  isActive: boolean("is_active").default(true),
});

export const ROLE_TYPES = ["party_post_holder", "govt_post_holder", "both"] as const;
export type RoleType = typeof ROLE_TYPES[number];

export const govPositions = pgTable("gov_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  isActive: boolean("is_active").default(true),
});

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
});

export const leadershipFlags = pgTable("leadership_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").default("#3b82f6"),
  isActive: boolean("is_active").default(true),
});

// Login Page Config (admin-editable image, name, slogan on login/welcome screen)
export const loginPageConfig = pgTable("login_page_config", {
  id: varchar("id").primaryKey().default("default"),
  imageUrl: text("image_url"),
  ministerName: text("minister_name").default("Dr. Balbir Singh"),
  ministerTitle: text("minister_title").default("Health Minister, Punjab Government"),
  slogan: text("slogan").default("Sewa, Sunwai, Samman, Sangathan, Suraksha, Sangharsh"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Roles
export const adminRoles = pgTable("admin_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  permissions: text("permissions").array().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users (Admin)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("admin"),
  roleId: varchar("role_id").references(() => adminRoles.id),
  twoFaEnabled: boolean("two_fa_enabled").default(false),
  twoFaSecret: text("two_fa_secret"),
});

// Office Managers
export const officeManagers = pgTable("office_managers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  userId: text("user_id").notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(true),
  roleId: varchar("role_id").references(() => adminRoles.id),
  assignedVillages: text("assigned_villages").array(),
  twoFaEnabled: boolean("two_fa_enabled").default(false),
  twoFaSecret: text("two_fa_secret"),
});

// Volunteers
export const volunteers = pgTable("volunteers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  photo: text("photo"),
  wingId: varchar("wing_id").references(() => wings.id),
  positionId: varchar("position_id").references(() => positions.id),
  voterId: text("voter_id"),
  villageId: varchar("village_id").references(() => villages.id),
  wardName: text("ward_name"),
  address: text("address"),
  dateOfBirth: date("date_of_birth"),
  dateOfAnniversary: date("date_of_anniversary"),
  age: integer("age"),
  occupation: text("occupation"),
  qualification: text("qualification"),
  gender: text("gender"),
  mobileNumber: text("mobile_number").notNull().unique(),
  pin: text("pin").default("1234"),
  leadershipFlagId: varchar("leadership_flag_id").references(() => leadershipFlags.id),
  isActive: boolean("is_active").default(true),
});

// Volunteer Family Members
export const familyMembers = pgTable("family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  volunteerId: varchar("volunteer_id").references(() => volunteers.id).notNull(),
  name: text("name").notNull(),
  relation: text("relation"),
  voterId: text("voter_id"),
  age: integer("age"),
  gender: text("gender"),
});

// Office Visitors
export const visitors = pgTable("visitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  photo: text("photo"),
  villageId: varchar("village_id").references(() => villages.id),
  issueId: varchar("issue_id").references(() => issues.id),
  mobileNumber: text("mobile_number").notNull(),
  documents: text("documents").array(),
  voterId: text("voter_id"),
  aadharNo: text("aadhar_no"),
  departmentId: varchar("department_id").references(() => departments.id),
  isSolved: boolean("is_solved").default(false),
  notSolvedReason: text("not_solved_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Volunteer Visits
export const volunteerVisits = pgTable("volunteer_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  volunteerId: varchar("volunteer_id").references(() => volunteers.id).notNull(),
  villageId: varchar("village_id").references(() => villages.id),
  visitType: text("visit_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// App Users (Volunteer Portal - Email OTP Auth)
export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mobileNumber: text("mobile_number").unique(),
  email: text("email").unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // "volunteer" or "party_post_holder"
  roleType: text("role_type"), // "party_post_holder", "govt_post_holder", "both"
  voterId: text("voter_id"),
  aadhaarNumber: text("aadhaar_number"),
  // Party Post Holder specific fields
  currentPosition: text("current_position"),
  level: text("level"), // State, Zone, District, Halka, Block, Village/Ward
  mappedAreaId: varchar("mapped_area_id"),
  mappedAreaName: text("mapped_area_name"),
  mappedZone: text("mapped_zone"),
  mappedDistrict: text("mapped_district"),
  mappedHalka: text("mapped_halka"),
  mappedBlockNumber: text("mapped_block_number"),
  wing: text("wing"),
  otherWingName: text("other_wing_name"),
  govWing: text("gov_wing"),
  govPositionId: varchar("gov_position_id"),
  jurisdictionVillageIds: text("jurisdiction_village_ids").array(),
  selfPhoto: text("self_photo"),
  aadhaarPhoto: text("aadhaar_photo"),
  aadhaarPhotoBack: text("aadhaar_photo_back"),
  voterCardPhoto: text("voter_card_photo"),
  voterCardPhotoBack: text("voter_card_photo_back"),
  // OCR-extracted data
  ocrName: text("ocr_name"),
  ocrAadhaarNumber: text("ocr_aadhaar_number"),
  ocrVoterId: text("ocr_voter_id"),
  ocrDob: text("ocr_dob"),
  ocrGender: text("ocr_gender"),
  ocrAddress: text("ocr_address"),
  registrationSource: text("registration_source").default("email_otp"),
  isActive: boolean("is_active").default(true),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// CSCs / Camps
export const cscs = pgTable("cscs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  villageId: varchar("village_id").references(() => villages.id),
  isActive: boolean("is_active").default(true),
});

// CSC Reports
export const cscReports = pgTable("csc_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cscId: varchar("csc_id").references(() => cscs.id).notNull(),
  appUserId: varchar("app_user_id").references(() => appUsers.id).notNull(),
  status: text("status").notNull(), // "working" or "not_working"
  notWorkingReason: text("not_working_reason"), // closed, equipment, server, technical, other
  otherReason: text("other_reason"),
  villageId: varchar("village_id").references(() => villages.id),
  selectedVillageId: varchar("selected_village_id"),
  selectedVillageName: text("selected_village_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mapped Volunteers (Added via Volunteer Mapping task)
export const mappedVolunteers = pgTable("mapped_volunteers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  addedByUserId: varchar("added_by_user_id").references(() => appUsers.id).notNull(),
  name: text("name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  category: text("category").notNull(), // Active, Inactive, VIP
  voterId: text("voter_id"),
  aadhaarPhoto: text("aadhaar_photo"),
  aadhaarPhotoBack: text("aadhaar_photo_back"),
  voterCardPhoto: text("voter_card_photo"),
  voterCardPhotoBack: text("voter_card_photo_back"),
  // OCR-extracted data
  ocrName: text("ocr_name"),
  ocrAadhaarNumber: text("ocr_aadhaar_number"),
  ocrVoterId: text("ocr_voter_id"),
  ocrDob: text("ocr_dob"),
  ocrGender: text("ocr_gender"),
  ocrAddress: text("ocr_address"),
  isVerified: boolean("is_verified").default(false), // OTP verified for Active
  selectedVillageId: varchar("selected_village_id"),
  selectedVillageName: text("selected_village_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Supporters
export const supporters = pgTable("supporters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  addedByUserId: varchar("added_by_user_id").references(() => appUsers.id).notNull(),
  name: text("name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  voterId: text("voter_id"),
  aadhaarPhoto: text("aadhaar_photo"),
  aadhaarPhotoBack: text("aadhaar_photo_back"),
  voterCardPhoto: text("voter_card_photo"),
  voterCardPhotoBack: text("voter_card_photo_back"),
  // OCR-extracted data
  ocrName: text("ocr_name"),
  ocrAadhaarNumber: text("ocr_aadhaar_number"),
  ocrVoterId: text("ocr_voter_id"),
  ocrDob: text("ocr_dob"),
  ocrGender: text("ocr_gender"),
  ocrAddress: text("ocr_address"),
  selectedVillageId: varchar("selected_village_id"),
  selectedVillageName: text("selected_village_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ===== SDUI (Server-Driven UI) Configuration =====

// Task Categories - Group tasks on user dashboard
export const taskCategories = pgTable("task_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  fixedTaskSlugs: text("fixed_task_slugs").array().default(sql`'{}'`),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task Configurations - Admin defines tasks
export const taskConfigs = pgTable("task_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => taskCategories.id),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  description: text("description"),
  descriptionHi: text("description_hi"),
  descriptionPa: text("description_pa"),
  icon: text("icon").default("ClipboardList"),
  color: text("color").default("#3b82f6"),
  isEnabled: boolean("is_enabled").default(true),
  sortOrder: integer("sort_order").default(0),
  villageRestricted: boolean("village_restricted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Form Fields - Dynamic fields per task or profile
export const FIELD_TYPES = ["text", "number", "phone", "email", "textarea", "dropdown", "multi_select", "date", "photo", "toggle", "radio"] as const;
export type FieldType = typeof FIELD_TYPES[number];

export const formFields = pgTable("form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskConfigId: varchar("task_config_id").references(() => taskConfigs.id),
  formType: text("form_type").default("task"),
  label: text("label").notNull(),
  labelHi: text("label_hi"),
  labelPa: text("label_pa"),
  fieldKey: text("field_key").notNull(),
  fieldType: text("field_type").notNull(),
  placeholder: text("placeholder"),
  placeholderHi: text("placeholder_hi"),
  placeholderPa: text("placeholder_pa"),
  isRequired: boolean("is_required").default(false),
  sortOrder: integer("sort_order").default(0),
  validationRules: text("validation_rules"),
  defaultValue: text("default_value"),
  isActive: boolean("is_active").default(true),
});

// Field Options - For dropdowns and radio buttons
export const fieldOptions = pgTable("field_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formFieldId: varchar("form_field_id").references(() => formFields.id).notNull(),
  label: text("label").notNull(),
  labelHi: text("label_hi"),
  labelPa: text("label_pa"),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Field Conditions - Conditional logic
export const fieldConditions = pgTable("field_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formFieldId: varchar("form_field_id").references(() => formFields.id).notNull(),
  dependsOnFieldId: varchar("depends_on_field_id").references(() => formFields.id).notNull(),
  operator: text("operator").notNull(),
  value: text("value").notNull(),
});

// Task Submissions - Generic data store
export const taskSubmissions = pgTable("task_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskConfigId: varchar("task_config_id").references(() => taskConfigs.id).notNull(),
  appUserId: varchar("app_user_id").references(() => appUsers.id).notNull(),
  data: text("data").notNull(),
  selectedVillageId: varchar("selected_village_id"),
  selectedVillageName: text("selected_village_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Additional Roles (for PPH with multiple role assignments)
export const userAdditionalRoles = pgTable("user_additional_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").references(() => appUsers.id).notNull(),
  wing: text("wing"),
  position: text("position"),
  customPosition: text("custom_position"),
  level: text("level"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Voter Mapping Master (imported from Google Sheet / CSV: BoothId, Name, Father's Name, Gender, Age, Voter ID, Village Name)
export const voterMappingMaster = pgTable("voter_mapping_master", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slNo: integer("sl_no"),
  boothId: text("booth_id"),
  name: text("name"),
  fatherName: text("father_name"),
  houseNumber: text("house_number"),
  gender: text("gender"),
  age: text("age"),
  voterId: text("voter_id").notNull(),
  villageName: text("village_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoterMappingMasterSchema = createInsertSchema(voterMappingMaster).omit({ id: true, createdAt: true });
export type VoterMappingMaster = typeof voterMappingMaster.$inferSelect;
export type InsertVoterMappingMaster = z.infer<typeof insertVoterMappingMasterSchema>;

// Voter List (imported from CSV)
export const voterList = pgTable("voter_list", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assemblyNo: text("assembly_no"),
  partNo: text("part_no"),
  srno: text("srno"),
  boothId: text("booth_id"),
  draftSrno: text("draft_srno"),
  localLastName: text("l_last_name"),
  localFirstName: text("l_first_name"),
  localMiddleName: text("l_middle_name"),
  engLastName: text("e_last_name"),
  engFirstName: text("e_first_name"),
  engMiddleName: text("e_middle_name"),
  sex: text("sex"),
  age: text("age"),
  vcardId: text("vcard_id"),
  houseNo: text("house_no"),
  localVillage: text("l_village"),
  engVillage: text("e_village"),
  localTaluka: text("l_taluka"),
  engTaluka: text("e_taluka"),
  localAssemblyName: text("l_assembly_name"),
  engAssemblyName: text("e_assembly_name"),
  localAddress: text("l_address"),
  engAddress: text("e_address"),
  boothNo: text("booth_no"),
  localBoothAddress: text("l_booth_address"),
  engBoothAddress: text("e_booth_address"),
  localNewAddress: text("l_new_address"),
  engNewAddress: text("e_new_address"),
  repeated: text("repeated"),
  repeatedNo: text("repeated_no"),
  dead: text("dead"),
  type: text("type"),
  vtype: text("vtype"),
  addressChange: text("address_change"),
  familyId: text("family_id"),
  karykartaNo: text("karykarta_no"),
  important: text("important"),
  color: text("color"),
  voted: text("voted"),
  dob: text("dob"),
  mobileNo1: text("mobile_no1"),
  mobileNo2: text("mobile_no2"),
  emailId: text("email_id"),
  localCastName: text("l_cast_name"),
  engCastName: text("e_cast_name"),
  localProfessionName: text("l_profession_name"),
  engProfessionName: text("e_profession_name"),
  demands: text("demands"),
  society: text("society"),
  flatNo: text("flat_no"),
  extraInfo1: text("extra_info1"),
  extraInfo2: text("extra_info2"),
  extraCheck1: text("extra_check1"),
  extraCheck2: text("extra_check2"),
  localGat: text("l_gat"),
  engGat: text("e_gat"),
  localGan: text("l_gan"),
  engGan: text("e_gan"),
  assemblyMapping: text("assembly_mapping"),
  fullName: text("full_name"),
  karyakarta1: text("karyakarta1"),
  extraInfo3: text("extra_info3"),
  extraInfo4: text("extra_info4"),
  extraInfo5: text("extra_info5"),
  printed: text("printed"),
  printedBy: text("printed_by"),
  votedBy: text("voted_by"),
});

// Push Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat: single "all users" group (WhatsApp-style), admin-controlled, new users auto-added
export const chatGroups = pgTable("chat_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("Rural Connect Hub"),
  isAllUsersGroup: boolean("is_all_users_group").default(false),
  createdById: varchar("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => chatGroups.id, { onDelete: "cascade" }),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const groupMessages = pgTable("group_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => chatGroups.id, { onDelete: "cascade" }),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  text: text("text"),
  imageUrl: text("image_url"),
  audioUrl: text("audio_url"),
  replyToMessageId: varchar("reply_to_message_id"),
  deletedAt: timestamp("deleted_at"),
  deletedForEveryone: boolean("deleted_for_everyone").default(false),
  deletedForUserIds: jsonb("deleted_for_user_ids").$type<string[]>().default([]),
  reactions: jsonb("reactions").$type<Record<string, string[]>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Group calls (audio/video) – WhatsApp-style: ring, accept/decline, all group members
export const groupCalls = pgTable("group_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => chatGroups.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "audio" | "video"
  createdBy: varchar("created_by").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("ringing"), // "ringing" | "active" | "ended"
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const groupCallParticipants = pgTable("group_call_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").notNull().references(() => groupCalls.id, { onDelete: "cascade" }),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("invited"), // "invited" | "joined" | "declined"
  joinedAt: timestamp("joined_at"),
});

// CSV Upload History
export const csvUploads = pgTable("csv_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  targetTable: text("target_table").notNull(),
  rowCount: integer("row_count").default(0),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertLoginPageConfigSchema = createInsertSchema(loginPageConfig).omit({ updatedAt: true });
export type InsertLoginPageConfig = z.infer<typeof insertLoginPageConfigSchema>;
export type LoginPageConfig = typeof loginPageConfig.$inferSelect;

export const insertAdminRoleSchema = createInsertSchema(adminRoles).omit({ id: true, createdAt: true });
export const insertVillageSchema = createInsertSchema(villages).omit({ id: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true });
export const insertWingSchema = createInsertSchema(wings).omit({ id: true });
export const insertGovWingSchema = createInsertSchema(govWings).omit({ id: true });
export const insertPositionSchema = createInsertSchema(positions).omit({ id: true });
export const insertGovPositionSchema = createInsertSchema(govPositions).omit({ id: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export const insertLeadershipFlagSchema = createInsertSchema(leadershipFlags).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertOfficeManagerSchema = createInsertSchema(officeManagers).omit({ id: true });
export const insertVolunteerSchema = createInsertSchema(volunteers).omit({ id: true });
export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({ id: true });
export const insertVisitorSchema = createInsertSchema(visitors).omit({ id: true, createdAt: true });
export const insertVolunteerVisitSchema = createInsertSchema(volunteerVisits).omit({ id: true, createdAt: true });
export const insertAppUserSchema = createInsertSchema(appUsers).omit({ id: true, createdAt: true });
export const insertCscSchema = createInsertSchema(cscs).omit({ id: true });
export const insertCscReportSchema = createInsertSchema(cscReports).omit({ id: true, createdAt: true });
export const insertMappedVolunteerSchema = createInsertSchema(mappedVolunteers).omit({ id: true, createdAt: true });
export const insertSupporterSchema = createInsertSchema(supporters).omit({ id: true, createdAt: true });
export const insertTaskCategorySchema = createInsertSchema(taskCategories).omit({ id: true, createdAt: true });
export type InsertTaskCategory = z.infer<typeof insertTaskCategorySchema>;
export type TaskCategory = typeof taskCategories.$inferSelect;

export const insertTaskConfigSchema = createInsertSchema(taskConfigs).omit({ id: true, createdAt: true });
export const insertFormFieldSchema = createInsertSchema(formFields).omit({ id: true });
export const insertFieldOptionSchema = createInsertSchema(fieldOptions).omit({ id: true });
export const insertFieldConditionSchema = createInsertSchema(fieldConditions).omit({ id: true });
export const insertTaskSubmissionSchema = createInsertSchema(taskSubmissions).omit({ id: true, createdAt: true });
export const insertUserAdditionalRoleSchema = createInsertSchema(userAdditionalRoles).omit({ id: true, createdAt: true });
export const insertVoterListSchema = createInsertSchema(voterList).omit({ id: true });
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export const insertChatGroupSchema = createInsertSchema(chatGroups).omit({ id: true, createdAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, joinedAt: true });
export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({ id: true, createdAt: true });
export const insertGroupCallSchema = createInsertSchema(groupCalls).omit({ id: true, createdAt: true });
export const insertGroupCallParticipantSchema = createInsertSchema(groupCallParticipants).omit({ id: true });
export const insertCsvUploadSchema = createInsertSchema(csvUploads).omit({ id: true, createdAt: true });

// Types
export type InsertAdminRole = z.infer<typeof insertAdminRoleSchema>;
export type AdminRole = typeof adminRoles.$inferSelect;

export type InsertVillage = z.infer<typeof insertVillageSchema>;
export type Village = typeof villages.$inferSelect;

export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;

export type InsertWing = z.infer<typeof insertWingSchema>;
export type Wing = typeof wings.$inferSelect;

export type InsertGovWing = z.infer<typeof insertGovWingSchema>;
export type GovWing = typeof govWings.$inferSelect;

export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;

export type InsertGovPosition = z.infer<typeof insertGovPositionSchema>;
export type GovPosition = typeof govPositions.$inferSelect;

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

export type InsertLeadershipFlag = z.infer<typeof insertLeadershipFlagSchema>;
export type LeadershipFlag = typeof leadershipFlags.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertOfficeManager = z.infer<typeof insertOfficeManagerSchema>;
export type OfficeManager = typeof officeManagers.$inferSelect;

export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;
export type Volunteer = typeof volunteers.$inferSelect;

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof visitors.$inferSelect;

export type InsertVolunteerVisit = z.infer<typeof insertVolunteerVisitSchema>;
export type VolunteerVisit = typeof volunteerVisits.$inferSelect;

export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type AppUser = typeof appUsers.$inferSelect;

export type InsertCsc = z.infer<typeof insertCscSchema>;
export type Csc = typeof cscs.$inferSelect;

export type InsertCscReport = z.infer<typeof insertCscReportSchema>;
export type CscReport = typeof cscReports.$inferSelect;

export type InsertMappedVolunteer = z.infer<typeof insertMappedVolunteerSchema>;
export type MappedVolunteer = typeof mappedVolunteers.$inferSelect;

export type InsertSupporter = z.infer<typeof insertSupporterSchema>;
export type Supporter = typeof supporters.$inferSelect;

export type InsertTaskConfig = z.infer<typeof insertTaskConfigSchema>;
export type TaskConfig = typeof taskConfigs.$inferSelect;

export type InsertFormField = z.infer<typeof insertFormFieldSchema>;
export type FormField = typeof formFields.$inferSelect;

export type InsertFieldOption = z.infer<typeof insertFieldOptionSchema>;
export type FieldOption = typeof fieldOptions.$inferSelect;

export type InsertFieldCondition = z.infer<typeof insertFieldConditionSchema>;
export type FieldCondition = typeof fieldConditions.$inferSelect;

export type InsertTaskSubmission = z.infer<typeof insertTaskSubmissionSchema>;
export type TaskSubmission = typeof taskSubmissions.$inferSelect;

export type InsertUserAdditionalRole = z.infer<typeof insertUserAdditionalRoleSchema>;
export type UserAdditionalRole = typeof userAdditionalRoles.$inferSelect;

export type InsertVoterList = z.infer<typeof insertVoterListSchema>;
export type VoterListRecord = typeof voterList.$inferSelect;

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type InsertChatGroup = z.infer<typeof insertChatGroupSchema>;
export type ChatGroup = typeof chatGroups.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type GroupMessage = typeof groupMessages.$inferSelect;

export type InsertGroupCall = z.infer<typeof insertGroupCallSchema>;
export type GroupCall = typeof groupCalls.$inferSelect;
export type InsertGroupCallParticipant = z.infer<typeof insertGroupCallParticipantSchema>;
export type GroupCallParticipant = typeof groupCallParticipants.$inferSelect;

export type InsertCsvUpload = z.infer<typeof insertCsvUploadSchema>;
export type CsvUpload = typeof csvUploads.$inferSelect;

// Harr Sirr te Chatt Submissions
export const hstcSubmissions = pgTable("hstc_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  houseOwnerName: text("house_owner_name").notNull(),
  fatherHusbandName: text("father_husband_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  repairMaterialCost: integer("repair_material_cost").notNull(),
  estimatedLabourCost: integer("estimated_labour_cost").notNull(),
  totalCost: integer("total_cost").notNull(),
  aadhaarFront: text("aadhaar_front"),
  aadhaarBack: text("aadhaar_back"),
  voterIdFront: text("voter_id_front"),
  voterIdBack: text("voter_id_back"),
  applicationPhoto: text("application_photo"),
  numberOfPeople: integer("number_of_people"),
  roomSize: text("room_size"),
  bricksQty: text("bricks_qty"),
  sandSqFt: text("sand_sq_ft"),
  gravelTonKg: text("gravel_ton_kg"),
  cementKgQty: text("cement_kg_qty"),
  sariaKtKg: text("saria_kt_kg"),
  nodalVolunteerName: text("nodal_volunteer_name"),
  nodalVolunteerMobile: text("nodal_volunteer_mobile"),
  superVolunteerName: text("super_volunteer_name"),
  superVolunteerMobile: text("super_volunteer_mobile"),
  houseImages: text("house_images").array(),
  // Bank details
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  bankBranchName: text("bank_branch_name"),
  bankIfscCode: text("bank_ifsc_code"),
  passbookOrChequeImage: text("passbook_or_cheque_image"),
  loanConsent: boolean("loan_consent").default(false),
  roomSizeUnit: text("room_size_unit"),
  mobileVerified: boolean("mobile_verified").default(false),
  // Completed house photos (after construction)
  completedHouseImages: text("completed_house_images").array(),
  completionNotes: text("completion_notes"),
  completedAt: timestamp("completed_at"),
  // Payment proof (admin uploads)
  paymentProofImages: text("payment_proof_images").array(),
  paymentAmount: integer("payment_amount"),
  paymentMode: text("payment_mode"),
  paymentNote: text("payment_note"),
  paymentUploadedAt: timestamp("payment_uploaded_at"),
  // OCR extracted data
  ocrAadhaarName: text("ocr_aadhaar_name"),
  ocrAadhaarNumber: text("ocr_aadhaar_number"),
  ocrAadhaarDob: text("ocr_aadhaar_dob"),
  ocrAadhaarGender: text("ocr_aadhaar_gender"),
  ocrAadhaarAddress: text("ocr_aadhaar_address"),
  ocrVoterId: text("ocr_voter_id"),
  ocrVoterName: text("ocr_voter_name"),
  // Approval workflow
  status: text("status").default("pending").notNull(),
  reviewNote: text("review_note"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  editAllowed: boolean("edit_allowed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHstcSubmissionSchema = createInsertSchema(hstcSubmissions).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  completedAt: true,
  paymentUploadedAt: true,
});

export type InsertHstcSubmission = z.infer<typeof insertHstcSubmissionSchema>;
export type HstcSubmission = typeof hstcSubmissions.$inferSelect;

// Voter Registration Submissions
export const voterRegistrationSubmissions = pgTable("voter_registration_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  serialNumber: integer("serial_number"),
  // Personal
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth"),
  relativeName: text("relative_name").notNull(),
  relationType: text("relation_type").notNull(),
  // Address
  houseNumber: text("house_number"),
  streetMohallaVillage: text("street_mohalla_village"),
  postOffice: text("post_office"),
  district: text("district"),
  state: text("state").default("Punjab"),
  pinCode: text("pin_code"),
  // Assembly
  assemblyConstituency: text("assembly_constituency"),
  // Aadhaar / Contact
  aadhaarNumber: text("aadhaar_number"),
  mobileNumber: text("mobile_number"),
  email: text("email"),
  mobileVerified: boolean("mobile_verified").default(false),
  emailVerified: boolean("email_verified").default(false),
  // Disability
  disability: text("disability").default("None"),
  // Documents (base64 or URL)
  ageProofType: text("age_proof_type"),
  ageProofImage: text("age_proof_image"),
  ageProofOcrData: text("age_proof_ocr_data"),
  addressProofType: text("address_proof_type"),
  addressProofImage: text("address_proof_image"),
  addressProofOcrData: text("address_proof_ocr_data"),
  photograph: text("photograph"),
  photographOcrData: text("photograph_ocr_data"),
  status: text("status").default("pending"),
  reviewNote: text("review_note"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  cardPdf: text("card_pdf"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoterRegistrationSubmissionSchema = createInsertSchema(voterRegistrationSubmissions).omit({
  id: true,
  serialNumber: true,
  createdAt: true,
});

export type InsertVoterRegistrationSubmission = z.infer<typeof insertVoterRegistrationSubmissionSchema>;
export type VoterRegistrationSubmission = typeof voterRegistrationSubmissions.$inferSelect;

// Sukh-Dukh Saanjha Karo Categories
export const sdskCategories = pgTable("sdsk_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  type: text("type").notNull().default("both"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSdskCategorySchema = createInsertSchema(sdskCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertSdskCategory = z.infer<typeof insertSdskCategorySchema>;
export type SdskCategory = typeof sdskCategories.$inferSelect;

// Sukh-Dukh Saanjha Karo Submissions
export const sdskSubmissions = pgTable("sdsk_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  type: text("type").notNull(),
  categoryId: varchar("category_id"),
  categoryName: text("category_name"),
  selectedVillageId: varchar("selected_village_id"),
  selectedVillageName: text("selected_village_name"),
  personName: text("person_name"),
  mobileNumber: text("mobile_number"),
  mobileVerified: boolean("mobile_verified").default(false),
  description: text("description"),
  voiceNote: text("voice_note"),
  status: text("status").default("pending").notNull(),
  adminNote: text("admin_note"),
  completionNote: text("completion_note"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSdskSubmissionSchema = createInsertSchema(sdskSubmissions).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,
});

export type InsertSdskSubmission = z.infer<typeof insertSdskSubmissionSchema>;
export type SdskSubmission = typeof sdskSubmissions.$inferSelect;

// Surveys
export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleHi: text("title_hi"),
  titlePa: text("title_pa"),
  description: text("description"),
  descriptionHi: text("description_hi"),
  descriptionPa: text("description_pa"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSurveySchema = createInsertSchema(surveys).omit({ id: true, createdAt: true });
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;

export const surveyQuestions = pgTable("survey_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id),
  label: text("label").notNull(),
  labelHi: text("label_hi"),
  labelPa: text("label_pa"),
  type: text("type").notNull().default("text"),
  options: text("options").array(),
  optionsHi: text("options_hi").array(),
  optionsPa: text("options_pa").array(),
  required: boolean("required").default(false),
  sortOrder: integer("sort_order").default(0),
});

export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).omit({ id: true });
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;

export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  answers: text("answers").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, createdAt: true });
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

// Nasha Viruddh Yuddh Reports
export const nvyReports = pgTable("nvy_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: text("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  photo: text("photo"),
  audioNote: text("audio_note"),
  description: text("description"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationAddress: text("location_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNvyReportSchema = createInsertSchema(nvyReports).omit({
  id: true,
  createdAt: true,
});

export type InsertNvyReport = z.infer<typeof insertNvyReportSchema>;
export type NvyReport = typeof nvyReports.$inferSelect;

export const otpCodes = pgTable("otp_codes", {
  key: text("key").primaryKey(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Sunwai (Hearing/Complaint) Complaints
export const sunwaiComplaints = pgTable("sunwai_complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  complainantName: text("complainant_name").notNull(),
  fatherHusbandName: text("father_husband_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  issueCategoryId: varchar("issue_category_id").references(() => issues.id),
  otherCategoryText: text("other_category_text"),
  complaintNote: text("complaint_note").notNull(),
  audioNote: text("audio_note"),
  status: text("status").default("pending").notNull(),
  adminNote: text("admin_note"),
  expectedDays: integer("expected_days"),
  completionNote: text("completion_note"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSunwaiComplaintSchema = createInsertSchema(sunwaiComplaints).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,
});

export type InsertSunwaiComplaint = z.infer<typeof insertSunwaiComplaintSchema>;
export type SunwaiComplaint = typeof sunwaiComplaints.$inferSelect;

// Sunwai Logs (Journey tracking)
export const sunwaiLogs = pgTable("sunwai_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  complaintId: varchar("complaint_id").notNull().references(() => sunwaiComplaints.id),
  action: text("action").notNull(),
  note: text("note"),
  performedBy: text("performed_by"),
  performedByName: text("performed_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSunwaiLogSchema = createInsertSchema(sunwaiLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertSunwaiLog = z.infer<typeof insertSunwaiLogSchema>;
export type SunwaiLog = typeof sunwaiLogs.$inferSelect;

// Outdoor Advertisement Submissions
export const outdoorAdSubmissions = pgTable("outdoor_ad_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  ownerName: text("owner_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  wallSize: text("wall_size").notNull(),
  frameType: text("frame_type").notNull(),
  wallImage: text("wall_image"),
  posterImage: text("poster_image"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationAddress: text("location_address"),
  status: text("status").default("pending").notNull(),
  adminNote: text("admin_note"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOutdoorAdSchema = createInsertSchema(outdoorAdSubmissions).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export type InsertOutdoorAd = z.infer<typeof insertOutdoorAdSchema>;
export type OutdoorAdSubmission = typeof outdoorAdSubmissions.$inferSelect;

export const govSchoolIssueCategories = pgTable("gov_school_issue_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameHi: text("name_hi"),
  namePa: text("name_pa"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGovSchoolIssueCategorySchema = createInsertSchema(govSchoolIssueCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertGovSchoolIssueCategory = z.infer<typeof insertGovSchoolIssueCategorySchema>;
export type GovSchoolIssueCategory = typeof govSchoolIssueCategories.$inferSelect;

export const govSchoolSubmissions = pgTable("gov_school_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  schoolName: text("school_name").notNull(),
  principalName: text("principal_name").notNull(),
  principalMobile: text("principal_mobile"),
  issueCategoryId: varchar("issue_category_id"),
  issueCategoryName: text("issue_category_name"),
  issueCategoryIds: text("issue_category_ids"),
  issueCategoryNames: text("issue_category_names"),
  nodalVolunteerName: text("nodal_volunteer_name"),
  nodalVolunteerMobile: text("nodal_volunteer_mobile"),
  description: text("description"),
  audioNote: text("audio_note"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationAddress: text("location_address"),
  status: text("status").default("pending").notNull(),
  adminNote: text("admin_note"),
  completionNote: text("completion_note"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGovSchoolSubmissionSchema = createInsertSchema(govSchoolSubmissions).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  completedAt: true,
});

export type InsertGovSchoolSubmission = z.infer<typeof insertGovSchoolSubmissionSchema>;
export type GovSchoolSubmission = typeof govSchoolSubmissions.$inferSelect;

export const govSchoolLogs = pgTable("gov_school_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => govSchoolSubmissions.id),
  action: text("action").notNull(),
  note: text("note"),
  performedBy: text("performed_by"),
  performedByName: text("performed_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGovSchoolLogSchema = createInsertSchema(govSchoolLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertGovSchoolLog = z.infer<typeof insertGovSchoolLogSchema>;
export type GovSchoolLog = typeof govSchoolLogs.$inferSelect;

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  personName: text("person_name").notNull(),
  fatherHusbandName: text("father_husband_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  address: text("address"),
  description: text("description").notNull(),
  audioNote: text("audio_note"),
  documentPhoto: text("document_photo"),
  status: text("status").default("pending").notNull(),
  appointmentDate: text("appointment_date"),
  adminNote: text("admin_note"),
  completionNote: text("completion_note"),
  scheduledAt: timestamp("scheduled_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  scheduledAt: true,
  resolvedAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const appointmentLogs = pgTable("appointment_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").notNull().references(() => appointments.id),
  action: text("action").notNull(),
  note: text("note"),
  performedBy: text("performed_by"),
  performedByName: text("performed_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentLogSchema = createInsertSchema(appointmentLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAppointmentLog = z.infer<typeof insertAppointmentLogSchema>;
export type AppointmentLog = typeof appointmentLogs.$inferSelect;

// Event Venue bookings
export const eventVenues = pgTable("event_venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id").references(() => villages.id),
  villageName: text("village_name"),
  requesterName: text("requester_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  venueName: text("venue_name").notNull(),
  capacity: integer("capacity"),
  venueType: text("venue_type").notNull(), // marriage_hall, banquet, ground, conference_hall, other
  venueTypeOther: text("venue_type_other"),
  date: date("date").notNull(),
  time: text("time").notNull(),
  locationLabel: text("location_label"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  notes: text("notes"),
  status: text("status").default("pending").notNull(), // pending, accepted, rejected
  adminMessage: text("admin_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEventVenueSchema = createInsertSchema(eventVenues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEventVenue = z.infer<typeof insertEventVenueSchema>;
export type EventVenue = typeof eventVenues.$inferSelect;

// Tirth Yatra requests
export const tirthYatraRequests = pgTable("tirth_yatra_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id").references(() => villages.id),
  villageName: text("village_name"),
  applicantName: text("applicant_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  dob: date("dob"),
  age: integer("age"),
  gender: text("gender"),
  withFamily: boolean("with_family").default(false),
  familyMembers: jsonb("family_members").$type<{ name: string; mobileNumber: string; mobileVerified: boolean }[]>().default([]),
  currentLocationLabel: text("current_location_label"),
  currentLatitude: text("current_latitude"),
  currentLongitude: text("current_longitude"),
  destination: text("destination").notNull(), // kashi_vishwanath, vaishno_devi, kedarnath, amarnath, haridwar, other
  destinationOther: text("destination_other"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  aadhaarFrontUrl: text("aadhaar_front_url"),
  aadhaarBackUrl: text("aadhaar_back_url"),
  voterCardUrl: text("voter_card_url"),
  ocrAadhaarText: text("ocr_aadhaar_text"),
  ocrVoterText: text("ocr_voter_text"),
  ocrVoterId: text("ocr_voter_id"),
  audioNoteUrl: text("audio_note_url"),
  audioNoteText: text("audio_note_text"),
  status: text("status").default("pending").notNull(), // pending, accepted, rejected, closed
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTirthYatraRequestSchema = createInsertSchema(tirthYatraRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTirthYatraRequest = z.infer<typeof insertTirthYatraRequestSchema>;
export type TirthYatraRequest = typeof tirthYatraRequests.$inferSelect;

// Mahila Samman Rashi Submissions
export const mahilaSammanSubmissions = pgTable("mahila_samman_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  sakhiName: text("sakhi_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  consentServeSakhi50: boolean("consent_serve_sakhi_50").default(false),
  profileComplete: boolean("profile_complete").default(false),
  fatherHusbandName: text("father_husband_name"),
  aadhaarFront: text("aadhaar_front"),
  aadhaarBack: text("aadhaar_back"),
  ocrAadhaarName: text("ocr_aadhaar_name"),
  ocrAadhaarNumber: text("ocr_aadhaar_number"),
  ocrAadhaarDob: text("ocr_aadhaar_dob"),
  ocrAadhaarGender: text("ocr_aadhaar_gender"),
  ocrAadhaarAddress: text("ocr_aadhaar_address"),
  aadhaarVerifiedSameAsVoter: boolean("aadhaar_verified_same_as_voter").default(false),
  ocrVoterId: text("ocr_voter_id"),
  ocrVoterName: text("ocr_voter_name"),
  voterMappingBoothId: text("voter_mapping_booth_id"),
  voterMappingName: text("voter_mapping_name"),
  voterMappingFatherName: text("voter_mapping_father_name"),
  voterMappingVillageName: text("voter_mapping_village_name"),
  sakhiPhoto: text("sakhi_photo"),
  declarationChecked: boolean("declaration_checked").default(false),
  status: text("status").default("pending").notNull(),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMahilaSammanSubmissionSchema = createInsertSchema(mahilaSammanSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMahilaSammanSubmission = z.infer<typeof insertMahilaSammanSubmissionSchema>;
export type MahilaSammanSubmission = typeof mahilaSammanSubmissions.$inferSelect;

// Road Repair Reports
export const roadReports = pgTable("road_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appUserId: varchar("app_user_id").notNull().references(() => appUsers.id),
  villageId: varchar("village_id"),
  villageName: text("village_name"),
  reporterName: text("reporter_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  mobileVerified: boolean("mobile_verified").default(false),
  description: text("description").notNull(),
  photos: text("photos").array(),
  video: text("video"),
  audioNote: text("audio_note"),
  startLatitude: text("start_latitude"),
  startLongitude: text("start_longitude"),
  endLatitude: text("end_latitude"),
  endLongitude: text("end_longitude"),
  distanceKm: text("distance_km"),
  status: text("status").default("pending").notNull(), // pending, in_progress, completed
  adminNote: text("admin_note"),
  completionNote: text("completion_note"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertRoadReportSchema = createInsertSchema(roadReports).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertRoadReport = z.infer<typeof insertRoadReportSchema>;
export type RoadReport = typeof roadReports.$inferSelect;

export const roadLogs = pgTable("road_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => roadReports.id),
  action: text("action").notNull(),
  note: text("note"),
  performedBy: text("performed_by"),
  performedByName: text("performed_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoadLogSchema = createInsertSchema(roadLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertRoadLog = z.infer<typeof insertRoadLogSchema>;
export type RoadLog = typeof roadLogs.$inferSelect;
