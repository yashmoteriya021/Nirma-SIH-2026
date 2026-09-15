"""
Tests for Module 1: Verified Profile Acquisition

Test cases cover:
  1. Happy path: DigiLocker verified SC male profile
  2. DigiLocker verified OBC widowed woman (is_single_woman derived)
  3. Stale income certificate detection
  4. Manual fallback with missing required fields (ValidationError)
  5. Manual fallback with boundary age (18 years old exactly)
  6. OBC-NCL certificate expiry check
  7. Consent requirement enforcement
  8. Invalid auth code handling
"""

import pytest
from datetime import date

from module1_profile.verification_service import (
    build_verified_profile,
    initiate_auth,
    exchange_token,
    fetch_documents,
)
from module1_profile.manual_fallback import (
    validate_and_build_profile,
    ValidationError,
)
from module1_profile.staleness import (
    check_income_certificate_staleness,
    check_caste_certificate_staleness,
    check_all_staleness,
    StalenessResult,
)


class TestDigiLockerVerification:
    """Test the mock DigiLocker OAuth flow."""

    def test_happy_path_sc_male(self):
        """TC1: Verified SC male — clean profile, no staleness."""
        profile = build_verified_profile(
            "AUTH_CODE_RAMESH",
            check_date=date(2026, 9, 14),
        )
        assert "error" not in profile
        assert profile["full_name"] == "Ramesh Kumar"
        assert profile["category"] == "SC"
        assert profile["gender"] == "male"
        assert profile["verification_status"] == "verified"
        assert profile["verification_source"] == "digilocker"
        assert profile["annual_family_income"] == 320000
        assert profile["age"] == 36  # born 1990-05-15, check 2026-09-14
        assert profile["is_single_woman"] is False
        assert profile["needs_reverification"] is False
        assert profile["consent_given_at"] is not None

    def test_obc_widowed_woman(self):
        """TC2: OBC widowed woman — is_single_woman should be True."""
        profile = build_verified_profile(
            "AUTH_CODE_PRIYA",
            check_date=date(2026, 9, 14),
        )
        assert profile["gender"] == "female"
        assert profile["category"] == "OBC"
        assert profile["marital_status"] == "widowed"
        assert profile["is_single_woman"] is True
        assert profile["verification_status"] == "verified"

    def test_stale_income_certificate(self):
        """TC3: Income cert from 2024 should trigger reverification."""
        profile = build_verified_profile(
            "AUTH_CODE_EXPIRED_CERT",
            check_date=date(2026, 9, 14),
        )
        assert profile["needs_reverification"] is True
        assert "expired" in profile["reverification_reason"].lower() or "past" in profile["reverification_reason"].lower()
        # This user also has existing_loan_flag=True
        assert profile["existing_loan_flag"] is True

    def test_invalid_auth_code(self):
        """TC4: Invalid auth code returns error."""
        result = build_verified_profile("INVALID_CODE")
        assert "error" in result
        assert result["error"] == "invalid_grant"

    def test_safai_karamchari_with_disability(self):
        """TC5: SafaiKaramchari with disability — special fields populated."""
        profile = build_verified_profile(
            "AUTH_CODE_SURESH",
            check_date=date(2026, 9, 14),
        )
        assert profile["category"] == "SafaiKaramchari"
        assert profile["disability_status"]["has_disability"] is True
        assert profile["disability_status"]["disability_type"] == "locomotor"
        assert profile["disability_status"]["disability_percentage"] == 45


class TestManualFallback:
    """Test the manual input path."""

    def test_valid_manual_profile(self):
        """TC6: Valid manual input produces self_reported profile."""
        profile = validate_and_build_profile(
            full_name="Kavita Kumari",
            dob="2000-06-15",
            gender="female",
            category="SC",
            domicile_state="BR",
            annual_family_income=200000,
            income_certificate_issue_date="2026-07-01",
            education_status="12th_pass",
            marital_status="single",
            check_date=date(2026, 9, 14),
        )
        assert profile["verification_status"] == "self_reported"
        assert profile["verification_source"] == "manual"
        assert profile["is_single_woman"] is True
        assert profile["age"] == 26

    def test_missing_required_fields(self):
        """TC7: Empty name raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            validate_and_build_profile(
                full_name="",
                dob="1990-01-01",
                gender="male",
                category="SC",
                domicile_state="UP",
                annual_family_income=300000,
                income_certificate_issue_date="2026-04-01",
            )
        assert "full_name" in str(exc_info.value)

    def test_boundary_age_exactly_18(self):
        """TC8: Person turning 18 exactly on check date."""
        profile = validate_and_build_profile(
            full_name="Young Applicant",
            dob="2008-09-14",
            gender="male",
            category="SC",
            domicile_state="TN",
            annual_family_income=100000,
            income_certificate_issue_date="2026-08-01",
            check_date=date(2026, 9, 14),
        )
        assert profile["age"] == 18

    def test_consent_required(self):
        """TC9: Consent=False raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            validate_and_build_profile(
                full_name="No Consent User",
                dob="1990-01-01",
                gender="male",
                category="SC",
                domicile_state="UP",
                annual_family_income=300000,
                income_certificate_issue_date="2026-04-01",
                consent_given=False,
            )
        assert "consent" in str(exc_info.value).lower()

    def test_invalid_state_code(self):
        """TC10: Invalid state code is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            validate_and_build_profile(
                full_name="Bad State",
                dob="1990-01-01",
                gender="male",
                category="SC",
                domicile_state="XX",
                annual_family_income=300000,
                income_certificate_issue_date="2026-04-01",
            )
        assert "domicile_state" in str(exc_info.value)


class TestStaleness:
    """Test certificate staleness checks."""

    def test_income_cert_valid_same_fy(self):
        """Income cert issued Apr 2026 checked Sep 2026 — still valid (FY ends Mar 2027)."""
        result = check_income_certificate_staleness(
            issue_date="2026-04-10",
            check_date=date(2026, 9, 14),
        )
        assert result.needs_reverification is False

    def test_income_cert_stale_past_fy(self):
        """Income cert issued Jun 2024, checked Sep 2026 — stale (FY ended Mar 2025)."""
        result = check_income_certificate_staleness(
            issue_date="2024-06-15",
            check_date=date(2026, 9, 14),
        )
        assert result.needs_reverification is True

    def test_sc_cert_lifetime(self):
        """SC certificate never expires."""
        result = check_caste_certificate_staleness(
            category="SC",
            issue_date="2010-01-01",
            check_date=date(2026, 9, 14),
        )
        assert result.needs_reverification is False

    def test_obc_cert_annual_renewal(self):
        """OBC cert from Apr 2025 should be expired by Sep 2026 (FY ended Mar 2026)."""
        result = check_caste_certificate_staleness(
            category="OBC",
            issue_date="2025-04-01",
            check_date=date(2026, 9, 14),
        )
        assert result.needs_reverification is True

    def test_obc_cert_valid_current_fy(self):
        """OBC cert from Jun 2026, checked Sep 2026 — still valid."""
        result = check_caste_certificate_staleness(
            category="OBC",
            issue_date="2026-06-01",
            check_date=date(2026, 9, 14),
        )
        assert result.needs_reverification is False


class TestCasteCertificatePassThrough:
    """Regression: OBC profiles were always flagged because the caste
    certificate date never reached the staleness check."""

    def test_obc_digilocker_with_fresh_cert_not_flagged(self):
        profile = build_verified_profile("AUTH_CODE_PRIYA", check_date=date(2026, 9, 14))
        assert profile["category"] == "OBC"
        assert profile["needs_reverification"] is False
        assert profile["reverification_reason"] is None

    def test_obc_manual_with_expired_cert_flagged(self):
        from module1_profile.manual_fallback import validate_and_build_profile

        profile = validate_and_build_profile(
            full_name="Test OBC",
            dob="1990-01-01",
            gender="male",
            category="OBC",
            domicile_state="MH",
            annual_family_income=200000,
            income_certificate_issue_date="2026-06-01",
            caste_certificate_issue_date="2025-04-01",
            check_date=date(2026, 9, 14),
        )
        assert profile["needs_reverification"] is True
        assert "OBC" in profile["reverification_reason"]

    def test_obc_manual_without_cert_date_flagged_with_reason(self):
        from module1_profile.manual_fallback import validate_and_build_profile

        profile = validate_and_build_profile(
            full_name="Test OBC",
            dob="1990-01-01",
            gender="male",
            category="OBC",
            domicile_state="MH",
            annual_family_income=200000,
            income_certificate_issue_date="2026-06-01",
            check_date=date(2026, 9, 14),
        )
        assert profile["needs_reverification"] is True
        assert "missing" in profile["reverification_reason"].lower()
