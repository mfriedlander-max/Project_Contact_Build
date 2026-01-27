import { z } from 'zod'

const HUNTER_API_BASE_URL = 'https://api.hunter.io/v2'

export type EmailConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface HunterEmailFinderResult {
  email: string
  score: number
  confidence: EmailConfidence
}

export interface HunterEmailFinderParams {
  firstName: string
  lastName: string
  domain: string
}

// Zod schema for validating Hunter API response
const hunterResponseSchema = z.object({
  data: z.object({
    email: z.string().nullable(),
    score: z.number(),
  }),
})

/**
 * Maps Hunter.io score (0-100) to confidence level
 * - 90+ = HIGH
 * - 70-89 = MEDIUM
 * - <70 = LOW
 */
export function mapScoreToConfidence(score: number): EmailConfidence {
  if (score >= 90) {
    return 'HIGH'
  }
  if (score >= 70) {
    return 'MEDIUM'
  }
  return 'LOW'
}

/**
 * Finds an email address using the Hunter.io Email Finder API
 * @throws Error if API key is not configured
 * @throws Error if the API request fails
 * @throws Error if no email is found
 */
export async function findEmail(
  params: HunterEmailFinderParams
): Promise<HunterEmailFinderResult> {
  const apiKey = process.env.HUNTER_API_KEY

  if (!apiKey) {
    throw new Error('Hunter API key is not configured')
  }

  const searchParams = new URLSearchParams({
    domain: params.domain,
    first_name: params.firstName,
    last_name: params.lastName,
    api_key: apiKey,
  })

  const url = `${HUNTER_API_BASE_URL}/email-finder?${searchParams.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage =
      errorData.errors?.[0]?.details || `HTTP ${response.status}`
    throw new Error(`Hunter API error: ${errorMessage}`)
  }

  const data = await response.json()
  const parsed = hunterResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error('Invalid response from Hunter API')
  }

  const { email, score } = parsed.data.data

  if (!email) {
    throw new Error('No email found for the given name and company')
  }

  return {
    email,
    score,
    confidence: mapScoreToConfidence(score),
  }
}
