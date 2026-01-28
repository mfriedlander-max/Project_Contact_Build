import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Contact } from '@/lib/types/contact'

vi.mock('../../pageFetcher', () => ({
  pageFetcher: {
    fetchPages: vi.fn(),
  },
}))

vi.mock('../../insertGenerator', () => ({
  generateInsert: vi.fn(),
}))

import { pageFetcher } from '../../pageFetcher'
import { generateInsert } from '../../insertGenerator'
import { executeInsertStage } from '../insertStage'

const mockFetchPages = vi.mocked(pageFetcher.fetchPages)
const mockGenerateInsert = vi.mocked(generateInsert)

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    last_name: 'Doe',
    first_name: 'John',
    company: 'Acme Inc',
    website: 'https://acme.com/john',
    ...overrides,
  }
}

describe('executeInsertStage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch page and generate insert for contacts with URLs', async () => {
    mockFetchPages.mockResolvedValue([
      { url: 'https://acme.com/john', title: 'John', text: 'John is a PM at Acme', fetchedAt: new Date() },
    ])
    mockGenerateInsert.mockResolvedValue({
      insert: 'I saw your work on product launches at Acme.',
      confidence: 'HIGH',
    })

    const contacts = [makeContact()]
    const result = await executeInsertStage(contacts)

    expect(result.generated).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(contacts[0].personalized_insert).toBe('I saw your work on product launches at Acme.')
    expect(contacts[0].insert_confidence).toBe('HIGH')
  })

  it('should skip contacts without website URL', async () => {
    const contacts = [makeContact({ website: undefined })]
    const result = await executeInsertStage(contacts)

    expect(result.generated).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockFetchPages).not.toHaveBeenCalled()
  })

  it('should skip when page fetch returns no pages', async () => {
    mockFetchPages.mockResolvedValue([])

    const contacts = [makeContact()]
    const result = await executeInsertStage(contacts)

    expect(result.generated).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockGenerateInsert).not.toHaveBeenCalled()
  })

  it('should collect errors per-contact without crashing batch', async () => {
    mockFetchPages.mockResolvedValue([
      { url: 'https://acme.com', title: '', text: 'content', fetchedAt: new Date() },
    ])
    mockGenerateInsert
      .mockResolvedValueOnce({ insert: 'Great work!', confidence: 'HIGH' })
      .mockRejectedValueOnce(new Error('Anthropic API down'))

    const contacts = [
      makeContact({ id: 'c1' }),
      makeContact({ id: 'c2', website: 'https://other.com' }),
    ]

    const result = await executeInsertStage(contacts)

    expect(result.generated).toBe(1)
    expect(result.errors).toEqual([
      { contactId: 'c2', error: 'Anthropic API down' },
    ])
  })

  it('should call progress callback', async () => {
    mockFetchPages.mockResolvedValue([
      { url: 'https://acme.com', title: '', text: 'content', fetchedAt: new Date() },
    ])
    mockGenerateInsert.mockResolvedValue({ insert: 'Hi', confidence: 'MEDIUM' })

    const onProgress = vi.fn()
    await executeInsertStage([makeContact(), makeContact({ id: 'c2' })], onProgress)

    expect(onProgress).toHaveBeenCalledWith(1, 2)
    expect(onProgress).toHaveBeenCalledWith(2, 2)
  })
})
