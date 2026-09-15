"""
Module 3: Hard-Constraint Eligibility Filter

Eliminates any scheme the profile is legally/financially ineligible for.
These are strict pass/fail checks — never soft-ranked.

Recommending an ineligible scheme is a real-world harm, not just a UX miss.
"""

import json
import os
from typing import Any, NamedTuple


class FilterResult(NamedTuple):
    """Result of a single eligibility check."""
    passed: bool
    rule: str
    detail: str


class SchemeFilterResult(NamedTuple):
    """Aggregated result of all checks for one scheme."""
    scheme_id: str
    scheme_name: str
    eligible: bool
    checks: list[FilterResult]
    failing_checks: list[FilterResult]


# Load scheme knowledge base
_KB_PATH = os.path.join(os.path.dirname(__file__), "scheme_knowledge_base.json")


def load_scheme_kb() -> list[dict]:
    """Load the scheme knowledge base from JSON."""
    with open(_KB_PATH, "r") as f:
        data = json.load(f)
    return data["schemes"]


def check_category(profile: dict, scheme: dict) -> FilterResult:
    """Check if profile's category matches scheme's target categories."""
    profile_category = profile.get("category")
    target_categories = scheme.get("target_category", [])

    if profile_category in target_categories:
        return FilterResult(
            passed=True,
            rule="category_match",
            detail=f"Category '{profile_category}' is eligible for {scheme['name']} (targets: {target_categories})",
        )
    else:
        return FilterResult(
            passed=False,
            rule="category_match",
            detail=f"Category '{profile_category}' is NOT in scheme's target categories {target_categories}",
        )


def check_income_ceiling(profile: dict, scheme: dict) -> FilterResult:
    """Check if profile's income is within scheme's ceiling."""
    income = profile.get("annual_family_income", 0)
    ceiling = scheme.get("income_ceiling", float("inf"))

    if income <= ceiling:
        return FilterResult(
            passed=True,
            rule="income_ceiling",
            detail=f"Income ₹{income:,.0f} ≤ ₹{ceiling:,.0f} ceiling",
        )
    else:
        return FilterResult(
            passed=False,
            rule="income_ceiling",
            detail=f"Income ₹{income:,.0f} exceeds ₹{ceiling:,.0f} ceiling by ₹{income - ceiling:,.0f}",
        )


def check_project_cost_band(intent: dict, scheme: dict) -> FilterResult:
    """Check if estimated project cost fits within scheme's cost band."""
    cost = intent.get("estimated_cost")

    if cost is None:
        # Can't filter without cost — let it pass with a note
        return FilterResult(
            passed=True,
            rule="project_cost_band",
            detail="Project cost not specified — cannot filter by cost band (passed with caveat)",
        )

    cost_min = scheme.get("project_cost_min", 0)
    cost_max = scheme.get("project_cost_max", float("inf"))

    if cost_min <= cost <= cost_max:
        return FilterResult(
            passed=True,
            rule="project_cost_band",
            detail=f"Project cost ₹{cost:,.0f} fits within scheme band ₹{cost_min:,.0f}–₹{cost_max:,.0f}",
        )
    else:
        if cost < cost_min:
            return FilterResult(
                passed=False,
                rule="project_cost_band",
                detail=f"Project cost ₹{cost:,.0f} is below scheme minimum ₹{cost_min:,.0f}",
            )
        else:
            return FilterResult(
                passed=False,
                rule="project_cost_band",
                detail=f"Project cost ₹{cost:,.0f} exceeds scheme maximum ₹{cost_max:,.0f} by ₹{cost - cost_max:,.0f}",
            )


def check_gender_restriction(profile: dict, scheme: dict) -> FilterResult:
    """Check if profile meets scheme's gender restriction."""
    restriction = scheme.get("gender_restriction")

    if restriction is None:
        return FilterResult(
            passed=True,
            rule="gender_restriction",
            detail="No gender restriction on this scheme",
        )

    gender = profile.get("gender")
    is_single_woman = profile.get("is_single_woman", False)

    if restriction == "female":
        if gender == "female":
            return FilterResult(
                passed=True,
                rule="gender_restriction",
                detail="Women-only scheme — applicant is female ✓",
            )
        else:
            return FilterResult(
                passed=False,
                rule="gender_restriction",
                detail=f"Women-only scheme — applicant gender is '{gender}'",
            )

    if restriction == "female_single":
        if gender == "female" and is_single_woman:
            return FilterResult(
                passed=True,
                rule="gender_restriction",
                detail="Scheme for single women/widows — applicant qualifies ✓",
            )
        elif gender != "female":
            return FilterResult(
                passed=False,
                rule="gender_restriction",
                detail=f"Scheme for single women/widows — applicant gender is '{gender}'",
            )
        else:
            return FilterResult(
                passed=False,
                rule="gender_restriction",
                detail="Scheme for single women/widows — applicant is female but not single/widowed/divorced",
            )

    return FilterResult(
        passed=True,
        rule="gender_restriction",
        detail=f"Unknown gender restriction '{restriction}' — passed by default",
    )


def check_existing_loan(profile: dict, scheme: dict) -> FilterResult:
    """Check if existing loan flag conflicts with scheme restriction."""
    has_existing = profile.get("existing_loan_flag", False)
    restriction = scheme.get("existing_loan_restriction", False)

    if restriction and has_existing:
        return FilterResult(
            passed=False,
            rule="existing_loan_restriction",
            detail="Scheme restricts applicants with existing loans — applicant has existing loan",
        )
    else:
        return FilterResult(
            passed=True,
            rule="existing_loan_restriction",
            detail="No existing loan conflict",
        )


def check_education_requirement(profile: dict, scheme: dict) -> FilterResult:
    """Check if profile meets scheme's education requirement."""
    requirement = scheme.get("education_requirement")

    if requirement is None:
        return FilterResult(
            passed=True,
            rule="education_requirement",
            detail="No education requirement for this scheme",
        )

    education_levels = [
        "below_8th", "8th_pass", "10th_pass", "12th_pass",
        "graduate", "post_graduate", "professional",
    ]

    profile_edu = profile.get("education_status", "below_8th")
    required_idx = education_levels.index(requirement) if requirement in education_levels else 0
    profile_idx = education_levels.index(profile_edu) if profile_edu in education_levels else 0

    if profile_idx >= required_idx:
        return FilterResult(
            passed=True,
            rule="education_requirement",
            detail=f"Education '{profile_edu}' meets minimum requirement '{requirement}'",
        )
    else:
        return FilterResult(
            passed=False,
            rule="education_requirement",
            detail=f"Education '{profile_edu}' does not meet minimum '{requirement}' required for this scheme",
        )


def filter_scheme(profile: dict, intent: dict, scheme: dict) -> SchemeFilterResult:
    """
    Run all hard-constraint checks for a single scheme.

    Returns SchemeFilterResult with overall eligibility and per-check details.
    """
    checks = [
        check_category(profile, scheme),
        check_income_ceiling(profile, scheme),
        check_project_cost_band(intent, scheme),
        check_gender_restriction(profile, scheme),
        check_existing_loan(profile, scheme),
        check_education_requirement(profile, scheme),
    ]

    failing = [c for c in checks if not c.passed]

    return SchemeFilterResult(
        scheme_id=scheme["scheme_id"],
        scheme_name=scheme["name"],
        eligible=len(failing) == 0,
        checks=checks,
        failing_checks=failing,
    )


def filter_all_schemes(
    profile: dict,
    intent: dict,
    schemes: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Filter all schemes against a profile + intent.

    Returns:
        dict with:
          - eligible_schemes: list of (scheme, SchemeFilterResult) for passing schemes
          - ineligible_schemes: list of (scheme, SchemeFilterResult) for failing schemes
          - nearest_misses: for ineligible schemes, the ones closest to qualifying
    """
    if schemes is None:
        schemes = load_scheme_kb()

    eligible = []
    ineligible = []

    for scheme in schemes:
        result = filter_scheme(profile, intent, scheme)
        if result.eligible:
            eligible.append((scheme, result))
        else:
            ineligible.append((scheme, result))

    # Sort ineligible by number of failing checks (fewer = closer to qualifying)
    ineligible.sort(key=lambda x: len(x[1].failing_checks))

    return {
        "eligible_schemes": eligible,
        "ineligible_schemes": ineligible,
        "nearest_misses": ineligible[:3] if ineligible else [],
    }
