import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/src/server/services/approveService', () => ({
  approveService: {
    approveList: vi.fn(),
  },
}))

import { POST } from '../route'
import { getServerSession } from 'next-auth'
import { approveService } from '@/src/server/services/approveService'

const mockSession = { user: { id: 'user-123', email: 'test@example.com' } }

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/staging/approve'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/staging/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await POST(createRequest({
      campaignName: 'Test',
      keptContactIds: ['id-1'],
    }))

    expect(response.status).toBe(401)
  })

  it('returns 400 with invalid body', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 400 when campaignName is empty', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const response = await POST(createRequest({
      campaignName: '',
      keptContactIds: ['id-1'],
    }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 400 when keptContactIds is empty', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const response = await POST(createRequest({
      campaignName: 'Test',
      keptContactIds: [],
    }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('creates campaign from approved contacts', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(approveService.approveList).mockResolvedValue({
      campaign: { id: 'c-1', name: 'Test' } as never,
      contactCount: 2,
    })

    const response = await POST(createRequest({
      campaignName: 'Test Campaign',
      keptContactIds: ['id-1', 'id-2'],
    }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.contactCount).toBe(2)
    expect(approveService.approveList).toHaveBeenCalledWith(
      'user-123',
      'Test Campaign',
      ['id-1', 'id-2']
    )
  })

  it('returns 404 when no staged contacts found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(approveService.approveList).mockRejectedValue(
      new Error('No staged contacts found')
    )

    const response = await POST(createRequest({
      campaignName: 'Test',
      keptContactIds: ['id-1'],
    }))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('No staged contacts')
  })

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(approveService.approveList).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await POST(createRequest({
      campaignName: 'Test',
      keptContactIds: ['id-1'],
    }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })
})
