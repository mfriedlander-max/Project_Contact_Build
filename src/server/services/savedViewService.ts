/**
 * Saved View Service - stub implementation
 * TODO: Implement full saved view service with Prisma
 */

export const savedViewService = {
  create: async (
    userId: string,
    input: {
      name: string
      filters: Record<string, unknown>
      sort?: Record<string, unknown>
    }
  ) => ({
    id: `view-${Date.now()}`,
    name: input.name,
    filters: input.filters,
    sort: input.sort,
  }),
}
