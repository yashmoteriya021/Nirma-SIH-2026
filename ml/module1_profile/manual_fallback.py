"""
Module 1: Manual Fallback Path

For users without digital document access (no DigiLocker, no smartphone, etc.),
this provides the same profile schema fillable by direct user input.

Key differences from verified path:
  - verification_status is always 'self_reported'
  - verification_source is always 'manual'
  - Downstream modules will know to weight self-reported data with lower confidence.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Any

from module1_profile.staleness import check_all_staleness


# Valid values for enum fields
VALID_GENDERS = {"male", "female", "other"}
VALID_CATEGORIES = {"SC", "OBC", "SafaiKaramchari", "ManualScavenger", "WastePicker"}
VALID_EDUCATION = {
    "below_8th", "8th_pass", "10th_pass", "12th_pass",
    "graduate", "post_graduate", "professional",
}
VALID_MARITAL = {"single", "married", "widowed", "divorced"}

# All NSFDC/NBCFDC/NSKFDC loan schemes require an adult applicant.
MIN_APPLICANT_AGE = 18

# Indian state codes (ISO 3166-2:IN without 'IN-' prefix)
VALID_STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CH", "CT", "DL", "GA", "GJ",
    "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML",
    "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ", "SK", "TN",
    "TG", "TR", "UK", "UP", "WB",
}


class ValidationError(Exception):
    """Raised when manual profile input fails validation."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Validation failed: {'; '.join(errors)}")


def validate_and_build_profile(
    full_name: str,
    dob: str,
    gender: str,
    category: str,
    domicile_state: str,
    annual_family_income: float | int,
    income_certificate_issue_date: str,
    education_status: str = "below_8th",
    disability_status: dict | None = None,
    existing_loan_flag: bool = False,
    marital_status: str = "single",
    consent_given: bool = True,
    check_date: date | None = None,
    caste_certificate_issue_date: str | None = None,
) -> dict:
    """
    Validate user-provided inputs and build a self-reported profile.

    All inputs are validated for type, range, and enum correctness.
    Returns the same schema as the DigiLocker path but with
    verification_status='self_reported'.

    Args:
        full_name: Full legal name.
        dob: Date of birth as YYYY-MM-DD string.
        gender: One of 'male', 'female', 'other'.
        category: Social category enum.
        domicile_state: 2-letter Indian state code.
        annual_family_income: Income in INR.
        income_certificate_issue_date: YYYY-MM-DD string.
        education_status: Education level enum.
        disability_status: Optional dict with has_disability, disability_type, disability_percentage.
        existing_loan_flag: Whether applicant has existing loans.
        marital_status: Marital status enum.
        consent_given: Whether user has given consent for data processing.
        check_date: Date for staleness checks (defaults to today).

    Returns:
        Complete CitizenProfile dict.

    Raises:
        ValidationError: If any inputs fail validation.
    """
    errors: list[str] = []

    # --- Required field checks ---
    if not full_name or not full_name.strip():
        errors.append("full_name is required and cannot be empty")

    # DOB validation
    parsed_dob: date | None = None
    try:
        parsed_dob = date.fromisoformat(dob)
        today = check_date or date.today()
        if parsed_dob > today:
            errors.append(f"dob '{dob}' is in the future")
        elif parsed_dob.year < 1900:
            errors.append(f"dob '{dob}' is unrealistically old")
        else:
            years = today.year - parsed_dob.year - ((today.month, today.day) < (parsed_dob.month, parsed_dob.day))
            if years < MIN_APPLICANT_AGE:
                errors.append(f"Applicant must be at least {MIN_APPLICANT_AGE} years old (is {years})")
    except (ValueError, TypeError):
        errors.append(f"dob '{dob}' is not a valid date (expected YYYY-MM-DD)")

    # Enum validations
    if gender not in VALID_GENDERS:
        errors.append(f"gender '{gender}' is invalid. Must be one of: {sorted(VALID_GENDERS)}")

    if category not in VALID_CATEGORIES:
        errors.append(f"category '{category}' is invalid. Must be one of: {sorted(VALID_CATEGORIES)}")

    if domicile_state not in VALID_STATE_CODES:
        errors.append(f"domicile_state '{domicile_state}' is invalid. Must be a 2-letter Indian state code.")

    if education_status not in VALID_EDUCATION:
        errors.append(f"education_status '{education_status}' is invalid. Must be one of: {sorted(VALID_EDUCATION)}")

    if marital_status not in VALID_MARITAL:
        errors.append(f"marital_status '{marital_status}' is invalid. Must be one of: {sorted(VALID_MARITAL)}")

    # Income validation
    if not isinstance(annual_family_income, (int, float)):
        errors.append("annual_family_income must be a number")
    elif annual_family_income < 0:
        errors.append("annual_family_income cannot be negative")

    # Income cert date
    parsed_income_date: date | None = None
    try:
        parsed_income_date = date.fromisoformat(income_certificate_issue_date)
    except (ValueError, TypeError):
        errors.append(
            f"income_certificate_issue_date '{income_certificate_issue_date}' "
            "is not a valid date (expected YYYY-MM-DD)"
        )

    # Disability validation
    if disability_status is None:
        disability_status = {"has_disability": False}
    elif not isinstance(disability_status, dict):
        errors.append("disability_status must be a dict or None")
    else:
        if disability_status.get("has_disability"):
            pct = disability_status.get("disability_percentage")
            if pct is not None and (not isinstance(pct, (int, float)) or pct < 0 or pct > 100):
                errors.append("disability_percentage must be between 0 and 100")

    # Consent check
    if not consent_given:
        errors.append(
            "Consent is required for processing sensitive personal data "
            "(caste, income, disability) under DPDP Act 2023."
        )

    # --- If any errors, raise ---
    if errors:
        raise ValidationError(errors)

    # --- Build profile ---
    today = check_date or date.today()
    age = (
        today.year
        - parsed_dob.year
        - ((today.month, today.day) < (parsed_dob.month, parsed_dob.day))
    )

    is_single_woman = (
        gender == "female"
        and marital_status in ("single", "widowed", "divorced")
    )

    # Run staleness checks
    staleness = check_all_staleness(
        category=category,
        income_cert_issue_date=income_certificate_issue_date,
        caste_cert_issue_date=caste_certificate_issue_date,
        check_date=check_date,
    )

    profile = {
        "applicant_id": str(uuid.uuid4()),
        "full_name": full_name.strip(),
        "dob": dob,
        "age": age,
        "gender": gender,
        "category": category,
        "domicile_state": domicile_state,
        "annual_family_income": float(annual_family_income),
        "income_certificate_issue_date": income_certificate_issue_date,
        "caste_certificate_issue_date": caste_certificate_issue_date,
        "education_status": education_status,
        "disability_status": disability_status,
        "existing_loan_flag": existing_loan_flag,
        "marital_status": marital_status,
        "is_single_woman": is_single_woman,
        "verification_status": "self_reported",
        "verification_source": "manual",
        "needs_reverification": staleness["needs_reverification"],
        "reverification_reason": (
            "; ".join(staleness["reverification_reasons"])
            if staleness["reverification_reasons"]
            else None
        ),
        "consent_given_at": datetime.now(timezone.utc).isoformat(),
    }

    return profile
