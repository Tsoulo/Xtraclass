/**
 * MCP Client Integration for Educational AI Service
 * 
 * This module provides client-side integration with the Educational AI MCP Server,
 * allowing the existing Express routes to communicate with the MCP server.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  questionFeedback: Array<{
    questionId: string;
    isCorrect: boolean;
    score: number;
    maxScore: number;
    feedback: string;
    suggestions?: string[];
  }>;
}

/**
 * Educational AI MCP Client
 * 
 * Provides a client interface to communicate with the Educational AI MCP Server
 */
export class EducationalAIMCPClient {
  private client: Client | null = null;
  private serverProcess: ChildProcess | null = null;
  private isConnected: boolean = false;

  constructor() {
    console.log("Educational AI MCP Client initialized");
  }

  /**
   * Connect to the Educational AI MCP Server
   */
  async connect(): Promise<void> {
    try {
      // Start the MCP server process
      const serverPath = path.join(__dirname, 'mcp-server.js');
      console.log(`Starting MCP server from: ${serverPath}`);
      
      this.serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: { ...process.env },
      });

      if (!this.serverProcess.stdin || !this.serverProcess.stdout) {
        throw new Error("Failed to create server process stdio streams");
      }

      // Create transport and client
      const transport = new StdioClientTransport({
        stdin: this.serverProcess.stdin,
        stdout: this.serverProcess.stdout,
      });

      this.client = new Client(
        {
          name: "educational-ai-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      // Connect to the server
      await this.client.connect(transport);
      this.isConnected = true;
      
      console.log("✅ Connected to Educational AI MCP Server");

      // Handle server process events
      this.serverProcess.on('error', (error) => {
        console.error("MCP Server process error:", error);
        this.isConnected = false;
      });

      this.serverProcess.on('exit', (code) => {
        console.log(`MCP Server process exited with code: ${code}`);
        this.isConnected = false;
      });

    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
        this.serverProcess = null;
      }
      
      this.isConnected = false;
      console.log("Disconnected from Educational AI MCP Server");
    } catch (error) {
      console.error("Error during MCP disconnect:", error);
    }
  }

  /**
   * Check if the client is connected to the MCP server
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Generate an educational exercise using the MCP server
   */
  async generateExercise(
    context: EducationalContext, 
    numQuestions: number = 5
  ): Promise<GeneratedExercise> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    try {
      const result = await this.client.callTool({
        name: "generate_exercise",
        arguments: {
          context,
          numQuestions,
          includeAnswers: true,
        },
      });

      if (result.content[0]?.type !== 'text') {
        throw new Error("Invalid response format from MCP server");
      }

      const exercise = JSON.parse(result.content[0].text) as GeneratedExercise;
      console.log(`✅ Generated exercise: ${exercise.title} with ${exercise.questions.length} questions`);
      
      return exercise;
    } catch (error) {
      console.error("Error generating exercise via MCP:", error);
      throw new Error(`Exercise generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate feedback for student answers using the MCP server
   */
  async generateFeedback(
    exercise: any,
    studentAnswers: string[],
    context: EducationalContext
  ): Promise<ExerciseFeedback> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    try {
      const result = await this.client.callTool({
        name: "generate_feedback",
        arguments: {
          exercise,
          studentAnswers,
          context,
        },
      });

      if (result.content[0]?.type !== 'text') {
        throw new Error("Invalid response format from MCP server");
      }

      const feedback = JSON.parse(result.content[0].text) as ExerciseFeedback;
      console.log(`✅ Generated feedback: ${feedback.overall.percentage}% score with ${feedback.questionFeedback.length} question reviews`);
      
      return feedback;
    } catch (error) {
      console.error("Error generating feedback via MCP:", error);
      throw new Error(`Feedback generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate adaptive exercise targeting student weaknesses
   */
  async generateAdaptiveExercise(
    context: EducationalContext,
    feedbackContext: {
      previousPerformance: number;
      weakAreas: string[];
      specificMistakes: string[];
      improvementAreas: string[];
    },
    numQuestions: number = 5
  ): Promise<GeneratedExercise & { isAdaptive: boolean; targetedWeaknesses: string[]; addressedMistakes: string[]; previousPerformance: number; }> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    try {
      const result = await this.client.callTool({
        name: "generate_adaptive_exercise",
        arguments: {
          context,
          feedbackContext,
          numQuestions,
        },
      });

      if (result.content[0]?.type !== 'text') {
        throw new Error("Invalid response format from MCP server");
      }

      const adaptiveExercise = JSON.parse(result.content[0].text);
      console.log(`✅ Generated adaptive exercise targeting: ${feedbackContext.weakAreas.join(', ')}`);
      
      return adaptiveExercise;
    } catch (error) {
      console.error("Error generating adaptive exercise via MCP:", error);
      throw new Error(`Adaptive exercise generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the service status from the MCP server
   */
  async getServiceStatus(): Promise<{
    serviceName: string;
    version: string;
    status: string;
    apiConfigured: boolean;
    model: string;
    capabilities: any;
    message?: string;
  }> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    try {
      const result = await this.client.callTool({
        name: "get_service_status",
        arguments: {},
      });

      if (result.content[0]?.type !== 'text') {
        throw new Error("Invalid response format from MCP server");
      }

      return JSON.parse(result.content[0].text);
    } catch (error) {
      console.error("Error getting service status via MCP:", error);
      throw new Error(`Service status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    try {
      const result = await this.client.listTools();
      return result.tools;
    } catch (error) {
      console.error("Error listing MCP tools:", error);
      throw error;
    }
  }

  /**
   * List available resources from the MCP server
   */
  async listResources(): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    try {
      const result = await this.client.listResources();
      return result.resources;
    } catch (error) {
      console.error("Error listing MCP resources:", error);
      throw error;
    }
  }
}

// Create singleton instance
export const educationalAIMCPClient = new EducationalAIMCPClient();

// Auto-connect on module load (with error handling)
(async () => {
  try {
    await educationalAIMCPClient.connect();
  } catch (error) {
    console.warn("Failed to auto-connect to MCP server:", error instanceof Error ? error.message : 'Unknown error');
    console.warn("MCP functionality will be unavailable until manual connection is established");
  }
})();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log("Shutting down MCP client...");
  await educationalAIMCPClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("Shutting down MCP client...");
  await educationalAIMCPClient.disconnect();
  process.exit(0);
});