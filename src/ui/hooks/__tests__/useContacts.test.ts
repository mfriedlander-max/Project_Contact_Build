import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useContacts } from '../useContacts'
import { ConnectionStage } from '@/lib/types/enums'

describe('useContacts', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches contacts for the given stage', async () => {
    const contacts = [
      { id: '1', last_name: 'Smith', company: 'Google', connection_level: 'NONE' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ contacts, total: 1, page: 1, totalPages: 1 }),
    })

    const { result } = renderHook(() =>
      useContacts({ stage: ConnectionStage.DRAFTED })
    )

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.contacts).toEqual(contacts)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/crm/contacts?stage=DRAFTED',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns empty array on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() =>
      useContacts({ stage: ConnectionStage.DRAFTED })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.contacts).toEqual([])
    expect(result.current.error).toBeTruthy()
  })

  it('refetches when stage changes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ contacts: [], total: 0, page: 1, totalPages: 0 }),
    })

    const { result, rerender } = renderHook(
      ({ stage }) => useContacts({ stage }),
      { initialProps: { stage: ConnectionStage.DRAFTED as string } }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const callCountBefore = mockFetch.mock.calls.length

    rerender({ stage: ConnectionStage.CONNECTED })

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })

  it('applies saved view filters to query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ contacts: [], total: 0, page: 1, totalPages: 0 }),
    })

    renderHook(() =>
      useContacts({
        stage: ConnectionStage.DRAFTED,
        filters: { company: 'Google' },
      })
    )

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('company=Google'),
        expect.any(Object)
      )
    })
  })

  it('passes sort/order/page/limit params to URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ contacts: [], total: 0, page: 2, totalPages: 5 }),
    })

    renderHook(() =>
      useContacts({
        stage: ConnectionStage.DRAFTED,
        sort: 'last_name',
        order: 'asc',
        page: 2,
        limit: 25,
      })
    )

    await waitFor(() => {
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
      const url = lastCall[0] as string
      expect(url).toContain('sort=last_name')
      expect(url).toContain('order=asc')
      expect(url).toContain('page=2')
      expect(url).toContain('limit=25')
    })
  })

  it('returns total, page, totalPages from API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        contacts: [{ id: '1', last_name: 'Doe' }],
        total: 50,
        page: 3,
        totalPages: 10,
      }),
    })

    const { result } = renderHook(() =>
      useContacts({ stage: ConnectionStage.DRAFTED })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.total).toBe(50)
    expect(result.current.page).toBe(3)
    expect(result.current.totalPages).toBe(10)
  })

  it('updateContactStage calls PATCH and updates local state optimistically', async () => {
    const contacts = [
      { id: '1', last_name: 'Smith', company: 'Google', connection_stage: 'DRAFTED' },
      { id: '2', last_name: 'Doe', company: 'Meta', connection_stage: 'DRAFTED' },
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contacts, total: 2, page: 1, totalPages: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...contacts[0], connection_stage: 'CONNECTED' }),
      })

    const { result } = renderHook(() =>
      useContacts({ stage: ConnectionStage.DRAFTED })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateContactStage('1', 'CONNECTED')
    })

    expect(result.current.contacts[0].connection_stage).toBe('CONNECTED')
    expect(result.current.contacts[1].connection_stage).toBe('DRAFTED')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/crm/contacts/1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ connection_stage: 'CONNECTED' }),
      })
    )
  })

  it('updateContactStage reverts on failure', async () => {
    const contacts = [
      { id: '1', last_name: 'Smith', company: 'Google', connection_stage: 'DRAFTED' },
    ]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contacts, total: 1, page: 1, totalPages: 1 }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() =>
      useContacts({ stage: ConnectionStage.DRAFTED })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateContactStage('1', 'CONNECTED')
    })

    expect(result.current.contacts[0].connection_stage).toBe('DRAFTED')
    expect(result.current.error).toBe('Failed to update contact stage')
  })
})
