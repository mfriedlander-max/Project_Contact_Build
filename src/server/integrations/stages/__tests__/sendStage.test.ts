import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Contact } from '@/lib/types/contact'

vi.mock('../../gmailService', () => ({
  gmailService: {
    sendDraft: vi.fn(),
  },
}))

import { gmailService } from '../../gmailService'
import { executeSendStage } from '../sendStage'

const mockSendDraft = vi.mocked(gmailService.sendDraft)

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    last_name: 'Doe',
    first_name: 'John',
    email_status: 'DRAFTED',
    ...overrides,
  }
}

describe('executeSendStage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send drafts for contacts with draft status', async () => {
    mockSendDraft.mockResolvedValue(undefined)

    const contacts = [
      makeContact({ id: 'c1', custom_fields: { gmail_draft_id: 'draft-1' } }),
    ]
    const result = await executeSendStage(contacts, 'user1')

    expect(result.sent).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(mockSendDraft).toHaveBeenCalledWith('user1', { draftId: 'draft-1' })
  })

  it('should skip contacts without draft id', async () => {
    const contacts = [makeContact({ custom_fields: undefined })]
    const result = await executeSendStage(contacts, 'user1')

    expect(result.skipped).toBe(1)
    expect(result.sent).toBe(0)
    expect(mockSendDraft).not.toHaveBeenCalled()
  })

  it('should update contact status to SENT after sending', async () => {
    mockSendDraft.mockResolvedValue(undefined)

    const contacts = [
      makeContact({ custom_fields: { gmail_draft_id: 'draft-1' } }),
    ]
    await executeSendStage(contacts, 'user1')

    expect(contacts[0].email_status).toBe('SENT')
    expect(contacts[0].connection_level).toBe('MESSAGE_SENT')
  })

  it('should collect errors without crashing batch', async () => {
    mockSendDraft
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Draft already sent'))

    const contacts = [
      makeContact({ id: 'c1', custom_fields: { gmail_draft_id: 'd1' } }),
      makeContact({ id: 'c2', custom_fields: { gmail_draft_id: 'd2' } }),
    ]
    const result = await executeSendStage(contacts, 'user1')

    expect(result.sent).toBe(1)
    expect(result.errors).toEqual([
      { contactId: 'c2', error: 'Draft already sent' },
    ])
  })

  it('should call progress callback', async () => {
    mockSendDraft.mockResolvedValue(undefined)
    const onProgress = vi.fn()

    const contacts = [
      makeContact({ custom_fields: { gmail_draft_id: 'd1' } }),
    ]
    await executeSendStage(contacts, 'user1', onProgress)

    expect(onProgress).toHaveBeenCalledWith(1, 1)
  })
})
