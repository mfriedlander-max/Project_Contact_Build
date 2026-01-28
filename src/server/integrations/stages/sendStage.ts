/**
 * Send Stage
 * Sends Gmail drafts for contacts that have been drafted
 */

import { gmailService } from '../gmailService'
import type { Contact, ProgressCallback, SendStageResult } from './types'

export type { SendStageResult }

function getDraftId(contact: Contact): string | undefined {
  const draftId = contact.custom_fields?.gmail_draft_id
  return typeof draftId === 'string' ? draftId : undefined
}

export async function executeSendStage(
  contacts: Contact[],
  userId: string,
  onProgress?: ProgressCallback
): Promise<SendStageResult> {
  let sent = 0
  let skipped = 0
  const errors: SendStageResult['errors'] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    const draftId = getDraftId(contact)

    if (!draftId) {
      skipped++
      onProgress?.(i + 1, contacts.length)
      continue
    }

    try {
      await gmailService.sendDraft(userId, { draftId })

      contact.email_status = 'SENT'
      contact.connection_level = 'MESSAGE_SENT'
      contact.sent_at = new Date()
      sent++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ contactId: contact.id, error: message })
    }

    onProgress?.(i + 1, contacts.length)
  }

  return { sent, skipped, errors }
}
