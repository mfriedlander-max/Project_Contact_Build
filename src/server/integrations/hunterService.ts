/**
 * Hunter.io Service
 * Email finding integration
 *
 * Extends existing lib/hunter.ts
 * Implementation in Phase 2 (Task 25)
 */

export interface EmailFindResult {
  email: string | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null
  sources: string[]
}

export interface EmailFindOptions {
  firstName: string
  lastName: string
  company: string
  domain?: string // Optional - can be inferred from company
}

export const hunterService = {
  /**
   * Check if Hunter is configured for user
   */
  isConfigured: async (_userId: string): Promise<boolean> => {
    // TODO: Check IntegrationConnection for HUNTER with API key
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Find email for a person
   * Wraps existing lib/hunter.ts functionality
   */
  findEmail: async (
    _userId: string,
    _options: EmailFindOptions
  ): Promise<EmailFindResult> => {
    // TODO:
    // - Get API key from IntegrationConnection
    // - Call Hunter API
    // - Return normalized result
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Infer domain from company name
   * Uses Hunter's domain search or simple heuristics
   */
  inferDomain: async (_company: string): Promise<string | null> => {
    // TODO: Implement domain inference
    throw new Error('Not implemented - Phase 2')
  },
}
