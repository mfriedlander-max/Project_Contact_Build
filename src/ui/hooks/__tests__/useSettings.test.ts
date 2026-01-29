import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSettings } from '../useSettings'

describe('useSettings', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches settings on mount', async () => {
    const settings = { defaultAiMode: 'GENERAL_MANAGER', notificationsEnabled: true }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ settings }),
    })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.settings).toEqual(settings)
    expect(mockFetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({ method: 'GET' }))
  })

  it('updates settings via PUT', async () => {
    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ settings: { defaultAiMode: 'GENERAL_MANAGER' } }),
    })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Update call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ settings: { defaultAiMode: 'CONTACT_FINDER' } }),
    })

    await act(async () => {
      await result.current.updateSettings({ defaultAiMode: 'CONTACT_FINDER' })
    })

    expect(mockFetch).toHaveBeenLastCalledWith('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultAiMode: 'CONTACT_FINDER' }),
    })
    expect(result.current.settings?.defaultAiMode).toBe('CONTACT_FINDER')
  })

  it('handles fetch error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.settings).toBeNull()
  })
})
