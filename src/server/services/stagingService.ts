import { prismadb } from '@/lib/prisma'
import { stagedContactSchema, type StagedContactInput } from '@/src/lib/schemas/staging'

export const stagingService = {
  /**
   * Find existing contacts that match the candidates
   * Returns indices of duplicates based on email, LinkedIn, or name+company matching
   */
  async findExistingContacts(
    userId: string,
    candidates: StagedContactInput[]
  ): Promise<Set<number>> {
    // Get all contacts for this user
    const existingContacts = await prismadb.crm_Contacts.findMany({
      where: { assigned_to: userId, status: true },
      select: {
        email: true,
        personal_email: true,
        social_linkedin: true,
        first_name: true,
        last_name: true,
        company: true,
      },
    })

    const duplicateIndices = new Set<number>()

    candidates.forEach((candidate, index) => {
      const isDuplicate = existingContacts.some((existing) => {
        // Strategy 1: Email match (primary)
        if (candidate.email) {
          const candidateEmail = candidate.email.toLowerCase().trim()
          const existingEmail = existing.email?.toLowerCase().trim()
          const existingPersonalEmail = existing.personal_email?.toLowerCase().trim()

          if (candidateEmail === existingEmail || candidateEmail === existingPersonalEmail) {
            return true
          }
        }

        // Strategy 2: LinkedIn URL match
        if (candidate.linkedinUrl && existing.social_linkedin) {
          // Normalize LinkedIn URLs by removing protocol and trailing slashes
          const normalizeLinkedIn = (url: string) =>
            url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')

          if (normalizeLinkedIn(candidate.linkedinUrl) === normalizeLinkedIn(existing.social_linkedin)) {
            return true
          }
        }

        // Strategy 3: Name + Company match (fuzzy)
        if (candidate.firstName && candidate.company && existing.first_name && existing.company) {
          const candidateFirstName = candidate.firstName.toLowerCase().trim()
          const candidateLastName = candidate.lastName.toLowerCase().trim()
          const candidateCompany = candidate.company.toLowerCase().trim()

          const existingFirstName = existing.first_name.toLowerCase().trim()
          const existingLastName = existing.last_name.toLowerCase().trim()
          const existingCompany = existing.company.toLowerCase().trim()

          if (
            candidateFirstName === existingFirstName &&
            candidateLastName === existingLastName &&
            candidateCompany === existingCompany
          ) {
            return true
          }
        }

        return false
      })

      if (isDuplicate) {
        duplicateIndices.add(index)
      }
    })

    return duplicateIndices
  },

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
