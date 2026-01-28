/**
 * Gmail Sync - Reply Detection
 * Polls Gmail for replies to sent messages by checking thread message counts
 */

import type { Contact, ReplyCheckResult } from './types'

export type { ReplyCheckResult }

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

interface ThreadResponse {
  id: string
  messages: Array<{ id: string }>
}

export async function fetchThreadMessageCount(
  accessToken: string,
  threadId: string
): Promise<number> {
  const response = await fetch(`${GMAIL_API_BASE}/threads/${threadId}?format=minimal`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Gmail API error: HTTP ${response.status}`)
  }

  const data: ThreadResponse = await response.json()
  return data.messages.length
}

export async function checkForReplies(
  accessToken: string,
  contacts: Contact[]
): Promise<ReplyCheckResult> {
  let repliesFound = 0
  let checked = 0
  const errors: ReplyCheckResult['errors'] = []

  for (const contact of contacts) {
    if (!contact.email || contact.email_status !== 'SENT') {
      continue
    }

    const threadId = contact.custom_fields?.gmail_thread_id
    if (typeof threadId !== 'string') {
      continue
    }

    checked++

    try {
      const messageCount = await fetchThreadMessageCount(accessToken, threadId)

      if (messageCount > 1) {
        contact.connection_level = 'CONNECTED'
        repliesFound++
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ contactId: contact.id, error: message })
    }
  }

  return { repliesFound, checked, errors }
}
