/**
 * Send Stage
 * Sends Gmail drafts for contacts that have been drafted
 */

import { gmailService } from '../gmailService'
import type { Contact, ProgressCallback, SendStageResult } from './types'
import { sanitizeErrorMessage, safeProgress } from './types'

export type { SendStageResult }

function getDraftId(contact: Contact): string | undefined {
  const draftId = contact.custom_fields?.gmail_draft_id
  return typeof draftId === 'string' ? draftId : undefined
}

/**
 * Send Gmail drafts for a batch of contacts.
 * Returns a new contacts array with status updated to SENT (immutable).
 *
 * Contacts without a gmail_draft_id in custom_fields are skipped.
 */
export async function executeSendStage(
  contacts: ReadonlyArray<Contact>,
  userId: string,
  onProgress?: ProgressCallback
): Promise<SendStageResult> {
  let sent = 0
  let skipped = 0
  const errors: SendStageResult['errors'] = []
  const updatedContacts: Contact[] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    const draftId = getDraftId(contact)

    if (!draftId) {
      skipped++
      updatedContacts.push(contact)
      safeProgress(onProgress, i + 1, contacts.length)
      continue
    }

    try {
      await gmailService.sendDraft(userId, { draftId })

      updatedContacts.push({
        ...contact,
        email_status: 'SENT',
        connection_level: 'MESSAGE_SENT',
        sent_at: new Date(),
      })
      sent++
    } catch (error) {
      errors.push({ contactId: contact.id, error: sanitizeErrorMessage(error) })
      updatedContacts.push(contact)
    }

    safeProgress(onProgress, i + 1, contacts.length)
  }

  return { contacts: updatedContacts, sent, skipped, errors }
}
