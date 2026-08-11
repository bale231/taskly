/**
 * API Cache & Optimization Utilities
 *
 * Provides caching, deduplication, and batching for API calls
 * to reduce network requests and improve performance.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// In-memory cache storage
const cache = new Map<string, CacheEntry<unknown>>();
const pendingRequests = new Map<string, PendingRequest<unknown>>();

// Default TTL values (in milliseconds)
export const CACHE_TTL = {
  LISTS: 30 * 1000, // 30 seconds for lists
  CATEGORIES: 60 * 1000, // 1 minute for categories
  TODO_DETAILS: 15 * 1000, // 15 seconds for todo details
  USER_PREFS: 5 * 60 * 1000, // 5 minutes for user preferences
};

/**
 * Get cached data if valid
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cached data with TTL
 */
export function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern?: string | RegExp): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Deduplicate concurrent identical requests
 * Multiple calls with the same key will share the same Promise
 */
export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.LISTS
): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Check if there's already a pending request
  const pending = pendingRequests.get(key) as PendingRequest<T> | undefined;
  if (pending) {
    return pending.promise;
  }

  // Create new request
  const promise = fetcher()
    .then((data) => {
      setCache(key, data, ttl);
      pendingRequests.delete(key);
      return data;
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, { promise, timestamp: Date.now() });
  return promise;
}

/**
 * Create a cache key from parameters
 */
export function createCacheKey(
  prefix: string,
  ...params: (string | number | null | undefined)[]
): string {
  return `${prefix}:${params.filter((p) => p !== null && p !== undefined).join(":")}`;
}
