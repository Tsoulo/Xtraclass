import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../server/index'
import { storage } from '../../server/storage'

describe('Themes API', () => {
  let testTopic: any

  beforeEach(async () => {
    // Clear any existing test data
    await storage.clearAll()
    
    // Create a test topic for themes
    testTopic = await storage.createTopic({
      name: 'Algebra',
      description: 'Basic algebraic concepts',
      grade: '8',
      subject: 'Mathematics'
    })
  })

  afterEach(async () => {
    // Clean up after each test
    await storage.clearAll()
  })

  describe('GET /api/themes', () => {
    it('should return empty array when no themes exist', async () => {
      const response = await request(app)
        .get('/api/themes')
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should return all themes', async () => {
      const theme1 = await storage.createTheme({
        topicId: testTopic.id,
        name: 'Linear Equations',
        description: 'Basic linear equations'
      })

      const theme2 = await storage.createTheme({
        topicId: testTopic.id,
        name: 'Quadratic Equations',
        description: 'Basic quadratic equations'
      })

      const response = await request(app)
        .get('/api/themes')
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        name: 'Linear Equations',
        description: 'Basic linear equations',
        topicId: testTopic.id
      })
      expect(response.body[1]).toMatchObject({
        name: 'Quadratic Equations',
        description: 'Basic quadratic equations',
        topicId: testTopic.id
      })
    })

    it('should filter themes by topicId when provided', async () => {
      // Create another topic
      const topic2 = await storage.createTopic({
        name: 'Functions',
        description: 'Mathematical functions',
        grade: '9',
        subject: 'Mathematics'
      })

      await storage.createTheme({
        topicId: testTopic.id,
        name: 'Linear Equations',
        description: 'Basic linear equations'
      })

      await storage.createTheme({
        topicId: topic2.id,
        name: 'Linear Functions',
        description: 'Basic linear functions'
      })

      const response = await request(app)
        .get(`/api/themes?topicId=${testTopic.id}`)
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].topicId).toBe(testTopic.id)
    })
  })

  describe('POST /api/themes', () => {
    it('should create a new theme successfully', async () => {
      const newTheme = {
        topicId: testTopic.id,
        name: 'Polynomials',
        description: 'Introduction to polynomials'
      }

      const response = await request(app)
        .post('/api/themes')
        .send(newTheme)
        .expect(201)

      expect(response.body).toMatchObject(newTheme)
      expect(response.body.id).toBeDefined()
      expect(response.body.createdAt).toBeDefined()
      expect(response.body.updatedAt).toBeDefined()
    })

    it('should validate required fields', async () => {
      const invalidTheme = {
        topicId: testTopic.id,
        description: 'Missing name field'
      }

      const response = await request(app)
        .post('/api/themes')
        .send(invalidTheme)
        .expect(400)

      expect(response.body.error).toContain('name')
    })

    it('should validate topicId exists', async () => {
      const invalidTheme = {
        topicId: 999,
        name: 'Test Theme',
        description: 'Test description'
      }

      const response = await request(app)
        .post('/api/themes')
        .send(invalidTheme)
        .expect(400)

      expect(response.body.error).toContain('topic')
    })

    it('should prevent duplicate theme names for same topic', async () => {
      const theme = {
        topicId: testTopic.id,
        name: 'Linear Equations',
        description: 'Basic linear equations'
      }

      // Create first theme
      await request(app)
        .post('/api/themes')
        .send(theme)
        .expect(201)

      // Try to create duplicate
      const response = await request(app)
        .post('/api/themes')
        .send(theme)
        .expect(400)

      expect(response.body.error).toContain('already exists')
    })
  })

  describe('PUT /api/themes/:id', () => {
    it('should update an existing theme', async () => {
      const theme = await storage.createTheme({
        topicId: testTopic.id,
        name: 'Linear Equations',
        description: 'Basic linear equations'
      })

      const updatedData = {
        topicId: testTopic.id,
        name: 'Advanced Linear Equations',
        description: 'Advanced linear equations'
      }

      const response = await request(app)
        .put(`/api/themes/${theme.id}`)
        .send(updatedData)
        .expect(200)

      expect(response.body).toMatchObject(updatedData)
      expect(response.body.id).toBe(theme.id)
    })

    it('should return 404 for non-existent theme', async () => {
      const response = await request(app)
        .put('/api/themes/999')
        .send({
          topicId: testTopic.id,
          name: 'Test',
          description: 'Test'
        })
        .expect(404)

      expect(response.body.error).toContain('not found')
    })
  })

  describe('DELETE /api/themes/:id', () => {
    it('should delete an existing theme', async () => {
      const theme = await storage.createTheme({
        topicId: testTopic.id,
        name: 'Linear Equations',
        description: 'Basic linear equations'
      })

      await request(app)
        .delete(`/api/themes/${theme.id}`)
        .expect(200)

      // Verify theme is deleted
      const themes = await storage.getThemes()
      expect(themes).toHaveLength(0)
    })

    it('should return 404 for non-existent theme', async () => {
      const response = await request(app)
        .delete('/api/themes/999')
        .expect(404)

      expect(response.body.error).toContain('not found')
    })

    it('should prevent deletion of theme with existing lessons', async () => {
      const theme = await storage.createTheme({
        topicId: testTopic.id,
        name: 'Linear Equations',
        description: 'Basic linear equations'
      })

      // Create a lesson for this theme
      await storage.createLesson({
        date: '2025-07-18',
        grade: '8',
        subject: 'Mathematics',
        topicId: testTopic.id,
        themeId: theme.id,
        lessonTitle: 'Introduction to Linear Equations',
        description: 'Basic lesson on linear equations',
        duration: 60,
        objectives: ['Understand linear equations'],
        activities: null,
        videoLink: null
      })

      const response = await request(app)
        .delete(`/api/themes/${theme.id}`)
        .expect(400)

      expect(response.body.error).toContain('lessons')
    })
  })
})