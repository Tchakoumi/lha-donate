import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// In-memory store for rate limiting (use Redis in production)
const store = new Map<string, { count: number; resetTime: number }>()

// Clean expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}, 60000) // Clean every minute

export function createRateLimiter(config: RateLimitConfig) {
  return (request: NextRequest): { isLimited: boolean; remainingRequests: number; resetTime: number } => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const key = `${ip}:${request.nextUrl.pathname}`
    
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    let entry = store.get(key)
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = {
        count: 1,
        resetTime: now + config.windowMs
      }
      store.set(key, entry)
      
      return {
        isLimited: false,
        remainingRequests: config.maxRequests - 1,
        resetTime: entry.resetTime
      }
    }
    
    entry.count++
    
    if (entry.count > config.maxRequests) {
      return {
        isLimited: true,
        remainingRequests: 0,
        resetTime: entry.resetTime
      }
    }
    
    return {
      isLimited: false,
      remainingRequests: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }
}

// Pre-configured rate limiters for different routes
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 attempts per 15 minutes
})

export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
})

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute  
  maxRequests: 100 // 100 requests per minute
})