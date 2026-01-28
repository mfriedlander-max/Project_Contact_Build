import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { approveService } from '@/src/server/services/approveService'

const approveSchema = z.object({
  campaignName: z.string().min(1).max(100),
  keptContactIds: z.array(z.string().min(1)).min(1).max(30),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const body = await req.json()
    const validation = approveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { campaignName, keptContactIds } = validation.data
    const result = await approveService.approveList(
      session.user.id,
      campaignName,
      keptContactIds
    )

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve staged list'
    const isNotFound = message.includes('No staged contacts') || message.includes('No matching')
    return NextResponse.json(
      { success: false, error: message },
      { status: isNotFound ? 404 : 500 }
    )
  }
}
