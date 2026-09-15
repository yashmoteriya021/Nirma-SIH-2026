"""
Module 3: Soft Ranking Engine

Among eligible schemes (after hard-filter), ranks by weighted fit score.
All weights are documented constants, easily tunable.

Ranking factors:
  - Purpose alignment (0.35): Does stated purpose match scheme's purpose_types?
  - Cost-band fit (0.25): How well does project cost sit within the scheme band?
  - Interest rate (0.20): Lower rate = higher score (direct financial benefit)
  - Gender/special benefits (0.10): Extra score if women-specific rebates apply
  - Verification confidence (0.10): Verified profile scores higher than self-reported
"""

from typing import Any


# --- Documented ranking weights ---
# These are the default weights. They can be overridden by passing a custom
# weights dict to rank_schemes(). The rationale for each weight is documented
# in research_notes_matching.md and assumptions.md.

DEFAULT_WEIGHTS = {
    "purpose_alignment": 0.45,   # Most important: does the scheme fit the need?
    "cost_band_fit": 0.30,       # Second: is the cost in the sweet spot of the band?
    "interest_rate": 0.25,       # Third: lower effective rate = better deal for the citizen
}
# Note: gender benefits and verification confidence are NOT ranking weights.
# They are constant for a given applicant across every scheme, so they could
# never change the order — only inflate every score equally. The women's
# rebate does affect ranking through the *effective* interest rate, and both
# facts are still surfaced in the explanation (see `profile_notes`).

# Interest rate range for normalization (researched min/max across all schemes)
MIN_INTEREST_RATE = 4.0   # Education loans
MAX_INTEREST_RATE = 9.0   # Upper NSKFDC range


def _score_purpose_alignment(intent: dict, scheme: dict) -> float:
    """
    Score how well the intent's purpose aligns with the scheme.
    1.0 = exact match, 0.0 = no match.
    """
    purpose = intent.get("purpose")
    scheme_purposes = scheme.get("purpose_types", [])

    if purpose in scheme_purposes:
        return 1.0

    # Partial credit for related purposes
    related_map = {
        "business_start": {"business_expansion": 0.5},
        "business_expansion": {"business_start": 0.5},
        "vehicle_livelihood": {"business_start": 0.3},
        "agriculture_allied": {"business_start": 0.3},
    }

    related = related_map.get(purpose, {})
    for sp in scheme_purposes:
        if sp in related:
            return related[sp]

    return 0.0


def _score_cost_band_fit(intent: dict, scheme: dict) -> float:
    """
    Score how well the project cost fits within the scheme's band.
    Center of band = 1.0, edges = 0.5, outside = 0.0.
    """
    cost = intent.get("estimated_cost")
    if cost is None:
        return 0.5  # Neutral if no cost specified

    cost_min = scheme.get("project_cost_min", 0)
    cost_max = scheme.get("project_cost_max", float("inf"))

    if cost_max == float("inf"):
        return 0.5  # Can't score against unbounded band

    if cost < cost_min or cost > cost_max:
        return 0.0  # Should have been filtered by hard_filter, but safety check

    # Normalize: 0 at edges, 1 at center
    band_width = cost_max - cost_min
    if band_width == 0:
        return 1.0

    # Distance from center of band, normalized
    center = (cost_min + cost_max) / 2
    distance_from_center = abs(cost - center) / (band_width / 2)

    # Score: 1.0 at center, 0.5 at edges
    return max(0.5, 1.0 - 0.5 * distance_from_center)


def effective_interest_rate(profile: dict, intent: dict, scheme: dict) -> float:
    """
    The rate this applicant would actually pay:
      - tiered schemes use the tier matching the requested amount
        (lowest tier when the amount is unknown),
      - women's rebate is subtracted where the scheme offers one.
    """
    rate = scheme.get("interest_rate", MAX_INTEREST_RATE)
    tiers = scheme.get("interest_rate_tiers") or []
    cost = intent.get("estimated_cost")
    if tiers:
        ordered = sorted(tiers, key=lambda t: t["max_amount"])
        rate = ordered[0]["rate"]
        if cost is not None:
            for tier in ordered:
                if cost <= tier["max_amount"]:
                    rate = tier["rate"]
                    break
            else:
                rate = ordered[-1]["rate"]
    if profile.get("gender") == "female" and rate >= 0:
        rate = max(rate - scheme.get("interest_rebate_women", 0) or 0, 0)
    return rate


def _score_interest_rate(profile: dict, intent: dict, scheme: dict) -> float:
    """
    Score based on the applicant's effective interest rate. Lower = better.
    Normalized to [0, 1] range based on researched min/max.
    """
    rate = effective_interest_rate(profile, intent, scheme)

    # VISVAS is special — negative rate means subvention
    if rate < 0:
        return 1.0

    # Normalize: lower rate = higher score
    if rate <= MIN_INTEREST_RATE:
        return 1.0
    if rate >= MAX_INTEREST_RATE:
        return 0.0

    return (MAX_INTEREST_RATE - rate) / (MAX_INTEREST_RATE - MIN_INTEREST_RATE)


def _profile_notes(profile: dict, scheme: dict) -> list[str]:
    """
    Applicant-level facts worth showing next to the score. These do not
    influence ranking (see note on DEFAULT_WEIGHTS).
    """
    notes = []
    if profile.get("gender") == "female":
        if scheme.get("gender_restriction") in ("female", "female_single"):
            notes.append("Scheme is designed specifically for women")
        elif scheme.get("interest_rebate_women", 0) > 0:
            notes.append(f"Women get a {scheme['interest_rebate_women']}% interest rebate on this scheme")

    status = profile.get("verification_status")
    if status == "verified" and profile.get("needs_reverification"):
        notes.append("Verified profile but a certificate needs renewal before applying")
    elif status == "self_reported":
        notes.append("Self-reported profile — documents will be verified by the channel partner")
    return notes


def compute_scheme_score(
    profile: dict,
    intent: dict,
    scheme: dict,
    weights: dict | None = None,
) -> dict[str, Any]:
    """
    Compute a weighted fit score for a single eligible scheme.

    Args:
        profile: Verified citizen profile.
        intent: Extracted intent.
        scheme: Scheme record from knowledge base.
        weights: Optional custom weights (defaults to DEFAULT_WEIGHTS).

    Returns:
        dict with total score, per-factor scores, and factor details.
    """
    w = weights or DEFAULT_WEIGHTS

    factors = {
        "purpose_alignment": {
            "score": _score_purpose_alignment(intent, scheme),
            "weight": w["purpose_alignment"],
        },
        "cost_band_fit": {
            "score": _score_cost_band_fit(intent, scheme),
            "weight": w["cost_band_fit"],
        },
        "interest_rate": {
            "score": _score_interest_rate(profile, intent, scheme),
            "weight": w["interest_rate"],
        },
    }

    total_score = sum(
        f["score"] * f["weight"] for f in factors.values()
    )

    return {
        "scheme_id": scheme["scheme_id"],
        "total_score": round(total_score, 4),
        "factors": factors,
        "effective_interest_rate": effective_interest_rate(profile, intent, scheme),
        "profile_notes": _profile_notes(profile, scheme),
    }


def rank_schemes(
    profile: dict,
    intent: dict,
    eligible_schemes: list[tuple[dict, Any]],
    weights: dict | None = None,
) -> list[dict]:
    """
    Rank eligible schemes by weighted fit score.

    Args:
        profile: Verified citizen profile.
        intent: Extracted intent.
        eligible_schemes: List of (scheme_dict, filter_result) tuples from hard_filter.
        weights: Optional custom weights.

    Returns:
        List of ranked scheme results, sorted by score descending.
    """
    scored = []
    for scheme, filter_result in eligible_schemes:
        score_result = compute_scheme_score(profile, intent, scheme, weights)
        scored.append({
            "scheme": scheme,
            "filter_result": filter_result,
            "score": score_result,
        })

    # Sort by total score, descending
    scored.sort(key=lambda x: x["score"]["total_score"], reverse=True)

    # Add rank
    for i, item in enumerate(scored):
        item["rank"] = i + 1

    return scored
