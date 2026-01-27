import { NextResponse, NextRequest } from 'next/server'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { anthropicHelper } from '@/lib/anthropic'
import type { InsertConfidenceType } from '@/lib/types/contact'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

// Validation schema for request body
const generatePersonalizationSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  firstName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
})

type GeneratePersonalizationInput = z.infer<typeof generatePersonalizationSchema>

/**
 * Calculate confidence level based on available data
 * HIGH: Has LinkedIn URL or detailed company info
 * MEDIUM: Has company and position
 * LOW: Only has name and company
 */
function calculateConfidence(input: GeneratePersonalizationInput): InsertConfidenceType {
  if (input.linkedinUrl && input.linkedinUrl.length > 0) {
    return 'HIGH'
  }

  if (input.company && input.position) {
    return 'MEDIUM'
  }

  return 'LOW'
}

/**
 * Build AI prompt for personalized email insert
 */
function buildPrompt(input: GeneratePersonalizationInput): string {
  const nameDisplay = input.firstName
    ? `${input.firstName} ${input.lastName}`
    : input.lastName

  const linkedinContext = input.linkedinUrl
    ? `LinkedIn profile available at: ${input.linkedinUrl}`
    : ''

  return `Generate a personalized 1-2 sentence opening for a cold email from a college student reaching out professionally.

Target Person:
- Name: ${nameDisplay}
- Company: ${input.company}
- Position: ${input.position}
${linkedinContext}

Requirements:
- Reference something specific about the person or their company
- Feel authentic and genuine, not salesy or generic
- Be appropriate for a college student reaching out professionally
- Keep it brief (1-2 sentences max)
- Do NOT include any greeting like "Hi" or "Dear" - just the personalized content

Example output format: "I noticed your work on [specific project/initiative] at [Company] - the approach to [specific detail] really resonated with my experience in [related area]."

Generate only the personalized opening text, nothing else.`
}

export async function POST(req: NextRequest) {
  // Authentication check
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  // Rate limiting - strict limit for AI API calls
  const identifier = getClientIdentifier(req, session.user?.id)
  const rateLimitResult = rateLimiters.aiOperations(identifier)

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

  try {
    // Parse and validate request body
    const body = await req.json()
    const validationResult = generatePersonalizationSchema.safeParse(body)

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      return NextResponse.json(
        { error: `Validation failed: ${errorMessage}` },
        { status: 400 }
      )
    }

    const input = validationResult.data

    // Verify contact exists and user has access
    const contact = await prismadb.crm_Contacts.findFirst({
      where: {
        id: input.contactId,
        assigned_to: session.user.id,
      },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found or access denied' },
        { status: 403 }
      )
    }

    // Get Anthropic client
    const userId = session.user.id
    const anthropic = await anthropicHelper(userId)

    if (!anthropic) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add your API key in settings.' },
        { status: 500 }
      )
    }

    // Calculate confidence based on available data
    const confidence = calculateConfidence(input)

    // Generate personalized insert using Anthropic Claude
    const prompt = buildPrompt(input)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: 'You are an expert at writing personalized, authentic email openings for professional networking. Your responses should feel genuine and human, never robotic or sales-like.',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract text content from Anthropic response
    const textContent = message.content.find((block) => block.type === 'text')
    const personalizedInsert = textContent?.type === 'text' ? textContent.text.trim() : ''

    if (!personalizedInsert) {
      return NextResponse.json(
        { error: 'Failed to generate personalized content' },
        { status: 500 }
      )
    }

    // Update contact with personalized insert and confidence
    await prismadb.crm_Contacts.update({
      where: { id: input.contactId },
      data: {
        personalized_insert: personalizedInsert,
        insert_confidence: confidence,
      },
    })

    return NextResponse.json(
      {
        personalizedInsert,
        confidence,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    // Check for specific Anthropic errors
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return NextResponse.json(
        { error: 'Invalid or missing Anthropic API key' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate personalization. Please try again.' },
      { status: 500 }
    )
  }
}
