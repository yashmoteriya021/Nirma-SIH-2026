import {
  mlHealth,
  mlSchemes,
  buildManualProfile,
  buildMockDigiLockerProfile,
  intentTurn,
  resetIntentSession,
  matchSchemes,
  rankPartners,
  chatSession,
  synthesizeSpeech,
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

/**
 * POST /api/ai/chat
 * Body: { text, profile, session_id?, language?, auto_match? }
 *
 * Unified single round-trip:
 *   - runs Module 2 intent slot-filling
 *   - auto-runs Module 3 when intent is complete (unless auto_match=false)
 * Returns { stage, follow_up_question | match_result, intent, ... }
 */
export const chat = asyncHandler(async (req, res) => {
  const { text, profile: userProfile, session_id, language, auto_match } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return errorResponse(res, 'MISSING_TEXT', 'Field "text" is required.', 400);
  }
  if (!userProfile || typeof userProfile !== 'object') {
    return errorResponse(res, 'MISSING_PROFILE', 'Field "profile" (citizen profile object) is required.', 400);
  }
  const data = await chatSession({
    text: text.trim(),
    profile: userProfile,
    session_id: session_id || null,
    language: language === 'hi' ? 'hi' : 'en',
    auto_match: auto_match !== false,   // default true
  });
  const msg = data.stage === 'matched'
    ? `${data.match_result?.total_eligible ?? 0} scheme(s) matched`
    : data.stage === 'no_match'
    ? 'No eligible scheme found'
    : data.follow_up_question || 'Follow-up needed';
  return successResponse(res, data, msg);
});

/**
 * POST /api/ai/speech/tts
 * Body: { text, language? }
 * Returns { audio_base64, available } — audio_base64 is null if the ML
 * service has no TTS provider configured (never an error).
 */
export const tts = asyncHandler(async (req, res) => {
  const { text, language } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return errorResponse(res, 'MISSING_TEXT', 'Field "text" is required.', 400);
  }
  const data = await synthesizeSpeech({
    text: text.trim(),
    language: language === 'hi' ? 'hi' : 'en',
  });
  return successResponse(res, data, data.available ? 'Audio synthesized' : 'TTS not configured');
});
