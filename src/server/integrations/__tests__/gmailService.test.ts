import { describe, it, expect } from 'vitest'
import {
  gmailService,
  type GmailDraft,
  type CreateDraftOptions,
  type SendOptions,
} from '../gmailService'

describe('gmailService', () => {
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
      expect(options.subject).toBe('Test Subject')
      expect(options.body).toBe('Test body content')
      expect(options.labelNames).toHaveLength(2)
    })

    it('should have correct SendOptions shape', () => {
      const options: SendOptions = {
        draftId: 'draft-123',
      }

      expect(options.draftId).toBe('draft-123')
    })
  })

  describe('isConnected', () => {
    it('should be a function', () => {
      expect(typeof gmailService.isConnected).toBe('function')
    })

    it('should throw "not implemented" error (stub behavior)', async () => {
      await expect(gmailService.isConnected('user-123')).rejects.toThrow(
        'Not implemented - Phase 2'
      )
    })
  })

  describe('ensureLabels', () => {
    it('should be a function', () => {
      expect(typeof gmailService.ensureLabels).toBe('function')
    })

    it('should throw "not implemented" error (stub behavior)', async () => {
      await expect(
        gmailService.ensureLabels('user-123', ['Label1', 'Label2'])
      ).rejects.toThrow('Not implemented - Phase 2')
    })
  })

  describe('createDraft', () => {
    it('should be a function', () => {
      expect(typeof gmailService.createDraft).toBe('function')
    })

    it('should throw "not implemented" error (stub behavior)', async () => {
      const options: CreateDraftOptions = {
        to: 'test@example.com',
        subject: 'Test',
        body: 'Body',
        labelNames: [],
      }

      await expect(
        gmailService.createDraft('user-123', options)
      ).rejects.toThrow('Not implemented - Phase 2')
    })
  })

  describe('sendDraft', () => {
    it('should be a function', () => {
      expect(typeof gmailService.sendDraft).toBe('function')
    })

    it('should throw "not implemented" error (stub behavior)', async () => {
      await expect(
        gmailService.sendDraft('user-123', { draftId: 'draft-123' })
      ).rejects.toThrow('Not implemented - Phase 2')
    })
  })

  describe('isDraftSent', () => {
    it('should be a function', () => {
      expect(typeof gmailService.isDraftSent).toBe('function')
    })

    it('should throw "not implemented" error (stub behavior)', async () => {
      await expect(
        gmailService.isDraftSent('user-123', 'draft-123')
      ).rejects.toThrow('Not implemented - Phase 2')
    })
  })

  describe('syncSentStatus', () => {
    it('should be a function', () => {
      expect(typeof gmailService.syncSentStatus).toBe('function')
    })

    it('should throw "not implemented" error (stub behavior)', async () => {
      await expect(gmailService.syncSentStatus('user-123')).rejects.toThrow(
        'Not implemented - Phase 2'
      )
    })
  })
})
