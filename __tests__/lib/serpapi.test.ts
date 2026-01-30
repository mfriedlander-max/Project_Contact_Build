// __tests__/lib/serpapi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchContacts, type SerpApiSearchResult } from '@/lib/serpapi'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('searchContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SERPAPI_API_KEY', 'test-key')
  })

  it('throws when API key is not configured', async () => {
    vi.stubEnv('SERPAPI_API_KEY', '')
    await expect(searchContacts('test query', 10)).rejects.toThrow('SerpAPI key is not configured')
  })

  it('returns parsed search results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        organic_results: [
          {
            title: 'John Smith - VP Engineering at Acme Corp | LinkedIn',
            link: 'https://linkedin.com/in/johnsmith',
            snippet: 'John Smith is VP of Engineering at Acme Corp with 10 years experience.',
          },
          {
            title: 'Jane Doe - Product Manager at Tech Inc',
            link: 'https://example.com/janedoe',
            snippet: 'Jane Doe leads product at Tech Inc.',
          },
        ],
      }),
    })

    const results = await searchContacts('VP Engineering Bay Area', 5)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      name: 'John Smith',
      company: 'Acme Corp',
      url: 'https://linkedin.com/in/johnsmith',
      snippet: 'John Smith is VP of Engineering at Acme Corp with 10 years experience.',
    })
  })

  it('handles empty results gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ organic_results: [] }),
    })

    const results = await searchContacts('nonexistent person', 5)
    expect(results).toEqual([])
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Invalid API key' }),
    })

    await expect(searchContacts('test', 5)).rejects.toThrow('SerpAPI error')
  })

  it('respects maxResults parameter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        organic_results: Array.from({ length: 20 }, (_, i) => ({
          title: `Person ${i} - Role at Company ${i}`,
          link: `https://example.com/${i}`,
          snippet: `Snippet ${i}`,
        })),
      }),
    })

    const results = await searchContacts('test', 5)
    expect(results).toHaveLength(5)
  })
})
