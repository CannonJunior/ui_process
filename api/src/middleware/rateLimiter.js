/**
 * Rate Limiting Middleware
 * Prevents API abuse with configurable rate limits
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';

// Default rate limiter configuration
const rateLimiter = new RateLimiterMemory({
    keyResolver: (req) => {
        // Use IP address as key, but prefer user ID if authenticated
        return req.user?.id || req.ip || req.connection.remoteAddress;
    },
    points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
    duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 900, // Per 15 minutes (900 seconds)
    blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Stricter limits for authentication endpoints
const authRateLimiter = new RateLimiterMemory({
    keyResolver: (req) => req.ip || req.connection.remoteAddress,
    points: 5, // 5 attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
});

// More generous limits for search endpoints
const searchRateLimiter = new RateLimiterMemory({
    keyResolver: (req) => req.user?.id || req.ip || req.connection.remoteAddress,
    points: 200, // 200 searches
    duration: 900, // Per 15 minutes
    blockDuration: 60, // Block for 1 minute
});

export const rateLimiterMiddleware = async (req, res, next) => {
    try {
        await rateLimiter.consume(req);
        next();
    } catch (rateLimiterRes) {
        // Rate limit exceeded
        const remainingPoints = rateLimiterRes.remainingPoints || 0;
        const msBeforeNext = rateLimiterRes.msBeforeNext || 0;
        
        res.status(429).json({
            error: 'TooManyRequests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil(msBeforeNext / 1000),
            limit: rateLimiter.points,
            remaining: remainingPoints,
            resetTime: new Date(Date.now() + msBeforeNext).toISOString()
        });
    }
};

export const authRateLimiterMiddleware = async (req, res, next) => {
    try {
        await authRateLimiter.consume(req);
        next();
    } catch (rateLimiterRes) {
        const msBeforeNext = rateLimiterRes.msBeforeNext || 0;
        
        res.status(429).json({
            error: 'TooManyAuthAttempts',
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: Math.ceil(msBeforeNext / 1000)
        });
    }
};

export const searchRateLimiterMiddleware = async (req, res, next) => {
    try {
        await searchRateLimiter.consume(req);
        next();
    } catch (rateLimiterRes) {
        const remainingPoints = rateLimiterRes.remainingPoints || 0;
        const msBeforeNext = rateLimiterRes.msBeforeNext || 0;
        
        res.status(429).json({
            error: 'SearchRateLimitExceeded',
            message: 'Search rate limit exceeded',
            retryAfter: Math.ceil(msBeforeNext / 1000),
            limit: searchRateLimiter.points,
            remaining: remainingPoints,
            resetTime: new Date(Date.now() + msBeforeNext).toISOString()
        });
    }
};

// Export default rate limiter
export { rateLimiterMiddleware as rateLimiter };