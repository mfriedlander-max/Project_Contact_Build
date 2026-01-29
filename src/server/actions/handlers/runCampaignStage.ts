/**
 * Campaign Stage Runner Handlers
 * Handles RUN_EMAIL_FINDING, RUN_INSERTS, RUN_DRAFTS, SEND_EMAILS
 */

import {
  AiActionType,
  CampaignIdPayloadSchema,
  RunDraftsPayloadSchema,
  type AiActionResult,
  type AiActionTypeValue,
} from '../types'
import {
  CampaignRunState,
  type CampaignRunProgress,
} from '../campaignRunner'
import type { StageExecutors } from './interfaces'

type CampaignRunner = {
  startEmailFinding(userId: string, campaignId: string): Promise<CampaignRunProgress>
  startInserts(userId: string, campaignId: string): Promise<CampaignRunProgress>
  startDrafts(userId: string, campaignId: string, templateId: string): Promise<CampaignRunProgress>
  startSending(userId: string, campaignId: string): Promise<CampaignRunProgress>
  transition(
    campaignId: string,
    from: CampaignRunProgress['state'],
    to: CampaignRunProgress['state']
  ): Promise<CampaignRunProgress>
}

interface RunCampaignStageDeps {
  campaignRunner: CampaignRunner
  stageExecutors: StageExecutors
}

const STAGE_ACTION_MAP: Record<string, {
  runningState: CampaignRunProgress['state']
  completedState: CampaignRunProgress['state']
}> = {
  [AiActionType.RUN_EMAIL_FINDING]: {
    runningState: CampaignRunState.EMAIL_FINDING_RUNNING,
    completedState: CampaignRunState.INSERTS_RUNNING,
  },
  [AiActionType.RUN_INSERTS]: {
    runningState: CampaignRunState.INSERTS_RUNNING,
    completedState: CampaignRunState.DRAFTS_RUNNING,
  },
  [AiActionType.RUN_DRAFTS]: {
    runningState: CampaignRunState.DRAFTS_RUNNING,
    completedState: CampaignRunState.SENDING_RUNNING,
  },
  [AiActionType.SEND_EMAILS]: {
    runningState: CampaignRunState.SENDING_RUNNING,
    completedState: CampaignRunState.COMPLETE,
  },
}

export async function handleRunCampaignStage(
  actionType: AiActionTypeValue,
  payload: unknown,
  context: { userId: string },
  deps: RunCampaignStageDeps
): Promise<AiActionResult<CampaignRunProgress>> {
  const isDrafts = actionType === AiActionType.RUN_DRAFTS
  const baseResult = CampaignIdPayloadSchema.safeParse(payload)
  if (!baseResult.success) {
    return {
      success: false,
      error: `Invalid payload: ${baseResult.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  const { campaignId } = baseResult.data
  let templateId: string | undefined
  if (isDrafts) {
    const draftsResult = RunDraftsPayloadSchema.safeParse(payload)
    if (!draftsResult.success) {
      return {
        success: false,
        error: `Invalid payload: ${draftsResult.error.issues.map((i) => i.message).join(', ')}`,
      }
    }
    templateId = draftsResult.data.templateId
  }
  const stageConfig = STAGE_ACTION_MAP[actionType]

  if (!stageConfig) {
    return { success: false, error: `Unknown campaign stage action: ${actionType}` }
  }

  try {
    // Start the stage via campaign runner
    switch (actionType) {
      case AiActionType.RUN_EMAIL_FINDING:
        await deps.campaignRunner.startEmailFinding(context.userId, campaignId)
        break
      case AiActionType.RUN_INSERTS:
        await deps.campaignRunner.startInserts(context.userId, campaignId)
        break
      case AiActionType.RUN_DRAFTS:
        await deps.campaignRunner.startDrafts(context.userId, campaignId, templateId!)
        break
      case AiActionType.SEND_EMAILS:
        await deps.campaignRunner.startSending(context.userId, campaignId)
        break
      default:
        return { success: false, error: `Unhandled action type: ${actionType}` }
    }

    // Execute the stage
    let stageResult
    switch (actionType) {
      case AiActionType.RUN_EMAIL_FINDING:
        stageResult = await deps.stageExecutors.emailFinding(campaignId)
        break
      case AiActionType.RUN_INSERTS:
        stageResult = await deps.stageExecutors.inserts(campaignId)
        break
      case AiActionType.RUN_DRAFTS:
        stageResult = await deps.stageExecutors.drafts(campaignId, templateId!)
        break
      case AiActionType.SEND_EMAILS:
        stageResult = await deps.stageExecutors.send(campaignId)
        break
    }

    // Transition to completed state
    const updated = await deps.campaignRunner.transition(
      campaignId,
      stageConfig.runningState,
      stageConfig.completedState
    )

    return {
      success: true,
      data: {
        ...updated,
        processedCount: stageResult?.processedCount ?? 0,
        errors: [
          ...updated.errors,
          ...(stageResult?.errors.map((e) => ({
            ...e,
            stage: stageConfig.runningState,
          })) ?? []),
        ],
      },
    }
  } catch (error) {
    // Attempt to transition to FAILED
    try {
      await deps.campaignRunner.transition(
        campaignId,
        stageConfig.runningState,
        CampaignRunState.FAILED
      )
    } catch {
      // Transition to failed may itself fail if state is wrong; ignore
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Campaign stage failed',
    }
  }
}
