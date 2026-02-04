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
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import OpenAI from "openai";
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
/**
 * Educational AI MCP Server Class
 */
class EducationalAIMCPServer {
    openai = null;
    server;
    
    // SINGLE SOURCE OF TRUTH: Actual working prompt templates
    static PROMPT_TEMPLATES = {
        HOMEWORK_GRADING_ASSISTANT: {
            template: `Grade the following homework submission for {{subject}} (CAPS curriculum, Grade {{grade}}) under the topic {{topic}} and theme {{theme}}.

The question was:
"{{question}}"

The student answered:
"{{student_answer}}"
{{#if student_answer_image}}
NOTE: The student provided an image showing their work. Please analyze the image to extract and evaluate their answer, including all working steps shown.
{{/if}}

The correct answer is:
"{{correct_answer}}"

Provide a score out of {{total_marks}} marks and write feedback directly to the learner. Your feedback should explain clearly and in an encouraging way:

What the learner did well

Any mistakes or misconceptions in their work

How they can improve next time

Critical Rule: In alignment with CAPS assessment principles, do not award full marks if the learner only provides the final answer without showing their working steps. Award a maximum of 1 mark if the final answer is correct but no working is shown. Marks must always reflect both the process and the correctness.
If the student did not receive full marks, set isCorrect to partial in the response

You MUST return ONLY valid JSON in this exact format:
{
  "isCorrect": true/false/partial,
  "awardedMarks": number,
  "explanation": "detailed explanation",
  "feedback": "constructive feedback"
}`,
            variables: ["correct_answer", "grade", "question", "student_answer", "student_answer_image", "subject", "theme", "topic", "total_marks"],
            key: "homework_grading_assistant",
            name: "Homework Grading Assistant",
            category: "grading",
            version: "1.0.0",
            schemaHash: "homework_grading_v2"
        }
    };

    constructor() {
        this.server = new Server({
            name: "educational-ai-mcp",
            version: "1.0.0",
        }, {
            capabilities: {
                resources: {},
                tools: {},
            },
        });
        // Initialize OpenAI if API key is available
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            console.log("✅ Educational AI MCP Server initialized with OpenAI API");
        }
        else {
            console.warn("⚠️ OpenAI API key not found. Server will run but tools will fail without authentication.");
        }
        this.setupHandlers();
    }
    setupHandlers() {
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
                    description: "Generate step-by-step tutorial content with detailed explanations, examples, and interactive guidance for specific educational topics",
                    inputSchema: {
                        type: "object",
                        properties: {
                            context: {
                                type: "object",
                                properties: {
                                    grade: { type: "string", description: "Student grade level" },
                                    subject: { type: "string", description: "Subject area" },
                                    topic: { type: "string", description: "Topic to teach" },
                                    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                                    syllabus: { type: "string", enum: ["CAPS", "IEB"] },
                                },
                                required: ["grade", "subject", "topic", "difficulty", "syllabus"],
                            },
                            improvementAreas: {
                                type: "array",
                                items: { type: "string" },
                                description: "Specific areas the student needs to improve"
                            },
                            targetConcepts: {
                                type: "array", 
                                items: { type: "string" },
                                description: "Key concepts to focus on in the tutorial"
                            },
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
                    name: "get_service_status",
                    description: "Get the current status and configuration of the Educational AI service",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "list_prompts",
                    description: "List all canonical AI prompts used in the Educational AI system",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "tutorial_chat",
                    description: "Interactive tutorial chat for answering student questions about specific tutorial steps and examples",
                    inputSchema: {
                        type: "object",
                        properties: {
                            studentQuestion: { type: "string", description: "The student's question about the tutorial" },
                            tutorialContext: {
                                type: "object",
                                properties: {
                                    tutorialTitle: { type: "string" },
                                    currentStep: { type: "number" },
                                    totalSteps: { type: "number" },
                                    stepTitle: { type: "string" },
                                    stepContent: { type: "string" },
                                    example: { type: "object" },
                                    grade: { type: "string" },
                                    subject: { type: "string" },
                                    topic: { type: "string" },
                                },
                                required: ["tutorialTitle", "currentStep", "totalSteps", "stepTitle", "stepContent", "grade", "subject", "topic"],
                            },
                        },
                        required: ["studentQuestion", "tutorialContext"],
                    },
                },
                {
                    name: "assessment_chat",
                    description: "Interactive assessment chat for students to ask questions about their homework or exercise feedback",
                    inputSchema: {
                        type: "object",
                        properties: {
                            studentQuestion: { type: "string", description: "The student's question about their assessment feedback" },
                            assessmentContext: {
                                type: "object",
                                properties: {
                                    assessmentType: { type: "string", enum: ["homework", "exercise"] },
                                    title: { type: "string" },
                                    subject: { type: "string" },
                                    topic: { type: "string" },
                                    grade: { type: "string" },
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
                    model: "gpt-4o-mini",
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
                        return await this.handleGenerateExercise(args);
                    case "generate_feedback":
                        return await this.handleGenerateFeedback(args);
                    case "generate_tutorial":
                        return await this.handleGenerateTutorial(args);
                    case "generate_adaptive_exercise":
                        return await this.handleGenerateAdaptiveExercise(args);
                    case "get_service_status":
                        return await this.handleGetServiceStatus();
                    case "list_prompts":
                        return await this.handleListPrompts();
                    case "tutorial_chat":
                        return await this.handleTutorialChat(args);
                    case "assessment_chat":
                        return await this.handleAssessmentChat(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
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
    async handleGenerateExercise(args) {
        if (!this.openai) {
            throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
        }
        const validated = GenerateExerciseSchema.parse(args);
        const { context, numQuestions, includeAnswers } = validated;
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
- Include clear, concise questions
${includeAnswers ? '- Provide complete answers with working steps' : '- Do not include answers'}

OUTPUT FORMAT:
Exercise Title: [Title]
DESCRIPTION: [Brief description]
QUESTION 1:
[Question text]
${includeAnswers ? 'ANSWER: [Complete answer with steps]\nMARKS: [Number of marks]' : 'MARKS: [Number of marks]'}

QUESTION 2:
[Question text]
${includeAnswers ? 'ANSWER: [Complete answer with steps]\nMARKS: [Number of marks]' : 'MARKS: [Number of marks]'}

Continue for all ${numQuestions} questions...

Generate educational content that challenges students while being appropriate for their grade level.`;
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
            temperature: 0.7,
        });
        const generatedContent = response.choices[0]?.message?.content || "";
        const exercise = this.parseGeneratedExercise(generatedContent, validated.context);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(exercise, null, 2),
                },
            ],
        };
    }
    async handleGenerateFeedback(args) {
        if (!this.openai) {
            throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
        }
        const validated = GenerateFeedbackSchema.parse(args);
        const { exercise, studentAnswers, context } = validated;
        
        console.log('🔄 Using per-question evaluation approach');
        
        // Evaluate each question individually for consistent results
        const questionFeedback = [];
        let totalScore = 0;
        let totalMaxScore = 0;
        
        for (let i = 0; i < exercise.questions.length; i++) {
            const question = exercise.questions[i];
            const studentAnswer = studentAnswers[i] || 'No answer provided';
            totalMaxScore += question.marks;
            
            // Use the actual working prompt template (SINGLE SOURCE OF TRUTH)
            const promptTemplate = EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.template;
            const prompt = promptTemplate
                .replace(/\{\{subject\}\}/g, context.subject)
                .replace(/\{\{grade\}\}/g, context.grade)
                .replace(/\{\{topic\}\}/g, context.topic || 'General')
                .replace(/\{\{theme\}\}/g, context.theme || 'General')
                .replace(/\{\{question\}\}/g, question.question)
                .replace(/\{\{student_answer\}\}/g, studentAnswer)
                .replace(/\{\{correct_answer\}\}/g, question.answer)
                .replace(/\{\{total_marks\}\}/g, question.marks.toString());

            try {
                const response = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 500,
                    temperature: 0, // Deterministic grading
                    response_format: { type: "json_object" }
                });
                
                const content = response.choices[0]?.message?.content || "";
                console.log(`📥 Raw AI response for question ${i + 1}:`, content);
                
                const questionResult = JSON.parse(content);
                console.log(`✅ Parsed grading result:`, questionResult);
                
                // CAPS Curriculum: Respect AI grading that considers working steps
                // No override - let AI grading stand based on CAPS assessment principles
                console.log(`✅ CAPS-based grading result: ${questionResult.awardedMarks}/${question.marks} marks`);
                
                // Build question feedback
                const feedback = {
                    questionId: question.id,
                    isCorrect: questionResult.isCorrect,
                    score: questionResult.awardedMarks,
                    maxScore: question.marks,
                    feedback: questionResult.feedback || questionResult.explanation
                };
                
                questionFeedback.push(feedback);
                totalScore += questionResult.awardedMarks;
                
            } catch (error) {
                console.error(`❌ Error grading question ${i + 1}:`, error);
                // Fallback for individual question
                questionFeedback.push({
                    questionId: question.id,
                    isCorrect: false,
                    score: 0,
                    maxScore: question.marks,
                    feedback: "Unable to grade this question. Please try again."
                });
            }
        }
        
        // Compute overall results deterministically
        const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
        const grade = this.getLetterGrade(percentage);
        
        console.log(`📊 All question results:`, questionFeedback);
        
        const feedback = {
            overall: {
                score: totalScore,
                percentage: percentage,
                grade: grade,
                strengths: this.generateStrengths(questionFeedback),
                improvements: this.generateImprovements(questionFeedback, context)
            },
            questionFeedback: questionFeedback
        };
        
        console.log(`✅ Final per-question feedback:`, feedback);
        
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(feedback, null, 2),
                },
            ],
        };
    }
    async handleGenerateAdaptiveExercise(args) {
        if (!this.openai) {
            throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
        }
        const validated = AdaptiveExerciseSchema.parse(args);
        const { context, feedbackContext, numQuestions } = validated;
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

CRITICAL: You MUST respond with ONLY valid JSON in this exact format. Do not include any additional text before or after the JSON.

{
  "title": "[Targeted title addressing weak areas]",
  "description": "[Description explaining how this exercise addresses student weaknesses]",
  "questions": [
    {
      "id": "q1",
      "question": "[Complete question with mathematical expression]",
      "answer": "[Complete answer with detailed steps]",
      "marks": [number],
      "type": "short-answer"
    }
  ]
}

🚨🚨🚨 ABSOLUTE CRITICAL RULE - NEVER BREAK THIS 🚨🚨🚨

DO NOT PUT SOLUTION STEPS IN THE QUESTION FIELD. EVER.

❌ FORBIDDEN EXAMPLES (DO NOT DO THIS):
- "Solve for x: 2(x + 3) = 10 2x + 6 = 10 2x = 4 x = 2"
- "Solve for x: 5(x - 2) = 15 5x - 10 = 15 5x = 25 x = 5"
- "Simplify: 3x + 2y - 5x + 4y = -2x + 6y"

✅ REQUIRED FORMAT - ALWAYS DO THIS:
{
  "question": "Solve for x: 2(x + 3) = 10",
  "answer": "2x + 6 = 10\n2x = 4\nx = 2"
}

{
  "question": "Solve for x: 5(x - 2) = 15", 
  "answer": "5x - 10 = 15\n5x = 25\nx = 5"
}

THE QUESTION FIELD MUST END IMMEDIATELY AFTER THE EQUATION TO SOLVE.
NO WORKING STEPS. NO SOLUTIONS. NO INTERMEDIATE CALCULATIONS.

Generate exactly ${numQuestions} questions targeting the identified weaknesses.

Respond with ONLY the JSON object, no additional text.`;
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
            temperature: 0.7,
        });
        const generatedContent = response.choices[0]?.message?.content || "";
        const exercise = this.parseGeneratedExercise(generatedContent, validated.context);
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

    async handleGenerateTutorial(args) {
        if (!this.openai) {
            throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
        }

        const { context, improvementAreas, targetConcepts = [] } = args;
        
        const prompt = `Generate comprehensive step-by-step tutorial content for Grade ${context.grade} ${context.subject} on the topic "${context.topic}".

STUDENT NEEDS:
- Improvement Areas: ${improvementAreas.join(', ')}
- Target Concepts: ${targetConcepts.join(', ') || 'General understanding'}
- Difficulty Level: ${context.difficulty}
- Curriculum: ${context.syllabus}

TUTORIAL REQUIREMENTS:
- Create 3 detailed learning steps
- Each step must have: detailed explanation, worked example with problem/solution/key takeaway, and helpful tips
- Focus on addressing the specific improvement areas: ${improvementAreas.join(', ')}
- Use clear, encouraging language appropriate for Grade ${context.grade}
- Include interactive elements and practical examples

You MUST return ONLY valid JSON in this exact format:

{
  "id": "tutorial_[timestamp]",
  "title": "[Engaging tutorial title]",
  "description": "[Brief description of what students will learn]",
  "totalSteps": 3,
  "steps": [
    {
      "stepNumber": 1,
      "title": "[Step title like 'Understanding the Basics']",
      "explanation": "[Detailed 3-4 sentence explanation of the concept]",
      "keyFormula": "[Optional: key formula if applicable]",
      "example": {
        "problem": "[Clear, specific problem statement]",
        "solution": "[Step-by-step solution with line breaks]",
        "keyPoint": "[Main learning takeaway from this example]"
      },
      "tips": [
        "[Practical tip 1]",
        "[Practical tip 2]",
        "[Practical tip 3]"
      ]
    },
    {
      "stepNumber": 2,
      "title": "[Step 2 title like 'Working Through Examples']",
      "explanation": "[Detailed explanation building on step 1]",
      "keyFormula": "[Optional formula]",
      "example": {
        "problem": "[More complex problem]",
        "solution": "[Detailed solution with reasoning]",
        "keyPoint": "[Key insight from this step]"
      },
      "tips": [
        "[Helpful tip 1]",
        "[Helpful tip 2]",
        "[Helpful tip 3]"
      ]
    },
    {
      "stepNumber": 3,
      "title": "[Step 3 title like 'Mastering the Technique']",
      "explanation": "[Advanced explanation and real-world application]",
      "keyFormula": "[Optional formula]",
      "example": {
        "problem": "[Challenge problem]",
        "solution": "[Complete solution showing mastery]",
        "keyPoint": "[Final key concept to remember]"
      },
      "tips": [
        "[Advanced tip 1]",
        "[Advanced tip 2]",
        "[Study tip 3]"
      ]
    }
  ],
  "targetedWeaknesses": ${JSON.stringify(improvementAreas)},
  "estimatedDuration": 20
}

Generate educational content that is engaging, clear, and specifically addresses the improvement areas. Make each step build upon the previous one with increasing complexity.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3000,
            temperature: 0.7,
        });

        const generatedContent = response.choices[0]?.message?.content || "";
        
        try {
            // Parse the JSON response
            const tutorialData = JSON.parse(generatedContent);
            
            // Add metadata
            tutorialData.id = tutorialData.id || `tutorial_${Date.now()}`;
            tutorialData.createdAt = new Date().toISOString();
            tutorialData.context = context;
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tutorialData, null, 2),
                    },
                ],
            };
        } catch (error) {
            console.error('Failed to parse tutorial JSON:', error);
            console.error('Generated content:', generatedContent);
            throw new Error(`Failed to generate valid tutorial JSON: ${error.message}`);
        }
    }

    async handleGetServiceStatus() {
        const status = {
            serviceName: "Educational AI MCP Server",
            version: "1.0.0",
            status: this.openai ? "operational" : "no-api-key",
            apiConfigured: !!process.env.OPENAI_API_KEY,
            model: "gpt-4o-mini",
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

    async handleListPrompts() {
        // Define canonical prompts used in the MCP server
        const canonicalPrompts = [
            {
                key: EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.key,
                name: EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.name,
                category: EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.category,
                version: EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.version,
                promptText: EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.template,
                variables: EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.variables,
                schemaHash: EducationalAIMCPServer.PROMPT_TEMPLATES.HOMEWORK_GRADING_ASSISTANT.schemaHash,
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
                version: "1.0.0",
                promptText: `You are a PDF-to-structured-questions extractor.
Your job is to read the provided PDF content and extract only the questions, cleanly and accurately.

PAST PAPER CONTEXT:
- Subject: {{subject}}
- Grade: {{grade}}
- Paper Type: {{paperType}}
- Year: {{year}}

PAST PAPER TEXT:
{{pdfText}}

REQUIREMENTS:
1. Do NOT include answers or answer lines - extract ONLY the questions
2. Reproduce all mathematical expressions using correct LaTeX notation:
   - Square roots: \\sqrt{64}
   - Cube roots: \\sqrt[3]{27}
   - Fractions: \\frac{a}{b}
   - Exponents: x^5, (3ab)^2
   - Wrap math in $ symbols, e.g., $\\sqrt{64} + \\sqrt{36}$
3. Preserve question numbering exactly (e.g., 1.1, 1.2, QUESTION 2, etc.)
4. Preserve multiple-choice formatting exactly - show options a), b), c), d) clearly
5. If an image/diagram is referenced in the question, write: "[Diagram: brief description]"
6. Do not skip incomplete or partial questions
7. If text is unclear, output: "[[Unclear text here]]"

REQUIRED JSON FORMAT - Return ONLY valid JSON:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "Main question text with $LaTeX$ math expressions",
      "questionType": "structured",
      "options": null,
      "marks": 8,
      "subQuestionOf": null,
      "section": "A",
      "topic": "Number Theory",
      "difficulty": "medium"
    }
  ],
  "totalQuestions": 10,
  "totalMarks": 100,
  "sections": ["A", "B"],
  "topicsFound": ["Number Theory", "Algebra", "Geometry"]
}

IMPORTANT:
- Extract ONLY questions, no answers
- Use LaTeX for ALL mathematical expressions
- Preserve exact question numbering
- Be accurate and complete`,
                variables: ["subject", "grade", "paperType", "year", "pdfText"],
                schemaHash: "pdf_question_extractor_v1",
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
    
    /**
     * Normalize answers for mathematical equivalence checking
     */
    normalizeAnswer(answer) {
        if (!answer || typeof answer !== 'string') return '';
        
        return answer
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '') // Remove all spaces
            .replace(/[^\w=+\-*/().^0-9]/g, '') // Keep only alphanumeric, operators, parentheses
            .replace(/x=/gi, '') // Remove variable assignments like "x="
            .replace(/=/g, '') // Remove equals signs
            .replace(/cm²|cm2|cm\^2/gi, '') // Remove units
            .replace(/degrees?|°/gi, ''); // Remove angle units
    }
    
    /**
     * Convert percentage to letter grade
     */
    getLetterGrade(percentage) {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    /**
     * Generate strengths based on correct answers
     */
    generateStrengths(questionFeedback) {
        const correctCount = questionFeedback.filter(q => q.isCorrect).length;
        const totalCount = questionFeedback.length;
        
        if (correctCount === 0) {
            return ["Keep practicing! Every attempt helps you learn."];
        }
        
        const strengths = [];
        if (correctCount === totalCount) {
            strengths.push("Excellent work! You answered all questions correctly.");
        } else if (correctCount >= totalCount * 0.7) {
            strengths.push("Great job! You got most questions right.");
        } else {
            strengths.push(`You correctly answered ${correctCount} out of ${totalCount} questions.`);
        }
        
        return strengths;
    }
    
    /**
     * Generate improvement suggestions based on incorrect answers
     */
    generateImprovements(questionFeedback, context) {
        const incorrectQuestions = questionFeedback.filter(q => !q.isCorrect);
        
        if (incorrectQuestions.length === 0) {
            return ["Continue practicing to maintain this excellent performance!"];
        }
        
        const improvements = [];
        const subject = context.subject || 'mathematics';
        
        if (subject.includes('mathematics') || subject.includes('math')) {
            improvements.push("Understanding how to solve linear equations");
            improvements.push("Applying the distributive property correctly");
            improvements.push("Identifying and setting up equations for word problems");
        } else {
            improvements.push("Review the fundamental concepts covered in this assignment");
            improvements.push("Practice step-by-step problem solving");
            improvements.push("Check your work for calculation errors");
        }
        
        return improvements.slice(0, 3); // Limit to 3 suggestions
    }
    
    parseGeneratedExercise(content, context) {
        try {
            // Parse the JSON response directly
            const parsedContent = JSON.parse(content.trim());
            
            const exercise = {
                id: `exercise_${Date.now()}`,
                title: parsedContent.title || 'Generated Exercise',
                description: parsedContent.description || '',
                questions: [],
                totalMarks: 0,
                estimatedDuration: 30,
            };

            // Process each question from the JSON
            if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
                parsedContent.questions.forEach((q, index) => {
                    const question = {
                        id: q.id || `q${index + 1}`,
                        question: q.question || '',
                        answer: q.answer || '',
                        marks: parseInt(q.marks) || 5,
                        type: q.type || 'short-answer',
                    };
                    
                    // Basic validation - ensure question has content
                    if (question.question.trim()) {
                        exercise.questions.push(question);
                    }
                });
            }

            // Calculate total marks and duration
            exercise.totalMarks = exercise.questions.reduce((sum, q) => sum + q.marks, 0);
            exercise.estimatedDuration = Math.max(30, exercise.questions.length * 6);
            return exercise;
            
        } catch (error) {
            console.error('❌ Failed to parse JSON response:', error);
            console.error('Raw content:', content);
            
            // Fallback to basic exercise with error info
            return {
                id: `exercise_${Date.now()}`,
                title: 'Exercise Generation Error',
                description: 'Failed to parse generated exercise. Please try again.',
                questions: [{
                    id: 'error_q1',
                    question: 'Error generating questions. Please refresh and try again.',
                    answer: 'N/A',
                    marks: 5,
                    type: 'short-answer'
                }],
                totalMarks: 5,
                estimatedDuration: 30,
            };
        }
    }
    parseFeedbackResponse(content, questions) {
        console.log('📥 Raw AI response for MCP feedback:', content);
        
        try {
            // Parse the single JSON object returned by AI
            const aiResponse = JSON.parse(content);
            console.log('✅ Successfully parsed complete AI JSON response:', aiResponse);
            
            // Validate the response has the expected structure
            if (!aiResponse.overall || !aiResponse.questionFeedback) {
                throw new Error('Invalid response structure: missing overall or questionFeedback');
            }
            
            // Return the AI response directly since it matches our expected format
            console.log('📊 Final MCP feedback structure:', aiResponse);
            return aiResponse;
            
        } catch (error) {
            console.error('❌ Failed to parse AI JSON response:', error);
            console.error('Raw content that failed:', content);
            
            // Fallback: create a basic response structure
            const totalMaxScore = questions.reduce((sum, q) => sum + q.marks, 0);
            const fallbackResponse = {
                overall: {
                    score: 0,
                    percentage: 0,
                    grade: 'F',
                    strengths: ['Unable to process AI response'],
                    improvements: ['Please try again - AI response parsing failed'],
                },
                questionFeedback: questions.map(q => ({
                    questionId: q.id,
                    isCorrect: false,
                    score: 0,
                    maxScore: q.marks,
                    feedback: 'AI response parsing failed - please try again'
                }))
            };
            
            console.log('🔄 Using fallback response structure:', fallbackResponse);
            return fallbackResponse;
        }
    }
    
    /**
     * Handle tutorial chat for interactive student questions about specific tutorial steps
     */
    async handleTutorialChat(args) {
        if (!this.openai) {
            throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
        }

        const { studentQuestion, tutorialContext } = args;
        
        // Create a focused prompt for tutorial assistance
        const prompt = `You are a helpful educational AI tutor assisting a Grade ${tutorialContext.grade} student with ${tutorialContext.subject}. 

TUTORIAL CONTEXT:
- Tutorial: "${tutorialContext.tutorialTitle}"
- Current Step: ${tutorialContext.currentStep} of ${tutorialContext.totalSteps}
- Step Title: "${tutorialContext.stepTitle}"
- Topic: ${tutorialContext.topic}
- Subject: ${tutorialContext.subject}
- Grade: ${tutorialContext.grade}

STEP CONTENT:
${tutorialContext.stepContent}

${tutorialContext.example ? `WORKED EXAMPLE:
${JSON.stringify(tutorialContext.example, null, 2)}` : ''}

STUDENT QUESTION: "${studentQuestion}"

Provide a helpful, encouraging response that:
1. Directly addresses their specific question
2. Relates to the current tutorial step and content
3. Uses grade-appropriate language for Grade ${tutorialContext.grade}
4. Encourages learning and understanding
5. Provides examples or clarification when helpful
6. Keeps the response focused and concise (2-3 paragraphs max)

Be supportive and guide them through the concept rather than just giving answers.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.7,
        });

        const answer = response.choices[0]?.message?.content || "I understand your question. Let me help you with this tutorial step.";

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        answer: answer,
                        context: {
                            step: tutorialContext.currentStep,
                            topic: tutorialContext.topic,
                            responded: true
                        }
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Handle assessment chat for interactive student questions about homework/exercise feedback
     */
    async handleAssessmentChat(args) {
        if (!this.openai) {
            throw new Error("OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.");
        }

        const { studentQuestion, assessmentContext, questions, feedback } = args;
        
        // Create a focused prompt for assessment assistance
        const prompt = `You are a helpful educational AI tutor assisting a Grade ${assessmentContext.grade} student with questions about their ${assessmentContext.assessmentType} feedback.

ASSESSMENT CONTEXT:
- Type: ${assessmentContext.assessmentType}
- Title: "${assessmentContext.title}"
- Subject: ${assessmentContext.subject}
- Topic: ${assessmentContext.topic}
- Grade: ${assessmentContext.grade}

ASSESSMENT PERFORMANCE:
- Overall Score: ${feedback.overallScore}/${feedback.totalMarks} (${feedback.percentage}%)
- Strengths: ${feedback.strengths.join(', ')}
- Areas for Improvement: ${feedback.improvements.join(', ')}

QUESTIONS & STUDENT PERFORMANCE:
${questions.map((q, index) => `
Question ${index + 1}: ${q.question}
Student Answer: "${q.studentAnswer}"
Correct Answer: "${q.correctAnswer}"
Score: ${q.earnedMarks}/${q.marks} (${q.isCorrect ? 'Correct' : 'Incorrect'})
`).join('\n')}

STUDENT QUESTION: "${studentQuestion}"

Provide a helpful, encouraging response that:
1. Directly addresses their specific question about the feedback or their performance
2. Uses grade-appropriate language for Grade ${assessmentContext.grade}
3. Explains concepts clearly and provides examples when helpful
4. Encourages learning and improvement
5. Relates specifically to their performance and the subject matter
6. Keeps the response focused and supportive (2-3 paragraphs max)

Be supportive and guide them through understanding their feedback and improving their skills.`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 600,
            temperature: 0.7,
        });

        const answer = response.choices[0]?.message?.content || "I understand your question about the feedback. Let me help you understand your performance.";

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        response: answer,
                        context: {
                            assessmentType: assessmentContext.assessmentType,
                            topic: assessmentContext.topic,
                            score: feedback.overallScore,
                            totalMarks: feedback.totalMarks,
                            responded: true
                        }
                    }, null, 2),
                },
            ],
        };
    }

    /**
     * Clean question text to remove any embedded solution steps
     */
    // REMOVED: No longer cleaning questions - using JSON format eliminates parsing ambiguity
    
    // REMOVED: No longer needed with JSON format
    
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log("Educational AI MCP Server running on stdio transport");
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
