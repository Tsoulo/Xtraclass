import { 
  users, 
  children, 
  teachers, 
  students, 
  tutors,
  topics,
  themes,
  syllabusCalendar,
  schools,
  organizations,
  organizationSchools,
  organizationStudentInvites,
  organizationAccessCodes,
  organizationSubscriptions,
  organizationStudentMemberships,
  classes,
  classStudents,
  pastPapers,
  pastPaperQuestions,
  pastPaperSubmissions,
  exercises,
  exerciseQuestions,
  schoolHolidays,
  homework,
  quizzes,
  homeworkSubmissions,
  exerciseSubmissions,
  studentAnalytics,
  topicFeedback,
  questionReports,
  aiPrompts,
  mcpPrompts,
  baselineAssessments,
  tutoringSessions,
  tutorAvailability,
  type User, 
  type Child, 
  type Teacher, 
  type Student, 
  type Tutor,
  type Topic,
  type Theme,
  type SyllabusCalendar,
  type School,
  type Organization,
  type Class,
  type ClassStudent,
  type PastPaper,
  type PastPaperQuestion,
  type Exercise,
  type ExerciseQuestion,
  type Homework,
  type Quiz,
  type HomeworkSubmission,
  type ExerciseSubmission,
  type InsertUser, 
  type InsertChild, 
  type InsertTeacher, 
  type InsertStudent, 
  type InsertTutor,
  type InsertTopic,
  type InsertTheme,
  type InsertSyllabusCalendar,
  type InsertExercise,
  type InsertExerciseQuestion,
  type InsertHomework,
  type InsertQuiz,
  type InsertHomeworkSubmission,
  type InsertExerciseSubmission,
  type InsertSchool,
  type InsertOrganization,
  type InsertOrganizationSchool,
  type InsertOrganizationStudentInvite,
  type InsertOrganizationAccessCode,
  type OrganizationSchool,
  type OrganizationStudentInvite,
  type OrganizationAccessCode,
  type OrganizationStudentMembership,
  type InsertOrganizationStudentMembership,
  type InsertClass,
  type InsertClassStudent,
  type InsertPastPaper,
  type InsertPastPaperQuestion,
  type PastPaperSubmission,
  type InsertPastPaperSubmission,
  type SelectSchoolHoliday,
  type InsertSchoolHoliday,
  type StudentAnalytics,
  type TopicFeedback,
  type InsertTopicFeedback,
  type QuestionReport,
  type InsertQuestionReport,
  type AiPrompt,
  type InsertAiPrompt,
  type McpPrompt,
  type InsertMcpPrompt,
  adminSettings,
  subscriptions,
  subscriptionPlans,
  type AdminSetting,
  type InsertAdminSetting,
  type Subscription,
  type InsertSubscription,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type BaselineAssessment,
  type InsertBaselineAssessment,
  type TutoringSession,
  type InsertTutoringSession,
  type TutorAvailability,
  type InsertTutorAvailability,
  adminStats,
  type AdminStats
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, desc, inArray, or, isNull, count as drizzleCount, gt, lt, like, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<User | undefined>;
  updateUserEmailPreferences(userId: number, preferences: any): Promise<User | undefined>;
  updateUserParentContact(userId: number, parentContact: string): Promise<User | undefined>;
  calculateRetroactivePoints(userId: number): Promise<number>;
  
  // Child operations
  getChild(id: number): Promise<Child | undefined>;
  getChildById(id: number): Promise<Child | undefined>;
  getChildrenByParent(parentId: number): Promise<Child[]>;
  getChildByStudentUserId(parentId: number, studentUserId: number): Promise<Child | undefined>;
  getChildByStudentId(studentUserId: number): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
  deleteChild(id: number): Promise<boolean>;
  
  // Parent operations
  getParentByUserId(userId: number): Promise<any | undefined>;
  
  // Teacher operations
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  getTeacherByUserId(userId: number): Promise<Teacher | undefined>;
  
  // Student operations
  createStudent(student: InsertStudent): Promise<Student>;
  getStudentByUserId(userId: number): Promise<Student | undefined>;
  getStudentById(id: number): Promise<Student | undefined>;
  
  // Tutor operations
  createTutor(tutor: InsertTutor): Promise<Tutor>;
  getTutorByUserId(userId: number): Promise<Tutor | undefined>;
  
  // Topic operations
  getTopicsByGradeAndSubject(grade: string, subject: string): Promise<Topic[]>;
  getSubjectsByGrade(grade: string): Promise<string[]>;
  getTopic(id: number): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: number, updates: Partial<InsertTopic>): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<boolean>;
  
  // Theme operations
  getThemesByTopic(topicId: number): Promise<Theme[]>;
  getTheme(id: number): Promise<Theme | undefined>;
  createTheme(theme: InsertTheme): Promise<Theme>;
  updateTheme(id: number, updates: Partial<InsertTheme>): Promise<Theme | undefined>;
  deleteTheme(id: number): Promise<boolean>;
  
  // SyllabusCalendar operations
  getSyllabusCalendarByDate(date: string, grade: string, subject: string): Promise<SyllabusCalendar[]>;
  getSyllabusCalendarByDateRange(startDate: string, endDate: string, grade: string, subject: string): Promise<SyllabusCalendar[]>;
  getSyllabusCalendar(id: number): Promise<SyllabusCalendar | undefined>;
  createSyllabusCalendar(lesson: InsertSyllabusCalendar): Promise<SyllabusCalendar>;
  updateSyllabusCalendar(id: number, updates: Partial<InsertSyllabusCalendar>): Promise<SyllabusCalendar | undefined>;
  deleteSyllabusCalendar(id: number): Promise<boolean>;
  validateTopicThemeForGradeSubject(topicId: number, themeId: number, grade: string, subject: string): Promise<boolean>;
  
  // School operations
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School | undefined>;
  deleteSchool(id: number): Promise<boolean>;
  
  // Organization operations
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<boolean>;
  updateOrganizationStatus(id: number, status: string): Promise<Organization | undefined>;
  
  // Organization Schools operations (for school-based access model)
  getOrganizationSchools(organizationId: number): Promise<OrganizationSchool[]>;
  addOrganizationSchool(data: InsertOrganizationSchool): Promise<OrganizationSchool>;
  updateOrganizationSchool(id: number, updates: Partial<InsertOrganizationSchool>): Promise<OrganizationSchool | undefined>;
  removeOrganizationSchool(id: number): Promise<boolean>;
  
  // Organization Student Invites operations (for invited access model)
  getOrganizationInvites(organizationId: number): Promise<OrganizationStudentInvite[]>;
  createOrganizationInvite(data: InsertOrganizationStudentInvite): Promise<OrganizationStudentInvite>;
  updateOrganizationInvite(id: number, updates: Partial<InsertOrganizationStudentInvite>): Promise<OrganizationStudentInvite | undefined>;
  deleteOrganizationInvite(id: number): Promise<boolean>;
  
  // Organization Access Codes operations (for open access model)
  getOrganizationAccessCodes(organizationId: number): Promise<OrganizationAccessCode[]>;
  createOrganizationAccessCode(data: InsertOrganizationAccessCode): Promise<OrganizationAccessCode>;
  getOrganizationAccessCodeByCode(code: string): Promise<OrganizationAccessCode | undefined>;
  updateOrganizationAccessCode(id: number, updates: Partial<InsertOrganizationAccessCode>): Promise<OrganizationAccessCode | undefined>;
  deleteOrganizationAccessCode(id: number): Promise<boolean>;
  incrementAccessCodeUsage(id: number): Promise<boolean>;
  
  // Organization Student Membership operations
  getOrganizationStudentMembership(studentId: number): Promise<OrganizationStudentMembership | undefined>;
  createOrganizationStudentMembership(data: InsertOrganizationStudentMembership): Promise<OrganizationStudentMembership>;
  findOrganizationBySchoolName(schoolName: string): Promise<{ organization: Organization; orgSchool: OrganizationSchool } | undefined>;
  grantSchoolBasedAccess(studentId: number, schoolName: string): Promise<OrganizationStudentMembership | null>;
  getOrganizationSubscriptionFeatures(organizationId: number): Promise<{ planId: number; planName: string; features: any } | null>;
  
  // Class operations
  getClassesByTeacher(teacherId: number): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, updates: Partial<InsertClass>): Promise<Class | undefined>;
  deleteClass(id: number): Promise<boolean>;
  generateClassCode(): Promise<string>;
  
  // Student management operations
  getStudentsByClass(classId: number): Promise<any[]>;
  searchStudentsBySchoolAndGrade(schoolName: string, grade: string, searchTerm?: string): Promise<any[]>;
  searchStudentsByGrade(grade: string, searchTerm?: string, schoolName?: string): Promise<any[]>;
  findStudentByIdNumber(idNumber: string): Promise<any | null>;
  getStudentWithUserByIdNumber(idNumber: string): Promise<any | null>;
  updateStudentPassword(studentId: number, password: string): Promise<boolean>;
  addStudentToClass(classId: number, studentId: number): Promise<ClassStudent>;
  removeStudentFromClass(classId: number, studentId: number): Promise<boolean>;
  createStudentUser(studentData: any): Promise<Student>;
  isStudentInClass(classId: number, studentId: number): Promise<boolean>;
  linkChildToExistingStudent(parentId: number, studentId: number, childName: string): Promise<Child>;
  getChildByParentAndStudentUserId(parentId: number, studentUserId: number): Promise<Child | undefined>;
  
  // Past Papers operations
  getPastPapers(subject?: string, grade?: string): Promise<PastPaper[]>;
  getPastPaper(id: number): Promise<PastPaper | undefined>;
  createPastPaper(pastPaper: InsertPastPaper): Promise<PastPaper>;
  updatePastPaper(id: number, updates: Partial<InsertPastPaper>): Promise<PastPaper | undefined>;
  deletePastPaper(id: number): Promise<boolean>;
  findBaselinePastPaper(grade: string, subject: string): Promise<PastPaper | undefined>;
  
  // Past Paper Questions operations
  getPastPaperQuestions(pastPaperId: number): Promise<PastPaperQuestion[]>;
  getPastPaperQuestion(id: number): Promise<PastPaperQuestion | undefined>;
  createPastPaperQuestions(questions: InsertPastPaperQuestion[]): Promise<PastPaperQuestion[]>;
  updatePastPaperQuestion(id: number, updates: Partial<InsertPastPaperQuestion>): Promise<PastPaperQuestion | undefined>;
  deletePastPaperQuestions(pastPaperId: number): Promise<boolean>;

  // Past Paper Submission operations
  getPastPaperSubmission(paperId: number, studentId: number): Promise<PastPaperSubmission | undefined>;
  createPastPaperSubmission(submission: InsertPastPaperSubmission): Promise<PastPaperSubmission>;
  getStudentPastPaperSubmissions(studentId: number): Promise<PastPaperSubmission[]>;

  // Exercise operations
  getExercisesByDate(date: string, grade: string, subject?: string): Promise<any[]>;
  getExercisesByDateRange(startDate: string, endDate: string, grade: string, subject?: string): Promise<any[]>;
  getExercise(id: number): Promise<any | undefined>;
  createExerciseWithQuestions(exercise: InsertExercise, questions: InsertExerciseQuestion[]): Promise<any>;
  updateExercise(id: number, updates: Partial<InsertExercise>): Promise<Exercise | undefined>;
  updateExerciseWithQuestions(id: number, exerciseUpdates: Partial<InsertExercise>, questions: InsertExerciseQuestion[]): Promise<any>;
  deleteExercise(id: number): Promise<boolean>;
  addQuestionToExercise(exerciseId: number, question: InsertExerciseQuestion): Promise<any>;
  getExerciseQuestions(exerciseId: number): Promise<ExerciseQuestion[]>;
  getNextQuestionNumber(date: string, grade: string, subject: string): Promise<number>;
  getAllExercisesNeedingTutorials(): Promise<Exercise[]>;
  updateExerciseTutorialContent(exerciseId: number, tutorialContent: string): Promise<boolean>;

  // School Holiday operations
  getSchoolHolidays(): Promise<SelectSchoolHoliday[]>;
  createSchoolHoliday(holiday: InsertSchoolHoliday): Promise<SelectSchoolHoliday>;
  deleteSchoolHoliday(id: number): Promise<void>;

  // Homework operations
  getHomeworkById(id: number): Promise<Homework | undefined>;
  getHomeworkByClass(classId: number): Promise<Homework[]>;
  getHomeworkByTeacher(teacherId: number): Promise<Homework[]>;
  getHomeworkByStudent(studentId: number): Promise<Homework[]>;
  createHomework(homework: InsertHomework): Promise<Homework>;
  updateHomework(id: number, homework: Partial<InsertHomework>): Promise<Homework>;
  deleteHomework(id: number): Promise<void>;

  // Topic and Theme operations
  getTopicById(id: number): Promise<Topic | undefined>;
  getThemeById(id: number): Promise<Theme | undefined>;

  // Quiz operations
  getQuizzesByClass(classId: number): Promise<Quiz[]>;
  getQuizzesByTeacher(teacherId: number): Promise<Quiz[]>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: number, quiz: Partial<InsertQuiz>): Promise<Quiz>;
  deleteQuiz(id: number): Promise<void>;

  // Homework submission operations
  getHomeworkSubmission(homeworkId: number, studentId: number): Promise<HomeworkSubmission | undefined>;
  getHomeworkSubmissions(homeworkId: number): Promise<HomeworkSubmission[]>;
  createHomeworkSubmission(submission: InsertHomeworkSubmission): Promise<HomeworkSubmission>;
  updateHomeworkSubmission(id: number, updates: Partial<InsertHomeworkSubmission>): Promise<HomeworkSubmission>;
  getHomeworkSubmissionsByStudent(studentId: number): Promise<HomeworkSubmission[]>;

  // Exercise submission operations
  getExerciseSubmission(exerciseId: number, studentId: number): Promise<ExerciseSubmission | undefined>;
  getExerciseSubmissions(exerciseId: number): Promise<ExerciseSubmission[]>;
  createExerciseSubmission(submission: InsertExerciseSubmission): Promise<ExerciseSubmission>;
  updateExerciseSubmission(id: number, updates: Partial<InsertExerciseSubmission>): Promise<ExerciseSubmission>;
  getExerciseSubmissionsByStudent(studentId: number): Promise<ExerciseSubmission[]>;

  // Student subject and progress operations
  getStudentSubjects(gradeLevel: string): Promise<string[]>;
  getTopicProgress(studentId: number, topicId: number): Promise<{ exerciseProgress: number; homeworkProgress: number; overallProgress: number; mastery: string; totalAssignments: number; completedAssignments: number }>;
  
  // Points breakdown operations
  getPointsBreakdown(userId: number): Promise<{
    homework: Array<{id: number, title: string, completedAt: string, points: number}>,
    exercises: Array<{id: number, title: string, isTutorial: boolean, completedAt: string, points: number}>,
    totalPoints: number
  }>;

  // Student analytics operations
  saveStudentAnalytics(data: {
    studentId: number;
    homeworkId?: number;
    exerciseId?: number;
    subject: string;
    grade: string;
    strengths: string[];
    weaknesses: string[];
    score: number;
    totalMarks: number;
  }): Promise<any>;
  
  getTutorialExercisesForStudent(studentId: number, date: string): Promise<any[]>;
  
  // Topic feedback operations
  getTopicFeedback(studentId: number, topicId: number): Promise<TopicFeedback | undefined>;
  saveTopicFeedback(feedback: InsertTopicFeedback): Promise<TopicFeedback>;
  getTopicFeedbackBySubject(studentId: number, subject: string): Promise<TopicFeedback[]>;
  getTopicsBySubject(subject: string): Promise<Topic[]>;
  
  // Question report operations
  createQuestionReport(report: InsertQuestionReport): Promise<QuestionReport>;
  getQuestionReportsByStudent(studentId: number): Promise<QuestionReport[]>;
  getQuestionReports(status?: string): Promise<QuestionReport[]>;
  updateQuestionReportStatus(id: number, status: string, reviewedBy?: number, reviewNotes?: string): Promise<QuestionReport | undefined>;
  getQuestionReportById(id: number): Promise<QuestionReport | undefined>;
  
  // AI Prompt operations
  getAllAiPrompts(): Promise<AiPrompt[]>;
  getAiPromptById(id: number): Promise<AiPrompt | undefined>;
  getAiPromptsByCategory(category: string): Promise<AiPrompt[]>;
  createAiPrompt(prompt: InsertAiPrompt): Promise<AiPrompt>;
  updateAiPrompt(id: number, updates: Partial<InsertAiPrompt>): Promise<AiPrompt | undefined>;
  deleteAiPrompt(id: number): Promise<boolean>;
  testAiPrompt(promptText: string, variables: Record<string, string>, imageUrl?: string): Promise<{success: boolean, result?: string, error?: string}>;
  
  // MCP Prompt operations
  getAllMcpPrompts(): Promise<McpPrompt[]>;
  getMcpPromptById(id: number): Promise<McpPrompt | undefined>;
  getMcpPromptByKey(key: string): Promise<McpPrompt | undefined>;
  createMcpPrompt(prompt: InsertMcpPrompt): Promise<McpPrompt>;
  updateMcpPrompt(id: number, updates: Partial<InsertMcpPrompt>): Promise<McpPrompt | undefined>;
  deleteMcpPrompt(id: number): Promise<boolean>;

  // Admin Settings operations
  getAdminSetting(settingKey: string): Promise<AdminSetting | undefined>;
  getAllAdminSettings(): Promise<AdminSetting[]>;
  createAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting>;
  updateAdminSetting(settingKey: string, settingValue: any, updatedBy?: number): Promise<AdminSetting | undefined>;

  // Subscription Plan operations
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined>;
  getSubscriptionPlanByPaystackCode(code: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, updates: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: number): Promise<boolean>;

  // Subscription operations
  getSubscriptionByUserId(userId: number): Promise<Subscription | undefined>;
  getSubscriptionByPaystackCode(code: string): Promise<Subscription | undefined>;
  getSubscriptionByConsentToken(token: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  getAllActiveSubscriptions(): Promise<Subscription[]>;
  getExpiredSubscriptions(): Promise<Subscription[]>;
  
  // Tutoring Session operations
  getTutoringSession(id: number): Promise<TutoringSession | undefined>;
  getTutoringSessionsByStudent(studentId: number): Promise<TutoringSession[]>;
  getTutoringSessionsByTutor(tutorId: number): Promise<TutoringSession[]>;
  getPendingTutoringSessions(): Promise<TutoringSession[]>;
  createTutoringSession(session: InsertTutoringSession): Promise<TutoringSession>;
  updateTutoringSession(id: number, updates: Partial<InsertTutoringSession>): Promise<TutoringSession | undefined>;
  
  // Tutor Availability operations
  getTutorAvailability(tutorId: number): Promise<TutorAvailability[]>;
  createTutorAvailability(availability: InsertTutorAvailability): Promise<TutorAvailability>;
  updateTutorAvailability(id: number, updates: Partial<InsertTutorAvailability>): Promise<TutorAvailability | undefined>;
  deleteTutorAvailability(id: number): Promise<boolean>;
  
  // Admin Stats operations
  getAdminStats(): Promise<AdminStats | undefined>;
  refreshAdminStats(): Promise<AdminStats>;
  incrementAdminStatsByRole(role: string): Promise<void>;
  
  // Performance metrics
  getPerformanceMetrics(): Promise<{
    dailyUserOnboarding: { date: string; count: number }[];
    dailySchoolOnboarding: { date: string; count: number }[];
    totalTeachers: number;
    totalStudents: number;
    studentsByProvince: { province: string; count: number }[];
    // Subscription metrics
    subscriptionsByStatus: { status: string; count: number }[];
    activeSubscriptions: number;
    trialSubscriptions: number;
    cancelledSubscriptions: number;
    failedSubscriptions: number;
    monthlyRevenue: number;
    dailySubscriptions: { date: string; count: number }[];
    dailyCancellations: { date: string; count: number }[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private children: Map<number, Child>;
  private teachers: Map<number, Teacher>;
  private students: Map<number, Student>;
  private tutors: Map<number, Tutor>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.children = new Map();
    this.teachers = new Map();
    this.students = new Map();
    this.tutors = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    // Hash password before storing (same as DatabaseStorage)
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const user: User = { 
      ...insertUser,
      id, 
      password: hashedPassword,
      cellNumber: insertUser.cellNumber ?? null,
      points: insertUser.points ?? 0,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPoints(userId: number, pointsToAdd: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      points: (user.points || 0) + pointsToAdd
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserEmailPreferences(userId: number, preferences: any): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      emailPreferences: preferences
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserParentContact(userId: number, parentContact: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      parentContact
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async calculateRetroactivePoints(userId: number): Promise<number> {
    // MemStorage doesn't support retroactive calculation
    return 0;
  }

  async getChild(id: number): Promise<Child | undefined> {
    return this.children.get(id);
  }

  async getChildById(id: number): Promise<Child | undefined> {
    return this.children.get(id);
  }

  async getChildrenByParent(parentId: number): Promise<Child[]> {
    return Array.from(this.children.values()).filter(
      (child) => child.parentId === parentId,
    );
  }

  async getChildByStudentId(studentUserId: number): Promise<Child | undefined> {
    return Array.from(this.children.values()).find(
      (child) => child.studentUserId === studentUserId,
    );
  }

  async createChild(insertChild: InsertChild): Promise<Child> {
    const id = this.currentId++;
    const child: Child = { 
      ...insertChild,
      id, 
      parentId: insertChild.parentId ?? null,
      idNumber: insertChild.idNumber ?? null,
      grade: insertChild.grade ?? null,
      school: insertChild.school ?? null,
      province: insertChild.province ?? null,
      profilePhoto: insertChild.profilePhoto ?? null,
      points: 0,
      createdAt: new Date() 
    };
    this.children.set(id, child);
    return child;
  }

  async deleteChild(id: number): Promise<boolean> {
    return this.children.delete(id);
  }

  async createTeacher(insertTeacher: InsertTeacher): Promise<Teacher> {
    const id = this.currentId++;
    const teacher: Teacher = { 
      ...insertTeacher, 
      id,
      userId: insertTeacher.userId ?? null,
      registrationNumber: insertTeacher.registrationNumber ?? null,
      subjectSpecialization: insertTeacher.subjectSpecialization ?? null,
      schoolAffiliation: insertTeacher.schoolAffiliation ?? null,
      yearsExperience: insertTeacher.yearsExperience ?? null
    };
    this.teachers.set(id, teacher);
    return teacher;
  }

  async getTeacherByUserId(userId: number): Promise<Teacher | undefined> {
    return Array.from(this.teachers.values()).find(
      (teacher) => teacher.userId === userId,
    );
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const id = this.currentId++;
    const student: Student = { 
      ...insertStudent, 
      id,
      userId: insertStudent.userId ?? null,
      studentId: insertStudent.studentId ?? null,
      gradeLevel: insertStudent.gradeLevel ?? null,
      schoolName: insertStudent.schoolName ?? null,
      parentContact: insertStudent.parentContact ?? null
    };
    this.students.set(id, student);
    return student;
  }

  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(
      (student) => student.userId === userId,
    );
  }

  async createTutor(insertTutor: InsertTutor): Promise<Tutor> {
    const id = this.currentId++;
    const tutor: Tutor = { 
      ...insertTutor, 
      id,
      userId: insertTutor.userId ?? null,
      yearsExperience: insertTutor.yearsExperience ?? null,
      certificationNumber: insertTutor.certificationNumber ?? null,
      subjectExpertise: insertTutor.subjectExpertise ?? null,
      availability: insertTutor.availability ?? null
    };
    this.tutors.set(id, tutor);
    return tutor;
  }

  async getTutorByUserId(userId: number): Promise<Tutor | undefined> {
    return Array.from(this.tutors.values()).find(
      (tutor) => tutor.userId === userId,
    );
  }

  // Topic operations (stubs for MemStorage)
  async getTopicsByGradeAndSubject(grade: string, subject: string): Promise<Topic[]> {
    throw new Error("MemStorage does not support topic operations. Use DatabaseStorage.");
  }

  async getSubjectsByGrade(grade: string): Promise<string[]> {
    throw new Error("MemStorage does not support topic operations. Use DatabaseStorage.");
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    throw new Error("MemStorage does not support topic operations. Use DatabaseStorage.");
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    throw new Error("MemStorage does not support topic operations. Use DatabaseStorage.");
  }

  async updateTopic(id: number, updates: Partial<InsertTopic>): Promise<Topic | undefined> {
    throw new Error("MemStorage does not support topic operations. Use DatabaseStorage.");
  }

  async deleteTopic(id: number): Promise<boolean> {
    throw new Error("MemStorage does not support topic operations. Use DatabaseStorage.");
  }

  // Theme operations (stubs for MemStorage)
  async getThemesByTopic(topicId: number): Promise<Theme[]> {
    throw new Error("MemStorage does not support theme operations. Use DatabaseStorage.");
  }

  async getTheme(id: number): Promise<Theme | undefined> {
    throw new Error("MemStorage does not support theme operations. Use DatabaseStorage.");
  }

  async createTheme(theme: InsertTheme): Promise<Theme> {
    throw new Error("MemStorage does not support theme operations. Use DatabaseStorage.");
  }

  async updateTheme(id: number, updates: Partial<InsertTheme>): Promise<Theme | undefined> {
    throw new Error("MemStorage does not support theme operations. Use DatabaseStorage.");
  }

  async deleteTheme(id: number): Promise<boolean> {
    throw new Error("MemStorage does not support theme operations. Use DatabaseStorage.");
  }

  // Topic and Theme operations (stubs for interface compliance)
  async getTopicById(id: number): Promise<Topic | undefined> {
    throw new Error("MemStorage does not support topic operations. Use DatabaseStorage.");
  }

  async getThemeById(id: number): Promise<Theme | undefined> {
    throw new Error("MemStorage does not support theme operations. Use DatabaseStorage.");
  }

  // SyllabusCalendar operations
  async getSyllabusCalendarByDate(date: string, grade: string, subject: string): Promise<SyllabusCalendar[]> {
    throw new Error("MemStorage does not support syllabus calendar operations. Use DatabaseStorage.");
  }

  async getSyllabusCalendarByDateRange(startDate: string, endDate: string, grade: string, subject: string): Promise<SyllabusCalendar[]> {
    throw new Error("MemStorage does not support syllabus calendar operations. Use DatabaseStorage.");
  }

  async getSyllabusCalendar(id: number): Promise<SyllabusCalendar | undefined> {
    throw new Error("MemStorage does not support syllabus calendar operations. Use DatabaseStorage.");
  }

  async createSyllabusCalendar(lesson: InsertSyllabusCalendar): Promise<SyllabusCalendar> {
    throw new Error("MemStorage does not support syllabus calendar operations. Use DatabaseStorage.");
  }

  async updateSyllabusCalendar(id: number, updates: Partial<InsertSyllabusCalendar>): Promise<SyllabusCalendar | undefined> {
    throw new Error("MemStorage does not support syllabus calendar operations. Use DatabaseStorage.");
  }

  async deleteSyllabusCalendar(id: number): Promise<boolean> {
    throw new Error("MemStorage does not support syllabus calendar operations. Use DatabaseStorage.");
  }

  async validateTopicThemeForGradeSubject(topicId: number, themeId: number, grade: string, subject: string): Promise<boolean> {
    throw new Error("MemStorage does not support syllabus calendar operations. Use DatabaseStorage.");
  }

  // Class operations
  async getClassesByTeacher(teacherId: number): Promise<Class[]> {
    throw new Error("MemStorage does not support class operations. Use DatabaseStorage.");
  }

  async getClass(id: number): Promise<Class | undefined> {
    throw new Error("MemStorage does not support class operations. Use DatabaseStorage.");
  }

  async createClass(classData: InsertClass): Promise<Class> {
    throw new Error("MemStorage does not support class operations. Use DatabaseStorage.");
  }

  async updateClass(id: number, updates: Partial<InsertClass>): Promise<Class | undefined> {
    throw new Error("MemStorage does not support class operations. Use DatabaseStorage.");
  }

  async deleteClass(id: number): Promise<boolean> {
    throw new Error("MemStorage does not support class operations. Use DatabaseStorage.");
  }

  async generateClassCode(): Promise<string> {
    throw new Error("MemStorage does not support class operations. Use DatabaseStorage.");
  }

  // Student management operations
  async getStudentsByClass(classId: number): Promise<any[]> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async searchStudentsBySchoolAndGrade(schoolName: string, grade: string, searchTerm?: string): Promise<any[]> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async searchStudentsByGrade(grade: string, searchTerm?: string, schoolName?: string): Promise<any[]> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async addStudentToClass(classId: number, studentId: number): Promise<ClassStudent> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async removeStudentFromClass(classId: number, studentId: number): Promise<boolean> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async createStudentUser(studentData: any): Promise<Student> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async isStudentInClass(classId: number, studentId: number): Promise<boolean> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async findStudentByIdNumber(idNumber: string): Promise<any | null> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async getStudentWithUserByIdNumber(idNumber: string): Promise<any | null> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async updateStudentPassword(studentId: number, password: string): Promise<boolean> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  async linkChildToExistingStudent(parentId: number, studentId: number, childName: string): Promise<Child> {
    throw new Error("MemStorage does not support student management operations. Use DatabaseStorage.");
  }

  // Past Papers operations - not supported in MemStorage
  async getPastPapers(subject?: string, grade?: string): Promise<PastPaper[]> {
    throw new Error("MemStorage does not support past papers operations. Use DatabaseStorage.");
  }

  async getPastPaper(id: number): Promise<PastPaper | undefined> {
    throw new Error("MemStorage does not support past papers operations. Use DatabaseStorage.");
  }

  async createPastPaper(pastPaper: InsertPastPaper): Promise<PastPaper> {
    throw new Error("MemStorage does not support past papers operations. Use DatabaseStorage.");
  }

  async deletePastPaper(id: number): Promise<boolean> {
    throw new Error("MemStorage does not support past papers operations. Use DatabaseStorage.");
  }

  async findBaselinePastPaper(grade: string, subject: string): Promise<PastPaper | undefined> {
    throw new Error("MemStorage does not support past papers operations. Use DatabaseStorage.");
  }

  async getStudentSubjects(gradeLevel: string): Promise<string[]> {
    throw new Error("MemStorage does not support student subjects operations. Use DatabaseStorage.");
  }

  async getTopicProgress(studentId: number, topicId: number): Promise<{ exerciseProgress: number; homeworkProgress: number; overallProgress: number; mastery: string; totalAssignments: number; completedAssignments: number }> {
    throw new Error("MemStorage does not support topic progress operations. Use DatabaseStorage.");
  }

  async getPointsBreakdown(userId: number): Promise<{
    homework: Array<{id: number, title: string, completedAt: string, points: number}>,
    exercises: Array<{id: number, title: string, isTutorial: boolean, completedAt: string, points: number}>,
    totalPoints: number
  }> {
    throw new Error("MemStorage does not support points breakdown operations. Use DatabaseStorage.");
  }

  // Admin Stats operations
  async getAdminStats(): Promise<AdminStats | undefined> {
    throw new Error("MemStorage does not support admin stats operations. Use DatabaseStorage.");
  }

  async refreshAdminStats(): Promise<AdminStats> {
    throw new Error("MemStorage does not support admin stats operations. Use DatabaseStorage.");
  }

  async incrementAdminStatsByRole(role: string): Promise<void> {
    throw new Error("MemStorage does not support admin stats operations. Use DatabaseStorage.");
  }
  
  async getPerformanceMetrics(): Promise<{
    dailyUserOnboarding: { date: string; count: number }[];
    dailySchoolOnboarding: { date: string; count: number }[];
    totalTeachers: number;
    totalStudents: number;
    studentsByProvince: { province: string; count: number }[];
    subscriptionsByStatus: { status: string; count: number }[];
    activeSubscriptions: number;
    trialSubscriptions: number;
    cancelledSubscriptions: number;
    failedSubscriptions: number;
    monthlyRevenue: number;
    dailySubscriptions: { date: string; count: number }[];
    dailyCancellations: { date: string; count: number }[];
  }> {
    throw new Error("MemStorage does not support performance metrics. Use DatabaseStorage.");
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          password: hashedPassword,
        })
        .returning();
      return user;
    } catch (error) {
      console.error("Database error during user creation:", error);
      throw error;
    }
  }

  async updateUserPoints(userId: number, pointsToAdd: number): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          points: sql`${users.points} + ${pointsToAdd}` 
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser || undefined;
    } catch (error) {
      console.error("Error updating user points:", error);
      throw error;
    }
  }

  async updateUserEmailPreferences(userId: number, preferences: any): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          emailPreferences: preferences 
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser || undefined;
    } catch (error) {
      console.error("Error updating user email preferences:", error);
      throw error;
    }
  }

  async updateUserParentContact(userId: number, parentContact: string): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          parentContact 
        })
        .where(eq(users.id, userId))
        .returning();
      return updatedUser || undefined;
    } catch (error) {
      console.error("Error updating user parent contact:", error);
      throw error;
    }
  }

  async calculateRetroactivePoints(userId: number): Promise<number> {
    try {
      // Get student record to access student ID
      const student = await this.getStudentByUserId(userId);
      if (!student) return 0;

      // Count completed homework submissions (10 points each)
      const [homeworkResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(homeworkSubmissions)
        .where(and(
          eq(homeworkSubmissions.studentId, student.id),
          eq(homeworkSubmissions.isCompleted, true)
        ));

      // Count completed exercise submissions - separate queries for regular and tutorial
      const [regularExercises] = await db
        .select({ count: sql<number>`count(*)` })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(and(
          eq(exerciseSubmissions.studentId, student.id),
          eq(exerciseSubmissions.isCompleted, true),
          eq(exercises.isTutorial, false)
        ));

      const [tutorialExercises] = await db
        .select({ count: sql<number>`count(*)` })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(and(
          eq(exerciseSubmissions.studentId, student.id),
          eq(exerciseSubmissions.isCompleted, true),
          eq(exercises.isTutorial, true)
        ));

      const homeworkPoints = (homeworkResult?.count || 0) * 10;
      const regularExercisePoints = (regularExercises?.count || 0) * 10;
      const tutorialPoints = (tutorialExercises?.count || 0) * 5;

      console.log(`Retroactive points calculation for student ${student.id}:`, {
        homeworkCount: homeworkResult?.count || 0,
        regularExerciseCount: regularExercises?.count || 0,
        tutorialExerciseCount: tutorialExercises?.count || 0,
        homeworkPoints,
        regularExercisePoints,
        tutorialPoints,
        total: homeworkPoints + regularExercisePoints + tutorialPoints
      });

      return homeworkPoints + regularExercisePoints + tutorialPoints;
    } catch (error) {
      console.error("Error calculating retroactive points:", error);
      return 0;
    }
  }

  async getPointsBreakdown(userId: number): Promise<{
    homework: Array<{id: number, title: string, completedAt: string, points: number}>,
    exercises: Array<{id: number, title: string, isTutorial: boolean, completedAt: string, points: number}>,
    totalPoints: number
  }> {
    try {
      console.log("Getting points breakdown for user ID:", userId);
      
      const student = await this.getStudentByUserId(userId);
      if (!student) {
        console.log("No student found for user ID:", userId);
        return { homework: [], exercises: [], totalPoints: 0 };
      }

      console.log("Found student:", student.id);

      // Start with empty arrays for simplicity
      let completedHomework: any[] = [];
      let completedExercises: any[] = [];

      try {
        // Get completed homework
        completedHomework = await db
          .select({
            id: homework.id,
            title: homework.title,
            completedAt: homeworkSubmissions.completedAt
          })
          .from(homeworkSubmissions)
          .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
          .where(and(
            eq(homeworkSubmissions.studentId, student.id),
            eq(homeworkSubmissions.isCompleted, true)
          ))
          .orderBy(desc(homeworkSubmissions.completedAt));

        console.log("Completed homework count:", completedHomework.length);
      } catch (hwError) {
        console.error("Error fetching homework:", hwError);
        completedHomework = [];
      }

      try {
        // Get completed exercises
        completedExercises = await db
          .select({
            id: exercises.id,
            title: exercises.title,
            isTutorial: exercises.isTutorial,
            completedAt: exerciseSubmissions.completedAt
          })
          .from(exerciseSubmissions)
          .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
          .where(and(
            eq(exerciseSubmissions.studentId, student.id),
            eq(exerciseSubmissions.isCompleted, true)
          ))
          .orderBy(desc(exerciseSubmissions.completedAt));

        console.log("Completed exercises count:", completedExercises.length);
      } catch (exError) {
        console.error("Error fetching exercises:", exError);
        completedExercises = [];
      }

      // Format the data with points
      const homeworkData = completedHomework.map(hw => ({
        id: hw.id,
        title: hw.title,
        completedAt: hw.completedAt?.toISOString() || new Date().toISOString(),
        points: 10
      }));

      const exerciseData = completedExercises.map(ex => ({
        id: ex.id,
        title: ex.title,
        isTutorial: ex.isTutorial || false,
        completedAt: ex.completedAt?.toISOString() || new Date().toISOString(),
        points: ex.isTutorial ? 5 : 10
      }));

      const totalPoints = homeworkData.reduce((sum, hw) => sum + hw.points, 0) + 
                         exerciseData.reduce((sum, ex) => sum + ex.points, 0);

      console.log("Points breakdown calculated successfully:", { 
        homeworkCount: homeworkData.length, 
        exerciseCount: exerciseData.length, 
        totalPoints 
      });

      return {
        homework: homeworkData,
        exercises: exerciseData,
        totalPoints
      };
    } catch (error) {
      console.error("Error getting points breakdown:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      throw error; // Re-throw to see the full error
    }
  }

  async getChild(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child || undefined;
  }

  async getChildById(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child || undefined;
  }

  async getChildrenByParent(parentId: number): Promise<Child[]> {
    const result = await db.select({
      id: children.id,
      parentId: children.parentId,
      firstName: children.firstName,
      lastName: children.lastName,
      idNumber: children.idNumber,
      grade: children.grade,
      school: children.school,
      points: children.points,
      profilePhoto: children.profilePhoto,
      studentUserId: children.studentUserId,
      gradeLevel: children.gradeLevel,
      schoolName: children.schoolName,
      createdAt: children.createdAt,
      // Add linked student data
      linkedGradeLevel: students.gradeLevel,
      linkedSchoolName: students.schoolName,
      linkedAvatar: users.avatar
    })
    .from(children)
    .leftJoin(students, eq(children.studentUserId, students.userId))
    .leftJoin(users, eq(students.userId, users.id))
    .where(eq(children.parentId, parentId));
    
    // Return with proper grade level, school, and profile photo from linked student if available
    return result.map((child: any) => ({
      ...child,
      gradeLevel: child.linkedGradeLevel || child.gradeLevel,
      schoolName: child.linkedSchoolName || child.schoolName,
      profilePhoto: child.linkedAvatar || child.profilePhoto
    }));
  }

  async getChildByStudentUserId(parentId: number, studentUserId: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children)
      .where(
        and(
          eq(children.parentId, parentId),
          eq(children.studentUserId, studentUserId)
        )
      );
    return child || undefined;
  }

  async getChildByStudentId(studentUserId: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children)
      .where(eq(children.studentUserId, studentUserId));
    return child || undefined;
  }

  async getChildByParentAndStudentUserId(parentId: number, studentUserId: number): Promise<Child | undefined> {
    return this.getChildByStudentUserId(parentId, studentUserId);
  }

  // Parent operations
  async getParentByUserId(userId: number): Promise<any | undefined> {
    try {
      // For now, return user info with role check since parents are just users with 'parent' role
      const user = await this.getUser(userId);
      if (user && user.role === 'parent') {
        return { id: userId, userId: userId, ...user };
      }
      return undefined;
    } catch (error) {
      console.error("Error getting parent by user ID:", error);
      return undefined;
    }
  }

  async deleteChild(id: number): Promise<boolean> {
    try {
      const result = await db.delete(children).where(eq(children.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting child:", error);
      return false;
    }
  }

  async createChild(insertChild: InsertChild): Promise<Child> {
    try {
      // Create a user account for the child (as a student)
      const hashedPassword = await bcrypt.hash('defaultPassword123', 10); // Default password - child will need to set their own
      const [user] = await db
        .insert(users)
        .values({
          firstName: insertChild.firstName,
          lastName: insertChild.lastName,
          email: `${insertChild.firstName.toLowerCase()}.${insertChild.lastName.toLowerCase()}.${Date.now()}@student.temp`, // Temporary unique email
          password: hashedPassword,
          role: 'student'
        })
        .returning();

      // Create student record
      const [student] = await db
        .insert(students)
        .values({
          userId: user.id,
          studentId: insertChild.idNumber,
          gradeLevel: insertChild.grade,
          schoolName: insertChild.school
        })
        .returning();

      // Create child record linking to the student user
      const [child] = await db
        .insert(children)
        .values({
          ...insertChild,
          studentUserId: user.id,
          gradeLevel: insertChild.grade,
          schoolName: insertChild.school
        })
        .returning();

      return child;
    } catch (error) {
      console.error("Error creating child and student records:", error);
      throw error;
    }
  }

  async createTeacher(insertTeacher: InsertTeacher): Promise<Teacher> {
    const [teacher] = await db
      .insert(teachers)
      .values(insertTeacher)
      .returning();
    return teacher;
  }

  async getTeacherByUserId(userId: number): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, userId));
    return teacher || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values(insertStudent)
      .returning();
    return student;
  }

  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student || undefined;
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async createTutor(insertTutor: InsertTutor): Promise<Tutor> {
    const [tutor] = await db
      .insert(tutors)
      .values(insertTutor)
      .returning();
    return tutor;
  }

  async getTutorByUserId(userId: number): Promise<Tutor | undefined> {
    const [tutor] = await db.select().from(tutors).where(eq(tutors.userId, userId));
    return tutor || undefined;
  }

  // Topic operations
  async getTopicsByGradeAndSubject(grade: string, subject: string): Promise<Topic[]> {
    return await db.select().from(topics)
      .where(and(eq(topics.grade, grade), eq(topics.subject, subject)))
      .orderBy(topics.createdAt);
  }

  async getSubjectsByGrade(grade: string): Promise<string[]> {
    const result = await db.select({ subject: topics.subject })
      .from(topics)
      .where(eq(topics.grade, grade))
      .groupBy(topics.subject);
    return result.map(row => row.subject);
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    return topic || undefined;
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const [topic] = await db
      .insert(topics)
      .values(insertTopic)
      .returning();
    return topic;
  }

  async updateTopic(id: number, updates: Partial<InsertTopic>): Promise<Topic | undefined> {
    const [topic] = await db
      .update(topics)
      .set(updates)
      .where(eq(topics.id, id))
      .returning();
    return topic || undefined;
  }

  async deleteTopic(id: number): Promise<boolean> {
    const result = await db.delete(topics).where(eq(topics.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Theme operations
  async getThemesByTopic(topicId: number): Promise<Theme[]> {
    return await db.select().from(themes)
      .where(eq(themes.topicId, topicId))
      .orderBy(themes.createdAt);
  }

  async getTheme(id: number): Promise<Theme | undefined> {
    const [theme] = await db.select().from(themes).where(eq(themes.id, id));
    return theme || undefined;
  }

  async createTheme(insertTheme: InsertTheme): Promise<Theme> {
    const [theme] = await db
      .insert(themes)
      .values(insertTheme)
      .returning();
    return theme;
  }

  async updateTheme(id: number, updates: Partial<InsertTheme>): Promise<Theme | undefined> {
    const [theme] = await db
      .update(themes)
      .set(updates)
      .where(eq(themes.id, id))
      .returning();
    return theme || undefined;
  }

  async deleteTheme(id: number): Promise<boolean> {
    const result = await db.delete(themes).where(eq(themes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // SyllabusCalendar operations
  async getSyllabusCalendarByDate(date: string, grade: string, subject: string): Promise<SyllabusCalendar[]> {
    return await db.select().from(syllabusCalendar)
      .where(and(
        eq(syllabusCalendar.date, date),
        eq(syllabusCalendar.grade, grade),
        eq(syllabusCalendar.subject, subject)
      ))
      .orderBy(syllabusCalendar.createdAt);
  }

  async getSyllabusCalendarByDateRange(startDate: string, endDate: string, grade: string, subject: string): Promise<SyllabusCalendar[]> {
    return await db.select().from(syllabusCalendar)
      .where(and(
        gte(syllabusCalendar.date, startDate),
        lte(syllabusCalendar.date, endDate),
        eq(syllabusCalendar.grade, grade),
        eq(syllabusCalendar.subject, subject)
      ))
      .orderBy(syllabusCalendar.createdAt);
  }

  async getSyllabusCalendar(id: number): Promise<SyllabusCalendar | undefined> {
    const [lesson] = await db.select().from(syllabusCalendar).where(eq(syllabusCalendar.id, id));
    return lesson || undefined;
  }

  async createSyllabusCalendar(insertLesson: InsertSyllabusCalendar): Promise<SyllabusCalendar> {
    const [lesson] = await db
      .insert(syllabusCalendar)
      .values(insertLesson)
      .returning();
    return lesson;
  }

  async updateSyllabusCalendar(id: number, updates: Partial<InsertSyllabusCalendar>): Promise<SyllabusCalendar | undefined> {
    const [lesson] = await db
      .update(syllabusCalendar)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(syllabusCalendar.id, id))
      .returning();
    return lesson || undefined;
  }

  async deleteSyllabusCalendar(id: number): Promise<boolean> {
    const result = await db.delete(syllabusCalendar).where(eq(syllabusCalendar.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async validateTopicThemeForGradeSubject(topicId: number, themeId: number, grade: string, subject: string): Promise<boolean> {
    // Check if the topic exists and matches the grade/subject
    const [topic] = await db.select().from(topics)
      .where(and(
        eq(topics.id, topicId),
        eq(topics.grade, grade),
        eq(topics.subject, subject)
      ));
    
    if (!topic) {
      return false;
    }

    // Check if the theme exists and belongs to the topic
    const [theme] = await db.select().from(themes)
      .where(and(
        eq(themes.id, themeId),
        eq(themes.topicId, topicId)
      ));
    
    return !!theme;
  }

  // Class operations
  async getClassesByTeacher(teacherId: number): Promise<Class[]> {
    return await db.select().from(classes)
      .where(eq(classes.teacherId, teacherId))
      .orderBy(classes.createdAt);
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, id));
    return classData || undefined;
  }

  async createClass(insertClass: InsertClass): Promise<Class> {
    const [classData] = await db
      .insert(classes)
      .values(insertClass)
      .returning();
    return classData;
  }

  async updateClass(id: number, updates: Partial<InsertClass>): Promise<Class | undefined> {
    const [classData] = await db
      .update(classes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return classData || undefined;
  }

  async deleteClass(id: number): Promise<boolean> {
    const result = await db.delete(classes).where(eq(classes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // School operations
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools).orderBy(schools.name);
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || undefined;
  }

  async createSchool(insertSchool: InsertSchool): Promise<School> {
    const [school] = await db
      .insert(schools)
      .values(insertSchool)
      .returning();
    return school;
  }

  async updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School | undefined> {
    const [school] = await db
      .update(schools)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return school || undefined;
  }

  async deleteSchool(id: number): Promise<boolean> {
    const result = await db.delete(schools).where(eq(schools.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Organization operations
  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(organizations.name);
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(insertOrg)
      .returning();
    return org;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org || undefined;
  }

  async deleteOrganization(id: number): Promise<boolean> {
    const result = await db.delete(organizations).where(eq(organizations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateOrganizationStatus(id: number, status: string): Promise<Organization | undefined> {
    const isActive = status === 'active';
    const [org] = await db
      .update(organizations)
      .set({ status, isActive, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  // Organization Schools operations
  async getOrganizationSchools(organizationId: number): Promise<(OrganizationSchool & { schoolName: string | null })[]> {
    const results = await db
      .select({
        id: organizationSchools.id,
        organizationId: organizationSchools.organizationId,
        schoolId: organizationSchools.schoolId,
        allocatedSeats: organizationSchools.allocatedSeats,
        usedSeats: organizationSchools.usedSeats,
        createdAt: organizationSchools.createdAt,
        schoolName: schools.name,
      })
      .from(organizationSchools)
      .leftJoin(schools, eq(organizationSchools.schoolId, schools.id))
      .where(eq(organizationSchools.organizationId, organizationId));
    return results;
  }

  async addOrganizationSchool(data: InsertOrganizationSchool): Promise<OrganizationSchool> {
    const [orgSchool] = await db
      .insert(organizationSchools)
      .values(data)
      .returning();
    return orgSchool;
  }

  async updateOrganizationSchool(id: number, updates: Partial<InsertOrganizationSchool>): Promise<OrganizationSchool | undefined> {
    const [orgSchool] = await db
      .update(organizationSchools)
      .set(updates)
      .where(eq(organizationSchools.id, id))
      .returning();
    return orgSchool;
  }

  async removeOrganizationSchool(id: number): Promise<boolean> {
    const result = await db.delete(organizationSchools).where(eq(organizationSchools.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Organization Student Invites operations
  async getOrganizationInvites(organizationId: number): Promise<OrganizationStudentInvite[]> {
    return await db
      .select()
      .from(organizationStudentInvites)
      .where(eq(organizationStudentInvites.organizationId, organizationId));
  }

  async createOrganizationInvite(data: InsertOrganizationStudentInvite): Promise<OrganizationStudentInvite> {
    const [invite] = await db
      .insert(organizationStudentInvites)
      .values(data)
      .returning();
    return invite;
  }

  async updateOrganizationInvite(id: number, updates: Partial<InsertOrganizationStudentInvite>): Promise<OrganizationStudentInvite | undefined> {
    const [invite] = await db
      .update(organizationStudentInvites)
      .set(updates)
      .where(eq(organizationStudentInvites.id, id))
      .returning();
    return invite;
  }

  async deleteOrganizationInvite(id: number): Promise<boolean> {
    const result = await db.delete(organizationStudentInvites).where(eq(organizationStudentInvites.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Organization Access Codes operations
  async getOrganizationAccessCodes(organizationId: number): Promise<OrganizationAccessCode[]> {
    return await db
      .select()
      .from(organizationAccessCodes)
      .where(eq(organizationAccessCodes.organizationId, organizationId));
  }

  async createOrganizationAccessCode(data: InsertOrganizationAccessCode): Promise<OrganizationAccessCode> {
    const [code] = await db
      .insert(organizationAccessCodes)
      .values(data)
      .returning();
    return code;
  }

  async getOrganizationAccessCodeByCode(code: string): Promise<OrganizationAccessCode | undefined> {
    const [accessCode] = await db
      .select()
      .from(organizationAccessCodes)
      .where(eq(organizationAccessCodes.code, code));
    return accessCode;
  }

  async updateOrganizationAccessCode(id: number, updates: Partial<InsertOrganizationAccessCode>): Promise<OrganizationAccessCode | undefined> {
    const [code] = await db
      .update(organizationAccessCodes)
      .set(updates)
      .where(eq(organizationAccessCodes.id, id))
      .returning();
    return code;
  }

  async deleteOrganizationAccessCode(id: number): Promise<boolean> {
    const result = await db.delete(organizationAccessCodes).where(eq(organizationAccessCodes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementAccessCodeUsage(id: number): Promise<boolean> {
    const result = await db
      .update(organizationAccessCodes)
      .set({ currentUses: sql`current_uses + 1` })
      .where(eq(organizationAccessCodes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getOrganizationStudentMembership(studentId: number): Promise<OrganizationStudentMembership | undefined> {
    const [membership] = await db
      .select()
      .from(organizationStudentMemberships)
      .where(and(
        eq(organizationStudentMemberships.studentId, studentId),
        eq(organizationStudentMemberships.isActive, true)
      ))
      .limit(1);
    return membership;
  }

  async createOrganizationStudentMembership(data: InsertOrganizationStudentMembership): Promise<OrganizationStudentMembership> {
    const [membership] = await db
      .insert(organizationStudentMemberships)
      .values(data)
      .returning();
    return membership;
  }

  async findOrganizationBySchoolName(schoolName: string): Promise<{ organization: Organization; orgSchool: OrganizationSchool } | undefined> {
    const normalizedName = schoolName.toLowerCase().trim();
    
    const results = await db
      .select({
        organization: organizations,
        orgSchool: organizationSchools,
        schoolName: schools.name,
      })
      .from(organizationSchools)
      .innerJoin(organizations, eq(organizationSchools.organizationId, organizations.id))
      .innerJoin(schools, eq(organizationSchools.schoolId, schools.id))
      .where(and(
        eq(organizations.accessModel, 'school'),
        eq(organizations.status, 'active')
      ));
    
    for (const result of results) {
      if (result.schoolName && result.schoolName.toLowerCase().trim() === normalizedName) {
        return { organization: result.organization, orgSchool: result.orgSchool };
      }
    }
    
    return undefined;
  }

  async grantSchoolBasedAccess(studentId: number, schoolName: string): Promise<OrganizationStudentMembership | null> {
    const orgResult = await this.findOrganizationBySchoolName(schoolName);
    
    if (!orgResult) {
      console.log(`📚 No organization found for school: ${schoolName}`);
      return null;
    }

    const { organization, orgSchool } = orgResult;

    const allocatedSeats = orgSchool.allocatedSeats || 0;
    const usedSeats = orgSchool.usedSeats || 0;
    
    if (allocatedSeats > 0 && usedSeats >= allocatedSeats) {
      console.log(`❌ No available seats for organization ${organization.name} at school ${schoolName} (${usedSeats}/${allocatedSeats})`);
      return null;
    }

    const existingMembership = await db
      .select()
      .from(organizationStudentMemberships)
      .where(and(
        eq(organizationStudentMemberships.organizationId, organization.id),
        eq(organizationStudentMemberships.studentId, studentId)
      ))
      .limit(1);

    if (existingMembership.length > 0) {
      console.log(`ℹ️ Student ${studentId} already has membership in organization ${organization.name}`);
      return existingMembership[0];
    }

    const [membership] = await db
      .insert(organizationStudentMemberships)
      .values({
        organizationId: organization.id,
        studentId,
        organizationSchoolId: orgSchool.id,
        accessMethod: 'school',
        isActive: true,
      })
      .returning();

    await db
      .update(organizationSchools)
      .set({ usedSeats: sql`used_seats + 1` })
      .where(eq(organizationSchools.id, orgSchool.id));

    console.log(`✅ Granted school-based access to student ${studentId} in organization ${organization.name} (seat ${usedSeats + 1}/${allocatedSeats || '∞'})`);
    
    return membership;
  }

  async getOrganizationSubscriptionFeatures(organizationId: number): Promise<{ planId: number; planName: string; features: any } | null> {
    const [orgSub] = await db
      .select()
      .from(organizationSubscriptions)
      .where(and(
        eq(organizationSubscriptions.organizationId, organizationId),
        eq(organizationSubscriptions.isActive, true)
      ))
      .limit(1);

    if (!orgSub) {
      return null;
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, orgSub.planId))
      .limit(1);

    if (!plan) {
      return null;
    }

    return {
      planId: plan.id,
      planName: plan.name,
      features: plan.features,
    };
  }

  async generateClassCode(): Promise<string> {
    // Generate a unique 6-character class code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists = true;
    
    while (exists) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if code already exists
      const [existingClass] = await db.select().from(classes).where(eq(classes.classCode, code));
      exists = !!existingClass;
    }
    
    return code!;
  }

  // Student management operations
  async getStudentsByClass(classId: number): Promise<any[]> {
    const studentsInClass = await db
      .select({
        id: students.id,
        userId: students.userId,
        studentId: students.studentId,
        gradeLevel: students.gradeLevel,
        schoolName: students.schoolName,
        parentContact: students.parentContact,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        cellNumber: users.cellNumber,
        enrolledAt: classStudents.enrolledAt
      })
      .from(classStudents)
      .innerJoin(students, eq(classStudents.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(classStudents.classId, classId));
    
    return studentsInClass;
  }

  async searchStudentsBySchoolAndGrade(schoolName: string, grade: string, searchTerm?: string): Promise<any[]> {
    let query = db
      .select({
        id: students.id,
        userId: students.userId,
        studentId: students.studentId,
        gradeLevel: students.gradeLevel,
        schoolName: students.schoolName,
        parentContact: students.parentContact,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        cellNumber: users.cellNumber
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(and(
        eq(students.schoolName, schoolName),
        eq(students.gradeLevel, grade)
      ));

    const results = await query;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return results.filter(student => 
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.studentId?.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower)
      );
    }
    
    return results;
  }

  async searchStudentsByGrade(grade: string, searchTerm?: string, schoolName?: string): Promise<any[]> {
    // Build conditions: grade is required, school is optional
    const conditions = [eq(students.gradeLevel, grade)];
    if (schoolName) {
      conditions.push(eq(students.schoolName, schoolName));
    }
    
    let query = db
      .select({
        id: students.id,
        userId: students.userId,
        studentId: students.studentId,
        gradeLevel: students.gradeLevel,
        schoolName: students.schoolName,
        parentContact: students.parentContact,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        cellNumber: users.cellNumber
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(and(...conditions));

    const results = await query;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return results.filter(student => 
        student.firstName.toLowerCase().includes(searchLower) ||
        student.lastName.toLowerCase().includes(searchLower) ||
        student.studentId?.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower)
      );
    }
    
    return results;
  }

  async addStudentToClass(classId: number, studentId: number): Promise<ClassStudent> {
    const [classStudent] = await db
      .insert(classStudents)
      .values({ classId, studentId })
      .returning();
    return classStudent;
  }

  async removeStudentFromClass(classId: number, studentId: number): Promise<boolean> {
    const result = await db
      .delete(classStudents)
      .where(and(
        eq(classStudents.classId, classId),
        eq(classStudents.studentId, studentId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  async createStudentUser(studentData: any): Promise<Student> {
    // Create user first
    const hashedPassword = await bcrypt.hash(studentData.password || 'defaultPassword123', 10);
    const [user] = await db
      .insert(users)
      .values({
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        password: hashedPassword,
        cellNumber: studentData.cellphone,
        role: 'student'
      })
      .returning();

    // Create student profile
    // parentEmail is stored in parentContact field (for backwards compatibility)
    const parentContact = studentData.parentEmail || studentData.parentContact || null;
    
    const [student] = await db
      .insert(students)
      .values({
        userId: user.id,
        studentId: studentData.idNumber,
        gradeLevel: studentData.grade,
        schoolName: studentData.school,
        parentContact: parentContact,
        username: studentData.username || null
      })
      .returning();

    return student;
  }

  async isStudentInClass(classId: number, studentId: number): Promise<boolean> {
    const [enrollment] = await db
      .select()
      .from(classStudents)
      .where(and(
        eq(classStudents.classId, classId),
        eq(classStudents.studentId, studentId)
      ));
    return !!enrollment;
  }

  async findStudentByIdNumber(idNumber: string): Promise<any | null> {
    const [student] = await db
      .select({
        id: students.id,
        userId: students.userId,
        studentId: students.studentId,
        gradeLevel: students.gradeLevel,
        schoolName: students.schoolName,
        parentContact: students.parentContact,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        cellNumber: users.cellNumber
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.studentId, idNumber));
    
    return student || null;
  }

  async getStudentWithUserByIdNumber(idNumber: string): Promise<any | null> {
    return this.findStudentByIdNumber(idNumber);
  }

  async updateStudentPassword(userId: number, password: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    return (result.rowCount ?? 0) > 0;
  }

  async isChildAlreadyLinked(parentId: number, studentUserId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(children)
      .where(and(
        eq(children.parentId, parentId),
        eq(children.studentUserId, studentUserId)
      ));
    
    return !!existing;
  }

  async linkChildToExistingStudent(parentId: number, studentIdNumber: string, childName: string): Promise<Child> {
    // Get the student's user info first
    const student = await this.findStudentByIdNumber(studentIdNumber);
    if (!student) {
      throw new Error("Student not found");
    }

    // Check if this child is already linked to this parent
    const isAlreadyLinked = await this.isChildAlreadyLinked(parentId, student.userId);
    if (isAlreadyLinked) {
      throw new Error("This child is already linked to your account");
    }

    // Create a child record linking to the existing student
    const [child] = await db
      .insert(children)
      .values({
        parentId,
        firstName: student.firstName,
        lastName: student.lastName,
        gradeLevel: student.gradeLevel,
        schoolName: student.schoolName,
        studentUserId: student.userId // Link to the existing student's user account
      })
      .returning();
    
    return child;
  }

  // Check if student is already enrolled in any class for the same subject and grade
  async isStudentEnrolledInSubjectGrade(studentId: number, subject: string, grade: string): Promise<{ isEnrolled: boolean; className?: string; teacherName?: string }> {
    const result = await db
      .select({
        className: classes.name,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        classId: classes.id
      })
      .from(classStudents)
      .innerJoin(classes, eq(classStudents.classId, classes.id))
      .innerJoin(teachers, eq(classes.teacherId, teachers.id))
      .innerJoin(users, eq(teachers.userId, users.id))
      .where(and(
        eq(classStudents.studentId, studentId),
        eq(classes.subject, subject),
        eq(classes.grade, grade),
        eq(classes.isActive, true)
      ))
      .limit(1);

    if (result.length > 0) {
      const enrollment = result[0];
      return {
        isEnrolled: true,
        className: enrollment.className,
        teacherName: `${enrollment.teacherFirstName} ${enrollment.teacherLastName}`
      };
    }

    return { isEnrolled: false };
  }

  // Past Papers operations
  async getPastPapers(subject?: string, grade?: string): Promise<PastPaper[]> {
    let query = db.select().from(pastPapers);
    const conditions = [];

    if (subject) {
      conditions.push(eq(pastPapers.subject, subject));
    }
    if (grade) {
      conditions.push(eq(pastPapers.grade, grade));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(pastPapers.year, pastPapers.createdAt);
  }

  async getPastPaper(id: number): Promise<PastPaper | undefined> {
    const [paper] = await db.select().from(pastPapers).where(eq(pastPapers.id, id));
    return paper || undefined;
  }

  async createPastPaper(insertPastPaper: InsertPastPaper): Promise<PastPaper> {
    const [paper] = await db
      .insert(pastPapers)
      .values(insertPastPaper)
      .returning();
    return paper;
  }

  async deletePastPaper(id: number): Promise<boolean> {
    const result = await db.delete(pastPapers).where(eq(pastPapers.id, id));
    return result.count > 0;
  }

  async updatePastPaper(id: number, updates: Partial<InsertPastPaper>): Promise<PastPaper | undefined> {
    const [paper] = await db
      .update(pastPapers)
      .set(updates)
      .where(eq(pastPapers.id, id))
      .returning();
    return paper || undefined;
  }

  async findBaselinePastPaper(grade: string, subject: string): Promise<PastPaper | undefined> {
    const currentYear = new Date().getFullYear();
    
    // Priority 1: Final exam from 2 years ago
    let [paper] = await db.select()
      .from(pastPapers)
      .where(and(
        eq(pastPapers.grade, grade),
        eq(pastPapers.subject, subject),
        eq(pastPapers.year, currentYear - 2),
        eq(pastPapers.paperType, 'exam')
      ))
      .limit(1);
    
    if (paper) return paper;
    
    // Priority 2: Final exam from last year
    [paper] = await db.select()
      .from(pastPapers)
      .where(and(
        eq(pastPapers.grade, grade),
        eq(pastPapers.subject, subject),
        eq(pastPapers.year, currentYear - 1),
        eq(pastPapers.paperType, 'exam')
      ))
      .limit(1);
    
    if (paper) return paper;
    
    // Priority 3: Any available past paper for this grade and subject (newest first)
    [paper] = await db.select()
      .from(pastPapers)
      .where(and(
        eq(pastPapers.grade, grade),
        eq(pastPapers.subject, subject)
      ))
      .orderBy(desc(pastPapers.year))
      .limit(1);
    
    return paper || undefined;
  }

  // Past Paper Questions operations
  async getPastPaperQuestions(pastPaperId: number): Promise<PastPaperQuestion[]> {
    const questions = await db.select()
      .from(pastPaperQuestions)
      .where(eq(pastPaperQuestions.pastPaperId, pastPaperId))
      .orderBy(pastPaperQuestions.questionNumber);
    // Ensure additionalImageUrls defaults to empty array for null values
    return questions.map(q => ({
      ...q,
      additionalImageUrls: q.additionalImageUrls || []
    }));
  }

  async createPastPaperQuestions(questions: InsertPastPaperQuestion[]): Promise<PastPaperQuestion[]> {
    if (questions.length === 0) return [];
    return await db.insert(pastPaperQuestions)
      .values(questions)
      .returning();
  }

  async deletePastPaperQuestions(pastPaperId: number): Promise<boolean> {
    const result = await db.delete(pastPaperQuestions)
      .where(eq(pastPaperQuestions.pastPaperId, pastPaperId));
    return result.count > 0;
  }

  async getPastPaperQuestion(id: number): Promise<PastPaperQuestion | undefined> {
    const [question] = await db.select()
      .from(pastPaperQuestions)
      .where(eq(pastPaperQuestions.id, id));
    if (!question) return undefined;
    // Ensure additionalImageUrls defaults to empty array for null values
    return {
      ...question,
      additionalImageUrls: question.additionalImageUrls || []
    };
  }

  async updatePastPaperQuestion(id: number, updates: Partial<InsertPastPaperQuestion>): Promise<PastPaperQuestion | undefined> {
    const [question] = await db
      .update(pastPaperQuestions)
      .set(updates)
      .where(eq(pastPaperQuestions.id, id))
      .returning();
    return question || undefined;
  }

  // Past Paper Submission operations
  async getPastPaperSubmission(paperId: number, studentId: number): Promise<PastPaperSubmission | undefined> {
    const [submission] = await db.select()
      .from(pastPaperSubmissions)
      .where(and(
        eq(pastPaperSubmissions.pastPaperId, paperId),
        eq(pastPaperSubmissions.studentId, studentId)
      ));
    return submission || undefined;
  }

  async createPastPaperSubmission(submission: InsertPastPaperSubmission): Promise<PastPaperSubmission> {
    // Check if submission already exists
    const existing = await this.getPastPaperSubmission(submission.pastPaperId, submission.studentId);
    if (existing) {
      // Update existing submission
      const [updated] = await db
        .update(pastPaperSubmissions)
        .set({
          answers: submission.answers,
          isCompleted: submission.isCompleted,
          score: submission.score,
          totalMarks: submission.totalMarks,
          feedback: submission.feedback,
          submittedAt: new Date()
        })
        .where(eq(pastPaperSubmissions.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new submission
    const [created] = await db
      .insert(pastPaperSubmissions)
      .values({
        ...submission,
        submittedAt: new Date()
      })
      .returning();
    return created;
  }

  async getStudentPastPaperSubmissions(studentId: number): Promise<PastPaperSubmission[]> {
    return await db.select()
      .from(pastPaperSubmissions)
      .where(eq(pastPaperSubmissions.studentId, studentId));
  }

  // Exercise operations
  async getExercisesByDate(date: string, grade: string, subject?: string): Promise<any[]> {
    const query = db.select({
      id: exercises.id,
      date: exercises.date,
      grade: exercises.grade,
      subject: exercises.subject,
      title: exercises.title,
      description: exercises.description,
      difficulty: exercises.difficulty,
      term: exercises.term,
      week: exercises.week,
      isTutorial: exercises.isTutorial,
      isBaseline: exercises.isBaseline,
      hasInitialTutorial: exercises.hasInitialTutorial,
      tutorialContent: exercises.tutorialContent,
      generatedFor: exercises.generatedFor,
      createdAt: exercises.createdAt,
      updatedAt: exercises.updatedAt,
      questionId: exerciseQuestions.id,
      questionNumber: exerciseQuestions.questionNumber,
      topicId: exerciseQuestions.topicId,
      themeId: exerciseQuestions.themeId,
      question: exerciseQuestions.question,
      answer: exerciseQuestions.answer,
      imageUrl: exerciseQuestions.imageUrl,
      marks: exerciseQuestions.marks,
      attachments: exerciseQuestions.attachments
    })
      .from(exercises)
      .leftJoin(exerciseQuestions, eq(exercises.id, exerciseQuestions.exerciseId))
      .where(and(
        sql`${exercises.date} = ${date}::date`,
        eq(exercises.grade, grade),
        eq(exercises.isTutorial, false), // Only get non-tutorial exercises
        subject ? eq(exercises.subject, subject) : undefined
      ))
      .orderBy(desc(exercises.createdAt), exerciseQuestions.questionNumber);

    const results = await query;
    
    // Group questions by exercise
    const exerciseMap = new Map();
    results.forEach(row => {
      if (!exerciseMap.has(row.id)) {
        exerciseMap.set(row.id, {
          id: row.id,
          date: row.date,
          grade: row.grade,
          subject: row.subject,
          title: row.title,
          description: row.description,
          difficulty: row.difficulty,
          term: row.term,
          week: row.week,
          isTutorial: row.isTutorial,
          isBaseline: row.isBaseline,
          hasInitialTutorial: row.hasInitialTutorial,
          tutorialContent: row.tutorialContent,
          generatedFor: row.generatedFor,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          questions: []
        });
      }
      
      if (row.questionId) {
        exerciseMap.get(row.id).questions.push({
          id: row.questionId,
          questionNumber: row.questionNumber,
          topicId: row.topicId,
          themeId: row.themeId,
          question: row.question,
          answer: row.answer,
          imageUrl: row.imageUrl,
          marks: row.marks,
          attachments: row.attachments
        });
      }
    });

    return Array.from(exerciseMap.values());
  }

  async getExercisesByDateRange(startDate: string, endDate: string, grade: string, subject?: string): Promise<any[]> {
    const query = db.select({
      id: exercises.id,
      date: exercises.date,
      grade: exercises.grade,
      subject: exercises.subject,
      title: exercises.title,
      description: exercises.description,
      difficulty: exercises.difficulty,
      term: exercises.term,
      week: exercises.week,
      isTutorial: exercises.isTutorial,
      isBaseline: exercises.isBaseline,
      hasInitialTutorial: exercises.hasInitialTutorial,
      tutorialContent: exercises.tutorialContent,
      generatedFor: exercises.generatedFor,
      createdAt: exercises.createdAt,
      updatedAt: exercises.updatedAt,
      questionId: exerciseQuestions.id,
      questionNumber: exerciseQuestions.questionNumber,
      topicId: exerciseQuestions.topicId,
      themeId: exerciseQuestions.themeId,
      question: exerciseQuestions.question,
      answer: exerciseQuestions.answer,
      imageUrl: exerciseQuestions.imageUrl,
      marks: exerciseQuestions.marks,
      attachments: exerciseQuestions.attachments
    })
      .from(exercises)
      .leftJoin(exerciseQuestions, eq(exercises.id, exerciseQuestions.exerciseId))
      .where(and(
        sql`${exercises.date} >= ${startDate}::date`,
        sql`${exercises.date} <= ${endDate}::date`,
        eq(exercises.grade, grade),
        eq(exercises.isTutorial, false), // Only get non-tutorial exercises
        subject ? eq(exercises.subject, subject) : undefined
      ))
      .orderBy(exercises.date, exercises.createdAt, exerciseQuestions.questionNumber);

    const results = await query;
    
    // Group questions by exercise
    const exerciseMap = new Map();
    results.forEach(row => {
      if (!exerciseMap.has(row.id)) {
        exerciseMap.set(row.id, {
          id: row.id,
          date: row.date,
          grade: row.grade,
          subject: row.subject,
          title: row.title,
          description: row.description,
          difficulty: row.difficulty,
          term: row.term,
          week: row.week,
          isTutorial: row.isTutorial,
          isBaseline: row.isBaseline,
          hasInitialTutorial: row.hasInitialTutorial,
          tutorialContent: row.tutorialContent,
          generatedFor: row.generatedFor,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          questions: []
        });
      }
      
      if (row.questionId) {
        exerciseMap.get(row.id).questions.push({
          id: row.questionId,
          questionNumber: row.questionNumber,
          topicId: row.topicId,
          themeId: row.themeId,
          question: row.question,
          answer: row.answer,
          imageUrl: row.imageUrl,
          marks: row.marks,
          attachments: row.attachments
        });
      }
    });

    return Array.from(exerciseMap.values());
  }

  async getExercise(id: number): Promise<any | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    if (!exercise) return undefined;

    const questions = await db.select().from(exerciseQuestions)
      .where(eq(exerciseQuestions.exerciseId, id))
      .orderBy(exerciseQuestions.questionNumber);

    return {
      ...exercise,
      questions
    };
  }

  async createExerciseWithQuestions(insertExercise: InsertExercise, questions: InsertExerciseQuestion[]): Promise<any> {
    const [exercise] = await db
      .insert(exercises)
      .values(insertExercise)
      .returning();

    const exerciseQuestionData = questions.map((q, index) => ({
      ...q,
      exerciseId: exercise.id,
      questionNumber: index + 1
    }));

    // DISABLED: No longer cleaning questions to prevent corruption of valid mathematical content
    const validatedQuestionData = exerciseQuestionData;

    const insertedQuestions = await db
      .insert(exerciseQuestions)
      .values(validatedQuestionData)
      .returning();

    return {
      ...exercise,
      questions: insertedQuestions
    };
  }

  async createTutorialExercise(
    studentId: number, 
    homeworkId: number | null, 
    weaknessAreas: string[], 
    subject: string, 
    grade: string,
    topicName?: string
  ): Promise<any> {
    // Get student info to determine topic/theme
    const student = await this.getStudentById(studentId);
    if (!student) throw new Error("Student not found");

    let contextTitle = "General Practice";
    if (homeworkId) {
      // Get homework details for context
      const homework = await this.getHomeworkById(homeworkId);
      if (homework) {
        contextTitle = homework.title;
      }
    } else if (topicName) {
      contextTitle = topicName;
    }

    // Generate tutorial content based on weakness areas
    const tutorialContent = this.generateTutorialContent(weaknessAreas, subject);
    
    // Create tutorial exercise
    const exerciseData = {
      date: new Date().toISOString().split('T')[0],
      grade: grade,
      subject: subject,
      title: `Tutorial: ${contextTitle} - Personalized Practice`,
      description: `AI-generated tutorial exercise ${homeworkId ? 'based on your homework feedback' : `for ${topicName || 'topic mastery'}`} to help strengthen your understanding.`,
      difficulty: "medium",
      term: "1",
      week: "1",
      isTutorial: true,
      generatedFor: studentId,
      basedOnHomework: homeworkId,
      weaknessAreas: weaknessAreas,
      tutorialContent: tutorialContent
    };

    const [exercise] = await db
      .insert(exercises)
      .values(exerciseData)
      .returning();

    // Generate tutorial questions based on weakness areas
    const tutorialQuestions = this.generateTutorialQuestions(weaknessAreas, subject);
    
    if (tutorialQuestions.length > 0) {
      const questionsWithExerciseId = tutorialQuestions.map((q, index) => ({
        ...q,
        exerciseId: exercise.id,
        questionNumber: index + 1,
        topicId: 1, // Default topic ID - in real system this would be dynamic
        themeId: 1  // Default theme ID - in real system this would be dynamic
      }));

      const insertedQuestions = await db
        .insert(exerciseQuestions)
        .values(questionsWithExerciseId)
        .returning();

      return {
        ...exercise,
        questions: insertedQuestions
      };
    }

    return exercise;
  }

  private generateTutorialContent(weaknessAreas: string[], subject: string): string {
    const content = [
      `# Tutorial: Strengthening Your ${subject.replace('-', ' ').toUpperCase()} Skills`,
      ``,
      `## Areas for Improvement`,
      `Based on your recent homework, here are the key areas we'll focus on:`,
      ``,
      ...weaknessAreas.map(area => `### ${area}`),
      ``,
      `## Let's Practice Together!`,
      `This tutorial will help you master these concepts step by step. Take your time to understand each explanation before moving to the practice questions.`,
      ``,
      `💡 **Tip**: Use the chat feature below to ask questions about any concept you find challenging!`
    ];
    
    return content.join('\n');
  }

  /**
   * DISABLED: No longer cleaning questions to prevent corruption of valid mathematical content
   */
  private hasMixedSolutionContent(questionText: string): boolean {
    // Only remove explicit "Answer:" or "Solution:" prefixes, never mathematical expressions
    return /^\s*(Answer|Solution)\s*:/i.test(questionText);
  }

  /**
   * DISABLED: No longer aggressively cleaning questions to prevent corruption
   * Only removes explicit "Answer:" or "Solution:" prefixes
   */
  private extractCleanQuestion(questionText: string): string {
    // Only remove explicit prefixes, never mathematical expressions
    const cleaned = questionText.replace(/^\s*(Answer|Solution)\s*:\s*/i, '').trim();
    return cleaned || questionText;
  }

  private generateTutorialQuestions(weaknessAreas: string[], subject: string): any[] {
    // Generate practice questions based on weakness areas
    // In a real system, this would use AI or a question bank
    const questions = [
      {
        question: `Let's start with the basics. Can you identify the key concept from: ${weaknessAreas[0] || 'the main topic'}?`,
        answer: "This is a guided practice question. Focus on understanding the underlying concept.",
        marks: 5
      },
      {
        question: `Now let's apply what we learned. Solve this step-by-step problem related to ${weaknessAreas[0] || 'the main topic'}.`,
        answer: "Show your working and explain each step of your solution.",
        marks: 10
      }
    ];

    if (weaknessAreas.length > 1) {
      questions.push({
        question: `Challenge question: Combine your knowledge of ${weaknessAreas[0]} and ${weaknessAreas[1]} to solve this problem.`,
        answer: "This integrates multiple concepts. Take your time and use the chat if you need help.",
        marks: 15
      });
    }

    return questions;
  }

  async getTutorialExercisesForStudent(studentId: number, date?: string): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(exercises)
        .where(and(
          eq(exercises.isTutorial, true),
          eq(exercises.generatedFor, studentId)
        ))
        .orderBy(desc(exercises.createdAt));

      // If date is provided, filter by date as well
      if (date) {
        query = db
          .select()
          .from(exercises)
          .where(and(
            eq(exercises.isTutorial, true),
            eq(exercises.generatedFor, studentId),
            eq(exercises.date, date)
          ))
          .orderBy(desc(exercises.createdAt));
      }

      const tutorialExercises = await query;

      // Get questions for each tutorial exercise
      const exercisesWithQuestions = await Promise.all(
        tutorialExercises.map(async (exercise) => {
          const questions = await db
            .select()
            .from(exerciseQuestions)
            .where(eq(exerciseQuestions.exerciseId, exercise.id))
            .orderBy(exerciseQuestions.questionNumber);

          return {
            ...exercise,
            questions: questions
          };
        })
      );

      return exercisesWithQuestions;
    } catch (error) {
      console.error('Error fetching tutorial exercises for student:', error);
      return [];
    }
  }

  async addQuestionToExercise(exerciseId: number, question: InsertExerciseQuestion): Promise<any> {
    // Get the next question number for this exercise
    const existingQuestions = await db.select()
      .from(exerciseQuestions)
      .where(eq(exerciseQuestions.exerciseId, exerciseId));
    
    const nextNumber = existingQuestions.length + 1;

    const [insertedQuestion] = await db
      .insert(exerciseQuestions)
      .values({
        ...question,
        exerciseId,
        questionNumber: nextNumber
      })
      .returning();

    return insertedQuestion;
  }

  async getExerciseQuestions(exerciseId: number): Promise<ExerciseQuestion[]> {
    return await db.select().from(exerciseQuestions)
      .where(eq(exerciseQuestions.exerciseId, exerciseId))
      .orderBy(exerciseQuestions.questionNumber);
  }

  async getNextQuestionNumber(date: string, grade: string, subject: string): Promise<number> {
    // Get all exercises for the date and count total questions
    const exercisesForDate = await db.select({
      id: exercises.id
    })
      .from(exercises)
      .where(and(
        eq(exercises.date, date),
        eq(exercises.grade, grade),
        eq(exercises.subject, subject)
      ));

    if (exercisesForDate.length === 0) {
      return 1;
    }

    const exerciseIds = exercisesForDate.map(e => e.id);
    const questionCount = await db.select()
      .from(exerciseQuestions)
      .where(sql`${exerciseQuestions.exerciseId} = ANY(${exerciseIds})`);

    return questionCount.length + 1;
  }

  async updateExercise(id: number, updates: Partial<InsertExercise>): Promise<Exercise | undefined> {
    const [exercise] = await db
      .update(exercises)
      .set(updates)
      .where(eq(exercises.id, id))
      .returning();
    return exercise || undefined;
  }

  async updateExerciseWithQuestions(id: number, exerciseUpdates: Partial<InsertExercise>, questions: InsertExerciseQuestion[]): Promise<any> {
    // Update exercise metadata
    const [exercise] = await db
      .update(exercises)
      .set(exerciseUpdates)
      .where(eq(exercises.id, id))
      .returning();

    if (!exercise) {
      throw new Error("Exercise not found");
    }

    // Delete existing questions
    await db.delete(exerciseQuestions).where(eq(exerciseQuestions.exerciseId, id));

    // Insert new questions
    const exerciseQuestionData = questions.map((q, index) => ({
      ...q,
      exerciseId: id,
      questionNumber: index + 1
    }));

    const insertedQuestions = await db
      .insert(exerciseQuestions)
      .values(exerciseQuestionData)
      .returning();

    return {
      ...exercise,
      questions: insertedQuestions
    };
  }

  async deleteExercise(id: number): Promise<boolean> {
    const result = await db.delete(exercises).where(eq(exercises.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllExercisesNeedingTutorials(): Promise<Exercise[]> {
    try {
      const exercisesNeedingTutorials = await db
        .select()
        .from(exercises)
        .where(and(
          eq(exercises.hasInitialTutorial, true),
          isNull(exercises.tutorialContent)
        ))
        .orderBy(exercises.createdAt);
      
      return exercisesNeedingTutorials;
    } catch (error) {
      console.error("Error fetching exercises needing tutorials:", error);
      return [];
    }
  }

  async updateExerciseTutorialContent(exerciseId: number, tutorialContent: string): Promise<boolean> {
    try {
      const result = await db
        .update(exercises)
        .set({ 
          tutorialContent: tutorialContent,
          updatedAt: new Date()
        })
        .where(eq(exercises.id, exerciseId));
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error updating exercise tutorial content:", error);
      return false;
    }
  }

  // School holidays management
  async getSchoolHolidays(year?: number): Promise<SelectSchoolHoliday[]> {
    const query = db.select().from(schoolHolidays);
    if (year) {
      return query.where(eq(schoolHolidays.year, year));
    }
    return query;
  }

  async createSchoolHoliday(holiday: InsertSchoolHoliday): Promise<SelectSchoolHoliday> {
    const [result] = await db.insert(schoolHolidays).values(holiday).returning();
    return result;
  }

  async updateSchoolHoliday(id: number, holiday: Partial<InsertSchoolHoliday>): Promise<SelectSchoolHoliday> {
    const [result] = await db.update(schoolHolidays).set({
      ...holiday,
      updatedAt: new Date()
    }).where(eq(schoolHolidays.id, id)).returning();
    return result;
  }

  async deleteSchoolHoliday(id: number): Promise<boolean> {
    const result = await db.delete(schoolHolidays).where(eq(schoolHolidays.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Homework operations
  async getHomeworkById(id: number): Promise<Homework | undefined> {
    const [result] = await db.select().from(homework)
      .where(eq(homework.id, id));
    return result || undefined;
  }

  async getHomeworkByClass(classId: number): Promise<Homework[]> {
    return await db.select().from(homework)
      .where(eq(homework.classId, classId))
      .orderBy(homework.dueDate);
  }

  async getHomeworkByTeacher(teacherId: number): Promise<Homework[]> {
    const results = await db.select({
      id: homework.id,
      classId: homework.classId,
      title: homework.title,
      description: homework.description,
      questions: homework.questions,
      dueDate: homework.dueDate,
      published: homework.published,
      createdBy: homework.createdBy,
      createdAt: homework.createdAt,
      updatedAt: homework.updatedAt,
    }).from(homework)
      .innerJoin(classes, eq(homework.classId, classes.id))
      .where(eq(classes.teacherId, teacherId))
      .orderBy(homework.dueDate);

    // Parse questions JSON string to array
    return results.map(hw => ({
      ...hw,
      questions: typeof hw.questions === 'string' ? JSON.parse(hw.questions) : hw.questions || []
    }));
  }

  async getHomeworkByStudent(studentId: number): Promise<Homework[]> {
    // Use raw SQL to ensure JSONB questions field is properly handled
    const results = await db.execute(sql`
      SELECT h.id, h.class_id, h.title, h.description, h.questions::text as questions_text,
             h.due_date, h.published, h.created_by, h.created_at, h.updated_at,
             hs.is_completed, hs.id as submission_id, hs.score, hs.total_marks, 
             hs.submitted_at, hs.completed_at
      FROM homework h
      INNER JOIN classes c ON h.class_id = c.id
      INNER JOIN class_students cs ON c.id = cs.class_id
      LEFT JOIN homework_submissions hs ON (hs.homework_id = h.id AND hs.student_id = ${studentId})
      WHERE cs.student_id = ${studentId} AND h.published = true
      ORDER BY h.due_date
    `);

    // Process the raw results and parse questions
    return results.rows.map((row: any) => {
      let questions = [];
      console.log(`🔍 Processing homework ${row.id} "${row.title}" - questions_text length: ${row.questions_text?.length || 0}`);
      
      try {
        if (row.questions_text) {
          questions = JSON.parse(row.questions_text);
          console.log(`✅ Homework ${row.id} - Successfully parsed ${questions.length} questions`);
          
          if (row.id === 47 || row.id === 48) {
            console.log(`🔍 SPECIAL DEBUG - Homework ${row.id} raw questions_text:`, row.questions_text.substring(0, 200) + '...');
            console.log(`🔍 SPECIAL DEBUG - Homework ${row.id} parsed questions:`, questions.slice(0, 2));
          }
        } else {
          console.log(`❌ Homework ${row.id} - No questions_text found`);
        }
      } catch (error) {
        console.error(`❌ Error parsing questions for homework ${row.id}:`, error);
        console.error(`❌ Raw questions_text was:`, row.questions_text);
        questions = [];
      }

      const result = {
        id: row.id,
        classId: row.class_id,
        title: row.title,
        description: row.description,
        questions,
        dueDate: row.due_date,
        published: row.published,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isCompleted: row.is_completed,
        submissionId: row.submission_id,
        score: row.score,
        totalMarks: row.total_marks,
        submittedAt: row.submitted_at,
        completedAt: row.completed_at,
      };
      
      console.log(`🔍 Final homework ${row.id} questions count: ${result.questions.length}`);
      return result;
    });
  }

  async createHomework(homeworkData: InsertHomework): Promise<Homework> {
    const [result] = await db.insert(homework).values(homeworkData).returning();
    return result;
  }

  async updateHomework(id: number, homeworkData: Partial<InsertHomework>): Promise<Homework> {
    const [result] = await db.update(homework).set({
      ...homeworkData,
      updatedAt: new Date()
    }).where(eq(homework.id, id)).returning();
    return result;
  }

  async deleteHomework(id: number): Promise<void> {
    await db.delete(homework).where(eq(homework.id, id));
  }

  // Topic and Theme operations
  async getTopicById(id: number): Promise<Topic | undefined> {
    const [result] = await db.select().from(topics)
      .where(eq(topics.id, id));
    return result || undefined;
  }

  async getThemeById(id: number): Promise<Theme | undefined> {
    const [result] = await db.select().from(themes)
      .where(eq(themes.id, id));
    return result || undefined;
  }

  // Quiz operations
  async getQuizzesByClass(classId: number): Promise<Quiz[]> {
    return await db.select().from(quizzes)
      .where(eq(quizzes.classId, classId))
      .orderBy(quizzes.scheduledDate);
  }

  async getQuizzesByTeacher(teacherId: number): Promise<Quiz[]> {
    return await db.select({
      id: quizzes.id,
      classId: quizzes.classId,
      title: quizzes.title,
      description: quizzes.description,
      duration: quizzes.duration,
      questions: quizzes.questions,
      scheduledDate: quizzes.scheduledDate,
      published: quizzes.published,
      createdBy: quizzes.createdBy,
      createdAt: quizzes.createdAt,
      updatedAt: quizzes.updatedAt,
    }).from(quizzes)
      .innerJoin(classes, eq(quizzes.classId, classes.id))
      .where(eq(classes.teacherId, teacherId))
      .orderBy(quizzes.scheduledDate);
  }

  async createQuiz(quizData: InsertQuiz): Promise<Quiz> {
    const [result] = await db.insert(quizzes).values(quizData).returning();
    return result;
  }

  async updateQuiz(id: number, quizData: Partial<InsertQuiz>): Promise<Quiz> {
    const [result] = await db.update(quizzes).set({
      ...quizData,
      updatedAt: new Date()
    }).where(eq(quizzes.id, id)).returning();
    return result;
  }

  async deleteQuiz(id: number): Promise<void> {
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }
  // Homework submission operations
  async getHomeworkSubmission(homeworkId: number, studentId: number): Promise<HomeworkSubmission | undefined> {
    const [submission] = await db.select()
      .from(homeworkSubmissions)
      .where(and(
        eq(homeworkSubmissions.homeworkId, homeworkId),
        eq(homeworkSubmissions.studentId, studentId)
      ));
    return submission || undefined;
  }

  async createHomeworkSubmission(submission: InsertHomeworkSubmission): Promise<HomeworkSubmission> {
    const [newSubmission] = await db.insert(homeworkSubmissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async updateHomeworkSubmission(id: number, updates: Partial<InsertHomeworkSubmission>): Promise<HomeworkSubmission> {
    const [updatedSubmission] = await db.update(homeworkSubmissions)
      .set({ ...updates, completedAt: updates.isCompleted ? new Date() : null })
      .where(eq(homeworkSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async getHomeworkSubmissions(homeworkId: number): Promise<HomeworkSubmission[]> {
    return await db.select()
      .from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.homeworkId, homeworkId));
  }

  async getHomeworkSubmissionsByStudent(studentId: number): Promise<HomeworkSubmission[]> {
    return await db.select()
      .from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.studentId, studentId));
  }

  // Exercise submission operations
  async getExerciseSubmission(exerciseId: number, studentId: number): Promise<ExerciseSubmission | undefined> {
    const [submission] = await db.select()
      .from(exerciseSubmissions)
      .where(and(
        eq(exerciseSubmissions.exerciseId, exerciseId),
        eq(exerciseSubmissions.studentId, studentId)
      ));
    return submission || undefined;
  }

  async createExerciseSubmission(submission: InsertExerciseSubmission): Promise<ExerciseSubmission> {
    const submissionData = {
      ...submission,
      completedAt: submission.isCompleted ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const [newSubmission] = await db.insert(exerciseSubmissions)
      .values(submissionData)
      .returning();
    return newSubmission;
  }

  async updateExerciseSubmission(id: number, updates: Partial<InsertExerciseSubmission>): Promise<ExerciseSubmission> {
    const updateData = {
      ...updates,
      completedAt: updates.isCompleted ? new Date() : null,
      updatedAt: new Date()
    };
    
    const [updatedSubmission] = await db.update(exerciseSubmissions)
      .set(updateData)
      .where(eq(exerciseSubmissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async getExerciseSubmissions(exerciseId: number): Promise<ExerciseSubmission[]> {
    return await db.select()
      .from(exerciseSubmissions)
      .where(eq(exerciseSubmissions.exerciseId, exerciseId));
  }

  async getExerciseSubmissionsByStudent(studentId: number): Promise<ExerciseSubmission[]> {
    return await db.select()
      .from(exerciseSubmissions)
      .where(eq(exerciseSubmissions.studentId, studentId));
  }

  // Student subject and progress operations
  async getStudentSubjects(gradeLevel: string): Promise<string[]> {
    const result = await db
      .selectDistinct({ subject: topics.subject })
      .from(topics)
      .where(eq(topics.grade, gradeLevel));
    
    return result.map(row => row.subject);
  }

  async getTopicProgress(studentId: number, topicId: number): Promise<{ exerciseProgress: number; homeworkProgress: number; overallProgress: number; mastery: string }> {
    console.log(`🔍 DEBUG: Calculating progress for studentId=${studentId}, topicId=${topicId}`);
    
    // Get the topic to find its subject
    const topic = await this.getTopic(topicId);
    if (!topic) {
      console.log(`❌ DEBUG: Topic ${topicId} not found`);
      return { exerciseProgress: 0, homeworkProgress: 0, overallProgress: 0, mastery: 'not-started' };
    }
    
    console.log(`✅ DEBUG: Found topic: ${topic.name} (${topic.subject})`);    

    // Get exercise progress specifically for this topic - count completed exercises by student
    const completedExercises = await db
      .select({
        completed: sql<number>`COUNT(DISTINCT ${exerciseSubmissions.exerciseId})::int`
      })
      .from(exerciseSubmissions)
      .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
      .innerJoin(exerciseQuestions, eq(exerciseQuestions.exerciseId, exercises.id))
      .where(
        and(
          eq(exerciseSubmissions.studentId, studentId),
          eq(exerciseQuestions.topicId, topicId),
          eq(exerciseSubmissions.isCompleted, true)
        )
      );

    // Get all exercises available for this specific topic
    const totalTopicExercises = await db
      .select({
        total: sql<number>`COUNT(DISTINCT ${exercises.id})::int`
      })
      .from(exercises)
      .innerJoin(exerciseQuestions, eq(exerciseQuestions.exerciseId, exercises.id))
      .where(eq(exerciseQuestions.topicId, topicId));

    const completedCount = completedExercises[0]?.completed || 0;
    const totalCount = totalTopicExercises[0]?.total || 0;
    
    console.log(`🔍 DEBUG: Exercise stats for topic ${topic.name}: ${completedCount}/${totalCount} completed`);

    // Get the topic name for homework filtering
    const topicInfo = await db
      .select({ name: topics.name })
      .from(topics)
      .where(eq(topics.id, topicId));
    
    // Get homework progress that relates to this specific topic using topic_id
    const student = await this.getStudentById(studentId);
    let homeworkStats = { completed: 0, total: 0 };
    
    if (student) {
      console.log(`🔍 DEBUG: Looking for homework for topic ID ${topicId}`);
      
      const classEnrollments = await db
        .select({ classId: classStudents.classId })
        .from(classStudents)
        .where(eq(classStudents.studentId, studentId));
      
      console.log(`🔍 DEBUG: Student ${studentId} enrolled in ${classEnrollments.length} classes: ${classEnrollments.map(e => e.classId).join(', ')}`);
      
      if (classEnrollments.length > 0) {
        const classIds = classEnrollments.map(e => e.classId);
        
        // Count total available homework for THIS specific topic only (using topic_id)
        const totalHomework = await db
          .select({
            total: sql<number>`COUNT(*)::int`
          })
          .from(homework)
          .where(
            and(
              inArray(homework.classId, classIds),
              eq(homework.published, true),
              eq(homework.topicId, topicId)
            )
          );

        // Count completed homework for THIS specific topic only
        const completedHomework = await db
          .select({
            completed: sql<number>`COUNT(*)::int`
          })
          .from(homework)
          .innerJoin(homeworkSubmissions, eq(homework.id, homeworkSubmissions.homeworkId))
          .where(
            and(
              eq(homeworkSubmissions.studentId, studentId),
              eq(homeworkSubmissions.isCompleted, true),
              inArray(homework.classId, classIds),
              eq(homework.published, true),
              eq(homework.topicId, topicId)
            )
          );

        const hwCompleted = completedHomework[0]?.completed || 0;
        const hwTotal = totalHomework[0]?.total || 0;
        
        console.log(`🔍 DEBUG: Homework stats for topic ${topicId}: ${hwCompleted}/${hwTotal} completed`);
        
        // Update homeworkStats object for later use
        homeworkStats = {
          completed: hwCompleted,
          total: hwTotal
        };
      }
    }

    // Calculate exercise progress based on topic-specific data
    const exerciseProgress = totalTopicExercises[0]?.total > 0 ? 
      Math.round((completedExercises[0]?.completed || 0) / totalTopicExercises[0].total * 100) : 0;
    
    const homeworkProgress = homeworkStats?.total > 0 ? 
      Math.round((homeworkStats.completed / homeworkStats.total) * 100) : 0;

    // Calculate overall progress with intelligent weighting
    // If both homework and exercises exist, weight them equally (50/50)
    // If only homework exists (most common), use homework progress
    // If only exercises exist, use exercise progress
    let overallProgress;
    
    const hasHomework = homeworkStats?.total > 0;
    const hasExercises = totalCount > 0;
    const hasCompletedHomework = homeworkStats?.completed > 0;
    const hasCompletedExercises = completedCount > 0;
    
    // If nothing available OR nothing completed, topic is not started
    if ((!hasHomework && !hasExercises) || (!hasCompletedHomework && !hasCompletedExercises)) {
      overallProgress = 0;
    } else if (hasHomework && hasExercises) {
      // Both homework and exercises available - equal weight
      overallProgress = Math.round((exerciseProgress * 0.5) + (homeworkProgress * 0.5));
    } else if (hasHomework) {
      // Only homework available - use homework progress
      overallProgress = homeworkProgress;
    } else {
      // Only exercises available - use exercise progress
      overallProgress = exerciseProgress;
    }
      
    // Final progress calculation completed

    // Determine mastery level
    let mastery = 'not-started';
    if (overallProgress >= 90) mastery = 'excellent';
    else if (overallProgress >= 75) mastery = 'good';  
    else if (overallProgress >= 50) mastery = 'fair';
    else if (overallProgress > 0) mastery = 'needs-improvement';

    // Calculate total assignments (homework + exercises)
    const totalAssignments = (homeworkStats?.total || 0) + (totalCount || 0);
    const completedAssignments = (homeworkStats?.completed || 0) + (completedCount || 0);

    return { 
      exerciseProgress, 
      homeworkProgress, 
      overallProgress, 
      mastery,
      totalAssignments,
      completedAssignments
    };
  }

  async getTopicAnalysis(studentId: number, topicId: number): Promise<{ 
    strengths: string[]; 
    weaknesses: string[]; 
    completedExercises: number; 
    totalExercises: number;
    completedHomework: number;
    totalHomework: number;
    aiTutorialSuggestions: string[];
  }> {
    try {
      // Get exercises completed by student for this topic (using exerciseQuestions table)
      const exerciseSubmissionCount = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${exerciseSubmissions.exerciseId})::int`
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .innerJoin(exerciseQuestions, eq(exerciseQuestions.exerciseId, exercises.id))
        .where(
          and(
            eq(exerciseSubmissions.studentId, studentId),
            eq(exerciseQuestions.topicId, topicId),
            eq(exerciseSubmissions.isCompleted, true)
          )
        );

      // Get total exercises for this topic
      const totalExerciseCount = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${exercises.id})::int`
        })
        .from(exercises)
        .innerJoin(exerciseQuestions, eq(exerciseQuestions.exerciseId, exercises.id))
        .where(eq(exerciseQuestions.topicId, topicId));

      // Get topic information to determine subject and grade for topic-specific homework
      const topic = await this.getTopic(topicId);
      let homeworkSubmissionCount = [{ count: 0 }];
      let totalHomeworkCount = [{ count: 0 }];
      
      if (topic) {
        // Get student's classes for this subject/grade
        const student = await this.getStudentById(studentId);
        if (student) {
          const classEnrollments = await db
            .select({ classId: classStudents.classId })
            .from(classStudents)
            .where(eq(classStudents.studentId, studentId));
          
          if (classEnrollments.length > 0) {
            const classIds = classEnrollments.map(e => e.classId);
            
            // Count homework ONLY for this specific topic (using topicId)
            // Get homework completed by student for THIS topic only
            homeworkSubmissionCount = await db
              .select({
                count: sql<number>`COUNT(*)::int`
              })
              .from(homeworkSubmissions)
              .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
              .where(
                and(
                  eq(homeworkSubmissions.studentId, studentId),
                  eq(homeworkSubmissions.isCompleted, true),
                  inArray(homework.classId, classIds),
                  eq(homework.published, true),
                  eq(homework.topicId, topicId)
                )
              );

            // Get total homework count for THIS topic only
            totalHomeworkCount = await db
              .select({
                count: sql<number>`COUNT(*)::int`
              })
              .from(homework)
              .where(
                and(
                  inArray(homework.classId, classIds),
                  eq(homework.published, true),
                  eq(homework.topicId, topicId)
                )
              );
          }
        }
      }

      const completedExercises = exerciseSubmissionCount[0]?.count || 0;
      const totalExercises = totalExerciseCount[0]?.count || 0;
      const completedHomework = homeworkSubmissionCount[0]?.count || 0;
      const totalHomework = totalHomeworkCount[0]?.count || 0;

      // Hardcoded strengths and weaknesses based on performance
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      const aiTutorialSuggestions: string[] = [];

      // Calculate completion rates
      const exerciseCompletionRate = totalExercises > 0 ? completedExercises / totalExercises : 0;
      const homeworkCompletionRate = totalHomework > 0 ? completedHomework / totalHomework : 0;

      // Hardcoded analysis based on completion rates
      if (exerciseCompletionRate >= 0.8) {
        strengths.push("Excellent exercise completion rate");
        strengths.push("Shows consistent practice habits");
      } else if (exerciseCompletionRate >= 0.5) {
        strengths.push("Good progress on practice exercises");
      } else {
        weaknesses.push("Low exercise completion rate");
        aiTutorialSuggestions.push("Complete more practice exercises to build confidence");
      }

      if (homeworkCompletionRate >= 0.8) {
        strengths.push("Consistent with homework submissions");
        strengths.push("Demonstrates strong study discipline");
      } else if (homeworkCompletionRate >= 0.5) {
        strengths.push("Making steady progress on assignments");
      } else {
        weaknesses.push("Inconsistent homework completion");
        aiTutorialSuggestions.push("Set up a regular homework schedule");
      }

      // Topic-specific hardcoded content
      if (topicId === 1) { // Algebra
        strengths.push("Strong foundation in algebraic thinking");
        if (weaknesses.length > 0) {
          weaknesses.push("Needs more practice with complex equations");
          aiTutorialSuggestions.push("Review basic algebraic operations");
          aiTutorialSuggestions.push("Practice solving linear equations step by step");
        }
      } else if (topicId === 3) { // Exponents and Surds
        strengths.push("Good understanding of exponent rules");
        if (weaknesses.length > 0) {
          weaknesses.push("Struggles with surd simplification");
          aiTutorialSuggestions.push("Practice rationalization techniques");
          aiTutorialSuggestions.push("Master the laws of exponents");
        }
      }

      // Default suggestions if performing well
      if (aiTutorialSuggestions.length === 0) {
        aiTutorialSuggestions.push("Explore advanced problem-solving techniques");
        aiTutorialSuggestions.push("Try real-world application problems");
        aiTutorialSuggestions.push("Challenge yourself with competition-level questions");
      }

      // Ensure at least some positive feedback
      if (strengths.length === 0) {
        strengths.push("Shows potential for improvement");
        strengths.push("Active engagement with learning materials");
      }

      return {
        strengths,
        weaknesses,
        completedExercises,
        totalExercises,
        completedHomework,
        totalHomework,
        aiTutorialSuggestions
      };
    } catch (error) {
      console.error('Error in getTopicAnalysis:', error);
      // Return hardcoded fallback data
      return {
        strengths: ["Shows commitment to learning", "Actively engaging with course material"],
        weaknesses: ["Could benefit from more practice", "Consider reviewing fundamental concepts"],
        completedExercises: 2,
        totalExercises: 5,
        completedHomework: 1,
        totalHomework: 3,
        aiTutorialSuggestions: [
          "Start with foundational practice exercises",
          "Review key concepts with interactive tutorials",
          "Set up a consistent study schedule"
        ]
      };
    }
  }
  // Student analytics operations
  async saveStudentAnalytics(data: {
    studentId: number;
    homeworkId?: number;
    exerciseId?: number;
    subject: string;
    grade: string;
    strengths: string[];
    weaknesses: string[];
    score: number;
    totalMarks: number;
  }): Promise<any> {
    try {
      const [analytics] = await db
        .insert(studentAnalytics)
        .values({
          studentId: data.studentId,
          homeworkId: data.homeworkId,
          exerciseId: data.exerciseId,
          subject: data.subject,
          grade: data.grade,
          strengths: data.strengths,
          weaknesses: data.weaknesses,
          score: data.score,
          totalMarks: data.totalMarks
        })
        .returning();
      return analytics;
    } catch (error) {
      console.error("Error saving student analytics:", error);
      throw error;
    }
  }



  // Topic feedback operations
  async getTopicFeedback(studentId: number, topicId: number): Promise<TopicFeedback | undefined> {
    try {
      const [feedback] = await db
        .select()
        .from(topicFeedback)
        .where(and(
          eq(topicFeedback.studentId, studentId),
          eq(topicFeedback.topicId, topicId)
        ));
      return feedback || undefined;
    } catch (error) {
      console.error("Error fetching topic feedback:", error);
      return undefined;
    }
  }

  async saveTopicFeedback(feedback: InsertTopicFeedback): Promise<TopicFeedback> {
    try {
      const [savedFeedback] = await db
        .insert(topicFeedback)
        .values({
          ...feedback,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [topicFeedback.studentId, topicFeedback.topicId],
          set: {
            strengths: feedback.strengths,
            improvements: feedback.improvements,
            lastScore: feedback.lastScore,
            lastTotalMarks: feedback.lastTotalMarks,
            lastPercentage: feedback.lastPercentage,
            sourceType: feedback.sourceType,
            sourceId: feedback.sourceId,
            updatedAt: new Date()
          }
        })
        .returning();
      return savedFeedback;
    } catch (error) {
      console.error("Error saving topic feedback:", error);
      throw error;
    }
  }

  async getTopicFeedbackBySubject(studentId: number, subject: string): Promise<TopicFeedback[]> {
    try {
      const feedbacks = await db
        .select()
        .from(topicFeedback)
        .where(and(
          eq(topicFeedback.studentId, studentId),
          eq(topicFeedback.subject, subject)
        ))
        .orderBy(topicFeedback.updatedAt);
      return feedbacks;
    } catch (error) {
      console.error("Error fetching topic feedback by subject:", error);
      return [];
    }
  }

  async getTopicsBySubject(subject: string): Promise<Topic[]> {
    try {
      const topicsList = await db
        .select()
        .from(topics)
        .where(eq(topics.subject, subject));
      return topicsList;
    } catch (error) {
      console.error("Error fetching topics by subject:", error);
      return [];
    }
  }

  // Question report operations
  async createQuestionReport(report: InsertQuestionReport): Promise<QuestionReport> {
    try {
      const [createdReport] = await db
        .insert(questionReports)
        .values(report)
        .returning();
      return createdReport;
    } catch (error) {
      console.error("Error creating question report:", error);
      throw error;
    }
  }

  async getQuestionReportsByStudent(studentId: number): Promise<QuestionReport[]> {
    try {
      const reports = await db
        .select()
        .from(questionReports)
        .where(eq(questionReports.studentId, studentId))
        .orderBy(desc(questionReports.createdAt));
      return reports;
    } catch (error) {
      console.error("Error fetching question reports by student:", error);
      return [];
    }
  }

  async getQuestionReports(status?: string): Promise<QuestionReport[]> {
    try {
      console.log("🔍 Starting getQuestionReports with status:", status);
      
      // Start with the most basic query possible
      let baseReports;
      if (status) {
        baseReports = await db.select().from(questionReports)
          .where(eq(questionReports.status, status))
          .orderBy(desc(questionReports.createdAt));
      } else {
        baseReports = await db.select().from(questionReports)
          .orderBy(desc(questionReports.createdAt));
      }
      
      console.log("📊 Found base reports:", baseReports.length);

      // For now, return basic reports with minimal enrichment to test
      const enrichedReports = [];
      
      for (const report of baseReports) {
        console.log("🔄 Processing report:", report.id);
        
        // Get student info from users table via join
        let studentData = null;
        try {
          const studentResult = await db.select({
            id: students.id,
            firstName: users.firstName,
            lastName: users.lastName,
          })
            .from(students)
            .leftJoin(users, eq(students.userId, users.id))
            .where(eq(students.id, report.studentId))
            .limit(1);
          studentData = studentResult[0] || null;
          console.log("👤 Found student:", studentData?.firstName);
        } catch (e) {
          console.warn("Error fetching student:", e);
        }

        // Get homework info if exists
        let homeworkData = null;
        let questionText = "Question not found";
        let maxPoints = 0;
        
        if (report.homeworkId) {
          try {
            const homeworkResult = await db.select().from(homework)
              .where(eq(homework.id, report.homeworkId))
              .limit(1);
            homeworkData = homeworkResult[0] || null;
            console.log("📝 Found homework:", homeworkData?.title);
            
            // Extract question text from JSON array
            if (homeworkData?.questions && Array.isArray(homeworkData.questions)) {
              const questionData = homeworkData.questions.find(q => q.id === report.questionId);
              if (questionData) {
                questionText = questionData.question || "Question text not found";
                maxPoints = parseInt(questionData.points || '0');
                console.log("🎯 Found question:", questionText.substring(0, 50) + "...");
              } else {
                console.warn("Question not found with ID:", report.questionId);
              }
            }
          } catch (e) {
            console.warn("Error fetching homework:", e);
          }
        }

        const enrichedReport = {
          ...report,
          reviewNotes: report.reviewNotes, // Ensure reviewNotes is explicitly included
          student: studentData ? {
            id: studentData.id,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
          } : null,
          homework: homeworkData ? {
            id: homeworkData.id,
            title: homeworkData.title,
            subject: "Mathematics", // Default subject since it's not in database
          } : null,
          questionText,
          maxPoints,
        };
        
        enrichedReports.push(enrichedReport);
      }

      console.log("✅ Returning enriched reports:", enrichedReports.length);
      return enrichedReports;
    } catch (error) {
      console.error("❌ Error fetching question reports:", error);
      return [];
    }
  }

  async updateQuestionReportStatus(id: number, status: string, reviewedBy?: number, reviewNotes?: string): Promise<QuestionReport | undefined> {
    try {
      const updateData: any = {
        status: status,
        reviewNotes: reviewNotes || null
      };

      if (reviewedBy) {
        updateData.reviewedBy = reviewedBy;
      }

      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }

      const [updatedReport] = await db
        .update(questionReports)
        .set(updateData)
        .where(eq(questionReports.id, id))
        .returning();
      return updatedReport;
    } catch (error) {
      console.error("Error updating question report status:", error);
      return undefined;
    }
  }

  async getQuestionReportById(id: number): Promise<QuestionReport | undefined> {
    try {
      const [report] = await db
        .select()
        .from(questionReports)
        .where(eq(questionReports.id, id));
      return report;
    } catch (error) {
      console.error("Error fetching question report by id:", error);
      return undefined;
    }
  }

  // AI Prompt operations
  async getAllAiPrompts(): Promise<AiPrompt[]> {
    try {
      const prompts = await db.select().from(aiPrompts).orderBy(asc(aiPrompts.category), asc(aiPrompts.name));
      return prompts;
    } catch (error) {
      console.error("Error fetching all AI prompts:", error);
      return [];
    }
  }

  async getAiPromptById(id: number): Promise<AiPrompt | undefined> {
    try {
      const [prompt] = await db.select().from(aiPrompts).where(eq(aiPrompts.id, id));
      return prompt;
    } catch (error) {
      console.error("Error fetching AI prompt by id:", error);
      return undefined;
    }
  }

  async getAiPromptsByCategory(category: string): Promise<AiPrompt[]> {
    try {
      const prompts = await db
        .select()
        .from(aiPrompts)
        .where(eq(aiPrompts.category, category))
        .orderBy(asc(aiPrompts.name));
      return prompts;
    } catch (error) {
      console.error("Error fetching AI prompts by category:", error);
      return [];
    }
  }

  async createAiPrompt(prompt: InsertAiPrompt): Promise<AiPrompt> {
    try {
      const [newPrompt] = await db
        .insert(aiPrompts)
        .values({
          ...prompt,
          updatedAt: new Date()
        })
        .returning();
      return newPrompt;
    } catch (error) {
      console.error("Error creating AI prompt:", error);
      throw error;
    }
  }

  async updateAiPrompt(id: number, updates: Partial<InsertAiPrompt>): Promise<AiPrompt | undefined> {
    try {
      const [updatedPrompt] = await db
        .update(aiPrompts)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(aiPrompts.id, id))
        .returning();
      return updatedPrompt;
    } catch (error) {
      console.error("Error updating AI prompt:", error);
      return undefined;
    }
  }

  async deleteAiPrompt(id: number): Promise<boolean> {
    try {
      const result = await db.delete(aiPrompts).where(eq(aiPrompts.id, id));
      return result.rowCount !== undefined && result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting AI prompt:", error);
      return false;
    }
  }

  async testAiPrompt(
    promptText: string, 
    variables: Record<string, string>, 
    images?: {
      questionImageUrl?: string;
      studentAnswerImageUrl?: string;
      variableImages?: Record<string, string>;
      pdfPageImages?: string[];
    }
  ): Promise<{success: boolean, processedPrompt?: string, result?: string, error?: string}> {
    console.log("🚀 STARTING testAiPrompt method");
    console.log("📝 Input promptText:", promptText.substring(0, 200) + "...");
    console.log("🔑 Variables:", variables);
    console.log("🖼️ Images provided:", {
      questionImage: !!images?.questionImageUrl,
      studentAnswerImage: !!images?.studentAnswerImageUrl,
      variableImages: images?.variableImages ? Object.keys(images.variableImages) : [],
      pdfPageImages: images?.pdfPageImages?.length || 0
    });
    console.log("🔐 OpenAI API key available:", !!process.env.OPENAI_API_KEY);
    
    try {
      // Replace variables in the prompt text
      let processedPrompt = promptText;
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), value);
      });

      console.log("✅ Variables replaced, processed prompt:", processedPrompt.substring(0, 200) + "...");

      // Use OpenAI API for real AI responses (ES module import)
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      console.log("✅ OpenAI client initialized");

      // Determine if we have any images
      const hasImages = images?.questionImageUrl || images?.studentAnswerImageUrl || 
                       (images?.variableImages && Object.keys(images.variableImages).length > 0) ||
                       (images?.pdfPageImages && images.pdfPageImages.length > 0);
      
      // Use gpt-4o for vision when image is present, gpt-4o-mini otherwise
      const model = hasImages ? "gpt-4o" : "gpt-4o-mini";
      console.log(`📤 Sending request to OpenAI ${model}...`);

      // Build user message content with all images
      let userContent: any;
      if (hasImages) {
        const contentParts: any[] = [{ type: "text", text: processedPrompt }];
        
        // Add PDF page images first (they are the main document)
        if (images?.pdfPageImages && images.pdfPageImages.length > 0) {
          console.log(`➕ Adding ${images.pdfPageImages.length} PDF page images to request`);
          images.pdfPageImages.forEach((pageImage, index) => {
            contentParts.push({ 
              type: "image_url", 
              image_url: { 
                url: pageImage,
                detail: "high"
              } 
            });
          });
        }
        
        // Add question image if provided
        if (images?.questionImageUrl) {
          console.log("➕ Adding question image to request");
          contentParts.push({ 
            type: "image_url", 
            image_url: { url: images.questionImageUrl } 
          });
        }
        
        // Add student answer image if provided
        if (images?.studentAnswerImageUrl) {
          console.log("➕ Adding student answer image to request");
          contentParts.push({ 
            type: "image_url", 
            image_url: { url: images.studentAnswerImageUrl } 
          });
        }
        
        // Add variable images if provided
        if (images?.variableImages) {
          Object.entries(images.variableImages).forEach(([varName, imageUrl]) => {
            console.log(`➕ Adding variable image: ${varName}`);
            contentParts.push({ 
              type: "image_url", 
              image_url: { url: imageUrl } 
            });
          });
        }
        
        userContent = contentParts;
      } else {
        userContent = processedPrompt;
      }

      // Call OpenAI with the processed prompt
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "You are testing an AI prompt. Provide a helpful and detailed response that demonstrates how this prompt would work in practice. Be thorough and show the full capabilities of the prompt."
          },
          {
            role: "user", 
            content: userContent
          }
        ],
        max_tokens: 2000, // Allow for longer responses
        temperature: 0.7
      });

      console.log("📥 OpenAI response received!");
      const aiResult = response.choices[0].message.content;
      console.log("🎯 AI result length:", aiResult ? aiResult.length : 0);
      console.log("🎯 AI result preview:", aiResult ? aiResult.substring(0, 200) + "..." : "No content");

      // Build image summary for result
      const imageSummary = hasImages ? ` [+ ${
        [
          images?.pdfPageImages?.length ? `${images.pdfPageImages.length} PDF page(s)` : null,
          images?.questionImageUrl ? 'question image' : null,
          images?.studentAnswerImageUrl ? 'student answer image' : null,
          images?.variableImages ? `${Object.keys(images.variableImages).length} variable image(s)` : null
        ].filter(Boolean).join(', ')
      }]` : '';

      const result = {
        success: true,
        processedPrompt: processedPrompt + imageSummary,
        result: aiResult || "No response generated"
      };
      
      console.log("✅ Returning successful result with both processedPrompt and result");
      return result;

    } catch (error) {
      console.error("❌ ERROR in testAiPrompt:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to test prompt with ChatGPT"
      };
    }
  }

  // MCP Prompt operations
  async getAllMcpPrompts(): Promise<McpPrompt[]> {
    try {
      const prompts = await db.select().from(mcpPrompts).orderBy(asc(mcpPrompts.category), asc(mcpPrompts.name));
      return prompts;
    } catch (error) {
      console.error("Error fetching all MCP prompts:", error);
      return [];
    }
  }

  async getMcpPromptById(id: number): Promise<McpPrompt | undefined> {
    try {
      const [prompt] = await db.select().from(mcpPrompts).where(eq(mcpPrompts.id, id));
      return prompt;
    } catch (error) {
      console.error("Error fetching MCP prompt by id:", error);
      return undefined;
    }
  }

  async getMcpPromptByKey(key: string): Promise<McpPrompt | undefined> {
    try {
      const [prompt] = await db.select().from(mcpPrompts).where(eq(mcpPrompts.key, key));
      return prompt;
    } catch (error) {
      console.error("Error fetching MCP prompt by key:", error);
      return undefined;
    }
  }

  async createMcpPrompt(prompt: InsertMcpPrompt): Promise<McpPrompt> {
    try {
      const [newPrompt] = await db
        .insert(mcpPrompts)
        .values({
          ...prompt,
          createdAt: new Date(),
          lastSyncedAt: new Date()
        })
        .returning();
      return newPrompt;
    } catch (error) {
      console.error("Error creating MCP prompt:", error);
      throw error;
    }
  }

  async updateMcpPrompt(id: number, updates: Partial<InsertMcpPrompt>): Promise<McpPrompt | undefined> {
    try {
      const [updatedPrompt] = await db
        .update(mcpPrompts)
        .set({
          ...updates,
          lastSyncedAt: new Date()
        })
        .where(eq(mcpPrompts.id, id))
        .returning();
      return updatedPrompt;
    } catch (error) {
      console.error("Error updating MCP prompt:", error);
      return undefined;
    }
  }

  async deleteMcpPrompt(id: number): Promise<boolean> {
    try {
      const result = await db.delete(mcpPrompts).where(eq(mcpPrompts.id, id));
      return result.rowCount !== undefined && result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting MCP prompt:", error);
      return false;
    }
  }

  async publishAiPrompt(id: number): Promise<{success: boolean, message: string, functionGenerated?: string}> {
    try {
      // First, get the prompt details
      const prompt = await this.getAiPromptById(id);
      if (!prompt) {
        return { success: false, message: "AI prompt not found" };
      }

      // Mark as published in database
      await this.db
        .update(aiPrompts)
        .set({ 
          isPublished: true,
          updatedAt: new Date()
        })
        .where(eq(aiPrompts.id, id));

      // Generate function stub for the prompt
      const functionStub = this.generatePromptFunction(prompt);
      
      return {
        success: true,
        message: `Prompt "${prompt.name}" published successfully! Function stub generated but functionality needs to be implemented manually.`,
        functionGenerated: functionStub
      };
    } catch (error) {
      console.error("Error publishing AI prompt:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  private generatePromptFunction(prompt: any): string {
    // Convert prompt name to function name (camelCase)
    const functionName = prompt.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .map((word: string, index: number) => 
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');

    // Generate parameter list from variables
    const params = prompt.variables.map((variable: string) => `${variable}: string`).join(', ');
    const variableReplacements = prompt.variables
      .map((variable: string) => `    processedPrompt = processedPrompt.replace(/{{${variable}}}/g, ${variable});`)
      .join('\n');

    const functionStub = `
/**
 * ${prompt.description}
 * Category: ${prompt.category}
 * Generated from AI Prompt Builder
 * 
 * TODO: Implement the actual AI call functionality
 * This is a stub - you need to integrate with your AI service
 */
export async function ${functionName}(${params}): Promise<string> {
  try {
    // The AI prompt template
    let processedPrompt = \`${prompt.promptText}\`;
    
    // Replace variables in the prompt
${variableReplacements}
    
    // TODO: Replace this with actual AI service call
    // Example: const response = await openai.chat.completions.create({...});
    console.warn("⚠️  ${functionName} function stub called - implement AI service integration");
    
    return "This is a function stub. Implement actual AI functionality here.";
  } catch (error) {
    console.error("Error in ${functionName}:", error);
    throw error;
  }
}

// Example usage:
// const result = await ${functionName}(${prompt.variables.map((v: string) => `"sample_${v}"`).join(', ')});
`;

    console.log(`📝 Generated function stub for "${prompt.name}":`);
    console.log(functionStub);
    
    return functionStub;
  }

  async createPromptVersion(parentId: number, versionData: any, createdBy: number): Promise<{success: boolean, message: string, versionId?: number, workflow?: string}> {
    try {
      // Get the parent prompt
      const parent = await this.getAiPromptById(parentId);
      if (!parent) {
        return { success: false, message: "Parent prompt not found" };
      }

      // Generate schema hash from variables
      const crypto = await import('crypto');
      const schemaHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(versionData.variables))
        .digest('hex');

      // Create schema for variables
      const variablesSchema = versionData.variables.reduce((schema: any, variable: string) => {
        schema[variable] = {
          type: 'string',
          description: `The ${variable} parameter`,
          required: true
        };
        return schema;
      }, {});

      // Determine if this is a major or minor version change
      const existingVariables = parent.variables || [];
      const newVariables = versionData.variables || [];
      const addedVariables = newVariables.filter((v: string) => !existingVariables.includes(v));
      const removedVariables = existingVariables.filter((v: string) => !newVariables.includes(v));
      
      // Calculate next version number
      const currentVersion = parent.version || '1.0.0';
      const [major, minor, patch] = currentVersion.split('.').map(Number);
      let nextVersion: string;
      
      if (removedVariables.length > 0) {
        // Breaking change - major version bump
        nextVersion = `${major + 1}.0.0`;
      } else if (addedVariables.length > 0) {
        // New features - minor version bump  
        nextVersion = `${major}.${minor + 1}.0`;
      } else {
        // Patch changes
        nextVersion = `${major}.${minor}.${patch + 1}`;
      }

      // Insert new version
      const [newVersion] = await this.db
        .insert(aiPrompts)
        .values({
          name: versionData.name,
          category: versionData.category,
          description: versionData.description,
          promptText: versionData.promptText,
          variables: versionData.variables,
          exampleUsage: versionData.exampleUsage,
          isActive: versionData.isActive,
          version: nextVersion,
          parentId: parentId,
          status: 'draft', // Always starts as draft
          variablesSchema,
          schemaHash,
          testCases: [],
          isCurrentVersion: false, // Not current until published
          createdBy,
        })
        .returning();

      const workflowMessage = addedVariables.length > 0 || removedVariables.length > 0 
        ? `⚠️ Variable changes detected! This version requires testing and developer implementation before it can be published.`
        : `Version created successfully. Ready for testing.`;

      console.log(`🔄 Created version ${nextVersion} for "${parent.name}"`);
      if (addedVariables.length > 0) {
        console.log(`➕ Added variables: ${addedVariables.join(', ')}`);
      }
      if (removedVariables.length > 0) {
        console.log(`➖ Removed variables: ${removedVariables.join(', ')}`);
      }

      return {
        success: true,
        message: `Version ${nextVersion} created successfully!`,
        versionId: newVersion.id,
        workflow: workflowMessage
      };
    } catch (error) {
      console.error("Error creating prompt version:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async requestPromptImplementation(promptId: number): Promise<{success: boolean, message: string, implementationRequest?: string}> {
    try {
      // Get the prompt
      const prompt = await this.getAiPromptById(promptId);
      if (!prompt) {
        return { success: false, message: "Prompt not found" };
      }

      // Verify prompt is tested
      if (prompt.status !== 'tested' && prompt.status !== 'draft') {
        return { 
          success: false, 
          message: `Prompt must be tested before requesting implementation. Current status: ${prompt.status}` 
        };
      }

      // Update status to awaiting_dev
      await db
        .update(aiPrompts)
        .set({ 
          status: 'awaiting_dev',
          updatedAt: new Date()
        })
        .where(eq(aiPrompts.id, promptId));

      // Generate copy-text for Replit Agent
      const implementationRequest = this.generateImplementationRequest(prompt);

      console.log(`📋 Implementation requested for "${prompt.name}" v${prompt.version}`);
      console.log(`Copy this to Replit Agent:\n${implementationRequest}`);

      return {
        success: true,
        message: `Implementation request created for "${prompt.name}" v${prompt.version}. Status changed to "awaiting_dev".`,
        implementationRequest
      };
    } catch (error) {
      console.error("Error requesting implementation:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  private generateImplementationRequest(prompt: any): string {
    const parent = prompt.parentId ? 'This is an updated version' : 'This is a new prompt';
    
    return `
🤖 **Implementation Request for Replit Agent**

**Prompt:** ${prompt.name} v${prompt.version}
**Category:** ${prompt.category}
**Status:** ${prompt.status} → awaiting_dev
**Schema Hash:** ${prompt.schemaHash}

**Description:**
${prompt.description}

**Variables Required:**
${prompt.variables.map((v: string) => `- {{${v}}} (string, required)`).join('\n')}

**Prompt Template:**
\`\`\`
${prompt.promptText}
\`\`\`

**Implementation Instructions:**
1. Create function: \`${this.generateFunctionName(prompt.name)}\`
2. Parameters: ${prompt.variables.map((v: string) => `${v}: string`).join(', ')}
3. Replace variables in prompt template
4. Integrate with your AI service (OpenAI, etc.)
5. Return the AI response

**Example Usage:**
\`\`\`typescript
const result = await ${this.generateFunctionName(prompt.name)}(${prompt.variables.map((v: string) => `"sample_${v}"`).join(', ')});
\`\`\`

**Copy this request to Replit Agent to implement the functionality.**
`;
  }

  private generateFunctionName(promptName: string): string {
    return promptName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .map((word: string, index: number) => 
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join('');
  }

  // Subscription Plan operations
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.sortOrder));
      return plans;
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      return [];
    }
  }

  async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(asc(subscriptionPlans.sortOrder));
      return plans;
    } catch (error) {
      console.error("Error fetching active subscription plans:", error);
      return [];
    }
  }

  async getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined> {
    try {
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
      return plan;
    } catch (error) {
      console.error("Error fetching subscription plan by ID:", error);
      return undefined;
    }
  }

  async getSubscriptionPlanByPaystackCode(code: string): Promise<SubscriptionPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.paystackPlanCode, code));
      return plan;
    } catch (error) {
      console.error("Error fetching subscription plan by Paystack code:", error);
      return undefined;
    }
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    try {
      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values({ ...plan, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return newPlan;
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      throw error;
    }
  }

  async updateSubscriptionPlan(id: number, updates: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    try {
      // Remove date fields from updates to avoid string/Date conversion issues
      const { createdAt, updatedAt, ...safeUpdates } = updates as any;
      const [updatedPlan] = await db
        .update(subscriptionPlans)
        .set({ ...safeUpdates, updatedAt: new Date() })
        .where(eq(subscriptionPlans.id, id))
        .returning();
      return updatedPlan;
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      return undefined;
    }
  }

  async deleteSubscriptionPlan(id: number): Promise<boolean> {
    try {
      const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
      return result.rowCount !== undefined && result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      return false;
    }
  }

  // Admin Settings operations
  async getAdminSetting(settingKey: string): Promise<AdminSetting | undefined> {
    try {
      const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, settingKey));
      return setting;
    } catch (error) {
      console.error("Error fetching admin setting:", error);
      return undefined;
    }
  }

  async getAllAdminSettings(): Promise<AdminSetting[]> {
    try {
      const settings = await db.select().from(adminSettings);
      return settings;
    } catch (error) {
      console.error("Error fetching all admin settings:", error);
      return [];
    }
  }

  async createAdminSetting(setting: InsertAdminSetting): Promise<AdminSetting> {
    try {
      const [newSetting] = await db
        .insert(adminSettings)
        .values({ ...setting, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return newSetting;
    } catch (error) {
      console.error("Error creating admin setting:", error);
      throw error;
    }
  }

  async updateAdminSetting(settingKey: string, settingValue: any, updatedBy?: number): Promise<AdminSetting | undefined> {
    try {
      const [updatedSetting] = await db
        .update(adminSettings)
        .set({ settingValue, updatedBy, updatedAt: new Date() })
        .where(eq(adminSettings.settingKey, settingKey))
        .returning();
      
      if (updatedSetting) {
        return updatedSetting;
      }

      const [newSetting] = await db
        .insert(adminSettings)
        .values({
          settingKey,
          settingValue,
          updatedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newSetting;
    } catch (error) {
      console.error("Error updating admin setting:", error);
      return undefined;
    }
  }

  // Subscription operations
  async getSubscriptionByUserId(userId: number): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      return subscription;
    } catch (error) {
      console.error("Error fetching subscription by user ID:", error);
      return undefined;
    }
  }

  async getSubscriptionByPaystackCode(code: string): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.paystackSubscriptionCode, code));
      return subscription;
    } catch (error) {
      console.error("Error fetching subscription by Paystack code:", error);
      return undefined;
    }
  }

  async getSubscriptionByConsentToken(token: string): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.consentToken, token));
      return subscription;
    } catch (error) {
      console.error("Error fetching subscription by consent token:", error);
      return undefined;
    }
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    try {
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({ ...subscription, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return newSubscription;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    try {
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(subscriptions.id, id))
        .returning();
      return updatedSubscription;
    } catch (error) {
      console.error("Error updating subscription:", error);
      return undefined;
    }
  }

  async getAllActiveSubscriptions(): Promise<Subscription[]> {
    try {
      const activeSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          or(
            eq(subscriptions.status, 'active'),
            eq(subscriptions.status, 'trial')
          )
        );
      return activeSubscriptions;
    } catch (error) {
      console.error("Error fetching active subscriptions:", error);
      return [];
    }
  }

  async getExpiredSubscriptions(): Promise<Subscription[]> {
    try {
      const now = new Date();
      const expiredSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            or(
              eq(subscriptions.status, 'trial'),
              eq(subscriptions.status, 'active')
            ),
            or(
              and(
                eq(subscriptions.status, 'trial'),
                lt(subscriptions.trialEndDate, now)
              ),
              and(
                eq(subscriptions.status, 'active'),
                lt(subscriptions.currentPeriodEnd, now)
              )
            )
          )
        );
      return expiredSubscriptions;
    } catch (error) {
      console.error("Error fetching expired subscriptions:", error);
      return [];
    }
  }

  // Baseline Assessment Methods
  async createBaselineAssessment(data: InsertBaselineAssessment): Promise<BaselineAssessment> {
    const [assessment] = await db
      .insert(baselineAssessments)
      .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
      .returning();
    return assessment;
  }

  async getBaselineAssessment(id: number): Promise<BaselineAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(baselineAssessments)
      .where(eq(baselineAssessments.id, id));
    return assessment;
  }

  async getBaselineAssessmentByStudentAndSubject(studentId: number, subject: string): Promise<BaselineAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(baselineAssessments)
      .where(and(
        eq(baselineAssessments.studentId, studentId),
        eq(baselineAssessments.subject, subject)
      ));
    return assessment;
  }

  async getBaselineAssessmentsByStudent(studentId: number): Promise<BaselineAssessment[]> {
    return await db
      .select()
      .from(baselineAssessments)
      .where(eq(baselineAssessments.studentId, studentId))
      .orderBy(desc(baselineAssessments.createdAt));
  }

  async updateBaselineAssessment(id: number, data: Partial<InsertBaselineAssessment>): Promise<BaselineAssessment | undefined> {
    const [updated] = await db
      .update(baselineAssessments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(baselineAssessments.id, id))
      .returning();
    return updated;
  }

  async deleteBaselineAssessment(id: number): Promise<void> {
    await db
      .delete(baselineAssessments)
      .where(eq(baselineAssessments.id, id));
  }

  async hasCompletedBaselineForSubject(studentId: number, subject: string): Promise<boolean> {
    const [assessment] = await db
      .select()
      .from(baselineAssessments)
      .where(and(
        eq(baselineAssessments.studentId, studentId),
        eq(baselineAssessments.subject, subject),
        eq(baselineAssessments.status, 'completed')
      ));
    return !!assessment;
  }

  async hasAnyBaselineAssessment(studentId: number): Promise<boolean> {
    const assessments = await db
      .select()
      .from(baselineAssessments)
      .where(eq(baselineAssessments.studentId, studentId));
    return assessments.length > 0;
  }

  async getBaselineExercises(baselineAssessmentId: number): Promise<Exercise[]> {
    return await db
      .select()
      .from(exercises)
      .where(and(
        eq(exercises.isBaseline, true),
        eq(exercises.baselineAssessmentId, baselineAssessmentId)
      ))
      .orderBy(asc(exercises.baselineTopicId));
  }

  async getTopicsForGradeAndSubject(grade: string, subject: string): Promise<Topic[]> {
    return await db
      .select()
      .from(topics)
      .where(and(
        eq(topics.grade, grade),
        eq(topics.subject, subject)
      ))
      .orderBy(asc(topics.id));
  }

  // Tutoring Session operations
  async getTutoringSession(id: number): Promise<TutoringSession | undefined> {
    const [session] = await db.select().from(tutoringSessions).where(eq(tutoringSessions.id, id));
    return session;
  }

  async getTutoringSessionsByStudent(studentId: number): Promise<TutoringSession[]> {
    return await db
      .select()
      .from(tutoringSessions)
      .where(eq(tutoringSessions.studentId, studentId))
      .orderBy(desc(tutoringSessions.scheduledStart));
  }

  async getTutoringSessionsByTutor(tutorId: number): Promise<TutoringSession[]> {
    return await db
      .select()
      .from(tutoringSessions)
      .where(eq(tutoringSessions.tutorId, tutorId))
      .orderBy(desc(tutoringSessions.scheduledStart));
  }

  async getPendingTutoringSessions(): Promise<TutoringSession[]> {
    return await db
      .select()
      .from(tutoringSessions)
      .where(eq(tutoringSessions.status, 'requested'))
      .orderBy(asc(tutoringSessions.scheduledStart));
  }

  async createTutoringSession(session: InsertTutoringSession): Promise<TutoringSession> {
    const [created] = await db.insert(tutoringSessions).values(session).returning();
    return created;
  }

  async updateTutoringSession(id: number, updates: Partial<InsertTutoringSession>): Promise<TutoringSession | undefined> {
    const [updated] = await db
      .update(tutoringSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tutoringSessions.id, id))
      .returning();
    return updated;
  }

  // Tutor Availability operations
  async getTutorAvailability(tutorId: number): Promise<TutorAvailability[]> {
    return await db
      .select()
      .from(tutorAvailability)
      .where(eq(tutorAvailability.tutorId, tutorId))
      .orderBy(asc(tutorAvailability.dayOfWeek));
  }

  async createTutorAvailability(availability: InsertTutorAvailability): Promise<TutorAvailability> {
    const [created] = await db.insert(tutorAvailability).values(availability).returning();
    return created;
  }

  async updateTutorAvailability(id: number, updates: Partial<InsertTutorAvailability>): Promise<TutorAvailability | undefined> {
    const [updated] = await db
      .update(tutorAvailability)
      .set(updates)
      .where(eq(tutorAvailability.id, id))
      .returning();
    return updated;
  }

  async deleteTutorAvailability(id: number): Promise<boolean> {
    const result = await db.delete(tutorAvailability).where(eq(tutorAvailability.id, id)).returning();
    return result.length > 0;
  }

  // Admin Stats operations
  async getAdminStats(): Promise<AdminStats | undefined> {
    const [stats] = await db.select().from(adminStats).limit(1);
    return stats;
  }

  async refreshAdminStats(): Promise<AdminStats> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsersResult] = await db.select({ count: drizzleCount() }).from(users);
    const [activeStudentsResult] = await db.select({ count: drizzleCount() }).from(users).where(and(eq(users.role, 'student'), eq(users.isActive, true)));
    const [totalTeachersResult] = await db.select({ count: drizzleCount() }).from(users).where(eq(users.role, 'teacher'));
    const [totalParentsResult] = await db.select({ count: drizzleCount() }).from(users).where(eq(users.role, 'parent'));
    const [totalTutorsResult] = await db.select({ count: drizzleCount() }).from(users).where(eq(users.role, 'tutor'));
    const [totalAdminsResult] = await db.select({ count: drizzleCount() }).from(users).where(eq(users.role, 'admin'));
    const [newThisWeekResult] = await db.select({ count: drizzleCount() }).from(users).where(gte(users.createdAt, oneWeekAgo));
    const [newThisMonthResult] = await db.select({ count: drizzleCount() }).from(users).where(gte(users.createdAt, oneMonthAgo));

    const statsData = {
      totalUsers: totalUsersResult.count,
      activeStudents: activeStudentsResult.count,
      totalTeachers: totalTeachersResult.count,
      totalParents: totalParentsResult.count,
      totalTutors: totalTutorsResult.count,
      totalAdmins: totalAdminsResult.count,
      newUsersThisWeek: newThisWeekResult.count,
      newUsersThisMonth: newThisMonthResult.count,
      lastUpdatedAt: now,
    };

    // Update existing stats row or insert if none exists
    const [existing] = await db.select().from(adminStats).limit(1);
    if (existing) {
      const [updated] = await db.update(adminStats).set(statsData).where(eq(adminStats.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(adminStats).values(statsData).returning();
      return created;
    }
  }

  async incrementAdminStatsByRole(role: string): Promise<void> {
    const [existing] = await db.select().from(adminStats).limit(1);
    if (!existing) return;

    const updates: Partial<AdminStats> = {
      totalUsers: existing.totalUsers + 1,
      newUsersThisWeek: existing.newUsersThisWeek + 1,
      newUsersThisMonth: existing.newUsersThisMonth + 1,
      lastUpdatedAt: new Date(),
    };

    if (role === 'student') updates.activeStudents = existing.activeStudents + 1;
    else if (role === 'teacher') updates.totalTeachers = existing.totalTeachers + 1;
    else if (role === 'parent') updates.totalParents = existing.totalParents + 1;
    else if (role === 'tutor') updates.totalTutors = existing.totalTutors + 1;
    else if (role === 'admin') updates.totalAdmins = existing.totalAdmins + 1;

    await db.update(adminStats).set(updates).where(eq(adminStats.id, existing.id));
  }
  
  async getPerformanceMetrics(): Promise<{
    dailyUserOnboarding: { date: string; count: number }[];
    dailySchoolOnboarding: { date: string; count: number }[];
    totalTeachers: number;
    totalStudents: number;
    studentsByProvince: { province: string; count: number }[];
    subscriptionsByStatus: { status: string; count: number }[];
    activeSubscriptions: number;
    trialSubscriptions: number;
    cancelledSubscriptions: number;
    failedSubscriptions: number;
    monthlyRevenue: number;
    dailySubscriptions: { date: string; count: number }[];
    dailyCancellations: { date: string; count: number }[];
  }> {
    // Get daily user onboarding for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyUsersRaw = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})::text`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);
    
    // Get daily school onboarding for last 30 days  
    const dailySchoolsRaw = await db
      .select({
        date: sql<string>`DATE(${schools.createdAt})::text`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(schools)
      .where(sql`${schools.createdAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${schools.createdAt})`)
      .orderBy(sql`DATE(${schools.createdAt})`);
    
    // Get total teachers
    const [teacherCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(eq(users.role, 'teacher'));
    
    // Get total students
    const [studentCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(eq(users.role, 'student'));
    
    // Get students by province (via school name matching)
    const studentsByProvinceRaw = await db
      .select({
        province: schools.province,
        count: sql<number>`COUNT(DISTINCT ${students.id})::int`
      })
      .from(students)
      .innerJoin(schools, eq(students.schoolName, schools.name))
      .where(sql`${schools.province} IS NOT NULL`)
      .groupBy(schools.province)
      .orderBy(sql`COUNT(DISTINCT ${students.id}) DESC`);
    
    // Subscription metrics
    const subscriptionsByStatusRaw = await db
      .select({
        status: subscriptions.status,
        count: sql<number>`COUNT(*)::int`
      })
      .from(subscriptions)
      .groupBy(subscriptions.status)
      .orderBy(sql`COUNT(*) DESC`);
    
    const activeCount = subscriptionsByStatusRaw.find(s => s.status === 'active')?.count ?? 0;
    const trialCount = subscriptionsByStatusRaw.find(s => s.status === 'trial')?.count ?? 0;
    const cancelledCount = subscriptionsByStatusRaw.find(s => s.status === 'cancelled')?.count ?? 0;
    const failedCount = subscriptionsByStatusRaw.find(s => s.status === 'failed')?.count ?? 0;
    
    // Monthly revenue (from active subscriptions this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${subscriptions.amount}), 0)::int` })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.status, 'active'),
        sql`${subscriptions.startDate} >= ${startOfMonth}`
      ));
    
    // Daily new subscriptions (last 30 days)
    const dailySubscriptionsRaw = await db
      .select({
        date: sql<string>`DATE(${subscriptions.startDate})::text`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(subscriptions)
      .where(sql`${subscriptions.startDate} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${subscriptions.startDate})`)
      .orderBy(sql`DATE(${subscriptions.startDate})`);
    
    // Daily cancellations (last 30 days)
    const dailyCancellationsRaw = await db
      .select({
        date: sql<string>`DATE(${subscriptions.cancelledAt})::text`,
        count: sql<number>`COUNT(*)::int`
      })
      .from(subscriptions)
      .where(sql`${subscriptions.cancelledAt} >= ${thirtyDaysAgo}`)
      .groupBy(sql`DATE(${subscriptions.cancelledAt})`)
      .orderBy(sql`DATE(${subscriptions.cancelledAt})`);
    
    return {
      dailyUserOnboarding: dailyUsersRaw.map(r => ({ date: r.date, count: r.count })),
      dailySchoolOnboarding: dailySchoolsRaw.map(r => ({ date: r.date, count: r.count })),
      totalTeachers: teacherCount?.count ?? 0,
      totalStudents: studentCount?.count ?? 0,
      studentsByProvince: studentsByProvinceRaw.map(r => ({ province: r.province, count: r.count })),
      subscriptionsByStatus: subscriptionsByStatusRaw.map(r => ({ status: r.status, count: r.count })),
      activeSubscriptions: activeCount,
      trialSubscriptions: trialCount,
      cancelledSubscriptions: cancelledCount,
      failedSubscriptions: failedCount,
      monthlyRevenue: revenueResult?.total ?? 0,
      dailySubscriptions: dailySubscriptionsRaw.map(r => ({ date: r.date, count: r.count })),
      dailyCancellations: dailyCancellationsRaw.map(r => ({ date: r.date, count: r.count }))
    };
  }
}

export const storage = new DatabaseStorage();
