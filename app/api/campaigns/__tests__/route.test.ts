import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing the route
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    campaign: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { GET, POST, PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'

describe('Campaigns API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  const mockCampaign = {
    id: 'campaign-123',
    userId: 'user-123',
    name: 'Test Campaign',
    description: 'A test campaign',
    status: 'DRAFT',
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
    const url = new URL('http://localhost:3000/api/campaigns')
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

  describe('GET /api/campaigns', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return all campaigns for the authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.findMany).mockResolvedValue([mockCampaign])

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.campaigns).toHaveLength(1)
      expect(data.campaigns[0].name).toBe('Test Campaign')
      expect(prismadb.campaign.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { contacts: true } } },
      })
    })

    it('should return a single campaign when id is provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.findFirst).mockResolvedValue(mockCampaign)

      const request = createRequest('GET', undefined, { id: 'campaign-123' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.campaign.name).toBe('Test Campaign')
      expect(prismadb.campaign.findFirst).toHaveBeenCalledWith({
        where: { id: 'campaign-123', userId: 'user-123' },
        include: {
          contacts: true,
          runs: { orderBy: { createdAt: 'desc' }, take: 5 },
          template: true,
        },
      })
    })

    it('should return 404 when campaign is not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.findFirst).mockResolvedValue(null)

      const request = createRequest('GET', undefined, { id: 'not-found' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('POST /api/campaigns', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('POST', { name: 'New Campaign' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create a new campaign', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.create).mockResolvedValue(mockCampaign)

      const request = createRequest('POST', {
        name: 'Test Campaign',
        description: 'A test campaign',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.campaign.name).toBe('Test Campaign')
      expect(prismadb.campaign.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: 'Test Campaign',
          description: 'A test campaign',
          status: 'DRAFT',
        },
      })
    })

    it('should return 400 when name is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('POST', { description: 'No name' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when name is too short', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('POST', { name: 'ab' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('PUT /api/campaigns', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('PUT', { id: 'campaign-123', name: 'Updated' })
      const response = await PUT(request)

      expect(response.status).toBe(401)
    })

    it('should update an existing campaign', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.findFirst).mockResolvedValue(mockCampaign)
      vi.mocked(prismadb.campaign.update).mockResolvedValue({
        ...mockCampaign,
        name: 'Updated Campaign',
      })

      const request = createRequest('PUT', {
        id: 'campaign-123',
        name: 'Updated Campaign',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.campaign.name).toBe('Updated Campaign')
    })

    it('should return 400 when id is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('PUT', { name: 'Updated' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 404 when campaign is not found or not owned by user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.findFirst).mockResolvedValue(null)

      const request = createRequest('PUT', {
        id: 'not-found',
        name: 'Updated',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('DELETE /api/campaigns', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('DELETE', undefined, { id: 'campaign-123' })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })

    it('should delete a campaign', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.findFirst).mockResolvedValue(mockCampaign)
      vi.mocked(prismadb.campaign.delete).mockResolvedValue(mockCampaign)

      const request = createRequest('DELETE', undefined, { id: 'campaign-123' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prismadb.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      })
    })

    it('should return 400 when id is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('DELETE')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('id')
    })

    it('should return 404 when campaign is not found or not owned by user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.campaign.findFirst).mockResolvedValue(null)

      const request = createRequest('DELETE', undefined, { id: 'not-found' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })
})
