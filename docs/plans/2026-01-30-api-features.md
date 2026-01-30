# API Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up the 3 remaining API features: AI chat streaming, Gmail draft creation, and SerpAPI contact search.

**Architecture:** Each feature follows the established pattern: `lib/` wrapper + `app/api/` route + Zod validation + rate limiting + NextAuth session check. The AI chat enhances the existing `/api/ai/chat` route with Anthropic streaming. Gmail drafts extend the existing `lib/gmail.ts`. SerpAPI is a new `lib/serpapi.ts` that implements the existing `SearchProvider` interface.

**Tech Stack:** Anthropic SDK (streaming), Gmail REST API, SerpAPI, Zod, NextAuth, Vitest

---

## Feature 1: AI Chat Streaming

**What exists:** `app/api/ai/chat/route.ts` handles action execution but returns a static message when no action is provided. `lib/anthropic.ts` provides the Anthropic client. The Vercel AI SDK (`ai` package) is installed.

**What we build:** Enhance the chat route to stream Claude responses when no explicit action is sent, using the Anthropic SDK streaming API.

### Task 1.1: Create AI chat streaming utility

**Files:**
- Create: `lib/ai/stream-chat.ts`
- Test: `__tests__/lib/ai/stream-chat.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/ai/stream-chat.test.ts
import { describe, it, expect, vi } from 'vitest'
import { buildSystemPrompt, buildChatMessages } from '@/lib/ai/stream-chat'

describe('buildSystemPrompt', () => {
  it('returns system prompt containing the mode name', () => {
    const result = buildSystemPrompt('CONTACT_FINDER')
    expect(result).toContain('Contact Finder')
  })

  it('returns different prompts per mode', () => {
    const finder = buildSystemPrompt('CONTACT_FINDER')
    const manager = buildSystemPrompt('GENERAL_MANAGER')
    expect(finder).not.toEqual(manager)
  })
})

describe('buildChatMessages', () => {
  it('converts user message to Anthropic message format', () => {
    const result = buildChatMessages('Hello')
    expect(result).toEqual([{ role: 'user', content: 'Hello' }])
  })

  it('includes conversation history when provided', () => {
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello!' },
    ]
    const result = buildChatMessages('Follow up', history)
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ role: 'user', content: 'Follow up' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/ai/stream-chat.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// lib/ai/stream-chat.ts
import { AiMode, type AiModeType } from '@/lib/types/enums'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPTS: Record<AiModeType, string> = {
  [AiMode.CONTACT_FINDER]: `You are a Contact Finder assistant for a student networking CRM. Help users find and research professional contacts. You can search for people by name, company, industry, or role. When users ask you to find contacts, suggest specific search queries.`,
  [AiMode.GENERAL_MANAGER]: `You are a General Manager assistant for a student networking CRM. Help users understand their contact pipeline, view statistics, and query their contacts. You have read-only access to contact data.`,
  [AiMode.ASSISTANT]: `You are a full-access Assistant for a student networking CRM. You can help users manage contacts, update fields, move pipeline stages, run campaigns, and perform bulk operations. Always confirm destructive actions before executing.`,
}

export function buildSystemPrompt(mode: AiModeType): string {
  return SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS[AiMode.ASSISTANT]
}

export function buildChatMessages(
  message: string,
  history?: ReadonlyArray<ChatMessage>
): ReadonlyArray<ChatMessage> {
  const messages: ChatMessage[] = history ? [...history] : []
  messages.push({ role: 'user', content: message })
  return messages
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/ai/stream-chat.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/ai/stream-chat.ts __tests__/lib/ai/stream-chat.test.ts
git commit -m "feat: add AI chat message building utilities"
```

### Task 1.2: Add streaming endpoint to chat route

**Files:**
- Modify: `app/api/ai/chat/route.ts`
- Test: `__tests__/app/api/ai/chat/route.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/app/api/ai/chat/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-auth
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

import { getServerSession } from 'next-auth'
import { anthropicHelper } from '@/lib/anthropic'
import { POST } from '@/app/api/ai/chat/route'

const mockSession = { user: { id: 'user-1', email: 'test@test.com' } }

describe('POST /api/ai/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/app/api/ai/chat/route.test.ts`
Expected: FAIL — streaming not implemented

**Step 3: Write implementation**

Replace the "no action" branch in `app/api/ai/chat/route.ts`:

```typescript
/**
 * AI Chat API Route
 * Handles action execution and streaming chat responses
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { AiMode, type AiModeType } from '@/lib/types/enums'
import { executeAction, type ExecutorContext } from '@/src/server/actions/executor'
import type { AiActionRequest, AiActionResult } from '@/src/server/actions/types'
import { anthropicHelper } from '@/lib/anthropic'
import { buildSystemPrompt, buildChatMessages, type ChatMessage } from '@/lib/ai/stream-chat'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum([AiMode.CONTACT_FINDER, AiMode.GENERAL_MANAGER, AiMode.ASSISTANT]),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  action: z.object({
    type: z.string(),
    payload: z.unknown(),
    userConfirmed: z.boolean().optional(),
  }).optional(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = chatRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { message, mode, history, action } = validation.data

    const context: ExecutorContext = {
      userId,
      currentMode: mode as AiModeType,
    }

    // If the client sent an explicit action, execute it directly
    if (action) {
      const result = await executeAction(
        action as AiActionRequest,
        context
      )

      return NextResponse.json({
        success: true,
        data: {
          reply: formatActionReply(result),
          actions: result.requiresConfirmation
            ? [{ type: 'confirm', message: result.confirmationMessage }]
            : undefined,
          result,
        },
      })
    }

    // Rate limit AI operations
    const rateLimitResult = rateLimiters.aiOperations(
      getClientIdentifier(req, userId)
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before sending more messages.' },
        { status: 429 }
      )
    }

    // Stream a response from Claude
    const client = await anthropicHelper(userId)
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'AI service not configured. Please add an Anthropic API key.' },
        { status: 503 }
      )
    }

    const systemPrompt = buildSystemPrompt(mode as AiModeType)
    const messages = buildChatMessages(message, history as ChatMessage[] | undefined)

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    // Convert Anthropic stream to SSE ReadableStream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const data = JSON.stringify({ type: 'text', text: event.delta.text })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Stream failed'
          const data = JSON.stringify({ type: 'error', error: errorMsg })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Chat request failed' },
      { status: 500 }
    )
  }
}

function formatActionReply(result: AiActionResult): string {
  if (result.requiresConfirmation) {
    return result.confirmationMessage ?? 'Please confirm this action.'
  }
  if (!result.success) {
    return result.error ?? 'Action failed.'
  }
  return 'Action completed successfully.'
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/app/api/ai/chat/route.test.ts`
Expected: PASS

**Step 5: Run build**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add app/api/ai/chat/route.ts __tests__/app/api/ai/chat/route.test.ts
git commit -m "feat: add streaming AI chat responses via Anthropic SDK"
```

---

## Feature 2: Gmail Draft Creation

**What exists:** `lib/gmail.ts` has `searchSentEmails()` and `validateGmailAccess()`. NextAuth already requests `gmail.compose` scope and passes `accessToken` into the session. Contact model has `gmail_draft_id`, `gmail_thread_id`, `gmail_message_id` fields.

**What we build:** Add `createDraft()` to `lib/gmail.ts` and a new `POST /api/gmail/drafts` endpoint.

### Task 2.1: Add createDraft to Gmail lib

**Files:**
- Modify: `lib/gmail.ts`
- Test: `__tests__/lib/gmail.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/gmail.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDraft, type DraftParams } from '@/lib/gmail'

// Mock global fetch
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
    // raw field should be base64url encoded
    expect(body.message.raw).toBeDefined()
    // Decode and verify it contains the headers
    const decoded = Buffer.from(body.message.raw, 'base64url').toString()
    expect(decoded).toContain('To: recipient@example.com')
    expect(decoded).toContain('Subject: Test Subject')
    expect(decoded).toContain('Test body content')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/gmail.test.ts`
Expected: FAIL — createDraft not exported

**Step 3: Add createDraft to lib/gmail.ts**

Append to `lib/gmail.ts`:

```typescript
// --- Draft Creation ---

export interface DraftParams {
  to: string
  subject: string
  body: string
  threadId?: string
}

export interface DraftResult {
  draftId: string
  messageId: string
  threadId: string
}

// Zod schema for Gmail draft response
const gmailDraftResponseSchema = z.object({
  id: z.string(),
  message: z.object({
    id: z.string(),
    threadId: z.string(),
  }),
})

/**
 * Encodes email content into RFC 2822 format as base64url string
 */
function encodeEmail(params: DraftParams): string {
  const lines = [
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    params.body,
  ]
  const raw = lines.join('\r\n')
  return Buffer.from(raw).toString('base64url')
}

/**
 * Creates a Gmail draft for the authenticated user.
 *
 * @param accessToken - OAuth2 access token with gmail.compose scope
 * @param params - Draft parameters (to, subject, body, optional threadId)
 * @returns DraftResult with draftId, messageId, threadId
 * @throws Error if API request fails
 * @throws GmailRateLimitError if rate limited
 */
export async function createDraft(
  accessToken: string,
  params: DraftParams
): Promise<DraftResult> {
  const url = `${GMAIL_API_BASE_URL}/users/me/drafts`

  const requestBody: Record<string, unknown> = {
    message: {
      raw: encodeEmail(params),
    },
  }

  if (params.threadId) {
    requestBody.message = {
      ...(requestBody.message as Record<string, unknown>),
      threadId: params.threadId,
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (response.status === 429) {
    throw createRateLimitError('Gmail API rate limit exceeded. Please try again later.')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`
    throw new Error(`Gmail API error: ${errorMessage}`)
  }

  const data = await response.json()
  const parsed = gmailDraftResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error('Invalid draft response from Gmail API')
  }

  return {
    draftId: parsed.data.id,
    messageId: parsed.data.message.id,
    threadId: parsed.data.message.threadId,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/gmail.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/gmail.ts __tests__/lib/gmail.test.ts
git commit -m "feat: add Gmail draft creation to gmail lib"
```

### Task 2.2: Create Gmail drafts API endpoint

**Files:**
- Create: `app/api/gmail/drafts/route.ts`
- Test: `__tests__/app/api/gmail/drafts/route.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/app/api/gmail/drafts/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))
vi.mock('@/lib/gmail', () => ({
  createDraft: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  prismadb: {
    crm_Contacts: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { createDraft } from '@/lib/gmail'
import { prismadb } from '@/lib/prisma'
import { POST } from '@/app/api/gmail/drafts/route'

const mockSession = {
  user: { id: 'user-1' },
  accessToken: 'gmail-token-123',
}

describe('POST /api/gmail/drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/gmail/drafts', {
      method: 'POST',
      body: JSON.stringify({ contactId: 'c1', subject: 's', body: 'b' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing fields', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/gmail/drafts', {
      method: 'POST',
      body: JSON.stringify({ contactId: 'c1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when no Gmail access token in session', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'u1' } })
    const req = new Request('http://localhost/api/gmail/drafts', {
      method: 'POST',
      body: JSON.stringify({ contactId: 'c1', subject: 's', body: 'b' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('creates draft and updates contact', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue({
      id: 'c1',
      email: 'contact@example.com',
      created_by: 'user-1',
    } as any)
    vi.mocked(createDraft).mockResolvedValue({
      draftId: 'draft-1',
      messageId: 'msg-1',
      threadId: 'thread-1',
    })
    vi.mocked(prismadb.crm_Contacts.update).mockResolvedValue({} as any)

    const req = new Request('http://localhost/api/gmail/drafts', {
      method: 'POST',
      body: JSON.stringify({ contactId: 'c1', subject: 'Hi', body: 'Hello there' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.draftId).toBe('draft-1')
    expect(prismadb.crm_Contacts.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'c1' },
      data: expect.objectContaining({
        gmail_draft_id: 'draft-1',
        email_status: 'DRAFTED',
      }),
    }))
  })

  it('returns 404 when contact not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prismadb.crm_Contacts.findFirst).mockResolvedValue(null)

    const req = new Request('http://localhost/api/gmail/drafts', {
      method: 'POST',
      body: JSON.stringify({ contactId: 'c1', subject: 's', body: 'b' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/app/api/gmail/drafts/route.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// app/api/gmail/drafts/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { createDraft } from '@/lib/gmail'
import { prismadb } from '@/lib/prisma'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

const createDraftSchema = z.object({
  contactId: z.string().min(1),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions) as any
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  const accessToken = session.accessToken as string | undefined
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: 'Gmail not connected. Please sign in with Google to enable email features.' },
      { status: 403 }
    )
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = createDraftSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { contactId, subject, body: emailBody } = validation.data

    // Rate limit
    const rateLimitResult = rateLimiters.strict(
      getClientIdentifier(req, userId)
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before creating more drafts.' },
        { status: 429 }
      )
    }

    // Verify contact exists and belongs to user
    const contact = await prismadb.crm_Contacts.findFirst({
      where: { id: contactId, created_by: userId },
    })

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (!contact.email) {
      return NextResponse.json(
        { success: false, error: 'Contact has no email address. Run email finding first.' },
        { status: 400 }
      )
    }

    // Create the draft
    const result = await createDraft(accessToken, {
      to: contact.email,
      subject,
      body: emailBody,
      threadId: contact.gmail_thread_id ?? undefined,
    })

    // Update contact with draft info
    await prismadb.crm_Contacts.update({
      where: { id: contactId },
      data: {
        gmail_draft_id: result.draftId,
        gmail_message_id: result.messageId,
        gmail_thread_id: result.threadId,
        email_status: 'DRAFTED',
        connection_stage: contact.connection_stage ?? 'DRAFTED',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        draftId: result.draftId,
        messageId: result.messageId,
        threadId: result.threadId,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create draft'
    const status = (error as any)?.status === 429 ? 429 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/app/api/gmail/drafts/route.test.ts`
Expected: PASS

**Step 5: Run build**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add app/api/gmail/drafts/route.ts __tests__/app/api/gmail/drafts/route.test.ts
git commit -m "feat: add Gmail draft creation API endpoint"
```

---

## Feature 3: SerpAPI Contact Search

**What exists:** `SearchProvider` interface in `src/server/actions/handlers/findContacts.ts` expects `search(query, maxResults) → SearchResult[]`. The `FIND_CONTACTS` action already calls `deps.searchProvider.search()`. We need to implement this interface with SerpAPI.

**What we build:** `lib/serpapi.ts` implementing `SearchProvider`, plus a standalone `POST /api/search` endpoint.

### Task 3.1: Create SerpAPI client library

**Files:**
- Create: `lib/serpapi.ts`
- Test: `__tests__/lib/serpapi.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/serpapi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchContacts, type SerpApiSearchResult } from '@/lib/serpapi'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('searchContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SERPAPI_API_KEY', 'test-key')
  })

  it('throws when API key is not configured', async () => {
    vi.stubEnv('SERPAPI_API_KEY', '')
    await expect(searchContacts('test query', 10)).rejects.toThrow('SerpAPI key is not configured')
  })

  it('returns parsed search results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        organic_results: [
          {
            title: 'John Smith - VP Engineering at Acme Corp | LinkedIn',
            link: 'https://linkedin.com/in/johnsmith',
            snippet: 'John Smith is VP of Engineering at Acme Corp with 10 years experience.',
          },
          {
            title: 'Jane Doe - Product Manager at Tech Inc',
            link: 'https://example.com/janedoe',
            snippet: 'Jane Doe leads product at Tech Inc.',
          },
        ],
      }),
    })

    const results = await searchContacts('VP Engineering Bay Area', 5)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      name: 'John Smith',
      company: 'Acme Corp',
      url: 'https://linkedin.com/in/johnsmith',
      snippet: 'John Smith is VP of Engineering at Acme Corp with 10 years experience.',
    })
  })

  it('handles empty results gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ organic_results: [] }),
    })

    const results = await searchContacts('nonexistent person', 5)
    expect(results).toEqual([])
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Invalid API key' }),
    })

    await expect(searchContacts('test', 5)).rejects.toThrow('SerpAPI error')
  })

  it('respects maxResults parameter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        organic_results: Array.from({ length: 20 }, (_, i) => ({
          title: `Person ${i} - Role at Company ${i}`,
          link: `https://example.com/${i}`,
          snippet: `Snippet ${i}`,
        })),
      }),
    })

    const results = await searchContacts('test', 5)
    expect(results).toHaveLength(5)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/serpapi.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// lib/serpapi.ts
import { z } from 'zod'

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json'

export interface SerpApiSearchResult {
  name: string
  company: string
  url: string
  snippet: string
}

// Zod schema for SerpAPI response
const serpApiResponseSchema = z.object({
  organic_results: z.array(z.object({
    title: z.string(),
    link: z.string(),
    snippet: z.string().optional(),
  })).optional().default([]),
})

/**
 * Extracts name and company from a search result title.
 * Common patterns:
 *   "John Smith - VP Engineering at Acme Corp | LinkedIn"
 *   "Jane Doe - Product Manager at Tech Inc"
 *   "Bob Jones | Director at Startup Co"
 */
export function parseNameAndCompany(title: string): { name: string; company: string } {
  // Remove trailing platform names like "| LinkedIn", "| Twitter"
  const cleaned = title.replace(/\s*\|[^|]*$/, '').trim()

  // Try "Name - Role at Company" pattern
  const atMatch = cleaned.match(/^(.+?)\s*[-–]\s*.+?\bat\b\s+(.+)$/i)
  if (atMatch) {
    return { name: atMatch[1].trim(), company: atMatch[2].trim() }
  }

  // Try "Name - Company" pattern
  const dashMatch = cleaned.match(/^(.+?)\s*[-–]\s*(.+)$/)
  if (dashMatch) {
    return { name: dashMatch[1].trim(), company: dashMatch[2].trim() }
  }

  // Fallback: use whole title as name, empty company
  return { name: cleaned, company: '' }
}

/**
 * Search for professional contacts using SerpAPI Google search.
 *
 * @param query - Search query (e.g. "VP Engineering Bay Area LinkedIn")
 * @param maxResults - Maximum results to return (default 10, max 30)
 * @returns Array of parsed search results
 * @throws Error if API key not configured or API request fails
 */
export async function searchContacts(
  query: string,
  maxResults: number = 10
): Promise<ReadonlyArray<SerpApiSearchResult>> {
  const apiKey = process.env.SERPAPI_API_KEY

  if (!apiKey) {
    throw new Error('SerpAPI key is not configured')
  }

  const searchParams = new URLSearchParams({
    q: query,
    api_key: apiKey,
    engine: 'google',
    num: String(Math.min(maxResults, 30)),
  })

  const response = await fetch(`${SERPAPI_BASE_URL}?${searchParams.toString()}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || `HTTP ${response.status}`
    throw new Error(`SerpAPI error: ${errorMessage}`)
  }

  const data = await response.json()
  const parsed = serpApiResponseSchema.safeParse(data)

  if (!parsed.success) {
    throw new Error('Invalid response from SerpAPI')
  }

  return parsed.data.organic_results
    .slice(0, maxResults)
    .map((result) => {
      const { name, company } = parseNameAndCompany(result.title)
      return {
        name,
        company,
        url: result.link,
        snippet: result.snippet ?? '',
      }
    })
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/serpapi.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/serpapi.ts __tests__/lib/serpapi.test.ts
git commit -m "feat: add SerpAPI client for contact search"
```

### Task 3.2: Create SerpAPI SearchProvider adapter

**Files:**
- Create: `lib/serpapi-provider.ts`
- Test: `__tests__/lib/serpapi-provider.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/serpapi-provider.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createSerpApiSearchProvider } from '@/lib/serpapi-provider'

vi.mock('@/lib/serpapi', () => ({
  searchContacts: vi.fn(),
}))

import { searchContacts } from '@/lib/serpapi'

describe('SerpApiSearchProvider', () => {
  it('implements SearchProvider interface', async () => {
    vi.mocked(searchContacts).mockResolvedValue([
      { name: 'John', company: 'Acme', url: 'https://example.com', snippet: 'test' },
    ])

    const provider = createSerpApiSearchProvider()
    const results = await provider.search('test query', 10)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      name: 'John',
      company: 'Acme',
      url: 'https://example.com',
      snippet: 'test',
    })
    expect(searchContacts).toHaveBeenCalledWith('test query', 10)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/serpapi-provider.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// lib/serpapi-provider.ts
import type { SearchProvider, SearchResult } from '@/src/server/actions/handlers/findContacts'
import { searchContacts } from '@/lib/serpapi'

/**
 * Creates a SearchProvider backed by SerpAPI.
 * Plugs into the FIND_CONTACTS action handler.
 */
export function createSerpApiSearchProvider(): SearchProvider {
  return {
    search: async (query: string, maxResults: number): Promise<ReadonlyArray<SearchResult>> => {
      return searchContacts(query, maxResults)
    },
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/serpapi-provider.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/serpapi-provider.ts __tests__/lib/serpapi-provider.test.ts
git commit -m "feat: add SerpAPI SearchProvider adapter for FIND_CONTACTS action"
```

### Task 3.3: Create standalone search API endpoint

**Files:**
- Create: `app/api/search/route.ts`
- Test: `__tests__/app/api/search/route.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/app/api/search/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))
vi.mock('@/lib/serpapi', () => ({
  searchContacts: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { searchContacts } from '@/lib/serpapi'
import { POST } from '@/app/api/search/route'

const mockSession = { user: { id: 'user-1' } }

describe('POST /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for empty query', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: '' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns search results', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(searchContacts).mockResolvedValue([
      { name: 'John', company: 'Acme', url: 'https://example.com', snippet: 'test' },
    ])

    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'VP Engineering' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/app/api/search/route.test.ts`
Expected: FAIL

**Step 3: Write implementation**

```typescript
// app/api/search/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { searchContacts } from '@/lib/serpapi'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().min(1).max(30).optional().default(10),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 })
  }

  try {
    const userId = session.user.id
    const body = await req.json()

    const validation = searchSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { query, maxResults } = validation.data

    // Rate limit external API calls
    const rateLimitResult = rateLimiters.strict(
      getClientIdentifier(req, userId)
    )
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before searching again.' },
        { status: 429 }
      )
    }

    const results = await searchContacts(query, maxResults)

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        total: results.length,
        query,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/app/api/search/route.test.ts`
Expected: PASS

**Step 5: Run build**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add app/api/search/route.ts __tests__/app/api/search/route.test.ts
git commit -m "feat: add SerpAPI contact search endpoint"
```

---

## Final: Integration Build + Verify

### Task 4.1: Full build and test suite

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Add SERPAPI_API_KEY to .env.example**

Append to `.env.example`:
```
SERPAPI_API_KEY="your-serpapi-api-key"
```

**Step 4: Final commit**

```bash
git add .env.example
git commit -m "chore: add SERPAPI_API_KEY to env example"
```

---

## Environment Variables Summary

| Variable | Feature | Status |
|----------|---------|--------|
| `ANTHROPIC_API_KEY` | AI Chat | Already configured |
| `GOOGLE_ID` | Gmail OAuth | Already configured |
| `GOOGLE_SECRET` | Gmail OAuth | Already configured |
| `HUNTER_API_KEY` | Email Finding | Already configured |
| `SERPAPI_API_KEY` | Contact Search | **NEW — needs adding** |

## Files Created/Modified Summary

| File | Action | Feature |
|------|--------|---------|
| `lib/ai/stream-chat.ts` | Create | AI Chat |
| `app/api/ai/chat/route.ts` | Modify | AI Chat |
| `lib/gmail.ts` | Modify | Gmail Drafts |
| `app/api/gmail/drafts/route.ts` | Create | Gmail Drafts |
| `lib/serpapi.ts` | Create | Contact Search |
| `lib/serpapi-provider.ts` | Create | Contact Search |
| `app/api/search/route.ts` | Create | Contact Search |
| `__tests__/lib/ai/stream-chat.test.ts` | Create | AI Chat |
| `__tests__/app/api/ai/chat/route.test.ts` | Create | AI Chat |
| `__tests__/lib/gmail.test.ts` | Create | Gmail Drafts |
| `__tests__/app/api/gmail/drafts/route.test.ts` | Create | Gmail Drafts |
| `__tests__/lib/serpapi.test.ts` | Create | Contact Search |
| `__tests__/lib/serpapi-provider.test.ts` | Create | Contact Search |
| `__tests__/app/api/search/route.test.ts` | Create | Contact Search |
| `.env.example` | Modify | Contact Search |
