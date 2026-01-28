/**
 * Shared helpers for campaign run API routes
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismadb } from '@/lib/prisma'
import { createCampaignRunner } from '@/src/server/actions/campaignRunner'
import { createPrismaCampaignRunStore } from '@/src/server/services/campaignRunStore'

export interface RunContext {
  userId: string
  campaignId: string
  runner: ReturnType<typeof createCampaignRunner>
}

/**
 * Authenticate and validate campaign ownership, then return a runner context
 */
export async function getRunContext(
  campaignId: string
): Promise<RunContext | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  const userId = session.user.id

  const campaign = await prismadb.campaign.findFirst({
    where: { id: campaignId, userId },
  })

  if (!campaign) {
    return NextResponse.json(
      { success: false, error: 'Campaign not found' },
      { status: 404 }
    )
  }

  const store = createPrismaCampaignRunStore(prismadb)
  const campaignService = {
    getContactCount: async (cId: string) => {
      return prismadb.crm_Contacts.count({ where: { campaignId: cId } })
    },
  }

  const runner = createCampaignRunner({ store, campaignService })

  return { userId, campaignId, runner }
}

export function isErrorResponse(ctx: RunContext | NextResponse): ctx is NextResponse {
  return ctx instanceof NextResponse
}
