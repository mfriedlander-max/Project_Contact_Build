import { NextResponse, NextRequest } from 'next/server'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  isDefault: z.boolean().optional(),
})

const updateTemplateSchema = z.object({
  id: z.string().min(1, 'Template id is required'),
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
})

// GET - List all templates or get single template
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
      const template = await prismadb.template.findFirst({
        where: { id, userId },
      })

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json({ template }, { status: 200 })
    }

    const templates = await prismadb.template.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ templates }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create new template
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = createTemplateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, subject, body: templateBody, isDefault } = validation.data

    // If setting as default, unset others first
    if (isDefault) {
      await prismadb.template.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prismadb.template.create({
      data: {
        userId,
        name,
        subject,
        body: templateBody,
        isDefault: isDefault ?? false,
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// PUT - Update template
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = updateTemplateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { id, isDefault, ...updateData } = validation.data

    // Verify ownership
    const existing = await prismadb.template.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      )
    }

    // If setting as default, unset others first
    if (isDefault) {
      await prismadb.template.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prismadb.template.update({
      where: { id },
      data: {
        ...updateData,
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    })

    return NextResponse.json({ template }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete template
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
        { error: 'Template id is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await prismadb.template.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      )
    }

    await prismadb.template.delete({
      where: { id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
