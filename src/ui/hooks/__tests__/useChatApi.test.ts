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
      headers: {
        get: (name: string) => (name === 'Content-Type' ? 'application/json' : null),
      },
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
      headers: {
        get: (name: string) => (name === 'Content-Type' ? 'application/json' : null),
      },
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
      headers: {
        get: (name: string) => (name === 'Content-Type' ? 'application/json' : null),
      },
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
      headers: {
        get: (name: string) => (name === 'Content-Type' ? 'application/json' : null),
      },
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
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'application/json' : null),
        },
        json: async () => ({ reply: 'Done', actions: [], stagedContacts: [] }),
      })
      await sendPromise
    })

    expect(result.current.isLoading).toBe(false)
  })

  it('handles SSE streaming responses from chat API', async () => {
    // Create a mock SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"text","text":"Hello"}\n\n'))
        controller.enqueue(encoder.encode('data: {"type":"text","text":" World"}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
      },
      body: stream,
    })

    const { result } = renderHook(() => useChatApi())

    let response: { reply: string } | undefined
    await act(async () => {
      response = await result.current.sendMessage('Tell me something', AiMode.ASSISTANT)
    })

    expect(response?.reply).toBe('Hello World')
  })

  it('handles SSE error events', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"error","error":"AI service failed"}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
      },
      body: stream,
    })

    const { result } = renderHook(() => useChatApi())

    let response: { reply: string } | undefined
    await act(async () => {
      response = await result.current.sendMessage('Tell me something', AiMode.ASSISTANT)
    })

    expect(result.current.error).toBeTruthy()
    expect(response?.reply).toBe('')
  })

  it('handles JSON responses for action requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => (name === 'Content-Type' ? 'application/json' : null),
      },
      json: async () => ({
        reply: 'Action completed',
        actions: [],
      }),
    })

    const { result } = renderHook(() => useChatApi())

    let response: { reply: string } | undefined
    await act(async () => {
      response = await result.current.sendMessage('Execute action', AiMode.GENERAL_MANAGER)
    })

    expect(response?.reply).toBe('Action completed')
  })

  // ============================================================================
  // Tool Calling Event Tests
  // ============================================================================

  describe('Tool Calling Events', () => {
    it('handles tool_result events and updates staged contacts', async () => {
      const stagedContacts = [
        { id: '1', name: 'Alice', company: 'Google', email: 'alice@google.com' },
        { id: '2', name: 'Bob', company: 'Google', email: 'bob@google.com' },
      ]

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"text","text":"Finding contacts..."}\n\n'))
          controller.enqueue(
            encoder.encode(
              `data: {"type":"tool_result","tool":"find_contacts","result":${JSON.stringify(stagedContacts)}}\n\n`
            )
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Find contacts at Google', AiMode.CONTACT_FINDER)
      })

      expect(result.current.stagedContacts).toEqual(stagedContacts)
      expect(result.current.stagingQuery).toBe('Find contacts at Google')
    })

    it('handles confirmation_required events and sets pending state', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"confirmation_required","message":"Delete 2 contacts?","actionType":"DELETE_CONTACTS","payload":{"contactIds":["1","2"]}}\n\n'
            )
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Delete contacts 1 and 2', AiMode.GENERAL_MANAGER)
      })

      expect(result.current.showConfirmDialog).toBe(true)
      expect(result.current.pendingConfirmation).toEqual({
        message: 'Delete 2 contacts?',
        actionType: 'DELETE_CONTACTS',
        payload: { contactIds: ['1', '2'] },
        lastMessage: 'Delete contacts 1 and 2',
      })
    })

    it('re-sends request with userConfirmed on handleConfirm', async () => {
      // First request - get confirmation required
      const encoder1 = new TextEncoder()
      const stream1 = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder1.encode(
              'data: {"type":"confirmation_required","message":"Delete contact?","actionType":"DELETE_CONTACTS","payload":{"contactIds":["1"]}}\n\n'
            )
          )
          controller.enqueue(encoder1.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream1,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Delete contact 1', AiMode.GENERAL_MANAGER)
      })

      expect(result.current.pendingConfirmation).toBeTruthy()

      // Second request - confirm action
      const encoder2 = new TextEncoder()
      const stream2 = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder2.encode('data: {"type":"text","text":"Contact deleted"}\n\n'))
          controller.enqueue(encoder2.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream2,
      })

      await act(async () => {
        await result.current.handleConfirm()
      })

      // Verify confirmation was sent in request
      expect(mockFetch).toHaveBeenLastCalledWith('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Delete contact 1',
          mode: AiMode.GENERAL_MANAGER,
          userConfirmed: true,
          actionType: 'DELETE_CONTACTS',
          payload: { contactIds: ['1'] },
        }),
      })

      expect(result.current.showConfirmDialog).toBe(false)
      expect(result.current.pendingConfirmation).toBeNull()
    })

    it('clears confirmation state on handleCancel', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"confirmation_required","message":"Delete?","actionType":"DELETE_CONTACTS","payload":{"contactIds":["1"]}}\n\n'
            )
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Delete contact 1', AiMode.GENERAL_MANAGER)
      })

      expect(result.current.pendingConfirmation).toBeTruthy()

      act(() => {
        result.current.handleCancel()
      })

      expect(result.current.showConfirmDialog).toBe(false)
      expect(result.current.pendingConfirmation).toBeNull()
    })

    it('handles tool_error events and sets error state', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"tool_error","tool":"find_contacts","error":"Search provider not configured"}\n\n'
            )
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Find contacts', AiMode.CONTACT_FINDER)
      })

      expect(result.current.error).toBe('find_contacts: Search provider not configured')
    })

    it('handles mixed text and tool_result events', async () => {
      const stagedContacts = [{ id: '1', name: 'Alice', company: 'Google', email: 'a@g.com' }]

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"text","text":"Searching..."}\n\n'))
          controller.enqueue(
            encoder.encode(
              `data: {"type":"tool_result","tool":"find_contacts","result":${JSON.stringify(stagedContacts)}}\n\n`
            )
          )
          controller.enqueue(encoder.encode('data: {"type":"text","text":" Found 1 contact"}\n\n'))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      let response: { reply: string } | undefined
      await act(async () => {
        response = await result.current.sendMessage('Find contacts', AiMode.CONTACT_FINDER)
      })

      expect(response?.reply).toBe('Searching... Found 1 contact')
      expect(result.current.stagedContacts).toEqual(stagedContacts)
    })

    it('ignores non-find_contacts tool results for staged contacts', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"tool_result","tool":"query_contacts","result":[]}\n\n')
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Query contacts', AiMode.GENERAL_MANAGER)
      })

      expect(result.current.stagedContacts).toEqual([])
    })

    it('handles multiple tool_error events in same stream', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"tool_error","tool":"find_contacts","error":"Error 1"}\n\n')
          )
          controller.enqueue(
            encoder.encode('data: {"type":"tool_error","tool":"query_contacts","error":"Error 2"}\n\n')
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Find contacts', AiMode.CONTACT_FINDER)
      })

      // Last error wins
      expect(result.current.error).toBe('query_contacts: Error 2')
    })

    it('does not re-send on handleConfirm if no pending confirmation', async () => {
      mockFetch.mockClear()

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.handleConfirm()
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('handles confirmation_required followed by cancel flow', async () => {
      mockFetch.mockClear()

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"confirmation_required","message":"Delete?","actionType":"DELETE_CONTACTS","payload":{"contactIds":["1"]}}\n\n'
            )
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Delete contact 1', AiMode.GENERAL_MANAGER)
      })

      expect(result.current.showConfirmDialog).toBe(true)

      act(() => {
        result.current.handleCancel()
      })

      expect(result.current.showConfirmDialog).toBe(false)
      expect(result.current.pendingConfirmation).toBeNull()

      // No additional API calls should be made
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('sends confirmationData when provided to sendMessage', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"text","text":"Deleted"}\n\n'))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Delete contact', AiMode.GENERAL_MANAGER, {
          userConfirmed: true,
          actionType: 'DELETE_CONTACTS',
          payload: { contactIds: ['1'] },
        })
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Delete contact',
          mode: AiMode.GENERAL_MANAGER,
          userConfirmed: true,
          actionType: 'DELETE_CONTACTS',
          payload: { contactIds: ['1'] },
        }),
      })
    })

    it('handles tool_result with non-array result', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"tool_result","tool":"find_contacts","result":"Not an array"}\n\n')
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Find contacts', AiMode.CONTACT_FINDER)
      })

      // Should not update staged contacts if result is not an array
      expect(result.current.stagedContacts).toEqual([])
    })

    it('exposes pendingConfirmation and showConfirmDialog in return value', () => {
      const { result } = renderHook(() => useChatApi())

      expect(result.current.pendingConfirmation).toBeNull()
      expect(result.current.showConfirmDialog).toBe(false)
      expect(typeof result.current.handleConfirm).toBe('function')
      expect(typeof result.current.handleCancel).toBe('function')
    })

    it('handles error event type in stream', async () => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"error","error":"Unknown tool"}\n\n'))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) => (name === 'Content-Type' ? 'text/event-stream' : null),
        },
        body: stream,
      })

      const { result } = renderHook(() => useChatApi())

      await act(async () => {
        await result.current.sendMessage('Unknown command', AiMode.ASSISTANT)
      })

      expect(result.current.error).toBe('Unknown tool')
    })
  })
})
