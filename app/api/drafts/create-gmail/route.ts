import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismadb } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1'

// Request validation schema
const createDraftSchema = z.object({
  contactId: z.string().min(1, 'contactId is required'),
  subject: z.string().min(1, 'subject is required'),
  templateId: z.string().optional(),
})

/**
 * Builds an RFC 2822 formatted email and returns it as base64url encoded string.
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Email body content
 * @returns Base64url encoded email string
 */
function buildRfc2822Email(to: string, subject: string, body: string): string {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n')

  // Gmail API requires base64url encoding (not standard base64)
  return Buffer.from(email, 'utf-8').toString('base64url')
}

interface GmailDraftResponse {
  id: string
  message: {
    id: string
    threadId: string
  }
}

interface GmailErrorResponse {
  error: {
    code: number
    message: string
  }
}

/**
 * Creates a Gmail draft via the Gmail API.
 *
 * @param accessToken - OAuth access token for Gmail API
 * @param rawMessage - Base64url encoded RFC 2822 email
 * @returns Draft creation response from Gmail API
 * @throws Error with status code information
 */
async function createGmailDraft(
  accessToken: string,
  rawMessage: string
): Promise<GmailDraftResponse> {
  const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/drafts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw: rawMessage,
      },
    }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as GmailErrorResponse
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`

    const error = new Error(errorMessage) as Error & { status: number }
    error.status = response.status
    throw error
  }

  return response.json() as Promise<GmailDraftResponse>
}

/**
 * POST /api/drafts/create-gmail
 *
 * Creates a Gmail draft for a contact with personalized content.
 *
 * Request body:
 * - contactId: string - The contact ID to create draft for
 * - subject: string - Email subject line
 * - templateId?: string - Optional template ID (for future use)
 *
 * Response:
 * - success: boolean
 * - draftId: string - Gmail draft ID
 * - threadId: string - Gmail thread ID
 * - message: string - Success message
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const session = await getServerSession(authOptions) as {
    user?: { id: string; email: string }
    accessToken?: string
  } | null

  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  // Rate limiting - strict limit for Gmail API calls
  const identifier = getClientIdentifier(request, session.user?.id)
  const rateLimitResult = rateLimiters.strict(identifier)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    )
  }

  // Verify Gmail access token exists
  if (!session.accessToken) {
    return NextResponse.json(
      { error: 'Gmail access not authorized. Please re-authenticate with Gmail.' },
      { status: 401 }
    )
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const validationResult = createDraftSchema.safeParse(body)
  if (!validationResult.success) {
    return NextResponse.json(
      { error: validationResult.error.errors[0].message },
      { status: 400 }
    )
  }

  const { contactId, subject } = validationResult.data

  try {
    // Fetch contact from database - verify user has access
    const contact = await prismadb.crm_Contacts.findFirst({
      where: {
        id: contactId,
        assigned_to: session.user?.id,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        personalized_insert: true,
        email_status: true,
      },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found or access denied' },
        { status: 403 }
      )
    }

    if (!contact.email || contact.email.trim() === '') {
      return NextResponse.json(
        { error: 'Contact has no email address' },
        { status: 400 }
      )
    }

    // Build email body using personalized_insert if available
    const emailBody = contact.personalized_insert || ''

    // Build RFC 2822 formatted email
    const rawMessage = buildRfc2822Email(contact.email, subject, emailBody)

    // Create draft via Gmail API
    let draftResponse: GmailDraftResponse
    try {
      draftResponse = await createGmailDraft(session.accessToken, rawMessage)
    } catch (error) {
      const gmailError = error as Error & { status?: number }
      const status = gmailError.status || 502

      if (status === 401) {
        return NextResponse.json(
          { error: 'Gmail access denied. Please re-authenticate with Gmail.' },
          { status: 401 }
        )
      }

      if (status === 403) {
        return NextResponse.json(
          { error: 'Insufficient Gmail permissions. Please grant compose permissions.' },
          { status: 403 }
        )
      }

      if (status === 429) {
        return NextResponse.json(
          { error: 'Gmail API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: `Gmail API error: ${gmailError.message}` },
        { status: 502 }
      )
    }

    // Update contact status in database
    let warning: string | undefined
    try {
      await prismadb.crm_Contacts.update({
        where: { id: contactId },
        data: {
          email_status: 'DRAFTED',
          draft_created_at: new Date(),
        },
      })
    } catch (updateError) {
      // Log error but don't fail the request - draft was created successfully
      warning = 'Draft created but failed to update contact status in database.'
    }

    return NextResponse.json({
      success: true,
      draftId: draftResponse.id,
      threadId: draftResponse.message.threadId,
      message: `Draft created successfully for ${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      ...(warning && { warning }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
