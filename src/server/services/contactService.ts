/**
 * Contact Service - stub implementation
 * TODO: Implement full contact service with Prisma
 */

export const contactService = {
  query: async () => [],
  moveStage: async (contactId: string, newStage: string) => ({
    id: contactId,
    name: '',
    company: '',
    stage: newStage,
    campaignId: '',
  }),
  updateField: async (contactId: string, field: string, value: unknown) => ({
    id: contactId,
    name: '',
    company: '',
    stage: 'NEW',
    campaignId: '',
  }),
  bulkUpdate: async () => 0,
  deleteContacts: async () => 0,
}
