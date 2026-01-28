import { NextResponse, NextRequest } from 'next/server'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  templateId: z.string().optional(),
})

const updateCampaignSchema = z.object({
  id: z.string().min(1, 'Campaign id is required'),
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETE', 'ARCHIVED']).optional(),
  templateId: z.string().nullable().optional(),
})

// GET - List all campaigns or get single campaign
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      // Get single campaign with details
      const campaign = await prismadb.campaign.findFirst({
        where: { id, userId },
        include: {
          contacts: true,
          runs: { orderBy: { createdAt: 'desc' }, take: 5 },
          template: true,
        },
      })

      if (!campaign) {
        return NextResponse.json(
          { error: 'Campaign not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json({ campaign }, { status: 200 })
    }

    // List all campaigns
    const campaigns = await prismadb.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { contacts: true } } },
    })

    return NextResponse.json({ campaigns }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

// POST - Create new campaign
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = createCampaignSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, description, templateId } = validation.data

    const campaign = await prismadb.campaign.create({
      data: {
        userId,
        name,
        description,
        status: 'DRAFT',
        ...(templateId ? { templateId } : {}),
      },
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}

// PUT - Update campaign
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = updateCampaignSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { id, ...updateData } = validation.data

    // Verify ownership
    const existing = await prismadb.campaign.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    const campaign = await prismadb.campaign.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ campaign }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

// DELETE - Delete campaign
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign id is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prismadb.campaign.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    await prismadb.campaign.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
