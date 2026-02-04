/**
 * MCP Client Service
 * 
 * This service replaces the old Educational AI Service with MCP-based functionality.
 * All AI operations now go through the MCP server for consistency and standardization.
 */

import { spawn } from 'child_process';

export interface EducationalContext {
  grade: string;
  subject: string;
  topic: string;
  theme?: string;  // Added theme field for enhanced context
  difficulty: 'easy' | 'medium' | 'hard';
  syllabus?: string;
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
    type: 'multiple-choice' | 'short-answer' | 'essay';
  }>;
  totalMarks: number;
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
  nextSteps: string[];
}

export interface TutorialContent {
  title: string;
  description: string;
  explanation: string;
  examples: Array<{
    problem: string;
    solution: string;
    steps: string[];
  }>;
  practiceQuestions: Array<{
    id: string;
    question: string;
    answer: string;
    marks: number;
    hints: string[];
  }>;
}

class MCPClientService {
  private mcpServerPath: string = './server/mcp-server.ts';
  
  constructor() {
    console.log('✅ MCP Client Service initialized - all AI operations via MCP server');
  }

  /**
   * CRITICAL FUNCTION: Core MCP Server Communication
   * 
   * @purpose Establishes communication with MCP server to execute AI-powered educational tools
   * @param toolName - Name of MCP tool to call (generate_tutorial, generate_feedback, etc.)
   * @param args - Arguments object specific to the tool being called
   * 
   * @returns Promise<any> - Parsed JSON response from MCP server
   * 
   * @dependencies MCP server process, OpenAI API, environment variables
   * @sideEffects Spawns child process, uses OpenAI API credits
   * @throws {Error} If MCP server fails, JSON parsing fails, or tool execution fails
   * 
   * @dataFlow: 
   * 1. Spawn MCP server child process with tsx
   * 2. Send JSON-RPC request with tool name and arguments
   * 3. Parse stdout for valid JSON response
   * 4. Extract content from MCP response format
   * 5. Return parsed data to caller
   * 
   * @knownIssues
   * - Requires OPENAI_API_KEY environment variable
   * - MCP server output includes initialization logs that must be filtered
   * - Response format varies between tools (some wrap in content[0].text, others direct)
   * 
   * @lastVerified 2025-09-16
   * @maintainer AI Learning Team
   */
  private async callMCPServer(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = spawn('tsx', [this.mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      // Send the MCP request
      const mcpRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };
      
      child.stdin.write(JSON.stringify(mcpRequest) + '\n');
      child.stdin.end();

      child.on('close', (code) => {
        if (code !== 0) {
          console.error('MCP server error:', errorOutput);
          return reject(new Error(`MCP server failed with code ${code}`));
        }
        
        try {
          // Parse the JSON response (skip initialization logs)
          const lines = output.split('\n').filter(line => line.trim());
          console.log('🔍 MCP server output lines:', lines);
          
          const jsonLine = lines.find(line => line.includes('"jsonrpc"'));
          
          if (!jsonLine) {
            console.error('❌ No valid JSON response from MCP server. Full output:', output);
            console.error('❌ Error output:', errorOutput);
            throw new Error('No valid JSON response from MCP server');
          }
          
          console.log('📝 Found JSON line:', jsonLine);
          const mcpResponse = JSON.parse(jsonLine);
          
          if (mcpResponse.error) {
            console.error('❌ MCP server returned error:', mcpResponse.error);
            return reject(new Error(mcpResponse.error.message || 'MCP server error'));
          }
          
          if (mcpResponse.result?.content?.[0]?.text) {
            console.log('✅ MCP response content:', mcpResponse.result.content[0].text);
            const responseData = JSON.parse(mcpResponse.result.content[0].text);
            resolve(responseData);
          } else if (mcpResponse.result && typeof mcpResponse.result === 'object') {
            // Handle direct response format (e.g., tutorial_chat, assessment_chat)
            console.log('✅ Direct MCP response:', mcpResponse.result);
            resolve(mcpResponse.result);
          } else {
            console.error('❌ Invalid response format. MCP response:', mcpResponse);
            reject(new Error('Invalid response format from MCP server'));
          }
        } catch (error) {
          console.error('❌ Error parsing MCP response:', error);
          console.error('❌ Raw output:', output);
          console.error('❌ Raw error output:', errorOutput);
          reject(new Error(`Failed to parse MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    });
  }

  /**
   * Get service status
   */
  getStatus(): { model: string; apiConfigured: boolean; message: string } {
    return {
      model: 'gpt-3.5-turbo',
      apiConfigured: !!process.env.OPENAI_API_KEY,
      message: process.env.OPENAI_API_KEY 
        ? 'MCP Client Service configured with OpenAI API key'
        : 'MCP Client Service requires OPENAI_API_KEY environment variable'
    };
  }

  /**
   * Generate basic exercises without adaptive context
   */
  async generateExercise(
    context: EducationalContext,
    numQuestions: number = 5
  ): Promise<GeneratedExercise> {
    console.log('🔄 Generating basic exercise via MCP server');
    
    const response = await this.callMCPServer('generate_exercise', {
      context: {
        ...context,
        difficulty: context.difficulty || 'medium',
        syllabus: context.syllabus || 'CAPS'
      },
      numQuestions
    });
    
    if (response.status !== 'success') {
      throw new Error('Failed to generate exercise via MCP server');
    }
    
    // Transform MCP response to expected format
    const exercise = response.exercise;
    return {
      id: Date.now().toString(),
      title: exercise.title,
      description: exercise.description,
      questions: exercise.questions.map((q: any) => ({
        id: q.id || q.questionNumber?.toString() || String(Math.random()),
        question: q.question,
        answer: q.answer || q.solution || 'No solution provided',
        marks: q.marks,
        type: 'short-answer' as const
      })),
      totalMarks: exercise.totalMarks
    };
  }

  /**
   * CRITICAL FEATURE: AI Grading and Feedback System
   * 
   * @purpose Generates comprehensive AI-powered feedback for student work
   * @param exercise - Exercise data with questions and correct answers
   * @param studentAnswers - Array of student's submitted answers
   * @param context - Educational context for grading (subject, grade level, etc.)
   * 
   * @returns Promise<ExerciseFeedback> - Comprehensive feedback with scores and analysis
   * 
   * @dependencies MCP server generate_feedback tool, OpenAI API
   * @sideEffects Calls OpenAI API for grading, logs feedback generation process
   * @throws {Error} If MCP server fails, invalid response structure, or missing required fields
   * 
   * @expectedOutput Feedback containing:
   * - Overall score, percentage, grade, strengths, improvements
   * - Question-by-question analysis with specific feedback
   * - Detailed suggestions for improvement
   * - Next steps for learning progression
   * 
   * @responseNormalization
   * Handles different MCP response formats:
   * - Converts questionAnalysis to questionFeedback for legacy compatibility
   * - Maintains both formats for different UI components
   * - Validates required fields exist before return
   * 
   * @integrations
   * - Used by: HomeworkFeedback.tsx, TutorialExerciseFeedback.tsx
   * - Displays: Real AI feedback instead of placeholder messages
   * - Triggers: After student submits homework or tutorial exercises
   * 
   * @dataValidation
   * - Requires response.overall field for validity
   * - Must have either questionFeedback or questionAnalysis
   * - Normalizes field names (points→score, maxPoints→maxScore)
   * 
   * @criticalNote Returns REAL AI-generated feedback, not generic placeholder text
   * Frontend should display actual analysis content from this response
   * 
   * @lastUpdated 2025-09-16 - Enhanced response normalization
   * @testStatus ✅ Verified real feedback display in UI components
   * @maintainer AI Learning Team
   */
  async generateFeedback(
    exercise: GeneratedExercise,
    studentAnswers: string[],
    context: EducationalContext
  ): Promise<ExerciseFeedback> {
    console.log('🔄 Generating feedback via MCP server');
    
    const response = await this.callMCPServer('generate_feedback', {
      exercise,
      studentAnswers,
      context
    });
    
    // Debug: Log the actual response structure
    console.log('🔍 Response keys:', Object.keys(response));
    console.log('🔍 Response overall exists:', !!response.overall);
    console.log('🔍 Response questionAnalysis exists:', !!response.questionAnalysis);
    console.log('🔍 Response questionFeedback exists:', !!response.questionFeedback);
    
    // Validate response has required fields
    if (!response || typeof response !== 'object' || !response.overall) {
      console.log('❌ Invalid response structure:', JSON.stringify(response, null, 2));
      throw new Error('Invalid feedback response from MCP server - missing overall field');
    }
    
    // Normalize response structure: convert questionAnalysis to questionFeedback format if needed
    let normalizedResponse = { ...response };
    
    if (response.questionAnalysis && !response.questionFeedback) {
      console.log('🔄 Normalizing questionAnalysis to questionFeedback format');
      normalizedResponse.questionFeedback = response.questionAnalysis.map((analysis: any) => ({
        questionId: analysis.questionId,
        isCorrect: analysis.isCorrect,
        score: analysis.points,           // points -> score
        maxScore: analysis.maxPoints,     // maxPoints -> maxScore  
        feedback: analysis.feedback
      }));
      // Keep questionAnalysis for new consumers but ensure questionFeedback exists for legacy
      normalizedResponse.questionAnalysis = response.questionAnalysis;
    }
    
    // Ensure we have either questionFeedback or questionAnalysis
    if (!normalizedResponse.questionFeedback && !normalizedResponse.questionAnalysis) {
      console.log('❌ Missing both questionFeedback and questionAnalysis:', JSON.stringify(response, null, 2));
      throw new Error('Invalid feedback response from MCP server - missing question feedback data');
    }
    
    console.log('✅ Successfully normalized feedback response');
    return normalizedResponse;
  }

  /**
   * Generate adaptive exercises targeting specific weaknesses
   */
  async generateAdaptiveExercise(
    context: EducationalContext,
    improvements: string[],
    numQuestions: number = 5
  ): Promise<GeneratedExercise> {
    console.log('🔄 Generating adaptive exercise via MCP server');
    
    const response = await this.callMCPServer('generate_adaptive_exercise', {
      context: {
        ...context,
        difficulty: context.difficulty || 'medium',
        syllabus: context.syllabus || 'CAPS'
      },
      feedbackContext: {
        previousPerformance: 50, // Default performance
        weakAreas: improvements,
        specificMistakes: [],
        improvementAreas: improvements
      },
      improvements,
      numQuestions
    });
    
    // The adaptive exercise response doesn't have a status field - it returns the exercise directly
    const exercise = response.exercise || response;
    return {
      id: Date.now().toString(),
      title: exercise.title,
      description: exercise.description,
      questions: exercise.questions.map((q: any) => ({
        id: q.questionNumber?.toString() || q.id || Date.now().toString(),
        question: q.question,
        answer: q.solution || q.answer || 'No solution provided',
        marks: q.marks,
        type: 'short-answer' as const
      })),
      totalMarks: exercise.totalMarks
    };
  }

  /**
   * CRITICAL FEATURE: Tutorial Generation System
   * 
   * @purpose Generates personalized 3-step educational tutorials with rich content
   * @param context - Educational context (grade, subject, topic, difficulty level)
   * @param improvementAreas - Specific areas student needs to work on based on feedback
   * @param targetConcepts - Optional specific concepts to focus tutorial content on
   * 
   * @returns Promise<TutorialData> - Rich tutorial with 3 detailed steps, examples, tips
   * 
   * @dependencies MCP server generate_tutorial tool, OpenAI API
   * @sideEffects Calls OpenAI API, logs tutorial generation process
   * @throws {Error} If MCP server unavailable, OpenAI API fails, or tool returns error
   * 
   * @expectedOutput Tutorial with structure:
   * - 3 detailed learning steps with explanations
   * - Working examples with problem/solution/key points for each step
   * - Helpful tips and study guidance
   * - Targeted weakness addressing
   * - Estimated completion duration
   * 
   * @integrations
   * - Used by: /api/generate-tutorial-exercise endpoint
   * - Displays in: TutorialCard.tsx component
   * - Triggers from: HomeworkFeedback "Generate Practice Exercise" button
   * 
   * @dataFlow:
   * HomeworkFeedback → API endpoint → generateTutorial → MCP server → OpenAI → Tutorial JSON
   * 
   * @criticalNote MUST use 'generate_tutorial' tool, NOT 'generate_adaptive_exercise'
   * Using wrong tool results in placeholder content instead of rich tutorials
   * 
   * @example
   * const tutorial = await generateTutorial(
   *   { grade: '8', subject: 'mathematics', topic: 'algebra', difficulty: 'medium' },
   *   ['Review Required: equations need attention'],
   *   ['linear equations', 'variable isolation']
   * );
   * 
   * @lastUpdated 2025-09-16 - Fixed to use correct MCP tool
   * @testStatus ✅ Verified working with TutorialCard component
   * @maintainer AI Learning Team
   */
  async generateTutorial(
    context: EducationalContext,
    improvementAreas: string[],
    targetConcepts: string[] = []
  ): Promise<any> {
    console.log('🔄 Generating tutorial via MCP server');
    
    const response = await this.callMCPServer('generate_tutorial', {
      context: {
        ...context,
        syllabus: context.syllabus || 'CAPS'
      },
      improvementAreas,
      targetConcepts
    });
    
    // Check for different response formats
    if (response.status === 'success') {
      return response.tutorial;
    } else if (response.tutorial) {
      return response.tutorial;
    } else {
      // Response might be the tutorial directly
      return response;
    }
  }

  /**
   * Mark questions (compatibility method - redirects to generateFeedback)
   * @deprecated Use generateFeedback instead for more comprehensive results
   */
  async markQuestions(
    questions: Array<{
      id: string;
      question: string;
      studentAnswer: string;
      correctAnswer: string;
      marks: number;
    }>,
    context: EducationalContext
  ): Promise<any> {
    console.log('🔄 Marking questions via MCP server (compatibility mode)');
    
    // Convert to exercise format
    const exercise: GeneratedExercise = {
      id: Date.now().toString(),
      title: 'Question Marking',
      description: 'Marking individual questions',
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        answer: q.correctAnswer,
        marks: q.marks,
        type: 'short-answer' as const
      })),
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0)
    };
    
    const studentAnswers = questions.map(q => q.studentAnswer);
    
    // Use the comprehensive feedback system
    const feedback = await this.generateFeedback(exercise, studentAnswers, context);
    
    // Return in legacy format for compatibility
    return {
      results: feedback.questionFeedback.map((qf: any) => ({
        questionId: qf.questionId,
        isCorrect: qf.isCorrect,
        score: qf.score,
        maxScore: qf.maxScore,
        feedback: qf.feedback
      })),
      overall: feedback.overall
    };
  }

  /**
   * Assessment chat for students to ask questions about their feedback
   */
  async assessmentChat(
    studentQuestion: string,
    assessmentContext: {
      assessmentType: 'homework' | 'exercise';
      title: string;
      subject: string;
      topic: string;
      grade: string;
    },
    questions: Array<{
      id: string;
      question: string;
      correctAnswer: string;
      studentAnswer: string;
      marks: number;
      earnedMarks: number;
      isCorrect: boolean;
    }>,
    feedback: {
      strengths: string[];
      improvements: string[];
      overallScore: number;
      totalMarks: number;
      percentage: number;
    }
  ): Promise<{ response: string; context: any }> {
    console.log('🔄 Processing assessment chat via MCP server');
    
    const response = await this.callMCPServer('assessment_chat', {
      studentQuestion,
      assessmentContext,
      questions,
      feedback
    });
    
    // MCP server returns the response directly (already parsed by callMCPServer)
    return {
      response: response.response,
      context: response.context
    };
  }

  async videoLessonChat(
    studentQuestion: string,
    lessonContext: {
      lessonTitle: string;
      subject: string;
      topic: string;
      theme: string;
      grade: string;
      videoLink?: string;
      description?: string;
    },
    transcript?: string
  ): Promise<{ response: string; context: any }> {
    console.log('🔄 Processing video lesson chat via MCP server');
    
    const response = await this.callMCPServer('video_lesson_chat', {
      studentQuestion,
      lessonContext,
      transcript
    });
    
    if (response.status !== 'success') {
      throw new Error('Failed to process video lesson chat via MCP server');
    }
    
    return {
      response: response.response,
      context: response.context
    };
  }

  /**
   * CRITICAL FEATURE: Tutorial AI Chat System
   * 
   * @purpose Provides AI assistance for students during step-by-step tutorial learning
   * @param studentQuestion - Student's specific question about tutorial content
   * @param tutorialContext - Complete context of current tutorial state and content
   * 
   * @returns Promise<{answer: string, context: any}> - AI response with contextual answer
   * 
   * @dependencies MCP server tutorial_chat tool, OpenAI API
   * @sideEffects Uses OpenAI API credits, logs chat interactions
   * @throws {Error} If MCP server communication fails or tool execution errors
   * 
   * @contextAware Tutorial chat understands:
   * - Current step number and total steps
   * - Step-specific content and examples
   * - Student's learning progression
   * - Educational level (grade/subject/topic)
   * - Previous tutorial interactions
   * 
   * @integrations
   * - Used by: TutorialCard.tsx AI chat interface
   * - Displays: In collapsible chat sections for each tutorial step
   * - Triggers: When student clicks "Ask AI" during tutorial progression
   * - UI Pattern: Collapsible chat containers (NO modals - user preference)
   * 
   * @responseHandling
   * - Returns answer or response field from MCP server
   * - Provides fallback message if response format varies
   * - Maintains conversation context for follow-up questions
   * 
   * @userExperience
   * - Real-time AI responses with loading indicators
   * - Context-specific help for current tutorial step
   * - No popup notifications (user preference)
   * - Integrated into tutorial flow without interruption
   * 
   * @criticalNote This provides REAL AI tutoring, not generic responses
   * AI understands specific tutorial step content and can provide targeted help
   * 
   * @lastVerified 2025-09-16 - Working in TutorialCard component
   * @testStatus ✅ Confirmed real AI responses without toast notifications
   * @maintainer AI Learning Team
   */
  async tutorialChat(
    studentQuestion: string,
    tutorialContext: {
      tutorialTitle: string;
      currentStep: number;
      totalSteps: number;
      stepTitle: string;
      stepContent: string;
      example: any;
      grade: string;
      subject: string;
      topic: string;
    }
  ): Promise<{ answer: string; context: any }> {
    console.log('🔄 Processing tutorial chat via MCP server');
    
    const response = await this.callMCPServer('tutorial_chat', {
      studentQuestion,
      tutorialContext
    });
    
    return {
      answer: response.answer || response.response || 'I understand your question. Let me help you with this tutorial step.',
      context: response.context || {}
    };
  }

  /**
   * Extract questions from past paper PDF using AI
   * 
   * @param options - Object containing pdfText OR pdfImages, and context
   * @returns Promise with extracted questions array and metadata
   */
  async extractPastPaperQuestions(
    pdfTextOrImages: string | string[],
    context: {
      subject: string;
      grade: string;
      paperType: string;
      year: number;
    }
  ): Promise<{
    status: string;
    data?: {
      questions: any[];
      imagesFound?: any[];
      totalQuestions: number;
      totalMarks: number;
      sections: string[];
      topicsFound: string[];
    };
    error?: string;
  }> {
    const isImages = Array.isArray(pdfTextOrImages);
    console.log(`📄 Extracting questions from past paper via MCP server (${isImages ? 'vision' : 'text'} mode)`);
    
    const payload: any = { context };
    if (isImages) {
      payload.pdfImages = pdfTextOrImages;
    } else {
      payload.pdfText = pdfTextOrImages;
    }
    
    const response = await this.callMCPServer('extract_past_paper_questions', payload);
    
    return response;
  }

  async verifyExerciseRelevance(
    transcript: string,
    questions: Array<{ id: number; question: string; answer?: string; marks?: number }>,
    lessonContext: {
      lessonTitle: string;
      subject: string;
      topic?: string;
      theme?: string;
      grade: string;
    }
  ): Promise<{
    analysis: any;
    context: {
      lessonTitle: string;
      subject: string;
      questionsAnalyzed: number;
    };
  }> {
    console.log('🔄 Verifying exercise relevance via MCP server');
    
    const response = await this.callMCPServer('verify_exercise_relevance', {
      transcript,
      questions,
      lessonContext
    });
    
    if (response.status !== 'success') {
      throw new Error('Failed to verify exercise relevance via MCP server');
    }
    
    return {
      analysis: response.analysis,
      context: response.context
    };
  }
}

// Export singleton instance
export const mcpClientService = new MCPClientService();
export { MCPClientService };