import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRateLimiter } from '@/lib/security/rate-limit';

describe('InMemoryRateLimiter Unit Tests', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    // Limit to 5 requests per 1 second for testing speed
    limiter = new InMemoryRateLimiter(1000, 5);
  });

  it('should allow requests under the maximum limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('ip-address-1');
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(i + 1);
      expect(result.retryAfter).toBe(0);
    }
  });

  it('should reject requests exceeding the maximum limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('ip-address-2');
    }

    const result = limiter.check('ip-address-2');
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(5);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should separate limits for different keys/IPs', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('ip-address-a');
    }

    expect(limiter.check('ip-address-a').allowed).toBe(false);
    expect(limiter.check('ip-address-b').allowed).toBe(true);
  });

  it('should allow requests again after sliding window duration expires', async () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('ip-address-expire');
    }
    expect(limiter.check('ip-address-expire').allowed).toBe(false);

    // Wait for window duration (1 second + small buffer)
    await new Promise((resolve) => setTimeout(resolve, 1050));

    expect(limiter.check('ip-address-expire').allowed).toBe(true);
  });
});
