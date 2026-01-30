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
