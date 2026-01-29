/**
 * Shared types for pipeline stage executors
 *
 * All stage executors follow immutable patterns — they return
 * new Contact arrays rather than mutating the input.
 */

import type { Contact } from '@/lib/types/contact'

export type { Contact }

export type ProgressCallback = (processed: number, total: number) => void

export interface StageError {
  contactId: string
  error: string
}

export interface EmailFindingStageResult {
  contacts: Contact[]
  found: number
  notFound: number
  errors: StageError[]
}

export interface InsertStageResult {
  contacts: Contact[]
  generated: number
  skipped: number
  errors: StageError[]
}

export interface DraftStageResult {
  contacts: Contact[]
  drafted: number
  skipped: number
  errors: StageError[]
}

export interface SendStageResult {
  contacts: Contact[]
  sent: number
  skipped: number
  errors: StageError[]
}

export interface ReplyCheckResult {
  contacts: Contact[]
  repliesFound: number
  checked: number
  errors: StageError[]
}

/**
 * Strip control characters from a string for safe email content.
 * Preserves unicode (international names) but removes chars that
 * could corrupt email headers or inject content.
 */
export function sanitizeForEmail(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 1000)
}

/**
 * Sanitize error messages to prevent leaking secrets (API keys, tokens, emails).
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Unknown error occurred'
  }

  return error.message
    .replace(/\b(sk|ya29|Bearer\s)[-_A-Za-z0-9.]+/g, '[REDACTED]')
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
    .replace(/https?:\/\/([^/\s]+)\/[^\s]*/g, 'https://$1/...')
    .slice(0, 500)
}

/**
 * Safely invoke progress callback without crashing the batch.
 */
export function safeProgress(
  onProgress: ProgressCallback | undefined,
  processed: number,
  total: number
): void {
  try {
    onProgress?.(processed, total)
  } catch {
    // Progress callback failure must not crash the batch
  }
}
