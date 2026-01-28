import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Contact } from '@/lib/types/contact'

vi.mock('../../gmailService', () => ({
  gmailService: {
    createDraft: vi.fn(),
  },
}))

import { gmailService } from '../../gmailService'
import { executeDraftStage } from '../draftStage'

const mockCreateDraft = vi.mocked(gmailService.createDraft)

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    last_name: 'Doe',
    first_name: 'John',
    company: 'Acme Inc',
    email: 'john@acme.com',
    personalized_insert: 'Great work on product launches!',
    ...overrides,
  }
}

const template = {
  subject: 'Quick intro — {{first_name}}',
  body: 'Hi {{first_name}},\n\n{{insert}}\n\n{{availability}}\n\nBest,\nMax',
}

describe('executeDraftStage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create drafts and return new contacts with DRAFTED status (immutable)', async () => {
    mockCreateDraft.mockResolvedValue({
      id: 'draft-1',
      threadId: 'thread-1',
      messageId: 'msg-1',
    })

    const original = makeContact()
    const result = await executeDraftStage(
      [original],
      template,
      'Free Tuesday 2-4pm',
      'user1'
    )

    expect(result.drafted).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)

    // Original should not be mutated
    expect(original.email_status).toBeUndefined()

    // Returned contact should have DRAFTED status
    expect(result.contacts[0].email_status).toBe('DRAFTED')

    expect(mockCreateDraft).toHaveBeenCalledWith('user1', {
      to: 'john@acme.com',
      subject: 'Quick intro — John',
      body: 'Hi John,\n\nGreat work on product launches!\n\nFree Tuesday 2-4pm\n\nBest,\nMax',
      labelNames: [],
    })
  })

  it('should skip contacts without email', async () => {
    const result = await executeDraftStage(
      [makeContact({ email: undefined })],
      template, '', 'user1'
    )

    expect(result.skipped).toBe(1)
    expect(result.drafted).toBe(0)
    expect(mockCreateDraft).not.toHaveBeenCalled()
  })

  it('should skip contacts without personalized insert', async () => {
    const result = await executeDraftStage(
      [makeContact({ personalized_insert: undefined })],
      template, '', 'user1'
    )

    expect(result.skipped).toBe(1)
    expect(mockCreateDraft).not.toHaveBeenCalled()
  })

  it('should collect errors per-contact', async () => {
    mockCreateDraft
      .mockResolvedValueOnce({ id: 'd1', threadId: 't1', messageId: 'm1' })
      .mockRejectedValueOnce(new Error('Gmail quota exceeded'))

    const contacts = [makeContact({ id: 'c1' }), makeContact({ id: 'c2' })]
    const result = await executeDraftStage(contacts, template, '', 'user1')

    expect(result.drafted).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].contactId).toBe('c2')
    expect(result.contacts).toHaveLength(2)
  })

  it('should call progress callback', async () => {
    mockCreateDraft.mockResolvedValue({ id: 'd1', threadId: 't1', messageId: 'm1' })
    const onProgress = vi.fn()

    await executeDraftStage([makeContact()], template, '', 'user1', onProgress)

    expect(onProgress).toHaveBeenCalledWith(1, 1)
  })

  it('should sanitize control characters from contact data in email', async () => {
    mockCreateDraft.mockResolvedValue({ id: 'd1', threadId: 't1', messageId: 'm1' })

    const contacts = [makeContact({
      first_name: 'John\x00\x0D',
      personalized_insert: 'Insert\x1Ftext',
    })]

    await executeDraftStage(contacts, template, '', 'user1')

    const call = mockCreateDraft.mock.calls[0][1]
    expect(call.subject).not.toContain('\x00')
    expect(call.body).not.toContain('\x1F')
  })
})
