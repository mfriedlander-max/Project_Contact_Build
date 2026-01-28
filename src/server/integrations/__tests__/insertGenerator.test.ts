import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate }
  }
  return { default: MockAnthropic }
})

import { generateInsert } from '../insertGenerator'

describe('insertGenerator', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  it('should return insert text from Claude response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I noticed your work on distributed systems at MIT.' }],
    })

    const result = await generateInsert(
      { firstName: 'Alice', lastName: 'Smith', company: 'MIT' },
      'Alice Smith is a professor of distributed systems at MIT, specializing in consensus algorithms. She published 20 papers in 2025.'
    )

    expect(result.insert).toBe('I noticed your work on distributed systems at MIT.')
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('should return HIGH confidence when page content > 500 chars', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Great insert text.' }],
    })

    const longContent = 'A'.repeat(501)
    const result = await generateInsert(
      { firstName: 'Bob', lastName: 'Jones', company: 'Acme' },
      longContent
    )

    expect(result.confidence).toBe('HIGH')
  })

  it('should return MEDIUM confidence when page content > 100 and <= 500 chars', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Decent insert.' }],
    })

    const medContent = 'A'.repeat(200)
    const result = await generateInsert(
      { firstName: 'Carol', lastName: 'White', company: 'Corp' },
      medContent
    )

    expect(result.confidence).toBe('MEDIUM')
  })

  it('should return LOW confidence when page content <= 100 chars', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Short insert.' }],
    })

    const result = await generateInsert(
      { firstName: 'Dan', lastName: 'Brown', company: 'Inc' },
      'Short content'
    )

    expect(result.confidence).toBe('LOW')
  })

  it('should pass correct parameters to Anthropic API', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Insert text.' }],
    })

    await generateInsert(
      { firstName: 'Eve', lastName: 'Green', company: 'StartupX' },
      'Page content here'
    )

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
        max_tokens: 150,
        temperature: 0.7,
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
        ]),
      })
    )
  })

  it('should throw when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY

    await expect(
      generateInsert(
        { firstName: 'Test', lastName: 'User', company: 'Co' },
        'content'
      )
    ).rejects.toThrow('ANTHROPIC_API_KEY')
  })

  it('should throw on API error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API rate limited'))

    await expect(
      generateInsert(
        { firstName: 'Test', lastName: 'User', company: 'Co' },
        'content'
      )
    ).rejects.toThrow('Insert generation failed')
  })
})
