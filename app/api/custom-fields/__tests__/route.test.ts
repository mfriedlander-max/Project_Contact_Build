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
    customFieldDefinition: {
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

describe('Custom Fields API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  const mockCustomField = {
    id: 'field-123',
    userId: 'user-123',
    name: 'Industry',
    fieldKey: 'custom_industry',
    fieldType: 'SELECT',
    options: ['Tech', 'Finance', 'Healthcare'],
    isRequired: false,
    order: 0,
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
    const url = new URL('http://localhost:3000/api/custom-fields')
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

  describe('GET /api/custom-fields', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return all custom fields for the user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.customFieldDefinition.findMany).mockResolvedValue([mockCustomField])

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customFields).toHaveLength(1)
      expect(data.customFields[0].name).toBe('Industry')
    })
  })

  describe('POST /api/custom-fields', () => {
    it('should create a new custom field', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.customFieldDefinition.findFirst).mockResolvedValue(null) // No existing field
      vi.mocked(prismadb.customFieldDefinition.create).mockResolvedValue(mockCustomField)

      const request = createRequest('POST', {
        name: 'Industry',
        fieldKey: 'custom_industry',
        fieldType: 'SELECT',
        options: ['Tech', 'Finance', 'Healthcare'],
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.customField.name).toBe('Industry')
    })

    it('should return 400 when name is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('POST', {
        fieldKey: 'custom_industry',
        fieldType: 'TEXT',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 409 when fieldKey already exists', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.customFieldDefinition.findFirst).mockResolvedValue(mockCustomField)

      const request = createRequest('POST', {
        name: 'Industry',
        fieldKey: 'custom_industry',
        fieldType: 'SELECT',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('already exists')
    })

    it('should validate fieldType enum', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('POST', {
        name: 'Test Field',
        fieldKey: 'test_field',
        fieldType: 'INVALID_TYPE',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('PUT /api/custom-fields', () => {
    it('should update a custom field', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.customFieldDefinition.findFirst).mockResolvedValue(mockCustomField)
      vi.mocked(prismadb.customFieldDefinition.update).mockResolvedValue({
        ...mockCustomField,
        name: 'Updated Industry',
      })

      const request = createRequest('PUT', {
        id: 'field-123',
        name: 'Updated Industry',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customField.name).toBe('Updated Industry')
    })

    it('should allow updating options for SELECT type', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.customFieldDefinition.findFirst).mockResolvedValue(mockCustomField)
      vi.mocked(prismadb.customFieldDefinition.update).mockResolvedValue({
        ...mockCustomField,
        options: ['Tech', 'Finance', 'Healthcare', 'Education'],
      })

      const request = createRequest('PUT', {
        id: 'field-123',
        options: ['Tech', 'Finance', 'Healthcare', 'Education'],
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customField.options).toContain('Education')
    })
  })

  describe('DELETE /api/custom-fields', () => {
    it('should delete a custom field', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.customFieldDefinition.findFirst).mockResolvedValue(mockCustomField)
      vi.mocked(prismadb.customFieldDefinition.delete).mockResolvedValue(mockCustomField)

      const request = createRequest('DELETE', undefined, { id: 'field-123' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 when field not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.customFieldDefinition.findFirst).mockResolvedValue(null)

      const request = createRequest('DELETE', undefined, { id: 'not-found' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })
})
