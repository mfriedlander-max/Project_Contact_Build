/**
 * QUERY_CONTACTS Action Handler
 * Queries contacts with filters
 */

import { QueryContactsPayloadSchema, type AiActionResult } from '../types'
import type { Contact, ContactServiceDeps } from './interfaces'

interface QueryContactsDeps {
  contactService: ContactServiceDeps
}

export async function handleQueryContacts(
  payload: unknown,
  context: { userId: string },
  deps: QueryContactsDeps
): Promise<AiActionResult<ReadonlyArray<Contact>>> {
  const parsed = QueryContactsPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    const contacts = await deps.contactService.query(context.userId, parsed.data.filters)
    return {
      success: true,
      data: contacts,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query contacts',
    }
  }
}
