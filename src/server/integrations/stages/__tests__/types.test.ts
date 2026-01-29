import { describe, it, expect } from 'vitest'
import { sanitizeForEmail, sanitizeErrorMessage, safeProgress } from '../types'

describe('sanitizeForEmail', () => {
  it('should strip control characters', () => {
    expect(sanitizeForEmail('Hello\x00World\x1F!')).toBe('HelloWorld!')
  })

  it('should preserve unicode', () => {
    expect(sanitizeForEmail('李明 🚀')).toBe('李明 🚀')
  })

  it('should truncate at 1000 chars', () => {
    const long = 'a'.repeat(1500)
    expect(sanitizeForEmail(long)).toHaveLength(1000)
  })

  it('should preserve normal whitespace', () => {
    expect(sanitizeForEmail('Hello\nWorld\tFoo')).toBe('Hello\nWorld\tFoo')
  })
})

describe('sanitizeErrorMessage', () => {
  it('should return generic message for non-Error values', () => {
    expect(sanitizeErrorMessage('string')).toBe('Unknown error occurred')
    expect(sanitizeErrorMessage(42)).toBe('Unknown error occurred')
  })

  it('should redact API key patterns', () => {
    const error = new Error('Failed with key sk-proj-abc123XYZ')
    expect(sanitizeErrorMessage(error)).toContain('[REDACTED]')
    expect(sanitizeErrorMessage(error)).not.toContain('sk-proj')
  })

  it('should redact email addresses', () => {
    const error = new Error('Error for user@example.com')
    expect(sanitizeErrorMessage(error)).toContain('[EMAIL]')
    expect(sanitizeErrorMessage(error)).not.toContain('user@example.com')
  })

  it('should truncate long messages', () => {
    const error = new Error('x'.repeat(1000))
    expect(sanitizeErrorMessage(error).length).toBeLessThanOrEqual(500)
  })
})

describe('safeProgress', () => {
  it('should not throw if callback throws', () => {
    const bad = () => {
      throw new Error('boom')
    }
    expect(() => safeProgress(bad, 1, 10)).not.toThrow()
  })

  it('should call callback normally', () => {
    let called = false
    safeProgress(() => { called = true }, 1, 10)
    expect(called).toBe(true)
  })

  it('should handle undefined callback', () => {
    expect(() => safeProgress(undefined, 1, 10)).not.toThrow()
  })
})
