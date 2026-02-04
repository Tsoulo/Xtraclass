import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { app } from '../../server/index'
import { storage } from '../../server/storage'

describe('Topics API', () => {
  beforeEach(async () => {
    // Clear any existing test data
    await storage.clearAll()
  })

  afterEach(async () => {
    // Clean up after each test
    await storage.clearAll()
  })

  describe('GET /api/topics', () => {
    it('should return empty array when no topics exist', async () => {
      const response = await request(app)
        .get('/api/topics')
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should return all topics', async () => {
      // Create test topics
      const topic1 = await storage.createTopic({
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      })

      const topic2 = await storage.createTopic({
        name: 'Functions',
        description: 'Mathematical functions',
        grade: '9',
        subject: 'Mathematics'
      })

      const response = await request(app)
        .get('/api/topics')
        .expect(200)

      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      })
      expect(response.body[1]).toMatchObject({
        name: 'Functions',
        description: 'Mathematical functions',
        grade: '9',
        subject: 'Mathematics'
      })
    })

    it('should filter topics by grade when provided', async () => {
      await storage.createTopic({
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      })

      await storage.createTopic({
        name: 'Functions',
        description: 'Mathematical functions',
        grade: '9',
        subject: 'Mathematics'
      })

      const response = await request(app)
        .get('/api/topics?grade=8')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].grade).toBe('8')
    })

    it('should filter topics by subject when provided', async () => {
      await storage.createTopic({
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      })

      await storage.createTopic({
        name: 'Forces',
        description: 'Physical forces',
        grade: '8',
        subject: 'Physical Science'
      })

      const response = await request(app)
        .get('/api/topics?subject=Mathematics')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].subject).toBe('Mathematics')
    })
  })

  describe('POST /api/topics', () => {
    it('should create a new topic successfully', async () => {
      const newTopic = {
        name: 'Geometry',
        description: 'Basic geometric concepts',
        grade: '8',
        subject: 'Mathematics'
      }

      const response = await request(app)
        .post('/api/topics')
        .send(newTopic)
        .expect(201)

      expect(response.body).toMatchObject(newTopic)
      expect(response.body.id).toBeDefined()
      expect(response.body.createdAt).toBeDefined()
      expect(response.body.updatedAt).toBeDefined()
    })

    it('should validate required fields', async () => {
      const invalidTopic = {
        description: 'Missing name field',
        grade: '8',
        subject: 'Mathematics'
      }

      const response = await request(app)
        .post('/api/topics')
        .send(invalidTopic)
        .expect(400)

      expect(response.body.error).toContain('name')
    })

    it('should validate grade field', async () => {
      const invalidTopic = {
        name: 'Test Topic',
        description: 'Test description',
        grade: 'invalid',
        subject: 'Mathematics'
      }

      const response = await request(app)
        .post('/api/topics')
        .send(invalidTopic)
        .expect(400)

      expect(response.body.error).toContain('grade')
    })

    it('should prevent duplicate topic names for same grade and subject', async () => {
      const topic = {
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      }

      // Create first topic
      await request(app)
        .post('/api/topics')
        .send(topic)
        .expect(201)

      // Try to create duplicate
      const response = await request(app)
        .post('/api/topics')
        .send(topic)
        .expect(400)

      expect(response.body.error).toContain('already exists')
    })
  })

  describe('PUT /api/topics/:id', () => {
    it('should update an existing topic', async () => {
      const topic = await storage.createTopic({
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      })

      const updatedData = {
        name: 'Advanced Algebra',
        description: 'Advanced algebraic concepts',
        grade: '9',
        subject: 'Mathematics'
      }

      const response = await request(app)
        .put(`/api/topics/${topic.id}`)
        .send(updatedData)
        .expect(200)

      expect(response.body).toMatchObject(updatedData)
      expect(response.body.id).toBe(topic.id)
    })

    it('should return 404 for non-existent topic', async () => {
      const response = await request(app)
        .put('/api/topics/999')
        .send({
          name: 'Test',
          description: 'Test',
          grade: '8',
          subject: 'Mathematics'
        })
        .expect(404)

      expect(response.body.error).toContain('not found')
    })
  })

  describe('DELETE /api/topics/:id', () => {
    it('should delete an existing topic', async () => {
      const topic = await storage.createTopic({
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      })

      await request(app)
        .delete(`/api/topics/${topic.id}`)
        .expect(200)

      // Verify topic is deleted
      const topics = await storage.getTopics()
      expect(topics).toHaveLength(0)
    })

    it('should return 404 for non-existent topic', async () => {
      const response = await request(app)
        .delete('/api/topics/999')
        .expect(404)

      expect(response.body.error).toContain('not found')
    })

    it('should prevent deletion of topic with existing themes', async () => {
      const topic = await storage.createTopic({
        name: 'Algebra',
        description: 'Basic algebraic concepts',
        grade: '8',
        subject: 'Mathematics'
      })

      // Create a theme for this topic
      await storage.createTheme({
        topicId: topic.id,
        name: 'Linear Equations',
        description: 'Basic linear equations'
      })

      const response = await request(app)
        .delete(`/api/topics/${topic.id}`)
        .expect(400)

      expect(response.body.error).toContain('themes')
    })
  })
})