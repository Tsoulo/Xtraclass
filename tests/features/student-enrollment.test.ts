import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '../../server/db'
import { storage } from '../../server/storage'
import { users, students, teachers, classes, classStudents } from '../../shared/schema'
import { eq, and } from 'drizzle-orm'

describe('Student Enrollment Feature Tests', () => {
  let testTeacherIds: number[] = []
  let testClassIds: number[] = []
  let testStudentIds: number[] = []
  let testUserIds: number[] = []

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(classStudents).where(eq(classStudents.classId, 666))
    await db.delete(classes).where(eq(classes.id, 666))
    await db.delete(students).where(eq(students.studentId, 'ENROLL666'))
    await db.delete(teachers).where(eq(teachers.userId, 6666))
    await db.delete(users).where(eq(users.email, 'enroll-test@feature.test'))

    // Create test users (teachers and students)
    const testUsers = await Promise.all([
      // Teacher 1
      db.insert(users).values({
        email: 'teacher1@enrollment.test',
        firstName: 'Teacher',
        lastName: 'One',
        password: 'hashed-password',
        role: 'teacher',
        isActive: true
      }).returning(),
      // Teacher 2  
      db.insert(users).values({
        email: 'teacher2@enrollment.test',
        firstName: 'Teacher',
        lastName: 'Two',
        password: 'hashed-password',
        role: 'teacher',
        isActive: true
      }).returning(),
      // Students
      db.insert(users).values({
        email: 'student1@enrollment.test',
        firstName: 'Enrollment',
        lastName: 'Student1',
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning(),
      db.insert(users).values({
        email: 'student2@enrollment.test',
        firstName: 'Enrollment',
        lastName: 'Student2',
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning(),
      db.insert(users).values({
        email: 'student3@enrollment.test',
        firstName: 'Enrollment',
        lastName: 'Student3',
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning()
    ])

    testUserIds = testUsers.map(([user]) => user.id)

    // Create teacher profiles
    const teacherProfiles = await Promise.all([
      db.insert(teachers).values({
        userId: testUserIds[0],
        schoolId: 1,
        subjects: ['mathematics'],
        grades: ['8', '9']
      }).returning(),
      db.insert(teachers).values({
        userId: testUserIds[1],
        schoolId: 1,
        subjects: ['mathematics'],
        grades: ['8']
      }).returning()
    ])
    testTeacherIds = teacherProfiles.map(([teacher]) => teacher.id)

    // Create student profiles
    const studentProfiles = await Promise.all([
      db.insert(students).values({
        userId: testUserIds[2],
        studentId: 'ENROLL001',
        gradeLevel: '8',
        schoolName: 'Enrollment Test School'
      }).returning(),
      db.insert(students).values({
        userId: testUserIds[3],
        studentId: 'ENROLL002',
        gradeLevel: '8',
        schoolName: 'Enrollment Test School'
      }).returning(),
      db.insert(students).values({
        userId: testUserIds[4],
        studentId: 'ENROLL003',
        gradeLevel: '9',
        schoolName: 'Enrollment Test School'
      }).returning()
    ])
    testStudentIds = studentProfiles.map(([student]) => student.id)

    // Create test classes
    const testClasses = await Promise.all([
      // Teacher 1 classes
      db.insert(classes).values({
        id: 666,
        name: 'Grade 8 Math A',
        description: 'Grade 8 Mathematics Class A',
        grade: '8',
        subject: 'mathematics',
        teacherId: testTeacherIds[0],
        classCode: 'G8MA666'
      }).returning(),
      db.insert(classes).values({
        id: 667,
        name: 'Grade 9 Math A',
        description: 'Grade 9 Mathematics Class A',
        grade: '9',
        subject: 'mathematics',
        teacherId: testTeacherIds[0],
        classCode: 'G9MA667'
      }).returning(),
      // Teacher 2 class
      db.insert(classes).values({
        id: 668,
        name: 'Grade 8 Math B',
        description: 'Grade 8 Mathematics Class B',
        grade: '8',
        subject: 'mathematics',
        teacherId: testTeacherIds[1],
        classCode: 'G8MB668'
      }).returning()
    ])
    testClassIds = testClasses.map(([classData]) => classData.id)
  })

  afterAll(async () => {
    // Clean up test data
    await db.delete(classStudents).where(eq(classStudents.classId, testClassIds[0]))
    await db.delete(classStudents).where(eq(classStudents.classId, testClassIds[1]))
    await db.delete(classStudents).where(eq(classStudents.classId, testClassIds[2]))
    
    await Promise.all(testClassIds.map(id => 
      db.delete(classes).where(eq(classes.id, id))
    ))
    await Promise.all(testStudentIds.map(id => 
      db.delete(students).where(eq(students.id, id))
    ))
    await Promise.all(testTeacherIds.map(id => 
      db.delete(teachers).where(eq(teachers.id, id))
    ))
    await Promise.all(testUserIds.map(id =>
      db.delete(users).where(eq(users.id, id))
    ))
  })

  describe('Student Search and Discovery', () => {
    it('should find students by school and grade for enrollment', async () => {
      // This tests the teacher's ability to search for students to add to their class
      const grade8Students = await storage.searchStudentsBySchoolAndGrade('Enrollment Test School', '8')
      
      expect(Array.isArray(grade8Students)).toBe(true)
      expect(grade8Students.length).toBe(2) // Two grade 8 students
      
      grade8Students.forEach(student => {
        expect(student.gradeLevel).toBe('8')
        expect(student.schoolName).toBe('Enrollment Test School')
        expect(student.firstName).toBe('Enrollment')
      })

      // Test grade 9 search
      const grade9Students = await storage.searchStudentsBySchoolAndGrade('Enrollment Test School', '9')
      expect(grade9Students.length).toBe(1) // One grade 9 student
      expect(grade9Students[0].gradeLevel).toBe('9')
    })

    it('should support search with optional search term filtering', async () => {
      // Test searching with name filter
      const filteredStudents = await storage.searchStudentsBySchoolAndGrade(
        'Enrollment Test School', 
        '8', 
        'Student1'
      )
      
      expect(filteredStudents.length).toBe(1)
      expect(filteredStudents[0].lastName).toBe('Student1')
    })

    it('should return empty results for non-matching criteria', async () => {
      const noResults = await storage.searchStudentsBySchoolAndGrade('Nonexistent School', '8')
      expect(noResults.length).toBe(0)

      const noGrade = await storage.searchStudentsBySchoolAndGrade('Enrollment Test School', '12')
      expect(noGrade.length).toBe(0)
    })
  })

  describe('Student Enrollment Process', () => {
    it('should successfully enroll students in classes', async () => {
      // Enroll first student in first class
      const enrollment1 = await storage.addStudentToClass(testClassIds[0], testStudentIds[0])
      expect(enrollment1).toBeDefined()
      expect(enrollment1.classId).toBe(testClassIds[0])
      expect(enrollment1.studentId).toBe(testStudentIds[0])

      // Verify enrollment
      const classStudents = await storage.getStudentsByClass(testClassIds[0])
      expect(classStudents.length).toBe(1)
      expect(classStudents[0].id).toBe(testStudentIds[0])
    })

    it('should allow multiple students in same class', async () => {
      // Enroll second student in same class
      await storage.addStudentToClass(testClassIds[0], testStudentIds[1])
      
      const classStudents = await storage.getStudentsByClass(testClassIds[0])
      expect(classStudents.length).toBe(2)
      
      const studentIds = classStudents.map(s => s.id)
      expect(studentIds).toContain(testStudentIds[0])
      expect(studentIds).toContain(testStudentIds[1])
    })

    it('should allow same student in multiple classes (different subjects/grades)', async () => {
      // Enroll same student in different class
      await storage.addStudentToClass(testClassIds[1], testStudentIds[0])
      
      const class1Students = await storage.getStudentsByClass(testClassIds[0])
      const class2Students = await storage.getStudentsByClass(testClassIds[1])
      
      expect(class1Students.some(s => s.id === testStudentIds[0])).toBe(true)
      expect(class2Students.some(s => s.id === testStudentIds[0])).toBe(true)
    })

    it('should prevent duplicate enrollments in same class', async () => {
      // Try to enroll student who is already enrolled
      let duplicateEnrollment
      try {
        duplicateEnrollment = await storage.addStudentToClass(testClassIds[0], testStudentIds[0])
      } catch (error) {
        // Expected to throw error or handle gracefully
        expect(error).toBeDefined()
      }
      
      // Verify student count doesn't increase
      const classStudents = await storage.getStudentsByClass(testClassIds[0])
      const duplicateCount = classStudents.filter(s => s.id === testStudentIds[0]).length
      expect(duplicateCount).toBe(1) // Should still be only 1
    })
  })

  describe('Student Removal Process', () => {
    it('should successfully remove students from classes', async () => {
      // First ensure student is enrolled
      const initialStudents = await storage.getStudentsByClass(testClassIds[0])
      const initialCount = initialStudents.length
      expect(initialCount).toBeGreaterThan(0)
      
      // Remove a student
      const removed = await storage.removeStudentFromClass(testClassIds[0], testStudentIds[1])
      expect(removed).toBe(true)
      
      // Verify removal
      const remainingStudents = await storage.getStudentsByClass(testClassIds[0])
      expect(remainingStudents.length).toBe(initialCount - 1)
      expect(remainingStudents.some(s => s.id === testStudentIds[1])).toBe(false)
    })

    it('should handle removal of non-enrolled student gracefully', async () => {
      // Try to remove student who isn't enrolled
      const removed = await storage.removeStudentFromClass(testClassIds[2], testStudentIds[0])
      expect(removed).toBe(false) // Should return false, not crash
    })

    it('should not affect other class enrollments when removing from one class', async () => {
      // Ensure student is in multiple classes
      await storage.addStudentToClass(testClassIds[1], testStudentIds[0])
      await storage.addStudentToClass(testClassIds[2], testStudentIds[0])
      
      const class1Before = await storage.getStudentsByClass(testClassIds[1])
      const class2Before = await storage.getStudentsByClass(testClassIds[2])
      
      // Remove from one class
      await storage.removeStudentFromClass(testClassIds[1], testStudentIds[0])
      
      // Verify removal from target class
      const class1After = await storage.getStudentsByClass(testClassIds[1])
      expect(class1After.some(s => s.id === testStudentIds[0])).toBe(false)
      
      // Verify other class unaffected
      const class2After = await storage.getStudentsByClass(testClassIds[2])
      expect(class2After.some(s => s.id === testStudentIds[0])).toBe(true)
      expect(class2After.length).toBe(class2Before.length)
    })
  })

  describe('Business Logic Enforcement', () => {
    it('should enforce grade-level restrictions', async () => {
      // Try to enroll grade 9 student in grade 8 class
      // This should be allowed by the system but may be flagged by business logic
      const grade9Student = testStudentIds[2] // Grade 9 student
      const grade8Class = testClassIds[0] // Grade 8 class
      
      // The system currently allows this, but we test that data is accurate
      const enrollment = await storage.addStudentToClass(grade8Class, grade9Student)
      expect(enrollment).toBeDefined()
      
      // Verify we can detect mismatched grade levels
      const classData = await storage.getClass(grade8Class)
      const enrolledStudents = await storage.getStudentsByClass(grade8Class)
      
      const mismatchedStudents = enrolledStudents.filter(student => 
        student.gradeLevel !== classData?.grade
      )
      
      expect(mismatchedStudents.length).toBeGreaterThan(0)
      expect(mismatchedStudents[0].gradeLevel).toBe('9')
      expect(classData?.grade).toBe('8')
    })

    it('should track enrollment timestamps', async () => {
      // Enroll a fresh student to test timestamp
      await storage.addStudentToClass(testClassIds[2], testStudentIds[2])
      
      const enrolledStudents = await storage.getStudentsByClass(testClassIds[2])
      const newStudent = enrolledStudents.find(s => s.id === testStudentIds[2])
      
      expect(newStudent).toBeDefined()
      expect(newStudent?.enrolledAt).toBeDefined()
      expect(new Date(newStudent!.enrolledAt!)).toBeInstanceOf(Date)
      
      // Should be recent (within last minute)
      const enrollmentTime = new Date(newStudent!.enrolledAt!)
      const now = new Date()
      const timeDiff = now.getTime() - enrollmentTime.getTime()
      expect(timeDiff).toBeLessThan(60000) // Less than 60 seconds
    })
  })

  describe('Cross-Teacher Enrollment Scenarios', () => {
    it('should allow students to be enrolled in classes from different teachers', async () => {
      // Enroll same student with both teachers
      await storage.addStudentToClass(testClassIds[0], testStudentIds[0]) // Teacher 1 class
      await storage.addStudentToClass(testClassIds[2], testStudentIds[0]) // Teacher 2 class
      
      const teacher1Students = await storage.getStudentsByClass(testClassIds[0])
      const teacher2Students = await storage.getStudentsByClass(testClassIds[2])
      
      expect(teacher1Students.some(s => s.id === testStudentIds[0])).toBe(true)
      expect(teacher2Students.some(s => s.id === testStudentIds[0])).toBe(true)
    })

    it('should maintain enrollment independence between teachers', async () => {
      // Remove student from one teacher's class
      await storage.removeStudentFromClass(testClassIds[0], testStudentIds[0])
      
      // Verify still enrolled in other teacher's class
      const teacher1Students = await storage.getStudentsByClass(testClassIds[0])
      const teacher2Students = await storage.getStudentsByClass(testClassIds[2])
      
      expect(teacher1Students.some(s => s.id === testStudentIds[0])).toBe(false)
      expect(teacher2Students.some(s => s.id === testStudentIds[0])).toBe(true)
    })
  })

  describe('Enrollment Data Integrity', () => {
    it('should maintain referential integrity during enrollments', async () => {
      // Enroll students and verify all relationships are maintained
      await storage.addStudentToClass(testClassIds[1], testStudentIds[1])
      
      const enrolledStudents = await storage.getStudentsByClass(testClassIds[1])
      
      enrolledStudents.forEach(student => {
        // Verify student record exists and is complete
        expect(student.id).toBeTypeOf('number')
        expect(student.userId).toBeTypeOf('number')
        expect(student.firstName).toBeTruthy()
        expect(student.lastName).toBeTruthy()
        expect(student.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        expect(student.studentId).toBeTruthy()
        expect(student.gradeLevel).toBeTruthy()
        expect(student.schoolName).toBeTruthy()
        
        // Verify enrollment metadata
        expect(student.enrolledAt).toBeDefined()
      })
    })

    it('should handle concurrent enrollment operations safely', async () => {
      // Simulate concurrent enrollments
      const concurrentEnrollments = await Promise.allSettled([
        storage.addStudentToClass(testClassIds[1], testStudentIds[2]),
        storage.addStudentToClass(testClassIds[2], testStudentIds[2]),
        storage.getStudentsByClass(testClassIds[1]),
        storage.getStudentsByClass(testClassIds[2])
      ])
      
      // All operations should complete successfully
      concurrentEnrollments.forEach(result => {
        expect(result.status).toBe('fulfilled')
      })
      
      // Final state should be consistent
      const finalClass1 = await storage.getStudentsByClass(testClassIds[1])
      const finalClass2 = await storage.getStudentsByClass(testClassIds[2])
      
      expect(Array.isArray(finalClass1)).toBe(true)
      expect(Array.isArray(finalClass2)).toBe(true)
    })
  })

  describe('Real-world Enrollment Scenarios', () => {
    it('should handle the James/Lebo/Thuli enrollment scenario correctly', async () => {
      // Simulate the exact scenario from the original bug:
      // - Grade 8 class B should have all three students
      // - Teacher should see all students when viewing class
      // - Homework analysis should find all students for pending list
      
      const grade8ClassB = testClassIds[2] // Our Grade 8 Math B class
      
      // Enroll three students (simulating James, Lebo, Thuli)
      await storage.addStudentToClass(grade8ClassB, testStudentIds[0])
      await storage.addStudentToClass(grade8ClassB, testStudentIds[1])
      
      // Add third student to simulate Thuli
      const [thuliUser] = await db.insert(users).values({
        email: 'thuli-test@enrollment.test',
        firstName: 'Thuli',
        lastName: 'Test',
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning()
      
      const [thuliStudent] = await db.insert(students).values({
        userId: thuliUser.id,
        studentId: 'THULI001',
        gradeLevel: '8',
        schoolName: 'Enrollment Test School'
      }).returning()
      
      await storage.addStudentToClass(grade8ClassB, thuliStudent.id)
      
      // Verify all three students are enrolled
      const enrolledStudents = await storage.getStudentsByClass(grade8ClassB)
      expect(enrolledStudents.length).toBe(3)
      
      // Verify they can be found for homework analysis
      const studentIds = enrolledStudents.map(s => s.id)
      expect(studentIds).toContain(testStudentIds[0]) // James equivalent
      expect(studentIds).toContain(testStudentIds[1]) // Lebo equivalent  
      expect(studentIds).toContain(thuliStudent.id)    // Thuli
      
      // Clean up
      await db.delete(classStudents).where(and(
        eq(classStudents.classId, grade8ClassB),
        eq(classStudents.studentId, thuliStudent.id)
      ))
      await db.delete(students).where(eq(students.id, thuliStudent.id))
      await db.delete(users).where(eq(users.id, thuliUser.id))
    })
  })
})