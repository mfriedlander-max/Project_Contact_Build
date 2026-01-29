/**
 * Hunter.io Service
 * Email finding integration
 *
 * Extends existing lib/hunter.ts
 */

import { prismadb } from '@/lib/prisma'
import { mapScoreToConfidence } from '@/lib/hunter'
import { z } from 'zod'

export interface EmailFindResult {
  email: string | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null
  sources: string[]
}

export interface EmailVerifyResult {
  status: string
  score: number
  email: string
}

export interface EmailFindOptions {
  firstName: string
  lastName: string
  company: string
  domain?: string
}

const HUNTER_API_BASE_URL = 'https://api.hunter.io/v2'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url)

    if (response.status === 429) {
      if (attempt < retries) {
        await delay(BASE_DELAY_MS * Math.pow(2, attempt))
        continue
      }
      throw new Error('Hunter API rate limit exceeded after retries')
    }

    return response
  }

  throw new Error('Hunter API rate limit exceeded after retries')
}

const hunterFindResponseSchema = z.object({
  data: z.object({
    email: z.string().nullable(),
    score: z.number(),
    sources: z.array(z.object({ domain: z.string() })).optional().default([]),
  }),
})

const hunterVerifyResponseSchema = z.object({
  data: z.object({
    status: z.string(),
    score: z.number(),
    email: z.string(),
  }),
})

async function getHunterApiKey(userId: string): Promise<string> {
  const integration = await prismadb.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider: 'HUNTER' } },
  })

  if (!integration || !integration.accessToken) {
    throw new Error('Hunter integration not configured')
  }

  return integration.accessToken
}

export const hunterService = {
  async isConfigured(userId: string): Promise<boolean> {
    try {
      const integration = await prismadb.integrationConnection.findUnique({
        where: { userId_provider: { userId, provider: 'HUNTER' } },
      })
      return Boolean(integration?.accessToken && integration.isActive)
    } catch {
      return false
    }
  },

  async findEmail(
    userId: string,
    options: EmailFindOptions
  ): Promise<EmailFindResult> {
    const apiKey = await getHunterApiKey(userId)

    const domain = options.domain ?? (await hunterService.inferDomain(options.company))
    if (!domain) {
      return { email: null, confidence: null, sources: [] }
    }

    const searchParams = new URLSearchParams({
      domain,
      first_name: options.firstName,
      last_name: options.lastName,
      api_key: apiKey,
    })

    const response = await fetchWithRetry(
      `${HUNTER_API_BASE_URL}/email-finder?${searchParams.toString()}`
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.errors?.[0]?.details || `HTTP ${response.status}`
      throw new Error(`Hunter API error: ${errorMessage}`)
    }

    const raw = await response.json()
    const parsed = hunterFindResponseSchema.safeParse(raw)

    if (!parsed.success) {
      throw new Error('Invalid response from Hunter email-finder API')
    }

    const { email, score, sources } = parsed.data.data

    return {
      email,
      confidence: email ? mapScoreToConfidence(score) : null,
      sources: sources.map((s) => s.domain),
    }
  },

  async verifyEmail(
    userId: string,
    email: string
  ): Promise<EmailVerifyResult> {
    const apiKey = await getHunterApiKey(userId)

    const searchParams = new URLSearchParams({
      email,
      api_key: apiKey,
    })

    const response = await fetchWithRetry(
      `${HUNTER_API_BASE_URL}/email-verifier?${searchParams.toString()}`
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.errors?.[0]?.details || `HTTP ${response.status}`
      throw new Error(`Hunter API error: ${errorMessage}`)
    }

    const raw = await response.json()
    const parsed = hunterVerifyResponseSchema.safeParse(raw)

    if (!parsed.success) {
      throw new Error('Invalid response from Hunter verification API')
    }

    return parsed.data.data
  },

  async inferDomain(company: string): Promise<string | null> {
    const cleaned = company
      .toLowerCase()
      .replace(/\b(inc|corp|llc|ltd|co|company|group)\b/gi, '')
      .trim()
      .replace(/\s+/g, '')

    if (!cleaned) {
      return null
    }

    return `${cleaned}.com`
  },
}
