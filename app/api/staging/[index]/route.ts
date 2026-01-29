import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stagingService } from '@/src/server/services/stagingService'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ index: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const { index: contactId } = await params
    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'Contact id is required' },
        { status: 400 }
      )
    }

    await stagingService.deleteStagedRow(session.user.id, contactId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete staged contact'
    const status = message === 'Staged contact not found' ? 404 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
