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

vi.mock('@/lib/anthropic', () => ({
  anthropicHelper: vi.fn(),
}))

// Mock rate limiting to always allow requests in tests
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    aiOperations: vi.fn(() => ({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
    })),
  },
  getClientIdentifier: vi.fn(() => 'test-identifier'),
}))

// Import mocked modules and route handler
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'
import { anthropicHelper } from '@/lib/anthropic'
import { POST } from '../generate/route'

// Helper to create mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/personalization/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to create mock Anthropic client
function createMockAnthropicClient(responseContent: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: responseContent,
          },
        ],
      }),
    },
  }
}

describe('POST /api/personalization/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthenticated')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
    })

    it('should return 400 when contactId is missing', async () => {
      const request = createMockRequest({
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when lastName is missing', async () => {
      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when company is missing', async () => {
      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when position is missing', async () => {
      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should accept valid linkedinUrl', async () => {
      const mockAnthropic = createMockAnthropicClient('I noticed your innovative work at Acme Inc...')
      vi.mocked(anthropicHelper).mockResolvedValue(mockAnthropic as never)

      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
      } as never)

      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        id: '123',
        personalized_insert: 'I noticed your innovative work at Acme Inc...',
        insert_confidence: 'HIGH',
      } as never)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Successful Generation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })

      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
      } as never)

      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        id: '123',
        personalized_insert: 'I noticed your innovative work at Acme Inc...',
        insert_confidence: 'HIGH',
      } as never)
    })

    it('should return HIGH confidence when linkedinUrl is provided', async () => {
      const mockAnthropic = createMockAnthropicClient('I noticed your innovative work at Acme Inc...')
      vi.mocked(anthropicHelper).mockResolvedValue(mockAnthropic as never)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Software Engineer',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.confidence).toBe('HIGH')
      expect(data.personalizedInsert).toBeDefined()
    })

    it('should return MEDIUM confidence when company and position are provided without linkedinUrl', async () => {
      const mockAnthropic = createMockAnthropicClient(
        'Your work at Acme Inc as an Engineer caught my attention...'
      )
      vi.mocked(anthropicHelper).mockResolvedValue(mockAnthropic as never)

      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        id: '123',
        personalized_insert: 'Your work at Acme Inc as an Engineer caught my attention...',
        insert_confidence: 'MEDIUM',
      } as never)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.confidence).toBe('MEDIUM')
      expect(data.personalizedInsert).toBeDefined()
    })

    it('should update contact with personalized insert and confidence', async () => {
      const mockAnthropic = createMockAnthropicClient('I noticed your innovative work at Acme Inc...')
      vi.mocked(anthropicHelper).mockResolvedValue(mockAnthropic as never)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      })

      await POST(request)

      expect(prismadb.crm_Contacts.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: {
          personalized_insert: expect.any(String),
          insert_confidence: expect.stringMatching(/^(HIGH|MEDIUM|LOW)$/),
        },
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
    })

    it('should return 403 when contact is not found or access denied', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(null)

      const request = createMockRequest({
        contactId: 'nonexistent',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Contact not found')
    })

    it('should return 500 when Anthropic API fails', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
      } as never)

      const mockAnthropic = {
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Anthropic API error')),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockAnthropic as never)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should return 500 when ANTHROPIC_API_KEY is not configured', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
      } as never)

      // Return null to simulate no API key configured
      vi.mocked(anthropicHelper).mockResolvedValue(null)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('API key')
    })
  })

  describe('Confidence Calculation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })

      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
      } as never)

      const mockAnthropic = createMockAnthropicClient('Generated personalized text...')
      vi.mocked(anthropicHelper).mockResolvedValue(mockAnthropic as never)

      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        id: '123',
        personalized_insert: 'Generated personalized text...',
        insert_confidence: 'MEDIUM',
      } as never)
    })

    it('should calculate HIGH confidence with detailed info (linkedinUrl)', async () => {
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        id: '123',
        personalized_insert: 'Generated personalized text...',
        insert_confidence: 'HIGH',
      } as never)

      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.confidence).toBe('HIGH')
    })

    it('should calculate MEDIUM confidence with company and position only', async () => {
      const request = createMockRequest({
        contactId: '123',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc',
        position: 'Engineer',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.confidence).toBe('MEDIUM')
    })
  })
})
