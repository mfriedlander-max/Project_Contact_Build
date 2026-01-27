import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchSentEmails, validateGmailAccess } from '../gmail'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Gmail API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('searchSentEmails', () => {
    const accessToken = 'mock-access-token'
    const recipientEmail = 'recipient@example.com'

    it('should return found:true when email is found in sent folder', async () => {
      // Mock messages list response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'msg-123', threadId: 'thread-123' }],
          resultSizeEstimate: 1,
        }),
      })

      // Mock message details response
      const sentTimestamp = Date.now()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-123',
          threadId: 'thread-123',
          internalDate: String(sentTimestamp),
          payload: {
            headers: [{ name: 'Date', value: 'Mon, 15 Jan 2024 10:30:00 GMT' }],
          },
        }),
      })

      const result = await searchSentEmails(accessToken, recipientEmail)

      expect(result.found).toBe(true)
      expect(result.messageId).toBe('msg-123')
      expect(result.sentAt).toBeInstanceOf(Date)
      expect(result.sentAt?.getTime()).toBe(sentTimestamp)
    })

    it('should return found:false when no email is found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resultSizeEstimate: 0,
        }),
      })

      const result = await searchSentEmails(accessToken, recipientEmail)

      expect(result.found).toBe(false)
      expect(result.messageId).toBeNull()
      expect(result.sentAt).toBeNull()
    })

    it('should return found:false when messages array is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [],
          resultSizeEstimate: 0,
        }),
      })

      const result = await searchSentEmails(accessToken, recipientEmail)

      expect(result.found).toBe(false)
      expect(result.messageId).toBeNull()
      expect(result.sentAt).toBeNull()
    })

    it('should call Gmail API with correct search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resultSizeEstimate: 0 }),
      })

      await searchSentEmails(accessToken, recipientEmail)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('https://gmail.googleapis.com/gmail/v1/users/me/messages')
      // URLSearchParams encodes spaces as '+' not '%20'
      expect(calledUrl).toContain('q=from%3Ame+to%3Arecipient%40example.com+in%3Asent')
      expect(calledUrl).toContain('maxResults=1')
    })

    it('should include Authorization header with access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resultSizeEstimate: 0 }),
      })

      await searchSentEmails(accessToken, recipientEmail)

      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit
      expect(calledOptions.headers).toEqual({
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      })
    })

    it('should throw rate limit error when API returns 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      })

      await expect(searchSentEmails(accessToken, recipientEmail)).rejects.toThrow(
        'Gmail API rate limit exceeded'
      )

      try {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({}),
        })
        await searchSentEmails(accessToken, recipientEmail)
      } catch (error) {
        expect((error as { status?: number }).status).toBe(429)
      }
    })

    it('should throw error when API returns non-200 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid credentials' } }),
      })

      await expect(searchSentEmails(accessToken, recipientEmail)).rejects.toThrow(
        'Gmail API error: Invalid credentials'
      )
    })

    it('should throw error when list API returns invalid response', async () => {
      // Return a non-object response that fails Zod object validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'not an object',
      })

      await expect(searchSentEmails(accessToken, recipientEmail)).rejects.toThrow(
        'Invalid response from Gmail API'
      )
    })

    it('should throw rate limit error when message details API returns 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'msg-123', threadId: 'thread-123' }],
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      })

      await expect(searchSentEmails(accessToken, recipientEmail)).rejects.toThrow(
        'Gmail API rate limit exceeded'
      )
    })

    it('should throw error when message details API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'msg-123', threadId: 'thread-123' }],
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } }),
      })

      await expect(searchSentEmails(accessToken, recipientEmail)).rejects.toThrow(
        'Gmail API error: Internal server error'
      )
    })

    it('should throw error when message details returns invalid response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'msg-123', threadId: 'thread-123' }],
        }),
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'message' }),
      })

      await expect(searchSentEmails(accessToken, recipientEmail)).rejects.toThrow(
        'Invalid message response from Gmail API'
      )
    })
  })

  describe('validateGmailAccess', () => {
    const accessToken = 'mock-access-token'

    it('should return true when profile API returns success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ emailAddress: 'user@gmail.com' }),
      })

      const result = await validateGmailAccess(accessToken)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        expect.objectContaining({
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should return false when profile API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const result = await validateGmailAccess(accessToken)

      expect(result).toBe(false)
    })

    it('should return false when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateGmailAccess(accessToken)

      expect(result).toBe(false)
    })
  })
})
