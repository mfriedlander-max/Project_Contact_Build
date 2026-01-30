/**
 * AI Chat API Route
 * Bridge between the chat UI and the action executor system
 * Supports streaming responses via SSE for chat messages
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { AiMode, type AiModeType } from '@/lib/types/enums'
import { executeAction, type ExecutorContext } from '@/src/server/actions/executor'
import type { AiActionRequest, AiActionResult } from '@/src/server/actions/types'
import { anthropicHelper } from '@/lib/anthropic'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'
import { buildSystemPrompt, buildChatMessages } from '@/lib/ai/stream-chat'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum([AiMode.CONTACT_FINDER, AiMode.GENERAL_MANAGER, AiMode.ASSISTANT]),
  action: z.object({
    type: z.string(),
    payload: z.unknown(),
    userConfirmed: z.boolean().optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = chatRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { message, mode, action, history } = validation.data

    const context: ExecutorContext = {
      userId,
      currentMode: mode as AiModeType,
    }

    // If the client sent an explicit action, execute it directly
    if (action) {
      const result = await executeAction(
        action as AiActionRequest,
        context
      )

      return NextResponse.json({
        success: true,
        data: {
          reply: formatActionReply(result),
          actions: result.requiresConfirmation
            ? [{ type: 'confirm', message: result.confirmationMessage }]
            : undefined,
          result,
        },
      })
    }

    // No action — stream an AI response via SSE
    const identifier = getClientIdentifier(req, userId)
    const rateLimitResult = rateLimiters.aiOperations(identifier)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const client = await anthropicHelper(userId)
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'AI service is not configured.' },
        { status: 503 }
      )
    }

    const systemPrompt = buildSystemPrompt(mode as AiModeType)
    const messages = buildChatMessages(message, history)

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ type: 'text', text: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream failed',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Chat request failed' },
      { status: 500 }
    )
  }
}

function formatActionReply(result: AiActionResult): string {
  if (result.requiresConfirmation) {
    return result.confirmationMessage ?? 'Please confirm this action.'
  }
  if (!result.success) {
    return result.error ?? 'Action failed.'
  }
  return 'Action completed successfully.'
}
