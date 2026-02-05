/**
 * Stage Executors - Pipeline execution for campaign workflows
 * Wires together the stage functions with database operations
 */

import { prismadb } from '@/lib/prisma'
import type { Contact } from '@/lib/types/contact'
import type { crm_Contacts } from '@prisma/client'
import type { StageExecutors, StageResult } from './interfaces'

import { executeEmailFindingStage } from '@/src/server/integrations/stages/emailFindingStage'
import { executeInsertStage } from '@/src/server/integrations/stages/insertStage'
import { executeDraftStage, type TemplateInput } from '@/src/server/integrations/stages/draftStage'
import { executeSendStage } from '@/src/server/integrations/stages/sendStage'

/**
 * Transform a Prisma contact record to the Contact type used by stages
 */
function toStageContact(dbContact: crm_Contacts): Contact {
  return {
    id: dbContact.id,
    first_name: dbContact.first_name ?? undefined,
    last_name: dbContact.last_name,
    email: dbContact.email ?? undefined,
    personal_email: dbContact.personal_email ?? undefined,
    office_phone: dbContact.office_phone ?? undefined,
    mobile_phone: dbContact.mobile_phone ?? undefined,
    website: dbContact.website ?? undefined,
    position: dbContact.position ?? undefined,
    status: dbContact.status,
    description: dbContact.description ?? undefined,
    company: dbContact.company ?? undefined,
    email_confidence: dbContact.email_confidence ?? undefined,
    personalized_insert: dbContact.personalized_insert ?? undefined,
    insert_confidence: dbContact.insert_confidence ?? undefined,
    email_status: dbContact.email_status ?? undefined,
    draft_created_at: dbContact.draft_created_at ?? undefined,
    sent_at: dbContact.sent_at ?? undefined,
    connection_level: dbContact.connection_level ?? undefined,
    connection_stage: dbContact.connection_stage ?? undefined,
    campaign: dbContact.campaign ?? undefined,
    custom_fields: dbContact.custom_fields as Contact['custom_fields'],
    social_linkedin: dbContact.social_linkedin ?? undefined,
    social_twitter: dbContact.social_twitter ?? undefined,
    social_facebook: dbContact.social_facebook ?? undefined,
    assigned_to: dbContact.assigned_to ?? undefined,
    tags: dbContact.tags,
    notes: dbContact.notes,
  }
}

/**
 * Load contacts for a campaign from the database
 */
async function loadCampaignContacts(campaignId: string): Promise<{
  contacts: Contact[]
  userId: string | null
}> {
  const campaign = await prismadb.campaign.findUnique({
    where: { id: campaignId },
    select: { userId: true },
  })

  if (!campaign) {
    return { contacts: [], userId: null }
  }

  const dbContacts = await prismadb.crm_Contacts.findMany({
    where: { campaignId },
  })

  return {
    contacts: dbContacts.map(toStageContact),
    userId: campaign.userId,
  }
}

/**
 * Load user's availability block from Settings
 */
async function loadUserAvailability(userId: string): Promise<string> {
  const settings = await prismadb.settings.findUnique({
    where: { userId },
    select: { availabilityBlock: true },
  })

  return settings?.availabilityBlock ?? ''
}

/**
 * Load a template by ID
 */
async function loadTemplate(
  templateId: string,
  userId: string
): Promise<TemplateInput | null> {
  const template = await prismadb.template.findFirst({
    where: { id: templateId, userId },
    select: { subject: true, body: true },
  })

  return template
}

/**
 * Persist updated contacts back to the database
 * Only updates fields that the stages modify
 */
async function persistContacts(contacts: Contact[]): Promise<void> {
  await prismadb.$transaction(
    contacts.map((contact) =>
      prismadb.crm_Contacts.update({
        where: { id: contact.id },
        data: {
          email: contact.email ?? null,
          email_confidence: contact.email_confidence ?? null,
          personalized_insert: contact.personalized_insert ?? null,
          insert_confidence: contact.insert_confidence ?? null,
          email_status: contact.email_status ?? null,
          draft_created_at: contact.draft_created_at ?? null,
          sent_at: contact.sent_at ?? null,
          connection_level: contact.connection_level ?? null,
          // Store gmail_draft_id in custom_fields if present
          custom_fields: contact.custom_fields ?? undefined,
        },
      })
    )
  )
}

export const stageExecutors: StageExecutors = {
  /**
   * Email Finding Stage
   * Uses Hunter.io to find email addresses for campaign contacts
   */
  emailFinding: async (campaignId: string): Promise<StageResult> => {
    const { contacts, userId } = await loadCampaignContacts(campaignId)

    if (contacts.length === 0 || !userId) {
      return { processedCount: 0, errors: [] }
    }

    const result = await executeEmailFindingStage(contacts, userId)

    await persistContacts(result.contacts)

    return {
      processedCount: result.found + result.notFound,
      errors: result.errors,
    }
  },

  /**
   * Inserts Stage
   * Generates personalized email inserts using AI
   */
  inserts: async (campaignId: string): Promise<StageResult> => {
    const { contacts } = await loadCampaignContacts(campaignId)

    if (contacts.length === 0) {
      return { processedCount: 0, errors: [] }
    }

    const result = await executeInsertStage(contacts)

    await persistContacts(result.contacts)

    return {
      processedCount: result.generated + result.skipped,
      errors: result.errors,
    }
  },

  /**
   * Drafts Stage
   * Creates Gmail drafts using template + contact data + availability
   */
  drafts: async (campaignId: string, templateId: string): Promise<StageResult> => {
    const { contacts, userId } = await loadCampaignContacts(campaignId)

    if (contacts.length === 0 || !userId) {
      return { processedCount: 0, errors: [] }
    }

    const template = await loadTemplate(templateId, userId)
    if (!template) {
      return {
        processedCount: 0,
        errors: [{ contactId: 'N/A', error: `Template not found: ${templateId}` }],
      }
    }

    const availability = await loadUserAvailability(userId)

    const result = await executeDraftStage(
      contacts,
      template,
      availability,
      userId
    )

    // Mark draft_created_at for drafted contacts
    const updatedContacts = result.contacts.map((c) => ({
      ...c,
      draft_created_at: c.email_status === 'DRAFTED' ? new Date() : c.draft_created_at,
    }))

    await persistContacts(updatedContacts)

    return {
      processedCount: result.drafted + result.skipped,
      errors: result.errors,
    }
  },

  /**
   * Send Stage
   * Sends Gmail drafts for contacts that have been drafted
   */
  send: async (campaignId: string): Promise<StageResult> => {
    const { contacts, userId } = await loadCampaignContacts(campaignId)

    if (contacts.length === 0 || !userId) {
      return { processedCount: 0, errors: [] }
    }

    const result = await executeSendStage(contacts, userId)

    await persistContacts(result.contacts)

    return {
      processedCount: result.sent + result.skipped,
      errors: result.errors,
    }
  },
}
