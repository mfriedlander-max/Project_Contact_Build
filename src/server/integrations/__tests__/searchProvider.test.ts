import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  searchProvider,
  type SearchResult,
  type SearchOptions,
} from '../searchProvider'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('searchProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Set up default env var
    process.env.SERPAPI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.SERPAPI_API_KEY
  })

  describe('types', () => {
    it('should have correct SearchResult shape', () => {
      const result: SearchResult = {
        title: 'Test Title',
        snippet: 'Test snippet text',
        url: 'https://example.com',
        position: 1,
      }

      expect(result.title).toBe('Test Title')
      expect(result.snippet).toBe('Test snippet text')
      expect(result.url).toBe('https://example.com')
      expect(result.position).toBe(1)
    })

    it('should have correct SearchOptions shape', () => {
      const options: SearchOptions = {
        query: 'test query',
        numResults: 30,
        excludeDomains: ['linkedin.com'],
      }

      expect(options.query).toBe('test query')
      expect(options.numResults).toBe(30)
      expect(options.excludeDomains).toEqual(['linkedin.com'])
    })

    it('should allow optional fields in SearchOptions', () => {
      const minimalOptions: SearchOptions = {
        query: 'minimal query',
      }

      expect(minimalOptions.query).toBe('minimal query')
      expect(minimalOptions.numResults).toBeUndefined()
      expect(minimalOptions.excludeDomains).toBeUndefined()
    })
  })

  describe('isConfigured', () => {
    it('should return true when SERPAPI_API_KEY env var is set', async () => {
      process.env.SERPAPI_API_KEY = 'valid-key'

      const result = await searchProvider.isConfigured()

      expect(result).toBe(true)
    })

    it('should return false when SERPAPI_API_KEY env var is not set', async () => {
      delete process.env.SERPAPI_API_KEY

      const result = await searchProvider.isConfigured()

      expect(result).toBe(false)
    })

    it('should return false when SERPAPI_API_KEY is empty string', async () => {
      process.env.SERPAPI_API_KEY = ''

      const result = await searchProvider.isConfigured()

      expect(result).toBe(false)
    })
  })

  describe('search', () => {
    const mockSerpApiResponse = {
      organic_results: [
        {
          position: 1,
          title: 'John Doe - CEO at TechCorp',
          snippet: 'John Doe is the CEO of TechCorp, a leading technology company...',
          link: 'https://techcorp.com/about/john-doe',
        },
        {
          position: 2,
          title: 'Jane Smith - CTO Profile',
          snippet: 'Jane Smith serves as Chief Technology Officer...',
          link: 'https://example.com/jane-smith',
        },
        {
          position: 3,
          title: 'LinkedIn Profile',
          snippet: 'View profile on LinkedIn...',
          link: 'https://linkedin.com/in/someone',
        },
        {
          position: 4,
          title: 'Another LinkedIn',
          snippet: 'Another LinkedIn profile...',
          link: 'https://www.linkedin.com/in/another',
        },
        {
          position: 5,
          title: 'Bob Wilson - Founder',
          snippet: 'Bob Wilson founded StartupXYZ...',
          link: 'https://startupxyz.com/team',
        },
      ],
    }

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockSerpApiResponse,
      })
    })

    it('should return SearchResult[] from SerpAPI response', async () => {
      const results = await searchProvider.search({ query: 'CEO tech companies' })

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toMatchObject({
        title: expect.any(String),
        snippet: expect.any(String),
        url: expect.any(String),
        position: expect.any(Number),
      })
    })

    it('should call SerpAPI with correct parameters', async () => {
      await searchProvider.search({ query: 'CEO tech companies', numResults: 15 })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('serpapi.com')
      expect(calledUrl).toContain('q=CEO+tech+companies')
      expect(calledUrl).toContain('num=15')
      expect(calledUrl).toContain('api_key=test-api-key')
    })

    it('should use default of 10 results when numResults not specified', async () => {
      await searchProvider.search({ query: 'test query' })

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('num=10')
    })

    it('should cap numResults at 30 maximum', async () => {
      await searchProvider.search({ query: 'test query', numResults: 100 })

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('num=30')
    })

    it('should exclude linkedin.com results by default', async () => {
      const results = await searchProvider.search({ query: 'CEO tech companies' })

      // LinkedIn results should be filtered out
      const linkedInResults = results.filter(
        (r) => r.url.includes('linkedin.com')
      )
      expect(linkedInResults).toHaveLength(0)

      // Non-LinkedIn results should be present
      const nonLinkedInResults = results.filter(
        (r) => !r.url.includes('linkedin.com')
      )
      expect(nonLinkedInResults.length).toBeGreaterThan(0)
    })

    it('should exclude custom domains when specified', async () => {
      const responseWithCustomDomain = {
        organic_results: [
          {
            position: 1,
            title: 'Result 1',
            snippet: 'Snippet 1',
            link: 'https://example.com/page1',
          },
          {
            position: 2,
            title: 'Result 2',
            snippet: 'Snippet 2',
            link: 'https://blocked-domain.com/page2',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithCustomDomain,
      })

      const results = await searchProvider.search({
        query: 'test',
        excludeDomains: ['linkedin.com', 'blocked-domain.com'],
      })

      expect(results).toHaveLength(1)
      expect(results[0].url).toBe('https://example.com/page1')
    })

    it('should throw error when API key is not configured', async () => {
      delete process.env.SERPAPI_API_KEY

      await expect(searchProvider.search({ query: 'test' })).rejects.toThrow(
        'SERPAPI_API_KEY is not configured'
      )
    })

    it('should throw error when API request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(searchProvider.search({ query: 'test' })).rejects.toThrow(
        'SerpAPI request failed: 401 Unauthorized'
      )
    })

    it('should handle empty results from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organic_results: [] }),
      })

      const results = await searchProvider.search({ query: 'obscure query' })

      expect(results).toEqual([])
    })

    it('should handle missing organic_results in API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const results = await searchProvider.search({ query: 'test' })

      expect(results).toEqual([])
    })

    it('should normalize result positions after filtering', async () => {
      // With LinkedIn filtered out, positions should be renumbered
      const results = await searchProvider.search({ query: 'CEO tech companies' })

      // Check positions are sequential starting from 1
      results.forEach((result, index) => {
        expect(result.position).toBe(index + 1)
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(searchProvider.search({ query: 'test' })).rejects.toThrow(
        'Network error'
      )
    })

    it('should trim and encode query properly', async () => {
      await searchProvider.search({ query: '  John Doe CEO & founder  ' })

      const calledUrl = mockFetch.mock.calls[0][0]
      // Should be trimmed and URL encoded
      expect(calledUrl).toContain('q=John+Doe+CEO+%26+founder')
    })

    it('should handle results with missing fields gracefully', async () => {
      const responseWithMissingFields = {
        organic_results: [
          {
            position: 1,
            title: 'Complete Result',
            snippet: 'Full snippet',
            link: 'https://example.com/complete',
          },
          {
            position: 2,
            // Missing title
            snippet: 'Snippet only',
            link: 'https://example.com/no-title',
          },
          {
            position: 3,
            title: 'No snippet',
            // Missing snippet
            link: 'https://example.com/no-snippet',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithMissingFields,
      })

      const results = await searchProvider.search({ query: 'test' })

      // Should handle missing fields with defaults
      expect(results).toHaveLength(3)
      expect(results[1].title).toBe('')
      expect(results[2].snippet).toBe('')
    })
  })
})
