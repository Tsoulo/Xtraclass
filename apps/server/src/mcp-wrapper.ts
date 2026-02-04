#!/usr/bin/env node

/**
 * MCP Wrapper for Educational AI Service
 * 
 * This creates a proper MCP server that wraps the existing Educational AI Service,
 * providing standardized MCP protocol access to all educational AI functionality.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import the existing Educational AI Service
import { educationalAIService, type EducationalContext, type GeneratedExercise } from "./mcp-service";

/**
 * MCP Wrapper for Educational AI Service
 */
class EducationalAIMCPWrapper {
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

    this.setupHandlers();
    console.log("✅ Educational AI MCP Wrapper initialized");
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
          name: "generate_adaptive_exercise",
          description: "Generate adaptive exercises that target specific student weaknesses",
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
          name: "generate_homework",
          description: "Generate structured homework assignments with multiple questions",
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
              requirements: {
                type: "object",
                properties: {
                  duration: { type: "number", description: "Expected completion time in minutes" },
                  topics: { type: "array", items: { type: "string" } },
                  numQuestions: { type: "number", minimum: 1, maximum: 50 },
                },
              },
            },
            required: ["context"],
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
          description: "Current status of the Educational AI service",
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
        const status = educationalAIService.getStatus();
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

Term 1: Rational Numbers and Intro to Algebra
- Integers (revision and extension)
- Common fractions (addition, subtraction, multiplication, division)  
- Decimal fractions (place value, operations)
- Algebraic expressions (simple expressions, like terms, substitution)
- Simple equations (solve for unknown)

Term 2: Patterns, Functions and Geometry
- Number patterns (relationship between terms)
- Input and output values
- Equations (linear equations)
- Geometric patterns (investigation)
- 2D shapes (properties, construction)

Term 3: Functions, 2D Geometry and Measurement
- Functions (tables, formulae, graphs)
- Construction of geometric figures
- Transformations (translation, rotation, reflection)
- Pythagoras theorem (right-angled triangles)
- Area and perimeter (triangles, quadrilaterals, circles)

Term 4: Data Handling and Consolidation
- Data collection and organisation
- Graphs (bar, broken-line, pie charts)
- Measures of central tendency (mean, median, mode)
- Probability (theoretical and experimental)
- Consolidation and problem-solving
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

          case "generate_homework":
            return await this.handleGenerateHomework(args as any);

          case "get_service_status":
            return await this.handleGetServiceStatus();

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
    try {
      const { context, numQuestions = 5 } = args;
      
      // Validate required fields
      if (!context || !context.grade || !context.subject || !context.topic || !context.difficulty || !context.syllabus) {
        throw new Error("Missing required context fields: grade, subject, topic, difficulty, syllabus");
      }

      const exercise = await educationalAIService.generateExercise(context as EducationalContext, numQuestions);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(exercise, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Exercise generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGenerateFeedback(args: any) {
    try {
      const { exercise, studentAnswers, context } = args;

      if (!exercise || !studentAnswers || !context) {
        throw new Error("Missing required parameters: exercise, studentAnswers, context");
      }

      const feedback = await educationalAIService.generateFeedback(exercise, studentAnswers, context as EducationalContext);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(feedback, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Feedback generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGenerateAdaptiveExercise(args: any) {
    try {
      const { context, feedbackContext, numQuestions = 5 } = args;

      if (!context || !feedbackContext) {
        throw new Error("Missing required parameters: context, feedbackContext");
      }

      // Convert feedbackContext to the format expected by the service
      const adaptiveFeedbackContext = {
        improvementsCount: feedbackContext.improvementAreas?.length || 0,
        mistakesCount: feedbackContext.specificMistakes?.length || 0,
        performance: feedbackContext.previousPerformance || 0,
        improvements: feedbackContext.improvementAreas || [],
        mistakes: feedbackContext.specificMistakes || [],
        weakAreas: feedbackContext.weakAreas || [],
      };

      const exercise = await educationalAIService.generateAdaptiveExercise(
        context as EducationalContext,
        adaptiveFeedbackContext,
        numQuestions
      );

      // Add MCP-specific metadata
      const mcpExercise = {
        ...exercise,
        mcpMetadata: {
          isAdaptive: true,
          targetedWeaknesses: feedbackContext.weakAreas || [],
          addressedMistakes: feedbackContext.specificMistakes || [],
          previousPerformance: feedbackContext.previousPerformance || 0,
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mcpExercise, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Adaptive exercise generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGenerateHomework(args: any) {
    try {
      const { context, requirements = {} } = args;

      if (!context) {
        throw new Error("Missing required parameter: context");
      }

      const homework = await educationalAIService.generateHomework(context as EducationalContext, requirements);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(homework, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Homework generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetServiceStatus() {
    try {
      const status = educationalAIService.getStatus();
      
      // Enhance status with MCP-specific information
      const mcpStatus = {
        ...status,
        mcpVersion: "1.0.0",
        transport: "stdio",
        capabilities: {
          exerciseGeneration: true,
          feedbackAnalysis: true,
          adaptiveLearning: true,
          homeworkCreation: true,
          capsAlignment: true,
          multipleSubjects: ["mathematics", "science", "english", "geography", "history"],
          gradeLevels: ["8", "9", "10", "11", "12"],
          supportedSyllabi: ["CAPS", "IEB"],
        },
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(mcpStatus, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("🚀 Educational AI MCP Server running on stdio transport");
  }
}

// Run the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mcpWrapper = new EducationalAIMCPWrapper();
  mcpWrapper.run().catch((error) => {
    console.error("Failed to run Educational AI MCP server:", error);
    process.exit(1);
  });
}

export { EducationalAIMCPWrapper };