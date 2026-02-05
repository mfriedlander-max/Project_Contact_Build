/**
 * Contact Service - CRM contact management operations
 * Implements ContactServiceDeps interface for action handlers
 */

import { prismadb } from '@/lib/prisma'
import type { Contact, ContactFilters } from '@/src/server/actions/handlers/interfaces'
import type { crm_Contacts } from '@prisma/client'

const ALLOWED_UPDATE_FIELDS = new Set([
  'first_name',
  'last_name',
  'company',
  'email',
  'personal_email',
  'position',
  'office_phone',
  'mobile_phone',
  'website',
  'description',
  'social_linkedin',
  'social_twitter',
  'social_facebook',
  'connection_stage',
  'email_status',
  'personalized_insert',
])

/**
 * Transforms a Prisma crm_Contacts record to the Contact interface
 * Handles name concatenation and field mapping
 */
function toContact(dbContact: crm_Contacts): Contact {
  const firstName = dbContact.first_name ?? ''
  const lastName = dbContact.last_name ?? ''
  const name = `${firstName} ${lastName}`.trim()

  // Extract custom_fields as Json and spread into result
  const customFields = (dbContact.custom_fields as Record<string, unknown>) ?? {}

  return {
    id: dbContact.id,
    name,
    company: dbContact.company ?? '',
    email: dbContact.email ?? undefined,
    stage: dbContact.connection_stage ?? 'DRAFTED',
    campaignId: dbContact.campaignId ?? '',
    // Spread additional fields for extensibility
    ...customFields,
    // Include other useful fields
    first_name: dbContact.first_name ?? undefined,
    last_name: dbContact.last_name,
    position: dbContact.position ?? undefined,
    email_status: dbContact.email_status ?? undefined,
    connection_level: dbContact.connection_level ?? undefined,
    personalized_insert: dbContact.personalized_insert ?? undefined,
    social_linkedin: dbContact.social_linkedin ?? undefined,
  }
}

/**
 * Builds Prisma where clause from ContactFilters
 */
function buildWhereClause(userId: string, filters: ContactFilters) {
  const where: Record<string, unknown> = { assigned_to: userId }

  if (filters.stage) {
    where.connection_stage = filters.stage
  }

  if (filters.campaignId) {
    where.campaignId = filters.campaignId
  }

  if (filters.search) {
    where.OR = [
      { first_name: { contains: filters.search, mode: 'insensitive' } },
      { last_name: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  // Note: industry filter is in ContactFilters interface but not directly on crm_Contacts
  // This would require joining with accounts or using custom_fields
  // For now, we check if it exists in custom_fields
  if (filters.industry) {
    where.custom_fields = {
      path: ['industry'],
      equals: filters.industry,
    }
  }

  return where
}

export const contactService = {
  /**
   * Query contacts for a user with optional filters
   * Returns contacts matching the filters, ordered by creation date descending
   */
  async query(userId: string, filters: ContactFilters): Promise<ReadonlyArray<Contact>> {
    const where = buildWhereClause(userId, filters)

    const contacts = await prismadb.crm_Contacts.findMany({
      where,
      orderBy: { created_on: 'desc' },
    })

    return contacts.map(toContact)
  },

  /**
   * Move a contact to a new pipeline stage
   */
  async moveStage(contactId: string, newStage: string): Promise<Contact> {
    // Validate stage value at runtime
    const VALID_STAGES = ['DRAFTED', 'MESSAGE_SENT', 'DIDNT_CONNECT', 'CONNECTED', 'IN_TOUCH'] as const
    if (!VALID_STAGES.includes(newStage as typeof VALID_STAGES[number])) {
      throw new Error(`Invalid stage: ${newStage}`)
    }

    // Check if contact exists first
    const existing = await prismadb.crm_Contacts.findUnique({
      where: { id: contactId },
    })

    if (!existing) {
      throw new Error(`Contact not found: ${contactId}`)
    }

    const updated = await prismadb.crm_Contacts.update({
      where: { id: contactId },
      data: { connection_stage: newStage as typeof VALID_STAGES[number] },
    })
    return toContact(updated)
  },

  /**
   * Update a single field on a contact
   */
  async updateField(contactId: string, field: string, value: unknown): Promise<Contact> {
    // Validate field is allowed
    if (!ALLOWED_UPDATE_FIELDS.has(field)) {
      throw new Error(`Field '${field}' is not updatable`)
    }

    // Special validation for connection_stage
    if (field === 'connection_stage') {
      const VALID_STAGES = ['DRAFTED', 'MESSAGE_SENT', 'DIDNT_CONNECT', 'CONNECTED', 'IN_TOUCH'] as const
      if (!VALID_STAGES.includes(value as typeof VALID_STAGES[number])) {
        throw new Error(`Invalid stage: ${value}`)
      }
    }

    // Check contact exists
    const existing = await prismadb.crm_Contacts.findUnique({
      where: { id: contactId },
    })

    if (!existing) {
      throw new Error(`Contact not found: ${contactId}`)
    }

    // Update the field
    const updated = await prismadb.crm_Contacts.update({
      where: { id: contactId },
      data: { [field]: value },
    })

    return toContact(updated)
  },

  /**
   * Bulk update multiple contacts with the same updates
   */
  async bulkUpdate(
    contactIds: string[],
    updates: Record<string, unknown>
  ): Promise<number> {
    // Filter out disallowed fields
    const allowedUpdates: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(updates)) {
      if (ALLOWED_UPDATE_FIELDS.has(field)) {
        // Validate connection_stage if present
        if (field === 'connection_stage') {
          const VALID_STAGES = ['DRAFTED', 'MESSAGE_SENT', 'DIDNT_CONNECT', 'CONNECTED', 'IN_TOUCH'] as const
          if (!VALID_STAGES.includes(value as typeof VALID_STAGES[number])) {
            throw new Error(`Invalid stage: ${value}`)
          }
        }
        allowedUpdates[field] = value
      }
    }

    // If no valid updates, return 0
    if (Object.keys(allowedUpdates).length === 0) {
      return 0
    }

    const result = await prismadb.crm_Contacts.updateMany({
      where: { id: { in: contactIds } },
      data: allowedUpdates,
    })

    return result.count
  },

  /**
   * Delete multiple contacts by ID
   */
  async deleteContacts(contactIds: string[]): Promise<number> {
    if (contactIds.length === 0) {
      return 0
    }

    const result = await prismadb.crm_Contacts.deleteMany({
      where: { id: { in: contactIds } },
    })

    return result.count
  },
}

// Export toContact for testing
export { toContact }
