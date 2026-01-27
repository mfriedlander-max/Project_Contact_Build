import { z } from 'zod'

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1'

export interface GmailSearchResult {
  found: boolean
  sentAt: Date | null
  messageId: string | null
}

export interface GmailRateLimitError extends Error {
  status: number
}

// Zod schema for validating Gmail messages list response
const gmailMessagesListSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    threadId: z.string(),
  })).optional(),
  resultSizeEstimate: z.number().optional(),
})

// Zod schema for validating Gmail message details response
const gmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  internalDate: z.string(),
  payload: z.object({
    headers: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional(),
  }).optional(),
})

/**
 * Creates a rate limit error with proper status code
 */
function createRateLimitError(message: string): GmailRateLimitError {
  const error = new Error(message) as GmailRateLimitError
  error.status = 429
  return error
}

/**
 * Searches for sent emails to a specific recipient in the user's Gmail sent folder.
 * Uses Gmail API to query sent messages.
 *
 * @param accessToken - The OAuth2 access token for Gmail API
 * @param recipientEmail - The email address to search for in sent messages
 * @returns GmailSearchResult indicating if an email was found and when it was sent
 * @throws Error if the API request fails
 * @throws GmailRateLimitError if rate limit is exceeded (status 429)
 */
export async function searchSentEmails(
  accessToken: string,
  recipientEmail: string
): Promise<GmailSearchResult> {
  // Build the search query: search in sent messages for emails to the recipient
  const query = `from:me to:${recipientEmail} in:sent`

  const searchParams = new URLSearchParams({
    q: query,
    maxResults: '1', // We only need to find one email
  })

  const listUrl = `${GMAIL_API_BASE_URL}/users/me/messages?${searchParams.toString()}`

  const listResponse = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  // Handle rate limiting
  if (listResponse.status === 429) {
    throw createRateLimitError('Gmail API rate limit exceeded. Please try again later.')
  }

  if (!listResponse.ok) {
    const errorData = await listResponse.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || `HTTP ${listResponse.status}`
    throw new Error(`Gmail API error: ${errorMessage}`)
  }

  const listData = await listResponse.json()
  const parsedList = gmailMessagesListSchema.safeParse(listData)

  if (!parsedList.success) {
    throw new Error('Invalid response from Gmail API')
  }

  // If no messages found, return not found
  if (!parsedList.data.messages || parsedList.data.messages.length === 0) {
    return {
      found: false,
      sentAt: null,
      messageId: null,
    }
  }

  // Get the first (most recent) message details to get the sent date
  const messageId = parsedList.data.messages[0].id
  const messageUrl = `${GMAIL_API_BASE_URL}/users/me/messages/${messageId}?format=metadata&metadataHeaders=Date`

  const messageResponse = await fetch(messageUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  // Handle rate limiting on message fetch
  if (messageResponse.status === 429) {
    throw createRateLimitError('Gmail API rate limit exceeded. Please try again later.')
  }

  if (!messageResponse.ok) {
    const errorData = await messageResponse.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || `HTTP ${messageResponse.status}`
    throw new Error(`Gmail API error: ${errorMessage}`)
  }

  const messageData = await messageResponse.json()
  const parsedMessage = gmailMessageSchema.safeParse(messageData)

  if (!parsedMessage.success) {
    throw new Error('Invalid message response from Gmail API')
  }

  // Extract the sent date from the internal date (milliseconds since epoch)
  const internalDate = parseInt(parsedMessage.data.internalDate, 10)
  const sentAt = new Date(internalDate)

  return {
    found: true,
    sentAt,
    messageId,
  }
}

/**
 * Validates that an access token has Gmail read scope.
 * This is a lightweight check that just verifies the token works.
 *
 * @param accessToken - The OAuth2 access token to validate
 * @returns true if the token is valid for Gmail access
 */
export async function validateGmailAccess(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    return response.ok
  } catch {
    return false
  }
}
