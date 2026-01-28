import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatApi } from '../useChatApi'
import { AiMode } from '@/lib/types/enums'

describe('useChatApi', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns initial state with empty staged contacts', () => {
    const { result } = renderHook(() => useChatApi())

    expect(result.current.stagedContacts).toEqual([])
    expect(result.current.stagingQuery).toBe('')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sends message to /api/ai/chat and returns reply', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: 'Found 3 contacts',
        actions: [],
        stagedContacts: [],
      }),
    })

    const { result } = renderHook(() => useChatApi())

    let response: { reply: string } | undefined
    await act(async () => {
      response = await result.current.sendMessage('Find contacts at Google', AiMode.CONTACT_FINDER)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Find contacts at Google', mode: AiMode.CONTACT_FINDER }),
    })
    expect(response?.reply).toBe('Found 3 contacts')
  })

  it('updates stagedContacts when API returns them', async () => {
    const stagedContacts = [
      { id: '1', name: 'Alice', company: 'Google', email: 'alice@google.com' },
      { id: '2', name: 'Bob', company: 'Google', email: 'bob@google.com' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: 'Found 2 contacts',
        actions: [],
        stagedContacts,
      }),
    })

    const { result } = renderHook(() => useChatApi())

    await act(async () => {
      await result.current.sendMessage('Find contacts', AiMode.CONTACT_FINDER)
    })

    expect(result.current.stagedContacts).toEqual(stagedContacts)
    expect(result.current.stagingQuery).toBe('Find contacts')
  })

  it('returns fallback when API fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const { result } = renderHook(() => useChatApi())

    let response: { reply: string } | undefined
    await act(async () => {
      response = await result.current.sendMessage('Find contacts', AiMode.CONTACT_FINDER)
    })

    expect(response?.reply).toBe('AI endpoint not yet connected')
    expect(result.current.error).toBeTruthy()
  })

  it('approves staged contacts via /api/staging/approve', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    const { result } = renderHook(() => useChatApi())

    await act(async () => {
      await result.current.approveStaged('My Campaign', ['1', '2'])
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/staging/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignName: 'My Campaign', keptContactIds: ['1', '2'] }),
    })
    expect(result.current.stagedContacts).toEqual([])
  })

  it('deletes a staged row via /api/staging/{id}', async () => {
    const { result } = renderHook(() => useChatApi())

    // Set initial staged contacts
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: 'Found',
        actions: [],
        stagedContacts: [
          { id: '1', name: 'Alice', company: 'Google', email: 'alice@google.com' },
          { id: '2', name: 'Bob', company: 'Google', email: 'bob@google.com' },
        ],
      }),
    })

    await act(async () => {
      await result.current.sendMessage('Find', AiMode.CONTACT_FINDER)
    })

    // Reset mock to capture delete call
    mockFetch.mockClear()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await act(async () => {
      await result.current.deleteStagedRow('1')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/staging/1', {
      method: 'DELETE',
    })
    expect(result.current.stagedContacts).toEqual([
      { id: '2', name: 'Bob', company: 'Google', email: 'bob@google.com' },
    ])
  })

  it('clears staging state', async () => {
    const { result } = renderHook(() => useChatApi())

    // First populate staging
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: 'Found',
        actions: [],
        stagedContacts: [{ id: '1', name: 'Alice', company: 'Google', email: 'a@g.com' }],
      }),
    })

    await act(async () => {
      await result.current.sendMessage('Find', AiMode.CONTACT_FINDER)
    })

    act(() => {
      result.current.clearStaging()
    })

    expect(result.current.stagedContacts).toEqual([])
    expect(result.current.stagingQuery).toBe('')
  })

  it('sets isLoading during API call', async () => {
    let resolvePromise: (value: unknown) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(pendingPromise)

    const { result } = renderHook(() => useChatApi())

    let sendPromise: Promise<unknown>
    act(() => {
      sendPromise = result.current.sendMessage('Find', AiMode.CONTACT_FINDER)
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => ({ reply: 'Done', actions: [], stagedContacts: [] }),
      })
      await sendPromise
    })

    expect(result.current.isLoading).toBe(false)
  })
})
