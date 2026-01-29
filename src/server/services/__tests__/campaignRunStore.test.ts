import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrismaCampaignRunStore } from '../campaignRunStore'
import { CampaignRunState } from '@/lib/types/enums'
import type { CampaignRunProgress } from '@/src/server/actions/campaignRunner'

// Mock PrismaClient
function createMockPrisma() {
  return {
    campaignRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }
}

describe('createPrismaCampaignRunStore', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>
  let store: ReturnType<typeof createPrismaCampaignRunStore>

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store = createPrismaCampaignRunStore(mockPrisma as any)
  })

  describe('getActiveRun', () => {
    it('returns null when no active run exists', async () => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue(null)

      const result = await store.getActiveRun('user-1')

      expect(result).toBeNull()
      expect(mockPrisma.campaignRun.findFirst).toHaveBeenCalledWith({
        where: {
          campaign: { userId: 'user-1' },
          state: { notIn: [CampaignRunState.COMPLETE, CampaignRunState.FAILED, CampaignRunState.IDLE] },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('returns mapped progress when active run exists', async () => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue({
        campaignId: 'camp-1',
        state: CampaignRunState.EMAIL_FINDING_RUNNING,
        startedAt: new Date('2026-01-01'),
        completedAt: null,
        emailsFindingTotal: 10,
        emailsFindingComplete: 3,
        insertsTotal: 0,
        insertsComplete: 0,
        draftsTotal: 0,
        draftsComplete: 0,
        sendingTotal: 0,
        sendingComplete: 0,
        errorMessage: null,
      })

      const result = await store.getActiveRun('user-1')

      expect(result).toEqual({
        campaignId: 'camp-1',
        state: CampaignRunState.EMAIL_FINDING_RUNNING,
        processedCount: 3,
        totalCount: 10,
        errors: [],
        startedAt: new Date('2026-01-01'),
        completedAt: undefined,
      })
    })

    it('maps error messages to errors array', async () => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue({
        campaignId: 'camp-1',
        state: CampaignRunState.FAILED,
        startedAt: new Date('2026-01-01'),
        completedAt: null,
        emailsFindingTotal: 0,
        emailsFindingComplete: 0,
        insertsTotal: 0,
        insertsComplete: 0,
        draftsTotal: 0,
        draftsComplete: 0,
        sendingTotal: 0,
        sendingComplete: 0,
        errorMessage: 'Something went wrong',
      })

      const result = await store.getActiveRun('user-1')

      expect(result?.errors).toEqual([
        { contactId: '', error: 'Something went wrong', stage: CampaignRunState.FAILED },
      ])
    })
  })

  describe('getRun', () => {
    it('returns null when no run found for campaign', async () => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue(null)

      const result = await store.getRun('camp-1')

      expect(result).toBeNull()
      expect(mockPrisma.campaignRun.findFirst).toHaveBeenCalledWith({
        where: { campaignId: 'camp-1' },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('returns progress for existing run', async () => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue({
        campaignId: 'camp-1',
        state: CampaignRunState.DRAFTS_RUNNING,
        startedAt: new Date('2026-01-01'),
        completedAt: null,
        emailsFindingTotal: 10,
        emailsFindingComplete: 10,
        insertsTotal: 10,
        insertsComplete: 10,
        draftsTotal: 10,
        draftsComplete: 5,
        sendingTotal: 0,
        sendingComplete: 0,
        errorMessage: null,
      })

      const result = await store.getRun('camp-1')

      expect(result?.state).toBe(CampaignRunState.DRAFTS_RUNNING)
      expect(result?.processedCount).toBe(5)
      expect(result?.totalCount).toBe(10)
    })
  })

  describe('createRun', () => {
    it('creates a new campaign run record', async () => {
      mockPrisma.campaignRun.create.mockResolvedValue({})

      const progress: CampaignRunProgress = {
        campaignId: 'camp-1',
        state: CampaignRunState.EMAIL_FINDING_RUNNING,
        processedCount: 0,
        totalCount: 15,
        errors: [],
        startedAt: new Date('2026-01-01'),
      }

      await store.createRun(progress)

      expect(mockPrisma.campaignRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          campaignId: 'camp-1',
          state: CampaignRunState.EMAIL_FINDING_RUNNING,
          startedAt: new Date('2026-01-01'),
          emailsFindingTotal: 15,
          emailsFindingComplete: 0,
        }),
      })
    })
  })

  describe('updateRun', () => {
    it('updates existing run', async () => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue({ id: 'run-1' })
      mockPrisma.campaignRun.update.mockResolvedValue({})

      const progress: CampaignRunProgress = {
        campaignId: 'camp-1',
        state: CampaignRunState.EMAIL_FINDING_RUNNING,
        processedCount: 7,
        totalCount: 15,
        errors: [],
      }

      await store.updateRun(progress)

      expect(mockPrisma.campaignRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          state: CampaignRunState.EMAIL_FINDING_RUNNING,
          emailsFindingComplete: 7,
          emailsFindingTotal: 15,
        }),
      })
    })

    it('throws when no run found', async () => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue(null)

      const progress: CampaignRunProgress = {
        campaignId: 'camp-1',
        state: CampaignRunState.COMPLETE,
        processedCount: 0,
        totalCount: 0,
        errors: [],
      }

      await expect(store.updateRun(progress)).rejects.toThrow('No run found for campaign camp-1')
    })
  })

  describe('state-specific count mapping', () => {
    it.each([
      { state: CampaignRunState.INSERTS_RUNNING, field: 'insertsComplete', totalField: 'insertsTotal' },
      { state: CampaignRunState.SENDING_RUNNING, field: 'sendingComplete', totalField: 'sendingTotal' },
    ])('maps $state to correct fields', async ({ state, field, totalField }) => {
      mockPrisma.campaignRun.findFirst.mockResolvedValue({
        campaignId: 'camp-1',
        state,
        startedAt: null,
        completedAt: null,
        emailsFindingTotal: 0,
        emailsFindingComplete: 0,
        insertsTotal: state === CampaignRunState.INSERTS_RUNNING ? 20 : 0,
        insertsComplete: state === CampaignRunState.INSERTS_RUNNING ? 8 : 0,
        draftsTotal: 0,
        draftsComplete: 0,
        sendingTotal: state === CampaignRunState.SENDING_RUNNING ? 20 : 0,
        sendingComplete: state === CampaignRunState.SENDING_RUNNING ? 8 : 0,
        errorMessage: null,
      })

      const result = await store.getRun('camp-1')

      expect(result?.processedCount).toBe(8)
      expect(result?.totalCount).toBe(20)
    })
  })
})
