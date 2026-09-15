"""
Module 2: LLM-Based Intent Extractor

Uses an OpenAI-compatible API to extract structured intent slots from
freeform text (including code-mixed Hindi/English).

The LLM is constrained to return structured JSON only — it never generates
scheme recommendations (that's Module 3's job).

Provider-agnostic: works with OpenAI, Gemini (via compatible endpoint),
or local Ollama.
"""

import json
import os
from typing import Any


# The prompt template for structured extraction
EXTRACTION_PROMPT = """You are an intent extraction assistant for an Indian government loan scheme matching system.

Your ONLY job is to extract structured information from the user's message. You must NOT recommend any scheme or give financial advice.

The user may write in Hindi, English, or a mix of both (Hinglish/code-mixed). Extract the following slots:

1. **purpose**: One of: business_start, business_expansion, education, vehicle_livelihood, agriculture_allied, sanitation_equipment, other
2. **project_type**: Specific description (e.g., "tailoring shop", "kirana store", "BTech Computer Science")
3. **estimated_cost**: Numeric amount in INR. If user says "1.5 lakh", convert to 150000. If not stated, set to null.
4. **cost_confidence**: "high" if user stated exact figure, "medium" if approximate/range, "low" if you're guessing
5. **beneficiary**: "self" if for themselves, "dependent" if for son/daughter/spouse
6. **loan_type_guess**: "micro_finance" (small ≤₹1.4L), "term_loan" (₹1.4L-₹50L), "education_loan", or "unknown"
7. **urgency**: "immediate", "within_3_months", or "flexible"

Respond ONLY with valid JSON matching this exact structure:
{
  "purpose": "...",
  "project_type": "...",
  "estimated_cost": <number or null>,
  "cost_confidence": "high|medium|low",
  "beneficiary": "self|dependent",
  "loan_type_guess": "micro_finance|term_loan|education_loan|unknown",
  "urgency": "immediate|within_3_months|flexible"
}

User's message: """


# Valid enum values for validation
VALID_PURPOSES = {
    "business_start", "business_expansion", "education",
    "vehicle_livelihood", "agriculture_allied", "sanitation_equipment", "other",
}
VALID_CONFIDENCES = {"high", "medium", "low"}
VALID_BENEFICIARIES = {"self", "dependent"}
VALID_LOAN_TYPES = {"micro_finance", "term_loan", "education_loan", "unknown"}
VALID_URGENCIES = {"immediate", "within_3_months", "flexible"}


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

    return validated


def extract_intent_llm(
    user_text: str,
    profile: dict | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str = "gpt-4o-mini",
) -> dict[str, Any]:
    """
    Extract structured intent slots using an LLM.

    Args:
        user_text: The user's freeform description.
        profile: Optional verified profile from Module 1 (for context).
        api_key: API key (defaults to OPENAI_API_KEY env var).
        base_url: Custom base URL for compatible APIs (e.g., Ollama).
        model: Model name to use.

    Returns:
        ExtractedIntent dict matching intent_schema.json.
    """
    api_key = api_key or os.environ.get("OPENAI_API_KEY")

    if not api_key:
        # Fall back to offline extractor if no API key available
        from module2_intent.offline_extractor import extract_intent_offline
        result = extract_intent_offline(user_text, profile)
        result["extraction_method"] = "offline_rules"
        return result

    try:
        from openai import OpenAI

        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = OpenAI(**client_kwargs)

        # Add profile context if available
        context = ""
        if profile:
            context = (
                f"\n\nContext from verified profile: "
                f"Category={profile.get('category')}, "
                f"Income=₹{profile.get('annual_family_income', 'unknown')}, "
                f"Gender={profile.get('gender')}, "
                f"State={profile.get('domicile_state')}, "
                f"Education={profile.get('education_status')}"
            )

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON-only extraction assistant. Never output anything except valid JSON.",
                },
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT + user_text + context,
                },
            ],
            temperature=0.1,  # Low temperature for deterministic extraction
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        raw_output = response.choices[0].message.content
        parsed = json.loads(raw_output)
        validated = _validate_llm_output(parsed)

    except Exception as e:
        # On any LLM failure, fall back to offline
        from module2_intent.offline_extractor import extract_intent_offline
        result = extract_intent_offline(user_text, profile)
        result["extraction_method"] = "offline_rules"
        result["_llm_error"] = str(e)
        return result

    # Build slots tracking
    slots_filled = []
    slots_missing = []

    for slot in ["purpose", "project_type", "estimated_cost", "beneficiary", "urgency"]:
        if validated.get(slot) is not None:
            slots_filled.append(slot)
        else:
            slots_missing.append(slot)

    # Build confirmation summary
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
