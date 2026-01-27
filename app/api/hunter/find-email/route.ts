import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prismadb } from '@/lib/prisma'
import { findEmail, type EmailConfidence } from '@/lib/hunter'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

// Validation schema for request body
const findEmailRequestSchema = z.object({
  firstName: z.string().min(1, 'firstName is required'),
  lastName: z.string().min(1, 'lastName is required'),
  company: z.string().min(1, 'company is required'),
  contactId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  // Rate limiting - strict limit for external API calls
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

  // Check API key configuration
  if (!process.env.HUNTER_API_KEY) {
    return NextResponse.json(
      { error: 'Hunter API key is not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()

    // Validate request body
    const validation = findEmailRequestSchema.safeParse(body)
    if (!validation.success) {
      const errorMessages = validation.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      return NextResponse.json({ error: errorMessages }, { status: 400 })
    }

    const { firstName, lastName, company, contactId } = validation.data

    // Call Hunter API
    let result: { email: string; score: number; confidence: EmailConfidence }

    try {
      result = await findEmail({
        firstName,
        lastName,
        domain: company,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      // Check if the error is "no email found"
      if (errorMessage.includes('No email found')) {
        return NextResponse.json(
          { error: 'No email found for the given name and company' },
          { status: 404 }
        )
      }

      // For other Hunter API errors, return 502
      return NextResponse.json(
        { error: `Hunter API error: ${errorMessage}` },
        { status: 502 }
      )
    }

    // Prepare response
    const response: {
      email: string
      confidence: EmailConfidence
      score: number
      contactUpdated?: boolean
    } = {
      email: result.email,
      confidence: result.confidence,
      score: result.score,
    }

    // Update contact if contactId is provided
    if (contactId) {
      // Verify user has access to this contact
      const contact = await prismadb.crm_Contacts.findFirst({
        where: {
          id: contactId,
          assigned_to: session.user.id,
        },
      })

      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found or access denied' },
          { status: 403 }
        )
      }

      await prismadb.crm_Contacts.update({
        where: { id: contactId },
        data: {
          email: result.email,
          email_confidence: result.confidence,
        },
      })
      response.contactUpdated = true
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    // Handle JSON parsing errors or other unexpected errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
