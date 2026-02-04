#!/usr/bin/env node

/**
 * Standalone MCP Server Runner
 * 
 * This script runs the Educational AI MCP Server directly without TypeScript compilation.
 * It provides a standardized MCP interface for the educational AI functionality.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Simple MCP server implementation without TypeScript imports
class EducationalAIMCPServer {
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
    
    this.setupHandlers();
    console.log("✅ Educational AI MCP Server initialized");
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "test_connection",
          description: "Test MCP server connection and functionality",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string", default: "Hello MCP" },
            },
          },
        },
        {
          name: "get_educational_status",
          description: "Get the current status of educational AI services",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "generate_basic_exercise",
          description: "Generate basic educational exercises without adaptive context analysis",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string", default: "8" },
                  subject: { type: "string", default: "mathematics" },
                  topic: { type: "string", default: "Algebra" },
                  difficulty: { type: "string", default: "easy" },
                  syllabus: { type: "string", default: "CAPS" },
                },
                required: ["grade", "subject", "topic"]
              },
              numQuestions: { type: "integer", default: 5 }
            },
            required: ["context"]
          },
        },
        {
          name: "generate_feedback",
          description: "Generate AI feedback for student exercise submissions",
          inputSchema: {
            type: "object",
            properties: {
              exercise: {
                type: "object",
                properties: {
                  questions: { type: "array" },
                  title: { type: "string" },
                  totalMarks: { type: "integer" }
                },
                required: ["questions"]
              },
              studentAnswers: { 
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    questionId: { type: "string" },
                    answer: { type: "string" }
                  }
                }
              },
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  difficulty: { type: "string" }
                }
              }
            },
            required: ["exercise", "studentAnswers", "context"]
          },
        },
        {
          name: "generate_adaptive_exercise",
          description: "Generate adaptive exercises targeting specific student weaknesses",
          inputSchema: {
            type: "object",
            properties: {
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  difficulty: { type: "string" },
                  syllabus: { type: "string" }
                }
              },
              improvements: { 
                type: "array",
                items: { type: "string" }
              },
              numQuestions: { type: "integer", default: 5 }
            },
            required: ["context", "improvements"]
          },
        },
        {
          name: "generate_tutorial",
          description: "Generate personalized tutorial content with explanations and practice based on student feedback",
          inputSchema: {
            type: "object",
            properties: {
              homeworkFeedback: {
                type: "object",
                properties: {
                  strengths: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } }
                },
                required: ["strengths", "improvements"]
              },
              context: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  subject: { type: "string" },
                  topic: { type: "string" },
                  difficulty: { type: "string" },
                  syllabus: { type: "string" }
                },
                required: ["grade", "subject", "topic", "difficulty", "syllabus"]
              },
              specificWeakness: { type: "string" }
            },
            required: ["homeworkFeedback", "context"]
          },
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
            },
            required: ["studentQuestion", "assessmentContext", "questions", "feedback"]
          },
        },
      ],
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "educational-ai://service/info",
          name: "Service Information",
          description: "Information about the Educational AI MCP server",
          mimeType: "application/json",
        },
      ],
    }));

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === "educational-ai://service/info") {
        const info = {
          serviceName: "Educational AI MCP Server",
          version: "1.0.0",
          description: "MCP server providing educational AI capabilities",
          status: "operational",
          capabilities: [
            "exercise_generation",
            "feedback_analysis", 
            "adaptive_learning",
            "caps_curriculum_alignment",
          ],
          timestamp: new Date().toISOString(),
        };

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(info, null, 2),
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
          case "test_connection":
            return this.handleTestConnection(args);

          case "get_educational_status":
            return this.handleGetStatus();

          case "generate_basic_exercise":
            return await this.handleGenerateBasicExercise(args);

          case "generate_feedback":
            return await this.handleGenerateFeedback(args);

          case "generate_adaptive_exercise":
            return await this.handleGenerateAdaptiveExercise(args);

          case "generate_tutorial":
            return await this.handleGenerateTutorial(args);

          case "assessment_chat":
            return await this.handleAssessmentChat(args);

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

  handleTestConnection(args) {
    const message = args?.message || "Hello MCP";
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "success",
            message: `MCP server received: ${message}`,
            timestamp: new Date().toISOString(),
            serverInfo: {
              name: "Educational AI MCP Server",
              version: "1.0.0",
              transport: "stdio",
            },
          }, null, 2),
        },
      ],
    };
  }

  handleGetStatus() {
    const status = {
      serviceName: "Educational AI MCP Server",
      version: "1.0.0",
      status: "operational",
      transport: "stdio",
      apiConfigured: !!process.env.OPENAI_API_KEY,
      model: "gpt-3.5-turbo",
      capabilities: {
        exerciseGeneration: true,
        feedbackAnalysis: true,
        adaptiveLearning: true,
        capsAlignment: true,
        multipleSubjects: ["mathematics", "science", "english"],
        gradeLevels: ["8", "9", "10", "11", "12"],
        supportedSyllabi: ["CAPS", "IEB"],
      },
      message: process.env.OPENAI_API_KEY 
        ? "Educational AI MCP Server operational with OpenAI integration"
        : "Educational AI MCP Server requires OPENAI_API_KEY environment variable",
      timestamp: new Date().toISOString(),
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

  async handleGenerateBasicExercise(args) {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    if (!hasApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const context = args?.context || {};
    const numQuestions = args?.numQuestions || 5;

    // Set defaults for the context
    const exerciseContext = {
      grade: context.grade || "8",
      subject: context.subject || "mathematics", 
      topic: context.topic || "Algebra",
      difficulty: context.difficulty || "easy",
      syllabus: context.syllabus || "CAPS"
    };

    // Use OpenAI to generate exercise
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Generate a ${exerciseContext.subject} exercise for Grade ${exerciseContext.grade} students on the topic of ${exerciseContext.topic} with VARYING DIFFICULTY LEVELS.

Context:
- Grade: ${exerciseContext.grade}
- Subject: ${exerciseContext.subject}
- Topic: ${exerciseContext.topic}
- Base Difficulty: ${exerciseContext.difficulty}
- Syllabus: ${exerciseContext.syllabus}

🚨 CRITICAL REQUIREMENT: KEEP QUESTION AND SOLUTION COMPLETELY SEPARATE!

QUESTION FIELD rules:
- ONLY include the problem statement/question to solve
- NEVER include solution steps in the question field
- NEVER include answers in the question field

SOLUTION FIELD rules:
- ONLY include the step-by-step solution
- Show complete working and explanations

EXAMPLES:
❌ WRONG: "question": "Solve for x: 3x + 5 = 17. 3x = 12, x = 4"
✅ CORRECT: "question": "Solve for x: 3x + 5 = 17", "solution": "Step 1: 3x + 5 = 17\\nStep 2: 3x = 17 - 5\\nStep 3: 3x = 12\\nStep 4: x = 4"

Requirements:
- Create exactly ${numQuestions} questions with MIXED DIFFICULTY LEVELS:
  * Easy questions: Simple, direct application of concepts
  * Medium questions: Multi-step problems requiring deeper understanding
  * Difficult questions: Complex problems requiring analysis and synthesis
- Distribute questions across all three difficulty levels
- Each question should be appropriate for Grade ${exerciseContext.grade} level
- Align with ${exerciseContext.syllabus} curriculum standards
- Include clear, step-by-step solutions
- Provide marking schemes with point allocations
- Focus on fundamental concepts without adaptive context analysis

Format your response as JSON:
{
  "title": "Exercise title with Mixed Difficulty Levels",
  "description": "Brief description highlighting the varied difficulty of questions",
  "totalMarks": total_marks_number,
  "questions": [
    {
      "questionNumber": 1,
      "question": "ONLY the problem statement - NO SOLUTION STEPS HERE",
      "difficulty": "easy|medium|difficult",
      "marks": marks_for_question,
      "solution": "Step-by-step solution - SEPARATE from question",
      "markingScheme": ["Point 1 (X marks)", "Point 2 (Y marks)"]
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const exerciseData = JSON.parse(response.choices[0].message.content);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            exercise: exerciseData,
            context: exerciseContext,
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to generate basic exercise: ${error.message}`);
    }
  }

  async handleGenerateFeedback(args) {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    if (!hasApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { exercise, studentAnswers, context } = args;

    const questionsWithAnswers = exercise.questions.map(q => {
      const studentAnswer = studentAnswers.find(a => a.questionId === q.id);
      return {
        ...q,
        studentAnswer: studentAnswer?.answer || 'No answer provided'
      };
    });

    // Use OpenAI to generate feedback
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `You are an expert ${context.subject} teacher specializing in ${context.topic} within ${context.theme || context.topic}. Your job is to independently solve each question and then check if the student's answer is mathematically correct AND award marks based on working shown.

Educational Context:
- Subject: ${context.subject}
- Topic: ${context.topic}
- Theme: ${context.theme || 'General'}
- Grade: ${context.grade}
- Difficulty: ${context.difficulty}
- Syllabus: ${context.syllabus || 'CAPS'}

Questions and Student Answers:
${questionsWithAnswers.map((q, index) => `
QUESTION ${index + 1} (${q.marks} marks):
${q.question}
STUDENT ANSWER: ${q.studentAnswer}
`).join('\n')}

🚨 CRITICAL: Grade ONLY what the student ACTUALLY wrote, NOT what you think they did.

If student wrote "x=5" - they showed NO working steps. Award 1 mark only.
If student wrote "Width = 6 cm, Length = 18 cm" - they showed NO working steps. Award 1 mark only.

DO NOT assume students "followed steps" unless you see the actual steps written.

ACTUAL EXAMPLES:
❌ "x=5" = FINAL ANSWER ONLY = 1 mark (even if correct)
❌ "Width = 8 cm, Length = 16 cm" = FINAL ANSWER ONLY = 1 mark  
❌ "The number is 6" = FINAL ANSWER ONLY = 1 mark
❌ "3x(2x−5)" = FINAL ANSWER ONLY = 1 mark
✅ "3x = 15, x = 5" = SOME WORKING = 2-3 marks
✅ "Step 1: 3x + 5 = 20, Step 2: 3x = 15, Step 3: x = 5" = FULL WORKING = Full marks
✅ "6x^2 - 15x = 3x(2x - 5)" = SHOWED FACTORING = Full marks

MARKING RULE:
- NO steps shown (just final answer): 1 mark maximum
- Some steps shown: 2-3 marks  
- Complete steps shown: Full marks
- Wrong answer: 0 marks

🚨 MANDATORY GRADING PROCESS - FOLLOW THESE STEPS EXACTLY:

STEP 1: SOLVE THE QUESTION YOURSELF FIRST
For expression simplification like "Simplify: 3x + 4y - 2x + 5y":
- Group like terms: (3x - 2x) + (4y + 5y)
- Calculate: (1x) + (9y) = x + 9y
- YOUR SOLUTION: x + 9y

For equation solving like "Solve: 2x + 3 = 11":
- Subtract 3: 2x = 8
- Divide by 2: x = 4
- YOUR SOLUTION: x = 4

STEP 2: NORMALIZE STUDENT'S ANSWER
Convert Unicode symbols BEFORE comparison:
- 𝑥 → x, 𝑦 → y, 𝑧 → z
- − → -, × → *, ÷ → /
- Remove extra spaces

STEP 3: MATHEMATICAL EQUIVALENCE CHECK
Compare YOUR solution with student's normalized answer:
✅ CORRECT EXAMPLES:
- Your solution: x + 9y | Student: 𝑥 + 9𝑦 → SAME = CHECK WORKING
- Your solution: x = 4 | Student: x=4 → SAME = CHECK WORKING
- Your solution: 3 | Student: 9/3 → SAME = CHECK WORKING

❌ WRONG EXAMPLES:
- Your solution: x + 9y | Student: x + 5y → DIFFERENT = 0 MARKS
- Your solution: x = 4 | Student: x = 3 → DIFFERENT = 0 MARKS

STEP 4: AWARD MARKS BASED ON WORKING SHOWN
If answer is correct, check working:
- Just final answer (e.g., "x=5"): 1 mark only
- Some working shown: 2-3 marks
- Complete working shown: Full marks
- If different: 0 MARKS

🎯 EXAMPLE GRADING PROCESS:

Question: "Simplify the expression: 3x + 4y - 2x + 5y"
Student Answer: "𝑥 + 9𝑦"

Step 1: Solve independently
3x + 4y - 2x + 5y = (3x - 2x) + (4y + 5y) = x + 9y

Step 2: Normalize student answer  
"𝑥 + 9𝑦" → "x + 9y"

Step 3: Check equivalence
Your solution: x + 9y
Student (normalized): x + 9y  
RESULT: Mathematically equivalent ✅ FULL MARKS

❌ DO NOT PENALIZE FOR:
- Unicode mathematical symbols (𝑥, 𝑦, 𝑧, −, ×, ÷, ², ³)
- Different working methods or steps shown
- Spacing and formatting differences
- Different but equivalent mathematical forms

Provide comprehensive feedback in this exact format:

OVERALL_SCORE: [actual_score]/${questionsWithAnswers.reduce((sum, q) => sum + q.marks, 0)}
OVERALL_PERCENTAGE: [percentage]
OVERALL_GRADE: [A/B/C/D/F]

STRENGTHS:
- [Specific strengths observed in student's work]
- [Mention correct answers and good reasoning]

IMPROVEMENTS:
- [Specific calculation errors with examples]
- [Conceptual misunderstandings with corrections]
- [Method improvement suggestions]

QUESTION_FEEDBACK:
${questionsWithAnswers.map((q, index) => `Q${index + 1}: [Correct/Partial/Incorrect] - [awarded_marks]/${q.marks}
[Specific feedback explaining the grade, noting mathematical equivalences if applicable]`).join('\n')}

NEXT_STEPS:
- [Specific practice recommendations]
- [Topic areas to review]`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0, // Zero for completely consistent grading
      });

      const feedbackText = response.choices[0].message.content;
      const parsedFeedback = this.parseFeedbackResponse(feedbackText, exercise);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            feedback: parsedFeedback,
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to generate feedback: ${error.message}`);
    }
  }

  async handleGenerateAdaptiveExercise(args) {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    if (!hasApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { context, improvements, numQuestions } = args;

    // Use OpenAI to generate adaptive exercise
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Generate a personalized adaptive ${context.subject} exercise for Grade ${context.grade} students with VARYING DIFFICULTY LEVELS targeting specific improvement areas.

Context:
- Grade: ${context.grade}
- Subject: ${context.subject}
- Topic: ${context.topic}
- Base Difficulty: ${context.difficulty}
- Syllabus: ${context.syllabus}

STUDENT IMPROVEMENT AREAS (target these specifically):
${improvements.map(improvement => `- ${improvement}`).join('\n')}

🚨 CRITICAL REQUIREMENT: KEEP QUESTION AND SOLUTION COMPLETELY SEPARATE!

QUESTION FIELD rules:
- ONLY include the problem statement/question to solve
- NEVER include solution steps in the question field
- NEVER include answers in the question field

SOLUTION FIELD rules:
- ONLY include the step-by-step solution
- Show complete working and explanations

EXAMPLES:
❌ WRONG: "question": "Solve for x: 2x + 5 = 15. 2x = 10, x = 5"
✅ CORRECT: "question": "Solve for x: 2x + 5 = 15", "solution": "Step 1: 2x + 5 = 15\\nStep 2: 2x = 15 - 5\\nStep 3: 2x = 10\\nStep 4: x = 5"

Requirements:
- Create exactly ${numQuestions} questions with MIXED DIFFICULTY LEVELS targeting improvement areas:
  * Easy questions: Basic practice on identified weak concepts
  * Medium questions: Applied problems addressing improvement areas
  * Difficult questions: Complex scenarios requiring mastery of weak areas
- Distribute questions across all three difficulty levels
- Each question should address specific weaknesses mentioned above
- Align with ${context.syllabus} curriculum standards
- Include step-by-step solutions with explanations for improvement areas
- Provide detailed marking schemes

Format your response as JSON:
{
  "title": "Adaptive Exercise with Mixed Difficulty Levels",
  "description": "Exercise targeting specific student weaknesses across easy, medium, and difficult questions",
  "totalMarks": total_marks_number,
  "questions": [
    {
      "questionNumber": 1,
      "question": "ONLY the problem statement - NO SOLUTION STEPS HERE",
      "difficulty": "easy|medium|difficult",
      "marks": marks_for_question,
      "solution": "Step-by-step solution with explanations - SEPARATE from question",
      "markingScheme": ["Point 1 (X marks)", "Point 2 (Y marks)"],
      "improvementTarget": "Which specific improvement area this question addresses"
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const exerciseData = JSON.parse(response.choices[0].message.content);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            exercise: exerciseData,
            context: context,
            targetedImprovements: improvements,
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to generate adaptive exercise: ${error.message}`);
    }
  }

  async handleGenerateTutorial(args) {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    if (!hasApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const { homeworkFeedback, context, specificWeakness } = args;

    // Use OpenAI to generate tutorial
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Generate a comprehensive personalized tutorial for a Grade ${context.grade} ${context.subject} student based on their homework performance feedback.

Context:
- Subject: ${context.subject}
- Grade: ${context.grade}
- Topic: ${context.topic}
- Difficulty: ${context.difficulty}
- Syllabus: ${context.syllabus}

Student Performance Analysis:
- Strengths: ${(homeworkFeedback?.strengths || ['Good effort demonstrated']).join(', ')}
- Areas for Improvement: ${(homeworkFeedback?.improvements || ['Continue practicing']).join(', ')}
${specificWeakness ? `- Specific Focus Area: ${specificWeakness}` : ''}

Create a comprehensive tutorial that includes:
1. A motivating title that focuses on improvement areas
2. Brief description of what the tutorial covers
3. Clear explanation of key concepts addressing student weaknesses
4. 2-3 worked examples demonstrating step-by-step solutions
5. 3-5 practice questions with complete solutions

Format your response as JSON:
{
  "title": "Tutorial title focusing on improvement areas",
  "description": "Brief overview of tutorial content",
  "explanation": "Detailed conceptual explanation addressing specific student weaknesses and building on strengths",
  "examples": [
    "Example 1: Worked example with step-by-step solution",
    "Example 2: Another worked example targeting weakness areas"
  ],
  "questions": [
    {
      "question": "Practice question targeting improvement areas",
      "answer": "Complete solution with step-by-step working",
      "marks": 5
    }
  ],
  "totalMarks": total_marks_for_all_questions
}

Ensure the tutorial is encouraging, builds on the student's identified strengths, and provides clear explanations for their specific areas of difficulty.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const tutorialData = JSON.parse(response.choices[0].message.content);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            tutorial: tutorialData,
            context: context,
            basedOnFeedback: homeworkFeedback,
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to generate tutorial: ${error.message}`);
    }
  }

  parseFeedbackResponse(response, exercise) {
    const lines = response.split('\n').filter(line => line.trim());
    const feedback = {
      overall: {
        score: 0,
        percentage: 0,
        grade: 'F',
        strengths: [],
        improvements: []
      },
      questionFeedback: [],
      nextSteps: []
    };

    let inStrengths = false;
    let inImprovements = false;
    let inNextSteps = false;
    let currentQuestionFeedback = '';
    let currentQuestionNumber = null;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      // Parse question feedback lines like "Q1: Correct/Incorrect - 3/5"
      const questionMatch = trimmed.match(/^Q(\d+):\s*(Correct|Incorrect|Partial)\s*-\s*(\d+)\/(\d+)/i);
      if (questionMatch) {
        const questionNum = parseInt(questionMatch[1]);
        const status = questionMatch[2].toLowerCase();
        const score = parseInt(questionMatch[3]);
        const maxScore = parseInt(questionMatch[4]);
        
        // Get the next line as detailed feedback
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        const detailedFeedback = nextLine.startsWith("Q") ? "Good work!" : nextLine;
        
        // Find corresponding question ID from exercise
        const questionId = exercise.questions?.[questionNum - 1]?.id || `question_${questionNum}`;
        
        feedback.questionFeedback.push({
          questionId: questionId,
          isCorrect: status === 'correct',
          score: score,
          maxScore: maxScore,
          feedback: detailedFeedback || `${status === 'correct' ? 'Excellent!' : 'Needs improvement.'}`
        });
        
        // Skip the next line since we used it as feedback
        if (nextLine && !nextLine.startsWith("Q")) {
          i++;
        }
        
        continue;
      }
      
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
        inStrengths = true;
        inImprovements = false;
        inNextSteps = false;
      } else if (trimmed === 'IMPROVEMENTS:') {
        inStrengths = false;
        inImprovements = true;
        inNextSteps = false;
      } else if (trimmed === 'NEXT_STEPS:') {
        inStrengths = false;
        inImprovements = false;
        inNextSteps = true;
      } else if (inStrengths && trimmed.startsWith('-')) {
        feedback.overall.strengths.push(trimmed.substring(1).trim());
      } else if (inImprovements && trimmed.startsWith('-')) {
        feedback.overall.improvements.push(trimmed.substring(1).trim());
      } else if (inNextSteps && trimmed.startsWith('-')) {
        feedback.nextSteps.push(trimmed.substring(1).trim());
      }
    }

    // If no question feedback was parsed but we have questions, create basic feedback
    if (feedback.questionFeedback.length === 0 && exercise.questions && exercise.questions.length > 0) {
      console.log('⚠️ No question feedback parsed from AI response. Creating fallback feedback...');
      console.log('AI Response Content:', response.substring(0, 500));
      
      feedback.questionFeedback = exercise.questions.map((q, index) => ({
        questionId: q.id || `question_${index + 1}`,
        isCorrect: false,
        score: 0,
        maxScore: q.marks || 5,
        feedback: `This question needs review. Please check your work and try again.`
      }));
    }

    return feedback;
  }

  async handleAssessmentChat(args) {
    try {
      const { studentQuestion, assessmentContext, questions, feedback } = args;

      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }

      // Import OpenAI
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Build comprehensive context for the AI
      const contextInfo = `
Assessment Details:
- Type: ${assessmentContext.assessmentType}
- Title: ${assessmentContext.title}
- Subject: ${assessmentContext.subject}
- Topic: ${assessmentContext.topic}
- Grade: ${assessmentContext.grade}

Student Performance:
- Overall Score: ${feedback.overallScore}/${feedback.totalMarks} (${feedback.percentage}%)

Questions and Student Answers:
${questions.map((q, idx) => `
Question ${idx + 1}: ${q.question}
Correct Answer: ${q.correctAnswer}
Student Answer: ${q.studentAnswer}
Status: ${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
Points: ${q.earnedMarks}/${q.marks}
`).join('')}

Strengths Identified:
${feedback.strengths.map(s => `- ${s}`).join('\n')}

Areas for Improvement:
${feedback.improvements.map(i => `- ${i}`).join('\n')}
      `;

      const prompt = `You are an AI tutor helping a Grade ${assessmentContext.grade} student understand their ${assessmentContext.subject} assessment feedback. The student has asked: "${studentQuestion}"

${contextInfo}

Please provide a helpful, encouraging response that:
1. Answers the student's specific question
2. Explains concepts in grade-appropriate language
3. Refers to specific questions/answers when relevant
4. Provides constructive guidance for improvement
5. Maintains an encouraging, supportive tone

Keep the response concise but thorough, and focus on helping the student learn from their mistakes.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful, encouraging AI tutor specializing in education. Provide clear, grade-appropriate explanations that help students understand their mistakes and learn effectively."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const aiResponse = response.choices[0].message.content.trim();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "success",
            response: aiResponse,
            context: {
              studentQuestion,
              assessmentType: assessmentContext.assessmentType,
              topic: assessmentContext.topic,
              performance: `${feedback.overallScore}/${feedback.totalMarks}`
            },
            generatedAt: new Date().toISOString()
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to process assessment chat: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("🚀 Educational AI MCP Server running on stdio transport");
  }
}

// Run the server
const server = new EducationalAIMCPServer();
server.run().catch((error) => {
  console.error("Failed to run Educational AI MCP server:", error);
  process.exit(1);
});