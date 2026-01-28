/**
 * Search Provider Integration
 * Uses SerpAPI to find contacts via Google search
 *
 * Task 20: Agent C Phase 1
 */

const DEFAULT_NUM_RESULTS = 10
const MAX_NUM_RESULTS = 30
const DEFAULT_EXCLUDED_DOMAINS = ['linkedin.com', 'www.linkedin.com'] as const
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json'

export interface SearchResult {
  title: string
  snippet: string
  url: string
  position: number
}

export interface SearchOptions {
  query: string
  numResults?: number // Default 10, max 30
  excludeDomains?: string[] // Default: ['linkedin.com'] - we only use LinkedIn for snippets
}

interface SerpApiOrganicResult {
  position: number
  title?: string
  snippet?: string
  link: string
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[]
}

/**
 * Check if a URL matches any of the excluded domains
 */
function isExcludedDomain(url: string, excludedDomains: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return excludedDomains.some((domain) =>
      hostname === domain.toLowerCase() || hostname.endsWith('.' + domain.toLowerCase())
    )
  } catch {
    return false
  }
}

/**
 * Normalize SerpAPI result to SearchResult
 */
function normalizeResult(result: SerpApiOrganicResult, position: number): SearchResult {
  return {
    title: result.title ?? '',
    snippet: result.snippet ?? '',
    url: result.link,
    position,
  }
}

export const searchProvider = {
  /**
   * Search for contacts using SerpAPI (Google search)
   * Returns raw search results - parsing happens in AI action layer
   */
  search: async (options: SearchOptions): Promise<SearchResult[]> => {
    const apiKey = process.env.SERPAPI_API_KEY
    if (!apiKey) {
      throw new Error('SERPAPI_API_KEY is not configured')
    }

    const query = options.query.trim()
    const numResults = Math.min(options.numResults ?? DEFAULT_NUM_RESULTS, MAX_NUM_RESULTS)
    const excludeDomains = options.excludeDomains ?? [...DEFAULT_EXCLUDED_DOMAINS]

    // Build SerpAPI URL
    const params = new URLSearchParams({
      q: query,
      num: numResults.toString(),
      api_key: apiKey,
      engine: 'google',
    })

    const response = await fetch(`${SERPAPI_BASE_URL}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`)
    }

    const data: SerpApiResponse = await response.json()
    const organicResults = data.organic_results ?? []

    // Filter excluded domains and normalize results
    const filteredResults = organicResults
      .filter((result) => !isExcludedDomain(result.link, excludeDomains))
      .map((result, index) => normalizeResult(result, index + 1))

    return filteredResults
  },

  /**
   * Check if search provider is configured (SERPAPI_API_KEY env var)
   */
  isConfigured: async (): Promise<boolean> => {
    const apiKey = process.env.SERPAPI_API_KEY
    return Boolean(apiKey && apiKey.length > 0)
  },
}
