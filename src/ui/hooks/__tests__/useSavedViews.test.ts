import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
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
    expect(result.current.error).toBeNull()
  })

  it('returns empty array on fetch error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() => useSavedViews())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.savedViews).toEqual([])
    expect(result.current.error).toBeTruthy()
  })

  it('createView POSTs and adds to local state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedViews: [] }),
    })

    const { result } = renderHook(() => useSavedViews())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const newView = { id: '2', name: 'Hot Leads', filters: { status: 'hot' } }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedView: newView }),
    })

    await act(async () => {
      await result.current.createView({ name: 'Hot Leads', filters: { status: 'hot' } })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/saved-views', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Hot Leads', filters: { status: 'hot' } }),
    }))
    expect(result.current.savedViews).toEqual([newView])
    expect(result.current.error).toBeNull()
  })

  it('updateView PUTs and updates local state', async () => {
    const existing = [
      { id: '1', name: 'Old Name', filters: {}, isDefault: false },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedViews: existing }),
    })

    const { result } = renderHook(() => useSavedViews())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const updated = { id: '1', name: 'New Name', filters: {}, isDefault: false }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedView: updated }),
    })

    await act(async () => {
      await result.current.updateView('1', { name: 'New Name' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/saved-views', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ id: '1', name: 'New Name' }),
    }))
    expect(result.current.savedViews).toEqual([updated])
  })

  it('deleteView DELETEs and removes from local state', async () => {
    const existing = [
      { id: '1', name: 'View A', filters: {} },
      { id: '2', name: 'View B', filters: {} },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedViews: existing }),
    })

    const { result } = renderHook(() => useSavedViews())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    await act(async () => {
      await result.current.deleteView('1')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/saved-views?id=1', expect.objectContaining({
      method: 'DELETE',
    }))
    expect(result.current.savedViews).toEqual([{ id: '2', name: 'View B', filters: {} }])
  })

  it('refetch re-fetches views', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedViews: [] }),
    })

    const { result } = renderHook(() => useSavedViews())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const freshViews = [{ id: '3', name: 'Fresh', filters: {} }]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ savedViews: freshViews }),
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.savedViews).toEqual(freshViews)
  })
})
