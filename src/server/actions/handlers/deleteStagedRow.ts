/**
 * DELETE_STAGED_ROW Action Handler
 * Removes a single contact from the staging list
 */

import { DeleteStagedRowPayloadSchema, type AiActionResult } from '../types'
import type { StagingServiceDeps } from './interfaces'

interface DeleteStagedRowDeps {
  stagingService: StagingServiceDeps
}

export async function handleDeleteStagedRow(
  payload: unknown,
  context: { userId: string },
  deps: DeleteStagedRowDeps
): Promise<AiActionResult> {
  const parsed = DeleteStagedRowPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    await deps.stagingService.deleteStagedRow(context.userId, parsed.data.stagedContactId)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete staged row',
    }
  }
}
