import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter — 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
});

/**
 * OTP rate limiter — max 3 OTP requests per hour per IP.
 * Prevents OTP abuse / SMS cost inflation.
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'OTP_RATE_LIMIT',
      message: 'Too many OTP requests. Please try again after an hour.',
    },
  },
});

/**
 * Auth rate limiter — max 10 login attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many login attempts. Please try again later.',
    },
  },
});
