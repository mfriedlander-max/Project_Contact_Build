import { z } from 'zod'

export const stagedContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().min(1),
  company: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
})

export type StagedContactInput = z.infer<typeof stagedContactSchema>

export const saveStagedListSchema = z.object({
  sessionId: z.string().min(1),
  contacts: z.array(stagedContactSchema).min(1),
})
