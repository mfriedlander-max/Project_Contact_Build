/**
 * FIND_CONTACTS Action Handler
 * Searches for contacts and stages results
 */

import { AiMode, type AiModeType } from '@/lib/types/enums'
import { FindContactsPayloadSchema, type AiActionResult } from '../types'

export interface SearchResult {
  name: string
  company: string
  url: string
  snippet: string
}

export interface StagedContact extends SearchResult {
  id: string
}

export interface SearchProvider {
  search(query: string, maxResults: number): Promise<ReadonlyArray<SearchResult>>
}

export interface StagedContactInput {
  firstName?: string
  lastName: string
  company?: string
  position?: string
  email?: string
  linkedinUrl?: string
  sourceUrl?: string
  relevanceScore?: number
  notes?: string
}

export interface StagingService {
  stageContacts(
    userId: string,
    contacts: ReadonlyArray<SearchResult>
  ): Promise<ReadonlyArray<StagedContact>>
  findExistingContacts?(
    userId: string,
    candidates: ReadonlyArray<StagedContactInput>
  ): Promise<Set<number>>
}

export interface FindContactsContext {
  userId: string
  currentMode: AiModeType
}

interface FindContactsDeps {
  searchProvider: SearchProvider
  stagingService: StagingService
}

export async function handleFindContacts(
  payload: unknown,
  context: FindContactsContext,
  deps: FindContactsDeps
): Promise<AiActionResult<ReadonlyArray<StagedContact>>> {
  if (context.currentMode !== AiMode.CONTACT_FINDER) {
    return {
      success: false,
      error: `FIND_CONTACTS requires CONTACT_FINDER mode, current: ${context.currentMode}`,
    }
  }

  const parsed = FindContactsPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  const { query, maxResults } = parsed.data
  const targetCount = Math.min(maxResults, 30) // Hard limit of 30

  try {
    // Smart Backfill: Search and filter duplicates iteratively
    const uniqueContacts: SearchResult[] = []
    const MAX_ITERATIONS = 3
    let iteration = 0

    while (uniqueContacts.length < targetCount && iteration < MAX_ITERATIONS) {
      iteration++
      const needed = targetCount - uniqueContacts.length

      // Search for contacts
      const results = await deps.searchProvider.search(query, needed)

      if (results.length === 0) {
        // No more results available
        break
      }

      // Filter duplicates if the method is available
      if (deps.stagingService.findExistingContacts) {
        // Convert SearchResult to StagedContactInput for duplicate checking
        const candidates: StagedContactInput[] = results.map(convertToStagedContactInput)

        const duplicateIndices = await deps.stagingService.findExistingContacts(
          context.userId,
          candidates
        )

        // Add only non-duplicates
        results.forEach((result, index) => {
          if (!duplicateIndices.has(index)) {
            uniqueContacts.push(result)
          }
        })
      } else {
        // Fallback: no duplicate detection available, add all results
        uniqueContacts.push(...results)
      }

      // Stop if we got fewer results than requested (search exhausted)
      if (results.length < needed) {
        break
      }
    }

    // Stage all unique contacts collected
    const staged = await deps.stagingService.stageContacts(context.userId, uniqueContacts)

    return {
      success: true,
      data: staged,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    }
  }
}

/**
 * Convert SearchResult to StagedContactInput for duplicate detection
 */
function convertToStagedContactInput(result: SearchResult): StagedContactInput {
  // Parse name into firstName and lastName
  const nameParts = result.name.trim().split(/\s+/)
  const lastName = nameParts.pop() || result.name
  const firstName = nameParts.join(' ') || undefined

  // Check if URL is a LinkedIn URL
  const linkedinUrl = result.url.includes('linkedin.com') ? result.url : undefined

  return {
    firstName,
    lastName,
    company: result.company || undefined,
    linkedinUrl,
    sourceUrl: result.url,
    notes: result.snippet || undefined,
  }
}
