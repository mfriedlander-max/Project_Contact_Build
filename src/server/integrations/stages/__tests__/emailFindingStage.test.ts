import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Contact } from '@/lib/types/contact'
import type { EmailFindResult } from '../../hunterService'

vi.mock('../../hunterService', () => ({
  hunterService: {
    findEmail: vi.fn(),
  },
}))

import { hunterService } from '../../hunterService'
import { executeEmailFindingStage } from '../emailFindingStage'

const mockFindEmail = vi.mocked(hunterService.findEmail)

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'c1',
    last_name: 'Doe',
    first_name: 'John',
    company: 'Acme Inc',
    ...overrides,
  }
}

describe('executeEmailFindingStage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find emails for all contacts and return counts', async () => {
    mockFindEmail.mockResolvedValue({
      email: 'john@acme.com',
      confidence: 'HIGH',
      sources: ['acme.com'],
    })

    const contacts = [
      makeContact({ id: 'c1' }),
      makeContact({ id: 'c2', first_name: 'Jane', last_name: 'Smith' }),
    ]

    const result = await executeEmailFindingStage(contacts, 'user1')

    expect(result.found).toBe(2)
    expect(result.notFound).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(mockFindEmail).toHaveBeenCalledTimes(2)
    expect(mockFindEmail).toHaveBeenCalledWith('user1', {
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Inc',
    })
  })

  it('should count contacts where email was not found', async () => {
    mockFindEmail.mockResolvedValue({
      email: null,
      confidence: null,
      sources: [],
    })

    const result = await executeEmailFindingStage(
      [makeContact()],
      'user1'
    )

    expect(result.found).toBe(0)
    expect(result.notFound).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it('should collect per-contact errors without crashing batch', async () => {
    mockFindEmail
      .mockResolvedValueOnce({ email: 'a@b.com', confidence: 'HIGH', sources: [] })
      .mockRejectedValueOnce(new Error('API rate limited'))
      .mockResolvedValueOnce({ email: 'c@d.com', confidence: 'MEDIUM', sources: [] })

    const contacts = [
      makeContact({ id: 'c1' }),
      makeContact({ id: 'c2' }),
      makeContact({ id: 'c3' }),
    ]

    const result = await executeEmailFindingStage(contacts, 'user1')

    expect(result.found).toBe(2)
    expect(result.notFound).toBe(0)
    expect(result.errors).toEqual([
      { contactId: 'c2', error: 'API rate limited' },
    ])
  })

  it('should call progress callback after each contact', async () => {
    mockFindEmail.mockResolvedValue({ email: 'a@b.com', confidence: 'HIGH', sources: [] })

    const onProgress = vi.fn()
    const contacts = [makeContact({ id: 'c1' }), makeContact({ id: 'c2' })]

    await executeEmailFindingStage(contacts, 'user1', onProgress)

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenCalledWith(1, 2)
    expect(onProgress).toHaveBeenCalledWith(2, 2)
  })

  it('should skip contacts without company', async () => {
    const contacts = [makeContact({ id: 'c1', company: undefined })]

    const result = await executeEmailFindingStage(contacts, 'user1')

    expect(mockFindEmail).not.toHaveBeenCalled()
    expect(result.found).toBe(0)
    expect(result.notFound).toBe(1)
  })

  it('should update contact email and confidence in returned results', async () => {
    mockFindEmail.mockResolvedValue({
      email: 'john@acme.com',
      confidence: 'HIGH',
      sources: ['acme.com'],
    })

    const contacts = [makeContact({ id: 'c1' })]

    await executeEmailFindingStage(contacts, 'user1')

    // Verify the contact was mutated with email data
    // (stage executors mutate the passed contacts array for downstream stages)
    expect(contacts[0].email).toBe('john@acme.com')
    expect(contacts[0].email_confidence).toBe('HIGH')
  })
})
