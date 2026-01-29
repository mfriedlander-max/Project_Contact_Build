import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSavedViews } from '../useSavedViews'

describe('useSavedViews', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches saved views on mount', async () => {
    const savedViews = [
      { id: '1', name: 'All Contacts', filters: {}, isDefault: true },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedViews }),
    })

    const { result } = renderHook(() => useSavedViews())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.savedViews).toEqual(savedViews)
  })

  it('returns empty array on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() => useSavedViews())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.savedViews).toEqual([])
    expect(result.current.error).toBeTruthy()
  })
})
