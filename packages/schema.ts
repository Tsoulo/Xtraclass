import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index, date, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table to preserve existing session data
export const session = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  cellNumber: text("cell_number"),
  role: text("role").notNull(), // parent, teacher, student, tutor, admin
  points: integer("points").default(0),
  avatar: text("avatar"), // Student avatar selection
  emailPreferences: jsonb("email_preferences").$type<{
    welcomeEmails: boolean;
    progressUpdates: boolean;
    homeworkReminders: boolean;
    achievementNotifications: boolean;
    weeklyReports: boolean;
    marketingEmails: boolean;
  }>().default({
    welcomeEmails: true,
    progressUpdates: true,
    homeworkReminders: true,
    achievementNotifications: true,
    weeklyReports: true,
    marketingEmails: false
  }),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(false).notNull(), // Account activation status - inactive by default for parent consent flow
  emailVerified: boolean("email_verified").default(false).notNull(), // Email verification status
  emailVerificationToken: text("email_verification_token"), // Token for email verification
  passwordResetToken: text("password_reset_token"), // Token for password reset
  passwordResetExpires: timestamp("password_reset_expires"), // Expiration time for password reset token
  referralCode: text("referral_code").unique(), // Unique referral code for sharing
  referredBy: integer("referred_by"), // User ID who referred this user
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  idNumber: text("id_number"),
  grade: text("grade"),
  school: text("school"),
  points: integer("points").default(0),
  profilePhoto: text("profile_photo"),
  studentUserId: integer("student_user_id").references(() => users.id), // Link to existing student account
  gradeLevel: text("grade_level"), // Grade level from student record
  schoolName: text("school_name"), // School name from student record
  createdAt: timestamp("created_at").defaultNow(),
});

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  registrationNumber: text("registration_number"),
  subjectSpecialization: text("subject_specialization"),
  schoolAffiliation: text("school_affiliation"),
  schoolName: text("school_name"),
  yearsExperience: integer("years_experience"),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  studentId: text("student_id"),
  username: text("username"), // Public display name for leaderboards and public areas
  gradeLevel: text("grade_level"),
  schoolName: text("school_name"),
  parentContact: text("parent_contact"),
  subjects: jsonb("subjects").$type<string[]>().default([]),
  lastCalendarViewedAt: timestamp("last_calendar_viewed_at"), // Track when student last opened calendar for notification logic
});

export const tutors = pgTable("tutors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  certificationNumber: text("certification_number"),
  subjectExpertise: text("subject_expertise"),
  yearsExperience: integer("years_experience"),
  availability: text("availability"),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  grade: text("grade").notNull(), // 8, 9, 10, 11, 12
  subject: text("subject").notNull(), // mathematics, mathematical-literacy, physical-science
  createdAt: timestamp("created_at").defaultNow(),
});

export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const syllabusCalendar = pgTable("syllabus_calendar", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  grade: text("grade").notNull(),
  subject: text("subject").notNull(),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  themeId: integer("theme_id").notNull().references(() => themes.id, { onDelete: "cascade" }),
  lessonTitle: text("lesson_title").notNull(),
  description: text("description"),
  videoLink: text("video_link"),
  videoTranscript: text("video_transcript"), // Stored YouTube transcript for offline/prod access
  duration: integer("duration").default(60), // in minutes
  objectives: text("objectives").array(),
  activities: jsonb("activities"), // JSON array of activity objects
  skills: text("skills").array(), // Array of skill identifiers, e.g. ["calculate_gross_income"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  province: text("province").notNull(),
  district: text("district"),
  address: text("address"),
  contactNumber: text("contact_number"),
  email: text("email"),
  principalName: text("principal_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // school, ngo, company
  contactPerson: text("contact_person").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  logoUrl: text("logo_url"), // organization logo/image
  subscriptionTier: text("subscription_tier").default("basic"), // basic, premium, enterprise
  subscriptionStart: timestamp("subscription_start"),
  subscriptionEnd: timestamp("subscription_end"),
  seatLimit: integer("seat_limit").default(100),
  isSeatUnlimited: boolean("is_seat_unlimited").default(false),
  currentSponsoredCount: integer("current_sponsored_count").default(0),
  accessModel: text("access_model").default("school"), // school, invited, open
  status: text("status").default("inactive"), // inactive, active, suspended, archived
  isActive: boolean("is_active").default(false), // deprecated, use status instead
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Junction table: Organizations linked to schools (for school-based access model)
export const organizationSchools = pgTable("organization_schools", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  allocatedSeats: integer("allocated_seats").default(0),
  usedSeats: integer("used_seats").default(0),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  uniqueOrgSchool: uniqueIndex("unique_org_school").on(table.organizationId, table.schoolId),
}));

// Junction table: Student invitations from organizations (for invited access model)
export const organizationStudentInvites = pgTable("organization_student_invites", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studentEmail: text("student_email").notNull(),
  studentId: integer("student_id").references(() => students.id),
  inviteStatus: text("invite_status").default("pending"), // pending, accepted, expired
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at")
});

// Access codes for organizations (for open access model)
export const organizationAccessCodes = pgTable("organization_access_codes", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  maxUses: integer("max_uses"), // null = unlimited
  currentUses: integer("current_uses").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Junction table: Organization subscriptions (allows multiple subscription plans per organization)
export const organizationSubscriptions = pgTable("organization_subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull(),
  planName: text("plan_name").notNull(), // Cached from subscription_plans
  quantity: integer("quantity").default(1), // Number of seats/licenses for this plan
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// Junction table: Student memberships through organizations (tracks students who got access via school/invite/code)
export const organizationStudentMemberships = pgTable("organization_student_memberships", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  organizationSchoolId: integer("organization_school_id").references(() => organizationSchools.id, { onDelete: "set null" }), // Link to school allocation if school-based
  accessMethod: text("access_method").notNull(), // 'school', 'invite', 'code'
  isActive: boolean("is_active").default(true),
  grantedAt: timestamp("granted_at").defaultNow()
}, (table) => ({
  uniqueMembership: uniqueIndex("unique_org_student_membership").on(table.organizationId, table.studentId),
}));

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  grade: text("grade").notNull(),
  subject: text("subject").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => teachers.id, { onDelete: "cascade" }),
  classCode: text("class_code").unique().notNull(), // unique code for students to join
  maxStudents: integer("max_students").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const classStudents = pgTable("class_students", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
}, (table) => ({
  uniqueEnrollment: uniqueIndex("unique_class_student").on(table.classId, table.studentId),
}));

export const pastPapers = pgTable("past_papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subject: text("subject").notNull(), // mathematics, mathematical-literacy, physical-science
  grade: text("grade").notNull(), // 8, 9, 10, 11, 12
  year: integer("year").notNull(),
  paperType: text("paper_type").notNull(), // exam, test, assignment
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  extractionStatus: text("extraction_status").default("pending"), // pending, processing, completed, failed
  extractedQuestionsCount: integer("extracted_questions_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pastPaperQuestions = pgTable("past_paper_questions", {
  id: serial("id").primaryKey(),
  pastPaperId: integer("past_paper_id").references(() => pastPapers.id, { onDelete: "cascade" }).notNull(),
  questionNumber: integer("question_number").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // multiple-choice, short-answer, calculation, essay, structured
  answer: text("answer"), // Model answer (if available from memo)
  options: jsonb("options").$type<string[]>(), // For multiple choice questions
  marks: integer("marks").default(1),
  subQuestionOf: integer("sub_question_of"), // Parent question number for sub-questions (e.g., 1.1 is sub of 1)
  section: text("section"), // Section label (e.g., A, B, C)
  topic: text("topic"), // Detected topic
  difficulty: text("difficulty").default("medium"), // easy, medium, hard
  imageUrl: text("image_url"), // URL to primary question image (for diagrams, figures, etc.)
  additionalImageUrls: text("additional_image_urls").array(), // Additional images for questions spanning multiple pages
  createdAt: timestamp("created_at").defaultNow(),
});

export const pastPaperSubmissions = pgTable("past_paper_submissions", {
  id: serial("id").primaryKey(),
  pastPaperId: integer("past_paper_id").references(() => pastPapers.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  answers: jsonb("answers").$type<Array<{
    questionId: number;
    answer: string;
    imageUrl?: string;
  }>>().default([]),
  isCompleted: boolean("is_completed").default(false),
  score: integer("score"),
  totalMarks: integer("total_marks"),
  feedback: jsonb("feedback").$type<{
    overallFeedback: string;
    strengths: string[];
    areasForImprovement: string[];
    questionAnalysis: Array<{
      questionId: number;
      isCorrect: boolean;
      pointsEarned: number;
      maxPoints: number;
      studentAnswer: string;
      correctAnswer: string;
      feedback: string;
    }>;
  }>(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertPastPaperSubmissionSchema = createInsertSchema(pastPaperSubmissions).omit({ id: true });
export type InsertPastPaperSubmission = z.infer<typeof insertPastPaperSubmissionSchema>;
export type PastPaperSubmission = typeof pastPaperSubmissions.$inferSelect;

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  grade: text("grade").notNull(), // 8, 9, 10, 11, 12
  subject: text("subject").notNull(), // mathematics, mathematical-literacy, physical-science  
  title: text("title").notNull(),
  description: text("description"),
  difficulty: text("difficulty").default("medium"), // easy, medium, hard
  term: text("term"), // Term number (e.g., "1", "2", "3", "4")
  week: text("week"), // Week number (e.g., "1", "2", etc.)
  // Tutorial exercise specific fields
  isTutorial: boolean("is_tutorial").default(false), // Whether this is a tutorial exercise
  hasInitialTutorial: boolean("has_initial_tutorial").default(false), // Whether exercise requires tutorial first
  generatedFor: integer("generated_for").references(() => students.id), // Student this was generated for
  basedOnHomework: integer("based_on_homework").references(() => homework.id), // Homework that triggered generation
  weaknessAreas: jsonb("weakness_areas").$type<string[]>().default([]), // Areas the student struggled with
  tutorialContent: text("tutorial_content"), // Explanation/tutorial content
  // Baseline assessment specific fields
  isBaseline: boolean("is_baseline").default(false), // Whether this is a baseline assessment exercise
  baselineAssessmentId: integer("baseline_assessment_id"), // Reference to baseline assessment (will be added after table creation)
  baselineTopicId: integer("baseline_topic_id"), // Topic being assessed in baseline
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const exerciseQuestions = pgTable("exercise_questions", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").references(() => exercises.id, { onDelete: "cascade" }).notNull(),
  questionNumber: integer("question_number").notNull(), // Sequential number (1, 2, 3, etc.)
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  themeId: integer("theme_id").references(() => themes.id).notNull(),
  question: text("question"), // Question content (optional if image is provided)
  answer: text("answer").notNull(), // Question answer
  imageUrl: text("image_url"), // Optional image URL for the question
  marks: integer("marks").default(5), // Points/marks for this question
  attachments: jsonb("attachments").$type<string[]>().default([]), // file URLs/paths for this question
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueQuestionNumber: uniqueIndex("unique_exercise_question_number").on(table.exerciseId, table.questionNumber),
}));

export const schoolHolidays = pgTable("school_holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Holiday name (e.g., "Term 1 Break", "Christmas Holidays")
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  year: integer("year").notNull(), // Academic year
  type: text("type").default("holiday"), // holiday, term_break, public_holiday
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const homework = pgTable("homework", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").$type<Array<{
    id: string;
    question: string;
    points: number;
    correctAnswer: string; // Added correct answer field
    answerType?: string; // 'exact', 'numeric', 'algebraic', 'multiple-choice'
    acceptableVariations?: string[]; // Alternative acceptable answers
  }>>().default([]),
  topicId: integer("topic_id").references(() => topics.id),
  themeId: integer("theme_id").references(() => themes.id),
  dueDate: timestamp("due_date").notNull(),
  published: boolean("published").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  duration: integer("duration").default(30), // duration in minutes
  questions: jsonb("questions").$type<Array<{
    id: string;
    question: string;
    points: number;
    correctAnswer: string; // Added correct answer field
    answerType?: string; // 'exact', 'numeric', 'algebraic', 'multiple-choice'
    acceptableVariations?: string[]; // Alternative acceptable answers
  }>>().default([]),
  scheduledDate: timestamp("scheduled_date").notNull(),
  published: boolean("published").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const homeworkSubmissions = pgTable("homework_submissions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").references(() => homework.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  answers: jsonb("answers").$type<Array<{
    questionId: string;
    answer: string;
    imageUrl?: string;
  }>>().default([]),
  isCompleted: boolean("is_completed").default(false),
  score: integer("score"), // Total score achieved
  totalMarks: integer("total_marks"), // Total possible marks
  feedback: jsonb("feedback").$type<{
    strengths: string[];
    improvements: string[];
    questionAnalysis: Array<{
      questionId: string;
      isCorrect: boolean;
      points: number;
      maxPoints: number;
      feedback: string;
    }>;
  }>(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  uniqueSubmission: uniqueIndex("unique_homework_student").on(table.homeworkId, table.studentId),
}));

export const exerciseSubmissions = pgTable("exercise_submissions", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").references(() => exercises.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  answers: jsonb("answers").$type<Array<{
    questionId: string;
    answer: string;
    imageUrl?: string;
  }>>().default([]),
  isCompleted: boolean("is_completed").default(false),
  score: integer("score"), // Total score achieved
  totalMarks: integer("total_marks"), // Total possible marks
  feedback: jsonb("feedback").$type<{
    strengths: string[];
    improvements: string[];
    questionAnalysis: Array<{
      questionId: string;
      isCorrect: boolean;
      points: number;
      maxPoints: number;
      feedback: string;
    }>;
  }>(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  uniqueExerciseSubmission: uniqueIndex("unique_exercise_student").on(table.exerciseId, table.studentId),
}));

// Student analytics table to store strengths and weaknesses
export const studentAnalytics = pgTable("student_analytics", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  homeworkId: integer("homework_id").references(() => homework.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").references(() => exercises.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  strengths: jsonb("strengths").$type<string[]>().default([]),
  weaknesses: jsonb("weaknesses").$type<string[]>().default([]),
  score: integer("score"),
  totalMarks: integer("total_marks"),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Topic-specific AI feedback table to store latest feedback for each student-topic combination
export const topicFeedback = pgTable("topic_feedback", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  topicId: integer("topic_id").references(() => topics.id, { onDelete: "cascade" }).notNull(),
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  strengths: jsonb("strengths").$type<string[]>().default([]),
  improvements: jsonb("improvements").$type<string[]>().default([]),
  lastScore: integer("last_score"),
  lastTotalMarks: integer("last_total_marks"),
  lastPercentage: integer("last_percentage"),
  sourceType: text("source_type").notNull(), // 'homework' or 'exercise'
  sourceId: integer("source_id").notNull(), // ID of homework or exercise that generated this feedback
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueStudentTopic: uniqueIndex("unique_student_topic_feedback").on(table.studentId, table.topicId),
}));

// Daily exercise generation tracking table to enforce daily limits
export const dailyExerciseGenerations = pgTable("daily_exercise_generations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  generationDate: date("generation_date").notNull(),
  count: integer("count").default(1).notNull(),
  lastGeneratedAt: timestamp("last_generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueStudentDate: uniqueIndex("unique_student_date_generation").on(table.studentId, table.generationDate),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
  points: true,
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({
  id: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
});

export const insertTutorSchema = createInsertSchema(tutors).omit({
  id: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

export const insertThemeSchema = createInsertSchema(themes).omit({
  id: true,
  createdAt: true,
});

export const insertSyllabusCalendarSchema = createInsertSchema(syllabusCalendar).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPastPaperSchema = createInsertSchema(pastPapers).omit({
  id: true,
  createdAt: true,
});

export const insertPastPaperQuestionSchema = createInsertSchema(pastPaperQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExerciseQuestionSchema = createInsertSchema(exerciseQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PastPaper = typeof pastPapers.$inferSelect;
export type InsertPastPaper = z.infer<typeof insertPastPaperSchema>;
export type PastPaperQuestion = typeof pastPaperQuestions.$inferSelect;
export type InsertPastPaperQuestion = z.infer<typeof insertPastPaperQuestionSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type SelectExercise = typeof exercises.$inferSelect;
export type ExerciseQuestion = typeof exerciseQuestions.$inferSelect;
export type InsertExerciseQuestion = z.infer<typeof insertExerciseQuestionSchema>;
export type SelectExerciseQuestion = typeof exerciseQuestions.$inferSelect;

export const insertSchoolHolidaySchema = createInsertSchema(schoolHolidays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHomeworkSchema = createInsertSchema(homework).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
});

export const insertHomeworkSubmissionSchema = createInsertSchema(homeworkSubmissions).omit({
  id: true,
  submittedAt: true,
  completedAt: true,
});

export const insertExerciseSubmissionSchema = createInsertSchema(exerciseSubmissions).omit({
  id: true,
  submittedAt: true,
  completedAt: true,
});

export type InsertSchoolHoliday = z.infer<typeof insertSchoolHolidaySchema>;
export type SelectSchoolHoliday = typeof schoolHolidays.$inferSelect;
export type Homework = typeof homework.$inferSelect;
export type InsertHomework = z.infer<typeof insertHomeworkSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type HomeworkSubmission = typeof homeworkSubmissions.$inferSelect;
export type InsertHomeworkSubmission = z.infer<typeof insertHomeworkSubmissionSchema>;
export type ExerciseSubmission = typeof exerciseSubmissions.$inferSelect;
export type InsertExerciseSubmission = z.infer<typeof insertExerciseSubmissionSchema>;

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClassStudentSchema = createInsertSchema(classStudents).omit({
  id: true,
  enrolledAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentSponsoredCount: true,
});

export const insertOrganizationSchoolSchema = createInsertSchema(organizationSchools).omit({
  id: true,
  createdAt: true,
  usedSeats: true,
});

export const insertOrganizationStudentInviteSchema = createInsertSchema(organizationStudentInvites).omit({
  id: true,
  invitedAt: true,
  acceptedAt: true,
});

export const insertOrganizationAccessCodeSchema = createInsertSchema(organizationAccessCodes).omit({
  id: true,
  createdAt: true,
  currentUses: true,
});

export const insertOrganizationSubscriptionSchema = createInsertSchema(organizationSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationStudentMembershipSchema = createInsertSchema(organizationStudentMemberships).omit({
  id: true,
  grantedAt: true,
});

export type User = typeof users.$inferSelect;

// Video lesson comments table
export const videoComments = pgTable("video_comments", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  studentId: integer("student_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoCommentsRelations = relations(videoComments, ({ one }) => ({
  student: one(users, {
    fields: [videoComments.studentId],
    references: [users.id],
  }),
}));

// Video lesson likes/dislikes table
export const videoLikes = pgTable("video_likes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull(),
  studentId: integer("student_id").notNull().references(() => users.id),
  isLike: boolean("is_like").notNull(), // true for like, false for dislike
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoLikesRelations = relations(videoLikes, ({ one }) => ({
  student: one(users, {
    fields: [videoLikes.studentId],
    references: [users.id],
  }),
}));

export type VideoComment = typeof videoComments.$inferSelect;
export type InsertVideoComment = typeof videoComments.$inferInsert;
export type VideoLike = typeof videoLikes.$inferSelect;
export type InsertVideoLike = typeof videoLikes.$inferInsert;
export type Child = typeof children.$inferSelect;
export type Teacher = typeof teachers.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Tutor = typeof tutors.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type SyllabusCalendar = typeof syllabusCalendar.$inferSelect;
export type School = typeof schools.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassStudent = typeof classStudents.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertTutor = z.infer<typeof insertTutorSchema>;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type InsertTheme = z.infer<typeof insertThemeSchema>;
export type InsertSyllabusCalendar = z.infer<typeof insertSyllabusCalendarSchema>;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertOrganizationSchool = z.infer<typeof insertOrganizationSchoolSchema>;
export type InsertOrganizationStudentInvite = z.infer<typeof insertOrganizationStudentInviteSchema>;
export type InsertOrganizationAccessCode = z.infer<typeof insertOrganizationAccessCodeSchema>;
export type InsertOrganizationSubscription = z.infer<typeof insertOrganizationSubscriptionSchema>;
export type OrganizationSchool = typeof organizationSchools.$inferSelect;
export type OrganizationStudentInvite = typeof organizationStudentInvites.$inferSelect;
export type OrganizationAccessCode = typeof organizationAccessCodes.$inferSelect;
export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type OrganizationStudentMembership = typeof organizationStudentMemberships.$inferSelect;
export type InsertOrganizationStudentMembership = z.infer<typeof insertOrganizationStudentMembershipSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertClassStudent = z.infer<typeof insertClassStudentSchema>;

// Global subject context table for collecting daily AI feedback per subject
export const subjectGlobalContext = pgTable("subject_global_context", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  subject: text("subject").notNull(), // mathematics, physical-science, etc.
  grade: text("grade").notNull(),
  contextDate: date("context_date").notNull(), // Date for this context snapshot
  overallFeedback: jsonb("overall_feedback").$type<{
    strengths: string[];
    improvements: string[];
    keyInsights: string[];
    performanceTrend: 'improving' | 'stable' | 'declining';
    focusAreas: string[];
    recommendations: string[];
  }>(),
  sourceActivities: jsonb("source_activities").$type<Array<{
    type: 'homework' | 'exercise' | 'quiz';
    id: number;
    title: string;
    score: number;
    totalMarks: number;
    percentage: number;
    completedAt: string;
  }>>().default([]),
  totalActivities: integer("total_activities").default(0),
  averageScore: integer("average_score"),
  averagePercentage: integer("average_percentage"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueStudentSubjectDate: uniqueIndex("unique_student_subject_date").on(table.studentId, table.subject, table.contextDate),
}));

export const insertTopicFeedbackSchema = createInsertSchema(topicFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubjectGlobalContextSchema = createInsertSchema(subjectGlobalContext).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TopicFeedback = typeof topicFeedback.$inferSelect;
export type InsertTopicFeedback = z.infer<typeof insertTopicFeedbackSchema>;
export type SubjectGlobalContext = typeof subjectGlobalContext.$inferSelect;
export type InsertSubjectGlobalContext = z.infer<typeof insertSubjectGlobalContextSchema>;
export type StudentAnalytics = typeof studentAnalytics.$inferSelect;

// Chat conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  subject: text("subject"),
  studentContext: text("student_context"), // e.g., "David Chen - Grade 9"
  studentId: integer("student_id").references(() => students.id), // Student being discussed
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat participants table (many-to-many relationship)
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  uniqueParticipant: uniqueIndex("unique_conversation_participant").on(table.conversationId, table.userId),
}));

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  isRead: boolean("is_read").default(false),
  readBy: jsonb("read_by").$type<number[]>().default([]), // Array of user IDs who have read this message
  sentAt: timestamp("sent_at").defaultNow(),
});

// Insert schemas for chat tables
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  sentAt: true,
});

// Notifications table to track viewed calendar items and homework
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // 'lesson', 'homework', 'assignment', 'announcement'
  itemId: integer("item_id").notNull(), // ID of the lesson, homework, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  itemDate: date("item_date").notNull(), // Date of the lesson/homework/event
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
}, (table) => ({
  uniqueUserItem: uniqueIndex("unique_user_notification").on(table.userId, table.type, table.itemId),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// Types for chat system
export type Conversation = typeof conversations.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Question reports table for students to report issues with questions or marking
export const questionReports = pgTable("question_reports", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  // Reference to homework OR exercise (one will be null, other will have value)
  homeworkId: integer("homework_id").references(() => homework.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").references(() => exercises.id, { onDelete: "cascade" }),
  // Question identifiers
  questionId: text("question_id").notNull(), // ID of the specific question
  questionNumber: integer("question_number"), // Question number in the homework/exercise
  topicId: integer("topic_id").references(() => topics.id),
  themeId: integer("theme_id").references(() => themes.id),
  // Report details
  reportType: text("report_type").notNull(), // 'incorrect_marking', 'question_error', 'unclear_question', 'technical_issue', 'other'
  title: text("title").notNull(), // Brief title of the issue
  comments: text("comments").notNull(), // Student's detailed comments about the issue
  studentAnswer: text("student_answer"), // The student's original answer
  expectedScore: integer("expected_score"), // Score student believes they should have received
  actualScore: integer("actual_score"), // Score actually received
  // Status tracking
  status: text("status").default("open"), // 'open', 'under_review', 'resolved', 'rejected'
  reviewedBy: integer("reviewed_by").references(() => users.id), // Teacher/admin who reviewed
  reviewNotes: text("review_notes"), // Admin/teacher notes on resolution
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuestionReportSchema = createInsertSchema(questionReports).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

// AI Prompts table for managing all AI prompts used throughout the system (with versioning)
export const aiPrompts = pgTable("ai_prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Display name for the prompt
  category: text("category").notNull(), // 'grading', 'feedback', 'question_generation', 'tutorial', 'general'
  description: text("description").notNull(), // What this prompt does
  promptText: text("prompt_text").notNull(), // The actual AI prompt template
  variables: jsonb("variables").$type<string[]>().default([]), // Array of variable placeholders like {{question}}, {{answer}}
  exampleUsage: text("example_usage"), // Example of how to use this prompt
  isActive: boolean("is_active").default(true), // Whether this prompt is currently in use
  isPublished: boolean("is_published").default(false), // Whether this prompt has been published to code
  // Versioning fields
  version: text("version").notNull().default("1.0.0"), // Semantic version (1.0.0, 1.1.0, 2.0.0)
  parentId: integer("parent_id").references((): any => aiPrompts.id), // Points to the original prompt this is a version of
  status: text("status").notNull().default("draft"), // 'draft', 'tested', 'awaiting_dev', 'implemented', 'published', 'deprecated'
  variablesSchema: jsonb("variables_schema").$type<{[key: string]: {type: string, description: string, required: boolean}}>(), // Formal schema for variables
  schemaHash: text("schema_hash"), // Hash of the variables schema for verification
  testCases: jsonb("test_cases").$type<{variables: Record<string, string>, expectedShape?: string}[]>().default([]), // Test cases for validation
  implementedAt: timestamp("implemented_at"), // When developer marked as implemented
  publishedAt: timestamp("published_at"), // When promoted to published status
  isCurrentVersion: boolean("is_current_version").default(false), // Only one version per prompt should be current/active
  createdBy: integer("created_by").references(() => users.id), // Admin who created this prompt
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiPromptSchema = createInsertSchema(aiPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for notifications system  
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Types for question reports system
export type QuestionReport = typeof questionReports.$inferSelect;
export type InsertQuestionReport = z.infer<typeof insertQuestionReportSchema>;

// MCP Prompts table - mirrors production MCP server templates (read-only from UI perspective)
export const mcpPrompts = pgTable("mcp_prompts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Matches MCP server prompt key (e.g., 'homework_grading_assistant')
  name: text("name").notNull(), // Display name from MCP
  category: text("category").notNull(), // Category from MCP ('grading', 'feedback', etc.)
  version: text("version").notNull(), // Version from MCP server
  promptText: text("prompt_text").notNull(), // Actual template from MCP server
  variables: jsonb("variables").$type<string[]>().default([]), // Variables array from MCP
  schemaHash: text("schema_hash").notNull(), // Hash for change detection
  lastSyncedAt: timestamp("last_synced_at").defaultNow(), // When this was last synced from MCP
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt Revisions table - tracks all changes and development history
export const promptRevisions = pgTable("prompt_revisions", {
  id: serial("id").primaryKey(),
  aiPromptId: integer("ai_prompt_id").references(() => aiPrompts.id, { onDelete: "cascade" }),
  mcpPromptKey: text("mcp_prompt_key").notNull(), // Links to MCP prompt key
  changeType: text("change_type").notNull(), // 'creation', 'update', 'promotion', 'rollback'
  previousText: text("previous_text"), // Previous prompt text (for rollbacks)
  newText: text("new_text").notNull(), // New prompt text
  previousVariables: jsonb("previous_variables").$type<string[]>().default([]),
  newVariables: jsonb("new_variables").$type<string[]>().default([]),
  changeReason: text("change_reason"), // Why this change was made
  changeDescription: text("change_description"), // Detailed description of changes
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prompt Sync Audit table - tracks sync operations and state transitions  
export const promptSyncAudit = pgTable("prompt_sync_audit", {
  id: serial("id").primaryKey(),
  aiPromptId: integer("ai_prompt_id").references(() => aiPrompts.id, { onDelete: "cascade" }),
  mcpPromptKey: text("mcp_prompt_key").notNull(),
  syncType: text("sync_type").notNull(), // 'load_check', 'promotion', 'rollback', 'status_reset'
  fromStatus: text("from_status"), // Previous status
  toStatus: text("to_status"), // New status after sync
  syncResult: text("sync_result").notNull(), // 'in_sync', 'awaiting_dev', 'mcp_ahead', 'status_reset', 'promotion_completed'
  detectedDifferences: jsonb("detected_differences").$type<{
    textDiff: boolean;
    variablesDiff: boolean;
    hashDiff: boolean;
    statusMismatch: boolean;
  }>().default({ textDiff: false, variablesDiff: false, hashDiff: false, statusMismatch: false }),
  actionTaken: text("action_taken"), // What action was automatically taken
  triggeredBy: integer("triggered_by").references(() => users.id), // User who triggered this sync check
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin Settings table - System-wide configuration
export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: jsonb("setting_value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription Plans table - Define different pricing tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Basic", "Premium", "Enterprise"
  description: text("description"),
  paystackPlanCode: text("paystack_plan_code").notNull().unique(),
  amount: integer("amount").notNull(), // in kobo
  currency: text("currency").default("NGN"),
  interval: text("interval").notNull(), // monthly, yearly, weekly
  features: jsonb("features").$type<{
    maxStudents?: number;
    maxClasses?: number;
    aiChatAccess?: boolean;
    aiVoiceTutor?: boolean;
    advancedAnalytics?: boolean;
    prioritySupport?: boolean;
    customBranding?: boolean;
    apiAccess?: boolean;
    [key: string]: any; // Extensible for future features
  }>().default({}),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0), // For display ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscriptions table - User subscription management
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  paystackCustomerCode: text("paystack_customer_code"),
  paystackSubscriptionCode: text("paystack_subscription_code"),
  paystackPlanCode: text("paystack_plan_code"),
  status: text("status").notNull().default("trial"), // trial, active, cancelled, expired, failed, pending_parent_consent
  amount: integer("amount").default(0), // in kobo (Paystack uses smallest currency unit)
  currency: text("currency").default("NGN"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  nextPaymentDate: timestamp("next_payment_date"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  // Parent consent fields
  parentName: text("parent_name"),
  parentEmail: text("parent_email"),
  parentPhone: text("parent_phone"),
  parentRelationship: text("parent_relationship"), // mother, father, guardian, other
  consentToken: text("consent_token").unique(), // Unique token for consent link
  consentGivenAt: timestamp("consent_given_at"), // When parent gave consent
  metadata: jsonb("metadata").$type<{
    authorizationCode?: string;
    cardLast4?: string;
    cardBrand?: string;
    emailToken?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertMcpPromptSchema = createInsertSchema(mcpPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptRevisionSchema = createInsertSchema(promptRevisions).omit({
  id: true,
  createdAt: true,
});

export const insertPromptSyncAuditSchema = createInsertSchema(promptSyncAudit).omit({
  id: true,
  createdAt: true,
});

// Types for AI prompts system
export type AiPrompt = typeof aiPrompts.$inferSelect;
export type InsertAiPrompt = z.infer<typeof insertAiPromptSchema>;

export type McpPrompt = typeof mcpPrompts.$inferSelect;
export type InsertMcpPrompt = z.infer<typeof insertMcpPromptSchema>;

export type PromptRevision = typeof promptRevisions.$inferSelect;
export type InsertPromptRevision = z.infer<typeof insertPromptRevisionSchema>;

export type PromptSyncAudit = typeof promptSyncAudit.$inferSelect;
export type InsertPromptSyncAudit = z.infer<typeof insertPromptSyncAuditSchema>;

// Admin Settings schemas
export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;

// Subscription Plan schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

// Subscription schemas
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// Baseline Assessments table - tracks student's initial skill assessment
export const baselineAssessments = pgTable("baseline_assessments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  grade: text("grade").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  totalTopics: integer("total_topics").default(0),
  completedTopics: integer("completed_topics").default(0),
  overallScore: integer("overall_score"), // Overall percentage score
  topicScores: jsonb("topic_scores").$type<Array<{
    topicId: number;
    topicName: string;
    exerciseId: number;
    score: number;
    totalMarks: number;
    percentage: number;
    level: 'beginner' | 'intermediate' | 'advanced';
  }>>().default([]),
  recommendations: jsonb("recommendations").$type<{
    strengths: string[];
    weakAreas: string[];
    suggestedFocus: string[];
    overallLevel: 'beginner' | 'intermediate' | 'advanced';
  }>(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueStudentSubject: uniqueIndex("unique_baseline_student_subject").on(table.studentId, table.subject),
}));

// Insert schema for baseline assessments
export const insertBaselineAssessmentSchema = createInsertSchema(baselineAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BaselineAssessment = typeof baselineAssessments.$inferSelect;
export type InsertBaselineAssessment = z.infer<typeof insertBaselineAssessmentSchema>;

// Tutoring Sessions table - For scheduling video calls between students and tutors
export const tutoringSessions = pgTable("tutoring_sessions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tutorId: integer("tutor_id").references(() => users.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  topic: text("topic"), // Specific topic the student needs help with
  notes: text("notes"), // Additional notes from student
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  status: text("status").notNull().default("requested"), // requested, accepted, declined, cancelled, in_progress, completed, no_show
  roomId: text("room_id"), // Unique room ID for video call
  callStartedAt: timestamp("call_started_at"),
  callEndedAt: timestamp("call_ended_at"),
  callDuration: integer("call_duration"), // in minutes
  studentJoinedAt: timestamp("student_joined_at"),
  tutorJoinedAt: timestamp("tutor_joined_at"),
  rating: integer("rating"), // 1-5 rating from student
  feedback: text("feedback"), // Feedback from student
  tutorNotes: text("tutor_notes"), // Notes from tutor after session
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tutor Availability - For tutors to set their available times
export const tutorAvailability = pgTable("tutor_availability", {
  id: serial("id").primaryKey(),
  tutorId: integer("tutor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  subjects: text("subjects").array(), // Subjects tutor can help with
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertTutoringSessionSchema = createInsertSchema(tutoringSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTutorAvailabilitySchema = createInsertSchema(tutorAvailability).omit({
  id: true,
  createdAt: true,
});

export type TutoringSession = typeof tutoringSessions.$inferSelect;
export type InsertTutoringSession = z.infer<typeof insertTutoringSessionSchema>;
export type TutorAvailability = typeof tutorAvailability.$inferSelect;
export type InsertTutorAvailability = z.infer<typeof insertTutorAvailabilitySchema>;

// Admin Statistics - Pre-calculated totals for dashboard performance
export const adminStats = pgTable("admin_stats", {
  id: serial("id").primaryKey(),
  totalUsers: integer("total_users").default(0).notNull(),
  activeStudents: integer("active_students").default(0).notNull(),
  totalTeachers: integer("total_teachers").default(0).notNull(),
  totalParents: integer("total_parents").default(0).notNull(),
  totalTutors: integer("total_tutors").default(0).notNull(),
  totalAdmins: integer("total_admins").default(0).notNull(),
  newUsersThisWeek: integer("new_users_this_week").default(0).notNull(),
  newUsersThisMonth: integer("new_users_this_month").default(0).notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
});

export const insertAdminStatsSchema = createInsertSchema(adminStats).omit({
  id: true,
  lastUpdatedAt: true,
});

export type AdminStats = typeof adminStats.$inferSelect;
export type InsertAdminStats = z.infer<typeof insertAdminStatsSchema>;
