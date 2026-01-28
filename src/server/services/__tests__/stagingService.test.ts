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
})
