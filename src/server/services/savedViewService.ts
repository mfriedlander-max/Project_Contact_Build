import { prismadb } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// Simple sanitization to strip HTML tags
function sanitizeName(name: string): string {
  return name.replace(/<[^>]*>/g, '').trim()
}

export const savedViewService = {
  async create(
    userId: string,
    input: {
      name: string
      filters: Record<string, unknown>
      sort?: Record<string, unknown>
    }
  ): Promise<{
    id: string
    name: string
    filters: Record<string, unknown>
    sort?: Record<string, unknown>
  }> {
    const sanitizedName = sanitizeName(input.name)

    if (!sanitizedName) {
      throw new Error('View name is required')
    }

    const savedView = await prismadb.savedView.create({
      data: {
        userId,
        name: sanitizedName,
        filters: input.filters as Prisma.InputJsonValue,
        sort: (input.sort ?? undefined) as Prisma.InputJsonValue | undefined,
        columns: [],
        isDefault: false,
      },
    })

    return {
      id: savedView.id,
      name: savedView.name,
      filters: savedView.filters as Record<string, unknown>,
      sort: savedView.sort as Record<string, unknown> | undefined,
    }
  },
}
