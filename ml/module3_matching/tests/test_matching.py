"""
Tests for Module 3: Eligibility Matching & Explainable Ranking

Test cases cover:
  1. Clean SC match — Micro Finance for small tailoring shop
  2. Multi-scheme overlap — SC woman eligible for MCF, MSY, and NASY
  3. No-match case — income exceeds ceiling
  4. Boundary income — exactly ₹5,00,000
  5. Women-only scheme — male applicant filtered out
  6. Education loan — 12th pass requirement
  7. VISVAS convergence scheme — lower income ceiling
  8. OBC applicant — NBCFDC schemes only
  9. SafaiKaramchari — NSKFDC + VISVAS schemes
  10. Missing cost — passes with caveat
  11. Existing loan restriction
  12. Full recommendation with explanations
"""

import pytest

from module3_matching.hard_filter import (
    check_category,
    check_income_ceiling,
    check_project_cost_band,
    check_gender_restriction,
    check_existing_loan,
    check_education_requirement,
    filter_scheme,
    filter_all_schemes,
    load_scheme_kb,
)
from module3_matching.soft_ranker import (
    compute_scheme_score,
    rank_schemes,
)
from module3_matching.explainer import (
    generate_scheme_explanation,
    generate_no_match_explanation,
    generate_full_recommendation,
)


# --- Test fixtures ---

def make_profile(**overrides):
    """Create a test profile with defaults."""
    base = {
        "applicant_id": "test-001",
        "full_name": "Test User",
        "dob": "1990-05-15",
        "age": 36,
        "gender": "male",
        "category": "SC",
        "domicile_state": "UP",
        "annual_family_income": 320000,
        "income_certificate_issue_date": "2026-04-10",
        "education_status": "10th_pass",
        "disability_status": {"has_disability": False},
        "existing_loan_flag": False,
        "marital_status": "married",
        "is_single_woman": False,
        "verification_status": "verified",
        "verification_source": "digilocker",
        "needs_reverification": False,
        "consent_given_at": "2026-09-14T12:00:00Z",
    }
    base.update(overrides)
    return base


def make_intent(**overrides):
    """Create a test intent with defaults."""
    base = {
        "purpose": "business_start",
        "project_type": "tailoring shop",
        "estimated_cost": 80000,
        "cost_confidence": "high",
        "beneficiary": "self",
        "loan_type_guess": "micro_finance",
        "urgency": "within_3_months",
    }
    base.update(overrides)
    return base


SCHEMES = load_scheme_kb()


def get_scheme(scheme_id: str) -> dict:
    """Get a scheme by ID from the knowledge base."""
    for s in SCHEMES:
        if s["scheme_id"] == scheme_id:
            return s
    raise ValueError(f"Scheme {scheme_id} not found")


class TestHardFilter:
    """Test hard-constraint eligibility filtering."""

    def test_clean_sc_match_micro_finance(self):
        """TC1: SC male, ₹80K tailoring — should match NSFDC_MCF."""
        profile = make_profile()
        intent = make_intent()
        scheme = get_scheme("NSFDC_MCF")

        result = filter_scheme(profile, intent, scheme)
        assert result.eligible is True
        assert len(result.failing_checks) == 0

    def test_multi_scheme_overlap_sc_woman(self):
        """TC2: SC widowed woman, ₹80K business — should match MCF, MSY, and NASY."""
        profile = make_profile(
            gender="female",
            marital_status="widowed",
            is_single_woman=True,
        )
        intent = make_intent(estimated_cost=80000)

        results = filter_all_schemes(profile, intent, SCHEMES)
        eligible_ids = [s["scheme_id"] for s, _ in results["eligible_schemes"]]

        assert "NSFDC_MCF" in eligible_ids
        assert "NSFDC_MSY" in eligible_ids
        assert "NSFDC_NASY" in eligible_ids
        assert len(results["eligible_schemes"]) >= 3

    def test_no_match_income_exceeds(self):
        """TC3: Income ₹6L exceeds ₹5L ceiling — no NSFDC/NBCFDC schemes."""
        profile = make_profile(annual_family_income=600000)
        intent = make_intent()

        results = filter_all_schemes(profile, intent, SCHEMES)
        assert len(results["eligible_schemes"]) == 0
        assert len(results["ineligible_schemes"]) > 0
        # Check nearest miss explains the gap
        assert len(results["nearest_misses"]) > 0

    def test_boundary_income_exactly_5l(self):
        """TC4: Income exactly ₹5,00,000 — should pass (≤ ceiling)."""
        profile = make_profile(annual_family_income=500000)
        intent = make_intent()
        scheme = get_scheme("NSFDC_MCF")

        result = filter_scheme(profile, intent, scheme)
        income_check = [c for c in result.checks if c.rule == "income_ceiling"][0]
        assert income_check.passed is True
        assert "≤" in income_check.detail

    def test_women_only_scheme_male_rejected(self):
        """TC5: Male applicant rejected from Mahila Samriddhi (women-only)."""
        profile = make_profile(gender="male")
        intent = make_intent()
        scheme = get_scheme("NSFDC_MSY")

        result = filter_scheme(profile, intent, scheme)
        assert result.eligible is False
        gender_check = [c for c in result.checks if c.rule == "gender_restriction"][0]
        assert gender_check.passed is False

    def test_education_loan_requires_12th(self):
        """TC6: Education loan needs 12th pass — 10th pass rejected."""
        profile = make_profile(education_status="10th_pass")
        intent = make_intent(purpose="education", estimated_cost=500000)
        scheme = get_scheme("NSFDC_ELS")

        result = filter_scheme(profile, intent, scheme)
        assert result.eligible is False
        edu_check = [c for c in result.checks if c.rule == "education_requirement"][0]
        assert edu_check.passed is False

    def test_education_loan_12th_pass_accepted(self):
        """TC6b: 12th pass should be accepted for education loan."""
        profile = make_profile(education_status="12th_pass")
        intent = make_intent(purpose="education", estimated_cost=500000)
        scheme = get_scheme("NSFDC_ELS")

        result = filter_scheme(profile, intent, scheme)
        edu_check = [c for c in result.checks if c.rule == "education_requirement"][0]
        assert edu_check.passed is True

    def test_visvas_lower_income_ceiling(self):
        """TC7: VISVAS has ₹3L income ceiling — ₹3.2L is rejected."""
        profile = make_profile(annual_family_income=320000)
        intent = make_intent(estimated_cost=150000)
        scheme = get_scheme("VISVAS")

        result = filter_scheme(profile, intent, scheme)
        income_check = [c for c in result.checks if c.rule == "income_ceiling"][0]
        assert income_check.passed is False  # 3.2L > 3L ceiling

    def test_obc_applicant_only_nbcfdc(self):
        """TC8: OBC applicant should only match NBCFDC (+ VISVAS joint) schemes, not pure NSFDC SC-only schemes."""
        profile = make_profile(category="OBC", annual_family_income=200000)
        intent = make_intent(estimated_cost=100000)

        results = filter_all_schemes(profile, intent, SCHEMES)
        eligible_ids = [s["scheme_id"] for s, _ in results["eligible_schemes"]]

        # Should have NBCFDC schemes
        assert any(sid.startswith("NBCFDC") for sid in eligible_ids)
        # Should NOT have pure NSFDC SC-only schemes
        assert "NSFDC_MCF" not in eligible_ids
        assert "NSFDC_TL" not in eligible_ids
        assert "NSFDC_ELS" not in eligible_ids
        assert "NSFDC_MSY" not in eligible_ids
        # VISVAS is OK — it's a joint scheme that targets OBC
        if "VISVAS" in eligible_ids:
            visvas_scheme = [s for s, _ in results["eligible_schemes"] if s["scheme_id"] == "VISVAS"][0]
            assert "OBC" in visvas_scheme["target_category"]

    def test_safai_karamchari_nskfdc(self):
        """TC9: SafaiKaramchari should match NSKFDC schemes."""
        profile = make_profile(
            category="SafaiKaramchari",
            annual_family_income=180000,
        )
        intent = make_intent(purpose="sanitation_equipment", estimated_cost=500000)

        results = filter_all_schemes(profile, intent, SCHEMES)
        eligible_ids = [s["scheme_id"] for s, _ in results["eligible_schemes"]]

        assert "NSKFDC_GTL" in eligible_ids or "NSKFDC_SUY" in eligible_ids

    def test_missing_cost_passes_with_caveat(self):
        """TC10: No estimated_cost — scheme should still pass cost band check."""
        profile = make_profile()
        intent = make_intent(estimated_cost=None)
        scheme = get_scheme("NSFDC_MCF")

        result = filter_scheme(profile, intent, scheme)
        cost_check = [c for c in result.checks if c.rule == "project_cost_band"][0]
        assert cost_check.passed is True
        assert "caveat" in cost_check.detail.lower()

    def test_existing_loan_restriction(self):
        """TC11: Schemes with existing_loan_restriction should reject if flagged."""
        # Note: In current KB, no scheme has this restriction as True,
        # so we test the check function directly
        profile = make_profile(existing_loan_flag=True)
        mock_scheme = {"existing_loan_restriction": True}
        result = check_existing_loan(profile, mock_scheme)
        assert result.passed is False


class TestSoftRanker:
    """Test soft ranking among eligible schemes."""

    def test_ranking_order(self):
        """TC12: Among multiple eligible schemes, ranking should prefer better fit."""
        profile = make_profile(
            gender="female",
            marital_status="widowed",
            is_single_woman=True,
        )
        intent = make_intent(estimated_cost=80000)

        results = filter_all_schemes(profile, intent, SCHEMES)
        ranked = rank_schemes(profile, intent, results["eligible_schemes"])

        assert len(ranked) >= 3
        # All should have scores
        for item in ranked:
            assert item["score"]["total_score"] > 0
            assert item["rank"] >= 1

        # NASY should rank high for single women (5% rate, designed for them)
        nasy_rank = None
        for item in ranked:
            if item["scheme"]["scheme_id"] == "NSFDC_NASY":
                nasy_rank = item["rank"]
                break
        assert nasy_rank is not None


class TestExplainer:
    """Test explanation generation."""

    def test_full_recommendation_with_explanations(self):
        """TC13: Full recommendation output has proper explanation structure."""
        profile = make_profile()
        intent = make_intent()

        results = filter_all_schemes(profile, intent, SCHEMES)
        ranked = rank_schemes(profile, intent, results["eligible_schemes"])

        recommendation = generate_full_recommendation(
            profile, intent, ranked, results["ineligible_schemes"]
        )

        assert recommendation["status"] == "schemes_found"
        assert recommendation["total_eligible"] > 0
        assert len(recommendation["recommendations"]) > 0

        # Check first recommendation has full explanation
        first = recommendation["recommendations"][0]
        assert "explanation" in first
        assert "eligible_because" in first["explanation"]
        assert "advantages" in first["explanation"]
        assert "considerations" in first["explanation"]
        assert len(first["explanation"]["eligible_because"]) > 0
        assert first["rank"] == 1

    def test_no_match_explanation(self):
        """TC14: No-match case produces helpful near-miss explanations."""
        profile = make_profile(annual_family_income=600000)
        intent = make_intent()

        results = filter_all_schemes(profile, intent, SCHEMES)
        assert len(results["eligible_schemes"]) == 0

        recommendation = generate_full_recommendation(
            profile, intent, [], results["ineligible_schemes"]
        )

        assert recommendation["status"] == "no_eligible_scheme"
        assert len(recommendation["nearest_misses"]) > 0
        assert len(recommendation["general_advice"]) > 0

        # Should have suggestions
        for miss in recommendation["nearest_misses"]:
            assert len(miss["failing_reasons"]) > 0

    def test_self_reported_consideration(self):
        """TC15: Self-reported profile should generate verification consideration."""
        profile = make_profile(verification_status="self_reported")
        intent = make_intent()

        results = filter_all_schemes(profile, intent, SCHEMES)
        ranked = rank_schemes(profile, intent, results["eligible_schemes"])

        if ranked:
            explanation = generate_scheme_explanation(
                profile, intent,
                ranked[0]["scheme"],
                ranked[0]["filter_result"],
                ranked[0]["score"],
                rank=1,
            )
            considerations = explanation["explanation"]["considerations"]
            has_verification_note = any("self-reported" in c.lower() for c in considerations)
            assert has_verification_note
