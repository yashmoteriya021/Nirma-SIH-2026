"""
Module 2: Offline (Rule-Based) Intent Extractor

Keyword/regex-based slot extraction for degraded-connectivity operation.
No network dependency — survives a live demo without internet.

Supports:
  - Hindi keywords (Devanagari script)
  - English keywords
  - Code-mixed "Hinglish" (Roman script Hindi)
  - Cost extraction from ₹ amounts, "lakh", "hazar/hazaar", numeric patterns
"""

import re
from typing import Any


# ---------------------------------------------------------------------------
# Keyword dictionaries for purpose detection
# ---------------------------------------------------------------------------

PURPOSE_KEYWORDS: dict[str, list[str]] = {
    "education": [
        # English
        "education", "study", "studies", "college", "university", "school",
        "degree", "btech", "b.tech", "mba", "engineering", "medical",
        "nursing", "diploma", "course", "tuition", "fees", "coaching",
        "scholarship", "hostel",
        # Hindi (Devanagari)
        "पढ़ाई", "शिक्षा", "कॉलेज", "विश्वविद्यालय", "स्कूल", "डिग्री",
        # Hinglish (Roman)
        "padhai", "padhna", "padhne", "shiksha",
    ],
    "business_start": [
        # English
        "start", "open", "begin", "new shop", "new business", "new store",
        "startup", "start-up", "establish", "setup", "set up", "launch",
        # Hindi
        "शुरू", "खोलना", "नया", "दुकान", "व्यापार", "कारोबार",
        # Hinglish
        "shuru", "kholna", "naya", "dukaan", "dukan", "vyapaar", "karobar",
    ],
    "business_expansion": [
        # English
        "expand", "expansion", "grow", "bigger", "scale", "upgrade",
        "more machines", "additional", "second branch", "increase",
        # Hindi
        "बढ़ाना", "विस्तार", "बड़ा",
        # Hinglish
        "badhana", "vistar", "bada",
    ],
    "vehicle_livelihood": [
        # English
        "vehicle", "auto", "auto-rickshaw", "rickshaw", "tempo", "truck",
        "taxi", "cab", "transport", "delivery", "e-rickshaw",
        # Hindi
        "गाड़ी", "वाहन", "ऑटो", "रिक्शा", "टेम्पो", "ट्रक",
        # Hinglish
        "gaadi", "gadi", "vaahan", "auto", "tempo", "truck",
    ],
    "agriculture_allied": [
        # English
        "farm", "farming", "agriculture", "dairy", "cattle", "poultry",
        "fishery", "goat", "buffalo", "cow", "milk", "horticulture",
        "mushroom", "bee", "honey", "pig", "piggery",
        # Hindi
        "खेती", "कृषि", "डेयरी", "पशुपालन", "मछली", "मुर्गी",
        # Hinglish
        "kheti", "krishi", "dairy", "pashupalan", "machli", "murgi",
    ],
    "sanitation_equipment": [
        # English
        "sanitation", "sewer", "cleaning", "sweeping", "garbage",
        "waste", "mechanised", "suction", "jetting", "cesspool",
        "safai", "swachhta",
        # Hindi
        "सफाई", "स्वच्छता", "कूड़ा", "कचरा", "नाला",
        # Hinglish
        "safai", "swachhta", "kooda", "kachra",
    ],
}

# Remove duplicates that appear in both the English and Hinglish sub-lists
# (e.g. "auto", "dairy") so a single word can't count as two hits.
PURPOSE_KEYWORDS = {k: list(dict.fromkeys(w.lower() for w in v)) for k, v in PURPOSE_KEYWORDS.items()}

# Project type keywords → descriptive project type
PROJECT_TYPE_KEYWORDS: dict[str, list[str]] = {
    "tailoring shop": ["tailoring", "tailor", "silai", "sewing", "darzi", "सिलाई", "दर्जी"],
    "kirana store": ["kirana", "grocery", "general store", "किराना", "परचून"],
    "food stall": ["food stall", "food cart", "dhaba", "tea stall", "chai", "snacks", "ढाबा", "चाय"],
    "beauty parlour": ["beauty", "parlour", "parlor", "salon", "ब्यूटी", "पार्लर"],
    "mobile repair": ["mobile repair", "phone repair", "मोबाइल"],
    "welding workshop": ["welding", "fabrication", "वेल्डिंग"],
    "dairy business": ["dairy", "milk", "दूध", "डेयरी"],
    "poultry farm": ["poultry", "chicken", "murgi", "मुर्गी"],
    "auto transport": ["auto", "rickshaw", "transport", "ऑटो", "रिक्शा"],
}

# ---------------------------------------------------------------------------
# Cost extraction patterns
# ---------------------------------------------------------------------------

# Patterns to match monetary amounts in various formats
COST_PATTERNS = [
    # ₹1,40,000 or ₹140000 or Rs. 1,40,000 or Rs 140000
    r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{2})?)\s*(?:lakh|lac|लाख)?",
    # "1.4 lakh" or "1.4 lac" or "1.4 लाख"
    r"([\d.]+)\s*(?:lakh|lac|लाख)",
    # "50 hazar" or "50 hazaar" or "50000" or "50 हज़ार"
    r"([\d.]+)\s*(?:hazar|hazaar|hajar|thousand|हज़ार|हजार)",
    # "2 crore" (less common but possible)
    r"([\d.]+)\s*(?:crore|करोड़)",
    # Plain large numbers like 80000, 140000
    r"\b(\d{4,8})\b",
]

# ---------------------------------------------------------------------------
# Beneficiary detection
# ---------------------------------------------------------------------------

DEPENDENT_KEYWORDS = [
    "son", "daughter", "child", "children", "beta", "beti", "bachcha",
    "बेटा", "बेटी", "बच्चा", "बच्चे", "dependent", "ward",
    "wife", "husband", "spouse", "family member",
]

# ---------------------------------------------------------------------------
# Urgency detection
# ---------------------------------------------------------------------------

IMMEDIATE_KEYWORDS = [
    "urgent", "immediately", "asap", "right now", "jaldi", "turant",
    "जल्दी", "तुरंत", "emergency", "deadline",
]

FLEXIBLE_KEYWORDS = [
    "no rush", "whenever", "flexible", "jab bhi", "कभी भी",
    "planning", "thinking about",
]


# Characters that form a "word" for boundary purposes: ASCII word chars plus the
# full Devanagari block (letters, vowel signs, nukta, virama).
_WORD_CHAR = r"[\wऀ-ॿ]"

# Light English inflection tolerance so "start" matches "started"/"starting",
# "expand" matches "expanding", "study" matches "studies".
_SUFFIX = r"(?:s|es|ed|ing|ies|ly)?"

# Years (as bare numbers) must never be read as a loan amount.
_YEAR_MIN, _YEAR_MAX = 1900, 2100

# Currency markers that make a 4-digit number an amount, not a year.
_CURRENCY_PREFIX = re.compile(r"(?:₹|rs\.?|inr|rupees?|rupaye|रुपये|रु\.?)\s*$", re.IGNORECASE)

_KEYWORD_RE_CACHE: dict[str, re.Pattern] = {}


def _normalize_text(text: str) -> str:
    """Lowercase and normalize whitespace."""
    return re.sub(r"\s+", " ", text.lower().strip())


def _keyword_pattern(keyword: str) -> re.Pattern:
    """
    Compile a whole-word pattern for a keyword (cached).

    Multi-word keywords ("new shop", "no rush") are matched as a phrase with
    flexible whitespace; single words get suffix tolerance. Both are anchored
    on word boundaries so "auto" no longer matches "automatic" and "course"
    no longer matches "of course I need fees" via substring.
    """
    kw = keyword.lower().strip()
    pat = _KEYWORD_RE_CACHE.get(kw)
    if pat is None:
        if " " in kw:
            body = r"\s+".join(re.escape(part) for part in kw.split())
        else:
            body = re.escape(kw) + _SUFFIX
        pat = re.compile(rf"(?<!{_WORD_CHAR}){body}(?!{_WORD_CHAR})")
        _KEYWORD_RE_CACHE[kw] = pat
    return pat


def _matched_keywords(text_lower: str, keywords: list[str]) -> set[str]:
    """Return the set of distinct keywords found as whole words in the text."""
    found: set[str] = set()
    for kw in keywords:
        if _keyword_pattern(kw).search(text_lower):
            found.add(kw.lower())
    return found


def _extract_purpose(text: str) -> tuple[str, float]:
    """
    Detect purpose from keywords. Returns (purpose, confidence).
    Confidence: 0.9 if >=2 distinct keywords, 0.6 if one, 0.3 if none.
    Ties are broken by the more specific purpose (project-specific categories
    beat the generic business_start/expansion buckets).
    """
    text_lower = _normalize_text(text)
    scores: dict[str, int] = {}

    for purpose, keywords in PURPOSE_KEYWORDS.items():
        count = len(_matched_keywords(text_lower, keywords))
        if count > 0:
            scores[purpose] = count

    if not scores:
        return "other", 0.3

    # Tie-break: specific livelihood categories > expansion > start. "start" is
    # a very common verb ("I started a shop and want to expand"), so it is the
    # weakest signal when counts are equal.
    tie_rank = {"business_start": 0, "business_expansion": 1}
    best = max(scores, key=lambda k: (scores[k], tie_rank.get(k, 2)))
    confidence = 0.9 if scores[best] >= 2 else 0.6
    return best, confidence


def _extract_project_type(text: str) -> tuple[str | None, float]:
    """Detect specific project type from keywords (whole-word match)."""
    text_lower = _normalize_text(text)

    for project, keywords in PROJECT_TYPE_KEYWORDS.items():
        if _matched_keywords(text_lower, keywords):
            return project, 0.8

    return None, 0.0


def _looks_like_year(text_lower: str, match: re.Match, value: float) -> bool:
    """A bare 4-digit number in 1900-2100 is a year unless a currency marker precedes it."""
    if not (_YEAR_MIN <= value <= _YEAR_MAX):
        return False
    if value != int(value):
        return False
    before = text_lower[max(0, match.start() - 12):match.start()]
    return not _CURRENCY_PREFIX.search(before)


def _extract_cost(text: str) -> tuple[float | None, str]:
    """
    Extract monetary amount from text.
    Returns (amount_in_inr, confidence).
    """
    text_lower = _normalize_text(text)

    for pattern in COST_PATTERNS:
        for match in re.finditer(pattern, text_lower, re.IGNORECASE):
            raw = match.group(1).replace(",", "")
            try:
                value = float(raw)
            except ValueError:
                continue

            full_match = text_lower[match.start():match.end() + 20]

            if any(w in full_match for w in ["lakh", "lac", "लाख"]):
                return value * 100000, "high"
            if any(w in full_match for w in ["hazar", "hazaar", "hajar", "thousand", "हज़ार", "हजार"]):
                return value * 1000, "high"
            if any(w in full_match for w in ["crore", "करोड़"]):
                return value * 10000000, "high"
            if value < 100:
                # Probably in lakhs (e.g., "1.4" in context)
                if any(w in text_lower for w in ["lakh", "lac", "लाख"]):
                    return value * 100000, "medium"
                continue
            if value >= 1000:
                if _looks_like_year(text_lower, match, value):
                    continue
                return value, "high"

    return None, "low"


def _extract_beneficiary(text: str) -> tuple[str, float]:
    """Detect if loan is for self or dependent."""
    text_lower = _normalize_text(text)

    if _matched_keywords(text_lower, DEPENDENT_KEYWORDS):
        return "dependent", 0.8

    return "self", 0.7


def _extract_urgency(text: str) -> tuple[str, float]:
    """Detect urgency level."""
    text_lower = _normalize_text(text)

    if _matched_keywords(text_lower, IMMEDIATE_KEYWORDS):
        return "immediate", 0.8

    if _matched_keywords(text_lower, FLEXIBLE_KEYWORDS):
        return "flexible", 0.8

    return "within_3_months", 0.5


def _extract_loan_type(text: str, estimated_cost: float | None) -> str:
    """
    Guess loan type from text and cost.
    This is a non-binding hint — Module 3 does the real matching.
    """
    text_lower = _normalize_text(text)

    if _matched_keywords(text_lower, ["education", "padhai", "college", "पढ़ाई", "शिक्षा"]):
        return "education_loan"

    if estimated_cost is not None:
        if estimated_cost <= 140000:
            return "micro_finance"
        elif estimated_cost <= 5000000:
            return "term_loan"

    return "unknown"


def extract_intent_offline(
    user_text: str,
    profile: dict | None = None,
    confidence_threshold: float = 0.6,
) -> dict[str, Any]:
    """
    Extract structured intent slots from freeform text using rules/keywords.

    This is the offline fallback — no LLM or network required.

    Args:
        user_text: The user's freeform description of their need.
        profile: Optional verified profile from Module 1 (to pre-fill known slots).
        confidence_threshold: Minimum confidence to accept a slot (default 0.6).

    Returns:
        ExtractedIntent dict matching intent_schema.json.
    """
    slots_filled = []
    slots_missing = []

    # Extract purpose
    purpose, purpose_conf = _extract_purpose(user_text)
    if purpose_conf >= confidence_threshold:
        slots_filled.append("purpose")
    else:
        slots_missing.append("purpose")

    # Extract project type
    project_type, pt_conf = _extract_project_type(user_text)
    if project_type and pt_conf >= confidence_threshold:
        slots_filled.append("project_type")
    else:
        slots_missing.append("project_type")

    # Extract cost
    estimated_cost, cost_confidence = _extract_cost(user_text)
    if estimated_cost is not None:
        slots_filled.append("estimated_cost")
    else:
        slots_missing.append("estimated_cost")
        cost_confidence = "low"

    # Extract beneficiary
    beneficiary, ben_conf = _extract_beneficiary(user_text)
    if ben_conf >= confidence_threshold:
        slots_filled.append("beneficiary")
    else:
        slots_missing.append("beneficiary")

    # Extract urgency
    urgency, urg_conf = _extract_urgency(user_text)
    if urg_conf >= confidence_threshold:
        slots_filled.append("urgency")
    else:
        slots_missing.append("urgency")

    # Loan type guess
    loan_type_guess = _extract_loan_type(user_text, estimated_cost)

    # Pre-fill from the verified profile: when the applicant is the student,
    # the education requirement applies to their own recorded education level,
    # so the intent engine must not re-ask for it.
    student_education_status = None
    if purpose == "education" and beneficiary == "self" and profile:
        student_education_status = profile.get("education_status")

    # Build confirmation summary
    cost_str = f"₹{estimated_cost:,.0f}" if estimated_cost else "an unspecified amount"
    project_str = project_type or purpose
    confirmation = f"So you want {cost_str} for {project_str}, correct?"

    return {
        "purpose": purpose,
        "project_type": project_type,
        "estimated_cost": estimated_cost,
        "cost_confidence": cost_confidence,
        "beneficiary": beneficiary,
        "loan_type_guess": loan_type_guess,
        "urgency": urgency,
        "student_education_status": student_education_status,
        "slots_filled": slots_filled,
        "slots_missing": slots_missing,
        "extraction_method": "offline_rules",
        "raw_input": user_text,
        "confirmation_summary": confirmation,
    }
