import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../server/index'
import { storage } from '../../server/storage'

describe('Lessons API', () => {
  let testTopic: any
  let testTheme: any

  beforeEach(async () => {
    // Clear any existing test data
    await storage.clearAll()
    
    // Create test topic and theme for lessons
    testTopic = await storage.createTopic({
      name: 'Algebra',
      description: 'Basic algebraic concepts',
      grade: '8',
      subject: 'Mathematics'
    })

    testTheme = await storage.createTheme({
      topicId: testTopic.id,
      name: 'Linear Equations',
      description: 'Basic linear equations'
    })
  })

  afterEach(async () => {
    // Clean up after each test
    await storage.clearAll()
  })

  describe('GET /api/syllabus-calendar', () => {
    it('should return empty array when no lessons exist', async () => {
      const response = await request(app)
        .get('/api/syllabus-calendar')
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should return all lessons', async () => {
      const lesson1 = await storage.createLesson({
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Introduction to Linear Equations',
        description: 'Basic lesson on linear equations',
        duration: 60,
        objectives: ['Understand linear equations'],
        activities: null,
        videoLink: null
      })

      const lesson2 = await storage.createLesson({
        date: '2025-07-19',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Solving Linear Equations',
        description: 'Methods to solve linear equations',
        duration: 60,
        objectives: ['Solve linear equations'],
        activities: null,
        videoLink: null
      })

      const response = await request(app)
        .get('/api/syllabus-calendar')
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        lessonTitle: 'Introduction to Linear Equations'
      })
      expect(response.body[1]).toMatchObject({
        date: '2025-07-19',
        grade: '8',
        subject: 'Mathematics',
        lessonTitle: 'Solving Linear Equations'
      })
    })

    it('should filter lessons by date range', async () => {
      await storage.createLesson({
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Lesson 1',
        description: 'Test lesson 1',
        duration: 60,
        objectives: ['Test objective'],
        activities: null,
        videoLink: null
      })

      await storage.createLesson({
        date: '2025-07-25',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Lesson 2',
        description: 'Test lesson 2',
        duration: 60,
        objectives: ['Test objective'],
        activities: null,
        videoLink: null
      })

      const response = await request(app)
        .get('/api/syllabus-calendar?startDate=2025-07-18&endDate=2025-07-20')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].date).toBe('2025-07-18')
    })

    it('should filter lessons by grade', async () => {
      await storage.createLesson({
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Grade 8 Lesson',
        description: 'Test lesson',
        duration: 60,
        objectives: ['Test objective'],
        activities: null,
        videoLink: null
      })

      // Create another topic and theme for grade 9
      const topic9 = await storage.createTopic({
        name: 'Functions',
        description: 'Mathematical functions',
        grade: '9',
        subject: 'Mathematics'
      })

      const theme9 = await storage.createTheme({
        topicId: topic9.id,
        name: 'Linear Functions',
        description: 'Basic linear functions'
      })

      await storage.createLesson({
        date: '2025-07-18',
        grade: '9',
        subject: 'Mathematics',
        topicId: topic9.id,
        themeId: theme9.id,
        lessonTitle: 'Grade 9 Lesson',
        description: 'Test lesson',
        duration: 60,
        objectives: ['Test objective'],
        activities: null,
        videoLink: null
      })

      const response = await request(app)
        .get('/api/syllabus-calendar?grade=8')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].grade).toBe('8')
    })
  })

  describe('POST /api/syllabus-calendar', () => {
    it('should create a new lesson successfully', async () => {
      const newLesson = {
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Introduction to Linear Equations',
        description: 'Basic lesson on linear equations',
        duration: 60,
        objectives: ['Understand linear equations'],
        activities: null,
        videoLink: null
      }

      const response = await request(app)
        .post('/api/syllabus-calendar')
        .send(newLesson)
        .expect(201)

      expect(response.body).toMatchObject(newLesson)
      expect(response.body.id).toBeDefined()
      expect(response.body.createdAt).toBeDefined()
      expect(response.body.updatedAt).toBeDefined()
    })

    it('should validate required fields', async () => {
      const invalidLesson = {
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        // Missing lessonTitle
        description: 'Basic lesson on linear equations',
        duration: 60,
        objectives: ['Understand linear equations']
      }

      const response = await request(app)
        .post('/api/syllabus-calendar')
        .send(invalidLesson)
        .expect(400)

      expect(response.body.error).toContain('lessonTitle')
    })

    it('should validate topic and theme relationship', async () => {
      // Create another topic and theme
      const topic2 = await storage.createTopic({
        name: 'Functions',
        description: 'Mathematical functions',
        grade: '9',
        subject: 'Mathematics'
      })

      const theme2 = await storage.createTheme({
        topicId: topic2.id,
        name: 'Linear Functions',
        description: 'Basic linear functions'
      })

      const invalidLesson = {
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: theme2.id, // This theme belongs to a different topic
        lessonTitle: 'Test Lesson',
        description: 'Test description',
        duration: 60,
        objectives: ['Test objective']
      }

      const response = await request(app)
        .post('/api/syllabus-calendar')
        .send(invalidLesson)
        .expect(400)

      expect(response.body.error).toContain('theme')
    })

    it('should validate date format', async () => {
      const invalidLesson = {
        date: 'invalid-date',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Test Lesson',
        description: 'Test description',
        duration: 60,
        objectives: ['Test objective']
      }

      const response = await request(app)
        .post('/api/syllabus-calendar')
        .send(invalidLesson)
        .expect(400)

      expect(response.body.error).toContain('date')
    })

    it('should prevent duplicate lessons for same date, grade, and subject', async () => {
      const lesson = {
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Test Lesson',
        description: 'Test description',
        duration: 60,
        objectives: ['Test objective']
      }

      // Create first lesson
      await request(app)
        .post('/api/syllabus-calendar')
        .send(lesson)
        .expect(201)

      // Try to create duplicate
      const response = await request(app)
        .post('/api/syllabus-calendar')
        .send({
          ...lesson,
          lessonTitle: 'Different Title'
        })
        .expect(400)

      expect(response.body.error).toContain('already exists')
    })
  })

  describe('PUT /api/syllabus-calendar/:id', () => {
    it('should update an existing lesson', async () => {
      const lesson = await storage.createLesson({
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Original Title',
        description: 'Original description',
        duration: 60,
        objectives: ['Original objective'],
        activities: null,
        videoLink: null
      })

      const updatedData = {
        date: '2025-07-19',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Updated Title',
        description: 'Updated description',
        duration: 90,
        objectives: ['Updated objective'],
        videoLink: 'https://example.com/video'
      }

      const response = await request(app)
        .put(`/api/syllabus-calendar/${lesson.id}`)
        .send(updatedData)
        .expect(200)

      expect(response.body).toMatchObject(updatedData)
      expect(response.body.id).toBe(lesson.id)
    })

    it('should return 404 for non-existent lesson', async () => {
      const response = await request(app)
        .put('/api/syllabus-calendar/999')
        .send({
          date: '2025-07-18',
          grade: '8',
          subject: 'Mathematics',
          topicId: testTopic.id,
          themeId: testTheme.id,
          lessonTitle: 'Test',
          description: 'Test',
          duration: 60,
          objectives: ['Test']
        })
        .expect(404)

      expect(response.body.error).toContain('not found')
    })
  })

  describe('DELETE /api/syllabus-calendar/:id', () => {
    it('should delete an existing lesson', async () => {
      const lesson = await storage.createLesson({
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: testTheme.id,
        lessonTitle: 'Test Lesson',
        description: 'Test description',
        duration: 60,
        objectives: ['Test objective'],
        activities: null,
        videoLink: null
      })

      await request(app)
        .delete(`/api/syllabus-calendar/${lesson.id}`)
        .expect(200)

      // Verify lesson is deleted
      const lessons = await storage.getLessons()
      expect(lessons).toHaveLength(0)
    })

    it('should return 404 for non-existent lesson', async () => {
      const response = await request(app)
        .delete('/api/syllabus-calendar/999')
        .expect(404)

      expect(response.body.error).toContain('not found')
    })
  })
})