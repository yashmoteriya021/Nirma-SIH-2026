"""
Module 2: LLM-Based Intent Extractor

Uses an OpenAI-compatible API to extract structured intent slots from
freeform text (including code-mixed Hindi/English).

The LLM is constrained to return structured JSON only — it never generates
scheme recommendations (that's Module 3's job).

Provider-agnostic. Configure via environment (or an `LLMConfig`):

    LLM_PROVIDER = openai | openrouter | anthropic | ollama | none   (default: auto)
    LLM_API_KEY  = key for the chosen provider
    LLM_BASE_URL = override endpoint (OpenAI-compatible providers only)
    LLM_MODEL    = model name

"auto" picks openrouter/openai/anthropic if their conventional key env var
(OPENROUTER_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY) is set, else none.
With no provider available every call falls back to the offline extractor.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any


# The prompt template for structured extraction
EXTRACTION_PROMPT = """You are an intent extraction assistant for an Indian government loan scheme matching system.

Your ONLY job is to extract structured information from the user's message. You must NOT recommend any scheme or give financial advice.

The user may write in Hindi, English, or a mix of both (Hinglish/code-mixed). Extract the following slots:

1. **purpose**: One of: business_start, business_expansion, education, scholarship, skilling, housing, healthcare, vehicle_livelihood, agriculture_allied, sanitation_equipment, other
2. **project_type**: Specific description (e.g., "tailoring shop", "BTech Computer Science", "PM DAKSH training")
3. **estimated_cost**: Numeric amount in INR. If user says "1.5 lakh", convert to 150000. If they are looking for a scholarship or skilling program without stating an amount, set to null.
4. **cost_confidence**: "high" if user stated exact figure, "medium" if approximate/range, "low" if you're guessing
5. **beneficiary**: "self" if for themselves, "dependent" if for son/daughter/spouse
6. **loan_type_guess**: "micro_finance" (small ≤₹1.4L), "term_loan" (₹1.4L-₹50L), "education_loan", "grant", or "unknown"
7. **urgency**: "immediate", "within_3_months", or "flexible"
8. **student_education_status**: Only for education/scholarship purpose — the STUDENT's highest completed level: one of below_8th, 8th_pass, 10th_pass, 12th_pass, graduate, post_graduate, professional. null if not stated.

Respond ONLY with valid JSON matching this exact structure:
{
  "purpose": "...",
  "project_type": "...",
  "estimated_cost": <number or null>,
  "cost_confidence": "high|medium|low",
  "beneficiary": "self|dependent",
  "loan_type_guess": "micro_finance|term_loan|education_loan|unknown",
  "urgency": "immediate|within_3_months|flexible",
  "student_education_status": "below_8th|8th_pass|10th_pass|12th_pass|graduate|post_graduate|professional|null"
}

User's message: """


# Contextual follow-up prompt — generates warm, natural, situational questions
_FOLLOWUP_PROMPT = """\
You are Setu, a warm and helpful AI assistant from India that helps citizens find government welfare schemes, loans, scholarships, and skilling programs.

The user is applying for a government scheme. You are gathering information through a natural conversation.

USER SAID: "{user_text}"

WHAT YOU ALREADY KNOW:
{known_summary}

WHAT YOU STILL NEED (ask about the FIRST item only):
{missing_summary}

INSTRUCTIONS:
- If the user said something off-topic (greeting, question about you, unrelated topic), briefly and warmly acknowledge it in 1 sentence, then ask the needed question.
- Generate ONE short, friendly, natural question or response (1-3 sentences max).
- Match the user's language: if they wrote in Hindi/Hinglish, reply in Hindi/Hinglish. If English, reply in English.
- Use "aap" (आप) for Hindi, be warm and encouraging.
- Reference what they already told you when relevant (e.g., "Great! Since you want to start a tailoring shop, how much money do you think you'll need?")
- NEVER use technical jargon (no "slots", "JSON", "schema", "data").
- NEVER mention scheme names or give financial advice.
- Return ONLY the response text. No quotes, no labels, no explanation.
"""

_MISSING_LABELS = {
    "purpose": "what the scheme is for (business loan, scholarship, skilling, housing, etc.)",
    "estimated_cost": "how much money they need (approximate amount in rupees). Only push for this if it's a loan.",
    "beneficiary": "whether the scheme is for themselves or a dependent (son/daughter)",
    "project_type": "what specific type of business, course, or project they plan",
    "urgency": "how soon they need the funds",
    "student_education_status": "the student's highest completed education level",
}

_KNOWN_LABELS = {
    "purpose": lambda v: f"loan purpose: {v.replace('_', ' ')}",
    "project_type": lambda v: f"project type: {v}",
    "estimated_cost": lambda v: f"estimated cost: ₹{v:,.0f}",
    "beneficiary": lambda v: f"for: {'themselves' if v == 'self' else 'a dependent'}",
    "urgency": lambda v: f"urgency: {v.replace('_', ' ')}",
    "student_education_status": lambda v: f"student education: {v.replace('_', ' ')}",
}


def generate_contextual_followup(
    user_text: str,
    current_intent: dict,
    missing_slots: list[str],
    language: str = "en",
    config: "LLMConfig | None" = None,
    fallback: str = "Could you provide more details?",
) -> str:
    """
    Use the LLM to generate a warm, contextual follow-up question.
    Falls back to `fallback` if the LLM is not configured or fails.
    """
    cfg = config or LLMConfig.from_env()
    if not cfg.enabled or not missing_slots:
        return fallback

    # Build known summary
    known_parts = []
    for key, fmt in _KNOWN_LABELS.items():
        val = current_intent.get(key)
        if val is not None and val not in ("unknown", "other"):
            try:
                known_parts.append(fmt(val))
            except Exception:
                pass
    known_summary = ", ".join(known_parts) if known_parts else "nothing yet"

    # Only ask about the first missing slot
    first_missing = missing_slots[0]
    missing_summary = _MISSING_LABELS.get(first_missing, first_missing.replace("_", " "))

    prompt = _FOLLOWUP_PROMPT.format(
        user_text=user_text,
        known_summary=known_summary,
        missing_summary=missing_summary,
    )

    try:
        if cfg.provider == "anthropic":
            raw = _call_anthropic(cfg, "You are Setu, a helpful loan scheme assistant.", prompt)
        else:
            raw = _call_openai_compatible_text(
                cfg,
                "You are Setu, a helpful and warm loan scheme assistant. Reply only with the follow-up question or response, no extra text.",
                prompt,
            )
        result = raw.strip().strip('"').strip("'")
        # Some models wrap plain text in JSON — unwrap it
        if result.startswith("{"):
            import json as _json
            try:
                obj = _json.loads(result)
                # Look for the text under common keys
                result = (
                    obj.get("response")
                    or obj.get("message")
                    or obj.get("text")
                    or obj.get("question")
                    or obj.get("answer")
                    or result
                )
            except Exception:
                pass
        # Strip markdown code fences if present
        if result.startswith("```"):
            result = result.strip("`").lstrip("json").lstrip("text").strip()
        return str(result).strip() if result else fallback
    except Exception:
        return fallback


def generate_contextual_confirmation(
    intent: dict[str, Any],
    language: str,
    config: LLMConfig,
    fallback: str,
) -> str:
    """
    Generate a natural, conversational confirmation summary for the user's intent.
    Returns plain text in the requested language (or Hinglish if appropriate).
    """
    if not config.enabled:
        return fallback

    # Format what we know
    cost = f"₹{intent.get('estimated_cost'):,.0f}" if intent.get("estimated_cost") else "an amount"
    project = intent.get("project_type") or intent.get("purpose", "a project")
    beneficiary = "yourself" if intent.get("beneficiary") == "self" else "your dependent"

    lang_instruction = (
        "Respond in Hindi (using Roman/English script - Hinglish)"
        if language == "hi"
        else "Respond in English"
    )

    prompt = f"""
{lang_instruction}.
You are Setu, a helpful loan scheme assistant.
The user has finished telling you what they want. Summarize it naturally to confirm they are ready to find matching schemes.

Details gathered:
- Project/Purpose: {project}
- Estimated Cost: {cost}
- For: {beneficiary}

Write a 1-sentence confirmation asking if this is correct. Keep it very conversational and warm.
Example (English): So you're looking for {cost} to start {project}, is that correct?
Example (Hinglish): Toh aapko apne {project} ke liye {cost} chahiye, sahi hai na?

Do not wrap your response in quotes.
"""
    try:
        if config.provider == "anthropic":
            raw = _call_anthropic(config, "You are Setu.", prompt)
        else:
            raw = _call_openai_compatible_text(
                config,
                "You are Setu, a helpful and warm loan scheme assistant. Reply only with the confirmation text.",
                prompt,
            )
        result = raw.strip().strip('"').strip("'")
        # Strip JSON wrappers just in case
        if result.startswith("{"):
            import json as _json
            try:
                obj = _json.loads(result)
                result = (
                    obj.get("response")
                    or obj.get("message")
                    or obj.get("text")
                    or obj.get("confirmation")
                    or result
                )
            except Exception:
                pass
        return str(result).strip() if result else fallback
    except Exception:
        return fallback



# Valid enum values for validation
VALID_PURPOSES = {
    "business_start", "business_expansion", "education", "scholarship", 
    "skilling", "housing", "healthcare",
    "vehicle_livelihood", "agriculture_allied", "sanitation_equipment", "other",
}
VALID_CONFIDENCES = {"high", "medium", "low"}
VALID_BENEFICIARIES = {"self", "dependent"}
VALID_LOAN_TYPES = {"micro_finance", "term_loan", "education_loan", "grant", "unknown"}
VALID_URGENCIES = {"immediate", "within_3_months", "flexible"}
VALID_EDUCATION = {
    "below_8th", "8th_pass", "10th_pass", "12th_pass",
    "graduate", "post_graduate", "professional",
}


def _validate_llm_output(data: dict) -> dict:
    """
    Validate and sanitize LLM output to match our schema.
    Fills in defaults for missing/invalid fields.
    """
    validated = {}

    # Purpose
    purpose = data.get("purpose", "other")
    validated["purpose"] = purpose if purpose in VALID_PURPOSES else "other"

    # Project type
    validated["project_type"] = data.get("project_type")

    # Estimated cost
    cost = data.get("estimated_cost")
    if cost is not None:
        try:
            cost = float(cost)
            if cost < 0:
                cost = None
        except (ValueError, TypeError):
            cost = None
    validated["estimated_cost"] = cost

    # Cost confidence
    conf = data.get("cost_confidence", "low")
    validated["cost_confidence"] = conf if conf in VALID_CONFIDENCES else "low"

    # Beneficiary
    ben = data.get("beneficiary", "self")
    validated["beneficiary"] = ben if ben in VALID_BENEFICIARIES else "self"

    # Loan type guess
    lt = data.get("loan_type_guess", "unknown")
    validated["loan_type_guess"] = lt if lt in VALID_LOAN_TYPES else "unknown"

    # Urgency
    urg = data.get("urgency", "flexible")
    validated["urgency"] = urg if urg in VALID_URGENCIES else "flexible"

    # Student education (optional)
    edu = data.get("student_education_status")
    validated["student_education_status"] = edu if edu in VALID_EDUCATION else None

    return validated


# ---------------------------------------------------------------------------
# Provider configuration
# ---------------------------------------------------------------------------

OPENAI_COMPATIBLE = {"openai", "openrouter", "ollama"}
SUPPORTED_PROVIDERS = OPENAI_COMPATIBLE | {"anthropic", "none"}

_DEFAULT_BASE_URLS = {
    "openrouter": "https://openrouter.ai/api/v1",
    "ollama": "http://localhost:11434/v1",
}
_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "openrouter": "openai/gpt-4o-mini",
    "ollama": "llama3.1",
    "anthropic": "claude-sonnet-5",
}
_KEY_ENV_VARS = {
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


@dataclass
class LLMConfig:
    provider: str = "none"
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None

    @property
    def enabled(self) -> bool:
        if self.provider == "none":
            return False
        if self.provider == "ollama":
            return True  # local, no key needed
        return bool(self.api_key)

    @classmethod
    def from_env(cls) -> "LLMConfig":
        provider = os.environ.get("LLM_PROVIDER", "auto").strip().lower()
        api_key = os.environ.get("LLM_API_KEY") or None
        base_url = os.environ.get("LLM_BASE_URL") or None
        model = os.environ.get("LLM_MODEL") or None

        if provider == "auto":
            provider = "none"
            for candidate in ("openrouter", "openai", "anthropic"):
                if os.environ.get(_KEY_ENV_VARS[candidate]):
                    provider = candidate
                    break

        if provider not in SUPPORTED_PROVIDERS:
            provider = "none"

        if api_key is None and provider in _KEY_ENV_VARS:
            api_key = os.environ.get(_KEY_ENV_VARS[provider]) or None

        return cls(
            provider=provider,
            api_key=api_key,
            base_url=base_url or _DEFAULT_BASE_URLS.get(provider),
            model=model or _DEFAULT_MODELS.get(provider),
        )


def _profile_context(profile: dict | None) -> str:
    if not profile:
        return ""
    return (
        " The applicant's verified profile (do not ask for these again): "
        f"category={profile.get('category')}, "
        f"annual_family_income=₹{profile.get('annual_family_income', 'unknown')}, "
        f"gender={profile.get('gender')}, "
        f"domicile_state={profile.get('domicile_state')}, "
        f"education_status={profile.get('education_status')}."
    )


def _call_openai_compatible(cfg: LLMConfig, system: str, user: str) -> str:
    from openai import OpenAI

    kwargs: dict[str, Any] = {"api_key": cfg.api_key or "ollama"}
    if cfg.base_url:
        kwargs["base_url"] = cfg.base_url
    client = OpenAI(**kwargs)

    response = client.chat.completions.create(
        model=cfg.model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
        max_tokens=500,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content or ""


def _call_openai_compatible_text(cfg: LLMConfig, system: str, user: str) -> str:
    """Plain-text variant — does NOT force json_object response format."""
    from openai import OpenAI

    kwargs: dict[str, Any] = {"api_key": cfg.api_key or "ollama"}
    if cfg.base_url:
        kwargs["base_url"] = cfg.base_url
    client = OpenAI(**kwargs)

    response = client.chat.completions.create(
        model=cfg.model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.7,   # slightly more expressive for follow-up questions
        max_tokens=200,
    )
    return response.choices[0].message.content or ""


def _call_anthropic(cfg: LLMConfig, system: str, user: str) -> str:
    from anthropic import Anthropic

    client = Anthropic(api_key=cfg.api_key)
    response = client.messages.create(
        model=cfg.model,
        max_tokens=500,
        temperature=0.1,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(block.text for block in response.content if getattr(block, "type", "") == "text")


def _extract_json(raw: str) -> dict:
    """Parse the model output, tolerating ```json fences or surrounding prose."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end == -1:
            raise
        return json.loads(raw[start:end + 1])


def _finalize(validated: dict, user_text: str) -> dict:
    slots_filled = []
    slots_missing = []
    for slot in ["purpose", "project_type", "estimated_cost", "beneficiary", "urgency"]:
        if validated.get(slot) is not None and not (slot == "purpose" and validated[slot] == "other"):
            slots_filled.append(slot)
        else:
            slots_missing.append(slot)

    cost_str = f"₹{validated['estimated_cost']:,.0f}" if validated["estimated_cost"] else "an unspecified amount"
    project_str = validated.get("project_type") or validated["purpose"]
    confirmation = f"So you want {cost_str} for {project_str}, correct?"

    return {
        **validated,
        "slots_filled": slots_filled,
        "slots_missing": slots_missing,
        "extraction_method": "llm",
        "raw_input": user_text,
        "confirmation_summary": confirmation,
    }


def extract_intent_llm(
    user_text: str,
    profile: dict | None = None,
    config: LLMConfig | None = None,
    # Legacy keyword args kept for backward compatibility with older callers.
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Extract structured intent slots using an LLM.

    Falls back to the offline rule-based extractor when no provider is
    configured or when the call fails for any reason (network, bad JSON, …).
    The returned dict always reports how it was produced in `extraction_method`.
    """
    cfg = config or LLMConfig.from_env()
    if api_key or base_url or model:
        cfg = LLMConfig(
            provider=cfg.provider if cfg.provider != "none" else "openai",
            api_key=api_key or cfg.api_key,
            base_url=base_url or cfg.base_url,
            model=model or cfg.model,
        )

    from module2_intent.offline_extractor import extract_intent_offline

    if not cfg.enabled:
        result = extract_intent_offline(user_text, profile)
        result["extraction_method"] = "offline_rules"
        return result

    system = (
        "You are a JSON-only extraction assistant. Never output anything except valid JSON."
        + _profile_context(profile)
    )
    user = EXTRACTION_PROMPT + user_text

    try:
        if cfg.provider == "anthropic":
            raw_output = _call_anthropic(cfg, system, user)
        else:
            raw_output = _call_openai_compatible(cfg, system, user)
        validated = _validate_llm_output(_extract_json(raw_output))
    except Exception as e:
        result = extract_intent_offline(user_text, profile)
        result["extraction_method"] = "offline_rules"
        result["llm_error"] = f"{cfg.provider}: {e}"
        return result

    result = _finalize(validated, user_text)
    result["llm_provider"] = cfg.provider
    result["llm_model"] = cfg.model
    return result
