/**
 * Email Finding Stage
 * Finds emails for contacts using Hunter.io
 */

import { hunterService } from '../hunterService'
import type { Contact, ProgressCallback, EmailFindingStageResult } from './types'

export type { EmailFindingStageResult }

export async function executeEmailFindingStage(
  contacts: Contact[],
  userId: string,
  onProgress?: ProgressCallback
): Promise<EmailFindingStageResult> {
  let found = 0
  let notFound = 0
  const errors: EmailFindingStageResult['errors'] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]

    if (!contact.company) {
      notFound++
      onProgress?.(i + 1, contacts.length)
      continue
    }

    try {
      const result = await hunterService.findEmail(userId, {
        firstName: contact.first_name ?? '',
        lastName: contact.last_name,
        company: contact.company,
      })

      if (result.email) {
        contact.email = result.email
        contact.email_confidence = result.confidence ?? undefined
        found++
      } else {
        notFound++
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ contactId: contact.id, error: message })
    }

    onProgress?.(i + 1, contacts.length)
  }

  return { found, notFound, errors }
}
