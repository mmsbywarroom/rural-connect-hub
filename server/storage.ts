import { db } from "./db";
import { eq, desc, and, asc, sql, count, inArray } from "drizzle-orm";
import {
  users, villages, issues, wings, govWings, govPositions, positions, departments, leadershipFlags,
  volunteers, familyMembers, visitors, volunteerVisits, officeManagers,
  appUsers, cscs, cscReports, mappedVolunteers, supporters,
  taskCategories, taskConfigs, formFields, fieldOptions, fieldConditions, taskSubmissions,   csvUploads, userAdditionalRoles, voterList, voterMappingMaster, pushSubscriptions,
  chatGroups, groupMembers, groupMessages, groupCalls, groupCallParticipants,
  adminRoles, loginPageConfig,
  type AdminRole, type InsertAdminRole,
  type LoginPageConfig, type InsertLoginPageConfig,
  type User, type InsertUser,
  type Village, type InsertVillage,
  type Issue, type InsertIssue,
  type Wing, type InsertWing,
  type GovWing, type InsertGovWing,
  type GovPosition, type InsertGovPosition,
  type Position, type InsertPosition,
  type Department, type InsertDepartment,
  type LeadershipFlag, type InsertLeadershipFlag,
  type Volunteer, type InsertVolunteer,
  type FamilyMember, type InsertFamilyMember,
  type Visitor, type InsertVisitor,
  type VolunteerVisit, type InsertVolunteerVisit,
  type OfficeManager, type InsertOfficeManager,
  type AppUser, type InsertAppUser,
  type Csc, type InsertCsc,
  type CscReport, type InsertCscReport,
  type MappedVolunteer, type InsertMappedVolunteer,
  type Supporter, type InsertSupporter,
  type TaskCategory, type InsertTaskCategory,
  type TaskConfig, type InsertTaskConfig,
  type FormField, type InsertFormField,
  type FieldOption, type InsertFieldOption,
  type FieldCondition, type InsertFieldCondition,
  type TaskSubmission, type InsertTaskSubmission,
  type UserAdditionalRole, type InsertUserAdditionalRole,
  type CsvUpload, type InsertCsvUpload,
  type VoterListRecord, type InsertVoterList,
  type VoterMappingMaster, type InsertVoterMappingMaster,
  type PushSubscription, type InsertPushSubscription,
  type ChatGroup, type InsertChatGroup,
  type GroupMember, type InsertGroupMember,
  type GroupMessage, type InsertGroupMessage,
  type GroupCall, type InsertGroupCall,
  type GroupCallParticipant, type InsertGroupCallParticipant,
  hstcSubmissions,
  type HstcSubmission, type InsertHstcSubmission,
  voterRegistrationSubmissions,
  type VoterRegistrationSubmission, type InsertVoterRegistrationSubmission,
  sdskCategories, sdskSubmissions,
  type SdskCategory, type InsertSdskCategory,
  type SdskSubmission, type InsertSdskSubmission,
  surveys, surveyQuestions, surveyResponses,
  type Survey, type InsertSurvey,
  type SurveyQuestion, type InsertSurveyQuestion,
  type SurveyResponse, type InsertSurveyResponse,
  sunwaiComplaints, sunwaiLogs,
  type SunwaiComplaint, type InsertSunwaiComplaint,
  type SunwaiLog, type InsertSunwaiLog,
  nvyReports,
  type NvyReport, type InsertNvyReport,
  outdoorAdSubmissions,
  type OutdoorAdSubmission, type InsertOutdoorAd,
  govSchoolIssueCategories, govSchoolSubmissions, govSchoolLogs,
  type GovSchoolIssueCategory, type InsertGovSchoolIssueCategory,
  type GovSchoolSubmission, type InsertGovSchoolSubmission,
  type GovSchoolLog, type InsertGovSchoolLog,
  appointments, appointmentLogs, eventVenues,
  type Appointment, type InsertAppointment,
  type AppointmentLog, type InsertAppointmentLog,
  type EventVenue, type InsertEventVenue,
  roadReports, roadLogs,
  type RoadReport, type InsertRoadReport,
  type RoadLog, type InsertRoadLog,
  tirthYatraRequests,
  type TirthYatraRequest, type InsertTirthYatraRequest,
  mahilaSammanSubmissions,
  type MahilaSammanSubmission, type InsertMahilaSammanSubmission,
  mahilaSammanPunjabSubmissions,
  type MahilaSammanPunjabSubmission, type InsertMahilaSammanPunjabSubmission,
} from "@shared/schema";

export interface IStorage {
  // Admin Roles
  getLoginPageConfig(): Promise<LoginPageConfig | null>;
  updateLoginPageConfig(data: Partial<InsertLoginPageConfig>): Promise<LoginPageConfig>;

  getAdminRoles(): Promise<AdminRole[]>;
  getAdminRole(id: string): Promise<AdminRole | undefined>;
  createAdminRole(role: InsertAdminRole): Promise<AdminRole>;
  updateAdminRole(id: string, role: Partial<InsertAdminRole>): Promise<AdminRole | undefined>;
  deleteAdminRole(id: string): Promise<boolean>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Office Managers
  getOfficeManagers(): Promise<OfficeManager[]>;
  getOfficeManager(id: string): Promise<OfficeManager | undefined>;
  getOfficeManagerByUserId(userId: string): Promise<OfficeManager | undefined>;
  createOfficeManager(manager: InsertOfficeManager): Promise<OfficeManager>;
  updateOfficeManager(id: string, manager: Partial<InsertOfficeManager>): Promise<OfficeManager | undefined>;

  // Villages
  getVillages(): Promise<Village[]>;
  getVillage(id: string): Promise<Village | undefined>;
  createVillage(village: InsertVillage): Promise<Village>;
  updateVillage(id: string, village: Partial<InsertVillage>): Promise<Village | undefined>;

  // Issues
  getIssues(): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: string, issue: Partial<InsertIssue>): Promise<Issue | undefined>;

  // Wings
  getWings(): Promise<Wing[]>;
  getWing(id: string): Promise<Wing | undefined>;
  createWing(wing: InsertWing): Promise<Wing>;
  updateWing(id: string, wing: Partial<InsertWing>): Promise<Wing | undefined>;

  // Gov Wings
  getGovWings(): Promise<GovWing[]>;
  getGovWing(id: string): Promise<GovWing | undefined>;
  createGovWing(govWing: InsertGovWing): Promise<GovWing>;
  updateGovWing(id: string, govWing: Partial<InsertGovWing>): Promise<GovWing | undefined>;
  deleteGovWing(id: string): Promise<boolean>;

  // Gov Positions
  getGovPositions(): Promise<GovPosition[]>;
  getGovPosition(id: string): Promise<GovPosition | undefined>;
  createGovPosition(govPosition: InsertGovPosition): Promise<GovPosition>;
  updateGovPosition(id: string, govPosition: Partial<InsertGovPosition>): Promise<GovPosition | undefined>;
  deleteGovPosition(id: string): Promise<boolean>;

  // Positions
  getPositions(): Promise<Position[]>;
  getPosition(id: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, position: Partial<InsertPosition>): Promise<Position | undefined>;

  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined>;

  // Leadership Flags
  getLeadershipFlags(): Promise<LeadershipFlag[]>;
  getLeadershipFlag(id: string): Promise<LeadershipFlag | undefined>;
  createLeadershipFlag(flag: InsertLeadershipFlag): Promise<LeadershipFlag>;
  updateLeadershipFlag(id: string, flag: Partial<InsertLeadershipFlag>): Promise<LeadershipFlag | undefined>;

  // Volunteers
  getVolunteers(): Promise<Volunteer[]>;
  getVolunteer(id: string): Promise<Volunteer | undefined>;
  getVolunteerByMobile(mobileNumber: string): Promise<Volunteer | undefined>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;
  updateVolunteer(id: string, volunteer: Partial<InsertVolunteer>): Promise<Volunteer | undefined>;

  // Family Members
  getFamilyMembers(volunteerId: string): Promise<FamilyMember[]>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: string, member: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: string): Promise<void>;

  // Visitors
  getVisitors(): Promise<Visitor[]>;
  getVisitor(id: string): Promise<Visitor | undefined>;
  getVisitorsByMobile(mobileNumber: string): Promise<Visitor[]>;
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  updateVisitor(id: string, visitor: Partial<InsertVisitor>): Promise<Visitor | undefined>;

  // Volunteer Visits
  getVolunteerVisits(volunteerId: string): Promise<VolunteerVisit[]>;
  createVolunteerVisit(visit: InsertVolunteerVisit): Promise<VolunteerVisit>;

  // App Users (Volunteer Portal)
  getAppUsers(): Promise<AppUser[]>;
  getAppUser(id: string): Promise<AppUser | undefined>;
  getAppUserByMobile(mobileNumber: string): Promise<AppUser | undefined>;
  getAppUserByEmail(email: string): Promise<AppUser | undefined>;
  createAppUser(user: InsertAppUser): Promise<AppUser>;
  updateAppUser(id: string, user: Partial<InsertAppUser>): Promise<AppUser | undefined>;
  deleteAppUser(id: string): Promise<void>;
  deleteAppUsersBatch(ids: string[]): Promise<void>;

  // CSCs
  getCscs(): Promise<Csc[]>;
  getCscsByVillage(villageId: string): Promise<Csc[]>;
  getCsc(id: string): Promise<Csc | undefined>;
  createCsc(csc: InsertCsc): Promise<Csc>;
  updateCsc(id: string, csc: Partial<InsertCsc>): Promise<Csc | undefined>;

  // CSC Reports
  getCscReports(): Promise<CscReport[]>;
  getCscReportsByUser(appUserId: string): Promise<CscReport[]>;
  getCscReportsByUserAndVillage(appUserId: string, villageId: string): Promise<CscReport[]>;
  createCscReport(report: InsertCscReport): Promise<CscReport>;

  // Mapped Volunteers
  getMappedVolunteers(): Promise<MappedVolunteer[]>;
  getMappedVolunteer(id: string): Promise<MappedVolunteer | undefined>;
  getMappedVolunteersByUser(appUserId: string): Promise<MappedVolunteer[]>;
  getMappedVolunteersByUserAndVillage(appUserId: string, villageId: string): Promise<MappedVolunteer[]>;
  getMappedVolunteerByMobile(mobileNumber: string): Promise<MappedVolunteer | undefined>;
  createMappedVolunteer(volunteer: InsertMappedVolunteer): Promise<MappedVolunteer>;
  deleteMappedVolunteer(id: string): Promise<void>;
  deleteMappedVolunteersBatch(ids: string[]): Promise<void>;

  // Supporters
  getSupporters(): Promise<Supporter[]>;
  getSupporter(id: string): Promise<Supporter | undefined>;
  getSupportersByUser(appUserId: string): Promise<Supporter[]>;
  getSupportersByUserAndVillage(appUserId: string, villageId: string): Promise<Supporter[]>;
  getSupporterByMobile(mobileNumber: string): Promise<Supporter | undefined>;
  createSupporter(supporter: InsertSupporter): Promise<Supporter>;
  deleteSupporter(id: string): Promise<void>;
  deleteSupportersBatch(ids: string[]): Promise<void>;

  // Task Categories
  getTaskCategories(activeOnly?: boolean): Promise<TaskCategory[]>;
  getTaskCategoriesAll(): Promise<TaskCategory[]>;
  getTaskCategory(id: string): Promise<TaskCategory | undefined>;
  createTaskCategory(category: InsertTaskCategory): Promise<TaskCategory>;
  updateTaskCategory(id: string, category: Partial<InsertTaskCategory>): Promise<TaskCategory | undefined>;
  setTaskCategoryTasks(categoryId: string, taskIds: string[]): Promise<void>;
  deleteTaskCategory(id: string): Promise<void>;

  // Task Configs (SDUI)
  getTaskConfigs(): Promise<TaskConfig[]>;
  getTaskConfig(id: string): Promise<TaskConfig | undefined>;
  createTaskConfig(config: InsertTaskConfig): Promise<TaskConfig>;
  updateTaskConfig(id: string, config: Partial<InsertTaskConfig>): Promise<TaskConfig | undefined>;
  deleteTaskConfig(id: string): Promise<void>;

  // Form Fields
  getFormFields(taskConfigId: string): Promise<FormField[]>;
  getFormFieldsByType(formType: string): Promise<FormField[]>;
  getFormField(id: string): Promise<FormField | undefined>;
  createFormField(field: InsertFormField): Promise<FormField>;
  updateFormField(id: string, field: Partial<InsertFormField>): Promise<FormField | undefined>;
  deleteFormField(id: string): Promise<void>;

  // Field Options
  getFieldOptions(formFieldId: string): Promise<FieldOption[]>;
  createFieldOption(option: InsertFieldOption): Promise<FieldOption>;
  updateFieldOption(id: string, option: Partial<InsertFieldOption>): Promise<FieldOption | undefined>;
  deleteFieldOption(id: string): Promise<void>;

  // Field Conditions
  getFieldConditions(formFieldId: string): Promise<FieldCondition[]>;
  createFieldCondition(condition: InsertFieldCondition): Promise<FieldCondition>;
  deleteFieldCondition(id: string): Promise<void>;

  // Task Submissions
  getTaskSubmissions(taskConfigId?: string): Promise<TaskSubmission[]>;
  getTaskSubmissionsByUser(appUserId: string): Promise<TaskSubmission[]>;
  getTaskSubmissionsByUserAndVillage(appUserId: string, villageId: string, taskConfigId?: string): Promise<TaskSubmission[]>;
  createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission>;

  // User Additional Roles
  getUserAdditionalRoles(appUserId: string): Promise<UserAdditionalRole[]>;
  createUserAdditionalRole(role: InsertUserAdditionalRole): Promise<UserAdditionalRole>;
  deleteUserAdditionalRolesByUser(appUserId: string): Promise<void>;

  // Voter List
  getVoterListRecords(limit?: number, offset?: number, search?: string): Promise<VoterListRecord[]>;
  getVoterListCount(search?: string): Promise<number>;
  getVoterByVcardId(vcardId: string): Promise<VoterListRecord | undefined>;
  createVoterListRecord(record: InsertVoterList): Promise<VoterListRecord>;
  clearVoterList(): Promise<void>;

  // Push Subscriptions
  getPushSubscriptionsByUser(appUserId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(appUserId: string): Promise<void>;

  // Chat Groups
  getDefaultChatGroup(): Promise<ChatGroup | null>;
  getOrCreateDefaultChatGroup(): Promise<ChatGroup>;
  getChatGroup(id: string): Promise<ChatGroup | undefined>;
  addGroupMember(groupId: string, appUserId: string, role?: string): Promise<GroupMember>;
  removeGroupMember(groupId: string, appUserId: string): Promise<boolean>;
  getGroupMemberIds(groupId: string): Promise<string[]>;
  isGroupMember(groupId: string, appUserId: string): Promise<boolean>;
  getGroupMessages(groupId: string, limit: number, beforeId?: string): Promise<GroupMessage[]>;
  getGroupMessage(id: string): Promise<GroupMessage | undefined>;
  createGroupMessage(data: InsertGroupMessage): Promise<GroupMessage>;
  updateGroupMessage(id: string, data: Partial<GroupMessage>): Promise<GroupMessage | undefined>;
  deleteGroupMessage(id: string): Promise<boolean>;

  // Group Calls (audio/video)
  createGroupCall(data: InsertGroupCall): Promise<GroupCall>;
  getGroupCall(id: string): Promise<GroupCall | undefined>;
  getActiveGroupCallByGroupId(groupId: string): Promise<GroupCall | undefined>;
  updateGroupCall(id: string, data: Partial<GroupCall>): Promise<GroupCall | undefined>;
  addGroupCallParticipant(data: InsertGroupCallParticipant): Promise<GroupCallParticipant>;
  getGroupCallParticipants(callId: string): Promise<GroupCallParticipant[]>;
  updateGroupCallParticipant(callId: string, appUserId: string, data: Partial<GroupCallParticipant>): Promise<GroupCallParticipant | undefined>;

  // CSV Uploads
  getCsvUploads(): Promise<CsvUpload[]>;
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;

  // HSTC Submissions
  getHstcSubmissions(): Promise<HstcSubmission[]>;
  getHstcSubmission(id: string): Promise<HstcSubmission | undefined>;
  getHstcSubmissionsByUser(appUserId: string): Promise<HstcSubmission[]>;
  createHstcSubmission(data: InsertHstcSubmission): Promise<HstcSubmission>;
  updateHstcSubmission(id: string, data: Partial<InsertHstcSubmission>): Promise<HstcSubmission | undefined>;

  // SDSK Categories
  getSdskCategories(): Promise<SdskCategory[]>;
  getSdskCategory(id: string): Promise<SdskCategory | undefined>;
  createSdskCategory(data: InsertSdskCategory): Promise<SdskCategory>;
  updateSdskCategory(id: string, data: Partial<InsertSdskCategory>): Promise<SdskCategory | undefined>;
  deleteSdskCategory(id: string): Promise<boolean>;

  // SDSK Submissions
  getSdskSubmissions(): Promise<SdskSubmission[]>;
  getSdskSubmission(id: string): Promise<SdskSubmission | undefined>;
  getSdskSubmissionsByUser(appUserId: string): Promise<SdskSubmission[]>;
  createSdskSubmission(data: InsertSdskSubmission): Promise<SdskSubmission>;

  // Surveys
  getSurveys(): Promise<Survey[]>;
  getSurvey(id: string): Promise<Survey | undefined>;
  createSurvey(data: InsertSurvey): Promise<Survey>;
  updateSurvey(id: string, data: Partial<InsertSurvey>): Promise<Survey | undefined>;
  deleteSurvey(id: string): Promise<boolean>;
  getSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]>;
  createSurveyQuestion(data: InsertSurveyQuestion): Promise<SurveyQuestion>;
  updateSurveyQuestion(id: string, data: Partial<InsertSurveyQuestion>): Promise<SurveyQuestion | undefined>;
  deleteSurveyQuestion(id: string): Promise<boolean>;
  deleteSurveyQuestionsBySurvey(surveyId: string): Promise<boolean>;
  getSurveyResponses(surveyId: string): Promise<SurveyResponse[]>;
  getSurveyResponseByUser(surveyId: string, appUserId: string): Promise<SurveyResponse | undefined>;
  createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse>;

  // Sunwai Complaints
  createSunwaiComplaint(data: InsertSunwaiComplaint): Promise<SunwaiComplaint>;
  getSunwaiComplaints(): Promise<SunwaiComplaint[]>;
  getSunwaiComplaintById(id: string): Promise<SunwaiComplaint | undefined>;
  updateSunwaiComplaint(id: string, data: Partial<InsertSunwaiComplaint>): Promise<SunwaiComplaint | undefined>;
  getSunwaiComplaintsByAppUser(appUserId: string): Promise<SunwaiComplaint[]>;

  // Sunwai Logs
  createSunwaiLog(data: InsertSunwaiLog): Promise<SunwaiLog>;
  getSunwaiLogsByComplaint(complaintId: string): Promise<SunwaiLog[]>;

  // Nasha Viruddh Yuddh Reports
  createNvyReport(data: InsertNvyReport): Promise<NvyReport>;
  getNvyReports(): Promise<NvyReport[]>;

  // Outdoor Ad Submissions
  createOutdoorAd(data: InsertOutdoorAd): Promise<OutdoorAdSubmission>;
  getOutdoorAds(): Promise<OutdoorAdSubmission[]>;
  getOutdoorAdById(id: string): Promise<OutdoorAdSubmission | undefined>;
  updateOutdoorAd(id: string, data: Partial<InsertOutdoorAd>): Promise<OutdoorAdSubmission | undefined>;
  getOutdoorAdsByUser(appUserId: string): Promise<OutdoorAdSubmission[]>;

  // Gov School Issue Categories
  getGovSchoolCategories(): Promise<GovSchoolIssueCategory[]>;
  createGovSchoolCategory(data: InsertGovSchoolIssueCategory): Promise<GovSchoolIssueCategory>;
  updateGovSchoolCategory(id: string, data: Partial<InsertGovSchoolIssueCategory>): Promise<GovSchoolIssueCategory | undefined>;
  deleteGovSchoolCategory(id: string): Promise<boolean>;

  // Gov School Submissions
  createGovSchoolSubmission(data: InsertGovSchoolSubmission): Promise<GovSchoolSubmission>;
  getGovSchoolSubmissions(): Promise<GovSchoolSubmission[]>;
  getGovSchoolSubmissionById(id: string): Promise<GovSchoolSubmission | undefined>;
  updateGovSchoolSubmission(id: string, data: Partial<InsertGovSchoolSubmission>): Promise<GovSchoolSubmission | undefined>;
  getGovSchoolSubmissionsByUser(appUserId: string): Promise<GovSchoolSubmission[]>;

  // Gov School Logs
  createGovSchoolLog(data: InsertGovSchoolLog): Promise<GovSchoolLog>;
  getGovSchoolLogsBySubmission(submissionId: string): Promise<GovSchoolLog[]>;

  createAppointment(data: InsertAppointment): Promise<Appointment>;
  getAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | undefined>;
  updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  getAppointmentsByUser(appUserId: string): Promise<Appointment[]>;
  createAppointmentLog(data: InsertAppointmentLog): Promise<AppointmentLog>;
  getAppointmentLogsByAppointment(appointmentId: string): Promise<AppointmentLog[]>;

  // Event Venues
  createEventVenue(data: InsertEventVenue): Promise<EventVenue>;
  updateEventVenue(id: string, data: Partial<InsertEventVenue>): Promise<EventVenue | undefined>;
  getEventVenue(id: string): Promise<EventVenue | undefined>;
  getEventVenues(): Promise<EventVenue[]>;
  getEventVenuesByUser(appUserId: string): Promise<EventVenue[]>;

  // Road Reports
  createRoadReport(data: InsertRoadReport): Promise<RoadReport>;
  getRoadReports(): Promise<RoadReport[]>;
  getRoadReportsByUser(appUserId: string): Promise<RoadReport[]>;
  createRoadLog(data: InsertRoadLog): Promise<RoadLog>;
  getRoadLogsByReport(reportId: string): Promise<RoadLog[]>;

  // Tirth Yatra
  createTirthYatraRequest(data: InsertTirthYatraRequest): Promise<TirthYatraRequest>;
  updateTirthYatraRequest(id: string, data: Partial<InsertTirthYatraRequest>): Promise<TirthYatraRequest | undefined>;
  getTirthYatraRequest(id: string): Promise<TirthYatraRequest | undefined>;
  getTirthYatraRequests(): Promise<TirthYatraRequest[]>;
  getTirthYatraRequestsByUser(appUserId: string): Promise<TirthYatraRequest[]>;
  getVoterIdsWithTirthYatraMatch(): Promise<Set<string>>;
  getTirthYatraIdsByVoterIds(normalizedVoterIds: string[]): Promise<{ id: string; ocrVoterId: string }[]>;

  getVoterMappingByVoterId(voterId: string): Promise<VoterMappingMaster | null>;
  createMahilaSammanSubmission(data: InsertMahilaSammanSubmission): Promise<MahilaSammanSubmission>;
  updateMahilaSammanSubmission(id: string, data: Partial<InsertMahilaSammanSubmission>): Promise<MahilaSammanSubmission | undefined>;
  getMahilaSammanSubmission(id: string): Promise<MahilaSammanSubmission | undefined>;
  getMahilaSammanSubmissions(): Promise<MahilaSammanSubmission[]>;
  getMahilaSammanSubmissionsByUser(appUserId: string): Promise<MahilaSammanSubmission[]>;

  createMahilaSammanPunjabSubmission(data: InsertMahilaSammanPunjabSubmission): Promise<MahilaSammanPunjabSubmission>;
  updateMahilaSammanPunjabSubmission(id: string, data: Partial<InsertMahilaSammanPunjabSubmission>): Promise<MahilaSammanPunjabSubmission | undefined>;
  getMahilaSammanPunjabSubmission(id: string): Promise<MahilaSammanPunjabSubmission | undefined>;
  getMahilaSammanPunjabSubmissions(): Promise<MahilaSammanPunjabSubmission[]>;
  getMahilaSammanPunjabSubmissionsByUser(appUserId: string): Promise<MahilaSammanPunjabSubmission[]>;
}

export class DatabaseStorage implements IStorage {
  // Admin Roles
  async getLoginPageConfig(): Promise<LoginPageConfig | null> {
    const [row] = await db.select().from(loginPageConfig).where(eq(loginPageConfig.id, "default"));
    return row ?? null;
  }

  async updateLoginPageConfig(data: Partial<InsertLoginPageConfig>): Promise<LoginPageConfig> {
    const [existing] = await db.select().from(loginPageConfig).where(eq(loginPageConfig.id, "default"));
    if (existing) {
      const [updated] = await db.update(loginPageConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(loginPageConfig.id, "default"))
        .returning();
      return updated!;
    }
    const [created] = await db.insert(loginPageConfig)
      .values({ id: "default", ...data })
      .returning();
    return created!;
  }

  async getAdminRoles(): Promise<AdminRole[]> {
    return db.select().from(adminRoles).orderBy(asc(adminRoles.name));
  }

  async getAdminRole(id: string): Promise<AdminRole | undefined> {
    const [role] = await db.select().from(adminRoles).where(eq(adminRoles.id, id));
    return role;
  }

  async createAdminRole(role: InsertAdminRole): Promise<AdminRole> {
    const [created] = await db.insert(adminRoles).values(role).returning();
    return created;
  }

  async updateAdminRole(id: string, role: Partial<InsertAdminRole>): Promise<AdminRole | undefined> {
    const [updated] = await db.update(adminRoles).set(role).where(eq(adminRoles.id, id)).returning();
    return updated;
  }

  async deleteAdminRole(id: string): Promise<boolean> {
    const result = await db.delete(adminRoles).where(eq(adminRoles.id, id)).returning();
    return result.length > 0;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.username));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  // Office Managers
  async getOfficeManagers(): Promise<OfficeManager[]> {
    return db.select().from(officeManagers);
  }

  async getOfficeManager(id: string): Promise<OfficeManager | undefined> {
    const [manager] = await db.select().from(officeManagers).where(eq(officeManagers.id, id));
    return manager;
  }

  async getOfficeManagerByUserId(userId: string): Promise<OfficeManager | undefined> {
    const [manager] = await db.select().from(officeManagers).where(eq(officeManagers.userId, userId));
    return manager;
  }

  async createOfficeManager(manager: InsertOfficeManager): Promise<OfficeManager> {
    const [created] = await db.insert(officeManagers).values(manager).returning();
    return created;
  }

  async updateOfficeManager(id: string, manager: Partial<InsertOfficeManager>): Promise<OfficeManager | undefined> {
    const [updated] = await db.update(officeManagers).set(manager).where(eq(officeManagers.id, id)).returning();
    return updated;
  }

  // Villages
  async getVillages(): Promise<Village[]> {
    return db.select().from(villages);
  }

  async getVillage(id: string): Promise<Village | undefined> {
    const [village] = await db.select().from(villages).where(eq(villages.id, id));
    return village;
  }

  async createVillage(village: InsertVillage): Promise<Village> {
    const [created] = await db.insert(villages).values(village).returning();
    return created;
  }

  async updateVillage(id: string, village: Partial<InsertVillage>): Promise<Village | undefined> {
    const [updated] = await db.update(villages).set(village).where(eq(villages.id, id)).returning();
    return updated;
  }

  // Issues
  async getIssues(): Promise<Issue[]> {
    return db.select().from(issues);
  }

  async getIssue(id: string): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue;
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const [created] = await db.insert(issues).values(issue).returning();
    return created;
  }

  async updateIssue(id: string, issue: Partial<InsertIssue>): Promise<Issue | undefined> {
    const [updated] = await db.update(issues).set(issue).where(eq(issues.id, id)).returning();
    return updated;
  }

  // Wings
  async getWings(): Promise<Wing[]> {
    return db.select().from(wings);
  }

  async getWing(id: string): Promise<Wing | undefined> {
    const [wing] = await db.select().from(wings).where(eq(wings.id, id));
    return wing;
  }

  async createWing(wing: InsertWing): Promise<Wing> {
    const [created] = await db.insert(wings).values(wing).returning();
    return created;
  }

  async updateWing(id: string, wing: Partial<InsertWing>): Promise<Wing | undefined> {
    const [updated] = await db.update(wings).set(wing).where(eq(wings.id, id)).returning();
    return updated;
  }

  // Gov Wings
  async getGovWings(): Promise<GovWing[]> {
    return db.select().from(govWings);
  }

  async getGovWing(id: string): Promise<GovWing | undefined> {
    const [gw] = await db.select().from(govWings).where(eq(govWings.id, id));
    return gw;
  }

  async createGovWing(govWing: InsertGovWing): Promise<GovWing> {
    const [created] = await db.insert(govWings).values(govWing).returning();
    return created;
  }

  async updateGovWing(id: string, govWing: Partial<InsertGovWing>): Promise<GovWing | undefined> {
    const [updated] = await db.update(govWings).set(govWing).where(eq(govWings.id, id)).returning();
    return updated;
  }

  async deleteGovWing(id: string): Promise<boolean> {
    const result = await db.delete(govWings).where(eq(govWings.id, id)).returning();
    return result.length > 0;
  }

  // Gov Positions
  async getGovPositions(): Promise<GovPosition[]> {
    return db.select().from(govPositions);
  }

  async getGovPosition(id: string): Promise<GovPosition | undefined> {
    const [gp] = await db.select().from(govPositions).where(eq(govPositions.id, id));
    return gp;
  }

  async createGovPosition(govPosition: InsertGovPosition): Promise<GovPosition> {
    const [created] = await db.insert(govPositions).values(govPosition).returning();
    return created;
  }

  async updateGovPosition(id: string, govPosition: Partial<InsertGovPosition>): Promise<GovPosition | undefined> {
    const [updated] = await db.update(govPositions).set(govPosition).where(eq(govPositions.id, id)).returning();
    return updated;
  }

  async deleteGovPosition(id: string): Promise<boolean> {
    const result = await db.delete(govPositions).where(eq(govPositions.id, id)).returning();
    return result.length > 0;
  }

  // Positions
  async getPositions(): Promise<Position[]> {
    return db.select().from(positions).orderBy(positions.displayOrder, positions.name);
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position;
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [created] = await db.insert(positions).values(position).returning();
    return created;
  }

  async updatePosition(id: string, position: Partial<InsertPosition>): Promise<Position | undefined> {
    const [updated] = await db.update(positions).set(position).where(eq(positions.id, id)).returning();
    return updated;
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return db.select().from(departments);
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(department).returning();
    return created;
  }

  async updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updated] = await db.update(departments).set(department).where(eq(departments.id, id)).returning();
    return updated;
  }

  // Leadership Flags
  async getLeadershipFlags(): Promise<LeadershipFlag[]> {
    return db.select().from(leadershipFlags);
  }

  async getLeadershipFlag(id: string): Promise<LeadershipFlag | undefined> {
    const [flag] = await db.select().from(leadershipFlags).where(eq(leadershipFlags.id, id));
    return flag;
  }

  async createLeadershipFlag(flag: InsertLeadershipFlag): Promise<LeadershipFlag> {
    const [created] = await db.insert(leadershipFlags).values(flag).returning();
    return created;
  }

  async updateLeadershipFlag(id: string, flag: Partial<InsertLeadershipFlag>): Promise<LeadershipFlag | undefined> {
    const [updated] = await db.update(leadershipFlags).set(flag).where(eq(leadershipFlags.id, id)).returning();
    return updated;
  }

  // Volunteers
  async getVolunteers(): Promise<Volunteer[]> {
    return db.select().from(volunteers);
  }

  async getVolunteer(id: string): Promise<Volunteer | undefined> {
    const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.id, id));
    return volunteer;
  }

  async getVolunteerByMobile(mobileNumber: string): Promise<Volunteer | undefined> {
    const [volunteer] = await db.select().from(volunteers).where(eq(volunteers.mobileNumber, mobileNumber));
    return volunteer;
  }

  async createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer> {
    const [created] = await db.insert(volunteers).values(volunteer).returning();
    return created;
  }

  async updateVolunteer(id: string, volunteer: Partial<InsertVolunteer>): Promise<Volunteer | undefined> {
    const [updated] = await db.update(volunteers).set(volunteer).where(eq(volunteers.id, id)).returning();
    return updated;
  }

  // Family Members
  async getFamilyMembers(volunteerId: string): Promise<FamilyMember[]> {
    return db.select().from(familyMembers).where(eq(familyMembers.volunteerId, volunteerId));
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const [created] = await db.insert(familyMembers).values(member).returning();
    return created;
  }

  async updateFamilyMember(id: string, member: Partial<InsertFamilyMember>): Promise<FamilyMember | undefined> {
    const [updated] = await db.update(familyMembers).set(member).where(eq(familyMembers.id, id)).returning();
    return updated;
  }

  async deleteFamilyMember(id: string): Promise<void> {
    await db.delete(familyMembers).where(eq(familyMembers.id, id));
  }

  // Visitors
  async getVisitors(): Promise<Visitor[]> {
    return db.select().from(visitors).orderBy(desc(visitors.createdAt));
  }

  async getVisitor(id: string): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
    return visitor;
  }

  async getVisitorsByMobile(mobileNumber: string): Promise<Visitor[]> {
    return db.select().from(visitors).where(eq(visitors.mobileNumber, mobileNumber)).orderBy(desc(visitors.createdAt));
  }

  async createVisitor(visitor: InsertVisitor): Promise<Visitor> {
    const [created] = await db.insert(visitors).values(visitor).returning();
    return created;
  }

  async updateVisitor(id: string, visitor: Partial<InsertVisitor>): Promise<Visitor | undefined> {
    const [updated] = await db.update(visitors).set(visitor).where(eq(visitors.id, id)).returning();
    return updated;
  }

  // Volunteer Visits
  async getVolunteerVisits(volunteerId: string): Promise<VolunteerVisit[]> {
    return db.select().from(volunteerVisits).where(eq(volunteerVisits.volunteerId, volunteerId)).orderBy(desc(volunteerVisits.createdAt));
  }

  async createVolunteerVisit(visit: InsertVolunteerVisit): Promise<VolunteerVisit> {
    const [created] = await db.insert(volunteerVisits).values(visit).returning();
    return created;
  }

  // App Users (Volunteer Portal)
  async getAppUsers(): Promise<AppUser[]> {
    return db.select().from(appUsers).orderBy(desc(appUsers.createdAt));
  }

  async getAppUser(id: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return user;
  }

  async getAppUserByMobile(mobileNumber: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.mobileNumber, mobileNumber));
    return user;
  }

  async getAppUserByEmail(email: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email));
    return user;
  }

  async createAppUser(user: InsertAppUser): Promise<AppUser> {
    const [created] = await db.insert(appUsers).values(user).returning();
    return created;
  }

  async updateAppUser(id: string, user: Partial<InsertAppUser>): Promise<AppUser | undefined> {
    const [updated] = await db.update(appUsers).set(user).where(eq(appUsers.id, id)).returning();
    return updated;
  }

  async deleteAppUser(id: string): Promise<void> {
    await db.delete(userAdditionalRoles).where(eq(userAdditionalRoles.appUserId, id));
    await db.delete(taskSubmissions).where(eq(taskSubmissions.appUserId, id));
    await db.delete(cscReports).where(eq(cscReports.appUserId, id));
    await db.delete(mappedVolunteers).where(eq(mappedVolunteers.addedByUserId, id));
    await db.delete(supporters).where(eq(supporters.addedByUserId, id));
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.appUserId, id));
    await db.delete(hstcSubmissions).where(eq(hstcSubmissions.appUserId, id));
    await db.delete(voterRegistrationSubmissions).where(eq(voterRegistrationSubmissions.appUserId, id));
    await db.delete(appUsers).where(eq(appUsers.id, id));
  }

  async deleteAppUsersBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(appUsers).where(inArray(appUsers.id, ids));
  }

  // CSCs
  async getCscs(): Promise<Csc[]> {
    return db.select().from(cscs);
  }

  async getCscsByVillage(villageId: string): Promise<Csc[]> {
    return db.select().from(cscs).where(and(eq(cscs.villageId, villageId), eq(cscs.isActive, true)));
  }

  async getCsc(id: string): Promise<Csc | undefined> {
    const [csc] = await db.select().from(cscs).where(eq(cscs.id, id));
    return csc;
  }

  async createCsc(csc: InsertCsc): Promise<Csc> {
    const [created] = await db.insert(cscs).values(csc).returning();
    return created;
  }

  async updateCsc(id: string, csc: Partial<InsertCsc>): Promise<Csc | undefined> {
    const [updated] = await db.update(cscs).set(csc).where(eq(cscs.id, id)).returning();
    return updated;
  }

  // CSC Reports
  async getCscReports(): Promise<CscReport[]> {
    return db.select().from(cscReports).orderBy(desc(cscReports.createdAt));
  }

  async getCscReportsByUser(appUserId: string): Promise<CscReport[]> {
    return db.select().from(cscReports).where(eq(cscReports.appUserId, appUserId)).orderBy(desc(cscReports.createdAt));
  }

  async getCscReportsByUserAndVillage(appUserId: string, villageId: string): Promise<CscReport[]> {
    return db.select().from(cscReports).where(and(eq(cscReports.appUserId, appUserId), eq(cscReports.selectedVillageId, villageId))).orderBy(desc(cscReports.createdAt));
  }

  async createCscReport(report: InsertCscReport): Promise<CscReport> {
    const [created] = await db.insert(cscReports).values(report).returning();
    return created;
  }

  // Mapped Volunteers
  async getMappedVolunteers(): Promise<MappedVolunteer[]> {
    return db.select().from(mappedVolunteers).orderBy(desc(mappedVolunteers.createdAt));
  }

  async getMappedVolunteer(id: string): Promise<MappedVolunteer | undefined> {
    const [vol] = await db.select().from(mappedVolunteers).where(eq(mappedVolunteers.id, id));
    return vol;
  }

  async getMappedVolunteersByUser(appUserId: string): Promise<MappedVolunteer[]> {
    return db.select().from(mappedVolunteers).where(eq(mappedVolunteers.addedByUserId, appUserId)).orderBy(desc(mappedVolunteers.createdAt));
  }

  async getMappedVolunteersByUserAndVillage(appUserId: string, villageId: string): Promise<MappedVolunteer[]> {
    return db.select().from(mappedVolunteers).where(and(eq(mappedVolunteers.addedByUserId, appUserId), eq(mappedVolunteers.selectedVillageId, villageId))).orderBy(desc(mappedVolunteers.createdAt));
  }

  async getMappedVolunteerByMobile(mobileNumber: string): Promise<MappedVolunteer | undefined> {
    const [vol] = await db.select().from(mappedVolunteers).where(eq(mappedVolunteers.mobileNumber, mobileNumber));
    return vol;
  }

  async createMappedVolunteer(volunteer: InsertMappedVolunteer): Promise<MappedVolunteer> {
    const [created] = await db.insert(mappedVolunteers).values(volunteer).returning();
    return created;
  }

  async deleteMappedVolunteer(id: string): Promise<void> {
    await db.delete(mappedVolunteers).where(eq(mappedVolunteers.id, id));
  }

  async deleteMappedVolunteersBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(mappedVolunteers).where(inArray(mappedVolunteers.id, ids));
  }

  // Supporters
  async getSupporters(): Promise<Supporter[]> {
    return db.select().from(supporters).orderBy(desc(supporters.createdAt));
  }

  async getSupporter(id: string): Promise<Supporter | undefined> {
    const [supporter] = await db.select().from(supporters).where(eq(supporters.id, id));
    return supporter;
  }

  async getSupportersByUser(appUserId: string): Promise<Supporter[]> {
    return db.select().from(supporters).where(eq(supporters.addedByUserId, appUserId)).orderBy(desc(supporters.createdAt));
  }

  async getSupportersByUserAndVillage(appUserId: string, villageId: string): Promise<Supporter[]> {
    return db.select().from(supporters).where(and(eq(supporters.addedByUserId, appUserId), eq(supporters.selectedVillageId, villageId))).orderBy(desc(supporters.createdAt));
  }

  async getSupporterByMobile(mobileNumber: string): Promise<Supporter | undefined> {
    const [supporter] = await db.select().from(supporters).where(eq(supporters.mobileNumber, mobileNumber));
    return supporter;
  }

  async createSupporter(supporter: InsertSupporter): Promise<Supporter> {
    const [created] = await db.insert(supporters).values(supporter).returning();
    return created;
  }

  async deleteSupporter(id: string): Promise<void> {
    await db.delete(supporters).where(eq(supporters.id, id));
  }

  async deleteSupportersBatch(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(supporters).where(inArray(supporters.id, ids));
  }

  // Task Configs (SDUI)
  async getTaskCategories(activeOnly = true): Promise<TaskCategory[]> {
    const order = asc(taskCategories.sortOrder);
    if (activeOnly) return db.select().from(taskCategories).where(eq(taskCategories.isActive, true)).orderBy(order, asc(taskCategories.name));
    return db.select().from(taskCategories).orderBy(order, asc(taskCategories.name));
  }

  async getTaskCategoriesAll(): Promise<TaskCategory[]> {
    return db.select().from(taskCategories).orderBy(asc(taskCategories.sortOrder), asc(taskCategories.name));
  }

  async getTaskCategory(id: string): Promise<TaskCategory | undefined> {
    const [c] = await db.select().from(taskCategories).where(eq(taskCategories.id, id));
    return c;
  }

  async createTaskCategory(category: InsertTaskCategory): Promise<TaskCategory> {
    const [created] = await db.insert(taskCategories).values(category).returning();
    return created!;
  }

  async updateTaskCategory(id: string, category: Partial<InsertTaskCategory>): Promise<TaskCategory | undefined> {
    const [updated] = await db.update(taskCategories).set(category).where(eq(taskCategories.id, id)).returning();
    return updated;
  }

  async setTaskCategoryTasks(categoryId: string, taskIds: string[]): Promise<void> {
    await db.update(taskConfigs).set({ categoryId: null }).where(eq(taskConfigs.categoryId, categoryId));
    if (taskIds.length > 0) {
      await db.update(taskConfigs).set({ categoryId }).where(inArray(taskConfigs.id, taskIds));
    }
  }

  async deleteTaskCategory(id: string): Promise<void> {
    await db.update(taskConfigs).set({ categoryId: null }).where(eq(taskConfigs.categoryId, id));
    await db.delete(taskCategories).where(eq(taskCategories.id, id));
  }

  async getTaskConfigs(): Promise<TaskConfig[]> {
    return db.select().from(taskConfigs).orderBy(asc(taskConfigs.sortOrder));
  }

  async getTaskConfig(id: string): Promise<TaskConfig | undefined> {
    const [config] = await db.select().from(taskConfigs).where(eq(taskConfigs.id, id));
    return config;
  }

  async createTaskConfig(config: InsertTaskConfig): Promise<TaskConfig> {
    const [created] = await db.insert(taskConfigs).values(config).returning();
    return created;
  }

  async updateTaskConfig(id: string, config: Partial<InsertTaskConfig>): Promise<TaskConfig | undefined> {
    const [updated] = await db.update(taskConfigs).set(config).where(eq(taskConfigs.id, id)).returning();
    return updated;
  }

  async deleteTaskConfig(id: string): Promise<void> {
    await db.delete(formFields).where(eq(formFields.taskConfigId, id));
    await db.delete(taskSubmissions).where(eq(taskSubmissions.taskConfigId, id));
    await db.delete(taskConfigs).where(eq(taskConfigs.id, id));
  }

  // Form Fields
  async getFormFields(taskConfigId: string): Promise<FormField[]> {
    return db.select().from(formFields).where(eq(formFields.taskConfigId, taskConfigId)).orderBy(asc(formFields.sortOrder));
  }

  async getFormFieldsByType(formType: string): Promise<FormField[]> {
    return db.select().from(formFields).where(eq(formFields.formType, formType)).orderBy(asc(formFields.sortOrder));
  }

  async getFormField(id: string): Promise<FormField | undefined> {
    const [field] = await db.select().from(formFields).where(eq(formFields.id, id));
    return field;
  }

  async createFormField(field: InsertFormField): Promise<FormField> {
    const [created] = await db.insert(formFields).values(field).returning();
    return created;
  }

  async updateFormField(id: string, field: Partial<InsertFormField>): Promise<FormField | undefined> {
    const [updated] = await db.update(formFields).set(field).where(eq(formFields.id, id)).returning();
    return updated;
  }

  async deleteFormField(id: string): Promise<void> {
    await db.delete(fieldOptions).where(eq(fieldOptions.formFieldId, id));
    await db.delete(fieldConditions).where(eq(fieldConditions.formFieldId, id));
    await db.delete(formFields).where(eq(formFields.id, id));
  }

  // Field Options
  async getFieldOptions(formFieldId: string): Promise<FieldOption[]> {
    return db.select().from(fieldOptions).where(eq(fieldOptions.formFieldId, formFieldId)).orderBy(asc(fieldOptions.sortOrder));
  }

  async createFieldOption(option: InsertFieldOption): Promise<FieldOption> {
    const [created] = await db.insert(fieldOptions).values(option).returning();
    return created;
  }

  async updateFieldOption(id: string, option: Partial<InsertFieldOption>): Promise<FieldOption | undefined> {
    const [updated] = await db.update(fieldOptions).set(option).where(eq(fieldOptions.id, id)).returning();
    return updated;
  }

  async deleteFieldOption(id: string): Promise<void> {
    await db.delete(fieldOptions).where(eq(fieldOptions.id, id));
  }

  // Field Conditions
  async getFieldConditions(formFieldId: string): Promise<FieldCondition[]> {
    return db.select().from(fieldConditions).where(eq(fieldConditions.formFieldId, formFieldId));
  }

  async createFieldCondition(condition: InsertFieldCondition): Promise<FieldCondition> {
    const [created] = await db.insert(fieldConditions).values(condition).returning();
    return created;
  }

  async deleteFieldCondition(id: string): Promise<void> {
    await db.delete(fieldConditions).where(eq(fieldConditions.id, id));
  }

  // Task Submissions
  async getTaskSubmissions(taskConfigId?: string): Promise<TaskSubmission[]> {
    if (taskConfigId) {
      return db.select().from(taskSubmissions).where(eq(taskSubmissions.taskConfigId, taskConfigId)).orderBy(desc(taskSubmissions.createdAt));
    }
    return db.select().from(taskSubmissions).orderBy(desc(taskSubmissions.createdAt));
  }

  async getTaskSubmissionsByUser(appUserId: string): Promise<TaskSubmission[]> {
    return db.select().from(taskSubmissions).where(eq(taskSubmissions.appUserId, appUserId)).orderBy(desc(taskSubmissions.createdAt));
  }

  async getTaskSubmissionsByUserAndVillage(appUserId: string, villageId: string, taskConfigId?: string): Promise<TaskSubmission[]> {
    const conditions = [eq(taskSubmissions.appUserId, appUserId), eq(taskSubmissions.selectedVillageId, villageId)];
    if (taskConfigId) conditions.push(eq(taskSubmissions.taskConfigId, taskConfigId));
    return db.select().from(taskSubmissions).where(and(...conditions)).orderBy(desc(taskSubmissions.createdAt));
  }

  async createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission> {
    const [created] = await db.insert(taskSubmissions).values(submission).returning();
    return created;
  }

  // User Additional Roles
  async getUserAdditionalRoles(appUserId: string): Promise<UserAdditionalRole[]> {
    return db.select().from(userAdditionalRoles).where(eq(userAdditionalRoles.appUserId, appUserId)).orderBy(asc(userAdditionalRoles.createdAt));
  }

  async createUserAdditionalRole(role: InsertUserAdditionalRole): Promise<UserAdditionalRole> {
    const [created] = await db.insert(userAdditionalRoles).values(role).returning();
    return created;
  }

  async deleteUserAdditionalRolesByUser(appUserId: string): Promise<void> {
    await db.delete(userAdditionalRoles).where(eq(userAdditionalRoles.appUserId, appUserId));
  }

  // CSV Uploads
  async getCsvUploads(): Promise<CsvUpload[]> {
    return db.select().from(csvUploads).orderBy(desc(csvUploads.createdAt));
  }

  async createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload> {
    const [created] = await db.insert(csvUploads).values(upload).returning();
    return created;
  }

  // Voter List
  async getVoterListRecords(limit = 50, offset = 0, search?: string): Promise<VoterListRecord[]> {
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      return db.select().from(voterList)
        .where(sql`(LOWER(${voterList.vcardId}) LIKE ${term} OR LOWER(${voterList.fullName}) LIKE ${term} OR LOWER(${voterList.engFirstName}) LIKE ${term} OR LOWER(${voterList.engLastName}) LIKE ${term} OR LOWER(${voterList.mobileNo1}) LIKE ${term} OR LOWER(${voterList.boothNo}) LIKE ${term} OR LOWER(${voterList.engVillage}) LIKE ${term})`)
        .limit(limit).offset(offset);
    }
    return db.select().from(voterList).limit(limit).offset(offset);
  }

  async getVoterListCount(search?: string): Promise<number> {
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      const [result] = await db.select({ count: count() }).from(voterList)
        .where(sql`(LOWER(${voterList.vcardId}) LIKE ${term} OR LOWER(${voterList.fullName}) LIKE ${term} OR LOWER(${voterList.engFirstName}) LIKE ${term} OR LOWER(${voterList.engLastName}) LIKE ${term} OR LOWER(${voterList.mobileNo1}) LIKE ${term} OR LOWER(${voterList.boothNo}) LIKE ${term} OR LOWER(${voterList.engVillage}) LIKE ${term})`);
      return result?.count || 0;
    }
    const [result] = await db.select({ count: count() }).from(voterList);
    return result?.count || 0;
  }

  async getVoterByVcardId(vcardId: string): Promise<VoterListRecord | undefined> {
    const [record] = await db.select().from(voterList).where(eq(voterList.vcardId, vcardId));
    return record;
  }

  async createVoterListRecord(record: InsertVoterList): Promise<VoterListRecord> {
    const [created] = await db.insert(voterList).values(record).returning();
    return created;
  }

  async clearVoterList(): Promise<void> {
    await db.delete(voterList);
  }

  // Voter Mapping Master (sheet import: BoothId, Name, Father's Name, Gender, Age, Voter ID, Village Name)
  // When voterIdsWithTasks is provided, rows with that voter_id (normalized) are ordered first (jiska task aya hai sabse upar)
  async getVoterMappingMaster(limit: number, offset: number, search?: string, villageFilter?: string, voterIdsWithTasks?: string[]): Promise<VoterMappingMaster[]> {
    const conditions = [];
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(sql`(LOWER(${voterMappingMaster.voterId}) LIKE ${term} OR LOWER(${voterMappingMaster.name}) LIKE ${term} OR LOWER(${voterMappingMaster.fatherName}) LIKE ${term} OR LOWER(${voterMappingMaster.villageName}) LIKE ${term} OR LOWER(${voterMappingMaster.boothId}) LIKE ${term})`);
    }
    if (villageFilter && villageFilter.trim()) {
      conditions.push(sql`LOWER(TRIM(${voterMappingMaster.villageName})) = LOWER(TRIM(${villageFilter}))`);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const hasTaskSet = voterIdsWithTasks && voterIdsWithTasks.length > 0;
    const q = db.select().from(voterMappingMaster).where(whereClause);
    if (hasTaskSet) {
      const inList = sql.join(voterIdsWithTasks.map((id) => sql`${id}`), sql`, `);
      return q
        .orderBy(asc(sql`CASE WHEN LOWER(TRIM(${voterMappingMaster.voterId})) IN (${inList}) THEN 0 ELSE 1 END`), desc(voterMappingMaster.slNo))
        .limit(limit).offset(offset);
    }
    return q.orderBy(desc(voterMappingMaster.slNo)).limit(limit).offset(offset);
  }

  async getVoterMappingMasterCount(search?: string, villageFilter?: string): Promise<number> {
    const conditions = [];
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(sql`(LOWER(${voterMappingMaster.voterId}) LIKE ${term} OR LOWER(${voterMappingMaster.name}) LIKE ${term} OR LOWER(${voterMappingMaster.fatherName}) LIKE ${term} OR LOWER(${voterMappingMaster.villageName}) LIKE ${term} OR LOWER(${voterMappingMaster.boothId}) LIKE ${term})`);
    }
    if (villageFilter && villageFilter.trim()) {
      conditions.push(sql`LOWER(TRIM(${voterMappingMaster.villageName})) = LOWER(TRIM(${villageFilter}))`);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [result] = await db.select({ count: count() }).from(voterMappingMaster).where(whereClause);
    return result?.count || 0;
  }

  async insertVoterMappingMasterChunk(rows: InsertVoterMappingMaster[]): Promise<number> {
    if (rows.length === 0) return 0;
    await db.insert(voterMappingMaster).values(rows);
    return rows.length;
  }

  async clearVoterMappingMaster(): Promise<void> {
    await db.delete(voterMappingMaster);
  }

  /** All distinct normalized (lowercase trim) voter ids that have at least one HSTC submission (for "has task" sort) */
  async getVoterIdsWithHstcMatch(): Promise<Set<string>> {
    const rows = await db.select({ ocrVoterId: hstcSubmissions.ocrVoterId })
      .from(hstcSubmissions)
      .where(sql`${hstcSubmissions.ocrVoterId} IS NOT NULL`);
    const set = new Set<string>();
    for (const r of rows) {
      if (r.ocrVoterId) set.add((r.ocrVoterId as string).trim().toLowerCase());
    }
    return set;
  }

  /** HSTC submissions that have ocr_voter_id matching any of the given normalized (lowercase trim) voter ids */
  async getHstcSubmissionIdsByVoterIds(normalizedVoterIds: string[]): Promise<{ submissionId: string; voterId: string }[]> {
    if (normalizedVoterIds.length === 0) return [];
    const rows = await db.select({ id: hstcSubmissions.id, ocrVoterId: hstcSubmissions.ocrVoterId })
      .from(hstcSubmissions)
      .where(sql`${hstcSubmissions.ocrVoterId} IS NOT NULL`);
    const set = new Set(normalizedVoterIds);
    return rows
      .filter((r) => r.ocrVoterId && set.has((r.ocrVoterId || "").trim().toLowerCase()))
      .map((r) => ({ submissionId: r.id, voterId: (r.ocrVoterId || "").trim() }));
  }

  // Push Subscriptions
  async getPushSubscriptionsByUser(appUserId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.appUserId, appUserId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions);
  }

  async createPushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub.endpoint));
    if (existing.length > 0) {
      const [updated] = await db.update(pushSubscriptions)
        .set({ appUserId: sub.appUserId, p256dh: sub.p256dh, auth: sub.auth })
        .where(eq(pushSubscriptions.endpoint, sub.endpoint))
        .returning();
      return updated;
    }
    const [created] = await db.insert(pushSubscriptions).values(sub).returning();
    return created;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionsByUser(appUserId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.appUserId, appUserId));
  }

  // Chat Groups
  async getDefaultChatGroup(): Promise<ChatGroup | null> {
    const [g] = await db.select().from(chatGroups).where(eq(chatGroups.isAllUsersGroup, true)).limit(1);
    return g ?? null;
  }

  async getOrCreateDefaultChatGroup(): Promise<ChatGroup> {
    let g = await this.getDefaultChatGroup();
    if (g) return g;
    const [created] = await db.insert(chatGroups).values({
      name: "Rural Connect Hub",
      isAllUsersGroup: true,
    }).returning();
    g = created;
    const allAppUsers = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.isActive, true));
    for (const u of allAppUsers) {
      const isMember = await this.isGroupMember(g!.id, u.id);
      if (!isMember) await this.addGroupMember(g!.id, u.id, "member");
    }
    return g!;
  }

  async getChatGroup(id: string): Promise<ChatGroup | undefined> {
    const [g] = await db.select().from(chatGroups).where(eq(chatGroups.id, id));
    return g;
  }

  async addGroupMember(groupId: string, appUserId: string, role = "member"): Promise<GroupMember> {
    const existing = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.appUserId, appUserId)));
    if (existing[0]) return existing[0];
    const [m] = await db.insert(groupMembers).values({ groupId, appUserId, role }).returning();
    return m;
  }

  async removeGroupMember(groupId: string, appUserId: string): Promise<boolean> {
    const [deleted] = await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.appUserId, appUserId))).returning({ id: groupMembers.id });
    return !!deleted;
  }

  async getGroupMemberIds(groupId: string): Promise<string[]> {
    const rows = await db
      .select({ appUserId: groupMembers.appUserId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    return rows.map((r: { appUserId: string }) => r.appUserId);
  }

  async isGroupMember(groupId: string, appUserId: string): Promise<boolean> {
    const [m] = await db.select().from(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.appUserId, appUserId)));
    return !!m;
  }

  async getGroupMessages(groupId: string, limit: number, beforeId?: string): Promise<GroupMessage[]> {
    if (beforeId) {
      const [before] = await db.select().from(groupMessages).where(eq(groupMessages.id, beforeId));
      if (before) {
        return db.select().from(groupMessages)
          .where(and(eq(groupMessages.groupId, groupId), sql`${groupMessages.createdAt} < ${before.createdAt}`))
          .orderBy(desc(groupMessages.createdAt)).limit(limit);
      }
    }
    return db.select().from(groupMessages).where(eq(groupMessages.groupId, groupId)).orderBy(desc(groupMessages.createdAt)).limit(limit);
  }

  async getGroupMessage(id: string): Promise<GroupMessage | undefined> {
    const [m] = await db.select().from(groupMessages).where(eq(groupMessages.id, id));
    return m;
  }

  async createGroupMessage(data: InsertGroupMessage): Promise<GroupMessage> {
    const [msg] = await db.insert(groupMessages).values(data as any).returning();
    return msg;
  }

  async updateGroupMessage(id: string, data: Partial<GroupMessage>): Promise<GroupMessage | undefined> {
    const [updated] = await db.update(groupMessages).set(data).where(eq(groupMessages.id, id)).returning();
    return updated;
  }

  async deleteGroupMessage(id: string): Promise<boolean> {
    const [deleted] = await db.delete(groupMessages).where(eq(groupMessages.id, id)).returning({ id: groupMessages.id });
    return !!deleted;
  }

  async createGroupCall(data: InsertGroupCall): Promise<GroupCall> {
    const [c] = await db.insert(groupCalls).values(data).returning();
    return c;
  }

  async getGroupCall(id: string): Promise<GroupCall | undefined> {
    const [c] = await db.select().from(groupCalls).where(eq(groupCalls.id, id));
    return c;
  }

  async getActiveGroupCallByGroupId(groupId: string): Promise<GroupCall | undefined> {
    // Only treat recent ringing/active calls as blocking; older ones are auto-considered ended
    const [c] = await db.select().from(groupCalls)
      .where(and(
        eq(groupCalls.groupId, groupId),
        inArray(groupCalls.status, ["ringing", "active"]),
        sql`${groupCalls.createdAt} > NOW() - INTERVAL '1 minute'`
      ))
      .orderBy(desc(groupCalls.createdAt))
      .limit(1);
    return c;
  }

  async updateGroupCall(id: string, data: Partial<GroupCall>): Promise<GroupCall | undefined> {
    const [c] = await db.update(groupCalls).set(data).where(eq(groupCalls.id, id)).returning();
    return c;
  }

  async addGroupCallParticipant(data: InsertGroupCallParticipant): Promise<GroupCallParticipant> {
    const [p] = await db.insert(groupCallParticipants).values(data).returning();
    return p;
  }

  async getGroupCallParticipants(callId: string): Promise<GroupCallParticipant[]> {
    return db.select().from(groupCallParticipants).where(eq(groupCallParticipants.callId, callId));
  }

  async updateGroupCallParticipant(callId: string, appUserId: string, data: Partial<GroupCallParticipant>): Promise<GroupCallParticipant | undefined> {
    const [p] = await db.update(groupCallParticipants).set(data).where(and(eq(groupCallParticipants.callId, callId), eq(groupCallParticipants.appUserId, appUserId))).returning();
    return p;
  }

  // HSTC Submissions - list without heavy image columns to avoid response size limit (e.g. Neon 67MB)
  async getHstcSubmissions(): Promise<HstcSubmission[]> {
    const rows = await db
      .select({
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
      })
      .from(hstcSubmissions)
      .orderBy(desc(hstcSubmissions.createdAt));
    return rows as HstcSubmission[];
  }

  async getHstcSubmission(id: string): Promise<HstcSubmission | undefined> {
    const [sub] = await db.select().from(hstcSubmissions).where(eq(hstcSubmissions.id, id));
    return sub;
  }

  async getHstcSubmissionsByUser(appUserId: string): Promise<HstcSubmission[]> {
    const rows = await db
      .select({
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
      })
      .from(hstcSubmissions)
      .where(eq(hstcSubmissions.appUserId, appUserId))
      .orderBy(desc(hstcSubmissions.createdAt));
    return rows as HstcSubmission[];
  }

  async createHstcSubmission(data: InsertHstcSubmission): Promise<HstcSubmission> {
    const [sub] = await db.insert(hstcSubmissions).values(data).returning();
    return sub;
  }

  async updateHstcSubmission(id: string, data: Partial<InsertHstcSubmission>): Promise<HstcSubmission | undefined> {
    const [sub] = await db.update(hstcSubmissions).set(data).where(eq(hstcSubmissions.id, id)).returning();
    return sub;
  }

  // Voter Registration Submissions
  async getVoterRegistrationSubmissions(): Promise<VoterRegistrationSubmission[]> {
    return db.select().from(voterRegistrationSubmissions).orderBy(desc(voterRegistrationSubmissions.createdAt));
  }

  async getVoterRegistrationSubmission(id: string): Promise<VoterRegistrationSubmission | undefined> {
    const [sub] = await db.select().from(voterRegistrationSubmissions).where(eq(voterRegistrationSubmissions.id, id));
    return sub;
  }

  async getVoterRegistrationSubmissionsByUser(appUserId: string): Promise<VoterRegistrationSubmission[]> {
    return db.select().from(voterRegistrationSubmissions)
      .where(eq(voterRegistrationSubmissions.appUserId, appUserId))
      .orderBy(desc(voterRegistrationSubmissions.createdAt));
  }

  async createVoterRegistrationSubmission(data: InsertVoterRegistrationSubmission): Promise<VoterRegistrationSubmission> {
    const [sub] = await db.insert(voterRegistrationSubmissions).values(data).returning();
    return sub;
  }

  async updateVoterRegistrationSubmission(id: string, data: Partial<InsertVoterRegistrationSubmission>): Promise<VoterRegistrationSubmission | undefined> {
    const [sub] = await db.update(voterRegistrationSubmissions).set(data).where(eq(voterRegistrationSubmissions.id, id)).returning();
    return sub;
  }

  async deleteVoterRegistrationSubmission(id: string): Promise<void> {
    await db.delete(voterRegistrationSubmissions).where(eq(voterRegistrationSubmissions.id, id));
  }

  // SDSK Categories
  async getSdskCategories(): Promise<SdskCategory[]> {
    return db.select().from(sdskCategories).orderBy(desc(sdskCategories.createdAt));
  }

  async getSdskCategory(id: string): Promise<SdskCategory | undefined> {
    const [cat] = await db.select().from(sdskCategories).where(eq(sdskCategories.id, id));
    return cat;
  }

  async createSdskCategory(data: InsertSdskCategory): Promise<SdskCategory> {
    const [cat] = await db.insert(sdskCategories).values(data).returning();
    return cat;
  }

  async updateSdskCategory(id: string, data: Partial<InsertSdskCategory>): Promise<SdskCategory | undefined> {
    const [cat] = await db.update(sdskCategories).set(data).where(eq(sdskCategories.id, id)).returning();
    return cat;
  }

  async deleteSdskCategory(id: string): Promise<boolean> {
    const result = await db.delete(sdskCategories).where(eq(sdskCategories.id, id));
    return true;
  }

  // SDSK Submissions
  async getSdskSubmissions(): Promise<SdskSubmission[]> {
    return db.select().from(sdskSubmissions).orderBy(desc(sdskSubmissions.createdAt));
  }

  async getSdskSubmission(id: string): Promise<SdskSubmission | undefined> {
    const [sub] = await db.select().from(sdskSubmissions).where(eq(sdskSubmissions.id, id));
    return sub;
  }

  async getSdskSubmissionsByUser(appUserId: string): Promise<SdskSubmission[]> {
    return db.select().from(sdskSubmissions)
      .where(eq(sdskSubmissions.appUserId, appUserId))
      .orderBy(desc(sdskSubmissions.createdAt));
  }

  async createSdskSubmission(data: InsertSdskSubmission): Promise<SdskSubmission> {
    const [sub] = await db.insert(sdskSubmissions).values(data).returning();
    return sub;
  }

  // Surveys
  async getSurveys(): Promise<Survey[]> {
    return db.select().from(surveys).orderBy(desc(surveys.createdAt));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [s] = await db.select().from(surveys).where(eq(surveys.id, id));
    return s;
  }

  async createSurvey(data: InsertSurvey): Promise<Survey> {
    const [s] = await db.insert(surveys).values(data).returning();
    return s;
  }

  async updateSurvey(id: string, data: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const [s] = await db.update(surveys).set(data).where(eq(surveys.id, id)).returning();
    return s;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    await db.delete(surveyResponses).where(eq(surveyResponses.surveyId, id));
    await db.delete(surveyQuestions).where(eq(surveyQuestions.surveyId, id));
    await db.delete(surveys).where(eq(surveys.id, id));
    return true;
  }

  async getSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    return db.select().from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(asc(surveyQuestions.sortOrder));
  }

  async createSurveyQuestion(data: InsertSurveyQuestion): Promise<SurveyQuestion> {
    const [q] = await db.insert(surveyQuestions).values(data).returning();
    return q;
  }

  async updateSurveyQuestion(id: string, data: Partial<InsertSurveyQuestion>): Promise<SurveyQuestion | undefined> {
    const [q] = await db.update(surveyQuestions).set(data).where(eq(surveyQuestions.id, id)).returning();
    return q;
  }

  async deleteSurveyQuestion(id: string): Promise<boolean> {
    await db.delete(surveyQuestions).where(eq(surveyQuestions.id, id));
    return true;
  }

  async deleteSurveyQuestionsBySurvey(surveyId: string): Promise<boolean> {
    await db.delete(surveyQuestions).where(eq(surveyQuestions.surveyId, surveyId));
    return true;
  }

  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    return db.select().from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(desc(surveyResponses.createdAt));
  }

  async getSurveyResponseByUser(surveyId: string, appUserId: string): Promise<SurveyResponse | undefined> {
    const [r] = await db.select().from(surveyResponses)
      .where(and(eq(surveyResponses.surveyId, surveyId), eq(surveyResponses.appUserId, appUserId)));
    return r;
  }

  async createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse> {
    const [r] = await db.insert(surveyResponses).values(data).returning();
    return r;
  }

  // Sunwai Complaints
  async createSunwaiComplaint(data: InsertSunwaiComplaint): Promise<SunwaiComplaint> {
    const [c] = await db.insert(sunwaiComplaints).values(data).returning();
    return c;
  }

  async getSunwaiComplaints(): Promise<SunwaiComplaint[]> {
    return db.select().from(sunwaiComplaints).orderBy(desc(sunwaiComplaints.createdAt));
  }

  async getSunwaiComplaintById(id: string): Promise<SunwaiComplaint | undefined> {
    const [c] = await db.select().from(sunwaiComplaints).where(eq(sunwaiComplaints.id, id));
    return c;
  }

  async updateSunwaiComplaint(id: string, data: Partial<InsertSunwaiComplaint>): Promise<SunwaiComplaint | undefined> {
    const [c] = await db.update(sunwaiComplaints).set(data).where(eq(sunwaiComplaints.id, id)).returning();
    return c;
  }

  async getSunwaiComplaintsByAppUser(appUserId: string): Promise<SunwaiComplaint[]> {
    return db.select().from(sunwaiComplaints)
      .where(eq(sunwaiComplaints.appUserId, appUserId))
      .orderBy(desc(sunwaiComplaints.createdAt));
  }

  // Sunwai Logs
  async createSunwaiLog(data: InsertSunwaiLog): Promise<SunwaiLog> {
    const [l] = await db.insert(sunwaiLogs).values(data).returning();
    return l;
  }

  async getSunwaiLogsByComplaint(complaintId: string): Promise<SunwaiLog[]> {
    return db.select().from(sunwaiLogs)
      .where(eq(sunwaiLogs.complaintId, complaintId))
      .orderBy(asc(sunwaiLogs.createdAt));
  }

  // Nasha Viruddh Yuddh Reports
  async createNvyReport(data: InsertNvyReport): Promise<NvyReport> {
    const [r] = await db.insert(nvyReports).values(data).returning();
    return r;
  }

  async getNvyReports(): Promise<NvyReport[]> {
    return db.select().from(nvyReports).orderBy(desc(nvyReports.createdAt));
  }

  // Outdoor Ad Submissions
  async createOutdoorAd(data: InsertOutdoorAd): Promise<OutdoorAdSubmission> {
    const [sub] = await db.insert(outdoorAdSubmissions).values(data).returning();
    return sub;
  }

  async getOutdoorAds(): Promise<OutdoorAdSubmission[]> {
    return db.select().from(outdoorAdSubmissions).orderBy(desc(outdoorAdSubmissions.createdAt));
  }

  async getOutdoorAdById(id: string): Promise<OutdoorAdSubmission | undefined> {
    const [sub] = await db.select().from(outdoorAdSubmissions).where(eq(outdoorAdSubmissions.id, id));
    return sub;
  }

  async updateOutdoorAd(id: string, data: Partial<InsertOutdoorAd>): Promise<OutdoorAdSubmission | undefined> {
    const [sub] = await db.update(outdoorAdSubmissions).set(data).where(eq(outdoorAdSubmissions.id, id)).returning();
    return sub;
  }

  async getOutdoorAdsByUser(appUserId: string): Promise<OutdoorAdSubmission[]> {
    return db.select().from(outdoorAdSubmissions)
      .where(eq(outdoorAdSubmissions.appUserId, appUserId))
      .orderBy(desc(outdoorAdSubmissions.createdAt));
  }

  // Gov School Issue Categories
  async getGovSchoolCategories(): Promise<GovSchoolIssueCategory[]> {
    return db.select().from(govSchoolIssueCategories).orderBy(asc(govSchoolIssueCategories.name));
  }

  async createGovSchoolCategory(data: InsertGovSchoolIssueCategory): Promise<GovSchoolIssueCategory> {
    const [cat] = await db.insert(govSchoolIssueCategories).values(data).returning();
    return cat;
  }

  async updateGovSchoolCategory(id: string, data: Partial<InsertGovSchoolIssueCategory>): Promise<GovSchoolIssueCategory | undefined> {
    const [cat] = await db.update(govSchoolIssueCategories).set(data).where(eq(govSchoolIssueCategories.id, id)).returning();
    return cat;
  }

  async deleteGovSchoolCategory(id: string): Promise<boolean> {
    const result = await db.delete(govSchoolIssueCategories).where(eq(govSchoolIssueCategories.id, id));
    return true;
  }

  // Gov School Submissions
  async createGovSchoolSubmission(data: InsertGovSchoolSubmission): Promise<GovSchoolSubmission> {
    const [sub] = await db.insert(govSchoolSubmissions).values(data).returning();
    return sub;
  }

  async getGovSchoolSubmissions(): Promise<GovSchoolSubmission[]> {
    return db.select().from(govSchoolSubmissions).orderBy(desc(govSchoolSubmissions.createdAt));
  }

  async getGovSchoolSubmissionById(id: string): Promise<GovSchoolSubmission | undefined> {
    const [sub] = await db.select().from(govSchoolSubmissions).where(eq(govSchoolSubmissions.id, id));
    return sub;
  }

  async updateGovSchoolSubmission(id: string, data: Partial<InsertGovSchoolSubmission>): Promise<GovSchoolSubmission | undefined> {
    const [sub] = await db.update(govSchoolSubmissions).set(data).where(eq(govSchoolSubmissions.id, id)).returning();
    return sub;
  }

  async getGovSchoolSubmissionsByUser(appUserId: string): Promise<GovSchoolSubmission[]> {
    return db.select().from(govSchoolSubmissions)
      .where(eq(govSchoolSubmissions.appUserId, appUserId))
      .orderBy(desc(govSchoolSubmissions.createdAt));
  }

  // Gov School Logs
  async createGovSchoolLog(data: InsertGovSchoolLog): Promise<GovSchoolLog> {
    const [log] = await db.insert(govSchoolLogs).values(data).returning();
    return log;
  }

  async getGovSchoolLogsBySubmission(submissionId: string): Promise<GovSchoolLog[]> {
    return db.select().from(govSchoolLogs)
      .where(eq(govSchoolLogs.submissionId, submissionId))
      .orderBy(asc(govSchoolLogs.createdAt));
  }

  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const [a] = await db.insert(appointments).values(data).returning();
    return a;
  }

  async getAppointments(): Promise<Appointment[]> {
    return db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const [a] = await db.select().from(appointments).where(eq(appointments.id, id));
    return a;
  }

  async updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [a] = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return a;
  }

  async getAppointmentsByUser(appUserId: string): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(eq(appointments.appUserId, appUserId))
      .orderBy(desc(appointments.createdAt));
  }

  async createAppointmentLog(data: InsertAppointmentLog): Promise<AppointmentLog> {
    const [l] = await db.insert(appointmentLogs).values(data).returning();
    return l;
  }

  async getAppointmentLogsByAppointment(appointmentId: string): Promise<AppointmentLog[]> {
    return db.select().from(appointmentLogs)
      .where(eq(appointmentLogs.appointmentId, appointmentId))
      .orderBy(asc(appointmentLogs.createdAt));
  }

  // Event Venues
  async createEventVenue(data: InsertEventVenue): Promise<EventVenue> {
    const [row] = await db.insert(eventVenues).values(data).returning();
    return row;
  }

  async updateEventVenue(id: string, data: Partial<InsertEventVenue>): Promise<EventVenue | undefined> {
    const [row] = await db.update(eventVenues).set(data).where(eq(eventVenues.id, id)).returning();
    return row;
  }

  async getEventVenue(id: string): Promise<EventVenue | undefined> {
    const [row] = await db.select().from(eventVenues).where(eq(eventVenues.id, id));
    return row;
  }

  async getEventVenues(): Promise<EventVenue[]> {
    return db.select().from(eventVenues).orderBy(desc(eventVenues.createdAt));
  }

  async getEventVenuesByUser(appUserId: string): Promise<EventVenue[]> {
    return db.select().from(eventVenues)
      .where(eq(eventVenues.appUserId, appUserId))
      .orderBy(desc(eventVenues.createdAt));
  }

  // Tirth Yatra
  async createTirthYatraRequest(data: InsertTirthYatraRequest): Promise<TirthYatraRequest> {
    const [row] = await db.insert(tirthYatraRequests).values(data).returning();
    return row;
  }

  async updateTirthYatraRequest(id: string, data: Partial<InsertTirthYatraRequest>): Promise<TirthYatraRequest | undefined> {
    const [row] = await db.update(tirthYatraRequests).set(data).where(eq(tirthYatraRequests.id, id)).returning();
    return row;
  }

  async getTirthYatraRequest(id: string): Promise<TirthYatraRequest | undefined> {
    const [row] = await db.select().from(tirthYatraRequests).where(eq(tirthYatraRequests.id, id));
    return row;
  }

  async getTirthYatraRequests(): Promise<TirthYatraRequest[]> {
    return db.select().from(tirthYatraRequests).orderBy(desc(tirthYatraRequests.createdAt));
  }

  async getTirthYatraRequestsByUser(appUserId: string): Promise<TirthYatraRequest[]> {
    return db.select().from(tirthYatraRequests)
      .where(eq(tirthYatraRequests.appUserId, appUserId))
      .orderBy(desc(tirthYatraRequests.createdAt));
  }

  /** All distinct normalized (lowercase trim) voter ids that have at least one Tirth Yatra request with OCR voter id */
  async getVoterIdsWithTirthYatraMatch(): Promise<Set<string>> {
    const rows = await db.select({ ocrVoterId: tirthYatraRequests.ocrVoterId })
      .from(tirthYatraRequests)
      .where(sql`${tirthYatraRequests.ocrVoterId} IS NOT NULL`);
    const set = new Set<string>();
    for (const r of rows) {
      if (r.ocrVoterId) set.add((r.ocrVoterId as string).trim().toLowerCase());
    }
    return set;
  }

  /** Tirth Yatra request ids that have ocr_voter_id matching any of the given normalized voter ids */
  async getTirthYatraIdsByVoterIds(normalizedVoterIds: string[]): Promise<{ id: string; ocrVoterId: string }[]> {
    if (normalizedVoterIds.length === 0) return [];
    const rows = await db.select({ id: tirthYatraRequests.id, ocrVoterId: tirthYatraRequests.ocrVoterId })
      .from(tirthYatraRequests)
      .where(sql`${tirthYatraRequests.ocrVoterId} IS NOT NULL`);
    const set = new Set(normalizedVoterIds);
    return rows
      .filter((r) => r.ocrVoterId && set.has((r.ocrVoterId || "").trim().toLowerCase()))
      .map((r) => ({ id: r.id, ocrVoterId: (r.ocrVoterId || "").trim() }));
  }

  async getVoterMappingByVoterId(voterId: string): Promise<VoterMappingMaster | null> {
    const normalized = (voterId || "").trim().toLowerCase();
    if (!normalized) return null;
    const rows = await db.select().from(voterMappingMaster)
      .where(sql`LOWER(TRIM(${voterMappingMaster.voterId})) = ${normalized}`)
      .limit(1);
    return rows[0] ?? null;
  }

  async createMahilaSammanSubmission(data: InsertMahilaSammanSubmission): Promise<MahilaSammanSubmission> {
    const [row] = await db.insert(mahilaSammanSubmissions).values(data).returning();
    return row;
  }

  async updateMahilaSammanSubmission(id: string, data: Partial<InsertMahilaSammanSubmission>): Promise<MahilaSammanSubmission | undefined> {
    const [row] = await db.update(mahilaSammanSubmissions).set({ ...data, updatedAt: new Date() }).where(eq(mahilaSammanSubmissions.id, id)).returning();
    return row;
  }

  async getMahilaSammanSubmission(id: string): Promise<MahilaSammanSubmission | undefined> {
    const [row] = await db.select().from(mahilaSammanSubmissions).where(eq(mahilaSammanSubmissions.id, id));
    return row;
  }

  async getMahilaSammanSubmissions(): Promise<MahilaSammanSubmission[]> {
    return db.select().from(mahilaSammanSubmissions).orderBy(desc(mahilaSammanSubmissions.createdAt));
  }

  async getMahilaSammanSubmissionsByUser(appUserId: string): Promise<MahilaSammanSubmission[]> {
    return db.select().from(mahilaSammanSubmissions)
      .where(eq(mahilaSammanSubmissions.appUserId, appUserId))
      .orderBy(desc(mahilaSammanSubmissions.createdAt));
  }

  async createMahilaSammanPunjabSubmission(data: InsertMahilaSammanPunjabSubmission): Promise<MahilaSammanPunjabSubmission> {
    const [row] = await db.insert(mahilaSammanPunjabSubmissions).values(data).returning();
    return row;
  }

  async updateMahilaSammanPunjabSubmission(id: string, data: Partial<InsertMahilaSammanPunjabSubmission>): Promise<MahilaSammanPunjabSubmission | undefined> {
    const [row] = await db.update(mahilaSammanPunjabSubmissions).set({ ...data, updatedAt: new Date() }).where(eq(mahilaSammanPunjabSubmissions.id, id)).returning();
    return row;
  }

  async getMahilaSammanPunjabSubmission(id: string): Promise<MahilaSammanPunjabSubmission | undefined> {
    const [row] = await db.select().from(mahilaSammanPunjabSubmissions).where(eq(mahilaSammanPunjabSubmissions.id, id));
    return row;
  }

  async getMahilaSammanPunjabSubmissions(): Promise<MahilaSammanPunjabSubmission[]> {
    return db.select().from(mahilaSammanPunjabSubmissions).orderBy(desc(mahilaSammanPunjabSubmissions.createdAt));
  }

  async getMahilaSammanPunjabSubmissionsByUser(appUserId: string): Promise<MahilaSammanPunjabSubmission[]> {
    return db.select().from(mahilaSammanPunjabSubmissions)
      .where(eq(mahilaSammanPunjabSubmissions.appUserId, appUserId))
      .orderBy(desc(mahilaSammanPunjabSubmissions.createdAt));
  }

  // Road Reports
  async createRoadReport(data: InsertRoadReport): Promise<RoadReport> {
    const [r] = await db.insert(roadReports).values(data).returning();
    return r;
  }

  async getRoadReports(): Promise<RoadReport[]> {
    return db.select().from(roadReports).orderBy(desc(roadReports.createdAt));
  }

  async getRoadReportsByUser(appUserId: string): Promise<RoadReport[]> {
    return db.select().from(roadReports)
      .where(eq(roadReports.appUserId, appUserId))
      .orderBy(desc(roadReports.createdAt));
  }

  async createRoadLog(data: InsertRoadLog): Promise<RoadLog> {
    const [log] = await db.insert(roadLogs).values(data).returning();
    return log;
  }

  async getRoadLogsByReport(reportId: string): Promise<RoadLog[]> {
    return db.select().from(roadLogs)
      .where(eq(roadLogs.reportId, reportId))
      .orderBy(asc(roadLogs.createdAt));
  }
}

export const storage = new DatabaseStorage();
