import { z } from 'zod'

// Student Networking CRM - Contact Schema
// Matches Prisma schema with workflow fields

export const emailConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW'])
export const insertConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW'])
export const emailStatusSchema = z.enum(['BLANK', 'DRAFTED', 'SENT'])
export const connectionLevelSchema = z.enum([
  'NONE',
  'MESSAGE_SENT',
  'CONNECTED',
  'IN_TOUCH',
  'FRIENDS',
])

export const contactSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string(),
  email: z.string().nullable(),
  personal_email: z.string().nullable(),
  office_phone: z.string().nullable(),
  mobile_phone: z.string().nullable(),
  website: z.string().nullable(),
  position: z.string().nullable(),
  status: z.boolean(),
  type: z.string().nullable(),

  // Student Networking CRM - Workflow Fields
  company: z.string().nullable().optional(),
  email_confidence: emailConfidenceSchema.nullable().optional(),
  personalized_insert: z.string().nullable().optional(),
  insert_confidence: insertConfidenceSchema.nullable().optional(),
  email_status: emailStatusSchema.nullable().optional(),
  draft_created_at: z.date().nullable().optional(),
  sent_at: z.date().nullable().optional(),
  connection_level: connectionLevelSchema.nullable().optional(),
  campaign: z.string().nullable().optional(),
  custom_fields: z.record(z.any()).nullable().optional(),

  // Timestamps
  created_on: z.date().nullable().optional(),

  // Relations
  assigned_to_user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
    })
    .nullable()
    .optional(),
  assigned_accounts: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
})

export type Contact = z.infer<typeof contactSchema>

// Legacy alias for backwards compatibility
export const opportunitySchema = contactSchema
export type Opportunity = Contact
