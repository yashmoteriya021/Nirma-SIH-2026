import { Router } from 'express';

const router = Router();

// In-memory OTP store (demo only — use Redis/DB in production)
const otpStore = new Map();

/**
 * POST /api/auth/send-otp
 * Body: { phone: "9876543210" }
 * Generates a random 6-digit OTP (demo: always 123456)
 */
router.post('/send-otp', (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.length < 10) {
      const error = new Error('A valid 10-digit mobile number is required.');
      error.status = 400;
      throw error;
    }

    // In production, integrate with SMS gateway (e.g., Twilio, MSG91)
    // For demo, OTP is always 123456
    const otp = '123456';
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    console.log(`[AUTH] OTP sent to +91-${phone}: ${otp} (demo)`);

    res.json({
      success: true,
      message: 'OTP sent successfully.',
      // NEVER send OTP in response in production
      ...(process.env.NODE_ENV === 'development' && { debug_otp: otp }),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { phone: "9876543210", otp: "123456" }
 */
router.post('/verify-otp', (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      const error = new Error('Phone and OTP are required.');
      error.status = 400;
      throw error;
    }

    const stored = otpStore.get(phone);

    if (!stored) {
      const error = new Error('No OTP was sent to this number. Please request a new OTP.');
      error.status = 400;
      throw error;
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      const error = new Error('OTP has expired. Please request a new OTP.');
      error.status = 400;
      throw error;
    }

    if (stored.otp !== otp) {
      const error = new Error("That OTP didn't match. Please try again.");
      error.status = 400;
      throw error;
    }

    // OTP valid — clean up
    otpStore.delete(phone);

    // In production, generate a JWT here
    res.json({
      success: true,
      message: 'Verified successfully.',
      data: {
        token: 'demo_jwt_token_' + Date.now(),
        user: { phone: `+91-${phone}` },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Body: { email: "user@example.com", password: "..." }
 * Demo: accepts any email/password combo
 */
router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.status = 400;
      throw error;
    }

    // In production, verify against database
    // For demo, accept any valid-looking credentials
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token: 'demo_jwt_token_' + Date.now(),
        user: { email },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
