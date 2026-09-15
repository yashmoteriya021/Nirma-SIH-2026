"""
End-to-End Pipeline for SIH PS 26092: AI-Driven Scheme Matching

Integrates all 4 modules:
  Module 1: Verified Profile (DigiLocker mock + manual fallback)
  Module 2: Intent Extraction (LLM + state machine fallback)
  Module 3: Eligibility Matching & Explainable Ranking
  Module 4: Partner Ranking & Routing

Example usage provided in `run_demo()`.
"""

import json
from typing import Any

from module1_profile.verification_service import build_verified_profile

from module2_intent.llm_extractor import extract_intent_llm
from module2_intent.slot_machine import SlotFillingSession
from module3_matching.hard_filter import filter_all_schemes
from module3_matching.soft_ranker import rank_schemes
from module3_matching.explainer import generate_full_recommendation
from module4_partners.partner_ranker import rank_partners


class SchemeMatchingPipeline:
    """End-to-end scheme matching pipeline."""

    def __init__(self, use_llm: bool = True):
        # use_llm only matters when an LLM provider is configured via env
        # (LLM_PROVIDER / *_API_KEY); otherwise every path uses offline rules.
        self.use_llm = use_llm
        self.current_profile = None
        self.current_intent = None

    def step1_verify_profile(self, user_id: str, manual_overrides: dict | None = None) -> dict:
        """
        Module 1: Authenticate and build verified profile.
        """
        # Map demo user_id to a mock auth code. Unknown IDs are an error —
        # silently matching a stranger to a demo citizen would be a real bug.
        auth_code_map = {
            "user_123_sc": "AUTH_CODE_RAMESH",
            "user_456_obc": "AUTH_CODE_PRIYA",
            "user_789_safai": "AUTH_CODE_SURESH",
        }
        if user_id not in auth_code_map:
            raise ValueError(f"Unknown demo user_id '{user_id}'. Known: {sorted(auth_code_map)}")
        auth_code = auth_code_map[user_id]
        
        # Complete the full DigiLocker mock flow (auth -> token exchange -> fetch docs -> staleness check)
        profile = build_verified_profile(auth_code)
        
        if "error" in profile:
            raise ValueError(f"Verification failed: {profile['message']}")

        # Apply any manual updates (e.g. they provided a fresh cert offline)
        if manual_overrides:
            profile.update(manual_overrides)
            if "annual_family_income" in manual_overrides or "category" in manual_overrides:
                profile["verification_status"] = "self_reported"

        self.current_profile = profile
        return profile

    def step2_extract_intent(self, user_text: str) -> dict:
        """
        Module 2: Extract intent from freeform text.
        """
        if not self.current_profile:
            raise ValueError("Must run step 1 first to get profile context.")

        if self.use_llm:
            intent = extract_intent_llm(user_text, self.current_profile)
        else:
            # Multi-turn slot machine (we just simulate 1 turn here)
            session = SlotFillingSession(self.current_profile)
            result = session.process_input(user_text)
            intent = result["intent"]

        self.current_intent = intent
        return intent

    def step3_match_schemes(self) -> dict:
        """
        Module 3: Hard filter and soft rank eligible schemes.
        """
        if not self.current_profile or not self.current_intent:
            raise ValueError("Must run steps 1 and 2 first.")

        # Hard filter
        filter_results = filter_all_schemes(self.current_profile, self.current_intent)

        # Soft rank
        ranked = rank_schemes(
            self.current_profile,
            self.current_intent,
            filter_results["eligible_schemes"],
        )

        # Explain
        recommendation = generate_full_recommendation(
            self.current_profile,
            self.current_intent,
            ranked,
            filter_results["ineligible_schemes"],
        )

        return recommendation

    def step4_route_partners(
        self, scheme_id: str, user_lat: float | None = None, user_lon: float | None = None, user_pin_code: str | None = None
    ) -> dict:
        """
        Module 4: Rank channel partners for a specific scheme.
        """
        partners = rank_partners(
            scheme_id=scheme_id,
            user_lat=user_lat,
            user_lon=user_lon,
            user_pin_code=user_pin_code,
        )
        return partners

    def run_full_flow(
        self,
        user_id: str,
        user_text: str,
        user_lat: float | None = None,
        user_lon: float | None = None,
        user_pin_code: str | None = None,
    ) -> dict[str, Any]:
        """Convenience method to run the entire pipeline at once."""

        print("--- Step 1: Profile Verification ---")
        profile = self.step1_verify_profile(user_id)
        print(f"Verified {profile['full_name']} as {profile['category']} with income ₹{profile['annual_family_income']}")

        print("\n--- Step 2: Intent Extraction ---")
        intent = self.step2_extract_intent(user_text)
        print(intent.get("confirmation_summary", f"Extracted purpose: {intent.get('purpose')}"))

        print("\n--- Step 3: Scheme Matching ---")
        schemes = self.step3_match_schemes()
        print(f"Status: {schemes['status']} ({schemes.get('total_eligible', 0)} eligible)")

        partner_routing = {}
        if schemes["status"] == "schemes_found":
            print("\n--- Step 4: Partner Routing ---")
            top_scheme = schemes["recommendations"][0]["scheme_id"]
            print(f"Routing for top scheme: {top_scheme}")

            partners = self.step4_route_partners(
                scheme_id=top_scheme,
                user_lat=user_lat,
                user_lon=user_lon,
                user_pin_code=user_pin_code,
            )
            partner_routing[top_scheme] = partners
            print(f"Found {partners.get('total_eligible', 0)} eligible partners nearby.")

        return {
            "profile": profile,
            "intent": intent,
            "schemes": schemes,
            "partner_routing": partner_routing,
        }


def run_demo():
    """Run a sample demo of the pipeline."""
    pipeline = SchemeMatchingPipeline(use_llm=False)  # slot machine path; uses LLM only if configured

    result = pipeline.run_full_flow(
        user_id="user_123_sc",
        user_text="I want to start a small tailoring shop in my village, need around 80000 rupees.",
        user_pin_code="226001",  # Lucknow PIN
    )

    print("\n\n=== FINAL JSON OUTPUT (Top Recommendation) ===")
    if result["schemes"]["status"] == "schemes_found":
        top = result["schemes"]["recommendations"][0]
        print(json.dumps(top, indent=2))
    else:
        print(json.dumps(result["schemes"], indent=2))


if __name__ == "__main__":
    run_demo()
