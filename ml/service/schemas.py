"""
Pydantic request/response models for the ML service.

These are the integration contract between the Express backend and the
Python pipeline. Field names mirror the module JSON schemas exactly.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field


Category = Literal["SC", "OBC", "SafaiKaramchari", "ManualScavenger", "WastePicker"]
Gender = Literal["male", "female", "other"]
Education = Literal[
    "below_8th", "8th_pass", "10th_pass", "12th_pass", "graduate", "post_graduate", "professional"
]
Marital = Literal["single", "married", "widowed", "divorced"]


# --------------------------------------------------------------------------
# Module 1 — profile
# --------------------------------------------------------------------------

class DisabilityStatus(BaseModel):
    has_disability: bool = False
    disability_type: str | None = None
    disability_percentage: float | None = None


class ManualProfileRequest(BaseModel):
    full_name: str = Field(min_length=2)
    dob: str = Field(description="YYYY-MM-DD")
    gender: Gender
    category: Category
    domicile_state: str = Field(min_length=2, max_length=2, description="Two-letter state code, e.g. UP")
    annual_family_income: float = Field(ge=0)
    income_certificate_issue_date: str = Field(description="YYYY-MM-DD")
    caste_certificate_issue_date: str | None = Field(default=None, description="YYYY-MM-DD; needed for OBC")
    education_status: Education = "below_8th"
    disability_status: DisabilityStatus | None = None
    existing_loan_flag: bool = False
    marital_status: Marital = "single"
    consent_given: bool = True


class MockDigiLockerRequest(BaseModel):
    auth_code: str = Field(description="Demo auth code, e.g. AUTH_CODE_RAMESH")


# --------------------------------------------------------------------------
# Module 2 — intent
# --------------------------------------------------------------------------

class IntentTurnRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    profile: dict[str, Any] = Field(default_factory=dict, description="CitizenProfile from /profile/*")
    session_id: str | None = Field(default=None, description="Omit to start a new conversation")
    language: Literal["en", "hi"] = "en"


class IntentTurnResponse(BaseModel):
    session_id: str
    complete: bool
    turn: int
    intent: dict[str, Any]
    follow_up_question: str | None = None
    confirmation_summary: str | None = None
    cost_hint: str | None = None
    extraction_method: str


# --------------------------------------------------------------------------
# Module 3 — matching
# --------------------------------------------------------------------------

class MatchRequest(BaseModel):
    profile: dict[str, Any]
    intent: dict[str, Any]


# --------------------------------------------------------------------------
# Module 4 — partners
# --------------------------------------------------------------------------

class PartnerRankRequest(BaseModel):
    scheme_id: str | None = Field(default=None, description="ML scheme id, e.g. NSFDC_MCF")
    frontend_scheme_id: str | None = Field(default=None, description="Frontend page id, e.g. micro-finance")
    lat: float | None = None
    lon: float | None = None
    pin_code: str | None = Field(default=None, pattern=r"^\d{6}$")
    max_distance_km: float = Field(default=100.0, gt=0, le=2000)


class HealthResponse(BaseModel):
    status: str
    llm_provider: str
    llm_enabled: bool
    schemes: int
    partners: int
