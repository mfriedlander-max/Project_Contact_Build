/**
 * Contact Mutation Handlers
 * MOVE_STAGE, UPDATE_FIELD, BULK_UPDATE, DELETE_CONTACTS
 */

import {
  MoveStagePayloadSchema,
  UpdateFieldPayloadSchema,
  BulkUpdatePayloadSchema,
  DeleteContactsPayloadSchema,
  type AiActionResult,
} from '../types'
import type { Contact, ContactServiceDeps } from './interfaces'

interface MutationDeps {
  contactService: ContactServiceDeps
}

export async function handleMoveStage(
  payload: unknown,
  _context: { userId: string },
  deps: MutationDeps
): Promise<AiActionResult<Contact>> {
  const parsed = MoveStagePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    const contact = await deps.contactService.moveStage(parsed.data.contactId, parsed.data.newStage)
    return { success: true, data: contact }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move stage',
    }
  }
}

export async function handleUpdateField(
  payload: unknown,
  _context: { userId: string },
  deps: MutationDeps
): Promise<AiActionResult<Contact>> {
  const parsed = UpdateFieldPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    const contact = await deps.contactService.updateField(
      parsed.data.contactId,
      parsed.data.field,
      parsed.data.value
    )
    return { success: true, data: contact }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update field',
    }
  }
}

export async function handleBulkUpdate(
  payload: unknown,
  _context: { userId: string },
  deps: MutationDeps
): Promise<AiActionResult<{ updatedCount: number }>> {
  const parsed = BulkUpdatePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    const updatedCount = await deps.contactService.bulkUpdate(
      parsed.data.contactIds,
      parsed.data.updates
    )
    return { success: true, data: { updatedCount } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk update',
    }
  }
}

export async function handleDeleteContacts(
  payload: unknown,
  _context: { userId: string },
  deps: MutationDeps
): Promise<AiActionResult<{ deletedCount: number }>> {
  const parsed = DeleteContactsPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    const deletedCount = await deps.contactService.deleteContacts(parsed.data.contactIds)
    return { success: true, data: { deletedCount } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete contacts',
    }
  }
}
