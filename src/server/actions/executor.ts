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
import type { createActionLogger } from './actionLogger'
import type {
  StagingServiceDeps,
  ApproveServiceDeps,
  ContactServiceDeps,
  SavedViewServiceDeps,
  StageExecutors,
} from './handlers/interfaces'
import type { SearchProvider, StagingService } from './handlers/findContacts'
import type { createCampaignRunner } from './campaignRunner'
import { handleFindContacts } from './handlers/findContacts'
import { handleShowStagedResults } from './handlers/showStagedResults'
import { handleDeleteStagedRow } from './handlers/deleteStagedRow'
import { handleApproveStagedList } from './handlers/approveStagedList'
import { handleRunCampaignStage } from './handlers/runCampaignStage'
import { handleQueryContacts } from './handlers/queryContacts'
import {
  handleMoveStage,
  handleUpdateField,
  handleBulkUpdate,
  handleDeleteContacts,
} from './handlers/mutationHandlers'
import { handleCreateSavedView } from './handlers/createSavedView'

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
  throw new Error(`${request.type} not implemented - use createExecutor()`)
}

// ============================================================================
// Executor Factory (Phase 3)
// ============================================================================

export interface ExecutorDeps {
  searchProvider: SearchProvider
  stagingService: StagingService & StagingServiceDeps
  approveService: ApproveServiceDeps
  campaignRunner: ReturnType<typeof createCampaignRunner>
  stageExecutors: StageExecutors
  contactService: ContactServiceDeps
  savedViewService: SavedViewServiceDeps
  logger: ReturnType<typeof createActionLogger>
}

function buildHandlers(deps: ExecutorDeps): ActionHandlers {
  const findContactsDeps = {
    searchProvider: deps.searchProvider,
    stagingService: deps.stagingService,
  }
  const stagingDeps = { stagingService: deps.stagingService }
  const approveDeps = { approveService: deps.approveService }
  const campaignDeps = {
    campaignRunner: deps.campaignRunner,
    stageExecutors: deps.stageExecutors,
  }
  const contactDeps = { contactService: deps.contactService }
  const savedViewDeps = { savedViewService: deps.savedViewService }

  const wrapWithLogging = (
    actionType: AiActionTypeValue,
    fn: (request: AiActionRequest, context: ExecutorContext) => Promise<AiActionResult>
  ): ActionHandler => {
    return async (request, context) => {
      try {
        const result = await fn(request, context)
        deps.logger.logAction({
          actionType,
          userId: context.userId,
          success: result.success,
          error: result.error,
        })
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        deps.logger.logAction({
          actionType,
          userId: context.userId,
          success: false,
          error: message,
        })
        return { success: false, error: message }
      }
    }
  }

  return {
    [AiActionType.FIND_CONTACTS]: wrapWithLogging(
      AiActionType.FIND_CONTACTS,
      (req, ctx) => handleFindContacts(req.payload, ctx, findContactsDeps)
    ),
    [AiActionType.SHOW_STAGED_RESULTS]: wrapWithLogging(
      AiActionType.SHOW_STAGED_RESULTS,
      (req, ctx) => handleShowStagedResults(req.payload, ctx, stagingDeps)
    ),
    [AiActionType.DELETE_STAGED_ROW]: wrapWithLogging(
      AiActionType.DELETE_STAGED_ROW,
      (req, ctx) => handleDeleteStagedRow(req.payload, ctx, stagingDeps)
    ),
    [AiActionType.APPROVE_STAGED_LIST]: wrapWithLogging(
      AiActionType.APPROVE_STAGED_LIST,
      (req, ctx) => handleApproveStagedList(req.payload, ctx, approveDeps)
    ),
    [AiActionType.RUN_EMAIL_FINDING]: wrapWithLogging(
      AiActionType.RUN_EMAIL_FINDING,
      (req, ctx) => handleRunCampaignStage(req.type, req.payload, ctx, campaignDeps)
    ),
    [AiActionType.RUN_INSERTS]: wrapWithLogging(
      AiActionType.RUN_INSERTS,
      (req, ctx) => handleRunCampaignStage(req.type, req.payload, ctx, campaignDeps)
    ),
    [AiActionType.RUN_DRAFTS]: wrapWithLogging(
      AiActionType.RUN_DRAFTS,
      (req, ctx) => handleRunCampaignStage(req.type, req.payload, ctx, campaignDeps)
    ),
    [AiActionType.SEND_EMAILS]: wrapWithLogging(
      AiActionType.SEND_EMAILS,
      (req, ctx) => handleRunCampaignStage(req.type, req.payload, ctx, campaignDeps)
    ),
    [AiActionType.QUERY_CONTACTS]: wrapWithLogging(
      AiActionType.QUERY_CONTACTS,
      (req, ctx) => handleQueryContacts(req.payload, ctx, contactDeps)
    ),
    [AiActionType.MOVE_STAGE]: wrapWithLogging(
      AiActionType.MOVE_STAGE,
      (req, ctx) => handleMoveStage(req.payload, ctx, contactDeps)
    ),
    [AiActionType.UPDATE_FIELD]: wrapWithLogging(
      AiActionType.UPDATE_FIELD,
      (req, ctx) => handleUpdateField(req.payload, ctx, contactDeps)
    ),
    [AiActionType.BULK_UPDATE]: wrapWithLogging(
      AiActionType.BULK_UPDATE,
      (req, ctx) => handleBulkUpdate(req.payload, ctx, contactDeps)
    ),
    [AiActionType.DELETE_CONTACTS]: wrapWithLogging(
      AiActionType.DELETE_CONTACTS,
      (req, ctx) => handleDeleteContacts(req.payload, ctx, contactDeps)
    ),
    [AiActionType.CREATE_SAVED_VIEW]: wrapWithLogging(
      AiActionType.CREATE_SAVED_VIEW,
      (req, ctx) => handleCreateSavedView(req.payload, ctx, savedViewDeps)
    ),
  } as ActionHandlers
}

export function createExecutor(deps: ExecutorDeps) {
  const handlers = buildHandlers(deps)
  return {
    execute: (request: AiActionRequest, context: ExecutorContext): Promise<AiActionResult> =>
      executeAction(request, context, handlers),
  }
}
