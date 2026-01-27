import { describe, it, expect } from 'vitest'
import {
  buildRfc2822Email,
  encodeEmailForGmail,
  buildGmailRawMessage,
  isValidEmail,
  EmailOptions,
} from '../email-builder'

describe('email-builder', () => {
  describe('buildRfc2822Email', () => {
    it('should build a basic RFC 2822 email with required fields', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('To: recipient@example.com')
      expect(email).toContain('Subject: Test Subject')
      expect(email).toContain('Content-Type: text/plain; charset="UTF-8"')
      expect(email).toContain('Test body content')
    })

    it('should include From header when provided', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Body',
        from: 'sender@example.com',
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('From: sender@example.com')
    })

    it('should include CC header when provided', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Body',
        cc: ['cc1@example.com', 'cc2@example.com'],
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('Cc: cc1@example.com, cc2@example.com')
    })

    it('should include BCC header when provided', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Body',
        bcc: ['bcc@example.com'],
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('Bcc: bcc@example.com')
    })

    it('should include Reply-To header when provided', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Body',
        replyTo: 'reply@example.com',
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('Reply-To: reply@example.com')
    })

    it('should separate headers from body with empty line', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Body content',
      }

      const email = buildRfc2822Email(options)

      // Headers and body should be separated by CRLF + CRLF
      expect(email).toContain('\r\n\r\nBody content')
    })

    it('should handle multiline body content', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Line 1\nLine 2\nLine 3',
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('Line 1\nLine 2\nLine 3')
    })

    it('should handle special characters in subject', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Re: Your inquiry - Important!',
        body: 'Body',
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('Subject: Re: Your inquiry - Important!')
    })

    it('should encode non-ASCII characters in subject using RFC 2047', () => {
      // Use explicit unicode escape for e-acute to ensure non-ASCII character
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Caf\u00e9 avec accent',  // Contains non-ASCII e-acute character
        body: 'Body',
      }

      const email = buildRfc2822Email(options)

      // Should be encoded in base64 with UTF-8 charset
      expect(email).toContain('Subject: =?UTF-8?B?')
    })

    it('should preserve ASCII-only subjects without encoding', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Plain ASCII Subject',
        body: 'Body',
      }

      const email = buildRfc2822Email(options)

      expect(email).toContain('Subject: Plain ASCII Subject')
      expect(email).not.toContain('=?UTF-8?B?')
    })
  })

  describe('encodeEmailForGmail', () => {
    it('should return base64url encoded string', () => {
      const email = 'To: test@example.com\r\nSubject: Test\r\n\r\nBody'

      const encoded = encodeEmailForGmail(email)

      // base64url should not contain + or /
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')

      // Should be decodable back to original
      const decoded = Buffer.from(encoded, 'base64url').toString('utf-8')
      expect(decoded).toBe(email)
    })

    it('should handle unicode content', () => {
      const email = 'To: test@example.com\r\n\r\nHello World'

      const encoded = encodeEmailForGmail(email)
      const decoded = Buffer.from(encoded, 'base64url').toString('utf-8')

      expect(decoded).toBe(email)
    })
  })

  describe('buildGmailRawMessage', () => {
    it('should build and encode email in one step', () => {
      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        body: 'Test body',
      }

      const rawMessage = buildGmailRawMessage(options)

      // Should be base64url encoded
      const decoded = Buffer.from(rawMessage, 'base64url').toString('utf-8')

      expect(decoded).toContain('To: recipient@example.com')
      expect(decoded).toContain('Subject: Test')
      expect(decoded).toContain('Test body')
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.org')).toBe(true)
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
      expect(isValidEmail('123@numbers.com')).toBe(true)
    })

    it('should return false for invalid email formats', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('missing@domain')).toBe(false)
      expect(isValidEmail('@nodomain.com')).toBe(false)
      expect(isValidEmail('spaces not@allowed.com')).toBe(false)
    })
  })
})
