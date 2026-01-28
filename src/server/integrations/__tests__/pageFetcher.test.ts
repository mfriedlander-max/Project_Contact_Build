import { describe, it, expect } from 'vitest'
import {
  pageFetcher,
  type FetchedPage,
  type FetchOptions,
} from '../pageFetcher'

describe('pageFetcher', () => {
  describe('types', () => {
    it('should have correct FetchedPage shape', () => {
      const page: FetchedPage = {
        url: 'https://example.com/article',
        title: 'Article Title',
        text: 'Article body text content',
        fetchedAt: new Date('2026-01-28T10:00:00Z'),
      }

      expect(page.url).toBe('https://example.com/article')
      expect(page.title).toBe('Article Title')
      expect(page.text).toBe('Article body text content')
      expect(page.fetchedAt).toBeInstanceOf(Date)
    })

    it('should have correct FetchOptions shape', () => {
      const options: FetchOptions = {
        urls: ['https://example.com/1', 'https://example.com/2'],
        maxPagesPerContact: 3,
        timeoutMs: 10000,
      }

      expect(options.urls).toHaveLength(2)
      expect(options.maxPagesPerContact).toBe(3)
      expect(options.timeoutMs).toBe(10000)
    })

    it('should allow optional fields in FetchOptions', () => {
      const minimalOptions: FetchOptions = {
        urls: ['https://example.com'],
      }

      expect(minimalOptions.urls).toHaveLength(1)
      expect(minimalOptions.maxPagesPerContact).toBeUndefined()
      expect(minimalOptions.timeoutMs).toBeUndefined()
    })
  })

  describe('fetchPages', () => {
    it('should be a function', () => {
      expect(typeof pageFetcher.fetchPages).toBe('function')
    })

    it('should throw "not implemented" error (stub behavior)', async () => {
      const options: FetchOptions = { urls: ['https://example.com'] }

      await expect(pageFetcher.fetchPages(options)).rejects.toThrow(
        'Page fetcher not implemented - Phase 2'
      )
    })
  })

  describe('isSafeUrl', () => {
    it('should be a function', () => {
      expect(typeof pageFetcher.isSafeUrl).toBe('function')
    })

    it('should return true for safe URLs', () => {
      expect(pageFetcher.isSafeUrl('https://example.com')).toBe(true)
      expect(pageFetcher.isSafeUrl('https://techcrunch.com/article')).toBe(true)
      expect(pageFetcher.isSafeUrl('https://blog.company.com/post')).toBe(true)
      expect(pageFetcher.isSafeUrl('http://insecure-but-safe.com')).toBe(true)
    })

    it('should return false for LinkedIn URLs', () => {
      expect(pageFetcher.isSafeUrl('https://linkedin.com/in/johndoe')).toBe(
        false
      )
      expect(
        pageFetcher.isSafeUrl('https://www.linkedin.com/in/johndoe')
      ).toBe(false)
      expect(
        pageFetcher.isSafeUrl('https://www.linkedin.com/company/acme')
      ).toBe(false)
      expect(
        pageFetcher.isSafeUrl('https://uk.linkedin.com/in/johndoe')
      ).toBe(false)
    })

    it('should return false for invalid URLs', () => {
      expect(pageFetcher.isSafeUrl('not-a-url')).toBe(false)
      expect(pageFetcher.isSafeUrl('')).toBe(false)
      expect(pageFetcher.isSafeUrl('javascript:alert(1)')).toBe(false)
    })

    it('should only allow http and https protocols', () => {
      expect(pageFetcher.isSafeUrl('https://example.com')).toBe(true)
      expect(pageFetcher.isSafeUrl('http://example.com')).toBe(true)
      // Other protocols should be blocked for security
      expect(pageFetcher.isSafeUrl('ftp://files.example.com')).toBe(false)
      expect(pageFetcher.isSafeUrl('file:///etc/passwd')).toBe(false)
    })

    it('should be case-insensitive for domain blocking', () => {
      expect(pageFetcher.isSafeUrl('https://LINKEDIN.COM/in/test')).toBe(false)
      expect(pageFetcher.isSafeUrl('https://LinkedIn.com/in/test')).toBe(false)
      expect(pageFetcher.isSafeUrl('https://WWW.LINKEDIN.COM/in/test')).toBe(
        false
      )
    })
  })
})
