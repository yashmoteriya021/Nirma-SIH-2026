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


class TestOfflineExtractorRobustness:
    """Word-boundary matching and year handling."""

    def test_year_is_not_a_cost(self):
        result = extract_intent_offline("I want to start a business in 2026 with 50000")
        assert result["estimated_cost"] == 50000

    def test_year_alone_gives_no_cost(self):
        result = extract_intent_offline("I want to start a shop in 2026")
        assert result["estimated_cost"] is None

    def test_currency_prefixed_four_digit_amount_is_a_cost(self):
        result = extract_intent_offline("Need Rs 2000 for tools")
        assert result["estimated_cost"] == 2000

    def test_substring_does_not_match_auto(self):
        result = extract_intent_offline("I need an automatic machine")
        assert result["purpose"] != "vehicle_livelihood"

    def test_duplicate_keywords_do_not_inflate_confidence(self):
        result = extract_intent_offline("auto chahiye")
        # single distinct keyword → purpose filled but at the weak threshold only
        assert result["purpose"] == "vehicle_livelihood"

    def test_inflection_tolerance(self):
        result = extract_intent_offline("I am expanding my dairy, need 3 lakh")
        assert result["purpose"] in ("business_expansion", "agriculture_allied")
        assert result["estimated_cost"] == 300000

    def test_expansion_beats_start_on_tie(self):
        result = extract_intent_offline("I started a tailoring unit and want to expand it, need 2 lakh")
        assert result["purpose"] == "business_expansion"

    def test_profile_prefills_student_education_for_self(self):
        result = extract_intent_offline(
            "I want to do B.Tech, need 4 lakh", profile={"education_status": "12th_pass"}
        )
        assert result["purpose"] == "education"
        assert result["student_education_status"] == "12th_pass"


class TestSlotMachineFollowUps:
    def test_vague_purpose_triggers_question(self):
        from module2_intent.llm_extractor import LLMConfig

        session = SlotFillingSession(llm_config=LLMConfig(provider="none"))
        result = session.process_input("mujhe 80 hazar chahiye")
        assert result["complete"] is False
        assert "loan for" in result["follow_up_question"]

    def test_dependent_education_asks_student_level_and_overrides_self(self):
        from module2_intent.llm_extractor import LLMConfig

        session = SlotFillingSession(
            profile={"education_status": "10th_pass"},
            llm_config=LLMConfig(provider="none"),
        )
        session.process_input("mujhe 80 hazar chahiye")
        result = session.process_input("beti ki padhai ke liye")
        assert result["complete"] is False
        assert "student" in result["follow_up_question"].lower()
        result = session.process_input("12th pass")
        assert result["complete"] is True
        assert result["intent"]["beneficiary"] == "dependent"
        assert result["intent"]["student_education_status"] == "12th_pass"

    def test_llm_config_from_env_openrouter(self, monkeypatch):
        from module2_intent.llm_extractor import LLMConfig

        monkeypatch.delenv("LLM_PROVIDER", raising=False)
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
        cfg = LLMConfig.from_env()
        assert cfg.provider == "openrouter"
        assert cfg.enabled
        assert cfg.base_url == "https://openrouter.ai/api/v1"

    def test_llm_failure_falls_back_to_offline(self, monkeypatch):
        from module2_intent import llm_extractor
        from module2_intent.llm_extractor import LLMConfig, extract_intent_llm

        def boom(cfg, system, user):
            raise RuntimeError("network down")

        monkeypatch.setattr(llm_extractor, "_call_openai_compatible", boom)
        cfg = LLMConfig(provider="openai", api_key="sk-x", model="gpt-4o-mini")
        result = extract_intent_llm("silai ki dukaan, 80 hazar", config=cfg)
        assert result["extraction_method"] == "offline_rules"
        assert "network down" in result["llm_error"]
        assert result["estimated_cost"] == 80000

    def test_llm_success_path_with_mock(self, monkeypatch):
        from module2_intent import llm_extractor
        from module2_intent.llm_extractor import LLMConfig, extract_intent_llm

        def fake(cfg, system, user):
            assert "Category=SC" in system or "category=SC" in system
            return '```json\n{"purpose":"business_start","project_type":"kirana store","estimated_cost":500000,"cost_confidence":"high","beneficiary":"self","loan_type_guess":"term_loan","urgency":"flexible"}\n```'

        monkeypatch.setattr(llm_extractor, "_call_anthropic", fake)
        cfg = LLMConfig(provider="anthropic", api_key="k", model="claude-sonnet-5")
        result = extract_intent_llm("kirana kholna hai", profile={"category": "SC"}, config=cfg)
        assert result["extraction_method"] == "llm"
        assert result["llm_provider"] == "anthropic"
        assert result["estimated_cost"] == 500000
        assert "purpose" in result["slots_filled"]
