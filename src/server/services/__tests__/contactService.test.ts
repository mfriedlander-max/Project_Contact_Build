import { describe, it, expect, vi, beforeEach } from 'vitest'
import { contactService, toContact } from '../contactService'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prismadb: {
    crm_Contacts: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prismadb } from '@/lib/prisma'

const mockPrisma = vi.mocked(prismadb)
const USER_ID = 'user-123'
const CAMPAIGN_ID = 'campaign-456'

// Sample database contact records
const mockDbContacts = [
  {
    id: 'contact-1',
    v: 0,
    account: null,
    assigned_to: USER_ID,
    birthday: null,
    created_by: USER_ID,
    createdBy: USER_ID,
    created_on: new Date('2026-01-15'),
    cratedAt: new Date('2026-01-15'),
    last_activity: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-20'),
    updatedBy: USER_ID,
    last_activity_by: USER_ID,
    description: 'Test contact',
    email: 'john@acme.com',
    personal_email: null,
    first_name: 'John',
    last_name: 'Doe',
    office_phone: null,
    mobile_phone: '555-1234',
    website: null,
    position: 'CEO',
    status: true,
    social_twitter: null,
    social_facebook: null,
    social_linkedin: 'https://linkedin.com/in/johndoe',
    social_skype: null,
    social_instagram: null,
    social_youtube: null,
    social_tiktok: null,
    type: 'Customer',
    tags: [],
    notes: [],
    company: 'Acme Corp',
    email_confidence: 'HIGH' as const,
    personalized_insert: 'Great meeting you at the conference!',
    insert_confidence: 'HIGH' as const,
    email_status: 'DRAFTED' as const,
    draft_created_at: new Date('2026-01-18'),
    sent_at: null,
    connection_level: 'NONE' as const,
    campaign: null,
    custom_fields: { industry: 'Technology' },
    campaignId: CAMPAIGN_ID,
    connection_stage: 'DRAFTED' as const,
    gmail_thread_id: null,
    gmail_message_id: null,
    gmail_draft_id: null,
    gmail_last_sync: null,
    opportunitiesIDs: [],
    accountsIDs: null,
    documentsIDs: [],
  },
  {
    id: 'contact-2',
    v: 0,
    account: null,
    assigned_to: USER_ID,
    birthday: null,
    created_by: USER_ID,
    createdBy: USER_ID,
    created_on: new Date('2026-01-10'),
    cratedAt: new Date('2026-01-10'),
    last_activity: new Date('2026-01-25'),
    updatedAt: new Date('2026-01-25'),
    updatedBy: USER_ID,
    last_activity_by: USER_ID,
    description: null,
    email: 'jane@techstart.io',
    personal_email: 'jane.personal@email.com',
    first_name: 'Jane',
    last_name: 'Smith',
    office_phone: '555-9999',
    mobile_phone: null,
    website: 'https://techstart.io',
    position: 'CTO',
    status: true,
    social_twitter: '@janesmith',
    social_facebook: null,
    social_linkedin: 'https://linkedin.com/in/janesmith',
    social_skype: null,
    social_instagram: null,
    social_youtube: null,
    social_tiktok: null,
    type: 'Prospect',
    tags: ['tech', 'startup'],
    notes: ['Met at hackathon'],
    company: 'TechStart',
    email_confidence: 'MEDIUM' as const,
    personalized_insert: null,
    insert_confidence: null,
    email_status: 'BLANK' as const,
    draft_created_at: null,
    sent_at: null,
    connection_level: 'CONNECTED' as const,
    campaign: null,
    custom_fields: { industry: 'Startup' },
    campaignId: CAMPAIGN_ID,
    connection_stage: 'CONNECTED' as const,
    gmail_thread_id: 'thread-123',
    gmail_message_id: 'msg-456',
    gmail_draft_id: null,
    gmail_last_sync: new Date('2026-01-24'),
    opportunitiesIDs: [],
    accountsIDs: null,
    documentsIDs: [],
  },
  {
    id: 'contact-3',
    v: 0,
    account: null,
    assigned_to: USER_ID,
    birthday: null,
    created_by: USER_ID,
    createdBy: USER_ID,
    created_on: new Date('2026-01-05'),
    cratedAt: new Date('2026-01-05'),
    last_activity: null,
    updatedAt: null,
    updatedBy: null,
    last_activity_by: null,
    description: null,
    email: null,
    personal_email: null,
    first_name: null,
    last_name: 'Wilson',
    office_phone: null,
    mobile_phone: null,
    website: null,
    position: null,
    status: true,
    social_twitter: null,
    social_facebook: null,
    social_linkedin: null,
    social_skype: null,
    social_instagram: null,
    social_youtube: null,
    social_tiktok: null,
    type: null,
    tags: [],
    notes: [],
    company: null,
    email_confidence: null,
    personalized_insert: null,
    insert_confidence: null,
    email_status: 'BLANK' as const,
    draft_created_at: null,
    sent_at: null,
    connection_level: null,
    campaign: null,
    custom_fields: null,
    campaignId: null,
    connection_stage: null,
    gmail_thread_id: null,
    gmail_message_id: null,
    gmail_draft_id: null,
    gmail_last_sync: null,
    opportunitiesIDs: [],
    accountsIDs: null,
    documentsIDs: [],
  },
]

describe('contactService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('toContact', () => {
    it('transforms database contact to Contact interface with full name', () => {
      const result = toContact(mockDbContacts[0])

      expect(result.id).toBe('contact-1')
      expect(result.name).toBe('John Doe')
      expect(result.company).toBe('Acme Corp')
      expect(result.email).toBe('john@acme.com')
      expect(result.stage).toBe('DRAFTED')
      expect(result.campaignId).toBe(CAMPAIGN_ID)
    })

    it('handles missing first_name gracefully', () => {
      const result = toContact(mockDbContacts[2])

      expect(result.name).toBe('Wilson')
      expect(result.company).toBe('')
      expect(result.email).toBeUndefined()
      expect(result.stage).toBe('DRAFTED') // Default when null
      expect(result.campaignId).toBe('')
    })

    it('spreads custom_fields into Contact object', () => {
      const result = toContact(mockDbContacts[0])

      expect(result.industry).toBe('Technology')
    })

    it('includes additional useful fields', () => {
      const result = toContact(mockDbContacts[0])

      expect(result.first_name).toBe('John')
      expect(result.last_name).toBe('Doe')
      expect(result.position).toBe('CEO')
      expect(result.email_status).toBe('DRAFTED')
      expect(result.connection_level).toBe('NONE')
      expect(result.personalized_insert).toBe('Great meeting you at the conference!')
      expect(result.social_linkedin).toBe('https://linkedin.com/in/johndoe')
    })
  })

  describe('query', () => {
    it('returns all contacts for user when no filters provided', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue(mockDbContacts)

      const result = await contactService.query(USER_ID, {})

      expect(mockPrisma.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: { assigned_to: USER_ID },
        orderBy: { created_on: 'desc' },
      })
      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('John Doe')
      expect(result[1].name).toBe('Jane Smith')
      expect(result[2].name).toBe('Wilson')
    })

    it('filters by stage when provided', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([mockDbContacts[0]])

      const result = await contactService.query(USER_ID, { stage: 'DRAFTED' })

      expect(mockPrisma.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: {
          assigned_to: USER_ID,
          connection_stage: 'DRAFTED',
        },
        orderBy: { created_on: 'desc' },
      })
      expect(result).toHaveLength(1)
      expect(result[0].stage).toBe('DRAFTED')
    })

    it('filters by campaignId when provided', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([mockDbContacts[0], mockDbContacts[1]])

      const result = await contactService.query(USER_ID, { campaignId: CAMPAIGN_ID })

      expect(mockPrisma.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: {
          assigned_to: USER_ID,
          campaignId: CAMPAIGN_ID,
        },
        orderBy: { created_on: 'desc' },
      })
      expect(result).toHaveLength(2)
    })

    it('filters by search term across multiple fields', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([mockDbContacts[0]])

      const result = await contactService.query(USER_ID, { search: 'john' })

      expect(mockPrisma.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: {
          assigned_to: USER_ID,
          OR: [
            { first_name: { contains: 'john', mode: 'insensitive' } },
            { last_name: { contains: 'john', mode: 'insensitive' } },
            { company: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        orderBy: { created_on: 'desc' },
      })
      expect(result).toHaveLength(1)
    })

    it('filters by industry using custom_fields path', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([mockDbContacts[0]])

      const result = await contactService.query(USER_ID, { industry: 'Technology' })

      expect(mockPrisma.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: {
          assigned_to: USER_ID,
          custom_fields: {
            path: ['industry'],
            equals: 'Technology',
          },
        },
        orderBy: { created_on: 'desc' },
      })
      expect(result).toHaveLength(1)
    })

    it('combines multiple filters', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([mockDbContacts[0]])

      const result = await contactService.query(USER_ID, {
        stage: 'DRAFTED',
        campaignId: CAMPAIGN_ID,
        search: 'acme',
      })

      expect(mockPrisma.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: {
          assigned_to: USER_ID,
          connection_stage: 'DRAFTED',
          campaignId: CAMPAIGN_ID,
          OR: [
            { first_name: { contains: 'acme', mode: 'insensitive' } },
            { last_name: { contains: 'acme', mode: 'insensitive' } },
            { company: { contains: 'acme', mode: 'insensitive' } },
            { email: { contains: 'acme', mode: 'insensitive' } },
          ],
        },
        orderBy: { created_on: 'desc' },
      })
      expect(result).toHaveLength(1)
    })

    it('returns empty array when no contacts match', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([])

      const result = await contactService.query(USER_ID, { search: 'nonexistent' })

      expect(result).toHaveLength(0)
    })

    it('returns readonly array', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue(mockDbContacts)

      const result = await contactService.query(USER_ID, {})

      // TypeScript enforces ReadonlyArray at compile time
      // At runtime, we verify it's an array
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('moveStage', () => {
    it('updates contact stage and returns transformed contact', async () => {
      const updatedContact = { ...mockDbContacts[0], connection_stage: 'MESSAGE_SENT' as const }
      mockPrisma.crm_Contacts.findUnique.mockResolvedValue(mockDbContacts[0])
      mockPrisma.crm_Contacts.update.mockResolvedValue(updatedContact)

      const result = await contactService.moveStage('contact-1', 'MESSAGE_SENT')

      expect(mockPrisma.crm_Contacts.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
      })
      expect(mockPrisma.crm_Contacts.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: { connection_stage: 'MESSAGE_SENT' },
      })
      expect(result.stage).toBe('MESSAGE_SENT')
      expect(result.id).toBe('contact-1')
    })

    it('throws error for invalid stage value', async () => {
      await expect(
        contactService.moveStage('contact-1', 'INVALID_STAGE')
      ).rejects.toThrow('Invalid stage: INVALID_STAGE')

      expect(mockPrisma.crm_Contacts.update).not.toHaveBeenCalled()
    })

    it('throws error when contact not found', async () => {
      mockPrisma.crm_Contacts.findUnique.mockResolvedValue(null)

      await expect(
        contactService.moveStage('nonexistent-contact', 'MESSAGE_SENT')
      ).rejects.toThrow('Contact not found: nonexistent-contact')
    })
  })

  describe('updateField', () => {
    it('updates a standard field successfully', async () => {
      const updatedContact = { ...mockDbContacts[0], company: 'New Company' }
      mockPrisma.crm_Contacts.findUnique.mockResolvedValue(mockDbContacts[0])
      mockPrisma.crm_Contacts.update.mockResolvedValue(updatedContact)

      const result = await contactService.updateField('contact-1', 'company', 'New Company')

      expect(mockPrisma.crm_Contacts.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: { company: 'New Company' },
      })
      expect(result.company).toBe('New Company')
    })

    it('throws error for disallowed field', async () => {
      await expect(
        contactService.updateField('contact-1', 'assigned_to', 'hacker-id')
      ).rejects.toThrow("Field 'assigned_to' is not updatable")

      expect(mockPrisma.crm_Contacts.update).not.toHaveBeenCalled()
    })

    it('validates connection_stage enum values', async () => {
      await expect(
        contactService.updateField('contact-1', 'connection_stage', 'INVALID')
      ).rejects.toThrow('Invalid stage: INVALID')

      expect(mockPrisma.crm_Contacts.update).not.toHaveBeenCalled()
    })

    it('throws error when contact not found', async () => {
      mockPrisma.crm_Contacts.findUnique.mockResolvedValue(null)

      await expect(
        contactService.updateField('nonexistent', 'company', 'Test')
      ).rejects.toThrow('Contact not found: nonexistent')
    })
  })

  describe('bulkUpdate', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('updates multiple contacts with allowed fields', async () => {
      mockPrisma.crm_Contacts.updateMany.mockResolvedValue({ count: 3 })

      const result = await contactService.bulkUpdate(
        ['contact-1', 'contact-2', 'contact-3'],
        { company: 'New Corp', position: 'Manager' }
      )

      expect(mockPrisma.crm_Contacts.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['contact-1', 'contact-2', 'contact-3'] } },
        data: { company: 'New Corp', position: 'Manager' },
      })
      expect(result).toBe(3)
    })

    it('filters out disallowed fields', async () => {
      mockPrisma.crm_Contacts.updateMany.mockResolvedValue({ count: 2 })

      const result = await contactService.bulkUpdate(
        ['contact-1', 'contact-2'],
        { company: 'Good Corp', assigned_to: 'hacker-id', id: 'fake-id' }
      )

      expect(mockPrisma.crm_Contacts.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['contact-1', 'contact-2'] } },
        data: { company: 'Good Corp' },
      })
      expect(result).toBe(2)
    })

    it('returns 0 when no valid updates provided', async () => {
      const result = await contactService.bulkUpdate(
        ['contact-1'],
        { assigned_to: 'hacker-id', id: 'fake-id' }
      )

      expect(mockPrisma.crm_Contacts.updateMany).not.toHaveBeenCalled()
      expect(result).toBe(0)
    })

    it('validates connection_stage in bulk updates', async () => {
      await expect(
        contactService.bulkUpdate(['contact-1'], { connection_stage: 'INVALID' })
      ).rejects.toThrow('Invalid stage: INVALID')

      expect(mockPrisma.crm_Contacts.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('deleteContacts', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('deletes multiple contacts and returns count', async () => {
      mockPrisma.crm_Contacts.deleteMany.mockResolvedValue({ count: 3 })

      const result = await contactService.deleteContacts(['contact-1', 'contact-2', 'contact-3'])

      expect(mockPrisma.crm_Contacts.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['contact-1', 'contact-2', 'contact-3'] } },
      })
      expect(result).toBe(3)
    })

    it('returns 0 for empty array', async () => {
      const result = await contactService.deleteContacts([])

      expect(mockPrisma.crm_Contacts.deleteMany).not.toHaveBeenCalled()
      expect(result).toBe(0)
    })

    it('returns 0 when no contacts match', async () => {
      mockPrisma.crm_Contacts.deleteMany.mockResolvedValue({ count: 0 })

      const result = await contactService.deleteContacts(['nonexistent-1', 'nonexistent-2'])

      expect(result).toBe(0)
    })
  })
})
