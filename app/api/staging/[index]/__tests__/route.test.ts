import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/src/server/services/stagingService', () => ({
  stagingService: {
    deleteStagedRow: vi.fn(),
  },
}))

import { DELETE } from '../route'
import { getServerSession } from 'next-auth'
import { stagingService } from '@/src/server/services/stagingService'

const mockSession = { user: { id: 'user-123', email: 'test@example.com' } }

function callDelete(contactId: string) {
  const req = new NextRequest(
    new URL(`http://localhost:3000/api/staging/${contactId}`),
    { method: 'DELETE' }
  )
  return DELETE(req, { params: Promise.resolve({ index: contactId }) })
}

describe('DELETE /api/staging/[index]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await callDelete('staged-1')

    expect(response.status).toBe(401)
  })

  it('deletes a staged contact by id', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(stagingService.deleteStagedRow).mockResolvedValue(undefined as never)

    const response = await callDelete('staged-1')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(stagingService.deleteStagedRow).toHaveBeenCalledWith('user-123', 'staged-1')
  })

  it('returns 404 when contact not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(stagingService.deleteStagedRow).mockRejectedValue(
      new Error('Staged contact not found')
    )

    const response = await callDelete('nonexistent')
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Staged contact not found')
  })

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(stagingService.deleteStagedRow).mockRejectedValue(
      new Error('Database error')
    )

    const response = await callDelete('staged-1')
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })
})
