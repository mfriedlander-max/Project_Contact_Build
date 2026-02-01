/**
 * AI Chat API Route
 * Bridge between the chat UI and the action executor system
 * Supports streaming responses via SSE for chat messages
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { AiMode, AiActionType, type AiModeType, type AiActionTypeValue } from '@/lib/types/enums'
import { executeAction, type ExecutorContext, createExecutor } from '@/src/server/actions/executor'
import { createActionLogger } from '@/src/server/actions/actionLogger'
import { createCampaignRunner, CampaignRunState } from '@/src/server/actions/campaignRunner'
import { stagingService } from '@/src/server/services/stagingService'
import { approveService } from '@/src/server/services/approveService'
import { searchProviderAdapter } from '@/src/server/integrations/searchProviderAdapter'
import { contactService } from '@/src/server/services/contactService'
import { savedViewService } from '@/src/server/services/savedViewService'
import { stageExecutors } from '@/src/server/actions/handlers/stageExecutors'
import { createPrismaCampaignRunStore } from '@/src/server/services/campaignRunStore'
import { prismadb } from '@/lib/prisma'
import type { AiActionRequest, AiActionResult } from '@/src/server/actions/types'
import { anthropicHelper } from '@/lib/anthropic'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'
import { buildSystemPrompt, buildChatMessages } from '@/lib/ai/stream-chat'
import { getToolsForMode } from '@/lib/ai/tool-schemas'
import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/messages'

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

// Initialize executor once at module level
const logger = createActionLogger()
const campaignRunStore = createPrismaCampaignRunStore(prismadb)
const campaignRunner = createCampaignRunner({ store: campaignRunStore })
const executor = createExecutor({
  searchProvider: searchProviderAdapter,
  stagingService,
  approveService,
  campaignRunner,
  stageExecutors,
  contactService,
  savedViewService,
  logger,
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

    // Get tools for the current mode
    const tools = getToolsForMode(mode as AiModeType)

    // DEBUG: Log tools being sent
    console.log('🔧 Tools for mode', mode, ':', tools.length, 'tools')
    console.log('🔧 Tool names:', tools.map(t => t.name))

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      tools,
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let currentToolUse: { name: string; inputJson: string } | null = null

        try {
          for await (const event of stream) {
            // Handle text deltas (regular conversation)
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ type: 'text', text: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }

            // Start of a tool use block - capture the tool name
            if (event.type === 'content_block_start') {
              const block = event.content_block
              if (block.type === 'tool_use') {
                const toolUseBlock = block as ToolUseBlock
                currentToolUse = {
                  name: toolUseBlock.name,
                  inputJson: '',
                }
                console.log('🎯 Tool started:', toolUseBlock.name)
              }
            }

            // Accumulate tool input JSON
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'input_json_delta' &&
              currentToolUse
            ) {
              currentToolUse.inputJson += event.delta.partial_json
            }

            // End of tool use block - now we have complete input, execute it
            if (event.type === 'content_block_stop' && currentToolUse) {
              console.log('🔨 Tool complete:', currentToolUse.name)
              console.log('📦 Full input JSON:', currentToolUse.inputJson)

              try {
                const toolInput = JSON.parse(currentToolUse.inputJson)
                const actionType = toolNameToActionType(currentToolUse.name)

                // Validate that the action type exists
                if (!Object.values(AiActionType).includes(actionType as any)) {
                  const errorData = JSON.stringify({
                    type: 'error',
                    error: `Unknown tool: ${currentToolUse.name}`,
                  })
                  controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                  currentToolUse = null
                  continue
                }

                // Build and execute action request
                const actionRequest: AiActionRequest = {
                  type: actionType as AiActionTypeValue,
                  payload: toolInput,
                  userConfirmed: false,
                }

                console.log('⚡ Executing action:', actionType, toolInput)
                const actionResult = await executor.execute(actionRequest, context)
                console.log('✅ Action result:', actionResult.success ? 'success' : 'failed')
                if (!actionResult.success) {
                  console.log('❌ Error:', actionResult.error)
                }
                if (actionResult.success && actionResult.data) {
                  console.log('📊 Result data:', JSON.stringify(actionResult.data).substring(0, 200))
                }

                // Stream the action result
                if (actionResult.requiresConfirmation) {
                  const confirmData = JSON.stringify({
                    type: 'confirmation_required',
                    message: actionResult.confirmationMessage,
                    actionType,
                    payload: toolInput,
                  })
                  controller.enqueue(encoder.encode(`data: ${confirmData}\n\n`))
                } else if (actionResult.success) {
                  const resultData = JSON.stringify({
                    type: 'tool_result',
                    tool: currentToolUse.name,
                    result: actionResult.data,
                  })
                  controller.enqueue(encoder.encode(`data: ${resultData}\n\n`))
                } else {
                  const errorData = JSON.stringify({
                    type: 'tool_error',
                    tool: currentToolUse.name,
                    error: actionResult.error,
                  })
                  controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                }
              } catch (parseError) {
                console.error('❌ Failed to parse tool input:', parseError)
                const errorData = JSON.stringify({
                  type: 'error',
                  error: `Failed to parse tool input: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
                })
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
              }

              currentToolUse = null
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

/**
 * Convert snake_case tool name to SCREAMING_SNAKE_CASE action type
 * e.g., "find_contacts" → "FIND_CONTACTS"
 */
function toolNameToActionType(toolName: string): string {
  return toolName.toUpperCase()
}
