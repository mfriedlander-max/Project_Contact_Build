import { describe, it, expect } from 'vitest'
import {
  searchProvider,
  pageFetcher,
  gmailService,
  hunterService,
  type SearchResult,
  type SearchOptions,
  type FetchedPage,
  type FetchOptions,
  type GmailDraft,
  type CreateDraftOptions,
  type SendOptions,
  type EmailFindResult,
  type EmailFindOptions,
} from '../index'

describe('integrations barrel export', () => {
  describe('searchProvider exports', () => {
    it('should export searchProvider object', () => {
      expect(searchProvider).toBeDefined()
      expect(typeof searchProvider.search).toBe('function')
      expect(typeof searchProvider.isConfigured).toBe('function')
    })

    it('should export SearchResult type correctly', () => {
      const result: SearchResult = {
        title: 'Test',
        snippet: 'Test',
        url: 'https://test.com',
        position: 1,
      }
      expect(result).toBeDefined()
    })

    it('should export SearchOptions type correctly', () => {
      const options: SearchOptions = { query: 'test' }
      expect(options).toBeDefined()
    })
  })

  describe('pageFetcher exports', () => {
    it('should export pageFetcher object', () => {
      expect(pageFetcher).toBeDefined()
      expect(typeof pageFetcher.fetchPages).toBe('function')
      expect(typeof pageFetcher.isSafeUrl).toBe('function')
    })

    it('should export FetchedPage type correctly', () => {
      const page: FetchedPage = {
        url: 'https://test.com',
        title: 'Test',
        text: 'Test',
        fetchedAt: new Date(),
      }
      expect(page).toBeDefined()
    })

    it('should export FetchOptions type correctly', () => {
      const options: FetchOptions = { urls: ['https://test.com'] }
      expect(options).toBeDefined()
    })
  })

  describe('gmailService exports', () => {
    it('should export gmailService object', () => {
      expect(gmailService).toBeDefined()
      expect(typeof gmailService.isConnected).toBe('function')
      expect(typeof gmailService.ensureLabels).toBe('function')
      expect(typeof gmailService.createDraft).toBe('function')
      expect(typeof gmailService.sendDraft).toBe('function')
      expect(typeof gmailService.isDraftSent).toBe('function')
      expect(typeof gmailService.syncSentStatus).toBe('function')
    })

    it('should export GmailDraft type correctly', () => {
      const draft: GmailDraft = {
        id: 'test',
        threadId: 'test',
        messageId: 'test',
      }
      expect(draft).toBeDefined()
    })

    it('should export CreateDraftOptions type correctly', () => {
      const options: CreateDraftOptions = {
        to: 'test@test.com',
        subject: 'Test',
        body: 'Test',
        labelNames: [],
      }
      expect(options).toBeDefined()
    })

    it('should export SendOptions type correctly', () => {
      const options: SendOptions = { draftId: 'test' }
      expect(options).toBeDefined()
    })
  })

  describe('hunterService exports', () => {
    it('should export hunterService object', () => {
      expect(hunterService).toBeDefined()
      expect(typeof hunterService.isConfigured).toBe('function')
      expect(typeof hunterService.findEmail).toBe('function')
      expect(typeof hunterService.inferDomain).toBe('function')
    })

    it('should export EmailFindResult type correctly', () => {
      const result: EmailFindResult = {
        email: 'test@test.com',
        confidence: 'HIGH',
        sources: [],
      }
      expect(result).toBeDefined()
    })

    it('should export EmailFindOptions type correctly', () => {
      const options: EmailFindOptions = {
        firstName: 'Test',
        lastName: 'User',
        company: 'Test Co',
      }
      expect(options).toBeDefined()
    })
  })
})
