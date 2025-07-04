// Simple in-memory cache implementation
// In production, consider using Redis or similar

interface CacheEntry<T> {
  value: T
  expiry: number
  tags?: string[]
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private tagMap = new Map<string, Set<string>>()

  set<T>(
    key: string,
    value: T,
    ttlMs: number = 5 * 60 * 1000, // 5 minutes default
    tags: string[] = []
  ): void {
    const expiry = Date.now() + ttlMs
    
    this.cache.set(key, { value, expiry, tags })
    
    // Update tag mapping
    tags.forEach(tag => {
      if (!this.tagMap.has(tag)) {
        this.tagMap.set(tag, new Set())
      }
      this.tagMap.get(tag)!.add(key)
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    if (Date.now() > entry.expiry) {
      this.delete(key)
      return null
    }
    
    return entry.value
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (entry) {
      // Remove from tag mapping
      entry.tags?.forEach(tag => {
        const tagSet = this.tagMap.get(tag)
        if (tagSet) {
          tagSet.delete(key)
          if (tagSet.size === 0) {
            this.tagMap.delete(tag)
          }
        }
      })
    }
    
    return this.cache.delete(key)
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagMap.get(tag)
    
    if (!keys) {
      return 0
    }
    
    let count = 0
    keys.forEach(key => {
      if (this.delete(key)) {
        count++
      }
    })
    
    return count
  }

  clear(): void {
    this.cache.clear()
    this.tagMap.clear()
  }

  // Clean up expired entries
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.delete(key)
        cleaned++
      }
    }
    
    return cleaned
  }

  size(): number {
    return this.cache.size
  }

  stats() {
    return {
      size: this.cache.size,
      tags: this.tagMap.size,
    }
  }
}

// Global cache instance
export const cache = new MemoryCache()

// Cache decorator for functions
export function cached<T extends (...args: any[]) => any>(
  keyGenerator: (...args: Parameters<T>) => string,
  ttlMs: number = 5 * 60 * 1000,
  tags: string[] = []
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: Parameters<T>) {
      const key = keyGenerator(...args)
      
      // Try to get from cache
      const cached = cache.get(key)
      if (cached !== null) {
        return cached
      }
      
      // Execute original method
      const result = await method.apply(this, args)
      
      // Cache the result
      cache.set(key, result, ttlMs, tags)
      
      return result
    }

    return descriptor
  }
}

// Cache utilities for common patterns
export const cacheUtils = {
  // Generate cache key for database queries
  dbKey: (table: string, id: string, fields?: string[]) => {
    const fieldsStr = fields ? `-${fields.sort().join(',')}` : ''
    return `db:${table}:${id}${fieldsStr}`
  },

  // Generate cache key for API responses
  apiKey: (endpoint: string, params?: Record<string, any>) => {
    const paramsStr = params 
      ? `-${Object.keys(params).sort().map(k => `${k}:${params[k]}`).join(',')}`
      : ''
    return `api:${endpoint}${paramsStr}`
  },

  // Generate cache key for user-specific data
  userKey: (userId: string, resource: string, id?: string) => {
    const idStr = id ? `:${id}` : ''
    return `user:${userId}:${resource}${idStr}`
  },

  // Cache tags for invalidation
  tags: {
    cliente: (id: string) => [`cliente:${id}`, 'clientes'],
    oportunidade: (id: string) => [`oportunidade:${id}`, 'oportunidades'],
    licitacao: (id: string) => [`licitacao:${id}`, 'licitacoes'],
    documento: (id: string) => [`documento:${id}`, 'documentos'],
    user: (id: string) => [`user:${id}`, 'users'],
  },
}

// Cache middleware for API routes
export function withCache(
  keyGenerator: (request: Request, context?: any) => string,
  ttlMs: number = 5 * 60 * 1000,
  tags: string[] = []
) {
  return function (handler: Function) {
    return async function (request: Request, context?: any) {
      // Only cache GET requests
      if (request.method !== 'GET') {
        return handler(request, context)
      }

      const key = keyGenerator(request, context)
      
      // Try to get from cache
      const cached = cache.get(key)
      if (cached !== null) {
        return new Response(JSON.stringify(cached), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
        })
      }
      
      // Execute handler
      const response = await handler(request, context)
      
      // Cache successful responses
      if (response.ok) {
        const data = await response.json()
        cache.set(key, data, ttlMs, tags)
        
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'MISS',
          },
        })
      }
      
      return response
    }
  }
}

// Automatic cache cleanup
setInterval(() => {
  const cleaned = cache.cleanup()
  if (cleaned > 0) {
    console.log(`Cache cleanup: removed ${cleaned} expired entries`)
  }
}, 60 * 1000) // Run every minute

// Cache warming utilities
export const cacheWarming = {
  // Warm up common queries
  async warmupCommon() {
    // Add common queries that should be pre-cached
    console.log('Warming up cache with common queries...')
    
    // Example: Pre-cache active clients
    // const activeClients = await fetchActiveClients()
    // cache.set('active-clients', activeClients, 10 * 60 * 1000, ['clientes'])
  },

  // Warm up user-specific data
  async warmupUser(userId: string) {
    console.log(`Warming up cache for user ${userId}...`)
    
    // Example: Pre-cache user's recent oportunidades
    // const userOportunidades = await fetchUserOportunidades(userId)
    // cache.set(cacheUtils.userKey(userId, 'oportunidades'), userOportunidades, 5 * 60 * 1000, cacheUtils.tags.user(userId))
  },
}

export default cache

