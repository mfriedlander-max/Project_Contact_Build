import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { searchContacts } from '@/lib/serpapi'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().min(1).max(30).optional().default(10),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = searchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { query, maxResults } = validation.data

    const rateLimitResult = rateLimiters.strict(
      getClientIdentifier(req, userId)
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded.' },
        { status: 429 }
      )
    }

    const results = await searchContacts(query, maxResults)

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        total: results.length,
        query,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
