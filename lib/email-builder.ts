/**
 * Email Builder Utility
 *
 * Provides functions for building RFC 2822 formatted emails
 * for use with Gmail API and other email services.
 */

/**
 * Email options for building an RFC 2822 email
 */
export interface EmailOptions {
  to: string
  subject: string
  body: string
  from?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
}

/**
 * Encodes a header value for RFC 2822 email if it contains non-ASCII characters.
 * Uses UTF-8 encoding with base64 (RFC 2047).
 *
 * @param value - The header value to encode
 * @returns Encoded header value or original if only ASCII
 */
function encodeHeaderIfNeeded(value: string): string {
  // Check if value contains non-ASCII characters
  const hasNonAscii = /[^\x00-\x7F]/.test(value)

  if (!hasNonAscii) {
    return value
  }

  // Encode using RFC 2047 format: =?charset?encoding?encoded_text?=
  const encoded = Buffer.from(value, 'utf-8').toString('base64')
  return `=?UTF-8?B?${encoded}?=`
}

/**
 * Builds an RFC 2822 formatted email string.
 *
 * RFC 2822 format:
 * ```
 * To: recipient@example.com
 * Subject: Email Subject
 * Content-Type: text/plain; charset="UTF-8"
 *
 * Email body content here
 * ```
 *
 * @param options - Email options including to, subject, body, and optional fields
 * @returns RFC 2822 formatted email string
 */
export function buildRfc2822Email(options: EmailOptions): string {
  const { to, subject, body, from, cc, bcc, replyTo } = options

  const headers: string[] = []

  // Add optional From header
  if (from) {
    headers.push(`From: ${from}`)
  }

  // Required To header
  headers.push(`To: ${to}`)

  // Add optional CC header
  if (cc && cc.length > 0) {
    headers.push(`Cc: ${cc.join(', ')}`)
  }

  // Add optional BCC header
  if (bcc && bcc.length > 0) {
    headers.push(`Bcc: ${bcc.join(', ')}`)
  }

  // Add optional Reply-To header
  if (replyTo) {
    headers.push(`Reply-To: ${replyTo}`)
  }

  // Subject header - encode if contains non-ASCII
  headers.push(`Subject: ${encodeHeaderIfNeeded(subject)}`)

  // Content-Type header
  headers.push('Content-Type: text/plain; charset="UTF-8"')

  // Combine headers with body (empty line separates headers from body)
  return [...headers, '', body].join('\r\n')
}

/**
 * Encodes an RFC 2822 email string to base64url format for Gmail API.
 *
 * Gmail API requires the email to be base64url encoded (not standard base64).
 * Base64url uses - and _ instead of + and / and omits padding.
 *
 * @param email - RFC 2822 formatted email string
 * @returns Base64url encoded string
 */
export function encodeEmailForGmail(email: string): string {
  return Buffer.from(email, 'utf-8').toString('base64url')
}

/**
 * Builds and encodes an email for Gmail API in one step.
 *
 * @param options - Email options
 * @returns Base64url encoded RFC 2822 email ready for Gmail API
 */
export function buildGmailRawMessage(options: EmailOptions): string {
  const email = buildRfc2822Email(options)
  return encodeEmailForGmail(email)
}

/**
 * Validates an email address format.
 *
 * This is a basic validation - for production use, consider
 * a more comprehensive validation library.
 *
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
