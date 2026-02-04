import type { Express } from "express";
import { globalContextService } from './global-context-service';
import { authenticateToken } from './auth';
import { globalContextMigration } from './migrations/global-context-migration';

export function registerGlobalContextRoutes(app: Express) {
  
  // Generate global context for a specific student and subject
  app.post('/api/global-context/generate', authenticateToken, async (req, res) => {
    try {
      const { studentId, subject, grade, contextDate } = req.body;
      
      if (!studentId || !subject || !grade) {
        return res.status(400).json({ 
          error: 'Missing required fields: studentId, subject, grade' 
        });
      }

      const date = contextDate || new Date().toISOString().split('T')[0];
      
      await globalContextService.generateDailyGlobalContext(
        parseInt(studentId), 
        subject, 
        grade, 
        date
      );
      
      res.json({ 
        message: 'Global context generated successfully',
        studentId,
        subject,
        contextDate: date
      });
      
    } catch (error) {
      console.error('Error generating global context:', error);
      res.status(500).json({ error: 'Failed to generate global context' });
    }
  });

  // Generate global context for all students (daily batch job)
  app.post('/api/global-context/generate-daily', authenticateToken, async (req, res) => {
    try {
      const { contextDate } = req.body;
      const date = contextDate || new Date().toISOString().split('T')[0];
      
      await globalContextService.generateDailyGlobalContextForAllStudents(date);
      
      res.json({ 
        message: 'Daily global context generation completed',
        contextDate: date
      });
      
    } catch (error) {
      console.error('Error in daily global context generation:', error);
      res.status(500).json({ error: 'Failed to generate daily global context' });
    }
  });

  // Force generate context with past date (for testing)
  app.post('/api/global-context/force-generate', authenticateToken, async (req, res) => {
    try {
      const { studentId, subject, grade, daysBack } = req.body;
      
      if (!studentId || !subject || !grade) {
        return res.status(400).json({ 
          error: 'Missing required fields: studentId, subject, grade' 
        });
      }

      // Generate context for multiple past dates to create history
      const days = daysBack || 7;
      const results = [];
      
      for (let i = 0; i < days; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - i);
        const dateString = pastDate.toISOString().split('T')[0];
        
        try {
          await globalContextService.generateDailyGlobalContext(
            parseInt(studentId), 
            subject, 
            grade, 
            dateString
          );
          results.push({ date: dateString, status: 'success' });
        } catch (error) {
          results.push({ date: dateString, status: 'failed', error: (error as Error).message });
        }
      }
      
      res.json({ 
        message: 'Force generation completed',
        results
      });
      
    } catch (error) {
      console.error('Error in force generate context:', error);
      res.status(500).json({ error: 'Failed to force generate context' });
    }
  });

  // Get latest global context for a student and subject
  app.get('/api/global-context/latest/:studentId/:subject', authenticateToken, async (req, res) => {
    try {
      const { studentId, subject } = req.params;
      
      const context = await globalContextService.getLatestGlobalContext(
        parseInt(studentId), 
        subject
      );
      
      if (!context) {
        return res.status(404).json({ 
          error: 'No global context found for this student and subject' 
        });
      }
      
      res.json(context);
      
    } catch (error) {
      console.error('Error fetching latest global context:', error);
      res.status(500).json({ error: 'Failed to fetch global context' });
    }
  });

  // Get global context history for a student and subject
  app.get('/api/global-context/history/:studentId/:subject', authenticateToken, async (req, res) => {
    try {
      const { studentId, subject } = req.params;
      const { limit } = req.query;
      
      const contexts = await globalContextService.getGlobalContextHistory(
        parseInt(studentId), 
        subject,
        limit ? parseInt(limit as string) : 10
      );
      
      res.json(contexts);
      
    } catch (error) {
      console.error('Error fetching global context history:', error);
      res.status(500).json({ error: 'Failed to fetch global context history' });
    }
  });

  // Get global context for current authenticated student
  app.get('/api/student/global-context/:subject', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { subject } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get student record from user ID
      const { db } = await import('./db');
      const { students } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const student = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
      
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student record not found' });
      }

      const context = await globalContextService.getLatestGlobalContext(
        student[0].id, 
        subject
      );
      
      if (!context) {
        return res.status(404).json({ 
          error: 'No global context found for this subject' 
        });
      }
      
      res.json(context);
      
    } catch (error) {
      console.error('Error fetching student global context:', error);
      res.status(500).json({ error: 'Failed to fetch global context' });
    }
  });

  // Get global context history for current authenticated student
  app.get('/api/student/global-context/:subject/history', authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { subject } = req.params;
      const { limit } = req.query;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get student record from user ID
      const { db } = await import('./db');
      const { students } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const student = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
      
      if (student.length === 0) {
        return res.status(404).json({ error: 'Student record not found' });
      }

      const contexts = await globalContextService.getGlobalContextHistory(
        student[0].id, 
        subject,
        limit ? parseInt(limit as string) : 10
      );
      
      res.json(contexts);
      
    } catch (error) {
      console.error('Error fetching student global context history:', error);
      res.status(500).json({ error: 'Failed to fetch global context history' });
    }
  });

  // Run migration to generate missing global context for all students
  app.post('/api/global-context/run-migration', authenticateToken, async (req, res) => {
    try {
      console.log('🚀 Starting global context migration for all students...');
      
      const results = await globalContextMigration.runMigration();
      
      res.json({ 
        message: 'Global context migration completed successfully',
        studentsProcessed: results.studentsProcessed,
        contextsGenerated: results.contextsGenerated
      });
      
    } catch (error) {
      console.error('❌ Error running global context migration:', error);
      res.status(500).json({ error: 'Failed to run migration' });
    }
  });

  // Check migration status - see how many students need global context
  app.get('/api/global-context/migration-status', authenticateToken, async (req, res) => {
    try {
      const status = await globalContextMigration.checkMigrationStatus();
      
      res.json({
        message: 'Migration status check completed',
        ...status
      });
      
    } catch (error) {
      console.error('❌ Error checking migration status:', error);
      res.status(500).json({ error: 'Failed to check migration status' });
    }
  });

  // Migration endpoint to populate global context for existing data
  app.post('/api/global-context/migrate-existing-data', authenticateToken, async (req, res) => {
    try {
      const { studentId, subject, grade, daysBack } = req.body;
      
      if (!studentId) {
        return res.status(400).json({ 
          error: 'Missing required field: studentId' 
        });
      }

      console.log(`🔄 Starting migration for student ${studentId}...`);
      
      // If no specific subject provided, migrate all subjects for the student
      const subjectsToMigrate = subject ? [subject] : ['mathematics', 'physical-science', 'mathematical-literacy'];
      const days = daysBack || 30; // Default to 30 days back
      const results = [];

      for (const subj of subjectsToMigrate) {
        console.log(`📚 Migrating ${subj} for student ${studentId}...`);
        
        // Generate context for multiple past dates to create history
        for (let i = 0; i < days; i += 7) { // Generate weekly data points
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - i);
          const dateString = pastDate.toISOString().split('T')[0];
          
          try {
            // Check if context already exists for this date
            const { db } = await import('./db');
            const { subjectGlobalContext } = await import('@shared/schema');
            const { eq, and } = await import('drizzle-orm');
            
            const existingContext = await db.select()
              .from(subjectGlobalContext)
              .where(and(
                eq(subjectGlobalContext.studentId, parseInt(studentId)),
                eq(subjectGlobalContext.subject, subj),
                eq(subjectGlobalContext.contextDate, dateString)
              ))
              .limit(1);

            if (existingContext.length === 0) {
              await globalContextService.generateDailyGlobalContext(
                parseInt(studentId), 
                subj, 
                grade || '10', 
                dateString
              );
              results.push({ subject: subj, date: dateString, status: 'created' });
            } else {
              results.push({ subject: subj, date: dateString, status: 'exists' });
            }
          } catch (error) {
            console.error(`❌ Migration failed for ${subj} on ${dateString}:`, (error as Error).message);
            results.push({ subject: subj, date: dateString, status: 'failed', error: (error as Error).message });
          }
        }
      }
      
      console.log(`✅ Migration completed for student ${studentId}`);
      
      res.json({ 
        message: 'Migration completed',
        studentId,
        results
      });
      
    } catch (error) {
      console.error('❌ Error in migration:', error);
      res.status(500).json({ error: 'Failed to migrate existing data' });
    }
  });
}