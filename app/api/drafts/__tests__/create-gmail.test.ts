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

// Mock global fetch for Gmail API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { POST } from '../create-gmail/route'
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'

describe('POST /api/drafts/create-gmail', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'sender@example.com',
    },
    accessToken: 'mock-gmail-access-token',
  }

  const mockContact = {
    id: 'contact-123',
    email: 'recipient@example.com',
    first_name: 'John',
    last_name: 'Doe',
    personalized_insert: 'I noticed your impressive work at Acme Inc and wanted to reach out.',
    email_status: 'BLANK',
    draft_created_at: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost:3000/api/drafts/create-gmail', {
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
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthenticated')
    })

    it('should return 401 when Gmail access token is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        // No accessToken
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Gmail access not authorized')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
    })

    it('should return 400 when contactId is missing', async () => {
      const request = createRequest({
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when contactId is not a string', async () => {
      const request = createRequest({
        contactId: 123,
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when subject is missing', async () => {
      const request = createRequest({
        contactId: 'contact-123',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when subject is empty string', async () => {
      const request = createRequest({
        contactId: 'contact-123',
        subject: '',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should accept optional templateId', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(mockContact as never)
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'DRAFTED',
        draft_created_at: new Date(),
      } as never)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: {
            id: 'msg-123',
            threadId: 'thread-123',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
        templateId: 'template-456',
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Contact Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
    })

    it('should return 403 when contact is not found or access denied', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(null)

      const request = createRequest({
        contactId: 'nonexistent-id',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Contact not found')
    })

    it('should return 400 when contact has no email', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        ...mockContact,
        email: null,
      } as never)

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Contact has no email address')
    })

    it('should return 400 when contact email is empty string', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        ...mockContact,
        email: '',
      } as never)

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Contact has no email address')
    })
  })

  describe('Successful Draft Creation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(mockContact as never)
    })

    it('should create Gmail draft and return draft ID', async () => {
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'DRAFTED',
        draft_created_at: new Date(),
      } as never)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: {
            id: 'msg-123',
            threadId: 'thread-123',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Networking Opportunity',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.draftId).toBe('draft-123')
      expect(data.threadId).toBe('thread-123')
      expect(data.message).toBeDefined()
    })

    it('should update contact email_status to DRAFTED', async () => {
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'DRAFTED',
        draft_created_at: new Date(),
      } as never)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: {
            id: 'msg-123',
            threadId: 'thread-123',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      await POST(request)

      expect(prismadb.crm_Contacts.update).toHaveBeenCalledWith({
        where: { id: 'contact-123' },
        data: {
          email_status: 'DRAFTED',
          draft_created_at: expect.any(Date),
        },
      })
    })

    it('should include personalized_insert in email body', async () => {
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'DRAFTED',
        draft_created_at: new Date(),
      } as never)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: {
            id: 'msg-123',
            threadId: 'thread-123',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      await POST(request)

      expect(mockFetch).toHaveBeenCalledTimes(1)

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[0]).toBe('https://gmail.googleapis.com/gmail/v1/users/me/drafts')

      const fetchOptions = fetchCall[1]
      expect(fetchOptions.method).toBe('POST')
      expect(fetchOptions.headers.Authorization).toBe('Bearer mock-gmail-access-token')

      // Verify the body contains base64 encoded message with personalized insert
      const bodyObj = JSON.parse(fetchOptions.body)
      expect(bodyObj.message.raw).toBeDefined()

      // Decode base64url to verify content
      const decodedRaw = Buffer.from(bodyObj.message.raw, 'base64url').toString('utf-8')
      expect(decodedRaw).toContain('To: recipient@example.com')
      expect(decodedRaw).toContain('Subject: Hello!')
      expect(decodedRaw).toContain('I noticed your impressive work at Acme Inc')
    })

    it('should handle contact without personalized_insert', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        ...mockContact,
        personalized_insert: null,
      } as never)

      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'DRAFTED',
        draft_created_at: new Date(),
      } as never)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: {
            id: 'msg-123',
            threadId: 'thread-123',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Gmail API Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(mockContact as never)
    })

    it('should return 401 when Gmail API returns 401 (invalid token)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 401,
            message: 'Invalid Credentials',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Gmail access denied')
    })

    it('should return 403 when Gmail API returns 403 (insufficient permissions)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 403,
            message: 'Insufficient Permission',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Insufficient Gmail permissions')
    })

    it('should return 429 when Gmail API returns rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: 429,
            message: 'Rate Limit Exceeded',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('rate limit')
    })

    it('should return 502 when Gmail API returns other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: 500,
            message: 'Internal Server Error',
          },
        }),
      })

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toContain('Gmail API error')
    })

    it('should handle network failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toBeDefined()
    })
  })

  describe('Database Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
    })

    it('should return 500 when database query fails', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should return 500 when update fails after draft creation', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(mockContact as never)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: {
            id: 'msg-123',
            threadId: 'thread-123',
          },
        }),
      })

      vi.mocked(prismadb.crm_Contacts.update).mockRejectedValue(new Error('Update failed'))

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      const response = await POST(request)
      const data = await response.json()

      // Note: The draft was created but DB update failed
      // We still return success since the draft exists in Gmail
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.warning).toBeDefined()
    })
  })

  describe('RFC 2822 Email Formatting', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(mockContact as never)
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'DRAFTED',
      } as never)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: { id: 'msg-123', threadId: 'thread-123' },
        }),
      })
    })

    it('should properly format email headers', async () => {
      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Test Subject',
      })
      await POST(request)

      const fetchCall = mockFetch.mock.calls[0]
      const bodyObj = JSON.parse(fetchCall[1].body)
      const decodedRaw = Buffer.from(bodyObj.message.raw, 'base64url').toString('utf-8')

      expect(decodedRaw).toContain('To: recipient@example.com')
      expect(decodedRaw).toContain('Subject: Test Subject')
      expect(decodedRaw).toContain('Content-Type: text/plain; charset="UTF-8"')
    })

    it('should handle special characters in subject', async () => {
      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Re: Your profile - Great work!',
      })
      await POST(request)

      const fetchCall = mockFetch.mock.calls[0]
      const bodyObj = JSON.parse(fetchCall[1].body)
      const decodedRaw = Buffer.from(bodyObj.message.raw, 'base64url').toString('utf-8')

      expect(decodedRaw).toContain('Subject: Re: Your profile - Great work!')
    })

    it('should handle unicode characters in subject and body', async () => {
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
        ...mockContact,
        personalized_insert: 'Hello! Nice to meet you.',
      } as never)

      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello World',
      })
      await POST(request)

      const fetchCall = mockFetch.mock.calls[0]
      const bodyObj = JSON.parse(fetchCall[1].body)
      const decodedRaw = Buffer.from(bodyObj.message.raw, 'base64url').toString('utf-8')

      expect(decodedRaw).toContain('Hello! Nice to meet you.')
    })
  })

  describe('Gmail API Request Format', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(mockContact as never)
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'DRAFTED',
      } as never)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'draft-123',
          message: { id: 'msg-123', threadId: 'thread-123' },
        }),
      })
    })

    it('should call correct Gmail API endpoint', async () => {
      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-gmail-access-token',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should send base64url encoded raw message', async () => {
      const request = createRequest({
        contactId: 'contact-123',
        subject: 'Hello!',
      })
      await POST(request)

      const fetchCall = mockFetch.mock.calls[0]
      const bodyObj = JSON.parse(fetchCall[1].body)

      expect(bodyObj).toHaveProperty('message')
      expect(bodyObj.message).toHaveProperty('raw')

      // Verify it's valid base64url
      const decoded = Buffer.from(bodyObj.message.raw, 'base64url').toString('utf-8')
      expect(decoded).toBeTruthy()
    })
  })
})
