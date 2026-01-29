import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Contact } from '@/lib/types/contact'

const mockFetch = vi.fn()
global.fetch = mockFetch

import { checkForReplies } from '../gmailSync'

const VALID_TOKEN = 'ya29.a0AbVbY6Pz3example-valid-token'

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

  it('should detect replies and return new contacts with CONNECTED (immutable)', async () => {
    mockFetch.mockResolvedValue(mockThreadResponse(2))

    const original = makeContact()
    const result = await checkForReplies(VALID_TOKEN, [original])

    expect(result.repliesFound).toBe(1)
    expect(result.checked).toBe(1)

    // Original not mutated
    expect(original.connection_level).toBe('MESSAGE_SENT')

    // Returned contact updated
    expect(result.contacts[0].connection_level).toBe('CONNECTED')
  })

  it('should not update contact if only one message in thread (no reply)', async () => {
    mockFetch.mockResolvedValue(mockThreadResponse(1))

    const result = await checkForReplies(VALID_TOKEN, [makeContact()])

    expect(result.repliesFound).toBe(0)
    expect(result.contacts[0].connection_level).toBe('MESSAGE_SENT')
  })

  it('should skip contacts without email', async () => {
    const result = await checkForReplies(VALID_TOKEN, [makeContact({ email: undefined })])

    expect(result.checked).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should skip contacts not in SENT status', async () => {
    const result = await checkForReplies(VALID_TOKEN, [makeContact({ email_status: 'BLANK' })])

    expect(result.checked).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should skip contacts without thread id', async () => {
    const result = await checkForReplies(VALID_TOKEN, [makeContact({ custom_fields: undefined })])

    expect(result.checked).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should collect errors per-contact', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 })

    const result = await checkForReplies(VALID_TOKEN, [makeContact({ id: 'c1' })])

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].contactId).toBe('c1')
    expect(result.repliesFound).toBe(0)
  })

  it('should reject invalid access token', async () => {
    await expect(
      checkForReplies('short', [makeContact()])
    ).rejects.toThrow('Invalid access token format')
  })
})
