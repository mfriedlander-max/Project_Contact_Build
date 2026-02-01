/**
 * Unit tests for AI Chat API Route with tool calling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AiMode } from '@/lib/types/enums'
import type { ReadableStream } from 'stream/web'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/anthropic', () => ({
  anthropicHelper: vi.fn(),
}))

vi.mock('@/src/server/actions/executor', () => ({
  executeAction: vi.fn(),
}))

vi.mock('@/lib/ai/tool-schemas', () => ({
  getToolsForMode: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimiters: {
    aiOperations: vi.fn(() => ({ success: true })),
  },
  getClientIdentifier: vi.fn(() => 'test-client'),
}))

vi.mock('@/lib/ai/stream-chat', () => ({
  buildSystemPrompt: vi.fn(() => 'System prompt'),
  buildChatMessages: vi.fn((message) => [{ role: 'user', content: message }]),
}))

// Import after mocks to avoid initialization errors
import { POST } from '../route'
import { getServerSession } from 'next-auth'
import { anthropicHelper } from '@/lib/anthropic'
import { executeAction } from '@/src/server/actions/executor'
import { getToolsForMode } from '@/lib/ai/tool-schemas'

describe('POST /api/ai/chat - Tool Calling', () => {
  const mockSession = {
    user: { id: 'test-user-id' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('Tool Integration', () => {
    it('should pass tools to Claude API for CONTACT_FINDER mode', async () => {
      const mockTools = [
        { name: 'find_contacts', description: 'Find contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Find engineers in NYC',
          mode: AiMode.CONTACT_FINDER,
        }),
      })

      await POST(req)

      expect(getToolsForMode).toHaveBeenCalledWith(AiMode.CONTACT_FINDER)
      expect(mockClient.messages.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
        })
      )
    })

    it('should pass tools to Claude API for GENERAL_MANAGER mode', async () => {
      const mockTools = [
        { name: 'query_contacts', description: 'Query contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Show me all contacts',
          mode: AiMode.GENERAL_MANAGER,
        }),
      })

      await POST(req)

      expect(getToolsForMode).toHaveBeenCalledWith(AiMode.GENERAL_MANAGER)
      expect(mockClient.messages.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
        })
      )
    })

    it('should pass tools to Claude API for ASSISTANT mode', async () => {
      const mockTools = [
        { name: 'move_stage', description: 'Move stage', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Move contact to CONNECTED',
          mode: AiMode.ASSISTANT,
        }),
      })

      await POST(req)

      expect(getToolsForMode).toHaveBeenCalledWith(AiMode.ASSISTANT)
      expect(mockClient.messages.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: mockTools,
        })
      )
    })
  })

  describe('Tool Use Handling', () => {
    it('should execute action when Claude uses a tool', async () => {
      const mockTools = [
        { name: 'find_contacts', description: 'Find contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'tool-1',
            name: 'find_contacts',
            input: { query: 'engineers in NYC', maxResults: 10 },
          },
        },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)
      vi.mocked(executeAction).mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'John Doe' }],
      })

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Find engineers in NYC',
          mode: AiMode.CONTACT_FINDER,
        }),
      })

      const response = await POST(req)

      // Consume the stream to trigger the async iterator
      await response.text()

      expect(executeAction).toHaveBeenCalledWith(
        {
          type: 'FIND_CONTACTS',
          payload: { query: 'engineers in NYC', maxResults: 10 },
          userConfirmed: false,
        },
        {
          userId: 'test-user-id',
          currentMode: AiMode.CONTACT_FINDER,
        }
      )

      // Verify response is a streaming response
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should stream tool result when action succeeds', async () => {
      const mockTools = [
        { name: 'find_contacts', description: 'Find contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'tool-1',
            name: 'find_contacts',
            input: { query: 'engineers in NYC', maxResults: 10 },
          },
        },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)

      const mockData = [{ id: '1', name: 'John Doe' }]
      vi.mocked(executeAction).mockResolvedValue({
        success: true,
        data: mockData,
      })

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Find engineers in NYC',
          mode: AiMode.CONTACT_FINDER,
        }),
      })

      const response = await POST(req)
      const text = await response.text()

      expect(text).toContain('tool_result')
      expect(text).toContain('find_contacts')
      expect(text).toContain(JSON.stringify(mockData))
    })

    it('should stream confirmation request for dangerous actions', async () => {
      const mockTools = [
        { name: 'delete_contacts', description: 'Delete contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'tool-1',
            name: 'delete_contacts',
            input: { contactIds: ['1', '2'] },
          },
        },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)
      vi.mocked(executeAction).mockResolvedValue({
        success: false,
        requiresConfirmation: true,
        confirmationMessage: 'Delete 2 contacts? This cannot be undone.',
      })

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Delete these contacts',
          mode: AiMode.ASSISTANT,
        }),
      })

      const response = await POST(req)
      const text = await response.text()

      expect(text).toContain('confirmation_required')
      expect(text).toContain('Delete 2 contacts? This cannot be undone.')
    })

    it('should stream error when action fails', async () => {
      const mockTools = [
        { name: 'find_contacts', description: 'Find contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'tool-1',
            name: 'find_contacts',
            input: { query: 'engineers in NYC', maxResults: 10 },
          },
        },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)
      vi.mocked(executeAction).mockResolvedValue({
        success: false,
        error: 'Search provider not configured',
      })

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Find engineers in NYC',
          mode: AiMode.CONTACT_FINDER,
        }),
      })

      const response = await POST(req)
      const text = await response.text()

      expect(text).toContain('tool_error')
      expect(text).toContain('Search provider not configured')
    })

    it('should handle unknown tool names gracefully', async () => {
      const mockTools = [
        { name: 'find_contacts', description: 'Find contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        {
          type: 'content_block_start',
          index: 0,
          content_block: {
            type: 'tool_use',
            id: 'tool-1',
            name: 'unknown_tool',
            input: {},
          },
        },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Do something',
          mode: AiMode.CONTACT_FINDER,
        }),
      })

      const response = await POST(req)
      const text = await response.text()

      expect(text).toContain('error')
      expect(text).toContain('Unknown tool: unknown_tool')
      expect(executeAction).not.toHaveBeenCalled()
    })
  })

  describe('Mixed Content Handling', () => {
    it('should handle both text and tool use in the same response', async () => {
      const mockTools = [
        { name: 'find_contacts', description: 'Find contacts', input_schema: { type: 'object' } },
      ]
      vi.mocked(getToolsForMode).mockReturnValue(mockTools as any)

      const mockStream = createMockStream([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Let me find those contacts for you.' } },
        {
          type: 'content_block_start',
          index: 1,
          content_block: {
            type: 'tool_use',
            id: 'tool-1',
            name: 'find_contacts',
            input: { query: 'engineers in NYC', maxResults: 10 },
          },
        },
      ])

      const mockClient = {
        messages: {
          stream: vi.fn().mockReturnValue(mockStream),
        },
      }
      vi.mocked(anthropicHelper).mockResolvedValue(mockClient as any)
      vi.mocked(executeAction).mockResolvedValue({
        success: true,
        data: [{ id: '1', name: 'John Doe' }],
      })

      const req = new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Find engineers in NYC',
          mode: AiMode.CONTACT_FINDER,
        }),
      })

      const response = await POST(req)
      const text = await response.text()

      // Should contain both text and tool result
      expect(text).toContain('Let me find those contacts for you.')
      expect(text).toContain('tool_result')
    })
  })
})

/**
 * Create a mock async iterable stream
 */
function createMockStream(events: any[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event
      }
    },
  }
}
