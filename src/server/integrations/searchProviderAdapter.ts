/**
 * Search Provider Adapter
 * Transforms raw SerpAPI results into domain objects for contact finding
 */

import { searchProvider as rawSearchProvider } from './searchProvider'
import type { SearchProvider } from '../actions/handlers/findContacts'

/**
 * Adapter that implements the SearchProvider interface expected by findContacts
 * Transforms SerpAPI results (title, snippet, position) to domain format (name, company, url, snippet)
 */
export const searchProviderAdapter: SearchProvider = {
  search: async (query: string, maxResults: number) => {
    // Call the raw SerpAPI integration
    const rawResults = await rawSearchProvider.search({
      query,
      numResults: maxResults,
    })

    // Transform to domain format
    return rawResults.map((result) => ({
      name: result.title || 'Unknown',
      company: extractCompanyFromSnippet(result.snippet) || 'Unknown Company',
      url: result.url,
      snippet: result.snippet || '',
    }))
  },
}

/**
 * Extract company name from snippet
 * Heuristic: Look for patterns like "at Company Name" or "Company Name -"
 */
function extractCompanyFromSnippet(snippet: string): string | null {
  if (!snippet) return null

  // Pattern 1: "at Company Name" or "@ Company Name"
  const atMatch = snippet.match(/(?:at|@)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s+[-|·]|\.|,|$)/)
  if (atMatch) {
    return atMatch[1].trim()
  }

  // Pattern 2: "Company Name -" at the start
  const dashMatch = snippet.match(/^([A-Z][A-Za-z0-9\s&.]+?)\s+-/)
  if (dashMatch) {
    return dashMatch[1].trim()
  }

  // Pattern 3: First capitalized phrase before common separators
  const firstPhraseMatch = snippet.match(/^([A-Z][A-Za-z0-9\s&.]+?)(?:\s+[-|·]|:)/)
  if (firstPhraseMatch) {
    return firstPhraseMatch[1].trim()
  }

  return null
}
