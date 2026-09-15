"""
Tests for Module 2: Intent Extraction Engine

Test cases cover:
  1. English business start with explicit cost
  2. Code-mixed Hindi/English (Hinglish) input
  3. Hindi (Devanagari) education intent
  4. Ambiguous cost — no clear amount stated
  5. Dependent beneficiary detection (child's education)
  6. Vehicle livelihood intent
  7. Slot machine multi-turn conversation
  8. Slot machine max turns fallback
  9. All slots missing from vague input
  10. LLM extractor fallback when no API key
"""

import pytest

from module2_intent.offline_extractor import extract_intent_offline
from module2_intent.llm_extractor import extract_intent_llm
from module2_intent.slot_machine import SlotFillingSession


class TestOfflineExtractor:
    """Test the keyword/rule-based offline extractor."""

    def test_english_business_start(self):
        """TC1: Clear English business start with cost."""
        result = extract_intent_offline(
            "I want to open a tailoring shop. I think it will cost around ₹80,000."
        )
        assert result["purpose"] == "business_start"
        assert result["project_type"] == "tailoring shop"
        assert result["estimated_cost"] == 80000
        assert result["beneficiary"] == "self"
        assert result["extraction_method"] == "offline_rules"
        assert "purpose" in result["slots_filled"]
        assert "estimated_cost" in result["slots_filled"]

    def test_code_mixed_hinglish(self):
        """TC2: Code-mixed Hindi/English (Hinglish) input."""
        result = extract_intent_offline(
            "Mujhe ek kirana dukaan kholni hai, lagbhag 3.5 lakh ka kharcha hoga"
        )
        assert result["purpose"] == "business_start"
        assert result["project_type"] == "kirana store"
        assert result["estimated_cost"] == 350000
        assert "purpose" in result["slots_filled"]

    def test_hindi_devanagari_education(self):
        """TC3: Pure Hindi (Devanagari) education intent."""
        result = extract_intent_offline(
            "मेरी बेटी को कॉलेज में पढ़ाई के लिए पैसे चाहिए, 2 lakh"
        )
        assert result["purpose"] == "education"
        assert result["beneficiary"] == "dependent"
        assert result["estimated_cost"] == 200000

    def test_ambiguous_cost(self):
        """TC4: No cost stated — should result in missing cost slot."""
        result = extract_intent_offline(
            "I want to start a small business in my village."
        )
        assert result["purpose"] == "business_start"
        assert result["estimated_cost"] is None
        assert "estimated_cost" in result["slots_missing"]

    def test_dependent_education(self):
        """TC5: Education loan for child — beneficiary should be 'dependent'."""
        result = extract_intent_offline(
            "My son needs education loan for engineering college, Rs 5 lakh."
        )
        assert result["purpose"] == "education"
        assert result["beneficiary"] == "dependent"
        assert result["estimated_cost"] == 500000
        assert result["loan_type_guess"] == "education_loan"

    def test_vehicle_livelihood(self):
        """TC6: Vehicle-based livelihood intent."""
        result = extract_intent_offline(
            "I want to buy an auto-rickshaw for transport business, 4 lakh needed urgently."
        )
        assert result["purpose"] == "vehicle_livelihood"
        assert result["estimated_cost"] == 400000
        assert result["urgency"] == "immediate"  # "urgently" triggers immediate

    def test_sanitation_equipment(self):
        """TC7: Sanitation equipment intent (NSKFDC-relevant)."""
        result = extract_intent_offline(
            "I need money for safai suction machine equipment for swachhta work."
        )
        assert result["purpose"] == "sanitation_equipment"

    def test_vague_input_all_missing(self):
        """TC8: Very vague input — minimal slots filled."""
        result = extract_intent_offline("I need help")
        assert "estimated_cost" in result["slots_missing"]
        # Should still produce a result, just with low confidence/missing slots
        assert result["extraction_method"] == "offline_rules"

    def test_cost_in_plain_number(self):
        """TC9: Cost stated as plain number."""
        result = extract_intent_offline(
            "I want to start dairy business, budget is 250000 rupees."
        )
        assert result["estimated_cost"] == 250000


class TestSlotMachine:
    """Test the slot-filling state machine."""

    def test_complete_in_one_turn(self):
        """TC10: All required slots filled in first message."""
        session = SlotFillingSession()
        result = session.process_input(
            "I want to open a tailoring shop for ₹80,000."
        )
        assert result["complete"] is True
        assert result["intent"]["purpose"] == "business_start"
        assert result["intent"]["estimated_cost"] == 80000
        assert result["confirmation_summary"] is not None

    def test_multi_turn_conversation(self):
        """TC11: Multiple turns to fill all slots."""
        session = SlotFillingSession()

        # Turn 1: Mention business but no cost
        result = session.process_input("I want to start a tailoring business")
        assert result["complete"] is False
        assert result["follow_up_question"] is not None
        assert result["turn"] == 1

        # Turn 2: Provide cost
        result = session.process_input("Around 1.4 lakh")
        assert result["complete"] is True
        assert result["intent"]["estimated_cost"] == 140000

    def test_max_turns_fallback(self):
        """TC12: After MAX_CLARIFICATION_TURNS, session completes with defaults."""
        session = SlotFillingSession()

        # Send 5 vague messages
        for i in range(5):
            result = session.process_input(f"I'm not sure about details {i}")

        # Should be complete after max turns
        assert result["complete"] is True
        assert result["intent"]["beneficiary"] is not None  # Defaults applied

    def test_hindi_language_questions(self):
        """TC13: Hindi follow-up questions."""
        session = SlotFillingSession(language="hi")
        result = session.process_input("help")
        assert result["complete"] is False
        # Follow-up should contain Hindi text
        assert any(ord(c) > 0x900 for c in result["follow_up_question"])


class TestLLMExtractor:
    """Test the LLM extractor (without actual API calls)."""

    def test_fallback_without_api_key(self):
        """TC14: Without API key, falls back to offline extractor."""
        import os
        old_key = os.environ.pop("OPENAI_API_KEY", None)
        try:
            result = extract_intent_llm(
                "I want to open a kirana store for 5 lakh.",
                api_key=None,
            )
            # Should have used offline fallback
            assert result["extraction_method"] == "offline_rules"
            assert result["purpose"] == "business_start"
        finally:
            if old_key:
                os.environ["OPENAI_API_KEY"] = old_key

    def test_validation_sanitizes_bad_output(self):
        """TC15: Validate that bad LLM outputs are sanitized."""
        from module2_intent.llm_extractor import _validate_llm_output

        bad_data = {
            "purpose": "invalid_purpose",
            "estimated_cost": "not_a_number",
            "beneficiary": "alien",
        }
        result = _validate_llm_output(bad_data)
        assert result["purpose"] == "other"  # Invalid → default
        assert result["estimated_cost"] is None  # Can't parse → None
        assert result["beneficiary"] == "self"  # Invalid → default
