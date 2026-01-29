import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getRunContext, isErrorResponse } from '../helpers'

const startDraftsSchema = z.object({
  templateId: z.string().min(1),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getRunContext(id)
    if (isErrorResponse(ctx)) return ctx

    const body = await req.json()
    const validation = startDraftsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const progress = await ctx.runner.startDrafts(
      ctx.userId,
      ctx.campaignId,
      validation.data.templateId
    )
    return NextResponse.json({ success: true, data: progress }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to start drafts' },
      { status: 400 }
    )
  }
}
