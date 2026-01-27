import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prismadb } from "@/lib/prisma"
import { searchSentEmails, GmailRateLimitError } from "@/lib/gmail"
import { rateLimiters, getClientIdentifier } from "@/lib/rate-limit"

// Zod schema for request body validation
const syncSentSchema = z.union([
  z.object({
    contactId: z.string().min(1, "contactId must be a non-empty string"),
    contactIds: z.undefined(),
  }),
  z.object({
    contactId: z.undefined(),
    contactIds: z
      .array(z.string().min(1))
      .min(1, "contactIds must have at least one ID"),
  }),
])

type SyncSentInput = z.infer<typeof syncSentSchema>

interface UpdatedContact {
  id: string
  email: string | null
  email_status: string
  sent_at: Date | null
}

interface SyncSentResponse {
  updated: UpdatedContact[]
  notFound: string[]
}

/**
 * POST /api/gmail/sync-sent
 *
 * Syncs the email_status for contacts by checking if emails were sent via Gmail.
 * Updates contacts from "DRAFTED" to "SENT" if a sent email is found.
 *
 * Request body:
 * - { contactId: string } - Sync a single contact
 * - { contactIds: string[] } - Sync multiple contacts (batch)
 *
 * Response:
 * - { updated: Contact[], notFound: string[] }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 401 })
  }

  // Rate limiting - strict limit for Gmail API calls
  const identifier = getClientIdentifier(req, (session as { user?: { id: string } }).user?.id)
  const rateLimitResult = rateLimiters.strict(identifier)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.reset.toString(),
        },
      }
    )
  }

  // Check for Gmail access token
  const accessToken = (session as { accessToken?: string }).accessToken
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Gmail access not authorized. Please sign in with Google to enable Gmail sync.",
      },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()

    // Validate input
    const validationResult = syncSentSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(", ")

      // Special case for when neither field is provided
      if (!body.contactId && !body.contactIds) {
        return NextResponse.json(
          { error: "Either contactId or contactIds must be provided" },
          { status: 400 }
        )
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const input: SyncSentInput = validationResult.data

    // Normalize to array of IDs
    const contactIds = input.contactId ? [input.contactId] : input.contactIds!

    // Fetch contacts from database (only those assigned to the current user)
    const contacts = await prismadb.crm_Contacts.findMany({
      where: {
        id: { in: contactIds },
        assigned_to: (session as { user: { id: string } }).user.id,
      },
      select: {
        id: true,
        email: true,
        email_status: true,
        sent_at: true,
      },
    })

    // Track which IDs were not found in the database
    const foundIds = new Set(contacts.map((c) => c.id))
    const notFoundIds = contactIds.filter((id) => !foundIds.has(id))

    // Process each contact
    const updated: UpdatedContact[] = []
    const notFound: string[] = [...notFoundIds]

    for (const contact of contacts) {
      // Skip contacts without email
      if (!contact.email) {
        notFound.push(contact.id)
        continue
      }

      // Search for sent emails to this contact
      const searchResult = await searchSentEmails(accessToken, contact.email)

      if (searchResult.found && searchResult.sentAt) {
        // Update the contact with SENT status
        const updatedContact = await prismadb.crm_Contacts.update({
          where: { id: contact.id },
          data: {
            email_status: "SENT",
            sent_at: searchResult.sentAt,
          },
          select: {
            id: true,
            email: true,
            email_status: true,
            sent_at: true,
          },
        })

        updated.push({
          id: updatedContact.id,
          email: updatedContact.email,
          email_status: updatedContact.email_status ?? "SENT",
          sent_at: updatedContact.sent_at,
        })
      } else {
        notFound.push(contact.id)
      }
    }

    const response: SyncSentResponse = {
      updated,
      notFound,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    // Handle rate limit errors
    if (
      error instanceof Error &&
      "status" in error &&
      (error as GmailRateLimitError).status === 429
    ) {
      return NextResponse.json(
        { error: "Gmail API rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }

    // Handle Gmail API errors
    if (error instanceof Error && error.message.includes("Gmail API")) {
      return NextResponse.json(
        { error: `Gmail API error: ${error.message}` },
        { status: 502 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
