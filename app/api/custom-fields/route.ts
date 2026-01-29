import { NextResponse, NextRequest } from 'next/server'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const createCustomFieldSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  fieldKey: z.string().min(1, 'Field key is required').regex(/^[a-z_]+$/, 'Field key must be lowercase with underscores only'),
  fieldType: z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT']),
  options: z.array(z.string()).optional().default([]),
  isRequired: z.boolean().optional().default(false),
  order: z.number().optional().default(0),
})

const updateCustomFieldSchema = z.object({
  id: z.string().min(1, 'Field id is required'),
  name: z.string().min(1).optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  order: z.number().optional(),
})

// GET - List all custom fields
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
      const customField = await prismadb.customFieldDefinition.findFirst({
        where: { id, userId },
      })

      if (!customField) {
        return NextResponse.json(
          { error: 'Custom field not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json({ customField }, { status: 200 })
    }

    const customFields = await prismadb.customFieldDefinition.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ customFields }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch custom fields' },
      { status: 500 }
    )
  }
}

// POST - Create new custom field
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = createCustomFieldSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, fieldKey, fieldType, options, isRequired, order } = validation.data

    // Check for unique fieldKey per user
    const existing = await prismadb.customFieldDefinition.findFirst({
      where: { userId, fieldKey },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A custom field with this key already exists' },
        { status: 409 }
      )
    }

    const customField = await prismadb.customFieldDefinition.create({
      data: {
        userId,
        name,
        fieldKey,
        fieldType,
        options,
        isRequired,
        order,
      },
    })

    return NextResponse.json({ customField }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create custom field' },
      { status: 500 }
    )
  }
}

// PUT - Update custom field
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = updateCustomFieldSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { id, ...updateData } = validation.data

    // Verify ownership
    const existing = await prismadb.customFieldDefinition.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Custom field not found or access denied' },
        { status: 404 }
      )
    }

    const customField = await prismadb.customFieldDefinition.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ customField }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update custom field' },
      { status: 500 }
    )
  }
}

// DELETE - Delete custom field
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
        { error: 'Field id is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prismadb.customFieldDefinition.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Custom field not found or access denied' },
        { status: 404 }
      )
    }

    await prismadb.customFieldDefinition.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete custom field' },
      { status: 500 }
    )
  }
}
