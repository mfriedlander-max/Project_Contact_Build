/**
 * Gmail Sync - Reply Detection
 * Polls Gmail for replies to sent messages by checking thread message counts
 */

import type { Contact, ReplyCheckResult } from './types'
import { sanitizeErrorMessage } from './types'

export type { ReplyCheckResult }

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const MIN_TOKEN_LENGTH = 20

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

/**
 * Check Gmail threads for replies to sent messages.
 * Returns a new contacts array with connection_level updated to CONNECTED
 * for contacts that received replies (immutable).
 *
 * Only checks contacts in SENT status with a gmail_thread_id.
 *
 * @param accessToken - Valid Gmail OAuth2 access token (min 20 chars)
 * @param contacts - Contacts to check for replies
 */
export async function checkForReplies(
  accessToken: string,
  contacts: ReadonlyArray<Contact>
): Promise<ReplyCheckResult> {
  if (accessToken.length < MIN_TOKEN_LENGTH) {
    throw new Error('Invalid access token format')
  }

  let repliesFound = 0
  let checked = 0
  const errors: ReplyCheckResult['errors'] = []
  const updatedContacts: Contact[] = []

  for (const contact of contacts) {
    if (!contact.email || contact.email_status !== 'SENT') {
      updatedContacts.push(contact)
      continue
    }

    const threadId = contact.custom_fields?.gmail_thread_id
    if (typeof threadId !== 'string') {
      updatedContacts.push(contact)
      continue
    }

    checked++

    try {
      const messageCount = await fetchThreadMessageCount(accessToken, threadId)

      if (messageCount > 1) {
        updatedContacts.push({
          ...contact,
          connection_level: 'CONNECTED',
        })
        repliesFound++
      } else {
        updatedContacts.push(contact)
      }
    } catch (error) {
      errors.push({ contactId: contact.id, error: sanitizeErrorMessage(error) })
      updatedContacts.push(contact)
    }
  }

  return { contacts: updatedContacts, repliesFound, checked, errors }
}
