import { NextResponse } from 'next/server'
import { getRunContext, isErrorResponse } from '../helpers'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getRunContext(id)
    if (isErrorResponse(ctx)) return ctx

    const progress = await ctx.runner.startSending(ctx.userId, ctx.campaignId)
    return NextResponse.json({ success: true, data: progress }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start sending' },
      { status: 400 }
    )
  }
}
