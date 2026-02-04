import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../server/index'
import { db } from '../../server/db'
import { users, students, teachers, classes, classStudents, homework, homeworkSubmissions } from '../../shared/schema'
import { eq } from 'drizzle-orm'

describe('Homework API Endpoints', () => {
  let authToken: string
  let testTeacherId: number
  let testClassId: number
  let testHomeworkId: number
  let testStudentIds: number[] = []
  let testUserIds: number[] = []

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, 777))
    await db.delete(homework).where(eq(homework.id, 777))
    await db.delete(classStudents).where(eq(classStudents.classId, 777))
    await db.delete(classes).where(eq(classes.id, 777))
    await db.delete(teachers).where(eq(teachers.userId, 7777))
    await db.delete(students).where(eq(students.studentId, 'API777'))
    await db.delete(users).where(eq(users.email, 'api-test@homework.test'))

    // Create test teacher user and get auth token
    const [teacherUser] = await db.insert(users).values({
      email: 'api-test-teacher@homework.test',
      firstName: 'API',
      lastName: 'Teacher',
      password: '$2a$10$hashed.password.here', // Hashed version of 'password123'
      role: 'teacher',
      isActive: true
    }).returning()
    testUserIds.push(teacherUser.id)

    // Create teacher profile
    const [teacher] = await db.insert(teachers).values({
      userId: teacherUser.id,
      schoolId: 1,
      subjects: ['mathematics'],
      grades: ['8']
    }).returning()
    testTeacherId = teacher.id

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'api-test-teacher@homework.test',
        password: 'password123'
      })
    
    expect(loginResponse.status).toBe(200)
    authToken = loginResponse.body.token || loginResponse.headers['set-cookie']?.[0]?.split('=')[1]?.split(';')[0]

    // Create test class
    const [testClass] = await db.insert(classes).values({
      id: 777,
      name: 'API Test Class',
      description: 'Test class for API testing',
      grade: '8',
      subject: 'mathematics',
      teacherId: testTeacherId,
      classCode: 'API777'
    }).returning()
    testClassId = testClass.id

    // Create test students
    const studentUsers = await Promise.all([
      db.insert(users).values({
        email: 'api-student1@homework.test',
        firstName: 'API',
        lastName: 'Student1',
        password: '$2a$10$hashed.password.here',
        role: 'student',
        isActive: true
      }).returning(),
      db.insert(users).values({
        email: 'api-student2@homework.test',
        firstName: 'API',
        lastName: 'Student2',
        password: '$2a$10$hashed.password.here',
        role: 'student',
        isActive: true
      }).returning()
    ])

    testUserIds.push(...studentUsers.map(([user]) => user.id))

    const studentProfiles = await Promise.all(studentUsers.map(async ([user], index) => {
      const [student] = await db.insert(students).values({
        userId: user.id,
        studentId: `API777${index + 1}`,
        gradeLevel: '8',
        schoolName: 'API Test School'
      }).returning()
      return student
    }))

    testStudentIds = studentProfiles.map(s => s.id)

    // Enroll students in class
    await Promise.all(testStudentIds.map(studentId =>
      db.insert(classStudents).values({
        classId: testClassId,
        studentId: studentId
      })
    ))

    // Create test homework
    const [testHomework] = await db.insert(homework).values({
      id: 777,
      classId: testClassId,
      title: 'API Test Homework',
      description: 'Test homework for API endpoints',
      questions: [
        {
          id: 'api-q1',
          question: 'What is 5 + 3?',
          type: 'equation',
          difficulty: 'easy',
          points: 5
        },
        {
          id: 'api-q2',
          question: 'Solve x² - 4 = 0',
          type: 'equation',
          difficulty: 'medium',
          points: 10
        }
      ],
      totalMarks: 15,
      dueDate: new Date(),
      isPublished: true
    }).returning()
    testHomeworkId = testHomework.id
  })

  afterAll(async () => {
    // Clean up test data
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, testHomeworkId))
    await db.delete(homework).where(eq(homework.id, testHomeworkId))
    await db.delete(classStudents).where(eq(classStudents.classId, testClassId))
    await db.delete(classes).where(eq(classes.id, testClassId))
    await Promise.all(testStudentIds.map(id => 
      db.delete(students).where(eq(students.id, id))
    ))
    await db.delete(teachers).where(eq(teachers.id, testTeacherId))
    await Promise.all(testUserIds.map(id =>
      db.delete(users).where(eq(users.id, id))
    ))
  })

  describe('GET /api/homework/:id/submissions', () => {
    it('should return homework submissions for valid homework ID', async () => {
      const response = await request(app)
        .get(`/api/homework/${testHomeworkId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0) // No submissions initially
    })

    it('should return empty array for homework with no submissions', async () => {
      const response = await request(app)
        .get(`/api/homework/${testHomeworkId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual([])
    })

    it('should handle non-existent homework ID', async () => {
      const response = await request(app)
        .get('/api/homework/99999/submissions')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/homework/${testHomeworkId}/submissions`)

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Access token required')
    })

    it('should return submissions with proper data structure', async () => {
      // Create a test submission first
      const [submission] = await db.insert(homeworkSubmissions).values({
        homeworkId: testHomeworkId,
        studentId: testStudentIds[0],
        answers: [
          { questionId: 'api-q1', answer: '8', isCorrect: true, score: 5 },
          { questionId: 'api-q2', answer: 'x = ±2', isCorrect: true, score: 10 }
        ],
        isCompleted: true,
        score: 15,
        totalMarks: 15,
        submittedAt: new Date()
      }).returning()

      const response = await request(app)
        .get(`/api/homework/${testHomeworkId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(1)

      const submissionData = response.body[0]
      expect(submissionData).toHaveProperty('id')
      expect(submissionData).toHaveProperty('homeworkId')
      expect(submissionData).toHaveProperty('studentId')
      expect(submissionData).toHaveProperty('answers')
      expect(submissionData).toHaveProperty('score')
      expect(submissionData).toHaveProperty('totalMarks')
      expect(submissionData).toHaveProperty('isCompleted')
      expect(submissionData).toHaveProperty('submittedAt')

      expect(submissionData.homeworkId).toBe(testHomeworkId)
      expect(submissionData.studentId).toBe(testStudentIds[0])
      expect(submissionData.score).toBe(15)
      expect(submissionData.isCompleted).toBe(true)

      // Clean up
      await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.id, submission.id))
    })
  })

  describe('GET /api/classes/:id/students', () => {
    it('should return enrolled students for valid class ID', async () => {
      const response = await request(app)
        .get(`/api/classes/${testClassId}/students`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(2) // Two test students
    })

    it('should return student data with proper structure', async () => {
      const response = await request(app)
        .get(`/api/classes/${testClassId}/students`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      
      const students = response.body
      students.forEach((student: any) => {
        expect(student).toHaveProperty('id')
        expect(student).toHaveProperty('userId')
        expect(student).toHaveProperty('studentId')
        expect(student).toHaveProperty('firstName')
        expect(student).toHaveProperty('lastName')
        expect(student).toHaveProperty('email')
        expect(student).toHaveProperty('gradeLevel')
        expect(student).toHaveProperty('schoolName')
        expect(student).toHaveProperty('enrolledAt')

        expect(typeof student.id).toBe('number')
        expect(typeof student.firstName).toBe('string') 
        expect(typeof student.lastName).toBe('string')
        expect(student.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        expect(student.gradeLevel).toBe('8')
      })
    })

    it('should return empty array for class with no students', async () => {
      // Create empty class
      const [emptyClass] = await db.insert(classes).values({
        id: 776,
        name: 'Empty API Class',
        description: 'Empty class for testing',
        grade: '9',
        subject: 'mathematics',
        teacherId: testTeacherId,
        classCode: 'EMPTY776'
      }).returning()

      const response = await request(app)
        .get(`/api/classes/${emptyClass.id}/students`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)

      // Clean up
      await db.delete(classes).where(eq(classes.id, emptyClass.id))
    })

    it('should handle non-existent class ID', async () => {
      const response = await request(app)
        .get('/api/classes/99999/students')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/classes/${testClassId}/students`)

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('Access token required')
    })
  })

  describe('Integration Test: Homework Analysis Data Flow', () => {
    it('should provide consistent data for homework analysis', async () => {
      // This test simulates the full data flow used by homework analysis
      
      // 1. Get homework details
      const homework = await db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, testHomeworkId))
      
      // 2. Get homework submissions
      const submissionsResponse = await request(app)
        .get(`/api/homework/${testHomeworkId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)
      
      // 3. Get enrolled students  
      const studentsResponse = await request(app)
        .get(`/api/classes/${testClassId}/students`)
        .set('Authorization', `Bearer ${authToken}`)
      
      expect(submissionsResponse.status).toBe(200)
      expect(studentsResponse.status).toBe(200)
      
      const submissions = submissionsResponse.body
      const students = studentsResponse.body
      
      // 4. Verify data consistency for analysis calculations
      expect(Array.isArray(submissions)).toBe(true)
      expect(Array.isArray(students)).toBe(true)
      expect(students.length).toBe(2) // Known enrolled students
      
      // 5. Test pending students calculation (the original bug)
      const pendingStudents = students.filter((student: any) => 
        !submissions.some((sub: any) => sub.student_id === student.id)
      )
      
      // All students should be pending since no submissions
      expect(pendingStudents.length).toBe(2)
      expect(pendingStudents.every((s: any) => 
        students.some((enrolled: any) => enrolled.id === s.id)
      )).toBe(true)
      
      // 6. Test completion rate calculation
      const completionRate = students.length > 0 
        ? Math.round((submissions.length / students.length) * 100)
        : 0
      expect(completionRate).toBe(0) // 0% since no submissions
    })

    it('should handle partial submissions correctly', async () => {
      // Create one submission for testing
      const [submission] = await db.insert(homeworkSubmissions).values({
        homeworkId: testHomeworkId,
        studentId: testStudentIds[0],
        answers: [
          { questionId: 'api-q1', answer: '8', isCorrect: true, score: 5 },
          { questionId: 'api-q2', answer: 'x = ±2', isCorrect: false, score: 3 }
        ],
        isCompleted: true,
        score: 8,
        totalMarks: 15,
        submittedAt: new Date()
      }).returning()

      // Get data for analysis
      const submissionsResponse = await request(app)
        .get(`/api/homework/${testHomeworkId}/submissions`)
        .set('Authorization', `Bearer ${authToken}`)
      
      const studentsResponse = await request(app)
        .get(`/api/classes/${testClassId}/students`)
        .set('Authorization', `Bearer ${authToken}`)
      
      const submissions = submissionsResponse.body
      const students = studentsResponse.body
      
      // Test analysis calculations with partial data
      expect(submissions.length).toBe(1)
      expect(students.length).toBe(2)
      
      const completionRate = Math.round((submissions.length / students.length) * 100)
      expect(completionRate).toBe(50) // 1 of 2 students = 50%
      
      const pendingStudents = students.filter((student: any) => 
        !submissions.some((sub: any) => sub.student_id === student.id)
      )
      expect(pendingStudents.length).toBe(1) // 1 student still pending
      
      const completedStudents = submissions.map((sub: any) => {
        const student = students.find((s: any) => s.id === sub.student_id)
        return { ...sub, name: `${student?.firstName} ${student?.lastName}` }
      })
      expect(completedStudents.length).toBe(1)
      expect(completedStudents[0].name).toBe('API Student1')

      // Clean up
      await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.id, submission.id))
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed homework ID', async () => {
      const response = await request(app)
        .get('/api/homework/invalid-id/submissions')
        .set('Authorization', `Bearer ${authToken}`)

      // Should handle gracefully, not crash
      expect([200, 400, 404]).toContain(response.status)
    })

    it('should handle malformed class ID', async () => {
      const response = await request(app)
        .get('/api/classes/invalid-id/students')
        .set('Authorization', `Bearer ${authToken}`)

      // Should handle gracefully, not crash
      expect([200, 400, 404]).toContain(response.status)
    })

    it('should maintain consistent response format across different data states', async () => {
      // Test with empty data
      const emptyResponse = await request(app)
        .get('/api/homework/99999/submissions')
        .set('Authorization', `Bearer ${authToken}`)
      
      expect(emptyResponse.status).toBe(200)
      expect(Array.isArray(emptyResponse.body)).toBe(true)
      
      // Test with populated data
      const populatedResponse = await request(app)
        .get(`/api/classes/${testClassId}/students`)
        .set('Authorization', `Bearer ${authToken}`)
      
      expect(populatedResponse.status).toBe(200)
      expect(Array.isArray(populatedResponse.body)).toBe(true)
      
      // Both should return arrays regardless of content
      expect(typeof emptyResponse.body).toBe(typeof populatedResponse.body)
    })
  })
})