/**
 * AI Action Executor
 * Validates mode requirements and executes actions
 *
 * Implementation in Phase 2 (Task 13)
 */

import {
  AiActionRequest,
  AiActionResult,
  AiActionType,
  AiMode,
  ACTION_MODE_REQUIREMENTS,
  ACTIONS_REQUIRING_CONFIRMATION,
  type AiModeType,
  type AiActionTypeValue,
} from './types'

export interface ExecutorContext {
  userId: string
  currentMode: AiModeType
}

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
 * Validates mode and confirmation requirements before executing
 */
export async function executeAction(
  request: AiActionRequest,
  context: ExecutorContext
): Promise<AiActionResult> {
  // Validate mode
  const modeValidation = validateModeForAction(request.type, context.currentMode)
  if (!modeValidation.valid) {
    return {
      success: false,
      error: modeValidation.error,
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

  // Execute action (implementations in Phase 2)
  try {
    const result = await executeActionByType(request, context)
    return result
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
 * Route action to specific handler
 */
async function executeActionByType(
  request: AiActionRequest,
  _context: ExecutorContext
): Promise<AiActionResult> {
  // TODO: Implement action handlers in Phase 2
  // Each action type will have its own handler function

  switch (request.type) {
    case AiActionType.FIND_CONTACTS:
      // Will call searchProvider + parse results + populate staging
      throw new Error('FIND_CONTACTS not implemented - Phase 2')

    case AiActionType.SHOW_STAGED_RESULTS:
      // Will return current staged results
      throw new Error('SHOW_STAGED_RESULTS not implemented - Phase 2')

    case AiActionType.DELETE_STAGED_ROW:
      // Will remove a row from staging
      throw new Error('DELETE_STAGED_ROW not implemented - Phase 2')

    case AiActionType.APPROVE_STAGED_LIST:
      // Will create Campaign + Contacts from staged list
      throw new Error('APPROVE_STAGED_LIST not implemented - Phase 2')

    case AiActionType.RUN_EMAIL_FINDING:
      // Will start campaign runner in EMAIL_FINDING state
      throw new Error('RUN_EMAIL_FINDING not implemented - Phase 2')

    case AiActionType.RUN_INSERTS:
      // Will start campaign runner in INSERTS state
      throw new Error('RUN_INSERTS not implemented - Phase 2')

    case AiActionType.RUN_DRAFTS:
      // Will start campaign runner in DRAFTS state
      throw new Error('RUN_DRAFTS not implemented - Phase 2')

    case AiActionType.SEND_EMAILS:
      // Will start campaign runner in SENDING state
      throw new Error('SEND_EMAILS not implemented - Phase 2')

    case AiActionType.QUERY_CONTACTS:
      // Will query contacts with filters
      throw new Error('QUERY_CONTACTS not implemented - Phase 2')

    case AiActionType.MOVE_STAGE:
      // Will update contact stage
      throw new Error('MOVE_STAGE not implemented - Phase 2')

    case AiActionType.UPDATE_FIELD:
      // Will update single field on contact
      throw new Error('UPDATE_FIELD not implemented - Phase 2')

    case AiActionType.BULK_UPDATE:
      // Will update multiple contacts
      throw new Error('BULK_UPDATE not implemented - Phase 2')

    case AiActionType.DELETE_CONTACTS:
      // Will delete contacts
      throw new Error('DELETE_CONTACTS not implemented - Phase 2')

    case AiActionType.CREATE_SAVED_VIEW:
      // Will create a saved view
      throw new Error('CREATE_SAVED_VIEW not implemented - Phase 2')

    default:
      throw new Error(`Action type ${request.type} not implemented`)
  }
}
