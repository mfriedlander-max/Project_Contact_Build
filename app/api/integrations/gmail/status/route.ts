import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }

    // Check if the session has a Gmail access token
    const connected = Boolean(session.accessToken)

    return NextResponse.json({ connected })
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: 'Failed to check Gmail status' },
      { status: 500 }
    )
  }
}
