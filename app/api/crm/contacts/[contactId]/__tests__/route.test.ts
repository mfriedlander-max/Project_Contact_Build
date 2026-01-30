import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    crm_Contacts: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

import { PATCH } from '../route'
import { prismadb } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

const mockGetServerSession = vi.mocked(getServerSession)
const mockFindFirst = vi.mocked(prismadb.crm_Contacts.findFirst)
const mockUpdate = vi.mocked(prismadb.crm_Contacts.update)

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/crm/contacts/abc123', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const makeProps = (contactId = 'abc123') => ({
  params: Promise.resolve({ contactId }),
})

describe('PATCH /api/crm/contacts/[contactId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const res = await PATCH(
      makeRequest({ connection_stage: 'CONNECTED' }),
      makeProps(),
    )

    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid connection_stage', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user1' } } as never)

    const res = await PATCH(
      makeRequest({ connection_stage: 'INVALID_STAGE' }),
      makeProps(),
    )

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 403 when contact not found or not owned', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user1' } } as never)
    mockFindFirst.mockResolvedValue(null)

    const res = await PATCH(
      makeRequest({ connection_stage: 'CONNECTED' }),
      makeProps(),
    )

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/not found|access denied/i)
  })

  it('updates and returns the contact for a valid stage change', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user1' } } as never)
    mockFindFirst.mockResolvedValue({ id: 'abc123', assigned_to: 'user1' } as never)
    const updated = { id: 'abc123', connection_stage: 'CONNECTED', assigned_to: 'user1' }
    mockUpdate.mockResolvedValue(updated as never)

    const res = await PATCH(
      makeRequest({ connection_stage: 'CONNECTED' }),
      makeProps(),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.connection_stage).toBe('CONNECTED')
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'abc123' },
      data: { connection_stage: 'CONNECTED' },
    })
  })

  it('accepts all valid ConnectionStage values', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user1' } } as never)
    mockFindFirst.mockResolvedValue({ id: 'abc123', assigned_to: 'user1' } as never)

    for (const stage of ['DRAFTED', 'MESSAGE_SENT', 'DIDNT_CONNECT', 'CONNECTED', 'IN_TOUCH']) {
      mockUpdate.mockResolvedValue({ id: 'abc123', connection_stage: stage } as never)
      const res = await PATCH(makeRequest({ connection_stage: stage }), makeProps())
      expect(res.status).toBe(200)
    }
  })
})
