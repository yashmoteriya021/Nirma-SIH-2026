"""
FastAPI service exposing the SIH PS 26092 ML pipeline.

Run from the `ml/` directory:
    uvicorn service.app:app --reload --port 8000

The Express backend proxies to these routes under /api/ai/*.
"""

import os
import sys
from pathlib import Path

# Make the module packages importable regardless of the working directory.
_ML_ROOT = Path(__file__).resolve().parent.parent
if str(_ML_ROOT) not in sys.path:
    sys.path.insert(0, str(_ML_ROOT))

from dotenv import load_dotenv

load_dotenv(_ML_ROOT / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from module1_profile.manual_fallback import ValidationError, validate_and_build_profile
from module1_profile.verification_service import build_verified_profile
from module2_intent.llm_extractor import LLMConfig
from module3_matching.explainer import generate_full_recommendation
from module3_matching.hard_filter import filter_all_schemes, load_scheme_kb
from module3_matching.soft_ranker import rank_schemes
from module4_partners.partner_ranker import load_partner_dataset, rank_partners
from service.schemas import (
    HealthResponse,
    IntentTurnRequest,
    IntentTurnResponse,
    ManualProfileRequest,
    MatchRequest,
    MockDigiLockerRequest,
    PartnerRankRequest,
)
from service.sessions import SessionStore

app = FastAPI(
    title="SchemeSetu ML Service",
    version="1.0.0",
    description="Verified profile → intent extraction → explainable scheme matching → partner routing",
)

_origins = [o.strip() for o in os.environ.get("ML_CORS_ORIGINS", "http://localhost:5173,http://localhost:5000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = SessionStore()

_SCHEMES = load_scheme_kb()
_FRONTEND_TO_ML = {s["frontend_id"]: s["scheme_id"] for s in _SCHEMES if s.get("frontend_id")}
_ML_IDS = {s["scheme_id"] for s in _SCHEMES}


# --------------------------------------------------------------------------
# Health / reference data
# --------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health():
    cfg = LLMConfig.from_env()
    return HealthResponse(
        status="ok",
        llm_provider=cfg.provider,
        llm_enabled=cfg.enabled,
        schemes=len(_SCHEMES),
        partners=len(load_partner_dataset()),
    )


@app.get("/schemes")
def list_schemes():
    """Scheme knowledge base with the frontend page mapping."""
    return {
        "count": len(_SCHEMES),
        "schemes": _SCHEMES,
        "frontend_to_ml": _FRONTEND_TO_ML,
    }


# --------------------------------------------------------------------------
# Module 1
# --------------------------------------------------------------------------

@app.post("/profile/manual")
def profile_manual(req: ManualProfileRequest):
    payload = req.model_dump()
    if payload.get("disability_status") is None:
        payload["disability_status"] = {"has_disability": False}
    try:
        return validate_and_build_profile(**payload)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail={"errors": e.errors})


@app.post("/profile/mock-digilocker")
def profile_mock_digilocker(req: MockDigiLockerRequest):
    profile = build_verified_profile(req.auth_code)
    if "error" in profile:
        raise HTTPException(status_code=400, detail={"errors": [profile["message"]]})
    return profile


# --------------------------------------------------------------------------
# Module 2
# --------------------------------------------------------------------------

@app.post("/intent/turn", response_model=IntentTurnResponse)
def intent_turn(req: IntentTurnRequest):
    session_id, session = sessions.get_or_create(req.session_id, req.profile, req.language)
    result = session.process_input(req.text)
    method = result["intent"].get("extraction_method") or (
        "llm" if "llm" in session.extraction_methods else "offline_rules"
    )
    return IntentTurnResponse(
        session_id=session_id,
        complete=result["complete"],
        turn=result["turn"],
        intent=result["intent"],
        follow_up_question=result.get("follow_up_question"),
        confirmation_summary=result.get("confirmation_summary"),
        cost_hint=result.get("cost_hint"),
        extraction_method=method,
    )


@app.delete("/intent/session/{session_id}")
def intent_reset(session_id: str):
    sessions.drop(session_id)
    return {"dropped": session_id}


# --------------------------------------------------------------------------
# Module 3
# --------------------------------------------------------------------------

@app.post("/match")
def match(req: MatchRequest):
    if "category" not in req.profile or "annual_family_income" not in req.profile:
        raise HTTPException(status_code=400, detail={"errors": ["profile needs category and annual_family_income"]})
    filter_results = filter_all_schemes(req.profile, req.intent)
    ranked = rank_schemes(req.profile, req.intent, filter_results["eligible_schemes"])
    return generate_full_recommendation(
        req.profile, req.intent, ranked, filter_results["ineligible_schemes"]
    )


# --------------------------------------------------------------------------
# Module 4
# --------------------------------------------------------------------------

@app.post("/partners/rank")
def partners_rank(req: PartnerRankRequest):
    scheme_id = req.scheme_id
    if not scheme_id and req.frontend_scheme_id:
        scheme_id = _FRONTEND_TO_ML.get(req.frontend_scheme_id)
        if not scheme_id:
            raise HTTPException(
                status_code=404,
                detail={"errors": [f"No ML scheme mapped to frontend id '{req.frontend_scheme_id}'"]},
            )
    if not scheme_id:
        raise HTTPException(status_code=400, detail={"errors": ["scheme_id or frontend_scheme_id required"]})
    if scheme_id not in _ML_IDS:
        raise HTTPException(status_code=404, detail={"errors": [f"Unknown scheme_id '{scheme_id}'"]})
    if req.lat is None and req.lon is None and not req.pin_code:
        raise HTTPException(status_code=400, detail={"errors": ["Provide lat/lon or a 6-digit pin_code"]})

    return rank_partners(
        scheme_id=scheme_id,
        user_lat=req.lat,
        user_lon=req.lon,
        user_pin_code=req.pin_code,
        max_distance_km=req.max_distance_km,
    )
