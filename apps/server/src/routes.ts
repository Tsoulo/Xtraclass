import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { spawn } from "child_process";
import { createRequire } from "module";
import { storage } from "./storage";
import { getStorage } from "./file-storage";
import { insertUserSchema, insertChildSchema, insertTeacherSchema, insertStudentSchema, insertTutorSchema, insertTopicSchema, insertThemeSchema, insertSyllabusCalendarSchema, insertSchoolSchema, insertOrganizationSchema, insertClassSchema, insertPastPaperSchema, insertExerciseSchema, insertExerciseQuestionSchema, insertHomeworkSchema, insertQuizSchema, insertHomeworkSubmissionSchema, insertExerciseSubmissionSchema, insertAiPromptSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateToken, authenticateToken, optionalAuth, type AuthRequest } from "./auth";
import { checkSubscriptionAccess } from "./subscription-middleware";
// ✅ Enhanced MCP AI grading only - old local grading removed
import { gradeHomeworkSubmission } from "./grading.js";
import { db, pool } from "./db";
import { users, students, teachers, subscriptionPlans, subscriptions, exercises, exerciseSubmissions, homeworkSubmissions, homework, syllabusCalendar, children, classes, classStudents, topics, themes, dailyExerciseGenerations, topicFeedback, videoComments, videoLikes, notifications, type VideoComment, type InsertVideoComment, type VideoLike, type InsertVideoLike } from "@shared/schema";
import { mcpClientService, type EducationalContext, type GeneratedExercise } from "./mcp-client-service";
import { registerMCPRoutes } from "./mcp-routes";
import { registerGlobalContextRoutes } from "./global-context-routes";
import chatRoutes from "./chat-routes";
import { emailService, type WelcomeEmailData } from "./email-service";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { addPaymentBuffer } from "./payment-utils";
import { parse } from "csv-parse/sync";
import { getBaseUrl } from "./env-config";

// PDF parsing (CommonJS module)
const requireCJS = createRequire(import.meta.url);
const pdfParseModule = requireCJS('pdf-parse');
const pdfParse = pdfParseModule.PDFParse;

// PDF to image conversion for vision API
import { fromPath } from 'pdf2pic';
import { writeFileSync, unlinkSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import path from 'path';

async function convertPdfToImages(pdfBase64: string): Promise<string[]> {
  const tempDir = '/tmp/pdf-conversion';
  const outputDir = '/tmp/pdf-images';
  
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const tempPdfPath = path.join(tempDir, `temp-${timestamp}.pdf`);
  const outputPrefix = `page-${timestamp}`;
  
  try {
    // Extract base64 data (remove data URL prefix if present)
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    
    // Write PDF to temp file
    writeFileSync(tempPdfPath, pdfBuffer);
    console.log(`📄 PDF saved to temp file: ${tempPdfPath} (${pdfBuffer.length} bytes)`);
    
    // Configure pdf2pic options
    const options = {
      density: 200,
      savePath: outputDir,
      saveFilename: outputPrefix,
      format: "png",
      width: 1600,
      height: 2200
    };
    
    const convert = fromPath(tempPdfPath, options);
    
    // Convert all pages (bulk conversion)
    const results = await convert.bulk(-1, { responseType: "base64" });
    
    // Convert results to base64 data URLs
    const base64Images: string[] = [];
    if (Array.isArray(results)) {
      for (const result of results) {
        if (result.base64) {
          base64Images.push(`data:image/png;base64,${result.base64}`);
        }
      }
    }
    
    console.log(`📸 Converted ${base64Images.length} PDF pages to images`);
    return base64Images;
  } finally {
    // Cleanup temp files
    try {
      if (existsSync(tempPdfPath)) {
        unlinkSync(tempPdfPath);
      }
      // Cleanup output images
      const files = readdirSync(outputDir);
      for (const file of files) {
        if (file.startsWith(outputPrefix)) {
          unlinkSync(path.join(outputDir, file));
        }
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError);
    }
  }
}

interface SavedImage {
  imageId: string;
  pageNumber: number;
  url: string;
  filename: string;
}

async function savePdfPageImages(
  pdfPageImages: string[], 
  paperId: string
): Promise<SavedImage[]> {
  const savedImages: SavedImage[] = [];
  const fileStorage = getStorage();
  
  for (let i = 0; i < pdfPageImages.length; i++) {
    const pageNum = i + 1;
    const imageId = `${paperId}_page_${pageNum}`;
    const filename = `${imageId}.png`;
    
    try {
      const base64Data = pdfPageImages[i].replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const result = await fileStorage.uploadBase64Image(
        `data:image/png;base64,${base64Data}`,
        filename,
        'uploads/question-images'
      );
      
      savedImages.push({
        imageId,
        pageNumber: pageNum,
        url: result.fileUrl,
        filename: result.filename
      });
      
      console.log(`💾 Saved page ${pageNum} as ${result.filename}`);
    } catch (error) {
      console.error(`❌ Failed to save page ${pageNum}:`, error);
    }
  }
  
  console.log(`📁 Saved ${savedImages.length} PDF page images`);
  return savedImages;
}
}

// Crop an image to a bounding box region using sharp
async function cropImageToBoundingBox(
  sourceImagePath: string,
  outputPath: string,
  boundingBox: { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number }
): Promise<boolean> {
  try {
    const sharp = (await import('sharp')).default;
    
    // Get image metadata to calculate pixel values
    const metadata = await sharp(sourceImagePath).metadata();
    const imgWidth = metadata.width || 0;
    const imgHeight = metadata.height || 0;
    
    if (imgWidth === 0 || imgHeight === 0) {
      console.warn(`⚠️ Could not get image dimensions for ${sourceImagePath}`);
      return false;
    }
    
    // Convert percentages to pixels
    const x = Math.round((boundingBox.xPercent / 100) * imgWidth);
    const y = Math.round((boundingBox.yPercent / 100) * imgHeight);
    const width = Math.round((boundingBox.widthPercent / 100) * imgWidth);
    const height = Math.round((boundingBox.heightPercent / 100) * imgHeight);
    
    // Clamp values to image bounds
    const clampedX = Math.max(0, Math.min(x, imgWidth - 1));
    const clampedY = Math.max(0, Math.min(y, imgHeight - 1));
    const clampedWidth = Math.min(width, imgWidth - clampedX);
    const clampedHeight = Math.min(height, imgHeight - clampedY);
    
    if (clampedWidth < 10 || clampedHeight < 10) {
      console.warn(`⚠️ Bounding box too small, skipping crop: ${clampedWidth}x${clampedHeight}`);
      return false;
    }
    
    // Crop and save using sharp
    await sharp(sourceImagePath)
      .extract({ left: clampedX, top: clampedY, width: clampedWidth, height: clampedHeight })
      .png()
      .toFile(outputPath);
    
    console.log(`✂️ Cropped image saved: ${outputPath} (${clampedWidth}x${clampedHeight})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to crop image:`, error);
    return false;
  }
}

interface CroppedImage {
  imageId: string;
  questionNumber: string;
  url: string;
  filename: string;
}

// Crop and save diagram images from page images based on bounding boxes
async function cropAndSaveDiagramImages(
  pageImages: SavedImage[],
  imagesFound: Array<{
    imageId: string;
    questionNumber: string;
    description: string;
    pageNumber: number;
    xPercent?: number;
    yPercent?: number;
    widthPercent?: number;
    heightPercent?: number;
  }>,
  paperId: string
): Promise<Map<string, string>> {
  const questionImageMap = new Map<string, string>();
  const outputDir = 'uploads/question-images';
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`\n🔧 === IMAGE PROCESSING ===`);
  console.log(`Processing ${imagesFound.length} images`);
  console.log(`Available pages: ${pageImages.map(p => p.pageNumber).join(', ')}`);
  
  for (const imgInfo of imagesFound) {
    const pageNum = imgInfo.pageNumber;
    const pageImage = pageImages.find(p => p.pageNumber === pageNum);
    
    console.log(`\n  📌 Processing Q${imgInfo.questionNumber}:`);
    console.log(`     Looking for page ${pageNum}`);
    
    if (!pageImage) {
      console.warn(`     ⚠️ Page ${pageNum} NOT FOUND! Available: ${pageImages.map(p => p.pageNumber).join(', ')}`);
      continue;
    }
    
    console.log(`     ✓ Found page ${pageNum}: ${pageImage.url}`);
    
    // Check if we should use full page (new approach - more reliable)
    const useFullPage = (imgInfo as any).useFullPage === true || 
      (imgInfo.widthPercent === 100 && imgInfo.heightPercent === 100);
    
    if (useFullPage) {
      // Use full page image - no cropping needed
      console.log(`     📄 Using FULL PAGE image (no cropping)`);
      questionImageMap.set(imgInfo.questionNumber, pageImage.url);
      
      // Also store normalized versions for matching
      const qNum = String(imgInfo.questionNumber).trim();
      if (qNum.includes('.')) {
        const parts = qNum.split('.');
        const mainNum = parseInt(parts[0].replace(/\D/g, '')) || 0;
        const subNum = parseInt(parts[1].replace(/\D/g, '')) || 0;
        if (mainNum > 0) {
          const packedNum = mainNum * 100 + subNum;
          questionImageMap.set(String(packedNum), pageImage.url);
          console.log(`     → Also mapped as packed key: ${packedNum}`);
        }
      }
      continue;
    }
    
    console.log(`     Bounding box: x=${imgInfo.xPercent}%, y=${imgInfo.yPercent}%, w=${imgInfo.widthPercent}%, h=${imgInfo.heightPercent}%`);
    
    // Check if we have valid bounding box for cropping
    if (
      imgInfo.xPercent !== undefined &&
      imgInfo.yPercent !== undefined &&
      imgInfo.widthPercent !== undefined &&
      imgInfo.heightPercent !== undefined &&
      imgInfo.widthPercent > 0 &&
      imgInfo.heightPercent > 0
    ) {
      // Crop the image to the bounding box
      const qNumClean = String(imgInfo.questionNumber).replace(/[^a-zA-Z0-9]/g, '_');
      const croppedFilename = `${paperId}_q${qNumClean}_cropped.png`;
      const croppedPath = path.join(outputDir, croppedFilename);
      const sourcePagePath = path.join(process.cwd(), pageImage.url.substring(1)); // Remove leading /
      
      const success = await cropImageToBoundingBox(
        sourcePagePath,
        croppedPath,
        {
          xPercent: imgInfo.xPercent,
          yPercent: imgInfo.yPercent,
          widthPercent: imgInfo.widthPercent,
          heightPercent: imgInfo.heightPercent
        }
      );
      
      if (success) {
        const croppedUrl = `/uploads/question-images/${croppedFilename}`;
        questionImageMap.set(imgInfo.questionNumber, croppedUrl);
        
        // Also store normalized versions for matching
        const qNum = String(imgInfo.questionNumber).trim();
        if (qNum.includes('.')) {
          const parts = qNum.split('.');
          // Strip non-digits from question number parts (e.g., "Q9" -> "9")
          const mainNum = parseInt(parts[0].replace(/\D/g, '')) || 0;
          const subNum = parseInt(parts[1].replace(/\D/g, '')) || 0;
          if (mainNum > 0) {
            const packedNum = mainNum * 100 + subNum;
            questionImageMap.set(String(packedNum), croppedUrl);
            console.log(`   → Also mapped as packed key: ${packedNum}`);
          }
        }
        
        console.log(`   ✓ Cropped Q${imgInfo.questionNumber} → ${croppedFilename}`);
      }
    } else {
      // No bounding box provided, fall back to full page
      console.warn(`⚠️ No bounding box for Q${imgInfo.questionNumber}, using full page`);
      questionImageMap.set(imgInfo.questionNumber, pageImage.url);
      
      const qNum = String(imgInfo.questionNumber).trim();
      if (qNum.includes('.')) {
        const parts = qNum.split('.');
        // Strip non-digits from question number parts (e.g., "Q9" -> "9")
        const mainNum = parseInt(parts[0].replace(/\D/g, '')) || 0;
        const subNum = parseInt(parts[1].replace(/\D/g, '')) || 0;
        if (mainNum > 0) {
          const packedNum = mainNum * 100 + subNum;
          questionImageMap.set(String(packedNum), pageImage.url);
        }
      }
    }
  }
  
  console.log(`\n📸 Processed ${questionImageMap.size} image mappings`);
  console.log(`🔧 === END CROPPING DEBUG ===\n`);
  return questionImageMap;
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInHours < 1) {
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    return diffInMins <= 1 ? 'Just now' : `${diffInMins} minutes ago`;
  } else if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  } else if (diffInDays === 1) {
    return '1 day ago';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
import { eq, and, or, desc, asc, gte, lte, isNull, isNotNull, ne, like, sql, exists, inArray } from 'drizzle-orm';

// Transform tutorial data from MCP format to frontend-expected format
function transformTutorialData(tutorialData: any) {
  if (!tutorialData) return null;
  
  // If tutorialData already has steps, return as is
  if (tutorialData.steps && Array.isArray(tutorialData.steps)) {
    return tutorialData;
  }
  
  // Transform from MCP format to frontend format
  const steps = [];
  
  // Step 1: Explanation
  if (tutorialData.explanation) {
    steps.push({
      stepNumber: 1,
      title: "Understanding the Concepts",
      explanation: tutorialData.explanation,
      example: {
        problem: "Let's start with the basics",
        solution: "We'll work through this step by step",
        keyPoint: "Focus on understanding the underlying concept"
      },
      tips: ["Take your time to understand each concept", "Practice makes perfect"]
    });
  }
  
  // Step 2-N: Examples as individual steps
  if (tutorialData.examples && Array.isArray(tutorialData.examples)) {
    tutorialData.examples.forEach((example: string, index: number) => {
      steps.push({
        stepNumber: steps.length + 1,
        title: `Example ${index + 1}`,
        explanation: `Let's work through this example step by step.`,
        example: {
          problem: `Example ${index + 1}`,
          solution: example,
          keyPoint: "Follow the working carefully"
        },
        tips: ["Work through each step carefully", "Make sure you understand the logic"]
      });
    });
  }
  
  // Final step: Practice questions overview
  if (tutorialData.questions && Array.isArray(tutorialData.questions)) {
    steps.push({
      stepNumber: steps.length + 1,
      title: "Ready for Practice",
      explanation: `Now you're ready to practice! The exercise will have ${tutorialData.questions.length} questions to test your understanding.`,
      example: {
        problem: "Practice Exercise",
        solution: "Apply what you've learned",
        keyPoint: "Use the concepts from the tutorial"
      },
      tips: ["Apply the concepts you've just learned", "Take your time", "Review the tutorial if needed"]
    });
  }
  
  return {
    id: tutorialData.id || `tutorial_${Date.now()}`,
    title: tutorialData.title || "Learning Tutorial",
    description: tutorialData.description || "Step-by-step tutorial to help you understand the concepts",
    totalSteps: steps.length,
    steps: steps,
    context: tutorialData.context || {
      grade: "8",
      subject: "mathematics", 
      topic: "Algebra",
      syllabus: "CAPS"
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply subscription middleware globally to all API routes
  // This middleware checks if premium subscription is required and validates user access
  // It automatically skips auth, subscription, and admin routes
  // Note: Mounted at '/api' so req.path inside middleware doesn't include '/api' prefix
  app.use('/api', checkSubscriptionAccess);
  
  // Check if username is available
  app.get("/api/users/check-username", async (req, res) => {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username is required" });
      }

      // Check if username exists in students table
      const result = await db
        .select()
        .from(students)
        .where(eq(students.username, username))
        .limit(1);

      res.json({ exists: result.length > 0 });
    } catch (error) {
      console.error("Error checking username:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check if Persal ID is available
  app.get("/api/teachers/check-persal", async (req, res) => {
    try {
      const { persalId } = req.query;
      
      if (!persalId || typeof persalId !== 'string') {
        return res.status(400).json({ message: "Persal ID is required" });
      }

      // Check if Persal ID exists in teachers table
      const result = await db
        .select()
        .from(teachers)
        .where(eq(teachers.registrationNumber, persalId))
        .limit(1);

      res.json({ exists: result.length > 0 });
    } catch (error) {
      console.error("Error checking Persal ID:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Demo request submission
  app.post("/api/demo-request", async (req, res) => {
    try {
      const { name, email, institution, message } = req.body;
      
      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      
      // Send demo request email to info@xtraclass.ai
      const success = await emailService.sendDemoRequest(
        name,
        email,
        institution,
        message
      );
      
      if (success) {
        res.json({ 
          success: true, 
          message: "Demo request submitted successfully. We'll get back to you within 24 hours!" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to submit demo request. Please try again later." 
        });
      }
    } catch (error) {
      console.error("Error submitting demo request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // User registration
  app.post("/api/users", async (req, res) => {
    console.log("🚨 REGISTRATION ENDPOINT HIT!");
    try {
      console.log("🔍 Registration Debug - Full request body:", JSON.stringify(req.body, null, 2));
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');

      // Generate referral code for the new user
      const firstName = userData.firstName.toLowerCase().replace(/[^a-z]/g, '');
      const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
      const referralCode = `${firstName.substring(0, 4).toUpperCase()}${randomPart}`;

      // Normal registrations should be active immediately (not parent consent flow)
      const user = await storage.createUser({
        ...userData,
        isActive: true,
        emailVerified: false,
        emailVerificationToken: emailVerificationToken,
        referralCode: referralCode
      });

      // Increment admin stats for new user
      try {
        await storage.incrementAdminStatsByRole(user.role);
      } catch (err) {
        console.error('Failed to increment admin stats:', err);
      }
      
      // Create role-specific records based on user role
      if (user.role === 'teacher') {
        await storage.createTeacher({
          userId: user.id,
          registrationNumber: req.body.registrationNumber,
          subjectSpecialization: req.body.subjectSpecialization,
          schoolAffiliation: req.body.schoolAffiliation,
          yearsExperience: req.body.yearsExperience
        });

        // Auto-create a free 5-year subscription for teachers
        try {
          // Get the first active subscription plan
          const plans = await db
            .select()
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.isActive, true))
            .limit(1);

          if (plans.length > 0) {
            const plan = plans[0];
            const fiveYearsFromNow = new Date();
            fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

            // Create subscription record with 5-year grace period
            await db.insert(subscriptions).values({
              userId: user.id,
              planId: plan.id,
              status: 'active',
              amount: plan.amount,
              currency: plan.currency,
              startDate: new Date(),
              nextPaymentDate: fiveYearsFromNow,
              currentPeriodStart: new Date(),
              currentPeriodEnd: fiveYearsFromNow,
            });

            console.log(`✅ Auto-created free 5-year subscription for teacher ${user.email}`);
          }
        } catch (error) {
          console.error('⚠️ Failed to create auto-subscription for teacher:', error);
          // Don't fail registration if subscription creation fails
        }
      } else if (user.role === 'student') {
        console.log("🔍 Registration Debug - Student creation data:", {
          userId: user.id,
          gradeLevel: req.body.gradeLevel,
          schoolName: req.body.schoolName,
          parentContact: req.body.parentContact,
          subjects: req.body.subjects,
          subjectsType: typeof req.body.subjects,
          finalSubjects: req.body.subjects || []
        });
        await storage.createStudent({
          userId: user.id,
          gradeLevel: req.body.gradeLevel,
          schoolName: req.body.schoolName,
          parentContact: req.body.parentContact,
          studentId: req.body.studentId || null,
          subjects: req.body.subjects || [],
          username: req.body.username || null
        });

        // Check for school-based organization access and grant membership if applicable
        if (req.body.schoolName) {
          try {
            const membership = await storage.grantSchoolBasedAccess(user.id, req.body.schoolName);
            if (membership) {
              console.log(`🎓 Student ${user.email} automatically received organization subscription access via school: ${req.body.schoolName}`);
            }
          } catch (error) {
            console.error(`⚠️ Failed to check/grant school-based access for ${user.email}:`, error);
            // Don't fail registration if organization access fails
          }
        }
      } else if (user.role === 'tutor') {
        await storage.createTutor({
          userId: user.id,
          certificationNumber: req.body.certificationNumber,
          subjectExpertise: req.body.subjectExpertise,
          yearsExperience: req.body.yearsExperience,
          availability: req.body.availability
        });
      }
      
      // Send welcome email (async, don't block registration response)
      const welcomeEmailData: WelcomeEmailData = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role as 'student' | 'parent' | 'teacher' | 'tutor',
        schoolName: req.body.schoolName,
        gradeLevel: req.body.gradeLevel,
        subjects: req.body.subjects,
        childName: req.body.childName
      };
      
      // Send welcome email asynchronously using SendGrid template (don't wait for it)
      emailService.sendWelcomeEmailWithTemplate(welcomeEmailData).catch(error => {
        console.error("Failed to send welcome email:", error);
        // Don't fail registration if email fails
      });
      
      // Send email confirmation asynchronously (don't wait for it)
      // Use teacher-specific template for teachers, regular template for others
      if (user.role === 'teacher') {
        emailService.sendTeacherEmailConfirmation(
          user.email,
          user.firstName,
          user.lastName,
          emailVerificationToken
        ).catch(error => {
          console.error("Failed to send teacher email confirmation:", error);
          // Don't fail registration if email fails
        });
      } else {
        emailService.sendEmailConfirmation(
          user.email,
          user.firstName,
          user.lastName,
          emailVerificationToken
        ).catch(error => {
          console.error("Failed to send email confirmation:", error);
          // Don't fail registration if email fails
        });
      }
      
      console.log(`✅ User registration successful for ${user.email} (${user.role})`);
      
      // Remove password from response
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if account is active (for parent consent flow)
      if (!user.isActive) {
        return res.status(403).json({ 
          message: "Account is inactive. Please complete the payment process to activate your account.",
          code: "ACCOUNT_INACTIVE"
        });
      }

      // For auto-created parent accounts on first login, send email confirmation
      if (user.role === 'parent' && !user.emailVerified && !user.emailVerificationToken) {
        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');
        
        // Update user with verification token
        await db
          .update(users)
          .set({ emailVerificationToken: emailVerificationToken })
          .where(eq(users.id, user.id));
        
        // Send email confirmation asynchronously
        emailService.sendEmailConfirmation(
          user.email,
          user.firstName,
          user.lastName,
          emailVerificationToken
        ).catch(error => {
          console.error("Failed to send email confirmation on first login:", error);
        });
        
        console.log(`📧 Email confirmation sent to auto-created parent ${user.email} on first login`);
      }

      // Generate JWT token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      });

      // Remove password from response
      const { password: _, ...userResponse } = user;
      
      res.json({
        user: userResponse,
        token,
        message: "Login successful"
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user (protected route)
  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // In JWT-based auth, logout is handled client-side by removing the token
      // This endpoint can be used for logging or future session invalidation
      res.json({ message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email verification endpoint
  app.get("/api/verify-email/:token", async (req, res) => {
    console.log(`📧 Email verification request received for token: ${req.params.token?.substring(0, 20)}...`);
    
    try {
      const { token } = req.params;
      
      if (!token) {
        console.log('❌ No token provided');
        return res.status(400).json({ 
          message: "No verification token provided",
          code: "NO_TOKEN"
        });
      }
      
      console.log('🔍 Searching for user with verification token...');
      
      // Find user with this verification token
      const result = await db
        .select()
        .from(users)
        .where(eq(users.emailVerificationToken, token))
        .limit(1);
      
      console.log(`📊 Query result: ${result.length} users found`);
      
      if (result.length === 0) {
        console.log('❌ Invalid or expired token');
        return res.redirect('/signin?verification_error=invalid_token');
      }
      
      const user = result[0];
      console.log(`👤 Found user: ${user.email} (verified: ${user.emailVerified})`);
      
      // Check if email is already verified
      if (user.emailVerified) {
        console.log('ℹ️ Email already verified');
        return res.redirect('/signin?already_verified=true');
      }
      
      console.log('✏️ Updating user verification status...');
      
      // Update user to mark email as verified and clear token
      await db
        .update(users)
        .set({ 
          emailVerified: true,
          emailVerificationToken: null
        })
        .where(eq(users.id, user.id));
      
      console.log(`✅ Email verified successfully for user ${user.email}`);
      
      // Redirect to signin page with success message
      res.redirect('/signin?verified=true');
    } catch (error) {
      console.error("❌ Error verifying email:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res.status(500).json({ 
        message: "Internal server error",
        code: "SERVER_ERROR"
      });
    }
  });

  // Resend email verification
  app.post("/api/auth/resend-verification", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if email is already verified
      if (user.emailVerified) {
        return res.json({ 
          message: "Email already verified",
          alreadyVerified: true
        });
      }
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Update user with new token
      await db
        .update(users)
        .set({ emailVerificationToken: verificationToken })
        .where(eq(users.id, userId));
      
      // Send verification email based on role
      if (user.role === 'teacher') {
        await emailService.sendTeacherEmailConfirmation(
          user.email,
          user.firstName,
          user.lastName,
          verificationToken
        );
      } else {
        await emailService.sendEmailConfirmation(
          user.email,
          user.firstName,
          user.lastName,
          verificationToken
        );
      }
      
      console.log(`✅ Verification email resent to ${user.email}`);
      
      res.json({ 
        message: "Verification email sent successfully"
      });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Forgot password - request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);
      
      // Always return success to prevent email enumeration attacks
      if (result.length === 0) {
        console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
        return res.json({ 
          message: "If an account with that email exists, a password reset link has been sent."
        });
      }

      const user = result[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Update user with reset token
      await db
        .update(users)
        .set({ 
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires
        })
        .where(eq(users.id, user.id));

      // Send password reset email
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken
      );

      console.log(`✅ Password reset email sent to ${user.email}`);
      
      res.json({ 
        message: "If an account with that email exists, a password reset link has been sent."
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password - set new password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Find user with valid reset token
      const result = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (result.length === 0) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      const user = result[0];

      // Check if token has expired
      if (!user.passwordResetExpires || new Date() > new Date(user.passwordResetExpires)) {
        return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user's password and clear reset token
      await db
        .update(users)
        .set({ 
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        })
        .where(eq(users.id, user.id));

      console.log(`✅ Password reset successful for ${user.email}`);
      
      res.json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Validate reset token - check if token is valid
  app.get("/api/auth/validate-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const result = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (result.length === 0) {
        return res.status(400).json({ valid: false, message: "Invalid reset link" });
      }

      const user = result[0];

      if (!user.passwordResetExpires || new Date() > new Date(user.passwordResetExpires)) {
        return res.status(400).json({ valid: false, message: "Reset link has expired" });
      }

      res.json({ valid: true, email: user.email });
    } catch (error) {
      console.error("Error validating reset token:", error);
      res.status(500).json({ valid: false, message: "Failed to validate reset link" });
    }
  });

  // Get user email preferences
  app.get("/api/user/email-preferences", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const defaultPreferences = {
        welcomeEmails: true,
        progressUpdates: true,
        homeworkReminders: true,
        achievementNotifications: true,
        weeklyReports: true,
        marketingEmails: false
      };
      
      res.json({
        emailPreferences: user.emailPreferences || defaultPreferences
      });
    } catch (error) {
      console.error("Failed to get email preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user email preferences
  app.patch("/api/user/email-preferences", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const preferences = req.body;
      
      // Validate preferences structure
      const validKeys = ['welcomeEmails', 'progressUpdates', 'homeworkReminders', 'achievementNotifications', 'weeklyReports', 'marketingEmails'];
      const sanitizedPreferences: any = {};
      
      for (const key of validKeys) {
        if (key in preferences && typeof preferences[key] === 'boolean') {
          sanitizedPreferences[key] = preferences[key];
        }
      }
      
      await storage.updateUserEmailPreferences(userId, sanitizedPreferences);
      
      console.log(`✅ Updated email preferences for user ${userId}:`, sanitizedPreferences);
      
      res.json({
        message: "Email preferences updated successfully",
        emailPreferences: sanitizedPreferences
      });
    } catch (error) {
      console.error("Failed to update email preferences:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test email sending (for development/testing purposes)
  app.post("/api/test/send-email", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { type = 'welcome' } = req.body;
      const user = req.user!;
      
      // Create test welcome email data
      const welcomeEmailData: WelcomeEmailData = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role as 'student' | 'parent' | 'teacher' | 'tutor',
        schoolName: 'Test School',
        gradeLevel: '8',
        subjects: ['Mathematics', 'Science'],
        childName: 'Test Child'
      };

      if (type === 'welcome') {
        const success = await emailService.sendWelcomeEmail(welcomeEmailData);
        
        if (success) {
          res.json({ 
            message: `Welcome email sent successfully to ${user.email}`,
            emailType: 'welcome',
            role: user.role
          });
        } else {
          res.status(500).json({ 
            message: "Failed to send email. Check SendGrid configuration.",
            emailEnabled: !!process.env.SENDGRID_API_KEY
          });
        }
      } else {
        res.status(400).json({ message: "Invalid email type" });
      }
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user profile
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get children for authenticated parent
  app.get("/api/children", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const parentId = req.user!.id;
      const children = await storage.getChildrenByParent(parentId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Unlink/delete a child from parent's profile
  app.delete("/api/children/:childId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const parentId = req.user!.id;
      const childId = parseInt(req.params.childId);
      
      if (isNaN(childId)) {
        return res.status(400).json({ message: "Invalid child ID" });
      }

      // Verify the child belongs to this parent
      const child = await storage.getChildById(childId);
      if (!child) {
        return res.status(404).json({ message: "Child not found" });
      }

      if (child.parentId !== parentId) {
        return res.status(403).json({ message: "You can only unlink your own children" });
      }

      // Delete the child record (this unlinks them from the parent)
      await storage.deleteChild(childId);
      
      res.json({ message: "Child unlinked successfully" });
    } catch (error) {
      console.error("Error unlinking child:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student completion statistics
  app.get("/api/students/:studentId/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Get user and student data
      const [userData] = await db.select({
        points: users.points,
        gradeLevel: students.gradeLevel,
        schoolName: students.schoolName,
        studentTableId: students.id
      })
      .from(users)
      .leftJoin(students, eq(users.id, students.userId))
      .where(eq(users.id, studentId));

      if (!userData || !userData.studentTableId) {
        return res.status(404).json({ message: "Student not found" });
      }

      const studentTableId = userData.studentTableId;

      // Get homework completion count using student table ID
      const [homeworkStats] = await db.select({
        completed: sql<number>`COUNT(*)`.as('completed')
      })
      .from(homeworkSubmissions)
      .where(and(
        eq(homeworkSubmissions.studentId, studentTableId),
        eq(homeworkSubmissions.isCompleted, true)
      ));

      // Get exercise completion count using student table ID
      const [exerciseStats] = await db.select({
        completed: sql<number>`COUNT(*)`.as('completed')
      })
      .from(exerciseSubmissions)
      .where(and(
        eq(exerciseSubmissions.studentId, studentTableId),
        eq(exerciseSubmissions.isCompleted, true)
      ));

      // Get total homework and exercises available for the student's grade level
      // Note: homework is linked to classes, so we need to join with classes table to filter by grade
      const [totalHomeworkCount] = await db.select({
        total: sql<number>`COUNT(DISTINCT homework.id)`.as('total')
      })
      .from(homework)
      .leftJoin(classes, eq(homework.classId, classes.id))
      .where(and(
        eq(homework.published, true),
        eq(classes.grade, userData.gradeLevel || '')
      ));

      const [totalExercisesCount] = await db.select({
        total: sql<number>`COUNT(*)`.as('total')
      })
      .from(exercises)
      .where(eq(exercises.grade, userData.gradeLevel || ''));

      const homeworkCompleted = Number(homeworkStats?.completed) || 0;
      const exercisesCompleted = Number(exerciseStats?.completed) || 0;
      const totalHomework = Number(totalHomeworkCount?.total) || 0;
      const totalExercises = Number(totalExercisesCount?.total) || 0;
      
      const totalWork = totalHomework + totalExercises;
      const completedWork = homeworkCompleted + exercisesCompleted;
      const completionPercentage = totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0;
      


      // Get subjects only from classes the student is enrolled in
      const enrolledClassesQuery = await db.select({
        subject: classes.subject,
        classId: classes.id
      })
      .from(classes)
      .innerJoin(classStudents, eq(classes.id, classStudents.classId))
      .innerJoin(students, eq(classStudents.studentId, students.id))
      .where(eq(students.userId, studentId));

      // If no enrolled classes, fallback to student's registered subjects
      let subjectsToProcess: Array<{subject: string, classId?: number}> = [];
      
      if (enrolledClassesQuery.length > 0) {
        subjectsToProcess = enrolledClassesQuery;
      } else {
        // Get student's registered subjects
        const [studentData] = await db.select({
          subjects: students.subjects
        })
        .from(students)
        .where(eq(students.userId, studentId));
        
        if (studentData?.subjects && Array.isArray(studentData.subjects)) {
          subjectsToProcess = studentData.subjects.map((subject: string) => ({
            subject
          }));
        }
      }

      // Calculate subject-specific progress only for enrolled classes
      const subjectProgress: Array<{subject: string, percentage: number}> = [];

      for (const enrolledClass of subjectsToProcess) {
        const subject = enrolledClass.subject;

        // Get homework progress for this subject using student table ID
        // If classId exists, filter by it; otherwise get all homework for the subject
        const homeworkConditions = [
          eq(homework.published, true)
        ];
        
        if (enrolledClass.classId !== undefined) {
          homeworkConditions.push(eq(homework.classId, enrolledClass.classId));
        }
        
        const [homeworkData] = await db.select({
          totalHomework: sql<number>`COUNT(DISTINCT homework.id)`.as('totalHomework'),
          completedHomework: sql<number>`COUNT(DISTINCT CASE WHEN homework_submissions.is_completed = true THEN homework.id END)`.as('completedHomework')
        })
        .from(homework)
        .leftJoin(homeworkSubmissions, and(
          eq(homeworkSubmissions.homeworkId, homework.id),
          eq(homeworkSubmissions.studentId, studentTableId)
        ))
        .where(and(...homeworkConditions));

        // Get exercise progress for this subject (only subject-relevant exercises) using student table ID
        const [exerciseData] = await db.select({
          totalExercises: sql<number>`COUNT(DISTINCT exercises.id)`.as('totalExercises'),
          completedExercises: sql<number>`COUNT(DISTINCT CASE WHEN exercise_submissions.is_completed = true THEN exercises.id END)`.as('completedExercises')
        })
        .from(exercises)
        .leftJoin(exerciseSubmissions, and(
          eq(exerciseSubmissions.exerciseId, exercises.id),
          eq(exerciseSubmissions.studentId, studentTableId)
        ))
        .where(and(
          eq(exercises.subject, subject),
          eq(exercises.grade, userData.gradeLevel || '')
        ));
        
        const totalHomeworkForSubject = Number(homeworkData?.totalHomework) || 0;
        const completedHomeworkForSubject = Number(homeworkData?.completedHomework) || 0;
        const totalExercisesForSubject = Number(exerciseData?.totalExercises) || 0;
        const completedExercisesForSubject = Number(exerciseData?.completedExercises) || 0;
        
        const totalForSubject = totalHomeworkForSubject + totalExercisesForSubject;
        const completedForSubject = completedHomeworkForSubject + completedExercisesForSubject;
        const percentage = totalForSubject > 0 ? Math.round((completedForSubject / totalForSubject) * 100) : 0;
        
        subjectProgress.push({
          subject,
          percentage
        });
      }

      res.json({
        points: userData.points || 0,
        completionPercentage,
        homeworkCompleted,
        exercisesCompleted,
        totalHomework,
        totalExercises,
        gradeLevel: userData.gradeLevel,
        schoolName: userData.schoolName,
        subjectProgress
      });
    } catch (error) {
      console.error("Error fetching student stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check if child exists before adding them
  app.post("/api/children/check", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const parentId = req.user!.id;
      const { idNumber } = req.body;
      
      if (!idNumber) {
        return res.status(400).json({ message: "ID number is required" });
      }

      const student = await storage.findStudentByIdNumber(idNumber);
      
      if (student) {
        // Check if this child is already linked to this parent
        const isAlreadyLinked = await storage.isChildAlreadyLinked(parentId, student.userId);
        
        return res.json({ 
          exists: true,
          alreadyLinked: isAlreadyLinked,
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            schoolName: student.schoolName,
            gradeLevel: student.gradeLevel
          }
        });
      }
      
      res.json({ exists: false });
    } catch (error) {
      console.error("Error checking child:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Link existing student to parent as child
  app.post("/api/children/link", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const parentId = req.user!.id;
      const { studentIdNumber, childName } = req.body;
      
      if (!studentIdNumber) {
        return res.status(400).json({ message: "Student ID number is required" });
      }

      const student = await storage.findStudentByIdNumber(studentIdNumber);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const child = await storage.linkChildToExistingStudent(parentId, studentIdNumber, childName || `${student.firstName} ${student.lastName}`);
      res.status(201).json(child);
    } catch (error) {
      console.error("Error linking child:", error);
      
      // Check for specific error about already linked child
      if (error.message?.includes("already linked")) {
        return res.status(409).json({ 
          message: error.message,
          conflictType: "already_linked" 
        });
      }
      
      res.status(500).json({ message: "Failed to link child to existing student" });
    }
  });

  // Create child (protected route - requires authentication)
  app.post("/api/children", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Use authenticated user's ID as parent ID
      const parentId = req.user!.id;
      const { parentId: _, ...childData } = req.body; // Remove any parentId from request body
      
      // First check if a student with this ID number already exists
      if (childData.idNumber) {
        const existingStudent = await storage.findStudentByIdNumber(childData.idNumber);
        if (existingStudent) {
          return res.status(409).json({ 
            message: "A student with this ID number already exists",
            conflictType: "existing_student",
            studentDetails: {
              id: existingStudent.id,
              firstName: existingStudent.firstName,
              lastName: existingStudent.lastName,
              email: existingStudent.email,
              schoolName: existingStudent.schoolName,
              gradeLevel: existingStudent.gradeLevel
            }
          });
        }
      }
      
      const childToCreate = {
        ...childData,
        parentId // Use authenticated user's ID
      };
      
      const validatedData = insertChildSchema.parse(childToCreate);
      const child = await storage.createChild(validatedData);
      res.status(201).json(child);
    } catch (error) {
      console.error("Error creating child:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get children by parent
  app.get("/api/children/parent/:parentId", async (req, res) => {
    try {
      const parentId = parseInt(req.params.parentId);
      const children = await storage.getChildrenByParent(parentId);
      res.json(children);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete/unlink child from parent
  app.delete("/api/children/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const childId = parseInt(req.params.id);
      const parentId = req.user?.id;

      if (!parentId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify this child belongs to the authenticated parent
      const child = await storage.getChildById(childId);
      if (!child || child.parentId !== parentId) {
        return res.status(404).json({ message: "Child not found or access denied" });
      }

      const deleted = await storage.deleteChild(childId);
      if (!deleted) {
        return res.status(404).json({ message: "Child not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting child:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student assignments (homework + exercises) with filter options
  app.get("/api/students/:id/assignments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentUserId = parseInt(req.params.id);
      const { 
        status, 
        date, 
        startDate, 
        endDate, 
        type,
        limit = '100',
        offset = '0'
      } = req.query;
      
      // Get the student record by user ID to get the actual student table ID
      const student = await storage.getStudentByUserId(studentUserId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const studentId = student.id; // Use the student table ID
      
      // Build date filter conditions
      let dateFilter = '';
      const queryParams: any[] = [studentId];
      let paramIndex = 2;
      
      if (date) {
        dateFilter = `AND h.due_date::date = $${paramIndex}::date`;
        queryParams.push(date);
        paramIndex++;
      } else if (startDate && endDate) {
        dateFilter = `AND h.due_date::date BETWEEN $${paramIndex}::date AND $${paramIndex + 1}::date`;
        queryParams.push(startDate, endDate);
        paramIndex += 2;
      }

      // Get homework assignments with questions and submission details (only if type is 'homework', 'all', or not specified)
      let homeworkResults = { rows: [] };
      if (!type || type === 'all' || type === 'homework') {
        const homeworkQuery = `
          SELECT 
            h.id,
            h.title,
            h.description,
            h.due_date,
            h.questions,
            h.published,
            h.created_at,
            c.subject,
            c.name as class_name,
            'homework' as type,
            CASE WHEN hs.id IS NOT NULL AND hs.is_completed = true THEN 'completed' ELSE 'pending' END as status,
            hs.submitted_at,
            hs.score,
            hs.total_marks,
            hs.answers,
            hs.feedback
          FROM homework h
          JOIN classes c ON h.class_id = c.id
          JOIN class_students cs ON c.id = cs.class_id
          LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = $1
          WHERE cs.student_id = $1 AND h.published = true
          ${dateFilter}
        `;
        homeworkResults = await pool.query(homeworkQuery, queryParams);
      }

      // Get exercise assignments (for student's grade and enrolled subjects)
      let exerciseResults = { rows: [] };
      if (!type || type === 'all' || type === 'exercise') {
        // Build exercise date filter
        let exerciseDateFilter = '';
        const exerciseParams = [studentId];
        let exParamIndex = 2;
        
        if (date) {
          exerciseDateFilter = `AND e.date::date = $${exParamIndex}::date`;
          exerciseParams.push(date);
        } else if (startDate && endDate) {
          exerciseDateFilter = `AND e.date::date BETWEEN $${exParamIndex}::date AND $${exParamIndex + 1}::date`;
          exerciseParams.push(startDate, endDate);
        }
        
        const exerciseQuery = `
          SELECT 
            e.id,
            e.title,
            e.description,
            e.date as due_date,
            e.subject,
            'Exercise' as class_name,
            'exercise' as type,
            CASE WHEN es.id IS NOT NULL AND es.is_completed = true THEN 'completed' ELSE 'pending' END as status,
            es.submitted_at,
            es.score
          FROM exercises e
          LEFT JOIN exercise_submissions es ON e.id = es.exercise_id AND es.student_id = $1
          WHERE e.grade = (
            SELECT grade_level FROM students s 
            WHERE s.id = $1
          )
          AND e.subject IN (
            SELECT DISTINCT c.subject 
            FROM classes c
            JOIN class_students cs ON c.id = cs.class_id 
            WHERE cs.student_id = $1
          )
          ${exerciseDateFilter}
        `;
        exerciseResults = await pool.query(exerciseQuery, exerciseParams);
      }

      // Get quiz assignments
      let quizResults = { rows: [] };
      if (!type || type === 'all' || type === 'quiz') {
        // Build quiz date filter
        let quizDateFilter = '';
        const quizParams = [studentId];
        let quizParamIndex = 2;
        
        if (date) {
          quizDateFilter = `AND q.scheduled_date::date = $${quizParamIndex}::date`;
          quizParams.push(date);
        } else if (startDate && endDate) {
          quizDateFilter = `AND q.scheduled_date::date BETWEEN $${quizParamIndex}::date AND $${quizParamIndex + 1}::date`;
          quizParams.push(startDate, endDate);
        }
        
        const quizQuery = `
          SELECT 
            q.id,
            q.title,
            q.description,
            q.scheduled_date as due_date,
            c.subject,
            c.name as class_name,
            'quiz' as type,
            'scheduled' as status,
            q.duration,
            NULL as submitted_at,
            NULL as score
          FROM quizzes q
          JOIN classes c ON q.class_id = c.id
          JOIN class_students cs ON c.id = cs.class_id
          WHERE cs.student_id = $1 AND q.published = true
          ${quizDateFilter}
        `;
        quizResults = await pool.query(quizQuery, quizParams);
      }

      let assignments = [...homeworkResults.rows, ...exerciseResults.rows, ...quizResults.rows];

      // Filter by status if specified
      if (status && status !== 'all') {
        if (status === 'outstanding') {
          assignments = assignments.filter(assignment => assignment.status === 'pending' || assignment.status === 'scheduled');
        } else {
          assignments = assignments.filter(assignment => assignment.status === status);
        }
      }

      // Sort by due date
      assignments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      
      // Apply pagination (optional - only if needed)
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      if (offsetNum > 0 || limitNum < 1000) {
        assignments = assignments.slice(offsetNum, offsetNum + limitNum);
      }

      // Return array for backward compatibility
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching student assignments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create teacher profile
  app.post("/api/teachers", async (req, res) => {
    try {
      const teacherData = insertTeacherSchema.parse(req.body);
      const teacher = await storage.createTeacher(teacherData);
      res.status(201).json(teacher);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check if student exists by ID number
  app.post("/api/students/check", async (req, res) => {
    try {
      const { idNumber } = req.body;
      
      if (!idNumber) {
        return res.status(400).json({ message: "ID number is required" });
      }

      const student = await storage.findStudentByIdNumber(idNumber);
      
      if (student) {
        return res.json({ 
          exists: true, 
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            schoolName: student.schoolName,
            gradeLevel: student.gradeLevel
          }
        });
      }
      
      res.json({ exists: false });
    } catch (error) {
      console.error("Error checking student:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Set password for existing student
  app.post("/api/students/set-password", async (req, res) => {
    try {
      const { idNumber, password } = req.body;
      
      if (!idNumber || !password) {
        return res.status(400).json({ message: "ID number and password are required" });
      }

      const student = await storage.findStudentByIdNumber(idNumber);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const updated = await storage.updateStudentPassword(student.userId, password);
      
      if (updated) {
        res.json({ message: "Password set successfully" });
      } else {
        res.status(500).json({ message: "Failed to set password" });
      }
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create student profile
  app.post("/api/students", async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create tutor profile
  app.post("/api/tutors", async (req, res) => {
    try {
      const tutorData = insertTutorSchema.parse(req.body);
      const tutor = await storage.createTutor(tutorData);
      res.status(201).json(tutorData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get available subjects for student
  // Get student profile endpoint
  // Get user profile (general for all roles)
  app.get("/api/user/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Base profile info
      let profile: any = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: user.emailVerified || false,
        cellNumber: user.cellNumber,
        role: user.role,
        avatar: user.avatar || null,
        points: user.points || 0
      };

      // Add role-specific data
      if (user.role === 'teacher') {
        const teacher = await storage.getTeacherByUserId(userId);
        if (teacher) {
          profile = {
            ...profile,
            registrationNumber: teacher.registrationNumber,
            subjectSpecialization: teacher.subjectSpecialization,
            schoolAffiliation: teacher.schoolAffiliation,
            yearsExperience: teacher.yearsExperience
          };
        }
      } else if (user.role === 'student') {
        // Get student info directly from database
        const [student] = await db.select().from(students).where(eq(students.userId, userId));
        if (student) {
          // Get parent info if available  
          let parentInfo = null;
          if (student.parentContact) {
            // Try to find parent by looking up in children table
            const [childRecord] = await db.select().from(children).where(eq(children.studentUserId, userId));
            if (childRecord?.parentId) {
              const parent = await storage.getUser(childRecord.parentId);
              if (parent) {
                parentInfo = {
                  firstName: parent.firstName,
                  lastName: parent.lastName,
                  email: parent.email,
                  cellNumber: parent.cellNumber
                };
              }
            }
          }

          // Get subjects from database directly until schema is updated
          const subjectsResult = await db.execute(sql`SELECT subjects FROM students WHERE user_id = ${userId}`);
          const subjects = subjectsResult.rows[0]?.subjects as string[] || [];

          // Get class assignment information
          let classInfo = null;
          const [classAssignment] = await db.select({
            className: classes.name,
            classGrade: classes.grade,
            classSubject: classes.subject
          })
          .from(classStudents)
          .innerJoin(classes, eq(classStudents.classId, classes.id))
          .where(eq(classStudents.studentId, student.id));

          if (classAssignment) {
            classInfo = {
              name: classAssignment.className,
              grade: classAssignment.classGrade,
              subject: classAssignment.classSubject
            };
          }

          profile = {
            ...profile,
            grade: student.gradeLevel,
            school: student.schoolName,
            studentId: student.id,  // Use numeric primary key, not string student_id
            subjects: subjects,
            parent: parentInfo,
            classInfo: classInfo,
            username: student.username || null
          };
        }
      }

      res.json(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;
      
      // Update user basic info if provided
      if (updates.firstName || updates.lastName || updates.email || updates.cellNumber) {
        await storage.updateUser(userId, {
          firstName: updates.firstName,
          lastName: updates.lastName,
          email: updates.email,
          cellNumber: updates.cellNumber
        });
      }

      // Update role-specific data if user is teacher
      if (req.user.role === 'teacher' && (updates.registrationNumber || updates.subjectSpecialization || updates.schoolAffiliation || updates.yearsExperience)) {
        const teacher = await storage.getTeacherByUserId(userId);
        if (teacher) {
          await storage.updateTeacher(teacher.id, {
            registrationNumber: updates.registrationNumber,
            subjectSpecialization: updates.subjectSpecialization,
            schoolAffiliation: updates.schoolAffiliation,
            yearsExperience: updates.yearsExperience
          });
        }
      }

      // Update username for students
      if (req.user.role === 'student' && updates.username !== undefined) {
        const student = await storage.getStudentByUserId(userId);
        if (student) {
          await db
            .update(students)
            .set({ username: updates.username })
            .where(eq(students.id, student.id));
        }
      }

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // Change user password
  app.post("/api/user/change-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in database
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  app.get("/api/student/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({ message: "Only students can access this endpoint" });
      }

      // Get user basic info
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get student specific info
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.userId, req.user.id));

      // Get student subjects from their completed exercises and homework
      const exerciseSubjects = await db
        .selectDistinct({ subject: exercises.subject })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(eq(exerciseSubmissions.studentId, student?.id || 0));

      const subjects = Array.from(new Set(exerciseSubjects.map(s => s.subject)));

      // Try to find parent info if available
      let parentInfo = null;
      try {
        const [child] = await db
          .select()
          .from(children)
          .where(eq(children.studentUserId, user.id));

        if (child?.parentId) {
          const [parent] = await db
            .select()
            .from(users)
            .where(eq(users.id, child.parentId));

          if (parent) {
            parentInfo = {
              firstName: parent.firstName,
              lastName: parent.lastName,
              email: parent.email,
              cellNumber: parent.cellNumber,
              relationshipToChild: "Parent" // Default relationship
            };
          }
        }
      } catch (error) {
        console.log("Could not fetch parent info:", error);
      }

      const profile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        cellNumber: user.cellNumber,
        role: user.role,
        points: user.points || 0,
        gradeLevel: student?.gradeLevel,
        schoolName: student?.schoolName,
        parentContact: student?.parentContact,
        studentId: student?.studentId,
        subjects,
        parentInfo
      };

      res.json(profile);
    } catch (error) {
      console.error("Error fetching student profile:", error);
      res.status(500).json({ message: "Failed to fetch student profile" });
    }
  });

  app.get("/api/student/subjects", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Only students can access subjects" });
      }

      // Get student record to find their selected subjects
      const student = await storage.getStudentByUserId(user.id);
      if (!student) {
        return res.status(404).json({ message: "Student record not found" });
      }

      // Return only the subjects that the student selected during registration
      const subjects = student.subjects || [];
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching student subjects:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get topics with progress for a subject
  app.get("/api/student/topics/:subject", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Only students can access topics" });
      }

      const student = await storage.getStudentByUserId(user.id);
      if (!student) {
        return res.status(404).json({ message: "Student record not found" });
      }

      const { subject } = req.params;
      const topics = await storage.getTopicsByGradeAndSubject(student.gradeLevel, subject);
      
      // Add progress data to each topic AND collect aggregates
      let totalCompleted = 0;
      let totalAvailable = 0;
      let topicsStarted = 0;
      
      const topicsWithProgress = await Promise.all(
        topics.map(async (topic) => {
          const progress = await storage.getTopicProgress(student.id, topic.id);
          
          // Track aggregates for subject-level progress
          if (progress.overallProgress > 0) {
            topicsStarted++;
          }
          
          // Sum up totals across all topics
          totalCompleted += progress.completedAssignments;
          totalAvailable += progress.totalAssignments;
          
          return {
            ...topic,
            progress: progress.overallProgress,
            exerciseProgress: progress.exerciseProgress,
            homeworkProgress: progress.homeworkProgress,
            mastery: progress.mastery,
            lastStudied: "Recently" // Default placeholder
          };
        })
      );

      // Calculate subject-level percentage with minimum 1% if any work completed
      const percentComplete = totalAvailable > 0 && totalCompleted > 0
        ? Math.max(1, Math.round((totalCompleted / totalAvailable) * 100))
        : 0;

      res.json({
        topics: topicsWithProgress,
        subjectAggregates: {
          totalCompleted,
          totalAvailable,
          topicsStarted,
          totalTopics: topics.length,
          percentComplete
        }
      });
    } catch (error) {
      console.error('Error fetching topics with progress:', error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  // Get detailed topic analysis with strengths and weaknesses
  app.get("/api/student/topics/:topicId/analysis", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Only students can access topic analysis" });
      }

      const student = await storage.getStudentByUserId(user.id);
      if (!student) {
        return res.status(404).json({ message: "Student record not found" });
      }

      const topicId = parseInt(req.params.topicId);
      const analysis = await storage.getTopicAnalysis(student.id, topicId);

      res.json(analysis);
    } catch (error) {
      console.error('Error fetching topic analysis:', error);
      res.status(500).json({ message: "Failed to fetch topic analysis" });
    }
  });

  // Topic API routes
  // Get topics by grade and subject
  app.get("/api/topics", async (req, res) => {
    try {
      const { grade, subject } = req.query;
      
      if (!grade || !subject) {
        return res.status(400).json({ message: "Grade and subject parameters are required" });
      }

      const topics = await storage.getTopicsByGradeAndSubject(grade as string, subject as string);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create topic
  app.post("/api/topics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const topicData = insertTopicSchema.parse(req.body);
      const topic = await storage.createTopic(topicData);
      res.status(201).json(topic);
    } catch (error) {
      console.error("Error creating topic:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update topic
  app.put("/api/topics/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const topicId = parseInt(req.params.id);
      const updates = insertTopicSchema.partial().parse(req.body);
      
      const topic = await storage.updateTopic(topicId, updates);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      res.json(topic);
    } catch (error) {
      console.error("Error updating topic:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete topic
  app.delete("/api/topics/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const topicId = parseInt(req.params.id);
      const deleted = await storage.deleteTopic(topicId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting topic:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Theme API routes
  // Get themes by topic
  app.get("/api/themes", async (req, res) => {
    try {
      const { topicId } = req.query;
      
      if (!topicId) {
        return res.status(400).json({ message: "TopicId parameter is required" });
      }

      const themes = await storage.getThemesByTopic(parseInt(topicId as string));
      res.json(themes);
    } catch (error) {
      console.error("Error fetching themes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create theme
  app.post("/api/themes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const themeData = insertThemeSchema.parse(req.body);
      const theme = await storage.createTheme(themeData);
      res.status(201).json(theme);
    } catch (error) {
      console.error("Error creating theme:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update theme
  app.put("/api/themes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const themeId = parseInt(req.params.id);
      const updates = insertThemeSchema.partial().parse(req.body);
      
      const theme = await storage.updateTheme(themeId, updates);
      if (!theme) {
        return res.status(404).json({ message: "Theme not found" });
      }
      
      res.json(theme);
    } catch (error) {
      console.error("Error updating theme:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete theme
  app.delete("/api/themes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const themeId = parseInt(req.params.id);
      const deleted = await storage.deleteTheme(themeId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Theme not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting theme:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // SyllabusCalendar API routes
  // Curriculum data endpoints
  app.get('/api/curriculum/subjects', authenticateToken, async (req, res) => {
    try {
      const subjects = await db.select({
        subject: topics.subject
      }).from(topics)
      .groupBy(topics.subject)
      .orderBy(topics.subject);
      
      res.json(subjects.map(s => s.subject));
    } catch (error) {
      console.error('Error fetching subjects:', error);
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  });

  app.get('/api/curriculum/topics', authenticateToken, async (req, res) => {
    try {
      const { subject, grade } = req.query;
      const conditions = [];
      
      if (subject) conditions.push(eq(topics.subject, subject as string));
      if (grade) conditions.push(eq(topics.grade, grade as string));
      
      const topicsData = await db.select().from(topics)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(topics.name);
      
      res.json(topicsData);
    } catch (error) {
      console.error('Error fetching topics:', error);
      res.status(500).json({ error: 'Failed to fetch topics' });
    }
  });

  app.get('/api/curriculum/themes', authenticateToken, async (req, res) => {
    try {
      const { topicId } = req.query;
      
      const themesData = await db.select().from(themes)
        .where(topicId ? eq(themes.topicId, parseInt(topicId as string)) : undefined)
        .orderBy(themes.name);
      
      res.json(themesData);
    } catch (error) {
      console.error('Error fetching themes:', error);
      res.status(500).json({ error: 'Failed to fetch themes' });
    }
  });

  // Get lessons by date, grade, and subject
  app.get("/api/syllabus-calendar", async (req, res) => {
    try {
      const { date, startDate, endDate, grade, subject } = req.query;
      
      if (!grade || !subject) {
        return res.status(400).json({ message: "Grade and subject parameters are required" });
      }

      let lessons;
      
      if (startDate && endDate) {
        // Date range query for monthly view
        lessons = await storage.getSyllabusCalendarByDateRange(
          startDate as string,
          endDate as string,
          grade as string, 
          subject as string
        );
      } else if (date) {
        // Single date query
        lessons = await storage.getSyllabusCalendarByDate(
          date as string, 
          grade as string, 
          subject as string
        );
      } else {
        return res.status(400).json({ message: "Must provide either 'date' or 'startDate' and 'endDate'" });
      }
      
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching syllabus calendar:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create lesson
  app.post("/api/syllabus-calendar", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const lessonData = insertSyllabusCalendarSchema.parse(req.body);
      
      // Topics and themes are already filtered by grade/subject in the UI,
      // so additional validation is not needed here
      
      const lesson = await storage.createSyllabusCalendar(lessonData);
      
      // Auto-fetch transcript if video link is provided (non-blocking)
      if (lesson.videoLink) {
        fetchYouTubeTranscript(lesson.videoLink).then(async (transcriptResult) => {
          if (transcriptResult.success && transcriptResult.full_text) {
            console.log(`📺 Auto-fetched transcript for new lesson ${lesson.id}: ${lesson.lessonTitle}`);
            await db.update(syllabusCalendar)
              .set({ videoTranscript: transcriptResult.full_text, updatedAt: new Date() })
              .where(eq(syllabusCalendar.id, lesson.id));
            console.log(`📺 Stored transcript (${transcriptResult.full_text.length} chars)`);
          } else {
            console.log(`📺 Could not auto-fetch transcript for lesson ${lesson.id}: ${transcriptResult.error}`);
          }
        }).catch(err => {
          console.log(`📺 Transcript auto-fetch error for lesson ${lesson.id}:`, err.message);
        });
      }
      
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Helper function to sanitize text from CSV uploads (fixes encoding issues)
  // Preserves mathematical symbols like ×, ÷, subscripts, superscripts
  const sanitizeText = (text: string | undefined): string => {
    if (!text) return '';
    return text
      .replace(/[\u2018\u2019\u201A]/g, "'")        // Smart quotes to apostrophe
      .replace(/[\u201C\u201D\u201E]/g, '"')        // Smart double quotes to regular quotes
      .replace(/[\u2013\u2014]/g, '-')              // En/em dashes to hyphen
      .replace(/\u2026/g, '...')                    // Ellipsis to dots
      .replace(/\u00A0/g, ' ')                      // Non-breaking space to regular space
      .trim();
  };
  
  // Helper function to fix encoding issues in CSV content
  // Handles BOM, Windows-1252 to UTF-8 conversion, and common character replacements
  const fixCsvEncoding = (buffer: Buffer): string => {
    // Remove UTF-8 BOM if present
    let startOffset = 0;
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      startOffset = 3;
    }
    
    // First try UTF-8 decoding
    let content = buffer.slice(startOffset).toString('utf-8');
    
    // Check if we got replacement characters (U+FFFD) or suspicious patterns
    // This indicates the file was likely saved in Windows-1252/Latin-1
    const hasReplacementChars = content.includes('\uFFFD');
    const hasInvalidBytes = /[\x80-\x9F]/.test(content); // Windows-1252 control chars in UTF-8
    
    if (hasReplacementChars || hasInvalidBytes) {
      console.log('⚠️ Detected encoding issues, trying Windows-1252/Latin-1 decoding...');
      // Re-decode as Latin-1 (which is byte-transparent) then map Windows-1252 chars
      content = buffer.slice(startOffset).toString('latin1');
      
      // Map Windows-1252 specific characters (0x80-0x9F range) to Unicode
      const win1252Map: Record<number, string> = {
        0x80: '\u20AC', 0x82: '\u201A', 0x83: '\u0192', 0x84: '\u201E', 0x85: '\u2026', 0x86: '\u2020', 0x87: '\u2021',
        0x88: '\u02C6', 0x89: '\u2030', 0x8A: '\u0160', 0x8B: '\u2039', 0x8C: '\u0152', 0x8E: '\u017D',
        0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201C', 0x94: '\u201D', 0x95: '\u2022', 0x96: '\u2013', 0x97: '\u2014',
        0x98: '\u02DC', 0x99: '\u2122', 0x9A: '\u0161', 0x9B: '\u203A', 0x9C: '\u0153', 0x9E: '\u017E', 0x9F: '\u0178'
      };
      
      content = content.replace(/[\x80-\x9F]/g, (char) => {
        const code = char.charCodeAt(0);
        return win1252Map[code] || char;
      });
    }
    
    // Log sample of content to verify encoding
    const sampleChars = content.slice(0, 500);
    console.log('📋 CSV content sample (first 500 chars):', JSON.stringify(sampleChars));
    
    // Check if multiplication sign is present
    if (content.includes('×')) {
      console.log('✅ Multiplication sign (×) detected in CSV');
    } else if (content.includes('\u00D7')) {
      console.log('✅ Multiplication sign (U+00D7) detected in CSV');
    } else {
      console.log('⚠️ No multiplication sign found in CSV - may have been lost');
    }
    
    return content;
  };
  
  // Sanitize exercise text - preserve math symbols, fix common issues
  const sanitizeExerciseText = (text: string | undefined): string => {
    if (!text) return '';
    
    return text
      // Fix common encoding corruption for math symbols
      .replace(/Ã—/g, '×')              // Corrupted multiplication sign
      .replace(/Ã·/g, '÷')              // Corrupted division sign  
      .replace(/â‰¤/g, '≤')             // Corrupted less than or equal
      .replace(/â‰¥/g, '≥')             // Corrupted greater than or equal
      .replace(/â‰ /g, '≠')             // Corrupted not equal
      .replace(/â†'/g, '→')             // Corrupted arrow
      .replace(/Ï€/g, 'π')              // Corrupted pi
      .replace(/Î¸/g, 'θ')              // Corrupted theta
      .replace(/â€¦/g, '...')            // Corrupted ellipsis
      .replace(/â€"/g, '-')              // Corrupted em dash
      .replace(/â€"/g, '-')              // Corrupted en dash
      .replace(/â€™/g, "'")              // Corrupted apostrophe
      .replace(/â€œ/g, '"')              // Corrupted left quote
      .replace(/â€[^a-z]/g, '"')         // Corrupted right quote
      // Subscripts - fix common corrupted patterns
      .replace(/â‚€/g, '₀').replace(/â‚/g, '₁').replace(/â‚‚/g, '₂')
      .replace(/â‚ƒ/g, '₃').replace(/â‚„/g, '₄').replace(/â‚…/g, '₅')
      .replace(/â‚†/g, '₆').replace(/â‚‡/g, '₇').replace(/â‚ˆ/g, '₈')
      .replace(/â‚‰/g, '₉').replace(/â‚™/g, 'ₙ')
      // Superscripts
      .replace(/Â²/g, '²').replace(/Â³/g, '³')
      // Remove any remaining replacement characters
      .replace(/\uFFFD/g, '')
      // Smart quotes to regular
      .replace(/[\u2018\u2019\u201A]/g, "'")
      .replace(/[\u201C\u201D\u201E]/g, '"')
      // Non-breaking space
      .replace(/\u00A0/g, ' ')
      .trim();
  };

  // Bulk create lessons from CSV upload
  app.post("/api/syllabus-calendar/bulk", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { lessons } = req.body;
      
      if (!Array.isArray(lessons) || lessons.length === 0) {
        return res.status(400).json({ message: "Lessons array is required and cannot be empty" });
      }

      const createdLessons = [];
      const errors = [];
      
      for (let i = 0; i < lessons.length; i++) {
        const rawLessonData = lessons[i];
        // Sanitize text fields to fix encoding issues
        const lessonData = {
          ...rawLessonData,
          lessonTitle: sanitizeText(rawLessonData.lessonTitle),
          description: sanitizeText(rawLessonData.description),
          topicName: sanitizeText(rawLessonData.topicName),
          themeName: sanitizeText(rawLessonData.themeName),
        };
        
        try {
          // Find or create topic
          let topic = await storage.getTopicsByGradeAndSubject(lessonData.grade, lessonData.subject)
            .then(topics => topics.find(t => t.name.toLowerCase() === lessonData.topicName.toLowerCase()));
          
          if (!topic) {
            topic = await storage.createTopic({
              name: lessonData.topicName,
              description: `Auto-created from CSV upload: ${lessonData.topicName}`,
              grade: lessonData.grade,
              subject: lessonData.subject
            });
          }

          // Find or create theme
          let theme = await storage.getThemesByTopic(topic.id)
            .then(themes => themes.find(t => t.name.toLowerCase() === lessonData.themeName.toLowerCase()));
          
          if (!theme) {
            theme = await storage.createTheme({
              topicId: topic.id,
              name: lessonData.themeName,
              description: `Auto-created from CSV upload: ${lessonData.themeName}`
            });
          }

          // Create lesson with optional transcript from CSV
          const lesson = await storage.createSyllabusCalendar({
            date: lessonData.date,
            grade: lessonData.grade,
            subject: lessonData.subject,
            topicId: topic.id,
            themeId: theme.id,
            lessonTitle: lessonData.lessonTitle,
            description: lessonData.description || '',
            videoLink: lessonData.videoLink || '',
            videoTranscript: rawLessonData.transcript?.trim() || null,
            skills: Array.isArray(lessonData.skills) ? lessonData.skills : []
          });

          createdLessons.push(lesson);
        } catch (error) {
          console.error(`Error creating lesson ${i + 1}:`, error);
          errors.push(`Lesson ${i + 1}: ${error.message}`);
        }
      }

      if (errors.length > 0 && createdLessons.length === 0) {
        return res.status(400).json({ 
          message: "Failed to create any lessons", 
          errors: errors.slice(0, 10) // Limit to first 10 errors
        });
      }

      // Auto-fetch transcripts for lessons with video links but NO transcript from CSV (non-blocking, runs in background)
      const lessonsNeedingTranscripts = createdLessons.filter(l => l.videoLink && l.videoLink.trim() && !l.videoTranscript);
      const lessonsWithTranscripts = createdLessons.filter(l => l.videoTranscript);
      
      if (lessonsWithTranscripts.length > 0) {
        console.log(`📺 ${lessonsWithTranscripts.length} lessons already have transcripts from CSV`);
      }
      
      const lessonsWithVideos = lessonsNeedingTranscripts;
      if (lessonsWithVideos.length > 0) {
        console.log(`📺 Starting background transcript fetch for ${lessonsWithVideos.length} lessons with videos...`);
        
        // Process in batches to avoid overwhelming the system
        (async () => {
          let fetched = 0;
          let failed = 0;
          
          for (const lesson of lessonsWithVideos) {
            try {
              const transcriptResult = await fetchYouTubeTranscript(lesson.videoLink!);
              if (transcriptResult.success && transcriptResult.full_text) {
                await db.update(syllabusCalendar)
                  .set({ videoTranscript: transcriptResult.full_text, updatedAt: new Date() })
                  .where(eq(syllabusCalendar.id, lesson.id));
                fetched++;
                console.log(`📺 [${fetched}/${lessonsWithVideos.length}] Stored transcript for "${lesson.lessonTitle}"`);
              } else {
                failed++;
                console.log(`📺 [${fetched}/${lessonsWithVideos.length}] Failed: ${lesson.lessonTitle} - ${transcriptResult.error}`);
              }
              // Small delay between requests to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err: any) {
              failed++;
              console.log(`📺 Error fetching transcript for lesson ${lesson.id}:`, err.message);
            }
          }
          
          console.log(`📺 Bulk transcript fetch complete: ${fetched} success, ${failed} failed`);
        })();
      }

      res.status(201).json({
        message: `Successfully created ${createdLessons.length} lessons`,
        created: createdLessons.length,
        transcriptsFromCSV: lessonsWithTranscripts.length > 0 ? lessonsWithTranscripts.length : undefined,
        transcriptsFetching: lessonsWithVideos.length > 0 ? `Fetching transcripts for ${lessonsWithVideos.length} lessons in background` : undefined,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined
      });
    } catch (error) {
      console.error("Error in bulk lesson creation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update lesson
  app.put("/api/syllabus-calendar/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      const updates = insertSyllabusCalendarSchema.partial().parse(req.body);
      
      // If updating topic/theme, validate them
      if (updates.topicId && updates.themeId && updates.grade && updates.subject) {
        const isValid = await storage.validateTopicThemeForGradeSubject(
          updates.topicId, 
          updates.themeId, 
          updates.grade, 
          updates.subject
        );
        
        if (!isValid) {
          return res.status(400).json({ 
            message: "The selected topic and theme do not match the specified grade and subject" 
          });
        }
      }
      
      // Get current lesson to check if video link changed
      const currentLessons = await db.select().from(syllabusCalendar).where(eq(syllabusCalendar.id, lessonId));
      const currentLesson = currentLessons[0];
      
      const lesson = await storage.updateSyllabusCalendar(lessonId, updates);
      
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Auto-fetch transcript if video link is new or changed (non-blocking)
      const videoLinkChanged = updates.videoLink && updates.videoLink !== currentLesson?.videoLink;
      const hasVideoButNoTranscript = lesson.videoLink && !lesson.videoTranscript;
      
      if (lesson.videoLink && (videoLinkChanged || hasVideoButNoTranscript)) {
        fetchYouTubeTranscript(lesson.videoLink).then(async (transcriptResult) => {
          if (transcriptResult.success && transcriptResult.full_text) {
            console.log(`📺 Auto-fetched transcript for updated lesson ${lesson.id}: ${lesson.lessonTitle}`);
            await db.update(syllabusCalendar)
              .set({ videoTranscript: transcriptResult.full_text, updatedAt: new Date() })
              .where(eq(syllabusCalendar.id, lesson.id));
            console.log(`📺 Stored transcript (${transcriptResult.full_text.length} chars)`);
          } else {
            console.log(`📺 Could not auto-fetch transcript for lesson ${lesson.id}: ${transcriptResult.error}`);
          }
        }).catch(err => {
          console.log(`📺 Transcript auto-fetch error for lesson ${lesson.id}:`, err.message);
        });
      }
      
      res.json(lesson);
    } catch (error) {
      console.error("Error updating lesson:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete all lessons for a specific grade and subject
  app.delete("/api/lessons/delete-all", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete all lessons" });
      }

      const grade = req.query.grade as string;
      const subject = req.query.subject as string;

      if (!grade || !subject) {
        return res.status(400).json({ message: "Grade and subject are required" });
      }

      // Delete all lessons for this grade and subject
      const result = await db
        .delete(syllabusCalendar)
        .where(and(
          eq(syllabusCalendar.grade, grade),
          eq(syllabusCalendar.subject, subject)
        ))
        .returning({ id: syllabusCalendar.id });

      const deletedCount = result.length;

      console.log(`Deleted ${deletedCount} lessons for Grade ${grade} ${subject}`);

      res.json({ 
        message: `Successfully deleted ${deletedCount} lessons`,
        deletedCount 
      });
    } catch (error) {
      console.error("Error deleting all lessons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete lesson
  app.delete("/api/syllabus-calendar/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      const deleted = await storage.deleteSyllabusCalendar(lessonId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate topic/theme combination for grade/subject
  app.post("/api/validate-topic-theme", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { topicId, themeId, grade, subject } = req.body;
      
      if (!topicId || !themeId || !grade || !subject) {
        return res.status(400).json({ message: "All parameters are required" });
      }
      
      const isValid = await storage.validateTopicThemeForGradeSubject(
        parseInt(topicId), 
        parseInt(themeId), 
        grade, 
        subject
      );
      
      res.json({ valid: isValid });
    } catch (error) {
      console.error("Error validating topic/theme:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get specific class by ID
  app.get("/api/classes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access class details" });
      }

      const classId = parseInt(req.params.id);
      const classData = await storage.getClass(classId);
      
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if the teacher owns this class
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher || classData.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You can only access your own classes" });
      }

      // Add school information from teacher's affiliation and format grade
      const enrichedClassData = {
        ...classData,
        schoolName: teacher.schoolAffiliation,
        gradeLevel: `Grade ${classData.grade}`
      };

      res.json(enrichedClassData);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  // Get assignments (homework + exercises) for a specific class
  app.get("/api/classes/:id/assignments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log(`🔍 DEBUG: Assignments endpoint hit with classId: ${req.params.id}, user: ${req.user?.id}, role: ${req.user?.role}`);
      
      if (req.user?.role !== 'teacher') {
        console.log(`🚫 DEBUG: Access denied - user role is ${req.user?.role}, expected teacher`);
        return res.status(403).json({ message: "Only teachers can access class assignments" });
      }

      const classId = parseInt(req.params.id);
      const classData = await storage.getClass(classId);
      
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if the teacher owns this class
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher || classData.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You can only access your own classes" });
      }

      // Get students in this class for calculation purposes
      const students = await storage.getStudentsByClass(classId);
      const totalStudents = students.length;

      console.log(`🔍 Debug - Getting assignments for class ${classId}`);

      // Get homework for this class only
      const homeworkList = await db.select({
        id: homework.id,
        title: homework.title,
        description: homework.description,
        dueDate: homework.dueDate,
        createdAt: homework.createdAt,
        published: homework.published
      })
      .from(homework)
      .where(eq(homework.classId, classId))
      .orderBy(sql`${homework.createdAt} DESC`);

      console.log(`🔍 Debug - Found ${homeworkList.length} homework assignments for class ${classId}`);

      // Calculate submission statistics for homework
      const homeworkWithStats = await Promise.all(
        homeworkList.map(async (hw) => {
          const [submissionStats] = await db.select({
            submitted: sql<number>`COUNT(*)`.as('submitted'),
            avgScore: sql<number>`AVG(CASE WHEN ${homeworkSubmissions.totalMarks} > 0 THEN (${homeworkSubmissions.score} * 100.0 / ${homeworkSubmissions.totalMarks}) ELSE 0 END)`.as('avgScore')
          })
          .from(homeworkSubmissions)
          .innerJoin(classStudents, eq(homeworkSubmissions.studentId, classStudents.studentId))
          .where(and(
            eq(homeworkSubmissions.homeworkId, hw.id),
            eq(classStudents.classId, classId),
            eq(homeworkSubmissions.isCompleted, true)
          ));

          const submittedCount = Number(submissionStats?.submitted) || 0;
          const averageScore = Math.round(Number(submissionStats?.avgScore) || 0);

          return {
            id: hw.id.toString(),
            title: hw.title,
            description: hw.description,
            dueDate: hw.dueDate ? new Date(hw.dueDate).toISOString().split('T')[0] : null,
            type: "homework" as const,
            status: hw.published ? "active" as const : "draft" as const,
            totalPoints: 100, // Default points for homework
            submittedCount,
            totalStudents,
            averageScore
          };
        })
      );

      // Only return homework assignments created for this specific class
      res.json(homeworkWithStats);
    } catch (error) {
      console.error("Error fetching class assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Get classes for a teacher
  app.get("/api/classes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access classes" });
      }

      // Get teacher by user ID
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      const classes = await storage.getClassesByTeacher(teacher.id);
      
      // Add actual student count and assessment count for each class
      const classesWithStudentCount = await Promise.all(
        classes.map(async (classItem) => {
          const students = await storage.getStudentsByClass(classItem.id);
          
          // Rule 1: Count all homework relevant to this class
          const homeworkResults = await db.select({ count: sql<number>`count(*)` })
            .from(homework)
            .where(eq(homework.classId, classItem.id));
          
          // Rule 2: Count all exercises created by admin (exclude personalized/generated ones)
          // Admin-created exercises are those with generatedFor = null and isTutorial = false
          const exerciseResults = await db.select({ count: sql<number>`count(*)` })
            .from(exercises)
            .where(and(
              eq(exercises.grade, classItem.grade),
              eq(exercises.subject, classItem.subject),
              isNull(exercises.generatedFor), // Only admin-created exercises (not personalized)
              eq(exercises.isTutorial, false) // Exclude tutorial exercises
            ));
          
          /**
           * CRITICAL CALCULATION: Assessment Count Logic
           * 
           * @purpose Accurately counts assessments for teacher dashboard
           * @businessRules
           * - Rule 1: Count all homework for specific class (grade + subject)
           * - Rule 2: Count admin-created exercises only (exclude personalized/tutorial)
           * 
           * @dataIntegrity Uses Number() conversion to prevent string concatenation bug
           * @fixedIssue Previously: string concat caused inflated counts (354 instead of 40)
           * 
           * @validation
           * - homeworkResults: Homework assigned to this class
           * - exerciseResults: Admin exercises matching grade/subject, excluding tutorials
           * - Both counts converted to numbers before arithmetic addition
           * 
           * @lastFixed 2025-08 - String concatenation bug resolved
           * @testStatus ✅ Verified accurate numeric totals in teacher dashboard
           * @maintainer AI Learning Team
           */
          const homeworkCount = Number(homeworkResults[0]?.count) || 0;
          const exerciseCount = Number(exerciseResults[0]?.count) || 0;
          const totalAssessments = homeworkCount + exerciseCount;
          
          // Debug logging for assessment counts
          console.log(`📊 Class "${classItem.name}" assessment count:`, {
            classId: classItem.id,
            grade: classItem.grade,
            subject: classItem.subject,
            homeworkCount,
            exerciseCount,
            totalAssessments
          });
          
          // Calculate class average score using all-time data (no time filter)
          let classAverage = 0;
          
          // Get homework submissions for this class (all time)
          const homeworkSubmissionResults = await db
            .select({
              score: homeworkSubmissions.score,
              totalMarks: homeworkSubmissions.totalMarks
            })
            .from(homeworkSubmissions)
            .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
            .innerJoin(classStudents, eq(homeworkSubmissions.studentId, classStudents.studentId))
            .where(and(
              eq(classStudents.classId, classItem.id),
              eq(homework.classId, classItem.id),
              eq(homeworkSubmissions.isCompleted, true)
            ));
          
          // Get exercise submissions for this class (all time, excluding personalized ones)
          const exerciseSubmissionResults = await db
            .select({
              score: exerciseSubmissions.score,
              totalMarks: exerciseSubmissions.totalMarks
            })
            .from(exerciseSubmissions)
            .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
            .innerJoin(classStudents, eq(exerciseSubmissions.studentId, classStudents.studentId))
            .where(and(
              eq(classStudents.classId, classItem.id),
              eq(exercises.grade, classItem.grade),
              eq(exercises.subject, classItem.subject),
              isNull(exercises.generatedFor), // Exclude personalized exercises
              eq(exercises.isTutorial, false), // Exclude tutorial exercises
              eq(exerciseSubmissions.isCompleted, true)
            ));
          
          // Calculate average from all submissions using percentage method
          const allSubmissions = [...homeworkSubmissionResults, ...exerciseSubmissionResults];
          if (allSubmissions.length > 0) {
            const totalScoreSum = allSubmissions.reduce((sum, submission) => {
              const percentage = submission.totalMarks > 0 ? (submission.score / submission.totalMarks) * 100 : 0;
              return sum + percentage;
            }, 0);
            classAverage = Math.round(totalScoreSum / allSubmissions.length);
          }
          
          return {
            ...classItem,
            actualStudentCount: students.length,
            actualAssessmentCount: totalAssessments,
            classAverageScore: classAverage
          };
        })
      );
      
      res.json(classesWithStudentCount);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Create a new class
  app.post("/api/classes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can create classes" });
      }

      // Get teacher by user ID
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      // Generate unique class code
      const classCode = await storage.generateClassCode();

      const classData = insertClassSchema.parse({
        ...req.body,
        teacherId: teacher.id,
        classCode
      });

      const newClass = await storage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  // Update a class
  app.put("/api/classes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can update classes" });
      }

      const classId = parseInt(req.params.id);
      const existingClass = await storage.getClass(classId);
      
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Get teacher by user ID to verify ownership
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher || existingClass.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You can only update your own classes" });
      }

      const updates = insertClassSchema.partial().parse(req.body);
      const updatedClass = await storage.updateClass(classId, updates);
      
      if (!updatedClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      res.json(updatedClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating class:", error);
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  // Delete a class
  app.delete("/api/classes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can delete classes" });
      }

      const classId = parseInt(req.params.id);
      const existingClass = await storage.getClass(classId);
      
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Get teacher by user ID to verify ownership
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher || existingClass.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You can only delete your own classes" });
      }

      const deleted = await storage.deleteClass(classId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Class not found" });
      }

      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // Get recent activity for a specific class
  app.get("/api/classes/:id/recent-activity", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access class activity" });
      }

      const classId = parseInt(req.params.id);
      const classData = await storage.getClass(classId);
      
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if the teacher owns this class
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher || classData.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You can only access your own classes" });
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Format dates for SQL queries
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get students in this class
      const students = await storage.getStudentsByClass(classId);
      const studentIds = students.map(s => s.id);

      let activities = [];

      if (studentIds.length > 0) {
        // Get homework submissions for today
        const todayHomeworkSubs = await db.select({
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .where(and(
          eq(homework.classId, classId),
          inArray(homeworkSubmissions.studentId, studentIds),
          eq(homeworkSubmissions.isCompleted, true),
          sql`DATE(${homeworkSubmissions.completedAt}) = ${todayStr}`
        ));

        const todayHomeworkCount = Number(todayHomeworkSubs[0]?.count) || 0;

        // Get exercise submissions for today
        const todayExerciseSubs = await db.select({
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(and(
          eq(exercises.grade, classData.grade),
          eq(exercises.subject, classData.subject),
          inArray(exerciseSubmissions.studentId, studentIds),
          eq(exerciseSubmissions.isCompleted, true),
          sql`DATE(${exerciseSubmissions.completedAt}) = ${todayStr}`
        ));

        const todayExerciseCount = Number(todayExerciseSubs[0]?.count) || 0;

        // Add submission activities
        if (todayHomeworkCount > 0 || todayExerciseCount > 0) {
          const totalSubmissions = todayHomeworkCount + todayExerciseCount;
          activities.push({
            type: 'submission',
            message: `${totalSubmissions} assessment${totalSubmissions !== 1 ? 's' : ''} submitted today`,
            timeAgo: 'today',
            count: totalSubmissions
          });
        }

        // Check for submissions from yesterday
        const yesterdayHomeworkSubs = await db.select({
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .where(and(
          eq(homework.classId, classId),
          inArray(homeworkSubmissions.studentId, studentIds),
          eq(homeworkSubmissions.isCompleted, true),
          sql`DATE(${homeworkSubmissions.completedAt}) = ${yesterdayStr}`
        ));

        const yesterdayHomeworkCount = Number(yesterdayHomeworkSubs[0]?.count) || 0;

        if (yesterdayHomeworkCount > 0 && activities.length < 2) {
          activities.push({
            type: 'submission',
            message: `${yesterdayHomeworkCount} homework completed yesterday`,
            timeAgo: '1 day ago',
            count: yesterdayHomeworkCount
          });
        }
      }

      // Check for scheduled homework for tomorrow
      const tomorrowHomework = await db.select({
        count: sql<number>`COUNT(*)`.as('count')
      })
      .from(homework)
      .where(and(
        eq(homework.classId, classId),
        sql`DATE(${homework.dueDate}) = ${tomorrow.toISOString().split('T')[0]}`
      ));

      const tomorrowHomeworkCount = Number(tomorrowHomework[0]?.count) || 0;

      if (tomorrowHomeworkCount > 0 && activities.length < 2) {
        activities.push({
          type: 'lesson',
          message: `${tomorrowHomeworkCount} assignment${tomorrowHomeworkCount !== 1 ? 's' : ''} due tomorrow`,
          timeAgo: 'tomorrow',
          count: tomorrowHomeworkCount
        });
      } else if (activities.length < 2) {
        activities.push({
          type: 'lesson',
          message: 'No lessons scheduled for tomorrow',
          timeAgo: '',
          count: 0
        });
      }

      // Ensure we have exactly 2 activities displayed
      while (activities.length < 2) {
        activities.push({
          type: 'submission',
          message: 'No recent activity',
          timeAgo: '',
          count: 0
        });
      }

      res.json({ activities: activities.slice(0, 2) });
    } catch (error) {
      console.error("Error fetching class recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Public schools endpoint for registration (no auth required)
  app.get("/api/schools/public", async (req, res) => {
    try {
      const schools = await storage.getSchools();
      // Return only active schools with basic info for public registration
      const publicSchools = schools
        .filter(school => school.isActive)
        .map(school => ({
          id: school.id,
          name: school.name,
          province: school.province,
          district: school.district
        }));
      res.json(publicSchools);
    } catch (error) {
      console.error("Error fetching public schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // School management routes - Admin only
  app.get("/api/schools", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can access schools" });
      }

      const schools = await storage.getSchools();
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  app.post("/api/schools", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create schools" });
      }

      const schoolData = insertSchoolSchema.parse(req.body);
      const school = await storage.createSchool(schoolData);
      res.status(201).json(school);
    } catch (error) {
      console.error("Error creating school:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create school" });
    }
  });

  app.put("/api/schools/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update schools" });
      }

      const schoolId = parseInt(req.params.id);
      const updates = insertSchoolSchema.partial().parse(req.body);
      
      const school = await storage.updateSchool(schoolId, updates);
      
      if (!school) {
        return res.status(404).json({ message: "School not found" });
      }
      
      res.json(school);
    } catch (error) {
      console.error("Error updating school:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update school" });
    }
  });

  app.delete("/api/schools/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete schools" });
      }

      const schoolId = parseInt(req.params.id);
      const deleted = await storage.deleteSchool(schoolId);
      
      if (!deleted) {
        return res.status(404).json({ message: "School not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting school:", error);
      res.status(500).json({ message: "Failed to delete school" });
    }
  });

  // Organization management routes - Admin only
  app.get("/api/organizations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can access organizations" });
      }

      const orgs = await storage.getOrganizations();
      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get("/api/organizations/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can access organizations" });
      }

      const orgId = parseInt(req.params.id);
      const org = await storage.getOrganization(orgId);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(org);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post("/api/organizations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create organizations" });
      }

      // Convert date strings to Date objects or null (JSON serializes dates as strings)
      const body = { ...req.body };
      if (body.subscriptionStart) {
        body.subscriptionStart = new Date(body.subscriptionStart);
      } else {
        body.subscriptionStart = null;
      }
      if (body.subscriptionEnd) {
        body.subscriptionEnd = new Date(body.subscriptionEnd);
      } else {
        body.subscriptionEnd = null;
      }

      const orgData = insertOrganizationSchema.parse(body);
      const org = await storage.createOrganization(orgData);
      res.status(201).json(org);
    } catch (error) {
      console.error("Error creating organization:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.put("/api/organizations/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update organizations" });
      }

      // Convert date strings to Date objects or null (JSON serializes dates as strings)
      const body = { ...req.body };
      if (body.subscriptionStart !== undefined) {
        body.subscriptionStart = body.subscriptionStart ? new Date(body.subscriptionStart) : null;
      }
      if (body.subscriptionEnd !== undefined) {
        body.subscriptionEnd = body.subscriptionEnd ? new Date(body.subscriptionEnd) : null;
      }

      const orgId = parseInt(req.params.id);
      const updates = insertOrganizationSchema.partial().parse(body);
      
      const org = await storage.updateOrganization(orgId, updates);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(org);
    } catch (error) {
      console.error("Error updating organization:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  app.delete("/api/organizations/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete organizations" });
      }

      const orgId = parseInt(req.params.id);
      const deleted = await storage.deleteOrganization(orgId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Organization logo upload
  const orgLogoUpload = multer({ storage: multer.memoryStorage() });
  app.post("/api/organizations/:id/logo", authenticateToken, orgLogoUpload.single('logo'), async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can upload organization logos" });
      }

      const orgId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create uploads directory for org logos if it doesn't exist
      const logosDir = path.join(process.cwd(), 'uploads', 'org-logos');
      await fs.mkdir(logosDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname) || '.png';
      const filename = `org_${orgId}_logo_${timestamp}${ext}`;
      const filePath = path.join(logosDir, filename);

      // Save the file
      await fs.writeFile(filePath, req.file.buffer);

      // Update organization with logo URL
      const logoUrl = `/uploads/org-logos/${filename}`;
      const org = await storage.updateOrganization(orgId, { logoUrl });

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.json({ message: "Logo uploaded successfully", logoUrl, organization: org });
    } catch (error) {
      console.error("Error uploading organization logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // Organization status update
  app.patch("/api/organizations/:id/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update organization status" });
      }

      const orgId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['inactive', 'active', 'suspended', 'archived'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const org = await storage.updateOrganizationStatus(orgId, status);
      
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(org);
    } catch (error) {
      console.error("Error updating organization status:", error);
      res.status(500).json({ message: "Failed to update organization status" });
    }
  });

  // Organization Schools endpoints (for school-based access model)
  app.get("/api/organizations/:id/schools", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can view organization schools" });
      }

      const orgId = parseInt(req.params.id);
      const schools = await storage.getOrganizationSchools(orgId);
      res.json(schools);
    } catch (error) {
      console.error("Error fetching organization schools:", error);
      res.status(500).json({ message: "Failed to fetch organization schools" });
    }
  });

  app.post("/api/organizations/:id/schools", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can add schools to organizations" });
      }

      const orgId = parseInt(req.params.id);
      const { schoolId, allocatedSeats } = req.body;
      
      const orgSchool = await storage.addOrganizationSchool({
        organizationId: orgId,
        schoolId,
        allocatedSeats: allocatedSeats || 0
      });
      
      res.status(201).json(orgSchool);
    } catch (error) {
      console.error("Error adding school to organization:", error);
      res.status(500).json({ message: "Failed to add school to organization" });
    }
  });

  app.put("/api/organization-schools/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update organization schools" });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const orgSchool = await storage.updateOrganizationSchool(id, updates);
      
      if (!orgSchool) {
        return res.status(404).json({ message: "Organization school not found" });
      }
      
      res.json(orgSchool);
    } catch (error) {
      console.error("Error updating organization school:", error);
      res.status(500).json({ message: "Failed to update organization school" });
    }
  });

  app.delete("/api/organization-schools/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can remove schools from organizations" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.removeOrganizationSchool(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Organization school not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing school from organization:", error);
      res.status(500).json({ message: "Failed to remove school from organization" });
    }
  });

  // Organization Student Invites endpoints (for invited access model)
  app.get("/api/organizations/:id/invites", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can view organization invites" });
      }

      const orgId = parseInt(req.params.id);
      const invites = await storage.getOrganizationInvites(orgId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching organization invites:", error);
      res.status(500).json({ message: "Failed to fetch organization invites" });
    }
  });

  app.post("/api/organizations/:id/invites", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create organization invites" });
      }

      const orgId = parseInt(req.params.id);
      const { studentEmail, studentId, inviteStatus } = req.body;
      
      const invite = await storage.createOrganizationInvite({
        organizationId: orgId,
        studentEmail,
        studentId: studentId || null,
        inviteStatus: inviteStatus || 'pending'
      });
      
      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating organization invite:", error);
      res.status(500).json({ message: "Failed to create organization invite" });
    }
  });

  // Bulk invite endpoint for CSV uploads
  app.post("/api/organizations/:id/invites/bulk", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create organization invites" });
      }

      const orgId = parseInt(req.params.id);
      const { emails } = req.body;
      
      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "Please provide an array of emails" });
      }

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmails = emails.filter((email: string) => emailRegex.test(email?.trim()));
      const invalidEmails = emails.filter((email: string) => !emailRegex.test(email?.trim()));

      // Create invites for valid emails
      const results = {
        created: 0,
        duplicates: 0,
        errors: 0,
        invalidEmails: invalidEmails.length
      };

      for (const email of validEmails) {
        try {
          await storage.createOrganizationInvite({
            organizationId: orgId,
            studentEmail: email.trim(),
            studentId: null,
            inviteStatus: 'pending'
          });
          results.created++;
        } catch (error: any) {
          if (error.message?.includes('duplicate') || error.code === '23505') {
            results.duplicates++;
          } else {
            results.errors++;
          }
        }
      }

      res.status(201).json({
        message: `Processed ${emails.length} emails`,
        ...results
      });
    } catch (error) {
      console.error("Error creating bulk organization invites:", error);
      res.status(500).json({ message: "Failed to create bulk invites" });
    }
  });

  app.put("/api/organization-invites/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update organization invites" });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const invite = await storage.updateOrganizationInvite(id, updates);
      
      if (!invite) {
        return res.status(404).json({ message: "Organization invite not found" });
      }
      
      res.json(invite);
    } catch (error) {
      console.error("Error updating organization invite:", error);
      res.status(500).json({ message: "Failed to update organization invite" });
    }
  });

  app.delete("/api/organization-invites/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete organization invites" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOrganizationInvite(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Organization invite not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organization invite:", error);
      res.status(500).json({ message: "Failed to delete organization invite" });
    }
  });

  // Organization Access Codes endpoints (for open access model)
  app.get("/api/organizations/:id/access-codes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can view organization access codes" });
      }

      const orgId = parseInt(req.params.id);
      const codes = await storage.getOrganizationAccessCodes(orgId);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching organization access codes:", error);
      res.status(500).json({ message: "Failed to fetch organization access codes" });
    }
  });

  app.post("/api/organizations/:id/access-codes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create organization access codes" });
      }

      const orgId = parseInt(req.params.id);
      const { code, maxUses, expiresAt, isActive } = req.body;
      
      // Generate code if not provided
      const accessCode = code || Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const newCode = await storage.createOrganizationAccessCode({
        organizationId: orgId,
        code: accessCode,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false
      });
      
      res.status(201).json(newCode);
    } catch (error) {
      console.error("Error creating organization access code:", error);
      res.status(500).json({ message: "Failed to create organization access code" });
    }
  });

  // Public endpoint to validate access code (for registration)
  app.get("/api/access-code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const accessCode = await storage.getOrganizationAccessCodeByCode(code);
      
      if (!accessCode) {
        return res.status(404).json({ message: "Access code not found" });
      }
      
      // Check if expired
      if (accessCode.expiresAt && new Date(accessCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Access code has expired" });
      }
      
      // Check if max uses reached
      if (accessCode.maxUses && (accessCode.currentUses ?? 0) >= accessCode.maxUses) {
        return res.status(400).json({ message: "Access code has reached maximum uses" });
      }
      
      // Check if code is active
      if (!accessCode.isActive) {
        return res.status(400).json({ message: "Access code is not active" });
      }
      
      // Get organization details
      const org = await storage.getOrganization(accessCode.organizationId);
      
      res.json({
        valid: true,
        organizationId: accessCode.organizationId,
        organizationName: org?.name,
        code: accessCode.code
      });
    } catch (error) {
      console.error("Error validating access code:", error);
      res.status(500).json({ message: "Failed to validate access code" });
    }
  });

  app.put("/api/organization-access-codes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update organization access codes" });
      }

      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const code = await storage.updateOrganizationAccessCode(id, updates);
      
      if (!code) {
        return res.status(404).json({ message: "Organization access code not found" });
      }
      
      res.json(code);
    } catch (error) {
      console.error("Error updating organization access code:", error);
      res.status(500).json({ message: "Failed to update organization access code" });
    }
  });

  app.delete("/api/organization-access-codes/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete organization access codes" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deleteOrganizationAccessCode(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Organization access code not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organization access code:", error);
      res.status(500).json({ message: "Failed to delete organization access code" });
    }
  });

  // Student management endpoints
  // Get students in a class
  app.get("/api/classes/:classId/students", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access student lists" });
      }

      const classId = parseInt(req.params.classId);
      const students = await storage.getStudentsByClass(classId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching class students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate student enrollment endpoint
  app.post('/api/students/validate-enrollment', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can validate enrollment" });
      }

      const { idNumber, subject, grade } = req.body;
      
      if (!idNumber || !subject || !grade) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Find student by ID number
      const existingStudent = await storage.findStudentByIdNumber(idNumber);
      
      if (existingStudent) {
        // Check if already enrolled in this subject/grade
        const enrollment = await storage.isStudentEnrolledInSubjectGrade(
          existingStudent.id,
          subject,
          parseInt(grade)
        );
        
        if (enrollment.isEnrolled) {
          return res.json({
            hasConflict: true,
            className: enrollment.className,
            teacherName: enrollment.teacherName,
            studentName: `${existingStudent.firstName} ${existingStudent.lastName}`
          });
        }
        
        // Student exists but no enrollment conflict - inform user
        return res.json({
          hasConflict: false,
          existingStudent: true,
          studentName: `${existingStudent.firstName} ${existingStudent.lastName}`,
          studentGrade: existingStudent.gradeLevel,
          studentSchool: existingStudent.schoolName
        });
      }
      
      res.json({ hasConflict: false, existingStudent: false });
    } catch (error) {
      console.error('Error validating enrollment:', error);
      res.status(500).json({ message: 'Failed to validate enrollment' });
    }
  });

  // Search students by grade (school is optional)
  app.get("/api/students/search", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can search students" });
      }

      const { school, grade, term } = req.query;
      
      if (!grade) {
        return res.status(400).json({ message: "Grade parameter is required" });
      }

      const students = await storage.searchStudentsByGrade(
        grade as string, 
        term as string | undefined,
        school as string | undefined
      );
      
      // Get class information to check for enrollments in same subject/grade
      const classId = parseInt(req.query.classId as string || '0');
      let classInfo = null;
      if (classId) {
        classInfo = await storage.getClass(classId);
      }
      
      // Add enrollment status for each student
      const studentsWithEnrollmentStatus = await Promise.all(
        students.map(async (student) => {
          if (classInfo) {
            const enrollmentCheck = await storage.isStudentEnrolledInSubjectGrade(
              student.id,
              classInfo.subject,
              classInfo.grade
            );
            
            return {
              ...student,
              isEnrolledInSubjectGrade: enrollmentCheck.isEnrolled,
              existingEnrollment: enrollmentCheck.isEnrolled ? {
                className: enrollmentCheck.className,
                teacherName: enrollmentCheck.teacherName
              } : null
            };
          }
          return student;
        })
      );
      
      res.json(studentsWithEnrollmentStatus);
    } catch (error) {
      console.error("Error searching students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual student by ID
  app.get("/api/students/:studentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      const student = await storage.getStudentById(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add student to class
  app.post("/api/classes/:classId/students/:studentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can add students to classes" });
      }

      const classId = parseInt(req.params.classId);
      const studentId = parseInt(req.params.studentId);

      // Get class information to check subject and grade
      const classInfo = await storage.getClass(classId);
      if (!classInfo) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if student is already enrolled in ANY class for this subject and grade
      const subjectGradeEnrollment = await storage.isStudentEnrolledInSubjectGrade(
        studentId, 
        classInfo.subject, 
        classInfo.grade
      );

      if (subjectGradeEnrollment.isEnrolled) {
        return res.status(400).json({ 
          message: `Student is already enrolled in another ${classInfo.subject} class for Grade ${classInfo.grade}`,
          details: {
            existingClass: subjectGradeEnrollment.className,
            teacher: subjectGradeEnrollment.teacherName,
            subject: classInfo.subject,
            grade: classInfo.grade
          }
        });
      }

      // Check if student is already in this specific class (redundant but good for clarity)
      const isAlreadyEnrolled = await storage.isStudentInClass(classId, studentId);
      if (isAlreadyEnrolled) {
        return res.status(400).json({ message: "Student is already enrolled in this class" });
      }

      const enrollment = await storage.addStudentToClass(classId, studentId);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error adding student to class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove student from class
  app.delete("/api/classes/:classId/students/:studentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log("🗑️ Remove student request:", { classId: req.params.classId, studentId: req.params.studentId, user: req.user?.email });
      
      if (req.user?.role !== 'teacher') {
        console.log("❌ Unauthorized: User is not a teacher");
        return res.status(403).json({ message: "Only teachers can remove students from classes" });
      }

      const classId = parseInt(req.params.classId);
      const studentId = parseInt(req.params.studentId);
      
      console.log("🗑️ Attempting to remove student:", { classId, studentId });

      const removed = await storage.removeStudentFromClass(classId, studentId);
      console.log("🗑️ Remove result:", removed);
      
      if (!removed) {
        console.log("❌ Student not found in class");
        return res.status(404).json({ message: "Student not found in class" });
      }

      console.log("✅ Student removed successfully");
      res.json({ message: "Student removed from class successfully" });
    } catch (error) {
      console.error("❌ Error removing student from class:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new student and add to class
  app.post("/api/classes/:classId/students", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can create students" });
      }

      const classId = parseInt(req.params.classId);
      console.log("Request body received:", JSON.stringify(req.body, null, 2));
      const { students: studentDataList } = req.body;
      console.log("Extracted students array:", studentDataList);

      if (!Array.isArray(studentDataList) || studentDataList.length === 0) {
        console.log("Students array validation failed:", { 
          isArray: Array.isArray(studentDataList), 
          length: studentDataList?.length,
          type: typeof studentDataList 
        });
        return res.status(400).json({ message: "Students array is required" });
      }

      const createdStudents = [];
      const errors = [];

      // Get class information to check subject and grade
      const classInfo = await storage.getClass(classId);
      if (!classInfo) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Get teacher's name for the welcome email
      const teacher = await storage.getTeacherByUserId(req.user!.id);
      const teacherUser = await storage.getUser(req.user!.id);
      const teacherName = teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}` : 'their teacher';

      for (let i = 0; i < studentDataList.length; i++) {
        const studentData = studentDataList[i];
        
        try {
          // Check if student with this ID already exists (anywhere in the system)
          const existingStudent = await storage.findStudentByIdNumber(studentData.idNumber);
          
          if (existingStudent) {
            // Student ID already exists - check enrollment conflicts
            const subjectGradeEnrollment = await storage.isStudentEnrolledInSubjectGrade(
              existingStudent.id, 
              classInfo.subject, 
              classInfo.grade
            );

            if (subjectGradeEnrollment.isEnrolled) {
              errors.push(`Student ${studentData.firstName} ${studentData.lastName} (${studentData.idNumber}) is already enrolled in ${classInfo.subject} Grade ${classInfo.grade} (Class: ${subjectGradeEnrollment.className}, Teacher: ${subjectGradeEnrollment.teacherName})`);
            } else {
              // Check if already in this specific class
              const isInClass = await storage.isStudentInClass(classId, existingStudent.id);
              if (!isInClass) {
                await storage.addStudentToClass(classId, existingStudent.id);
                createdStudents.push({ ...existingStudent, action: 'added_existing' });
              } else {
                errors.push(`Student ${studentData.firstName} ${studentData.lastName} (${studentData.idNumber}) is already in this class`);
              }
            }
          } else {
            // Create new student and add to class
            const newStudent = await storage.createStudentUser(studentData);
            await storage.addStudentToClass(classId, newStudent.id);
            createdStudents.push({ ...newStudent, action: 'created_new' });

            // Check for school-based organization access
            const schoolName = studentData.school || classInfo.schoolName;
            if (schoolName) {
              try {
                const membership = await storage.grantSchoolBasedAccess(newStudent.id, schoolName);
                if (membership) {
                  console.log(`🎓 Student ${newStudent.id} received organization subscription access via school: ${schoolName}`);
                }
              } catch (orgError) {
                console.error(`⚠️ Failed to grant school-based access:`, orgError);
              }
            }

            // Send welcome email to parent if parent email is provided
            const parentEmail = studentData.parentEmail || studentData.parentContact;
            if (parentEmail && parentEmail.includes('@')) {
              // Send email asynchronously - don't block the response
              emailService.sendParentStudentAddedEmail({
                parentEmail: parentEmail,
                studentFirstName: studentData.firstName,
                studentLastName: studentData.lastName,
                schoolName: studentData.school || classInfo.schoolName || 'School',
                grade: studentData.grade || classInfo.grade,
                className: classInfo.name,
                subject: classInfo.subject,
                teacherName: teacherName
              }).catch(err => {
                console.error('Failed to send parent welcome email:', err);
              });
            }
          }
        } catch (error) {
          console.error(`Error processing student ${i + 1}:`, error);
          errors.push(`Student ${i + 1}: ${error.message}`);
        }
      }

      res.status(201).json({
        message: `Successfully processed ${createdStudents.length} students`,
        students: createdStudents,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error creating students:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Past Papers routes
  app.get("/api/past-papers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { subject, grade } = req.query;
      const papers = await storage.getPastPapers(
        subject as string,
        grade as string
      );
      res.json(papers);
    } catch (error) {
      console.error("Error fetching past papers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/past-papers/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const paper = await storage.getPastPaper(id);
      
      if (!paper) {
        return res.status(404).json({ message: "Past paper not found" });
      }
      
      res.json(paper);
    } catch (error) {
      console.error("Error fetching past paper:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/past-papers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only admins can upload past papers
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can upload past papers" });
      }

      const paperData = insertPastPaperSchema.parse({
        ...req.body,
        uploadedBy: req.user.id
      });
      
      const paper = await storage.createPastPaper(paperData);
      res.status(201).json(paper);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating past paper:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/past-papers/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only admins can delete past papers
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete past papers" });
      }

      const id = parseInt(req.params.id);
      const deleted = await storage.deletePastPaper(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Past paper not found" });
      }
      
      res.json({ message: "Past paper deleted successfully" });
    } catch (error) {
      console.error("Error deleting past paper:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Past Paper Questions routes
  app.get("/api/past-papers/:id/questions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const questions = await storage.getPastPaperQuestions(id);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching past paper questions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Extract questions from past paper PDF
  app.post("/api/past-papers/:id/extract", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only admins can extract questions
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can extract questions" });
      }

      const id = parseInt(req.params.id);
      const paper = await storage.getPastPaper(id);
      
      if (!paper) {
        return res.status(404).json({ message: "Past paper not found" });
      }

      // Update extraction status to processing
      await storage.updatePastPaper(id, { extractionStatus: 'processing' } as any);

      // Get the PDF as base64 for image conversion
      let pdfBase64: string;
      if (paper.fileUrl.startsWith('data:')) {
        pdfBase64 = paper.fileUrl;
      } else if (paper.fileUrl.startsWith('http')) {
        const fetchResponse = await fetch(paper.fileUrl);
        const arrayBuffer = await fetchResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        pdfBase64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
      } else {
        const fs = await import('fs');
        const buffer = fs.readFileSync(paper.fileUrl);
        pdfBase64 = `data:application/pdf;base64,${buffer.toString('base64')}`;
      }

      // Convert PDF to images for vision-based extraction
      console.log('📄 Converting PDF to images for vision-based extraction...');
      let pdfImages: string[] = [];
      try {
        pdfImages = await convertPdfToImages(pdfBase64);
        console.log(`✅ Converted PDF to ${pdfImages.length} page images`);
      } catch (pdfError) {
        console.error('❌ PDF to image conversion failed:', pdfError);
        await storage.updatePastPaper(id, { extractionStatus: 'failed' } as any);
        return res.status(400).json({ message: "Failed to convert PDF to images for processing" });
      }

      if (pdfImages.length === 0) {
        await storage.updatePastPaper(id, { extractionStatus: 'failed' } as any);
        return res.status(400).json({ message: "Could not extract any pages from PDF" });
      }

      // Call MCP service to extract questions using vision API
      const { mcpClientService } = await import('./mcp-client-service');
      const result = await mcpClientService.extractPastPaperQuestions(pdfImages, {
        subject: paper.subject,
        grade: paper.grade,
        paperType: paper.paperType,
        year: paper.year,
      });

      // Parse the MCP response
      let extractedData;
      if (result.status === 'failed' || !result.data) {
        console.error("Extraction failed:", result.error);
        await storage.updatePastPaper(id, { extractionStatus: 'failed' } as any);
        return res.status(500).json({ message: result.error || "Failed to extract questions" });
      }
      extractedData = result.data;

      // Save PDF page images to files for reference
      const savedPageImages = await savePdfPageImages(pdfImages, String(id));
      console.log(`📁 Saved ${savedPageImages.length} PDF page images to uploads/question-images/`);

      // Validate that at least one page image was saved (required for image associations)
      if (savedPageImages.length === 0) {
        console.error('❌ No PDF page images were saved - extraction cannot proceed');
        await storage.updatePastPaper(id, { extractionStatus: 'failed' } as any);
        return res.status(500).json({ message: "Failed to save PDF page images for question association" });
      }

      // Crop and save diagram images based on bounding boxes from AI
      // This creates cropped images containing only the diagrams, not full pages
      let questionImageMap: Map<string, string> = new Map();
      if (extractedData.imagesFound && extractedData.imagesFound.length > 0) {
        console.log(`📸 Processing ${extractedData.imagesFound.length} diagram images for cropping`);
        questionImageMap = await cropAndSaveDiagramImages(
          savedPageImages,
          extractedData.imagesFound,
          String(id)
        );
      }
      console.log(`📸 Image map keys: [${Array.from(questionImageMap.keys()).join(', ')}]`);

      // Delete existing questions for this paper (in case of re-extraction)
      await storage.deletePastPaperQuestions(id);

      // Track image association stats for logging
      let questionsWithImages = 0;
      let questionsWithMappedImages = 0;
      let questionsWithFallbackImages = 0;

      // Save extracted questions to database with image URLs
      const questionsToInsert = extractedData.questions.map((q: any, index: number) => {
        // Parse question number - handle decimals like 1.1, 1.2, etc.
        const qNumStr = String(q.questionNumber).trim();
        let mainQuestionNum: number;
        let subQuestionOf: number | null = q.subQuestionOf || null;
        
        if (qNumStr.includes('.')) {
          // Sub-question like 1.1, 2.3, Q9.1 - extract main number
          const parts = qNumStr.split('.');
          // Strip non-digits from question number parts (e.g., "Q9" -> "9")
          const mainNum = parseInt(parts[0].replace(/\D/g, '')) || 0;
          const subNum = parseInt((parts[1] || '0').replace(/\D/g, '')) || 0;
          mainQuestionNum = mainNum * 100 + subNum; // Store as 101, 102, 901 etc.
          subQuestionOf = mainNum; // Parent is the main question
        } else {
          // Strip non-digits for plain question numbers too (e.g., "QUESTION 7" -> "7")
          // Multiply by 100 to maintain proper sort order (Q13 = 1300, sorts after Q12.x = 1201, 1202...)
          const plainNum = parseInt(qNumStr.replace(/\D/g, '')) || (index + 1);
          mainQuestionNum = plainNum * 100; // Store as 1300 for Q13, 1400 for Q14, etc.
        }

        // Get image URL if this question has an image AND we have a proper mapping
        // Only assign imageUrl when we have an exact match from imagesFound to avoid showing wrong images
        let imageUrl = null;
        if (q.hasImage) {
          questionsWithImages++;
          // Try multiple key formats to find a match
          const keysToTry = [
            qNumStr,                                    // Original format: "2.3"
            String(mainQuestionNum),                    // Packed format: "203"
          ];
          
          let foundKey = null;
          for (const key of keysToTry) {
            const mappedUrl = questionImageMap.get(key);
            if (mappedUrl) {
              foundKey = key;
              imageUrl = mappedUrl;
              questionsWithMappedImages++;
              break;
            }
          }
          
          if (!imageUrl) {
            // No match found
            questionsWithFallbackImages++;
            console.log(`⚠️ Q${qNumStr} marked hasImage but no cropped image found (tried keys: ${keysToTry.join(', ')})`);
          }
        }
        
        return {
          pastPaperId: id,
          questionNumber: mainQuestionNum,
          questionText: q.questionText,
          questionType: q.questionType,
          answer: q.answer || null,
          options: q.options || null,
          marks: q.marks || 1,
          subQuestionOf: subQuestionOf,
          section: q.section || null,
          topic: q.topic || null,
          difficulty: q.difficulty || 'medium',
          imageUrl: imageUrl,
        };
      });

      console.log(`📊 Image association stats: ${questionsWithImages} with images, ${questionsWithMappedImages} mapped, ${questionsWithFallbackImages} fallback`);

      const savedQuestions = await storage.createPastPaperQuestions(questionsToInsert);

      // Update paper with extraction status and count
      await storage.updatePastPaper(id, { 
        extractionStatus: 'completed',
        extractedQuestionsCount: savedQuestions.length 
      } as any);

      console.log(`✅ Saved ${savedQuestions.length} questions for past paper ${id}`);

      res.json({
        message: "Questions extracted successfully",
        questionsCount: savedQuestions.length,
        questions: savedQuestions,
        metadata: {
          totalMarks: extractedData.totalMarks,
          sections: extractedData.sections,
          topicsFound: extractedData.topicsFound,
          imagesFound: extractedData.imagesFound?.length || 0,
          savedPageImages: savedPageImages.length,
        }
      });
    } catch (error) {
      console.error("Error extracting past paper questions:", error);
      // Update extraction status to failed
      const id = parseInt(req.params.id);
      await storage.updatePastPaper(id, { extractionStatus: 'failed' } as any).catch(() => {});
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Crop and save question image
  app.post("/api/past-paper-questions/:questionId/crop-image", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only admins can crop images
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can crop question images" });
      }

      const questionId = parseInt(req.params.questionId);
      const { imageUrl, cropX, cropY, cropWidth, cropHeight, originalWidth, originalHeight } = req.body;

      if (!imageUrl || cropX === undefined || cropY === undefined || 
          cropWidth === undefined || cropHeight === undefined ||
          originalWidth === undefined || originalHeight === undefined) {
        return res.status(400).json({ message: "Missing required crop parameters" });
      }

      // Get the question to find the paper ID
      const question = await storage.getPastPaperQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Determine if it's a URL or file path
      let imagePath: string;
      if (imageUrl.startsWith('/uploads/')) {
        // Local file path
        imagePath = path.join(process.cwd(), imageUrl);
      } else if (imageUrl.startsWith('http')) {
        // Remote URL - download first
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const tempPath = path.join(process.cwd(), 'uploads', 'temp_crop_source.png');
        const fs = await import('fs');
        fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
        imagePath = tempPath;
      } else {
        return res.status(400).json({ message: "Invalid image URL format" });
      }

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: "Source image file not found" });
      }

      // Use sharp to crop the image
      const sharp = (await import('sharp')).default;
      const imageBuffer = fs.readFileSync(imagePath);
      const metadata = await sharp(imageBuffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        return res.status(500).json({ message: "Could not read image dimensions" });
      }

      // Calculate actual pixel coordinates from percentages/ratios
      const scaleX = metadata.width / originalWidth;
      const scaleY = metadata.height / originalHeight;
      
      const actualX = Math.round(cropX * scaleX);
      const actualY = Math.round(cropY * scaleY);
      const actualWidth = Math.round(cropWidth * scaleX);
      const actualHeight = Math.round(cropHeight * scaleY);

      // Ensure bounds are valid
      const safeX = Math.max(0, Math.min(actualX, metadata.width - 1));
      const safeY = Math.max(0, Math.min(actualY, metadata.height - 1));
      const safeWidth = Math.min(actualWidth, metadata.width - safeX);
      const safeHeight = Math.min(actualHeight, metadata.height - safeY);

      if (safeWidth < 10 || safeHeight < 10) {
        return res.status(400).json({ message: "Crop area too small" });
      }

      // Create output directory
      const outputDir = path.join(process.cwd(), 'uploads', 'question-images');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate filename for cropped image
      const timestamp = Date.now();
      const croppedFilename = `q${questionId}_cropped_${timestamp}.png`;
      const croppedPath = path.join(outputDir, croppedFilename);

      // Crop and save
      await sharp(imageBuffer)
        .extract({ left: safeX, top: safeY, width: safeWidth, height: safeHeight })
        .png()
        .toFile(croppedPath);

      const croppedUrl = `/uploads/question-images/${croppedFilename}`;
      console.log(`✂️ Cropped image saved: ${croppedUrl} (${safeWidth}x${safeHeight})`);

      // Update question with new cropped image URL
      await storage.updatePastPaperQuestion(questionId, { imageUrl: croppedUrl });

      res.json({ 
        message: "Image cropped successfully",
        imageUrl: croppedUrl,
        dimensions: { width: safeWidth, height: safeHeight }
      });
    } catch (error) {
      console.error("Error cropping question image:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Add additional image to a question
  app.post("/api/past-paper-questions/:questionId/add-image", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can add question images" });
      }

      const questionId = parseInt(req.params.questionId);
      const { pageNumber } = req.body;

      if (!pageNumber) {
        return res.status(400).json({ message: "Page number is required" });
      }

      const question = await storage.getPastPaperQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Find the page image for this paper
      const pageImageUrl = `/uploads/question-images/${question.pastPaperId}_page_${pageNumber}.png`;
      
      // Check if file exists
      const fs = await import('fs');
      const imagePath = path.join(process.cwd(), pageImageUrl);
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ message: `Page ${pageNumber} image not found` });
      }

      // Add to additional images array
      const currentAdditional = (question as any).additionalImageUrls || [];
      if (!currentAdditional.includes(pageImageUrl)) {
        currentAdditional.push(pageImageUrl);
        await storage.updatePastPaperQuestion(questionId, { additionalImageUrls: currentAdditional } as any);
      }

      res.json({ 
        message: "Image added successfully",
        additionalImageUrls: currentAdditional
      });
    } catch (error) {
      console.error("Error adding question image:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Upload image to a question
  const questionUpload = multer({ storage: multer.memoryStorage() });
  app.post("/api/past-paper-questions/:questionId/upload-image", authenticateToken, questionUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can upload question images" });
      }

      const questionId = parseInt(req.params.questionId);
      const { imageType } = req.body; // 'primary' or 'additional'

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const question = await storage.getPastPaperQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `q${questionId}_upload_${timestamp}.png`;
      const imagesDir = path.join(process.cwd(), 'uploads', 'question-images');
      
      // Ensure directory exists
      const fs = await import('fs');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Save and convert to PNG
      const outputPath = path.join(imagesDir, filename);
      await sharp(req.file.buffer)
        .png()
        .toFile(outputPath);

      const imageUrl = `/uploads/question-images/${filename}`;
      console.log(`📤 Uploaded image saved: ${imageUrl}`);

      if (imageType === 'primary') {
        await storage.updatePastPaperQuestion(questionId, { imageUrl } as any);
        res.json({ message: "Primary image uploaded successfully", imageUrl });
      } else {
        // Add to additional images array
        const currentAdditional = (question as any).additionalImageUrls || [];
        currentAdditional.push(imageUrl);
        await storage.updatePastPaperQuestion(questionId, { additionalImageUrls: currentAdditional } as any);
        res.json({ message: "Additional image uploaded successfully", additionalImageUrls: currentAdditional });
      }
    } catch (error) {
      console.error("Error uploading question image:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Delete image from a question
  app.delete("/api/past-paper-questions/:questionId/delete-image", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete question images" });
      }

      const questionId = parseInt(req.params.questionId);
      const { imageType, imageIndex } = req.body; // imageType: 'primary' or 'additional', imageIndex for additional images

      const question = await storage.getPastPaperQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      if (imageType === 'primary') {
        // Delete primary image
        await storage.updatePastPaperQuestion(questionId, { imageUrl: null } as any);
        res.json({ message: "Primary image deleted successfully" });
      } else if (imageType === 'additional' && typeof imageIndex === 'number') {
        // Delete specific additional image
        const currentAdditional = (question as any).additionalImageUrls || [];
        if (imageIndex >= 0 && imageIndex < currentAdditional.length) {
          currentAdditional.splice(imageIndex, 1);
          await storage.updatePastPaperQuestion(questionId, { additionalImageUrls: currentAdditional } as any);
          res.json({ message: "Additional image deleted successfully", additionalImageUrls: currentAdditional });
        } else {
          return res.status(400).json({ message: "Invalid image index" });
        }
      } else {
        return res.status(400).json({ message: "Invalid image type or index" });
      }
    } catch (error) {
      console.error("Error deleting question image:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Get available page images for a past paper
  app.get("/api/past-papers/:id/page-images", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const paperId = parseInt(req.params.id);
      const fs = await import('fs');
      const imagesDir = path.join(process.cwd(), 'uploads', 'question-images');
      
      if (!fs.existsSync(imagesDir)) {
        return res.json({ pages: [] });
      }

      const files = fs.readdirSync(imagesDir);
      const pageImages = files
        .filter((f: string) => f.startsWith(`${paperId}_page_`) && f.endsWith('.png'))
        .map((f: string) => {
          const match = f.match(/_page_(\d+)\.png$/);
          return match ? {
            pageNumber: parseInt(match[1]),
            url: `/uploads/question-images/${f}`
          } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.pageNumber - b.pageNumber);

      res.json({ pages: pageImages });
    } catch (error) {
      console.error("Error fetching page images:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Past Paper Submission routes
  
  // Get baseline assessments with completion status for a student
  app.get("/api/student/past-papers-with-status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const student = await storage.getStudentByUserId(req.user!.id);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Get user to get grade
      const user = await storage.getUser(req.user!.id);
      const grade = user?.grade || '8';

      // Get baseline assessments for this student (from baseline_assessments table)
      const assessments = await storage.getBaselineAssessmentsByStudent(student.id);
      
      // Get the student's enrolled subjects
      const studentSubjects = await storage.getStudentSubjects(req.user!.id);
      
      // Create a map of subject -> assessment for quick lookup
      const assessmentMap = new Map(assessments.map(a => [a.subject, a]));

      // Build the response based on available subjects
      const subjectsToShow = studentSubjects.length > 0 ? studentSubjects : ['mathematics'];
      
      const assessmentsWithStatus = subjectsToShow.map(subject => {
        const assessment = assessmentMap.get(subject);
        return {
          id: assessment?.id || null,
          subject: subject,
          grade: grade,
          isCompleted: assessment?.status === 'completed',
          status: assessment?.status || 'not_started',
          overallScore: assessment?.overallScore || null,
          totalTopics: assessment?.totalTopics || null,
          completedTopics: assessment?.completedTopics || null,
          completedAt: assessment?.completedAt || null
        };
      });

      res.json(assessmentsWithStatus);
    } catch (error) {
      console.error("Error fetching baseline assessments with status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/past-paper-submissions/:paperId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const paperId = parseInt(req.params.paperId);
      
      // Get student ID from user profile (same approach as homework submission)
      const student = await storage.getStudentByUserId(req.user!.id);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const submission = await storage.getPastPaperSubmission(paperId, student.id);
      if (!submission) {
        return res.json({ isCompleted: false });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error fetching past paper submission:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/past-paper-submissions/:paperId/submit", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const paperId = parseInt(req.params.paperId);
      
      // Get student ID from user profile (same approach as homework submission)
      const student = await storage.getStudentByUserId(req.user!.id);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }
      const studentId = student.id;

      const { answers } = req.body;
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: "Answers array required" });
      }

      // Get past paper and questions for grading
      const paper = await storage.getPastPaper(paperId);
      if (!paper) {
        return res.status(404).json({ message: "Past paper not found" });
      }

      const allQuestions = await storage.getPastPaperQuestions(paperId);
      
      // Get the question IDs that were actually answered
      const answeredQuestionIds = new Set(answers.map((a: any) => a.questionId));
      
      // Use only the questions that have answers
      const questionsToGrade = allQuestions.filter(q => answeredQuestionIds.has(q.id));

      console.log('📝 Past paper submission - Using AI grading like homework');
      console.log(`📊 Paper: ${paper.title}, Total questions: ${allQuestions.length}, Questions with answers: ${questionsToGrade.length}`);

      // Format data for AI grading (must match grading.ts expected format)
      // grading.ts expects: question.id, question.points, question.question, question.correctAnswer
      // For past papers without model answers, pass empty string - the grading prompt handles this
      // by telling the AI to derive the correct answer from the question context
      const homeworkData = {
        questions: questionsToGrade.map((q: any) => ({
          id: q.id,
          points: q.marks || 1,
          question: q.questionText || '',
          correctAnswer: q.answer || '', // Empty string triggers AI to derive the answer
          questionType: q.questionType || 'unknown',
          options: q.options || null,
          imageUrl: q.imageUrl || null
        }))
      };

      // Format student answers for grading (grading.ts expects: questionId, answer, imageUrl)
      const studentAnswersData = answers.map((a: any) => ({
        questionId: a.questionId,
        answer: a.answer || a.textAnswer || '',
        imageUrl: a.imageDataUrl || null
      }));

      // Educational context for AI grading
      const educationalContext = {
        grade: paper.grade || '8',
        subject: paper.subject || 'mathematics',
        topic: paper.title || 'Past Paper',
        theme: paper.examBoard || 'General'
      };

      console.log('🤖 Calling AI grading for past paper...');
      
      // Use the centralized grading function (same as homework)
      const gradingResult = await gradeHomeworkSubmission(
        homeworkData,
        studentAnswersData,
        educationalContext
      );

      // Calculate total marks from ALL paper questions (not just answered ones)
      const paperTotalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      console.log('✅ AI grading complete:', {
        score: gradingResult.totalScore,
        answeredTotalMarks: gradingResult.totalPossible,
        paperTotalMarks: paperTotalMarks,
        answersCount: gradingResult.questionAnalysis?.length
      });

      // Use strengths and improvements from AI grading result
      const strengths: string[] = gradingResult.strengths || [];
      const areasForImprovement: string[] = gradingResult.improvements || [];

      // Calculate percentage based on PAPER total marks (all questions)
      const percentage = paperTotalMarks > 0 
        ? Math.round((gradingResult.totalScore / paperTotalMarks) * 100) 
        : 0;

      const overallFeedback = percentage >= 80 
        ? "Excellent performance! You've demonstrated a strong understanding of the material."
        : percentage >= 60
        ? "Good work! Review the incorrect answers to strengthen your understanding."
        : percentage >= 40
        ? "Keep practicing! Focus on the areas where you struggled."
        : "More practice is needed. Review the concepts and try again.";

      // Create or update submission with AI-generated feedback
      // Use paperTotalMarks (all questions) for proper percentage calculation
      const submission = await storage.createPastPaperSubmission({
        pastPaperId: paperId,
        studentId,
        answers,
        isCompleted: true,
        score: gradingResult.totalScore,
        totalMarks: paperTotalMarks,
        feedback: {
          overallFeedback,
          strengths,
          areasForImprovement,
          questionAnalysis: gradingResult.questionAnalysis || []
        }
      });

      res.json({
        ...submission,
        paper,
        questions: questionsToGrade,
        questionAnalysis: gradingResult.questionAnalysis || []
      });
    } catch (error) {
      console.error("Error submitting past paper:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
    }
  });

  // Exercises routes
  app.get("/api/exercises", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Add cache-busting headers to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const { date, startDate, endDate, grade, subject } = req.query;
      
      if (!grade) {
        // For debugging - only log first few characters to avoid spam
        if (Math.random() < 0.1) { // Log only 10% of invalid requests to avoid spam
          console.log('Invalid exercise request - no grade parameter');
        }
        return res.status(400).json({ message: "Grade is required" });
      }

      let exercises;
      
      if (startDate && endDate) {
        exercises = await storage.getExercisesByDateRange(
          startDate as string,
          endDate as string,
          grade as string, 
          subject as string | undefined
        );
      } else if (date) {
        exercises = await storage.getExercisesByDate(
          date as string, 
          grade as string, 
          subject as string | undefined
        );
      } else {
        return res.status(400).json({ message: "Must provide either 'date' or 'startDate' and 'endDate'" });
      }
      
      // Filter exercises based on user role and permissions
      if (req.user?.role === 'student') {
        const student = await storage.getStudentByUserId(req.user.id);
        if (student) {
          // For students: include only global exercises (generatedFor is null) 
          // and exercises specifically generated for them
          exercises = exercises.filter((ex: any) => 
            ex.generatedFor === null || ex.generatedFor === student.id
          );
          
          // Also include tutorial exercises generated for them
          const tutorialExercises = await storage.getTutorialExercisesForStudent(student.id, date as string);
          exercises = [...exercises, ...tutorialExercises];
        }
      } else {
        // For teachers, admins, and other roles: show only global exercises (not personalized ones)
        // Filter out exercises that were generated for specific students
        exercises = exercises.filter((ex: any) => ex.generatedFor === null);
      }
      
      console.log(`🔍 Exercises API response - Total: ${exercises.length}, Sample fields:`, exercises[0] ? Object.keys(exercises[0]) : 'No exercises');
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/exercises/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const exerciseId = parseInt(req.params.id);
      const exercise = await storage.getExercise(exerciseId);
      
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      res.json(exercise);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/exercises", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create exercises" });
      }

      console.log('POST /api/exercises - Full request body:', JSON.stringify(req.body, null, 2));

      const { questions, ...exerciseData } = req.body;
      
      console.log('POST /api/exercises - Extracted exerciseData:', JSON.stringify(exerciseData, null, 2));
      console.log('POST /api/exercises - Extracted questions:', JSON.stringify(questions, null, 2));
      
      if (!questions || questions.length === 0) {
        return res.status(400).json({ message: "At least one question is required" });
      }

      console.log('POST /api/exercises - About to validate exerciseData with schema');
      const validatedExercise = insertExerciseSchema.parse(exerciseData);
      console.log('POST /api/exercises - Exercise validation successful:', validatedExercise);
      
      console.log('POST /api/exercises - About to validate questions with schema');
      const validatedQuestions = questions.map((q: any) => {
        // Remove exerciseId and questionNumber as they will be set by the server
        const { exerciseId, questionNumber, ...questionData } = q;
        
        // Ensure topicId and themeId are valid (not 0 or null)
        if (!questionData.topicId || questionData.topicId === 0) {
          questionData.topicId = 1; // Default to first topic
        }
        if (!questionData.themeId || questionData.themeId === 0) {
          questionData.themeId = 1; // Default to first theme
        }
        
        return insertExerciseQuestionSchema.omit({ exerciseId: true, questionNumber: true }).parse(questionData);
      });
      console.log('POST /api/exercises - Questions validation successful:', validatedQuestions);

      const exercise = await storage.createExerciseWithQuestions(validatedExercise, validatedQuestions);
      res.status(201).json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation error details:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add question to existing exercise
  app.post("/api/exercises/:id/questions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can add questions to exercises" });
      }

      const exerciseId = parseInt(req.params.id);
      const questionData = insertExerciseQuestionSchema.parse(req.body);
      
      const question = await storage.addQuestionToExercise(exerciseId, questionData);
      res.status(201).json(question);
    } catch (error) {
      console.error("Error adding question to exercise:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get questions for a specific exercise
  app.get("/api/exercises/:id/questions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const exerciseId = parseInt(req.params.id);
      const questions = await storage.getExerciseQuestions(exerciseId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching exercise questions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Set up multer for CSV file upload
  const csvUpload = multer({ storage: multer.memoryStorage() });

  // Set up multer for question image uploads
  const questionImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/question-images/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      // Sanitize extension: only allow safe image extensions
      const mimeToExt: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
      };
      const ext = mimeToExt[file.mimetype] || 'jpg';
      cb(null, `question-${uniqueSuffix}.${ext}`);
    }
  });

  const questionImageUpload = multer({
    storage: questionImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
      }
    }
  });

  // Image upload endpoint for question images
  app.post("/api/exercises/upload-question-image", authenticateToken, questionImageUpload.single('image'), async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can upload question images" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Validate actual file content using binary signature
      const fs = await import('fs/promises');
      const fileBuffer = await fs.readFile(req.file.path);
      const fileType = await fileTypeFromBuffer(fileBuffer);
      
      // Verify the file is actually an image based on binary signature
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!fileType || !allowedMimes.includes(fileType.mime)) {
        // Delete the uploaded file
        await fs.unlink(req.file.path);
        return res.status(400).json({ 
          message: "Invalid file content. Only actual image files (JPEG, PNG, GIF, WebP) are allowed." 
        });
      }

      const imageUrl = `/uploads/question-images/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading question image:", error);
      // Clean up file if error occurs
      if (req.file?.path) {
        try {
          const fs = await import('fs/promises');
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file after error:", unlinkError);
        }
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CSV Upload endpoint for exercises
  app.post("/api/exercises/upload-csv", authenticateToken, csvUpload.single('csvFile'), async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can upload exercises" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      const grade = req.body.grade;
      const subject = req.body.subject;

      if (!grade || !subject) {
        return res.status(400).json({ message: "Grade and subject are required" });
      }

      // Fix encoding issues (BOM, Windows-1252, etc.)
      const csvContent = fixCsvEncoding(req.file.buffer);
      
      // TWO-PASS DELIMITER DETECTION:
      // Pass 1: Parse with columns:false to score data rows
      // Pass 2: Re-parse winner with columns:true and validate headers
      const requiredFields = ['topic', 'theme', 'question', 'answer', 'date', 'difficulty', 'marks'];
      
      let records;
      let delimiter;
      
      // PASS 1: Score both delimiters using raw parsing (columns:false)
      let tabPopulatedCells = 0;
      let tabHeaderMatches = 0;
      let tabRawRecords: any[];
      try {
        tabRawRecords = parse(csvContent, {
          delimiter: '\t',
          columns: false,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
          cast: false,
        });
        
        // Check header row quality (index 0)
        if (tabRawRecords && tabRawRecords.length > 0 && tabRawRecords[0]) {
          const headerRow = tabRawRecords[0];
          const normalizedHeaders = headerRow.map((h: any) => (h || '').toString().trim().toLowerCase());
          tabHeaderMatches = requiredFields.filter(field => normalizedHeaders.includes(field)).length;
        }
        
        // Count populated cells in data rows (skip header)
        const rowsToCheck = Math.min(11, tabRawRecords.length);
        for (let i = 1; i < rowsToCheck; i++) {
          const row = tabRawRecords[i];
          if (row && Array.isArray(row)) {
            row.forEach((value: any) => {
              if (value && value.toString().trim() !== '') {
                tabPopulatedCells++;
              }
            });
          }
        }
        
        console.log(`📊 TAB parse: ${tabHeaderMatches}/${requiredFields.length} headers, ${tabPopulatedCells} cells`);
      } catch (tabError) {
        console.log('Tab delimiter parsing failed:', (tabError as any).message);
        tabPopulatedCells = 0;
        tabHeaderMatches = 0;
      }
      
      let commaPopulatedCells = 0;
      let commaHeaderMatches = 0;
      let commaRawRecords: any[];
      try {
        commaRawRecords = parse(csvContent, {
          delimiter: ',',
          columns: false,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
          cast: false,
        });
        
        // Check header row quality (index 0)
        if (commaRawRecords && commaRawRecords.length > 0 && commaRawRecords[0]) {
          const headerRow = commaRawRecords[0];
          const normalizedHeaders = headerRow.map((h: any) => (h || '').toString().trim().toLowerCase());
          commaHeaderMatches = requiredFields.filter(field => normalizedHeaders.includes(field)).length;
        }
        
        // Count populated cells in data rows (skip header)
        const rowsToCheck = Math.min(11, commaRawRecords.length);
        for (let i = 1; i < rowsToCheck; i++) {
          const row = commaRawRecords[i];
          if (row && Array.isArray(row)) {
            row.forEach((value: any) => {
              if (value && value.toString().trim() !== '') {
                commaPopulatedCells++;
              }
            });
          }
        }
        
        console.log(`📊 COMMA parse: ${commaHeaderMatches}/${requiredFields.length} headers, ${commaPopulatedCells} cells`);
      } catch (commaError) {
        console.log('Comma delimiter parsing failed:', (commaError as any).message);
        commaPopulatedCells = 0;
        commaHeaderMatches = 0;
      }
      
      // SELECT WINNER: Primary=data cells, Tiebreaker=header matches
      const tabScore = tabPopulatedCells * 100 + tabHeaderMatches;
      const commaScore = commaPopulatedCells * 100 + commaHeaderMatches;
      
      if (tabScore > commaScore) {
        delimiter = '\t';
        console.log(`✅ Selected TAB delimiter (score: ${tabScore} vs ${commaScore})`);
      } else if (commaScore > tabScore) {
        delimiter = ',';
        console.log(`✅ Selected COMMA delimiter (score: ${commaScore} vs ${tabScore})`);
      } else {
        // Exact tie - default to comma
        delimiter = ',';
        console.log(`⚖️ Exact tie (score: ${tabScore}), defaulting to COMMA`);
      }
      
      // PASS 2: Re-parse with winning delimiter using columns:true
      try {
        records = parse(csvContent, {
          delimiter,
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
          cast: false,
        });
        
        console.log(`🔄 Re-parsed with ${delimiter === '\t' ? 'TAB' : 'COMMA'} delimiter, got ${records.length} records`);
      } catch (reparseError) {
        return res.status(400).json({ 
          message: `CSV re-parsing failed with ${delimiter === '\t' ? 'tab' : 'comma'} delimiter: ${(reparseError as any).message}` 
        });
      }
      
      if (!records || records.length === 0) {
        return res.status(400).json({ 
          message: 'CSV file must contain at least one data row' 
        });
      }

      // Get headers from first record (normalized to lowercase)
      const headers = Object.keys(records[0]).map(h => h.trim().toLowerCase());
      console.log('✅ Parsed headers:', headers);
      
      // Final validation - check all required fields are present
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      if (missingFields.length > 0) {
        console.log('❌ Missing fields:', missingFields);
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(', ')}. Found headers: [${headers.join(', ')}]`,
          requiredFields,
          foundHeaders: headers
        });
      }
      
      console.log(`✅ All ${requiredFields.length} required fields present, processing ${records.length} rows...`);

      const errors: string[] = [];
      const processed: any[] = [];
      let successCount = 0;
      let diagramsGenerated = 0;
      
      // Diagram template defaults for common math image types
      const diagramTemplates: Record<string, Record<string, any>> = {
        // Graph templates
        linear: { standard: { m: 1, c: 0 }, steep: { m: 3, c: 0 }, negative: { m: -1, c: 2 } },
        quadratic: { standard: { a: 1, b: 0, c: 0 }, parabola: { a: 1, b: -2, c: -3 }, inverted: { a: -1, b: 0, c: 4 } },
        trig: { sin: { function: 'sin', amplitude: 1 }, cos: { function: 'cos', amplitude: 1 }, tan: { function: 'tan', amplitude: 1 } },
        exponential: { standard: { base: 2, a: 1 }, growth: { base: 3, a: 1 }, decay: { base: 0.5, a: 1 } },
        logarithm: { natural: { base: 2.718, a: 1 }, base10: { base: 10, a: 1 }, base2: { base: 2, a: 1 } },
        hyperbola: { standard: { a: 1, c: 0 }, shifted: { a: 2, c: 1 } },
        // 2D Geometry templates
        triangle: { 
          standard: { points: [[0, 0], [4, 0], [2, 3]], labels: ['A', 'B', 'C'], showSides: true },
          right: { points: [[0, 0], [4, 0], [0, 3]], labels: ['A', 'B', 'C'], showSides: true },
          equilateral: { points: [[0, 0], [4, 0], [2, 3.46]], labels: ['A', 'B', 'C'], showSides: true },
          isosceles: { points: [[0, 0], [6, 0], [3, 4]], labels: ['A', 'B', 'C'], showSides: true }
        },
        circle: { standard: { radius: 3, showRadius: true }, unit: { radius: 1, showRadius: true }, large: { radius: 5, showRadius: true } },
        rectangle: { standard: { width: 6, height: 4 }, square: { width: 4, height: 4 }, wide: { width: 8, height: 3 } },
        angle: { acute: { angle1: 0, angle2: 45 }, right: { angle1: 0, angle2: 90 }, obtuse: { angle1: 0, angle2: 120 } },
        parallelLines: { 
          standard: { spacing: 3, transversalAngle: 60, showAngles: true },
          acute: { spacing: 3, transversalAngle: 45, showAngles: true },
          right: { spacing: 3, transversalAngle: 90, showAngles: true },
          obtuse: { spacing: 3, transversalAngle: 120, showAngles: true }
        },
        // 3D Shape templates
        cylinder: { standard: { radius: 2, height: 4 }, tall: { radius: 2, height: 6 }, wide: { radius: 3, height: 2 } },
        cube: { standard: { length: 3, width: 3, height: 3 } },
        prism: { standard: { length: 4, width: 3, height: 2 }, tall: { length: 2, width: 2, height: 5 } },
        cone: { standard: { radius: 2, height: 4 }, tall: { radius: 1.5, height: 5 }, wide: { radius: 3, height: 2 } },
        pyramid: { standard: { baseSize: 4, height: 5 }, tall: { baseSize: 3, height: 6 }, wide: { baseSize: 5, height: 3 } },
        sphere: { standard: { radius: 3 }, unit: { radius: 1 }, large: { radius: 5 } },
        // Other templates
        numberLine: { standard: { start: -10, end: 10 }, positive: { start: 0, end: 20 }, small: { start: -5, end: 5 } },
        coordinatePlane: { 
          standard: { points: [{ label: 'A', x: 2, y: 3 }, { label: 'B', x: -1, y: 2 }] },
          quadrants: { points: [{ label: 'P', x: 3, y: 4 }, { label: 'Q', x: -2, y: 3 }, { label: 'R', x: -3, y: -2 }, { label: 'S', x: 4, y: -1 }] }
        },
        fraction: { half: { numerator: 1, denominator: 2, shape: 'circle' }, quarter: { numerator: 1, denominator: 4, shape: 'circle' }, third: { numerator: 1, denominator: 3, shape: 'rectangle' } },
        venn: { two: { sets: 2 }, three: { sets: 3 } },
        pie: { standard: { values: [30, 20, 50], labels: ['A', 'B', 'C'], showPercentages: true } },
        bar: { standard: { values: [4, 7, 2, 5], labels: ['A', 'B', 'C', 'D'], title: 'Data' } },
        transformation: { translate: { transformation: 'translate' }, reflect: { transformation: 'reflect' }, rotate: { transformation: 'rotate' } }
      };
      
      // Helper function to generate diagram image
      async function generateDiagramImage(type: string, template: string | null, customParams: any): Promise<string | null> {
        try {
          // Get base params from template or use defaults
          let params: any = {};
          
          if (template && diagramTemplates[type]?.[template]) {
            params = { ...diagramTemplates[type][template] };
          } else if (diagramTemplates[type]?.standard) {
            params = { ...diagramTemplates[type].standard };
          }
          
          // Merge with custom params if provided
          if (customParams && typeof customParams === 'object') {
            params = { ...params, ...customParams };
          }
          
          // Parse string formats - match the main endpoint's format exactly
          // coordinatePlane expects: [{label, x, y}, ...]
          if (params.pointsStr && typeof params.pointsStr === 'string') {
            const points: { label: string; x: number; y: number }[] = [];
            const pointParts = params.pointsStr.trim().split(/\s+/);
            for (const part of pointParts) {
              const match = part.match(/^([A-Za-z0-9]+):(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
              if (match) {
                points.push({ label: match[1], x: parseFloat(match[2]), y: parseFloat(match[3]) });
              }
            }
            if (points.length > 0) {
              params.points = points;
            }
            delete params.pointsStr;
          }
          
          if (params.valuesStr && typeof params.valuesStr === 'string') {
            params.values = params.valuesStr.split(',').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v));
            delete params.valuesStr;
          }
          
          if (params.labelsStr && typeof params.labelsStr === 'string') {
            params.labels = params.labelsStr.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
            delete params.labelsStr;
          }
          
          if (params.verticesStr && typeof params.verticesStr === 'string') {
            const points: number[][] = [];
            const vertexParts = params.verticesStr.trim().split(/\s+/);
            for (const part of vertexParts) {
              const coords = part.split(',').map((c: string) => parseFloat(c.trim()));
              if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                points.push(coords);
              }
            }
            if (points.length >= 3) {
              params.points = points;
            }
            delete params.verticesStr;
          }
          
          // Run Python script
          const pythonScript = path.join(process.cwd(), 'server', 'python', 'math_image_generator.py');
          
          const result = await new Promise<{ success: boolean; imageUrl?: string; error?: string }>((resolve, reject) => {
            const python = spawn('python3', [pythonScript]);
            let stdout = '';
            let stderr = '';
            
            python.stdout.on('data', (data) => {
              stdout += data.toString();
            });
            
            python.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            python.on('close', (code) => {
              if (code === 0) {
                try {
                  const result = JSON.parse(stdout.trim());
                  resolve(result);
                } catch (e) {
                  resolve({ success: false, error: 'Failed to parse Python output' });
                }
              } else {
                resolve({ success: false, error: stderr || 'Python script failed' });
              }
            });
            
            python.on('error', (error) => {
              resolve({ success: false, error: error.message });
            });
            
            const inputData = JSON.stringify({ type, params });
            python.stdin.write(inputData);
            python.stdin.end();
            
            setTimeout(() => {
              python.kill();
              resolve({ success: false, error: 'Timeout' });
            }, 30000);
          });
          
          if (result.success && result.imageUrl) {
            return result.imageUrl;
          }
          console.log(`⚠️ Diagram generation failed for ${type}:`, result.error);
          return null;
        } catch (error) {
          console.log(`⚠️ Error generating diagram:`, error);
          return null;
        }
      }
      
      // Fetch holiday periods for checking
      const holidayPeriods = await storage.getSchoolHolidays();
      
      // Group questions by date first (store both title and questions)
      const questionsByDate: Map<string, { title: string; topic: string; questions: any[] }> = new Map();
      const topicCache: Map<string, any> = new Map();
      const themeCache: Map<string, any> = new Map();

      // Helper function to check if date falls within any holiday period
      function isHolidayDate(date: Date): boolean {
        const dateString = date.toISOString().split('T')[0];
        return holidayPeriods.some(holiday => {
          return dateString >= holiday.startDate && dateString <= holiday.endDate;
        });
      }

      // Helper function to skip weekends and holidays
      function skipWeekendsAndHolidays(date: Date): Date {
        let adjustedDate = new Date(date);
        
        // Keep moving forward until we find a valid day (not weekend, not holiday)
        let attempts = 0;
        const maxAttempts = 90; // Prevent infinite loop (3 months max)
        
        while (attempts < maxAttempts) {
          // Check if it's a weekend (Saturday = 6, Sunday = 0)
          const isWeekend = adjustedDate.getDay() === 0 || adjustedDate.getDay() === 6;
          
          // Check if it's a holiday
          const isHoliday = isHolidayDate(adjustedDate);
          
          if (!isWeekend && !isHoliday) {
            break; // Found a valid date
          }
          
          // Move to next day
          adjustedDate.setDate(adjustedDate.getDate() + 1);
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          console.warn(`Could not find valid date after ${maxAttempts} attempts starting from ${date.toISOString()}`);
        }
        
        return adjustedDate;
      }

      // First pass: collect and group questions by date
      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        try {
          // Normalize record keys to lowercase
          const rowData: any = {};
          Object.keys(record).forEach(key => {
            rowData[key.trim().toLowerCase()] = (record[key] || '').toString().trim();
          });

          // Find or create topic (with caching)
          const topicKey = `${rowData.topic.toLowerCase()}-${grade}-${subject}`;
          let topic = topicCache.get(topicKey);
          
          if (!topic) {
            topic = await storage.getTopicsByGradeAndSubject(grade, subject)
              .then(topics => topics.find(t => t.name.toLowerCase() === rowData.topic.toLowerCase()));
            
            if (!topic) {
              topic = await storage.createTopic({
                name: rowData.topic,
                description: `Auto-created from CSV upload: ${rowData.topic}`,
                grade: grade,
                subject: subject
              });
            }
            topicCache.set(topicKey, topic);
          }

          // Find or create theme (with caching)
          const themeKey = `${topic.id}-${rowData.theme.toLowerCase()}`;
          let theme = themeCache.get(themeKey);
          
          if (!theme) {
            theme = await storage.getThemesByTopic(topic.id)
              .then(themes => themes.find(t => t.name.toLowerCase() === rowData.theme.toLowerCase()));
            
            if (!theme) {
              theme = await storage.createTheme({
                topicId: topic.id,
                name: rowData.theme,
                description: `Auto-created from CSV upload: ${rowData.theme}`
              });
            }
            themeCache.set(themeKey, theme);
          }

          // Parse date directly from CSV (supports multiple formats)
          if (!rowData.date) {
            throw new Error('Date field is required');
          }
          
          // Parse date - supports YYYY-MM-DD, M/D/YYYY, MM/DD/YYYY formats
          let exerciseDate: Date;
          const dateStr = rowData.date.trim();
          
          // Check for YYYY-MM-DD format
          const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
          // Check for M/D/YYYY or MM/DD/YYYY format
          const usDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
          
          if (isoDateRegex.test(dateStr)) {
            exerciseDate = new Date(dateStr + 'T00:00:00');
          } else if (usDateRegex.test(dateStr)) {
            const match = dateStr.match(usDateRegex);
            if (match) {
              const month = parseInt(match[1], 10);
              const day = parseInt(match[2], 10);
              const year = parseInt(match[3], 10);
              exerciseDate = new Date(year, month - 1, day);
            } else {
              throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD or M/D/YYYY format`);
            }
          } else {
            throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD (e.g., 2025-07-24) or M/D/YYYY (e.g., 1/19/2026) format`);
          }
          
          // Check if date is valid
          if (isNaN(exerciseDate.getTime())) {
            throw new Error(`Invalid date: "${dateStr}". Please use a valid date`);
          }

          // Skip weekends and holidays
          const originalDate = new Date(exerciseDate);
          exerciseDate = skipWeekendsAndHolidays(exerciseDate);
          const dateString = exerciseDate.toISOString().split('T')[0];
          
          // Debug logging for date changes
          if (originalDate.getTime() !== exerciseDate.getTime()) {
            console.log(`📅 Date adjusted: ${originalDate.toISOString().split('T')[0]} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][originalDate.getDay()]}) → ${dateString} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][exerciseDate.getDay()]})`);
          }

          // Group question by date with title (fallback to topic if title not provided)
          const exerciseTitle = rowData.title || rowData.topic;
          
          if (!questionsByDate.has(dateString)) {
            questionsByDate.set(dateString, {
              title: exerciseTitle,
              topic: rowData.topic,
              questions: []
            });
          }

          // Check for diagram fields (optional)
          const diagramType = rowData.diagram_type || rowData.diagramtype || null;
          const diagramTemplate = rowData.diagram_template || rowData.diagramtemplate || null;
          let diagramParams = null;
          
          // Parse diagram_params if provided (can be JSON string)
          const rawParams = rowData.diagram_params || rowData.diagramparams || null;
          if (rawParams) {
            try {
              diagramParams = typeof rawParams === 'string' ? JSON.parse(rawParams) : rawParams;
            } catch (e) {
              // If not valid JSON, try to parse as simple key:value pairs
              diagramParams = {};
              const pairs = rawParams.split(';');
              for (const pair of pairs) {
                const [key, value] = pair.split(':').map((s: string) => s.trim());
                if (key && value) {
                  // Try to parse as number
                  const numValue = parseFloat(value);
                  diagramParams[key] = isNaN(numValue) ? value : numValue;
                }
              }
            }
          }
          
          // Generate diagram image if diagram_type is specified
          let questionImageUrl: string | null = null;
          if (diagramType && diagramTemplates[diagramType]) {
            questionImageUrl = await generateDiagramImage(diagramType, diagramTemplate, diagramParams);
            if (questionImageUrl) {
              diagramsGenerated++;
              console.log(`🖼️ Generated ${diagramType} diagram for row ${i + 1}`);
            }
          }

          questionsByDate.get(dateString)!.questions.push({
            topicId: topic.id,
            themeId: theme.id,
            question: sanitizeExerciseText(rowData.question),
            answer: sanitizeExerciseText(rowData.answer),
            marks: parseInt(rowData.marks) || 5,
            attachments: {},
            difficulty: rowData.difficulty,
            imageUrl: questionImageUrl
          });

        } catch (error) {
          errors.push(`Row ${i + 1}: ${(error as any).message}`);
        }
      }

      // Second pass: create exercises with grouped questions
      for (const [date, dateData] of questionsByDate) {
        try {
          // Calculate average difficulty from questions
          const difficulties = dateData.questions.map(q => q.difficulty).filter(d => d);
          const avgDifficulty = difficulties.length > 0 ? difficulties[0] : 'medium';

          const exerciseData = {
            date: date,
            grade: grade,
            subject: subject,
            title: dateData.title,
            description: `Exercise with ${dateData.questions.length} question${dateData.questions.length !== 1 ? 's' : ''}`,
            difficulty: avgDifficulty.toLowerCase() || 'medium',
            term: null,
            week: null
          };

          const exercise = await storage.createExerciseWithQuestions(exerciseData, dateData.questions);
          processed.push(exercise);
          successCount++;

        } catch (error) {
          errors.push(`Date ${date}: ${(error as any).message}`);
        }
      }

      res.json({
        message: `Processed ${successCount} exercises successfully (${questionsByDate.size} dates, ${Array.from(questionsByDate.values()).reduce((sum, d) => sum + d.questions.length, 0)} total questions${diagramsGenerated > 0 ? `, ${diagramsGenerated} diagrams generated` : ''})`,
        processed: successCount,
        total: records.length,
        diagramsGenerated,
        errors: errors
      });

    } catch (error) {
      console.error("Error uploading exercises CSV:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/exercises/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can update exercises" });
      }

      const exerciseId = parseInt(req.params.id);
      const { questions, ...exerciseData } = req.body;
      
      // If questions are provided, update exercise with questions
      if (questions && Array.isArray(questions)) {
        // Validate exercise data
        const validatedExerciseData = insertExerciseSchema.partial().parse(exerciseData);
        
        // Validate questions (omit exerciseId and questionNumber since they're set in storage)
        const validatedQuestions = z.array(insertExerciseQuestionSchema.omit({ exerciseId: true, questionNumber: true })).parse(questions);
        
        const exercise = await storage.updateExerciseWithQuestions(exerciseId, validatedExerciseData, validatedQuestions);
        
        if (!exercise) {
          return res.status(404).json({ message: "Exercise not found" });
        }
        
        res.json(exercise);
      } else {
        // Otherwise, just update exercise metadata
        const updates = insertExerciseSchema.partial().parse(exerciseData);
        
        const exercise = await storage.updateExercise(exerciseId, updates);
        
        if (!exercise) {
          return res.status(404).json({ message: "Exercise not found" });
        }
        
        res.json(exercise);
      }
    } catch (error) {
      console.error("Error updating exercise:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete all exercises for a specific grade and subject (MUST be before /:id route)
  app.delete("/api/exercises/delete-all", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete exercises" });
      }

      const grade = req.query.grade as string;
      const subject = req.query.subject as string;

      if (!grade || !subject) {
        return res.status(400).json({ message: "Grade and subject are required" });
      }

      // Get all exercises for this grade and subject
      const exerciseList = await db
        .select()
        .from(exercises)
        .where(and(
          eq(exercises.grade, grade),
          eq(exercises.subject, subject)
        ));

      const exerciseCount = exerciseList.length;

      if (exerciseCount === 0) {
        return res.json({ 
          message: "No exercises found for this grade and subject",
          deletedCount: 0 
        });
      }

      // Delete all exercises (cascade will handle questions)
      await db
        .delete(exercises)
        .where(and(
          eq(exercises.grade, grade),
          eq(exercises.subject, subject)
        ));
      
      res.json({ 
        message: `Successfully deleted ${exerciseCount} exercise(s)`,
        deletedCount: exerciseCount 
      });
    } catch (error) {
      console.error("Error deleting all exercises:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/exercises/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete exercises" });
      }

      const exerciseId = parseInt(req.params.id);
      const deleted = await storage.deleteExercise(exerciseId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      res.json({ message: "Exercise deleted successfully" });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Daily exercise generation tracking routes
  app.get("/api/student/daily-exercise-generations", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can check generation count" });
      }

      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const today = new Date().toISOString().split('T')[0];
      
      const [generation] = await db
        .select()
        .from(dailyExerciseGenerations)
        .where(and(
          eq(dailyExerciseGenerations.studentId, student.id),
          eq(dailyExerciseGenerations.generationDate, today)
        ));

      res.json({ 
        count: generation?.count || 0, 
        date: today,
        limit: 5 
      });
    } catch (error) {
      console.error("Error fetching daily generation count:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate adaptive exercise with daily limits
  app.post("/api/generate-adaptive-exercise", authenticateToken, async (req: AuthRequest, res) => {
    try {
      let student;
      let targetStudentId;

      if (req.user?.role === 'student') {
        // Student generating exercise for themselves
        student = await storage.getStudentByUserId(req.user.id);
        if (!student) {
          return res.status(404).json({ message: "Student profile not found" });
        }
        targetStudentId = student.id;
      } else if (req.user?.role === 'parent') {
        // Parent generating exercise for their child
        const { studentId } = req.body;
        if (!studentId) {
          return res.status(400).json({ message: "Student ID is required for parent requests" });
        }
        
        // Verify parent has access to this student
        const parent = await storage.getParentByUserId(req.user.id);
        if (!parent) {
          return res.status(404).json({ message: "Parent profile not found" });
        }
        
        // Get the child record to verify relationship
        const child = await storage.getChildByParentAndStudentUserId(parent.id, parseInt(studentId));
        if (!child) {
          return res.status(403).json({ message: "Access denied: Not your child" });
        }
        
        // Get the student record
        student = await storage.getStudentByUserId(parseInt(studentId));
        if (!student) {
          return res.status(404).json({ message: "Student profile not found" });
        }
        targetStudentId = student.id;
      } else {
        return res.status(403).json({ message: "Only students and parents can generate exercises" });
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Check current generation count for today
      const [existing] = await db
        .select()
        .from(dailyExerciseGenerations)
        .where(and(
          eq(dailyExerciseGenerations.studentId, targetStudentId),
          eq(dailyExerciseGenerations.generationDate, today)
        ));

      const currentCount = existing?.count || 0;
      
      // Check if limit is exceeded
      if (currentCount >= 5) {
        return res.status(429).json({ 
          message: "Daily limit reached", 
          limit: 5, 
          current: currentCount 
        });
      }

      // Handle both old format (with context) and new format (direct fields)
      const { context, feedbackAnalysis, originalQuestions, topic, subject } = req.body;
      
      // Get grade from student record
      const grade = student ? student.gradeLevel : context?.grade;
      const exerciseSubject = subject || context?.subject;
      const exerciseTopic = topic || context?.topic;
      
      if (!grade || !exerciseSubject) {
        return res.status(400).json({ message: "Missing required fields: grade and subject" });
      }
      
      console.log('🎯 Generating adaptive exercise with feedback context:', {
        grade: grade,
        subject: exerciseSubject,
        topic: exerciseTopic,
        improvementsCount: feedbackAnalysis?.improvements?.length || 0
      });

      // Generate the exercise using MCP service
      const generatedExercise = await mcpClientService.generateAdaptiveExercise(
        {
          grade: grade,
          subject: exerciseSubject,
          topic: exerciseTopic,
          difficulty: 'medium', // Use medium difficulty for adaptive exercises
          syllabus: context?.syllabus || 'CAPS'
        },
        feedbackAnalysis?.improvements || [],
        5 // Generate 5 questions
      );

      // Generate title using only the topic name (not the AI-generated title)
      const uniqueTitle = generateExerciseTitle(
        '', // Ignore AI-generated title to prevent concatenation
        exerciseTopic // Use the topic from request context
      );

      // Store the generated exercise in database
      const exerciseData = {
        date: today,
        grade: grade,
        subject: exerciseSubject,
        title: uniqueTitle,
        description: generatedExercise.description,
        difficulty: 'medium',
        isTutorial: false,
        hasInitialTutorial: true,
        tutorialContent: JSON.stringify({
          title: `${generatedExercise.title} - Tutorial`,
          description: "Step-by-step tutorial for the adaptive exercise",
          explanation: "This tutorial will help you understand the concepts before attempting the practice questions.",
          examples: feedbackAnalysis?.improvements?.slice(0, 3) || ["Practice the key concepts", "Work through examples step by step", "Apply what you've learned"]
        }),
        generatedFor: targetStudentId
      };

      const questionData = generatedExercise.questions.map((q: any, index: number) => ({
        topicId: 1, // Default topic ID - could be enhanced to match actual topic
        themeId: 1, // Default theme ID  
        question: q.question,
        answer: q.answer,
        marks: q.marks || 4,
        attachments: {}
      }));

      const exercise = await storage.createExerciseWithQuestions(exerciseData, questionData);

      // Update or create generation tracking record
      if (existing) {
        await db
          .update(dailyExerciseGenerations)
          .set({ 
            count: currentCount + 1, 
            lastGeneratedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(dailyExerciseGenerations.id, existing.id));
      } else {
        await db
          .insert(dailyExerciseGenerations)
          .values({
            studentId: targetStudentId,
            generationDate: today,
            count: 1,
            lastGeneratedAt: new Date()
          });
      }

      console.log('✅ Adaptive exercise generated and stored successfully');
      
      res.json({ 
        message: "Exercise generated successfully",
        exercise,
        remaining: 5 - (currentCount + 1)
      });

    } catch (error) {
      console.error("Error generating adaptive exercise:", error);
      res.status(500).json({ 
        message: "Failed to generate exercise",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==========================================
  // BASELINE ASSESSMENT ROUTES
  // ==========================================

  // Check if student needs baseline assessment
  app.get('/api/baseline-assessment/status', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId || req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can access baseline assessments" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Get all baseline assessments for this student
      const assessments = await storage.getBaselineAssessmentsByStudent(student.id);
      
      // Check which subjects have been completed
      const completedSubjects = assessments
        .filter(a => a.status === 'completed')
        .map(a => a.subject);
      
      const inProgressSubjects = assessments
        .filter(a => a.status === 'in_progress')
        .map(a => a.subject);

      // For assessments that are in_progress, check if they have exercises
      // If an in_progress assessment has 0 exercises, it means generation failed
      let hasValidAssessments = false;
      for (const assessment of assessments) {
        if (assessment.status === 'completed') {
          hasValidAssessments = true;
          break;
        }
        if (assessment.status === 'in_progress') {
          // Check if this assessment has any exercises
          const exercises = await storage.getBaselineExercises(assessment.id);
          if (exercises && exercises.length > 0) {
            hasValidAssessments = true;
            break;
          }
        }
      }

      // Student needs baseline if they have no valid assessments
      const needsBaseline = !hasValidAssessments;

      res.json({
        needsBaseline,
        assessments,
        completedSubjects,
        inProgressSubjects,
        studentGrade: student.gradeLevel
      });
    } catch (error) {
      console.error("Error checking baseline status:", error);
      res.status(500).json({ message: "Failed to check baseline status" });
    }
  });

  // Get history of completed baseline assessments for a student
  app.get('/api/baseline-assessment/history', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId || req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can access baseline assessment history" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Get all baseline assessments for this student
      const assessments = await storage.getBaselineAssessmentsByStudent(student.id);
      
      // Format assessments for the frontend
      const formattedAssessments = assessments
        .filter(a => a.status === 'completed')
        .map(a => ({
          id: a.id,
          subject: a.subject,
          score: a.totalScore || 0,
          totalMarks: a.totalMarks || 100,
          status: a.status,
          startedAt: a.startedAt,
          completedAt: a.completedAt
        }));

      res.json(formattedAssessments);
    } catch (error) {
      console.error("Error fetching baseline history:", error);
      res.status(500).json({ message: "Failed to fetch baseline history" });
    }
  });

  // Start a baseline assessment for a subject
  app.post('/api/baseline-assessment/start', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId || req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can start baseline assessments" });
      }

      const { subject } = req.body;
      if (!subject) {
        return res.status(400).json({ message: "Subject is required" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student || !student.gradeLevel) {
        return res.status(404).json({ message: "Student profile not found or grade not set" });
      }

      // Check if assessment already exists for this subject
      const existingAssessment = await storage.getBaselineAssessmentByStudentAndSubject(student.id, subject);
      if (existingAssessment) {
        // Check if the assessment has any exercises
        const existingExercises = await storage.getBaselineExercises(existingAssessment.id);
        
        if (existingExercises && existingExercises.length > 0) {
          // Assessment exists with exercises - return it
          return res.json({ 
            message: "Baseline assessment already exists",
            assessment: existingAssessment,
            exercises: existingExercises.map(e => ({
              exerciseId: e.id,
              topicId: e.baselineTopicId,
              topicName: e.title?.replace('Baseline Assessment: ', '') || 'Unknown',
              questionCount: 20
            })),
            totalTopics: existingAssessment.totalTopics,
            topicsGenerated: existingExercises.length
          });
        } else {
          // Assessment exists but has no exercises - delete it and recreate
          console.log(`🔄 Deleting empty baseline assessment ${existingAssessment.id} for student ${student.id}`);
          await storage.deleteBaselineAssessment(existingAssessment.id);
        }
      }

      // Find the best matching past paper for baseline assessment
      // Priority: 2-year-old final exam → 1-year-old final exam → any available
      const pastPaper = await storage.findBaselinePastPaper(student.gradeLevel, subject);
      
      if (!pastPaper) {
        return res.status(404).json({ 
          message: `No past papers found for Grade ${student.gradeLevel} ${subject}. Please ask your teacher to upload past papers.` 
        });
      }

      // Get questions from this past paper
      const pastPaperQuestions = await storage.getPastPaperQuestions(pastPaper.id);
      
      if (pastPaperQuestions.length === 0) {
        return res.status(404).json({ 
          message: `The past paper for Grade ${student.gradeLevel} ${subject} has no questions extracted yet.` 
        });
      }

      // Create the baseline assessment record
      const assessment = await storage.createBaselineAssessment({
        studentId: student.id,
        grade: student.gradeLevel,
        subject,
        status: 'in_progress',
        totalTopics: 1, // Single past paper instead of multiple topics
        completedTopics: 0,
        startedAt: new Date()
      });

      console.log(`📊 Creating baseline assessment for student ${student.id}, grade ${student.gradeLevel}, subject ${subject}`);
      console.log(`📄 Using past paper: "${pastPaper.title}" (${pastPaper.year}) with ${pastPaperQuestions.length} questions`);

      // Create a single exercise from the past paper questions
      const today = new Date().toISOString().split('T')[0];
      const createdExercises = [];

      try {
        // Get a topic for linking (use first available for this grade/subject)
        const allTopicsForGrade = await storage.getTopicsForGradeAndSubject(student.gradeLevel, subject);
        const firstTopic = allTopicsForGrade[0];

        // Create exercise in database
        const exerciseData = {
          date: today,
          grade: student.gradeLevel,
          subject,
          title: `Baseline Assessment: ${pastPaper.title}`,
          description: `Baseline assessment using ${pastPaper.year} ${pastPaper.title} to evaluate your current understanding`,
          difficulty: 'medium',
          isBaseline: true,
          baselineAssessmentId: assessment.id,
          baselineTopicId: firstTopic?.id || null,
          generatedFor: student.id
        };

        const questionData = pastPaperQuestions.map((q) => ({
          topicId: firstTopic?.id || 1,
          themeId: 1, 
          question: q.questionText,
          answer: '', // Past paper questions don't have model answers - AI will grade
          marks: q.marks || 5,
          imageUrl: q.imageUrl || null,
          attachments: q.options ? q.options : [] // Store options in attachments for TRUE/FALSE questions
        }));

        const exercise = await storage.createExerciseWithQuestions(exerciseData, questionData);
        createdExercises.push({
          exerciseId: exercise.id,
          topicId: firstTopic?.id || null,
          topicName: pastPaper.title,
          questionCount: questionData.length,
          pastPaperId: pastPaper.id,
          pastPaperYear: pastPaper.year
        });

        console.log(`✅ Created baseline exercise from past paper "${pastPaper.title}" with ${questionData.length} questions`);
      } catch (topicError) {
        console.error(`Error creating baseline exercise from past paper:`, topicError);
        return res.status(500).json({ 
          message: "Failed to create baseline exercise from past paper" 
        });
      }

      res.json({
        message: "Baseline assessment started",
        assessment,
        exercises: createdExercises,
        totalTopics: 1,
        topicsGenerated: createdExercises.length,
        pastPaper: {
          id: pastPaper.id,
          title: pastPaper.title,
          year: pastPaper.year,
          questionCount: pastPaperQuestions.length
        }
      });
    } catch (error) {
      console.error("Error starting baseline assessment:", error);
      res.status(500).json({ 
        message: "Failed to start baseline assessment",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get baseline assessment with exercises
  app.get('/api/baseline-assessment/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const assessment = await storage.getBaselineAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Baseline assessment not found" });
      }

      // Verify ownership
      const student = await storage.getStudentByUserId(userId);
      if (!student || assessment.studentId !== student.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all exercises for this baseline assessment
      const baselineExercises = await storage.getBaselineExercises(assessmentId);
      
      // Get submission status for each exercise with full questions
      const exercisesWithQuestions = await Promise.all(
        baselineExercises.map(async (exercise) => {
          const submission = await storage.getExerciseSubmission(exercise.id, student.id);
          const questions = await storage.getExerciseQuestions(exercise.id);
          const topic = await storage.getTopic(exercise.baselineTopicId || 0);
          
          return {
            id: exercise.id,
            title: exercise.title,
            description: exercise.description,
            baselineTopicId: exercise.baselineTopicId,
            topicName: topic?.name || 'Unknown Topic',
            questions: questions.map(q => ({
              id: q.id,
              question: q.question,
              marks: q.marks || 5,
              imageUrl: q.imageUrl || null,
              options: q.attachments || [] // Options stored in attachments for TRUE/FALSE questions
            })),
            isCompleted: submission?.isCompleted || false,
            score: submission?.score,
            totalMarks: submission?.totalMarks
          };
        })
      );

      res.json({
        assessment,
        exercises: exercisesWithQuestions
      });
    } catch (error) {
      console.error("Error fetching baseline assessment:", error);
      res.status(500).json({ message: "Failed to fetch baseline assessment" });
    }
  });

  // Update baseline assessment progress when an exercise is completed
  app.post('/api/baseline-assessment/update-progress', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { exerciseId, score, totalMarks } = req.body;
      const userId = req.user?.id;

      if (!userId || req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can update baseline progress" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Get the exercise to find its baseline assessment
      const exercise = await storage.getExercise(exerciseId);
      if (!exercise || !exercise.isBaseline || !exercise.baselineAssessmentId) {
        return res.status(400).json({ message: "Not a baseline assessment exercise" });
      }

      // Get the baseline assessment
      const assessment = await storage.getBaselineAssessment(exercise.baselineAssessmentId);
      if (!assessment || assessment.studentId !== student.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get topic info
      const topic = await storage.getTopic(exercise.baselineTopicId || 0);
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
      
      // Determine level based on score
      let level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
      if (percentage >= 70) level = 'advanced';
      else if (percentage >= 40) level = 'intermediate';

      // Update topic scores
      const existingScores = assessment.topicScores || [];
      const newTopicScore = {
        topicId: exercise.baselineTopicId || 0,
        topicName: topic?.name || 'Unknown',
        exerciseId,
        score,
        totalMarks,
        percentage,
        level
      };

      // Remove existing score for this topic if any, then add new one
      const updatedScores = [
        ...existingScores.filter(s => s.topicId !== newTopicScore.topicId),
        newTopicScore
      ];

      // Count completed exercises for this assessment
      const allBaselineExercises = await storage.getBaselineExercises(assessment.id);
      let completedCount = 0;
      
      for (const ex of allBaselineExercises) {
        const submission = await storage.getExerciseSubmission(ex.id, student.id);
        if (submission?.isCompleted) {
          completedCount++;
        }
      }

      // Calculate overall score
      const totalPercentage = updatedScores.length > 0
        ? Math.round(updatedScores.reduce((sum, s) => sum + s.percentage, 0) / updatedScores.length)
        : 0;

      // Determine overall level
      let overallLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
      if (totalPercentage >= 70) overallLevel = 'advanced';
      else if (totalPercentage >= 40) overallLevel = 'intermediate';

      // Check if all exercises are completed
      const isFullyCompleted = completedCount >= assessment.totalTopics;

      // Generate recommendations if completed
      let recommendations = assessment.recommendations;
      if (isFullyCompleted) {
        const weakAreas = updatedScores
          .filter(s => s.level === 'beginner')
          .map(s => s.topicName);
        const strengths = updatedScores
          .filter(s => s.level === 'advanced')
          .map(s => s.topicName);

        recommendations = {
          strengths,
          weakAreas,
          suggestedFocus: weakAreas.slice(0, 3),
          overallLevel
        };
      }

      // Update the assessment
      const updatedAssessment = await storage.updateBaselineAssessment(assessment.id, {
        completedTopics: completedCount,
        topicScores: updatedScores,
        overallScore: totalPercentage,
        recommendations,
        status: isFullyCompleted ? 'completed' : 'in_progress',
        completedAt: isFullyCompleted ? new Date() : undefined
      });

      res.json({
        message: "Progress updated",
        assessment: updatedAssessment,
        isCompleted: isFullyCompleted
      });
    } catch (error) {
      console.error("Error updating baseline progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Get baseline assessment results/summary
  app.get('/api/baseline-assessment/:id/results', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const assessment = await storage.getBaselineAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ message: "Baseline assessment not found" });
      }

      // Verify ownership
      const student = await storage.getStudentByUserId(userId);
      if (!student || assessment.studentId !== student.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Fetch exercises for this assessment and their submissions
      const exercises = await storage.getBaselineExercises(assessmentId);
      const results: any[] = [];

      for (const exercise of exercises) {
        // Get the submission for this exercise
        const submission = await storage.getExerciseSubmission(exercise.id, student.id);
        const questions = await storage.getExerciseQuestions(exercise.id);
        const topic = await storage.getTopic(exercise.baselineTopicId || 0);

        // Build graded answers from submission and questions
        const gradedAnswers: any[] = [];
        let totalScore = 0;
        let totalMarks = 0;

        if (submission && submission.answers) {
          for (const q of questions) {
            const studentAnswer = (submission.answers as any[]).find(
              (a: any) => String(a.questionId) === String(q.id)
            );
            const marks = q.marks || 1;
            totalMarks += marks;

            // Calculate earned marks based on stored submission
            const answerText = studentAnswer?.answer || '';
            const isCorrect = answerText.trim() !== '' && 
              (q.answer ? answerText.toLowerCase().trim() === q.answer.toLowerCase().trim() : true);
            const earnedMarks = isCorrect ? marks : 0;
            totalScore += earnedMarks;

            gradedAnswers.push({
              questionId: q.id,
              questionText: q.question || '',
              studentAnswer: answerText,
              earnedMarks,
              maxMarks: marks,
              feedback: '',
              isCorrect: earnedMarks > 0,
              correctAnswer: q.answer || ''
            });
          }
        }

        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
        let level: string = 'beginner';
        if (percentage >= 70) level = 'advanced';
        else if (percentage >= 40) level = 'intermediate';

        results.push({
          exerciseId: exercise.id,
          topicName: topic?.name || exercise.title?.replace('Baseline Assessment: ', '') || 'Unknown Topic',
          score: submission?.score || totalScore,
          totalMarks: submission?.totalMarks || totalMarks,
          percentage,
          level,
          gradedAnswers
        });
      }

      // Calculate overall score
      const overallScore = assessment.overallScore || 
        (results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length) : 0);
      
      let overallLevel = 'beginner';
      if (overallScore >= 70) overallLevel = 'advanced';
      else if (overallScore >= 40) overallLevel = 'intermediate';

      res.json({
        assessmentId,
        results,
        overallScore,
        overallLevel,
        topicsCompleted: results.length,
        grade: student.gradeLevel,
        subject: assessment.subject
      });
    } catch (error) {
      console.error("Error fetching baseline results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  // Submit entire baseline assessment
  app.post('/api/baseline-assessment/:id/submit', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const userId = req.user?.id;
      const { exercises: submittedExercises } = req.body;

      if (!userId || req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can submit baseline assessments" });
      }

      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const assessment = await storage.getBaselineAssessment(assessmentId);
      if (!assessment || assessment.studentId !== student.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const results: Array<{
        exerciseId: number;
        topicName: string;
        score: number;
        totalMarks: number;
        percentage: number;
        level: string;
      }> = [];

      // Process each exercise submission
      for (const exSubmission of submittedExercises) {
        const exerciseId = exSubmission.exerciseId;
        const answers = exSubmission.answers || [];

        const exercise = await storage.getExercise(exerciseId);
        if (!exercise) continue;

        const questions = await storage.getExerciseQuestions(exerciseId);
        const topic = await storage.getTopic(exercise.baselineTopicId || 0);

        // Use AI to grade the answers
        let totalScore = 0;
        let totalMarks = 0;
        const gradedAnswers: any[] = [];
        const questionAnalysis: any[] = [];

        // Import grading function
        const { gradeHomeworkSubmission } = await import('./grading');

        // Prepare questions for grading
        const questionsForGrading = questions.map(q => {
          // For TRUE/FALSE questions, options are stored in attachments
          const options = q.attachments || [];
          const isTrueFalse = options.length === 2 && options.includes('TRUE') && options.includes('FALSE');
          
          return {
            id: String(q.id),
            question: q.question,
            points: q.marks || 1,
            correctAnswer: q.answer || '', // May be empty for past paper questions
            answerType: isTrueFalse ? 'truefalse' : 'text',
            topicName: topic?.name
          };
        });

        // Prepare student answers for grading (ensure questionId is string for matching)
        const studentAnswersForGrading = answers.map((a: any) => ({
          questionId: String(a.questionId),
          answer: a.answer || '',
          imageUrl: a.imageUrl
        }));

        // Use AI grading
        try {
          const gradingResult = await gradeHomeworkSubmission(
            { questions: questionsForGrading },
            studentAnswersForGrading,
            {
              grade: student.gradeLevel,
              subject: exercise.subject,
              topic: topic?.name || 'General'
            }
          );

          totalScore = gradingResult.totalScore;
          totalMarks = gradingResult.totalPossible;

          // Map question analysis to graded answers
          for (const q of questions) {
            const analysis = gradingResult.questionAnalysis.find(a => a.questionId === String(q.id));
            // Handle both string and number questionId from frontend
            const studentAnswer = answers.find((a: any) => String(a.questionId) === String(q.id))?.answer || '';
            
            gradedAnswers.push({
              questionId: q.id,
              questionText: q.question || '',
              studentAnswer,
              earnedMarks: analysis?.points || 0,
              maxMarks: analysis?.maxPoints || q.marks || 1,
              feedback: analysis?.feedback || '',
              isCorrect: analysis?.isCorrect || false,
              correctAnswer: analysis?.correctAnswer || ''
            });

            questionAnalysis.push({
              questionId: String(q.id),
              isCorrect: analysis?.isCorrect || false,
              points: analysis?.points || 0,
              maxPoints: analysis?.maxPoints || q.marks || 1,
              feedback: analysis?.feedback || '',
              correctAnswer: analysis?.correctAnswer || '',
              explanation: analysis?.explanation || ''
            });
          }

          // Create exercise submission
          await storage.createExerciseSubmission({
            exerciseId,
            studentId: student.id,
            answers: gradedAnswers.map(a => ({
              questionId: a.questionId.toString(),
              answer: a.studentAnswer
            })),
            score: totalScore,
            totalMarks,
            isCompleted: true,
            gradingComplete: true,
            feedback: {
              strengths: gradingResult.strengths,
              improvements: gradingResult.improvements,
              questionAnalysis
            }
          });
        } catch (gradingError) {
          console.error('AI grading error, using simple grading:', gradingError);
          // Fallback: simple grading for TRUE/FALSE questions
          for (const q of questions) {
            const studentAnswer = answers.find((a: any) => String(a.questionId) === String(q.id))?.answer || '';
            const marks = q.marks || 1;
            totalMarks += marks;
            
            // For TRUE/FALSE, check if answer matches expected format
            const earnedMarks = studentAnswer.trim() ? marks : 0;
            totalScore += earnedMarks;
            
            gradedAnswers.push({
              questionId: q.id,
              questionText: q.question || '',
              studentAnswer,
              earnedMarks,
              maxMarks: marks,
              feedback: '',
              isCorrect: earnedMarks > 0,
              correctAnswer: q.answer || ''
            });
          }

          await storage.createExerciseSubmission({
            exerciseId,
            studentId: student.id,
            answers: gradedAnswers.map(a => ({
              questionId: a.questionId.toString(),
              answer: a.studentAnswer
            })),
            score: totalScore,
            totalMarks,
            isCompleted: true,
            gradingComplete: true
          });
        }

        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
        let level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
        if (percentage >= 70) level = 'advanced';
        else if (percentage >= 40) level = 'intermediate';

        results.push({
          exerciseId,
          topicName: topic?.name || 'Unknown Topic',
          score: totalScore,
          totalMarks,
          percentage,
          level,
          gradedAnswers
        });
      }

      // Calculate overall results
      const totalScore = results.reduce((sum, r) => sum + r.score, 0);
      const totalMarks = results.reduce((sum, r) => sum + r.totalMarks, 0);
      const overallPercentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
      
      let overallLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
      if (overallPercentage >= 70) overallLevel = 'advanced';
      else if (overallPercentage >= 40) overallLevel = 'intermediate';

      // Update assessment with final results
      await storage.updateBaselineAssessment(assessmentId, {
        completedTopics: results.length,
        topicScores: results.map(r => ({
          topicId: 0,
          topicName: r.topicName,
          score: r.score,
          totalMarks: r.totalMarks,
          percentage: r.percentage,
          level: r.level
        })),
        overallScore: overallPercentage,
        status: 'completed',
        completedAt: new Date(),
        recommendations: {
          strengths: results.filter(r => r.level === 'advanced').map(r => r.topicName),
          weakAreas: results.filter(r => r.level === 'beginner').map(r => r.topicName),
          suggestedFocus: results.filter(r => r.level === 'beginner').slice(0, 3).map(r => r.topicName),
          overallLevel
        }
      });

      res.json({
        message: "Baseline assessment submitted successfully",
        assessmentId,
        results,
        overallScore: overallPercentage,
        overallLevel,
        topicsCompleted: results.length,
        grade: student.gradeLevel,
        subject: assessment.subject
      });
    } catch (error) {
      console.error("Error submitting baseline assessment:", error);
      res.status(500).json({ message: "Failed to submit baseline assessment" });
    }
  });

  // ==========================================
  // END BASELINE ASSESSMENT ROUTES
  // ==========================================

  // Generate unlimited exercise for students (no daily limit checking)
  app.post('/api/generate-adaptive-exercise-unlimited', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { topic, subject } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!topic || !subject) {
        return res.status(400).json({ message: "Missing required fields: topic and subject" });
      }

      // Get student record for grade
      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const grade = student.gradeLevel;
      const today = new Date().toISOString().split('T')[0];
      
      // Check current generation count for today
      const [existing] = await db
        .select()
        .from(dailyExerciseGenerations)
        .where(and(
          eq(dailyExerciseGenerations.studentId, student.id),
          eq(dailyExerciseGenerations.generationDate, today)
        ));

      const currentCount = existing?.count || 0;
      
      // Check if limit is exceeded
      if (currentCount >= 5) {
        return res.status(429).json({ 
          message: "Daily limit reached", 
          limit: 5, 
          current: currentCount 
        });
      }

      console.log('🎯 Generating exercise with tutorial (count tracking):', {
        grade,
        subject,
        topic,
        currentCount,
        remaining: 5 - currentCount - 1
      });

      // Define educational context
      const context = {
        grade: grade || '8',
        subject: subject || 'mathematics',
        topic: topic || 'Mathematics',
        difficulty: 'medium' as const,
        syllabus: 'CAPS' as const
      };

      // STEP 1: Generate tutorial first via MCP (for rich 3-step tutorial)
      console.log('🎓 Generating tutorial with MCP server for topic:', topic);
      const tutorialData = await mcpClientService.generateTutorial(
        context,
        [`Practice and master ${topic}`], // Generic improvement area for topic mastery
        [] // targetConcepts - empty for general practice
      );

      // STEP 2: Then generate adaptive exercise
      console.log('🏋️ Generating practice exercise with MCP server');
      const generatedExercise = await mcpClientService.generateAdaptiveExercise(
        context,
        [`Practice ${topic} concepts`], // Generic improvement for general practice
        5 // Generate 5 questions
      );

      // Generate unique, descriptive title with time format: "(HH:MM MMM DD)"
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[now.getMonth()];
      const day = now.getDate();
      const uniqueTitle = `AI Practice: ${topic} (${hours}:${minutes} ${month} ${day})`;

      // Store the generated exercise in database WITH tutorial content
      const exerciseData = {
        date: today,
        grade,
        subject,
        title: uniqueTitle,
        description: generatedExercise.description,
        difficulty: 'medium',
        isTutorial: false,
        hasInitialTutorial: true,
        tutorialContent: JSON.stringify(tutorialData), // Store rich tutorial data
        generatedFor: student.id
      };

      const questionData = generatedExercise.questions.map((q: any, index: number) => ({
        topicId: 1, // Default topic ID
        themeId: 1, // Default theme ID  
        question: q.question,
        answer: q.answer,
        marks: q.marks || 4,
        attachments: {}
      }));

      const exercise = await storage.createExerciseWithQuestions(exerciseData, questionData);

      // Update or create generation tracking record
      if (existing) {
        await db
          .update(dailyExerciseGenerations)
          .set({ 
            count: currentCount + 1, 
            lastGeneratedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(dailyExerciseGenerations.id, existing.id));
      } else {
        await db
          .insert(dailyExerciseGenerations)
          .values({
            studentId: student.id,
            generationDate: today,
            count: 1,
            lastGeneratedAt: new Date()
          });
      }

      console.log('✅ Exercise generated successfully with count tracking');

      res.json({ 
        message: "Exercise generated successfully",
        exercise: exercise,
        remaining: 5 - (currentCount + 1)
      });
    } catch (error) {
      console.error("Error generating exercise:", error);
      res.status(500).json({ message: "Failed to generate exercise" });
    }
  });

  // Populate tutorials for existing exercises that don't have them
  app.post('/api/admin/populate-tutorials', authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can populate tutorials" });
      }

      console.log("🔄 Starting to populate tutorials for existing exercises...");
      
      // Get all exercises that have hasInitialTutorial=true but tutorialContent=null
      const exercises = await storage.getAllExercisesNeedingTutorials();
      console.log(`Found ${exercises.length} exercises needing tutorials`);

      let successCount = 0;
      let errorCount = 0;

      for (const exercise of exercises) {
        try {
          console.log(`Generating tutorial for exercise ${exercise.id}: ${exercise.title}`);
          
          const tutorialContext = {
            grade: exercise.grade || '8',
            subject: exercise.subject || 'mathematics',
            topic: exercise.title || 'Practice',
            syllabus: 'CAPS'
          };

          // Generate improvement areas based on exercise content
          const improvementAreas = [
            `Practice ${exercise.subject} concepts`,
            `Review ${exercise.title} techniques`,
            'Work on problem-solving skills'
          ];

          // Generate tutorial using MCP service
          const tutorial = await mcpClientService.generateTutorial(
            tutorialContext,
            improvementAreas,
            []
          );

          // Update the exercise with the generated tutorial
          await storage.updateExerciseTutorialContent(exercise.id, JSON.stringify(tutorial));
          
          successCount++;
          console.log(`✅ Tutorial generated for exercise ${exercise.id}`);
          
        } catch (exerciseError) {
          console.error(`❌ Failed to generate tutorial for exercise ${exercise.id}:`, exerciseError);
          errorCount++;
        }
      }

      res.json({
        status: "success",
        message: `Tutorial population completed. ${successCount} tutorials generated, ${errorCount} errors`,
        successCount,
        errorCount,
        totalProcessed: exercises.length
      });

    } catch (error) {
      console.error("❌ Tutorial population failed:", error);
      res.status(500).json({ 
        message: "Failed to populate tutorials",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test route to verify tutorial generation works (no auth for testing)
  app.post('/api/test/generate-tutorial-basic', async (req, res) => {
    try {
      console.log("🧪 Testing tutorial generation...");
      
      const testContext = {
        grade: '8',
        subject: 'mathematics',
        topic: 'Algebraic Expressions',
        syllabus: 'CAPS'
      };
      
      const testImprovements = [
        'Practice simplifying expressions with like terms',
        'Review order of operations when solving equations',
        'Work on substitution techniques'
      ];

      // Generate tutorial using MCP service
      const tutorial = await mcpClientService.generateTutorial(
        testContext,
        testImprovements,
        []
      );

      console.log("✅ Test tutorial generated successfully:", JSON.stringify(tutorial, null, 2));

      res.json({ 
        status: "success",
        tutorial: tutorial,
        testContext,
        testImprovements
      });
    } catch (error) {
      console.error("❌ Test tutorial generation failed:", error);
      res.status(500).json({ 
        message: "Test tutorial generation failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate tutorial content using AI
  app.post('/api/tutorial/generate', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { context, improvementAreas, targetConcepts } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!context || !context.grade || !context.subject || !context.topic) {
        return res.status(400).json({ message: "Missing required context fields: grade, subject, topic" });
      }

      // Generate tutorial using MCP service
      const tutorial = await mcpClientService.generateTutorial(
        context,
        improvementAreas || [],
        targetConcepts || []
      );

      res.json({ 
        status: "success",
        tutorial: tutorial 
      });
    } catch (error) {
      console.error("Error generating tutorial:", error);
      res.status(500).json({ 
        message: "Failed to generate tutorial",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Tutorial chat route for students to ask questions during tutorials
  app.post('/api/tutorial-chat', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentQuestion, tutorialContext } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!studentQuestion || !tutorialContext) {
        return res.status(400).json({ message: "Missing required fields: studentQuestion, tutorialContext" });
      }

      console.log('📚 Processing tutorial chat question:', studentQuestion);

      // Use the MCP service for tutorial chat
      const response = await mcpClientService.tutorialChat(
        studentQuestion,
        {
          tutorialTitle: tutorialContext.tutorialTitle,
          currentStep: tutorialContext.currentStep,
          totalSteps: tutorialContext.totalSteps,
          stepTitle: tutorialContext.stepTitle,
          stepContent: tutorialContext.stepContent,
          example: tutorialContext.example,
          grade: tutorialContext.grade,
          subject: tutorialContext.subject,
          topic: tutorialContext.topic
        }
      );

      res.json({ 
        answer: response.answer,
        context: response.context
      });
    } catch (error) {
      console.error("Error in tutorial chat:", error);
      res.status(500).json({ 
        message: "Failed to process tutorial chat",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Assessment chat route for students to ask questions about their feedback
  app.post('/api/assessment-chat', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentQuestion, assessmentType, assessmentId, questions, feedback } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can use assessment chat" });
      }

      if (!studentQuestion || !assessmentType || !assessmentId) {
        return res.status(400).json({ message: "Missing required fields: studentQuestion, assessmentType, assessmentId" });
      }

      // Get student record
      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Get assessment details based on type
      let assessment: any;
      let assessmentQuestions: any[];
      let submission: any;

      if (assessmentType === 'homework') {
        assessment = await storage.getHomeworkById(parseInt(assessmentId));
        // Homework questions are stored within the homework object
        assessmentQuestions = assessment?.questions || [];
        submission = await storage.getHomeworkSubmission(parseInt(assessmentId), student.id);
      } else if (assessmentType === 'exercise') {
        assessment = await storage.getExercise(parseInt(assessmentId));
        assessmentQuestions = assessment?.questions || [];
        submission = await storage.getExerciseSubmission(parseInt(assessmentId), student.id);
      } else {
        return res.status(400).json({ message: "Invalid assessment type. Must be 'homework' or 'exercise'" });
      }

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (!submission) {
        return res.status(404).json({ message: "No submission found for this assessment" });
      }

      // Prepare assessment context
      const assessmentContext = {
        assessmentType,
        title: assessment.title,
        subject: assessment.subject,
        topic: assessment.topic || assessment.description || 'General',
        grade: student.gradeLevel
      };

      // Prepare questions with student answers
      const questionsData = assessmentQuestions.map((q: any) => {
        const studentAnswer = submission.answers?.find((a: any) => a.questionId === q.id.toString());
        return {
          id: q.id.toString(),
          question: q.question,
          correctAnswer: q.answer,
          studentAnswer: studentAnswer?.answer || '',
          marks: q.marks,
          earnedMarks: studentAnswer?.earnedMarks || 0,
          isCorrect: studentAnswer?.isCorrect || false
        };
      });

      // Get or prepare feedback data
      let feedbackData = feedback;
      if (!feedbackData && submission.feedback) {
        try {
          const parsedFeedback = typeof submission.feedback === 'string' 
            ? JSON.parse(submission.feedback) 
            : submission.feedback;
          
          feedbackData = {
            strengths: parsedFeedback.strengths || [],
            improvements: parsedFeedback.improvements || [],
            overallScore: submission.score || 0,
            totalMarks: submission.totalMarks || assessmentQuestions.reduce((sum: number, q: any) => sum + q.marks, 0),
            percentage: submission.score && submission.totalMarks 
              ? Math.round((submission.score / submission.totalMarks) * 100) 
              : 0
          };
        } catch (error) {
          console.error('Error parsing feedback:', error);
          feedbackData = {
            strengths: [],
            improvements: [],
            overallScore: submission.score || 0,
            totalMarks: submission.totalMarks || 0,
            percentage: 0
          };
        }
      }

      console.log('🎯 Processing assessment chat:', {
        studentQuestion,
        assessmentType,
        assessmentTitle: assessment.title,
        questionsCount: questionsData.length
      });

      // Call MCP service for AI chat response
      const chatResponse = await mcpClientService.assessmentChat(
        studentQuestion,
        assessmentContext,
        questionsData,
        feedbackData
      );

      res.json({
        message: "Chat response generated successfully",
        response: chatResponse.response,
        context: chatResponse.context
      });

    } catch (error) {
      console.error("Error processing assessment chat:", error);
      res.status(500).json({ 
        message: "Failed to process chat request",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Question-specific chat route for students to ask about individual questions
  app.post('/api/question-specific-chat', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentQuestion, assessmentType, assessmentId, specificQuestion, context } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can use question-specific chat" });
      }

      if (!studentQuestion || !assessmentType || !assessmentId || !specificQuestion) {
        return res.status(400).json({ message: "Missing required fields: studentQuestion, assessmentType, assessmentId, specificQuestion" });
      }

      // Get student record
      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      console.log('🎯 Processing question-specific chat:', {
        studentQuestion,
        questionId: specificQuestion.id,
        isCorrect: specificQuestion.isCorrect,
        points: `${specificQuestion.earnedMarks}/${specificQuestion.marks}`,
        hasImage: !!specificQuestion.imageUrl
      });

      // Enhanced context for question-specific help
      const questionContext = {
        assessmentType,
        subject: 'Mathematics', // Default for exercises
        topic: 'General Math', // Default for exercises
        grade: student.gradeLevel || '8',
        questionNumber: specificQuestion.id,
        studentGrade: student.gradeLevel || '8'
      };

      // Get homework data to find proper question numbering
      let homework;
      if (assessmentType === 'homework') {
        homework = await storage.getHomeworkById(parseInt(assessmentId));
      }

      // Find the question index for proper numbering
      const questionIndex = homework?.questions?.findIndex((q: any) => q.id.toString() === specificQuestion.id) ?? -1;
      const questionNumber = questionIndex >= 0 ? questionIndex + 1 : 'Unknown';

      // Build answer description including image if present
      const answerDescription = specificQuestion.imageUrl 
        ? `${specificQuestion.studentAnswer || 'No text answer provided'} [Student also submitted an image showing their work]`
        : specificQuestion.studentAnswer;

      // Call MCP service for question-specific AI chat response
      const chatResponse = await mcpClientService.assessmentChat(
        `IMPORTANT: This is about Question ${questionNumber} specifically.

Question ${questionNumber}: ${specificQuestion.question}
Student's Answer: ${answerDescription}
Correct Answer: ${specificQuestion.correctAnswer}
Score: ${specificQuestion.earnedMarks}/${specificQuestion.marks}
AI Feedback: ${specificQuestion.feedback}

Student's Question about Question ${questionNumber}: ${studentQuestion}

REMEMBER: Always refer to this as Question ${questionNumber} in your response. ${specificQuestion.imageUrl ? 'NOTE: The student submitted their answer as an image, so base your help on the AI feedback which analyzed the image.' : ''}`,
        questionContext,
        [{
          id: specificQuestion.id,
          question: specificQuestion.question,
          correctAnswer: specificQuestion.correctAnswer,
          studentAnswer: specificQuestion.studentAnswer,
          marks: specificQuestion.marks,
          earnedMarks: specificQuestion.earnedMarks,
          isCorrect: specificQuestion.isCorrect,
          feedback: specificQuestion.feedback
        }],
        {
          strengths: specificQuestion.isCorrect ? ['Correct answer provided'] : [],
          improvements: specificQuestion.isCorrect ? [] : ['Review this concept'],
          overallScore: specificQuestion.earnedMarks,
          totalMarks: specificQuestion.marks,
          percentage: Math.round((specificQuestion.earnedMarks / specificQuestion.marks) * 100)
        }
      );

      res.json({
        message: "Question-specific chat response generated successfully",
        response: chatResponse.response,
        context: chatResponse.context
      });

    } catch (error) {
      console.error("Error processing question-specific chat:", error);
      res.status(500).json({ 
        message: "Failed to process question-specific chat request",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // School holidays routes
  app.get("/api/school-holidays", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const holidays = await storage.getSchoolHolidays(year);
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching school holidays:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/school-holidays", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create school holidays" });
      }

      const holiday = await storage.createSchoolHoliday(req.body);
      res.json(holiday);
    } catch (error) {
      console.error("Error creating school holiday:", error);
      res.status(400).json({ message: "Invalid holiday data" });
    }
  });

  app.delete("/api/school-holidays/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can delete school holidays" });
      }

      const id = parseInt(req.params.id);
      const success = await storage.deleteSchoolHoliday(id);
      if (success) {
        res.json({ message: "Holiday deleted successfully" });
      } else {
        res.status(404).json({ message: "Holiday not found" });
      }
    } catch (error) {
      console.error("Error deleting school holiday:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Homework routes
  app.get("/api/homework", authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log('🔍 /api/homework - User role:', req.user?.role, 'User ID:', req.user?.id);
      
      if (req.user?.role === 'teacher') {
        const teacher = await storage.getTeacherByUserId(req.user.id);
        if (!teacher) {
          return res.status(404).json({ message: "Teacher profile not found" });
        }
        
        const homework = await storage.getHomeworkByTeacher(teacher.id);
        res.json(homework);
      } else if (req.user?.role === 'student') {
        const student = await storage.getStudentByUserId(req.user.id);
        console.log('🔍 /api/homework - Found student:', student);
        if (!student) {
          return res.status(404).json({ message: "Student profile not found" });
        }
        
        console.log('🔍 /api/homework - Calling getHomeworkByStudent with student.id:', student.id);
        const homework = await storage.getHomeworkByStudent(student.id);
        console.log('🔍 /api/homework - Received homework count:', homework.length);
        console.log('🔍 /api/homework - Sample homework (first one):', homework[0]);
        res.json(homework);
      } else {
        return res.status(403).json({ message: "Only teachers and students can access homework" });
      }
    } catch (error) {
      console.error("Error fetching homework:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/homework", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can create homework" });
      }

      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      console.log('🐛 DEBUG - Raw request body:', req.body);
      console.log('🐛 DEBUG - Request body topicId:', req.body.topicId);
      console.log('🐛 DEBUG - Request body themeId:', req.body.themeId);
      
      const homeworkData = insertHomeworkSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });
      
      console.log('🐛 DEBUG - Parsed homework data:', homeworkData);
      console.log('🐛 DEBUG - Parsed topicId:', homeworkData.topicId);
      console.log('🐛 DEBUG - Parsed themeId:', homeworkData.themeId);

      const homework = await storage.createHomework(homeworkData);
      res.status(201).json(homework);
    } catch (error) {
      console.error("Error creating homework:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/homework/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can update homework" });
      }

      const homeworkId = parseInt(req.params.id);
      const updates = insertHomeworkSchema.partial().parse(req.body);

      const homework = await storage.updateHomework(homeworkId, updates);
      res.json(homework);
    } catch (error) {
      console.error("Error updating homework:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/homework/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can delete homework" });
      }

      const homeworkId = parseInt(req.params.id);
      await storage.deleteHomework(homeworkId);
      res.json({ message: "Homework deleted successfully" });
    } catch (error) {
      console.error("Error deleting homework:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Homework submission routes
  // Get homework submission status for a student
  app.get("/api/homework/:homeworkId/submission", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'student') {
        return res.status(403).json({ message: "Only students can access homework submissions" });
      }

      const homeworkId = parseInt(req.params.homeworkId);
      const student = await storage.getStudentByUserId(req.user!.id);
      
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const submission = await storage.getHomeworkSubmission(homeworkId, student.id);
      res.json(submission || null);
    } catch (error) {
      console.error("Error fetching homework submission:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit homework answers
  app.post("/api/homework/:homeworkId/submit", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'student') {
        return res.status(403).json({ message: "Only students can submit homework" });
      }

      const homeworkId = parseInt(req.params.homeworkId);
      const student = await storage.getStudentByUserId(req.user!.id);
      
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Get the homework with questions and correct answers
      // Check if this is a mock homework test (for AI Testing Center)
      let homework;
      if (req.body.mockHomework) {
        console.log('🧪 Using mock homework data for testing:', req.body.mockHomework.title);
        homework = req.body.mockHomework;
      } else {
        homework = await storage.getHomeworkById(homeworkId);
        if (!homework) {
          return res.status(404).json({ message: "Homework not found" });
        }
      }

      // Use AI marking system from MCP service - RAW STUDENT ANSWERS APPROACH
      console.log("Using AI marking system via MCP service - sending RAW student answers");
      
      let feedback;
      // Declare topic/theme variables at function scope so they're accessible later
      let topicName = homework.title; // fallback to title
      let themeName = 'General'; // fallback 
      let subjectName = 'mathematics'; // fallback
      
      try {
        // Create educational context for AI marking with proper topic/theme context
        let educationalContext;
        
        try {
          // Fetch topic and theme information if available

          if (homework.topicId) {
            const topic = await storage.getTopicById(homework.topicId);
            if (topic) {
              topicName = topic.name; // e.g., "Algebra", "Factorization"
              subjectName = topic.subject; // e.g., "mathematics", "physical-science"
            }
          }

          if (homework.themeId) {
            const theme = await storage.getThemeById(homework.themeId);
            if (theme) {
              themeName = theme.name; // e.g., "Linear Equations", "Quadratic Expressions"
            }
          }

          console.log(`🎯 Enhanced AI Context: Topic="${topicName}", Theme="${themeName}", Subject="${subjectName}"`);

          educationalContext = {
            grade: student.gradeLevel || '8',
            subject: subjectName, // Dynamic based on homework's topic
            topic: topicName, // Actual topic name from topics table
            theme: themeName, // Actual theme name from themes table  
            difficulty: 'medium' as const,
            syllabus: 'CAPS' as const
          };
        } catch (error) {
          console.warn(`⚠️  Failed to fetch topic/theme context, using fallback:`, error);
          // Fallback to original approach if topic/theme fetch fails
          educationalContext = {
            grade: student.gradeLevel || '8',
            subject: 'mathematics',
            topic: homework.title,
            difficulty: 'medium' as const,
            syllabus: 'CAPS' as const
          };
        }

        // Convert homework questions to MPC format
        const exerciseForAI = {
          id: homework.id.toString(),
          title: homework.title,
          description: homework.description || '',
          questions: homework.questions?.map((q: any) => ({
            id: q.id,
            question: q.question,
            answer: q.correctAnswer || 'No answer key available',
            marks: q.points || 10,
            type: 'short-answer' as const
          })) || [],
          totalMarks: homework.questions?.reduce((sum: number, q: any) => sum + (q.points || 10), 0) || 0,
          estimatedDuration: 60
        };

        // Extract RAW student answers as string array - NO PROCESSING/EXTRACTION
        const studentAnswers = req.body.answers.map((answerObj: any) => answerObj.answer || '');
        
        console.log("📝 RAW student answers being sent to LLM:");
        studentAnswers.forEach((answer: string, index: number) => {
          console.log(`   Q${index + 1}: "${answer}"`);
        });
        
        // 🎯 FIXED: Use WORKING AI Testing Page grading logic instead of broken MCP service
        console.log(`🎯 Using WORKING AI Testing Page grading logic - NO MORE MCP!`);
        
        // Import the fixed grading function
        const { gradeHomeworkSubmission } = await import('./grading.js');
        
        // Format homework for grading function with topic/theme enrichment
        const homeworkForGrading = {
          questions: homework.questions?.map((q: any) => ({
            id: q.id,
            question: q.question,
            points: q.points || 10,
            correctAnswer: q.correctAnswer || 'No answer key available',
            answerType: q.answerType || 'exact',
            acceptableVariations: q.acceptableVariations || [],
            topicName: topicName, // Add topic name for skill-based feedback
            themeName: themeName  // Add theme name for skill-based feedback
          })) || []
        };
        
        // Format student answers for grading function
        const answersForGrading = req.body.answers.map((answerObj: any) => ({
          questionId: answerObj.questionId,
          answer: answerObj.answer || '',
          imageUrl: answerObj.imageUrl // ✅ CRITICAL FIX: Pass imageUrl to grading function for vision API
        }));
        
        // Use the WORKING grading logic from AI Testing Page
        const gradingResult = await gradeHomeworkSubmission(
          homeworkForGrading,
          answersForGrading,
          educationalContext // Pass the context
        );
        
        console.log(`✅ WORKING AI Testing Page logic result:`, gradingResult);
        
        // Use the working feedback format
        feedback = gradingResult;
        
        console.log("AI marking completed successfully");
      } catch (aiError) {
        console.error("❌ Enhanced AI grading failed:", aiError);
        
        // ⚠️ NO FALLBACK - Enhanced AI grading is the only system
        // Return error instead of falling back to old grading system
        return res.status(503).json({ 
          message: "Enhanced AI grading system is temporarily unavailable",
          error: aiError instanceof Error ? aiError.message : 'Unknown AI service error',
          details: "The AI grading system requires an OpenAI API key. Please contact your administrator to set up the AI service."
        });
      }

      // Handle submission data and database operations (skip for mock homework)
      let submission;
      let isFirstCompletion = false;
      
      if (req.body.mockHomework) {
        console.log('🧪 Mock homework test - returning test submission data');
        // Return mock submission for testing without database operations
        submission = {
          id: 999,
          homeworkId: homework.id,
          studentId: student.id,
          answers: req.body.answers,
          isCompleted: true,
          score: feedback.totalScore,
          totalMarks: feedback.totalPossible,
          feedback: feedback
        };
        isFirstCompletion = false; // Don't award points for mock submissions
      } else {
        const submissionData = insertHomeworkSubmissionSchema.parse({
          homeworkId,
          studentId: student.id,
          answers: req.body.answers,
          isCompleted: true,
          score: feedback.totalScore,
          totalMarks: feedback.totalPossible,
          feedback: feedback
        });

        // Check if submission already exists
        const existingSubmission = await storage.getHomeworkSubmission(homeworkId, student.id);
        
        if (existingSubmission) {
          // Check if this is the first time completing
          isFirstCompletion = !existingSubmission.isCompleted && submissionData.isCompleted;
          submission = await storage.updateHomeworkSubmission(existingSubmission.id, submissionData);
        } else {
          // New submission and completed
          isFirstCompletion = submissionData.isCompleted;
          submission = await storage.createHomeworkSubmission(submissionData);
        }
      }

      // Award points for first-time completion (10 points for homework)
      if (isFirstCompletion && req.user) {
        try {
          await storage.updateUserPoints(req.user.id, 10);
        } catch (pointsError) {
          console.error("Error awarding points for homework completion:", pointsError);
        }
      }

      // Save topic-specific feedback - use direct topic association from homework (skip for mock)
      if (feedback && feedback.strengths && feedback.improvements && !req.body.mockHomework) {
        try {
          // Use direct topic association if available, otherwise fall back to matching logic
          let topicId = homework.topicId;
          
          if (!topicId) {
            // Fallback: Enhanced topic matching for homework without topic association
            const topics = await storage.getTopicsBySubject('mathematics');
            let matchedTopic = topics.find(t => {
              const titleLower = homework.title.toLowerCase();
              const topicLower = t.name.toLowerCase();
              
              // Direct topic name match
              if (titleLower.includes(topicLower) || topicLower.includes(titleLower)) {
                return true;
              }
              
              // For mathematics, use SPECIFIC keyword matching for each topic
              if (t.subject === 'mathematics') {
                switch (topicLower) {
                  case 'algebra':
                    return titleLower.includes('algebra') || titleLower.includes('equation') || 
                           titleLower.includes('linear') || titleLower.includes('variable');
                  case 'geometry':
                    return titleLower.includes('geometry') || titleLower.includes('area') || 
                           titleLower.includes('perimeter') || titleLower.includes('shape') ||
                           titleLower.includes('triangle') || titleLower.includes('circle');
                  case 'statistics':
                    return titleLower.includes('statistics') || titleLower.includes('data') || 
                           titleLower.includes('mean') || titleLower.includes('median');
                  case 'number systems':
                    return titleLower.includes('number') || titleLower.includes('fraction') || 
                           titleLower.includes('decimal');
                  case 'trigonometry':
                    return titleLower.includes('trigonometry') || titleLower.includes('sin') || 
                           titleLower.includes('cos') || titleLower.includes('tan');
                  case 'probability':
                    return titleLower.includes('probability') || titleLower.includes('chance') || 
                           titleLower.includes('random');
                  case 'calculus':
                    return titleLower.includes('calculus') || titleLower.includes('derivative') || 
                           titleLower.includes('integral');
                  case 'functions':
                    return titleLower.includes('function') || titleLower.includes('domain') || 
                           titleLower.includes('range');
                  default:
                    // Generic math keywords only match if no specific topic keywords found
                    return titleLower.includes('math') && !titleLower.includes('geometry') && 
                           !titleLower.includes('area') && !titleLower.includes('perimeter');
                }
              }
              
              return false;
            });
            
            // If no match found, default to Algebra for math homework
            if (!matchedTopic && topics.length > 0) {
              matchedTopic = topics.find(t => t.name.toLowerCase() === 'algebra') || topics[0];
            }
            
            topicId = matchedTopic?.id;
          }

          if (topicId) {
            await storage.saveTopicFeedback({
              studentId: student.id,
              topicId: topicId,
              subject: homework.subject || 'mathematics',
              grade: homework.grade || '8',
              strengths: feedback.strengths,
              improvements: feedback.improvements,
              lastScore: feedback.totalScore,
              lastTotalMarks: feedback.totalPossible,
              lastPercentage: feedback.percentageScore,
              sourceType: 'homework',
              sourceId: homework.id
            });
            console.log(`✅ Saved topic feedback for homework: ${homework.title} → Topic ID: ${topicId}`);
          } else {
            console.log(`⚠️ No topic association found for homework: ${homework.title}`);
          }
        } catch (topicFeedbackError) {
          console.error("Error saving topic feedback for homework:", topicFeedbackError);
          // Don't fail the submission if topic feedback fails
        }
      }

      // Generate tutorial based on student's performance and feedback (skip for mock homework)
      if (!req.body.mockHomework) {
      try {
        console.log("🎓 Generating tutorial for homework submission feedback");
        
        // Extract improvement areas from AI feedback
        const improvementAreas = feedback.improvements || [];
        
        // Create educational context for tutorial generation
        const tutorialContext = {
          grade: student.gradeLevel || '8',
          subject: homework.subject || 'mathematics',
          topic: homework.title || 'Mathematics Practice',
          syllabus: 'CAPS'
        };

        // Generate tutorial content using MCP service
        const tutorial = await mcpClientService.generateTutorial(
          tutorialContext,
          improvementAreas,
          [] // No specific target concepts, let AI determine based on feedback
        );

        console.log("✅ Tutorial generated successfully for homework feedback");

        // Create a personalized exercise with the generated tutorial
        const today = new Date().toISOString().split('T')[0];
        const exerciseData = {
          date: today,
          grade: student.gradeLevel || '8',
          subject: homework.subject || 'mathematics',
          title: `Personalized Tutorial: ${homework.title}`,
          description: `Based on your homework feedback - focus areas: ${improvementAreas.slice(0, 3).join(', ')}`,
          difficulty: 'medium',
          isTutorial: false,
          hasInitialTutorial: true,
          tutorialContent: JSON.stringify(tutorial),
          generatedFor: student.id
        };

        // Generate practice questions for the tutorial
        const practiceExercise = await mcpClientService.generateExercise(
          tutorialContext,
          3 // Generate 3 practice questions
        );

        const questionData = practiceExercise.questions.map((q: any, index: number) => ({
          topicId: 1, // Default topic ID
          themeId: 1, // Default theme ID  
          question: q.question,
          answer: q.answer,
          marks: q.marks || 4,
          attachments: {}
        }));

        await storage.createExerciseWithQuestions(exerciseData, questionData);
        console.log("✅ Personalized tutorial exercise created successfully");

      } catch (tutorialError) {
        console.error("Error generating tutorial for homework:", tutorialError);
        // Don't fail the submission if tutorial generation fails
      }
      } // End mock homework check

      res.json(submission);
    } catch (error) {
      console.error("Error submitting homework:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all submissions for a homework assignment (for teachers to analyze)
  app.get("/api/homework/:id/submissions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access homework submissions" });
      }

      const homeworkId = parseInt(req.params.id);
      const teacher = await storage.getTeacherByUserId(req.user!.id);
      
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      // Verify that this homework belongs to the teacher
      const homework = await storage.getHomeworkById(homeworkId);
      if (!homework || homework.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "You can only access submissions for your own homework" });
      }

      const submissions = await storage.getHomeworkSubmissions(homeworkId);
      res.json(submissions || []);
    } catch (error) {
      console.error("Error fetching homework submissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Exercise submission routes
  // Get exercise submission status for a student
  app.get("/api/exercises/:exerciseId/submission", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const exerciseId = parseInt(req.params.exerciseId);
      const { studentUserId } = req.query; // Allow parents to specify their child's student user ID
      let student;

      if (req.user!.role === 'student') {
        // Student checking their own submission
        student = await storage.getStudentByUserId(req.user!.id);
      } else if (req.user!.role === 'parent' && studentUserId) {
        // Parent checking their child's submission
        const targetStudentUserId = parseInt(studentUserId as string);
        student = await storage.getStudentByUserId(targetStudentUserId);
        
        // Verify this child belongs to this parent
        const child = await storage.getChildByStudentUserId(req.user!.id, targetStudentUserId);
        if (!child) {
          return res.status(403).json({ message: "Access denied - child not found" });
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const submission = await storage.getExerciseSubmission(exerciseId, student.id);
      res.json(submission || null);
    } catch (error) {
      console.error("Error fetching exercise submission:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit exercise answers
  app.post("/api/exercises/:exerciseId/submit", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'student') {
        return res.status(403).json({ message: "Only students can submit exercises" });
      }

      const exerciseId = parseInt(req.params.exerciseId);
      const student = await storage.getStudentByUserId(req.user!.id);
      
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Get the exercise with questions
      const exercise = await storage.getExercise(exerciseId);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      // Use AI marking system from MPC service for exercises
      console.log("Using AI marking system for exercise via MPC service");
      
      let feedback;
      let score = 0;
      const totalMarks = exercise.questions?.reduce((sum: number, q: any) => sum + (q.marks || 0), 0) || 0;
      
      try {
        // Create educational context for AI marking
        // Map difficulty values to valid enum options
        const mapDifficultyToValidEnum = (difficulty: string): 'easy' | 'medium' | 'hard' => {
          switch (difficulty?.toLowerCase()) {
            case 'easy':
              return 'easy';
            case 'hard':
              return 'hard';
            case 'mixed':
            case 'medium':
            default:
              return 'medium';
          }
        };

        // Create educational context for AI marking with proper topic/theme context
        let educationalContext;
        
        // Declare variables at function scope so they're accessible in the map function below
        let topicName = exercise.title; // fallback to title
        let themeName = 'General'; // fallback 
        let subjectName = exercise.subject; // fallback
        
        try {
          // Fetch topic and theme information if available (same pattern as homework grading)

          // Check if any question has topicId to get the actual topic name
          let exerciseTopicId = null;
          let exerciseThemeId = null;
          
          if (exercise.questions && exercise.questions.length > 0) {
            // Use the first question's topic/theme (assuming all questions in exercise have same topic)
            const firstQuestion = exercise.questions[0];
            exerciseTopicId = firstQuestion.topicId;
            exerciseThemeId = firstQuestion.themeId;
          }

          if (exerciseTopicId) {
            const topic = await storage.getTopicById(exerciseTopicId);
            if (topic) {
              topicName = topic.name; // e.g., "Algebra", "Factorization"
              subjectName = topic.subject; // e.g., "mathematics", "physical-science"
            }
          }

          if (exerciseThemeId) {
            const theme = await storage.getThemeById(exerciseThemeId);
            if (theme) {
              themeName = theme.name; // e.g., "Linear Equations", "Quadratic Expressions"
            }
          }

          console.log(`🎯 Enhanced Exercise AI Context: Topic="${topicName}", Theme="${themeName}", Subject="${subjectName}"`);

          educationalContext = {
            grade: exercise.grade,
            subject: subjectName, // Dynamic based on exercise's topic
            topic: topicName, // Actual topic name from topics table, not exercise title
            theme: themeName, // Actual theme name from themes table  
            difficulty: mapDifficultyToValidEnum(exercise.difficulty),
            syllabus: 'CAPS' as const
          };
        } catch (error) {
          console.warn(`⚠️  Failed to fetch exercise topic/theme context, using fallback:`, error);
          // Fallback to original approach if topic/theme fetch fails
          educationalContext = {
            grade: exercise.grade,
            subject: exercise.subject,
            topic: exercise.title,
            difficulty: mapDifficultyToValidEnum(exercise.difficulty),
            syllabus: 'CAPS' as const
          };
        }

        // Format exercise for grading function with per-question topic/theme enrichment
        const exerciseForGrading = {
          questions: await Promise.all((exercise.questions || []).map(async (q: any) => {
            // Fetch topic/theme names for each question (exercises have per-question topics)
            let questionTopicName = topicName; // fallback to exercise-level topic
            let questionThemeName = themeName; // fallback to exercise-level theme
            
            if (q.topicId) {
              const topic = await storage.getTopicById(q.topicId);
              if (topic) questionTopicName = topic.name;
            }
            
            if (q.themeId) {
              const theme = await storage.getThemeById(q.themeId);
              if (theme) questionThemeName = theme.name;
            }
            
            return {
              id: q.id.toString(),
              question: q.question,
              points: q.marks || 5,
              correctAnswer: q.answer || 'No answer key available',
              answerType: 'exact',
              acceptableVariations: [],
              topicName: questionTopicName, // Add per-question topic for skill-based feedback
              themeName: questionThemeName  // Add per-question theme for skill-based feedback
            };
          }))
        };

        // Extract student answers with image URLs in the correct order matching the questions
        const answersForGrading = exercise.questions?.map((question: any) => {
          const submittedAnswer = req.body.answers.find((ans: any) => 
            ans.questionId.toString() === question.id.toString()
          );
          return {
            questionId: question.id.toString(),
            answer: submittedAnswer?.answer || '',
            imageUrl: submittedAnswer?.imageUrl || null // ✅ Pass imageUrl for vision API
          };
        }) || [];

        console.log('Student answers for AI grading (with images):', answersForGrading);
        console.log('Questions count:', exercise.questions?.length);

        // Import the grading function (same as homework)
        const { gradeHomeworkSubmission } = await import('./grading.ts');
        
        // Use the WORKING grading logic with image support
        const gradingResult = await gradeHomeworkSubmission(
          exerciseForGrading,
          answersForGrading,
          educationalContext
        );

        console.log(`✅ AI grading result:`, gradingResult);

        // Use AI calculated total score directly  
        const actualTotalScore = gradingResult.totalScore;
        
        console.log(`🎯 Exercise final scoring: ${actualTotalScore}/${totalMarks}`);

        // Convert AI feedback to our format (gradingResult already has the right structure)
        feedback = {
          strengths: actualTotalScore > 0 ? gradingResult.strengths : ["Keep practicing! Every attempt helps you learn."],
          improvements: gradingResult.improvements,
          questionAnalysis: gradingResult.questionAnalysis
        };
        
        score = actualTotalScore;
        console.log("AI marking for exercise completed successfully");
      } catch (aiError) {
        console.error("AI marking failed for exercise:", aiError);
        return res.status(503).json({ 
          message: "AI grading service unavailable",
          error: aiError instanceof Error ? aiError.message : 'Unknown AI service error',
          details: "The AI feedback system is currently unavailable. Please contact your administrator to set up the AI service with a proper API key."
        });
      }

      const submissionData = insertExerciseSubmissionSchema.parse({
        exerciseId,
        studentId: student.id,
        answers: req.body.answers,
        isCompleted: true,
        score: score,
        totalMarks: totalMarks,
        feedback: feedback
      });

      // Check if submission already exists
      const existingSubmission = await storage.getExerciseSubmission(exerciseId, student.id);
      
      let submission;
      let isFirstCompletion = false;
      
      if (existingSubmission) {
        // Check if this is the first time completing
        isFirstCompletion = !existingSubmission.isCompleted && submissionData.isCompleted;
        submission = await storage.updateExerciseSubmission(existingSubmission.id, submissionData);
      } else {
        // New submission and completed
        isFirstCompletion = submissionData.isCompleted;
        submission = await storage.createExerciseSubmission(submissionData);
      }

      // Award points for first-time completion
      if (isFirstCompletion && req.user) {
        try {
          // Award 5 points for AI tutorial exercises, 10 points for regular exercises
          const pointsToAward = exercise.isTutorial ? 5 : 10;
          await storage.updateUserPoints(req.user.id, pointsToAward);
        } catch (pointsError) {
          console.error("Error awarding points for exercise completion:", pointsError);
        }
      }

      // Save topic-specific feedback for exercises (exercises have direct topic association)
      if (feedback && feedback.strengths && feedback.improvements && exercise.questions && exercise.questions.length > 0) {
        try {
          // For exercises, we can get the topic directly from the first exercise question
          const firstQuestion = exercise.questions[0];
          if (firstQuestion && firstQuestion.topicId) {
            await storage.saveTopicFeedback({
              studentId: student.id,
              topicId: firstQuestion.topicId,
              subject: exercise.subject,
              grade: exercise.grade,
              strengths: feedback.strengths,
              improvements: feedback.improvements,
              lastScore: score,
              lastTotalMarks: totalMarks,
              lastPercentage: Math.round((score / totalMarks) * 100),
              sourceType: 'exercise',
              sourceId: exercise.id
            });
            console.log(`Saved topic feedback for exercise, topic ID: ${firstQuestion.topicId}`);
          }
        } catch (topicFeedbackError) {
          console.error("Error saving topic feedback for exercise:", topicFeedbackError);
          // Don't fail the submission if topic feedback fails
        }
      }

      // Generate tutorial based on exercise performance and feedback
      try {
        console.log("🎓 Generating tutorial for exercise submission feedback");
        
        // Extract improvement areas from AI feedback
        const improvementAreas = feedback.improvements || [];
        
        // Only generate tutorials for exercises that need improvement
        if (improvementAreas.length > 0) {
          // Create educational context for tutorial generation
          const tutorialContext = {
            grade: exercise.grade || '8',
            subject: exercise.subject || 'mathematics',
            topic: exercise.title || 'Practice Exercise',
            syllabus: 'CAPS'
          };

          // Generate tutorial content using MCP service
          const tutorial = await mcpClientService.generateTutorial(
            tutorialContext,
            improvementAreas,
            [] // No specific target concepts, let AI determine based on feedback
          );

          console.log("✅ Tutorial generated successfully for exercise feedback");

          // Create a personalized exercise with the generated tutorial
          const today = new Date().toISOString().split('T')[0];
          const exerciseData = {
            date: today,
            grade: exercise.grade || '8',
            subject: exercise.subject || 'mathematics',
            title: `Follow-up Tutorial: ${exercise.title}`,
            description: `Based on your exercise feedback - areas to improve: ${improvementAreas.slice(0, 3).join(', ')}`,
            difficulty: 'medium',
            isTutorial: false,
            hasInitialTutorial: true,
            tutorialContent: JSON.stringify(tutorial),
            generatedFor: student.id
          };

          // Generate practice questions for the tutorial
          const practiceExercise = await mcpClientService.generateExercise(
            tutorialContext,
            3 // Generate 3 practice questions
          );

          const questionData = practiceExercise.questions.map((q: any, index: number) => ({
            topicId: 1, // Default topic ID
            themeId: 1, // Default theme ID  
            question: q.question,
            answer: q.answer,
            marks: q.marks || 4,
            attachments: {}
          }));

          await storage.createExerciseWithQuestions(exerciseData, questionData);
          console.log("✅ Personalized tutorial exercise created successfully for exercise feedback");
        }

      } catch (tutorialError) {
        console.error("Error generating tutorial for exercise:", tutorialError);
        // Don't fail the submission if tutorial generation fails
      }

      res.json(submission);
    } catch (error) {
      console.error("Error submitting exercise:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all submissions for an exercise (for teachers/admins to analyze)
  app.get("/api/exercises/:id/submissions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user!.role !== 'teacher' && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers and admins can access exercise submissions" });
      }

      const exerciseId = parseInt(req.params.id);
      const submissions = await storage.getExerciseSubmissions(exerciseId);
      res.json(submissions || []);
    } catch (error) {
      console.error("Error fetching exercise submissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Question Report routes
  // Create a new question report
  app.post("/api/question-reports", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can report question issues" });
      }

      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const { 
        homeworkId, 
        exerciseId, 
        questionId, 
        questionNumber,
        topicId, 
        themeId,
        reportType, 
        title, 
        comments, 
        studentAnswer, 
        expectedScore, 
        actualScore 
      } = req.body;

      // Validate that either homeworkId or exerciseId is provided, not both
      if ((!homeworkId && !exerciseId) || (homeworkId && exerciseId)) {
        return res.status(400).json({ message: "Either homeworkId or exerciseId must be provided, but not both" });
      }

      // Validate required fields
      if (!questionId || !reportType || !title || !comments) {
        return res.status(400).json({ message: "questionId, reportType, title, and comments are required" });
      }

      const reportData = {
        studentId: student.id,
        homeworkId: homeworkId || null,
        exerciseId: exerciseId || null,
        questionId,
        questionNumber: questionNumber || null,
        topicId: topicId || null,
        themeId: themeId || null,
        reportType,
        title,
        comments,
        studentAnswer: studentAnswer || null,
        expectedScore: expectedScore || null,
        actualScore: actualScore || null
      };

      const report = await storage.createQuestionReport(reportData);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating question report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get question reports for current student
  app.get("/api/student/question-reports", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can access their question reports" });
      }

      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      const reports = await storage.getQuestionReportsByStudent(student.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching student question reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all question reports (for teachers/admins)
  app.get("/api/question-reports", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers and admins can access all question reports" });
      }

      const status = req.query.status as string;
      const reports = await storage.getQuestionReports(status);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching question reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update question report status (for teachers/admins)
  app.put("/api/question-reports/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only teachers and admins can update question report status" });
      }

      const reportId = parseInt(req.params.id);
      const { status, reviewNotes } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Validate status values
      const validStatuses = ['open', 'under_review', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be one of: " + validStatuses.join(', ') });
      }

      const updatedReport = await storage.updateQuestionReportStatus(
        reportId, 
        status, 
        req.user.id, 
        reviewNotes
      );

      if (!updatedReport) {
        return res.status(404).json({ message: "Question report not found" });
      }

      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating question report status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single question report by ID
  app.get("/api/question-reports/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getQuestionReportById(reportId);

      if (!report) {
        return res.status(404).json({ message: "Question report not found" });
      }

      // Check permissions: students can only see their own reports
      if (req.user?.role === 'student') {
        const student = await storage.getStudentByUserId(req.user.id);
        if (!student || report.studentId !== student.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(report);
    } catch (error) {
      console.error("Error fetching question report:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Quiz routes
  app.get("/api/quizzes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access quizzes" });
      }

      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      const quizzes = await storage.getQuizzesByTeacher(teacher.id);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/quizzes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can create quizzes" });
      }

      const quizData = insertQuizSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });

      const quiz = await storage.createQuiz(quizData);
      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });



  // Calculate and update retroactive points for existing users
  app.post('/api/users/calculate-retroactive-points', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser || currentUser.role !== 'student') {
        return res.status(403).json({ message: 'Only students can calculate retroactive points' });
      }

      const retroactivePoints = await storage.calculateRetroactivePoints(currentUser.id);
      if (retroactivePoints > 0) {
        const updatedUser = await storage.updateUserPoints(currentUser.id, retroactivePoints);
        return res.json({ 
          message: `Added ${retroactivePoints} retroactive points`,
          totalPoints: updatedUser?.points,
          retroactivePoints 
        });
      }

      // Get current user from database to get points
      const userFromDb = await storage.getUser(currentUser.id);
      res.json({ 
        message: 'No retroactive points to add',
        totalPoints: userFromDb?.points || 0,
        retroactivePoints: 0 
      });
    } catch (error) {
      console.error('Error calculating retroactive points:', error);
      res.status(500).json({ message: 'Failed to calculate retroactive points' });
    }
  });

  // Test endpoint
  app.get('/api/test-points', authenticateToken, async (req: AuthRequest, res) => {
    console.log('Test endpoint hit by user:', req.user?.id, req.user?.role);
    res.json({ message: 'Test successful', user: req.user?.id });
  });

  // Simple points breakdown test without auth first
  app.get('/api/points-breakdown-simple', async (req, res) => {
    console.log('Simple points breakdown called');
    try {
      const testData = {
        homework: [],
        exercises: [],
        totalPoints: 0
      };
      console.log('Returning simple test data');
      res.json(testData);
    } catch (error) {
      console.error('Simple endpoint error:', error);
      res.status(500).json({ message: 'Simple endpoint failed' });
    }
  });

  // Get detailed points breakdown for a user
  app.get('/api/points-breakdown', authenticateToken, async (req: AuthRequest, res) => {
    console.log('Points breakdown endpoint hit by user:', req.user?.id, req.user?.role);
    
    const testBreakdown = {
      homework: [
        {
          id: 1,
          title: "Math Homework - Algebra",
          completedAt: "2025-08-01T10:00:00.000Z",
          points: 10
        },
        {
          id: 2,
          title: "Science Lab Report",
          completedAt: "2025-08-02T14:30:00.000Z",
          points: 10
        }
      ],
      exercises: [
        {
          id: 1,
          title: "Polynomial Practice",
          isTutorial: false,
          completedAt: "2025-08-03T09:15:00.000Z",
          points: 10
        },
        {
          id: 2,
          title: "AI Tutorial: Functions",
          isTutorial: true,
          completedAt: "2025-08-04T16:45:00.000Z",
          points: 5
        }
      ],
      totalPoints: 35
    };
    
    res.json(testBreakdown);
  });

  // Get leaderboard with filters
  app.get('/api/leaderboard', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { grade, subject } = req.query;
      console.log('Leaderboard endpoint hit with filters:', { grade, subject });
      
      // Build query conditions
      const conditions: any[] = [eq(users.role, 'student')];
      
      if (grade && grade !== 'all') {
        conditions.push(eq(students.gradeLevel, grade as string));
      }

      // Get all students with their points
      let studentsQuery = db
        .select({
          id: users.id,
          userId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: students.username,
          grade: students.gradeLevel,
          points: users.points,
          avatar: users.avatar,
          studentId: students.id,
          schoolName: students.schoolName
        })
        .from(users)
        .innerJoin(students, eq(users.id, students.userId))
        .where(and(...conditions))
        .orderBy(desc(users.points));

      const studentsData = await studentsQuery;

      // Get subjects for each student by looking at their exercise/homework submissions
      const studentsWithSubjects = await Promise.all(
        studentsData.map(async (student) => {
          // Get subjects from exercises and homework
          const exerciseSubjects = await db
            .selectDistinct({ subject: exercises.subject })
            .from(exerciseSubmissions)
            .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
            .where(eq(exerciseSubmissions.studentId, student.studentId));

          // For now, use default subjects since homework schema doesn't have direct subject reference
          const homeworkSubjects: { subject: string }[] = [];

          // Combine and deduplicate subjects
          const allSubjects = [
            ...exerciseSubjects.map(s => s.subject),
            ...homeworkSubjects.map(s => s.subject)
          ];
          const uniqueSubjects = Array.from(new Set(allSubjects));

          // If no subjects found, default to common subjects for their grade
          const subjects = uniqueSubjects.length > 0 ? uniqueSubjects : ['mathematics', 'physical-science'];

          // Calculate weekly points (points earned in last 7 days)
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const weeklyExercisePoints = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(exerciseSubmissions)
            .where(
              and(
                eq(exerciseSubmissions.studentId, student.studentId),
                eq(exerciseSubmissions.isCompleted, true),
                gte(exerciseSubmissions.submittedAt, weekAgo)
              )
            );

          const weeklyHomeworkPoints = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(homeworkSubmissions)
            .where(
              and(
                eq(homeworkSubmissions.studentId, student.studentId),
                eq(homeworkSubmissions.isCompleted, true),
                gte(homeworkSubmissions.submittedAt, weekAgo)
              )
            );

          const weeklyPoints = (weeklyExercisePoints[0]?.count || 0) * 10 + (weeklyHomeworkPoints[0]?.count || 0) * 10;

          return {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            username: student.username,
            grade: student.grade || '8',
            points: student.points || 0,
            avatar: student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.firstName}${student.lastName}`,
            subjects: subjects,
            rank: 0, // Will be set after sorting
            weeklyPoints: weeklyPoints
          };
        })
      );

      // Filter by subject if specified
      let filteredStudents = studentsWithSubjects;
      if (subject && subject !== 'all') {
        filteredStudents = studentsWithSubjects.filter(student => 
          student.subjects.includes(subject as string)
        );
      }

      // Sort by points and assign ranks
      filteredStudents.sort((a, b) => b.points - a.points);
      filteredStudents.forEach((student, index) => {
        student.rank = index + 1;
      });

      res.json({
        students: filteredStudents,
        totalStudents: filteredStudents.length,
        filters: {
          grade: grade || 'all',
          subject: subject || 'all'
        }
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  // Teacher Student Progress API endpoints
  // Get student homework scores
  app.get("/api/students/:id/homework-scores", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      const homeworkScores = await db
        .select({
          id: homeworkSubmissions.id,
          homeworkId: homework.id,
          title: homework.title,
          score: homeworkSubmissions.score,
          totalMarks: homeworkSubmissions.totalMarks,
          submittedAt: homeworkSubmissions.submittedAt,
          isCompleted: homeworkSubmissions.isCompleted
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .innerJoin(students, eq(homeworkSubmissions.studentId, students.id))
        .where(eq(students.id, studentId))
        .orderBy(desc(homeworkSubmissions.submittedAt));

      res.json(homeworkScores);
    } catch (error) {
      console.error("Error fetching homework scores:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student exercise scores
  app.get("/api/students/:id/exercise-scores", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      const exerciseScores = await db
        .select({
          id: exerciseSubmissions.id,
          exerciseId: exercises.id,
          title: exercises.title,
          score: exerciseSubmissions.score,
          totalMarks: exerciseSubmissions.totalMarks,
          completedAt: exerciseSubmissions.submittedAt,
          isCompleted: exerciseSubmissions.isCompleted
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(eq(exerciseSubmissions.studentId, studentId))
        .orderBy(desc(exerciseSubmissions.submittedAt));

      res.json(exerciseScores);
    } catch (error) {
      console.error("Error fetching exercise scores:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get class ranking for a student
  app.get("/api/classes/:classId/ranking/:studentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const studentId = parseInt(req.params.studentId);
      
      // Get all students in the class with their points
      const classStudents = await db
        .select({
          studentId: students.id,
          points: users.points
        })
        .from(students)
        .innerJoin(users, eq(students.userId, users.id))
        .where(sql`${students.id} IN (
          SELECT student_id FROM class_students WHERE class_id = ${classId}
        )`)
        .orderBy(desc(users.points));

      const totalStudents = classStudents.length;
      const studentRank = classStudents.findIndex(s => s.studentId === studentId) + 1;
      const studentPoints = classStudents.find(s => s.studentId === studentId)?.points || 0;
      const averageScore = classStudents.reduce((sum, s) => sum + (s.points || 0), 0) / totalStudents;

      res.json({
        studentId,
        rank: studentRank,
        totalStudents,
        points: studentPoints,
        averageScore
      });
    } catch (error) {
      console.error("Error fetching class ranking:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student activity log
  app.get("/api/students/:id/activity-log", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      // Get homework activities
      const homeworkActivities = await db
        .select({
          id: sql`CONCAT('hw-', ${homeworkSubmissions.id})`,
          type: sql`'homework'`,
          title: homework.title,
          timestamp: homeworkSubmissions.submittedAt,
          points: sql`10`,
          score: homeworkSubmissions.score,
          status: sql`CASE WHEN ${homeworkSubmissions.isCompleted} = true THEN 'completed' ELSE 'started' END`
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .where(eq(homeworkSubmissions.studentId, studentId));

      // Get exercise activities
      const exerciseActivities = await db
        .select({
          id: sql`CONCAT('ex-', ${exerciseSubmissions.id})`,
          type: sql`'exercise'`,
          title: exercises.title,
          timestamp: exerciseSubmissions.submittedAt,
          points: sql`10`,
          score: exerciseSubmissions.score,
          status: sql`CASE WHEN ${exerciseSubmissions.isCompleted} = true THEN 'completed' ELSE 'started' END`
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(eq(exerciseSubmissions.studentId, studentId));

      // Combine and sort activities
      const allActivities = [...homeworkActivities, ...exerciseActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20); // Limit to last 20 activities

      res.json(allActivities);
    } catch (error) {
      console.error("Error fetching activity log:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student strengths and weaknesses analysis
  app.get("/api/students/:id/analysis", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      // For now, provide sample analysis data. In a real system, this would be calculated from submissions
      const analysisData = [
        {
          topic: "Algebraic Expressions",
          strength: 85,
          totalAttempts: 12,
          successRate: 83,
          areas: ["Simplification", "Variable manipulation"]
        },
        {
          topic: "Linear Equations",
          strength: 45,
          totalAttempts: 8,
          successRate: 50,
          areas: ["Equation solving", "Graphing"]
        },
        {
          topic: "Quadratic Functions",
          strength: 72,
          totalAttempts: 6,
          successRate: 67,
          areas: ["Factoring", "Vertex form"]
        },
        {
          topic: "Geometry Basics",
          strength: 38,
          totalAttempts: 10,
          successRate: 40,
          areas: ["Area calculations", "Angle relationships"]
        }
      ];

      res.json(analysisData);
    } catch (error) {
      console.error("Error fetching student analysis:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate personalized lesson
  app.post("/api/lessons/generate", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentId, topic, title, weaknesses } = req.body;
      
      // Mock lesson generation - in a real system this would use AI
      const lessonContent = `# ${title}

This personalized lesson has been created to help improve understanding in ${topic}.

## Focus Areas
Based on the analysis, we'll focus on:
${weaknesses.map((w: string) => `- ${w}`).join('\n')}

## Lesson Content

### Introduction
Understanding ${topic} is crucial for building a strong foundation in mathematics.

### Key Concepts
1. **Basic Principles**: Start with fundamental concepts
2. **Practice Examples**: Work through step-by-step examples
3. **Common Mistakes**: Learn what to avoid

### Practice Problems
1. Problem 1: [Custom problem based on weaknesses]
2. Problem 2: [Progressive difficulty]
3. Problem 3: [Advanced application]

### Summary
Review the key points and practice regularly to improve in this area.

*Generated on ${new Date().toLocaleDateString()} for personalized learning.*`;

      res.json({ content: lessonContent });
    } catch (error) {
      console.error("Error generating lesson:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Teacher Analytics API Routes

  // Get class analytics for teachers
  app.get("/api/teacher/analytics/classes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access class analytics" });
      }

      const { classId, timeRange = 'week' } = req.query;

      // Get teacher by user ID
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      // Get teacher's classes
      const classes = await storage.getClassesByTeacher(teacher.id);

      // Filter by specific class if provided
      const targetClasses = classId && classId !== 'all' 
        ? classes.filter(c => c.id === parseInt(classId as string))
        : classes;

      // Calculate analytics for each class
      const classAnalytics = await Promise.all(
        targetClasses.map(async (classData) => {
          // Get students in this class
          const students = await storage.getStudentsByClass(classData.id);
          
          // Get active students (those who have submitted work recently)
          const activeStudentIds = new Set();
          
          // Calculate time range filter
          const now = new Date();
          let startDate: Date;
          switch (timeRange) {
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              break;
            case 'term':
              startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
              break;
            case 'year':
              startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              break;
            default:
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          }

          // Get homework submissions in time range
          const homeworkScores: number[] = [];
          const exerciseScores: number[] = [];
          
          for (const student of students) {
            // Get ALL homework submissions (no time filter to match home screen)
            const homeworkSubs = await db
              .select({
                id: homeworkSubmissions.id,
                score: homeworkSubmissions.score,
                submittedAt: homeworkSubmissions.submittedAt
              })
              .from(homeworkSubmissions)
              .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
              .where(
                and(
                  eq(homeworkSubmissions.studentId, student.id),
                  eq(homework.classId, classData.id),
                  eq(homeworkSubmissions.isCompleted, true)
                )
              );
            
            // Get ALL exercise submissions (no time filter to match home screen)
            const exerciseSubs = await db
              .select({
                id: exerciseSubmissions.id,
                score: exerciseSubmissions.score,
                submittedAt: exerciseSubmissions.submittedAt
              })
              .from(exerciseSubmissions)
              .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
              .where(
                and(
                  eq(exerciseSubmissions.studentId, student.id),
                  eq(exercises.subject, classData.subject),
                  eq(exercises.grade, classData.grade),
                  isNull(exercises.generatedFor), // Exclude personalized exercises
                  eq(exercises.isTutorial, false), // Exclude tutorial exercises
                  eq(exerciseSubmissions.isCompleted, true)
                )
              );

            // Add to active students if they have any submissions
            if (homeworkSubs.length > 0 || exerciseSubs.length > 0) {
              activeStudentIds.add(student.id);
            }

            // Use same percentage calculation method as home screen 
            for (const hw of homeworkSubs) {
              const [submissionInfo] = await db
                .select({
                  score: homeworkSubmissions.score,
                  totalMarks: homeworkSubmissions.totalMarks
                })
                .from(homeworkSubmissions)
                .where(eq(homeworkSubmissions.id, hw.id || 0));
              
              if (submissionInfo?.totalMarks && submissionInfo.totalMarks > 0) {
                const percentage = (submissionInfo.score || 0) / submissionInfo.totalMarks * 100;
                homeworkScores.push(percentage);
              }
            }
            
            for (const ex of exerciseSubs) {
              const [submissionInfo] = await db
                .select({
                  score: exerciseSubmissions.score,
                  totalMarks: exerciseSubmissions.totalMarks
                })
                .from(exerciseSubmissions)
                .where(eq(exerciseSubmissions.id, ex.id || 0));
              
              if (submissionInfo?.totalMarks && submissionInfo.totalMarks > 0) {
                const percentage = (submissionInfo.score || 0) / submissionInfo.totalMarks * 100;
                exerciseScores.push(percentage);
              }
            }
          }

          // Calculate averages from percentages (to match home screen calculation)
          const allScores = [...homeworkScores, ...exerciseScores];
          const averageScore = allScores.length > 0 
            ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
            : 0;

          // Calculate completion rate (students who submitted work / total students)
          const completionRate = students.length > 0 
            ? Math.round((activeStudentIds.size / students.length) * 100)
            : 0;

          return {
            id: classData.id,
            name: classData.name,
            totalStudents: students.length,
            averageScore,
            completionRate,
            activeStudents: activeStudentIds.size,
            subject: classData.subject,
            grade: classData.grade.toString()
          };
        })
      );

      res.json(classAnalytics);
    } catch (error) {
      console.error("Error fetching class analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get school-wide analytics for teachers
  app.get("/api/teacher/analytics/school", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access school analytics" });
      }

      const { timeRange = 'week' } = req.query;

      // Get teacher by user ID
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      // Get teacher's classes to determine their primary grade/subject
      const teacherClasses = await storage.getClassesByTeacher(teacher.id);
      if (teacherClasses.length === 0) {
        return res.json({
          totalClasses: 0,
          totalStudents: 0,
          averagePerformance: 0,
          totalHomeworkCompleted: 0,
          totalExercisesCompleted: 0,
          topPerformingClass: "No data available"
        });
      }

      // Use the first class to determine grade/subject focus for school-wide data
      const primaryClass = teacherClasses[0];
      const targetGrade = primaryClass.grade;
      const targetSubject = primaryClass.subject;

      // Get ALL classes in the school for the same grade/subject combination
      const allSchoolClasses = await db
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.grade, targetGrade),
            eq(classes.subject, targetSubject)
          )
        );
      
      // Calculate time range filter
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'term':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      console.log(`📊 School Analytics: Fetching data for Grade ${targetGrade} ${targetSubject}`);
      console.log(`📊 Found ${allSchoolClasses.length} classes in school for this grade/subject`);

      // Aggregate data across ALL school classes for this grade/subject
      let totalStudents = 0;
      let totalHomeworkCompleted = 0;
      let totalExercisesCompleted = 0;
      const allScores: number[] = [];
      const classPerformances: { name: string; avgScore: number }[] = [];

      for (const classData of allSchoolClasses) {
        const students = await storage.getStudentsByClass(classData.id);
        totalStudents += students.length;

        const classScores: number[] = [];

        for (const student of students) {
          // Get ALL homework submissions for this specific class (for performance calculation)
          const homeworkSubs = await db
            .select({
              score: homeworkSubmissions.score,
              isCompleted: homeworkSubmissions.isCompleted,
              submittedAt: homeworkSubmissions.submittedAt
            })
            .from(homeworkSubmissions)
            .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
            .where(
              and(
                eq(homeworkSubmissions.studentId, student.id),
                eq(homework.classId, classData.id)
              )
            );

          // Get ALL exercise submissions for this grade/subject (for performance calculation)
          const exerciseSubs = await db
            .select({
              score: exerciseSubmissions.score,
              isCompleted: exerciseSubmissions.isCompleted,
              submittedAt: exerciseSubmissions.submittedAt
            })
            .from(exerciseSubmissions)
            .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
            .where(
              and(
                eq(exerciseSubmissions.studentId, student.id),
                eq(exercises.subject, targetSubject),
                eq(exercises.grade, targetGrade),
                isNull(exercises.generatedFor) // Only count admin exercises
              )
            );

          // Count completed assignments in the selected time range (for activity metrics)
          const recentHomeworkSubs = homeworkSubs.filter(h => 
            h.isCompleted && h.submittedAt && new Date(h.submittedAt) >= startDate
          );
          const recentExerciseSubs = exerciseSubs.filter(e => 
            e.isCompleted && e.submittedAt && new Date(e.submittedAt) >= startDate
          );
          
          totalHomeworkCompleted += recentHomeworkSubs.length;
          totalExercisesCompleted += recentExerciseSubs.length;

          // Collect ALL completed scores for performance calculation (not time-filtered)
          const validHomeworkScores = homeworkSubs
            .filter(h => h.isCompleted)
            .map(h => Number(h.score) || 0);
          const validExerciseScores = exerciseSubs
            .filter(e => e.isCompleted)
            .map(e => Number(e.score) || 0);

          console.log(`📊 Student ${student.id}: ${validHomeworkScores.length} homework scores, ${validExerciseScores.length} exercise scores`);
          classScores.push(...validHomeworkScores, ...validExerciseScores);
        }

        allScores.push(...classScores);

        // Calculate class average for ranking
        const classAverage = classScores.length > 0 
          ? Math.round(classScores.reduce((sum, score) => sum + score, 0) / classScores.length)
          : 0;
        
        classPerformances.push({
          name: classData.name,
          avgScore: classAverage
        });
      }

      // Calculate overall average performance
      const averagePerformance = allScores.length > 0 
        ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
        : 0;

      // Find top performing class with more context
      const topPerformingClass = classPerformances.length > 0
        ? classPerformances.reduce((top, current) => current.avgScore > top.avgScore ? current : top)
        : null;

      // Combine homework and exercise completed counts for total assignments
      const totalAssignmentsCompleted = totalHomeworkCompleted + totalExercisesCompleted;

      // Create more descriptive top class information
      let topClassDisplay = "";
      if (classPerformances.length > 1) {
        // Multiple classes - show the actual leader
        topClassDisplay = `${topPerformingClass?.name || "Unknown"} (${topPerformingClass?.avgScore || 0}% avg)`;
      } else if (classPerformances.length === 1) {
        // Single class - show it as the only class in this grade/subject
        topClassDisplay = `${topPerformingClass?.name || "Unknown"} - Only ${targetGrade} ${targetSubject.charAt(0).toUpperCase() + targetSubject.slice(1)} class`;
      } else {
        topClassDisplay = `No ${targetGrade} ${targetSubject} classes found`;
      }

      // Get top 3 classes and their top 3 performers
      const top3Classes = classPerformances
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 3);

      // Get top 3 performers for each class
      const classLeaderboards = [];
      for (const classData of allSchoolClasses) {
        const students = await storage.getStudentsByClass(classData.id);
        const studentPerformances = [];

        for (const student of students) {
          // Get ALL scores for this student in this class
          const homeworkSubs = await db
            .select({
              score: homeworkSubmissions.score,
              isCompleted: homeworkSubmissions.isCompleted
            })
            .from(homeworkSubmissions)
            .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
            .where(
              and(
                eq(homeworkSubmissions.studentId, student.id),
                eq(homework.classId, classData.id),
                eq(homeworkSubmissions.isCompleted, true)
              )
            );

          const exerciseSubs = await db
            .select({
              score: exerciseSubmissions.score,
              isCompleted: exerciseSubmissions.isCompleted
            })
            .from(exerciseSubmissions)
            .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
            .where(
              and(
                eq(exerciseSubmissions.studentId, student.id),
                eq(exercises.subject, targetSubject),
                eq(exercises.grade, targetGrade),
                eq(exerciseSubmissions.isCompleted, true),
                isNull(exercises.generatedFor)
              )
            );

          const allScores = [
            ...homeworkSubs.map(h => Number(h.score) || 0),
            ...exerciseSubs.map(e => Number(e.score) || 0)
          ];

          if (allScores.length > 0) {
            const avgScore = Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length);
            studentPerformances.push({
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              studentId: student.studentId,
              avgScore,
              totalAssignments: allScores.length
            });
          }
        }

        // Get top 3 performers for this class
        const top3Students = studentPerformances
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 3);

        classLeaderboards.push({
          classId: classData.id,
          className: classData.name,
          classAverage: classPerformances.find(c => c.name === classData.name)?.avgScore || 0,
          topPerformers: top3Students
        });
      }

      console.log(`📊 School Analytics Results:`);
      console.log(`   Total Classes: ${allSchoolClasses.length}`);
      console.log(`   Total Students: ${totalStudents}`);
      console.log(`   Average Performance: ${averagePerformance}%`);
      console.log(`   Total Assignments Completed: ${totalAssignmentsCompleted}`);
      console.log(`   Top Class: ${topClassDisplay}`);
      console.log(`   Class Breakdown: ${classPerformances.map(c => `${c.name}(${c.avgScore}%)`).join(", ")}`);

      const schoolAnalytics = {
        totalClasses: allSchoolClasses.length,
        totalStudents,
        averagePerformance,
        totalHomeworkCompleted: totalAssignmentsCompleted, // Combined total for UI
        totalExercisesCompleted, // Keep separate for detailed analytics
        topPerformingClass: topClassDisplay,
        top3Classes: top3Classes,
        classLeaderboards: classLeaderboards
      };

      res.json(schoolAnalytics);
    } catch (error) {
      console.error("Error fetching school analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get detailed class analytics for a specific class
  app.get("/api/class-analytics/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher') {
        return res.status(403).json({ message: "Only teachers can access class analytics" });
      }

      const classId = parseInt(req.params.id);
      
      // Get teacher by user ID
      const teacher = await storage.getTeacherByUserId(req.user.id);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher profile not found" });
      }

      // Verify teacher owns this class
      const classData = await storage.getClass(classId);
      if (!classData || classData.teacherId !== teacher.id) {
        return res.status(403).json({ message: "Access denied to this class" });
      }

      // Get students in the class
      const students = await storage.getStudentsByClass(classId);
      
      // Calculate real performance distribution based on actual student data
      const studentPerformances = [];
      
      for (const student of students) {
        // Get homework submissions for this student in this class
        const homeworkSubs = await db.select({
          score: homeworkSubmissions.score
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .where(and(
          eq(homework.classId, classId),
          eq(homeworkSubmissions.studentId, student.id),
          eq(homeworkSubmissions.isCompleted, true)
        ));

        // Get exercise submissions for this student (grade/subject match)
        const exerciseSubs = await db.select({
          score: exerciseSubmissions.score
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(and(
          eq(exercises.grade, classData.grade),
          eq(exercises.subject, classData.subject),
          eq(exerciseSubmissions.studentId, student.id),
          eq(exerciseSubmissions.isCompleted, true)
        ));

        // Calculate average score for this student
        const allScores = [
          ...homeworkSubs.map(sub => Number(sub.score) || 0),
          ...exerciseSubs.map(sub => Number(sub.score) || 0)
        ];
        
        const avgScore = allScores.length > 0 
          ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
          : 0;
        
        studentPerformances.push({
          student,
          avgScore,
          totalSubmissions: allScores.length
        });
      }

      // Calculate performance distribution based on actual scores
      const distribution = [
        { range: "90-100%", count: 0, percentage: 0 },
        { range: "80-89%", count: 0, percentage: 0 },
        { range: "70-79%", count: 0, percentage: 0 },
        { range: "60-69%", count: 0, percentage: 0 },
        { range: "Below 60%", count: 0, percentage: 0 }
      ];

      studentPerformances.forEach(perf => {
        if (perf.avgScore >= 90) distribution[0].count++;
        else if (perf.avgScore >= 80) distribution[1].count++;
        else if (perf.avgScore >= 70) distribution[2].count++;
        else if (perf.avgScore >= 60) distribution[3].count++;
        else distribution[4].count++;
      });

      // Calculate percentages
      const totalStudents = studentPerformances.length;
      distribution.forEach(range => {
        range.percentage = totalStudents > 0 ? Math.round((range.count / totalStudents) * 100) : 0;
      });

      // Calculate overall class metrics
      const validPerformances = studentPerformances.filter(p => p.totalSubmissions > 0);
      const classAvgScore = validPerformances.length > 0
        ? Math.round(validPerformances.reduce((sum, p) => sum + p.avgScore, 0) / validPerformances.length)
        : 0;

      // Sort for top and struggling students
      const sortedPerformances = [...validPerformances].sort((a, b) => b.avgScore - a.avgScore);
      
      // Use the correctly calculated homework and exercise completion rates
      // We'll calculate this after we get the homework and exercise performance data

      // Filter top performers (only those above 70%)
      const actualTopPerformers = sortedPerformances.filter(perf => perf.avgScore > 70);

      const detailedAnalytics = {
        totalStudents: students.length,
        averageScore: classAvgScore,
        completionRate: 0, // Will be calculated after homework and exercise data
        topPerformers: actualTopPerformers.slice(0, 3).map((perf) => ({
          id: perf.student.id,
          studentId: perf.student.studentId,
          firstName: perf.student.firstName,
          lastName: perf.student.lastName,
          averageScore: perf.avgScore
        })),
        strugglingStudents: sortedPerformances.slice(-2).map((perf) => ({
          id: perf.student.id,
          studentId: perf.student.studentId,
          firstName: perf.student.firstName,
          lastName: perf.student.lastName,
          averageScore: perf.avgScore
        })),
        classComparison: await (async () => {
          // Get real class comparison data by fetching teacher's other classes
          const teacherClasses = await db.select({
            id: classes.id,
            name: classes.name,
            grade: classes.grade,
            subject: classes.subject
          })
          .from(classes)
          .where(eq(classes.teacherId, teacher.id));

          // Calculate performance for each class
          const classPerformances = [];
          
          for (const teacherClass of teacherClasses) {
            const classStudents = await storage.getStudentsByClass(teacherClass.id);
            
            if (classStudents.length === 0) {
              classPerformances.push({
                classId: teacherClass.id,
                className: teacherClass.name,
                avgScore: 0
              });
              continue;
            }

            let totalScores = 0;
            let totalSubmissions = 0;

            for (const classStudent of classStudents) {
              // Get homework scores for this student in this class
              const hwScores = await db.select({ score: homeworkSubmissions.score })
                .from(homeworkSubmissions)
                .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
                .where(and(
                  eq(homework.classId, teacherClass.id),
                  eq(homeworkSubmissions.studentId, classStudent.id),
                  eq(homeworkSubmissions.isCompleted, true)
                ));

              // Get exercise scores for this student (grade/subject match)
              const exScores = await db.select({ score: exerciseSubmissions.score })
                .from(exerciseSubmissions)
                .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
                .where(and(
                  eq(exercises.grade, teacherClass.grade),
                  eq(exercises.subject, teacherClass.subject),
                  eq(exerciseSubmissions.studentId, classStudent.id),
                  eq(exerciseSubmissions.isCompleted, true)
                ));

              const studentScores = [
                ...hwScores.map(s => Number(s.score) || 0),
                ...exScores.map(s => Number(s.score) || 0)
              ];

              totalScores += studentScores.reduce((sum, score) => sum + score, 0);
              totalSubmissions += studentScores.length;
            }

            const classAverage = totalSubmissions > 0 ? Math.round(totalScores / totalSubmissions) : 0;
            classPerformances.push({
              classId: teacherClass.id,
              className: teacherClass.name,
              avgScore: classAverage
            });
          }

          // Find actual top performing class
          const topClass = classPerformances.length > 0 
            ? classPerformances.reduce((top, current) => current.avgScore > top.avgScore ? current : top)
            : null;

          // Calculate school average (average of all teacher's classes)
          const schoolAvg = classPerformances.length > 0 
            ? Math.round(classPerformances.reduce((sum, cls) => sum + cls.avgScore, 0) / classPerformances.length)
            : 0;

          // Generate realistic weekly comparison data based on actual performance
          return Array.from({length: 6}, (_, i) => ({
            week: `Week ${6-i}`,
            currentClass: classAvgScore,
            schoolAverage: schoolAvg,
            topPerformingClass: topClass ? topClass.avgScore : classAvgScore
          }));
        })(),
        weeklyProgress: await (async () => {
          // Generate real weekly progress data based on actual submissions
          const weeksBack = 6;
          const weeklyData = [];
          
          for (let i = 0; i < weeksBack; i++) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const weekStartStr = weekStart.toISOString().split('T')[0];
            const weekEndStr = weekEnd.toISOString().split('T')[0];

            // Get homework submissions for this week
            const weekHomeworkSubs = await db.select({
              score: homeworkSubmissions.score
            })
            .from(homeworkSubmissions)
            .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
            .where(and(
              eq(homework.classId, classId),
              eq(homeworkSubmissions.isCompleted, true),
              sql`DATE(${homeworkSubmissions.submittedAt}) BETWEEN ${weekStartStr} AND ${weekEndStr}`
            ));

            // Get exercise submissions for this week
            const weekExerciseSubs = await db.select({
              score: exerciseSubmissions.score
            })
            .from(exerciseSubmissions)
            .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
            .where(and(
              eq(exercises.grade, classData.grade),
              eq(exercises.subject, classData.subject),
              eq(exerciseSubmissions.isCompleted, true),
              isNull(exercises.generatedFor), // Only admin exercises
              sql`DATE(${exerciseSubmissions.submittedAt}) BETWEEN ${weekStartStr} AND ${weekEndStr}`
            ));

            // Calculate average score for the week
            const allWeekScores = [
              ...weekHomeworkSubs.map(sub => Number(sub.score) || 0),
              ...weekExerciseSubs.map(sub => Number(sub.score) || 0)
            ];

            const weekAvgScore = allWeekScores.length > 0 
              ? Math.round(allWeekScores.reduce((sum, score) => sum + score, 0) / allWeekScores.length)
              : 0;

            weeklyData.unshift({
              week: `Week ${weeksBack - i}`,
              avgScore: weekAvgScore,
              submissions: allWeekScores.length,
              homeworkSubmissions: weekHomeworkSubs.length,
              exerciseSubmissions: weekExerciseSubs.length
            });
          }

          return weeklyData;
        })(),
        performanceDistribution: distribution,
        homeworkPerformance: await (async () => {
          // Get real homework data for this class
          const homeworkAssignments = await db.select({
            id: homework.id
          })
          .from(homework)
          .where(eq(homework.classId, classId));

          const totalHomeworkAssigned = homeworkAssignments.length;
          
          // Get completed homework submissions
          const completedHomework = await db.select({
            score: homeworkSubmissions.score,
            submittedAt: homeworkSubmissions.submittedAt,
            dueDate: homework.dueDate
          })
          .from(homeworkSubmissions)
          .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
          .where(and(
            eq(homework.classId, classId),
            eq(homeworkSubmissions.isCompleted, true)
          ));

          const totalCompleted = completedHomework.length;
          const avgHomeworkScore = totalCompleted > 0 
            ? Math.round(completedHomework.reduce((sum, hw) => sum + (Number(hw.score) || 0), 0) / totalCompleted)
            : 0;

          // Calculate on-time vs late submissions
          let onTimeSubmissions = 0;
          let lateSubmissions = 0;
          
          completedHomework.forEach(hw => {
            if (hw.submittedAt && hw.dueDate) {
              if (new Date(hw.submittedAt) <= new Date(hw.dueDate)) {
                onTimeSubmissions++;
              } else {
                lateSubmissions++;
              }
            }
          });

          return {
            totalAssigned: totalHomeworkAssigned,
            totalCompleted,
            averageScore: avgHomeworkScore,
            onTimeSubmissions,
            lateSubmissions
          };
        })(),
        exercisePerformance: await (async () => {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];

          // Get real exercise data for this class (grade/subject match) - only up to today
          const exerciseAssignments = await db.select({
            id: exercises.id,
            date: exercises.date
          })
          .from(exercises)
          .where(and(
            eq(exercises.grade, classData.grade),
            eq(exercises.subject, classData.subject),
            isNull(exercises.generatedFor), // Only admin exercises, not personalized
            eq(exercises.isTutorial, false),
            sql`${exercises.date} <= ${todayStr}` // Only exercises up to today
          ));

          const totalExercisesToDate = exerciseAssignments.length;
          
          // Calculate expected total completions (exercises * students)
          const expectedCompletions = totalExercisesToDate * students.length;
          
          // Get completed exercise submissions (ONLY for admin exercises)
          const completedExercises = await db.select({
            score: exerciseSubmissions.score,
            studentId: exerciseSubmissions.studentId,
            exerciseId: exerciseSubmissions.exerciseId
          })
          .from(exerciseSubmissions)
          .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
          .where(and(
            eq(exercises.grade, classData.grade),
            eq(exercises.subject, classData.subject),
            eq(exerciseSubmissions.isCompleted, true),
            isNull(exercises.generatedFor), // CRITICAL: Only admin exercises for completion rate
            inArray(exerciseSubmissions.studentId, students.map(s => s.id)),
            sql`${exercises.date} <= ${todayStr}` // Only exercises up to today
          ));

          const actualCompletions = completedExercises.length;
          const completionRate = expectedCompletions > 0 
            ? Math.round((actualCompletions / expectedCompletions) * 100)
            : 0;

          // Debug logging for completion rate
          console.log(`🔍 Exercise completion debug for class ${classId}:`, {
            totalExercisesToDate,
            studentsCount: students.length,
            expectedCompletions,
            actualCompletions,
            completionRate,
            completedExercisesDetails: completedExercises.map(ex => ({
              studentId: ex.studentId,
              exerciseId: ex.exerciseId,
              score: ex.score
            }))
          });

          const avgExerciseScore = actualCompletions > 0 
            ? Math.round(completedExercises.reduce((sum, ex) => sum + (Number(ex.score) || 0), 0) / actualCompletions)
            : 0;

          // Count perfect scores (100%)
          const perfectScores = completedExercises.filter(ex => Number(ex.score) === 100).length;

          // Also get user-generated exercises for display
          const userGeneratedExercises = await db.select({
            id: exercises.id,
            date: exercises.date
          })
          .from(exercises)
          .where(and(
            eq(exercises.grade, classData.grade),
            eq(exercises.subject, classData.subject),
            isNotNull(exercises.generatedFor), // User-generated/personalized exercises
            eq(exercises.isTutorial, false),
            sql`${exercises.date} <= ${todayStr}` // Only exercises up to today
          ));

          // Calculate submission timing for exercises (like homework)
          let onTimeExerciseSubmissions = 0;
          let lateExerciseSubmissions = 0;

          // Get detailed exercise submissions with timestamps
          const exerciseSubmissionsWithTiming = await db.select({
            submissionTime: exerciseSubmissions.submittedAt,
            exerciseId: exerciseSubmissions.exerciseId,
            exerciseDate: exercises.date
          })
          .from(exerciseSubmissions)
          .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
          .where(and(
            eq(exercises.grade, classData.grade),
            eq(exercises.subject, classData.subject),
            eq(exerciseSubmissions.isCompleted, true),
            isNull(exercises.generatedFor), // Only admin exercises
            inArray(exerciseSubmissions.studentId, students.map(s => s.id)),
            sql`${exercises.date} <= ${todayStr}`
          ));

          // Count on-time vs late submissions
          exerciseSubmissionsWithTiming.forEach(sub => {
            if (sub.submissionTime && sub.exerciseDate) {
              // Exercise is considered "late" if submitted after the exercise date
              const exerciseDate = new Date(sub.exerciseDate);
              const submissionDate = new Date(sub.submissionTime);
              
              // Set end of day for exercise date
              exerciseDate.setHours(23, 59, 59, 999);
              
              if (submissionDate <= exerciseDate) {
                onTimeExerciseSubmissions++;
              } else {
                lateExerciseSubmissions++;
              }
            }
          });

          return {
            totalAssigned: totalExercisesToDate,
            totalCompleted: actualCompletions,
            completionRate,
            averageScore: avgExerciseScore,
            perfectScores,
            userGeneratedCount: userGeneratedExercises.length,
            onTimeSubmissions: onTimeExerciseSubmissions,
            lateSubmissions: lateExerciseSubmissions
          };
        })()
      };

      // Calculate the overall completion rate based on homework and exercise completion rates
      const homeworkWeight = detailedAnalytics.homeworkPerformance.totalAssigned;
      const exerciseWeight = detailedAnalytics.exercisePerformance.totalAssigned;
      const totalAssignments = homeworkWeight + exerciseWeight;
      
      if (totalAssignments > 0) {
        const homeworkCompletionRate = detailedAnalytics.homeworkPerformance.totalAssigned > 0 
          ? Math.round((detailedAnalytics.homeworkPerformance.totalCompleted / detailedAnalytics.homeworkPerformance.totalAssigned) * 100)
          : 0;
        
        const exerciseCompletionRate = detailedAnalytics.exercisePerformance.completionRate;
        
        // Weighted average based on number of assignments
        const overallCompletionRate = Math.round(
          ((homeworkCompletionRate * homeworkWeight) + (exerciseCompletionRate * exerciseWeight)) / totalAssignments
        );
        
        detailedAnalytics.completionRate = overallCompletionRate;
      }

      res.json(detailedAnalytics);
    } catch (error) {
      console.error("Error fetching detailed class analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student work metrics (missed work, upcoming work)
  app.get("/api/students/:studentId/metrics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentUserId = parseInt(req.params.studentId);
      
      // Get student record
      const student = await storage.getStudentByUserId(studentUserId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get all exercises for the student's grade from January to today to find missed ones
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const startOfYearStr = startOfYear.toISOString().split('T')[0];
      
      const allExercises = await storage.getExercisesByDateRange(
        startOfYearStr, 
        yesterdayStr, 
        student.gradeLevel || '8'
      );
      
      // Get exercises for tomorrow
      const tomorrowExercises = await storage.getExercisesByDate(
        tomorrowStr,
        student.gradeLevel || '8'
      );

      // Count missed exercises (not completed and overdue)
      let missedExerciseCount = 0;
      for (const exercise of allExercises) {
        try {
          const submission = await storage.getExerciseSubmission(exercise.id, student.id);
          if (!submission || !submission.isCompleted) {
            missedExerciseCount++;
          }
        } catch (error) {
          // No submission found, count as missed
          missedExerciseCount++;
        }
      }

      // Count upcoming exercises for tomorrow
      const upcomingExerciseCount = tomorrowExercises.length;

      // For now, we'll focus on exercises since homework queries are complex
      // and the main metric the user cares about seems to be the exercise count
      res.json({
        missedWork: {
          count: missedExerciseCount,
          items: allExercises.slice(0, 10) // Sample of missed items
        },
        upcomingWork: {
          count: upcomingExerciseCount,
          items: tomorrowExercises
        }
      });
    } catch (error) {
      console.error("Error fetching student metrics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student latest homework and exercises for dashboard preview
  app.get("/api/students/:studentId/latest-work", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentUserId = parseInt(req.params.studentId);
      
      // Get student record
      const student = await storage.getStudentByUserId(studentUserId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Get latest 2 homework assignments for enrolled classes
      const latestHomework = await db.select({
        id: homework.id,
        title: homework.title,
        subject: classes.subject,
        dueDate: homework.dueDate,
        isCompleted: sql<boolean>`CASE WHEN homework_submissions.is_completed IS TRUE THEN true ELSE false END`.as('isCompleted'),
        submittedAt: homeworkSubmissions.submittedAt,
        type: sql<string>`'homework'`.as('type')
      })
      .from(homework)
      .innerJoin(classes, eq(homework.classId, classes.id))
      .innerJoin(classStudents, eq(classes.id, classStudents.classId))
      .innerJoin(students, eq(classStudents.studentId, students.id))
      .leftJoin(homeworkSubmissions, and(
        eq(homeworkSubmissions.homeworkId, homework.id),
        eq(homeworkSubmissions.studentId, student.id)
      ))
      .where(and(
        eq(students.userId, studentUserId),
        eq(homework.published, true)
      ))
      .orderBy(desc(homework.dueDate))
      .limit(2);

      // Get latest 2 exercises for the student's subjects
      const latestExercises = await db.select({
        id: exercises.id,
        title: exercises.title,
        subject: exercises.subject,
        dueDate: sql<Date>`NULL`.as('dueDate'), // exercises don't have due dates
        isCompleted: sql<boolean>`CASE WHEN exercise_submissions.is_completed IS TRUE THEN true ELSE false END`.as('isCompleted'),
        submittedAt: exerciseSubmissions.submittedAt,
        type: sql<string>`'exercise'`.as('type')
      })
      .from(exercises)
      .innerJoin(classStudents, eq(exercises.subject, sql`(SELECT subject FROM classes WHERE id = ${classStudents.classId})`))
      .innerJoin(students, eq(classStudents.studentId, students.id))
      .leftJoin(exerciseSubmissions, and(
        eq(exerciseSubmissions.exerciseId, exercises.id),
        eq(exerciseSubmissions.studentId, student.id)
      ))
      .where(and(
        eq(students.userId, studentUserId),
        eq(exercises.grade, student.gradeLevel || ''),
        isNull(exercises.generatedFor), // Only admin-created exercises
        eq(exercises.isTutorial, false) // Exclude tutorial exercises
      ))
      .orderBy(desc(exercises.createdAt))
      .limit(2);

      // Combine and format the results
      const allWork = [...latestHomework, ...latestExercises]
        .map(work => ({
          id: work.id,
          title: work.title,
          subject: work.subject,
          type: work.type,
          dueDate: work.dueDate,
          isCompleted: work.isCompleted,
          status: work.isCompleted ? 'completed' : (work.dueDate && new Date(work.dueDate) < new Date() ? 'overdue' : 'pending'),
          submittedAt: work.submittedAt,
          timeAgo: work.dueDate ? getTimeAgo(new Date(work.dueDate)) : null
        }))
        .slice(0, 2); // Limit to 2 items for dashboard preview

      res.json(allWork);
    } catch (error) {
      console.error("Error fetching latest work:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student weekly schedule
  app.get("/api/students/:studentId/schedule", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentUserId = parseInt(req.params.studentId);
      
      // Get student record
      const student = await storage.getStudentByUserId(studentUserId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Get upcoming exercises and homework for the next 7 days
      const today = new Date();
      const weekSchedule = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 1; i <= 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        // Skip weekends
        if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
          continue;
        }
        
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayName = dayNames[checkDate.getDay()];
        
        // Look for exercises for this date
        const exerciseResults = await db.select({
          title: exercises.title,
          subject: exercises.subject,
          description: exercises.description
        })
        .from(exercises)
        .where(and(
          eq(exercises.date, dateStr),
          eq(exercises.grade, '8'),
          isNull(exercises.generatedFor),
          eq(exercises.isTutorial, false)
        ))
        .limit(1);

        if (exerciseResults.length > 0) {
          const exercise = exerciseResults[0];
          weekSchedule.push({
            day: dayName,
            date: checkDate.getDate(),
            month: checkDate.toLocaleDateString('en-US', { month: 'short' }),
            subject: exercise.subject,
            title: exercise.title,
            description: exercise.description || 'Practice Exercise',
            type: 'exercise'
          });
        }

        // Look for homework due on this date
        const homeworkResults = await db.select({
          title: homework.title,
          subject: classes.subject,
          description: homework.description
        })
        .from(homework)
        .innerJoin(classes, eq(homework.classId, classes.id))
        .innerJoin(classStudents, eq(classes.id, classStudents.classId))
        .innerJoin(students, eq(classStudents.studentId, students.id))
        .where(and(
          eq(students.userId, studentUserId),
          eq(homework.published, true),
          sql`DATE(homework.due_date) = ${dateStr}`
        ))
        .limit(1);

        if (homeworkResults.length > 0 && exerciseResults.length === 0) {
          const homeworkItem = homeworkResults[0];
          weekSchedule.push({
            day: dayName,
            date: checkDate.getDate(),
            month: checkDate.toLocaleDateString('en-US', { month: 'short' }),
            subject: homeworkItem.subject,
            title: homeworkItem.title,
            description: homeworkItem.description || 'Homework Assignment',
            type: 'homework'
          });
        }
      }

      res.json(weekSchedule);
    } catch (error) {
      console.error("Error fetching weekly schedule:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get student recent activity
  app.get("/api/students/:studentId/activity", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentUserId = parseInt(req.params.studentId);
      
      // Get student record
      const student = await storage.getStudentByUserId(studentUserId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Get recent homework submissions
      const recentHomework = await db.select({
        id: homeworkSubmissions.id,
        title: homework.title,
        subject: classes.subject,
        completedAt: homeworkSubmissions.completedAt,
        score: homeworkSubmissions.score,
        type: sql<string>`'homework'`.as('type')
      })
      .from(homeworkSubmissions)
      .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
      .innerJoin(classes, eq(homework.classId, classes.id))
      .where(and(
        eq(homeworkSubmissions.studentId, student.id),
        eq(homeworkSubmissions.isCompleted, true)
      ))
      .orderBy(desc(homeworkSubmissions.completedAt))
      .limit(10);

      // Get recent exercise submissions  
      const recentExercises = await db.select({
        id: exerciseSubmissions.id,
        title: exercises.title,
        subject: exercises.subject,
        completedAt: exerciseSubmissions.completedAt,
        score: exerciseSubmissions.score,
        type: sql<string>`'exercise'`.as('type')
      })
      .from(exerciseSubmissions)
      .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
      .where(and(
        eq(exerciseSubmissions.studentId, student.id),
        eq(exerciseSubmissions.isCompleted, true)
      ))
      .orderBy(desc(exerciseSubmissions.completedAt))
      .limit(10);

      // Combine and sort all activities
      const allActivities = [...recentHomework, ...recentExercises]
        .filter(activity => activity.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, 3) // Keep only top 3 most recent
        .map(activity => ({
          id: activity.id,
          title: activity.title,
          subject: activity.subject,
          type: activity.type,
          completedAt: activity.completedAt,
          points: activity.type === 'homework' ? 10 : 10, // Points based on type
          timeAgo: getTimeAgo(new Date(activity.completedAt!))
        }));

      res.json(allActivities);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get parent analytics data for all children with real topic feedback
  app.get("/api/parents/analytics", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const parentId = req.user!.id;
      
      // Get all children for this parent
      const children = await storage.getChildrenByParent(parentId);
      
      if (children.length === 0) {
        return res.json([]);
      }
      
      // Get analytics data for each child
      const analyticsData = [];
      
      for (const child of children) {
        if (!child.studentUserId) continue;
        
        // Get student record
        const student = await storage.getStudentByUserId(child.studentUserId);
        if (!student) continue;
        
        // Get basic student stats using existing endpoint logic
        const [userData] = await db.select({
          points: users.points,
          gradeLevel: students.gradeLevel,
          schoolName: students.schoolName
        })
        .from(users)
        .leftJoin(students, eq(users.id, students.userId))
        .where(eq(users.id, child.studentUserId));

        if (!userData) continue;
        
        // Get homework completion count
        const [homeworkStats] = await db.select({
          completed: sql<number>`COUNT(*)`.as('completed')
        })
        .from(homeworkSubmissions)
        .where(and(
          eq(homeworkSubmissions.studentId, student.id),
          eq(homeworkSubmissions.isCompleted, true)
        ));

        // Get exercise completion count  
        const [exerciseStats] = await db.select({
          completed: sql<number>`COUNT(*)`.as('completed')
        })
        .from(exerciseSubmissions)
        .where(and(
          eq(exerciseSubmissions.studentId, student.id),
          eq(exerciseSubmissions.isCompleted, true)
        ));
        
        const homeworkCompleted = Number(homeworkStats?.completed) || 0;
        const exercisesCompleted = Number(exerciseStats?.completed) || 0;
        const totalCompleted = homeworkCompleted + exercisesCompleted;
        
        // Calculate a basic average (using points as proxy)
        const currentAverage = Math.min(100, Math.max(0, (userData.points || 0) / 5)); // Rough conversion
        
        // Get subjects that have real feedback data from homework and exercise submissions
        console.log('🔍 Fetching homework and exercise feedback for student:', student.id);
        
        const homeworkFeedbackData = await db.select({
          id: homeworkSubmissions.id,
          type: sql`'homework'`,
          topicName: sql`'Algebra'`, // Default topic for homework
          subject: sql`'mathematics'`,
          score: homeworkSubmissions.score,
          totalMarks: homeworkSubmissions.totalMarks,
          strengths: sql`${homeworkSubmissions.feedback}->>'strengths'`,
          improvements: sql`${homeworkSubmissions.feedback}->>'improvements'`,
          lastFeedback: homeworkSubmissions.submittedAt
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .where(and(
          eq(homeworkSubmissions.studentId, student.id),
          eq(homeworkSubmissions.isCompleted, true)
        ))
        .orderBy(desc(homeworkSubmissions.submittedAt));

        const exerciseFeedbackData = await db.select({
          id: exerciseSubmissions.id,
          type: sql`'exercise'`,
          topicName: sql`CASE 
            WHEN ${exercises.subject} = 'mathematics' THEN 'Algebra'
            WHEN ${exercises.subject} = 'physical-science' THEN 'Physics'
            ELSE 'General'
          END`,
          subject: exercises.subject,
          score: exerciseSubmissions.score,
          totalMarks: exerciseSubmissions.totalMarks,
          strengths: sql`${exerciseSubmissions.feedback}->>'strengths'`,
          improvements: sql`${exerciseSubmissions.feedback}->>'improvements'`,
          lastFeedback: exerciseSubmissions.submittedAt
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(and(
          eq(exerciseSubmissions.studentId, student.id),
          eq(exerciseSubmissions.isCompleted, true)
        ))
        .orderBy(desc(exerciseSubmissions.submittedAt));

        // Combine homework and exercise feedback data
        const allFeedbackData = [...homeworkFeedbackData, ...exerciseFeedbackData];
        console.log('🔍 Found feedback data:', allFeedbackData.length, 'items for student:', student.id);

        // Group feedback by subject
        const subjectFeedbackMap = new Map<string, any[]>();
        allFeedbackData.forEach(feedback => {
          if (!feedback.subject) return;
          if (!subjectFeedbackMap.has(feedback.subject)) {
            subjectFeedbackMap.set(feedback.subject, []);
          }
          subjectFeedbackMap.get(feedback.subject)!.push(feedback);
        });

        console.log('🔍 Subject feedback groups:', Array.from(subjectFeedbackMap.keys()));
        
        // Process each feedback item to handle JSON parsing properly
        allFeedbackData.forEach(feedback => {
          console.log('🔍 Processing feedback item:', {
            id: feedback.id,
            type: feedback.type,
            topicName: feedback.topicName,
            subject: feedback.subject,
            score: feedback.score,
            totalMarks: feedback.totalMarks,
            strengthsRaw: feedback.strengths,
            improvementsRaw: feedback.improvements
          });
          
          // Parse strengths and improvements if they're JSON strings
          try {
            if (typeof feedback.strengths === 'string') {
              feedback.strengths = JSON.parse(feedback.strengths);
            }
          } catch (e) {
            feedback.strengths = [];
          }
          
          try {
            if (typeof feedback.improvements === 'string') {
              feedback.improvements = JSON.parse(feedback.improvements);
            }
          } catch (e) {
            feedback.improvements = [];
          }
        });

        // Create analytics data for each subject with real feedback
        if (subjectFeedbackMap.size === 0) {
          // If no topic feedback exists, use student's registered subjects or default to Mathematics
          const registeredSubjects = student.subjects && Array.isArray(student.subjects) && student.subjects.length > 0
            ? student.subjects.map((s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase()))
            : ['Mathematics']; // Default to Mathematics only if no subjects registered
          
          for (const subject of registeredSubjects) {
            analyticsData.push({
              id: child.studentUserId?.toString() || '', // Use student's user ID for metrics endpoint
              firstName: child.firstName,
              lastName: child.lastName,
              subject: subject,
              currentAverage: Math.round(currentAverage),
              missedAssessments: Math.max(0, 20 - totalCompleted),
              totalAssessments: 20,
              homeworkCompleted: homeworkCompleted,
              exercisesCompleted: exercisesCompleted,
              totalCompleted: totalCompleted,
              topicScores: {},
              topicDetails: {},
              strengths: ['No assessment data available yet'],
              weaknesses: ['Complete homework and exercises to get personalized feedback'],
              summary: `${child.firstName} needs to complete more assessments to generate AI-powered analytics for ${subject}.`,
              recentTrend: 'stable' as const,
              lastAssessmentDate: '2025-08-08',
              profilePhoto: child.profilePhoto
            });
          }
        } else {
          // Create analytics for subjects with real feedback data
          for (const [subject, feedbacks] of subjectFeedbackMap.entries()) {
            const topicScores: Record<string, number> = {};
            const topicDetails: Record<string, any> = {};
            
            // Calculate average score for this subject
            let totalScore = 0;
            let totalMarks = 0;
            const allStrengths: string[] = [];
            const allImprovements: string[] = [];
            
            // Group feedback by topic first
            const topicFeedbackGroups: Record<string, any[]> = {};
            feedbacks.forEach(feedback => {
              const topicKey = feedback.topicName?.toLowerCase().replace(/\s+/g, '-') || `topic-${feedback.topicId}`;
              if (!topicFeedbackGroups[topicKey]) {
                topicFeedbackGroups[topicKey] = [];
              }
              topicFeedbackGroups[topicKey].push(feedback);
            });

            // Process each topic group to create consolidated feedback
            Object.entries(topicFeedbackGroups).forEach(([topicKey, topicFeedbacks]) => {
              // Calculate average percentage for this topic
              let topicTotalScore = 0;
              let topicTotalMarks = 0;
              const allTopicStrengths = new Set<string>();
              const allTopicWeaknesses = new Set<string>();

              topicFeedbacks.forEach(feedback => {
                topicTotalScore += feedback.score;
                topicTotalMarks += feedback.totalMarks;
                
                totalScore += feedback.score;
                totalMarks += feedback.totalMarks;

                // Process strengths
                if (feedback.strengths) {
                  const strengthText = feedback.strengths.join(' ').toLowerCase();
                  if (strengthText.includes('attempted all') || strengthText.includes('completed')) {
                    allTopicStrengths.add('Shows consistent effort and engagement');
                  }
                  if (strengthText.includes('correctly') || strengthText.includes('right')) {
                    allTopicStrengths.add('Demonstrates understanding of some concepts');
                  }
                  if (strengthText.includes('simplif') || strengthText.includes('combin')) {
                    allTopicStrengths.add('Can apply basic algebraic operations');
                  }
                }
                
                // Process improvements  
                if (feedback.improvements) {
                  const improvementText = feedback.improvements.join(' ').toLowerCase();
                  if (improvementText.includes('factorization') || improvementText.includes('factorize')) {
                    allTopicWeaknesses.add('Need to strengthen factorization techniques');
                  }
                  if (improvementText.includes('equation') || improvementText.includes('solving')) {
                    allTopicWeaknesses.add('Could improve equation solving strategies');
                  }
                  if (improvementText.includes('expand') || improvementText.includes('simplif')) {
                    allTopicWeaknesses.add('Focus on algebraic manipulation skills');
                  }
                  if (improvementText.includes('steps') || improvementText.includes('working')) {
                    allTopicWeaknesses.add('Show more detailed working steps');
                  }
                  if (improvementText.includes('calculation') || improvementText.includes('error')) {
                    allTopicWeaknesses.add('Practice to reduce calculation errors');
                  }
                }

                // Collect for overall analysis
                if (feedback.strengths) {
                  const generalStrengths = feedback.strengths.filter(s => 
                    !s.toLowerCase().includes('question') || 
                    s.toLowerCase().includes('attempted all') ||
                    s.toLowerCase().includes('correctly')
                  );
                  allStrengths.push(...generalStrengths);
                }
                
                if (feedback.improvements) {
                  const generalImprovements = [];
                  const improvementText = feedback.improvements.join(' ').toLowerCase();
                  
                  if (improvementText.includes('factorization') || improvementText.includes('factorize')) {
                    generalImprovements.push('Strengthen factorization techniques and recognition of patterns');
                  }
                  if (improvementText.includes('equation') || improvementText.includes('solving')) {
                    generalImprovements.push('Practice systematic approaches to solving equations');
                  }
                  if (improvementText.includes('expand') || improvementText.includes('simplif')) {
                    generalImprovements.push('Focus on algebraic manipulation and simplification');
                  }
                  if (improvementText.includes('steps') || improvementText.includes('show')) {
                    generalImprovements.push('Improve mathematical communication by showing clear working');
                  }
                  if (improvementText.includes('calculation') || improvementText.includes('error')) {
                    generalImprovements.push('Enhance accuracy and reduce calculation errors');
                  }
                  
                  if (generalImprovements.length === 0 && feedback.improvements.length > 0) {
                    generalImprovements.push('Continue practicing fundamental mathematical concepts');
                  }
                  
                  allImprovements.push(...generalImprovements);
                }
              });

              const topicPercentage = topicTotalMarks > 0 ? Math.round((topicTotalScore / topicTotalMarks) * 100) : 0;
              topicScores[topicKey] = topicPercentage;

              // Default values if no patterns found
              if (allTopicStrengths.size === 0) {
                allTopicStrengths.add('Shows willingness to engage with mathematical problems');
              }
              if (allTopicWeaknesses.size === 0) {
                allTopicWeaknesses.add('Continue practicing to strengthen understanding');
              }

              topicDetails[topicKey] = {
                strengths: Array.from(allTopicStrengths),
                weaknesses: Array.from(allTopicWeaknesses),
                recommendations: [`Focus on ${topicFeedbacks[0].topicName} practice exercises`]
              };
            });
            
            const subjectAverage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : Math.round(currentAverage);
            
            analyticsData.push({
              id: child.studentUserId?.toString() || '', // Use student's user ID for metrics endpoint
              firstName: child.firstName,
              lastName: child.lastName,
              subject: subject,
              currentAverage: subjectAverage,
              missedAssessments: Math.max(0, 20 - totalCompleted),
              totalAssessments: 20,
              homeworkCompleted: homeworkCompleted,
              exercisesCompleted: exercisesCompleted,
              totalCompleted: totalCompleted,
              topicScores,
              topicDetails,
              strengths: [...new Set(allStrengths)].slice(0, 3),
              weaknesses: [...new Set(allImprovements)].slice(0, 3),
              summary: `${child.firstName} is making progress in ${subject} with a current average of ${subjectAverage}%. Based on ${feedbacks.length} completed assessment${feedbacks.length === 1 ? '' : 's'}, ${subjectAverage >= 80 ? 'they show strong understanding of core concepts and should continue challenging themselves with advanced problems.' : subjectAverage >= 70 ? 'they demonstrate good grasp of fundamentals but could benefit from additional practice in key areas.' : subjectAverage >= 60 ? 'they are building foundational skills and would benefit from focused practice and review.' : 'they need additional support to strengthen fundamental concepts before advancing.'}`,
              recentTrend: subjectAverage >= 70 ? 'improving' : subjectAverage >= 60 ? 'stable' : 'declining',
              lastAssessmentDate: feedbacks[0]?.lastFeedback ? new Date(feedbacks[0].lastFeedback).toISOString().split('T')[0] : '2025-08-08',
              profilePhoto: child.profilePhoto
            });
          }
        }
      }
      
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching parent analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==========================================
  // MPC (Multi-Purpose Controller) Routes
  // ==========================================

  // Get MPC service status
  app.get("/api/mpc/status", (req, res) => {
    try {
      const status = mcpClientService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting MPC status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate exercise with AI
  app.post("/api/mpc/generate-exercise", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { context, numQuestions = 5 } = req.body;
      
      // Validate educational context
      const contextSchema = z.object({
        grade: z.string(),
        subject: z.string(),
        topic: z.string(),
        theme: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        syllabus: z.enum(['CAPS', 'IEB']),
        term: z.string().optional(),
        week: z.string().optional()
      });

      const validatedContext = contextSchema.parse(context);
      
      const exercise = await mcpClientService.generateExercise(validatedContext, numQuestions);
      res.json(exercise);
    } catch (error) {
      console.error("Error generating exercise:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI generation service unavailable",
          error: error.message,
          details: "The AI exercise generation system is currently unavailable. Please contact your administrator to set up the AI service with a proper API key."
        });
      }
      
      res.status(500).json({ message: "Failed to generate exercise" });
    }
  });

  // Generate feedback for completed exercise
  app.post("/api/mpc/generate-feedback", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { exercise, studentAnswers, context } = req.body;
      
      const feedback = await mcpClientService.generateFeedback(exercise, studentAnswers, context);
      res.json(feedback);
    } catch (error) {
      console.error("Error generating feedback:", error);
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI feedback service unavailable",
          error: error.message,
          details: "The AI feedback system is currently unavailable. Please contact your administrator to set up the AI service with a proper API key."
        });
      }
      
      res.status(500).json({ message: "Failed to generate feedback" });
    }
  });

  // Mark questions automatically
  app.post("/api/mpc/mark-questions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { questions, context } = req.body;
      
      const results = await mcpClientService.markQuestions(questions, context);
      res.json(results);
    } catch (error) {
      console.error("Error marking questions:", error);
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI marking service unavailable",
          error: error.message,
          details: "The AI marking system is currently unavailable. Please contact your administrator to set up the AI service with a proper API key."
        });
      }
      
      res.status(500).json({ message: "Failed to mark questions" });
    }
  });

  // Generate homework with AI
  app.post("/api/mpc/generate-homework", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { context, numQuestions = 8 } = req.body;
      
      // Validate educational context
      const contextSchema = z.object({
        grade: z.string(),
        subject: z.string(),
        topic: z.string(),
        theme: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']),
        syllabus: z.enum(['CAPS', 'IEB']),
        term: z.string().optional(),
        week: z.string().optional()
      });

      const validatedContext = contextSchema.parse(context);
      
      const homework = await mcpClientService.generateHomework(validatedContext, numQuestions);
      res.json(homework);
    } catch (error) {
      console.error("Error generating homework:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI homework generation service unavailable",
          error: error.message,
          details: "The AI homework generation system is currently unavailable. Please contact your administrator to set up the AI service with a proper API key."
        });
      }
      
      res.status(500).json({ message: "Failed to generate homework" });
    }
  });

  // AI grading endpoint for real AI feedback and scoring
  app.post("/api/ai-grading", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { questions, studentAnswers, context } = req.body;
      
      if (!questions || !studentAnswers || !context) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const totalMarks = questions.reduce((sum: number, q: any) => sum + q.marks, 0);
      
      console.log('🤖 AI grading with structured JSON format:', {
        questionsCount: questions.length,
        context,
        totalMarks
      });

      // Import and use the grading logic instead of duplicating code
      // Convert to the format expected by gradeHomeworkSubmission
      const homeworkData = {
        questions: questions.map((q: any) => ({
          id: q.id,
          question: q.question,
          points: q.marks || q.points || 10,
          correctAnswer: q.correctAnswer,
          answerType: q.answerType || 'exact',
          acceptableVariations: q.acceptableVariations || []
        }))
      };

      const studentAnswersData = studentAnswers.map((sa: any) => ({
        questionId: sa.questionId,
        answer: sa.studentAnswer || sa.answer || '',
        imageUrl: sa.imageUrl // ✅ CRITICAL FIX: Pass imageUrl for vision API support
      }));

      // Use the centralized grading function that uses database prompts
      const gradingResult = await gradeHomeworkSubmission(
        homeworkData,
        studentAnswersData,
        context
      );

      // Convert back to the expected format for this endpoint
      const questionFeedback = gradingResult.questionAnalysis.map(qa => ({
        questionId: qa.questionId,
        isCorrect: qa.isCorrect,
        score: qa.points,
        maxScore: qa.maxPoints,
        feedback: qa.feedback,
        suggestions: []
      }));

      // Calculate overall results  
      const totalScore = questionFeedback.reduce((sum, q) => sum + q.score, 0);
      const percentage = Math.round((totalScore / totalMarks) * 100);
      
      // Determine grade based on percentage
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';

      const feedback = {
        overall: {
          score: totalScore,
          percentage,
          grade,
          strengths: gradingResult.strengths,
          improvements: gradingResult.improvements
        },
        questionFeedback,
        nextSteps: [
          'Review feedback for each question',
          'Practice similar problems to reinforce learning',
          'Ask for help with concepts that need improvement'
        ]
      };

      console.log('✅ Database-powered grading complete:', {
        totalScore,
        percentage,
        grade,
        questionsCount: questions.length
      });

      res.json(feedback);
      return;
    } catch (error) {
      console.error('Mock grading error:', error);
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI grading service unavailable",
          error: error.message,
          details: "The AI feedback system is currently unavailable. Please contact your administrator to set up the AI service with a proper API key."
        });
      }
      
      res.status(500).json({ 
        message: "Failed to process AI grading",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Simple AI test endpoint - Direct question to LLM
  app.post("/api/test-simple-ai", async (req, res) => {
    try {
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      if (!hasApiKey) {
        return res.status(503).json({
          message: "OpenAI API key not configured",
          error: "AI service unavailable"
        });
      }

      const question = `Please evaluate the student answer and return JSON data with the following format:
{
  "isCorrect": true/false,
  "awardedMarks": number,
  "explanation": "detailed explanation",
  "feedback": "constructive feedback"
}

Grade: 9 
Subject: Algebra 
Topic: Factoring 
Theme: Difference of Squares 
"syllabus": "QUADRATIC EXPRESSIONS AND FACTORIZATION"
Total Marks: 5
Q: Factor the expression: x² - 9 
Student: (x + 3)(x - 3)`;

      console.log('🧪 Simple AI test - sending direct question to OpenAI:', question);
      console.log('🔗 Using OpenAI API with GPT-4o-mini model');

      // Direct OpenAI call
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const requestPayload = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: question }],
        temperature: 0,
      };
      console.log('📤 OpenAI Request:', JSON.stringify(requestPayload, null, 2));

      const response = await openai.chat.completions.create(requestPayload);

      const aiResponse = response.choices[0].message.content;
      console.log('📥 OpenAI Response metadata:', {
        model: response.model,
        usage: response.usage,
        created: response.created,
        id: response.id
      });
      console.log('🤖 Simple AI response:', aiResponse);

      res.json({
        question,
        response: aiResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Simple AI test error:', error);
      res.status(500).json({ 
        message: "Failed to process simple AI test",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Testing endpoint for easier testing of questions, answers, and feedback
  app.post("/api/test-ai", async (req, res) => {
    try {
      const { question, answer, context } = req.body;
      
      if (!question || !answer || !context) {
        return res.status(400).json({ 
          message: "Missing required fields: question, answer, and context are required" 
        });
      }

      console.log('🧪 AI Testing request:', { 
        question: question.substring(0, 100) + '...',
        answer, 
        context 
      });

      // Create a simple test exercise for AI evaluation
      const testExercise: GeneratedExercise = {
        id: 'test_exercise',
        title: 'AI Test Exercise',
        description: 'Testing AI marking and feedback',
        questions: [{
          id: 'test_q1',
          question,
          answer: answer, // This should be the correct answer
          marks: 5,
          type: 'short-answer'
        }],
        totalMarks: 5,
        estimatedDuration: 5
      };

      const studentAnswers = [{
        questionId: 'test_q1',
        answer: answer // Using the provided answer as student response for testing
      }];

      // Generate AI feedback using MCP client service
      const feedback = await mcpClientService.generateFeedback(
        testExercise,
        studentAnswers,
        {
          grade: context.grade,
          subject: context.subject,
          topic: context.topic,
          difficulty: context.difficulty,
          syllabus: context.syllabus || 'CAPS'
        }
      );

      console.log('🤖 AI Test feedback generated:', {
        score: feedback.overall.score,
        percentage: feedback.overall.percentage
      });

      res.json({
        success: true,
        feedback,
        testData: {
          question,
          providedAnswer: answer,
          context
        }
      });

    } catch (error) {
      console.error('AI Testing error:', error);
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI service unavailable",
          error: error.message,
          details: "The AI feedback system is currently unavailable. Please check that the OPENAI_API_KEY is properly configured."
        });
      }
      
      res.status(500).json({ 
        message: "AI testing failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate adaptive exercise based on feedback analysis
  app.post("/api/generate-adaptive-exercise", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { context, feedbackAnalysis, originalQuestions } = req.body;
      
      if (!context || !feedbackAnalysis) {
        return res.status(400).json({ 
          message: "Missing required fields: context and feedbackAnalysis are required" 
        });
      }

      console.log('🎯 Adaptive exercise generation request:', { 
        context,
        performance: feedbackAnalysis.overallPerformance,
        weakAreas: feedbackAnalysis.weakAreas?.length || 0,
        improvements: feedbackAnalysis.improvements?.length || 0
      });

      // Determine adaptive difficulty - lower for poor performance
      let adaptiveDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
      let adaptiveReason = '';
      
      if (feedbackAnalysis.overallPerformance < 40) {
        adaptiveDifficulty = 'easy';
        adaptiveReason = 'Focusing on fundamental concepts with easier questions to build confidence and understanding.';
      } else if (feedbackAnalysis.overallPerformance < 70) {
        adaptiveDifficulty = 'medium';
        adaptiveReason = 'Targeting areas of improvement with medium difficulty questions to strengthen weak concepts.';
      } else {
        adaptiveDifficulty = 'hard';
        adaptiveReason = 'Building on your strong foundation with more challenging questions to push your skills further.';
      }

      // Create educational context for MPC service
      const educationalContext = {
        grade: context.grade,
        subject: context.subject,
        topic: context.topic,
        difficulty: adaptiveDifficulty,
        syllabus: context.syllabus || 'CAPS',
        theme: context.theme,
        term: context.term,
        week: context.week
      };

      // Create adaptive context with specific improvements
      const adaptiveContext = {
        specificImprovements: feedbackAnalysis.improvements || [],
        performanceLevel: feedbackAnalysis.overallPerformance,
        originalMistakes: originalQuestions?.map(q => 
          `Question: "${q.question}" - Student answered: "${q.studentAnswer}" instead of "${q.correctAnswer}"`
        ) || []
      };

      console.log('📝 Adaptive context created:', {
        improvementsCount: adaptiveContext.specificImprovements.length,
        mistakesCount: adaptiveContext.originalMistakes.length,
        performance: adaptiveContext.performanceLevel
      });

      // Generate exercise using MPC service with adaptive context
      const exercise = await mcpClientService.generateExercise(educationalContext, 5, adaptiveContext);

      // Add adaptive metadata to the response
      const adaptiveExercise = {
        ...exercise,
        difficulty: adaptiveDifficulty,
        adaptiveReason,
        basedOnPerformance: feedbackAnalysis.overallPerformance,
        targetingWeaknesses: feedbackAnalysis.weakAreas || []
      };

      console.log('🤖 Adaptive exercise generated:', {
        title: exercise.title,
        difficulty: adaptiveDifficulty,
        questionsCount: exercise.questions.length,
        totalMarks: exercise.totalMarks
      });

      res.json(adaptiveExercise);

    } catch (error) {
      console.error('Adaptive exercise generation error:', error);
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI exercise generation service unavailable",
          error: error.message,
          details: "The AI exercise generation system is currently unavailable. Please check that the OPENAI_API_KEY is properly configured."
        });
      }
      
      res.status(500).json({ 
        message: "Adaptive exercise generation failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate personalized tutorial and practice exercise based on AI feedback
  /**
   * CRITICAL ENDPOINT: Tutorial Generation System
   * 
   * @route POST /api/generate-tutorial-exercise
   * @purpose Generates personalized 3-step educational tutorials based on student feedback
   * 
   * @authentication Required - Student role only
   * @requestBody {
   *   homeworkId?: number,           // Optional homework ID for context
   *   topicName: string,             // Educational topic (e.g., "Linear Equations")
   *   weaknessAreas: string[],       // Areas needing improvement from AI feedback
   *   subject?: string,              // Subject (defaults to 'mathematics')
   *   grade?: string                 // Grade level (defaults to '8')
   * }
   * 
   * @returns {
   *   success: boolean,
   *   tutorialData: TutorialData,    // Rich 3-step tutorial with examples and tips
   *   exerciseData: ExerciseData     // Practice questions for the tutorial
   * }
   * 
   * @dependencies
   * - MCP server generate_tutorial tool
   * - OpenAI API for content generation
   * - Student authentication and database access
   * 
   * @dataFlow
   * 1. Validates student authentication and request parameters
   * 2. Derives educational context from homework or request data
   * 3. Calls MCP server generate_tutorial tool with improvement areas
   * 4. Transforms MCP response to frontend-compatible format
   * 5. Stores tutorial in database and returns to client
   * 
   * @integrations
   * - Triggered by: HomeworkFeedback "Generate Practice Exercise" button
   * - Displays in: TutorialCard.tsx component
   * - Uses: mcpClientService.generateTutorial() method
   * 
   * @criticalNote
   * MUST use generate_tutorial tool (not generate_adaptive_exercise)
   * This ensures rich 3-step tutorials instead of basic exercise content
   * 
   * @errorHandling
   * - 403: Non-student access attempt
   * - 400: Missing required parameters
   * - 404: Student record not found
   * - 500: MCP server or database failure
   * 
   * @performance
   * - Generation time: 10-15 seconds
   * - Uses OpenAI API credits
   * - Results cached in database
   * 
   * @lastVerified 2025-09-16 - Working with real AI-generated content
   * @testStatus ✅ Verified with TutorialCard component
   * @maintainer AI Learning Team
   */
  app.post("/api/generate-tutorial-exercise", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can generate practice exercises" });
      }

      const { homeworkId, topicName, weaknessAreas, subject, grade } = req.body;
      
      console.log('🔍 Tutorial exercise request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 Extracted params:', { homeworkId, topicName, weaknessAreas, subject, grade });
      
      if ((!topicName && !homeworkId) || !weaknessAreas) {
        return res.status(400).json({ message: "Topic name (or homework ID) and weakness areas are required" });
      }

      // Get student info
      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ message: "Student record not found" });
      }

      // CRITICAL: Check daily generation limit first
      const today = new Date().toISOString().split('T')[0];
      
      // Check current generation count for today
      const [existing] = await db
        .select()
        .from(dailyExerciseGenerations)
        .where(and(
          eq(dailyExerciseGenerations.studentId, student.id),
          eq(dailyExerciseGenerations.generationDate, today)
        ));

      const currentCount = existing?.count || 0;
      
      // Check if limit is exceeded
      if (currentCount >= 5) {
        return res.status(429).json({ 
          message: "Daily limit reached", 
          limit: 5, 
          current: currentCount 
        });
      }

      console.log('🔄 Generating personalized tutorial and practice exercise via MCP server');

      // Determine the topic - either from topicName or derive from homework
      let derivedTopic = topicName;
      if (!derivedTopic && homeworkId) {
        try {
          const homework = await storage.getHomeworkById(parseInt(homeworkId));
          // Use topic field first, then subject as fallback (NOT title to avoid duplication)
          derivedTopic = homework?.topic || homework?.subject || 'Algebra';
        } catch (error) {
          console.error('Error fetching homework for topic derivation:', error);
          derivedTopic = 'Algebra'; // Default fallback
        }
      }

      const context = {
        grade: grade || '8',
        subject: subject || 'mathematics',
        topic: derivedTopic || 'Algebra',
        difficulty: 'medium' as const,
        syllabus: 'CAPS' as const
      };

      // STEP 1: Generate tutorial first via MCP
      console.log('🎓 Generating tutorial with MCP server');
      const tutorialData = await mcpClientService.generateTutorial(
        context,
        Array.isArray(weaknessAreas) ? weaknessAreas : [weaknessAreas],
        [] // targetConcepts - empty for now
      );

      // STEP 2: Then generate adaptive exercise
      console.log('🏋️ Generating practice exercise with MCP server');
      const exerciseData = await mcpClientService.generateAdaptiveExercise(
        {
          ...context,
          difficulty: 'medium' as const
        },
        Array.isArray(weaknessAreas) ? weaknessAreas : [weaknessAreas],
        5
      );

      // Generate title using only the topic name (not the AI-generated title)
      const tutorialTitle = generateExerciseTitle(
        '', // Ignore AI-generated title to prevent concatenation
        derivedTopic // Use the derived topic from context
      );

      // Create a regular exercise (not tutorial) in database
      const todayDate = new Date().toISOString().split('T')[0];
      const practiceExercise = await storage.createExerciseWithQuestions(
        {
          date: todayDate,
          grade: grade || '8',
          subject: subject || 'mathematics',
          title: tutorialTitle,
          description: `Personalized practice exercise based on your homework feedback: ${exerciseData.description}`,
          difficulty: 'medium',
          isTutorial: false, // Create as regular exercise
          hasInitialTutorial: true, // This exercise should start with tutorial
          tutorialContent: JSON.stringify(tutorialData), // Store tutorial data
          generatedFor: student.id,
          basedOnHomework: homeworkId ? parseInt(homeworkId) : null
        },
        exerciseData.questions.map((q: any, index: number) => ({
          topicId: 1, // Default to algebra topic - could be enhanced to match actual topic
          themeId: 1, // Default theme
          question: q.question,
          answer: q.answer,
          marks: q.marks || 5,
        }))
      );

      // CRITICAL: Update generation count to track daily limit usage
      // This ensures the Calendar generation counter decreases properly
      const todayForTracking = new Date().toISOString().split('T')[0];
      
      // Check if student has existing generation record for today
      const [existingGeneration] = await db
        .select()
        .from(dailyExerciseGenerations)
        .where(and(
          eq(dailyExerciseGenerations.studentId, student.id),
          eq(dailyExerciseGenerations.generationDate, todayForTracking)
        ));
      
      // Update or create generation tracking record
      if (existingGeneration) {
        await db
          .update(dailyExerciseGenerations)
          .set({ 
            count: existingGeneration.count + 1, 
            lastGeneratedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(dailyExerciseGenerations.id, existingGeneration.id));
        console.log('📊 Updated generation count:', existingGeneration.count + 1);
      } else {
        await db
          .insert(dailyExerciseGenerations)
          .values({
            studentId: student.id,
            generationDate: todayForTracking,
            count: 1,
            lastGeneratedAt: new Date()
          });
        console.log('📊 Created new generation record with count: 1');
      }

      console.log('✅ Tutorial and practice exercise created:', {
        tutorial: {
          id: tutorialData.id,
          title: tutorialData.title,
          totalSteps: tutorialData.totalSteps
        },
        exercise: {
          id: practiceExercise.id,
          title: practiceExercise.title,
          questionsCount: exerciseData.questions.length,
          totalMarks: exerciseData.totalMarks
        },
        basedOnHomework: homeworkId
      });

      // Transform tutorial data to match expected frontend structure
      const transformedTutorial = transformTutorialData(tutorialData);

      res.status(201).json({
        message: "Tutorial and practice exercise generated successfully",
        tutorial: transformedTutorial, // Tutorial to be shown FIRST
        exercise: practiceExercise, // Exercise to be shown AFTER tutorial completion
        generatedBasedOn: {
          homeworkId: homeworkId ? parseInt(homeworkId) : null,
          topicName: derivedTopic,
          weaknessAreas: Array.isArray(weaknessAreas) ? weaknessAreas : [weaknessAreas],
          improvementsAddressed: weaknessAreas.length
        }
      });
    } catch (error) {
      console.error("Error generating personalized practice exercise:", error);
      
      // Check if it's an AI service error
      if (error instanceof Error && error.message.includes('AI service')) {
        return res.status(503).json({ 
          message: "AI exercise generation service unavailable",
          error: error.message,
          details: "The AI exercise generation system is currently unavailable. Please check that the OPENAI_API_KEY is properly configured."
        });
      }
      
      res.status(500).json({ 
        message: "Failed to generate personalized practice exercise",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generate tutorial endpoint
  app.post('/api/tutorial/generate', authenticateToken, async (req: AuthRequest, res) => {
    try {
      console.log('🎓 Tutorial generation requested:', req.body);
      
      const { context, improvementAreas, targetConcepts } = req.body;

      if (!context || !improvementAreas) {
        return res.status(400).json({
          error: "Missing required fields: context and improvementAreas"
        });
      }

      // Generate tutorial using MCP client
      const tutorialData = await mcpClientService.generateTutorial(
        context,
        improvementAreas,
        targetConcepts || []
      );

      console.log('✅ Tutorial generated successfully:', {
        id: tutorialData.id,
        title: tutorialData.title,
        totalSteps: tutorialData.totalSteps
      });

      // Transform tutorial data to match expected frontend structure
      const transformedTutorial = transformTutorialData(tutorialData);

      res.status(200).json({
        message: "Tutorial generated successfully",
        tutorial: transformedTutorial
      });

    } catch (error) {
      console.error('Error generating tutorial:', error);
      res.status(500).json({
        error: "Failed to generate tutorial",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Topic feedback API endpoints
  // Get topic feedback for a specific student and topic
  app.get("/api/students/:studentId/topics/:topicId/feedback", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const topicId = parseInt(req.params.topicId);
      
      // Verify access - students can only see their own feedback, teachers/admins can see all
      if (req.user!.role === 'student') {
        const student = await storage.getStudentByUserId(req.user!.id);
        if (!student || student.id !== studentId) {
          return res.status(403).json({ message: "You can only access your own feedback" });
        }
      }
      
      const feedback = await storage.getTopicFeedback(studentId, topicId);
      res.json(feedback || null);
    } catch (error) {
      console.error("Error fetching topic feedback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all topic feedback for a student by subject
  app.get("/api/students/:studentId/feedback", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const { subject } = req.query;
      
      // Verify access - students can only see their own feedback, teachers/admins can see all
      if (req.user!.role === 'student') {
        const student = await storage.getStudentByUserId(req.user!.id);
        if (!student || student.id !== studentId) {
          return res.status(403).json({ message: "You can only access your own feedback" });
        }
      }
      
      if (!subject) {
        return res.status(400).json({ message: "Subject parameter is required" });
      }
      
      const feedbacks = await storage.getTopicFeedbackBySubject(studentId, subject as string);
      res.json(feedbacks);
    } catch (error) {
      console.error("Error fetching topic feedback by subject:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all topic feedback for a student (without subject filtering)
  app.get("/api/students/:studentId/topic-feedback", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      
      // Verify access - students can only see their own feedback, teachers/admins can see all
      if (req.user!.role === 'student') {
        const student = await storage.getStudentByUserId(req.user!.id);
        if (!student || student.id !== studentId) {
          return res.status(403).json({ message: "You can only access your own feedback" });
        }
      }
      
      // Get all topic feedback for this student with topic names
      const feedbacks = await db
        .select({
          id: topicFeedback.id,
          studentId: topicFeedback.studentId,
          topic: topics.name, // Get topic name instead of topic_id
          strengths: topicFeedback.strengths,
          improvements: topicFeedback.improvements,
          createdAt: topicFeedback.createdAt
        })
        .from(topicFeedback)
        .innerJoin(topics, eq(topicFeedback.topicId, topics.id))
        .where(eq(topicFeedback.studentId, studentId))
        .orderBy(desc(topicFeedback.updatedAt));
      
      res.json(feedbacks);
    } catch (error) {
      console.error("Error fetching all topic feedback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Video lesson AI chat endpoint
  app.post('/api/video-lesson-chat', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { studentQuestion, lessonId, lessonTitle, subject, topic, theme, grade, transcript } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (req.user?.role !== 'student') {
        return res.status(403).json({ message: "Only students can use video lesson chat" });
      }

      if (!studentQuestion || !lessonId) {
        return res.status(400).json({ message: "Missing required fields: studentQuestion, lessonId" });
      }

      // Get student record
      const student = await storage.getStudentByUserId(userId);
      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Get lesson details
      const lesson = await storage.getSyllabusCalendar(parseInt(lessonId));
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Use stored transcript from database if not provided in request
      const videoTranscript = transcript || lesson.videoTranscript || '';
      
      if (videoTranscript) {
        console.log(`📺 Using video transcript for Tsebo chat (${videoTranscript.length} chars) - lesson: ${lesson.lessonTitle}`);
      } else {
        console.log(`📺 No transcript available for Tsebo chat - lesson: ${lesson.lessonTitle}`);
      }

      // Use the video lesson chat method from MCP service (with optional transcript for context)
      const chatResponse = await mcpClientService.videoLessonChat(
        studentQuestion,
        {
          lessonTitle: lessonTitle || lesson.lessonTitle,
          subject: subject || lesson.subject,
          topic: topic || 'General Topic',
          theme: theme || 'General Theme',
          grade: grade || student.gradeLevel,
          videoLink: lesson.videoLink,
          description: lesson.description
        },
        videoTranscript
      );

      res.json({
        message: "Chat response generated successfully",
        response: chatResponse.response,
        context: chatResponse.context
      });

    } catch (error) {
      console.error('Error in video lesson chat:', error);
      res.status(500).json({ 
        message: "Failed to generate chat response",
        error: error.message 
      });
    }
  });

  // Verify exercise relevance against video transcript
  app.post('/api/verify-exercise-relevance', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { transcript, questions, lessonContext } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Allow teachers and admins to verify exercise relevance
      if (!['teacher', 'admin'].includes(req.user?.role || '')) {
        return res.status(403).json({ message: "Only teachers and admins can verify exercise relevance" });
      }

      if (!transcript || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Missing required fields: transcript, questions (array)" });
      }

      if (!lessonContext || !lessonContext.lessonTitle || !lessonContext.subject || !lessonContext.grade) {
        return res.status(400).json({ message: "Missing required lesson context: lessonTitle, subject, grade" });
      }

      // Call MCP service to verify exercise relevance
      const result = await mcpClientService.verifyExerciseRelevance(
        transcript,
        questions,
        lessonContext
      );

      res.json({
        message: "Exercise relevance verification completed",
        analysis: result.analysis,
        context: result.context
      });

    } catch (error) {
      console.error('Error verifying exercise relevance:', error);
      res.status(500).json({ 
        message: "Failed to verify exercise relevance",
        error: error.message 
      });
    }
  });

  // Video Comments API Routes
  // Get comments for a lesson
  app.get("/api/video-comments/:lessonId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const comments = await db
        .select({
          id: videoComments.id,
          comment: videoComments.comment,
          createdAt: videoComments.createdAt,
          studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          studentId: videoComments.studentId
        })
        .from(videoComments)
        .innerJoin(users, eq(videoComments.studentId, users.id))
        .where(eq(videoComments.lessonId, lessonId))
        .orderBy(desc(videoComments.createdAt));

      res.json(comments);
    } catch (error) {
      console.error("Error fetching video comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add a comment to a lesson
  app.post("/api/video-comments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { lessonId, comment } = req.body;
      
      if (!lessonId || !comment || !comment.trim()) {
        return res.status(400).json({ message: "Lesson ID and comment are required" });
      }

      const newComment = await db
        .insert(videoComments)
        .values({
          lessonId: parseInt(lessonId),
          studentId: req.user!.id,
          comment: comment.trim()
        })
        .returning({
          id: videoComments.id,
          comment: videoComments.comment,
          createdAt: videoComments.createdAt,
          studentId: videoComments.studentId
        });

      // Get student name for response
      const student = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      const response = {
        ...newComment[0],
        studentName: `${student[0].firstName} ${student[0].lastName}`
      };

      res.status(201).json(response);
    } catch (error) {
      console.error("Error adding video comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Get likes/dislikes stats for a lesson
  app.get("/api/video-likes/:lessonId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      
      // Get total likes and dislikes
      const likesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(videoLikes)
        .where(and(eq(videoLikes.lessonId, lessonId), eq(videoLikes.isLike, true)));

      const dislikesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(videoLikes)
        .where(and(eq(videoLikes.lessonId, lessonId), eq(videoLikes.isLike, false)));

      // Check if current user has liked/disliked
      const userVote = await db
        .select({ isLike: videoLikes.isLike })
        .from(videoLikes)
        .where(and(eq(videoLikes.lessonId, lessonId), eq(videoLikes.studentId, req.user!.id)))
        .limit(1);

      res.json({
        likes: likesCount[0]?.count || 0,
        dislikes: dislikesCount[0]?.count || 0,
        userLiked: userVote[0]?.isLike === true,
        userDisliked: userVote[0]?.isLike === false
      });
    } catch (error) {
      console.error("Error fetching video likes:", error);
      res.status(500).json({ message: "Failed to fetch likes" });
    }
  });

  // Add or update a like/dislike for a lesson
  app.post("/api/video-likes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { lessonId, isLike } = req.body;
      
      if (!lessonId || typeof isLike !== 'boolean') {
        return res.status(400).json({ message: "Lesson ID and isLike (boolean) are required" });
      }

      // Check if user already has a vote
      const existingVote = await db
        .select()
        .from(videoLikes)
        .where(and(eq(videoLikes.lessonId, parseInt(lessonId)), eq(videoLikes.studentId, req.user!.id)))
        .limit(1);

      if (existingVote.length > 0) {
        // Update existing vote
        await db
          .update(videoLikes)
          .set({ isLike })
          .where(and(eq(videoLikes.lessonId, parseInt(lessonId)), eq(videoLikes.studentId, req.user!.id)));
      } else {
        // Create new vote
        await db
          .insert(videoLikes)
          .values({
            lessonId: parseInt(lessonId),
            studentId: req.user!.id,
            isLike
          });
      }

      res.status(200).json({ message: "Vote recorded" });
    } catch (error) {
      console.error("Error recording video like:", error);
      res.status(500).json({ message: "Failed to record vote" });
    }
  });

  // Remove a like/dislike for a lesson
  app.delete("/api/video-likes/:lessonId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      
      await db
        .delete(videoLikes)
        .where(and(eq(videoLikes.lessonId, lessonId), eq(videoLikes.studentId, req.user!.id)));

      res.status(200).json({ message: "Vote removed" });
    } catch (error) {
      console.error("Error removing video like:", error);
      res.status(500).json({ message: "Failed to remove vote" });
    }
  });

  // Register MCP routes
  registerMCPRoutes(app);

  // Register Global Context routes
  registerGlobalContextRoutes(app);

  // Register Chat routes
  app.use("/api/chat", authenticateToken, chatRoutes);

  const httpServer = createServer(app);
  // ============================================================================
  // NOTIFICATIONS API
  // ============================================================================

  // Get unread notification count for current user
  // New logic: Check if there's new homework/exercises published since last calendar view
  app.get("/api/notifications/count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Only students get calendar notifications
      if (userRole !== 'student') {
        return res.json({ unreadCount: 0 });
      }

      // Get student record
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.userId, userId))
        .limit(1);

      if (!student) {
        return res.json({ unreadCount: 0 });
      }

      // Get when student last viewed calendar (null means never viewed)
      const lastViewed = student.lastCalendarViewedAt;
      
      // If never viewed, check if there's any published homework
      if (!lastViewed) {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)` })
          .from(homework)
          .where(eq(homework.published, true));
        
        return res.json({ unreadCount: Number(count) > 0 ? 1 : 0 });
      }

      // Check if there's homework published after last calendar view
      const [{ homeworkCount }] = await db
        .select({ homeworkCount: sql<number>`count(*)` })
        .from(homework)
        .innerJoin(classStudents, eq(classStudents.classId, homework.classId))
        .where(and(
          eq(classStudents.studentId, student.id),
          eq(homework.published, true),
          sql`${homework.createdAt} > ${lastViewed}`
        ));

      // Check if there's new exercises created after last calendar view
      const [{ exerciseCount }] = await db
        .select({ exerciseCount: sql<number>`count(*)` })
        .from(exercises)
        .where(sql`${exercises.createdAt} > ${lastViewed}`);

      const totalNew = Number(homeworkCount) + Number(exerciseCount);
      res.json({ unreadCount: totalNew > 0 ? 1 : 0 });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark calendar as viewed - updates lastCalendarViewedAt timestamp
  app.post("/api/calendar/mark-viewed", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Only students track calendar views
      if (userRole !== 'student') {
        return res.json({ success: true, message: "Non-students don't track calendar views" });
      }

      // Get student record
      const [student] = await db
        .select()
        .from(students)
        .where(eq(students.userId, userId))
        .limit(1);

      if (!student) {
        return res.status(404).json({ message: "Student profile not found" });
      }

      // Update lastCalendarViewedAt timestamp
      await db
        .update(students)
        .set({ lastCalendarViewedAt: new Date() })
        .where(eq(students.id, student.id));

      console.log(`📅 Student ${student.id} viewed calendar - notifications cleared`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking calendar as viewed:", error);
      res.status(500).json({ message: "Failed to mark calendar as viewed" });
    }
  });

  // Get all notifications for current user
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { limit = 50, offset = 0 } = req.query;
      
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(Number(limit))
        .offset(Number(offset));

      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const notificationId = parseInt(req.params.id);

      const [updated] = await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Mark all notifications as read
  app.put("/api/notifications/read-all", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to update notifications" });
    }
  });

  // Generate notifications for upcoming lessons/homework
  app.post("/api/notifications/generate", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      // Get upcoming lessons
      const upcomingLessons = await db
        .select()
        .from(syllabusCalendar)
        .where(and(
          gte(syllabusCalendar.date, today.toISOString().split('T')[0]),
          lte(syllabusCalendar.date, dayAfterTomorrow.toISOString().split('T')[0])
        ));

      // Get upcoming homework that's due soon and published
      const upcomingHomework = await db
        .select()
        .from(homework)
        .where(and(
          gte(homework.dueDate, today),
          lte(homework.dueDate, dayAfterTomorrow),
          eq(homework.published, true)
        ));

      // Get all users to notify (students and parents for relevant grades/subjects)
      const allUsers = await db
        .select()
        .from(users)
        .where(inArray(users.role, ['student', 'parent', 'teacher']));

      const notificationsToCreate = [];

      // Generate notifications for lessons
      for (const lesson of upcomingLessons) {
        for (const user of allUsers) {
          // Check if notification already exists
          const existingNotification = await db
            .select()
            .from(notifications)
            .where(and(
              eq(notifications.userId, user.id),
              eq(notifications.type, 'lesson'),
              eq(notifications.itemId, lesson.id)
            ))
            .limit(1);

          if (existingNotification.length === 0) {
            notificationsToCreate.push({
              userId: user.id,
              type: 'lesson' as const,
              itemId: lesson.id,
              title: `Upcoming Lesson: ${lesson.lessonTitle}`,
              message: `${lesson.subject} lesson for Grade ${lesson.grade} on ${lesson.date}`,
              itemDate: lesson.date,
              isRead: false
            });
          }
        }
      }

      // Generate notifications for homework
      for (const hw of upcomingHomework) {
        // Get students enrolled in the class
        const enrolledStudents = await db
          .select({ 
            userId: students.userId,
            studentId: students.id
          })
          .from(studentEnrollment)
          .innerJoin(students, eq(studentEnrollment.studentId, students.id))
          .where(eq(studentEnrollment.classId, hw.classId));

        for (const student of enrolledStudents) {
          // Check if student has already completed this homework
          const submission = await db
            .select()
            .from(homeworkSubmissions)
            .where(and(
              eq(homeworkSubmissions.homeworkId, hw.id),
              eq(homeworkSubmissions.studentId, student.studentId),
              eq(homeworkSubmissions.isCompleted, true)
            ))
            .limit(1);

          // Only create notification if homework is not completed
          if (submission.length === 0) {
            // Check if notification already exists
            const existingNotification = await db
              .select()
              .from(notifications)
              .where(and(
                eq(notifications.userId, student.userId),
                eq(notifications.type, 'homework'),
                eq(notifications.itemId, hw.id)
              ))
              .limit(1);

            if (existingNotification.length === 0) {
              const dueDate = new Date(hw.dueDate).toISOString().split('T')[0];
              notificationsToCreate.push({
                userId: student.userId,
                type: 'homework' as const,
                itemId: hw.id,
                title: `Homework Due: ${hw.title}`,
                message: `Complete your homework before ${dueDate}`,
                itemDate: dueDate,
                isRead: false
              });
            }
          }
        }
      }

      if (notificationsToCreate.length > 0) {
        await db.insert(notifications).values(notificationsToCreate);
      }

      res.json({ 
        message: `Generated ${notificationsToCreate.length} notifications (${upcomingLessons.length} lessons, ${upcomingHomework.length} homework)` 
      });
    } catch (error) {
      console.error("Error generating notifications:", error);
      res.status(500).json({ message: "Failed to generate notifications" });
    }
  });

  // AI Prompt management endpoints - Admin only
  app.get("/api/ai-prompts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const prompts = await storage.getAllAiPrompts();
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching AI prompts:", error);
      res.status(500).json({ message: "Failed to fetch AI prompts" });
    }
  });

  // Get MCP server prompts for sync comparison
  app.get("/api/mcp/prompts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🔄 Fetching MCP prompts for sync comparison');
      const mcpPrompts = await mcpClientService.callMCPServer('list_prompts', {});
      
      console.log('✅ Retrieved MCP prompts:', mcpPrompts.length);
      res.json(mcpPrompts);
    } catch (error) {
      console.error("Error fetching MCP prompts:", error);
      res.status(500).json({ 
        message: "Failed to fetch MCP prompts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Import MCP prompts to database
  app.post("/api/mcp/import-prompts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('📥 Importing MCP prompts to database...');
      
      // Fetch MCP prompts
      const mcpPrompts = await mcpClientService.callMCPServer('list_prompts', {});
      
      if (!Array.isArray(mcpPrompts)) {
        return res.status(500).json({ message: "Failed to fetch MCP prompts" });
      }
      
      // Fetch existing prompts from database
      const existingPrompts = await storage.getAllAiPrompts();
      
      // Find prompts that don't exist in database (by name and category)
      const newPrompts = mcpPrompts.filter((mcpPrompt: any) => {
        return !existingPrompts.some(
          (dbPrompt) => 
            dbPrompt.name.toLowerCase().trim() === mcpPrompt.name.toLowerCase().trim() &&
            dbPrompt.category === mcpPrompt.category
        );
      });
      
      console.log(`📊 Found ${newPrompts.length} new prompts to import`);
      
      // Import new prompts
      const imported: any[] = [];
      for (const mcpPrompt of newPrompts) {
        try {
          const newPrompt = await storage.createAiPrompt({
            name: mcpPrompt.name,
            description: `Imported from MCP: ${mcpPrompt.key}`,
            promptText: mcpPrompt.promptText,
            category: mcpPrompt.category,
            variables: mcpPrompt.variables || [],
            version: mcpPrompt.version || '1.0.0',
            isActive: true,
            createdBy: req.user!.id,
          });
          imported.push(newPrompt);
          console.log(`✅ Imported: ${mcpPrompt.name}`);
        } catch (err) {
          console.error(`❌ Failed to import ${mcpPrompt.name}:`, err);
        }
      }
      
      res.json({
        success: true,
        message: `Imported ${imported.length} new prompts from MCP`,
        imported,
        skipped: mcpPrompts.length - imported.length
      });
    } catch (error) {
      console.error("Error importing MCP prompts:", error);
      res.status(500).json({ 
        message: "Failed to import MCP prompts",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/ai-prompts/category/:category", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { category } = req.params;
      if (!category || typeof category !== 'string') {
        return res.status(400).json({ message: "Valid category is required" });
      }
      
      const prompts = await storage.getAiPromptsByCategory(category);
      res.json(prompts);
    } catch (error) {
      console.error("Error fetching AI prompts by category:", error);
      res.status(500).json({ message: "Failed to fetch AI prompts by category" });
    }
  });

  app.get("/api/ai-prompts/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Valid ID is required" });
      }
      
      const prompt = await storage.getAiPromptById(id);
      if (!prompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching AI prompt:", error);
      res.status(500).json({ message: "Failed to fetch AI prompt" });
    }
  });

  app.post("/api/ai-prompts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Validate request body
      const promptData = insertAiPromptSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const newPrompt = await storage.createAiPrompt(promptData);
      res.status(201).json(newPrompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid prompt data", 
          errors: error.errors 
        });
      }
      console.error("Error creating AI prompt:", error);
      res.status(500).json({ message: "Failed to create AI prompt" });
    }
  });

  app.put("/api/ai-prompts/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Valid ID is required" });
      }
      
      // Validate request body (partial update)
      const updateData = insertAiPromptSchema.partial().parse(req.body);
      
      // Check if this is a content change (promptText or variables) that should reset status to 'awaiting_dev'
      const isContentChange = updateData.promptText !== undefined || updateData.variables !== undefined;
      
      // If it's a content change, set status to 'awaiting_dev' to trigger auto-implement workflow
      if (isContentChange) {
        updateData.status = 'awaiting_dev';
        console.log(`🔄 Content change detected for prompt ${id}, setting status to 'awaiting_dev'`);
      }
      
      const updatedPrompt = await storage.updateAiPrompt(id, updateData);
      if (!updatedPrompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }
      res.json(updatedPrompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid prompt data", 
          errors: error.errors 
        });
      }
      console.error("Error updating AI prompt:", error);
      res.status(500).json({ message: "Failed to update AI prompt" });
    }
  });

  app.delete("/api/ai-prompts/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Valid ID is required" });
      }
      
      const success = await storage.deleteAiPrompt(id);
      if (!success) {
        return res.status(404).json({ message: "AI prompt not found" });
      }
      res.json({ message: "AI prompt deleted successfully" });
    } catch (error) {
      console.error("Error deleting AI prompt:", error);
      res.status(500).json({ message: "Failed to delete AI prompt" });
    }
  });

  app.post("/api/ai-prompts/test", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Validate request body
      const testSchema = z.object({
        promptText: z.string().min(1, "Prompt text is required"),
        variables: z.record(z.string()).default({}),
        images: z.object({
          questionImageUrl: z.string().optional(),
          studentAnswerImageUrl: z.string().optional(),
          variableImages: z.record(z.string()).optional()
        }).optional(),
        pdfBase64: z.string().optional()
      });
      
      const { promptText, variables, images, pdfBase64 } = testSchema.parse(req.body);
      
      // If PDF is provided, convert to images and add to images array
      let enhancedImages = images;
      let pdfImages: string[] = [];
      if (pdfBase64) {
        console.log('📄 PDF provided, converting to images for vision API...');
        try {
          pdfImages = await convertPdfToImages(pdfBase64);
          console.log(`✅ Converted PDF to ${pdfImages.length} page images`);
          
          // Add PDF page images to the images object
          enhancedImages = {
            ...images,
            pdfPageImages: pdfImages
          };
        } catch (pdfError) {
          console.error('❌ PDF conversion error:', pdfError);
          return res.status(400).json({ 
            message: "Failed to convert PDF to images",
            error: pdfError instanceof Error ? pdfError.message : 'Unknown error'
          });
        }
      }
      
      const result = await storage.testAiPrompt(promptText, variables, enhancedImages);
      
      // If PDF was processed successfully, save page images for reference
      let savedPageImages: SavedImage[] = [];
      if (result.success && pdfImages.length > 0) {
        const paperId = `test_${Date.now()}`;
        savedPageImages = await savePdfPageImages(pdfImages, paperId);
        console.log(`📁 Saved ${savedPageImages.length} PDF page images for reference`);
      }
      
      res.json({
        ...result,
        savedPageImages: savedPageImages.length > 0 ? savedPageImages : undefined
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid test data", 
          errors: error.errors 
        });
      }
      console.error("Error testing AI prompt:", error);
      res.status(500).json({ message: "Failed to test AI prompt" });
    }
  });

  app.post("/api/ai-prompts/:id/publish", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Valid ID is required" });
      }
      
      const result = await storage.publishAiPrompt(id);
      res.json(result);
    } catch (error) {
      console.error("Error publishing AI prompt:", error);
      res.status(500).json({ message: "Failed to publish AI prompt" });
    }
  });

  // Create new version (prevents breaking changes)
  app.post("/api/ai-prompts/:id/create-version", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Valid ID is required" });
      }
      
      const versionSchema = z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        promptText: z.string().min(1),
        variables: z.array(z.string()),
        category: z.string(),
        exampleUsage: z.string().optional(),
        isActive: z.boolean().default(true),
      });
      
      const versionData = versionSchema.parse(req.body);
      const result = await storage.createPromptVersion(id, versionData, req.user!.id);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid version data", 
          errors: error.errors 
        });
      }
      console.error("Error creating prompt version:", error);
      res.status(500).json({ message: "Failed to create prompt version" });
    }
  });

  // Request implementation (generates copy-text for developers)
  app.post("/api/ai-prompts/:id/request-implementation", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Valid ID is required" });
      }
      
      const result = await storage.requestPromptImplementation(id);
      res.json(result);
    } catch (error) {
      console.error("Error requesting implementation:", error);
      res.status(500).json({ message: "Failed to request implementation" });
    }
  });

  // Mark prompt as tested
  app.post("/api/ai-prompts/:id/mark-tested", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Valid ID is required" });
      }
      
      // Update prompt status to 'tested'
      const updatedPrompt = await storage.updateAiPrompt(id, { status: 'tested' });
      if (!updatedPrompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }
      
      res.json({
        success: true,
        message: `Prompt "${updatedPrompt.name}" marked as tested and ready for implementation request`,
        prompt: updatedPrompt
      });
    } catch (error) {
      console.error("Error marking prompt as tested:", error);
      res.status(500).json({ message: "Failed to mark prompt as tested" });
    }
  });

  // ==========================================
  // PROMPT WORKFLOW ENDPOINTS (Dual Repository)
  // ==========================================
  
  // Create/update development changes (decoupled from production)
  app.post("/api/prompt-builder/changes", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { promptId, promptText, variables, changeReason, changeDescription } = req.body;
      
      if (!promptId || !promptText) {
        return res.status(400).json({ message: "Prompt ID and text are required" });
      }
      
      // Update AI prompt with development changes (status: awaiting_dev)
      const updatedPrompt = await storage.updateAiPrompt(parseInt(promptId), {
        promptText,
        variables: variables || [],
        status: 'awaiting_dev',
        updatedAt: new Date()
      });
      
      if (!updatedPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      res.json({
        success: true,
        message: "Development changes saved (decoupled from production)",
        prompt: updatedPrompt,
        status: 'awaiting_dev'
      });
    } catch (error) {
      console.error("Error saving prompt changes:", error);
      res.status(500).json({ message: "Failed to save development changes" });
    }
  });

  // Get sync status between UI and MCP prompts with auto-implement detection
  app.get("/api/prompt-builder/sync-status/:promptId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const promptId = parseInt(req.params.promptId);
      const aiPrompt = await storage.getAiPromptById(promptId);
      
      if (!aiPrompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }
      
      // Get MCP prompt for comparison using MCP client service
      let mcpPrompts: any[] = [];
      let mcpPrompt: any = null;
      
      try {
        const mcpResult = await mcpClientService.callMCPServer('list_prompts', {});
        mcpPrompts = mcpResult || [];
        
        // For grading prompts, match with the canonical "Homework Grading Assistant"
        if (aiPrompt.category === 'grading') {
          mcpPrompt = mcpPrompts.find((p: any) => p.name === 'Homework Grading Assistant');
        } else {
          // For other categories, try exact name match first
          mcpPrompt = mcpPrompts.find((p: any) => p.name === aiPrompt.name);
        }
      } catch (error) {
        console.error('Error fetching MCP prompts:', error);
        mcpPrompts = [];
      }
      
      let syncStatus = 'unknown';
      let actionRequired = 'Check sync manually';
      let canAutoImplement = false;
      let autoImplementReason = '';
      
      // Check if prompt can be auto-implemented
      if (aiPrompt.category === 'grading' && aiPrompt.status === 'awaiting_dev') {
        try {
          const { promptWorkflowService } = await import('./prompt-workflow-service');
          const autoCheck = await promptWorkflowService.canAutoImplement(
            aiPrompt.variables || [], 
            aiPrompt.category
          );
          canAutoImplement = autoCheck.canAutoImplement;
          autoImplementReason = autoCheck.reason;
        } catch (error) {
          console.error('Auto-implement check failed:', error);
        }
      }
      
      if (!mcpPrompt) {
        syncStatus = 'awaiting_dev';
        actionRequired = canAutoImplement 
          ? '🚀 Auto-implement available - no new variables detected'
          : 'Promote to MCP server (manual)';
      } else {
        const textMatch = aiPrompt.promptText.trim() === mcpPrompt.promptText.trim();
        const varsMatch = JSON.stringify(aiPrompt.variables?.sort()) === JSON.stringify(mcpPrompt.variables?.sort());
        
        // For grading prompts with "implemented" or "published" status, consider them in sync with canonical MCP prompt
        if (aiPrompt.category === 'grading' && (aiPrompt.status === 'implemented' || aiPrompt.status === 'published')) {
          syncStatus = 'in_sync';
          actionRequired = 'None - grading prompt is implemented and compatible';
        } else if (textMatch && varsMatch && aiPrompt.status !== 'awaiting_dev') {
          syncStatus = 'in_sync';
          actionRequired = 'None - prompts are synchronized';
        } else if (textMatch && varsMatch && aiPrompt.status === 'awaiting_dev') {
          syncStatus = 'status_reset';
          actionRequired = 'Reset status to implemented';
        } else if (!textMatch || !varsMatch) {
          if (aiPrompt.status === 'awaiting_dev') {
            syncStatus = 'awaiting_dev';
            actionRequired = canAutoImplement
              ? '🚀 Auto-implement available - compatible changes detected'
              : 'Promote changes to MCP server (manual)';
          } else {
            syncStatus = 'mcp_ahead';
            actionRequired = 'Sync UI from MCP server';
          }
        }
      }
      
      res.json({
        aiPrompt,
        mcpPrompt: mcpPrompt || null,
        syncStatus,
        actionRequired,
        canAutoImplement,
        autoImplementReason,
        differences: {
          textDiff: mcpPrompt ? aiPrompt.promptText.trim() !== mcpPrompt.promptText.trim() : true,
          variablesDiff: mcpPrompt ? JSON.stringify(aiPrompt.variables?.sort()) !== JSON.stringify(mcpPrompt.variables?.sort()) : true,
          statusMismatch: aiPrompt.status === 'awaiting_dev'
        }
      });
    } catch (error) {
      console.error("Error checking sync status:", error);
      res.status(500).json({ message: "Failed to check sync status" });
    }
  });

  // Reset/sync UI prompt from MCP server (MCP ahead scenario)
  app.post("/api/prompt-builder/reset", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { promptId } = req.body;
      
      if (!promptId) {
        return res.status(400).json({ message: "Prompt ID is required" });
      }
      
      const aiPrompt = await storage.getAiPromptById(parseInt(promptId));
      if (!aiPrompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }
      
      // Get latest from MCP server using MCP client service
      let mcpPrompt: any = null;
      
      try {
        const mcpResult = await mcpClientService.callMCPServer('list_prompts', {});
        const mcpPrompts = mcpResult || [];
        mcpPrompt = mcpPrompts.find((p: any) => p.name === aiPrompt.name);
      } catch (error) {
        console.error('Error fetching MCP prompts:', error);
      }
      
      if (!mcpPrompt) {
        return res.status(404).json({ message: "MCP prompt not found" });
      }
      
      // Update AI prompt to match MCP
      const updatedPrompt = await storage.updateAiPrompt(parseInt(promptId), {
        promptText: mcpPrompt.promptText,
        variables: mcpPrompt.variables || [],
        status: 'implemented',
        updatedAt: new Date()
      });
      
      res.json({
        success: true,
        message: "UI prompt synced from MCP server",
        prompt: updatedPrompt,
        syncedFrom: 'mcp_server'
      });
    } catch (error) {
      console.error("Error resetting prompt from MCP:", error);
      res.status(500).json({ message: "Failed to reset prompt from MCP" });
    }
  });

  // Auto-implement prompt to MCP server (safe deployment for compatible prompts)
  app.post("/api/prompt-builder/auto-implement", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { promptId } = req.body;
      
      if (!promptId) {
        return res.status(400).json({ message: "Prompt ID is required" });
      }
      
      const aiPrompt = await storage.getAiPromptById(parseInt(promptId));
      if (!aiPrompt) {
        return res.status(404).json({ message: "AI prompt not found" });
      }
      
      // Only allow grading prompts for auto-implementation
      if (aiPrompt.category !== 'grading') {
        return res.status(400).json({ 
          message: "Auto-implementation only supported for grading prompts" 
        });
      }
      
      // Check if prompt can be auto-implemented
      const { promptWorkflowService } = await import('./prompt-workflow-service');
      const autoCheck = await promptWorkflowService.canAutoImplement(
        aiPrompt.variables || [], 
        aiPrompt.category
      );
      
      if (!autoCheck.canAutoImplement) {
        return res.status(400).json({ 
          message: "Cannot auto-implement this prompt",
          reason: autoCheck.reason,
          newVariables: autoCheck.newVariables
        });
      }
      
      // Create hash for the prompt
      const { createHash } = await import('crypto');
      const promptContent = JSON.stringify({ 
        promptText: aiPrompt.promptText, 
        variables: aiPrompt.variables?.sort() 
      });
      const schemaHash = createHash('sha256').update(promptContent).digest('hex').substring(0, 16);
      
      // Auto-implement just marks the AI prompt as implemented
      // The sync detection will recognize it's compatible with canonical MCP prompts
      
      // Update AI prompt status to implemented and published
      const updatedPrompt = await storage.updateAiPrompt(parseInt(promptId), {
        status: 'published',
        isPublished: true,
        schemaHash: schemaHash,
        implementedAt: new Date(),
        updatedAt: new Date()
      });
      
      res.json({
        success: true,
        message: `🚀 Auto-implemented successfully! Grading system can now use "${aiPrompt.name}"`,
        prompt: updatedPrompt,
        compatibleVariables: autoCheck.supportedVariables,
        implementation: 'automatic',
        note: 'Prompt is now compatible with canonical MCP grading prompts'
      });
    } catch (error) {
      console.error("Error auto-implementing prompt:", error);
      res.status(500).json({ message: "Failed to auto-implement prompt" });
    }
  });

  // Placeholder for manual promote endpoint (future implementation)
  app.post("/api/prompt-builder/promote", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      res.json({
        success: false,
        message: "Manual promotion functionality requires advanced MCP server integration",
        note: "Use auto-implement for compatible prompts, or contact development team for custom variables"
      });
    } catch (error) {
      console.error("Error promoting prompt:", error);
      res.status(500).json({ message: "Failed to promote prompt" });
    }
  });

  // ================= ADMIN SETTINGS ROUTES =================
  // Get admin settings (for premium toggle and trial configuration)
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const premiumSetting = await storage.getAdminSetting('require_premium_subscription');
      const trialPeriodSetting = await storage.getAdminSetting('trial_period_days');
      
      res.json({
        requirePremium: premiumSetting?.settingValue?.enabled || false,
        trialPeriodDays: trialPeriodSetting?.settingValue?.days || 0
      });
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  // Update admin settings (admin only)
  app.put("/api/admin/settings", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { requirePremium, trialPeriodDays } = req.body;

      // Update premium toggle
      if (typeof requirePremium === 'boolean') {
        await storage.updateAdminSetting(
          'require_premium_subscription',
          { enabled: requirePremium },
          user.id
        );
      }

      // Update trial period
      if (typeof trialPeriodDays === 'number') {
        await storage.updateAdminSetting(
          'trial_period_days',
          { days: trialPeriodDays },
          user.id
        );
      }

      res.json({
        success: true,
        message: "Admin settings updated successfully"
      });
    } catch (error) {
      console.error("Error updating admin settings:", error);
      res.status(500).json({ message: "Failed to update admin settings" });
    }
  });

  // Get admin dashboard statistics (pre-calculated + performance metrics)
  app.get("/api/admin/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      let stats = await storage.getAdminStats();
      if (!stats) {
        // If no stats exist yet, create them
        stats = await storage.refreshAdminStats();
      }

      // Include performance metrics in the same response
      const performanceMetrics = await storage.getPerformanceMetrics();
      
      res.json({ ...stats, ...performanceMetrics });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Refresh admin dashboard statistics (recalculate from database)
  app.post("/api/admin/stats/refresh", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.refreshAdminStats();
      const performanceMetrics = await storage.getPerformanceMetrics();
      res.json({ ...stats, ...performanceMetrics });
    } catch (error) {
      console.error("Error refreshing admin stats:", error);
      res.status(500).json({ message: "Failed to refresh admin stats" });
    }
  });

  // ================= SUBSCRIPTION PLAN ROUTES =================
  // Get all active subscription plans
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getActiveSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get subscription plan by ID
  app.get("/api/subscription-plans/:id", async (req, res) => {
    try {
      const plan = await storage.getSubscriptionPlanById(parseInt(req.params.id));
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching subscription plan:", error);
      res.status(500).json({ message: "Failed to fetch subscription plan" });
    }
  });

  // Create subscription plan (admin only)
  app.post("/api/subscription-plans", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const plan = await storage.createSubscriptionPlan(req.body);
      res.json(plan);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Update subscription plan (admin only)
  app.put("/api/subscription-plans/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const plan = await storage.updateSubscriptionPlan(parseInt(req.params.id), req.body);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Delete subscription plan (admin only)
  app.delete("/api/subscription-plans/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const deleted = await storage.deleteSubscriptionPlan(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json({ message: "Plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // ================= FEATURE FLAGS ROUTES =================
  // Get feature flags for current user based on their subscription plan
  app.get("/api/features", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const subscription = await storage.getSubscriptionByUserId(req.user!.id);
      
      // Default features for free/no subscription users
      const defaultFeatures = {
        aiChatAccess: false,
        aiVoiceTutor: false,
        advancedAnalytics: false,
        prioritySupport: false,
        customBranding: false,
        apiAccess: false,
        maxStudents: 5,
        maxClasses: 2
      };
      
      // If no subscription or inactive subscription, return default features
      if (!subscription || !['active', 'trial'].includes(subscription.status)) {
        return res.json({
          features: defaultFeatures,
          planName: 'Free',
          subscriptionStatus: subscription?.status || 'none'
        });
      }
      
      // Get the plan to retrieve features
      let planFeatures = defaultFeatures;
      if (subscription.planId) {
        const plan = await storage.getSubscriptionPlanById(subscription.planId);
        if (plan && plan.features) {
          planFeatures = { ...defaultFeatures, ...plan.features };
        }
      }
      
      res.json({
        features: planFeatures,
        planName: subscription.planId ? (await storage.getSubscriptionPlanById(subscription.planId))?.name || 'Unknown' : 'Trial',
        subscriptionStatus: subscription.status
      });
    } catch (error) {
      console.error("Error fetching user features:", error);
      res.status(500).json({ message: "Failed to fetch user features" });
    }
  });

  // Admin endpoint to update plan features
  app.patch("/api/subscription-plans/:id/features", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planId = parseInt(req.params.id);
      const { features } = req.body;
      
      if (!features || typeof features !== 'object') {
        return res.status(400).json({ message: "Features object is required" });
      }

      // Get existing plan
      const existingPlan = await storage.getSubscriptionPlanById(planId);
      if (!existingPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Merge new features with existing ones
      const updatedFeatures = { ...(existingPlan.features || {}), ...features };
      
      const plan = await storage.updateSubscriptionPlan(planId, { features: updatedFeatures });
      res.json(plan);
    } catch (error) {
      console.error("Error updating plan features:", error);
      res.status(500).json({ message: "Failed to update plan features" });
    }
  });

  // Admin endpoint to get all feature definitions (available feature flags)
  app.get("/api/features/definitions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Return all available feature flags with their descriptions
      const featureDefinitions = [
        { key: 'aiChatAccess', name: 'AI Chat Access', description: 'Allow access to AI chat assistant', type: 'boolean', defaultValue: false },
        { key: 'aiVoiceTutor', name: 'AI Voice Tutor', description: 'Allow access to AI voice tutor feature', type: 'boolean', defaultValue: false },
        { key: 'advancedAnalytics', name: 'Advanced Analytics', description: 'Access to detailed analytics and reports', type: 'boolean', defaultValue: false },
        { key: 'prioritySupport', name: 'Priority Support', description: 'Priority customer support', type: 'boolean', defaultValue: false },
        { key: 'customBranding', name: 'Custom Branding', description: 'Ability to customize branding', type: 'boolean', defaultValue: false },
        { key: 'apiAccess', name: 'API Access', description: 'Access to API endpoints', type: 'boolean', defaultValue: false },
        { key: 'maxStudents', name: 'Max Students', description: 'Maximum number of students allowed', type: 'number', defaultValue: 5 },
        { key: 'maxClasses', name: 'Max Classes', description: 'Maximum number of classes allowed', type: 'number', defaultValue: 2 }
      ];

      res.json(featureDefinitions);
    } catch (error) {
      console.error("Error fetching feature definitions:", error);
      res.status(500).json({ message: "Failed to fetch feature definitions" });
    }
  });

  // ================= SUBSCRIPTION ROUTES =================
  // Get user's subscription status
  app.get("/api/subscription/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const subscription = await storage.getSubscriptionByUserId(req.user!.id);
      
      if (!subscription) {
        return res.json({
          hasSubscription: false,
          status: null,
          features: null
        });
      }

      // Fetch the plan features if the subscription has a planId
      let planFeatures = null;
      if (subscription.planId) {
        const plan = await storage.getSubscriptionPlanById(subscription.planId);
        planFeatures = plan?.features || null;
      }

      res.json({
        hasSubscription: true,
        subscription,
        features: planFeatures
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Get subscription management link for updating card details
  app.get("/api/subscription/manage-link", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const subscription = await storage.getSubscriptionByUserId(req.user!.id);
      
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }

      if (!subscription.paystackSubscriptionCode) {
        return res.status(400).json({ message: "Subscription has no Paystack code" });
      }

      // Import Paystack service dynamically
      const { paystackService } = await import('./paystack-service');
      
      // Get the management link from Paystack
      const response = await paystackService.getSubscriptionManagementLink(subscription.paystackSubscriptionCode);
      
      res.json({
        link: response.data.link
      });
    } catch (error) {
      console.error("Error getting subscription management link:", error);
      res.status(500).json({ message: "Failed to get subscription management link" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const subscription = await storage.getSubscriptionByUserId(req.user!.id);
      
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }

      if (subscription.status === 'cancelled') {
        return res.status(400).json({ message: "Subscription is already cancelled" });
      }

      if (!subscription.paystackSubscriptionCode) {
        return res.status(400).json({ message: "Subscription has no Paystack code" });
      }

      // Import Paystack service dynamically
      const { paystackService } = await import('./paystack-service');
      
      // Get subscription details from Paystack to retrieve email_token and next_payment_date
      const paystackResponse = await paystackService.getSubscription(subscription.paystackSubscriptionCode);
      const paystackData = paystackResponse.data;

      // CRITICAL: Disable the subscription on Paystack using email_token
      if (paystackData.email_token) {
        await paystackService.disableSubscription(
          subscription.paystackSubscriptionCode,
          paystackData.email_token
        );
        console.log('✅ Subscription disabled on Paystack:', subscription.paystackSubscriptionCode);
      } else {
        console.error('❌ No email_token found, cannot disable on Paystack');
        throw new Error('Cannot disable subscription: email_token not found');
      }

      // Update subscription status to 'cancelled' and store email_token and next_payment_date
      await storage.updateSubscription(subscription.id, {
        status: 'cancelled',
        cancelledAt: new Date(),
        nextPaymentDate: paystackData.next_payment_date ? addPaymentBuffer(paystackData.next_payment_date) : subscription.nextPaymentDate,
        metadata: {
          ...subscription.metadata,
          emailToken: paystackData.email_token,
        }
      });
      
      res.json({
        message: "Subscription cancelled successfully",
        nextPaymentDate: paystackData.next_payment_date
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Check subscription status - manually sync from Paystack
  app.post("/api/subscription/check-status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const subscription = await storage.getSubscriptionByUserId(req.user!.id);
      
      if (!subscription) {
        return res.status(404).json({ message: "No subscription found" });
      }

      if (!subscription.paystackSubscriptionCode) {
        return res.status(400).json({ message: "Subscription has no Paystack code to check" });
      }

      // Import Paystack service dynamically
      const { paystackService } = await import('./paystack-service');
      
      console.log(`🔍 Manually checking subscription status for subscription ${subscription.id}`);
      
      // Fetch the subscription details from Paystack
      const paystackResponse = await paystackService.getSubscription(subscription.paystackSubscriptionCode);
      const paystackData = paystackResponse.data;

      console.log(`📊 Paystack status: ${paystackData.status}, DB status: ${subscription.status}`);

      // Map Paystack status to our database status
      let newStatus = subscription.status;
      if (paystackData.status === 'active') {
        newStatus = 'active';
      } else if (paystackData.status === 'non-renewing') {
        newStatus = 'cancelled';
      } else if (paystackData.status === 'cancelled' || paystackData.status === 'completed') {
        newStatus = 'expired';
      }

      // Update the subscription if status has changed
      if (newStatus !== subscription.status) {
        console.log(`✅ Updating subscription status from ${subscription.status} to ${newStatus}`);
        
        await storage.updateSubscription(subscription.id, {
          status: newStatus,
          nextPaymentDate: paystackData.next_payment_date ? addPaymentBuffer(paystackData.next_payment_date) : null,
          currentPeriodStart: paystackData.current_period_start ? new Date(paystackData.current_period_start) : subscription.currentPeriodStart,
          currentPeriodEnd: paystackData.current_period_end ? addPaymentBuffer(paystackData.current_period_end) : subscription.currentPeriodEnd,
        });

        res.json({
          message: "Subscription status updated successfully",
          oldStatus: subscription.status,
          newStatus: newStatus
        });
      } else {
        res.json({
          message: "Subscription status is up to date",
          status: subscription.status
        });
      }
    } catch (error: any) {
      console.error("Error checking subscription status:", error);
      
      // If subscription not found on Paystack, it might have been deleted
      if (error.response?.status === 404) {
        return res.status(404).json({ 
          message: "Subscription not found on Paystack. It may have been cancelled or deleted." 
        });
      }
      
      res.status(500).json({ message: "Failed to check subscription status" });
    }
  });

  // Check student's subscription status (for parents)
  app.get("/api/students/:studentUserId/subscription-status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const studentUserId = parseInt(req.params.studentUserId);
      
      // Verify the requesting user is a parent and this is their child
      const parentUser = await storage.getUser(req.user!.id);
      if (parentUser?.role !== 'parent') {
        return res.status(403).json({ message: "Only parents can check student subscription status" });
      }

      // Verify the student belongs to this parent
      const children = await storage.getChildrenByParent(req.user!.id);
      const childRecord = children.find(child => child.studentUserId === studentUserId);
      
      if (!childRecord) {
        return res.status(403).json({ message: "You can only check subscription status for your own children" });
      }

      const subscription = await storage.getSubscriptionByUserId(studentUserId);
      
      const now = new Date();
      let hasActiveSubscription = false;
      let subscriptionMessage = 'No subscription';
      let subscriptionStatus = 'none';

      if (subscription) {
        if (subscription.status === 'trial') {
          hasActiveSubscription = subscription.trialEndDate ? new Date(subscription.trialEndDate) >= now : false;
          subscriptionMessage = hasActiveSubscription ? 'Trial active' : 'Trial expired';
          subscriptionStatus = subscription.status;
        } else if (subscription.status === 'active') {
          // Check currentPeriodEnd first, fall back to nextPaymentDate for hourly/short-interval subscriptions
          hasActiveSubscription = subscription.currentPeriodEnd 
            ? new Date(subscription.currentPeriodEnd) >= now 
            : subscription.nextPaymentDate 
              ? new Date(subscription.nextPaymentDate) >= now 
              : false;
          subscriptionMessage = hasActiveSubscription ? 'Subscription active' : 'Subscription expired';
          subscriptionStatus = subscription.status;
        } else if (subscription.status === 'cancelled') {
          // Cancelled subscription - check if user still has access until nextPaymentDate
          hasActiveSubscription = subscription.nextPaymentDate ? new Date(subscription.nextPaymentDate) >= now : false;
          subscriptionMessage = hasActiveSubscription ? 'Cancelled (access until paid period ends)' : 'Subscription expired';
          subscriptionStatus = subscription.status;
        } else {
          subscriptionMessage = `Status: ${subscription.status}`;
          subscriptionStatus = subscription.status;
        }
      }

      res.json({
        hasActiveSubscription,
        subscription,
        subscriptionStatus,
        message: subscriptionMessage
      });
    } catch (error) {
      console.error("Error fetching student subscription status:", error);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  // Check if student has a parent linked
  app.get("/api/students/:userId/parent-status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Verify the user is checking their own status or is a parent checking their child
      if (req.user!.id !== userId) {
        const user = await storage.getUser(req.user!.id);
        if (user?.role !== 'parent') {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }

      // Check if this student has a parent in the children table
      const childRecord = await storage.getChildByStudentId(userId);

      const user = await storage.getUser(userId);
      
      res.json({
        hasParent: !!childRecord?.parentId,
        parentContact: user?.parentContact || null
      });
    } catch (error) {
      console.error("Error checking parent status:", error);
      res.status(500).json({ message: "Failed to check parent status" });
    }
  });

  // Save parent contact details for student
  app.post("/api/students/:userId/parent-contact", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { parentEmail, parentPhone } = req.body;
      
      // Verify the user is updating their own details
      if (req.user!.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!parentEmail || !parentPhone) {
        return res.status(400).json({ message: "Parent email and phone are required" });
      }

      // Update user's parent contact information
      await storage.updateUserParentContact(userId, 
        JSON.stringify({ email: parentEmail, phone: parentPhone })
      );

      res.json({ 
        success: true,
        message: "Parent contact details saved successfully" 
      });
    } catch (error) {
      console.error("Error saving parent contact:", error);
      res.status(500).json({ message: "Failed to save parent contact details" });
    }
  });

  // Get all subscribers (admin only)
  app.get("/api/admin/subscribers", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all subscriptions from database
      const allSubscriptions = await storage.getAllActiveSubscriptions();
      
      // Enrich with user details
      const subscribersWithDetails = await Promise.all(
        allSubscriptions.map(async (sub) => {
          const subscriberUser = await storage.getUser(sub.userId);
          return {
            id: sub.id,
            userId: sub.userId,
            userName: subscriberUser?.name || 'Unknown',
            userEmail: subscriberUser?.email || 'Unknown',
            userRole: subscriberUser?.role || 'Unknown',
            status: sub.status,
            planId: sub.planId,
            amount: sub.amount,
            currency: sub.currency,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            nextPaymentDate: sub.nextPaymentDate,
            trialEndDate: sub.trialEndDate,
            paystackSubscriptionCode: sub.paystackSubscriptionCode,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt
          };
        })
      );

      res.json({
        total: subscribersWithDetails.length,
        subscribers: subscribersWithDetails
      });
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  // Initialize subscription payment with Paystack
  app.post("/api/subscription/initialize", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { planId, callbackUrl, studentUserId } = req.body;
      
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If subscribing for a student, verify parent-child relationship
      if (studentUserId) {
        if (user.role !== 'parent') {
          return res.status(403).json({ message: "Only parents can subscribe for students" });
        }
        
        const children = await storage.getChildrenByParent(req.user!.id);
        const childRecord = children.find(child => child.studentUserId === studentUserId);
        
        if (!childRecord) {
          return res.status(403).json({ message: "You can only subscribe for your own children" });
        }
      }

      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Determine the user ID for the subscription
      // If parent is subscribing for a student, use studentUserId, otherwise use parent's ID
      const subscriptionUserId = studentUserId || user.id;

      // Get the email to use for the subscription
      // If subscribing for a student, use the student's email; otherwise use the parent's email
      let subscriptionEmail = user.email;
      if (studentUserId) {
        const student = await storage.getUser(studentUserId);
        if (student) {
          subscriptionEmail = student.email;
        }
      }

      // Import Paystack service dynamically
      const { paystackService } = await import('./paystack-service');
      
      // Get Paystack plan code from environment variable (fallback to database)
      const paystackPlanCode = process.env.PREMIUM_PLAN || plan.paystackPlanCode;
      
      console.log('Paystack plan source:', process.env.PREMIUM_PLAN ? 'environment variable' : 'database');
      
      // Build callback URL using the correct domain
      // Use REPLIT_DEPLOYMENT to detect production vs development
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const baseUrl = isProduction 
        ? (process.env.PUBLIC_APP_URL || 'https://xtraclass.ai')
        : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
      const defaultCallbackUrl = `${baseUrl}/subscription/callback`;
      
      console.log('🔗 Subscription callback URL:', callbackUrl || defaultCallbackUrl);
      
      // Initialize transaction with Paystack
      const initData = await paystackService.initializeTransaction({
        email: subscriptionEmail,  // Student's email if subscribing for student, parent's email otherwise
        amount: plan.amount,
        reference: `sub_${subscriptionUserId}_${Date.now()}`,
        callback_url: callbackUrl || defaultCallbackUrl,
        plan: paystackPlanCode,  // Paystack plan code from environment variable or database
        metadata: {
          userId: subscriptionUserId,  // Student's userId if subscribing for student
          parentUserId: studentUserId ? user.id : undefined,  // Track parent if applicable
          planId: plan.id
        }
      });

      console.log('Paystack initData:', JSON.stringify(initData, null, 2));

      res.json({
        authorizationUrl: initData.data?.authorization_url,
        accessCode: initData.data?.access_code,
        reference: initData.data?.reference
      });
    } catch (error) {
      console.error("Error initializing subscription:", error);
      res.status(500).json({ message: "Failed to initialize subscription" });
    }
  });

  // Check if parent exists by email
  app.post("/api/subscription/check-parent", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      
      if (user && user.role === 'parent') {
        return res.json({
          exists: true,
          parent: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            cellNumber: user.cellNumber,
            isActive: user.isActive
          }
        });
      }
      
      return res.json({ exists: false });
    } catch (error) {
      console.error("Error checking parent:", error);
      res.status(500).json({ message: "Failed to check parent" });
    }
  });

  // Request parent consent for subscription
  app.post("/api/subscription/request-parent-consent", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { planId, parentName, parentEmail, parentPhone, parentRelationship } = req.body;
      
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only students can request parent consent
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Only students can request parent consent" });
      }

      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Generate unique consent token
      const { nanoid } = await import('nanoid');
      const consentToken = nanoid(32);

      // Check if user already has a subscription
      const existingSubscription = await storage.getSubscriptionByUserId(user.id);
      
      let subscription;
      if (existingSubscription) {
        const { status } = existingSubscription;
        
        // Only allow new consent requests if subscription is not active or in trial
        if (status === 'active' || status === 'trial') {
          return res.status(400).json({ message: "You already have an active subscription. Please manage it from the subscription page." });
        }
        
        // For expired, cancelled, failed, or pending subscriptions, update/restart the consent flow
        subscription = await storage.updateSubscription(existingSubscription.id, {
          planId: plan.id,
          amount: plan.amount,
          currency: plan.currency,
          parentName,
          parentEmail,
          parentPhone,
          parentRelationship,
          consentToken,
          consentGivenAt: null, // Reset consent timestamp
          status: 'pending_parent_consent', // Reset to pending consent
        });
      } else {
        // Create new pending subscription
        subscription = await storage.createSubscription({
          userId: user.id,
          planId: plan.id,
          status: 'pending_parent_consent',
          amount: plan.amount,
          currency: plan.currency,
          parentName,
          parentEmail,
          parentPhone,
          parentRelationship,
          consentToken,
          startDate: new Date(),
        });
      }

      // Generate consent URL - use REPLIT_DEPLOYMENT to detect production vs development
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const baseUrl = isProduction 
        ? (process.env.PUBLIC_APP_URL || 'https://xtraclass.ai')
        : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
      const consentUrl = `${baseUrl}/parent-consent/${consentToken}`;

      // Send email to parent requesting subscription
      const { emailService } = await import('./email-service');
      const studentName = `${user.firstName} ${user.lastName}`;
      
      // Send email asynchronously - don't block the response
      emailService.sendParentSubscriptionRequest(
        parentEmail,
        parentName,
        studentName,
        user.email,
        consentUrl
      ).catch(error => {
        console.error('❌ Failed to send parent subscription request email:', error);
      });
      
      console.log(`📧 Parent subscription request email queued for: ${parentEmail}`);

      res.json({
        success: true,
        consentToken,
        consentUrl,
        subscription: {
          id: subscription.id,
          status: subscription.status,
        }
      });
    } catch (error) {
      console.error("Error requesting parent consent:", error);
      res.status(500).json({ message: "Failed to request parent consent" });
    }
  });

  // Get parent consent details
  app.get("/api/subscription/parent-consent/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const subscription = await storage.getSubscriptionByConsentToken(token);
      if (!subscription) {
        return res.status(404).json({ message: "Consent request not found or expired" });
      }

      const user = await storage.getUser(subscription.userId);
      const plan = await storage.getSubscriptionPlanById(subscription.planId);

      res.json({
        student: {
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
        },
        plan: {
          name: plan?.name,
          description: plan?.description,
          amount: plan?.amount,
          currency: plan?.currency,
          interval: plan?.interval,
        },
        parentDetails: {
          name: subscription.parentName,
          email: subscription.parentEmail,
          phone: subscription.parentPhone,
          relationship: subscription.parentRelationship,
        },
        subscriptionId: subscription.id,
      });
    } catch (error) {
      console.error("Error fetching parent consent details:", error);
      res.status(500).json({ message: "Failed to fetch consent details" });
    }
  });

  // Confirm parent consent and redirect to payment
  app.post("/api/subscription/parent-consent/:token/confirm", async (req, res) => {
    try {
      const { token } = req.params;
      const { parentName, parentEmail, parentPhone, billingAddress, acceptTerms, acceptRecurring } = req.body;
      
      if (!acceptTerms || !acceptRecurring) {
        return res.status(400).json({ message: "You must accept the terms and authorize recurring payments" });
      }

      const subscription = await storage.getSubscriptionByConsentToken(token);
      if (!subscription) {
        return res.status(404).json({ message: "Consent request not found or expired" });
      }

      // Strictly validate that subscription is in pending_parent_consent state
      if (subscription.status !== 'pending_parent_consent') {
        return res.status(400).json({ message: "Consent already processed or subscription is no longer pending" });
      }

      // Additional check: ensure subscription hasn't already been consented
      if (subscription.consentGivenAt) {
        return res.status(400).json({ message: "Consent has already been given for this request" });
      }

      const user = await storage.getUser(subscription.userId);
      const plan = await storage.getSubscriptionPlanById(subscription.planId);

      if (!user || !plan) {
        return res.status(404).json({ message: "User or plan not found" });
      }

      // Update subscription with parent confirmation and clear token to prevent replay
      await storage.updateSubscription(subscription.id, {
        consentGivenAt: new Date(),
        status: 'pending_payment',
        consentToken: null, // Clear token to prevent reuse
        metadata: {
          ...subscription.metadata,
          // Store parent details for later use in webhook
          parentName: parentName,
          parentEmail: parentEmail.toLowerCase(),
          parentPhone: parentPhone,
        }
      });

      // Create parent account immediately (before payment)
      console.log('\n👨‍👩‍👧 ========== CREATING PARENT ACCOUNT ==========');
      console.log('📧 Parent Email:', parentEmail);
      console.log('👤 Parent Name:', parentName);
      console.log('📞 Parent Phone:', parentPhone);
      
      // Check if parent account already exists
      const existingParent = await storage.getUserByEmail(parentEmail.toLowerCase());
      let parentUserId = existingParent?.id;
      let generatedPassword = '';
      
      if (!existingParent) {
        // Generate random password (12 characters, alphanumeric + special chars)
        generatedPassword = Array.from({ length: 12 }, () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
          return chars.charAt(Math.floor(Math.random() * chars.length));
        }).join('');
        
        // Extract parent names
        const nameParts = parentName.trim().split(' ');
        const firstName = nameParts[0] || 'Parent';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        // Generate referral code for parent
        const parentFirstNameClean = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const parentRandomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
        const parentReferralCode = `${parentFirstNameClean.substring(0, 4).toUpperCase()}${parentRandomPart}`;
        
        // Create parent user account (INACTIVE until payment succeeds)
        // NOTE: Pass plain password - storage.createUser will hash it
        // Auto-created parents don't need email verification (they get credentials email instead)
        const parentUser = await storage.createUser({
          email: parentEmail.toLowerCase(),
          password: generatedPassword, // Plain password - will be hashed by storage layer
          firstName: firstName,
          lastName: lastName,
          cellNumber: parentPhone || undefined,
          role: 'parent',
          points: 0,
          isActive: false, // INACTIVE until payment completes
          emailVerified: true, // Auto-created parents are auto-verified (no verification email needed)
          emailVerificationToken: null, // No verification token needed for auto-created parents
          referralCode: parentReferralCode
        });
        
        parentUserId = parentUser.id;
        
        console.log('✅ Parent account created (INACTIVE) - ID:', parentUser.id);
        console.log('🔑 Generated Password:', generatedPassword);
        console.log('⚠️ Account will be activated after successful payment');
        
        // Store temporary password in subscription metadata for email sending after payment
        // SECURITY NOTE: Password stored unencrypted for minimal time (consent → payment → email)
        // Cleared immediately after email sent. Consider using password-reset link flow for higher security.
        await storage.updateSubscription(subscription.id, {
          metadata: {
            ...subscription.metadata,
            tempParentPassword: generatedPassword, // Store temporarily - will be cleared after email sent
            credentialsEmailSent: false, // Idempotency flag to prevent duplicate emails
          }
        });
        console.log('💾 Temporary password stored in subscription metadata (will be cleared after email sent)');
        
        // Link parent to student
        const student = await storage.getStudentByUserId(user.id);
        if (student && student.studentId) {
          try {
            const childName = `${user.firstName} ${user.lastName}`;
            await storage.linkChildToExistingStudent(parentUser.id, student.studentId, childName);
            console.log('✅ Parent linked to student - Student ID:', student.studentId);
          } catch (error: any) {
            console.log('⚠️ Could not link parent to student:', error.message);
          }
        }
        
        console.log('\n🎉 ========== PARENT ACCOUNT DETAILS ==========');
        console.log('📧 Email:', parentEmail.toLowerCase());
        console.log('🔑 Password:', generatedPassword);
        console.log('👤 Name:', parentName);
        console.log('📞 Phone:', parentPhone);
        console.log('🔒 Status: INACTIVE (will activate after payment)');
        console.log('👶 Student:', user.firstName, user.lastName);
        console.log('🆔 Student ID:', student?.studentId || 'N/A');
        console.log('===============================================\n');
        
        // Send Parent Credentials Email immediately after account creation
        console.log('\n📧 ========== SENDING PARENT CREDENTIALS EMAIL ==========');
        const studentName = `${user.firstName} ${user.lastName}`;
        
        try {
          // Import email service dynamically
          const { emailService } = await import('./email-service');
          
          // Send credentials email synchronously to ensure it completes
          const emailSent = await emailService.sendParentCredentialsEmail(
            parentEmail.toLowerCase(),
            parentName,
            generatedPassword,
            studentName
          );
          
          if (emailSent) {
            console.log('✅ Parent credentials email sent successfully');
            // Mark as sent to prevent duplicate sends in webhook
            await storage.updateSubscription(subscription.id, {
              metadata: {
                ...subscription.metadata,
                tempParentPassword: generatedPassword, // Keep for potential retry
                credentialsEmailSent: true, // Mark as sent
              }
            });
          } else {
            console.error('⚠️ Parent credentials email failed to send');
          }
        } catch (error) {
          console.error('❌ Error sending parent credentials email:', error);
        }
        
        console.log('============================================================\n');
      } else {
        console.log('ℹ️ Parent account already exists - ID:', existingParent.id);
        console.log('📊 Status:', existingParent.isActive ? 'ACTIVE' : 'INACTIVE');
        
        // Link to student if not already linked
        const student = await storage.getStudentByUserId(user.id);
        if (student && student.studentId) {
          try {
            const existingChild = await storage.getChildByParentAndStudentUserId(existingParent.id, user.id);
            if (!existingChild) {
              const childName = `${user.firstName} ${user.lastName}`;
              await storage.linkChildToExistingStudent(existingParent.id, student.studentId, childName);
              console.log('✅ Existing parent linked to new student');
            }
          } catch (error: any) {
            console.log('⚠️ Could not link parent:', error.message);
          }
        }
      }

      // Import Paystack service dynamically
      const { paystackService } = await import('./paystack-service');
      
      // Get Paystack plan code from environment variable
      const paystackPlanCode = process.env.PREMIUM_PLAN || plan.paystackPlanCode;
      
      // Build callback URL using the correct domain
      // Use REPLIT_DEPLOYMENT to detect production vs development
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const baseUrl = isProduction 
        ? (process.env.PUBLIC_APP_URL || 'https://xtraclass.ai')
        : (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
      const callbackUrl = `${baseUrl}/subscription/callback?consentToken=${token}`;
      
      console.log('🔗 Parent consent callback URL:', callbackUrl);
      console.log('📧 Using student email for Paystack:', user.email);
      console.log('👨‍👩‍👧 Parent email stored in metadata:', parentEmail);
      
      // Initialize transaction with Paystack - ALWAYS use student's email
      const initData = await paystackService.initializeTransaction({
        email: user.email, // Student's email for subscription
        amount: plan.amount,
        reference: `sub_${user.id}_${Date.now()}`,
        callback_url: callbackUrl,
        plan: paystackPlanCode,
        metadata: {
          userId: user.id,
          planId: plan.id,
          consentToken: token,
          parentEmail, // Parent email stored in metadata only
          parentPhone,
          billingAddress,
        }
      });

      res.json({
        authorizationUrl: initData.data?.authorization_url,
        reference: initData.data?.reference,
      });
    } catch (error) {
      console.error("Error confirming parent consent:", error);
      res.status(500).json({ message: "Failed to confirm consent" });
    }
  });

  // Verify subscription payment
  app.get("/api/subscription/verify/:reference", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { reference } = req.params;
      
      console.log('Verifying payment with reference:', reference);
      
      // Import Paystack service dynamically
      const { paystackService } = await import('./paystack-service');
      
      // Verify transaction with Paystack
      const verification = await paystackService.verifyTransaction(reference);
      
      console.log('Paystack verification response:', JSON.stringify(verification, null, 2));
      console.log('Verification status:', verification.status);
      console.log('Verification data status:', verification.data?.status);
      
      if (verification.data?.status === 'success') {
        const metadata = verification.data.metadata;
        const trialSetting = await storage.getAdminSetting('trial_period_days');
        const trialDays = trialSetting?.settingValue?.days || 0;
        
        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);
        
        // Use userId from metadata (which could be student's userId if parent is subscribing for student)
        const targetUserId = metadata.userId || req.user!.id;
        
        // Create or update subscription for the target user (student if applicable)
        const existingSubscription = await storage.getSubscriptionByUserId(targetUserId);
        
        if (existingSubscription) {
          await storage.updateSubscription(existingSubscription.id, {
            planId: metadata.planId,
            status: trialDays > 0 ? 'trial' : 'active',
            amount: verification.data.amount / 100, // Convert from kobo/cents to main currency
            currency: verification.data.currency || 'ZAR',
            trialEndDate: trialDays > 0 ? trialEndDate : null,
            currentPeriodStart: now,
            currentPeriodEnd: new Date(now.setMonth(now.getMonth() + 1)),
            updatedAt: new Date()
          });
        } else {
          await storage.createSubscription({
            userId: targetUserId,
            planId: metadata.planId,
            status: trialDays > 0 ? 'trial' : 'active',
            amount: verification.data.amount / 100, // Convert from kobo/cents to main currency
            currency: verification.data.currency || 'ZAR',
            startDate: now,
            trialEndDate: trialDays > 0 ? trialEndDate : null,
            currentPeriodStart: now,
            currentPeriodEnd: new Date(now.setMonth(now.getMonth() + 1))
          });
        }
        
        res.json({
          success: true,
          message: "Subscription activated successfully",
          subscription: verification.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Payment verification failed"
        });
      }
    } catch (error) {
      console.error("Error verifying subscription:", error);
      res.status(500).json({ message: "Failed to verify subscription" });
    }
  });

  // Get subscription management link
  app.get("/api/subscription/:userId/manage-link", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log('🔗 Fetching subscription management link for userId:', userId);
      console.log('🔗 Current user:', req.user?.id, 'role:', req.user?.role);
      
      // Verify user has permission (must be parent or the user themselves)
      if (req.user!.role === 'parent') {
        // Verify this child belongs to the parent
        const child = await storage.getChildByStudentId(userId);
        console.log('🔗 Child lookup result:', child ? `Found child ${child.id}` : 'No child found');
        if (!child || child.parentId !== req.user!.id) {
          console.log('🔗 Unauthorized: child does not belong to parent');
          return res.status(403).json({ message: "Unauthorized" });
        }
      } else if (req.user!.id !== userId) {
        console.log('🔗 Unauthorized: user ID mismatch');
        return res.status(403).json({ message: "Unauthorized" });
      }

      const subscription = await storage.getSubscriptionByUserId(userId);
      console.log('🔗 Subscription lookup:', subscription ? {
        id: subscription.id,
        status: subscription.status,
        hasPaystackCode: !!subscription.paystackSubscriptionCode,
        paystackCode: subscription.paystackSubscriptionCode
      } : 'No subscription found');
      
      if (!subscription || !subscription.paystackSubscriptionCode) {
        console.log('🔗 No active subscription with Paystack code');
        return res.status(404).json({ 
          success: false,
          message: "No active subscription found" 
        });
      }

      console.log('🔗 Calling Paystack API for subscription:', subscription.paystackSubscriptionCode);
      // Get management link from Paystack
      const response = await fetch(
        `https://api.paystack.co/subscription/${subscription.paystackSubscriptionCode}/manage/link`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('🔗 Paystack response:', { status: data.status, hasLink: !!data.data?.link });

      if (data.status && data.data?.link) {
        console.log('🔗 Successfully generated management link');
        res.json({
          success: true,
          link: data.data.link
        });
      } else {
        console.log('🔗 Paystack API failed:', data);
        res.status(400).json({
          success: false,
          message: data.message || "Failed to generate management link"
        });
      }
    } catch (error) {
      console.error("🔗 Error getting subscription management link:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to get management link" 
      });
    }
  });

  // Paystack webhook handler
  app.post("/api/subscription/webhook", async (req, res) => {
    try {
      console.log('\n🔔 ========== PAYSTACK WEBHOOK RECEIVED ==========');
      console.log('📥 Event Type:', req.body.event);
      console.log('⏰ Time:', new Date().toLocaleString());
      
      // Verify webhook signature
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (hash !== req.headers['x-paystack-signature']) {
        console.log('❌ Webhook signature verification failed');
        console.log('================================================\n');
        return res.status(401).json({ message: "Invalid signature" });
      }

      const event = req.body;
      console.log('✅ Signature verified');
      
      // Return 200 OK immediately to prevent retries
      res.status(200).json({ received: true });

      // Process webhook asynchronously
      setImmediate(async () => {
        try {
          // Handle different webhook events
          switch (event.event) {
            case 'charge.success':
              // Payment successful - only used for renewals (initial subscriptions handled by subscription.create)
              console.log('💰 Processing charge.success event');
              
              // Try to find existing subscription by subscription_code (for renewals)
              if (event.data?.subscription?.subscription_code) {
                const subscription = await storage.getSubscriptionByPaystackCode(
                  event.data.subscription.subscription_code
                );
                
                if (subscription) {
                  // Existing subscription - renewal payment successful
                  console.log('🔄 Renewal payment received for subscription:', event.data.subscription.subscription_code);
                  
                  const now = new Date();
                  // Use Paystack's next_payment_date (handles hourly/monthly automatically)
                  const nextPayment = event.data.subscription.next_payment_date 
                    ? addPaymentBuffer(event.data.subscription.next_payment_date)
                    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // fallback: 30 days
                  
                  // Check Paystack subscription status - respect 'non-renewing' status
                  const paystackStatus = event.data.subscription?.status;
                  const ourStatus = paystackStatus === 'non-renewing' ? 'cancelled' : 'active';
                  
                  await storage.updateSubscription(subscription.id, {
                    status: ourStatus,
                    currentPeriodStart: now,
                    currentPeriodEnd: nextPayment,
                    nextPaymentDate: nextPayment,
                    metadata: {
                      ...subscription.metadata,
                      lastPaymentAmount: event.data.amount / 100,
                      lastPaymentDate: new Date(event.data.paid_at || now)
                    }
                  });
                  console.log(`✅ Subscription renewed - status: ${ourStatus}, next payment:`, nextPayment.toLocaleString());
                } else {
                  console.log('⚠️ Subscription code not found in database:', event.data.subscription.subscription_code);
                }
              } else if (event.data?.customer?.email && event.data?.plan) {
                // No subscription code but has customer + plan = likely a renewal
                console.log('🔄 Renewal payment without subscription_code - using customer email fallback');
                console.log('📧 Customer Email:', event.data.customer.email);
                console.log('👤 Customer Code:', event.data.customer.customer_code || 'N/A');
                console.log('💵 Amount:', (event.data.amount / 100), event.data.currency);
                console.log('📋 Plan:', event.data.plan.plan_code, '(' + event.data.plan.interval + ')');
                
                // Find user by email
                const user = await storage.getUserByEmail(event.data.customer.email);
                
                if (user) {
                  console.log('✅ Found user:', user.id, user.email);
                  const subscription = await storage.getSubscriptionByUserId(user.id);
                  
                  if (subscription) {
                    // Check idempotency - avoid processing same transaction twice
                    const txnRef = event.data.reference;
                    const lastProcessedRef = subscription.metadata?.lastPaymentReference;
                    
                    if (txnRef && lastProcessedRef === txnRef) {
                      console.log('⚠️ Already processed this payment reference:', txnRef);
                      console.log('================================================\n');
                      return;
                    }
                    
                    console.log('✅ Found subscription:', subscription.id, '- Status:', subscription.status);
                    
                    // Capture pre-update status to determine if this is first activation
                    const wasPendingOrInactive = subscription.status !== 'active';
                    
                    // FIRST-TIME PAYMENT or RENEWAL: Activate subscription immediately
                    const now = new Date(event.data.paid_at || new Date());
                    let nextPayment: Date;
                    
                    if (subscription.paystackSubscriptionCode) {
                      // Existing subscription with code - fetch from Paystack
                      console.log('🔍 Fetching subscription details from Paystack:', subscription.paystackSubscriptionCode);
                      
                      try {
                        const paystackResponse = await fetch(
                          `https://api.paystack.co/subscription/${subscription.paystackSubscriptionCode}`,
                          {
                            headers: {
                              'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                              'Content-Type': 'application/json'
                            }
                          }
                        );
                        
                        const paystackData = await paystackResponse.json();
                        
                        if (paystackData.status && paystackData.data) {
                          const paystackSub = paystackData.data;
                          console.log('📅 Paystack subscription status:', paystackSub.status);
                          console.log('📅 Paystack next_payment_date:', paystackSub.next_payment_date);
                          
                          nextPayment = paystackSub.next_payment_date 
                            ? addPaymentBuffer(paystackSub.next_payment_date)
                            : new Date(now.getTime() + 60 * 60 * 1000);
                        } else {
                          nextPayment = new Date(now.getTime() + 60 * 60 * 1000);
                        }
                      } catch (error) {
                        console.log('❌ Error fetching from Paystack:', error);
                        nextPayment = new Date(now.getTime() + 60 * 60 * 1000);
                      }
                    } else {
                      // First payment - calculate from plan interval
                      console.log('💳 First payment - activating subscription');
                      const planInterval = event.data.plan?.interval || 'monthly';
                      const intervalMs = planInterval === 'hourly' ? 60 * 60 * 1000 :
                                        planInterval === 'daily' ? 24 * 60 * 60 * 1000 :
                                        planInterval === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
                                        30 * 24 * 60 * 60 * 1000; // monthly default
                      nextPayment = new Date(now.getTime() + intervalMs);
                    }
                    
                    // Update subscription to active
                    await storage.updateSubscription(subscription.id, {
                      status: 'active',
                      currentPeriodStart: now,
                      currentPeriodEnd: nextPayment,
                      nextPaymentDate: nextPayment,
                      metadata: {
                        ...subscription.metadata,
                        lastPaymentAmount: event.data.amount / 100,
                        lastPaymentDate: now,
                        lastPaymentReference: txnRef
                      }
                    });
                    
                    console.log('✅ Subscription activated - status: active');
                    console.log('📅 Next payment:', nextPayment.toLocaleString());
                    console.log('🔓 User access until:', nextPayment.toLocaleString());
                    
                    // Send student confirmation email only on first activation (not renewals)
                    if (wasPendingOrInactive && user.role === 'student') {
                      console.log('📧 Sending subscription confirmation email to student');
                      try {
                        const planName = subscription.planName || 'Premium';
                        const billingCycle = event.data.plan?.interval === 'yearly' ? 'Yearly' : 'Monthly';
                        
                        await emailService.sendStudentSubscriptionConfirmation(
                          user.email,
                          user.firstName,
                          user.lastName,
                          planName,
                          billingCycle
                        );
                        console.log('✅ Student confirmation email sent');
                      } catch (emailError: any) {
                        console.error('❌ Failed to send student confirmation email:', emailError.message);
                        // Don't abort webhook on email failure
                      }
                    }
                    
                    // Activate parent account if this is a parent-paid subscription
                    const parentEmail = subscription.metadata?.parentEmail;
                    const parentName = subscription.metadata?.parentName;
                    const tempPassword = subscription.metadata?.tempParentPassword;
                    
                    if (parentEmail && user.role === 'student') {
                      console.log('👨‍👩‍👧 Parent-paid subscription - checking parent account');
                      const parent = await storage.getUserByEmail(parentEmail);
                      
                      if (parent) {
                        const wasParentInactive = !parent.isActive;
                        
                        // Activate parent account if inactive
                        if (wasParentInactive) {
                          await storage.activateUser(parent.id);
                          console.log('✅ Parent account activated:', parentEmail);
                          
                          // Send parent credentials email only if just activated AND temp password exists
                          if (tempPassword && parentName) {
                            console.log('📧 Sending parent credentials email');
                            try {
                              const studentName = `${user.firstName} ${user.lastName}`;
                              await emailService.sendParentCredentialsEmail(
                                parentEmail,
                                parentName,
                                tempPassword,
                                studentName
                              );
                              console.log('✅ Parent credentials email sent');
                              
                              // Clear temp password from metadata after sending
                              await storage.updateSubscription(subscription.id, {
                                metadata: {
                                  ...subscription.metadata,
                                  tempParentPassword: undefined
                                }
                              });
                              console.log('🗑️ Temporary password cleared from metadata');
                            } catch (emailError: any) {
                              console.error('❌ Failed to send parent credentials email:', emailError.message);
                              // Don't abort webhook on email failure
                            }
                          } else {
                            console.log('⚠️ Cannot send parent credentials - missing temp password or parent name');
                          }
                        } else {
                          console.log('ℹ️ Parent account already active');
                        }
                      } else {
                        console.log('⚠️ Parent account not found:', parentEmail);
                      }
                    }
                  } else {
                    console.log('⚠️ No subscription found for user - waiting for subscription.create');
                  }
                } else {
                  console.log('⚠️ User not found with email:', event.data.customer.email);
                }
              } else {
                // No subscription code and no customer email = truly initial payment
                console.log('ℹ️ Initial payment - waiting for subscription.create event to create subscription');
                console.log('📧 Customer Email:', event.data?.customer?.email || 'N/A');
                console.log('👤 Customer Code:', event.data?.customer?.customer_code || 'N/A');
                console.log('💵 Amount:', (event.data?.amount / 100) || 'N/A', event.data?.currency || '');
                console.log('🔖 Reference:', event.data?.reference || 'N/A');
                console.log('📅 Paid At:', event.data?.paid_at || 'N/A');
              }
              console.log('================================================\n');
              break;
            
            case 'subscription.create':
              // Subscription created by Paystack - update our existing subscription with Paystack details
              console.log('📋 Processing subscription.create event');
              console.log('📋 Customer email:', event.data.customer?.email);
              console.log('📋 Subscription code:', event.data.subscription_code);
              console.log('📋 Plan code:', event.data.plan?.plan_code);
              
              if (event.data?.subscription_code && event.data.customer?.email) {
                // Use getUserByEmail (case-sensitive in DB, but we store emails in lowercase)
                const user = await storage.getUserByEmail(event.data.customer.email);
                
                if (user) {
                  console.log('📋 Found user:', user.id, user.email);
                  const existingSub = await storage.getSubscriptionByUserId(user.id);
                  
                  if (existingSub) {
                    // Update existing subscription with Paystack details
                    
                    // Calculate next payment date if not provided by Paystack
                    let nextPayment: Date | undefined;
                    if (event.data.next_payment_date) {
                      nextPayment = addPaymentBuffer(event.data.next_payment_date);
                    } else if (event.data.plan?.interval) {
                      // Fallback: calculate from plan interval
                      const now = new Date();
                      const baseNextPayment = new Date(now.getTime());
                      
                      if (event.data.plan.interval === 'hourly') {
                        baseNextPayment.setHours(baseNextPayment.getHours() + 1);
                      } else if (event.data.plan.interval === 'daily') {
                        baseNextPayment.setDate(baseNextPayment.getDate() + 1);
                      } else if (event.data.plan.interval === 'weekly') {
                        baseNextPayment.setDate(baseNextPayment.getDate() + 7);
                      } else if (event.data.plan.interval === 'monthly') {
                        baseNextPayment.setMonth(baseNextPayment.getMonth() + 1);
                      } else if (event.data.plan.interval === 'annually' || event.data.plan.interval === 'yearly') {
                        baseNextPayment.setFullYear(baseNextPayment.getFullYear() + 1);
                      }
                      nextPayment = addPaymentBuffer(baseNextPayment);
                    } else {
                      nextPayment = existingSub.nextPaymentDate || undefined;
                    }
                    
                    // IMPORTANT: Don't downgrade active status - preserve it if set by charge.success
                    let newStatus = existingSub.status;
                    if (existingSub.status !== 'active') {
                      // Only update status if not already active
                      newStatus = event.data.status || existingSub.status;
                    } else {
                      console.log('ℹ️ Preserving active status (already set by charge.success)');
                    }
                    
                    const updateData: any = {
                      paystackSubscriptionCode: event.data.subscription_code,
                      paystackCustomerCode: event.data.customer?.customer_code,
                      paystackPlanCode: event.data.plan?.plan_code,
                      status: newStatus,
                      amount: event.data.amount ? event.data.amount / 100 : existingSub.amount,
                      currency: event.data.plan?.currency || existingSub.currency,
                      nextPaymentDate: nextPayment || existingSub.nextPaymentDate,
                      metadata: {
                        ...existingSub.metadata,
                        authorizationCode: event.data.authorization?.authorization_code,
                        cardLast4: event.data.authorization?.last4,
                        cardBrand: event.data.authorization?.brand,
                        cardBank: event.data.authorization?.bank,
                        emailToken: event.data.email_token
                      }
                    };
                    
                    await storage.updateSubscription(existingSub.id, updateData);
                    console.log('✅ Subscription updated with Paystack details');
                    console.log('✅ Subscription code:', event.data.subscription_code);
                    console.log('✅ Customer code:', event.data.customer?.customer_code);
                    console.log('✅ Authorization:', event.data.authorization?.authorization_code);
                    console.log('✅ Card:', event.data.authorization?.last4, event.data.authorization?.brand);
                    console.log('✅ Next payment:', event.data.next_payment_date);
                    
                    // Check if this was a consent-flow subscription - ACTIVATE parent account if needed
                    // newStatus was already defined above, use updateData.status
                    if (existingSub.parentEmail && existingSub.parentName && updateData.status === 'active') {
                      console.log('\n👨‍👩‍👧 ========== ACTIVATING PARENT ACCOUNT ==========');
                      console.log('📧 Parent Email:', existingSub.parentEmail);
                      
                      // Find parent account (should exist from consent confirmation)
                      const existingParent = await storage.getUserByEmail(existingSub.parentEmail);
                      
                      if (existingParent) {
                        // Track if account was just activated
                        const wasInactive = !existingParent.isActive;
                        
                        // Activate parent account if it was inactive
                        if (wasInactive) {
                          await db
                            .update(users)
                            .set({ isActive: true })
                            .where(eq(users.id, existingParent.id));
                          
                          console.log('✅ Parent account ACTIVATED - ID:', existingParent.id);
                          console.log('👤 Parent Email:', existingSub.parentEmail);
                          console.log('🔓 Status changed: INACTIVE → ACTIVE');
                          console.log('🎉 Parent can now login and access the platform!');
                        } else {
                          console.log('ℹ️ Parent account already active - ID:', existingParent.id);
                        }
                        
                        // Ensure parent is linked to student
                        const student = await storage.getStudentByUserId(user.id);
                        if (student && student.studentId) {
                          try {
                            const existingChild = await storage.getChildByParentAndStudentUserId(existingParent.id, user.id);
                            if (!existingChild) {
                              const childName = `${user.firstName} ${user.lastName}`;
                              await storage.linkChildToExistingStudent(existingParent.id, student.studentId, childName);
                              console.log('✅ Parent linked to student - Student ID:', student.studentId);
                            } else {
                              console.log('ℹ️ Parent already linked to student');
                            }
                          } catch (error: any) {
                            console.log('⚠️ Could not link parent to student:', error.message);
                          }
                        }
                        
                        // Clear temporary password from metadata after activation (if not already cleared)
                        if (wasInactive && existingSub.metadata?.tempParentPassword) {
                          console.log('🗑️ Clearing temporary password from metadata after activation');
                          await storage.updateSubscription(existingSub.id, {
                            metadata: {
                              ...existingSub.metadata,
                              tempParentPassword: undefined, // Clear for security
                            }
                          });
                        }
                        
                        console.log('===============================================\n');
                      } else {
                        console.log('⚠️ Parent account not found - this should not happen!');
                        console.log('⚠️ Parent email:', existingSub.parentEmail);
                        console.log('⚠️ Account may not have been created during consent confirmation');
                        console.log('===============================================\n');
                      }
                    }
                    
                    // Send subscription confirmation email to student (with idempotency check)
                    // This runs for ALL student subscriptions (with or without parent consent)
                    if (existingSub.metadata?.subscriptionConfirmationSent !== true) {
                      console.log('\n📧 ========== SENDING STUDENT SUBSCRIPTION CONFIRMATION EMAIL ==========');
                      
                      // Import email service dynamically
                      const { emailService } = await import('./email-service');
                      
                      try {
                        // Determine billing cycle from Paystack plan interval
                        const planInterval = event.data.plan?.interval || 'monthly';
                        let billingCycle = 'Monthly';
                        if (planInterval === 'annually' || planInterval === 'yearly') {
                          billingCycle = 'Yearly';
                        } else if (planInterval === 'weekly') {
                          billingCycle = 'Weekly';
                        } else if (planInterval === 'daily') {
                          billingCycle = 'Daily';
                        }
                        
                        // Get plan name from subscription or default to Premium
                        const planName = existingSub.planName || 'Premium';
                        
                        // Send subscription confirmation email
                        const confirmationSent = await emailService.sendStudentSubscriptionConfirmation(
                          user.email,
                          user.firstName,
                          user.lastName,
                          planName,
                          billingCycle
                        );
                        
                        if (confirmationSent) {
                          // Mark as sent to prevent duplicates
                          await storage.updateSubscription(existingSub.id, {
                            metadata: {
                              ...existingSub.metadata,
                              subscriptionConfirmationSent: true,
                            }
                          });
                          console.log('✅ Subscription confirmation email sent to student');
                        } else {
                          console.error('⚠️ Subscription confirmation email failed to send');
                        }
                      } catch (error) {
                        console.error('❌ Error sending student subscription confirmation email:', error);
                      }
                      
                      console.log('============================================================\n');
                    } else {
                      console.log('ℹ️ Subscription confirmation email already sent - skipping duplicate send\n');
                    }
                  } else {
                    // No existing subscription - webhook arrived before verification endpoint
                    // Create subscription with all Paystack details
                    console.log('📝 Creating subscription from webhook (arrived before verification)');
                    
                    // Get default plan (we'll need to map the Paystack plan code to our internal plan)
                    const plans = await storage.getAllSubscriptionPlans();
                    const plan = plans[0]; // Use first plan (Premium)
                    
                    const now = new Date();
                    
                    // Calculate next payment date based on plan interval if not provided by Paystack
                    let nextPayment: Date;
                    if (event.data.next_payment_date) {
                      nextPayment = addPaymentBuffer(event.data.next_payment_date);
                    } else {
                      // Fallback: calculate from plan interval
                      const planInterval = event.data.plan?.interval || 'monthly';
                      const baseNextPayment = new Date(now.getTime());
                      
                      if (planInterval === 'hourly') {
                        baseNextPayment.setHours(baseNextPayment.getHours() + 1);
                      } else if (planInterval === 'daily') {
                        baseNextPayment.setDate(baseNextPayment.getDate() + 1);
                      } else if (planInterval === 'weekly') {
                        baseNextPayment.setDate(baseNextPayment.getDate() + 7);
                      } else if (planInterval === 'monthly') {
                        baseNextPayment.setMonth(baseNextPayment.getMonth() + 1);
                      } else if (planInterval === 'annually' || planInterval === 'yearly') {
                        baseNextPayment.setFullYear(baseNextPayment.getFullYear() + 1);
                      }
                      nextPayment = addPaymentBuffer(baseNextPayment);
                    }
                    
                    await storage.createSubscription({
                      userId: user.id,
                      planId: plan.id,
                      paystackSubscriptionCode: event.data.subscription_code,
                      paystackCustomerCode: event.data.customer?.customer_code,
                      paystackPlanCode: event.data.plan?.plan_code,
                      status: event.data.status || 'active',
                      amount: event.data.amount ? event.data.amount / 100 : plan.amount,
                      currency: event.data.plan?.currency || 'ZAR',
                      startDate: now,
                      currentPeriodStart: now,
                      currentPeriodEnd: nextPayment,
                      nextPaymentDate: nextPayment,
                      metadata: {
                        authorizationCode: event.data.authorization?.authorization_code,
                        cardLast4: event.data.authorization?.last4,
                        cardBrand: event.data.authorization?.brand,
                        cardBank: event.data.authorization?.bank,
                        emailToken: event.data.email_token
                      }
                    });
                    
                    console.log('✅ Subscription created from webhook');
                    console.log('✅ Subscription code:', event.data.subscription_code);
                    console.log('✅ Customer code:', event.data.customer?.customer_code);
                    console.log('✅ Authorization:', event.data.authorization?.authorization_code);
                    console.log('✅ Card:', event.data.authorization?.last4, event.data.authorization?.brand);
                  }
                } else {
                  console.log('⚠️ No user found for email:', event.data.customer.email);
                }
              } else {
                console.log('⚠️ Missing subscription_code or customer email');
              }
              console.log('================================================\n');
              break;
            
            case 'invoice.create':
              // Invoice created - 3 days before next payment
              console.log('📄 Invoice created - payment due in 3 days');
              break;
            
            case 'invoice.update':
              // Invoice updated after charge attempt
              console.log('📝 Invoice updated');
              
              if (event.data?.status === 'success' && event.data.subscription?.subscription_code) {
                const subscription = await storage.getSubscriptionByPaystackCode(
                  event.data.subscription.subscription_code
                );
                
                if (subscription) {
                  const now = new Date();
                  const basePeriodEnd = new Date(now.getTime());
                  basePeriodEnd.setMonth(basePeriodEnd.getMonth() + 1);
                  const periodEnd = addPaymentBuffer(basePeriodEnd);
                  
                  await storage.updateSubscription(subscription.id, {
                    status: 'active',
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    nextPaymentDate: periodEnd
                  });
                  console.log('✅ Subscription updated from invoice');
                }
              }
              break;
            
            case 'invoice.payment_failed':
              // Payment failed for invoice - mark as expired (payment issue)
              console.log('❌ Invoice payment failed');
              
              if (event.data?.subscription?.subscription_code) {
                const subscription = await storage.getSubscriptionByPaystackCode(
                  event.data.subscription.subscription_code
                );
                
                if (subscription) {
                  await storage.updateSubscription(subscription.id, {
                    status: 'expired' // Changed from 'failed' to 'expired' to match our status values
                  });
                  console.log('⚠️ Subscription marked as expired (payment failed)');
                }
              }
              break;
            
            case 'subscription.not_renew':
              // Subscription will not renew
              console.log('⏸️ Subscription set to not renew');
              
              if (event.data?.subscription_code) {
                const subscription = await storage.getSubscriptionByPaystackCode(
                  event.data.subscription_code
                );
                
                if (subscription) {
                  await storage.updateSubscription(subscription.id, {
                    status: 'cancelled'
                  });
                  console.log('✅ Subscription marked as cancelled (not renewing)');
                }
              }
              break;
            
            case 'subscription.disable':
              // Subscription disabled/cancelled
              console.log('🛑 Subscription disabled');
              
              if (event.data?.subscription_code) {
                const subscription = await storage.getSubscriptionByPaystackCode(
                  event.data.subscription_code
                );
                
                if (subscription) {
                  const finalStatus = event.data.status === 'complete' ? 'expired' : 'cancelled';
                  await storage.updateSubscription(subscription.id, {
                    status: finalStatus,
                    cancelledAt: new Date()
                  });
                  console.log(`✅ Subscription marked as ${finalStatus}`);
                }
              }
              break;
            
            case 'subscription.enable':
              // Subscription re-enabled
              console.log('✅ Subscription enabled');
              
              if (event.data?.subscription_code) {
                const subscription = await storage.getSubscriptionByPaystackCode(
                  event.data.subscription_code
                );
                
                if (subscription) {
                  await storage.updateSubscription(subscription.id, {
                    status: 'active'
                  });
                  console.log('✅ Subscription activated');
                }
              }
              break;
            
            default:
              console.log('ℹ️ Unhandled webhook event:', event.event);
          }
        } catch (asyncError) {
          console.error("Error processing webhook asynchronously:", asyncError);
        }
      });
    } catch (error) {
      console.error("Error handling webhook:", error);
      // Still return 200 to prevent retries even if there's an error
      if (!res.headersSent) {
        res.status(200).json({ received: true });
      }
    }
  });

  // Test endpoint for webhook simulation
  app.post('/api/subscription/webhook-test', async (req, res) => {
    try {
      const { userId, isRenewal } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      // Get user and subscription
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const subscription = await storage.getSubscriptionByUserId(userId);
      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found for this user' });
      }
      
      // Create a test charge.success payload
      const testEvent: any = {
        event: 'charge.success',
        data: {
          id: Math.floor(Math.random() * 1000000),
          domain: 'test',
          status: 'success',
          reference: `TEST_${Date.now()}`,
          amount: subscription.amount,
          message: null,
          gateway_response: 'Test Approved',
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          channel: 'card',
          currency: subscription.currency,
          customer: {
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName
          },
          authorization: {
            authorization_code: subscription.metadata?.authorizationCode || 'TEST_AUTH',
            last4: subscription.metadata?.cardLast4 || '1234',
            brand: subscription.metadata?.cardBrand || 'visa'
          }
        }
      };
      
      // Add subscription code for renewal or metadata for initial charge
      if (isRenewal && subscription.paystackSubscriptionCode) {
        testEvent.data.subscription = {
          subscription_code: subscription.paystackSubscriptionCode
        };
        testEvent.data.plan = {}; // Empty plan for renewal
      } else {
        testEvent.data.metadata = {
          userId: userId,
          planId: subscription.planId
        };
        testEvent.data.plan = {
          id: subscription.planId,
          name: 'Premium Plan'
        };
      }
      
      // Process the webhook logic
      let result = { success: false, message: '' };
      
      if (testEvent.data?.subscription?.subscription_code) {
        const sub = await storage.getSubscriptionByPaystackCode(
          testEvent.data.subscription.subscription_code
        );
        
        if (sub) {
          const now = new Date();
          const periodEnd = new Date(now.getTime());
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          
          await storage.updateSubscription(sub.id, {
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextPaymentDate: periodEnd
          });
          
          result = { success: true, message: 'Subscription extended (renewal)' };
        }
      } else if (testEvent.data?.metadata?.userId) {
        const sub = await storage.getSubscriptionByUserId(testEvent.data.metadata.userId);
        
        if (sub) {
          const now = new Date();
          const periodEnd = new Date(now.getTime());
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          
          await storage.updateSubscription(sub.id, {
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            nextPaymentDate: periodEnd
          });
          
          result = { success: true, message: 'Subscription extended (metadata)' };
        }
      }
      
      // Get updated subscription
      const updatedSub = await storage.getSubscriptionByUserId(userId);
      
      res.json({
        ...result,
        subscription: {
          status: updatedSub?.status,
          currentPeriodStart: updatedSub?.currentPeriodStart,
          currentPeriodEnd: updatedSub?.currentPeriodEnd,
          nextPaymentDate: updatedSub?.nextPaymentDate
        },
        testPayload: testEvent
      });
    } catch (error) {
      console.error('Webhook test error:', error);
      res.status(500).json({ error: 'Failed to process test webhook' });
    }
  });

  // ==========================================
  // OPENAI REALTIME API - Voice Tutor
  // ==========================================
  
  // Create a Realtime session for WebRTC connection
  app.post('/api/realtime/session', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      const { sdp } = req.body;
      
      if (!sdp) {
        return res.status(400).json({ error: 'SDP offer is required' });
      }

      // Get student context if available
      const userId = req.user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      const gradeLevel = user?.grade ? `Grade ${user.grade}` : 'Grade 10';

      // Session configuration for educational tutoring with image/vision support
      // Using gpt-realtime model which supports image input (not gpt-4o-realtime-preview)
      const sessionConfig = {
        model: "gpt-realtime",
        modalities: ["text", "audio"],
        voice: "alloy",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        instructions: `You are a friendly and patient maths tutor for XtraClass.ai, helping South African students in ${gradeLevel}. 

CRITICAL IMAGE HANDLING:
- When you receive an image input, you MUST first describe EXACTLY what you see in the image
- If you see a maths problem, read it aloud character by character
- If you see text, diagrams, equations, or any visual content, describe it in detail
- Do NOT make up or hallucinate content that is not in the image
- If the image appears blank, corrupted, or you truly cannot see anything, say clearly: "I'm having trouble seeing the image. It appears blank or unclear. Could you please try sending it again?"

TUTORING APPROACH:
1. FIRST describe what you see in the image (be specific about text, numbers, diagrams)
2. Read any problem aloud clearly
3. Break down the solution into clear, simple steps
4. Explain the mathematical concepts involved
5. Encourage the student and check if they understand

Use encouraging language like "Great question!", "Let's work through this together", "You're doing well!"

Always explain in simple terms suitable for a high school student. Use South African curriculum terminology where appropriate (e.g., "maths" not "math").`
      };

      // Use the sessions endpoint to get an ephemeral key first
      const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(sessionConfig)
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('OpenAI Realtime session error:', errorText);
        return res.status(sessionResponse.status).json({ error: 'Failed to create session' });
      }

      const sessionData = await sessionResponse.json();
      const ephemeralKey = sessionData.client_secret?.value;

      if (!ephemeralKey) {
        console.error('No ephemeral key in response:', sessionData);
        return res.status(500).json({ error: 'Failed to get ephemeral key' });
      }

      // Now create the WebRTC connection with the ephemeral key
      const response = await fetch("https://api.openai.com/v1/realtime?model=gpt-realtime", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
        body: sdp
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Realtime API error:', errorText);
        return res.status(response.status).json({ error: 'Failed to create Realtime session' });
      }

      // Return the SDP answer
      const sdpAnswer = await response.text();
      res.type('application/sdp').send(sdpAnswer);
    } catch (error) {
      console.error('Realtime session error:', error);
      res.status(500).json({ error: 'Failed to create Realtime session' });
    }
  });

  // Alternative: Create ephemeral token for client-side WebRTC
  app.get('/api/realtime/token', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      // Get student context if available
      const userId = req.user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      const gradeLevel = user?.grade ? `Grade ${user.grade}` : 'Grade 10';

      const sessionConfig = {
        session: {
          type: "realtime",
          model: "gpt-realtime",
          output_modalities: ["text", "audio"],
          instructions: `You are a friendly and patient maths tutor for XtraClass.ai, helping South African students in ${gradeLevel}. 

CRITICAL IMAGE HANDLING:
- When you receive an image input, you MUST first describe EXACTLY what you see in the image
- If you see a maths problem, read it aloud character by character
- If you see text, diagrams, equations, or any visual content, describe it in detail
- Do NOT make up or hallucinate content that is not in the image
- If the image appears blank, corrupted, or you truly cannot see anything, say clearly: "I'm having trouble seeing the image. It appears blank or unclear. Could you please try sending it again?"

TUTORING APPROACH:
1. FIRST describe what you see in the image (be specific about text, numbers, diagrams)
2. Read any problem aloud clearly
3. Break down the solution into clear, simple steps
4. Explain the mathematical concepts involved
5. Encourage the student and check if they understand

Use encouraging language like "Great question!", "Let's work through this together", "You're doing well!"

Always explain in simple terms suitable for a high school student. Use South African curriculum terminology where appropriate (e.g., "maths" not "math").`,
          audio: {
            output: { voice: "alloy" }
          },
          input_audio_transcription: {
            model: "whisper-1"
          }
        }
      };

      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionConfig),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI token generation error:', errorText);
        return res.status(response.status).json({ error: 'Failed to generate session token' });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Token generation error:', error);
      res.status(500).json({ error: 'Failed to generate token' });
    }
  });

  // Voice transcription using OpenAI Whisper
  app.post('/api/transcribe-audio', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      const { audio, mimeType } = req.body;
      if (!audio) {
        return res.status(400).json({ error: 'No audio data provided' });
      }

      const audioBuffer = Buffer.from(audio, 'base64');
      console.log('🎤 Transcribing audio:', audioBuffer.length, 'bytes, mimeType:', mimeType);
      
      // Determine correct file extension based on mimeType
      let fileExtension = 'webm';
      let actualMimeType = mimeType || 'audio/webm';
      
      if (mimeType?.includes('mp4') || mimeType?.includes('m4a')) {
        fileExtension = 'mp4';
        actualMimeType = 'audio/mp4';
      } else if (mimeType?.includes('ogg')) {
        fileExtension = 'ogg';
        actualMimeType = 'audio/ogg';
      } else if (mimeType?.includes('wav')) {
        fileExtension = 'wav';
        actualMimeType = 'audio/wav';
      } else if (mimeType?.includes('webm')) {
        fileExtension = 'webm';
        actualMimeType = 'audio/webm';
      }
      
      const blob = new Blob([audioBuffer], { type: actualMimeType });
      const file = new File([blob], `audio.${fileExtension}`, { type: actualMimeType });

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en',
        prompt: 'This is a student asking a question about mathematics, algebra, geometry, or educational content. Common terms: equation, solve, calculate, explain, help, understand, homework, exercise, problem.',
      });

      console.log('✅ Audio transcribed:', transcription.text?.substring(0, 100) + (transcription.text?.length > 100 ? '...' : ''));
      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
    }
  });

  // Manual subscription sync endpoint for testing
  app.post('/api/subscription/sync-statuses', authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Only allow admins to trigger manual sync
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('🔄 Manual subscription sync triggered by admin:', req.user.email);
      
      const { syncSubscriptionStatuses } = await import('./subscription-sync');
      const result = await syncSubscriptionStatuses();
      
      res.json({
        message: 'Subscription sync completed',
        result: {
          checked: result.checked,
          updated: result.updated,
          errors: result.errors,
          changes: result.details
        }
      });
    } catch (error) {
      console.error('Manual sync error:', error);
      res.status(500).json({ error: 'Failed to sync subscriptions' });
    }
  });

  // ============================================
  // REFERRAL CODE SYSTEM
  // ============================================

  // Get or generate referral code for current user
  app.get('/api/user/referral-code', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // If user already has a referral code, return it
      if (user.referralCode) {
        return res.json({ 
          referralCode: user.referralCode,
          referralLink: `${getBaseUrl()}/register?ref=${user.referralCode}`
        });
      }

      // Generate a new referral code
      const firstName = user.firstName.toLowerCase().replace(/[^a-z]/g, '');
      const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
      const referralCode = `${firstName.substring(0, 4).toUpperCase()}${randomPart}`;

      // Save the referral code
      await db.update(users).set({ referralCode }).where(eq(users.id, userId));

      res.json({ 
        referralCode,
        referralLink: `${getBaseUrl()}/register?ref=${referralCode}`
      });
    } catch (error) {
      console.error('Error getting referral code:', error);
      res.status(500).json({ error: 'Failed to get referral code' });
    }
  });

  // Validate a referral code
  app.get('/api/referral/:code', async (req, res) => {
    try {
      const { code } = req.params;
      
      const [referrer] = await db.select({
        id: users.id,
        firstName: users.firstName
      }).from(users).where(eq(users.referralCode, code));

      if (!referrer) {
        return res.status(404).json({ valid: false, error: 'Invalid referral code' });
      }

      res.json({ 
        valid: true, 
        referrerName: referrer.firstName,
        referrerId: referrer.id
      });
    } catch (error) {
      console.error('Error validating referral code:', error);
      res.status(500).json({ error: 'Failed to validate referral code' });
    }
  });

  // Get referral statistics for current user
  app.get('/api/user/referral-stats', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Count how many users were referred by this user
      const referrals = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt
      }).from(users).where(eq(users.referredBy, userId));

      res.json({
        totalReferrals: referrals.length,
        referrals: referrals.map(r => ({
          name: `${r.firstName} ${r.lastName.charAt(0)}.`,
          joinedAt: r.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting referral stats:', error);
      res.status(500).json({ error: 'Failed to get referral stats' });
    }
  });

  // Admin endpoint to backfill referral codes for existing users
  app.post('/api/admin/backfill-referral-codes', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user is admin
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Find all users without referral codes
      const usersWithoutCodes = await db.select({
        id: users.id,
        firstName: users.firstName
      }).from(users).where(isNull(users.referralCode));

      let updated = 0;
      for (const u of usersWithoutCodes) {
        const firstName = (u.firstName || 'user').toLowerCase().replace(/[^a-z]/g, '');
        const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
        const referralCode = `${firstName.substring(0, 4).toUpperCase() || 'USER'}${randomPart}`;
        
        await db.update(users).set({ referralCode }).where(eq(users.id, u.id));
        updated++;
      }

      res.json({ 
        success: true, 
        message: `Generated referral codes for ${updated} users`,
        updatedCount: updated
      });
    } catch (error) {
      console.error('Error backfilling referral codes:', error);
      res.status(500).json({ error: 'Failed to backfill referral codes' });
    }
  });

  // ============ TUTORING SESSIONS API ============
  
  // Get tutoring sessions for current user (student or tutor)
  app.get('/api/tutoring-sessions', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let sessions: any[] = [];
      
      if (user.role === 'student') {
        const student = await storage.getStudentByUserId(userId);
        if (student) {
          sessions = await storage.getTutoringSessionsByStudent(userId);
        }
      } else if (user.role === 'tutor') {
        sessions = await storage.getTutoringSessionsByTutor(userId);
      } else if (user.role === 'admin') {
        // Admins can see all pending sessions
        sessions = await storage.getPendingTutoringSessions();
      }

      // Enrich sessions with user info
      const enrichedSessions = await Promise.all(sessions.map(async (session: any) => {
        const student = await storage.getUser(session.studentId);
        const tutor = session.tutorId ? await storage.getUser(session.tutorId) : null;
        return {
          ...session,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : null
        };
      }));

      res.json(enrichedSessions);
    } catch (error) {
      console.error('Error fetching tutoring sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // Get pending tutoring sessions (for tutors)
  app.get('/api/tutoring-sessions/pending', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'tutor' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Only tutors can view pending sessions' });
      }

      const sessions = await storage.getPendingTutoringSessions();
      
      // Enrich with student info
      const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        const student = await storage.getUser(session.studentId);
        return {
          ...session,
          studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          studentGrade: student?.grade
        };
      }));

      res.json(enrichedSessions);
    } catch (error) {
      console.error('Error fetching pending sessions:', error);
      res.status(500).json({ error: 'Failed to fetch pending sessions' });
    }
  });

  // Get single tutoring session
  app.get('/api/tutoring-sessions/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getTutoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only allow student, tutor, or admin to view
      const user = await storage.getUser(userId);
      if (session.studentId !== userId && session.tutorId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to view this session' });
      }

      const student = await storage.getUser(session.studentId);
      const tutor = session.tutorId ? await storage.getUser(session.tutorId) : null;

      res.json({
        ...session,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : null
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  // Create new tutoring session request (student only - Premium feature)
  app.post('/api/tutoring-sessions', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can request tutoring sessions' });
      }

      // Check Premium subscription with tutorVideoCall feature
      const subscription = await storage.getSubscriptionByUserId(userId);
      if (!subscription || subscription.status !== 'active') {
        return res.status(403).json({ error: 'Premium subscription required for tutor video calls' });
      }

      const plan = await storage.getSubscriptionPlanById(subscription.planId);
      const features = plan?.features as any;
      if (!features?.tutorVideoCall) {
        return res.status(403).json({ error: 'Your subscription plan does not include tutor video calls' });
      }

      const { subject, topic, notes, scheduledStart, scheduledEnd } = req.body;

      if (!subject || !scheduledStart || !scheduledEnd) {
        return res.status(400).json({ error: 'Subject and scheduled times are required' });
      }

      // Generate unique room ID
      const roomId = `tutor-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      const session = await storage.createTutoringSession({
        studentId: userId,
        subject,
        topic: topic || null,
        notes: notes || null,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        roomId,
        status: 'requested'
      });

      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating tutoring session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // Accept tutoring session (tutor only)
  app.post('/api/tutoring-sessions/:id/accept', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'tutor' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Only tutors can accept sessions' });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getTutoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.status !== 'requested') {
        return res.status(400).json({ error: 'Session is not pending' });
      }

      const updated = await storage.updateTutoringSession(sessionId, {
        tutorId: userId,
        status: 'accepted'
      });

      res.json(updated);
    } catch (error) {
      console.error('Error accepting session:', error);
      res.status(500).json({ error: 'Failed to accept session' });
    }
  });

  // Decline tutoring session (tutor only)
  app.post('/api/tutoring-sessions/:id/decline', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'tutor' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Only tutors can decline sessions' });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getTutoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const updated = await storage.updateTutoringSession(sessionId, {
        status: 'declined'
      });

      res.json(updated);
    } catch (error) {
      console.error('Error declining session:', error);
      res.status(500).json({ error: 'Failed to decline session' });
    }
  });

  // Cancel tutoring session (student or tutor)
  app.post('/api/tutoring-sessions/:id/cancel', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getTutoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only student or assigned tutor can cancel
      if (session.studentId !== userId && session.tutorId !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this session' });
      }

      const updated = await storage.updateTutoringSession(sessionId, {
        status: 'cancelled'
      });

      res.json(updated);
    } catch (error) {
      console.error('Error cancelling session:', error);
      res.status(500).json({ error: 'Failed to cancel session' });
    }
  });

  // Join tutoring session (record join time)
  app.post('/api/tutoring-sessions/:id/join', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getTutoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only student or tutor can join
      if (session.studentId !== userId && session.tutorId !== userId) {
        return res.status(403).json({ error: 'Not authorized to join this session' });
      }

      // Check if session is accepted
      if (session.status !== 'accepted' && session.status !== 'in_progress') {
        return res.status(400).json({ error: 'Session must be accepted before joining' });
      }

      const updates: any = {};
      const user = await storage.getUser(userId);

      if (user?.role === 'student') {
        updates.studentJoinedAt = new Date();
      } else if (user?.role === 'tutor') {
        updates.tutorJoinedAt = new Date();
      }

      // Start the call if not already started
      if (!session.callStartedAt) {
        updates.callStartedAt = new Date();
        updates.status = 'in_progress';
      }

      const updated = await storage.updateTutoringSession(sessionId, updates);

      res.json({
        ...updated,
        roomId: session.roomId
      });
    } catch (error) {
      console.error('Error joining session:', error);
      res.status(500).json({ error: 'Failed to join session' });
    }
  });

  // Complete tutoring session
  app.post('/api/tutoring-sessions/:id/complete', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getTutoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only tutor or admin can complete
      const user = await storage.getUser(userId);
      if (session.tutorId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only the tutor can complete this session' });
      }

      const callEndedAt = new Date();
      const callDuration = session.callStartedAt 
        ? Math.round((callEndedAt.getTime() - new Date(session.callStartedAt).getTime()) / 60000)
        : 0;

      const updated = await storage.updateTutoringSession(sessionId, {
        status: 'completed',
        callEndedAt,
        callDuration,
        tutorNotes: req.body.tutorNotes || null
      });

      res.json(updated);
    } catch (error) {
      console.error('Error completing session:', error);
      res.status(500).json({ error: 'Failed to complete session' });
    }
  });

  // Rate tutoring session (student only)
  app.post('/api/tutoring-sessions/:id/rate', authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getTutoringSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Only the student can rate
      if (session.studentId !== userId) {
        return res.status(403).json({ error: 'Only the student can rate this session' });
      }

      const { rating, feedback } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const updated = await storage.updateTutoringSession(sessionId, {
        rating,
        feedback: feedback || null
      });

      res.json(updated);
    } catch (error) {
      console.error('Error rating session:', error);
      res.status(500).json({ error: 'Failed to rate session' });
    }
  });

  // Get available tutors
  app.get('/api/tutors', authenticateToken, async (req, res) => {
    try {
      // Get all users with tutor role
      const tutorUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.role, 'tutor'));

      res.json(tutorUsers);
    } catch (error) {
      console.error('Error fetching tutors:', error);
      res.status(500).json({ error: 'Failed to fetch tutors' });
    }
  });

  // ==================== MATH IMAGE GENERATION ====================
  
  // Schema for math image generation request
  const mathImageRequestSchema = z.object({
    type: z.enum([
      'linear', 'quadratic', 'polynomial', 'trig', 'exponential', 'logarithm', 'hyperbola',
      'triangle', 'circle', 'rectangle', 'polygon', 'angle',
      'numberLine', 'coordinatePlane',
      'pie', 'bar', 'venn', 'fraction', 'transformation',
      'cyclicQuadrilateral', 'tangentSecant', 'bearing', 'vector',
      'similarityCongruence', 'circleTheorem', 'proofDiagram', 'parallelLines'
    ]),
    params: z.record(z.any()).optional().default({})
  });

  // Generate math image using Python matplotlib
  app.post('/api/math-image/generate', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Validate request
      const parseResult = mathImageRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request', 
          details: parseResult.error.errors 
        });
      }

      const { type, params } = parseResult.data;

      // Parse string inputs into proper formats
      const processedParams = { ...params };
      
      // Parse pointsStr for coordinate plane: "A:2,3 B:-1,2" -> [{"label":"A","x":2,"y":3},...]
      if (processedParams.pointsStr && typeof processedParams.pointsStr === 'string') {
        const points: { label: string; x: number; y: number }[] = [];
        const pointParts = processedParams.pointsStr.trim().split(/\s+/);
        for (const part of pointParts) {
          const match = part.match(/^([A-Za-z0-9]+):(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
          if (match) {
            points.push({ label: match[1], x: parseFloat(match[2]), y: parseFloat(match[3]) });
          }
        }
        if (points.length > 0) {
          processedParams.points = points;
        }
        delete processedParams.pointsStr;
      }
      
      // Parse valuesStr for pie/bar charts: "30,20,50" -> [30, 20, 50]
      if (processedParams.valuesStr && typeof processedParams.valuesStr === 'string') {
        processedParams.values = processedParams.valuesStr.split(',').map((v: string) => parseFloat(v.trim())).filter((v: number) => !isNaN(v));
        delete processedParams.valuesStr;
      }
      
      // Parse labelsStr for pie/bar/triangle: "A,B,C" -> ["A", "B", "C"]
      if (processedParams.labelsStr && typeof processedParams.labelsStr === 'string') {
        processedParams.labels = processedParams.labelsStr.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        delete processedParams.labelsStr;
      }
      
      // Parse verticesStr for triangle: "0,0 4,0 2,3" -> [[0,0], [4,0], [2,3]]
      if (processedParams.verticesStr && typeof processedParams.verticesStr === 'string') {
        const points: number[][] = [];
        const vertexParts = processedParams.verticesStr.trim().split(/\s+/);
        for (const part of vertexParts) {
          const coords = part.split(',').map((c: string) => parseFloat(c.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            points.push(coords);
          }
        }
        if (points.length >= 3) {
          processedParams.points = points;
        }
        delete processedParams.verticesStr;
      }

      // Run Python script
      const pythonScript = path.join(process.cwd(), 'server', 'python', 'math_image_generator.py');
      
      const result = await new Promise<{ success: boolean; imageUrl?: string; error?: string }>((resolve, reject) => {
        const python = spawn('python3', [pythonScript]);
        let stdout = '';
        let stderr = '';

        python.stdin.write(JSON.stringify({ type, params: processedParams }));
        python.stdin.end();

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', (code) => {
          if (code !== 0) {
            console.error('Python script error:', stderr);
            resolve({ success: false, error: stderr || 'Script execution failed' });
          } else {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch (e) {
              resolve({ success: false, error: 'Failed to parse script output' });
            }
          }
        });

        python.on('error', (err) => {
          reject(err);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          python.kill();
          resolve({ success: false, error: 'Script timed out' });
        }, 30000);
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || 'Image generation failed' });
      }

      res.json({
        success: true,
        imageUrl: result.imageUrl,
        type
      });
    } catch (error) {
      console.error('Error generating math image:', error);
      res.status(500).json({ error: 'Failed to generate math image' });
    }
  });

  // Vision-based question generation from multiple reference images
  // Using gpt-4o for vision capability - it supports image analysis with JSON mode
  // Multiple images are analyzed together to produce ONE question
  const referenceImageUpload = multer({ storage: multer.memoryStorage() });
  app.post('/api/exercises/generate-from-reference', authenticateToken, referenceImageUpload.array('referenceImages', 10), async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check if user has admin or teacher role
      const user = await storage.getUser(userId);
      if (!user || !['admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ error: 'Only admins and teachers can use this feature' });
      }

      const { topicId, themeId, grade, topicName, themeName, imageGenerator } = req.body;
      const referenceImages = req.files as Express.Multer.File[];
      const useWolfram = imageGenerator === 'wolfram';

      if (!referenceImages || referenceImages.length === 0) {
        return res.status(400).json({ error: 'At least one reference image is required' });
      }

      // Convert all images to base64 for Vision API
      const imageContents = referenceImages.map(img => {
        const imageBase64 = img.buffer.toString('base64');
        const mimeType = img.mimetype || 'image/jpeg';
        console.log(`Reference image size: ${(img.buffer.length / 1024 / 1024).toFixed(2)}MB`);
        return {
          type: 'image_url' as const,
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
            detail: 'low' as const
          }
        };
      });
      
      console.log(`Processing ${referenceImages.length} reference image(s) together`);

      // Math image generator documentation for the LLM
      const mathImageDocs = `
# Math Image Generator Documentation

The Math Image Generator creates mathematical diagrams using Python/matplotlib. 
Analyze the reference image and identify the most appropriate image type and parameters.

## Available Image Types and Parameters

### GRAPHS
- **linear**: Linear graph y = mx + c. Params: m (gradient), c (y-intercept), xMin, xMax, showGrid, color
- **quadratic**: Quadratic graph y = ax² + bx + c. Params: a, b, c, xMin, xMax, showGrid, color
- **trig**: Trigonometric (sin/cos/tan). Params: function ("sin"/"cos"/"tan"), amplitude, period, phase, verticalShift
- **exponential**: Exponential y = a × b^x + c. Params: a, base, c, xMin, xMax
- **logarithm**: Log y = a × log_b(x) + c. Params: a, base, c, xMin, xMax
- **hyperbola**: Hyperbola y = a/x + c. Params: a, c, xMin, xMax

### 2D GEOMETRY
- **triangle**: Triangle. Params: points (array of [x,y]), labels (array like ["A","B","C"]), showAngles, showSides, fill, fillColor
- **circle**: Circle. Params: center ([x,y]), radius, showCenter, showRadius, showDiameter, fill
- **rectangle**: Rectangle. Params: origin ([x,y]), width, height, labels, showDimensions, fill
- **angle**: Angle with arc. Params: vertex ([x,y]), angle1 (degrees), angle2 (degrees), rayLength, showArc, showMeasurement
- **parallelLines**: Parallel lines with transversal. Params: spacing, transversalAngle, showAngles, showLabels

### 3D SHAPES
- **cylinder**: Cylinder. Params: radius, height, showLabels
- **cube**: Cube/prism. Params: length, width, height, showLabels
- **cone**: Cone. Params: radius, height, showLabels
- **pyramid**: Square pyramid. Params: baseSize, height, showLabels
- **sphere**: Sphere. Params: radius, showLabels

### NUMBER & COORDINATE
- **numberLine**: Number line. Params: start, end, markedPoints (array), showIntegers
- **coordinatePlane**: Coordinate plane. Params: points (array of {x,y,label,color}), xRange, yRange, connectPoints

### SPECIAL
- **pie**: Pie chart. Params: values (array), labels (array), showPercentages
- **bar**: Bar chart. Params: values (array), labels (array), title, xLabel, yLabel
- **venn**: Venn diagram. Params: sets (2 or 3), labels
- **fraction**: Fraction visual. Params: numerator, denominator, shape ("circle"/"rectangle")
- **transformation**: Geometric transformation. Params: originalPoints, transformation ("translate"/"rotate"/"reflect"/"scale"), transformParams

### ADVANCED GEOMETRY
- **cyclicQuadrilateral**: Cyclic quadrilateral. Params: radius, showAngles, showDiagonals
- **tangentSecant**: Tangent and secant. Params: radius, tangentPoint, secantAngles
- **bearing**: Bearings diagram. Params: bearing (0-360), distance, showCompass
- **vector**: Vectors. Params: vectors (array of {start,end,label,color}), showComponents, showResultant
- **circleTheorem**: Circle theorems. Params: theorem (e.g. "central_inscribed", "tangent_radius"), radius, showLabels
- **proofDiagram**: Proof diagrams. Params: proofType ("pythagoras"/"midpoint"/"isosceles"/"exterior_angle")

## Response Format
Return ONLY valid JSON with no additional text:
{
  "question": "The question text for the student",
  "answer": "The correct answer",
  "marks": number (1-10),
  "imageType": "one of the type names above",
  "imageParams": { parameters matching the selected type }
}
`;

      // Call OpenAI Vision API
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = `You are a mathematics education expert creating questions for South African students.
Given ${referenceImages.length > 1 ? 'multiple reference images' : 'a reference image'} of mathematical diagrams, you must:
1. Analyze ${referenceImages.length > 1 ? 'ALL the images together' : 'the image'} to identify what type of mathematical concept they show
2. Create ONE appropriate question based on the style and concepts shown in the images
3. Determine the correct image type and parameters to generate a similar diagram
4. Provide the correct answer

The question should be appropriate for ${grade || 'Grade 10'} students.
Topic: ${topicName || 'Mathematics'}
Theme: ${themeName || 'General'}

${mathImageDocs}

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, just the JSON object.`;

      console.log('Calling OpenAI Vision API for reference image analysis...');
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze ${referenceImages.length > 1 ? 'these reference images together' : 'this reference image'} and create ONE math question with the correct parameters to generate a similar diagram. The question should test understanding of concepts related to the ${themeName || 'given'} theme within ${topicName || 'the topic'}.`
              },
              ...imageContents
            ]
          }
        ],
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      });

      console.log('OpenAI Vision API response received');
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('No content in OpenAI response:', JSON.stringify(response.choices[0]));
        return res.status(500).json({ error: 'No response from AI' });
      }

      // Parse the JSON response
      let generatedData;
      try {
        generatedData = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        return res.status(500).json({ error: 'Invalid AI response format' });
      }

      // Validate required fields
      if (!generatedData.question || !generatedData.imageType) {
        return res.status(500).json({ error: 'AI response missing required fields' });
      }

      let imageResult: { success: boolean; imageUrl?: string; error?: string };

      if (useWolfram) {
        // Generate image using WolframAlpha API
        const wolframAppId = process.env.WOLFRAM_ALPHA_APPID;
        if (!wolframAppId) {
          imageResult = { success: false, error: 'WolframAlpha API not configured' };
        } else {
          try {
            const query = convertToWolframQuery(generatedData.imageType, generatedData.imageParams || {});
            if (!query) {
              imageResult = { success: false, error: 'Could not convert to WolframAlpha query' };
            } else {
              console.log(`🔮 WolframAlpha query for AI reference: ${query}`);
              console.log(`🔮 Image type: ${generatedData.imageType}, params:`, JSON.stringify(generatedData.imageParams));
              
              // Use Simple API for direct image
              const simpleUrl = `https://api.wolframalpha.com/v1/simple?appid=${wolframAppId}&i=${encodeURIComponent(query)}&width=500&background=white`;
              
              const wolframResponse = await fetch(simpleUrl);
              console.log(`🔮 WolframAlpha response status: ${wolframResponse.status}`);
              if (!wolframResponse.ok) {
                console.error(`🔮 WolframAlpha API error: ${wolframResponse.status} ${wolframResponse.statusText}`);
                console.log(`🔄 Falling back to Python/matplotlib for image generation`);
                // Fallback to Python if WolframAlpha fails
                imageResult = await generateWithPython(generatedData.imageType, generatedData.imageParams || {});
              } else {
                const imageBuffer = Buffer.from(await wolframResponse.arrayBuffer());
                const timestamp = Date.now();
                const filename = `wolfram_ai_${timestamp}.gif`;
                const uploadDir = path.join(process.cwd(), 'uploads', 'generated-graphs');
                
                if (!existsSync(uploadDir)) {
                  mkdirSync(uploadDir, { recursive: true });
                }
                
                const filepath = path.join(uploadDir, filename);
                writeFileSync(filepath, imageBuffer);
                
                imageResult = { success: true, imageUrl: `/uploads/generated-graphs/${filename}` };
              }
            }
          } catch (wolframError) {
            console.error('WolframAlpha error:', wolframError);
            console.log(`🔄 Falling back to Python/matplotlib for image generation`);
            // Fallback to Python if WolframAlpha fails
            imageResult = await generateWithPython(generatedData.imageType, generatedData.imageParams || {});
          }
        }
      }
      
      // Helper function to generate with Python/matplotlib
      async function generateWithPython(imageType: string, imageParams: Record<string, any>): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
        const pythonScript = path.join(process.cwd(), 'server', 'python', 'math_image_generator.py');
        
        return new Promise<{ success: boolean; imageUrl?: string; error?: string }>((resolve, reject) => {
          const python = spawn('python3', [pythonScript]);
          let stdout = '';
          let stderr = '';

          python.stdin.write(JSON.stringify({ 
            type: imageType, 
            params: imageParams 
          }));
          python.stdin.end();

          python.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          python.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          python.on('close', (code) => {
            if (code !== 0) {
              console.error('Python script error:', stderr);
              resolve({ success: false, error: stderr || 'Script execution failed' });
            } else {
              try {
                const result = JSON.parse(stdout);
                resolve(result);
              } catch (e) {
                resolve({ success: false, error: 'Failed to parse script output' });
              }
            }
          });

          python.on('error', (err) => {
            reject(err);
          });

          setTimeout(() => {
            python.kill();
            resolve({ success: false, error: 'Script timed out' });
          }, 30000);
        });
      }

      if (!useWolfram) {
        // Generate the math image using Python/matplotlib
        imageResult = await generateWithPython(generatedData.imageType, generatedData.imageParams || {});
      }

      res.json({
        success: true,
        question: generatedData.question,
        answer: generatedData.answer || '',
        marks: generatedData.marks || 5,
        imageType: generatedData.imageType,
        imageParams: generatedData.imageParams || {},
        generatedImageUrl: imageResult.success ? imageResult.imageUrl : null,
        imageGenerationError: imageResult.success ? null : imageResult.error
      });

    } catch (error) {
      console.error('Error generating question from reference:', error);
      res.status(500).json({ error: 'Failed to generate question from reference image' });
    }
  });

  // Helper function to fetch YouTube transcript (reusable)
  async function fetchYouTubeTranscript(videoUrl: string, languages?: string): Promise<{ success: boolean; full_text?: string; error?: string; video_id?: string }> {
    const pythonScript = path.join(process.cwd(), 'server', 'python', 'youtube_transcript.py');
    const args = [pythonScript, videoUrl];
    
    if (languages) {
      args.push(languages);
    }
    
    return new Promise((resolve) => {
      const python = spawn('python3', args);
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          console.error('YouTube transcript script error:', stderr);
          resolve({ success: false, error: stderr || 'Failed to fetch transcript' });
        } else {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse transcript response' });
          }
        }
      });
      
      python.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        python.kill();
        resolve({ success: false, error: 'Transcript fetch timed out' });
      }, 30000);
    });
  }

  // Fetch and store YouTube transcript for a lesson (run in dev, stored for prod)
  // Only teachers and admins can fetch transcripts
  app.post('/api/syllabus-calendar/:id/fetch-transcript', authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Role-based authorization
      if (!['teacher', 'admin'].includes(req.user?.role || '')) {
        return res.status(403).json({ success: false, error: 'Only teachers and admins can fetch transcripts' });
      }
      
      const lessonId = parseInt(req.params.id);
      
      // Get the lesson
      const lessons = await db.select().from(syllabusCalendar).where(eq(syllabusCalendar.id, lessonId));
      const lesson = lessons[0];
      
      if (!lesson) {
        return res.status(404).json({ success: false, error: 'Lesson not found' });
      }
      
      if (!lesson.videoLink) {
        return res.status(400).json({ success: false, error: 'Lesson has no video link' });
      }
      
      console.log(`📺 Fetching transcript for lesson ${lessonId}: ${lesson.lessonTitle}`);
      
      const transcriptResult = await fetchYouTubeTranscript(lesson.videoLink);
      
      if (!transcriptResult.success) {
        console.log(`📺 Failed to fetch transcript: ${transcriptResult.error}`);
        return res.status(400).json({ 
          success: false, 
          error: transcriptResult.error,
          message: 'Could not fetch transcript. In production, this is expected due to IP blocking.'
        });
      }
      
      // Store the transcript in the lesson
      await db.update(syllabusCalendar)
        .set({ 
          videoTranscript: transcriptResult.full_text,
          updatedAt: new Date()
        })
        .where(eq(syllabusCalendar.id, lessonId));
      
      console.log(`📺 Stored transcript for lesson ${lessonId} (${transcriptResult.full_text?.length} chars)`);
      
      res.json({ 
        success: true, 
        message: 'Transcript fetched and stored successfully',
        transcriptLength: transcriptResult.full_text?.length || 0
      });
    } catch (error) {
      console.error('Error fetching/storing transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch and store transcript' });
    }
  });

  // Bulk fetch transcripts for all lessons with videos in a date range
  // Bulk fetch transcripts - only for teachers and admins
  app.post('/api/syllabus-calendar/fetch-transcripts', authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Role-based authorization
      if (!['teacher', 'admin'].includes(req.user?.role || '')) {
        return res.status(403).json({ success: false, error: 'Only teachers and admins can fetch transcripts' });
      }
      
      const { grade, subject, startDate, endDate } = req.body;
      
      if (!grade || !subject) {
        return res.status(400).json({ success: false, error: 'Grade and subject are required' });
      }
      
      // Get lessons with video links but no transcripts
      let query = db.select().from(syllabusCalendar)
        .where(and(
          eq(syllabusCalendar.grade, grade),
          eq(syllabusCalendar.subject, subject),
          isNotNull(syllabusCalendar.videoLink),
          isNull(syllabusCalendar.videoTranscript)
        ));
      
      const lessons = await query;
      
      console.log(`📺 Found ${lessons.length} lessons needing transcripts for ${grade} ${subject}`);
      
      const results = {
        total: lessons.length,
        success: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (const lesson of lessons) {
        if (!lesson.videoLink) continue;
        
        console.log(`📺 Fetching transcript for: ${lesson.lessonTitle}`);
        const transcriptResult = await fetchYouTubeTranscript(lesson.videoLink);
        
        if (transcriptResult.success && transcriptResult.full_text) {
          await db.update(syllabusCalendar)
            .set({ 
              videoTranscript: transcriptResult.full_text,
              updatedAt: new Date()
            })
            .where(eq(syllabusCalendar.id, lesson.id));
          
          results.success++;
          console.log(`✅ Stored transcript for: ${lesson.lessonTitle}`);
        } else {
          results.failed++;
          results.errors.push(`${lesson.lessonTitle}: ${transcriptResult.error}`);
          console.log(`❌ Failed: ${lesson.lessonTitle} - ${transcriptResult.error}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      res.json({ 
        success: true, 
        message: `Fetched ${results.success} transcripts, ${results.failed} failed`,
        results
      });
    } catch (error) {
      console.error('Error in bulk transcript fetch:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transcripts' });
    }
  });

  // Fetch YouTube video transcript (checks database first, then falls back to YouTube)
  app.get('/api/youtube/transcript', async (req, res) => {
    try {
      const { videoUrl, languages, lessonId } = req.query;
      
      console.log('📺 YouTube transcript request:', { videoUrl, languages, lessonId });
      
      if (!videoUrl || typeof videoUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'Video URL is required' });
      }
      
      // First, check if we have a stored transcript in the database for this lesson
      if (lessonId) {
        const id = parseInt(lessonId as string);
        if (!isNaN(id)) {
          const lessons = await db.select().from(syllabusCalendar).where(eq(syllabusCalendar.id, id));
          const lesson = lessons[0];
          
          if (lesson?.videoTranscript) {
            console.log('📺 Found stored transcript in database for lesson:', lesson.lessonTitle);
            // Return stored transcript in a format compatible with the frontend
            // Since we don't have segment timestamps for stored transcripts, we create a single segment
            return res.json({
              success: true,
              video_id: videoUrl,
              language: 'en',
              is_auto_generated: false,
              full_text: lesson.videoTranscript,
              segments: [{
                text: lesson.videoTranscript,
                start: 0,
                duration: 0
              }],
              segment_count: 1,
              from_database: true
            });
          }
        }
      }
      
      // No stored transcript, try fetching from YouTube
      const pythonScript = path.join(process.cwd(), 'server', 'python', 'youtube_transcript.py');
      console.log('📺 Python script path:', pythonScript);
      
      const args = [pythonScript, videoUrl];
      
      if (languages && typeof languages === 'string') {
        args.push(languages);
      }
      
      const result = await new Promise<any>((resolve, reject) => {
        console.log('📺 Spawning python3 with args:', args);
        const python = spawn('python3', args);
        let stdout = '';
        let stderr = '';
        
        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        python.on('close', (code) => {
          console.log('📺 Python script exited with code:', code);
          if (stderr) {
            console.log('📺 Python stderr:', stderr);
          }
          if (code !== 0) {
            console.error('YouTube transcript script error:', stderr);
            resolve({ success: false, error: stderr || 'Failed to fetch transcript' });
          } else {
            try {
              const result = JSON.parse(stdout);
              console.log('📺 Transcript result:', result.success ? 'SUCCESS' : `FAILED: ${result.error}`);
              resolve(result);
            } catch (e) {
              console.error('📺 Failed to parse stdout:', stdout);
              resolve({ success: false, error: 'Failed to parse transcript response' });
            }
          }
        });
        
        python.on('error', (err) => {
          console.error('📺 Python spawn error:', err);
          reject(err);
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          python.kill();
          console.error('📺 Transcript fetch timed out after 30s');
          resolve({ success: false, error: 'Transcript fetch timed out' });
        }, 30000);
      });
      
      if (!result.success) {
        console.log('📺 Returning error response:', result.error);
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching YouTube transcript:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transcript' });
    }
  });

  // Get supported math image types
  app.get('/api/math-image/types', async (req, res) => {
    const types = {
      graphs: [
        { id: 'linear', name: 'Linear Graph', description: 'y = mx + c', params: ['m', 'c', 'xMin', 'xMax'] },
        { id: 'quadratic', name: 'Quadratic Graph', description: 'y = ax² + bx + c', params: ['a', 'b', 'c', 'xMin', 'xMax'] },
        { id: 'polynomial', name: 'Polynomial Graph', description: 'Custom polynomial', params: ['coefficients', 'xMin', 'xMax'] },
        { id: 'trig', name: 'Trigonometric Graph', description: 'sin, cos, tan', params: ['function', 'amplitude', 'period', 'phase'] },
        { id: 'exponential', name: 'Exponential Graph', description: 'y = a × b^x + c', params: ['a', 'base', 'c', 'xMin', 'xMax'] },
        { id: 'logarithm', name: 'Logarithm Graph', description: 'y = a × log_b(x) + c', params: ['a', 'base', 'c', 'xMin', 'xMax'] },
        { id: 'hyperbola', name: 'Hyperbola Graph', description: 'y = a/x + c', params: ['a', 'c', 'xMin', 'xMax'] }
      ],
      geometry: [
        { id: 'triangle', name: 'Triangle', description: 'Custom triangle with labels', params: ['points', 'labels', 'showSides'] },
        { id: 'circle', name: 'Circle', description: 'Circle with center and radius', params: ['center', 'radius', 'showRadius', 'showDiameter'] },
        { id: 'rectangle', name: 'Rectangle', description: 'Rectangle with dimensions', params: ['origin', 'width', 'height', 'labels'] },
        { id: 'polygon', name: 'Polygon', description: 'Any polygon from points', params: ['points', 'labels', 'fill'] },
        { id: 'angle', name: 'Angle', description: 'Angle with arc and measurement', params: ['vertex', 'angle1', 'angle2', 'rayLength'] }
      ],
      coordinate: [
        { id: 'numberLine', name: 'Number Line', description: 'Number line with marked points', params: ['start', 'end', 'markedPoints'] },
        { id: 'coordinatePlane', name: 'Coordinate Plane', description: 'Plot points on coordinate plane', params: ['points', 'xRange', 'yRange', 'connectPoints'] }
      ],
      special: [
        { id: 'pie', name: 'Pie Chart', description: 'Pie chart for fractions', params: ['values', 'labels', 'title'] },
        { id: 'bar', name: 'Bar Chart', description: 'Bar chart for data', params: ['values', 'labels', 'title'] },
        { id: 'venn', name: 'Venn Diagram', description: '2 or 3 set Venn diagram', params: ['sets', 'labels', 'title'] },
        { id: 'fraction', name: 'Fraction Visual', description: 'Visual fraction representation', params: ['numerator', 'denominator', 'shape'] },
        { id: 'transformation', name: 'Transformation', description: 'Geometric transformations', params: ['originalPoints', 'transformation', 'transformParams'] }
      ]
    };
    res.json(types);
  });

  // WolframAlpha image generation endpoint
  app.post('/api/wolfram/generate-image', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Only admins and teachers can use this
      const user = await storage.getUser(userId);
      if (!user || !['admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ error: 'Only admins and teachers can use this feature' });
      }

      const { type, params, expression } = req.body;

      if (!expression && !type) {
        return res.status(400).json({ error: 'Either expression or type with params is required' });
      }

      const wolframAppId = process.env.WOLFRAM_ALPHA_APPID;
      if (!wolframAppId) {
        return res.status(500).json({ error: 'WolframAlpha API not configured. Please add WOLFRAM_ALPHA_APPID secret.' });
      }

      // Convert image type and params to WolframAlpha query
      let query = expression;
      if (!query && type && params) {
        query = convertToWolframQuery(type, params);
      }

      if (!query) {
        return res.status(400).json({ error: 'Could not generate WolframAlpha query' });
      }

      console.log(`🔮 WolframAlpha query: ${query}`);

      // Use the Full Results API to get the plot image
      const wolframUrl = `https://api.wolframalpha.com/v2/query?appid=${wolframAppId}&input=${encodeURIComponent(query)}&format=image&output=json&includepodid=Plot&includepodid=3DPlot`;

      const response = await fetch(wolframUrl);
      const data = await response.json();

      if (!data.queryresult?.success) {
        // Fallback to Simple API for a full result image
        const simpleUrl = `https://api.wolframalpha.com/v1/simple?appid=${wolframAppId}&i=${encodeURIComponent(query)}&width=500&background=white`;
        
        const simpleResponse = await fetch(simpleUrl);
        if (!simpleResponse.ok) {
          return res.status(500).json({ error: 'WolframAlpha query failed', details: data.queryresult?.error });
        }

        // Save the simple API image
        const imageBuffer = Buffer.from(await simpleResponse.arrayBuffer());
        const timestamp = Date.now();
        const filename = `wolfram_${timestamp}.gif`;
        const uploadDir = path.join(process.cwd(), 'uploads', 'generated-graphs');
        
        if (!existsSync(uploadDir)) {
          mkdirSync(uploadDir, { recursive: true });
        }
        
        const filepath = path.join(uploadDir, filename);
        writeFileSync(filepath, imageBuffer);
        
        const imageUrl = `/uploads/generated-graphs/${filename}`;
        
        return res.json({
          success: true,
          imageUrl,
          source: 'wolfram_simple',
          query
        });
      }

      // Extract plot image from pods
      let plotImageUrl: string | null = null;
      const pods = data.queryresult.pods || [];
      
      for (const pod of pods) {
        if (pod.id === 'Plot' || pod.id === '3DPlot' || pod.title?.toLowerCase().includes('plot')) {
          const subpods = pod.subpods || [];
          if (subpods.length > 0 && subpods[0].img?.src) {
            plotImageUrl = subpods[0].img.src;
            break;
          }
        }
      }

      if (!plotImageUrl) {
        // Try to get any image from the result
        for (const pod of pods) {
          const subpods = pod.subpods || [];
          if (subpods.length > 0 && subpods[0].img?.src) {
            plotImageUrl = subpods[0].img.src;
            break;
          }
        }
      }

      if (!plotImageUrl) {
        return res.status(500).json({ error: 'No plot image found in WolframAlpha response' });
      }

      // Download and save the image locally
      const imageResponse = await fetch(plotImageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      const timestamp = Date.now();
      const filename = `wolfram_${timestamp}.gif`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'generated-graphs');
      
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }
      
      const filepath = path.join(uploadDir, filename);
      writeFileSync(filepath, imageBuffer);
      
      const localImageUrl = `/uploads/generated-graphs/${filename}`;

      res.json({
        success: true,
        imageUrl: localImageUrl,
        source: 'wolfram_full',
        query,
        originalUrl: plotImageUrl
      });

    } catch (error: any) {
      console.error('WolframAlpha error:', error);
      res.status(500).json({ error: error.message || 'WolframAlpha request failed' });
    }
  });

  // Comparison endpoint: Generate image with both Python/matplotlib and WolframAlpha
  app.post('/api/image-compare', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await storage.getUser(userId);
      if (!user || !['admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ error: 'Only admins and teachers can use this feature' });
      }

      const { type, params, expression } = req.body;

      // Custom expression mode - only WolframAlpha
      const isCustomExpression = !!expression && !type;

      if (!type && !expression) {
        return res.status(400).json({ error: 'Image type or expression is required' });
      }

      const results: {
        python?: { success: boolean; imageUrl?: string; error?: string };
        wolfram?: { success: boolean; imageUrl?: string; error?: string; query?: string };
      } = {};

      // Generate with Python/matplotlib (only for preset types, not custom expressions)
      if (type && !isCustomExpression) {
        try {
          const pythonScript = path.join(process.cwd(), 'server', 'python', 'math_image_generator.py');
          
          const pythonResult = await new Promise<{ success: boolean; imageUrl?: string; error?: string }>((resolve) => {
            const python = spawn('python3', [pythonScript]);
            let stdout = '';
            let stderr = '';
            
            python.stdout.on('data', (data) => {
              stdout += data.toString();
            });
            
            python.stderr.on('data', (data) => {
              stderr += data.toString();
            });
            
            python.on('close', (code) => {
              if (code === 0) {
                try {
                  const result = JSON.parse(stdout.trim());
                  resolve(result);
                } catch (e) {
                  resolve({ success: false, error: 'Failed to parse Python output' });
                }
              } else {
                resolve({ success: false, error: stderr || 'Python script failed' });
              }
            });
            
            python.on('error', (error) => {
              resolve({ success: false, error: error.message });
            });
            
            const inputData = JSON.stringify({ type, params });
            python.stdin.write(inputData);
            python.stdin.end();
            
            setTimeout(() => {
              python.kill();
              resolve({ success: false, error: 'Timeout' });
            }, 30000);
          });

          results.python = pythonResult;
        } catch (error: any) {
          results.python = { success: false, error: error.message };
        }
      } else {
        results.python = { success: false, error: 'Custom expressions only support WolframAlpha' };
      }

      // Generate with WolframAlpha
      const wolframAppId = process.env.WOLFRAM_ALPHA_APPID;
      if (wolframAppId) {
        try {
          // Use custom expression if provided, otherwise convert from type/params
          const query = isCustomExpression ? expression : convertToWolframQuery(type, params);
          
          if (query) {
            const wolframUrl = `https://api.wolframalpha.com/v2/query?appid=${wolframAppId}&input=${encodeURIComponent(query)}&format=image&output=json&includepodid=Plot&includepodid=3DPlot`;

            const response = await fetch(wolframUrl);
            const data = await response.json();

            let plotImageUrl: string | null = null;
            
            if (data.queryresult?.success) {
              const pods = data.queryresult.pods || [];
              for (const pod of pods) {
                if (pod.id === 'Plot' || pod.id === '3DPlot' || pod.title?.toLowerCase().includes('plot')) {
                  const subpods = pod.subpods || [];
                  if (subpods.length > 0 && subpods[0].img?.src) {
                    plotImageUrl = subpods[0].img.src;
                    break;
                  }
                }
              }
              
              if (!plotImageUrl) {
                for (const pod of pods) {
                  const subpods = pod.subpods || [];
                  if (subpods.length > 0 && subpods[0].img?.src) {
                    plotImageUrl = subpods[0].img.src;
                    break;
                  }
                }
              }
            }

            if (plotImageUrl) {
              // Download and save the image
              const imageResponse = await fetch(plotImageUrl);
              const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
              
              const timestamp = Date.now();
              const filename = `wolfram_compare_${timestamp}.gif`;
              const uploadDir = path.join(process.cwd(), 'uploads', 'generated-graphs');
              
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
              }
              
              const filepath = path.join(uploadDir, filename);
              fs.writeFileSync(filepath, imageBuffer);
              
              results.wolfram = {
                success: true,
                imageUrl: `/uploads/generated-graphs/${filename}`,
                query
              };
            } else {
              results.wolfram = { success: false, error: 'No plot found in response', query };
            }
          } else {
            results.wolfram = { success: false, error: 'Could not convert to WolframAlpha query' };
          }
        } catch (error: any) {
          results.wolfram = { success: false, error: error.message };
        }
      } else {
        results.wolfram = { success: false, error: 'WolframAlpha API not configured' };
      }

      res.json({
        success: true,
        type,
        params,
        results
      });

    } catch (error: any) {
      console.error('Comparison error:', error);
      res.status(500).json({ error: error.message || 'Comparison failed' });
    }
  });

  return httpServer;
}

// Helper function to convert Python/matplotlib image types to WolframAlpha queries
function convertToWolframQuery(type: string, params: Record<string, any>): string | null {
  switch (type) {
    case 'linear':
      const m = params.m ?? 1;
      const c = params.c ?? 0;
      const xMin = params.xMin ?? -10;
      const xMax = params.xMax ?? 10;
      return `plot y = ${m}x + ${c} from x=${xMin} to ${xMax}`;
    
    case 'quadratic':
      const a = params.a ?? 1;
      const b = params.b ?? 0;
      const qc = params.c ?? 0;
      return `plot y = ${a}x^2 + ${b}x + ${qc} from x=${params.xMin ?? -10} to ${params.xMax ?? 10}`;
    
    case 'trig':
      const func = params.function || 'sin';
      const amplitude = params.amplitude ?? 1;
      const period = params.period ?? 1;
      const phase = params.phase ?? 0;
      const verticalShift = params.verticalShift ?? 0;
      // WolframAlpha format: period affects frequency (2*pi/period), phase shifts
      // Standard form: A*sin(Bx + C) + D where B = 2*pi/period
      const frequency = period !== 0 ? (2 * Math.PI) / period : 1;
      let trigExpr = `${amplitude}*${func}(${frequency.toFixed(4)}*x - ${phase})`;
      if (verticalShift !== 0) {
        trigExpr = `${trigExpr} + ${verticalShift}`;
      }
      return `plot ${trigExpr} from x=-10 to 10`;
    
    case 'exponential':
      const ea = params.a ?? 1;
      const base = params.base ?? 2;
      const ec = params.c ?? 0;
      return `plot ${ea}*${base}^x + ${ec} from x=${params.xMin ?? -5} to ${params.xMax ?? 5}`;
    
    case 'logarithm':
      const la = params.a ?? 1;
      const logBase = params.base ?? 10;
      const lc = params.c ?? 0;
      return `plot ${la}*log base ${logBase} of x + ${lc} from x=0.1 to ${params.xMax ?? 10}`;
    
    case 'hyperbola':
      const ha = params.a ?? 1;
      const hc = params.c ?? 0;
      return `plot ${ha}/x + ${hc} from x=-10 to 10`;
    
    case 'circle':
      const radius = params.radius ?? 5;
      return `circle with radius ${radius}`;
    
    case 'triangle':
      return `triangle with vertices at ${JSON.stringify(params.points || [[0,0], [4,0], [2,3]])}`;
    
    case 'rectangle':
      const width = params.width ?? 4;
      const height = params.height ?? 3;
      return `rectangle ${width} by ${height}`;
    
    case 'cylinder':
      return `cylinder with radius ${params.radius ?? 3} and height ${params.height ?? 5}`;
    
    case 'cone':
      return `cone with radius ${params.radius ?? 3} and height ${params.height ?? 5}`;
    
    case 'sphere':
      return `sphere with radius ${params.radius ?? 3}`;
    
    case 'pyramid':
      return `square pyramid with base ${params.baseSize ?? 4} and height ${params.height ?? 5}`;
    
    case 'cube':
      return `cube with side length ${params.length ?? 4}`;
    
    case 'pie':
      const values = params.values || [30, 25, 20, 15, 10];
      const labels = params.labels || values.map((_: any, i: number) => `Item ${i + 1}`);
      return `pie chart of ${values.join(', ')} with labels ${labels.join(', ')}`;
    
    case 'bar':
      const barValues = params.values || [10, 20, 15, 25, 30];
      const barLabels = params.labels || barValues.map((_: any, i: number) => `Category ${i + 1}`);
      return `bar chart of ${barValues.join(', ')} with labels ${barLabels.join(', ')}`;
    
    case 'numberLine':
      const start = params.start ?? -10;
      const end = params.end ?? 10;
      const marked = params.markedPoints || [0];
      return `number line from ${start} to ${end} marking ${marked.join(', ')}`;
    
    case 'coordinatePlane':
      const points = params.points || [];
      if (points.length > 0) {
        const pointStr = points.map((p: any) => `(${p.x}, ${p.y})`).join(', ');
        return `plot points ${pointStr}`;
      }
      return `coordinate plane`;
    
    case 'venn':
      const sets = params.sets || 2;
      return `${sets}-set Venn diagram`;
    
    case 'fraction':
      const numerator = params.numerator ?? 3;
      const denominator = params.denominator ?? 4;
      return `visualize fraction ${numerator}/${denominator}`;
    
    case 'angle':
      const angle1 = params.angle1 ?? 0;
      const angle2 = params.angle2 ?? 45;
      const angleDiff = Math.abs(angle2 - angle1);
      return `angle of ${angleDiff} degrees`;
    
    case 'parallelLines':
      const transversalAngle = params.transversalAngle ?? 60;
      return `parallel lines with transversal at ${transversalAngle} degrees`;
    
    case 'vector':
      const vectors = params.vectors || [];
      if (vectors.length > 0) {
        const vectorStr = vectors.map((v: any) => `vector from (${v.start?.[0] ?? 0},${v.start?.[1] ?? 0}) to (${v.end?.[0] ?? 1},${v.end?.[1] ?? 1})`).join(' and ');
        return vectorStr;
      }
      return 'vector from origin to (3,4)';
    
    case 'transformation':
      const transformation = params.transformation || 'translate';
      return `geometric ${transformation} transformation`;
    
    default:
      // For unsupported types, return a descriptive query that WolframAlpha might understand
      return `${type} mathematical diagram`;
  }
}

/**
 * Generate exercise title using canonical topic data only
 */
function generateExerciseTitle(
  originalTitle: string,
  topicName?: string,
  themeName?: string
): string {
  // If no canonical topic/theme data exists, return original AI-generated title unchanged
  if (!topicName && !themeName) {
    return originalTitle;
  }

  const timestamp = new Date();
  // Format as "12:00 Jan 25" 
  const timeString = timestamp.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
  const monthString = timestamp.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  const formattedDateTime = `${timeString} ${monthString}`;
  
  // Build title with canonical data
  const topicPart = topicName ? topicName : '';
  const themePart = themeName ? ` - ${themeName}` : '';
  const canonicalTopic = `${topicPart}${themePart}`;
  
  return `AI Practice: ${canonicalTopic} (${formattedDateTime})`;
}

