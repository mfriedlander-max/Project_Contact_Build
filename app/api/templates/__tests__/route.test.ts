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
    template: {
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

describe('Templates API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  const mockTemplate = {
    id: 'template-123',
    userId: 'user-123',
    name: 'Professional Outreach',
    subject: 'Quick question about {{company}}',
    body: 'Hi {{firstName}},\n\n{{personalized_insert}}\n\nBest,\nMax',
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
    const url = new URL('http://localhost:3000/api/templates')
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

  describe('GET /api/templates', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return all templates for the user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.template.findMany).mockResolvedValue([mockTemplate])

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.templates).toHaveLength(1)
      expect(data.templates[0].name).toBe('Professional Outreach')
    })

    it('should return a single template when id is provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.template.findFirst).mockResolvedValue(mockTemplate)

      const request = createRequest('GET', undefined, { id: 'template-123' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.template.name).toBe('Professional Outreach')
    })
  })

  describe('POST /api/templates', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('POST', { name: 'New Template' })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create a new template', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.template.create).mockResolvedValue(mockTemplate)

      const request = createRequest('POST', {
        name: 'Professional Outreach',
        subject: 'Quick question about {{company}}',
        body: 'Hi {{firstName}},\n\n{{personalized_insert}}\n\nBest,\nMax',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.template.name).toBe('Professional Outreach')
    })

    it('should return 400 when required fields are missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('POST', { name: 'No Subject' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('PUT /api/templates', () => {
    it('should update an existing template', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.template.findFirst).mockResolvedValue(mockTemplate)
      vi.mocked(prismadb.template.update).mockResolvedValue({
        ...mockTemplate,
        name: 'Updated Template',
      })

      const request = createRequest('PUT', {
        id: 'template-123',
        name: 'Updated Template',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.template.name).toBe('Updated Template')
    })

    it('should set as default and unset others', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.template.findFirst).mockResolvedValue(mockTemplate)
      vi.mocked(prismadb.template.updateMany).mockResolvedValue({ count: 1 })
      vi.mocked(prismadb.template.update).mockResolvedValue({
        ...mockTemplate,
        isDefault: true,
      })

      const request = createRequest('PUT', {
        id: 'template-123',
        isDefault: true,
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.template.isDefault).toBe(true)
      expect(prismadb.template.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isDefault: true },
        data: { isDefault: false },
      })
    })
  })

  describe('DELETE /api/templates', () => {
    it('should delete a template', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.template.findFirst).mockResolvedValue(mockTemplate)
      vi.mocked(prismadb.template.delete).mockResolvedValue(mockTemplate)

      const request = createRequest('DELETE', undefined, { id: 'template-123' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 when template not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.template.findFirst).mockResolvedValue(null)

      const request = createRequest('DELETE', undefined, { id: 'not-found' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })
})
