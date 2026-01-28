import { NextResponse, NextRequest } from 'next/server'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// Validation schemas
const createSavedViewSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  filters: z.record(z.any()).optional().default({}),
  sort: z.record(z.any()).optional(),
  columns: z.array(z.string()).optional().default([]),
  isDefault: z.boolean().optional(),
})

const updateSavedViewSchema = z.object({
  id: z.string().min(1, 'View id is required'),
  name: z.string().min(1).optional(),
  filters: z.record(z.any()).optional(),
  sort: z.record(z.any()).nullable().optional(),
  columns: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
})

// GET - List all saved views or get single view
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
      const savedView = await prismadb.savedView.findFirst({
        where: { id, userId },
      })

      if (!savedView) {
        return NextResponse.json(
          { error: 'Saved view not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json({ savedView }, { status: 200 })
    }

    const savedViews = await prismadb.savedView.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ savedViews }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch saved views' },
      { status: 500 }
    )
  }
}

// POST - Create new saved view
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = createSavedViewSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, filters, sort, columns, isDefault } = validation.data

    // If setting as default, unset others first
    if (isDefault) {
      await prismadb.savedView.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const savedView = await prismadb.savedView.create({
      data: {
        userId,
        name,
        filters: filters as Prisma.InputJsonValue,
        sort: sort as Prisma.InputJsonValue | undefined,
        columns,
        isDefault: isDefault ?? false,
      },
    })

    return NextResponse.json({ savedView }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create saved view' },
      { status: 500 }
    )
  }
}

// PUT - Update saved view
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = updateSavedViewSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { id, isDefault, ...updateData } = validation.data

    // Verify ownership
    const existing = await prismadb.savedView.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved view not found or access denied' },
        { status: 404 }
      )
    }

    // If setting as default, unset others first
    if (isDefault) {
      await prismadb.savedView.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const { filters, sort, ...restUpdateData } = updateData
    const savedView = await prismadb.savedView.update({
      where: { id },
      data: {
        ...restUpdateData,
        ...(filters !== undefined ? { filters: filters as Prisma.InputJsonValue } : {}),
        ...(sort !== undefined ? { sort: sort as Prisma.InputJsonValue | null } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    })

    return NextResponse.json({ savedView }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update saved view' },
      { status: 500 }
    )
  }
}

// DELETE - Delete saved view
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
        { error: 'View id is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prismadb.savedView.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Saved view not found or access denied' },
        { status: 404 }
      )
    }

    await prismadb.savedView.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete saved view' },
      { status: 500 }
    )
  }
}
