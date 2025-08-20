import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { worshipRoutes } from '../worshipRoutes'

// 워크스페이스 의존성 모킹
vi.mock('@gilteun/shared', () => ({
  User: {},
  Worship: {},
  Score: {},
  Command: {},
}))

// 데이터베이스 모킹
vi.mock('../database/db', () => ({
  db: {
    prepare: vi.fn(() => ({
      all: vi.fn(),
      get: vi.fn(),
      run: vi.fn(),
    })),
  },
}))

describe('Worship Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api', worshipRoutes)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/worships', () => {
    it('returns list of worships', async () => {
      const mockWorships = [
        { id: 1, name: '주일 1부 예배', date: '2024-01-07' },
        { id: 2, name: '주일 2부 예배', date: '2024-01-07' },
      ]

      // Mock database response
      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().all).mockReturnValue(mockWorships)

      const response = await request(app)
        .get('/api/worships')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockWorships,
      })
    })

    it('handles database errors gracefully', async () => {
      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().all).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const response = await request(app)
        .get('/api/worships')
        .expect(500)

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch worships',
      })
    })
  })

  describe('POST /api/worships', () => {
    it('creates a new worship service', async () => {
      const newWorship = {
        name: '금요기도회',
        date: '2024-01-12',
        description: '금요일 저녁 기도회',
      }

      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().run).mockReturnValue({
        lastInsertRowid: 3,
        changes: 1,
      })
      vi.mocked(mockDb.db.prepare().get).mockReturnValue({
        id: 3,
        ...newWorship,
        created_at: new Date().toISOString(),
      })

      const response = await request(app)
        .post('/api/worships')
        .send(newWorship)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe(newWorship.name)
      expect(response.body.data.id).toBe(3)
    })

    it('validates required fields', async () => {
      const invalidWorship = {
        date: '2024-01-12',
        // name field missing
      }

      const response = await request(app)
        .post('/api/worships')
        .send(invalidWorship)
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Name and date are required',
      })
    })

    it('handles duplicate worship names', async () => {
      const duplicateWorship = {
        name: '주일 1부 예배',
        date: '2024-01-07',
      }

      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().run).mockImplementation(() => {
        const error = new Error('UNIQUE constraint failed')
        ;(error as any).code = 'SQLITE_CONSTRAINT_UNIQUE'
        throw error
      })

      const response = await request(app)
        .post('/api/worships')
        .send(duplicateWorship)
        .expect(409)

      expect(response.body).toEqual({
        success: false,
        error: 'Worship with this name already exists',
      })
    })
  })

  describe('GET /api/worships/:id', () => {
    it('returns specific worship details', async () => {
      const mockWorship = {
        id: 1,
        name: '주일 1부 예배',
        date: '2024-01-07',
        description: '주일 오전 예배',
        created_at: new Date().toISOString(),
      }

      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().get).mockReturnValue(mockWorship)

      const response = await request(app)
        .get('/api/worships/1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockWorship,
      })
    })

    it('returns 404 for non-existent worship', async () => {
      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().get).mockReturnValue(undefined)

      const response = await request(app)
        .get('/api/worships/999')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Worship not found',
      })
    })

    it('validates worship ID parameter', async () => {
      const response = await request(app)
        .get('/api/worships/invalid-id')
        .expect(400)

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid worship ID',
      })
    })
  })

  describe('PUT /api/worships/:id', () => {
    it('updates worship details', async () => {
      const updates = {
        name: '주일 1부 예배 (수정)',
        description: '업데이트된 설명',
      }

      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().run).mockReturnValue({
        changes: 1,
      })
      vi.mocked(mockDb.db.prepare().get).mockReturnValue({
        id: 1,
        ...updates,
        date: '2024-01-07',
        updated_at: new Date().toISOString(),
      })

      const response = await request(app)
        .put('/api/worships/1')
        .send(updates)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe(updates.name)
    })

    it('returns 404 when updating non-existent worship', async () => {
      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().run).mockReturnValue({
        changes: 0,
      })

      const response = await request(app)
        .put('/api/worships/999')
        .send({ name: 'Updated Name' })
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Worship not found',
      })
    })
  })

  describe('DELETE /api/worships/:id', () => {
    it('deletes worship successfully', async () => {
      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().run).mockReturnValue({
        changes: 1,
      })

      const response = await request(app)
        .delete('/api/worships/1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        message: 'Worship deleted successfully',
      })
    })

    it('returns 404 when deleting non-existent worship', async () => {
      const mockDb = await import('../database/db')
      vi.mocked(mockDb.db.prepare().run).mockReturnValue({
        changes: 0,
      })

      const response = await request(app)
        .delete('/api/worships/999')
        .expect(404)

      expect(response.body).toEqual({
        success: false,
        error: 'Worship not found',
      })
    })
  })
})