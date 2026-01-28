import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/src/server/services/stagingService', () => ({
  stagingService: {
    getStagedList: vi.fn(),
    saveStagedList: vi.fn(),
    clearStagedList: vi.fn(),
  },
}))

import { GET, PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { stagingService } from '@/src/server/services/stagingService'

const mockSession = { user: { id: 'user-123', email: 'test@example.com' } }

const mockStagedContact = {
  id: 'staged-1',
  userId: 'user-123',
  sessionId: 'session-abc',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme',
  position: 'CEO',
  email: 'john@acme.com',
  linkedinUrl: null,
  sourceUrl: null,
  relevanceScore: 0.9,
  notes: null,
  isApproved: false,
  isDeleted: false,
  createdAt: new Date(),
  expiresAt: new Date(),
}

function createRequest(
  method: string,
  body?: Record<string, unknown>,
): NextRequest {
  const url = new URL('http://localhost:3000/api/staging')
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
}

describe('Staging API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/staging', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const response = await GET(createRequest('GET'))
      expect(response.status).toBe(401)
    })

    it('returns staged contacts', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(stagingService.getStagedList).mockResolvedValue([mockStagedContact])

      const response = await GET(createRequest('GET'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
    })
  })

  describe('PUT /api/staging', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const response = await PUT(createRequest('PUT', { sessionId: 's', contacts: [] }))
      expect(response.status).toBe(401)
    })

    it('saves staged list', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(stagingService.saveStagedList).mockResolvedValue({ count: 1 })

      const response = await PUT(createRequest('PUT', {
        sessionId: 'session-abc',
        contacts: [{ lastName: 'Doe' }],
      }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 400 with invalid body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const response = await PUT(createRequest('PUT', {}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('DELETE /api/staging', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const response = await DELETE(createRequest('DELETE'))
      expect(response.status).toBe(401)
    })

    it('clears staged list', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(stagingService.clearStagedList).mockResolvedValue({ count: 3 })

      const response = await DELETE(createRequest('DELETE'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
