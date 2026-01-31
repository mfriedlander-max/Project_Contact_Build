import { describe, it, expect, vi, beforeEach } from 'vitest'
import { stagingService } from '../stagingService'

const mockTx = {
  stagedContactList: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    stagedContactList: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    crm_Contacts: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}))

import { prismadb } from '@/lib/prisma'

const mockPrisma = vi.mocked(prismadb)

const USER_ID = 'user-123'
const SESSION_ID = 'session-abc'

const mockStagedContact = {
  id: 'staged-1',
  v: 0,
  userId: USER_ID,
  sessionId: SESSION_ID,
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme',
  position: 'CEO',
  email: 'john@acme.com',
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  sourceUrl: 'https://example.com',
  relevanceScore: 0.9,
  notes: 'Great fit',
  isApproved: false,
  isDeleted: false,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 86400000),
}

describe('stagingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStagedList', () => {
    it('returns staged contacts for user that are not deleted', async () => {
      mockPrisma.stagedContactList.findMany.mockResolvedValue([mockStagedContact])

      const result = await stagingService.getStagedList(USER_ID)

      expect(mockPrisma.stagedContactList.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual([mockStagedContact])
    })

    it('returns empty array when no staged contacts', async () => {
      mockPrisma.stagedContactList.findMany.mockResolvedValue([])

      const result = await stagingService.getStagedList(USER_ID)

      expect(result).toEqual([])
    })
  })

  describe('saveStagedList', () => {
    it('deletes old and creates new in a transaction', async () => {
      const contacts = [
        { firstName: 'Jane', lastName: 'Smith', company: 'Corp', position: 'CTO' },
      ]
      mockTx.stagedContactList.deleteMany.mockResolvedValue({ count: 0 })
      mockTx.stagedContactList.createMany.mockResolvedValue({ count: 1 })

      await stagingService.saveStagedList(USER_ID, SESSION_ID, contacts)

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockTx.stagedContactList.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      })
      expect(mockTx.stagedContactList.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: USER_ID,
            sessionId: SESSION_ID,
            firstName: 'Jane',
            lastName: 'Smith',
          }),
        ]),
      })
    })

    it('throws on invalid input (missing lastName)', async () => {
      const contacts = [{ firstName: 'Jane' }]

      await expect(
        stagingService.saveStagedList(USER_ID, SESSION_ID, contacts as never)
      ).rejects.toThrow()
    })
  })

  describe('deleteStagedRow', () => {
    it('soft-deletes a staged contact by id', async () => {
      mockPrisma.stagedContactList.findFirst.mockResolvedValue(mockStagedContact)
      mockPrisma.stagedContactList.update.mockResolvedValue({
        ...mockStagedContact,
        isDeleted: true,
      })

      await stagingService.deleteStagedRow(USER_ID, 'staged-1')

      expect(mockPrisma.stagedContactList.findFirst).toHaveBeenCalledWith({
        where: { id: 'staged-1', userId: USER_ID },
      })
      expect(mockPrisma.stagedContactList.update).toHaveBeenCalledWith({
        where: { id: 'staged-1' },
        data: { isDeleted: true },
      })
    })

    it('throws if contact not found', async () => {
      mockPrisma.stagedContactList.findFirst.mockResolvedValue(null)

      await expect(
        stagingService.deleteStagedRow(USER_ID, 'nonexistent')
      ).rejects.toThrow('Staged contact not found')
    })
  })

  describe('clearStagedList', () => {
    it('deletes all staged contacts for user', async () => {
      mockPrisma.stagedContactList.deleteMany.mockResolvedValue({ count: 5 })

      await stagingService.clearStagedList(USER_ID)

      expect(mockPrisma.stagedContactList.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      })
    })
  })

  describe('findExistingContacts', () => {
    it('should detect email match in email field', async () => {
      const existingContacts = [
        {
          email: 'jane.smith@example.com',
          personal_email: null,
          social_linkedin: null,
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          lastName: 'Doe',
          email: 'john.doe@example.com', // Not a match
        },
        {
          lastName: 'Smith',
          email: 'jane.smith@example.com', // MATCH via email
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set([1]))
    })

    it('should detect email match in personal_email field', async () => {
      const existingContacts = [
        {
          email: null,
          personal_email: 'jane@personal.com',
          social_linkedin: null,
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          lastName: 'Smith',
          email: 'jane@personal.com', // MATCH via personal_email
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set([0]))
    })

    it('should detect LinkedIn URL match', async () => {
      const existingContacts = [
        {
          email: null,
          personal_email: null,
          social_linkedin: 'https://linkedin.com/in/janesmith',
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          lastName: 'Smith',
          linkedinUrl: 'https://linkedin.com/in/janesmith', // MATCH
        },
        {
          lastName: 'Doe',
          linkedinUrl: 'https://linkedin.com/in/johndoe', // Not a match
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set([0]))
    })

    it('should normalize LinkedIn URLs (protocol and trailing slash)', async () => {
      const existingContacts = [
        {
          email: null,
          personal_email: null,
          social_linkedin: 'https://linkedin.com/in/janesmith/',
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          lastName: 'Smith',
          linkedinUrl: 'http://linkedin.com/in/janesmith', // MATCH (different protocol, no trailing slash)
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set([0]))
    })

    it('should detect name + company match (case insensitive)', async () => {
      const existingContacts = [
        {
          email: null,
          personal_email: null,
          social_linkedin: null,
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          firstName: 'jane', // Case insensitive match
          lastName: 'SMITH',
          company: 'techcorp',
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set([0]))
    })

    it('should NOT match if only name matches but company differs', async () => {
      const existingContacts = [
        {
          email: null,
          personal_email: null,
          social_linkedin: null,
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          firstName: 'Jane',
          lastName: 'Smith',
          company: 'DifferentCorp', // Different company = not a duplicate
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set()) // No matches
    })

    it('should NOT match if name is similar but not exact', async () => {
      const existingContacts = [
        {
          email: null,
          personal_email: null,
          social_linkedin: null,
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          firstName: 'Janet', // Similar but not exact
          lastName: 'Smith',
          company: 'TechCorp',
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set()) // No matches
    })

    it('should detect multiple duplicates using different strategies', async () => {
      const existingContacts = [
        {
          email: 'jane@example.com',
          personal_email: null,
          social_linkedin: null,
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
        {
          email: null,
          personal_email: null,
          social_linkedin: 'https://linkedin.com/in/bobdoe',
          first_name: 'Bob',
          last_name: 'Doe',
          company: 'StartupCo',
        },
        {
          email: null,
          personal_email: null,
          social_linkedin: null,
          first_name: 'Alice',
          last_name: 'Johnson',
          company: 'BigCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const candidates = [
        {
          lastName: 'Smith',
          email: 'jane@example.com', // Duplicate via email
        },
        {
          lastName: 'New',
          email: 'new@example.com', // Not a duplicate
        },
        {
          lastName: 'Doe',
          linkedinUrl: 'https://linkedin.com/in/bobdoe', // Duplicate via LinkedIn
        },
        {
          firstName: 'Alice',
          lastName: 'Johnson',
          company: 'BigCorp', // Duplicate via name + company
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set([0, 2, 3]))
    })

    it('should handle empty existing contacts', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([])

      const candidates = [
        {
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      ]

      const duplicates = await stagingService.findExistingContacts(USER_ID, candidates)

      expect(duplicates).toEqual(new Set()) // No existing contacts = no duplicates
    })

    it('should handle empty candidates', async () => {
      const existingContacts = [
        {
          email: 'jane@example.com',
          personal_email: null,
          social_linkedin: null,
          first_name: 'Jane',
          last_name: 'Smith',
          company: 'TechCorp',
        },
      ]

      mockPrisma.crm_Contacts.findMany.mockResolvedValue(existingContacts as never)

      const duplicates = await stagingService.findExistingContacts(USER_ID, [])

      expect(duplicates).toEqual(new Set()) // No candidates = no duplicates
    })

    it('should query only active contacts for the user', async () => {
      mockPrisma.crm_Contacts.findMany.mockResolvedValue([])

      await stagingService.findExistingContacts(USER_ID, [{ lastName: 'Test' }])

      expect(mockPrisma.crm_Contacts.findMany).toHaveBeenCalledWith({
        where: { assigned_to: USER_ID, status: true },
        select: {
          email: true,
          personal_email: true,
          social_linkedin: true,
          first_name: true,
          last_name: true,
          company: true,
        },
      })
    })
  })
})
