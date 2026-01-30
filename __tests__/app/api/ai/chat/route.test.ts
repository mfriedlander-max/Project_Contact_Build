import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))
vi.mock('@/lib/anthropic', () => ({
  anthropicHelper: vi.fn(),
}))
vi.mock('@/src/server/actions/executor', () => ({
  executeAction: vi.fn(),
}))
vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    aiOperations: vi.fn().mockReturnValue({ success: true, remaining: 4, limit: 5, reset: Date.now() + 60000 }),
  },
  getClientIdentifier: vi.fn().mockReturnValue('user:user-1'),
}))
vi.mock('@/lib/ai/stream-chat', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('You are an assistant.'),
  buildChatMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'hello' }]),
}))

import { getServerSession } from 'next-auth'
import { anthropicHelper } from '@/lib/anthropic'
import { rateLimiters } from '@/lib/rate-limit'
import { POST } from '@/app/api/ai/chat/route'

const mockSession = { user: { id: 'user-1', email: 'test@test.com' } }

describe('POST /api/ai/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(rateLimiters.aiOperations).mockReturnValue({
      success: true, remaining: 4, limit: 5, reset: Date.now() + 60000,
    })
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello', mode: 'ASSISTANT' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid request body', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '', mode: 'ASSISTANT' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns streaming response for chat message without action', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
        yield { type: 'message_stop' }
      },
    }

    const mockClient = {
      messages: {
        stream: vi.fn().mockReturnValue(mockStream),
      },
    }
    vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)

    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello', mode: 'ASSISTANT' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const text = await res.text()
    expect(text).toContain('data: {"type":"text","text":"Hello"}')
    expect(text).toContain('data: [DONE]')
  })

  it('returns 503 when no Anthropic API key is configured', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(anthropicHelper).mockResolvedValue(null)

    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello', mode: 'ASSISTANT' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(rateLimiters.aiOperations).mockReturnValue({
      success: false, remaining: 0, limit: 5, reset: Date.now() + 60000,
    })

    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello', mode: 'ASSISTANT' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('accepts optional history in request body', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } }
        yield { type: 'message_stop' }
      },
    }
    const mockClient = {
      messages: {
        stream: vi.fn().mockReturnValue(mockStream),
      },
    }
    vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)

    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'hello',
        mode: 'ASSISTANT',
        history: [{ role: 'user', content: 'previous' }, { role: 'assistant', content: 'reply' }],
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
