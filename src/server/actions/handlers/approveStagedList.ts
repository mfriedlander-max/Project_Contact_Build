/**
 * APPROVE_STAGED_LIST Action Handler
 * Converts staged contacts into a campaign
 */

import { ApproveListPayloadSchema, type AiActionResult } from '../types'
import type { ApproveServiceDeps, Campaign } from './interfaces'

interface ApproveStagedListDeps {
  approveService: ApproveServiceDeps
}

export async function handleApproveStagedList(
  payload: unknown,
  context: { userId: string },
  deps: ApproveStagedListDeps
): Promise<AiActionResult<Campaign>> {
  const parsed = ApproveListPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid payload: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    }
  }

  try {
    const campaign = await deps.approveService.approve({
      userId: context.userId,
      campaignName: parsed.data.campaignName,
      keptContactIds: parsed.data.keptContactIds,
    })
    return {
      success: true,
      data: campaign,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve staged list',
    }
  }
}
