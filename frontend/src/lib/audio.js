/**
 * Playback helper for the base64 MP3 audio the AI chat endpoints return
 * (see ai.chat / ai.intent / ai.match / ai.tts in lib/api.js). Not always
 * present — the ML service returns null when TTS isn't configured.
 */

const MUTE_KEY = 'schemesetu-tts-muted';

export function isTtsMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setTtsMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ignore — private browsing / storage blocked
  }
}

/**
 * Plays base64-encoded MP3 audio. No-op if muted, empty, or playback fails.
 * `onEnded` fires when playback finishes (used by "vocal mode" to start
 * listening again for the next reply) — also fires immediately if there's
 * nothing to play, so callers can chain unconditionally.
 */
export function playBase64Audio(base64, onEnded) {
  if (!base64 || isTtsMuted()) {
    onEnded?.();
    return null;
  }
  try {
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    if (onEnded) {
      audio.addEventListener('ended', onEnded, { once: true });
      audio.addEventListener('error', onEnded, { once: true });
    }
    audio.play().catch(() => onEnded?.()); // autoplay can be blocked; fail silently
    return audio;
  } catch {
    onEnded?.();
    return null;
  }
}
