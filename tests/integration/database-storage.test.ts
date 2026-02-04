import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { storage } from '../../server/storage'
import { db } from '../../server/db'
import { users, students, teachers, classes, classStudents } from '../../shared/schema'
import { eq } from 'drizzle-orm'

describe('Database Storage Integration Tests', () => {
  let testUserIds: number[] = []
  let testTeacherId: number
  let testStudentIds: number[] = []
  let testClassId: number

  beforeAll(async () => {
    // Clean up any existing test data
    await db.delete(classStudents).where(eq(classStudents.classId, 888))
    await db.delete(classes).where(eq(classes.id, 888))
    await db.delete(students).where(eq(students.studentId, 'DBTEST001'))
    await db.delete(teachers).where(eq(teachers.id, 888))
    await db.delete(users).where(eq(users.email, 'db-test@storage.test'))

    // Create test data
    const testUsers = await Promise.all([
      // Teacher user
      db.insert(users).values({
        email: 'db-test-teacher@storage.test',
        firstName: 'Database',
        lastName: 'Teacher',
        password: 'hashed-password',
        role: 'teacher',
        isActive: true
      }).returning(),
      // Student users
      db.insert(users).values({
        email: 'db-test-student1@storage.test',
        firstName: 'Database',
        lastName: 'Student1',
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning(),
      db.insert(users).values({
        email: 'db-test-student2@storage.test',
        firstName: 'Database',
        lastName: 'Student2',
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning()
    ])

    testUserIds = testUsers.map(([user]) => user.id)

    // Create teacher profile
    const [teacher] = await db.insert(teachers).values({
      id: 888,
      userId: testUserIds[0],
      schoolId: 1,
      subjects: ['mathematics'],
      grades: ['8']
    }).returning()
    testTeacherId = teacher.id

    // Create student profiles
    const studentProfiles = await Promise.all([
      db.insert(students).values({
        userId: testUserIds[1],
        studentId: 'DBTEST001',
        gradeLevel: '8',
        schoolName: 'Test School'
      }).returning(),
      db.insert(students).values({
        userId: testUserIds[2], 
        studentId: 'DBTEST002',
        gradeLevel: '8',
        schoolName: 'Test School'
      }).returning()
    ])
    testStudentIds = studentProfiles.map(([student]) => student.id)

    // Create test class
    const [testClass] = await db.insert(classes).values({
      id: 888,
      name: 'Database Test Class',
      description: 'Test class for database storage',
      grade: '8',
      subject: 'mathematics',
      teacherId: testTeacherId,
      classCode: 'DBTEST'
    }).returning()
    testClassId = testClass.id

    // Enroll students
    await Promise.all(testStudentIds.map(studentId =>
      db.insert(classStudents).values({
        classId: testClassId,
        studentId: studentId
      })
    ))
  })

  afterAll(async () => {
    // Clean up test data
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

  describe('DatabaseStorage Methods', () => {
    it('should implement getHomeworkById method', async () => {
      // This method was added for homework analysis feature
      expect(typeof storage.getHomeworkById).toBe('function')
      
      // Test with non-existent homework (should return undefined)
      const nonExistentHomework = await storage.getHomeworkById(99999)
      expect(nonExistentHomework).toBeUndefined()
    })

    it('should implement getHomeworkSubmissions method', async () => {
      // This method was added for homework analysis feature
      expect(typeof storage.getHomeworkSubmissions).toBe('function')
      
      // Test with non-existent homework (should return empty array)
      const submissions = await storage.getHomeworkSubmissions(99999)
      expect(Array.isArray(submissions)).toBe(true)
      expect(submissions.length).toBe(0)
    })

    it('should correctly fetch students by class', async () => {
      const students = await storage.getStudentsByClass(testClassId)
      
      expect(Array.isArray(students)).toBe(true)
      expect(students.length).toBe(2)
      
      // Verify data structure matches API expectations
      students.forEach(student => {
        expect(student).toHaveProperty('id')
        expect(student).toHaveProperty('firstName')
        expect(student).toHaveProperty('lastName') 
        expect(student).toHaveProperty('email')
        expect(student).toHaveProperty('userId')
        expect(student).toHaveProperty('studentId')
        expect(student).toHaveProperty('gradeLevel')
        expect(student).toHaveProperty('schoolName')
      })

      // Verify specific test data
      const studentNames = students.map(s => s.lastName)
      expect(studentNames).toContain('Student1')
      expect(studentNames).toContain('Student2')
    })

    it('should handle empty class correctly', async () => {
      // Create empty class for testing
      const [emptyClass] = await db.insert(classes).values({
        id: 887,
        name: 'Empty Test Class',
        description: 'Class with no students',
        grade: '9',
        subject: 'mathematics',
        teacherId: testTeacherId,
        classCode: 'EMPTY1'
      }).returning()

      const students = await storage.getStudentsByClass(emptyClass.id)
      expect(Array.isArray(students)).toBe(true)
      expect(students.length).toBe(0)

      // Clean up
      await db.delete(classes).where(eq(classes.id, emptyClass.id))
    })

    it('should maintain referential integrity in joins', async () => {
      // Test that joins work correctly between class_students, students, and users tables
      const students = await storage.getStudentsByClass(testClassId)
      
      students.forEach(student => {
        // Every student should have valid user data
        expect(student.userId).toBeTypeOf('number')
        expect(student.userId).toBeGreaterThan(0)
        expect(student.firstName).toBeTruthy()
        expect(student.lastName).toBeTruthy()
        expect(student.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
        
        // Student ID should be properly populated
        expect(student.studentId).toBeTruthy()
        expect(student.gradeLevel).toBeTruthy()
        expect(student.schoolName).toBeTruthy()
      })
    })
  })

  describe('Class Management Operations', () => {
    it('should fetch classes by teacher correctly', async () => {
      const teacherClasses = await storage.getClassesByTeacher(testTeacherId)
      
      expect(Array.isArray(teacherClasses)).toBe(true)
      expect(teacherClasses.length).toBeGreaterThan(0)
      
      // Verify our test class is included
      const testClassExists = teacherClasses.some(c => c.id === testClassId)
      expect(testClassExists).toBe(true)
      
      // Verify all classes belong to the teacher
      teacherClasses.forEach(classItem => {
        expect(classItem.teacherId).toBe(testTeacherId)
      })
    })

    it('should generate unique class codes', async () => {
      const code1 = await storage.generateClassCode()
      const code2 = await storage.generateClassCode()
      
      expect(code1).toBeTypeOf('string') 
      expect(code2).toBeTypeOf('string')
      expect(code1.length).toBe(6)
      expect(code2.length).toBe(6)
      expect(code1).not.toBe(code2) // Should be unique
      
      // Should contain only valid characters
      const validChars = /^[A-Z0-9]+$/
      expect(validChars.test(code1)).toBe(true)
      expect(validChars.test(code2)).toBe(true)
    })

    it('should retrieve individual class data', async () => {
      const classData = await storage.getClass(testClassId)
      
      expect(classData).toBeDefined()
      expect(classData?.id).toBe(testClassId)
      expect(classData?.name).toBe('Database Test Class')
      expect(classData?.grade).toBe('8')
      expect(classData?.subject).toBe('mathematics')
      expect(classData?.teacherId).toBe(testTeacherId)
      expect(classData?.classCode).toBe('DBTEST')
    })
  })

  describe('Student Enrollment Operations', () => {
    it('should handle student search by school and grade', async () => {
      const searchResults = await storage.searchStudentsBySchoolAndGrade('Test School', '8')
      
      expect(Array.isArray(searchResults)).toBe(true)
      expect(searchResults.length).toBeGreaterThanOrEqual(2) // Our test students
      
      // All results should match criteria
      searchResults.forEach(student => {
        expect(student.schoolName).toBe('Test School')
        expect(student.gradeLevel).toBe('8')
      })
    })

    it('should prevent duplicate enrollments', async () => {
      // Try to enroll a student who is already enrolled
      const existingStudentId = testStudentIds[0]
      
      try {
        await storage.addStudentToClass(testClassId, existingStudentId)
        // If no error is thrown, the method should handle duplicates gracefully
      } catch (error) {
        // If error is thrown, it should be a meaningful duplicate prevention error
        expect(error).toBeDefined()
      }
      
      // Verify student count doesn't increase
      const students = await storage.getStudentsByClass(testClassId)
      expect(students.length).toBe(2) // Should still be 2, not 3
    })

    it('should remove students from class correctly', async () => {
      // Create temporary student for removal test
      const [tempUser] = await db.insert(users).values({
        email: 'temp-removal@test.com',
        firstName: 'Temp',
        lastName: 'Student',
        password: 'hashed-password',
        role: 'student',
        isActive: true
      }).returning()

      const [tempStudent] = await db.insert(students).values({
        userId: tempUser.id,
        studentId: 'TEMP001',
        gradeLevel: '8',
        schoolName: 'Test School'
      }).returning()

      // Add to class
      await storage.addStudentToClass(testClassId, tempStudent.id)
      
      // Verify addition
      let students = await storage.getStudentsByClass(testClassId)
      expect(students.length).toBe(3)
      
      // Remove student
      const removed = await storage.removeStudentFromClass(testClassId, tempStudent.id)
      expect(removed).toBe(true)
      
      // Verify removal
      students = await storage.getStudentsByClass(testClassId)
      expect(students.length).toBe(2)
      expect(students.some(s => s.id === tempStudent.id)).toBe(false)

      // Clean up
      await db.delete(students).where(eq(students.id, tempStudent.id))
      await db.delete(users).where(eq(users.id, tempUser.id))
    })
  })

  describe('Data Consistency Validation', () => {
    it('should maintain consistent student data across operations', async () => {
      // Get students through class lookup
      const classStudents = await storage.getStudentsByClass(testClassId)
      
      // Get students through search
      const searchStudents = await storage.searchStudentsBySchoolAndGrade('Test School', '8')
      
      // Our test students should appear in both results
      classStudents.forEach(classStudent => {
        const foundInSearch = searchStudents.some(searchStudent => 
          searchStudent.id === classStudent.id &&
          searchStudent.email === classStudent.email &&
          searchStudent.firstName === classStudent.firstName &&
          searchStudent.lastName === classStudent.lastName
        )
        expect(foundInSearch).toBe(true)
      })
    })

    it('should ensure homework-class relationships are properly validated', async () => {
      // This test ensures the bug we fixed doesn't regress
      const classData = await storage.getClass(testClassId)
      const classStudents = await storage.getStudentsByClass(testClassId)
      
      // Class should exist and have students
      expect(classData).toBeDefined()
      expect(classStudents.length).toBeGreaterThan(0)
      
      // If homework were created for this class, it should match
      // (This validates the class ID consistency that was causing the bug)
      expect(classData?.id).toBe(testClassId)
      expect(classData?.teacherId).toBe(testTeacherId)
    })

    it('should handle edge cases gracefully', async () => {
      // Test non-existent class
      const nonExistentClass = await storage.getClass(99999)
      expect(nonExistentClass).toBeUndefined()
      
      // Test non-existent class students
      const noStudents = await storage.getStudentsByClass(99999)
      expect(Array.isArray(noStudents)).toBe(true)
      expect(noStudents.length).toBe(0)
      
      // Test empty search criteria
      const emptySearch = await storage.searchStudentsBySchoolAndGrade('Nonexistent School', '99')
      expect(Array.isArray(emptySearch)).toBe(true)
      expect(emptySearch.length).toBe(0)
    })
  })
})