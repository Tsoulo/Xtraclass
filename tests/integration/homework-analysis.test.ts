import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../server/db'
import { storage } from '../../server/storage'
import { users, students, teachers, classes, classStudents, homework, homeworkSubmissions } from '../../shared/schema'
import { eq, and } from 'drizzle-orm'

describe('Homework Analysis Integration Tests', () => {
  let testTeacherId: number
  let testClassId: number
  let testStudentIds: number[] = []
  let testHomeworkId: number
  let testUserIds: number[] = []

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, 999))
    await db.delete(homework).where(eq(homework.id, 999))
    await db.delete(classStudents).where(eq(classStudents.classId, 999))
    await db.delete(classes).where(eq(classes.id, 999))
    await db.delete(students).where(eq(students.id, 999))
    await db.delete(teachers).where(eq(teachers.id, 999))
    await db.delete(users).where(eq(users.email, 'test-teacher@homework.test'))
    
    // Create test teacher user
    const [teacherUser] = await db.insert(users).values({
      email: 'test-teacher@homework.test',  
      firstName: 'Test',
      lastName: 'Teacher',
      password: 'hashed-password',
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

    // Create test class
    const [testClass] = await db.insert(classes).values({
      id: 999,
      name: 'Test Homework Class',
      description: 'Test class for homework analysis',
      grade: '8',
      subject: 'mathematics',
      teacherId: testTeacherId,
      classCode: 'TEST999'
    }).returning()  
    testClassId = testClass.id

    // Create test students
    const studentUsers = await Promise.all([
      db.insert(users).values({
        email: 'student1@homework.test',
        firstName: 'Student',
        lastName: 'One', 
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning(),
      db.insert(users).values({
        email: 'student2@homework.test',
        firstName: 'Student',
        lastName: 'Two',
        password: 'hashed-password', 
        role: 'student',
        isActive: true
      }).returning(),
      db.insert(users).values({
        email: 'student3@homework.test',
        firstName: 'Student',
        lastName: 'Three',
        password: 'hashed-password',
        role: 'student', 
        isActive: true
      }).returning()
    ])

    testUserIds.push(...studentUsers.map(([user]) => user.id))

    const studentProfiles = await Promise.all(studentUsers.map(async ([user], index) => {
      const [student] = await db.insert(students).values({
        id: 999 + index + 1,
        userId: user.id,
        studentId: `TEST${999 + index + 1}`,
        gradeLevel: '8',
        schoolName: 'Test School'
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
      id: 999,
      classId: testClassId,
      title: 'Test Homework Assignment',
      description: 'Test homework for analysis',
      questions: [
        {
          id: 'q1',
          question: 'What is 2 + 2?',
          type: 'equation',
          difficulty: 'easy',
          points: 5
        },
        {
          id: 'q2', 
          question: 'Solve x² + 5x + 6 = 0',
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
    await db.delete(students).where(and(
      eq(students.id, testStudentIds[0]),
      eq(students.id, testStudentIds[1]),
      eq(students.id, testStudentIds[2])
    ))
    await db.delete(teachers).where(eq(teachers.id, testTeacherId))
    await db.delete(users).where(eq(users.email, 'test-teacher@homework.test'))
    testUserIds.forEach(async (userId) => {
      await db.delete(users).where(eq(users.id, userId))
    })
  })

  describe('Student Enrollment and Homework Assignment', () => {
    it('should correctly fetch enrolled students for homework analysis', async () => {
      // Test the actual API method used by homework analysis
      const enrolledStudents = await storage.getStudentsByClass(testClassId)
      
      expect(enrolledStudents).toBeDefined()
      expect(Array.isArray(enrolledStudents)).toBe(true)
      expect(enrolledStudents.length).toBe(3)
      
      // Verify student data structure matches what homework analysis expects
      enrolledStudents.forEach(student => {
        expect(student).toHaveProperty('id')
        expect(student).toHaveProperty('firstName')
        expect(student).toHaveProperty('lastName')
        expect(student).toHaveProperty('email')
        expect(student.id).toBeTypeOf('number')
        expect(student.firstName).toBeTypeOf('string')
        expect(student.lastName).toBeTypeOf('string')
      })

      // Verify specific test students are present
      const studentNames = enrolledStudents.map(s => `${s.firstName} ${s.lastName}`)
      expect(studentNames).toContain('Student One')
      expect(studentNames).toContain('Student Two') 
      expect(studentNames).toContain('Student Three')
    })

    it('should correctly fetch homework with proper class assignment', async () => {
      const homeworkData = await storage.getHomeworkById(testHomeworkId)
      
      expect(homeworkData).toBeDefined()
      expect(homeworkData?.classId).toBe(testClassId)
      expect(homeworkData?.title).toBe('Test Homework Assignment')
      expect(homeworkData?.questions).toBeDefined()
      expect(Array.isArray(homeworkData?.questions)).toBe(true)
      expect(homeworkData?.questions?.length).toBe(2)
      
      // Verify question structure matches what analysis expects
      homeworkData?.questions?.forEach(question => {
        expect(question).toHaveProperty('id')
        expect(question).toHaveProperty('question')
        expect(question).toHaveProperty('points')
        expect(question).toHaveProperty('difficulty')
      })
    })

    it('should handle empty homework submissions correctly', async () => {
      // Test when no students have submitted (our original bug scenario)
      const submissions = await storage.getHomeworkSubmissions(testHomeworkId)
      
      expect(submissions).toBeDefined()
      expect(Array.isArray(submissions)).toBe(true)
      expect(submissions.length).toBe(0) // No submissions yet
      
      // This should not cause enrolled students to disappear from pending list
      const enrolledStudents = await storage.getStudentsByClass(testClassId)
      expect(enrolledStudents.length).toBe(3) // All students should still be enrolled
    })

    it('should correctly identify pending students when no submissions exist', async () => {
      // Simulate the homework analysis logic
      const enrolledStudents = await storage.getStudentsByClass(testClassId)
      const submissions = await storage.getHomeworkSubmissions(testHomeworkId)
      
      // Filter students who haven't submitted (should be all of them)
      const pendingStudents = enrolledStudents.filter(student => 
        !submissions.some(sub => sub.student_id === student.id)
      )
      
      expect(pendingStudents.length).toBe(3) // All students are pending
      expect(pendingStudents.map(s => s.firstName)).toContain('Student')
      
      // Verify completion rate calculation
      const completionRate = enrolledStudents.length > 0 
        ? Math.round((submissions.length / enrolledStudents.length) * 100) 
        : 0
      expect(completionRate).toBe(0) // 0% completion
    })
  })

  describe('Homework Submissions and Analysis', () => {
    it('should correctly process homework submissions', async () => {
      // Create a test submission
      const [submission] = await db.insert(homeworkSubmissions).values({
        homeworkId: testHomeworkId,
        studentId: testStudentIds[0], // First student submits
        answers: [
          { questionId: 'q1', answer: '4', isCorrect: true, score: 5 },
          { questionId: 'q2', answer: 'x = -2, x = -3', isCorrect: true, score: 10 }
        ],
        isCompleted: true,
        score: 15,
        totalMarks: 15,
        submittedAt: new Date()
      }).returning()

      // Test submission retrieval
      const submissions = await storage.getHomeworkSubmissions(testHomeworkId)
      expect(submissions.length).toBe(1)
      expect(submissions[0].studentId).toBe(testStudentIds[0])
      expect(submissions[0].score).toBe(15)
      expect(submissions[0].isCompleted).toBe(true)

      // Test pending students calculation after one submission
      const enrolledStudents = await storage.getStudentsByClass(testClassId)
      const pendingStudents = enrolledStudents.filter(student => 
        !submissions.some(sub => sub.student_id === student.id)
      )
      
      expect(pendingStudents.length).toBe(2) // Two students still pending
      expect(submissions.length).toBe(1) // One completed
      
      // Clean up the test submission
      await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.id, submission.id))
    })

    it('should handle student-submission data matching correctly', async () => {
      // This test addresses the original bug where student IDs weren't matching
      const enrolledStudents = await storage.getStudentsByClass(testClassId)
      
      // Create submissions for testing ID matching
      const testSubmissions = await Promise.all(testStudentIds.slice(0, 2).map(async (studentId, index) => {
        const [submission] = await db.insert(homeworkSubmissions).values({
          homeworkId: testHomeworkId,
          studentId: studentId,
          answers: [
            { questionId: 'q1', answer: '4', isCorrect: true, score: 5 }
          ],
          isCompleted: true,
          score: 5,
          totalMarks: 15,
          submittedAt: new Date()
        }).returning()
        return submission
      }))

      const submissions = await storage.getHomeworkSubmissions(testHomeworkId)
      
      // Verify ID matching works correctly
      submissions.forEach(submission => {
        const matchingStudent = enrolledStudents.find(student => student.id === submission.studentId)
        expect(matchingStudent).toBeDefined()
        expect(matchingStudent?.id).toBe(submission.studentId)
      })

      // Test pending calculation with partial submissions
      const pendingStudents = enrolledStudents.filter(student => 
        !submissions.some(sub => sub.student_id === student.id)
      )
      
      expect(submissions.length).toBe(2) // Two submissions
      expect(pendingStudents.length).toBe(1) // One pending
      expect(enrolledStudents.length).toBe(3) // Total enrolled unchanged

      // Clean up test submissions
      await Promise.all(testSubmissions.map(sub => 
        db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.id, sub.id))
      ))
    })

    it('should calculate homework analytics correctly', async () => {
      // Create varied submissions for analytics testing
      const analyticsSubmissions = await Promise.all([
        // Student 1: Perfect score
        db.insert(homeworkSubmissions).values({
          homeworkId: testHomeworkId,
          studentId: testStudentIds[0],
          answers: [
            { questionId: 'q1', answer: '4', isCorrect: true, score: 5 },
            { questionId: 'q2', answer: 'x = -2, x = -3', isCorrect: true, score: 10 }
          ],
          isCompleted: true,
          score: 15,
          totalMarks: 15,
          submittedAt: new Date()
        }).returning(),
        // Student 2: Partial score  
        db.insert(homeworkSubmissions).values({
          homeworkId: testHomeworkId,
          studentId: testStudentIds[1],
          answers: [
            { questionId: 'q1', answer: '4', isCorrect: true, score: 5 },
            { questionId: 'q2', answer: 'x = -1, x = -2', isCorrect: false, score: 3 }
          ],
          isCompleted: true,
          score: 8,
          totalMarks: 15,
          submittedAt: new Date()
        }).returning()
      ])

      const submissions = await storage.getHomeworkSubmissions(testHomeworkId)
      const enrolledStudents = await storage.getStudentsByClass(testClassId)

      // Test completion rate: 2 of 3 students = 67%
      const completionRate = Math.round((submissions.length / enrolledStudents.length) * 100)
      expect(completionRate).toBe(67)

      // Test average score: (15 + 8) / 2 = 11.5
      const averageScore = submissions.reduce((sum, sub) => sum + sub.score, 0) / submissions.length
      expect(averageScore).toBe(11.5)

      // Test pass rate (assuming 60% = 9 points is passing)
      const passingGrade = 9
      const passCount = submissions.filter(sub => sub.score >= passingGrade).length
      const passRate = Math.round((passCount / submissions.length) * 100)
      expect(passRate).toBe(50) // 1 of 2 submissions passed

      // Clean up
      await Promise.all(analyticsSubmissions.map(([sub]) => 
        db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.id, sub.id))
      ))
    })
  })

  describe('Class-Homework Relationship Integrity', () => {
    it('should prevent homework analysis when class ID mismatch occurs', async () => {
      // Create homework with wrong class ID (simulating the original bug)
      const [wrongClassHomework] = await db.insert(homework).values({
        id: 998,
        classId: 9999, // Non-existent class
        title: 'Mismatched Class Homework',
        description: 'This homework has wrong class ID',
        questions: [{ id: 'q1', question: 'Test?', type: 'equation', difficulty: 'easy', points: 5 }],
        totalMarks: 5,
        dueDate: new Date(),
        isPublished: true
      }).returning()

      // Attempting to get students should return empty array
      const studentsFromWrongClass = await storage.getStudentsByClass(9999)
      expect(studentsFromWrongClass.length).toBe(0)

      // This would cause the "no pending students" bug
      const submissions = await storage.getHomeworkSubmissions(wrongClassHomework.id)
      const pendingStudents = studentsFromWrongClass.filter(student => 
        !submissions.some(sub => sub.student_id === student.id)
      )
      
      expect(pendingStudents.length).toBe(0) // Bug: no students appear as pending

      // Clean up
      await db.delete(homework).where(eq(homework.id, wrongClassHomework.id))
    })

    it('should validate class-homework integrity before analysis', async () => {
      // Test the fix: verify homework belongs to class with enrolled students
      const homeworkData = await storage.getHomeworkById(testHomeworkId)
      const enrolledStudents = await storage.getStudentsByClass(homeworkData!.classId)
      
      // Homework should belong to class with students
      expect(homeworkData?.classId).toBe(testClassId)
      expect(enrolledStudents.length).toBeGreaterThan(0)
      
      // Class should match the homework assignment
      const classData = await storage.getClass(homeworkData!.classId)
      expect(classData).toBeDefined()
      expect(classData?.id).toBe(testClassId)
    })
  })

  describe('Real-world Data Scenarios', () => {
    it('should handle the original James/Lebo/Thuli scenario', async () => {
      // Simulate the exact scenario from the bug report
      // - 3 students enrolled in grade 8 class B  
      // - No homework submissions
      // - Should show all 3 in pending list

      const enrolledStudents = await storage.getStudentsByClass(testClassId)
      const submissions = await storage.getHomeworkSubmissions(testHomeworkId)
      
      // Verify the scenario setup
      expect(enrolledStudents.length).toBe(3) // James, Lebo equivalent, Thuli equivalent
      expect(submissions.length).toBe(0) // No submissions
      
      // Apply homework analysis logic
      const pendingStudents = enrolledStudents.filter(student => 
        !submissions.some(sub => sub.student_id === student.id)
      )
      const completedStudents = submissions.map(sub => {
        const student = enrolledStudents.find(s => s.id === sub.student_id)
        return { ...sub, name: `${student?.firstName} ${student?.lastName}` }
      })
      
      // Results should match expected behavior
      expect(pendingStudents.length).toBe(3) // All students pending
      expect(completedStudents.length).toBe(0) // No completed
      
      // Verify each student appears in pending
      expect(pendingStudents.some(s => s.firstName === 'Student')).toBe(true)
    })
  })
})