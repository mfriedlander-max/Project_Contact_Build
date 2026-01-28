/**
 * AI Action Executor
 * Validates mode requirements, payloads, and confirmation before executing
 */

import {
  AiActionRequest,
  AiActionResult,
  AiActionType,
  ACTION_MODE_REQUIREMENTS,
  ACTIONS_REQUIRING_CONFIRMATION,
  validateActionPayload,
  type AiModeType,
  type AiActionTypeValue,
} from './types'

export interface ExecutorContext {
  userId: string
  currentMode: AiModeType
}

export type ActionHandler = (
  request: AiActionRequest,
  context: ExecutorContext
) => Promise<AiActionResult>

export type ActionHandlers = Record<AiActionTypeValue, ActionHandler>

/**
 * Validate that the current mode allows the action
 */
export function validateModeForAction(
  action: AiActionTypeValue,
  currentMode: AiModeType
): { valid: boolean; error?: string } {
  const allowedModes = ACTION_MODE_REQUIREMENTS[action]

  if (!allowedModes.includes(currentMode)) {
    return {
      valid: false,
      error: `Action "${action}" requires mode: ${allowedModes.join(' or ')}. Current mode: ${currentMode}`,
    }
  }

  return { valid: true }
}

/**
 * Check if action requires confirmation
 */
export function requiresConfirmation(action: AiActionTypeValue): boolean {
  return ACTIONS_REQUIRING_CONFIRMATION.includes(action)
}

/**
 * Execute an AI action
 * Validates mode, payload, and confirmation requirements before executing
 */
export async function executeAction(
  request: AiActionRequest,
  context: ExecutorContext,
  handlers?: Partial<ActionHandlers>
): Promise<AiActionResult> {
  // Validate mode
  const modeValidation = validateModeForAction(request.type, context.currentMode)
  if (!modeValidation.valid) {
    return {
      success: false,
      error: modeValidation.error,
    }
  }

  // Validate payload
  const payloadValidation = validateActionPayload(request.type, request.payload)
  if (!payloadValidation.success) {
    return {
      success: false,
      error: `Invalid payload: ${payloadValidation.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  // Check confirmation requirement
  if (requiresConfirmation(request.type) && !request.userConfirmed) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationMessage: getConfirmationMessage(request),
    }
  }

  // Route to handler
  try {
    const handler = handlers?.[request.type]
    if (handler) {
      return await handler(request, context)
    }
    return await executeActionByType(request)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get confirmation message for action
 */
function getConfirmationMessage(request: AiActionRequest): string {
  switch (request.type) {
    case AiActionType.APPROVE_STAGED_LIST:
      return `Create campaign "${(request.payload as { campaignName: string }).campaignName}" with ${(request.payload as { keptContactIds: string[] }).keptContactIds.length} contacts?`
    case AiActionType.SEND_EMAILS:
      return 'Send emails to all contacts in this campaign?'
    case AiActionType.DELETE_CONTACTS:
      return `Delete ${(request.payload as { contactIds: string[] }).contactIds.length} contacts? This cannot be undone.`
    case AiActionType.BULK_UPDATE:
      return `Update ${(request.payload as { contactIds: string[] }).contactIds.length} contacts?`
    default:
      return 'Confirm this action?'
  }
}

/**
 * Route action to specific handler (fallback stubs for unimplemented actions)
 */
async function executeActionByType(request: AiActionRequest): Promise<AiActionResult> {
  throw new Error(`${request.type} not implemented - Phase 2`)
}
