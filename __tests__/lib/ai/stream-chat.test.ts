import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildChatMessages } from '@/lib/ai/stream-chat'

describe('buildSystemPrompt', () => {
  it('returns system prompt containing the mode name', () => {
    const result = buildSystemPrompt('CONTACT_FINDER')
    expect(result).toContain('Contact Finder')
  })

  it('returns different prompts per mode', () => {
    const finder = buildSystemPrompt('CONTACT_FINDER')
    const manager = buildSystemPrompt('GENERAL_MANAGER')
    expect(finder).not.toEqual(manager)
  })
})

describe('buildChatMessages', () => {
  it('converts user message to Anthropic message format', () => {
    const result = buildChatMessages('Hello')
    expect(result).toEqual([{ role: 'user', content: 'Hello' }])
  })

  it('includes conversation history when provided', () => {
    const history = [
      { role: 'user' as const, content: 'Hi' },
      { role: 'assistant' as const, content: 'Hello!' },
    ]
    const result = buildChatMessages('Follow up', history)
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ role: 'user', content: 'Follow up' })
  })
})
