import { NextResponse, NextRequest } from 'next/server'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// Validation schema
const upsertIntegrationSchema = z.object({
  provider: z.enum(['GMAIL', 'HUNTER', 'SEARCH_PROVIDER', 'OUTLOOK']),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  scope: z.string().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
})

// Redact sensitive fields for API responses
function redactIntegration(integration: Record<string, unknown>) {
  const { accessToken, refreshToken, ...safe } = integration
  return safe
}

// GET - List all integrations or get single integration by provider
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')

    if (provider) {
      const integration = await prismadb.integrationConnection.findFirst({
        where: { userId, provider: provider as 'GMAIL' | 'HUNTER' | 'SEARCH_PROVIDER' | 'OUTLOOK' },
      })

      return NextResponse.json(
        { integration: integration ? redactIntegration(integration) : null },
        { status: 200 }
      )
    }

    const integrations = await prismadb.integrationConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      { integrations: integrations.map(redactIntegration) },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}

// PUT - Create or update integration (upsert)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = upsertIntegrationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { provider, expiresAt, metadata, ...updateData } = validation.data

    const updatePayload: Prisma.IntegrationConnectionUpdateInput = {
      ...updateData,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {}),
    }

    const createPayload: Prisma.IntegrationConnectionCreateInput = {
      user: { connect: { id: userId } },
      provider,
      ...updateData,
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {}),
      isActive: updateData.isActive ?? true,
    }

    const integration = await prismadb.integrationConnection.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      update: updatePayload,
      create: createPayload,
    })

    return NextResponse.json(
      { integration: redactIntegration(integration) },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    )
  }
}

// DELETE - Remove integration
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json(
        { error: 'Integration provider is required' },
        { status: 400 }
      )
    }

    // Verify existence
    const existing = await prismadb.integrationConnection.findFirst({
      where: { userId, provider: provider as 'GMAIL' | 'HUNTER' | 'SEARCH_PROVIDER' | 'OUTLOOK' },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    await prismadb.integrationConnection.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    )
  }
}
