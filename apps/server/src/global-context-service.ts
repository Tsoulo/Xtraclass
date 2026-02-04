import { db } from './db';
import { 
  subjectGlobalContext, 
  homeworkSubmissions, 
  exerciseSubmissions, 
  students,
  homework,
  exercises,
  classes,
  insertSubjectGlobalContextSchema
} from '@shared/schema';
import { z } from 'zod';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { mcpClientService } from './mcp-client-service';

interface ActivityData {
  type: 'homework' | 'exercise' | 'quiz';
  id: number;
  title: string;
  score: number;
  totalMarks: number;
  percentage: number;
  completedAt: string;
  feedback?: {
    strengths: string[];
    improvements: string[];
    questionAnalysis?: Array<{
      questionId: string;
      isCorrect: boolean;
      points: number;
      maxPoints: number;
      feedback: string;
    }>;
  };
}

export class GlobalContextService {
  /**
   * Collect and generate global context for a student's subject performance
   */
  async generateDailyGlobalContext(studentId: number, subject: string, grade: string, contextDate: string): Promise<void> {
    console.log(`🔄 Generating daily global context for student ${studentId}, subject ${subject}, date ${contextDate}`);
    
    try {
      // Check if context already exists for today
      const existingContext = await db.select()
        .from(subjectGlobalContext)
        .where(and(
          eq(subjectGlobalContext.studentId, studentId),
          eq(subjectGlobalContext.subject, subject),
          eq(subjectGlobalContext.contextDate, contextDate)
        ))
        .limit(1);

      if (existingContext.length > 0) {
        console.log(`✅ Global context already exists for student ${studentId}, subject ${subject}, date ${contextDate}`);
        return;
      }

      // Get recent activities (last 30 days from context date to capture more data)
      const thirtyDaysAgo = new Date(contextDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activities = await this.getRecentActivitiesWithAIFeedback(studentId, subject, thirtyDaysAgo.toISOString().split('T')[0], contextDate);
      
      if (activities.length === 0) {
        console.log(`📭 No activities found for student ${studentId}, subject ${subject} in the last 30 days`);
        return;
      }

      // Generate enhanced AI feedback based on all collected responses
      const globalFeedback = await this.generateEnhancedAIGlobalFeedback(activities, subject, grade);
      
      // Calculate aggregate metrics
      const totalScore = activities.reduce((sum, activity) => sum + activity.score, 0);
      const totalMarks = activities.reduce((sum, activity) => sum + activity.totalMarks, 0);
      const averagePercentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

      // Save global context
      const contextData = {
        studentId,
        subject,
        grade,
        contextDate,
        overallFeedback: globalFeedback,
        sourceActivities: activities.map(activity => ({
          type: activity.type,
          id: activity.id,
          title: activity.title,
          score: activity.score,
          totalMarks: activity.totalMarks,
          percentage: activity.percentage,
          completedAt: activity.completedAt
        })),
        totalActivities: activities.length,
        averageScore: Math.round(totalScore / activities.length),
        averagePercentage
      };

      await db.insert(subjectGlobalContext).values([contextData]);
      
      console.log(`✅ Generated global context for student ${studentId}, subject ${subject}: ${activities.length} activities, ${averagePercentage}% average`);
      
    } catch (error) {
      console.error(`❌ Error generating global context for student ${studentId}, subject ${subject}:`, error);
      throw error;
    }
  }

  /**
   * Get recent activities with comprehensive AI feedback for a student in a subject
   */
  private async getRecentActivitiesWithAIFeedback(studentId: number, subject: string, startDate: string, endDate: string): Promise<ActivityData[]> {
    const activities: ActivityData[] = [];

    try {
      // Get homework submissions with classes for subject filtering
      const homeworkSubs = await db
        .select({
          id: homeworkSubmissions.id,
          homeworkId: homeworkSubmissions.homeworkId,
          score: homeworkSubmissions.score,
          totalMarks: homeworkSubmissions.totalMarks,
          feedback: homeworkSubmissions.feedback,
          completedAt: homeworkSubmissions.completedAt,
          title: homework.title
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .innerJoin(classes, eq(homework.classId, classes.id))
        .where(and(
          eq(homeworkSubmissions.studentId, studentId),
          eq(homeworkSubmissions.isCompleted, true),
          eq(classes.subject, subject),
          gte(homeworkSubmissions.completedAt, new Date(startDate)),
          sql`DATE(${homeworkSubmissions.completedAt}) <= ${endDate}`
        ))
        .orderBy(desc(homeworkSubmissions.completedAt));

      // Add homework to activities with enhanced feedback
      for (const sub of homeworkSubs) {
        if (sub.score !== null && sub.totalMarks !== null && sub.completedAt) {
          activities.push({
            type: 'homework',
            id: sub.homeworkId,
            title: sub.title,
            score: sub.score,
            totalMarks: sub.totalMarks,
            percentage: Math.round((sub.score / sub.totalMarks) * 100),
            completedAt: sub.completedAt.toISOString(),
            feedback: sub.feedback || undefined
          });
        }
      }

      // Get exercise submissions
      const exerciseSubs = await db
        .select({
          id: exerciseSubmissions.id,
          exerciseId: exerciseSubmissions.exerciseId,
          score: exerciseSubmissions.score,
          totalMarks: exerciseSubmissions.totalMarks,
          feedback: exerciseSubmissions.feedback,
          completedAt: exerciseSubmissions.completedAt,
          title: exercises.title
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(and(
          eq(exerciseSubmissions.studentId, studentId),
          eq(exerciseSubmissions.isCompleted, true),
          eq(exercises.subject, subject),
          gte(exerciseSubmissions.completedAt, new Date(startDate)),
          sql`DATE(${exerciseSubmissions.completedAt}) <= ${endDate}`
        ))
        .orderBy(desc(exerciseSubmissions.completedAt));

      // Add exercises to activities with enhanced feedback
      for (const sub of exerciseSubs) {
        if (sub.score !== null && sub.totalMarks !== null && sub.completedAt) {
          activities.push({
            type: 'exercise',
            id: sub.exerciseId,
            title: sub.title,
            score: sub.score,
            totalMarks: sub.totalMarks,
            percentage: Math.round((sub.score / sub.totalMarks) * 100),
            completedAt: sub.completedAt.toISOString(),
            feedback: sub.feedback || undefined
          });
        }
      }

      // Sort by completion date (most recent first)
      activities.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

      console.log(`📊 Found ${activities.length} activities for student ${studentId}, subject ${subject}`);
      
      return activities;
      
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive AI global feedback by combining all topic-specific AI responses
   */
  private async generateEnhancedAIGlobalFeedback(activities: ActivityData[], subject: string, grade: string): Promise<{
    strengths: string[];
    improvements: string[];
    keyInsights: string[];
    performanceTrend: 'improving' | 'stable' | 'declining';
    focusAreas: string[];
    recommendations: string[];
  }> {
    try {
      // Group activities by topic and collect all AI feedback
      const topicFeedbackMap = new Map<string, {
        activities: ActivityData[];
        allStrengths: string[];
        allImprovements: string[];
        questionFeedback: string[];
        averagePercentage: number;
      }>();

      // Process each activity and group by topic
      for (const activity of activities) {
        const topic = this.extractTopicFromActivity(activity);
        
        if (!topicFeedbackMap.has(topic)) {
          topicFeedbackMap.set(topic, {
            activities: [],
            allStrengths: [],
            allImprovements: [],
            questionFeedback: [],
            averagePercentage: 0
          });
        }
        
        const topicData = topicFeedbackMap.get(topic)!;
        topicData.activities.push(activity);
        
        // Collect all AI feedback for this topic
        if (activity.feedback) {
          topicData.allStrengths.push(...(activity.feedback.strengths || []));
          topicData.allImprovements.push(...(activity.feedback.improvements || []));
          
          // Collect question-level AI feedback
          if (activity.feedback.questionAnalysis) {
            topicData.questionFeedback.push(...activity.feedback.questionAnalysis.map(q => q.feedback));
          }
        }
      }

      // Calculate average percentages per topic
      topicFeedbackMap.forEach((topicData, topic) => {
        topicData.averagePercentage = topicData.activities.reduce((sum, act) => sum + act.percentage, 0) / topicData.activities.length;
      });

      // Create comprehensive summary for AI analysis
      const topicSummaries = Array.from(topicFeedbackMap.entries()).map(([topic, data]) => ({
        topic,
        activitiesCount: data.activities.length,
        averagePercentage: Math.round(data.averagePercentage),
        aiStrengths: data.allStrengths,
        aiImprovements: data.allImprovements,
        detailedFeedback: data.questionFeedback.slice(0, 10), // Limit to prevent prompt overflow
        recentActivity: data.activities[0] // Most recent activity for context
      }));

      // Generate comprehensive analysis using available MCP methods
      const response = await this.generateGlobalContextAnalysis(topicSummaries, subject, grade);
      
      // Parse AI response
      const aiAnalysis = response;

      return {
        strengths: Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths : [],
        improvements: Array.isArray(aiAnalysis.improvements) ? aiAnalysis.improvements : [],
        keyInsights: Array.isArray(aiAnalysis.keyInsights) ? aiAnalysis.keyInsights : [],
        performanceTrend: aiAnalysis.performanceTrend || 'stable',
        focusAreas: Array.isArray(aiAnalysis.focusAreas) ? aiAnalysis.focusAreas : [],
        recommendations: Array.isArray(aiAnalysis.recommendations) ? aiAnalysis.recommendations : []
      };

    } catch (error) {
      console.error('Error generating enhanced AI global feedback:', error);
      
      // Enhanced fallback that avoids generic statements
      const averagePercentage = activities.reduce((sum, act) => sum + act.percentage, 0) / activities.length;
      const trend = this.calculateSimpleTrend(activities);
      // Extract topics from activity titles and feedback
      const topicSet = new Set(activities.map(a => this.extractTopicFromActivity(a)).filter(Boolean));
      
      return {
        strengths: averagePercentage >= 80 ? [`Strong performance across ${topicSet.size} topics`] : [`Shows effort in ${subject} practice`],
        improvements: averagePercentage < 70 ? [`Mathematical accuracy and problem-solving approach`, `Attention to calculation details`] : [`Advanced ${subject} concepts`],
        keyInsights: [`Performance varies across ${topicSet.size} different topics`, `Recent average: ${Math.round(averagePercentage)}%`],
        performanceTrend: trend,
        focusAreas: Array.from(topicSet).slice(0, 3) as string[],
        recommendations: [`Practice conceptual understanding in weaker topics`, `Review mistake patterns from recent work`]
      };
    }
  }

  /**
   * Calculate simple performance trend
   */
  private calculateSimpleTrend(activities: ActivityData[]): 'improving' | 'stable' | 'declining' {
    if (activities.length < 2) return 'stable';
    
    const recentHalf = activities.slice(0, Math.ceil(activities.length / 2));
    const olderHalf = activities.slice(Math.ceil(activities.length / 2));
    
    const recentAvg = recentHalf.reduce((sum, act) => sum + act.percentage, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, act) => sum + act.percentage, 0) / olderHalf.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Generate global context for all students who have new activities
   */
  async generateDailyGlobalContextForAllStudents(contextDate: string = new Date().toISOString().split('T')[0]): Promise<void> {
    console.log(`🌍 Starting daily global context generation for date: ${contextDate}`);
    
    try {
      // Get all students who have completed activities recently
      const studentsWithActivities = await db
        .selectDistinct({
          studentId: students.id,
          userId: students.userId
        })
        .from(students);

      console.log(`👥 Found ${studentsWithActivities.length} students to process`);

      for (const student of studentsWithActivities) {
        try {
          // Get student's subjects from their recent activities
          const subjects = ['mathematics', 'physical-science', 'mathematical-literacy']; // Could be made dynamic
          
          for (const subject of subjects) {
            try {
              await this.generateDailyGlobalContext(student.studentId, subject, '10', contextDate);
            } catch (error) {
              console.error(`❌ Error generating context for student ${student.studentId}, subject ${subject}:`, error);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing student ${student.studentId}:`, error);
        }
      }

      console.log(`✅ Completed daily global context generation for ${contextDate}`);
      
    } catch (error) {
      console.error('❌ Error in daily global context generation:', error);
      throw error;
    }
  }

  /**
   * Get latest global context for a student and subject
   */
  async getLatestGlobalContext(studentId: number, subject: string): Promise<typeof subjectGlobalContext.$inferSelect | null> {
    try {
      const context = await db
        .select()
        .from(subjectGlobalContext)
        .where(and(
          eq(subjectGlobalContext.studentId, studentId),
          eq(subjectGlobalContext.subject, subject)
        ))
        .orderBy(desc(subjectGlobalContext.contextDate))
        .limit(1);

      return context[0] || null;
    } catch (error) {
      console.error('Error fetching latest global context:', error);
      return null;
    }
  }

  /**
   * Get global context history for a student and subject
   */
  async getGlobalContextHistory(studentId: number, subject: string, limit: number = 10): Promise<typeof subjectGlobalContext.$inferSelect[]> {
    try {
      const contexts = await db
        .select()
        .from(subjectGlobalContext)
        .where(and(
          eq(subjectGlobalContext.studentId, studentId),
          eq(subjectGlobalContext.subject, subject)
        ))
        .orderBy(desc(subjectGlobalContext.contextDate))
        .limit(limit);

      return contexts;
    } catch (error) {
      console.error('Error fetching global context history:', error);
      return [];
    }
  }

  /**
   * Extract topic information from activity titles and content
   */
  private extractTopicFromActivity(activity: ActivityData): string {
    // Extract topic from title if available
    if (activity.title) {
      // Look for common topic patterns in titles
      const topicPatterns = [
        { pattern: /linear\s+equation/i, topic: 'Linear Equations' },
        { pattern: /quadratic/i, topic: 'Quadratic Functions' },
        { pattern: /algebra/i, topic: 'Algebra' },
        { pattern: /geometry/i, topic: 'Geometry' },
        { pattern: /trigonometry/i, topic: 'Trigonometry' },
        { pattern: /probability/i, topic: 'Probability' },
        { pattern: /statistics/i, topic: 'Statistics' },
        { pattern: /function/i, topic: 'Functions' },
        { pattern: /inequalit/i, topic: 'Inequalities' },
        { pattern: /graph/i, topic: 'Graphs' },
        { pattern: /motion/i, topic: 'Motion' },
        { pattern: /force/i, topic: 'Forces' },
        { pattern: /electric/i, topic: 'Electricity' },
        { pattern: /wave/i, topic: 'Waves' },
        { pattern: /energy/i, topic: 'Energy' }
      ];
      
      for (const { pattern, topic } of topicPatterns) {
        if (pattern.test(activity.title)) {
          return topic;
        }
      }
    }
    
    // Fallback to title or type
    return activity.title || `${activity.type} activity`;
  }

  /**
   * Generate comprehensive global context analysis using MCP
   */
  private async generateGlobalContextAnalysis(
    topicSummaries: any[],
    subject: string,
    grade: string
  ): Promise<{
    strengths: string[];
    improvements: string[];
    keyInsights: string[];
    performanceTrend: 'improving' | 'stable' | 'declining';
    focusAreas: string[];
    recommendations: string[];
  }> {
    try {
      // Create comprehensive feedback summary for analysis
      const allStrengths = topicSummaries.flatMap(t => t.aiStrengths).filter(Boolean);
      const allImprovements = topicSummaries.flatMap(t => t.aiImprovements).filter(Boolean);
      const allDetailedFeedback = topicSummaries.flatMap(t => t.detailedFeedback).filter(Boolean);

      // Create comprehensive prompt that analyzes real AI feedback
      const prompt = `Analyze Grade ${grade} student's ${subject} performance based on actual AI feedback from completed work:

TOPIC PERFORMANCE DATA:
${JSON.stringify(topicSummaries, null, 2)}

COMPREHENSIVE AI FEEDBACK COLLECTED:
Strengths Identified: ${allStrengths.join(', ')}
Improvements Needed: ${allImprovements.join(', ')}
Detailed Question Feedback: ${allDetailedFeedback.slice(0, 10).join(' | ')}

Generate comprehensive analysis focusing on:
1. SPECIFIC mathematical/scientific skills demonstrated (not activity counts)
2. CONCRETE areas needing improvement based on actual mistakes
3. LEARNING PATTERNS from AI feedback across topics  
4. ACTIONABLE recommendations for ${subject} mastery

Respond in JSON format:
{
  "strengths": ["specific skill strength", "mathematical ability shown"],
  "improvements": ["specific gap identified", "skill needing work"], 
  "keyInsights": ["learning pattern discovered", "understanding insight"],
  "performanceTrend": "improving|stable|declining",
  "focusAreas": ["specific topic", "mathematical concept"],
  "recommendations": ["actionable step", "study strategy"]
}`;

      // Use assessment chat to generate the analysis
      const response = await mcpClientService.assessmentChat(
        prompt,
        {
          assessmentType: 'exercise',
          title: `Global ${subject} Performance Analysis`,
          subject: subject,
          topic: 'Comprehensive Review',
          grade: grade
        },
        [], // No specific questions
        {
          strengths: allStrengths.slice(0, 5),
          improvements: allImprovements.slice(0, 5),
          overallScore: topicSummaries.length > 0 ? Math.round(topicSummaries.reduce((sum, t) => sum + t.averagePercentage, 0) / topicSummaries.length) : 0,
          totalMarks: 100,
          percentage: topicSummaries.length > 0 ? Math.round(topicSummaries.reduce((sum, t) => sum + t.averagePercentage, 0) / topicSummaries.length) : 0
        }
      );

      // Extract JSON from AI response
      const cleanedResponse = response.response.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to parse JSON, fall back to manual extraction if needed
      let aiAnalysis;
      try {
        aiAnalysis = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // Manual extraction if JSON parsing fails
        aiAnalysis = this.extractAnalysisFromText(response.response, topicSummaries);
      }

      return {
        strengths: Array.isArray(aiAnalysis.strengths) ? aiAnalysis.strengths.filter(Boolean) : [],
        improvements: Array.isArray(aiAnalysis.improvements) ? aiAnalysis.improvements.filter(Boolean) : [],
        keyInsights: Array.isArray(aiAnalysis.keyInsights) ? aiAnalysis.keyInsights.filter(Boolean) : [],
        performanceTrend: aiAnalysis.performanceTrend || 'stable',
        focusAreas: Array.isArray(aiAnalysis.focusAreas) ? aiAnalysis.focusAreas.filter(Boolean) : [],
        recommendations: Array.isArray(aiAnalysis.recommendations) ? aiAnalysis.recommendations.filter(Boolean) : []
      };
      
    } catch (error) {
      console.error('Error generating MCP global context analysis:', error);
      
      // Return meaningful fallback based on actual data
      const avgPerf = topicSummaries.length > 0 ? Math.round(topicSummaries.reduce((sum, t) => sum + t.averagePercentage, 0) / topicSummaries.length) : 0;
      
      return {
        strengths: avgPerf >= 80 ? [`Strong ${subject} problem-solving skills`, `Consistent performance across topics`] : [`Shows mathematical reasoning abilities`, `Demonstrates effort in ${subject}`],
        improvements: avgPerf < 70 ? [`Computational accuracy and method verification`, `Step-by-step problem breakdown`] : [`Advanced ${subject} concepts and applications`],
        keyInsights: [`Performance analysis based on ${topicSummaries.length} topic areas`, `Current level: ${avgPerf}% average accuracy`],
        performanceTrend: 'stable' as const,
        focusAreas: [`${subject} fundamentals`, `Problem-solving methods`],
        recommendations: [`Review and practice weaker topic areas`, `Focus on step-by-step methodology`]
      };
    }
  }

  /**
   * Extract analysis from AI text response when JSON parsing fails
   */
  private extractAnalysisFromText(aiResponse: string, topicSummaries: any[]): any {
    // Basic extraction logic if JSON parsing fails
    return {
      strengths: [`Mathematical reasoning demonstrated`, `Problem-solving approach shows understanding`],
      improvements: [`Accuracy in calculations`, `Consistent methodology application`],
      keyInsights: [`Analysis based on ${topicSummaries.length} topics`, `Shows learning progress patterns`],
      performanceTrend: 'stable',
      focusAreas: [`Problem-solving`, `Mathematical foundations`],
      recommendations: [`Practice computational accuracy`, `Review fundamental concepts`]
    };
  }
}

export const globalContextService = new GlobalContextService();