import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hunterService } from '../hunterService'

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    integrationConnection: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/hunter', () => ({
  findEmail: vi.fn(),
  mapScoreToConfidence: vi.fn((score: number) => {
    if (score >= 90) return 'HIGH'
    if (score >= 70) return 'MEDIUM'
    return 'LOW'
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { prismadb } from '@/lib/prisma'

const mockPrisma = vi.mocked(prismadb)

const USER_ID = 'user-123'
const MOCK_INTEGRATION = {
  id: 'int-1',
  v: 0,
  userId: USER_ID,
  provider: 'HUNTER' as const,
  accessToken: 'hunter-api-key-123',
  refreshToken: null,
  expiresAt: null,
  scope: null,
  isActive: true,
  metadata: null,
  createdAt: new Date(),
  updatedAt: null,
}

describe('hunterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isConfigured', () => {
    it('returns true when hunter integration exists and is active', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(MOCK_INTEGRATION)

      const result = await hunterService.isConfigured(USER_ID)

      expect(result).toBe(true)
    })

    it('returns false when no integration exists', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(null)

      const result = await hunterService.isConfigured(USER_ID)

      expect(result).toBe(false)
    })

    it('returns false when integration has no access token', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue({
        ...MOCK_INTEGRATION,
        accessToken: null,
      })

      const result = await hunterService.isConfigured(USER_ID)

      expect(result).toBe(false)
    })
  })

  describe('findEmail', () => {
    it('finds email using Hunter API', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(MOCK_INTEGRATION)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            email: 'john@acme.com',
            score: 95,
            sources: [{ domain: 'acme.com' }],
          },
        }),
      })

      const result = await hunterService.findEmail(USER_ID, {
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme',
        domain: 'acme.com',
      })

      expect(result.email).toBe('john@acme.com')
      expect(result.confidence).toBe('HIGH')
      expect(result.sources).toEqual(['acme.com'])
    })

    it('returns null email when no domain can be inferred', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(MOCK_INTEGRATION)

      const result = await hunterService.findEmail(USER_ID, {
        firstName: 'John',
        lastName: 'Doe',
        company: '',
      })

      expect(result.email).toBeNull()
    })

    it('throws when hunter is not configured', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(null)

      await expect(
        hunterService.findEmail(USER_ID, {
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acme',
          domain: 'acme.com',
        })
      ).rejects.toThrow('Hunter integration not configured')
    })
  })

  describe('verifyEmail', () => {
    it('verifies email using Hunter API', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(MOCK_INTEGRATION)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            status: 'valid',
            score: 95,
            email: 'john@acme.com',
          },
        }),
      })

      const result = await hunterService.verifyEmail(USER_ID, 'john@acme.com')

      expect(result.status).toBe('valid')
      expect(result.score).toBe(95)
    })

    it('throws when API returns error', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(MOCK_INTEGRATION)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ errors: [{ details: 'Invalid API key' }] }),
      })

      await expect(
        hunterService.verifyEmail(USER_ID, 'john@acme.com')
      ).rejects.toThrow('Hunter API error')
    })
  })

  describe('rate limiting', () => {
    it('retries on 429 with exponential backoff', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(MOCK_INTEGRATION)
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: { email: 'john@acme.com', score: 80, sources: [] },
          }),
        })

      vi.useFakeTimers()
      const resultPromise = hunterService.findEmail(USER_ID, {
        firstName: 'John', lastName: 'Doe', company: 'Acme', domain: 'acme.com',
      })
      await vi.runAllTimersAsync()
      const result = await resultPromise
      vi.useRealTimers()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.email).toBe('john@acme.com')
    })

    it('throws after max retries on persistent 429', async () => {
      mockPrisma.integrationConnection.findUnique.mockResolvedValue(MOCK_INTEGRATION)
      mockFetch.mockImplementation(() =>
        Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) })
      )

      vi.useFakeTimers()
      let caughtError: Error | undefined
      const resultPromise = hunterService.findEmail(USER_ID, {
        firstName: 'John', lastName: 'Doe', company: 'Acme', domain: 'acme.com',
      }).catch((err: Error) => { caughtError = err })
      await vi.runAllTimersAsync()
      await resultPromise
      vi.useRealTimers()

      expect(caughtError).toBeDefined()
      expect(caughtError?.message).toContain('rate limit')
    })
  })

  describe('inferDomain', () => {
    it('infers domain from company name', async () => {
      const result = await hunterService.inferDomain('Acme')
      expect(result).toBe('acme.com')
    })

    it('strips common suffixes', async () => {
      const result = await hunterService.inferDomain('Acme Inc')
      expect(result).toBe('acme.com')
    })

    it('returns null for empty company', async () => {
      const result = await hunterService.inferDomain('')
      expect(result).toBeNull()
    })
  })
})
