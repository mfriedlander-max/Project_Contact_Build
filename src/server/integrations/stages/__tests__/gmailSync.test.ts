import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Contact } from '@/lib/types/contact'

// Mock the fetch function used by fetchThreadMessageCount
const mockFetch = vi.fn()
global.fetch = mockFetch

import { checkForReplies } from '../gmailSync'

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    last_name: 'Doe',
    first_name: 'John',
    email: 'john@acme.com',
    email_status: 'SENT',
    connection_level: 'MESSAGE_SENT',
    custom_fields: { gmail_thread_id: 'thread-1' },
    ...overrides,
  }
}

function mockThreadResponse(messageCount: number) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        id: 'thread-1',
        messages: Array.from({ length: messageCount }, (_, i) => ({ id: `msg-${i}` })),
      }),
  }
}

describe('checkForReplies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect replies and update contact to CONNECTED', async () => {
    mockFetch.mockResolvedValue(mockThreadResponse(2))

    const contacts = [makeContact()]
    const result = await checkForReplies('test-token', contacts)

    expect(result.repliesFound).toBe(1)
    expect(result.checked).toBe(1)
    expect(contacts[0].connection_level).toBe('CONNECTED')
  })

  it('should not update contact if only one message in thread (no reply)', async () => {
    mockFetch.mockResolvedValue(mockThreadResponse(1))

    const contacts = [makeContact()]
    const result = await checkForReplies('test-token', contacts)

    expect(result.repliesFound).toBe(0)
    expect(contacts[0].connection_level).toBe('MESSAGE_SENT')
  })

  it('should skip contacts without email', async () => {
    const contacts = [makeContact({ email: undefined })]
    const result = await checkForReplies('test-token', contacts)

    expect(result.checked).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should skip contacts not in SENT status', async () => {
    const contacts = [makeContact({ email_status: 'BLANK' })]
    const result = await checkForReplies('test-token', contacts)

    expect(result.checked).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should skip contacts without thread id', async () => {
    const contacts = [makeContact({ custom_fields: undefined })]
    const result = await checkForReplies('test-token', contacts)

    expect(result.checked).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should collect errors per-contact', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 })

    const contacts = [makeContact({ id: 'c1' })]
    const result = await checkForReplies('test-token', contacts)

    expect(result.errors).toEqual([
      { contactId: 'c1', error: 'Gmail API error: HTTP 401' },
    ])
    expect(result.repliesFound).toBe(0)
  })
})
