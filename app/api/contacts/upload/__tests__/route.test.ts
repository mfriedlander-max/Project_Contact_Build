import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))
vi.mock('@/lib/prisma', () => ({
  prismadb: {
    crm_Contacts: {
      createMany: vi.fn(),
    },
  },
}))
vi.mock('@/src/server/services/uploadParser', () => ({
  parseCSV: vi.fn(),
  parseXLSX: vi.fn(),
  applyMapping: vi.fn(),
  validateContacts: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { prismadb } from '@/lib/prisma'
import {
  parseCSV,
  parseXLSX,
  applyMapping,
  validateContacts,
} from '@/src/server/services/uploadParser'
import type { ContactCreateInput } from '@/src/server/services/uploadParser'
import { POST } from '@/app/api/contacts/upload/route'

const mockSession = { user: { id: 'user-1' } }

function buildFormData(
  fields: Record<string, string>,
  file?: { name: string; content: string; type: string }
): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  if (file) {
    fd.append('file', new Blob([file.content], { type: file.type }), file.name)
  }
  return fd
}

function makeRequest(formData: FormData): Request {
  return new Request('http://localhost/api/contacts/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/contacts/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const fd = buildFormData(
      { mapping: '{"Name":"last_name"}' },
      { name: 'test.csv', content: 'Name\nSmith', type: 'text/csv' }
    )
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const fd = buildFormData({ mapping: '{"Name":"last_name"}' })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/file/i)
  })

  it('returns 400 for unsupported file type', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const fd = buildFormData(
      { mapping: '{"Name":"last_name"}' },
      { name: 'test.pdf', content: 'data', type: 'application/pdf' }
    )
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/file type/i)
  })

  it('returns 400 when file exceeds 5MB', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const largeContent = 'x'.repeat(5 * 1024 * 1024 + 1)
    const fd = buildFormData(
      { mapping: '{"Name":"last_name"}' },
      { name: 'big.csv', content: largeContent, type: 'text/csv' }
    )
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/5.*mb/i)
  })

  it('returns 400 when mapping is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    const fd = buildFormData(
      {},
      { name: 'test.csv', content: 'Name\nSmith', type: 'text/csv' }
    )
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/mapping/i)
  })

  it('returns created contacts for valid CSV upload', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const parsed = {
      headers: ['Name'],
      rows: [{ Name: 'Smith' }],
      rowCount: 1,
      errors: [],
    }
    const mapped: ContactCreateInput[] = [
      { last_name: 'Smith', connection_stage: 'DRAFTED', v: 0 },
    ]

    vi.mocked(parseCSV).mockReturnValue(parsed)
    vi.mocked(applyMapping).mockReturnValue(mapped)
    vi.mocked(validateContacts).mockReturnValue({
      valid: mapped,
      errors: [],
    })
    vi.mocked(prismadb.crm_Contacts.createMany).mockResolvedValue({ count: 1 })

    const fd = buildFormData(
      { mapping: '{"Name":"last_name"}' },
      { name: 'test.csv', content: 'Name\nSmith', type: 'text/csv' }
    )
    const res = await POST(makeRequest(fd))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.created).toBe(1)
    expect(json.errors).toEqual([])
    expect(json.contacts).toHaveLength(1)
    expect(json.contacts[0].connection_stage).toBe('DRAFTED')
  })

  it('returns created contacts for valid XLSX upload', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const parsed = {
      headers: ['Name'],
      rows: [{ Name: 'Doe' }],
      rowCount: 1,
      errors: [],
    }
    const mapped: ContactCreateInput[] = [
      { last_name: 'Doe', connection_stage: 'DRAFTED', v: 0 },
    ]

    vi.mocked(parseXLSX).mockReturnValue(parsed)
    vi.mocked(applyMapping).mockReturnValue(mapped)
    vi.mocked(validateContacts).mockReturnValue({
      valid: mapped,
      errors: [],
    })
    vi.mocked(prismadb.crm_Contacts.createMany).mockResolvedValue({ count: 1 })

    const fd = buildFormData(
      { mapping: '{"Name":"last_name"}' },
      {
        name: 'test.xlsx',
        content: 'binary',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    )
    const res = await POST(makeRequest(fd))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.created).toBe(1)
  })

  it('includes validation errors in response', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const parsed = {
      headers: ['Name'],
      rows: [{ Name: '' }, { Name: 'Smith' }],
      rowCount: 2,
      errors: [],
    }
    const mapped: ContactCreateInput[] = [
      { last_name: '', connection_stage: 'DRAFTED', v: 0 },
      { last_name: 'Smith', connection_stage: 'DRAFTED', v: 0 },
    ]
    const validationErrors = [{ row: 0, message: 'Row 0: last_name is required' }]

    vi.mocked(parseCSV).mockReturnValue(parsed)
    vi.mocked(applyMapping).mockReturnValue(mapped)
    vi.mocked(validateContacts).mockReturnValue({
      valid: [mapped[1]],
      errors: validationErrors,
    })
    vi.mocked(prismadb.crm_Contacts.createMany).mockResolvedValue({ count: 1 })

    const fd = buildFormData(
      { mapping: '{"Name":"last_name"}' },
      { name: 'test.csv', content: 'Name\n\nSmith', type: 'text/csv' }
    )
    const res = await POST(makeRequest(fd))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.created).toBe(1)
    expect(json.errors).toHaveLength(1)
    expect(json.errors[0].message).toMatch(/last_name/)
  })

  it('sets campaignId when provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const parsed = {
      headers: ['Name'],
      rows: [{ Name: 'Smith' }],
      rowCount: 1,
      errors: [],
    }
    const mapped: ContactCreateInput[] = [
      { last_name: 'Smith', connection_stage: 'DRAFTED', v: 0 },
    ]

    vi.mocked(parseCSV).mockReturnValue(parsed)
    vi.mocked(applyMapping).mockReturnValue(mapped)
    vi.mocked(validateContacts).mockReturnValue({
      valid: mapped,
      errors: [],
    })
    vi.mocked(prismadb.crm_Contacts.createMany).mockResolvedValue({ count: 1 })

    const fd = buildFormData(
      { mapping: '{"Name":"last_name"}', campaignId: 'camp-123' },
      { name: 'test.csv', content: 'Name\nSmith', type: 'text/csv' }
    )
    const res = await POST(makeRequest(fd))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.contacts[0].campaignId).toBe('camp-123')

    const createManyCall = vi.mocked(prismadb.crm_Contacts.createMany).mock.calls[0][0]
    expect((createManyCall as { data: Array<Record<string, unknown>> }).data[0]).toHaveProperty(
      'campaignId',
      'camp-123'
    )
  })
})
