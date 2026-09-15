import { Router } from 'express';
import { sendOtp, verifyOtpHandler, register, login, getMe } from '../controllers/auth.controller.js';
import { sendOtpValidation, verifyOtpValidation, registerValidation, loginValidation } from '../middleware/validate.middleware.js';
import { otpLimiter, authLimiter } from '../middleware/rateLimiter.middleware.js';
import authMiddleware from '../middleware/auth.middleware.js';
import upload from '../config/multer.js';

const router = Router();

// OTP-based auth (primary flow)
router.post('/send-otp', otpLimiter, sendOtpValidation, sendOtp);
router.post('/verify-otp', otpLimiter, verifyOtpValidation, verifyOtpHandler);

// Registration
router.post('/register', upload.single('certificate'), registerValidation, register);

// Email/password login (secondary flow)
router.post('/login', authLimiter, loginValidation, login);

// Protected: current user profile
router.get('/me', authMiddleware, getMe);

export default router;
