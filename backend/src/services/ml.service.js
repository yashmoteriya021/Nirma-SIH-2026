import config from '../config/env.js';
import { ApiError } from '../utils/apiResponse.js';

/**
 * Thin HTTP client for the Python ML service (ml/service/app.py).
 *
 * Every helper returns the ML service's JSON body as-is so the frontend
 * receives the same explanation objects the pipeline produces. Failures are
 * normalised into ApiError so the global error middleware renders the
 * standard envelope:
 *   - ML service unreachable / timed out  → 503 ML_SERVICE_UNAVAILABLE
 *   - ML service rejected the input       → its status, ML_VALIDATION_ERROR
 */
const request = async (method, path, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.mlServiceTimeoutMs);

  let response;
  try {
    response = await fetch(`${config.mlServiceUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timed out' : err.message;
    throw new ApiError(
      `ML service unavailable (${reason}). Start it with: cd ml && uvicorn service.app:app --port 8000`,
      503,
      'ML_SERVICE_UNAVAILABLE',
    );
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // FastAPI puts our {errors:[...]} under `detail`; pydantic 422s put a list there.
    const detail = payload?.detail;
    let message = 'ML service rejected the request';
    if (Array.isArray(detail?.errors)) message = detail.errors.join('; ');
    else if (Array.isArray(detail)) message = detail.map(d => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join('; ');
    else if (typeof detail === 'string') message = detail;
    throw new ApiError(message, response.status === 422 ? 400 : response.status, 'ML_VALIDATION_ERROR');
  }

  return payload;
};

export const mlHealth = () => request('GET', '/health');
export const mlSchemes = () => request('GET', '/schemes');
export const buildManualProfile = (profile) => request('POST', '/profile/manual', profile);
export const buildMockDigiLockerProfile = (authCode) => request('POST', '/profile/mock-digilocker', { auth_code: authCode });
export const intentTurn = (body) => request('POST', '/intent/turn', body);
export const resetIntentSession = (sessionId) => request('DELETE', `/intent/session/${encodeURIComponent(sessionId)}`);
export const matchSchemes = (profile, intent) => request('POST', '/match', { profile, intent });
export const rankPartners = (body) => request('POST', '/partners/rank', body);
/**
 * Unified chat call — one round-trip that returns either a follow-up question
 * or a full scheme recommendation (stage: 'follow_up' | 'confirm' | 'matched' | 'no_match').
 */
export const chatSession = (body) => request('POST', '/chat', body);
export const synthesizeSpeech = (body) => request('POST', '/speech/tts', body);
