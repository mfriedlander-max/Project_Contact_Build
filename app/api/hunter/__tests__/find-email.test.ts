import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    crm_Contacts: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock rate limiting to always allow requests in tests
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    strict: vi.fn(() => ({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    })),
  },
  getClientIdentifier: vi.fn(() => 'test-identifier'),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import { POST } from '../find-email/route'
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'

describe('POST /api/hunter/find-email', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HUNTER_API_KEY = 'test-hunter-api-key'
  })

  afterEach(() => {
    delete process.env.HUNTER_API_KEY
  })

  function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost:3000/api/hunter/find-email', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthenticated')
    })
  })

  describe('Input Validation', () => {
    it('should return 400 when firstName is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('firstName')
    })

    it('should return 400 when lastName is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({
        firstName: 'John',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('lastName')
    })

    it('should return 400 when company is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('company')
    })

    it('should return 400 when firstName is empty', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({
        firstName: '',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('Missing API Key', () => {
    it('should return 500 when HUNTER_API_KEY is not configured', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      delete process.env.HUNTER_API_KEY

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('API key')
    })
  })

  describe('Successful Email Finding', () => {
    it('should return email with HIGH confidence when score >= 90', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 95,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.email).toBe('john.doe@example.com')
      expect(data.confidence).toBe('HIGH')
    })

    it('should return email with MEDIUM confidence when score is 70-89', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 75,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.email).toBe('john.doe@example.com')
      expect(data.confidence).toBe('MEDIUM')
    })

    it('should return email with LOW confidence when score < 70', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 50,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.email).toBe('john.doe@example.com')
      expect(data.confidence).toBe('LOW')
    })

    it('should call Hunter API with correct parameters', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 90,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.hunter.io/v2/email-finder'),
        expect.any(Object)
      )

      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('domain=example.com')
      expect(calledUrl).toContain('first_name=John')
      expect(calledUrl).toContain('last_name=Doe')
      expect(calledUrl).toContain('api_key=test-hunter-api-key')
    })
  })

  describe('Contact Update', () => {
    it('should update contact when contactId is provided and user owns contact', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValueOnce({
        id: 'contact-123',
        assigned_to: 'user-123',
      } as never)
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValueOnce({
        id: 'contact-123',
        email: 'john.doe@example.com',
        email_confidence: 'HIGH',
      } as never)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 95,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
        contactId: 'contact-123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prismadb.crm_Contacts.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'contact-123',
          assigned_to: 'user-123',
        },
      })
      expect(prismadb.crm_Contacts.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: {
          email: 'john.doe@example.com',
          email_confidence: 'HIGH',
        },
      })
      expect(data.contactUpdated).toBe(true)
    })

    it('should not update contact when contactId is not provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 95,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled()
      expect(data.contactUpdated).toBeUndefined()
    })
  })

  describe('Authorization', () => {
    it('should return 403 when user does not own the contact', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValueOnce(null)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 95,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
        contactId: 'contact-not-owned',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('access denied')
      expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled()
    })
  })

  describe('Hunter API Error Handling', () => {
    it('should return 502 when Hunter API returns an error response', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          errors: [{ details: 'Invalid API key' }],
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toContain('Hunter API error')
    })

    it('should return 502 when Hunter API request fails (network error)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBeDefined()
    })

    it('should return 404 when Hunter API returns no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: null,
            score: 0,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('No email found')
    })
  })

  describe('Score Edge Cases', () => {
    it('should return HIGH confidence when score is exactly 90', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 90,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.confidence).toBe('HIGH')
    })

    it('should return MEDIUM confidence when score is exactly 70', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 70,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.confidence).toBe('MEDIUM')
    })

    it('should return LOW confidence when score is exactly 69', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            email: 'john.doe@example.com',
            score: 69,
          },
        }),
      })

      const request = createRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'example.com',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.confidence).toBe('LOW')
    })
  })
})
