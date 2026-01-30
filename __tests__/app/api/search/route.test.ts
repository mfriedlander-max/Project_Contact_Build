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
