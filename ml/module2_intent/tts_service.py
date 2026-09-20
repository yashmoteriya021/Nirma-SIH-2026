"""
Text-to-speech for the chat assistant (Module 2 output → spoken audio).

Uses edge-tts (wraps Microsoft Edge's neural read-aloud voices). Chosen
because it's free with no API key, no billing account, and no rate-limit
sign-up — unlike Google/Azure/AWS TTS, which all require a billing-enabled
cloud account even on their free tiers. Quality is comparable (same class of
neural voice), and hi-IN coverage is solid, which matters for a bilingual
rural-facing product built for a hackathon demo.

Degrades silently (returns None) if synthesis fails for any reason (offline,
voice list changed, etc.), so a network hiccup never breaks the chat flow —
text still works, audio is just omitted. Never raises past this module.
"""

import asyncio
import base64
import logging

logger = logging.getLogger(__name__)

# edge-tts neural voices. "Neural" quality, free, no key.
_VOICE_BY_LANGUAGE = {
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}


def is_available() -> bool:
    """edge-tts needs no credentials — it's available whenever the package
    is importable and the host has network access to speak."""
    try:
        import edge_tts  # noqa: F401

        return True
    except ImportError:
        return False


async def _synthesize_async(text: str, voice: str) -> bytes:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice)
    audio = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)


def synthesize(text: str, language: str = "en") -> str | None:
    """
    Synthesize `text` to speech.

    Returns base64-encoded MP3 audio, or None if TTS isn't available/fails
    (caller should treat this as "no audio", not an error).
    """
    if not text or not text.strip():
        return None

    voice = _VOICE_BY_LANGUAGE.get(language, _VOICE_BY_LANGUAGE["en"])

    try:
        audio_bytes = asyncio.run(_synthesize_async(text, voice))
    except Exception as e:
        logger.warning("TTS synthesis failed: %s", e)
        return None

    if not audio_bytes:
        return None

    return base64.b64encode(audio_bytes).decode("ascii")
