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
    integrationConnection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { GET, PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'

describe('Integrations API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  const mockIntegration = {
    id: 'integration-123',
    userId: 'user-123',
    provider: 'GMAIL',
    accessToken: 'encrypted_token',
    refreshToken: 'encrypted_refresh',
    expiresAt: new Date(Date.now() + 3600000),
    scope: 'gmail.send gmail.readonly',
    isActive: true,
    metadata: {},
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
    const url = new URL('http://localhost:3000/api/integrations')
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

  describe('GET /api/integrations', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return all integrations for the user (without tokens)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.integrationConnection.findMany).mockResolvedValue([mockIntegration])

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integrations).toHaveLength(1)
      expect(data.integrations[0].provider).toBe('GMAIL')
      // Tokens should be redacted
      expect(data.integrations[0].accessToken).toBeUndefined()
      expect(data.integrations[0].refreshToken).toBeUndefined()
    })

    it('should return a single integration when provider is specified', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.integrationConnection.findFirst).mockResolvedValue(mockIntegration)

      const request = createRequest('GET', undefined, { provider: 'GMAIL' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integration.provider).toBe('GMAIL')
      expect(data.integration.isActive).toBe(true)
    })

    it('should return empty for non-existent provider', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.integrationConnection.findFirst).mockResolvedValue(null)

      const request = createRequest('GET', undefined, { provider: 'OUTLOOK' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integration).toBeNull()
    })
  })

  describe('PUT /api/integrations', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('PUT', { provider: 'GMAIL' })
      const response = await PUT(request)

      expect(response.status).toBe(401)
    })

    it('should create or update an integration', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.integrationConnection.upsert).mockResolvedValue(mockIntegration)

      const request = createRequest('PUT', {
        provider: 'GMAIL',
        accessToken: 'new_token',
        refreshToken: 'new_refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        scope: 'gmail.send',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integration.provider).toBe('GMAIL')
    })

    it('should validate provider enum', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('PUT', {
        provider: 'INVALID_PROVIDER',
        accessToken: 'token',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should allow toggling isActive', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.integrationConnection.upsert).mockResolvedValue({
        ...mockIntegration,
        isActive: false,
      })

      const request = createRequest('PUT', {
        provider: 'GMAIL',
        isActive: false,
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integration.isActive).toBe(false)
    })
  })

  describe('DELETE /api/integrations', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('DELETE', undefined, { provider: 'GMAIL' })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })

    it('should delete an integration', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.integrationConnection.findFirst).mockResolvedValue(mockIntegration)
      vi.mocked(prismadb.integrationConnection.delete).mockResolvedValue(mockIntegration)

      const request = createRequest('DELETE', undefined, { provider: 'GMAIL' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 when provider is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('DELETE')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('provider')
    })

    it('should return 404 when integration not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.integrationConnection.findFirst).mockResolvedValue(null)

      const request = createRequest('DELETE', undefined, { provider: 'OUTLOOK' })
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })
})
