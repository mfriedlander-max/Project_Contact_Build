/**
 * Shared types for pipeline stage executors
 */

import type { Contact } from '@/lib/types/contact'

export type { Contact }

export type ProgressCallback = (processed: number, total: number) => void

export interface StageError {
  contactId: string
  error: string
}

export interface EmailFindingStageResult {
  found: number
  notFound: number
  errors: StageError[]
}

export interface InsertStageResult {
  generated: number
  skipped: number
  errors: StageError[]
}

export interface DraftStageResult {
  drafted: number
  skipped: number
  errors: StageError[]
}

export interface SendStageResult {
  sent: number
  skipped: number
  errors: StageError[]
}

export interface ReplyCheckResult {
  repliesFound: number
  checked: number
  errors: StageError[]
}
