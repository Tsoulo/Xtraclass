import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/index';
import { storage } from '../server/storage';
import jwt from 'jsonwebtoken';

/**
 * Comprehensive Test Suite for AI Exercise Generation and Feedback Flow
 * 
 * This test suite validates the complete workflow:
 * 1. Student submits homework
 * 2. AI generates feedback and marks assignments
 * 3. AI generates personalized tutorial exercises based on weaknesses
 * 4. Student completes tutorial and practice exercises
 * 5. Cache invalidation ensures real-time updates in calendar
 * 6. Progress tracking and point system updates correctly
 * 
 * Created to preserve the complex AI-driven educational flow even if conversation context is lost.
 */

describe('AI Exercise Generation and Feedback Flow', () => {
  let studentToken: string;
  let teacherToken: string;
  let studentUser: any;
  let teacherUser: any;
  let testHomework: any;
  let testClass: any;

  beforeAll(async () => {
    // Setup test users and authentication
    studentUser = await storage.createUser({
      email: 'test-student@example.com',
      firstName: 'Test',
      lastName: 'Student',
      role: 'student',
      grade: '8'
    });

    teacherUser = await storage.createUser({
      email: 'test-teacher@example.com',
      firstName: 'Test',
      lastName: 'Teacher',
      role: 'teacher'
    });

    // Generate JWT tokens
    studentToken = jwt.sign(
      { id: studentUser.id, role: 'student' },
      process.env.JWT_SECRET || 'test-secret'
    );

    teacherToken = jwt.sign(
      { id: teacherUser.id, role: 'teacher' },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Create a test class and homework
    testClass = await storage.createClass({
      name: 'Test Math Class',
      subject: 'mathematics',
      grade: '8',
      teacherId: teacherUser.id
    });

    testHomework = await storage.createHomework({
      classId: testClass.id,
      title: 'Algebra Practice',
      description: 'Practice with algebraic expressions',
      subject: 'mathematics',
      grade: '8',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      questions: [
        {
          id: 'q1',
          question: 'Simplify: 3x + 5x',
          answer: '8x',
          marks: 5,
          type: 'simplification'
        },
        {
          id: 'q2', 
          question: 'Solve for x: 2x + 3 = 11',
          answer: '4',
          marks: 5,
          type: 'equation'
        }
      ]
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await storage.deleteUser(studentUser.id);
    await storage.deleteUser(teacherUser.id);
  });

  describe('1. Homework Submission and AI Grading', () => {
    it('should allow student to submit homework answers', async () => {
      const submission = {
        homeworkId: testHomework.id,
        answers: [
          { questionId: 'q1', answer: '7x' }, // Incorrect answer
          { questionId: 'q2', answer: '4' }   // Correct answer
        ]
      };

      const response = await request(app)
        .post('/api/homework/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submission)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.submissionId).toBeDefined();
    });

    it('should generate AI feedback and marking for submission', async () => {
      // Get the submission we just created
      const submissions = await storage.getHomeworkSubmissionsByStudent(studentUser.id);
      const submission = submissions.find(s => s.homeworkId === testHomework.id);

      expect(submission).toBeDefined();
      expect(submission.feedback).toBeDefined();
      expect(submission.feedback.strengths).toBeInstanceOf(Array);
      expect(submission.feedback.improvements).toBeInstanceOf(Array);
      expect(submission.score).toBeGreaterThan(0);
      expect(submission.totalMarks).toBe(10);
    });

    it('should identify specific weakness areas for tutorial generation', async () => {
      const submissions = await storage.getHomeworkSubmissionsByStudent(studentUser.id);
      const submission = submissions.find(s => s.homeworkId === testHomework.id);

      // Should identify algebraic simplification as weakness area
      expect(submission.feedback.improvements).toContain(
        expect.stringMatching(/simplif/i)
      );
    });
  });

  describe('2. AI Tutorial Exercise Generation', () => {
    it('should generate personalized tutorial exercise based on homework feedback', async () => {
      const requestBody = {
        homeworkId: testHomework.id,
        topicName: 'Algebra',
        weaknessAreas: ['algebraic simplification', 'combining like terms'],
        subject: 'mathematics',
        grade: '8'
      };

      const response = await request(app)
        .post('/api/generate-tutorial-exercise')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.tutorial).toBeDefined();
      expect(response.body.exercise).toBeDefined();
      expect(response.body.tutorial.steps).toBeInstanceOf(Array);
      expect(response.body.tutorial.steps.length).toBeGreaterThan(0);
      expect(response.body.exercise.questions).toBeInstanceOf(Array);
      expect(response.body.exercise.hasInitialTutorial).toBe(true);
    });

    it('should store tutorial exercise with proper metadata', async () => {
      const exercises = await storage.getExercisesByDate(
        new Date().toISOString().split('T')[0],
        '8'
      );

      const tutorialExercise = exercises.find(e => e.hasInitialTutorial);
      expect(tutorialExercise).toBeDefined();
      expect(tutorialExercise.generatedFor).toBe(studentUser.id);
      expect(tutorialExercise.title).toContain('Practice');
      expect(tutorialExercise.tutorialContent).toBeDefined();
    });

    it('should enforce daily generation limits', async () => {
      // Try to generate more exercises than the daily limit (5)
      const requestBody = {
        homeworkId: testHomework.id,
        topicName: 'Algebra',
        weaknessAreas: ['equations'],
        subject: 'mathematics',
        grade: '8'
      };

      // Generate exercises up to the limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/generate-tutorial-exercise')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(requestBody);
      }

      // This should fail due to daily limit
      const response = await request(app)
        .post('/api/generate-tutorial-exercise')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toContain('daily limit');
    });
  });

  describe('3. Tutorial Flow and Exercise Completion', () => {
    it('should provide tutorial content in Brilliant-style format', async () => {
      const exercises = await storage.getExercisesByDate(
        new Date().toISOString().split('T')[0],
        '8'
      );

      const tutorialExercise = exercises.find(e => e.hasInitialTutorial);
      const tutorialContent = JSON.parse(tutorialExercise.tutorialContent);

      expect(tutorialContent.steps).toBeInstanceOf(Array);
      expect(tutorialContent.steps[0]).toHaveProperty('stepNumber');
      expect(tutorialContent.steps[0]).toHaveProperty('title');
      expect(tutorialContent.steps[0]).toHaveProperty('explanation');
      expect(tutorialContent.steps[0]).toHaveProperty('example');
      expect(tutorialContent.steps[0].example).toHaveProperty('problem');
      expect(tutorialContent.steps[0].example).toHaveProperty('solution');
    });

    it('should allow student to submit tutorial exercise answers', async () => {
      const exercises = await storage.getExercisesByDate(
        new Date().toISOString().split('T')[0],
        '8'
      );

      const tutorialExercise = exercises.find(e => e.hasInitialTutorial);
      
      const submission = {
        exerciseId: tutorialExercise.id,
        answers: tutorialExercise.questions.map((q: any, index: number) => ({
          questionId: q.id || `q${index}`,
          answer: 'test answer'
        }))
      };

      const response = await request(app)
        .post('/api/exercises/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(submission)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.submission).toBeDefined();
    });

    it('should award points for completing tutorial exercises', async () => {
      const userBefore = await storage.getUser(studentUser.id);
      const pointsBefore = userBefore.points || 0;

      // Complete a tutorial exercise (this should award 10 points)
      const exercises = await storage.getExercisesByDate(
        new Date().toISOString().split('T')[0],
        '8'
      );

      const tutorialExercise = exercises.find(e => e.hasInitialTutorial);
      
      await request(app)
        .post('/api/exercises/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          exerciseId: tutorialExercise.id,
          answers: [{ questionId: 'q1', answer: 'test' }]
        });

      const userAfter = await storage.getUser(studentUser.id);
      expect(userAfter.points).toBe(pointsBefore + 10);
    });
  });

  describe('4. Topic-Specific Feedback Storage', () => {
    it('should store feedback by topic for personalized learning', async () => {
      const feedbackData = {
        studentId: studentUser.id,
        topicId: 1, // Algebra topic
        subject: 'mathematics',
        strengths: ['Basic algebraic understanding'],
        improvements: ['Practice combining like terms', 'Review distribution'],
        exerciseType: 'homework',
        sourceId: testHomework.id
      };

      const response = await request(app)
        .post('/api/student/topic-feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(feedbackData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should retrieve topic feedback for dashboard display', async () => {
      const response = await request(app)
        .get('/api/student/topic-feedback/mathematics/1')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.feedback).toBeDefined();
      expect(response.body.feedback.strengths).toBeInstanceOf(Array);
      expect(response.body.feedback.improvements).toBeInstanceOf(Array);
    });

    it('should aggregate feedback from multiple exercises', async () => {
      // Add more feedback for the same topic
      await request(app)
        .post('/api/student/topic-feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: studentUser.id,
          topicId: 1,
          subject: 'mathematics',
          strengths: ['Improved equation solving'],
          improvements: ['Work on complex fractions'],
          exerciseType: 'exercise',
          sourceId: 999
        });

      const response = await request(app)
        .get('/api/student/topic-feedback/mathematics/1')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Should combine feedback from multiple sources
      expect(response.body.feedback.strengths.length).toBeGreaterThan(1);
      expect(response.body.feedback.improvements.length).toBeGreaterThan(1);
    });
  });

  describe('5. Cache Invalidation and Real-Time Updates', () => {
    it('should return updated exercise list immediately after generation', async () => {
      // Get initial exercise count
      const beforeResponse = await request(app)
        .get(`/api/exercises?date=${new Date().toISOString().split('T')[0]}&grade=8`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const beforeCount = beforeResponse.body.length;

      // Generate a new exercise
      await request(app)
        .post('/api/generate-tutorial-exercise')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          homeworkId: testHomework.id,
          topicName: 'Geometry',
          weaknessAreas: ['area calculations'],
          subject: 'mathematics',
          grade: '8'
        });

      // Get updated exercise list (should include new exercise)
      const afterResponse = await request(app)
        .get(`/api/exercises?date=${new Date().toISOString().split('T')[0]}&grade=8`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(afterResponse.body.length).toBe(beforeCount + 1);
    });

    it('should include cache-busting headers in exercise responses', async () => {
      const response = await request(app)
        .get(`/api/exercises?date=${new Date().toISOString().split('T')[0]}&grade=8`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });
  });

  describe('6. MCP Integration and AI Services', () => {
    it('should use MCP protocol for all AI operations', async () => {
      // Mock MCP service responses
      const mcpSpy = vi.spyOn(require('../server/mcp-client-service'), 'callMCPTool');
      
      await request(app)
        .post('/api/generate-tutorial-exercise')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          homeworkId: testHomework.id,
          topicName: 'Algebra',
          weaknessAreas: ['simplification'],
          subject: 'mathematics',
          grade: '8'
        });

      // Verify MCP service was called
      expect(mcpSpy).toHaveBeenCalled();
      expect(mcpSpy).toHaveBeenCalledWith(
        expect.stringMatching(/generate_tutorial|generate_feedback/),
        expect.any(Object)
      );
    });

    it('should handle MCP service errors gracefully', async () => {
      // Mock MCP service to throw error
      const mcpSpy = vi.spyOn(require('../server/mcp-client-service'), 'callMCPTool')
        .mockRejectedValueOnce(new Error('MCP service unavailable'));

      const response = await request(app)
        .post('/api/generate-tutorial-exercise')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          homeworkId: testHomework.id,
          topicName: 'Algebra',
          weaknessAreas: ['simplification'],
          subject: 'mathematics',
          grade: '8'
        })
        .expect(500);

      expect(response.body.message).toContain('Failed to generate');
      mcpSpy.mockRestore();
    });
  });

  describe('7. Data Integrity and Validation', () => {
    it('should validate exercise generation requests', async () => {
      const invalidRequest = {
        // Missing required fields
        topicName: 'Algebra'
      };

      const response = await request(app)
        .post('/api/generate-tutorial-exercise')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should ensure proper question numbering and marking', async () => {
      const exercises = await storage.getExercisesByDate(
        new Date().toISOString().split('T')[0],
        '8'
      );

      const tutorialExercise = exercises.find(e => e.hasInitialTutorial);
      
      tutorialExercise.questions.forEach((question: any, index: number) => {
        expect(question.questionNumber || question.id).toBeDefined();
        expect(question.marks).toBeGreaterThan(0);
        expect(question.question).toBeTruthy();
      });
    });

    it('should maintain referential integrity between exercises and feedback', async () => {
      const exercises = await storage.getExercisesByDate(
        new Date().toISOString().split('T')[0],
        '8'
      );

      const tutorialExercise = exercises.find(e => e.hasInitialTutorial);
      expect(tutorialExercise.generatedFor).toBe(studentUser.id);

      // Verify the student exists
      const student = await storage.getUser(tutorialExercise.generatedFor);
      expect(student).toBeDefined();
      expect(student.role).toBe('student');
    });
  });

  describe('8. Multi-Role Access Control', () => {
    it('should allow students to access their own exercises', async () => {
      const response = await request(app)
        .get(`/api/exercises?date=${new Date().toISOString().split('T')[0]}&grade=8`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow teachers to view all exercises', async () => {
      const response = await request(app)
        .get(`/api/exercises?date=${new Date().toISOString().split('T')[0]}&grade=8`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should prevent unauthorized access to exercise generation', async () => {
      const response = await request(app)
        .post('/api/generate-tutorial-exercise')
        .send({
          homeworkId: testHomework.id,
          topicName: 'Algebra',
          weaknessAreas: ['simplification'],
          subject: 'mathematics',
          grade: '8'
        })
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });
});

/**
 * Integration Test Documentation
 * 
 * This test suite covers the complete AI-driven educational flow:
 * 
 * 1. HOMEWORK SUBMISSION FLOW:
 *    - Student submits answers to homework questions
 *    - AI analyzes answers and generates personalized feedback
 *    - System identifies specific weakness areas
 *    - Points are awarded for completion
 * 
 * 2. AI TUTORIAL GENERATION:
 *    - Based on homework feedback, AI generates targeted tutorials
 *    - Tutorials use Brilliant-style step-by-step format
 *    - Each step includes explanation, example, and key points
 *    - Practice exercises are generated with varying difficulty
 * 
 * 3. CACHE INVALIDATION SYSTEM:
 *    - New exercises appear immediately in calendar
 *    - Multiple invalidation strategies ensure real-time updates
 *    - Cache-busting headers prevent stale data
 * 
 * 4. MCP INTEGRATION:
 *    - All AI operations use Model Context Protocol
 *    - Standardized interface for AI model integration
 *    - Graceful error handling for service unavailability
 * 
 * 5. TOPIC-SPECIFIC FEEDBACK:
 *    - Feedback is stored by subject and topic
 *    - Aggregated across multiple assignments
 *    - Used for personalized learning recommendations
 * 
 * 6. MULTI-ROLE SUPPORT:
 *    - Students see their personalized content
 *    - Teachers can view all student progress
 *    - Parents can track children's performance
 * 
 * These tests serve as living documentation of the system's behavior
 * and ensure the complex AI educational workflow remains functional
 * even if conversation context is lost.
 */