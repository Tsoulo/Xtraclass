/**
 * Prompt Workflow Service
 * Handles sophisticated sync evaluation, promotion validation, and history logging
 * for the dual-repository prompt development workflow
 */
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  aiPrompts, 
  mcpPrompts, 
  promptRevisions, 
  promptSyncAudit,
  type AiPrompt,
  type McpPrompt,
  type InsertPromptRevision,
  type InsertPromptSyncAudit
} from "@shared/schema";
import crypto from "crypto";

export interface SyncEvaluationResult {
  status: 'in_sync' | 'awaiting_dev' | 'mcp_ahead' | 'status_reset';
  differences: {
    textDiff: boolean;
    variablesDiff: boolean;
    hashDiff: boolean;
    statusMismatch: boolean;
  };
  actionRequired: string;
  autoActionTaken?: string;
}

export interface PromptSyncState {
  aiPrompt: AiPrompt;
  mcpPrompt: McpPrompt | null;
  syncResult: SyncEvaluationResult;
  changeHistory: Array<{
    id: number;
    changeType: string;
    changeReason: string;
    createdBy: number;
    createdAt: Date;
  }>;
}

export class PromptWorkflowService {
  
  /**
   * Generate a hash for prompt content and variables for change detection
   */
  private generatePromptHash(promptText: string, variables: string[]): string {
    const content = JSON.stringify({ promptText, variables: variables.sort() });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Normalize variables array for comparison (sort and filter)
   */
  private normalizeVariables(variables: string[]): string[] {
    return variables.filter(v => v && v.trim()).sort();
  }

  /**
   * Compare two prompts for differences
   */
  private comparePrompts(aiPrompt: AiPrompt, mcpPrompt: McpPrompt) {
    const textDiff = aiPrompt.promptText.trim() !== mcpPrompt.promptText.trim();
    const aiVars = this.normalizeVariables(aiPrompt.variables || []);
    const mcpVars = this.normalizeVariables(mcpPrompt.variables || []);
    const variablesDiff = JSON.stringify(aiVars) !== JSON.stringify(mcpVars);
    
    const aiHash = this.generatePromptHash(aiPrompt.promptText, aiVars);
    const mcpHash = this.generatePromptHash(mcpPrompt.promptText, mcpVars);
    const hashDiff = aiHash !== mcpHash;

    return {
      textDiff,
      variablesDiff,
      hashDiff,
      aiHash,
      mcpHash
    };
  }

  /**
   * Evaluate sync status between AI prompt and MCP prompt
   */
  async evaluateSync(aiPromptId: number, mcpPromptKey: string, userId: number): Promise<SyncEvaluationResult> {
    // Get AI prompt
    const aiPrompt = await db
      .select()
      .from(aiPrompts)
      .where(eq(aiPrompts.id, aiPromptId))
      .then(rows => rows[0]);

    if (!aiPrompt) {
      throw new Error(`AI prompt with ID ${aiPromptId} not found`);
    }

    // Get MCP prompt
    const mcpPrompt = await db
      .select()
      .from(mcpPrompts)
      .where(eq(mcpPrompts.key, mcpPromptKey))
      .then(rows => rows[0]);

    if (!mcpPrompt) {
      // MCP prompt doesn't exist - this is a new prompt awaiting dev
      return {
        status: 'awaiting_dev',
        differences: { textDiff: true, variablesDiff: true, hashDiff: true, statusMismatch: false },
        actionRequired: 'Promote to MCP server',
      };
    }

    // Compare prompts
    const comparison = this.comparePrompts(aiPrompt, mcpPrompt);
    const statusMismatch = aiPrompt.status === 'awaiting_dev';

    const differences = {
      ...comparison,
      statusMismatch
    };

    // Determine sync status and actions
    let status: SyncEvaluationResult['status'];
    let actionRequired: string;
    let autoActionTaken: string | undefined;

    if (!comparison.hashDiff && !statusMismatch) {
      // Perfect sync
      status = 'in_sync';
      actionRequired = 'None - prompts are synchronized';
    } else if (!comparison.hashDiff && statusMismatch) {
      // Hashes match but status is still awaiting_dev - development completed
      status = 'status_reset';
      actionRequired = 'Reset status to implemented';
      autoActionTaken = 'Auto-reset status from awaiting_dev to implemented';
      
      // Automatically reset status
      await this.resetPromptStatus(aiPromptId, userId);
      
    } else if (comparison.hashDiff && statusMismatch) {
      // Changes pending development
      status = 'awaiting_dev';
      actionRequired = 'Promote changes to MCP server';
    } else {
      // MCP ahead - need to sync UI
      status = 'mcp_ahead';
      actionRequired = 'Sync UI from MCP server';
    }

    // Log the sync check
    await this.logSyncAudit({
      aiPromptId,
      mcpPromptKey,
      syncType: 'load_check',
      fromStatus: aiPrompt.status,
      toStatus: autoActionTaken ? 'implemented' : aiPrompt.status,
      syncResult: status,
      detectedDifferences: differences,
      actionTaken: autoActionTaken,
      triggeredBy: userId
    });

    return {
      status,
      differences,
      actionRequired,
      autoActionTaken
    };
  }

  /**
   * Get complete sync state for a prompt including history
   */
  async getPromptSyncState(aiPromptId: number, mcpPromptKey: string, userId: number): Promise<PromptSyncState> {
    const aiPrompt = await db
      .select()
      .from(aiPrompts)
      .where(eq(aiPrompts.id, aiPromptId))
      .then(rows => rows[0]);

    if (!aiPrompt) {
      throw new Error(`AI prompt with ID ${aiPromptId} not found`);
    }

    const mcpPrompt = await db
      .select()
      .from(mcpPrompts)
      .where(eq(mcpPrompts.key, mcpPromptKey))
      .then(rows => rows[0] || null);

    const syncResult = await this.evaluateSync(aiPromptId, mcpPromptKey, userId);

    // Get change history
    const changeHistory = await db
      .select({
        id: promptRevisions.id,
        changeType: promptRevisions.changeType,
        changeReason: promptRevisions.changeReason,
        createdBy: promptRevisions.createdBy,
        createdAt: promptRevisions.createdAt
      })
      .from(promptRevisions)
      .where(eq(promptRevisions.aiPromptId, aiPromptId))
      .orderBy(desc(promptRevisions.createdAt))
      .limit(10);

    return {
      aiPrompt,
      mcpPrompt,
      syncResult,
      changeHistory: changeHistory.map(ch => ({
        ...ch,
        createdAt: new Date(ch.createdAt!)
      }))
    };
  }

  /**
   * Create a new prompt revision for development changes
   */
  async createPromptChange(
    aiPromptId: number, 
    mcpPromptKey: string, 
    newText: string, 
    newVariables: string[],
    changeReason: string,
    changeDescription: string,
    userId: number
  ): Promise<void> {
    const currentPrompt = await db
      .select()
      .from(aiPrompts)
      .where(eq(aiPrompts.id, aiPromptId))
      .then(rows => rows[0]);

    if (!currentPrompt) {
      throw new Error(`AI prompt with ID ${aiPromptId} not found`);
    }

    // Create revision record
    const revisionData: InsertPromptRevision = {
      aiPromptId,
      mcpPromptKey,
      changeType: 'update',
      previousText: currentPrompt.promptText,
      newText,
      previousVariables: currentPrompt.variables || [],
      newVariables,
      changeReason,
      changeDescription,
      createdBy: userId
    };

    await db.insert(promptRevisions).values(revisionData);

    // Update AI prompt with new content and status
    const newHash = this.generatePromptHash(newText, this.normalizeVariables(newVariables));
    
    await db
      .update(aiPrompts)
      .set({
        promptText: newText,
        variables: newVariables,
        schemaHash: newHash,
        status: 'awaiting_dev',
        updatedAt: new Date()
      })
      .where(eq(aiPrompts.id, aiPromptId));

    // Log the change
    await this.logSyncAudit({
      aiPromptId,
      mcpPromptKey,
      syncType: 'load_check', // This will be triggered on next load
      fromStatus: currentPrompt.status,
      toStatus: 'awaiting_dev',
      syncResult: 'awaiting_dev',
      detectedDifferences: { textDiff: true, variablesDiff: true, hashDiff: true, statusMismatch: false },
      actionTaken: 'Created development revision',
      triggeredBy: userId
    });
  }

  /**
   * Reset prompt status when development is completed
   */
  private async resetPromptStatus(aiPromptId: number, userId: number): Promise<void> {
    await db
      .update(aiPrompts)
      .set({
        status: 'published',
        isPublished: true,
        implementedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(aiPrompts.id, aiPromptId));
  }

  /**
   * Sync UI prompt from MCP server (MCP ahead scenario)
   */
  async syncFromMcp(aiPromptId: number, mcpPromptKey: string, userId: number): Promise<void> {
    const mcpPrompt = await db
      .select()
      .from(mcpPrompts)
      .where(eq(mcpPrompts.key, mcpPromptKey))
      .then(rows => rows[0]);

    if (!mcpPrompt) {
      throw new Error(`MCP prompt with key ${mcpPromptKey} not found`);
    }

    const currentPrompt = await db
      .select()
      .from(aiPrompts)
      .where(eq(aiPrompts.id, aiPromptId))
      .then(rows => rows[0]);

    if (!currentPrompt) {
      throw new Error(`AI prompt with ID ${aiPromptId} not found`);
    }

    // Create rollback revision
    const revisionData: InsertPromptRevision = {
      aiPromptId,
      mcpPromptKey,
      changeType: 'rollback',
      previousText: currentPrompt.promptText,
      newText: mcpPrompt.promptText,
      previousVariables: currentPrompt.variables || [],
      newVariables: mcpPrompt.variables || [],
      changeReason: 'MCP server ahead - syncing UI',
      changeDescription: 'Automatically synced UI prompt from MCP server',
      createdBy: userId
    };

    await db.insert(promptRevisions).values(revisionData);

    // Update AI prompt to match MCP
    const newHash = this.generatePromptHash(mcpPrompt.promptText, mcpPrompt.variables || []);
    
    await db
      .update(aiPrompts)
      .set({
        promptText: mcpPrompt.promptText,
        variables: mcpPrompt.variables,
        schemaHash: newHash,
        status: 'implemented',
        updatedAt: new Date()
      })
      .where(eq(aiPrompts.id, aiPromptId));

    // Log the sync
    await this.logSyncAudit({
      aiPromptId,
      mcpPromptKey,
      syncType: 'rollback',
      fromStatus: currentPrompt.status,
      toStatus: 'implemented',
      syncResult: 'in_sync',
      detectedDifferences: { textDiff: false, variablesDiff: false, hashDiff: false, statusMismatch: false },
      actionTaken: 'Synced UI from MCP server',
      triggeredBy: userId
    });
  }

  /**
   * Log sync audit entry
   */
  private async logSyncAudit(auditData: InsertPromptSyncAudit): Promise<void> {
    await db.insert(promptSyncAudit).values({
      ...auditData,
      detectedDifferences: auditData.detectedDifferences || {
        textDiff: false,
        variablesDiff: false, 
        hashDiff: false,
        statusMismatch: false
      }
    });
  }

  /**
   * Get supported variables from actual MCP server grading prompts
   */
  private async getMcpSupportedVariables(): Promise<string[]> {
    try {
      // Get MCP prompts to extract actually supported variables
      const mcpPromptList = await db
        .select()
        .from(mcpPrompts)
        .where(eq(mcpPrompts.category, 'grading'));
      
      if (mcpPromptList.length === 0) {
        // Fallback to known grading variables from HOMEWORK_GRADING_ASSISTANT template
        return [
          'subject', 'grade', 'topic', 'theme', 'question', 'student_answer', 
          'correct_answer', 'total_marks'
        ];
      }

      // Extract all unique variables from existing MCP grading prompts
      const allVariables = new Set<string>();
      mcpPromptList.forEach(prompt => {
        if (prompt.variables) {
          prompt.variables.forEach(v => allVariables.add(v));
        }
      });

      return Array.from(allVariables).sort();
    } catch (error) {
      console.error('Failed to get MCP supported variables:', error);
      // Fallback to core grading variables
      return [
        'subject', 'grade', 'topic', 'theme', 'question', 'student_answer', 
        'correct_answer', 'total_marks'
      ];
    }
  }

  /**
   * Check if prompt can be auto-implemented (no new variables)
   */
  async canAutoImplement(variables: string[], category: string = 'grading'): Promise<{
    canAutoImplement: boolean;
    reason: string;
    newVariables: string[];
    supportedVariables: string[];
  }> {
    if (category !== 'grading') {
      return {
        canAutoImplement: false,
        reason: 'Auto-implementation only supported for grading prompts',
        newVariables: [],
        supportedVariables: []
      };
    }

    const supportedVariables = await this.getMcpSupportedVariables();
    const normalizedVars = this.normalizeVariables(variables);
    const newVariables = normalizedVars.filter(v => !supportedVariables.includes(v));

    if (newVariables.length === 0) {
      return {
        canAutoImplement: true,
        reason: 'All variables are supported by existing MCP server logic',
        newVariables: [],
        supportedVariables
      };
    }

    return {
      canAutoImplement: false,
      reason: `New variables require code changes: ${newVariables.join(', ')}`,
      newVariables,
      supportedVariables
    };
  }

  /**
   * Validate that new variables are supported by MCP runtime (pre-flight check)
   */
  async validatePromptVariables(variables: string[]): Promise<{ 
    valid: boolean; 
    unsupportedVars: string[]; 
    warnings: string[];
    autoImplementable: boolean;
    reason: string;
  }> {
    const autoCheck = await this.canAutoImplement(variables);
    const supportedVars = autoCheck.supportedVariables;
    
    const unsupportedVars = variables.filter(v => !supportedVars.includes(v));
    const warnings: string[] = [];
    
    if (unsupportedVars.length > 0) {
      warnings.push(`New variables detected: ${unsupportedVars.join(', ')}. Manual code changes required.`);
    }

    return {
      valid: true,
      unsupportedVars,
      warnings,
      autoImplementable: autoCheck.canAutoImplement,
      reason: autoCheck.reason
    };
  }
}

export const promptWorkflowService = new PromptWorkflowService();