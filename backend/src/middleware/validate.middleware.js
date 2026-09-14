import { validationResult, body, param, query } from 'express-validator';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware that checks for validation errors from express-validator.
 * Returns a 422 with all error messages if validation fails.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return errorResponse(res, 'VALIDATION_ERROR', messages.join('; '), 422);
  }
  next();
};

// ─── Reusable Validation Chains ───────────────────────────────

export const sendOtpValidation = [
  body('mobile_number')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid mobile number format'),
  validate,
];

export const verifyOtpValidation = [
  body('mobile_number')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid mobile number format'),
  body('otp_code')
    .trim()
    .notEmpty().withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  validate,
];

export const registerValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('mobile_number')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid mobile number format'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

export const emiValidation = [
  body('principal')
    .isFloat({ min: 1 }).withMessage('Principal must be a positive number'),
  body('annual_rate_pct')
    .isFloat({ min: 0 }).withMessage('Annual rate must be non-negative'),
  body('tenure_years')
    .isFloat({ min: 0.5 }).withMessage('Tenure must be at least 0.5 years'),
  body('moratorium_months')
    .optional()
    .isInt({ min: 0 }).withMessage('Moratorium months must be a non-negative integer'),
  validate,
];

export const recommendValidation = [
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isIn(['business', 'education']).withMessage('Category must be "business" or "education"'),
  body('project_cost')
    .isFloat({ min: 0 }).withMessage('Project cost must be non-negative'),
  body('annual_income')
    .isFloat({ min: 0 }).withMessage('Annual income must be non-negative'),
  validate,
];

export const nearbyPartnersValidation = [
  query('lat')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  query('radius_km')
    .optional()
    .isFloat({ min: 0.1, max: 500 }).withMessage('Radius must be between 0.1 and 500 km'),
  query('scheme_id')
    .optional()
    .trim(),
  validate,
];
