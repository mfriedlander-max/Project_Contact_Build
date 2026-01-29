import { describe, it, expect, vi, beforeEach } from 'vitest'
import { approveService } from '../approveService'

const mockTx = {
  campaign: {
    create: vi.fn(),
  },
  crm_Contacts: {
    createMany: vi.fn(),
  },
  stagedContactList: {
    deleteMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    stagedContactList: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  },
}))

import { prismadb } from '@/lib/prisma'

const mockPrisma = vi.mocked(prismadb)
const USER_ID = 'user-123'

const mockStagedContacts = [
  {
    id: 'staged-1',
    v: 0,
    userId: USER_ID,
    sessionId: 'session-abc',
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme',
    position: 'CEO',
    email: 'john@acme.com',
    linkedinUrl: null,
    sourceUrl: null,
    relevanceScore: 0.9,
    notes: null,
    isApproved: false,
    isDeleted: false,
    createdAt: new Date(),
    expiresAt: new Date(),
  },
  {
    id: 'staged-2',
    v: 0,
    userId: USER_ID,
    sessionId: 'session-abc',
    firstName: 'Jane',
    lastName: 'Smith',
    company: 'Corp',
    position: 'CTO',
    email: 'jane@corp.com',
    linkedinUrl: null,
    sourceUrl: null,
    relevanceScore: 0.8,
    notes: null,
    isApproved: false,
    isDeleted: false,
    createdAt: new Date(),
    expiresAt: new Date(),
  },
]

const mockCampaign = {
  id: 'campaign-new',
  v: 0,
  userId: USER_ID,
  name: 'My Campaign',
  description: null,
  status: 'DRAFT' as const,
  createdAt: new Date(),
  updatedAt: null,
  templateId: null,
}

describe('approveService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('approveList', () => {
    it('creates campaign and contacts from kept staged contacts in transaction', async () => {
      mockPrisma.stagedContactList.findMany.mockResolvedValue(mockStagedContacts)
      mockTx.campaign.create.mockResolvedValue(mockCampaign)
      mockTx.crm_Contacts.createMany.mockResolvedValue({ count: 1 })
      mockTx.stagedContactList.deleteMany.mockResolvedValue({ count: 2 })

      const result = await approveService.approveList(
        USER_ID,
        'My Campaign',
        ['staged-1']
      )

      expect(result.campaign).toEqual(mockCampaign)
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockTx.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          name: 'My Campaign',
          status: 'DRAFT',
        }),
      })
      expect(mockTx.crm_Contacts.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            first_name: 'John',
            last_name: 'Doe',
            company: 'Acme',
            campaignId: 'campaign-new',
            connection_stage: 'DRAFTED',
          }),
        ]),
      })
      expect(mockTx.stagedContactList.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      })
    })

    it('sanitizes campaignName to prevent XSS', async () => {
      mockPrisma.stagedContactList.findMany.mockResolvedValue(mockStagedContacts)
      mockTx.campaign.create.mockResolvedValue(mockCampaign)
      mockTx.crm_Contacts.createMany.mockResolvedValue({ count: 1 })
      mockTx.stagedContactList.deleteMany.mockResolvedValue({ count: 1 })

      await approveService.approveList(
        USER_ID,
        '<script>alert("xss")</script>',
        ['staged-1']
      )

      expect(mockTx.campaign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
        }),
      })
    })

    it('throws if no staged contacts found', async () => {
      mockPrisma.stagedContactList.findMany.mockResolvedValue([])

      await expect(
        approveService.approveList(USER_ID, 'Test', ['staged-1'])
      ).rejects.toThrow('No staged contacts found')
    })

    it('throws if none of the kept IDs match staged contacts', async () => {
      mockPrisma.stagedContactList.findMany.mockResolvedValue(mockStagedContacts)

      await expect(
        approveService.approveList(USER_ID, 'Test', ['nonexistent'])
      ).rejects.toThrow('No matching contacts found')
    })
  })
})
