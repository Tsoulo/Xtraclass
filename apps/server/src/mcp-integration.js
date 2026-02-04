/**
 * MCP Integration Layer for Educational AI Service
 *
 * This module integrates the MCP server with the existing Express routes,
 * allowing seamless transition from direct service calls to MCP protocol.
 */
import { EducationalAIMCPWrapper } from "./mcp-wrapper.js";
import { educationalAIService } from "./mcp-service.js";
/**
 * MCP-enabled Educational AI Service
 *
 * This class provides the same interface as the original Educational AI Service
 * but can optionally use MCP protocol for communication with AI models.
 */
export class MCPEnabledEducationalAIService {
    usesMCP = false;
    mcpWrapper = null;
    constructor(enableMCP = false) {
        this.usesMCP = enableMCP;
        if (this.usesMCP) {
            this.mcpWrapper = new EducationalAIMCPWrapper();
            console.log("✅ MCP-enabled Educational AI Service initialized");
        }
        else {
            console.log("✅ Direct Educational AI Service initialized (MCP disabled)");
        }
    }
    /**
     * Generate exercise using MCP or direct service
     */
    async generateExercise(context, numQuestions = 5) {
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
    async generateFeedback(exercise, studentAnswers, context) {
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
    async generateAdaptiveExercise(context, feedbackContext, numQuestions = 5) {
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
    async generateHomework(context, requirements) {
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
    getStatus() {
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
    toggleMCP(enable) {
        this.usesMCP = enable;
        if (enable && !this.mcpWrapper) {
            this.mcpWrapper = new EducationalAIMCPWrapper();
        }
        console.log(`🔧 MCP protocol ${enable ? 'enabled' : 'disabled'}`);
    }
    /**
     * Check if MCP is enabled
     */
    isMCPEnabled() {
        return this.usesMCP;
    }
}
// Create singleton instance (MCP disabled by default for stability)
export const mcpEnabledEducationalAIService = new MCPEnabledEducationalAIService(false);
// Export for backward compatibility
export { educationalAIService } from "./mcp-service.js";
