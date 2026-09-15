"""
Module 3: Explanation Generator

Generates human-readable explanation objects for each scheme recommendation.
Every recommendation must include WHY it was recommended, not just a score.

Also handles the "no eligible scheme" case with nearest-miss explanations.
"""

from typing import Any


def generate_scheme_explanation(
    profile: dict,
    intent: dict,
    scheme: dict,
    filter_result: Any,
    score_result: dict,
    rank: int,
) -> dict:
    """
    Generate a complete explanation object for a scheme recommendation.

    Args:
        profile: Verified citizen profile.
        intent: Extracted intent.
        scheme: Scheme record from knowledge base.
        filter_result: SchemeFilterResult from hard_filter.
        score_result: Score result from soft_ranker.
        rank: The scheme's rank in the recommendation list.

    Returns:
        Explanation dict with eligible_because, advantages, and considerations.
    """
    eligible_because = []
    advantages = []
    considerations = []

    # --- Eligibility reasons (from hard filter checks) ---
    for check in filter_result.checks:
        if check.passed:
            eligible_because.append(check.detail)

    # --- Advantages ---
    # Interest rate
    rate = scheme.get("interest_rate", 0)
    rebate = scheme.get("interest_rebate_women", 0)
    gender = profile.get("gender")

    if rate < 0:
        # VISVAS subvention
        advantages.append(f"Interest subvention of {abs(rate)}% p.a. via Direct Benefit Transfer")
    elif rate <= 5:
        effective_rate = rate - rebate if gender == "female" and rebate > 0 else rate
        if gender == "female" and rebate > 0:
            advantages.append(
                f"Low interest rate: {rate}% p.a. (effective {effective_rate}% with {rebate}% women's rebate)"
            )
        else:
            advantages.append(f"Low interest rate: {rate}% p.a.")
    else:
        if gender == "female" and rebate > 0:
            effective_rate = rate - rebate
            advantages.append(f"Interest rate: {rate}% p.a. (effective {effective_rate}% with {rebate}% women's rebate)")

    # Loan coverage
    loan_pct = scheme.get("loan_percentage", 0)
    if loan_pct >= 90:
        advantages.append(f"{loan_pct}% loan coverage of project cost (minimal own contribution needed)")

    # Moratorium
    moratorium = scheme.get("moratorium_months", 0)
    if moratorium > 0:
        advantages.append(f"{moratorium}-month moratorium before repayment begins")

    # Women-specific scheme
    if scheme.get("gender_restriction") == "female" and gender == "female":
        advantages.append("Scheme specifically designed for women entrepreneurs")
    elif scheme.get("gender_restriction") == "female_single" and profile.get("is_single_woman"):
        advantages.append("Scheme specifically designed for single women/widows")

    # VISVAS convergence
    if scheme.get("is_convergence_scheme"):
        convergence = scheme.get("convergence_with", [])
        advantages.append(f"Convergence scheme — works alongside {', '.join(convergence)}")

    # --- Considerations ---
    loan_ceiling = scheme.get("loan_ceiling", 0)
    estimated_cost = intent.get("estimated_cost")

    if estimated_cost and loan_ceiling:
        if estimated_cost > loan_ceiling * 0.8:
            considerations.append(
                f"Project cost ₹{estimated_cost:,.0f} uses {estimated_cost/loan_ceiling*100:.0f}% "
                f"of maximum loan ₹{loan_ceiling:,.0f} — limited headroom"
            )
        elif estimated_cost < loan_ceiling * 0.3:
            considerations.append(
                f"Loan ceiling ₹{loan_ceiling:,.0f} is much higher than your estimated cost "
                f"₹{estimated_cost:,.0f} — a smaller scheme may have better terms"
            )

    # Verification status
    if profile.get("verification_status") == "self_reported":
        considerations.append(
            "Profile is self-reported (not DigiLocker-verified) — "
            "document verification will be required at the channel partner"
        )

    if profile.get("needs_reverification"):
        considerations.append(
            "Some certificates need renewal — "
            f"{profile.get('reverification_reason', 'check validity')}"
        )

    # Education requirement
    edu_req = scheme.get("education_requirement")
    if edu_req:
        considerations.append(
            f"Scheme requires minimum education: {edu_req}"
        )

    # VISVAS special conditions
    if scheme.get("special_conditions"):
        for cond in scheme["special_conditions"][:2]:  # Top 2 conditions
            considerations.append(cond)

    return {
        "scheme_id": scheme["scheme_id"],
        "scheme_name": scheme["name"],
        "corporation": scheme["corporation"],
        "rank": rank,
        "score": score_result["total_score"],
        "explanation": {
            "eligible_because": eligible_because,
            "advantages": advantages,
            "considerations": considerations,
        },
        "scheme_details": {
            "loan_ceiling": loan_ceiling,
            "interest_rate": rate,
            "effective_rate": rate - rebate if gender == "female" and rebate > 0 else rate,
            "loan_percentage": loan_pct,
            "repayment_years": scheme.get("repayment_years", 0),
            "moratorium_months": moratorium,
            "required_documents": scheme.get("required_documents", []),
        },
    }


def generate_no_match_explanation(
    profile: dict,
    intent: dict,
    nearest_misses: list[tuple[dict, Any]],
) -> dict:
    """
    Generate a helpful explanation when no scheme is eligible.

    Instead of a dead end, tells the user what threshold they're closest to
    and what could change to qualify.

    Args:
        profile: Verified citizen profile.
        intent: Extracted intent.
        nearest_misses: List of (scheme, SchemeFilterResult) sorted by proximity.

    Returns:
        Explanation dict for the no-match case.
    """
    near_miss_details = []

    for scheme, result in nearest_misses[:3]:  # Top 3 nearest misses
        failing_reasons = []
        suggestions = []

        for check in result.failing_checks:
            failing_reasons.append(check.detail)

            # Generate actionable suggestions
            if check.rule == "income_ceiling":
                income = profile.get("annual_family_income", 0)
                ceiling = scheme.get("income_ceiling", 0)
                gap = income - ceiling
                suggestions.append(
                    f"Income exceeds ceiling by ₹{gap:,.0f}. "
                    f"If income reduces below ₹{ceiling:,.0f}, this scheme becomes available."
                )
            elif check.rule == "category_match":
                suggestions.append(
                    f"This scheme targets {scheme.get('target_category')}. "
                    f"Check if other corporations have matching schemes for '{profile.get('category')}'."
                )
            elif check.rule == "project_cost_band":
                cost = intent.get("estimated_cost", 0)
                cost_max = scheme.get("project_cost_max", 0)
                if cost > cost_max:
                    suggestions.append(
                        f"Project cost exceeds scheme limit by ₹{cost - cost_max:,.0f}. "
                        f"Consider splitting the project or exploring a higher-limit scheme."
                    )
            elif check.rule == "gender_restriction":
                suggestions.append(
                    f"This scheme is women-only. Check the general (non-gendered) "
                    f"schemes from the same corporation."
                )
            elif check.rule == "education_requirement":
                suggestions.append(
                    f"Education requirement not met. Consider skill development programs first."
                )

        near_miss_details.append({
            "scheme_id": scheme["scheme_id"],
            "scheme_name": scheme["name"],
            "corporation": scheme["corporation"],
            "failing_reasons": failing_reasons,
            "suggestions": suggestions,
            "num_failing_checks": len(result.failing_checks),
        })

    return {
        "status": "no_eligible_scheme",
        "message": (
            "Based on your profile and stated needs, no scheme fully matches at this time. "
            "Here are the closest options and what would need to change:"
        ),
        "nearest_misses": near_miss_details,
        "general_advice": [
            "Consider visiting your nearest State Channelizing Agency (SCA) for personalized guidance.",
            "Some eligibility criteria (like income) are checked annually — "
            "your situation may qualify in the next financial year.",
            "Explore complementary schemes like PMEGP, MUDRA, or state-specific programs.",
        ],
    }


def generate_full_recommendation(
    profile: dict,
    intent: dict,
    ranked_schemes: list[dict],
    ineligible_schemes: list[tuple[dict, Any]],
) -> dict:
    """
    Generate the complete recommendation output with explanations.

    Args:
        profile: Verified citizen profile.
        intent: Extracted intent.
        ranked_schemes: Output from soft_ranker.rank_schemes().
        ineligible_schemes: Ineligible (scheme, result) tuples from hard_filter.

    Returns:
        Complete recommendation dict.
    """
    if not ranked_schemes:
        return generate_no_match_explanation(
            profile, intent, ineligible_schemes[:3]
        )

    recommendations = []
    for item in ranked_schemes:
        explanation = generate_scheme_explanation(
            profile=profile,
            intent=intent,
            scheme=item["scheme"],
            filter_result=item["filter_result"],
            score_result=item["score"],
            rank=item["rank"],
        )
        recommendations.append(explanation)

    return {
        "status": "schemes_found",
        "total_eligible": len(recommendations),
        "total_ineligible": len(ineligible_schemes),
        "recommendations": recommendations,
        "profile_summary": {
            "category": profile.get("category"),
            "income": profile.get("annual_family_income"),
            "gender": profile.get("gender"),
            "verification": profile.get("verification_status"),
        },
        "intent_summary": {
            "purpose": intent.get("purpose"),
            "project_type": intent.get("project_type"),
            "estimated_cost": intent.get("estimated_cost"),
        },
    }
