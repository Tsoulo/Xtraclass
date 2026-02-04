import { globalContextService } from "../global-context-service";
import { db } from "../db";
import { students, homeworkSubmissions, exerciseSubmissions, subjectGlobalContext, homework, exercises, classes } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Migration to generate missing global context for students
 * This identifies students with completed activities but no global context
 * and generates comprehensive AI analysis for them
 */
export class GlobalContextMigration {
  
  /**
   * Run the migration to generate missing global context
   */
  async runMigration(): Promise<{ studentsProcessed: number; contextsGenerated: number }> {
    console.log('🚀 Starting global context migration...');
    
    try {
      let studentsProcessed = 0;
      let contextsGenerated = 0;
      
      // Get all students who have completed activities
      const studentsWithActivities = await this.getStudentsWithMissingGlobalContext();
      
      console.log(`👥 Found ${studentsWithActivities.length} students with missing global context`);
      
      for (const studentData of studentsWithActivities) {
        try {
          studentsProcessed++;
          console.log(`🔄 Processing student ${studentData.studentId} for subjects: ${studentData.subjects.join(', ')}`);
          
          for (const subject of studentData.subjects) {
            try {
              // Check if context already exists for this student/subject
              const existingContext = await db
                .select()
                .from(subjectGlobalContext)
                .where(and(
                  eq(subjectGlobalContext.studentId, studentData.studentId),
                  eq(subjectGlobalContext.subject, subject)
                ))
                .limit(1);

              if (existingContext.length === 0) {
                // Generate global context using historical data (30 days back) 
                await this.generateHistoricalGlobalContext(
                  studentData.studentId,
                  subject,
                  studentData.grade || '10'
                );
                
                contextsGenerated++;
                console.log(`✅ Generated global context for student ${studentData.studentId}, subject ${subject}`);
              } else {
                console.log(`ℹ️ Global context already exists for student ${studentData.studentId}, subject ${subject}`);
              }
              
            } catch (error) {
              console.error(`❌ Error generating context for student ${studentData.studentId}, subject ${subject}:`, error);
            }
          }
          
        } catch (error) {
          console.error(`❌ Error processing student ${studentData.studentId}:`, error);
        }
      }
      
      console.log(`✅ Migration completed: ${studentsProcessed} students processed, ${contextsGenerated} contexts generated`);
      
      return { studentsProcessed, contextsGenerated };
      
    } catch (error) {
      console.error('❌ Error in global context migration:', error);
      throw error;
    }
  }

  /**
   * Generate global context using historical data (30 days back)
   */
  private async generateHistoricalGlobalContext(studentId: number, subject: string, grade: string): Promise<void> {
    console.log(`🕰️ Generating historical global context for student ${studentId}, subject ${subject}`);
    
    try {
      // Look back 30 days to find any completed activities
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date().toISOString().split('T')[0];
      
      // Use the existing service but with a broader date range
      await globalContextService.generateDailyGlobalContext(
        studentId,
        subject,
        grade,
        today
      );
      
    } catch (error) {
      console.error('Error generating historical global context:', error);
      throw error;
    }
  }
  
  /**
   * Identify students who have completed activities but lack global context
   */
  private async getStudentsWithMissingGlobalContext(): Promise<Array<{
    studentId: number;
    subjects: string[];
    grade?: string;
  }>> {
    try {
      const studentMap = new Map<number, { subjects: Set<string>; grade?: string }>();
      
      // Get students with homework submissions - need to join through classes to get subject/grade
      const homeworkQuery = await db
        .select({
          studentId: homeworkSubmissions.studentId,
          subject: classes.subject,
          grade: classes.grade
        })
        .from(homeworkSubmissions)
        .innerJoin(homework, eq(homeworkSubmissions.homeworkId, homework.id))
        .innerJoin(classes, eq(homework.classId, classes.id))
        .where(eq(homeworkSubmissions.isCompleted, true));

      for (const record of homeworkQuery) {
        if (!studentMap.has(record.studentId)) {
          studentMap.set(record.studentId, { subjects: new Set(), grade: record.grade });
        }
        const studentData = studentMap.get(record.studentId)!;
        studentData.subjects.add(record.subject);
        if (!studentData.grade && record.grade) {
          studentData.grade = record.grade;
        }
      }

      // Get students with exercise submissions - exercises have subject/grade directly
      const exerciseQuery = await db
        .select({
          studentId: exerciseSubmissions.studentId,
          subject: exercises.subject,
          grade: exercises.grade
        })
        .from(exerciseSubmissions)
        .innerJoin(exercises, eq(exerciseSubmissions.exerciseId, exercises.id))
        .where(eq(exerciseSubmissions.isCompleted, true));

      for (const record of exerciseQuery) {
        if (!studentMap.has(record.studentId)) {
          studentMap.set(record.studentId, { subjects: new Set(), grade: record.grade });
        }
        const studentData = studentMap.get(record.studentId)!;
        studentData.subjects.add(record.subject);
        if (!studentData.grade && record.grade) {
          studentData.grade = record.grade;
        }
      }

      // Convert to array format
      const result = Array.from(studentMap.entries()).map(([studentId, data]) => ({
        studentId,
        subjects: Array.from(data.subjects),
        grade: data.grade
      }));

      console.log(`📊 Migration scan complete: found ${result.length} students with activity data`);
      
      return result;
      
    } catch (error) {
      console.error('Error identifying students with missing global context:', error);
      return [];
    }
  }
  
  /**
   * Check migration status - how many students need global context
   */
  async checkMigrationStatus(): Promise<{
    studentsWithActivities: number;
    studentsWithGlobalContext: number;
    subjectsNeedingContext: number;
  }> {
    try {
      const studentsWithMissingContext = await this.getStudentsWithMissingGlobalContext();
      
      // Count existing global contexts
      const [existingContexts] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${subjectGlobalContext.studentId})` })
        .from(subjectGlobalContext);

      const totalSubjectsNeedingContext = studentsWithMissingContext.reduce(
        (total, student) => total + student.subjects.length, 0
      );

      return {
        studentsWithActivities: studentsWithMissingContext.length,
        studentsWithGlobalContext: Number(existingContexts?.count) || 0,
        subjectsNeedingContext: totalSubjectsNeedingContext
      };
      
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        studentsWithActivities: 0,
        studentsWithGlobalContext: 0,
        subjectsNeedingContext: 0
      };
    }
  }
}

export const globalContextMigration = new GlobalContextMigration();