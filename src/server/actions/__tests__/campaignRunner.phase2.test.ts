import { describe, it, expect, vi } from 'vitest'
import {
  createCampaignRunner,
  type CampaignRunStore,
  type CampaignService,
} from '../campaignRunner'
import { CampaignRunState } from '@/lib/types/enums'

function createMockStore(overrides: Partial<CampaignRunStore> = {}): CampaignRunStore {
  return {
    getActiveRun: vi.fn().mockResolvedValue(null),
    getRun: vi.fn().mockResolvedValue(null),
    createRun: vi.fn().mockResolvedValue(undefined),
    updateRun: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createMockCampaignService(
  overrides: Partial<CampaignService> = {}
): CampaignService {
  return {
    getContactCount: vi.fn().mockResolvedValue(10),
    ...overrides,
  }
}

describe('Campaign Runner Phase 2', () => {
  describe('isRunning', () => {
    it('should return false when no active run exists', async () => {
      const store = createMockStore()
      const runner = createCampaignRunner({ store })

      const result = await runner.isRunning('user-1')

      expect(result).toBe(false)
      expect(store.getActiveRun).toHaveBeenCalledWith('user-1')
    })

    it('should return true when an active run exists', async () => {
      const store = createMockStore({
        getActiveRun: vi.fn().mockResolvedValue({
          campaignId: 'c-1',
          state: CampaignRunState.EMAIL_FINDING_RUNNING,
          processedCount: 0,
          totalCount: 10,
          errors: [],
        }),
      })
      const runner = createCampaignRunner({ store })

      const result = await runner.isRunning('user-1')

      expect(result).toBe(true)
    })
  })

  describe('getStatus', () => {
    it('should return null when no run exists', async () => {
      const store = createMockStore()
      const runner = createCampaignRunner({ store })

      const result = await runner.getStatus('c-1')

      expect(result).toBeNull()
      expect(store.getRun).toHaveBeenCalledWith('c-1')
    })

    it('should return progress when run exists', async () => {
      const progress = {
        campaignId: 'c-1',
        state: CampaignRunState.INSERTS_RUNNING,
        processedCount: 5,
        totalCount: 10,
        errors: [],
        startedAt: new Date(),
      }
      const store = createMockStore({
        getRun: vi.fn().mockResolvedValue(progress),
      })
      const runner = createCampaignRunner({ store })

      const result = await runner.getStatus('c-1')

      expect(result).toEqual(progress)
    })
  })

  describe('startEmailFinding', () => {
    it('should reject when another campaign is running', async () => {
      const store = createMockStore({
        getActiveRun: vi.fn().mockResolvedValue({
          campaignId: 'other',
          state: CampaignRunState.EMAIL_FINDING_RUNNING,
          processedCount: 0,
          totalCount: 5,
          errors: [],
        }),
      })
      const runner = createCampaignRunner({ store })

      await expect(runner.startEmailFinding('u-1', 'c-1')).rejects.toThrow(
        'Another campaign is already running'
      )
    })

    it('should reject when campaign has more than 30 contacts', async () => {
      const store = createMockStore()
      const campaignService = createMockCampaignService({
        getContactCount: vi.fn().mockResolvedValue(31),
      })
      const runner = createCampaignRunner({ store, campaignService })

      await expect(runner.startEmailFinding('u-1', 'c-1')).rejects.toThrow(
        'exceeds maximum of 30'
      )
    })

    it('should create run with EMAIL_FINDING_RUNNING state', async () => {
      const store = createMockStore()
      const campaignService = createMockCampaignService()
      const runner = createCampaignRunner({ store, campaignService })

      const result = await runner.startEmailFinding('u-1', 'c-1')

      expect(result.state).toBe(CampaignRunState.EMAIL_FINDING_RUNNING)
      expect(result.campaignId).toBe('c-1')
      expect(result.processedCount).toBe(0)
      expect(result.totalCount).toBe(10)
      expect(result.errors).toEqual([])
      expect(result.startedAt).toBeInstanceOf(Date)
      expect(store.createRun).toHaveBeenCalled()
    })
  })

  describe('startInserts', () => {
    it('should reject when another campaign is running', async () => {
      const store = createMockStore({
        getActiveRun: vi.fn().mockResolvedValue({
          campaignId: 'other',
          state: CampaignRunState.INSERTS_RUNNING,
          processedCount: 0,
          totalCount: 5,
          errors: [],
        }),
      })
      const runner = createCampaignRunner({ store })

      await expect(runner.startInserts('u-1', 'c-1')).rejects.toThrow(
        'Another campaign is already running'
      )
    })

    it('should create run with INSERTS_RUNNING state', async () => {
      const store = createMockStore()
      const campaignService = createMockCampaignService()
      const runner = createCampaignRunner({ store, campaignService })

      const result = await runner.startInserts('u-1', 'c-1')

      expect(result.state).toBe(CampaignRunState.INSERTS_RUNNING)
      expect(result.campaignId).toBe('c-1')
      expect(store.createRun).toHaveBeenCalled()
    })
  })

  describe('startDrafts', () => {
    it('should reject when another campaign is running', async () => {
      const store = createMockStore({
        getActiveRun: vi.fn().mockResolvedValue({
          campaignId: 'other',
          state: CampaignRunState.DRAFTS_RUNNING,
          processedCount: 0,
          totalCount: 5,
          errors: [],
        }),
      })
      const runner = createCampaignRunner({ store })

      await expect(runner.startDrafts('u-1', 'c-1', 't-1')).rejects.toThrow(
        'Another campaign is already running'
      )
    })

    it('should create run with DRAFTS_RUNNING state and templateId', async () => {
      const store = createMockStore()
      const campaignService = createMockCampaignService()
      const runner = createCampaignRunner({ store, campaignService })

      const result = await runner.startDrafts('u-1', 'c-1', 't-1')

      expect(result.state).toBe(CampaignRunState.DRAFTS_RUNNING)
      expect(result.campaignId).toBe('c-1')
    })
  })

  describe('startSending', () => {
    it('should reject when another campaign is running', async () => {
      const store = createMockStore({
        getActiveRun: vi.fn().mockResolvedValue({
          campaignId: 'other',
          state: CampaignRunState.SENDING_RUNNING,
          processedCount: 0,
          totalCount: 5,
          errors: [],
        }),
      })
      const runner = createCampaignRunner({ store })

      await expect(runner.startSending('u-1', 'c-1')).rejects.toThrow(
        'Another campaign is already running'
      )
    })

    it('should create run with SENDING_RUNNING state', async () => {
      const store = createMockStore()
      const campaignService = createMockCampaignService()
      const runner = createCampaignRunner({ store, campaignService })

      const result = await runner.startSending('u-1', 'c-1')

      expect(result.state).toBe(CampaignRunState.SENDING_RUNNING)
      expect(result.campaignId).toBe('c-1')
    })
  })

  describe('transition', () => {
    it('should execute valid transition', async () => {
      const existingRun = {
        campaignId: 'c-1',
        state: CampaignRunState.EMAIL_FINDING_RUNNING,
        processedCount: 10,
        totalCount: 10,
        errors: [],
        startedAt: new Date(),
      }
      const store = createMockStore({
        getRun: vi.fn().mockResolvedValue(existingRun),
      })
      const runner = createCampaignRunner({ store })

      const result = await runner.transition(
        'c-1',
        CampaignRunState.EMAIL_FINDING_RUNNING,
        CampaignRunState.INSERTS_RUNNING
      )

      expect(result.state).toBe(CampaignRunState.INSERTS_RUNNING)
      expect(store.updateRun).toHaveBeenCalled()
    })

    it('should reject invalid transition', async () => {
      const existingRun = {
        campaignId: 'c-1',
        state: CampaignRunState.IDLE,
        processedCount: 0,
        totalCount: 10,
        errors: [],
      }
      const store = createMockStore({
        getRun: vi.fn().mockResolvedValue(existingRun),
      })
      const runner = createCampaignRunner({ store })

      await expect(
        runner.transition('c-1', CampaignRunState.IDLE, CampaignRunState.COMPLETE)
      ).rejects.toThrow('Invalid state transition')
    })

    it('should reject when current state does not match expected', async () => {
      const existingRun = {
        campaignId: 'c-1',
        state: CampaignRunState.INSERTS_RUNNING,
        processedCount: 0,
        totalCount: 10,
        errors: [],
      }
      const store = createMockStore({
        getRun: vi.fn().mockResolvedValue(existingRun),
      })
      const runner = createCampaignRunner({ store })

      await expect(
        runner.transition(
          'c-1',
          CampaignRunState.EMAIL_FINDING_RUNNING,
          CampaignRunState.INSERTS_RUNNING
        )
      ).rejects.toThrow('Current state mismatch')
    })

    it('should reject when no run exists', async () => {
      const store = createMockStore()
      const runner = createCampaignRunner({ store })

      await expect(
        runner.transition('c-1', CampaignRunState.IDLE, CampaignRunState.EMAIL_FINDING_RUNNING)
      ).rejects.toThrow('No run found')
    })

    it('should set completedAt when transitioning to COMPLETE', async () => {
      const existingRun = {
        campaignId: 'c-1',
        state: CampaignRunState.SENDING_RUNNING,
        processedCount: 10,
        totalCount: 10,
        errors: [],
        startedAt: new Date(),
      }
      const store = createMockStore({
        getRun: vi.fn().mockResolvedValue(existingRun),
      })
      const runner = createCampaignRunner({ store })

      const result = await runner.transition(
        'c-1',
        CampaignRunState.SENDING_RUNNING,
        CampaignRunState.COMPLETE
      )

      expect(result.completedAt).toBeInstanceOf(Date)
    })
  })
})
