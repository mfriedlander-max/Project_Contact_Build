/**
 * SHOW_STAGED_RESULTS Action Handler
 * Returns the user's current staged contact list
 */

import type { AiActionResult } from '../types'
import type { StagingServiceDeps } from './interfaces'
import type { StagedContact } from './findContacts'

interface ShowStagedResultsDeps {
  stagingService: StagingServiceDeps
}

export async function handleShowStagedResults(
  _payload: unknown,
  context: { userId: string },
  deps: ShowStagedResultsDeps
): Promise<AiActionResult<ReadonlyArray<StagedContact>>> {
  try {
    const staged = await deps.stagingService.getStagedList(context.userId)
    return {
      success: true,
      data: staged,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get staged results',
    }
  }
}
