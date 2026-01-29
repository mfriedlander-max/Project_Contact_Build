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
      json: async () => ({ contacts }),
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
      json: async () => ({ contacts: [] }),
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
      json: async () => ({ contacts: [] }),
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
})
