import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { createDraft } from '@/lib/gmail'
import { prismadb } from '@/lib/prisma'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

const createDraftSchema = z.object({
  contactId: z.string().min(1),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions) as any
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  const accessToken = session.accessToken as string | undefined
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'Gmail not connected. Please sign in with Google to enable email features.' },
      { status: 403 }
    )
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = createDraftSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { contactId, subject, body: emailBody } = validation.data

    const rateLimitResult = rateLimiters.strict(
      getClientIdentifier(req, userId)
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded.' },
        { status: 429 }
      )
    }

    const contact = await prismadb.crm_Contacts.findFirst({
      where: { id: contactId, created_by: userId },
    })

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (!contact.email) {
      return NextResponse.json(
        { success: false, error: 'Contact has no email address. Run email finding first.' },
        { status: 400 }
      )
    }

    const result = await createDraft(accessToken, {
      to: contact.email,
      subject,
      body: emailBody,
      threadId: contact.gmail_thread_id ?? undefined,
    })

    await prismadb.crm_Contacts.update({
      where: { id: contactId },
      data: {
        gmail_draft_id: result.draftId,
        gmail_message_id: result.messageId,
        gmail_thread_id: result.threadId,
        email_status: 'DRAFTED',
        connection_stage: contact.connection_stage ?? 'DRAFTED',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        draftId: result.draftId,
        messageId: result.messageId,
        threadId: result.threadId,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create draft'
    const status = (error as any)?.status === 429 ? 429 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
