import { describe, it, expect, vi, beforeEach } from 'vitest'
import { savedViewService } from '../savedViewService'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prismadb: {
    savedView: {
      create: vi.fn(),
    },
  },
}))

import { prismadb } from '@/lib/prisma'

const mockPrisma = prismadb as unknown as {
  savedView: {
    create: ReturnType<typeof vi.fn>
  }
}

describe('savedViewService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('creates a saved view with filters', async () => {
      const mockSavedView = {
        id: 'view-1',
        userId: 'user-1',
        name: 'My View',
        filters: { stage: 'DRAFTED' },
        sort: null,
        columns: [],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.savedView.create.mockResolvedValue(mockSavedView)

      const result = await savedViewService.create('user-1', {
        name: 'My View',
        filters: { stage: 'DRAFTED' },
      })

      expect(mockPrisma.savedView.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'My View',
          filters: { stage: 'DRAFTED' },
          sort: undefined,
          columns: [],
          isDefault: false,
        },
      })
      expect(result).toEqual({
        id: 'view-1',
        name: 'My View',
        filters: { stage: 'DRAFTED' },
        sort: null,
      })
    })

    it('creates a saved view with filters and sort', async () => {
      const mockSavedView = {
        id: 'view-2',
        userId: 'user-1',
        name: 'Sorted View',
        filters: { campaignId: 'camp-1' },
        sort: { field: 'name', direction: 'asc' },
        columns: [],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.savedView.create.mockResolvedValue(mockSavedView)

      const result = await savedViewService.create('user-1', {
        name: 'Sorted View',
        filters: { campaignId: 'camp-1' },
        sort: { field: 'name', direction: 'asc' },
      })

      expect(mockPrisma.savedView.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Sorted View',
          filters: { campaignId: 'camp-1' },
          sort: { field: 'name', direction: 'asc' },
          columns: [],
          isDefault: false,
        },
      })
      expect(result.sort).toEqual({ field: 'name', direction: 'asc' })
    })

    it('sanitizes name input to prevent XSS', async () => {
      const mockSavedView = {
        id: 'view-3',
        userId: 'user-1',
        name: 'Clean Name',
        filters: {},
        sort: null,
        columns: [],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.savedView.create.mockResolvedValue(mockSavedView)

      await savedViewService.create('user-1', {
        name: '<script>alert("xss")</script>Clean Name',
        filters: {},
      })

      expect(mockPrisma.savedView.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'alert("xss")Clean Name',
          }),
        })
      )
    })

    it('throws error for empty name after sanitization', async () => {
      await expect(
        savedViewService.create('user-1', {
          name: '<script></script>  ',
          filters: {},
        })
      ).rejects.toThrow('View name is required')

      expect(mockPrisma.savedView.create).not.toHaveBeenCalled()
    })
  })
})
