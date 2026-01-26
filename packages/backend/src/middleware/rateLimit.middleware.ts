import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/index.js';
import { redis } from '../config/redis.js';

// Default rate limiter using memory store
export const defaultRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as { user?: { id: string } }).user?.id;
    return userId ?? req.ip ?? 'unknown';
  },
});

// Strict rate limiter for sensitive endpoints (auth, payment)
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    error: 'Too many attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limiter for login attempts
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: {
    success: false,
    error: 'Too many login attempts, please try again in 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Password reset rate limiter
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    error: 'Too many password reset requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API key based rate limiter (for external API access)
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'API rate limit exceeded',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.headers['x-api-key'] as string ?? req.ip ?? 'unknown';
  },
});

// Redis-based rate limiter for distributed systems
export async function redisRateLimiter(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / (windowSeconds * 1000))}`;

  const current = await redis.incr(windowKey);

  if (current === 1) {
    await redis.expire(windowKey, windowSeconds);
  }

  const ttl = await redis.ttl(windowKey);
  const resetTime = now + ttl * 1000;

  return {
    allowed: current <= maxRequests,
    remaining: Math.max(0, maxRequests - current),
    resetTime,
  };
}

// Middleware factory for Redis-based rate limiting
export function createRedisRateLimiter(
  maxRequests: number,
  windowSeconds: number,
  keyPrefix: string = 'api'
) {
  return async (req: Request, res: Response, next: Function) => {
    const userId = (req as { user?: { id: string } }).user?.id;
    const key = `${keyPrefix}:${userId ?? req.ip ?? 'unknown'}`;

    try {
      const result = await redisRateLimiter(key, maxRequests, windowSeconds);

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later',
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request but log the error
      console.error('Redis rate limit error:', error);
      next();
    }
  };
}
