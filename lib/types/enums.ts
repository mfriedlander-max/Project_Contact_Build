/**
 * Student Networking CRM - Global Enums & Constants
 * Centralized type definitions for the CRM rebuild
 */

/**
 * Connection stage for contacts - represents relationship pipeline
 * Replaces the old ConnectionLevel enum with more descriptive stages
 */
export const ConnectionStage = {
  DRAFTED: 'DRAFTED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  DIDNT_CONNECT: 'DIDNT_CONNECT',
  CONNECTED: 'CONNECTED',
  IN_TOUCH: 'IN_TOUCH',
} as const

export type ConnectionStageType = (typeof ConnectionStage)[keyof typeof ConnectionStage]

/**
 * AI interaction modes - determines available actions
 */
export const AiMode = {
  CONTACT_FINDER: 'CONTACT_FINDER',
  GENERAL_MANAGER: 'GENERAL_MANAGER',
  ASSISTANT: 'ASSISTANT',
} as const

export type AiModeType = (typeof AiMode)[keyof typeof AiMode]

/**
 * Campaign runner state machine states
 */
export const CampaignRunState = {
  IDLE: 'IDLE',
  EMAIL_FINDING_RUNNING: 'EMAIL_FINDING_RUNNING',
  INSERTS_RUNNING: 'INSERTS_RUNNING',
  DRAFTS_RUNNING: 'DRAFTS_RUNNING',
  SENDING_RUNNING: 'SENDING_RUNNING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
} as const

export type CampaignRunStateType = (typeof CampaignRunState)[keyof typeof CampaignRunState]

/**
 * Integration provider types
 */
export const IntegrationProvider = {
  GMAIL: 'GMAIL',
  HUNTER: 'HUNTER',
  SEARCH_PROVIDER: 'SEARCH_PROVIDER',
  OUTLOOK: 'OUTLOOK',
} as const

export type IntegrationProviderType = (typeof IntegrationProvider)[keyof typeof IntegrationProvider]

/**
 * Custom field types for user-defined columns
 */
export const CustomFieldType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  DATE: 'DATE',
  SELECT: 'SELECT',
} as const

export type CustomFieldTypeValue = (typeof CustomFieldType)[keyof typeof CustomFieldType]

/**
 * AI action types - all possible AI-triggered operations
 */
export const AiActionType = {
  // Contact Finder mode
  FIND_CONTACTS: 'FIND_CONTACTS',
  SHOW_STAGED_RESULTS: 'SHOW_STAGED_RESULTS',
  DELETE_STAGED_ROW: 'DELETE_STAGED_ROW',
  APPROVE_STAGED_LIST: 'APPROVE_STAGED_LIST',

  // Campaign runner
  RUN_EMAIL_FINDING: 'RUN_EMAIL_FINDING',
  RUN_INSERTS: 'RUN_INSERTS',
  RUN_DRAFTS: 'RUN_DRAFTS',
  SEND_EMAILS: 'SEND_EMAILS',

  // General Manager mode
  QUERY_CONTACTS: 'QUERY_CONTACTS',

  // Assistant mode (mutations)
  MOVE_STAGE: 'MOVE_STAGE',
  UPDATE_FIELD: 'UPDATE_FIELD',
  BULK_UPDATE: 'BULK_UPDATE',
  DELETE_CONTACTS: 'DELETE_CONTACTS',
  CREATE_SAVED_VIEW: 'CREATE_SAVED_VIEW',
} as const

export type AiActionTypeValue = (typeof AiActionType)[keyof typeof AiActionType]

// ============================================================================
// Validation Functions
// ============================================================================

export function isValidConnectionStage(value: unknown): value is ConnectionStageType {
  return (
    typeof value === 'string' &&
    Object.values(ConnectionStage).includes(value as ConnectionStageType)
  )
}

export function isValidAiMode(value: unknown): value is AiModeType {
  return typeof value === 'string' && Object.values(AiMode).includes(value as AiModeType)
}

export function isValidCampaignRunState(value: unknown): value is CampaignRunStateType {
  return (
    typeof value === 'string' &&
    Object.values(CampaignRunState).includes(value as CampaignRunStateType)
  )
}

export function isValidIntegrationProvider(value: unknown): value is IntegrationProviderType {
  return (
    typeof value === 'string' &&
    Object.values(IntegrationProvider).includes(value as IntegrationProviderType)
  )
}

export function isValidCustomFieldType(value: unknown): value is CustomFieldTypeValue {
  return (
    typeof value === 'string' &&
    Object.values(CustomFieldType).includes(value as CustomFieldTypeValue)
  )
}

export function isValidAiActionType(value: unknown): value is AiActionTypeValue {
  return (
    typeof value === 'string' && Object.values(AiActionType).includes(value as AiActionTypeValue)
  )
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Connection stage progression order for pipeline visualization
 */
export const CONNECTION_STAGE_ORDER: ConnectionStageType[] = [
  ConnectionStage.DRAFTED,
  ConnectionStage.MESSAGE_SENT,
  ConnectionStage.DIDNT_CONNECT,
  ConnectionStage.CONNECTED,
  ConnectionStage.IN_TOUCH,
]

/**
 * Human-readable labels for AI modes
 */
export const AI_MODE_LABELS: Record<AiModeType, string> = {
  [AiMode.CONTACT_FINDER]: 'Contact Finder',
  [AiMode.GENERAL_MANAGER]: 'General Manager',
  [AiMode.ASSISTANT]: 'Assistant',
}

/**
 * Campaign state machine transitions - defines valid next states from each state
 */
export const CAMPAIGN_RUN_STATE_TRANSITIONS: Record<CampaignRunStateType, CampaignRunStateType[]> = {
  [CampaignRunState.IDLE]: [
    CampaignRunState.EMAIL_FINDING_RUNNING,
    CampaignRunState.INSERTS_RUNNING,
  ],
  [CampaignRunState.EMAIL_FINDING_RUNNING]: [
    CampaignRunState.INSERTS_RUNNING,
    CampaignRunState.FAILED,
  ],
  [CampaignRunState.INSERTS_RUNNING]: [CampaignRunState.DRAFTS_RUNNING, CampaignRunState.FAILED],
  [CampaignRunState.DRAFTS_RUNNING]: [CampaignRunState.SENDING_RUNNING, CampaignRunState.FAILED],
  [CampaignRunState.SENDING_RUNNING]: [CampaignRunState.COMPLETE, CampaignRunState.FAILED],
  [CampaignRunState.COMPLETE]: [],
  [CampaignRunState.FAILED]: [CampaignRunState.IDLE],
}
