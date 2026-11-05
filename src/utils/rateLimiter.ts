/**
 * Comprehensive API & User Action Rate Limiting Middleware
 * Protects against brute-force attacks, DDoS, resource exhaustion, and spamming across sensitive actions.
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  message?: string;
}

export const RATE_LIMIT_PRESETS = {
  // Authentication: Max 5 attempts per 60 seconds
  AUTH_LOGIN: { maxAttempts: 5, windowMs: 60 * 1000, message: 'Too many login attempts. Please wait 1 minute.' },
  // Password Recovery: Max 3 attempts per 60 seconds
  AUTH_RECOVERY: { maxAttempts: 3, windowMs: 60 * 1000, message: 'Too many recovery requests. Please wait 1 minute.' },
  // Book Publishing / Modifying: Max 15 operations per 60 seconds
  BOOK_MUTATION: { maxAttempts: 15, windowMs: 60 * 1000, message: 'Publishing rate limit reached. Please wait a moment.' },
  // Feedback / Reviews / Reports: Max 5 submissions per 60 seconds
  USER_FEEDBACK: { maxAttempts: 5, windowMs: 60 * 1000, message: 'Too many submissions. Please wait 1 minute.' },
  // Direct Messaging: Max 10 messages per 60 seconds
  DIRECT_MESSAGES: { maxAttempts: 10, windowMs: 60 * 1000, message: 'Message rate limit exceeded. Please slow down.' },
  // Backup / Export: Max 3 exports per 5 minutes
  BACKUP_EXPORT: { maxAttempts: 3, windowMs: 5 * 60 * 1000, message: 'Export limit reached. Please wait 5 minutes before retrying.' }
};

interface AttemptRecord {
  timestamps: number[];
}

class ActionRateLimiter {
  private records: Map<string, AttemptRecord> = new Map();

  /**
   * Evaluates if a given action identifier exceeds rate limit limits.
   * Returns isAllowed, remaining attempts, and time until reset in seconds.
   */
  public checkLimit(
    key: string,
    config: RateLimitConfig = RATE_LIMIT_PRESETS.AUTH_LOGIN
  ): { isAllowed: boolean; remaining: number; retryAfterSeconds: number; message: string } {
    const now = Date.now();
    const cleanKey = key.trim().toLowerCase();
    const record = this.records.get(cleanKey) || { timestamps: [] };

    // Evict timestamps outside current window
    const activeTimestamps = record.timestamps.filter((ts) => now - ts < config.windowMs);

    if (activeTimestamps.length >= config.maxAttempts) {
      const oldestActive = activeTimestamps[0];
      const retryAfterMs = config.windowMs - (now - oldestActive);
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

      return {
        isAllowed: false,
        remaining: 0,
        retryAfterSeconds,
        message: config.message || `Rate limit exceeded. Try again in ${retryAfterSeconds}s.`
      };
    }

    // Record this attempt
    activeTimestamps.push(now);
    this.records.set(cleanKey, { timestamps: activeTimestamps });

    const remaining = config.maxAttempts - activeTimestamps.length;
    return {
      isAllowed: true,
      remaining,
      retryAfterSeconds: 0,
      message: 'OK'
    };
  }

  /**
   * Resets rate limit tracker for a key (e.g. after successful login)
   */
  public reset(key: string): void {
    this.records.delete(key.trim().toLowerCase());
  }

  /**
   * Cleans up stale records to prevent memory leak
   */
  public cleanup(maxAgeMs: number = 10 * 60 * 1000): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      const valid = record.timestamps.filter((ts) => now - ts < maxAgeMs);
      if (valid.length === 0) {
        this.records.delete(key);
      } else {
        this.records.set(key, { timestamps: valid });
      }
    }
  }
}

export const rateLimiter = new ActionRateLimiter();

// Automated periodic cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimiter.cleanup();
  }, 5 * 60 * 1000);
}
