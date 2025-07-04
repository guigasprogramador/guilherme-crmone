import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Limit 500 users per minute
})

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return input
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate CNPJ format
export function isValidCNPJ(cnpj: string): boolean {
  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
  
  // Check if it has 14 digits
  if (cleanCNPJ.length !== 14) return false
  
  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  
  // Validate check digits
  let sum = 0
  let weight = 5
  
  // First check digit
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  
  let remainder = sum % 11
  const firstDigit = remainder < 2 ? 0 : 11 - remainder
  
  if (parseInt(cleanCNPJ[12]) !== firstDigit) return false
  
  // Second check digit
  sum = 0
  weight = 6
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  
  remainder = sum % 11
  const secondDigit = remainder < 2 ? 0 : 11 - remainder
  
  return parseInt(cleanCNPJ[13]) === secondDigit
}

// Security middleware
export async function securityMiddleware(request: NextRequest) {
  try {
    // Apply rate limiting
    await limiter.check(request, 10, 'CACHE_TOKEN') // 10 requests per minute per IP
    
    // Create response with security headers
    const response = NextResponse.next()
    
    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    // Rate limit exceeded
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
        ...securityHeaders,
      },
    })
  }
}

// Validation middleware for API routes
export function validateRequest(schema: any) {
  return (handler: Function) => {
    return async (request: NextRequest, context?: any) => {
      try {
        const body = await request.json()
        const sanitizedBody = sanitizeInput(body)
        
        // Validate against schema (you can use Zod or similar)
        // const validatedData = schema.parse(sanitizedBody)
        
        // Create new request with sanitized body
        const newRequest = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(sanitizedBody),
        })
        
        return handler(newRequest, context)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 }
        )
      }
    }
  }
}

// Error handling middleware
export function errorHandler(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)
      
      // Don't expose internal errors in production
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: isDevelopment ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        },
        { status: 500 }
      )
    }
  }
}

// Database connection middleware
export function withDatabase(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    const { getDbConnection } = await import('@/lib/mysql/client')
    let connection
    
    try {
      connection = await getDbConnection()
      
      // Add connection to request context
      const result = await handler(request, { ...context, connection })
      
      return result
    } catch (error) {
      console.error('Database connection error:', error)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    } finally {
      if (connection) {
        await connection.release()
      }
    }
  }
}

// Combine middlewares
export function withMiddleware(...middlewares: Function[]) {
  return (handler: Function) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    )
  }
}

