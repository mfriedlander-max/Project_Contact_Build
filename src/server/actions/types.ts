/**
 * AI Action System Types
 * Defines all possible AI-triggered operations
 *
 * Implementation in Phase 2 (Task 13)
 */

import { z } from 'zod'
import {
  AiMode,
  AiActionType,
  type AiModeType,
  type AiActionTypeValue,
} from '@/lib/types/enums'

// Re-export for consumers
export { AiMode, AiActionType }
export type { AiModeType, AiActionTypeValue }

/**
 * Mode requirements for each action
 */
export const ACTION_MODE_REQUIREMENTS: Record<AiActionTypeValue, AiModeType[]> = {
  // Contact Finder
  [AiActionType.FIND_CONTACTS]: [AiMode.CONTACT_FINDER, AiMode.ASSISTANT],
  [AiActionType.SHOW_STAGED_RESULTS]: [AiMode.CONTACT_FINDER, AiMode.GENERAL_MANAGER, AiMode.ASSISTANT],
  [AiActionType.DELETE_STAGED_ROW]: [AiMode.CONTACT_FINDER, AiMode.ASSISTANT],
  [AiActionType.APPROVE_STAGED_LIST]: [AiMode.CONTACT_FINDER, AiMode.ASSISTANT],

  // Campaign runner - requires Assistant for mutations
  [AiActionType.RUN_EMAIL_FINDING]: [AiMode.ASSISTANT],
  [AiActionType.RUN_INSERTS]: [AiMode.ASSISTANT],
  [AiActionType.RUN_DRAFTS]: [AiMode.ASSISTANT],
  [AiActionType.SEND_EMAILS]: [AiMode.ASSISTANT],

  // General Manager - read-only queries
  [AiActionType.QUERY_CONTACTS]: [AiMode.GENERAL_MANAGER, AiMode.ASSISTANT],

  // Assistant only - mutations
  [AiActionType.MOVE_STAGE]: [AiMode.ASSISTANT],
  [AiActionType.UPDATE_FIELD]: [AiMode.ASSISTANT],
  [AiActionType.BULK_UPDATE]: [AiMode.ASSISTANT],
  [AiActionType.DELETE_CONTACTS]: [AiMode.ASSISTANT],
  [AiActionType.CREATE_SAVED_VIEW]: [AiMode.GENERAL_MANAGER, AiMode.ASSISTANT],
}

/**
 * Actions that require explicit user confirmation
 */
export const ACTIONS_REQUIRING_CONFIRMATION: AiActionTypeValue[] = [
  AiActionType.APPROVE_STAGED_LIST,
  AiActionType.SEND_EMAILS,
  AiActionType.DELETE_CONTACTS,
  AiActionType.BULK_UPDATE,
]

/**
 * Base action request
 */
export interface AiActionRequest<T extends AiActionTypeValue = AiActionTypeValue> {
  type: T
  payload: AiActionPayloads[T]
  userConfirmed?: boolean // Required for ACTIONS_REQUIRING_CONFIRMATION
}

/**
 * Action payloads by type
 */
export type AiActionPayloads = {
  FIND_CONTACTS: {
    query: string
    maxResults?: number // Default 30, max 30
  }
  SHOW_STAGED_RESULTS: Record<string, never>
  DELETE_STAGED_ROW: {
    stagedContactId: string
  }
  APPROVE_STAGED_LIST: {
    campaignName: string
    keptContactIds: string[] // IDs of contacts to keep
  }
  RUN_EMAIL_FINDING: {
    campaignId: string
  }
  RUN_INSERTS: {
    campaignId: string
  }
  RUN_DRAFTS: {
    campaignId: string
    templateId: string
  }
  SEND_EMAILS: {
    campaignId: string
  }
  QUERY_CONTACTS: {
    filters: {
      stage?: string
      campaignId?: string
      industry?: string
      search?: string
    }
  }
  MOVE_STAGE: {
    contactId: string
    newStage: string
  }
  UPDATE_FIELD: {
    contactId: string
    field: string
    value: unknown
  }
  BULK_UPDATE: {
    contactIds: string[]
    updates: Record<string, unknown>
  }
  DELETE_CONTACTS: {
    contactIds: string[]
  }
  CREATE_SAVED_VIEW: {
    name: string
    filters: Record<string, unknown>
    sort?: Record<string, unknown>
  }
}

/**
 * Action result
 */
export interface AiActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  requiresConfirmation?: boolean // Client should prompt user
  confirmationMessage?: string
}

// ============================================================================
// Zod Schemas for Action Payload Validation
// ============================================================================

/**
 * FIND_CONTACTS payload
 */
export const FindContactsPayloadSchema = z.object({
  query: z.string().min(3),
  maxResults: z.number().min(1).max(30).optional().default(30),
})

/**
 * SHOW_STAGED_RESULTS has no payload (empty object)
 */
export const ShowStagedResultsPayloadSchema = z.object({})

/**
 * DELETE_STAGED_ROW payload
 */
export const DeleteStagedRowPayloadSchema = z.object({
  stagedContactId: z.string().min(1),
})

/**
 * APPROVE_STAGED_LIST payload
 */
export const ApproveListPayloadSchema = z.object({
  campaignName: z.string().min(1).max(100),
  keptContactIds: z.array(z.string()).min(1).max(30),
})

/**
 * Shared schema for actions that only need campaignId
 * Used by: RUN_EMAIL_FINDING, RUN_INSERTS, SEND_EMAILS
 */
export const CampaignIdPayloadSchema = z.object({
  campaignId: z.string().min(1),
})

/**
 * RUN_DRAFTS payload - needs both campaignId and templateId
 */
export const RunDraftsPayloadSchema = z.object({
  campaignId: z.string().min(1),
  templateId: z.string().min(1),
})

/**
 * QUERY_CONTACTS payload
 */
export const QueryContactsPayloadSchema = z.object({
  filters: z.object({
    stage: z.string().optional(),
    campaignId: z.string().optional(),
    industry: z.string().optional(),
    search: z.string().optional(),
  }),
})

/**
 * MOVE_STAGE payload
 */
export const MoveStagePayloadSchema = z.object({
  contactId: z.string().min(1),
  newStage: z.string().min(1),
})

/**
 * UPDATE_FIELD payload
 */
export const UpdateFieldPayloadSchema = z.object({
  contactId: z.string().min(1),
  field: z.string().min(1),
  value: z.unknown(),
})

/**
 * BULK_UPDATE payload
 * Requires at least one update key to prevent no-op updates
 */
export const BulkUpdatePayloadSchema = z.object({
  contactIds: z.array(z.string()).min(1).max(30),
  updates: z.record(z.string(), z.unknown()).refine(
    (obj) => Object.keys(obj).length > 0,
    { message: 'Updates object must have at least one field' }
  ),
})

/**
 * DELETE_CONTACTS payload
 */
export const DeleteContactsPayloadSchema = z.object({
  contactIds: z.array(z.string()).min(1).max(30),
})

/**
 * CREATE_SAVED_VIEW payload
 */
export const CreateSavedViewPayloadSchema = z.object({
  name: z.string().min(1).max(100),
  filters: z.record(z.string(), z.unknown()),
  sort: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Map of action types to their validation schemas
 */
export const ACTION_PAYLOAD_SCHEMAS: Record<AiActionTypeValue, z.ZodSchema> = {
  [AiActionType.FIND_CONTACTS]: FindContactsPayloadSchema,
  [AiActionType.SHOW_STAGED_RESULTS]: ShowStagedResultsPayloadSchema,
  [AiActionType.DELETE_STAGED_ROW]: DeleteStagedRowPayloadSchema,
  [AiActionType.APPROVE_STAGED_LIST]: ApproveListPayloadSchema,
  [AiActionType.RUN_EMAIL_FINDING]: CampaignIdPayloadSchema,
  [AiActionType.RUN_INSERTS]: CampaignIdPayloadSchema,
  [AiActionType.RUN_DRAFTS]: RunDraftsPayloadSchema,
  [AiActionType.SEND_EMAILS]: CampaignIdPayloadSchema,
  [AiActionType.QUERY_CONTACTS]: QueryContactsPayloadSchema,
  [AiActionType.MOVE_STAGE]: MoveStagePayloadSchema,
  [AiActionType.UPDATE_FIELD]: UpdateFieldPayloadSchema,
  [AiActionType.BULK_UPDATE]: BulkUpdatePayloadSchema,
  [AiActionType.DELETE_CONTACTS]: DeleteContactsPayloadSchema,
  [AiActionType.CREATE_SAVED_VIEW]: CreateSavedViewPayloadSchema,
}

/**
 * Validate action payload against its schema
 */
export function validateActionPayload<T extends AiActionTypeValue>(
  actionType: T,
  payload: unknown
): z.SafeParseReturnType<unknown, AiActionPayloads[T]> {
  const schema = ACTION_PAYLOAD_SCHEMAS[actionType]
  return schema.safeParse(payload) as z.SafeParseReturnType<unknown, AiActionPayloads[T]>
}
