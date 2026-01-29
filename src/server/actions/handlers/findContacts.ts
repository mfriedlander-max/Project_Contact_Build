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

export interface StagingService {
  stageContacts(
    userId: string,
    contacts: ReadonlyArray<SearchResult>
  ): Promise<ReadonlyArray<StagedContact>>
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

  try {
    const results = await deps.searchProvider.search(query, maxResults)
    const staged = await deps.stagingService.stageContacts(context.userId, results)

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
