/**
 * Safe Page Fetcher
 * Fetches and extracts text from non-LinkedIn URLs
 * Used for generating personalized inserts
 */

const BLOCKED_DOMAINS = ['linkedin.com', 'www.linkedin.com'] as const
const ALLOWED_PROTOCOLS = ['http:', 'https:'] as const
const DEFAULT_MAX_PAGES = 3
const DEFAULT_TIMEOUT_MS = 10000
const MAX_TEXT_LENGTH = 5000
const USER_AGENT = 'StudentNetworkingCRM/1.0 (PageFetcher)'

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

/**
 * Strip HTML tags and extract readable text.
 * Removes script/style content, then strips remaining tags.
 */
function extractText(html: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''

  // Remove script and style blocks entirely
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')

  // Strip remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return {
    title,
    text: cleaned.slice(0, MAX_TEXT_LENGTH),
  }
}

export const pageFetcher = {
  /**
   * Fetch and extract text from URLs
   * Skips LinkedIn URLs (we only use LinkedIn for snippets, not scraping)
   */
  fetchPages: async (options: FetchOptions): Promise<FetchedPage[]> => {
    const maxPages = options.maxPagesPerContact ?? DEFAULT_MAX_PAGES
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

    // Filter to safe URLs only
    const safeUrls = options.urls.filter((url) => pageFetcher.isSafeUrl(url))

    // Limit to maxPages
    const urlsToFetch = safeUrls.slice(0, maxPages)

    const results: FetchedPage[] = []

    for (const url of urlsToFetch) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': USER_AGENT,
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          continue
        }

        const html = await response.text()
        const { title, text } = extractText(html)

        results.push({
          url,
          title,
          text,
          fetchedAt: new Date(),
        })
      } catch {
        // Skip failed URLs gracefully
        continue
      }
    }

    return results
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
