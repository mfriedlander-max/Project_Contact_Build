/**
 * Email Finding Stage
 * Finds emails for contacts using Hunter.io
 */

import { hunterService } from '../hunterService'
import type { Contact, ProgressCallback, EmailFindingStageResult } from './types'
import { sanitizeErrorMessage, safeProgress } from './types'

export type { EmailFindingStageResult }

/**
 * Find email addresses for a batch of contacts via Hunter.io.
 * Returns a new contacts array with email fields populated (immutable).
 *
 * Contacts without a company are skipped. Per-contact errors are
 * collected without failing the batch.
 */
export async function executeEmailFindingStage(
  contacts: ReadonlyArray<Contact>,
  userId: string,
  onProgress?: ProgressCallback
): Promise<EmailFindingStageResult> {
  let found = 0
  let notFound = 0
  const errors: EmailFindingStageResult['errors'] = []
  const updatedContacts: Contact[] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]

    if (!contact.company) {
      notFound++
      updatedContacts.push(contact)
      safeProgress(onProgress, i + 1, contacts.length)
      continue
    }

    try {
      const result = await hunterService.findEmail(userId, {
        firstName: contact.first_name ?? '',
        lastName: contact.last_name,
        company: contact.company,
      })

      if (result.email) {
        updatedContacts.push({
          ...contact,
          email: result.email,
          email_confidence: result.confidence ?? undefined,
        })
        found++
      } else {
        updatedContacts.push(contact)
        notFound++
      }
    } catch (error) {
      errors.push({ contactId: contact.id, error: sanitizeErrorMessage(error) })
      updatedContacts.push(contact)
    }

    safeProgress(onProgress, i + 1, contacts.length)
  }

  return { contacts: updatedContacts, found, notFound, errors }
}
