#!/usr/bin/env node

/**
 * MCP (Model Context Protocol) Server Implementation
 * Educational AI Service MCP Server for XtraClass.ai
 * 
 * This server exposes educational AI capabilities through the standardized MCP protocol,
 * including exercise generation, feedback analysis, and adaptive learning tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import OpenAI from "openai";

// Import existing types from the Educational AI Service
export interface EducationalContext {
  grade: string;
  subject: string;
  topic: string;
  theme?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  syllabus: 'CAPS' | 'IEB';
  term?: string;
  week?: string;
}

export interface GeneratedExercise {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    question: string;
    answer: string;
    marks: number;
    type: 'multiple-choice' | 'short-answer' | 'calculation' | 'essay';
    answerType?: string;
    acceptableVariations?: string[];
  }>;
  totalMarks: number;
  estimatedDuration: number;
}

export interface ExerciseFeedback {
  overall: {
    score: number;
    percentage: number;
    grade: string;
    strengths: string[];
    improvements: string[];
  };
  questionAnalysis: Array<{
    questionId: string;
    isCorrect: boolean;
    points: number;
    maxPoints: number;
    feedback: string;
    suggestions?: string[];
  }>;
}

export interface TutorialContent {
  title: string;
  description: string;
  explanation: string;
  examples: string[];
  practiceQuestions: string[];
}

// Zod schemas for validation
const EducationalContextSchema = z.object({
  grade: z.string(),
  subject: z.string(),
  topic: z.string(),
  theme: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  syllabus: z.enum(['CAPS', 'IEB']),
  term: z.string().optional(),
  week: z.string().optional(),
});

const GenerateExerciseSchema = z.object({
  context: EducationalContextSchema,
  numQuestions: z.number().min(1).max(20).default(5),
  includeAnswers: z.boolean().default(true),
});

const GenerateFeedbackSchema = z.object({
  exercise: z.object({
    id: z.string(),
    title: z.string(),
    questions: z.array(z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
      marks: z.number(),
    })),
  }),
  studentAnswers: z.array(z.string()),
  context: EducationalContextSchema,
});

const AdaptiveExerciseSchema = z.object({
  context: EducationalContextSchema,
  feedbackContext: z.object({
    previousPerformance: z.number().min(0).max(100),
    weakAreas: z.array(z.string()),
    specificMistakes: z.array(z.string()),
    improvementAreas: z.array(z.string()),
  }),
  numQuestions: z.number().min(1).max(20).default(5),
});

const ExtractPastPaperQuestionsSchema = z.object({
  pdfText: z.string().optional(),
  pdfImages: z.array(z.string()).optional(),
  context: z.object({
    subject: z.string(),
    grade: z.string(),
    paperType: z.string(),
    year: z.number(),
  }),
});

// Removed strict TutorialSchema - now handled dynamically in method

/**
 * Educational AI MCP Server Class
 */
class EducationalAIMCPServer {
  private openai: OpenAI | null = null;
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "educational-ai-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log("✅ Educational AI MCP Server initialized with OpenAI API");
    } else {
      console.warn("⚠️ OpenAI API key not found. Server will run but tools will fail without authentication.");
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_exercise",
          description: "Generate educational exercises based on curriculum context and difficulty level",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string", description: "Student grade level (e.g., '8', '9', '10')" },
                  subject: { type: "string", description: "Subject area (e.g., 'mathematics', 'science')" },
                  topic: { type: "string", description: "Topic within the subject (e.g., 'Algebra', 'Geometry')" },
                  theme: { type: "string", description: "Optional specific theme within topic" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  syllabus: { type: "string", enum: ["CAPS", "IEB"] },
                  term: { type: "string", description: "Academic term (optional)" },
                  week: { type: "string", description: "Week number (optional)" },
                },
                required: ["grade", "subject", "topic", "difficulty", "syllabus"],
              },
              numQuestions: { type: "number", minimum: 1, maximum: 20, default: 5 },
              includeAnswers: { type: "boolean", default: true },
            },
            required: ["context"],
          },
        },
        {
          name: "generate_feedback",
          description: "Generate detailed feedback for student exercise submissions",
          inputSchema: {
            type: "object",
            properties: {
              exercise: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        question: { type: "string" },
                        answer: { type: "string" },
                        marks: { type: "number" },
                      },
                      required: ["id", "question", "answer", "marks"],
                    },
                  },
                },
                required: ["id", "title", "questions"],
              },
              studentAnswers: {
                type: "array",
                items: { type: "string" },
              },
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  syllabus: { type: "string", enum: ["CAPS", "IEB"] },
                },
                required: ["grade", "subject", "topic", "difficulty", "syllabus"],
              },
            },
            required: ["exercise", "studentAnswers", "context"],
          },
        },
        {
          name: "generate_tutorial",
          description: "Generate step-by-step tutorial content to help students understand specific topics before attempting exercises",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  syllabus: { type: "string", enum: ["CAPS", "IEB"] },
                },
                required: ["grade", "subject", "topic", "syllabus"],
              },
              improvementAreas: {
                type: "array",
                items: { type: "string" },
                description: "Specific areas where the student needs improvement"
              },
              targetConcepts: {
                type: "array", 
                items: { type: "string" },
                description: "Key concepts that should be covered in the tutorial"
              }
            },
            required: ["context", "improvementAreas"],
          },
        },
        {
          name: "generate_adaptive_exercise",
          description: "Generate adaptive exercises that target specific student weaknesses and improvement areas",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  syllabus: { type: "string", enum: ["CAPS", "IEB"] },
                },
                required: ["grade", "subject", "topic", "difficulty", "syllabus"],
              },
              feedbackContext: {
                type: "object",
                properties: {
                  previousPerformance: { type: "number", minimum: 0, maximum: 100 },
                  weakAreas: { type: "array", items: { type: "string" } },
                  specificMistakes: { type: "array", items: { type: "string" } },
                  improvementAreas: { type: "array", items: { type: "string" } },
                },
                required: ["previousPerformance", "weakAreas", "improvementAreas"],
              },
              numQuestions: { type: "number", minimum: 1, maximum: 20, default: 5 },
            },
            required: ["context", "feedbackContext"],
          },
        },
        {
          name: "assessment_chat",
          description: "Interactive chat interface for students to ask questions about their assessment feedback, understand mistakes, and get explanations",
          inputSchema: {
            type: "object",
            properties: {
              studentQuestion: {
                type: "string",
                description: "The student's question about their assessment feedback"
              },
              assessmentContext: {
                type: "object",
                properties: {
                  assessmentType: { type: "string", enum: ["homework", "exercise"], description: "Type of assessment" },
                  title: { type: "string", description: "Assessment title" },
                  subject: { type: "string", description: "Subject area" },
                  topic: { type: "string", description: "Topic covered" },
                  grade: { type: "string", description: "Student grade level" },
                },
                required: ["assessmentType", "title", "subject", "topic", "grade"],
              },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    question: { type: "string" },
                    correctAnswer: { type: "string" },
                    studentAnswer: { type: "string" },
                    marks: { type: "number" },
                    earnedMarks: { type: "number" },
                    isCorrect: { type: "boolean" },
                  },
                  required: ["id", "question", "correctAnswer", "studentAnswer", "marks", "earnedMarks", "isCorrect"],
                },
              },
              feedback: {
                type: "object",
                properties: {
                  strengths: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } },
                  overallScore: { type: "number" },
                  totalMarks: { type: "number" },
                  percentage: { type: "number" },
                },
                required: ["strengths", "improvements", "overallScore", "totalMarks", "percentage"],
              },
            },
            required: ["studentQuestion", "assessmentContext", "questions", "feedback"],
          },
        },
        {
          name: "video_lesson_chat",
          description: "Interactive AI chat to help students understand video lesson content with subject/topic/theme context and optional video transcript",
          inputSchema: {
            type: "object",
            properties: {
              studentQuestion: {
                type: "string",
                description: "The student's question about the video lesson content"
              },
              lessonContext: {
                type: "object",
                properties: {
                  lessonTitle: { type: "string", description: "Title of the lesson" },
                  subject: { type: "string", description: "Subject area" },
                  topic: { type: "string", description: "Topic covered" },
                  theme: { type: "string", description: "Theme within the topic" },
                  grade: { type: "string", description: "Student grade level" },
                  videoLink: { type: "string", description: "YouTube video link" },
                  description: { type: "string", description: "Lesson description" },
                },
                required: ["lessonTitle", "subject", "topic", "theme", "grade"],
              },
              transcript: {
                type: "string",
                description: "Optional video transcript text to provide context for answering questions"
              },
            },
            required: ["studentQuestion", "lessonContext"],
          },
        },
        {
          name: "verify_exercise_relevance",
          description: "Verify if exercise questions are relevant to video lesson content by comparing with transcript",
          inputSchema: {
            type: "object",
            properties: {
              transcript: {
                type: "string",
                description: "The video transcript text"
              },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number", description: "Question ID" },
                    question: { type: "string", description: "The question text" },
                    answer: { type: "string", description: "The expected answer (optional)" },
                    marks: { type: "number", description: "Marks allocated (optional)" }
                  },
                  required: ["id", "question"]
                },
                description: "Array of exercise questions to verify"
              },
              lessonContext: {
                type: "object",
                properties: {
                  lessonTitle: { type: "string", description: "Title of the lesson" },
                  subject: { type: "string", description: "Subject area" },
                  topic: { type: "string", description: "Topic covered" },
                  theme: { type: "string", description: "Theme within the topic" },
                  grade: { type: "string", description: "Student grade level" }
                },
                required: ["lessonTitle", "subject", "grade"]
              }
            },
            required: ["transcript", "questions", "lessonContext"]
          }
        },
        {
          name: "tutorial_chat",
          description: "Interactive AI chat to help students understand tutorial content and steps",
          inputSchema: {
            type: "object",
            properties: {
              studentQuestion: {
                type: "string",
                description: "The student's question about the tutorial step or content"
              },
              tutorialContext: {
                type: "object",
                properties: {
                  tutorialTitle: { type: "string", description: "Title of the tutorial" },
                  currentStep: { type: "number", description: "Current step number in tutorial" },
                  totalSteps: { type: "number", description: "Total number of steps in tutorial" },
                  stepTitle: { type: "string", description: "Title of current step" },
                  stepContent: { type: "string", description: "Content/explanation of current step" },
                  example: {
                    type: "object",
                    properties: {
                      problem: { type: "string" },
                      solution: { type: "string" },
                      keyPoint: { type: "string" }
                    }
                  },
                  grade: { type: "string", description: "Student grade level" },
                  subject: { type: "string", description: "Subject area" },
                  topic: { type: "string", description: "Topic covered" }
                },
                required: ["tutorialTitle", "currentStep", "totalSteps", "stepTitle", "stepContent", "grade", "subject", "topic"]
              }
            },
            required: ["studentQuestion", "tutorialContext"]
          }
        },
        {
          name: "get_service_status",
          description: "Get the current status and configuration of the Educational AI service",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "extract_past_paper_questions",
          description: "Extract questions from a past paper PDF text using AI analysis",
          inputSchema: {
            type: "object",
            properties: {
              pdfText: {
                type: "string",
                description: "The extracted text content from the PDF"
              },
              context: {
                type: "object",
                properties: {
                  subject: { type: "string", description: "Subject (e.g., mathematics, physical-science)" },
                  grade: { type: "string", description: "Grade level (e.g., 8, 9, 10, 11, 12)" },
                  paperType: { type: "string", description: "Type of paper (exam, test, assignment)" },
                  year: { type: "number", description: "Year of the paper" },
                },
                required: ["subject", "grade", "paperType", "year"],
              },
            },
            required: ["pdfText", "context"],
          },
        },
        {
          name: "list_prompts",
          description: "List all canonical AI prompts used by the MCP server for prompt management and synchronization",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "educational-ai://service/status",
          name: "Service Status",
          description: "Current status of the Educational AI MCP server",
          mimeType: "application/json",
        },
        {
          uri: "educational-ai://curriculum/caps-grade-8-mathematics",
          name: "CAPS Grade 8 Mathematics Curriculum",
          description: "South African CAPS curriculum structure for Grade 8 Mathematics",
          mimeType: "text/plain",
        },
      ],
    }));

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === "educational-ai://service/status") {
        const status = {
          serviceName: "Educational AI MCP Server",
          version: "1.0.0",
          status: this.openai ? "operational" : "no-api-key",
          apiConfigured: !!process.env.OPENAI_API_KEY,
          model: "gpt-3.5-turbo",
          capabilities: [
            "exercise_generation",
            "feedback_analysis",
            "adaptive_learning",
            "caps_curriculum_alignment",
          ],
          message: this.openai 
            ? "Educational AI Service operational with OpenAI integration"
            : "Educational AI Service requires OPENAI_API_KEY environment variable"
        };

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      if (uri === "educational-ai://curriculum/caps-grade-8-mathematics") {
        const curriculum = `
CAPS Grade 8 Mathematics Curriculum Structure

Term 1:
- Numbers and Operations (Integers, Fractions, Decimals)
- Algebraic Expressions (Simple expressions, like terms)
- Equations (Simple linear equations)

Term 2:
- Patterns and Sequences (Number patterns, geometric patterns)
- Functions and Relationships (Input-output tables)
- Geometry (2D shapes, transformations)

Term 3:
- Measurement (Perimeter, area, volume)
- Data Handling (Data collection, graphs)
- Probability (Basic probability concepts)

Term 4:
- Revision and Assessment
- Problem Solving Applications
- Real-world Mathematics
        `.trim();

        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: curriculum,
            },
          ],
        };
      }

      throw new Error(`Resource not found: ${uri}`);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "generate_exercise":
            return await this.handleGenerateExercise(args as any);

          case "generate_feedback":
            return await this.handleGenerateFeedback(args as any);

          case "generate_adaptive_exercise":
            return await this.handleGenerateAdaptiveExercise(args as any);

          case "generate_tutorial":
            return await this.handleGenerateTutorial(args as any);

          case "assessment_chat":
            return await this.handleAssessmentChat(args as any);

          case "video_lesson_chat":
            return await this.handleVideoLessonChat(args as any);

          case "verify_exercise_relevance":
            return await this.handleVerifyExerciseRelevance(args as any);

          case "tutorial_chat":
            return await this.handleTutorialChat(args as any);

          case "get_service_status":
            return await this.handleGetServiceStatus();

          case "extract_past_paper_questions":
            return await this.handleExtractPastPaperQuestions(args as any);

          case "list_prompts":
            return await this.handleListPrompts();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleGenerateExercise(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const validated = GenerateExerciseSchema.parse(args);
    const { context, numQuestions, includeAnswers } = validated;

    // Retry logic for JSON parsing failures
    const MAX_RETRIES = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const exercise = await this.generateExerciseWithAI(context, numQuestions);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ status: 'success', exercise }, null, 2),
            },
          ],
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`⚠️ Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);
        if (attempt < MAX_RETRIES) {
          console.log(`🔄 Retrying...`);
        }
      }
    }

    // All retries failed
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ 
            status: 'failed', 
            error: lastError?.message || 'Unknown error',
            tool: 'generate_exercise'
          }, null, 2),
        },
      ],
    };
  }

  private async generateExerciseWithAI(context: any, numQuestions: number) {
    const prompt = `Generate a ${context.difficulty} level ${context.subject} exercise for Grade ${context.grade} students on the topic "${context.topic}".

CURRICULUM CONTEXT:
- Grade: ${context.grade}
- Subject: ${context.subject}
- Topic: ${context.topic}
- Difficulty: ${context.difficulty}
- Syllabus: ${context.syllabus}
${context.theme ? `- Theme: ${context.theme}` : ''}

REQUIREMENTS:
- Generate exactly ${numQuestions} questions
- Align with ${context.syllabus} curriculum standards
- Appropriate for Grade ${context.grade} level
- Focus specifically on "${context.topic}"

CRITICAL SEPARATION RULES:
- The "question" field must ONLY contain the problem statement that students see
- The "solution" field must ONLY contain the complete worked solution with steps
- NEVER mix question and solution in the same field
- NEVER include solution steps in the question field
- Students should NOT be able to see the answer from the question text

REQUIRED JSON FORMAT - Return ONLY valid JSON, no other text:
{
  "title": "Exercise title",
  "description": "Brief description",
  "questions": [
    {
      "questionNumber": 1,
      "question": "ONLY the problem statement here - no solution steps",
      "solution": "Complete step-by-step solution here",
      "marks": 5,
      "difficulty": "${context.difficulty}"
    }
  ],
  "totalMarks": ${numQuestions * 5},
  "estimatedDuration": ${numQuestions * 6}
}

EXAMPLE - Correct Format:
{
  "title": "Algebra Practice",
  "description": "Practice solving algebraic equations",
  "questions": [
    {
      "questionNumber": 1,
      "question": "Solve for x: 2x + 3 = 11",
      "solution": "Step 1: Subtract 3 from both sides\\n2x = 11 - 3\\nStep 2: Simplify\\n2x = 8\\nStep 3: Divide both sides by 2\\nx = 4",
      "marks": 5,
      "difficulty": "easy"
    }
  ],
  "totalMarks": 5,
  "estimatedDuration": 6
}

Generate ${numQuestions} questions following this exact format.`;

    const response = await this.openai!.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for better JSON structure adherence
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const generatedContent = response.choices[0]?.message?.content || "";
    return this.parseGeneratedExerciseJSON(generatedContent, context);
  }

  private async handleGenerateFeedback(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const validated = GenerateFeedbackSchema.parse(args);
    const { exercise, studentAnswers, context } = validated;

    const prompt = `You are an expert ${context.subject} teacher for Grade ${context.grade}. Grade ONLY what the student ACTUALLY wrote, NOT what you think they did. Award marks based on working shown.

EXERCISE: ${exercise.title}
CONTEXT: Grade ${context.grade} ${context.subject} - ${context.topic}
CURRICULUM: ${context.syllabus}

QUESTIONS AND STUDENT ANSWERS:
${exercise.questions.map((q, index) => `
Question ${index + 1}: ${q.question}
Correct Answer: ${q.answer}
Student Answer: ${studentAnswers[index] || 'No answer provided'}
Marks Available: ${q.marks}
`).join('\n')}

🚨🚨🚨 ABSOLUTE GRADING RULE - NO EXCEPTIONS 🚨🚨🚨

NEVER GIVE FULL MARKS FOR FINAL ANSWERS WITHOUT WORKING STEPS - EVER!

If student wrote "x=5" - they showed NO working steps. Award 1 mark only - NOT FULL MARKS!
If student wrote "5x-8" - they showed NO working steps. Award 1 mark only - NOT FULL MARKS!
If student wrote "Width = 6 cm, Length = 18 cm" - they showed NO working steps. Award 1 mark only - NOT FULL MARKS!

🚫 NEVER SAY: "but since it was correct, you earned full marks" - THIS IS WRONG!
🚫 NEVER AWARD FULL MARKS FOR CORRECT FINAL ANSWERS WITHOUT WORKING!

ACTUAL EXAMPLES - FOLLOW THESE EXACTLY:
❌ "x=5" = FINAL ANSWER ONLY = 1 mark MAXIMUM (even if correct)
❌ "5x-8" = FINAL ANSWER ONLY = 1 mark MAXIMUM (even if correct)
❌ "Width = 8 cm, Length = 16 cm" = FINAL ANSWER ONLY = 1 mark MAXIMUM  
❌ "The number is 6" = FINAL ANSWER ONLY = 1 mark MAXIMUM
❌ "3x(2x−5)" = FINAL ANSWER ONLY = 1 mark MAXIMUM
❌ "2x^2+5x-3" = FINAL ANSWER ONLY = 1 mark MAXIMUM
❌ "(3x-2)(2x+5)" = FINAL ANSWER ONLY = 1 mark MAXIMUM
✅ "3x + 5 = 20, 3x = 15, x = 5" = SOME WORKING = 2-3 marks
✅ "Step 1: 3x + 5 = 20, Step 2: 3x = 15, Step 3: x = 5" = FULL WORKING = Full marks
✅ "6x^2 - 15x = 3x(2x - 5)" = SHOWED FACTORING = Full marks

🔥 ABSOLUTE MARKING RULE - NO EXCEPTIONS:
- NO steps shown (just final answer): 1 mark MAXIMUM - NEVER FULL MARKS
- Some steps shown: 2-3 marks  
- Complete steps shown: Full marks
- Wrong answer: 0 marks

🎯 MANDATORY GRADING PROCESS:

STEP 1: Check if the final answer is mathematically correct
STEP 2: If correct, assess the working shown:
  - Just final answer (e.g., "x=5", "5x-8"): Award 1 mark ONLY - NEVER FULL MARKS
  - Some working shown: Award 2-3 marks
  - Complete working shown: Award full marks
STEP 3: If answer is wrong: Award 0 marks

🚨 REMINDER: A correct final answer without working = 1 mark ONLY!

MATHEMATICAL EQUIVALENCE (for checking correctness):
✅ "x = 5" = "5" = "x equals 5" = "The value of x is 5"
✅ "50 cm²" = "50 square cm" = "Area = 50 cm²" = "50cm^2" = "50"
✅ "3/4" = "0.75" = "75%" = "three quarters"

FEEDBACK QUALITY REQUIREMENTS:
- For answers with limited working: Encourage showing more steps
- For incorrect answers: Explain the mathematical concept they need to review
- For complete working: Praise their systematic approach

Provide feedback in this EXACT format:
OVERALL_SCORE: [total points earned]/[total possible points]
OVERALL_PERCENTAGE: [percentage score as integer]
OVERALL_GRADE: [letter grade A-F]
STRENGTHS:
- [Only list strengths if student got at least one question correct. If all answers are wrong, write "No strengths to highlight - focus on improvement areas below"]
- [If there are correct answers, be specific about what mathematical techniques they used correctly]
IMPROVEMENTS:
- [If student scored 90% or higher with complete working: Write "Excellent work! Continue practicing more challenging problems in [topic] to deepen your mastery" - do NOT invent fake weaknesses]
- [For scores below 90%: MUST be specific and actionable. Instead of "review basic principles", say exactly WHICH concept/formula/technique they need to practice. Example: "Practice solving linear equations by isolating the variable" or "Review the distributive property: a(b+c) = ab + ac" or "Master the steps for factoring quadratic expressions"]
- [Base improvements on ACTUAL mistakes made. Reference the specific question(s) where they struggled. Example: "In Question 2, you struggled with fractions - practice converting mixed numbers to improper fractions" or "Questions 1 and 3 show confusion with exponent rules - review the law: x^a × x^b = x^(a+b)"]
- [If they showed no working: "Show your working steps for every question - marks are awarded for the process, not just the final answer"]
- [Keep improvements practical and immediately actionable - avoid vague statements like "study more" or "review class notes"]

QUESTION_FEEDBACK:
Q1: [Correct/Incorrect] - [actual_awarded_marks]/[max_score] - [explanation of marks awarded based on working shown]
Q2: [Correct/Incorrect] - [actual_awarded_marks]/[max_score] - [explanation of marks awarded based on working shown]
[Continue for all questions]

Focus on encouraging students to show their working steps and explain mathematical reasoning clearly.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini", // Use enhanced model for better grading accuracy
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const feedbackContent = response.choices[0]?.message?.content || "";
    const feedback = this.parseFeedbackResponse(feedbackContent, exercise.questions);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(feedback, null, 2),
        },
      ],
    };
  }

  private async handleGenerateAdaptiveExercise(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    // Handle different parameter structures for backward compatibility
    const context = args.context || {};
    const numQuestions = args.numQuestions || 5;
    const improvements = args.improvements || [];
    
    // Create feedbackContext from improvements array or provided feedbackContext
    const feedbackContext = args.feedbackContext || {
      weakAreas: improvements,
      improvementAreas: improvements,
      specificMistakes: improvements,
      previousPerformance: "70" // Default performance
    };

    const prompt = `Generate an adaptive ${context.subject} exercise for Grade ${context.grade} that specifically targets the student's identified weaknesses.

STUDENT PERFORMANCE CONTEXT:
- Previous Performance: ${feedbackContext.previousPerformance}%
- Weak Areas: ${feedbackContext.weakAreas.join(', ')}
- Specific Mistakes: ${feedbackContext.specificMistakes.join(', ')}
- Areas for Improvement: ${feedbackContext.improvementAreas.join(', ')}

CURRICULUM CONTEXT:
- Grade: ${context.grade}
- Subject: ${context.subject}
- Topic: ${context.topic}
- Difficulty: ${context.difficulty}
- Syllabus: ${context.syllabus}

ADAPTIVE REQUIREMENTS:
- Generate exactly ${numQuestions} questions that directly address the weak areas
- Focus on the specific mistakes identified: ${feedbackContext.specificMistakes.join(', ')}
- Target improvement areas: ${feedbackContext.improvementAreas.join(', ')}
- Adjust difficulty based on ${feedbackContext.previousPerformance}% performance
- Align with ${context.syllabus} curriculum for Grade ${context.grade}
- Provide step-by-step practice for identified problem areas

CRITICAL SEPARATION RULES:
- The "question" field must ONLY contain the problem statement that students see
- The "solution" field must ONLY contain the complete worked solution with steps
- NEVER mix question and solution in the same field
- NEVER include solution steps in the question field
- Students should NOT be able to see the answer from the question text

REQUIRED JSON FORMAT - Return ONLY valid JSON, no other text:
{
  "title": "Targeted title addressing weak areas",
  "description": "Description explaining how this exercise addresses student weaknesses",
  "questions": [
    {
      "questionNumber": 1,
      "question": "ONLY the problem statement here - no solution steps",
      "solution": "Complete step-by-step solution here",
      "marks": 5,
      "difficulty": "medium"
    }
  ],
  "totalMarks": 25,
  "estimatedDuration": 30
}

EXAMPLE - Correct Format:
{
  "title": "Linear Equations Practice",
  "description": "Practice solving linear equations",
  "questions": [
    {
      "questionNumber": 1,
      "question": "Solve for x: 3x - 5 = 7",
      "solution": "Step 1: Add 5 to both sides\\n3x = 7 + 5\\nStep 2: Simplify\\n3x = 12\\nStep 3: Divide both sides by 3\\nx = 4",
      "marks": 5,
      "difficulty": "easy"
    }
  ],
  "totalMarks": 5,
  "estimatedDuration": 6
}

Generate ${numQuestions} questions following this exact format. Ensure each question directly addresses the student's learning needs.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for better instruction following and JSON structure adherence
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const generatedContent = response.choices[0]?.message?.content || "";
    const exercise = this.parseGeneratedExerciseJSON(generatedContent, context);

    // Add adaptive metadata
    const adaptiveExercise = {
      ...exercise,
      isAdaptive: true,
      targetedWeaknesses: feedbackContext.weakAreas,
      addressedMistakes: feedbackContext.specificMistakes,
      previousPerformance: feedbackContext.previousPerformance,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(adaptiveExercise, null, 2),
        },
      ],
    };
  }

  private async handleGetServiceStatus() {
    const status = {
      serviceName: "Educational AI MCP Server",
      version: "1.0.0",
      status: this.openai ? "operational" : "no-api-key",
      apiConfigured: !!process.env.OPENAI_API_KEY,
      model: "gpt-3.5-turbo",
      timestamp: new Date().toISOString(),
      capabilities: {
        exerciseGeneration: true,
        feedbackAnalysis: true,
        adaptiveLearning: true,
        capsAlignment: true,
        multipleSubjects: true,
        gradeLevels: ["8", "9", "10", "11", "12"],
        supportedSyllabi: ["CAPS", "IEB"],
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }

  private async handleListPrompts() {
    // Define canonical prompts used in the MCP server
    const canonicalPrompts = [
      {
        key: "homework_grading_assistant",
        name: "Homework Grading Assistant",
        category: "grading",
        version: "1.0.0",
        promptText: `You are an educational AI assistant helping grade homework assignments. 
Grade the following homework submission:

Subject: {{subject}}
Topic: {{topic}}
Grade Level: {{grade}}
Question: {{question}}
Correct Answer: {{correctAnswer}}
Student Answer: {{studentAnswer}}

Provide detailed feedback including:
1. Whether the answer is correct
2. What the student did well
3. Areas for improvement
4. The correct approach if wrong`,
        variables: ["subject", "topic", "grade", "question", "correctAnswer", "studentAnswer"],
        schemaHash: "homework_grading_v1",
      },
      {
        key: "question_feedback_generator",
        name: "Question Feedback Generator",
        category: "feedback",
        version: "1.0.0",
        promptText: `The student answered "{{student_answer}}" for the question: "{{question}}". The correct answer is "{{correct_answer}}". Provide encouraging feedback that helps them understand the concept better. Focus on their effort and guide them toward the correct approach.`,
        variables: ["student_answer", "question", "correct_answer"],
        schemaHash: "question_feedback_v1",
      },
      {
        key: "exercise_generator",
        name: "Exercise Generator",
        category: "question_generation",
        version: "1.0.0",
        promptText: `Generate {{num_questions}} educational questions for Grade {{grade}} {{subject}} on the topic of {{topic}}. Difficulty level: {{difficulty}}. Syllabus: {{syllabus}}.

Return as JSON:
{
  "title": "Exercise Title",
  "description": "Brief description",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "answer": "Correct answer",
      "marks": 5,
      "type": "short-answer"
    }
  ]
}`,
        variables: ["num_questions", "grade", "subject", "topic", "difficulty", "syllabus"],
        schemaHash: "exercise_generator_v1",
      },
      {
        key: "tutorial_step_assistant",
        name: "Tutorial Step Assistant",
        category: "tutorial",
        version: "1.0.0",
        promptText: `Explain this tutorial step in simple terms for a Grade {{grade}} student:

Step: {{step_content}}
Context: {{tutorial_context}}

Provide a clear, encouraging explanation that helps the student understand the concept. Use examples if helpful.`,
        variables: ["grade", "step_content", "tutorial_context"],
        schemaHash: "tutorial_step_v1",
      },
      {
        key: "ai_chat_assistant",
        name: "AI Chat Assistant",
        category: "general",
        version: "1.0.0",
        promptText: `You are a helpful educational AI assistant for Grade {{grade}} students. Answer the student's question about {{subject}}: "{{user_question}}"

Provide a clear, age-appropriate explanation that encourages learning. If it's about homework or exercises, guide them toward understanding rather than giving direct answers.`,
        variables: ["grade", "subject", "user_question"],
        schemaHash: "ai_chat_v1",
      },
      {
        key: "pdf_question_extractor",
        name: "PDF Question Extractor",
        category: "question_generation",
        version: "2.0.0",
        promptText: `You are a PDF-to-structured-questions extractor.
Your job is to read the attached PDF document and extract:
- All questions
- All images/diagrams referenced in or attached to questions

Return everything in structured JSON.

📘 PAST PAPER CONTEXT
- Subject: {{subject}}
- Grade: {{grade}}
- Paper Type: {{paperType}}
- Year: {{year}}

📄 PAST PAPER DOCUMENT
The full PDF document is attached as images.
You must parse the PDF pages directly — there is no pdfText placeholder.

📌 REQUIREMENTS
1. Extract ONLY the questions
   - No answers
   - No answer lines
   - No marking guides

2. Reproduce ALL mathematical expressions using LaTeX, wrapped in $...$
   Examples:
   - \\sqrt{64}
   - \\sqrt[3]{27}
   - \\frac{a}{b}
   - x^5, (3ab)^2

3. Preserve original question numbering exactly
   Examples:
   - 1.1
   - 2.3.1
   - QUESTION 4
   - SECTION B – QUESTION 5

4. Multiple-choice questions
   Maintain exact format: a), b), c), d)

5. IMAGE EXTRACTION RULES - CRITICAL FOR ACCURATE CROPPING
   - ONLY identify VISUAL DIAGRAMS such as: pie charts, bar graphs, line graphs, Cartesian planes, geometric shapes, tables with data, circuit diagrams, scientific diagrams, maps, photographs
   - DO NOT include question text as an "image" - only the actual visual diagram itself
   - For each visual diagram found:
     * Provide a brief description of what the diagram shows
     * Link to the question via questionNumber
     * CRITICAL: pageNumber must be the SEQUENTIAL INDEX of the image in this batch (1, 2, 3...), NOT the printed page number on the document
     * REQUIRED: Provide PRECISE bounding box coordinates as percentages (0-100) of page dimensions:
       - xPercent: left edge of the DIAGRAM ONLY (not the question text)
       - yPercent: top edge of the DIAGRAM ONLY (not the question number or text above it)
       - widthPercent: width of the DIAGRAM ONLY
       - heightPercent: height of the DIAGRAM ONLY
     * The bounding box must TIGHTLY wrap ONLY the visual diagram/chart/graph
     * EXCLUDE: question numbers, question text, margins, page numbers, answer lines
     * Example: For a pie chart, the box should contain only the circular chart and its labels, NOT the question text above it
   - If a question references a diagram but you cannot find the visual diagram, set hasImage: false for that question

6. Unclear text
   If any text cannot be parsed: "[[Unclear text here]]"

7. Do NOT skip incomplete questions
   Include all fragments exactly as shown.

📦 REQUIRED JSON OUTPUT (Return ONLY valid JSON)
{
  "questions": [
    {
      "questionNumber": "1.1",
      "questionText": "Question text with $LaTeX$ math",
      "questionType": "structured",
      "options": null,
      "marks": 5,
      "subQuestionOf": null,
      "section": "A",
      "topic": "Number Theory",
      "difficulty": "medium",
      "hasImage": true,
      "imageDescription": "Brief description of the diagram"
    }
  ],
  "imagesFound": [
    {
      "imageId": "img_1",
      "questionNumber": "1.1",
      "description": "Brief description of the diagram",
      "pageNumber": 1,
      "xPercent": 10,
      "yPercent": 25,
      "widthPercent": 80,
      "heightPercent": 40
    }
  ],
  "totalQuestions": 10,
  "totalMarks": 100,
  "sections": ["A", "B"],
  "topicsFound": ["Algebra", "Geometry", "Number Theory"]
}

⚠️ IMPORTANT
- Extract only questions, no answers
- Use LaTeX for all math
- Maintain exact numbering
- Identify all images/diagrams
- Output only valid JSON
- Be accurate and complete
- No commentary outside the JSON`,
        variables: ["subject", "grade", "paperType", "year"],
        schemaHash: "pdf_question_extractor_v2",
      },
      {
        key: "reference_image_question_generator",
        name: "Reference Image Question Generator",
        category: "question_generation",
        version: "1.0.0",
        promptText: `You are a mathematics education expert creating questions for South African students.
Given {{imageCount}} reference image(s) of mathematical diagrams, you must:
1. Analyze {{analysisScope}} to identify what type of mathematical concept they show
2. Create ONE appropriate question based on the style and concepts shown in the images
3. Determine the correct image type and parameters to generate a similar diagram
4. Provide the correct answer

The question should be appropriate for {{grade}} students.
Topic: {{topic}}
Theme: {{theme}}

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

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown, just the JSON object.`,
        variables: ["imageCount", "analysisScope", "grade", "topic", "theme"],
        schemaHash: "reference_image_question_generator_v1",
      },
    ];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(canonicalPrompts, null, 2),
        },
      ],
    };
  }

  private async handleExtractPastPaperQuestions(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const validated = ExtractPastPaperQuestionsSchema.parse(args);
    const { pdfText, pdfImages, context } = validated;

    console.log(`📄 Extracting questions from past paper: ${context.subject} Grade ${context.grade} (${context.year})`);

    const systemPrompt = `You are a PDF-to-structured-questions extractor.
Your job is to read the attached PDF document and extract all questions with their PRECISE POSITIONS.

📘 PAST PAPER CONTEXT
- Subject: ${context.subject}
- Grade: ${context.grade}
- Paper Type: ${context.paperType}
- Year: ${context.year}

📌 EXTRACTION PROCESS

⚠️ CRITICAL: SKIP MEMORANDUM/ANSWER SECTIONS
- Many PDFs contain BOTH the question paper AND a memorandum (answer sheet)
- The memorandum repeats the same question numbers with answers
- ONLY extract from the QUESTION PAPER section
- SKIP any pages that show: "MEMORANDUM", "MARKING GUIDELINE", "ANSWERS", "MODEL ANSWER"
- If you see answers being provided for questions, you are in the memo - STOP extracting

STEP 1: EXTRACT EACH QUESTION WITH ITS POSITION
For each question in the QUESTION PAPER (not memo):
- Extract the question number exactly as shown (e.g., "1.1", "2.3.1")
- Extract the question text
- Convert ALL mathematical expressions to LaTeX (wrapped in $...$)
- Do NOT include answers, answer lines, or marking guides
- **CRITICAL**: Record the vertical position where this question number appears on the page

STEP 2: DETERMINE IF QUESTION CONTAINS AN IMAGE (STRICT RULES)
Set hasImage=true ONLY when BOTH conditions are met:
1. The question text EXPLICITLY references an image using keywords like:
   - "the diagram below", "the figure shows", "in the graph", "see the table"
   - "shown below", "illustrated", "the following diagram"
2. You can VISUALLY IDENTIFY a clear, non-blank diagram/figure/chart on the page

⚠️ IMAGE ASSIGNMENT RULES:
- If the question does NOT explicitly reference an image → hasImage=false
- If you're uncertain whether an image belongs to a question → hasImage=false
- If the area below the question appears blank or has only text → hasImage=false
- NEVER guess or assume - when in doubt, set hasImage=false
- The admin can manually add images later if needed using the "Add Page" feature

STEP 3: RECORD QUESTION POSITIONS (CRITICAL)
For EVERY question (not just ones with images), you MUST provide:
- pageNumber: Which page image this question appears on (1, 2, 3... sequential index)
- topYPercent: The vertical position (0-100%) where the question NUMBER starts on the page
  - 0% = very top of page
  - 100% = very bottom of page
  - Example: If question "2.3" starts 30% down from the top of the page, topYPercent = 30

📐 MATHEMATICAL EXPRESSIONS
Use LaTeX for ALL math: \\sqrt{64}, \\frac{a}{b}, x^5

📦 REQUIRED JSON OUTPUT (Return ONLY valid JSON)
{
  "questions": [
    {
      "questionNumber": "2.3",
      "questionText": "The figure below shows the net of a solid. What is the name of the solid?",
      "questionType": "multiple-choice",
      "options": ["a) cuboid", "b) triangular prism", "c) cylinder", "d) triangular pyramid"],
      "marks": 1,
      "subQuestionOf": null,
      "section": "A",
      "topic": "Geometry",
      "difficulty": "easy",
      "hasImage": true,
      "imageDescription": "Net diagram showing connected rectangles and triangles",
      "pageNumber": 3,
      "topYPercent": 25
    },
    {
      "questionNumber": "2.4",
      "questionText": "The grade 8s were asked to name their favourite pizza topping...",
      "questionType": "structured",
      "options": null,
      "marks": 2,
      "subQuestionOf": null,
      "section": "A",
      "topic": "Data Handling",
      "difficulty": "easy",
      "hasImage": true,
      "imageDescription": "Pie chart showing pizza topping preferences",
      "pageNumber": 3,
      "topYPercent": 70
    }
  ],
  "totalQuestions": 10,
  "totalMarks": 100,
  "sections": ["A", "B"],
  "topicsFound": ["Algebra", "Geometry", "Data Handling"]
}

⚠️ CRITICAL RULES
- EVERY question MUST have pageNumber and topYPercent fields
- topYPercent is where the QUESTION NUMBER (e.g., "2.3") starts vertically on the page
- Be PRECISE with topYPercent - this determines cropping accuracy

📛 MEMORANDUM RULE (CRITICAL):
- NEVER extract from the memorandum/answer section of the PDF
- If you see "MEMORANDUM", "MARKING GUIDELINE", or answers being shown - STOP
- Only extract from the QUESTION PAPER portion

🖼️ IMAGE RULES (CRITICAL):
- hasImage=true ONLY when the question TEXT explicitly says "diagram", "figure", "graph", etc.
- hasImage=false if you cannot see a clear diagram/chart associated with the question
- hasImage=false when uncertain - the admin can manually add images later
- NEVER assign images to questions that don't explicitly reference them
- Blank or mostly white areas are NOT valid images

- Use LaTeX for all math
- Output only valid JSON, no commentary`;

    try {
      // Helper function to process a batch of images
      const processBatch = async (images: string[], batchNum: number, totalBatches: number, pageOffset: number): Promise<any> => {
        console.log(`📸 Processing batch ${batchNum}/${totalBatches} (${images.length} pages, starting at page ${pageOffset + 1})`);
        
        const imageContent: any[] = images.map((base64Image, index) => ({
          type: "image_url",
          image_url: {
            url: base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`,
            detail: "high"
          }
        }));
        
        const batchPrompt = `${systemPrompt}

BATCH INFORMATION:
- This is batch ${batchNum} of ${totalBatches}
- You are processing pages ${pageOffset + 1} to ${pageOffset + images.length} of the full document
- IMPORTANT: For imagesFound.pageNumber, use the GLOBAL sequential index (${pageOffset + 1} to ${pageOffset + images.length}), NOT the printed page number on the PDF
- Example: If a diagram appears in the 3rd image of this batch and page offset is ${pageOffset}, the pageNumber should be ${pageOffset + 3}

Extract all questions from these pages.`;
        
        const messages: any[] = [{
          role: "user" as const,
          content: [
            { type: "text", text: batchPrompt },
            ...imageContent
          ]
        }];
        
        const response = await this.openai!.chat.completions.create({
          model: "gpt-4o",
          messages,
          max_tokens: 8000,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
        
        const generatedContent = response.choices[0]?.message?.content || "";
        let jsonContent = generatedContent.trim();
        
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        jsonContent = jsonContent
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/[\x00-\x1F\x7F]/g, ' ');
        
        return JSON.parse(jsonContent);
      };
      
      let allQuestions: any[] = [];
      let allImagesFound: any[] = [];
      let allSections: Set<string> = new Set();
      let allTopics: Set<string> = new Set();
      let totalMarks = 0;
      
      if (pdfImages && pdfImages.length > 0) {
        const BATCH_SIZE = 10; // Process 10 pages at a time
        const totalBatches = Math.ceil(pdfImages.length / BATCH_SIZE);
        
        console.log(`📄 Processing ${pdfImages.length} PDF pages in ${totalBatches} batch(es) of up to ${BATCH_SIZE} pages`);
        
        for (let i = 0; i < pdfImages.length; i += BATCH_SIZE) {
          const batchImages = pdfImages.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          
          try {
            const batchResult = await processBatch(batchImages, batchNum, totalBatches, i);
            
            if (batchResult.questions && Array.isArray(batchResult.questions)) {
              allQuestions.push(...batchResult.questions);
            }
            if (batchResult.imagesFound && Array.isArray(batchResult.imagesFound)) {
              allImagesFound.push(...batchResult.imagesFound);
            }
            if (batchResult.sections && Array.isArray(batchResult.sections)) {
              batchResult.sections.forEach((s: string) => allSections.add(s));
            }
            if (batchResult.topicsFound && Array.isArray(batchResult.topicsFound)) {
              batchResult.topicsFound.forEach((t: string) => allTopics.add(t));
            }
            if (batchResult.totalMarks) {
              totalMarks += batchResult.totalMarks;
            }
            
            console.log(`✅ Batch ${batchNum}: Extracted ${batchResult.questions?.length || 0} questions`);
          } catch (batchError) {
            console.error(`❌ Batch ${batchNum} failed:`, batchError);
            // Continue with other batches even if one fails
          }
        }
        
      } else if (pdfText) {
        console.log(`📝 Processing PDF text (${pdfText.length} chars)`);
        const textContent = `${systemPrompt}

📄 PAST PAPER TEXT:
${pdfText.substring(0, 15000)}
${pdfText.length > 15000 ? '... [truncated for processing]' : ''}

Extract all questions now:`;
        
        const messages: any[] = [{ role: "user" as const, content: textContent }];
        
        const response = await this.openai!.chat.completions.create({
          model: "gpt-4o",
          messages,
          max_tokens: 8000,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const generatedContent = response.choices[0]?.message?.content || "";
        let jsonContent = generatedContent.trim();
        
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        jsonContent = jsonContent
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/[\x00-\x1F\x7F]/g, ' ');
        
        const parsed = JSON.parse(jsonContent);
        allQuestions = parsed.questions || [];
        allImagesFound = parsed.imagesFound || [];
        if (parsed.sections) parsed.sections.forEach((s: string) => allSections.add(s));
        if (parsed.topicsFound) parsed.topicsFound.forEach((t: string) => allTopics.add(t));
        totalMarks = parsed.totalMarks || 0;
      } else {
        throw new Error("Either pdfText or pdfImages must be provided");
      }

      if (allQuestions.length === 0) {
        throw new Error('No questions extracted from PDF');
      }

      console.log(`✅ Total extracted: ${allQuestions.length} questions from past paper`);
      
      // Debug logging for question positions (new approach)
      console.log(`\n📍 === QUESTION POSITIONS DEBUG ===`);
      allQuestions.forEach((q: any, idx: number) => {
        const posInfo = q.pageNumber !== undefined && q.topYPercent !== undefined 
          ? `Page ${q.pageNumber}, Y=${q.topYPercent}%`
          : 'NO POSITION DATA';
        console.log(`  Q${q.questionNumber}: ${posInfo} | hasImage=${q.hasImage || false}`);
      });
      console.log(`📍 === END ===\n`);
      
      // Compute imagesFound from questions with hasImage=true
      // SIMPLE APPROACH: Use FULL PAGE for questions with images (no cropping)
      // This is more reliable since GPT-4o cannot provide accurate pixel coordinates
      const questionsWithImages = allQuestions.filter((q: any) => q.hasImage === true);
      console.log(`📷 Found ${questionsWithImages.length} questions with images`);
      
      // For each question with an image, we'll save the FULL PAGE as the image
      // This guarantees the diagram is captured. Admin can crop later if needed.
      const computedImagesFound = questionsWithImages.map((q: any, idx: number) => {
        return {
          imageId: `img_${idx + 1}`,
          questionNumber: q.questionNumber,
          description: q.imageDescription || 'Diagram/image',
          pageNumber: q.pageNumber || 1,
          // FULL PAGE - no cropping (xPercent=0, yPercent=0, width=100, height=100)
          xPercent: 0,
          yPercent: 0,
          widthPercent: 100,
          heightPercent: 100,
          useFullPage: true // Flag to indicate full page should be used
        };
      });
      
      if (computedImagesFound.length > 0) {
        console.log(`\n📄 === QUESTIONS WITH IMAGES (FULL PAGE) ===`);
        computedImagesFound.forEach((img: any) => {
          console.log(`  Q${img.questionNumber}: Page ${img.pageNumber} - using full page image`);
        });
        console.log(`📄 === END ===\n`);
      }

      const combinedResult = {
        questions: allQuestions,
        imagesFound: computedImagesFound,
        totalQuestions: allQuestions.length,
        totalMarks: totalMarks,
        sections: Array.from(allSections),
        topicsFound: Array.from(allTopics),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: 'success',
              data: combinedResult,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('❌ Failed to extract questions:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  private parseGeneratedExerciseJSON(content: string, context: EducationalContext): GeneratedExercise {
    try {
      // Extract JSON from the response (AI may wrap it in markdown code blocks)
      let jsonContent = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Parse the JSON
      let parsed = JSON.parse(jsonContent);
      
      // Handle array responses (OpenAI sometimes returns [object] instead of object)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          throw new Error('Empty array response from AI');
        }
        parsed = parsed[0]; // Take first element
        console.log('📦 Unwrapped array response, using first element');
      }
      
      // Validate required structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid response structure: not an object');
      }
      
      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('Invalid response structure: missing or empty questions array');
      }
      
      // Validate each question has proper separation
      for (let i = 0; i < parsed.questions.length; i++) {
        const q = parsed.questions[i];
        if (!q.question || typeof q.question !== 'string') {
          throw new Error(`Question ${i + 1}: missing question field`);
        }
        
        // Check if solution leaked into question field
        const questionText = q.question.toLowerCase();
        if (questionText.includes('step 1:') || 
            questionText.includes('step 2:') ||
            (questionText.match(/\s=\s/g) || []).length > 2) { // More than 2 equals signs suggests worked solution
          console.warn(`⚠️ Question ${i + 1} may contain leaked solution steps:`, q.question.substring(0, 100));
          // Don't fail - just warn. The prompt should prevent this with gpt-4o
        }
      }
      
      // Transform to expected format
      const exercise: GeneratedExercise = {
        id: `exercise_${Date.now()}`,
        title: parsed.title || 'Generated Exercise',
        description: parsed.description || '',
        questions: parsed.questions.map((q: any, index: number) => ({
          id: `q${index + 1}`,
          question: q.question, // ONLY the question text - solution is separate!
          answer: q.solution || q.answer || '', // Store solution in answer field
          marks: q.marks || 5,
          type: 'short-answer' as const,
        })),
        totalMarks: parsed.totalMarks || 0,
        estimatedDuration: parsed.estimatedDuration || 30,
      };
      
      // Calculate totalMarks if not provided
      if (exercise.totalMarks === 0) {
        exercise.totalMarks = exercise.questions.reduce((sum, q) => sum + q.marks, 0);
      }
      
      // Calculate duration if not provided
      if (exercise.estimatedDuration === 30 && exercise.questions.length > 0) {
        exercise.estimatedDuration = Math.max(30, exercise.questions.length * 6);
      }
      
      console.log('✅ Successfully parsed JSON exercise with', exercise.questions.length, 'questions');
      console.log('📝 Sample question:', exercise.questions[0]?.question?.substring(0, 100));
      console.log('📝 Sample solution:', exercise.questions[0]?.answer?.substring(0, 100));
      
      return exercise;
    } catch (error) {
      console.error('❌ JSON parsing failed:', error);
      console.error('📄 Content that failed to parse:', content.substring(0, 500));
      
      // DO NOT fall back to text parser - throw error instead
      // The text parser has the concatenation bug we're trying to fix
      throw new Error(`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseGeneratedExercise(content: string, context: EducationalContext): GeneratedExercise {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const exercise: GeneratedExercise = {
      id: `exercise_${Date.now()}`,
      title: 'Generated Exercise',
      description: '',
      questions: [],
      totalMarks: 0,
      estimatedDuration: 30,
    };

    let currentQuestion: any = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('Exercise Title:')) {
        exercise.title = trimmed.replace('Exercise Title:', '').trim();
      } else if (trimmed.startsWith('DESCRIPTION:')) {
        exercise.description = trimmed.replace('DESCRIPTION:', '').trim();
      } else if (trimmed.match(/^QUESTION \d+:/)) {
        if (currentQuestion) {
          exercise.questions.push(currentQuestion);
        }
        currentQuestion = {
          id: `q${exercise.questions.length + 1}`,
          question: trimmed.replace(/^QUESTION \d+:/, '').trim(),
          answer: '',
          marks: 5,
          type: 'short-answer' as const,
        };
      } else if (trimmed.startsWith('ANSWER:') && currentQuestion) {
        currentQuestion.answer = trimmed.replace('ANSWER:', '').trim();
      } else if (trimmed.startsWith('MARKS:') && currentQuestion) {
        const marks = parseInt(trimmed.replace('MARKS:', '').trim());
        currentQuestion.marks = isNaN(marks) ? 5 : marks;
      } else if (currentQuestion && 
                 !trimmed.startsWith('ANSWER:') && 
                 !trimmed.startsWith('MARKS:') &&
                 !trimmed.startsWith('Exercise Title:') && 
                 !trimmed.startsWith('DESCRIPTION:') &&
                 !trimmed.match(/^QUESTION \d+:/)) {
        // Continue building the question text
        if (currentQuestion.question) {
          currentQuestion.question += ' ' + trimmed;
        } else {
          currentQuestion.question = trimmed;
        }
      }
    }

    if (currentQuestion) {
      exercise.questions.push(currentQuestion);
    }

    exercise.totalMarks = exercise.questions.reduce((sum, q) => sum + q.marks, 0);
    exercise.estimatedDuration = Math.max(30, exercise.questions.length * 6);

    return exercise;
  }

  private async handleGenerateTutorial(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const { context, improvementAreas = [], targetConcepts = [] } = args;
    
    // Ensure we have valid improvement areas
    const validAreas = Array.isArray(improvementAreas) && improvementAreas.length > 0 
      ? improvementAreas 
      : [`Understanding ${context.topic}`, 'Problem-solving techniques'];

    const prompt = `Generate a comprehensive step-by-step tutorial for a Grade ${context.grade} ${context.subject} student.

TUTORIAL REQUIREMENTS:
- Subject: ${context.subject}
- Grade: ${context.grade}
- Topic: ${context.topic}
- Curriculum: ${context.syllabus}
- Specific improvement areas: ${validAreas.join(', ')}
${targetConcepts ? `- Target concepts: ${targetConcepts.join(', ')}` : ''}

Create a tutorial with MULTIPLE TUTORIAL STEPS, where each step focuses on ONE concept and can be shown on its own screen:

FORMAT YOUR RESPONSE AS JSON:
{
  "title": "Tutorial title focusing on improvement areas",
  "description": "Brief overview of what will be learned",
  "totalSteps": [number of tutorial steps],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "explanation": "Clear explanation of the concept",
      "example": {
        "problem": "Example problem",
        "solution": "Step-by-step solution with detailed working",
        "keyPoint": "Main takeaway from this example"
      },
      "keyFormula": "Important formula or rule (if applicable)",
      "tips": ["Helpful tip 1", "Helpful tip 2"]
    },
    {
      "stepNumber": 2,
      "title": "Next step title", 
      "explanation": "Next concept explanation",
      "example": {
        "problem": "Another example problem",
        "solution": "Step-by-step solution",
        "keyPoint": "Main takeaway"
      },
      "keyFormula": "Another important formula (if applicable)",
      "tips": ["More helpful tips"]
    }
  ]
}

REQUIREMENTS:
- Create 3-5 tutorial steps, each focusing on one specific concept
- Each step should have a clear explanation and worked example
- Examples should be directly related to the student's improvement areas
- Keep explanations encouraging and build confidence
- Use Grade ${context.grade} appropriate language and complexity
- Align with ${context.syllabus} curriculum standards`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const tutorialContent = response.choices[0]?.message?.content || "";
    const tutorial = this.parseTutorialResponse(tutorialContent, context);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ status: "success", tutorial }, null, 2),
        },
      ],
    };
  }

  private parseTutorialResponse(content: string, context: any): any {
    try {
      // Extract JSON from the response content  
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON content found in response');
      }
      
      const jsonContent = jsonMatch[0];
      const parsedTutorial = JSON.parse(jsonContent);
      
      // Validate and return the tutorial structure with fallbacks
      return {
        id: `tutorial_${Date.now()}`,
        title: parsedTutorial.title || `${context.topic} Tutorial`,
        description: parsedTutorial.description || `Learn ${context.topic} step by step`,
        totalSteps: parsedTutorial.totalSteps || parsedTutorial.steps?.length || 3,
        steps: (parsedTutorial.steps || []).map((step: any, index: number) => ({
          stepNumber: step.stepNumber || index + 1,
          title: step.title || `Step ${index + 1}: ${context.topic}`,
          explanation: step.explanation || `Learn about ${context.topic} concepts and techniques.`,
          example: {
            problem: step.example?.problem || `Example ${context.topic} problem`,
            solution: step.example?.solution || 'Step by step solution will be provided',
            keyPoint: step.example?.keyPoint || `Key learning point about ${context.topic}`
          },
          keyFormula: step.keyFormula || null,
          tips: Array.isArray(step.tips) ? step.tips : ['Practice makes perfect', 'Take your time with each step']
        })),
        context,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.log('Tutorial JSON parsing failed, using fallback structure:', error);
      
      // Create a comprehensive fallback tutorial structure
      return {
        id: `tutorial_${Date.now()}`,
        title: `${context.topic} Tutorial`,
        description: `Learn ${context.topic} step by step`,
        totalSteps: 3,
        steps: [
          {
            stepNumber: 1,
            title: `Introduction to ${context.topic}`,
            explanation: `Welcome to learning ${context.topic}! In this step, you'll understand the fundamental concepts and basic principles.`,
            example: {
              problem: `What is ${context.topic}?`,
              solution: `${context.topic} is an important concept in ${context.subject} that helps students solve problems systematically.`,
              keyPoint: `Understanding the basics is the foundation for mastering ${context.topic}.`
            },
            keyFormula: null,
            tips: ['Read the explanation carefully', 'Try to understand the core concept']
          },
          {
            stepNumber: 2, 
            title: `Practice with ${context.topic}`,
            explanation: `Now let's practice applying ${context.topic} concepts to solve problems step by step.`,
            example: {
              problem: `Practice problem involving ${context.topic}`,
              solution: `Follow these steps: 1) Identify what you know, 2) Determine what you need to find, 3) Apply the appropriate method, 4) Check your answer.`,
              keyPoint: `Practice helps reinforce your understanding of ${context.topic}.`
            },
            keyFormula: null,
            tips: ['Work through examples slowly', 'Check each step of your work']
          },
          {
            stepNumber: 3,
            title: `Mastering ${context.topic}`,
            explanation: `In this final step, you'll learn advanced techniques and common problem-solving strategies for ${context.topic}.`,
            example: {
              problem: `Advanced ${context.topic} application`,
              solution: `Use the techniques you've learned in previous steps, and remember to be systematic in your approach.`,
              keyPoint: `Consistent practice and understanding of fundamentals leads to mastery.`
            },
            keyFormula: null,
            tips: ['Apply what you learned in previous steps', 'Be confident in your abilities']
          }
        ],
        context,
        generatedAt: new Date().toISOString()
      };
    }
  }

  private async handleAssessmentChat(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const { studentQuestion, assessmentContext, questions, feedback } = args;

    // Create a comprehensive context for the AI to understand the assessment
    const questionsContext = questions.map((q: any, index: number) => `
Question ${index + 1}: ${q.question}
Correct Answer: ${q.correctAnswer}
Student's Answer: ${q.studentAnswer}
Marks: ${q.earnedMarks}/${q.marks}
Result: ${q.isCorrect ? 'Correct' : 'Incorrect'}
`).join('\n');

    // Extract question number from student question if it contains "Question X"
    const questionNumberMatch = studentQuestion.match(/Question (\d+)/i);
    const specificQuestionNumber = questionNumberMatch ? questionNumberMatch[1] : null;

    const prompt = `You are an educational AI assistant helping a Grade ${assessmentContext.grade} student understand their ${assessmentContext.assessmentType} performance on "${assessmentContext.title}" in ${assessmentContext.subject} - ${assessmentContext.topic}.

ASSESSMENT OVERVIEW:
- Type: ${assessmentContext.assessmentType}
- Subject: ${assessmentContext.subject}
- Topic: ${assessmentContext.topic}
- Overall Score: ${feedback.overallScore}/${feedback.totalMarks} (${feedback.percentage}%)

QUESTIONS AND ANSWERS:
${questionsContext}

FEEDBACK SUMMARY:
Strengths: ${feedback.strengths.join(', ')}
Areas for Improvement: ${feedback.improvements.join(', ')}

STUDENT'S QUESTION: "${studentQuestion}"

${specificQuestionNumber ? `IMPORTANT: The student is asking specifically about Question ${specificQuestionNumber}. Always refer to this question number in your response.` : ''}

Please provide a helpful, encouraging, and educational response that:
1. Directly answers the student's question
2. Uses specific examples from their assessment
3. Explains concepts clearly at a Grade ${assessmentContext.grade} level
4. Provides constructive guidance for improvement
5. Encourages the student to keep learning
6. References the correct question number when relevant
${specificQuestionNumber ? `7. Focus specifically on Question ${specificQuestionNumber} as mentioned in the student's question` : ''}

Keep your response conversational, supportive, and focused on helping the student understand and improve.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const chatResponse = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try asking your question again.";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "success",
            response: chatResponse,
            context: {
              assessmentType: assessmentContext.assessmentType,
              subject: assessmentContext.subject,
              topic: assessmentContext.topic,
              studentQuestion
            }
          }, null, 2),
        },
      ],
    };
  }

  private async handleVideoLessonChat(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const { studentQuestion, lessonContext, transcript } = args;

    let transcriptSection = '';
    if (transcript) {
      const truncatedTranscript = transcript.length > 8000 ? transcript.substring(0, 8000) + '...[transcript truncated]' : transcript;
      transcriptSection = `

VIDEO TRANSCRIPT:
${truncatedTranscript}

`;
    }

    const prompt = `You are Tsebo, an educational AI assistant helping a Grade ${lessonContext.grade} student understand a video lesson on "${lessonContext.lessonTitle}" in ${lessonContext.subject}.

LESSON CONTEXT:
- Title: ${lessonContext.lessonTitle}
- Subject: ${lessonContext.subject}
- Topic: ${lessonContext.topic}
- Theme: ${lessonContext.theme}
- Grade Level: ${lessonContext.grade}
${lessonContext.description ? `- Description: ${lessonContext.description}` : ''}
${lessonContext.videoLink ? `- Video: ${lessonContext.videoLink}` : ''}
${transcriptSection}
STUDENT'S QUESTION: "${studentQuestion}"

${transcript ? `Use the video transcript above to provide accurate, specific answers based on what was actually said in the video. Quote or reference specific parts of the transcript when relevant.

IMPORTANT: If the student explicitly asks to "see the transcript", "show the transcript", "provide the transcript", or similar requests for the raw transcript text, you MUST output the actual transcript text above (or a substantial portion of it) - do NOT summarize or explain it. Simply format and present the transcript content directly.

` : ''}Please provide a helpful, clear, and educational response that:
1. Directly answers the student's question about the video lesson content
2. Explains concepts clearly at a Grade ${lessonContext.grade} level
3. Provides specific examples related to ${lessonContext.topic} and ${lessonContext.theme}
4. Uses step-by-step explanations when appropriate
5. Connects the concept to real-world applications when relevant
6. Encourages the student to continue learning
${transcript ? '7. References specific parts of the video transcript when answering' : '7. References the video lesson content when helpful'}

Keep your response conversational, supportive, and focused on helping the student understand the lesson material better. Use simple language appropriate for Grade ${lessonContext.grade} students.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const chatResponse = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try asking your question again.";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "success",
            response: chatResponse,
            context: {
              lessonTitle: lessonContext.lessonTitle,
              subject: lessonContext.subject,
              topic: lessonContext.topic,
              theme: lessonContext.theme,
              studentQuestion
            }
          }, null, 2),
        },
      ],
    };
  }

  private async handleVerifyExerciseRelevance(args: {
    transcript: string;
    questions: Array<{ id: number; question: string; answer?: string; marks?: number }>;
    lessonContext: {
      lessonTitle: string;
      subject: string;
      topic?: string;
      theme?: string;
      grade: string;
    };
  }) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const { transcript, questions, lessonContext } = args;

    const truncatedTranscript = transcript.length > 12000 
      ? transcript.substring(0, 12000) + '...[transcript truncated]' 
      : transcript;

    const questionsText = questions.map((q, i) => 
      `Question ${i + 1} (ID: ${q.id}): ${q.question}${q.answer ? `\nExpected Answer: ${q.answer}` : ''}${q.marks ? ` [${q.marks} marks]` : ''}`
    ).join('\n\n');

    const prompt = `You are Tsebo, an educational content quality analyst. Your task is to verify whether exercise questions are relevant to the content covered in a video lesson.

LESSON CONTEXT:
- Title: ${lessonContext.lessonTitle}
- Subject: ${lessonContext.subject}
- Grade Level: ${lessonContext.grade}
${lessonContext.topic ? `- Topic: ${lessonContext.topic}` : ''}
${lessonContext.theme ? `- Theme: ${lessonContext.theme}` : ''}

VIDEO TRANSCRIPT:
${truncatedTranscript}

EXERCISE QUESTIONS TO VERIFY:
${questionsText}

TASK: Analyze each question and determine if it is relevant to the video content. For each question, provide:

1. **Relevance Score**: Rate as "HIGH" (directly covered in video), "PARTIAL" (related but not directly covered), or "LOW" (not covered in video)
2. **Coverage Analysis**: Explain specifically what parts of the transcript (if any) cover the concepts in this question
3. **Missing Topics**: List any concepts in the question that were NOT covered in the video
4. **Suggestions**: Provide actionable suggestions to either:
   - Modify the question to better align with video content, OR
   - Indicate what additional video content would be needed to cover this question

Provide your response in the following JSON format:
{
  "overallAssessment": {
    "summary": "Brief overall assessment of question-video alignment",
    "averageRelevance": "HIGH/PARTIAL/LOW",
    "totalQuestions": number,
    "highRelevance": number,
    "partialRelevance": number,
    "lowRelevance": number
  },
  "questionFeedback": [
    {
      "questionId": number,
      "questionText": "The question text",
      "relevance": "HIGH/PARTIAL/LOW",
      "coverageAnalysis": "Detailed explanation of what video content covers this question",
      "videoReferences": ["Specific quotes or timestamps from transcript that relate to this question"],
      "missingTopics": ["Topics in the question not covered in video"],
      "suggestions": ["Specific suggestions for improvement"]
    }
  ],
  "recommendations": ["Overall recommendations for improving question-video alignment"]
}

Be thorough and specific in your analysis. Reference exact content from the transcript when possible.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const analysisText = response.choices[0]?.message?.content || '{"error": "Failed to generate analysis"}';
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      analysis = {
        error: "Failed to parse AI response",
        rawResponse: analysisText
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "success",
            analysis,
            context: {
              lessonTitle: lessonContext.lessonTitle,
              subject: lessonContext.subject,
              questionsAnalyzed: questions.length
            }
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    // Server lifecycle starts here
    const transport = new StdioServerTransport();
    this.server = new Server(
      {
        name: "educational-ai-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Register tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_exercise",
          description: "Generate educational exercises with questions and answers",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  theme: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  syllabus: { type: "string", enum: ["CAPS", "IEB"] }
                },
                required: ["grade", "subject", "topic", "difficulty", "syllabus"]
              },
              numQuestions: { type: "number", minimum: 1, maximum: 20, default: 5 }
            },
            required: ["context"]
          }
        },
        {
          name: "generate_feedback",
          description: "Generate personalized feedback based on student homework answers",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object", 
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  syllabus: { type: "string" }
                }
              },
              answers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    questionId: { type: "string" },
                    question: { type: "string" },
                    expectedAnswer: { type: "string" },
                    studentAnswer: { type: "string" },
                    isCorrect: { type: "boolean" },
                    points: { type: "number" },
                    maxPoints: { type: "number" }
                  }
                }
              }
            }
          }
        },
        {
          name: "generate_adaptive_exercise",
          description: "Generate adaptive practice exercises based on student performance",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  syllabus: { type: "string" },
                  difficulty: { type: "string" }
                }
              },
              weakAreas: { type: "array", items: { type: "string" } },
              questionCount: { type: "number" }
            }
          }
        },
        {
          name: "generate_tutorial",
          description: "Generate step-by-step tutorial content for learning concepts",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  syllabus: { type: "string" }
                }
              },
              improvementAreas: { type: "array", items: { type: "string" } },
              targetConcepts: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "assessment_chat",
          description: "Interactive chat to help students understand their assessment feedback",
          inputSchema: {
            type: "object",
            properties: {
              studentQuestion: { type: "string" },
              assessmentContext: {
                type: "object",
                properties: {
                  assessmentType: { type: "string" },
                  title: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  grade: { type: "string" }
                }
              },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    question: { type: "string" },
                    correctAnswer: { type: "string" },
                    studentAnswer: { type: "string" },
                    marks: { type: "number" },
                    earnedMarks: { type: "number" },
                    isCorrect: { type: "boolean" }
                  }
                }
              },
              feedback: {
                type: "object",
                properties: {
                  strengths: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } },
                  overallScore: { type: "number" },
                  totalMarks: { type: "number" },
                  percentage: { type: "number" }
                }
              }
            }
          }
        },
        {
          name: "video_lesson_chat",
          description: "Interactive chat to help students understand video lesson content",
          inputSchema: {
            type: "object",
            properties: {
              studentQuestion: { type: "string" },
              lessonContext: {
                type: "object",
                properties: {
                  lessonTitle: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  theme: { type: "string" },
                  grade: { type: "string" },
                  description: { type: "string" },
                  videoLink: { type: "string" }
                }
              }
            }
          }
        },
        {
          name: "get_service_status",
          description: "Get the current status of the Educational AI MCP Server",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "tutorial_chat",
          description: "Interactive chat to help students understand tutorial content step by step",
          inputSchema: {
            type: "object",
            properties: {
              studentQuestion: { type: "string" },
              tutorialContext: {
                type: "object",
                properties: {
                  tutorialTitle: { type: "string" },
                  currentStep: { type: "number" },
                  totalSteps: { type: "number" },
                  stepTitle: { type: "string" },
                  stepContent: { type: "string" },
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" }
                }
              }
            }
          }
        },
        {
          name: "extract_past_paper_questions",
          description: "Extract questions from a past paper PDF text using AI analysis",
          inputSchema: {
            type: "object",
            properties: {
              pdfText: { type: "string", description: "The extracted text content from the PDF" },
              context: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  grade: { type: "string" },
                  paperType: { type: "string" },
                  year: { type: "number" }
                },
                required: ["subject", "grade", "paperType", "year"]
              }
            },
            required: ["pdfText", "context"]
          }
        },
        {
          name: "list_prompts",
          description: "List all canonical AI prompts used by the MCP server",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "verify_exercise_relevance",
          description: "Verify if exercise questions are relevant to video lesson content by comparing with transcript",
          inputSchema: {
            type: "object",
            properties: {
              transcript: { type: "string", description: "The video transcript text" },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    question: { type: "string" },
                    answer: { type: "string" },
                    marks: { type: "number" }
                  },
                  required: ["id", "question"]
                }
              },
              lessonContext: {
                type: "object",
                properties: {
                  lessonTitle: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  theme: { type: "string" },
                  grade: { type: "string" }
                },
                required: ["lessonTitle", "subject", "grade"]
              }
            },
            required: ["transcript", "questions", "lessonContext"]
          }
        }
      ]
    }));

    // Register call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "generate_exercise":
            return await this.handleGenerateExercise(args as any);
          case "generate_feedback":
            return await this.handleGenerateFeedback(args);
          case "generate_adaptive_exercise":
            return await this.handleGenerateAdaptiveExercise(args);
          case "generate_tutorial":
            return await this.handleGenerateTutorial(args);
          case "assessment_chat":
            return await this.handleAssessmentChat(args);
          case "video_lesson_chat":
            return await this.handleVideoLessonChat(args);
          case "tutorial_chat":
            return await this.handleTutorialChat(args);
          case "get_service_status":
            return await this.handleGetServiceStatus();
          case "extract_past_paper_questions":
            return await this.handleExtractPastPaperQuestions(args as any);
          case "list_prompts":
            return await this.handleListPrompts();
          case "verify_exercise_relevance":
            return await this.handleVerifyExerciseRelevance(args as any);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ 
                error: error instanceof Error ? error.message : String(error),
                status: "failed",
                tool: name 
              }, null, 2),
            },
          ],
        };
      }
    });

    await this.server.connect(transport);
    console.log("Educational AI MCP Server started successfully");
  }

  private parseFeedbackResponse(content: string, questions: any[]): ExerciseFeedback {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const feedback: ExerciseFeedback = {
      overall: {
        score: 0,
        percentage: 0,
        grade: 'F',
        strengths: [],
        improvements: [],
      },
      questionAnalysis: [],
    };

    let currentSection = 'overall';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('OVERALL_SCORE:')) {
        const scoreMatch = trimmed.match(/(\d+)\/(\d+)/);
        if (scoreMatch) {
          feedback.overall.score = parseInt(scoreMatch[1]);
        }
      } else if (trimmed.startsWith('OVERALL_PERCENTAGE:')) {
        feedback.overall.percentage = parseInt(trimmed.replace('OVERALL_PERCENTAGE:', '').trim()) || 0;
      } else if (trimmed.startsWith('OVERALL_GRADE:')) {
        feedback.overall.grade = trimmed.replace('OVERALL_GRADE:', '').trim();
      } else if (trimmed === 'STRENGTHS:') {
        currentSection = 'strengths';
      } else if (trimmed === 'IMPROVEMENTS:') {
        currentSection = 'improvements';
      } else if (trimmed === 'QUESTION_FEEDBACK:') {
        currentSection = 'questions';
      } else if (trimmed.startsWith('- ') && currentSection === 'strengths') {
        feedback.overall.strengths.push(trimmed.replace('- ', ''));
      } else if (trimmed.startsWith('- ') && currentSection === 'improvements') {
        feedback.overall.improvements.push(trimmed.replace('- ', ''));
      } else if (trimmed.match(/^Q\d+:/) && currentSection === 'questions') {
        const qMatch = trimmed.match(/^Q(\d+): (Correct|Incorrect) - (\d+)\/(\d+) - (.+)/);
        if (qMatch) {
          const questionIndex = parseInt(qMatch[1]) - 1;
          feedback.questionAnalysis.push({
            questionId: questions[questionIndex]?.id || `q${qMatch[1]}`,
            isCorrect: qMatch[2] === 'Correct',
            points: parseInt(qMatch[3]),
            maxPoints: parseInt(qMatch[4]),
            feedback: qMatch[5],
          });
        }
      }
    }

    // If no question analysis was parsed but we have questions, create basic feedback
    if (feedback.questionAnalysis.length === 0 && questions.length > 0) {
      console.log('⚠️ No question analysis parsed from AI response. Creating fallback feedback...');
      console.log('AI Response Content:', content);
      
      feedback.questionAnalysis = questions.map((q, index) => ({
        questionId: q.id || `q${index + 1}`,
        isCorrect: false, // Default to incorrect since we don't have specific feedback
        points: 0,
        maxPoints: q.marks || 5,
        feedback: `This question needs review. Please check your work and try again.`,
      }));
    }

    // Recalculate overall score based on individual question scores to ensure consistency
    const actualTotalScore = feedback.questionAnalysis.reduce((sum, qf) => sum + qf.points, 0);
    const actualTotalPossible = feedback.questionAnalysis.reduce((sum, qf) => sum + qf.maxPoints, 0);
    
    // Override AI's potentially inconsistent overall score with calculated actual score
    feedback.overall.score = actualTotalScore;
    
    // Recalculate percentage based on actual scores
    if (actualTotalPossible > 0) {
      feedback.overall.percentage = Math.round((actualTotalScore / actualTotalPossible) * 100);
    }

    console.log(`✅ Score consistency check: AI said ${feedback.overall.score}, calculated ${actualTotalScore} - using calculated value`);

    return feedback;
  }

  /**
   * Handle tutorial chat - AI assistance for students during tutorials
   */
  private async handleTutorialChat(args: any) {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
    }

    const { studentQuestion, tutorialContext } = args;

    const prompt = `You are an AI tutor helping a Grade ${tutorialContext.grade} student understand a ${tutorialContext.subject} tutorial step.

CURRENT TUTORIAL CONTEXT:
- Tutorial: ${tutorialContext.tutorialTitle}
- Step ${tutorialContext.currentStep} of ${tutorialContext.totalSteps}: ${tutorialContext.stepTitle}
- Step Content: ${tutorialContext.stepContent}
- Example: ${JSON.stringify(tutorialContext.example, null, 2)}
- Subject: ${tutorialContext.subject}
- Topic: ${tutorialContext.topic}

STUDENT QUESTION: ${studentQuestion}

RESPONSE GUIDELINES:
1. Address the student's specific question directly
2. Use grade-appropriate language and explanations
3. Reference the current tutorial step content when relevant
4. Provide clear, step-by-step explanations
5. Give additional examples if helpful
6. Encourage the student and build confidence
7. Keep responses concise but thorough
8. If the question is off-topic, gently redirect to the tutorial content

Provide a helpful, educational response that supports the student's learning:`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a patient, encouraging AI tutor helping students understand educational content during tutorials."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const answer = response.choices[0]?.message?.content || "I understand your question about this tutorial step. Let me help you work through this concept.";

      return {
        answer,
        context: {
          tutorialStep: tutorialContext.currentStep,
          totalSteps: tutorialContext.totalSteps,
          subject: tutorialContext.subject,
          topic: tutorialContext.topic
        }
      };
    } catch (error) {
      console.error("Error in tutorial chat:", error);
      throw new Error(`Failed to process tutorial chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}

// Run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EducationalAIMCPServer();
  server.run().catch((error) => {
    console.error("Failed to run Educational AI MCP server:", error);
    process.exit(1);
  });
}

export { EducationalAIMCPServer };