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

const mockChatCompletionsCreate = vi.fn()

vi.mock('@/lib/openai', () => ({
  openAiHelper: vi.fn(),
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
import { openAiHelper } from '@/lib/openai'
import { POST } from '../generate/route'

// Helper to create mock request
function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/personalization/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to create mock OpenAI client
function createMockOpenAIClient(responseContent: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: responseContent,
              },
            },
          ],
        }),
      },
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
      const mockOpenAI = createMockOpenAIClient('I noticed your innovative work at Acme Inc...')
      vi.mocked(openAiHelper).mockResolvedValue(mockOpenAI as never)

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
      const mockOpenAI = createMockOpenAIClient('I noticed your innovative work at Acme Inc...')
      vi.mocked(openAiHelper).mockResolvedValue(mockOpenAI as never)

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
      const mockOpenAI = createMockOpenAIClient(
        'Your work at Acme Inc as an Engineer caught my attention...'
      )
      vi.mocked(openAiHelper).mockResolvedValue(mockOpenAI as never)

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
      const mockOpenAI = createMockOpenAIClient('I noticed your innovative work at Acme Inc...')
      vi.mocked(openAiHelper).mockResolvedValue(mockOpenAI as never)

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

    it('should return 500 when OpenAI API fails', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
      } as never)

      const mockOpenAI = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('OpenAI API error')),
          },
        },
      }
      vi.mocked(openAiHelper).mockResolvedValue(mockOpenAI as never)

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

    it('should return 500 when OPENAI_API_KEY is not configured', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
      } as never)

      // Return null to simulate no API key configured
      vi.mocked(openAiHelper).mockResolvedValue(null)

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

      const mockOpenAI = createMockOpenAIClient('Generated personalized text...')
      vi.mocked(openAiHelper).mockResolvedValue(mockOpenAI as never)

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
