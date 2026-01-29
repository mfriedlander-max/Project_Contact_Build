import { describe, it, expect } from 'vitest'
import {
  ConnectionStage,
  AiMode,
  CampaignRunState,
  IntegrationProvider,
  CustomFieldType,
  AiActionType,
  isValidConnectionStage,
  isValidAiMode,
  isValidCampaignRunState,
  isValidIntegrationProvider,
  isValidCustomFieldType,
  isValidAiActionType,
  CONNECTION_STAGE_ORDER,
  AI_MODE_LABELS,
  CAMPAIGN_RUN_STATE_TRANSITIONS,
} from '../enums'

describe('Global Enums', () => {
  describe('ConnectionStage enum', () => {
    it('should have all required stage values', () => {
      expect(ConnectionStage.DRAFTED).toBe('DRAFTED')
      expect(ConnectionStage.MESSAGE_SENT).toBe('MESSAGE_SENT')
      expect(ConnectionStage.DIDNT_CONNECT).toBe('DIDNT_CONNECT')
      expect(ConnectionStage.CONNECTED).toBe('CONNECTED')
      expect(ConnectionStage.IN_TOUCH).toBe('IN_TOUCH')
    })

    it('should have exactly 5 stages', () => {
      expect(Object.keys(ConnectionStage)).toHaveLength(5)
    })
  })

  describe('AiMode enum', () => {
    it('should have all required mode values', () => {
      expect(AiMode.CONTACT_FINDER).toBe('CONTACT_FINDER')
      expect(AiMode.GENERAL_MANAGER).toBe('GENERAL_MANAGER')
      expect(AiMode.ASSISTANT).toBe('ASSISTANT')
    })

    it('should have exactly 3 modes', () => {
      expect(Object.keys(AiMode)).toHaveLength(3)
    })
  })

  describe('CampaignRunState enum', () => {
    it('should have all required state values', () => {
      expect(CampaignRunState.IDLE).toBe('IDLE')
      expect(CampaignRunState.EMAIL_FINDING_RUNNING).toBe('EMAIL_FINDING_RUNNING')
      expect(CampaignRunState.INSERTS_RUNNING).toBe('INSERTS_RUNNING')
      expect(CampaignRunState.DRAFTS_RUNNING).toBe('DRAFTS_RUNNING')
      expect(CampaignRunState.SENDING_RUNNING).toBe('SENDING_RUNNING')
      expect(CampaignRunState.COMPLETE).toBe('COMPLETE')
      expect(CampaignRunState.FAILED).toBe('FAILED')
    })

    it('should have exactly 7 states', () => {
      expect(Object.keys(CampaignRunState)).toHaveLength(7)
    })
  })

  describe('IntegrationProvider enum', () => {
    it('should have all required provider values', () => {
      expect(IntegrationProvider.GMAIL).toBe('GMAIL')
      expect(IntegrationProvider.HUNTER).toBe('HUNTER')
      expect(IntegrationProvider.SEARCH_PROVIDER).toBe('SEARCH_PROVIDER')
      expect(IntegrationProvider.OUTLOOK).toBe('OUTLOOK')
    })

    it('should have exactly 4 providers', () => {
      expect(Object.keys(IntegrationProvider)).toHaveLength(4)
    })
  })

  describe('CustomFieldType enum', () => {
    it('should have all required field type values', () => {
      expect(CustomFieldType.TEXT).toBe('TEXT')
      expect(CustomFieldType.NUMBER).toBe('NUMBER')
      expect(CustomFieldType.DATE).toBe('DATE')
      expect(CustomFieldType.SELECT).toBe('SELECT')
    })

    it('should have exactly 4 field types', () => {
      expect(Object.keys(CustomFieldType)).toHaveLength(4)
    })
  })

  describe('AiActionType enum', () => {
    it('should have Contact Finder mode actions', () => {
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

    it('should have General Manager mode actions', () => {
      expect(AiActionType.QUERY_CONTACTS).toBe('QUERY_CONTACTS')
    })

    it('should have Assistant mode mutation actions', () => {
      expect(AiActionType.MOVE_STAGE).toBe('MOVE_STAGE')
      expect(AiActionType.UPDATE_FIELD).toBe('UPDATE_FIELD')
      expect(AiActionType.BULK_UPDATE).toBe('BULK_UPDATE')
      expect(AiActionType.DELETE_CONTACTS).toBe('DELETE_CONTACTS')
      expect(AiActionType.CREATE_SAVED_VIEW).toBe('CREATE_SAVED_VIEW')
    })

    it('should have exactly 14 action types', () => {
      expect(Object.keys(AiActionType)).toHaveLength(14)
    })
  })

  describe('isValidConnectionStage', () => {
    it('should return true for valid values', () => {
      expect(isValidConnectionStage('DRAFTED')).toBe(true)
      expect(isValidConnectionStage('MESSAGE_SENT')).toBe(true)
      expect(isValidConnectionStage('DIDNT_CONNECT')).toBe(true)
      expect(isValidConnectionStage('CONNECTED')).toBe(true)
      expect(isValidConnectionStage('IN_TOUCH')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidConnectionStage('INVALID')).toBe(false)
      expect(isValidConnectionStage('')).toBe(false)
      expect(isValidConnectionStage(null)).toBe(false)
      expect(isValidConnectionStage(undefined)).toBe(false)
      expect(isValidConnectionStage(123)).toBe(false)
    })
  })

  describe('isValidAiMode', () => {
    it('should return true for valid values', () => {
      expect(isValidAiMode('CONTACT_FINDER')).toBe(true)
      expect(isValidAiMode('GENERAL_MANAGER')).toBe(true)
      expect(isValidAiMode('ASSISTANT')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidAiMode('INVALID')).toBe(false)
      expect(isValidAiMode('')).toBe(false)
      expect(isValidAiMode(null)).toBe(false)
    })
  })

  describe('isValidCampaignRunState', () => {
    it('should return true for valid values', () => {
      expect(isValidCampaignRunState('IDLE')).toBe(true)
      expect(isValidCampaignRunState('EMAIL_FINDING_RUNNING')).toBe(true)
      expect(isValidCampaignRunState('COMPLETE')).toBe(true)
      expect(isValidCampaignRunState('FAILED')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidCampaignRunState('RUNNING')).toBe(false)
      expect(isValidCampaignRunState('')).toBe(false)
    })
  })

  describe('isValidIntegrationProvider', () => {
    it('should return true for valid values', () => {
      expect(isValidIntegrationProvider('GMAIL')).toBe(true)
      expect(isValidIntegrationProvider('HUNTER')).toBe(true)
      expect(isValidIntegrationProvider('SEARCH_PROVIDER')).toBe(true)
      expect(isValidIntegrationProvider('OUTLOOK')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidIntegrationProvider('YAHOO')).toBe(false)
    })
  })

  describe('isValidCustomFieldType', () => {
    it('should return true for valid values', () => {
      expect(isValidCustomFieldType('TEXT')).toBe(true)
      expect(isValidCustomFieldType('NUMBER')).toBe(true)
      expect(isValidCustomFieldType('DATE')).toBe(true)
      expect(isValidCustomFieldType('SELECT')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidCustomFieldType('BOOLEAN')).toBe(false)
    })
  })

  describe('isValidAiActionType', () => {
    it('should return true for valid values', () => {
      expect(isValidAiActionType('FIND_CONTACTS')).toBe(true)
      expect(isValidAiActionType('QUERY_CONTACTS')).toBe(true)
      expect(isValidAiActionType('MOVE_STAGE')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isValidAiActionType('UNKNOWN_ACTION')).toBe(false)
    })
  })

  describe('CONNECTION_STAGE_ORDER constant', () => {
    it('should define correct progression order', () => {
      expect(CONNECTION_STAGE_ORDER).toEqual([
        'DRAFTED',
        'MESSAGE_SENT',
        'DIDNT_CONNECT',
        'CONNECTED',
        'IN_TOUCH',
      ])
    })

    it('should have same length as ConnectionStage enum', () => {
      expect(CONNECTION_STAGE_ORDER).toHaveLength(Object.keys(ConnectionStage).length)
    })
  })

  describe('AI_MODE_LABELS constant', () => {
    it('should provide human-readable labels for all modes', () => {
      expect(AI_MODE_LABELS.CONTACT_FINDER).toBe('Contact Finder')
      expect(AI_MODE_LABELS.GENERAL_MANAGER).toBe('General Manager')
      expect(AI_MODE_LABELS.ASSISTANT).toBe('Assistant')
    })

    it('should have labels for all AiMode values', () => {
      const modeKeys = Object.keys(AiMode)
      const labelKeys = Object.keys(AI_MODE_LABELS)
      expect(labelKeys).toEqual(expect.arrayContaining(modeKeys))
    })
  })

  describe('CAMPAIGN_RUN_STATE_TRANSITIONS constant', () => {
    it('should define valid state transitions from IDLE', () => {
      expect(CAMPAIGN_RUN_STATE_TRANSITIONS.IDLE).toContain('EMAIL_FINDING_RUNNING')
      expect(CAMPAIGN_RUN_STATE_TRANSITIONS.IDLE).toContain('INSERTS_RUNNING')
    })

    it('should define valid state transitions from EMAIL_FINDING_RUNNING', () => {
      expect(CAMPAIGN_RUN_STATE_TRANSITIONS.EMAIL_FINDING_RUNNING).toContain('INSERTS_RUNNING')
      expect(CAMPAIGN_RUN_STATE_TRANSITIONS.EMAIL_FINDING_RUNNING).toContain('FAILED')
    })

    it('should define COMPLETE as terminal state', () => {
      expect(CAMPAIGN_RUN_STATE_TRANSITIONS.COMPLETE).toEqual([])
    })

    it('should define FAILED as terminal state', () => {
      expect(CAMPAIGN_RUN_STATE_TRANSITIONS.FAILED).toContain('IDLE')
    })
  })
})
