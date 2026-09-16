"""End-to-end tests for the FastAPI service (offline, no LLM)."""

import pytest
from fastapi.testclient import TestClient

from service.app import app

client = TestClient(app)


def _profile():
    r = client.post("/profile/manual", json={
        "full_name": "Ramesh Kumar",
        "dob": "1990-05-10",
        "gender": "male",
        "category": "SC",
        "domicile_state": "UP",
        "annual_family_income": 320000,
        "income_certificate_issue_date": "2026-06-01",
        "education_status": "10th_pass",
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["schemes"] == 13
    assert body["llm_enabled"] is False


def test_schemes_mapping():
    body = client.get("/schemes").json()
    assert body["frontend_to_ml"]["micro-finance"] == "NSFDC_MCF"


def test_profile_validation_error():
    r = client.post("/profile/manual", json={
        "full_name": "X Y", "dob": "2015-01-01", "gender": "male", "category": "SC",
        "domicile_state": "UP", "annual_family_income": 100000,
        "income_certificate_issue_date": "2026-06-01",
    })
    assert r.status_code == 400
    assert any("18" in e for e in r.json()["detail"]["errors"])


def test_mock_digilocker():
    r = client.post("/profile/mock-digilocker", json={"auth_code": "AUTH_CODE_RAMESH"})
    assert r.status_code == 200
    assert r.json()["verification_status"] == "verified"
    bad = client.post("/profile/mock-digilocker", json={"auth_code": "NOPE"})
    assert bad.status_code == 400


def test_full_flow_manual_profile_to_partners():
    profile = _profile()

    # Turn 1: vague → follow-up
    r = client.post("/intent/turn", json={"text": "mujhe 80 hazar chahiye", "profile": profile})
    assert r.status_code == 200
    t1 = r.json()
    assert t1["complete"] is False
    assert t1["follow_up_question"]
    sid = t1["session_id"]

    # Turn 2: same session, purpose provided
    r = client.post("/intent/turn", json={"text": "silai ki dukaan kholni hai", "profile": profile, "session_id": sid})
    t2 = r.json()
    assert t2["session_id"] == sid
    assert t2["complete"] is True
    assert t2["intent"]["estimated_cost"] == 80000
    assert t2["intent"]["project_type"] == "tailoring shop"
    assert t2["extraction_method"] == "offline_rules"

    # Match
    r = client.post("/match", json={"profile": profile, "intent": t2["intent"]})
    assert r.status_code == 200
    m = r.json()
    assert m["status"] == "schemes_found"
    top = m["recommendations"][0]
    assert top["scheme_id"] == "NSFDC_MCF"
    assert top["frontend_id"] == "micro-finance"
    assert top["explanation"]["eligible_because"]

    # Partners via frontend id + PIN
    r = client.post("/partners/rank", json={"frontend_scheme_id": top["frontend_id"], "pin_code": "226001"})
    assert r.status_code == 200
    p = r.json()
    assert p["status"] == "partners_found"
    assert p["ranked_partners"][0]["reason"]


def test_partners_validation():
    assert client.post("/partners/rank", json={"scheme_id": "NSFDC_MCF"}).status_code == 400
    assert client.post("/partners/rank", json={"frontend_scheme_id": "tech-startup", "pin_code": "226001"}).status_code == 404
    assert client.post("/partners/rank", json={"scheme_id": "NOPE", "pin_code": "226001"}).status_code == 404
    r = client.post("/partners/rank", json={"scheme_id": "NSFDC_MCF", "lat": 26.85, "lon": 80.95})
    assert r.status_code == 200
    assert r.json()["location_used"]["source"] == "gps"


def test_no_match_case_is_helpful():
    profile = _profile()
    profile["annual_family_income"] = 900000
    intent = {"purpose": "business_start", "estimated_cost": 80000, "beneficiary": "self"}
    m = client.post("/match", json={"profile": profile, "intent": intent}).json()
    assert m["status"] == "no_eligible_scheme"
    assert m["nearest_misses"]
    assert m["nearest_misses"][0]["suggestions"]
