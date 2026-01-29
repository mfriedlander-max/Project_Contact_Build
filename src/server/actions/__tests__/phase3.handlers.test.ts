import { describe, it, expect, vi } from 'vitest'
import { handleShowStagedResults } from '../handlers/showStagedResults'
import { handleDeleteStagedRow } from '../handlers/deleteStagedRow'
import { handleApproveStagedList } from '../handlers/approveStagedList'
import { handleRunCampaignStage } from '../handlers/runCampaignStage'
import { handleQueryContacts } from '../handlers/queryContacts'
import {
  handleMoveStage,
  handleUpdateField,
  handleBulkUpdate,
  handleDeleteContacts,
} from '../handlers/mutationHandlers'
import { handleCreateSavedView } from '../handlers/createSavedView'
import { AiActionType } from '@/lib/types/enums'
import { CampaignRunState } from '../campaignRunner'
import type { StagingServiceDeps, ApproveServiceDeps, ContactServiceDeps, SavedViewServiceDeps, StageExecutors } from '../handlers/interfaces'

const ctx = { userId: 'u-1' }

function mockStagingService(overrides: Partial<StagingServiceDeps> = {}): StagingServiceDeps {
  return {
    getStagedList: vi.fn().mockResolvedValue([
      { id: 's-1', name: 'Alice', company: 'Acme', url: 'https://acme.com', snippet: 'CEO' },
    ]),
    deleteStagedRow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function mockApproveService(overrides: Partial<ApproveServiceDeps> = {}): ApproveServiceDeps {
  return {
    approve: vi.fn().mockResolvedValue({ id: 'c-1', name: 'My Campaign', contactCount: 5 }),
    ...overrides,
  }
}

function mockContactService(overrides: Partial<ContactServiceDeps> = {}): ContactServiceDeps {
  return {
    query: vi.fn().mockResolvedValue([{ id: 'ct-1', name: 'Alice', company: 'Acme', stage: 'DRAFTED', campaignId: 'c-1' }]),
    moveStage: vi.fn().mockResolvedValue({ id: 'ct-1', name: 'Alice', company: 'Acme', stage: 'EMAIL_FOUND', campaignId: 'c-1' }),
    updateField: vi.fn().mockResolvedValue({ id: 'ct-1', name: 'Alice Updated', company: 'Acme', stage: 'DRAFTED', campaignId: 'c-1' }),
    bulkUpdate: vi.fn().mockResolvedValue(3),
    deleteContacts: vi.fn().mockResolvedValue(2),
    ...overrides,
  }
}

function mockSavedViewService(overrides: Partial<SavedViewServiceDeps> = {}): SavedViewServiceDeps {
  return {
    create: vi.fn().mockResolvedValue({ id: 'v-1', name: 'My View', filters: { stage: 'DRAFTED' } }),
    ...overrides,
  }
}

function mockCampaignRunner() {
  return {
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
  }
}

function mockStageExecutors(overrides: Partial<StageExecutors> = {}): StageExecutors {
  return {
    emailFinding: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
    inserts: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
    drafts: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
    send: vi.fn().mockResolvedValue({ processedCount: 5, errors: [] }),
    ...overrides,
  }
}

// ============================================================================
// showStagedResults
// ============================================================================

describe('handleShowStagedResults', () => {
  it('should return staged contacts', async () => {
    const staging = mockStagingService()
    const result = await handleShowStagedResults({}, ctx, { stagingService: staging })
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(staging.getStagedList).toHaveBeenCalledWith('u-1')
  })

  it('should handle service errors', async () => {
    const staging = mockStagingService({
      getStagedList: vi.fn().mockRejectedValue(new Error('DB down')),
    })
    const result = await handleShowStagedResults({}, ctx, { stagingService: staging })
    expect(result.success).toBe(false)
    expect(result.error).toContain('DB down')
  })
})

// ============================================================================
// deleteStagedRow
// ============================================================================

describe('handleDeleteStagedRow', () => {
  it('should delete a staged contact', async () => {
    const staging = mockStagingService()
    const result = await handleDeleteStagedRow(
      { stagedContactId: 's-1' }, ctx, { stagingService: staging }
    )
    expect(result.success).toBe(true)
    expect(staging.deleteStagedRow).toHaveBeenCalledWith('u-1', 's-1')
  })

  it('should reject empty stagedContactId', async () => {
    const result = await handleDeleteStagedRow(
      { stagedContactId: '' }, ctx, { stagingService: mockStagingService() }
    )
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should handle service errors', async () => {
    const staging = mockStagingService({
      deleteStagedRow: vi.fn().mockRejectedValue(new Error('Not found')),
    })
    const result = await handleDeleteStagedRow(
      { stagedContactId: 's-1' }, ctx, { stagingService: staging }
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Not found')
  })
})

// ============================================================================
// approveStagedList
// ============================================================================

describe('handleApproveStagedList', () => {
  it('should approve and create campaign', async () => {
    const approve = mockApproveService()
    const result = await handleApproveStagedList(
      { campaignName: 'My Campaign', keptContactIds: ['s-1', 's-2'] },
      ctx,
      { approveService: approve }
    )
    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id', 'c-1')
    expect(approve.approve).toHaveBeenCalledWith({
      userId: 'u-1',
      campaignName: 'My Campaign',
      keptContactIds: ['s-1', 's-2'],
    })
  })

  it('should reject empty campaign name', async () => {
    const result = await handleApproveStagedList(
      { campaignName: '', keptContactIds: ['s-1'] },
      ctx,
      { approveService: mockApproveService() }
    )
    expect(result.success).toBe(false)
  })

  it('should reject empty keptContactIds', async () => {
    const result = await handleApproveStagedList(
      { campaignName: 'Test', keptContactIds: [] },
      ctx,
      { approveService: mockApproveService() }
    )
    expect(result.success).toBe(false)
  })

  it('should handle service errors', async () => {
    const approve = mockApproveService({
      approve: vi.fn().mockRejectedValue(new Error('Transaction failed')),
    })
    const result = await handleApproveStagedList(
      { campaignName: 'Test', keptContactIds: ['s-1'] },
      ctx,
      { approveService: approve }
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Transaction failed')
  })
})

// ============================================================================
// runCampaignStage
// ============================================================================

describe('handleRunCampaignStage', () => {
  it('should run email finding stage', async () => {
    const runner = mockCampaignRunner()
    const executors = mockStageExecutors()
    const result = await handleRunCampaignStage(
      AiActionType.RUN_EMAIL_FINDING,
      { campaignId: 'c-1' },
      ctx,
      { campaignRunner: runner, stageExecutors: executors }
    )
    expect(result.success).toBe(true)
    expect(runner.startEmailFinding).toHaveBeenCalledWith('u-1', 'c-1')
    expect(executors.emailFinding).toHaveBeenCalledWith('c-1')
    expect(runner.transition).toHaveBeenCalled()
  })

  it('should run inserts stage', async () => {
    const runner = mockCampaignRunner()
    const executors = mockStageExecutors()
    await handleRunCampaignStage(
      AiActionType.RUN_INSERTS,
      { campaignId: 'c-1' },
      ctx,
      { campaignRunner: runner, stageExecutors: executors }
    )
    expect(runner.startInserts).toHaveBeenCalledWith('u-1', 'c-1')
    expect(executors.inserts).toHaveBeenCalledWith('c-1')
  })

  it('should run drafts stage with templateId', async () => {
    const runner = mockCampaignRunner()
    const executors = mockStageExecutors()
    await handleRunCampaignStage(
      AiActionType.RUN_DRAFTS,
      { campaignId: 'c-1', templateId: 't-1' },
      ctx,
      { campaignRunner: runner, stageExecutors: executors }
    )
    expect(runner.startDrafts).toHaveBeenCalledWith('u-1', 'c-1', 't-1')
    expect(executors.drafts).toHaveBeenCalledWith('c-1', 't-1')
  })

  it('should run send stage', async () => {
    const runner = mockCampaignRunner()
    const executors = mockStageExecutors()
    await handleRunCampaignStage(
      AiActionType.SEND_EMAILS,
      { campaignId: 'c-1' },
      ctx,
      { campaignRunner: runner, stageExecutors: executors }
    )
    expect(runner.startSending).toHaveBeenCalledWith('u-1', 'c-1')
    expect(executors.send).toHaveBeenCalledWith('c-1')
  })

  it('should reject invalid campaignId', async () => {
    const result = await handleRunCampaignStage(
      AiActionType.RUN_EMAIL_FINDING,
      { campaignId: '' },
      ctx,
      { campaignRunner: mockCampaignRunner(), stageExecutors: mockStageExecutors() }
    )
    expect(result.success).toBe(false)
  })

  it('should transition to FAILED on executor error', async () => {
    const runner = mockCampaignRunner()
    const executors = mockStageExecutors({
      emailFinding: vi.fn().mockRejectedValue(new Error('API timeout')),
    })
    const result = await handleRunCampaignStage(
      AiActionType.RUN_EMAIL_FINDING,
      { campaignId: 'c-1' },
      ctx,
      { campaignRunner: runner, stageExecutors: executors }
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('API timeout')
    // Should have attempted transition to FAILED
    expect(runner.transition).toHaveBeenCalledWith(
      'c-1',
      CampaignRunState.EMAIL_FINDING_RUNNING,
      CampaignRunState.FAILED
    )
  })
})

// ============================================================================
// queryContacts
// ============================================================================

describe('handleQueryContacts', () => {
  it('should query contacts with filters', async () => {
    const contactService = mockContactService()
    const result = await handleQueryContacts(
      { filters: { stage: 'DRAFTED', campaignId: 'c-1' } },
      ctx,
      { contactService }
    )
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(contactService.query).toHaveBeenCalledWith('u-1', { stage: 'DRAFTED', campaignId: 'c-1' })
  })

  it('should accept empty filters', async () => {
    const contactService = mockContactService()
    const result = await handleQueryContacts(
      { filters: {} },
      ctx,
      { contactService }
    )
    expect(result.success).toBe(true)
  })

  it('should handle service errors', async () => {
    const contactService = mockContactService({
      query: vi.fn().mockRejectedValue(new Error('Query failed')),
    })
    const result = await handleQueryContacts(
      { filters: {} },
      ctx,
      { contactService }
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Query failed')
  })
})

// ============================================================================
// mutation handlers
// ============================================================================

describe('handleMoveStage', () => {
  it('should move contact stage', async () => {
    const contactService = mockContactService()
    const result = await handleMoveStage(
      { contactId: 'ct-1', newStage: 'EMAIL_FOUND' },
      ctx,
      { contactService }
    )
    expect(result.success).toBe(true)
    expect(contactService.moveStage).toHaveBeenCalledWith('ct-1', 'EMAIL_FOUND')
  })

  it('should reject empty contactId', async () => {
    const result = await handleMoveStage(
      { contactId: '', newStage: 'EMAIL_FOUND' },
      ctx,
      { contactService: mockContactService() }
    )
    expect(result.success).toBe(false)
  })
})

describe('handleUpdateField', () => {
  it('should update a contact field', async () => {
    const contactService = mockContactService()
    const result = await handleUpdateField(
      { contactId: 'ct-1', field: 'name', value: 'Alice Updated' },
      ctx,
      { contactService }
    )
    expect(result.success).toBe(true)
    expect(contactService.updateField).toHaveBeenCalledWith('ct-1', 'name', 'Alice Updated')
  })
})

describe('handleBulkUpdate', () => {
  it('should bulk update contacts', async () => {
    const contactService = mockContactService()
    const result = await handleBulkUpdate(
      { contactIds: ['ct-1', 'ct-2', 'ct-3'], updates: { stage: 'EMAIL_FOUND' } },
      ctx,
      { contactService }
    )
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ updatedCount: 3 })
  })

  it('should reject empty updates object', async () => {
    const result = await handleBulkUpdate(
      { contactIds: ['ct-1'], updates: {} },
      ctx,
      { contactService: mockContactService() }
    )
    expect(result.success).toBe(false)
  })
})

describe('handleDeleteContacts', () => {
  it('should delete contacts', async () => {
    const contactService = mockContactService()
    const result = await handleDeleteContacts(
      { contactIds: ['ct-1', 'ct-2'] },
      ctx,
      { contactService }
    )
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ deletedCount: 2 })
  })

  it('should reject empty contactIds', async () => {
    const result = await handleDeleteContacts(
      { contactIds: [] },
      ctx,
      { contactService: mockContactService() }
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// createSavedView
// ============================================================================

describe('handleCreateSavedView', () => {
  it('should create a saved view', async () => {
    const savedViewService = mockSavedViewService()
    const result = await handleCreateSavedView(
      { name: 'My View', filters: { stage: 'DRAFTED' } },
      ctx,
      { savedViewService }
    )
    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('id', 'v-1')
    expect(savedViewService.create).toHaveBeenCalledWith('u-1', {
      name: 'My View',
      filters: { stage: 'DRAFTED' },
      sort: undefined,
    })
  })

  it('should accept optional sort', async () => {
    const savedViewService = mockSavedViewService()
    await handleCreateSavedView(
      { name: 'Sorted View', filters: { stage: 'DRAFTED' }, sort: { name: 'asc' } },
      ctx,
      { savedViewService }
    )
    expect(savedViewService.create).toHaveBeenCalledWith('u-1', {
      name: 'Sorted View',
      filters: { stage: 'DRAFTED' },
      sort: { name: 'asc' },
    })
  })

  it('should reject empty name', async () => {
    const result = await handleCreateSavedView(
      { name: '', filters: {} },
      ctx,
      { savedViewService: mockSavedViewService() }
    )
    expect(result.success).toBe(false)
  })
})
