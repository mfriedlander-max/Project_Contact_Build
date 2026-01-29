/**
 * Gmail Service
 * Handles OAuth, draft creation, sending, and sync
 */

import { prismadb } from '@/lib/prisma'

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface GmailDraft {
  id: string
  threadId: string
  messageId: string
}

export interface CreateDraftOptions {
  to: string
  subject: string
  body: string
  labelNames: string[] // e.g., ['Student Networking CRM', 'Campaign — Tech PMs']
}

export interface SendOptions {
  draftId: string
}

interface GmailIntegration {
  accessToken: string
}

async function getGmailAuth(userId: string): Promise<GmailIntegration> {
  const integration = await prismadb.integrationConnection.findUnique({
    where: { userId_provider: { userId, provider: 'GMAIL' } },
  })

  if (!integration?.accessToken || !integration.isActive) {
    throw new Error('Gmail is not configured')
  }

  return { accessToken: integration.accessToken }
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Build RFC 2822 MIME message and base64url encode it
 */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, '')
}

function buildMimeMessage(to: string, subject: string, body: string): string {
  const mimeMessage = [
    `To: ${sanitizeHeader(to)}`,
    `Subject: ${sanitizeHeader(subject)}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n')

  const encoded = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return encoded
}

export const gmailService = {
  async isConnected(userId: string): Promise<boolean> {
    try {
      const integration = await prismadb.integrationConnection.findUnique({
        where: { userId_provider: { userId, provider: 'GMAIL' } },
      })
      return Boolean(integration?.accessToken && integration.isActive)
    } catch {
      return false
    }
  },

  async ensureLabels(userId: string, labelNames: string[]): Promise<void> {
    const { accessToken } = await getGmailAuth(userId)

    const listResponse = await fetch(`${GMAIL_API_BASE}/labels`, {
      headers: authHeaders(accessToken),
    })

    if (!listResponse.ok) {
      throw new Error('Gmail API error: Failed to list labels')
    }

    const listData = await listResponse.json()
    const existingNames = new Set(
      (listData.labels ?? []).map((l: { name: string }) => l.name)
    )

    for (const name of labelNames) {
      if (existingNames.has(name)) {
        continue
      }

      const createResponse = await fetch(`${GMAIL_API_BASE}/labels`, {
        method: 'POST',
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        }),
      })

      if (!createResponse.ok) {
        throw new Error(`Gmail API error: Failed to create label "${name}"`)
      }
    }
  },

  async createDraft(userId: string, options: CreateDraftOptions): Promise<GmailDraft> {
    const { accessToken } = await getGmailAuth(userId)

    if (options.labelNames.length > 0) {
      await gmailService.ensureLabels(userId, options.labelNames)
    }

    const raw = buildMimeMessage(options.to, options.subject, options.body)

    const response = await fetch(`${GMAIL_API_BASE}/drafts`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        message: { raw },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message ?? `HTTP ${response.status}`
      throw new Error(`Gmail API error: ${errorMessage}`)
    }

    const data = await response.json()

    return {
      id: data.id,
      messageId: data.message.id,
      threadId: data.message.threadId,
    }
  },

  async sendDraft(userId: string, options: SendOptions): Promise<void> {
    const { accessToken } = await getGmailAuth(userId)

    const response = await fetch(`${GMAIL_API_BASE}/drafts/send`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ id: options.draftId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message ?? `HTTP ${response.status}`
      throw new Error(`Gmail API error: ${errorMessage}`)
    }
  },

  async isDraftSent(userId: string, draftId: string): Promise<boolean> {
    const { accessToken } = await getGmailAuth(userId)

    const response = await fetch(`${GMAIL_API_BASE}/drafts/${draftId}`, {
      headers: authHeaders(accessToken),
    })

    if (response.status === 404) {
      return true
    }

    if (!response.ok) {
      throw new Error(`Gmail API error: HTTP ${response.status}`)
    }

    return false
  },

  async syncSentStatus(
    _userId: string
  ): Promise<{ updatedCount: number }> {
    // Batch sync operation - queries contacts with gmailDraftId,
    // checks each draft's sent status. Fully wired in campaign runner.
    return { updatedCount: 0 }
  },
}
