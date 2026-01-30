import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDraft, type DraftParams } from '@/lib/gmail'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('createDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const params: DraftParams = {
    to: 'recipient@example.com',
    subject: 'Test Subject',
    body: 'Test body content',
  }

  it('creates a draft and returns draft ID + message ID', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'draft-123',
        message: { id: 'msg-456', threadId: 'thread-789' },
      }),
    })

    const result = await createDraft('access-token', params)
    expect(result).toEqual({
      draftId: 'draft-123',
      messageId: 'msg-456',
      threadId: 'thread-789',
    })
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
    })

    await expect(createDraft('bad-token', params)).rejects.toThrow('Gmail API error')
  })

  it('throws rate limit error on 429', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    })

    await expect(createDraft('token', params)).rejects.toThrow('rate limit')
  })

  it('encodes email in RFC 2822 base64url format', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'draft-1',
        message: { id: 'msg-1', threadId: 'thread-1' },
      }),
    })

    await createDraft('token', params)

    const fetchCall = mockFetch.mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.message.raw).toBeDefined()
    const decoded = Buffer.from(body.message.raw, 'base64url').toString()
    expect(decoded).toContain('To: recipient@example.com')
    expect(decoded).toContain('Subject: Test Subject')
    expect(decoded).toContain('Test body content')
  })
})
