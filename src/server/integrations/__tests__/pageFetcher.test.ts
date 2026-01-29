import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  pageFetcher,
  type FetchedPage,
  type FetchOptions,
} from '../pageFetcher'

describe('pageFetcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

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

  describe('isSafeUrl', () => {
    it('should return true for safe URLs', () => {
      expect(pageFetcher.isSafeUrl('https://example.com')).toBe(true)
      expect(pageFetcher.isSafeUrl('https://techcrunch.com/article')).toBe(true)
      expect(pageFetcher.isSafeUrl('https://blog.company.com/post')).toBe(true)
      expect(pageFetcher.isSafeUrl('http://insecure-but-safe.com')).toBe(true)
    })

    it('should return false for LinkedIn URLs', () => {
      expect(pageFetcher.isSafeUrl('https://linkedin.com/in/johndoe')).toBe(false)
      expect(pageFetcher.isSafeUrl('https://www.linkedin.com/in/johndoe')).toBe(false)
      expect(pageFetcher.isSafeUrl('https://www.linkedin.com/company/acme')).toBe(false)
      expect(pageFetcher.isSafeUrl('https://uk.linkedin.com/in/johndoe')).toBe(false)
    })

    it('should return false for invalid URLs', () => {
      expect(pageFetcher.isSafeUrl('not-a-url')).toBe(false)
      expect(pageFetcher.isSafeUrl('')).toBe(false)
      expect(pageFetcher.isSafeUrl('javascript:alert(1)')).toBe(false)
    })

    it('should only allow http and https protocols', () => {
      expect(pageFetcher.isSafeUrl('https://example.com')).toBe(true)
      expect(pageFetcher.isSafeUrl('http://example.com')).toBe(true)
      expect(pageFetcher.isSafeUrl('ftp://files.example.com')).toBe(false)
      expect(pageFetcher.isSafeUrl('file:///etc/passwd')).toBe(false)
    })

    it('should be case-insensitive for domain blocking', () => {
      expect(pageFetcher.isSafeUrl('https://LINKEDIN.COM/in/test')).toBe(false)
      expect(pageFetcher.isSafeUrl('https://LinkedIn.com/in/test')).toBe(false)
      expect(pageFetcher.isSafeUrl('https://WWW.LINKEDIN.COM/in/test')).toBe(false)
    })
  })

  describe('fetchPages', () => {
    it('should be a function', () => {
      expect(typeof pageFetcher.fetchPages).toBe('function')
    })

    it('should fetch a single page and extract text', async () => {
      const html = '<html><head><title>Test Page</title></head><body><p>Hello world</p></body></html>'
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(html, { status: 200 })
      )

      const result = await pageFetcher.fetchPages({ urls: ['https://example.com'] })

      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('https://example.com')
      expect(result[0].title).toBe('Test Page')
      expect(result[0].text).toContain('Hello world')
      expect(result[0].fetchedAt).toBeInstanceOf(Date)
    })

    it('should strip HTML tags from content', async () => {
      const html = '<html><head><title>T</title></head><body><div><p>Text <b>bold</b></p><script>evil()</script></div></body></html>'
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(html, { status: 200 })
      )

      const result = await pageFetcher.fetchPages({ urls: ['https://example.com'] })

      expect(result[0].text).not.toContain('<')
      expect(result[0].text).not.toContain('evil()')
      expect(result[0].text).toContain('Text')
      expect(result[0].text).toContain('bold')
    })

    it('should skip LinkedIn URLs', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      const result = await pageFetcher.fetchPages({
        urls: ['https://linkedin.com/in/john', 'https://www.linkedin.com/company/test'],
      })

      expect(result).toHaveLength(0)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('should limit text to 5000 characters', async () => {
      const longText = 'A'.repeat(10000)
      const html = `<html><head><title>T</title></head><body>${longText}</body></html>`
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(html, { status: 200 })
      )

      const result = await pageFetcher.fetchPages({ urls: ['https://example.com'] })

      expect(result[0].text.length).toBeLessThanOrEqual(5000)
    })

    it('should respect maxPagesPerContact limit', async () => {
      const html = '<html><head><title>T</title></head><body>Content</body></html>'
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        () => Promise.resolve(new Response(html, { status: 200 }))
      )

      const urls = Array.from({ length: 5 }, (_, i) => `https://example.com/${i}`)
      const result = await pageFetcher.fetchPages({ urls, maxPagesPerContact: 2 })

      expect(result).toHaveLength(2)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('should default maxPagesPerContact to 3', async () => {
      const html = '<html><head><title>T</title></head><body>Content</body></html>'
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        () => Promise.resolve(new Response(html, { status: 200 }))
      )

      const urls = Array.from({ length: 5 }, (_, i) => `https://example.com/${i}`)
      const result = await pageFetcher.fetchPages({ urls })

      expect(result).toHaveLength(3)
      expect(fetchSpy).toHaveBeenCalledTimes(3)
    })

    it('should include User-Agent header', async () => {
      const html = '<html><head><title>T</title></head><body>Content</body></html>'
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(html, { status: 200 })
      )

      await pageFetcher.fetchPages({ urls: ['https://example.com'] })

      const callArgs = fetchSpy.mock.calls[0]
      const options = callArgs[1] as RequestInit
      const headers = options.headers as Record<string, string>
      expect(headers['User-Agent']).toBeDefined()
    })

    it('should handle fetch errors gracefully by skipping failed URLs', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          new Response('<html><head><title>OK</title></head><body>Good</body></html>', { status: 200 })
        )

      const result = await pageFetcher.fetchPages({
        urls: ['https://bad.com', 'https://good.com'],
      })

      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('https://good.com')
    })

    it('should handle non-OK responses by skipping', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Not Found', { status: 404 })
      )

      const result = await pageFetcher.fetchPages({ urls: ['https://example.com/missing'] })

      expect(result).toHaveLength(0)
    })

    it('should return empty array for empty urls', async () => {
      const result = await pageFetcher.fetchPages({ urls: [] })
      expect(result).toHaveLength(0)
    })

    it('should filter unsafe URLs before fetching', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      const result = await pageFetcher.fetchPages({
        urls: ['ftp://files.com/secret', 'javascript:alert(1)'],
      })

      expect(result).toHaveLength(0)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })
})
