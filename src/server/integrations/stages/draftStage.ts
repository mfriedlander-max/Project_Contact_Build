/**
 * Draft Stage
 * Composes emails from template + insert + availability and creates Gmail drafts
 */

import { gmailService } from '../gmailService'
import type { Contact, ProgressCallback, DraftStageResult } from './types'
import { sanitizeForEmail, sanitizeErrorMessage, safeProgress } from './types'

export type { DraftStageResult }

export interface TemplateInput {
  subject: string
  body: string
}

function replaceContactPlaceholders(text: string, contact: Contact): string {
  return text
    .replace(/\{\{first_name\}\}/g, sanitizeForEmail(contact.first_name ?? ''))
    .replace(/\{\{last_name\}\}/g, sanitizeForEmail(contact.last_name))
    .replace(/\{\{company\}\}/g, sanitizeForEmail(contact.company ?? ''))
}

function composeEmail(
  template: TemplateInput,
  contact: Contact,
  availabilityBlock: string
): { subject: string; body: string } {
  const insert = sanitizeForEmail(contact.personalized_insert ?? '')
  const availability = sanitizeForEmail(availabilityBlock)

  const subject = replaceContactPlaceholders(template.subject, contact)

  const body = replaceContactPlaceholders(template.body, contact)
    .replace(/\{\{insert\}\}/g, insert)
    .replace(/\{\{availability\}\}/g, availability)

  return { subject, body }
}

/**
 * Create Gmail drafts for a batch of contacts using a template.
 * Returns a new contacts array with email_status set to DRAFTED (immutable).
 *
 * Contacts without email or personalized_insert are skipped.
 */
export async function executeDraftStage(
  contacts: ReadonlyArray<Contact>,
  template: TemplateInput,
  availabilityBlock: string,
  userId: string,
  onProgress?: ProgressCallback
): Promise<DraftStageResult> {
  let drafted = 0
  let skipped = 0
  const errors: DraftStageResult['errors'] = []
  const updatedContacts: Contact[] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]

    if (!contact.email || !contact.personalized_insert) {
      skipped++
      updatedContacts.push(contact)
      safeProgress(onProgress, i + 1, contacts.length)
      continue
    }

    try {
      const composed = composeEmail(template, contact, availabilityBlock)

      await gmailService.createDraft(userId, {
        to: contact.email,
        subject: composed.subject,
        body: composed.body,
        labelNames: [],
      })

      updatedContacts.push({
        ...contact,
        email_status: 'DRAFTED',
      })
      drafted++
    } catch (error) {
      errors.push({ contactId: contact.id, error: sanitizeErrorMessage(error) })
      updatedContacts.push(contact)
    }

    safeProgress(onProgress, i + 1, contacts.length)
  }

  return { contacts: updatedContacts, drafted, skipped, errors }
}
