import type { SearchProvider, SearchResult } from '@/src/server/actions/handlers/findContacts'
import { searchContacts } from '@/lib/serpapi'

export function createSerpApiSearchProvider(): SearchProvider {
  return {
    search: async (query: string, maxResults: number): Promise<ReadonlyArray<SearchResult>> => {
      return searchContacts(query, maxResults)
    },
  }
}
