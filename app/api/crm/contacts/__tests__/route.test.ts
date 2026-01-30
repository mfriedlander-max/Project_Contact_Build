import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prismadb: {
    crm_Contacts: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'
import { GET } from '@/app/api/crm/contacts/route'

const mockSession = { user: { id: 'user-123' } }

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost/api/crm/contacts')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString(), { method: 'GET' })
}

describe('GET /api/crm/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([])
    vi.mocked(prismadb.crm_Contacts.count).mockResolvedValue(0)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns paginated contacts with defaults', async () => {
    vi.mocked(prismadb.crm_Contacts.findMany).mockResolvedValue([
      { id: '1', first_name: 'John', last_name: 'Doe' },
    ] as never)
    vi.mocked(prismadb.crm_Contacts.count).mockResolvedValue(1)

    const res = await GET(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      contacts: [{ id: '1', first_name: 'John', last_name: 'Doe' }],
      total: 1,
      page: 1,
      totalPages: 1,
    })
    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assigned_to: 'user-123' },
        skip: 0,
        take: 50,
      })
    )
  })

  it('filters by connection stage', async () => {
    await GET(makeRequest({ stage: 'DRAFTED' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assigned_to: 'user-123',
          connection_stage: 'DRAFTED',
        }),
      })
    )
  })

  it('filters by campaignId', async () => {
    await GET(makeRequest({ campaignId: 'camp-1' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assigned_to: 'user-123',
          campaignId: 'camp-1',
        }),
      })
    )
  })

  it('filters by search term across name, company, email', async () => {
    await GET(makeRequest({ search: 'john' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assigned_to: 'user-123',
          OR: [
            { first_name: { contains: 'john', mode: 'insensitive' } },
            { last_name: { contains: 'john', mode: 'insensitive' } },
            { company: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        }),
      })
    )
  })

  it('sorts by name (last_name) ascending', async () => {
    await GET(makeRequest({ sort: 'name', order: 'asc' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { last_name: 'asc' },
      })
    )
  })

  it('sorts by company descending', async () => {
    await GET(makeRequest({ sort: 'company', order: 'desc' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { company: 'desc' },
      })
    )
  })

  it('sorts by createdAt descending by default', async () => {
    await GET(makeRequest())

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { created_on: 'desc' },
      })
    )
  })

  it('paginates with page and limit', async () => {
    vi.mocked(prismadb.crm_Contacts.count).mockResolvedValue(150)

    await GET(makeRequest({ page: '3', limit: '25' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
        take: 25,
      })
    )
  })

  it('clamps limit to max 200', async () => {
    await GET(makeRequest({ limit: '500' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
      })
    )
  })

  it('defaults page to 1 and limit to 50 for invalid values', async () => {
    await GET(makeRequest({ page: '-1', limit: '0' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 50,
      })
    )
  })

  it('ignores invalid stage values', async () => {
    await GET(makeRequest({ stage: 'INVALID_STAGE' }))

    const call = vi.mocked(prismadb.crm_Contacts.findMany).mock.calls[0][0] as Record<string, unknown>
    const where = call.where as Record<string, unknown>
    expect(where.connection_stage).toBeUndefined()
  })

  it('calculates totalPages correctly', async () => {
    vi.mocked(prismadb.crm_Contacts.count).mockResolvedValue(101)

    const res = await GET(makeRequest({ limit: '50' }))
    const json = await res.json()

    expect(json.totalPages).toBe(3)
  })

  it('returns 500 on database error', async () => {
    vi.mocked(prismadb.crm_Contacts.findMany).mockRejectedValue(new Error('DB down'))

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })

  it('combines multiple filters', async () => {
    await GET(makeRequest({ stage: 'CONNECTED', campaignId: 'c1', search: 'acme' }))

    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assigned_to: 'user-123',
          connection_stage: 'CONNECTED',
          campaignId: 'c1',
          OR: [
            { first_name: { contains: 'acme', mode: 'insensitive' } },
            { last_name: { contains: 'acme', mode: 'insensitive' } },
            { company: { contains: 'acme', mode: 'insensitive' } },
            { email: { contains: 'acme', mode: 'insensitive' } },
          ],
        }),
      })
    )
  })
})
