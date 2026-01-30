import { describe, it, expect, vi } from 'vitest'
import {
  CampaignRunState,
  VALID_TRANSITIONS,
  campaignRunner,
  createCampaignRunner,
  type CampaignRunProgress,
  type CampaignRunStore,
} from '../campaignRunner'

describe('Campaign Runner', () => {
  describe('CampaignRunState enum', () => {
    it('should have IDLE state', () => {
      expect(CampaignRunState.IDLE).toBe('IDLE')
    })

    it('should have running states', () => {
      expect(CampaignRunState.EMAIL_FINDING_RUNNING).toBe('EMAIL_FINDING_RUNNING')
      expect(CampaignRunState.INSERTS_RUNNING).toBe('INSERTS_RUNNING')
      expect(CampaignRunState.DRAFTS_RUNNING).toBe('DRAFTS_RUNNING')
      expect(CampaignRunState.SENDING_RUNNING).toBe('SENDING_RUNNING')
    })

    it('should have terminal states', () => {
      expect(CampaignRunState.COMPLETE).toBe('COMPLETE')
      expect(CampaignRunState.FAILED).toBe('FAILED')
    })

    it('should have exactly 7 states', () => {
      const states = Object.values(CampaignRunState)
      expect(states).toHaveLength(7)
    })
  })

  describe('VALID_TRANSITIONS', () => {
    it('should allow IDLE to EMAIL_FINDING_RUNNING or INSERTS_RUNNING', () => {
      // Central state machine allows skipping email finding if emails are already known
      const transitions = VALID_TRANSITIONS[CampaignRunState.IDLE]
      expect(transitions).toContain(CampaignRunState.EMAIL_FINDING_RUNNING)
      expect(transitions).toContain(CampaignRunState.INSERTS_RUNNING)
    })

    it('should allow EMAIL_FINDING_RUNNING to INSERTS_RUNNING or FAILED', () => {
      const transitions = VALID_TRANSITIONS[CampaignRunState.EMAIL_FINDING_RUNNING]
      expect(transitions).toContain(CampaignRunState.INSERTS_RUNNING)
      expect(transitions).toContain(CampaignRunState.FAILED)
    })

    it('should allow INSERTS_RUNNING to DRAFTS_RUNNING or FAILED', () => {
      const transitions = VALID_TRANSITIONS[CampaignRunState.INSERTS_RUNNING]
      expect(transitions).toContain(CampaignRunState.DRAFTS_RUNNING)
      expect(transitions).toContain(CampaignRunState.FAILED)
    })

    it('should allow DRAFTS_RUNNING to SENDING_RUNNING or FAILED', () => {
      // Note: Central state machine requires going through SENDING stage
      // DRAFTS_RUNNING cannot skip directly to COMPLETE
      const transitions = VALID_TRANSITIONS[CampaignRunState.DRAFTS_RUNNING]
      expect(transitions).toContain(CampaignRunState.SENDING_RUNNING)
      expect(transitions).toContain(CampaignRunState.FAILED)
      expect(transitions).not.toContain(CampaignRunState.COMPLETE)
    })

    it('should allow SENDING_RUNNING to COMPLETE or FAILED', () => {
      const transitions = VALID_TRANSITIONS[CampaignRunState.SENDING_RUNNING]
      expect(transitions).toContain(CampaignRunState.COMPLETE)
      expect(transitions).toContain(CampaignRunState.FAILED)
    })

    it('should make COMPLETE a terminal state (no transitions)', () => {
      expect(VALID_TRANSITIONS[CampaignRunState.COMPLETE]).toHaveLength(0)
    })

    it('should allow FAILED to return to IDLE for retry', () => {
      expect(VALID_TRANSITIONS[CampaignRunState.FAILED]).toContain(CampaignRunState.IDLE)
    })

    it('should have transitions defined for all states', () => {
      const states = Object.values(CampaignRunState)
      for (const state of states) {
        expect(VALID_TRANSITIONS[state]).toBeDefined()
        expect(Array.isArray(VALID_TRANSITIONS[state])).toBe(true)
      }
    })
  })

  describe('campaignRunner.canTransition', () => {
    it('should return true for valid transition IDLE -> EMAIL_FINDING_RUNNING', () => {
      expect(
        campaignRunner.canTransition(CampaignRunState.IDLE, CampaignRunState.EMAIL_FINDING_RUNNING)
      ).toBe(true)
    })

    it('should return true for valid transition EMAIL_FINDING_RUNNING -> INSERTS_RUNNING', () => {
      expect(
        campaignRunner.canTransition(
          CampaignRunState.EMAIL_FINDING_RUNNING,
          CampaignRunState.INSERTS_RUNNING
        )
      ).toBe(true)
    })

    it('should return true for valid transition to FAILED from any running state', () => {
      expect(
        campaignRunner.canTransition(CampaignRunState.EMAIL_FINDING_RUNNING, CampaignRunState.FAILED)
      ).toBe(true)
      expect(
        campaignRunner.canTransition(CampaignRunState.INSERTS_RUNNING, CampaignRunState.FAILED)
      ).toBe(true)
      expect(
        campaignRunner.canTransition(CampaignRunState.DRAFTS_RUNNING, CampaignRunState.FAILED)
      ).toBe(true)
      expect(
        campaignRunner.canTransition(CampaignRunState.SENDING_RUNNING, CampaignRunState.FAILED)
      ).toBe(true)
    })

    it('should return true for FAILED -> IDLE (retry)', () => {
      expect(campaignRunner.canTransition(CampaignRunState.FAILED, CampaignRunState.IDLE)).toBe(
        true
      )
    })

    it('should return false for invalid transition IDLE -> COMPLETE', () => {
      expect(campaignRunner.canTransition(CampaignRunState.IDLE, CampaignRunState.COMPLETE)).toBe(
        false
      )
    })

    it('should return false for invalid transition IDLE -> DRAFTS_RUNNING (skipping stages)', () => {
      expect(
        campaignRunner.canTransition(CampaignRunState.IDLE, CampaignRunState.DRAFTS_RUNNING)
      ).toBe(false)
    })

    it('should return false for invalid transition COMPLETE -> any state', () => {
      expect(campaignRunner.canTransition(CampaignRunState.COMPLETE, CampaignRunState.IDLE)).toBe(
        false
      )
      expect(
        campaignRunner.canTransition(
          CampaignRunState.COMPLETE,
          CampaignRunState.EMAIL_FINDING_RUNNING
        )
      ).toBe(false)
    })

    it('should return false for backward transitions', () => {
      expect(
        campaignRunner.canTransition(CampaignRunState.INSERTS_RUNNING, CampaignRunState.IDLE)
      ).toBe(false)
      expect(
        campaignRunner.canTransition(
          CampaignRunState.DRAFTS_RUNNING,
          CampaignRunState.EMAIL_FINDING_RUNNING
        )
      ).toBe(false)
    })
  })

  describe('campaignRunner.isRunning', () => {
    it('should return true when store has active non-terminal run', async () => {
      const store: CampaignRunStore = {
        getActiveRun: vi.fn().mockResolvedValue({
          campaignId: 'c1',
          state: CampaignRunState.EMAIL_FINDING_RUNNING,
          processedCount: 0,
          totalCount: 10,
          errors: [],
        }),
        getRun: vi.fn(),
        createRun: vi.fn(),
        updateRun: vi.fn(),
      }
      const runner = createCampaignRunner({ store })
      expect(await runner.isRunning('user-123')).toBe(true)
    })

    it('should return false when store returns null', async () => {
      const store: CampaignRunStore = {
        getActiveRun: vi.fn().mockResolvedValue(null),
        getRun: vi.fn(),
        createRun: vi.fn(),
        updateRun: vi.fn(),
      }
      const runner = createCampaignRunner({ store })
      expect(await runner.isRunning('user-123')).toBe(false)
    })
  })

  describe('campaignRunner.getStatus', () => {
    it('should return progress from store.getRun', async () => {
      const progress: CampaignRunProgress = {
        campaignId: 'campaign-123',
        state: CampaignRunState.DRAFTS_RUNNING,
        processedCount: 5,
        totalCount: 10,
        errors: [],
        startedAt: new Date(),
      }
      const store: CampaignRunStore = {
        getActiveRun: vi.fn(),
        getRun: vi.fn().mockResolvedValue(progress),
        createRun: vi.fn(),
        updateRun: vi.fn(),
      }
      const runner = createCampaignRunner({ store })
      expect(await runner.getStatus('campaign-123')).toEqual(progress)
    })
  })

  describe('campaignRunner.startEmailFinding', () => {
    it('should call store.createRun with EMAIL_FINDING_RUNNING state', async () => {
      const store: CampaignRunStore = {
        getActiveRun: vi.fn().mockResolvedValue(null),
        getRun: vi.fn(),
        createRun: vi.fn().mockResolvedValue(undefined),
        updateRun: vi.fn(),
      }
      const runner = createCampaignRunner({ store })
      const result = await runner.startEmailFinding('user-123', 'campaign-123')
      expect(result.state).toBe(CampaignRunState.EMAIL_FINDING_RUNNING)
      expect(store.createRun).toHaveBeenCalledOnce()
    })
  })

  describe('campaignRunner.startInserts', () => {
    it('should call store.createRun with INSERTS_RUNNING state', async () => {
      const store: CampaignRunStore = {
        getActiveRun: vi.fn().mockResolvedValue(null),
        getRun: vi.fn(),
        createRun: vi.fn().mockResolvedValue(undefined),
        updateRun: vi.fn(),
      }
      const runner = createCampaignRunner({ store })
      const result = await runner.startInserts('user-123', 'campaign-123')
      expect(result.state).toBe(CampaignRunState.INSERTS_RUNNING)
      expect(store.createRun).toHaveBeenCalledOnce()
    })
  })

  describe('campaignRunner.startDrafts', () => {
    it('should call store.createRun with DRAFTS_RUNNING state', async () => {
      const store: CampaignRunStore = {
        getActiveRun: vi.fn().mockResolvedValue(null),
        getRun: vi.fn(),
        createRun: vi.fn().mockResolvedValue(undefined),
        updateRun: vi.fn(),
      }
      const runner = createCampaignRunner({ store })
      const result = await runner.startDrafts('user-123', 'campaign-123', 'template-123')
      expect(result.state).toBe(CampaignRunState.DRAFTS_RUNNING)
      expect(store.createRun).toHaveBeenCalledOnce()
    })
  })

  describe('campaignRunner.startSending', () => {
    it('should call store.createRun with SENDING_RUNNING state', async () => {
      const store: CampaignRunStore = {
        getActiveRun: vi.fn().mockResolvedValue(null),
        getRun: vi.fn(),
        createRun: vi.fn().mockResolvedValue(undefined),
        updateRun: vi.fn(),
      }
      const runner = createCampaignRunner({ store })
      const result = await runner.startSending('user-123', 'campaign-123')
      expect(result.state).toBe(CampaignRunState.SENDING_RUNNING)
      expect(store.createRun).toHaveBeenCalledOnce()
    })
  })

  describe('CampaignRunProgress type', () => {
    it('should allow valid progress structure', () => {
      const progress: CampaignRunProgress = {
        campaignId: 'campaign-123',
        state: CampaignRunState.EMAIL_FINDING_RUNNING,
        processedCount: 5,
        totalCount: 30,
        errors: [],
        startedAt: new Date(),
      }

      expect(progress.campaignId).toBe('campaign-123')
      expect(progress.state).toBe(CampaignRunState.EMAIL_FINDING_RUNNING)
      expect(progress.processedCount).toBe(5)
      expect(progress.totalCount).toBe(30)
    })

    it('should allow progress with errors', () => {
      const progress: CampaignRunProgress = {
        campaignId: 'campaign-123',
        state: CampaignRunState.FAILED,
        processedCount: 10,
        totalCount: 30,
        errors: [
          {
            contactId: 'contact-1',
            error: 'Hunter API rate limit',
            stage: CampaignRunState.EMAIL_FINDING_RUNNING,
          },
          {
            contactId: 'contact-2',
            error: 'Invalid domain',
            stage: CampaignRunState.EMAIL_FINDING_RUNNING,
          },
        ],
        startedAt: new Date('2026-01-01'),
        completedAt: new Date('2026-01-01'),
      }

      expect(progress.errors).toHaveLength(2)
      expect(progress.errors[0].contactId).toBe('contact-1')
      expect(progress.errors[0].stage).toBe(CampaignRunState.EMAIL_FINDING_RUNNING)
    })

    it('should allow completed progress', () => {
      const progress: CampaignRunProgress = {
        campaignId: 'campaign-123',
        state: CampaignRunState.COMPLETE,
        processedCount: 30,
        totalCount: 30,
        errors: [],
        startedAt: new Date('2026-01-01T10:00:00'),
        completedAt: new Date('2026-01-01T10:15:00'),
      }

      expect(progress.state).toBe(CampaignRunState.COMPLETE)
      expect(progress.processedCount).toBe(progress.totalCount)
      expect(progress.completedAt).toBeDefined()
    })
  })
})
