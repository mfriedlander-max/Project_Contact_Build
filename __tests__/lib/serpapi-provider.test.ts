import { describe, it, expect, vi } from 'vitest'
import { createSerpApiSearchProvider } from '@/lib/serpapi-provider'

vi.mock('@/lib/serpapi', () => ({
  searchContacts: vi.fn(),
}))

import { searchContacts } from '@/lib/serpapi'

describe('SerpApiSearchProvider', () => {
  it('implements SearchProvider interface', async () => {
    vi.mocked(searchContacts).mockResolvedValue([
      { name: 'John', company: 'Acme', url: 'https://example.com', snippet: 'test' },
    ])

    const provider = createSerpApiSearchProvider()
    const results = await provider.search('test query', 10)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      name: 'John',
      company: 'Acme',
      url: 'https://example.com',
      snippet: 'test',
    })
    expect(searchContacts).toHaveBeenCalledWith('test query', 10)
  })
})
