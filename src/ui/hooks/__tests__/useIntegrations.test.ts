import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useIntegrations } from '../useIntegrations'

describe('useIntegrations', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches integrations on mount', async () => {
    const integrations = [
      { provider: 'HUNTER', isActive: true },
      { provider: 'GMAIL', isActive: false },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ integrations }),
    })

    const { result } = renderHook(() => useIntegrations())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.integrations).toEqual(integrations)
  })

  it('saves Hunter API key via PUT', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ integrations: [] }),
    })

    const { result } = renderHook(() => useIntegrations())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ integration: { provider: 'HUNTER', isActive: true } }),
    })

    await act(async () => {
      await result.current.saveIntegration({
        provider: 'HUNTER',
        accessToken: 'test-key',
        isActive: true,
      })
    })

    expect(mockFetch).toHaveBeenLastCalledWith('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'HUNTER', accessToken: 'test-key', isActive: true }),
    })
  })

  it('checks connected status for a provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        integrations: [{ provider: 'GMAIL', isActive: true }],
      }),
    })

    const { result } = renderHook(() => useIntegrations())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isConnected('GMAIL')).toBe(true)
    expect(result.current.isConnected('HUNTER')).toBe(false)
  })
})
