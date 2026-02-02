import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config/index.js';

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
