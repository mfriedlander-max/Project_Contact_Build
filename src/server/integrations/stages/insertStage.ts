/**
 * Insert Stage
 * Fetches page content and generates personalized inserts using AI
 */

import { pageFetcher } from '../pageFetcher'
import { generateInsert } from '../insertGenerator'
import type { Contact, ProgressCallback, InsertStageResult } from './types'

export type { InsertStageResult }

export async function executeInsertStage(
  contacts: Contact[],
  onProgress?: ProgressCallback
): Promise<InsertStageResult> {
  let generated = 0
  let skipped = 0
  const errors: InsertStageResult['errors'] = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]

    if (!contact.website) {
      skipped++
      onProgress?.(i + 1, contacts.length)
      continue
    }

    try {
      const pages = await pageFetcher.fetchPages({ urls: [contact.website] })

      if (pages.length === 0) {
        skipped++
        onProgress?.(i + 1, contacts.length)
        continue
      }

      const result = await generateInsert(
        {
          firstName: contact.first_name ?? '',
          lastName: contact.last_name,
          company: contact.company ?? '',
        },
        pages[0].text
      )

      contact.personalized_insert = result.insert
      contact.insert_confidence = result.confidence
      generated++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ contactId: contact.id, error: message })
    }

    onProgress?.(i + 1, contacts.length)
  }

  return { generated, skipped, errors }
}
