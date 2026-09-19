/**
 * Single place for talking to the SchemeSetu backend.
 *
 * In development the Vite proxy forwards `/api/*` to the backend (see
 * vite.config.js), so the base URL is empty. Set VITE_API_URL to point at a
 * remote backend in production builds.
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * fetch() wrapper that speaks the backend envelope
 * `{ success, data, message }` / `{ success:false, error:{ code, message } }`.
 * Resolves with `data` on success and throws ApiError otherwise.
 */
export async function apiFetch(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Is the backend running?', { status: 0, code: 'NETWORK' });
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || payload?.success === false) {
    const err = payload?.error || {};
    throw new ApiError(err.message || payload?.message || `Request failed (${res.status})`, {
      status: res.status,
      code: err.code || 'HTTP_ERROR',
    });
  }
  return payload?.data ?? payload;
}

/** Whether an error means the ML/AI service specifically is down. */
export const isServiceDown = (err) =>
  err instanceof ApiError && (err.code === 'ML_SERVICE_UNAVAILABLE' || err.code === 'NETWORK');

// ─── AI pipeline endpoints (proxied to the Python ML service) ───────────────
export const ai = {
  health: () => apiFetch('/api/ai/health'),
  schemes: () => apiFetch('/api/ai/schemes'),
  profile: (body) => apiFetch('/api/ai/profile', { method: 'POST', body }),
  intent: (body) => apiFetch('/api/ai/intent', { method: 'POST', body }),
  match: (profile, intent) => apiFetch('/api/ai/match', { method: 'POST', body: { profile, intent } }),
  partners: (body) => apiFetch('/api/ai/partners', { method: 'POST', body }),
  /**
   * Unified chat call — one round-trip per message.
   * Returns { stage, follow_up_question?, match_result?, intent, session_id }
   * where stage ∈ 'follow_up' | 'confirm' | 'matched' | 'no_match'.
   */
  chat: (body) => apiFetch('/api/ai/chat', { method: 'POST', body }),
  tts: (body) => apiFetch('/api/ai/speech/tts', { method: 'POST', body }),
};

// ─── Financial calculator ────────────────────────────────────────────────
export const calculator = {
  emi: (body) => apiFetch('/api/calculator/emi', { method: 'POST', body }),
};
