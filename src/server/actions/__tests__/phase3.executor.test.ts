import { describe, it, expect, vi } from 'vitest'
import { createExecutor, type ExecutorDeps } from '../executor'
import { createActionLogger } from '../actionLogger'
import { AiActionType, AiMode } from '@/lib/types/enums'
import { CampaignRunState } from '../campaignRunner'

function createMockDeps(): ExecutorDeps {
  return {
    searchProvider: {
      search: vi.fn().mockResolvedValue([]),
    },
    stagingService: {
      stageContacts: vi.fn().mockResolvedValue([]),
      getStagedList: vi.fn().mockResolvedValue([]),
      deleteStagedRow: vi.fn().mockResolvedValue(undefined),
    },
    approveService: {
      approve: vi.fn().mockResolvedValue({ id: 'c-1', name: 'Test', contactCount: 1 }),
    },
    campaignRunner: {
      isRunning: vi.fn().mockResolvedValue(false),
      getStatus: vi.fn().mockResolvedValue(null),
      startEmailFinding: vi.fn().mockResolvedValue({
        campaignId: 'c-1', state: CampaignRunState.EMAIL_FINDING_RUNNING,
        processedCount: 0, totalCount: 5, errors: [],
      }),
      startInserts: vi.fn().mockResolvedValue({
        campaignId: 'c-1', state: CampaignRunState.INSERTS_RUNNING,
        processedCount: 0, totalCount: 5, errors: [],
      }),
      startDrafts: vi.fn().mockResolvedValue({
        campaignId: 'c-1', state: CampaignRunState.DRAFTS_RUNNING,
        processedCount: 0, totalCount: 5, errors: [],
      }),
      startSending: vi.fn().mockResolvedValue({
        campaignId: 'c-1', state: CampaignRunState.SENDING_RUNNING,
        processedCount: 0, totalCount: 5, errors: [],
      }),
      transition: vi.fn().mockResolvedValue({
        campaignId: 'c-1', state: CampaignRunState.EMAIL_FINDING_COMPLETE,
        processedCount: 5, totalCount: 5, errors: [],
      }),
      canTransition: vi.fn().mockReturnValue(true),
    },
    stageExecutors: {
      emailFinding: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
      inserts: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
      drafts: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
      send: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
    },
    contactService: {
      query: vi.fn().mockResolvedValue([]),
      moveStage: vi.fn().mockResolvedValue({ id: 'ct-1', name: 'A', company: 'B', stage: 'NEW', campaignId: 'c-1' }),
      updateField: vi.fn().mockResolvedValue({ id: 'ct-1', name: 'A', company: 'B', stage: 'NEW', campaignId: 'c-1' }),
      bulkUpdate: vi.fn().mockResolvedValue(3),
      deleteContacts: vi.fn().mockResolvedValue(2),
    },
    savedViewService: {
      create: vi.fn().mockResolvedValue({ id: 'v-1', name: 'View', filters: {} }),
    },
    logger: createActionLogger(),
  }
}

describe('createExecutor', () => {
  it('should route FIND_CONTACTS to handler', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.FIND_CONTACTS, payload: { query: 'tech founders' } },
      { userId: 'u-1', currentMode: AiMode.CONTACT_FINDER }
    )
    expect(result.success).toBe(true)
    expect(deps.searchProvider.search).toHaveBeenCalled()
  })

  it('should route SHOW_STAGED_RESULTS to handler', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.SHOW_STAGED_RESULTS, payload: {} },
      { userId: 'u-1', currentMode: AiMode.CONTACT_FINDER }
    )
    expect(result.success).toBe(true)
    expect(deps.stagingService.getStagedList).toHaveBeenCalledWith('u-1')
  })

  it('should route QUERY_CONTACTS to handler', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.QUERY_CONTACTS, payload: { filters: {} } },
      { userId: 'u-1', currentMode: AiMode.GENERAL_MANAGER }
    )
    expect(result.success).toBe(true)
    expect(deps.contactService.query).toHaveBeenCalled()
  })

  it('should reject wrong mode', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.FIND_CONTACTS, payload: { query: 'tech founders' } },
      { userId: 'u-1', currentMode: AiMode.GENERAL_MANAGER }
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('requires mode')
  })

  it('should require confirmation for APPROVE_STAGED_LIST', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.APPROVE_STAGED_LIST, payload: { campaignName: 'Test', keptContactIds: ['s-1'] } },
      { userId: 'u-1', currentMode: AiMode.CONTACT_FINDER }
    )
    expect(result.success).toBe(false)
    expect(result.requiresConfirmation).toBe(true)
  })

  it('should allow confirmed action', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.APPROVE_STAGED_LIST, payload: { campaignName: 'Test', keptContactIds: ['s-1'] }, userConfirmed: true },
      { userId: 'u-1', currentMode: AiMode.CONTACT_FINDER }
    )
    expect(result.success).toBe(true)
    expect(deps.approveService.approve).toHaveBeenCalled()
  })

  it('should log actions via logger', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    await executor.execute(
      { type: AiActionType.SHOW_STAGED_RESULTS, payload: {} },
      { userId: 'u-1', currentMode: AiMode.CONTACT_FINDER }
    )
    const stats = deps.logger.getActionStats('u-1')
    expect(stats.totalActions).toBe(1)
    expect(stats.successRate).toBe(1)
  })

  it('should log failed actions', async () => {
    const deps = createMockDeps()
    deps.stagingService.getStagedList = vi.fn().mockRejectedValue(new Error('fail'))
    const executor = createExecutor(deps)
    await executor.execute(
      { type: AiActionType.SHOW_STAGED_RESULTS, payload: {} },
      { userId: 'u-1', currentMode: AiMode.CONTACT_FINDER }
    )
    const stats = deps.logger.getActionStats('u-1')
    expect(stats.totalActions).toBe(1)
    expect(stats.successRate).toBe(0)
  })

  it('should route MOVE_STAGE to handler', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.MOVE_STAGE, payload: { contactId: 'ct-1', newStage: 'EMAIL_FOUND' } },
      { userId: 'u-1', currentMode: AiMode.ASSISTANT }
    )
    expect(result.success).toBe(true)
    expect(deps.contactService.moveStage).toHaveBeenCalled()
  })

  it('should route DELETE_CONTACTS with confirmation', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.DELETE_CONTACTS, payload: { contactIds: ['ct-1'] }, userConfirmed: true },
      { userId: 'u-1', currentMode: AiMode.ASSISTANT }
    )
    expect(result.success).toBe(true)
    expect(deps.contactService.deleteContacts).toHaveBeenCalled()
  })

  it('should route CREATE_SAVED_VIEW to handler', async () => {
    const deps = createMockDeps()
    const executor = createExecutor(deps)
    const result = await executor.execute(
      { type: AiActionType.CREATE_SAVED_VIEW, payload: { name: 'My View', filters: {} } },
      { userId: 'u-1', currentMode: AiMode.GENERAL_MANAGER }
    )
    expect(result.success).toBe(true)
    expect(deps.savedViewService.create).toHaveBeenCalled()
  })
})
