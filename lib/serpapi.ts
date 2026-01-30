import { z } from 'zod'

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json'

export interface SerpApiSearchResult {
  name: string
  company: string
  url: string
  snippet: string
}

const serpApiResponseSchema = z.object({
  organic_results: z.array(z.object({
    title: z.string(),
    link: z.string(),
    snippet: z.string().optional(),
  })).optional().default([]),
})

export function parseNameAndCompany(title: string): { name: string; company: string } {
  const cleaned = title.replace(/\s*\|[^|]*$/, '').trim()

  const atMatch = cleaned.match(/^(.+?)\s*[-–]\s*.+?\bat\b\s+(.+)$/i)
  if (atMatch) {
    return { name: atMatch[1].trim(), company: atMatch[2].trim() }
  }

  const dashMatch = cleaned.match(/^(.+?)\s*[-–]\s*(.+)$/)
  if (dashMatch) {
    return { name: dashMatch[1].trim(), company: dashMatch[2].trim() }
  }

  return { name: cleaned, company: '' }
}

export async function searchContacts(
  query: string,
  maxResults: number = 10
): Promise<ReadonlyArray<SerpApiSearchResult>> {
  const apiKey = process.env.SERPAPI_API_KEY

  if (!apiKey) {
    throw new Error('SerpAPI key is not configured')
  }

  const searchParams = new URLSearchParams({
    q: query,
    api_key: apiKey,
    engine: 'google',
    num: String(Math.min(maxResults, 30)),
  })

  const response = await fetch(`${SERPAPI_BASE_URL}?${searchParams.toString()}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `HTTP ${response.status}`
    throw new Error(`SerpAPI error: ${errorMessage}`)
  }

  const data = await response.json()
  const parsed = serpApiResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error('Invalid response from SerpAPI')
  }

  return parsed.data.organic_results
    .slice(0, maxResults)
    .map((result) => {
      const { name, company } = parseNameAndCompany(result.title)
      return {
        name,
        company,
        url: result.link,
        snippet: result.snippet ?? '',
      }
    })
}
