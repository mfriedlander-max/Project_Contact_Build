import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    savedView: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { GET, POST, PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'

describe('Saved Views API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  const mockSavedView = {
    id: 'view-123',
    userId: 'user-123',
    name: 'Active Contacts',
    filters: { connection_stage: 'CONNECTED' },
    sort: { last_activity: 'desc' },
    columns: ['first_name', 'last_name', 'company', 'connection_stage'],
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createRequest(
    method: string,
    body?: Record<string, unknown>,
    searchParams?: Record<string, string>
  ): NextRequest {
    const url = new URL('http://localhost:3000/api/saved-views')
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    return new NextRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
    })
  }

  describe('GET /api/saved-views', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return all saved views for the user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.savedView.findMany).mockResolvedValue([mockSavedView])

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.savedViews).toHaveLength(1)
      expect(data.savedViews[0].name).toBe('Active Contacts')
    })
  })

  describe('POST /api/saved-views', () => {
    it('should create a new saved view', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.savedView.create).mockResolvedValue(mockSavedView)

      const request = createRequest('POST', {
        name: 'Active Contacts',
        filters: { connection_stage: 'CONNECTED' },
        columns: ['first_name', 'last_name', 'company'],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.savedView.name).toBe('Active Contacts')
    })

    it('should return 400 when name is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('POST', {
        filters: { connection_stage: 'CONNECTED' },
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('PUT /api/saved-views', () => {
    it('should update a saved view', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.savedView.findFirst).mockResolvedValue(mockSavedView)
      vi.mocked(prismadb.savedView.update).mockResolvedValue({
        ...mockSavedView,
        name: 'Updated View',
      })

      const request = createRequest('PUT', {
        id: 'view-123',
        name: 'Updated View',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.savedView.name).toBe('Updated View')
    })

    it('should set as default and unset others', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.savedView.findFirst).mockResolvedValue(mockSavedView)
      vi.mocked(prismadb.savedView.updateMany).mockResolvedValue({ count: 1 })
      vi.mocked(prismadb.savedView.update).mockResolvedValue({
        ...mockSavedView,
        isDefault: true,
      })

      const request = createRequest('PUT', {
        id: 'view-123',
        isDefault: true,
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.savedView.isDefault).toBe(true)
    })
  })

  describe('DELETE /api/saved-views', () => {
    it('should delete a saved view', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.savedView.findFirst).mockResolvedValue(mockSavedView)
      vi.mocked(prismadb.savedView.delete).mockResolvedValue(mockSavedView)

      const request = createRequest('DELETE', undefined, { id: 'view-123' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
