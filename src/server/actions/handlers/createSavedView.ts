/**
 * CREATE_SAVED_VIEW Action Handler
 * Creates a saved view with name, filters, and optional sort
 */

import { CreateSavedViewPayloadSchema, type AiActionResult } from '../types'
import type { SavedView, SavedViewServiceDeps } from './interfaces'

interface CreateSavedViewDeps {
  savedViewService: SavedViewServiceDeps
}

export async function handleCreateSavedView(
  payload: unknown,
  context: { userId: string },
  deps: CreateSavedViewDeps
): Promise<AiActionResult<SavedView>> {
  const parsed = CreateSavedViewPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    const view = await deps.savedViewService.create(context.userId, {
      name: parsed.data.name,
      filters: parsed.data.filters,
      sort: parsed.data.sort,
    })
    return { success: true, data: view }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create saved view',
    }
  }
}
