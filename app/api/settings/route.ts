import { NextResponse, NextRequest } from 'next/server'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Validation schema
const updateSettingsSchema = z.object({
  defaultAiMode: z.enum(['CONTACT_FINDER', 'GENERAL_MANAGER', 'ASSISTANT']).optional(),
  hunterApiKey: z.string().nullable().optional(),
  defaultTemplateId: z.string().nullable().optional(),
  emailSignature: z.string().nullable().optional(),
  autoSaveInterval: z.number().min(5).max(300).optional(),
  notificationsEnabled: z.boolean().optional(),
  availabilityBlock: z.string().nullable().optional(),
  autoRunEmailFinding: z.boolean().optional(),
  autoRunInserts: z.boolean().optional(),
  autoRunDrafts: z.boolean().optional(),
  didntConnectEnabled: z.boolean().optional(),
  didntConnectDays: z.number().int().min(1).optional(),
})

// Default settings
const defaultSettings = {
  defaultAiMode: 'GENERAL_MANAGER',
  hunterApiKey: null,
  defaultTemplateId: null,
  emailSignature: null,
  autoSaveInterval: 30,
  notificationsEnabled: true,
  availabilityBlock: null,
  autoRunEmailFinding: false,
  autoRunInserts: false,
  autoRunDrafts: false,
  didntConnectEnabled: false,
  didntConnectDays: 14,
}

async function upsertSettings(userId: string, updateData: Record<string, unknown>) {
  return prismadb.settings.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...defaultSettings, ...updateData },
  })
}

// GET - Get user settings
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id

    const settings = await prismadb.settings.findUnique({
      where: { userId },
    })

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json(
        { settings: { userId, ...defaultSettings } },
        { status: 200 }
      )
    }

    return NextResponse.json({ settings }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT - Update user settings (upsert)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = updateSettingsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const updateData = validation.data

    const settings = await upsertSettings(userId, updateData)

    return NextResponse.json({ settings }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// Validation schema for partial automation updates
const patchSettingsSchema = z.object({
  availabilityBlock: z.string().nullable().optional(),
  autoRunEmailFinding: z.boolean().optional(),
  autoRunInserts: z.boolean().optional(),
  autoRunDrafts: z.boolean().optional(),
  didntConnectEnabled: z.boolean().optional(),
  didntConnectDays: z.number().int().min(1).optional(),
})

// PATCH - Partial update of user settings
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = patchSettingsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const updateData = validation.data

    const settings = await upsertSettings(userId, updateData)

    return NextResponse.json({ settings }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
