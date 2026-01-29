import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    integrationConnection: {
      findUnique: vi.fn(),
    },
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import {
  gmailService,
  type GmailDraft,
  type CreateDraftOptions,
  type SendOptions,
} from '../gmailService'
import { prismadb } from '@/lib/prisma'

const mockFindUnique = vi.mocked(prismadb.integrationConnection.findUnique)

const USER_ID = 'user-123'
const MOCK_GMAIL_INTEGRATION = {
  id: 'conn-1',
  provider: 'GMAIL' as const,
  userId: USER_ID,
  accessToken: 'gmail-access-token',
  refreshToken: 'gmail-refresh-token',
  isActive: true,
  expiresAt: new Date(Date.now() + 3600000),
  metadata: null,
}

describe('gmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('types', () => {
    it('should have correct GmailDraft shape', () => {
      const draft: GmailDraft = {
        id: 'draft-123',
        threadId: 'thread-456',
        messageId: 'msg-789',
      }

      expect(draft.id).toBe('draft-123')
      expect(draft.threadId).toBe('thread-456')
      expect(draft.messageId).toBe('msg-789')
    })

    it('should have correct CreateDraftOptions shape', () => {
      const options: CreateDraftOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
        labelNames: ['Student Networking CRM', 'Campaign — Tech PMs'],
      }

      expect(options.to).toBe('recipient@example.com')
      expect(options.labelNames).toHaveLength(2)
    })

    it('should have correct SendOptions shape', () => {
      const options: SendOptions = { draftId: 'draft-123' }
      expect(options.draftId).toBe('draft-123')
    })
  })

  describe('isConnected', () => {
    it('returns true when Gmail integration exists and is active', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)

      const result = await gmailService.isConnected(USER_ID)
      expect(result).toBe(true)
    })

    it('returns false when no integration exists', async () => {
      mockFindUnique.mockResolvedValueOnce(null)

      const result = await gmailService.isConnected(USER_ID)
      expect(result).toBe(false)
    })

    it('returns false when integration has no access token', async () => {
      mockFindUnique.mockResolvedValueOnce({
        ...MOCK_GMAIL_INTEGRATION,
        accessToken: null,
      })

      const result = await gmailService.isConnected(USER_ID)
      expect(result).toBe(false)
    })
  })

  describe('ensureLabels', () => {
    it('creates labels that do not exist', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)
      // List labels - none exist
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ labels: [] }),
      })
      // Create label 1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'label-1', name: 'CRM' }),
      })

      await gmailService.ensureLabels(USER_ID, ['CRM'])

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('skips labels that already exist', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          labels: [{ id: 'label-1', name: 'CRM' }],
        }),
      })

      await gmailService.ensureLabels(USER_ID, ['CRM'])

      // Only 1 call: list labels. No create call needed.
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('createDraft', () => {
    it('creates a draft email via Gmail API', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)
      // Create draft (no label mocks needed - labelNames is empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'draft-123',
          message: { id: 'msg-456', threadId: 'thread-789' },
        }),
      })

      const result = await gmailService.createDraft(USER_ID, {
        to: 'jane@example.com',
        subject: 'Hello',
        body: 'Hi Jane!',
        labelNames: [],
      })

      expect(result.id).toBe('draft-123')
      expect(result.messageId).toBe('msg-456')
      expect(result.threadId).toBe('thread-789')
    })

    it('throws when Gmail is not configured', async () => {
      mockFindUnique.mockResolvedValueOnce(null)

      await expect(
        gmailService.createDraft(USER_ID, {
          to: 'test@example.com',
          subject: 'Test',
          body: 'Body',
          labelNames: [],
        })
      ).rejects.toThrow('Gmail is not configured')
    })
  })

  describe('sendDraft', () => {
    it('sends an existing draft', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-sent', threadId: 'thread-1' }),
      })

      await gmailService.sendDraft(USER_ID, { draftId: 'draft-123' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('throws on API error', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: { message: 'Draft not found' } }),
      })

      await expect(
        gmailService.sendDraft(USER_ID, { draftId: 'nonexistent' })
      ).rejects.toThrow('Gmail API error')
    })
  })

  describe('isDraftSent', () => {
    it('returns true when draft no longer exists (was sent)', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      })

      const result = await gmailService.isDraftSent(USER_ID, 'draft-123')
      expect(result).toBe(true)
    })

    it('returns false when draft still exists', async () => {
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'draft-123' }),
      })

      const result = await gmailService.isDraftSent(USER_ID, 'draft-123')
      expect(result).toBe(false)
    })
  })

  describe('syncSentStatus', () => {
    it('returns updated count', async () => {
      // This is a higher-level operation that queries contacts
      // For now, just verify it returns the expected shape
      mockFindUnique.mockResolvedValueOnce(MOCK_GMAIL_INTEGRATION)

      const result = await gmailService.syncSentStatus(USER_ID)
      expect(result).toHaveProperty('updatedCount')
      expect(typeof result.updatedCount).toBe('number')
    })
  })
})
