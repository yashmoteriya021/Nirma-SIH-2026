"""
Module 2: Slot-Filling State Machine

Tracks which intent slots are filled, generates targeted follow-up questions
for missing/low-confidence ones, and stops after a bounded number of turns.

Falls back to an explicit form if slots remain unfilled after max turns.
Pre-fills from Module 1's profile anything already known.
"""

from typing import Any

from module2_intent.offline_extractor import extract_intent_offline
from module2_intent.llm_extractor import LLMConfig, extract_intent_llm


# Maximum clarification turns before falling back to explicit form
MAX_CLARIFICATION_TURNS = 5

# Minimum confidence threshold to accept a slot without asking
CONFIDENCE_THRESHOLD = 0.6

# Required slots that must be filled for a complete intent
REQUIRED_SLOTS = ["purpose", "estimated_cost", "beneficiary"]

# Optional but helpful slots
OPTIONAL_SLOTS = ["project_type", "urgency"]

# Conditionally required: only when an education loan is for a dependent,
# because scheme education requirements apply to the student, not the parent.
CONDITIONAL_SLOTS = ["student_education_status"]

# Slots the extractor may return that we track in the session
TRACKED_SLOTS = REQUIRED_SLOTS + OPTIONAL_SLOTS + CONDITIONAL_SLOTS + ["loan_type_guess"]

# Follow-up question templates for each missing slot
FOLLOW_UP_QUESTIONS: dict[str, dict[str, str]] = {
    "purpose": {
        "en": "What do you need the loan for? (e.g., starting a business, education, buying a vehicle)",
        "hi": "आपको लोन किस लिए चाहिए? (जैसे, व्यापार शुरू करना, पढ़ाई, वाहन खरीदना)",
    },
    "project_type": {
        "en": "What type of business or project are you planning? (e.g., tailoring shop, kirana store, dairy farming)",
        "hi": "आप किस तरह का व्यापार या प्रोजेक्ट करना चाहते हैं? (जैसे, सिलाई की दुकान, किराना स्टोर, डेयरी)",
    },
    "estimated_cost": {
        "en": "How much money do you think you'll need? Even a rough estimate helps. (e.g., ₹80,000 or about 1.5 lakh)",
        "hi": "आपको कितने पैसों की ज़रूरत होगी? अंदाज़ा भी चलेगा। (जैसे, ₹80,000 या लगभग 1.5 लाख)",
    },
    "beneficiary": {
        "en": "Is this loan for yourself, or for your son/daughter/dependent?",
        "hi": "यह लोन आपके लिए है, या आपके बेटे/बेटी के लिए?",
    },
    "urgency": {
        "en": "How soon do you need the funds? (immediately, within 3 months, or flexible)",
        "hi": "आपको पैसे कब तक चाहिए? (तुरंत, 3 महीने में, या कोई जल्दी नहीं)",
    },
    "student_education_status": {
        "en": "What is the student's highest completed education? (below 8th, 8th pass, 10th pass, 12th pass, graduate, postgraduate)",
        "hi": "छात्र/छात्रा ने अब तक कितनी पढ़ाई पूरी की है? (8वीं से कम, 8वीं पास, 10वीं पास, 12वीं पास, स्नातक, स्नातकोत्तर)",
    },
}

# Keyword map for answering the student-education follow-up
EDUCATION_ANSWERS: list[tuple[str, list[str]]] = [
    ("professional", ["professional", "mbbs", "llb", "ca ", "b.tech", "btech", "engineering degree"]),
    ("post_graduate", ["post_graduate", "post graduate", "masters", "m.a", "m.sc", "mba", "pg", "स्नातकोत्तर"]),
    ("graduate", ["graduate", "graduation", "bachelor", "b.a", "b.sc", "b.com", "degree", "स्नातक"]),
    ("12th_pass", ["12th", "12 pass", "twelfth", "intermediate", "hsc", "+2", "12वीं", "बारहवीं"]),
    ("10th_pass", ["10th", "10 pass", "tenth", "matric", "ssc", "10वीं", "दसवीं"]),
    ("8th_pass", ["8th", "8 pass", "eighth", "8वीं", "आठवीं"]),
    ("below_8th", ["below 8", "less than 8", "5th", "primary", "8वीं से कम"]),
]

# Cost estimation hints for common project types (from PMEGP/MSME research)
COST_HINTS: dict[str, dict[str, Any]] = {
    "tailoring shop": {"min": 20000, "max": 500000, "typical": 80000},
    "kirana store": {"min": 350000, "max": 1500000, "typical": 500000},
    "food stall": {"min": 150000, "max": 500000, "typical": 200000},
    "beauty parlour": {"min": 100000, "max": 500000, "typical": 200000},
    "mobile repair": {"min": 50000, "max": 300000, "typical": 100000},
    "dairy business": {"min": 100000, "max": 500000, "typical": 250000},
    "poultry farm": {"min": 50000, "max": 500000, "typical": 200000},
    "auto transport": {"min": 200000, "max": 800000, "typical": 400000},
}


class SlotFillingSession:
    """
    Manages a multi-turn slot-filling conversation.

    Usage:
        session = SlotFillingSession(profile=verified_profile)
        result = session.process_input("I want to open a tailoring shop")
        while not result["complete"]:
            # Show result["follow_up_question"] to user
            user_response = get_user_input()
            result = session.process_input(user_response)
        final_intent = result["intent"]
    """

    def __init__(
        self,
        profile: dict | None = None,
        language: str = "en",
        llm_config: LLMConfig | None = None,
    ):
        """
        Initialize the slot-filling session.

        Args:
            profile: Verified profile from Module 1 (to pre-fill known slots).
            language: Preferred language for follow-up questions ('en' or 'hi').
            llm_config: LLM provider config. Defaults to environment; when no
                provider is enabled every turn uses the offline extractor.
        """
        self.profile = profile or {}
        self.language = language
        self.llm_config = llm_config or LLMConfig.from_env()
        self.turn_count = 0
        self.all_inputs: list[str] = []
        self.extraction_methods: list[str] = []
        self.pending_slot: str | None = None
        self.current_intent: dict[str, Any] = {
            "purpose": None,
            "project_type": None,
            "estimated_cost": None,
            "cost_confidence": "low",
            "beneficiary": None,
            "loan_type_guess": "unknown",
            "urgency": None,
            "student_education_status": None,
        }

    def _extract(self, user_text: str) -> dict:
        """Run the configured extractor for one turn (LLM if enabled, else rules)."""
        if self.llm_config.enabled:
            extracted = extract_intent_llm(user_text, self.profile, config=self.llm_config)
        else:
            extracted = extract_intent_offline(user_text, self.profile)
        self.extraction_methods.append(extracted.get("extraction_method", "offline_rules"))
        return extracted

    def _merge_extraction(self, extracted: dict) -> None:
        """
        Merge newly extracted slots into current intent.

        Only slots the extractor reported as confidently filled are merged
        (a purpose of "other" at 0.3 confidence must trigger a question, not
        silently pass). Existing values are never overwritten.
        """
        filled = set(extracted.get("slots_filled", []))
        for key in TRACKED_SLOTS:
            new_val = extracted.get(key)
            if new_val is None:
                continue
            current = self.current_intent.get(key)
            if key == "loan_type_guess" and current == "unknown":
                current = None
            if current is not None:
                # "self" is the extractor's default when nobody else is named,
                # so an explicit dependent mention in a later turn wins.
                if key == "beneficiary" and new_val == "dependent" and "beneficiary" in filled:
                    self.current_intent[key] = new_val
                continue
            if key == "loan_type_guess" and new_val == "unknown":
                continue
            if key in ("loan_type_guess", "student_education_status") or key in filled:
                self.current_intent[key] = new_val

        # Update cost confidence if cost was extracted
        if extracted.get("estimated_cost") is not None and "estimated_cost" in filled:
            self.current_intent["cost_confidence"] = extracted.get("cost_confidence", "medium")

    def _answer_pending_slot(self, user_text: str) -> None:
        """
        A short reply to a direct follow-up question ("for my daughter",
        "12th pass", "flexible") often carries no other keywords; interpret it
        against the slot we just asked about.
        """
        slot = self.pending_slot
        if not slot or self.current_intent.get(slot) is not None:
            return
        text = user_text.lower()

        if slot == "student_education_status":
            for level, keys in EDUCATION_ANSWERS:
                if any(k in text for k in keys):
                    self.current_intent[slot] = level
                    return
        elif slot == "beneficiary":
            if any(k in text for k in ["self", "myself", "me", "khud", "mere liye", "खुद", "मेरे लिए", "apne"]):
                self.current_intent[slot] = "self"
        elif slot == "urgency":
            if any(k in text for k in ["3 month", "teen mahine", "3 महीने"]):
                self.current_intent[slot] = "within_3_months"

    def _needs_student_education(self) -> bool:
        return (
            self.current_intent.get("purpose") == "education"
            and self.current_intent.get("beneficiary") == "dependent"
            and self.current_intent.get("student_education_status") is None
        )

    def _get_missing_slots(self) -> list[str]:
        """Return list of required slots that are still None."""
        missing = []
        for slot in REQUIRED_SLOTS:
            if self.current_intent.get(slot) is None:
                missing.append(slot)
        for slot in OPTIONAL_SLOTS:
            if self.current_intent.get(slot) is None:
                missing.append(slot)
        return missing

    def _suggest_cost(self) -> str | None:
        """If project_type is known, suggest a typical cost range."""
        project_type = self.current_intent.get("project_type")
        if project_type and project_type in COST_HINTS:
            hint = COST_HINTS[project_type]
            return (
                f"For a {project_type}, typical costs range from "
                f"₹{hint['min']:,} to ₹{hint['max']:,}. "
                f"A typical setup costs around ₹{hint['typical']:,}."
            )
        return None

    def _build_confirmation_summary(self) -> str:
        """Build a human-readable summary for user confirmation."""
        intent = self.current_intent
        cost_str = f"₹{intent['estimated_cost']:,.0f}" if intent.get("estimated_cost") else "an amount to be determined"
        project_str = intent.get("project_type") or intent.get("purpose", "your project")
        beneficiary_str = "yourself" if intent.get("beneficiary") == "self" else "your dependent"

        return f"So you want {cost_str} for {project_str} (for {beneficiary_str}), correct?"

    def process_input(self, user_text: str) -> dict:
        """
        Process one turn of user input.

        Args:
            user_text: The user's message.

        Returns:
            dict with keys:
              - complete (bool): True if all required slots are filled or max turns reached.
              - intent (dict): Current state of extracted intent.
              - follow_up_question (str|None): Next question to ask, or None if complete.
              - confirmation_summary (str|None): Summary for final confirmation.
              - turn (int): Current turn number.
              - cost_hint (str|None): Cost suggestion if applicable.
        """
        self.turn_count += 1
        self.all_inputs.append(user_text)

        # Extract slots from this input
        extracted = self._extract(user_text)
        self._merge_extraction(extracted)
        self._answer_pending_slot(user_text)
        self.pending_slot = None

        # Check what's still missing
        missing = self._get_missing_slots()
        required_missing = [s for s in missing if s in REQUIRED_SLOTS]
        if self._needs_student_education():
            required_missing.append("student_education_status")
            missing.append("student_education_status")

        # Check if complete
        is_complete = (len(required_missing) == 0) or (self.turn_count >= MAX_CLARIFICATION_TURNS)

        if is_complete:
            # Fill defaults for any still-missing optional slots
            if self.current_intent.get("urgency") is None:
                self.current_intent["urgency"] = "flexible"
            if self.current_intent.get("beneficiary") is None:
                self.current_intent["beneficiary"] = "self"

            # If cost still missing and we have a project type hint, use the typical cost
            if self.current_intent.get("estimated_cost") is None:
                project_type = self.current_intent.get("project_type")
                if project_type and project_type in COST_HINTS:
                    self.current_intent["estimated_cost"] = COST_HINTS[project_type]["typical"]
                    self.current_intent["cost_confidence"] = "low"

            # Build final intent
            slots_filled = [k for k, v in self.current_intent.items() if v is not None]
            slots_missing = [k for k in REQUIRED_SLOTS + OPTIONAL_SLOTS if self.current_intent.get(k) is None]
            if self._needs_student_education():
                slots_missing.append("student_education_status")

            final_intent = {
                **self.current_intent,
                "slots_filled": slots_filled,
                "slots_missing": slots_missing,
                "extraction_method": "llm" if "llm" in self.extraction_methods else "offline_rules",
                "raw_input": " | ".join(self.all_inputs),
                "confirmation_summary": self._build_confirmation_summary(),
            }

            return {
                "complete": True,
                "intent": final_intent,
                "follow_up_question": None,
                "confirmation_summary": self._build_confirmation_summary(),
                "turn": self.turn_count,
                "cost_hint": None,
            }

        # Not complete — generate follow-up for the first missing required slot
        next_slot = required_missing[0] if required_missing else missing[0]
        self.pending_slot = next_slot
        question = FOLLOW_UP_QUESTIONS.get(next_slot, {}).get(
            self.language, FOLLOW_UP_QUESTIONS.get(next_slot, {}).get("en", "Please provide more details.")
        )

        # Add cost hint if we're asking about cost and have a project type
        cost_hint = None
        if next_slot == "estimated_cost":
            cost_hint = self._suggest_cost()
            if cost_hint:
                question = f"{question}\n💡 Hint: {cost_hint}"

        return {
            "complete": False,
            "intent": self.current_intent,
            "follow_up_question": question,
            "confirmation_summary": None,
            "turn": self.turn_count,
            "cost_hint": cost_hint,
        }
