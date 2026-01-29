import { describe, it, expect } from 'vitest'
import {
  AiMode,
  AiActionType,
  ACTION_MODE_REQUIREMENTS,
  ACTIONS_REQUIRING_CONFIRMATION,
  ACTION_PAYLOAD_SCHEMAS,
  FindContactsPayloadSchema,
  ApproveListPayloadSchema,
  DeleteStagedRowPayloadSchema,
  CampaignIdPayloadSchema,
  RunDraftsPayloadSchema,
  QueryContactsPayloadSchema,
  MoveStagePayloadSchema,
  UpdateFieldPayloadSchema,
  BulkUpdatePayloadSchema,
  DeleteContactsPayloadSchema,
  CreateSavedViewPayloadSchema,
  validateActionPayload,
  type AiActionRequest,
  type AiActionResult,
  type AiActionPayloads,
} from '../types'

describe('AI Action Types', () => {
  describe('AiMode enum', () => {
    it('should have CONTACT_FINDER, GENERAL_MANAGER, ASSISTANT values', () => {
      expect(AiMode.CONTACT_FINDER).toBe('CONTACT_FINDER')
      expect(AiMode.GENERAL_MANAGER).toBe('GENERAL_MANAGER')
      expect(AiMode.ASSISTANT).toBe('ASSISTANT')
    })

    it('should have exactly 3 modes', () => {
      const modes = Object.values(AiMode)
      expect(modes).toHaveLength(3)
    })
  })

  describe('AiActionType enum', () => {
    it('should have Contact Finder actions', () => {
      expect(AiActionType.FIND_CONTACTS).toBe('FIND_CONTACTS')
      expect(AiActionType.SHOW_STAGED_RESULTS).toBe('SHOW_STAGED_RESULTS')
      expect(AiActionType.DELETE_STAGED_ROW).toBe('DELETE_STAGED_ROW')
      expect(AiActionType.APPROVE_STAGED_LIST).toBe('APPROVE_STAGED_LIST')
    })

    it('should have Campaign runner actions', () => {
      expect(AiActionType.RUN_EMAIL_FINDING).toBe('RUN_EMAIL_FINDING')
      expect(AiActionType.RUN_INSERTS).toBe('RUN_INSERTS')
      expect(AiActionType.RUN_DRAFTS).toBe('RUN_DRAFTS')
      expect(AiActionType.SEND_EMAILS).toBe('SEND_EMAILS')
    })

    it('should have General Manager actions', () => {
      expect(AiActionType.QUERY_CONTACTS).toBe('QUERY_CONTACTS')
    })

    it('should have Assistant mode mutation actions', () => {
      expect(AiActionType.MOVE_STAGE).toBe('MOVE_STAGE')
      expect(AiActionType.UPDATE_FIELD).toBe('UPDATE_FIELD')
      expect(AiActionType.BULK_UPDATE).toBe('BULK_UPDATE')
      expect(AiActionType.DELETE_CONTACTS).toBe('DELETE_CONTACTS')
      expect(AiActionType.CREATE_SAVED_VIEW).toBe('CREATE_SAVED_VIEW')
    })
  })

  describe('ACTION_MODE_REQUIREMENTS', () => {
    it('should require CONTACT_FINDER mode for FIND_CONTACTS', () => {
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.FIND_CONTACTS]).toContain(AiMode.CONTACT_FINDER)
    })

    it('should allow multiple modes for SHOW_STAGED_RESULTS', () => {
      const modes = ACTION_MODE_REQUIREMENTS[AiActionType.SHOW_STAGED_RESULTS]
      expect(modes).toContain(AiMode.CONTACT_FINDER)
      expect(modes).toContain(AiMode.GENERAL_MANAGER)
    })

    it('should require ASSISTANT mode for mutation actions', () => {
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.MOVE_STAGE]).toContain(AiMode.ASSISTANT)
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.UPDATE_FIELD]).toContain(AiMode.ASSISTANT)
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.BULK_UPDATE]).toContain(AiMode.ASSISTANT)
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.DELETE_CONTACTS]).toContain(AiMode.ASSISTANT)
    })

    it('should require ASSISTANT mode for campaign runner actions', () => {
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.RUN_EMAIL_FINDING]).toContain(AiMode.ASSISTANT)
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.RUN_INSERTS]).toContain(AiMode.ASSISTANT)
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.RUN_DRAFTS]).toContain(AiMode.ASSISTANT)
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.SEND_EMAILS]).toContain(AiMode.ASSISTANT)
    })

    it('should allow GENERAL_MANAGER for read-only queries', () => {
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.QUERY_CONTACTS]).toContain(AiMode.GENERAL_MANAGER)
    })

    it('should have requirements for all action types', () => {
      const actionTypes = Object.values(AiActionType)
      for (const actionType of actionTypes) {
        expect(ACTION_MODE_REQUIREMENTS[actionType]).toBeDefined()
        expect(ACTION_MODE_REQUIREMENTS[actionType].length).toBeGreaterThan(0)
      }
    })
  })

  describe('ACTIONS_REQUIRING_CONFIRMATION', () => {
    it('should include dangerous actions', () => {
      expect(ACTIONS_REQUIRING_CONFIRMATION).toContain(AiActionType.APPROVE_STAGED_LIST)
      expect(ACTIONS_REQUIRING_CONFIRMATION).toContain(AiActionType.SEND_EMAILS)
      expect(ACTIONS_REQUIRING_CONFIRMATION).toContain(AiActionType.DELETE_CONTACTS)
      expect(ACTIONS_REQUIRING_CONFIRMATION).toContain(AiActionType.BULK_UPDATE)
    })

    it('should NOT include read-only actions', () => {
      expect(ACTIONS_REQUIRING_CONFIRMATION).not.toContain(AiActionType.FIND_CONTACTS)
      expect(ACTIONS_REQUIRING_CONFIRMATION).not.toContain(AiActionType.SHOW_STAGED_RESULTS)
      expect(ACTIONS_REQUIRING_CONFIRMATION).not.toContain(AiActionType.QUERY_CONTACTS)
    })
  })

  describe('FindContactsPayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = { query: 'tech founders in SF', maxResults: 20 }
      const result = FindContactsPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('tech founders in SF')
        expect(result.data.maxResults).toBe(20)
      }
    })

    it('should default maxResults to 30', () => {
      const payload = { query: 'tech founders' }
      const result = FindContactsPayloadSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.maxResults).toBe(30)
      }
    })

    it('should reject query less than 3 characters', () => {
      const invalidPayload = { query: 'ab' }
      const result = FindContactsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject maxResults greater than 30', () => {
      const invalidPayload = { query: 'valid query', maxResults: 50 }
      const result = FindContactsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject maxResults less than 1', () => {
      const invalidPayload = { query: 'valid query', maxResults: 0 }
      const result = FindContactsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('ApproveListPayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = {
        campaignName: 'Q1 Tech Outreach',
        keptContactIds: ['id1', 'id2', 'id3'],
      }
      const result = ApproveListPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.campaignName).toBe('Q1 Tech Outreach')
        expect(result.data.keptContactIds).toHaveLength(3)
      }
    })

    it('should reject empty campaign name', () => {
      const invalidPayload = {
        campaignName: '',
        keptContactIds: ['id1'],
      }
      const result = ApproveListPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject campaign name over 100 characters', () => {
      const invalidPayload = {
        campaignName: 'a'.repeat(101),
        keptContactIds: ['id1'],
      }
      const result = ApproveListPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject empty keptContactIds array', () => {
      const invalidPayload = {
        campaignName: 'Valid Campaign',
        keptContactIds: [],
      }
      const result = ApproveListPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject keptContactIds array over 30 items', () => {
      const invalidPayload = {
        campaignName: 'Valid Campaign',
        keptContactIds: Array.from({ length: 31 }, (_, i) => `id${i}`),
      }
      const result = ApproveListPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('AiActionRequest type', () => {
    it('should allow valid request structure', () => {
      const request: AiActionRequest<typeof AiActionType.FIND_CONTACTS> = {
        type: AiActionType.FIND_CONTACTS,
        payload: {
          query: 'tech founders',
          maxResults: 20,
        },
      }
      expect(request.type).toBe(AiActionType.FIND_CONTACTS)
      expect(request.payload.query).toBe('tech founders')
    })

    it('should allow userConfirmed flag', () => {
      const request: AiActionRequest<typeof AiActionType.APPROVE_STAGED_LIST> = {
        type: AiActionType.APPROVE_STAGED_LIST,
        payload: {
          campaignName: 'Test Campaign',
          keptContactIds: ['id1', 'id2'],
        },
        userConfirmed: true,
      }
      expect(request.userConfirmed).toBe(true)
    })
  })

  describe('DeleteStagedRowPayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = { stagedContactId: 'staged-123' }
      const result = DeleteStagedRowPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject empty stagedContactId', () => {
      const invalidPayload = { stagedContactId: '' }
      const result = DeleteStagedRowPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject missing stagedContactId', () => {
      const invalidPayload = {}
      const result = DeleteStagedRowPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('CampaignIdPayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = { campaignId: 'campaign-123' }
      const result = CampaignIdPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject empty campaignId', () => {
      const invalidPayload = { campaignId: '' }
      const result = CampaignIdPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject missing campaignId', () => {
      const invalidPayload = {}
      const result = CampaignIdPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('RunDraftsPayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = { campaignId: 'campaign-123', templateId: 'template-456' }
      const result = RunDraftsPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject missing templateId', () => {
      const invalidPayload = { campaignId: 'campaign-123' }
      const result = RunDraftsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject empty templateId', () => {
      const invalidPayload = { campaignId: 'campaign-123', templateId: '' }
      const result = RunDraftsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('QueryContactsPayloadSchema', () => {
    it('should validate payload with all filters', () => {
      const validPayload = {
        filters: {
          stage: 'DRAFTED',
          campaignId: 'campaign-123',
          industry: 'Tech',
          search: 'John',
        },
      }
      const result = QueryContactsPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should validate payload with empty filters', () => {
      const validPayload = { filters: {} }
      const result = QueryContactsPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject missing filters object', () => {
      const invalidPayload = {}
      const result = QueryContactsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('MoveStagePayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = { contactId: 'contact-123', newStage: 'CONNECTED' }
      const result = MoveStagePayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject empty contactId', () => {
      const invalidPayload = { contactId: '', newStage: 'CONNECTED' }
      const result = MoveStagePayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject empty newStage', () => {
      const invalidPayload = { contactId: 'contact-123', newStage: '' }
      const result = MoveStagePayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateFieldPayloadSchema', () => {
    it('should validate valid payload with string value', () => {
      const validPayload = { contactId: 'contact-123', field: 'industry', value: 'Tech' }
      const result = UpdateFieldPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should validate valid payload with number value', () => {
      const validPayload = { contactId: 'contact-123', field: 'score', value: 85 }
      const result = UpdateFieldPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should validate valid payload with null value', () => {
      const validPayload = { contactId: 'contact-123', field: 'notes', value: null }
      const result = UpdateFieldPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject empty field name', () => {
      const invalidPayload = { contactId: 'contact-123', field: '', value: 'test' }
      const result = UpdateFieldPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('BulkUpdatePayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = {
        contactIds: ['id1', 'id2', 'id3'],
        updates: { industry: 'Tech', stage: 'CONNECTED' },
      }
      const result = BulkUpdatePayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject empty contactIds array', () => {
      const invalidPayload = {
        contactIds: [],
        updates: { industry: 'Tech' },
      }
      const result = BulkUpdatePayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject contactIds array over 30', () => {
      const invalidPayload = {
        contactIds: Array.from({ length: 31 }, (_, i) => `id${i}`),
        updates: { industry: 'Tech' },
      }
      const result = BulkUpdatePayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject empty updates object', () => {
      const invalidPayload = {
        contactIds: ['id1'],
        updates: {},
      }
      const result = BulkUpdatePayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('DeleteContactsPayloadSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = { contactIds: ['id1', 'id2'] }
      const result = DeleteContactsPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject empty contactIds array', () => {
      const invalidPayload = { contactIds: [] }
      const result = DeleteContactsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject contactIds array over 30', () => {
      const invalidPayload = {
        contactIds: Array.from({ length: 31 }, (_, i) => `id${i}`),
      }
      const result = DeleteContactsPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateSavedViewPayloadSchema', () => {
    it('should validate valid payload with filters only', () => {
      const validPayload = {
        name: 'Tech Founders',
        filters: { industry: 'Tech', stage: 'CONNECTED' },
      }
      const result = CreateSavedViewPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should validate valid payload with filters and sort', () => {
      const validPayload = {
        name: 'Recent Contacts',
        filters: { stage: 'DRAFTED' },
        sort: { field: 'createdAt', direction: 'desc' },
      }
      const result = CreateSavedViewPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const invalidPayload = {
        name: '',
        filters: { industry: 'Tech' },
      }
      const result = CreateSavedViewPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })

    it('should reject name over 100 characters', () => {
      const invalidPayload = {
        name: 'a'.repeat(101),
        filters: { industry: 'Tech' },
      }
      const result = CreateSavedViewPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('ACTION_PAYLOAD_SCHEMAS', () => {
    it('should have a schema for every action type', () => {
      const actionTypes = Object.values(AiActionType)
      for (const actionType of actionTypes) {
        expect(ACTION_PAYLOAD_SCHEMAS[actionType]).toBeDefined()
      }
    })
  })

  describe('validateActionPayload', () => {
    it('should validate valid FIND_CONTACTS payload', () => {
      const result = validateActionPayload(AiActionType.FIND_CONTACTS, {
        query: 'tech founders',
        maxResults: 10,
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid FIND_CONTACTS payload', () => {
      const result = validateActionPayload(AiActionType.FIND_CONTACTS, {
        query: 'ab', // too short
      })
      expect(result.success).toBe(false)
    })

    it('should validate valid DELETE_CONTACTS payload', () => {
      const result = validateActionPayload(AiActionType.DELETE_CONTACTS, {
        contactIds: ['id1', 'id2'],
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid DELETE_CONTACTS payload', () => {
      const result = validateActionPayload(AiActionType.DELETE_CONTACTS, {
        contactIds: [], // empty array
      })
      expect(result.success).toBe(false)
    })

    it('should validate valid RUN_DRAFTS payload', () => {
      const result = validateActionPayload(AiActionType.RUN_DRAFTS, {
        campaignId: 'campaign-123',
        templateId: 'template-456',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('AiActionResult type', () => {
    it('should allow successful result', () => {
      const result: AiActionResult<string[]> = {
        success: true,
        data: ['contact1', 'contact2'],
      }
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
    })

    it('should allow error result', () => {
      const result: AiActionResult = {
        success: false,
        error: 'Something went wrong',
      }
      expect(result.success).toBe(false)
      expect(result.error).toBe('Something went wrong')
    })

    it('should allow confirmation required result', () => {
      const result: AiActionResult = {
        success: false,
        requiresConfirmation: true,
        confirmationMessage: 'Are you sure you want to proceed?',
      }
      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toBeDefined()
    })
  })
})
