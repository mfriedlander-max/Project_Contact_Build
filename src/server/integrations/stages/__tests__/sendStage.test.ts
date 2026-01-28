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

  it('should send drafts and return new contacts with SENT status (immutable)', async () => {
    mockSendDraft.mockResolvedValue(undefined)

    const original = makeContact({ custom_fields: { gmail_draft_id: 'draft-1' } })
    const result = await executeSendStage([original], 'user1')

    expect(result.sent).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(mockSendDraft).toHaveBeenCalledWith('user1', { draftId: 'draft-1' })

    // Original should not be mutated
    expect(original.email_status).toBe('DRAFTED')

    // Returned contact has SENT status
    expect(result.contacts[0].email_status).toBe('SENT')
    expect(result.contacts[0].connection_level).toBe('MESSAGE_SENT')
    expect(result.contacts[0].sent_at).toBeInstanceOf(Date)
  })

  it('should skip contacts without draft id', async () => {
    const result = await executeSendStage(
      [makeContact({ custom_fields: undefined })],
      'user1'
    )

    expect(result.skipped).toBe(1)
    expect(result.sent).toBe(0)
    expect(mockSendDraft).not.toHaveBeenCalled()
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
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].contactId).toBe('c2')
    expect(result.contacts).toHaveLength(2)
  })

  it('should call progress callback', async () => {
    mockSendDraft.mockResolvedValue(undefined)
    const onProgress = vi.fn()

    await executeSendStage(
      [makeContact({ custom_fields: { gmail_draft_id: 'd1' } })],
      'user1',
      onProgress
    )

    expect(onProgress).toHaveBeenCalledWith(1, 1)
  })
})
