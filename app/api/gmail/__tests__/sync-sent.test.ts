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
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/gmail', () => ({
  searchSentEmails: vi.fn(),
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

import { POST } from '../sync-sent/route'
import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'
import { searchSentEmails } from '@/lib/gmail'

describe('POST /api/gmail/sync-sent', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
    accessToken: 'mock-access-token',
  }

  const mockContact = {
    id: 'contact-123',
    email: 'recipient@example.com',
    first_name: 'John',
    last_name: 'Doe',
    email_status: 'DRAFTED',
    sent_at: null,
  }

  const mockContact2 = {
    id: 'contact-456',
    email: 'recipient2@example.com',
    first_name: 'Jane',
    last_name: 'Smith',
    email_status: 'DRAFTED',
    sent_at: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost:3000/api/gmail/sync-sent', {
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

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthenticated')
    })

    it('should return 401 when access token is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        // No accessToken
      })

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Gmail access not authorized')
    })
  })

  describe('Input Validation', () => {
    it('should return 400 when neither contactId nor contactIds is provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('contactId or contactIds')
    })

    it('should return 400 when contactIds is empty array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({ contactIds: [] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when contactId is not a string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({ contactId: 123 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when contactIds contains non-strings', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const request = createRequest({ contactIds: ['valid-id', 123, null] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })

  describe('Single Contact - Success', () => {
    it('should update contact when email is found in sent folder', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact] as never)

      const sentDate = new Date('2024-01-15T10:30:00Z')
      vi.mocked(searchSentEmails).mockResolvedValue({
        found: true,
        sentAt: sentDate,
        messageId: 'msg-123',
      })

      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({
        ...mockContact,
        email_status: 'SENT',
        sent_at: sentDate,
      } as never)

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(1)
      expect(data.updated[0].id).toBe('contact-123')
      expect(data.updated[0].email_status).toBe('SENT')
      expect(data.notFound).toHaveLength(0)
    })

    it('should return notFound when no email was sent to contact', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact] as never)
      vi.mocked(searchSentEmails).mockResolvedValue({
        found: false,
        sentAt: null,
        messageId: null,
      })

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(0)
      expect(data.notFound).toHaveLength(1)
      expect(data.notFound[0]).toBe('contact-123')
      expect(prismadb.crm_Contacts.update).not.toHaveBeenCalled()
    })

    it('should return notFound when contact does not exist', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([])

      const request = createRequest({ contactId: 'nonexistent-id' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(0)
      expect(data.notFound).toHaveLength(1)
      expect(data.notFound[0]).toBe('nonexistent-id')
    })

    it('should return notFound when contact has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([{
        ...mockContact,
        email: null,
      }] as never)

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(0)
      expect(data.notFound).toHaveLength(1)
    })
  })

  describe('Batch Contacts - Success', () => {
    it('should process multiple contacts in batch', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact, mockContact2] as never)

      const sentDate1 = new Date('2024-01-15T10:30:00Z')
      const sentDate2 = new Date('2024-01-16T14:00:00Z')

      vi.mocked(searchSentEmails)
        .mockResolvedValueOnce({ found: true, sentAt: sentDate1, messageId: 'msg-1' })
        .mockResolvedValueOnce({ found: true, sentAt: sentDate2, messageId: 'msg-2' })

      vi.mocked(prismadb.crm_Contacts.update)
        .mockResolvedValueOnce({ ...mockContact, email_status: 'SENT', sent_at: sentDate1 } as never)
        .mockResolvedValueOnce({ ...mockContact2, email_status: 'SENT', sent_at: sentDate2 } as never)

      const request = createRequest({ contactIds: ['contact-123', 'contact-456'] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(2)
      expect(data.notFound).toHaveLength(0)
    })

    it('should handle mixed results - some found, some not', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact, mockContact2] as never)

      const sentDate = new Date('2024-01-15T10:30:00Z')

      vi.mocked(searchSentEmails)
        .mockResolvedValueOnce({ found: true, sentAt: sentDate, messageId: 'msg-1' })
        .mockResolvedValueOnce({ found: false, sentAt: null, messageId: null })

      vi.mocked(prismadb.crm_Contacts.update)
        .mockResolvedValueOnce({ ...mockContact, email_status: 'SENT', sent_at: sentDate } as never)

      const request = createRequest({ contactIds: ['contact-123', 'contact-456'] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(1)
      expect(data.updated[0].id).toBe('contact-123')
      expect(data.notFound).toHaveLength(1)
      expect(data.notFound[0]).toBe('contact-456')
    })

    it('should skip contacts that do not exist in database', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact] as never)

      const sentDate = new Date('2024-01-15T10:30:00Z')
      vi.mocked(searchSentEmails).mockResolvedValue({ found: true, sentAt: sentDate, messageId: 'msg-1' })
      vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({ ...mockContact, email_status: 'SENT', sent_at: sentDate } as never)

      const request = createRequest({ contactIds: ['contact-123', 'nonexistent-id'] })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(1)
      expect(data.notFound).toContain('nonexistent-id')
    })
  })

  describe('Gmail API Error Handling', () => {
    it('should return 502 when Gmail API returns an error', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact] as never)
      vi.mocked(searchSentEmails).mockRejectedValue(new Error('Gmail API rate limit exceeded'))

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error).toContain('Gmail API error')
    })

    it('should handle rate limit errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact] as never)

      const rateLimitError = new Error('Rate limit exceeded')
      Object.assign(rateLimitError, { status: 429 })
      vi.mocked(searchSentEmails).mockRejectedValue(rateLimitError)

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('rate limit')
    })
  })

  describe('Database Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockRejectedValue(new Error('Database connection failed'))

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should return 500 when update fails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact] as never)
      vi.mocked(searchSentEmails).mockResolvedValue({ found: true, sentAt: new Date(), messageId: 'msg-1' })
      vi.mocked(prismadb.crm_Contacts.update).mockRejectedValue(new Error('Update failed'))

      const request = createRequest({ contactId: 'contact-123' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe('Gmail Search Query', () => {
    it('should search for emails to contact email address', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([mockContact] as never)
      vi.mocked(searchSentEmails).mockResolvedValue({ found: false, sentAt: null, messageId: null })

      const request = createRequest({ contactId: 'contact-123' })
      await POST(request)

      expect(searchSentEmails).toHaveBeenCalledWith(
        'mock-access-token',
        'recipient@example.com'
      )
    })
  })

  describe('Authorization', () => {
    it('should only query contacts assigned to the current user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([])

      const request = createRequest({ contactId: 'contact-123' })
      await POST(request)

      expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['contact-123'] },
          assigned_to: 'user-123',
        },
        select: {
          id: true,
          email: true,
          email_status: true,
          sent_at: true,
        },
      })
    })

    it('should return contacts not owned by user in notFound array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession)
      // Simulate that contact-not-owned is not returned because user doesn't own it
      vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([])

      const request = createRequest({ contactId: 'contact-not-owned' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.updated).toHaveLength(0)
      expect(data.notFound).toContain('contact-not-owned')
    })
  })
})
