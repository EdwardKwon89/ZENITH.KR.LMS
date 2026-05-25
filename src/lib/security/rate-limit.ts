export interface RateLimitResult {
  allowed: boolean;
  current: number;
  retryAfter: number; // seconds
}

export class InMemoryRateLimiter {
  private store = new Map<string, number[]>();
  private lastCleanup = Date.now();
  private cleanupIntervalMs = 60000; // Cleanup expired keys every 1 minute

  constructor(
    private windowSizeMs: number = 60000, // Default 1 minute
    private maxRequests: number = 100      // Default 100 requests
  ) {}

  public check(key: string): RateLimitResult {
    const now = Date.now();

    // Trigger periodically cleanup
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup();
    }

    let timestamps = this.store.get(key) || [];

    // Filter out timestamps outside the sliding window
    const windowStart = now - this.windowSizeMs;
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= this.maxRequests) {
      // Calculate how long to wait until the oldest request falls out of the window
      const oldest = timestamps[0];
      const retryAfterMs = oldest + this.windowSizeMs - now;
      const retryAfter = Math.ceil(retryAfterMs / 1000);

      this.store.set(key, timestamps); // Save updated window timestamps
      return {
        allowed: false,
        current: timestamps.length,
        retryAfter: retryAfter > 0 ? retryAfter : 1,
      };
    }

    timestamps.push(now);
    this.store.set(key, timestamps);

    return {
      allowed: true,
      current: timestamps.length,
      retryAfter: 0,
    };
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    for (const [key, timestamps] of this.store.entries()) {
      const active = timestamps.filter((ts) => ts > windowStart);
      if (active.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, active);
      }
    }
    this.lastCleanup = now;
  }

  // Helper method for testing/resetting state
  public reset(key?: string) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

// Singleton global rate limiter for general API & Actions (100 req/min)
export const globalRateLimiter = new InMemoryRateLimiter(60000, 100);
