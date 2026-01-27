/**
 * Student Networking CRM - Contact Types
 * Defines the workflow-specific types for contact management
 */

// Enums matching Prisma schema
export const EmailConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const

export type EmailConfidenceType = (typeof EmailConfidence)[keyof typeof EmailConfidence]

export const InsertConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const

export type InsertConfidenceType = (typeof InsertConfidence)[keyof typeof InsertConfidence]

export const EmailStatus = {
  BLANK: 'BLANK',
  DRAFTED: 'DRAFTED',
  SENT: 'SENT',
} as const

export type EmailStatusType = (typeof EmailStatus)[keyof typeof EmailStatus]

export const ConnectionLevel = {
  NONE: 'NONE',
  MESSAGE_SENT: 'MESSAGE_SENT',
  CONNECTED: 'CONNECTED',
  IN_TOUCH: 'IN_TOUCH',
  FRIENDS: 'FRIENDS',
} as const

export type ConnectionLevelType = (typeof ConnectionLevel)[keyof typeof ConnectionLevel]

// Validation functions
export function isValidEmailConfidence(value: unknown): value is EmailConfidenceType {
  return (
    typeof value === 'string' &&
    Object.values(EmailConfidence).includes(value as EmailConfidenceType)
  )
}

export function isValidInsertConfidence(value: unknown): value is InsertConfidenceType {
  return (
    typeof value === 'string' &&
    Object.values(InsertConfidence).includes(value as InsertConfidenceType)
  )
}

export function isValidEmailStatus(value: unknown): value is EmailStatusType {
  return (
    typeof value === 'string' && Object.values(EmailStatus).includes(value as EmailStatusType)
  )
}

export function isValidConnectionLevel(value: unknown): value is ConnectionLevelType {
  return (
    typeof value === 'string' &&
    Object.values(ConnectionLevel).includes(value as ConnectionLevelType)
  )
}

// Custom fields type for user-defined columns
export interface ContactCustomFields {
  [key: string]: string | number | boolean | null | undefined
}

// Main Contact interface matching Prisma + workflow fields
export interface Contact {
  id: string
  first_name?: string
  last_name: string
  email?: string
  personal_email?: string
  office_phone?: string
  mobile_phone?: string
  website?: string
  position?: string
  status?: boolean
  description?: string

  // Social profiles
  social_twitter?: string
  social_facebook?: string
  social_linkedin?: string
  social_skype?: string
  social_instagram?: string
  social_youtube?: string
  social_tiktok?: string

  // Type and tags
  type?: string
  tags?: string[]
  notes?: string[]

  // Student Networking CRM - Workflow Fields
  company?: string
  email_confidence?: EmailConfidenceType
  personalized_insert?: string
  insert_confidence?: InsertConfidenceType
  email_status?: EmailStatusType
  draft_created_at?: Date
  sent_at?: Date
  connection_level?: ConnectionLevelType
  campaign?: string
  custom_fields?: ContactCustomFields

  // Timestamps
  created_on?: Date
  cratedAt?: Date
  updatedAt?: Date
  last_activity?: Date

  // Relations (IDs)
  account?: string
  assigned_to?: string
  created_by?: string
  accountsIDs?: string
  opportunitiesIDs?: string[]
  documentsIDs?: string[]
}
