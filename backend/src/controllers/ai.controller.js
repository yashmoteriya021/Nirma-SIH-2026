import {
  mlHealth,
  mlSchemes,
  buildManualProfile,
  buildMockDigiLockerProfile,
  intentTurn,
  resetIntentSession,
  matchSchemes,
  rankPartners,
} from '../services/ml.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * /api/ai/* — proxies to the Python ML pipeline (ml/service).
 * Explanations, scores and reasons come straight from the pipeline.
 */

/** GET /api/ai/health */
export const health = asyncHandler(async (req, res) => {
  const data = await mlHealth();
  return successResponse(res, data, 'ML service reachable');
});

/** GET /api/ai/schemes — knowledge base + frontend_id mapping */
export const schemes = asyncHandler(async (req, res) => {
  const data = await mlSchemes();
  return successResponse(res, data, 'Scheme knowledge base');
});

/**
 * POST /api/ai/profile
 * Body: either { auth_code } (mock DigiLocker) or the manual profile fields
 * (full_name, dob, gender, category, domicile_state, annual_family_income,
 *  income_certificate_issue_date, caste_certificate_issue_date?, education_status?, ...).
 */
export const profile = asyncHandler(async (req, res) => {
  const { auth_code, ...manual } = req.body || {};
  const data = auth_code
    ? await buildMockDigiLockerProfile(auth_code)
    : await buildManualProfile(manual);
  return successResponse(res, { profile: data }, 'Profile built');
});

/**
 * POST /api/ai/intent
 * Body: { text, profile, session_id?, language? }
 */
export const intent = asyncHandler(async (req, res) => {
  const { text, profile: userProfile, session_id, language } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return errorResponse(res, 'MISSING_TEXT', 'Field "text" is required.', 400);
  }
  const data = await intentTurn({
    text: text.trim(),
    profile: userProfile || {},
    session_id: session_id || null,
    language: language === 'hi' ? 'hi' : 'en',
  });
  return successResponse(res, data, data.complete ? 'Intent complete' : 'Follow-up needed');
});

/** DELETE /api/ai/intent/:session_id */
export const resetIntent = asyncHandler(async (req, res) => {
  const data = await resetIntentSession(req.params.session_id);
  return successResponse(res, data, 'Session cleared');
});

/**
 * POST /api/ai/match
 * Body: { profile, intent }
 */
export const match = asyncHandler(async (req, res) => {
  const { profile: userProfile, intent: userIntent } = req.body || {};
  if (!userProfile || !userIntent) {
    return errorResponse(res, 'MISSING_FIELDS', 'Both "profile" and "intent" are required.', 400);
  }
  const data = await matchSchemes(userProfile, userIntent);
  return successResponse(res, data, data.status === 'schemes_found' ? 'Schemes matched' : 'No eligible scheme');
});

/**
 * POST /api/ai/partners
 * Body: { scheme_id? | frontend_scheme_id?, lat?, lon?, pin_code?, max_distance_km? }
 */
export const partners = asyncHandler(async (req, res) => {
  const { scheme_id, frontend_scheme_id, lat, lon, lng, pin_code, max_distance_km } = req.body || {};
  const data = await rankPartners({
    scheme_id: scheme_id || null,
    frontend_scheme_id: frontend_scheme_id || null,
    lat: lat ?? null,
    lon: lon ?? lng ?? null,
    pin_code: pin_code ? String(pin_code) : null,
    ...(max_distance_km ? { max_distance_km: Number(max_distance_km) } : {}),
  });
  return successResponse(res, data, data.message || 'Partners ranked');
});
