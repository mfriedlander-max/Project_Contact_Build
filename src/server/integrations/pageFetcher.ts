/**
 * Safe Page Fetcher
 * Fetches and extracts text from non-LinkedIn URLs
 * Used for generating personalized inserts
 *
 * Implementation in Phase 2 (Task 22)
 */

const BLOCKED_DOMAINS = ['linkedin.com', 'www.linkedin.com'] as const
const ALLOWED_PROTOCOLS = ['http:', 'https:'] as const

export interface FetchedPage {
  url: string
  title: string
  text: string // Extracted readable text
  fetchedAt: Date
}

export interface FetchOptions {
  urls: string[]
  maxPagesPerContact?: number // Default 3
  timeoutMs?: number // Default 10000
}

export const pageFetcher = {
  /**
   * Fetch and extract text from URLs
   * Skips LinkedIn URLs (we only use LinkedIn for snippets, not scraping)
   */
  fetchPages: async (_options: FetchOptions): Promise<FetchedPage[]> => {
    // TODO: Implement
    // - Filter out linkedin.com URLs
    // - Fetch with timeout
    // - Extract readable text (consider using @mozilla/readability)
    // - Return extracted content
    throw new Error('Page fetcher not implemented - Phase 2')
  },

  /**
   * Check if a URL is safe to fetch (not LinkedIn, not blocked)
   * Only allows http and https protocols
   */
  isSafeUrl: (url: string): boolean => {
    try {
      const parsedUrl = new URL(url)
      // Only allow http/https protocols
      if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol as typeof ALLOWED_PROTOCOLS[number])) {
        return false
      }
      const hostname = parsedUrl.hostname.toLowerCase()
      return !BLOCKED_DOMAINS.some((blocked) => hostname.includes(blocked))
    } catch {
      return false
    }
  },
}
