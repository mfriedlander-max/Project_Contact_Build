import { prismadb } from '@/lib/prisma'
import { escapeHtml } from '@/src/lib/sanitize'

export const approveService = {
  async approveList(
    userId: string,
    campaignName: string,
    keptContactIds: string[]
  ) {
    const stagedContacts = await prismadb.stagedContactList.findMany({
      where: { userId, isDeleted: false },
    })

    if (stagedContacts.length === 0) {
      throw new Error('No staged contacts found')
    }

    const keptSet = new Set(keptContactIds)
    const keptContacts = stagedContacts.filter((c) => keptSet.has(c.id))

    if (keptContacts.length === 0) {
      throw new Error('No matching contacts found')
    }

    const sanitizedName = escapeHtml(campaignName.trim())

    return prismadb.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          userId,
          name: sanitizedName,
          status: 'DRAFT',
        },
      })

      await tx.crm_Contacts.createMany({
        data: keptContacts.map((contact) => ({
          last_name: contact.lastName,
          first_name: contact.firstName,
          company: contact.company,
          position: contact.position,
          email: contact.email,
          social_linkedin: contact.linkedinUrl,
          campaignId: campaign.id,
          connection_stage: 'DRAFTED' as const,
          assigned_to: userId,
        })),
      })

      await tx.stagedContactList.deleteMany({
        where: { userId },
      })

      return { campaign, contactCount: keptContacts.length }
    })
  },
}
