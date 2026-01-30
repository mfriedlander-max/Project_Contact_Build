import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTemplates } from '../useTemplates'

describe('useTemplates', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches templates on mount', async () => {
    const templates = [{ id: '1', name: 'Welcome', subject: 'Hi', body: 'Hello' }]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates }),
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.templates).toEqual(templates)
  })

  it('creates a new template', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: [] }),
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const newTemplate = { name: 'New', subject: 'Sub', body: 'Body' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ template: { id: '2', ...newTemplate } }),
    })

    await act(async () => {
      await result.current.createTemplate(newTemplate)
    })

    expect(mockFetch).toHaveBeenLastCalledWith('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTemplate),
    })
  })

  it('deletes a template', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: [{ id: '1', name: 'Welcome' }] }),
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await act(async () => {
      await result.current.deleteTemplate('1')
    })

    expect(mockFetch).toHaveBeenLastCalledWith('/api/templates?id=1', {
      method: 'DELETE',
    })
    expect(result.current.templates).toEqual([])
  })

  it('updates an existing template', async () => {
    const initial = [{ id: '1', name: 'Welcome', subject: 'Hi', body: 'Hello' }]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: initial }),
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const updated = { id: '1', name: 'Updated', subject: 'Hi', body: 'Hello' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ template: updated }),
    })

    await act(async () => {
      await result.current.updateTemplate('1', { name: 'Updated' })
    })

    expect(mockFetch).toHaveBeenLastCalledWith('/api/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '1', name: 'Updated' }),
    })
    expect(result.current.templates).toEqual([updated])
  })

  it('handles update error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: [{ id: '1', name: 'Welcome' }] }),
    })

    const { result } = renderHook(() => useTemplates())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    mockFetch.mockResolvedValueOnce({ ok: false })

    await act(async () => {
      await result.current.updateTemplate('1', { name: 'Fail' })
    })

    expect(result.current.error).toBe('Failed to update template')
  })
})
