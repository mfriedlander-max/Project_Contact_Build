/**
 * Simple in-memory rate limiter for API routes.
 * For production with multiple servers, consider using Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  limit: number // Maximum requests per window
}

// In-memory store for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    const entries = Array.from(rateLimitStore.entries())
    for (const [key, entry] of entries) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)

  // Don't keep the process alive just for cleanup
  cleanupTimer.unref()
}

startCleanup()

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique identifier for the rate limit (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if the request is allowed
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const key = identifier

  const existing = rateLimitStore.get(key)

  // If no existing entry or window has expired, create new entry
  if (!existing || existing.resetTime < now) {
    const resetTime = now + config.interval
    rateLimitStore.set(key, { count: 1, resetTime })

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: resetTime,
    }
  }

  // Increment count
  existing.count++

  // Check if over limit
  if (existing.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: existing.resetTime,
    }
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    reset: existing.resetTime,
  }
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  // Standard API rate limit: 100 requests per minute
  standard: (identifier: string) =>
    rateLimit(identifier, { interval: 60 * 1000, limit: 100 }),

  // Strict rate limit for expensive operations: 10 requests per minute
  strict: (identifier: string) =>
    rateLimit(identifier, { interval: 60 * 1000, limit: 10 }),

  // Very strict for AI/external API calls: 5 requests per minute
  aiOperations: (identifier: string) =>
    rateLimit(identifier, { interval: 60 * 1000, limit: 5 }),

  // Authentication attempts: 5 per 15 minutes
  auth: (identifier: string) =>
    rateLimit(identifier, { interval: 15 * 60 * 1000, limit: 5 }),
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(
  request: Request,
  userId?: string
): string {
  // Prefer user ID if available (authenticated requests)
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'

  return `ip:${ip}`
}
