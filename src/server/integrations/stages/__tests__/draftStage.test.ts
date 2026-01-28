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

  it('should create drafts for contacts with email and insert', async () => {
    mockCreateDraft.mockResolvedValue({
      id: 'draft-1',
      threadId: 'thread-1',
      messageId: 'msg-1',
    })

    const contacts = [makeContact()]
    const result = await executeDraftStage(
      contacts,
      template,
      'Free Tuesday 2-4pm',
      'user1'
    )

    expect(result.drafted).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)

    expect(mockCreateDraft).toHaveBeenCalledWith('user1', {
      to: 'john@acme.com',
      subject: 'Quick intro — John',
      body: 'Hi John,\n\nGreat work on product launches!\n\nFree Tuesday 2-4pm\n\nBest,\nMax',
      labelNames: [],
    })
  })

  it('should skip contacts without email', async () => {
    const contacts = [makeContact({ email: undefined })]
    const result = await executeDraftStage(contacts, template, '', 'user1')

    expect(result.skipped).toBe(1)
    expect(result.drafted).toBe(0)
    expect(mockCreateDraft).not.toHaveBeenCalled()
  })

  it('should skip contacts without personalized insert', async () => {
    const contacts = [makeContact({ personalized_insert: undefined })]
    const result = await executeDraftStage(contacts, template, '', 'user1')

    expect(result.skipped).toBe(1)
    expect(mockCreateDraft).not.toHaveBeenCalled()
  })

  it('should store gmail draft id on contact', async () => {
    mockCreateDraft.mockResolvedValue({
      id: 'draft-99',
      threadId: 'thread-99',
      messageId: 'msg-99',
    })

    const contacts = [makeContact()]
    await executeDraftStage(contacts, template, '', 'user1')

    expect(contacts[0].email_status).toBe('DRAFTED')
  })

  it('should collect errors per-contact', async () => {
    mockCreateDraft
      .mockResolvedValueOnce({ id: 'd1', threadId: 't1', messageId: 'm1' })
      .mockRejectedValueOnce(new Error('Gmail quota exceeded'))

    const contacts = [makeContact({ id: 'c1' }), makeContact({ id: 'c2' })]
    const result = await executeDraftStage(contacts, template, '', 'user1')

    expect(result.drafted).toBe(1)
    expect(result.errors).toEqual([
      { contactId: 'c2', error: 'Gmail quota exceeded' },
    ])
  })

  it('should call progress callback', async () => {
    mockCreateDraft.mockResolvedValue({ id: 'd1', threadId: 't1', messageId: 'm1' })
    const onProgress = vi.fn()

    await executeDraftStage([makeContact()], template, '', 'user1', onProgress)

    expect(onProgress).toHaveBeenCalledWith(1, 1)
  })
})
