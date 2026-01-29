import { prismadb } from '@/lib/prisma'
import { stagedContactSchema, type StagedContactInput } from '@/src/lib/schemas/staging'

export const stagingService = {
  async getStagedList(userId: string) {
    return prismadb.stagedContactList.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    })
  },

  async saveStagedList(
    userId: string,
    sessionId: string,
    contacts: StagedContactInput[]
  ) {
    const validated = contacts.map((c) => stagedContactSchema.parse(c))
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    return prismadb.$transaction(async (tx) => {
      await tx.stagedContactList.deleteMany({
        where: { userId },
      })

      return tx.stagedContactList.createMany({
        data: validated.map((contact) => ({
          userId,
          sessionId,
          firstName: contact.firstName ?? null,
          lastName: contact.lastName,
          company: contact.company ?? null,
          position: contact.position ?? null,
          email: contact.email ?? null,
          linkedinUrl: contact.linkedinUrl ?? null,
          sourceUrl: contact.sourceUrl ?? null,
          relevanceScore: contact.relevanceScore ?? null,
          notes: contact.notes ?? null,
          expiresAt,
        })),
      })
    })
  },

  async deleteStagedRow(userId: string, contactId: string) {
    const existing = await prismadb.stagedContactList.findFirst({
      where: { id: contactId, userId },
    })

    if (!existing) {
      throw new Error('Staged contact not found')
    }

    return prismadb.stagedContactList.update({
      where: { id: contactId },
      data: { isDeleted: true },
    })
  },

  async clearStagedList(userId: string) {
    return prismadb.stagedContactList.deleteMany({
      where: { userId },
    })
  },
}
