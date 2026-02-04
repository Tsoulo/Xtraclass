/**
 * MCP Integration Layer for Educational AI Service
 * 
 * This module integrates the MCP server with the existing Express routes,
 * allowing seamless transition from direct service calls to MCP protocol.
 */

import { EducationalAIMCPWrapper } from "./mcp-wrapper";
import { educationalAIService, type EducationalContext, type GeneratedExercise, type ExerciseFeedback } from "./mcp-service";

/**
 * MCP-enabled Educational AI Service
 * 
 * This class provides the same interface as the original Educational AI Service
 * but can optionally use MCP protocol for communication with AI models.
 */
export class MCPEnabledEducationalAIService {
  private usesMCP: boolean = false;
  private mcpWrapper: EducationalAIMCPWrapper | null = null;

  constructor(enableMCP: boolean = false) {
    this.usesMCP = enableMCP;
    
    if (this.usesMCP) {
      this.mcpWrapper = new EducationalAIMCPWrapper();
      console.log("✅ MCP-enabled Educational AI Service initialized");
    } else {
      console.log("✅ Direct Educational AI Service initialized (MCP disabled)");
    }
  }

  /**
   * Generate exercise using MCP or direct service
   */
  async generateExercise(context: EducationalContext, numQuestions: number = 5): Promise<GeneratedExercise> {
    if (this.usesMCP && this.mcpWrapper) {
      // TODO: Implement MCP client call when ready
      console.log("🔄 MCP protocol not yet fully integrated, falling back to direct service");
    }
    
    // Use direct service (current implementation)
    return await educationalAIService.generateExercise(context, numQuestions);
  }

  /**
   * Generate feedback using MCP or direct service
   */
  async generateFeedback(
    exercise: any,
    studentAnswers: string[],
    context: EducationalContext
  ): Promise<ExerciseFeedback> {
    if (this.usesMCP && this.mcpWrapper) {
      // TODO: Implement MCP client call when ready
      console.log("🔄 MCP protocol not yet fully integrated, falling back to direct service");
    }
    
    // Use direct service (current implementation)
    return await educationalAIService.generateFeedback(exercise, studentAnswers, context);
  }

  /**
   * Generate adaptive exercise using MCP or direct service
   */
  async generateAdaptiveExercise(
    context: EducationalContext,
    feedbackContext: any,
    numQuestions: number = 5
  ): Promise<GeneratedExercise> {
    if (this.usesMCP && this.mcpWrapper) {
      // TODO: Implement MCP client call when ready
      console.log("🔄 MCP protocol not yet fully integrated, falling back to direct service");
    }
    
    // Use direct service (current implementation)
    return await educationalAIService.generateAdaptiveExercise(context, feedbackContext, numQuestions);
  }

  /**
   * Generate homework using MCP or direct service
   */
  async generateHomework(context: EducationalContext, requirements: any): Promise<any> {
    if (this.usesMCP && this.mcpWrapper) {
      // TODO: Implement MCP client call when ready
      console.log("🔄 MCP protocol not yet fully integrated, falling back to direct service");
    }
    
    // Use direct service (current implementation)
    return await educationalAIService.generateHomework(context, requirements);
  }

  /**
   * Get service status
   */
  getStatus(): { model: string; apiConfigured: boolean; message: string; mcpEnabled?: boolean } {
    const status = educationalAIService.getStatus();
    
    return {
      ...status,
      mcpEnabled: this.usesMCP,
      message: this.usesMCP 
        ? `${status.message} (MCP protocol available but using direct service)`
        : status.message
    };
  }

  /**
   * Enable or disable MCP protocol
   */
  toggleMCP(enable: boolean): void {
    this.usesMCP = enable;
    
    if (enable && !this.mcpWrapper) {
      this.mcpWrapper = new EducationalAIMCPWrapper();
    }
    
    console.log(`🔧 MCP protocol ${enable ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if MCP is enabled
   */
  isMCPEnabled(): boolean {
    return this.usesMCP;
  }
}

// Create singleton instance (MCP disabled by default for stability)
export const mcpEnabledEducationalAIService = new MCPEnabledEducationalAIService(false);

// Export for backward compatibility
export { educationalAIService } from "./mcp-service";
export type { EducationalContext, GeneratedExercise, ExerciseFeedback } from "./mcp-service";