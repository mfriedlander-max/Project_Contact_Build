/**
 * Draft Stage
 * Composes emails from template + insert + availability and creates Gmail drafts
 */

import { gmailService } from '../gmailService'
import type { Contact, ProgressCallback, DraftStageResult } from './types'

export type { DraftStageResult }

export interface TemplateInput {
  subject: string
  body: string
}

function composeEmail(
  template: TemplateInput,
  contact: Contact,
  availabilityBlock: string
): { subject: string; body: string } {
  const firstName = contact.first_name ?? ''
  const insert = contact.personalized_insert ?? ''

  const subject = template.subject
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_name\}\}/g, contact.last_name)
    .replace(/\{\{company\}\}/g, contact.company ?? '')

  const body = template.body
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_name\}\}/g, contact.last_name)
    .replace(/\{\{company\}\}/g, contact.company ?? '')
    .replace(/\{\{insert\}\}/g, insert)
    .replace(/\{\{availability\}\}/g, availabilityBlock)

  return { subject, body }
}

export async function executeDraftStage(
  contacts: Contact[],
  template: TemplateInput,
  availabilityBlock: string,
  userId: string,
  onProgress?: ProgressCallback
): Promise<DraftStageResult> {
  let drafted = 0
  let skipped = 0
  const errors: DraftStageResult['errors'] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]

    if (!contact.email || !contact.personalized_insert) {
      skipped++
      onProgress?.(i + 1, contacts.length)
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

      contact.email_status = 'DRAFTED'
      drafted++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ contactId: contact.id, error: message })
    }

    onProgress?.(i + 1, contacts.length)
  }

  return { drafted, skipped, errors }
}
