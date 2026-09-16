# Pipeline Integration Contract

How the four ML modules hand data to each other and how the web app reaches them.
Every module is deterministic except the optional LLM extractor in Module 2, and
every output carries the *reason* for its result.

```
POST /profile/*  ──► CitizenProfile ─┐
                                     ├─► POST /match ──► Recommendation ──► POST /partners/rank ──► RankedPartners
POST /intent/turn ─► ExtractedIntent ┘
```

Served by `ml/service/app.py` (FastAPI, port 8000) and proxied by Express at `/api/ai/*`
(`backend/src/controllers/ai.controller.js`). Express wraps every body in
`{ success, data, message }`; the shapes below are the `data` payloads.

| Express route | ML route | Body |
|---|---|---|
| `POST /api/ai/profile` | `/profile/manual` or `/profile/mock-digilocker` | manual fields, or `{ auth_code }` |
| `POST /api/ai/intent` | `/intent/turn` | `{ text, profile, session_id?, language? }` |
| `POST /api/ai/match` | `/match` | `{ profile, intent }` |
| `POST /api/ai/partners` | `/partners/rank` | `{ scheme_id \| frontend_scheme_id, lat?, lon?, pin_code?, max_distance_km? }` |
| `GET /api/ai/schemes` | `/schemes` | — |
| `GET /api/ai/health` | `/health` | — |

Errors: 400 `{ detail: { errors: [...] } }` for validation, 404 for unknown scheme ids.
Express maps an unreachable ML service to `503 ML_SERVICE_UNAVAILABLE`.

---

## Module 1 → Module 3: `CitizenProfile`

Schema: `module1_profile/profile_schema.json`. Produced by `build_verified_profile()`
(mock DigiLocker) or `validate_and_build_profile()` (manual, `verification_status =
"self_reported"`).

```json
{
  "applicant_id": "uuid",
  "full_name": "Ramesh Kumar",
  "dob": "1990-05-10", "age": 36,
  "gender": "male",
  "category": "SC",
  "domicile_state": "UP",
  "annual_family_income": 320000.0,
  "income_certificate_issue_date": "2026-06-01",
  "caste_certificate_issue_date": null,
  "education_status": "10th_pass",
  "disability_status": {"has_disability": false},
  "existing_loan_flag": false,
  "marital_status": "single", "is_single_woman": false,
  "verification_status": "self_reported",
  "verification_source": "manual",
  "needs_reverification": false, "reverification_reason": null,
  "consent_given_at": "2026-09-15T12:00:00+00:00"
}
```

Fields Module 3 reads: `category`, `annual_family_income`, `gender`, `is_single_woman`,
`existing_loan_flag`, `education_status`, `verification_status`, `needs_reverification`.

## Module 2 → Module 3: `ExtractedIntent`

Schema: `module2_intent/intent_schema.json`. `/intent/turn` returns the slot-filling
state; call it repeatedly with the same `session_id` until `complete` is true.

```json
{
  "session_id": "uuid", "complete": true, "turn": 3,
  "follow_up_question": null,
  "confirmation_summary": "So you want ₹80,000 for education (for your dependent), correct?",
  "cost_hint": null,
  "extraction_method": "offline_rules",
  "intent": {
    "purpose": "education",
    "project_type": null,
    "estimated_cost": 80000.0, "cost_confidence": "high",
    "beneficiary": "dependent",
    "student_education_status": "12th_pass",
    "loan_type_guess": "micro_finance",
    "urgency": "flexible",
    "slots_filled": ["purpose", "estimated_cost", "beneficiary", "..."],
    "slots_missing": ["project_type"],
    "extraction_method": "offline_rules",
    "raw_input": "mujhe 80 hazar chahiye | beti ki padhai ke liye | 12th pass",
    "confirmation_summary": "..."
  }
}
```

Fields Module 3 reads: `purpose`, `estimated_cost`, `beneficiary`, `student_education_status`.

## Module 3 → Module 4 / UI: `Recommendation`

Produced by `filter_all_schemes()` → `rank_schemes()` → `generate_full_recommendation()`.

```json
{
  "status": "schemes_found",
  "total_eligible": 2, "total_ineligible": 11,
  "recommendations": [
    {
      "scheme_id": "NSFDC_ELS", "frontend_id": "education-loan",
      "scheme_name": "Educational Loan Scheme (ELS)", "corporation": "NSFDC",
      "rank": 1, "score": 0.8625,
      "score_factors": {
        "purpose_alignment": {"score": 1.0, "weight": 0.45},
        "cost_band_fit":     {"score": 0.6, "weight": 0.30},
        "interest_rate":     {"score": 1.0, "weight": 0.25}
      },
      "explanation": {
        "eligible_because": ["Category 'SC' is eligible ...", "Income ₹320,000 ≤ ₹500,000 ceiling", "..."],
        "advantages": ["Low interest rate: 4.0% p.a.", "90% loan coverage ..."],
        "considerations": ["Profile is self-reported ...", "..."]
      },
      "scheme_details": {
        "loan_ceiling": 4000000, "interest_rate": 4.0, "effective_rate": 4.0,
        "loan_percentage": 90, "repayment_years": 10, "moratorium_months": 12,
        "required_documents": ["caste_certificate", "income_certificate", "..."]
      }
    }
  ],
  "profile_summary": {"...": "..."}, "intent_summary": {"...": "..."}
}
```

No-match case (`status: "no_eligible_scheme"`): `message`, `nearest_misses[]`
(`scheme_id`, `frontend_id`, `scheme_name`, `failing_reasons[]`, `suggestions[]`) and
`general_advice[]`.

Module 4 needs only `recommendations[i].scheme_id`; the UI uses `frontend_id` to link
to `/schemes/:id` when the frontend has a page for that scheme.

## Module 4 → UI: `RankedPartners`

```json
{
  "status": "partners_found",
  "scheme_id": "NSFDC_MCF",
  "total_eligible": 3, "total_filtered_out": 43,
  "location_used": {"latitude": 26.847, "longitude": 80.947, "source": "pin_code"},
  "ranked_partners": [
    {
      "partner_id": "SCA_UP_001", "name": "UP SC Finance & Development Corporation",
      "type": "SCA", "district": "Lucknow", "state": "UP",
      "distance_km": 0.0, "fund_utilization_pct": 75, "npa_pct": 11.3,
      "contact_phone": "0522-2201234",
      "reason": "0.0 km away, currently accepting NSFDC_MCF applications, 75% fund utilization, NPA 11.3%"
    }
  ],
  "filtered_out": [{"partner_id": "...", "name": "...", "reason": "NPA 18.2% exceeds 15.0% threshold"}]
}
```

Other statuses: `no_partners_in_range` (healthy partners exist beyond `max_distance_km`;
includes `nearest_beyond_radius[]`), `no_eligible_partners` (every candidate failed the
health/scheme filter), `error` (location could not be resolved).

---

## End-to-end example

Run offline (`LLM_PROVIDER=none`) against the service:

1. `POST /profile/manual` with the profile above → `CitizenProfile` (SC, ₹3.2L, UP, 10th pass).
2. `POST /intent/turn` `"mujhe 80 hazar chahiye"` → not complete, asks *"What do you need the loan for?"*
3. `POST /intent/turn` `"beti ki padhai ke liye"` (same `session_id`) → purpose `education`,
   beneficiary `dependent`, asks *"What is the student's highest completed education?"*
4. `POST /intent/turn` `"12th pass"` → complete; summary *"So you want ₹80,000 for education (for your dependent), correct?"*
5. `POST /match` → `NSFDC_ELS` rank 1 (student's 12th pass meets the requirement, 4% rate),
   `NSFDC_MCF` rank 2; VISVAS ruled out by its ₹3L income ceiling, women-only and OBC/NSKFDC
   schemes ruled out by category/gender.
6. `POST /partners/rank` `{ "scheme_id": "NSFDC_ELS", "pin_code": "226001" }` → UP SCA (0 km,
   75% utilisation, NPA 11.3%) then SBI Kanpur (73 km); 43 partners filtered out (wrong
   scheme, >90% utilisation, >15% NPA or inactive).

`python pipeline.py` runs the same flow in-process.
