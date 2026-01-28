/**
 * Dependency interfaces for action handlers
 * Defines contracts that services must implement (DI for testability)
 */

import type { StagedContact } from './findContacts'

export interface StagingServiceDeps {
  getStagedList(userId: string): Promise<ReadonlyArray<StagedContact>>
  deleteStagedRow(userId: string, contactId: string): Promise<void>
}

export interface Campaign {
  id: string
  name: string
  contactCount: number
}

export interface ApproveServiceDeps {
  approve(input: {
    userId: string
    campaignName: string
    keptContactIds: string[]
  }): Promise<Campaign>
}

export interface Contact {
  id: string
  name: string
  company: string
  email?: string
  stage: string
  campaignId: string
  [key: string]: unknown
}

export interface ContactFilters {
  stage?: string
  campaignId?: string
  industry?: string
  search?: string
}

export interface ContactServiceDeps {
  query(userId: string, filters: ContactFilters): Promise<ReadonlyArray<Contact>>
  moveStage(contactId: string, newStage: string): Promise<Contact>
  updateField(contactId: string, field: string, value: unknown): Promise<Contact>
  bulkUpdate(
    contactIds: string[],
    updates: Record<string, unknown>
  ): Promise<number>
  deleteContacts(contactIds: string[]): Promise<number>
}

export interface SavedView {
  id: string
  name: string
  filters: Record<string, unknown>
  sort?: Record<string, unknown>
}

export interface SavedViewServiceDeps {
  create(
    userId: string,
    input: {
      name: string
      filters: Record<string, unknown>
      sort?: Record<string, unknown>
    }
  ): Promise<SavedView>
}

export interface StageResult {
  processedCount: number
  errors: Array<{ contactId: string; error: string }>
}

export interface StageExecutors {
  emailFinding(campaignId: string): Promise<StageResult>
  inserts(campaignId: string): Promise<StageResult>
  drafts(campaignId: string, templateId: string): Promise<StageResult>
  send(campaignId: string): Promise<StageResult>
}
