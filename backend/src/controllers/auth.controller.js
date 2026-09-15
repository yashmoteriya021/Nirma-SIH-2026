import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.js';
import { createAndSendOTP, verifyOTP } from '../services/otp.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Generate a JWT for a user.
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

/**
 * POST /api/auth/send-otp
 * Sends a 6-digit OTP to the given mobile number.
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { identifier, type } = req.body;

  const result = await createAndSendOTP(identifier, type);

  return successResponse(res, result, 'OTP sent successfully');
});

/**
 * POST /api/auth/verify-otp
 * Verifies the OTP and returns a JWT.
 * Creates the user if they don't exist yet (first-time OTP login).
 */
export const verifyOtpHandler = asyncHandler(async (req, res) => {
  const { identifier, otp_code } = req.body;

  const isValid = await verifyOTP(identifier, otp_code);
  if (!isValid) {
    return errorResponse(res, 'INVALID_OTP', 'Invalid or expired OTP. Please request a new one.', 401);
  }

  return successResponse(res, { verified: true }, 'OTP verified successfully');
});

/**
 * POST /api/auth/register
 * Registers a new user with full details.
 */
export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, mobile, email, password } = req.body;

  if (!req.file) {
    return errorResponse(res, 'MISSING_FILE', 'SC Caste Certificate is required.', 400);
  }

  const certificate_url = `/uploads/certificates/${req.file.filename}`;

  // Check if mobile number already exists
  const existingUser = await User.findOne({ mobile_number: mobile });
  if (existingUser) {
    return errorResponse(res, 'USER_EXISTS', 'A user with this mobile number already exists.', 409);
  }

  // Check if email already exists
  if (email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return errorResponse(res, 'EMAIL_EXISTS', 'A user with this email already exists.', 409);
    }
  }

  const user = await User.create({
    first_name: firstName,
    last_name: lastName,
    mobile_number: mobile,
    email: email,
    password_hash: password,
    certificate_url,
    is_email_verified: true,
    is_verified: true,
  });

  const token = generateToken(user._id);

  return successResponse(res, {
    token,
    user: user.toSafeObject(),
  }, 'Registration successful', 201);
});

/**
 * POST /api/auth/login
 * Secondary login flow using email + password.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  }

  if (!user.password_hash) {
    return errorResponse(res, 'NO_PASSWORD', 'This account was created via OTP. Please log in with your mobile number or set a password first.', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return errorResponse(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  }

  const token = generateToken(user._id);

  return successResponse(res, {
    token,
    user: user.toSafeObject(),
  }, 'Login successful');
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user's profile.
 */
export const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, { user: req.user }, 'User profile retrieved');
});
