/**
 * AI Chat API Route
 * Bridge between the chat UI and the action executor system
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { AiMode, type AiModeType } from '@/lib/types/enums'
import { executeAction, type ExecutorContext } from '@/src/server/actions/executor'
import type { AiActionRequest, AiActionResult } from '@/src/server/actions/types'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum([AiMode.CONTACT_FINDER, AiMode.GENERAL_MANAGER, AiMode.ASSISTANT]),
  action: z.object({
    type: z.string(),
    payload: z.unknown(),
    userConfirmed: z.boolean().optional(),
  }).optional(),
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

    const { message, mode, action } = validation.data

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

    // No action provided — return the message for the AI to process client-side
    // The actual LLM call happens on the client via streaming;
    // this route only handles action execution
    return NextResponse.json({
      success: true,
      data: {
        reply: `Message received in ${mode} mode. No action specified.`,
        message,
        mode,
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
