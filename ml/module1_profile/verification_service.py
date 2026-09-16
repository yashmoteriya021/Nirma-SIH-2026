"""
Module 1: Mock DigiLocker Verification Service

Simulates the DigiLocker OAuth 2.0 / OpenID Connect flow for third-party apps.
This is a clearly-labeled stand-in — no real government API is called.

The real DigiLocker flow (researched from partners.apisetu.gov.in):
  1. Register as Requester on DigiLocker Partner Portal
  2. Obtain Client ID + Client Secret, configure Redirect URI
  3. Redirect user to DigiLocker consent page
  4. User authenticates (Aadhaar/mobile + OTP), grants document access
  5. DigiLocker redirects back with authorization code
  6. Exchange auth code for access token
  7. Use access token to fetch user's documents (digitally signed by issuers)

This mock preserves the same flow shape but returns synthetic data.
No raw document images are stored — only derived structured fields.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Any

from module1_profile.staleness import check_all_staleness


# ---------------------------------------------------------------------------
# Mock OAuth flow
# ---------------------------------------------------------------------------

# Simulated auth codes → user data mapping
_MOCK_USERS: dict[str, dict[str, Any]] = {
    "AUTH_CODE_RAMESH": {
        "full_name": "Ramesh Kumar",
        "dob": "1990-05-15",
        "gender": "male",
        "category": "SC",
        "domicile_state": "UP",
        "annual_family_income": 320000,
        "income_certificate_issue_date": "2026-04-10",
        "education_status": "10th_pass",
        "disability_status": {"has_disability": False},
        "existing_loan_flag": False,
        "marital_status": "married",
    },
    "AUTH_CODE_PRIYA": {
        "full_name": "Priya Devi",
        "dob": "1985-11-22",
        "gender": "female",
        "category": "OBC",
        "domicile_state": "MH",
        "annual_family_income": 480000,
        "income_certificate_issue_date": "2026-06-01",
        "caste_certificate_issue_date": "2026-05-15",
        "education_status": "graduate",
        "disability_status": {"has_disability": False},
        "existing_loan_flag": False,
        "marital_status": "widowed",
    },
    "AUTH_CODE_SURESH": {
        "full_name": "Suresh Valmiki",
        "dob": "1978-03-08",
        "gender": "male",
        "category": "SafaiKaramchari",
        "domicile_state": "RJ",
        "annual_family_income": 180000,
        "income_certificate_issue_date": "2025-07-20",
        "education_status": "8th_pass",
        "disability_status": {
            "has_disability": True,
            "disability_type": "locomotor",
            "disability_percentage": 45,
        },
        "existing_loan_flag": False,
        "marital_status": "married",
    },
    "AUTH_CODE_ANITA": {
        "full_name": "Anita Paswan",
        "dob": "1995-08-30",
        "gender": "female",
        "category": "SC",
        "domicile_state": "BR",
        "annual_family_income": 150000,
        "income_certificate_issue_date": "2026-05-12",
        "education_status": "12th_pass",
        "disability_status": {"has_disability": False},
        "existing_loan_flag": False,
        "marital_status": "single",
    },
    "AUTH_CODE_EXPIRED_CERT": {
        "full_name": "Mohan Jatav",
        "dob": "1982-01-10",
        "gender": "male",
        "category": "SC",
        "domicile_state": "MP",
        "annual_family_income": 250000,
        "income_certificate_issue_date": "2024-06-15",
        "education_status": "below_8th",
        "disability_status": {"has_disability": False},
        "existing_loan_flag": True,
        "marital_status": "married",
    },
}

# Simulated token store
_MOCK_TOKENS: dict[str, str] = {}


def initiate_auth(client_id: str = "MOCK_CLIENT", redirect_uri: str = "http://localhost/callback") -> dict:
    """
    Step 1: Initiate the DigiLocker OAuth flow.

    Returns a mock authorization URL that the user would be redirected to.
    In a real integration, this hits DigiLocker's authorize endpoint.
    """
    return {
        "authorization_url": (
            f"https://mock-digilocker.example.com/authorize"
            f"?client_id={client_id}&redirect_uri={redirect_uri}"
            f"&response_type=code&scope=documents"
        ),
        "note": "MOCK: Redirect the user to this URL. They will authenticate and consent.",
    }


def exchange_token(auth_code: str) -> dict:
    """
    Step 2: Exchange authorization code for access token.

    Args:
        auth_code: The authorization code from DigiLocker callback.

    Returns:
        dict with access_token or error.
    """
    if auth_code not in _MOCK_USERS:
        return {
            "error": "invalid_grant",
            "message": f"Authorization code '{auth_code}' is invalid or expired.",
        }

    # Generate a mock access token
    token = f"MOCK_TOKEN_{uuid.uuid4().hex[:12]}"
    _MOCK_TOKENS[token] = auth_code
    return {
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 3600,
        "note": "MOCK: This token is synthetic. No real DigiLocker API was called.",
    }


def fetch_documents(access_token: str) -> dict:
    """
    Step 3: Fetch user's verified documents using the access token.

    Returns structured profile fields derived from mock DigiLocker documents.
    No raw document images are stored — only the derived structured data.

    Args:
        access_token: Bearer token from exchange_token().

    Returns:
        dict with verified profile data or error.
    """
    if access_token not in _MOCK_TOKENS:
        return {
            "error": "invalid_token",
            "message": "Access token is invalid or expired.",
        }

    auth_code = _MOCK_TOKENS[access_token]
    user_data = _MOCK_USERS[auth_code].copy()

    return {
        "status": "success",
        "documents_fetched": [
            "caste_certificate",
            "income_certificate",
            "aadhaar_linked_identity",
        ],
        "profile_data": user_data,
        "note": "MOCK: Data derived from simulated digitally-signed documents.",
    }


def build_verified_profile(
    auth_code: str,
    check_date: date | None = None,
) -> dict:
    """
    Complete the full mock DigiLocker verification flow and return a
    ready-to-use verified profile.

    This is the main entry point that chains:
      initiate_auth → exchange_token → fetch_documents → staleness check → profile

    Args:
        auth_code: Mock authorization code (e.g., 'AUTH_CODE_RAMESH').
        check_date: Date to use for staleness checks (defaults to today).

    Returns:
        Complete CitizenProfile dict with verification_status='verified'.
    """
    # Exchange token
    token_result = exchange_token(auth_code)
    if "error" in token_result:
        return {"error": token_result["error"], "message": token_result["message"]}

    access_token = token_result["access_token"]

    # Fetch documents
    doc_result = fetch_documents(access_token)
    if "error" in doc_result:
        return {"error": doc_result["error"], "message": doc_result["message"]}

    profile_data = doc_result["profile_data"]

    # Compute derived fields
    dob = date.fromisoformat(profile_data["dob"])
    today = check_date or date.today()
    age = (
        today.year
        - dob.year
        - ((today.month, today.day) < (dob.month, dob.day))
    )

    is_single_woman = (
        profile_data["gender"] == "female"
        and profile_data.get("marital_status") in ("single", "widowed", "divorced")
    )

    # Run staleness checks
    staleness = check_all_staleness(
        category=profile_data["category"],
        income_cert_issue_date=profile_data["income_certificate_issue_date"],
        caste_cert_issue_date=profile_data.get("caste_certificate_issue_date"),
        check_date=check_date,
    )

    # Build full profile
    profile = {
        "applicant_id": str(uuid.uuid4()),
        **profile_data,
        "age": age,
        "is_single_woman": is_single_woman,
        "verification_status": "verified",
        "verification_source": "digilocker",
        "needs_reverification": staleness["needs_reverification"],
        "reverification_reason": "; ".join(staleness["reverification_reasons"]) if staleness["reverification_reasons"] else None,
        "consent_given_at": datetime.now(timezone.utc).isoformat(),
    }

    return profile
