import { NextRequest } from 'next/server'

interface RateLimitOptions {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max unique tokens per interval
}

interface RateLimitResult {
  limit: number
  remaining: number
  reset: number
}

// In-memory store for rate limiting (in production, use Redis)
const tokenCache = new Map<string, { count: number; reset: number }>()

export function rateLimit(options: RateLimitOptions) {
  const { interval, uniqueTokenPerInterval } = options

  return {
    check: async (
      request: NextRequest,
      limit: number,
      token?: string
    ): Promise<RateLimitResult> => {
      // Use IP address as default token
      const identifier = token || getClientIP(request) || 'anonymous'
      
      const now = Date.now()
      const windowStart = now - interval
      
      // Clean up expired entries
      for (const [key, value] of tokenCache.entries()) {
        if (value.reset < now) {
          tokenCache.delete(key)
        }
      }
      
      // Get or create token entry
      let tokenData = tokenCache.get(identifier)
      
      if (!tokenData || tokenData.reset < now) {
        // Create new window
        tokenData = {
          count: 0,
          reset: now + interval,
        }
      }
      
      // Increment count
      tokenData.count++
      tokenCache.set(identifier, tokenData)
      
      const result: RateLimitResult = {
        limit,
        remaining: Math.max(0, limit - tokenData.count),
        reset: tokenData.reset,
      }
      
      // Check if limit exceeded
      if (tokenData.count > limit) {
        const error = new Error('Rate limit exceeded')
        ;(error as any).rateLimitResult = result
        throw error
      }
      
      return result
    },
  }
}

// Get client IP address from request
function getClientIP(request: NextRequest): string | null {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to connection remote address (may not be available in all environments)
  return null
}

// Rate limiting decorator for API routes
export function withRateLimit(
  limit: number,
  windowMs: number = 60 * 1000 // 1 minute default
) {
  const limiter = rateLimit({
    interval: windowMs,
    uniqueTokenPerInterval: 500,
  })

  return function (handler: Function) {
    return async function (request: NextRequest, context?: any) {
      try {
        const result = await limiter.check(request, limit)
        
        // Add rate limit headers to response
        const response = await handler(request, context)
        
        if (response instanceof Response) {
          response.headers.set('X-RateLimit-Limit', limit.toString())
          response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
          response.headers.set('X-RateLimit-Reset', result.reset.toString())
        }
        
        return response
      } catch (error) {
        if (error instanceof Error && (error as any).rateLimitResult) {
          const rateLimitResult = (error as any).rateLimitResult
          
          return new Response(
            JSON.stringify({
              error: 'Too many requests',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': rateLimitResult.reset.toString(),
                'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
              },
            }
          )
        }
        
        throw error
      }
    }
  }
}

// Different rate limits for different endpoints
export const rateLimits = {
  // Authentication endpoints - stricter limits
  auth: withRateLimit(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  
  // General API endpoints
  api: withRateLimit(100, 60 * 1000), // 100 requests per minute
  
  // File upload endpoints
  upload: withRateLimit(10, 60 * 1000), // 10 uploads per minute
  
  // Search endpoints
  search: withRateLimit(50, 60 * 1000), // 50 searches per minute
  
  // Heavy operations
  heavy: withRateLimit(5, 60 * 1000), // 5 heavy operations per minute
}

