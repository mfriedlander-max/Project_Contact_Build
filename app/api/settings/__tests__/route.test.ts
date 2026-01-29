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
    settings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { GET, PUT } from '../route'
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'

describe('Settings API', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  const mockSettings = {
    id: 'settings-123',
    userId: 'user-123',
    defaultAiMode: 'GENERAL_MANAGER',
    hunterApiKey: null,
    defaultTemplateId: null,
    emailSignature: 'Best regards',
    autoSaveInterval: 30,
    notificationsEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createRequest(
    method: string,
    body?: Record<string, unknown>
  ): NextRequest {
    return new NextRequest('http://localhost:3000/api/settings', {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
    })
  }

  describe('GET /api/settings', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('GET')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return existing settings for the user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.settings.findUnique).mockResolvedValue(mockSettings)

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings.defaultAiMode).toBe('GENERAL_MANAGER')
      expect(prismadb.settings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      })
    })

    it('should return default settings when none exist', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.settings.findUnique).mockResolvedValue(null)

      const request = createRequest('GET')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings).toBeDefined()
      expect(data.settings.defaultAiMode).toBe('GENERAL_MANAGER')
    })
  })

  describe('PUT /api/settings', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest('PUT', { defaultAiMode: 'ASSISTANT' })
      const response = await PUT(request)

      expect(response.status).toBe(401)
    })

    it('should update settings', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.settings.upsert).mockResolvedValue({
        ...mockSettings,
        defaultAiMode: 'ASSISTANT',
      })

      const request = createRequest('PUT', { defaultAiMode: 'ASSISTANT' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings.defaultAiMode).toBe('ASSISTANT')
    })

    it('should validate AI mode enum', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest('PUT', { defaultAiMode: 'INVALID_MODE' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should allow updating email signature', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.settings.upsert).mockResolvedValue({
        ...mockSettings,
        emailSignature: 'Cheers',
      })

      const request = createRequest('PUT', { emailSignature: 'Cheers' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.settings.emailSignature).toBe('Cheers')
    })
  })
})
