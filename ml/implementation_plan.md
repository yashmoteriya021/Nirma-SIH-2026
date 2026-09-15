# SIH PS 26092 — AI-Driven Scheme Matching Pipeline

Build the decision-logic core: a 4-module pipeline that matches Scheduled Caste / Backward Class / Safai Karamchari citizens to NSFDC/NBCFDC/NSKFDC loan schemes and routes them to the right Channel Partner.

## User Review Required

> [!IMPORTANT]
> **Language/runtime choice:** The plan uses **Python 3.11+** for all modules. This gives us clean JSON schema validation (`pydantic`), easy LLM integration, Haversine/BallTree via `scikit-learn`, and `pytest` for testing. If you prefer Node.js or another runtime, flag it now.

> [!IMPORTANT]
> **LLM dependency for Module 2:** The intent extraction engine uses an LLM (via OpenAI-compatible API) for structured slot-filling. A **fully offline keyword/rule-based fallback** is also built. Do you have an API key preference (OpenAI, Gemini, local Ollama)? The code will be provider-agnostic with a simple adapter.

> [!WARNING]
> **No real government APIs will be called.** DigiLocker integration is fully mocked. All Channel Partner data is synthetic but structurally grounded in NSFDC/NBCFDC/NSKFDC published partner categories and NPA thresholds.

## Open Questions

1. **Scheme scope:** Research surfaced ~15 distinct schemes across NSFDC (MCF, Term Loan, Education Loan, Mahila Samriddhi, Mahila Kisan, NASY), NBCFDC (General Loan, Small Loan, New Swarnima, Education Loan), NSKFDC (GTL, Swachhta Udyami, Education Loan, Mahila Samriddhi, Micro Credit), and VISVAS. Should I include **all** of them, or focus on the ~8 core business/education loan schemes most relevant to the PS demo?
2. **Partner dataset size:** Planning to seed ~50 synthetic Channel Partners across 5–6 Indian states (mix of SCAs, PSBs, RRBs, NBFC-MFIs). Enough for demo, or do you want more coverage?

---

## Proposed Changes

### Project Structure

```
SIH/
├── SIH26092_ML_Agent_Brief.md          # (existing)
├── requirements.txt                     # Python dependencies
├── assumptions.md                       # Consolidated assumptions
├── pipeline.md                          # Integration contract
│
├── module1_profile/                     # Verified Profile Acquisition
│   ├── profile_schema.json
│   ├── verification_service.py          # Mock DigiLocker OAuth
│   ├── manual_fallback.py               # Manual input path
│   ├── staleness.py                     # Certificate validity checks
│   ├── tests/
│   │   └── test_profile.py              # 5+ test cases
│   └── research_notes_profile.md
│
├── module2_intent/                      # Intent Extraction Engine
│   ├── intent_schema.json
│   ├── slot_machine.py                  # State machine for slot-filling
│   ├── llm_extractor.py                 # LLM-based structured extraction
│   ├── offline_extractor.py             # Keyword/rule-based fallback
│   ├── prompts/
│   │   └── extraction_prompt.txt        # LLM prompt template
│   ├── tests/
│   │   └── test_intent.py               # 5+ test cases (incl. code-mixed)
│   └── research_notes_intent.md
│
├── module3_matching/                    # Eligibility Matching & Ranking
│   ├── scheme_knowledge_base.json       # All schemes with source citations
│   ├── hard_filter.py                   # Pass/fail eligibility checks
│   ├── soft_ranker.py                   # Fit-based ranking with weights
│   ├── explainer.py                     # Explanation generation
│   ├── tests/
│   │   └── test_matching.py             # 8+ test cases
│   └── research_notes_matching.md
│
├── module4_partners/                    # Partner Ranking & Routing
│   ├── partner_schema.json
│   ├── partner_dataset.json             # 50 synthetic partners
│   ├── partner_ranker.py                # Filter + geo-rank
│   ├── tests/
│   │   └── test_partners.py             # 5+ test cases
│   └── research_notes_partners.md
│
└── pipeline_runner.py                   # End-to-end demo runner
```

---

### Module 1: Verified Profile Acquisition

#### [NEW] [profile_schema.json](file:///Users/vanshpatel/Downloads/SIH/module1_profile/profile_schema.json)

JSON Schema covering:
- `applicant_id` (UUID)
- `full_name`, `dob` (date), `age` (computed), `gender` (male/female/other)
- `category` (enum: `SC`, `OBC`, `SafaiKaramchari`, `ManualScavenger`, `WastePicker`)
- `domicile_state` (Indian state code)
- `annual_family_income` (number, in ₹)
- `income_certificate_issue_date` (date)
- `education_status` (enum: below_8th, 8th_pass, 10th_pass, 12th_pass, graduate, post_graduate, professional)
- `disability_status` (object: `has_disability`, `disability_type`, `disability_percentage`)
- `existing_loan_flag` (boolean)
- `marital_status` (single/married/widowed/divorced)
- `is_single_woman` (boolean, derived)
- `verification_status` (enum: `verified`, `self_reported`)
- `needs_reverification` (boolean)
- `consent_given_at` (ISO datetime)
- `verification_source` (enum: `digilocker`, `manual`, `none`)

**Staleness logic:**
- Income certificate: valid for **1 financial year** from issue date (researched). If `income_certificate_issue_date` is older than 1 year → `needs_reverification: true`.
- SC certificate: lifetime validity (no expiry check needed).
- OBC-NCL certificate: valid for 1 year (re-check annually).

#### [NEW] [verification_service.py](file:///Users/vanshpatel/Downloads/SIH/module1_profile/verification_service.py)

Mock DigiLocker OAuth flow:
1. `initiate_auth()` → returns a mock authorization URL
2. `handle_callback(auth_code)` → simulates token exchange
3. `fetch_documents(access_token)` → returns mock structured data (caste cert, income cert, Aadhaar-linked DOB/address)
4. No raw document images stored — only derived structured fields
5. `consent_given_at` auto-populated on successful verification

#### [NEW] [manual_fallback.py](file:///Users/vanshpatel/Downloads/SIH/module1_profile/manual_fallback.py)

Same schema, populated from direct user input. Sets `verification_status: "self_reported"`. Validates all required fields, enforces type constraints.

#### [NEW] [research_notes_profile.md](file:///Users/vanshpatel/Downloads/SIH/module1_profile/research_notes_profile.md)

Citing: DigiLocker partner portal (partners.apisetu.gov.in), income/caste certificate validity research, NSFDC/NBCFDC gender-specific provisions, DPDP Act 2023 requirements.

---

### Module 2: Intent Extraction Engine

#### [NEW] [intent_schema.json](file:///Users/vanshpatel/Downloads/SIH/module2_intent/intent_schema.json)

Slot schema:
- `purpose` (enum: business_start, business_expansion, education, vehicle_livelihood, agriculture_allied, sanitation_equipment, other)
- `project_type` (free text, e.g., "tailoring shop", "kirana store")
- `estimated_cost` (number, in ₹) — with `cost_confidence` (high/medium/low)
- `beneficiary` (enum: self, dependent)
- `loan_type_guess` (optional enum: micro_finance, term_loan, education_loan, unknown)
- `urgency` (enum: immediate, within_3_months, flexible)
- `slots_filled` (list of filled slot names)
- `slots_missing` (list of unfilled slot names)
- `extraction_method` (enum: llm, offline_rules, manual_form)

**Confidence threshold:** 0.6 — any slot below this triggers a clarifying question. Rationale: balances too-aggressive acceptance (0.5) vs. over-questioning (0.8), documented in research notes.

**Pre-fill from Module 1:** Income, category, gender, domicile state are auto-injected — never re-asked.

**Cost estimation hints** (from PMEGP/MSME research):
| Business Type | Typical Range |
|---|---|
| Tailoring (home-based) | ₹20K–₹1L |
| Tailoring (shop) | ₹1L–₹5L |
| Kirana store | ₹3.5L–₹15L |
| Food stall/kiosk | ₹1.5L–₹5L |
| Vehicle-based livelihood | ₹2L–₹8L |
| Agri-allied small enterprise | ₹50K–₹5L |

#### [NEW] [slot_machine.py](file:///Users/vanshpatel/Downloads/SIH/module2_intent/slot_machine.py)

State machine with max 5 turns of clarification. After that, falls back to explicit form. Tracks filled/missing slots, generates targeted follow-up questions. Produces a final confirmation summary.

#### [NEW] [llm_extractor.py](file:///Users/vanshpatel/Downloads/SIH/module2_intent/llm_extractor.py)

Provider-agnostic LLM call (OpenAI-compatible). Prompt forces **structured JSON output only** — the LLM never generates scheme recommendations. Handles Hindi, English, and code-mixed "Hinglish" input.

#### [NEW] [offline_extractor.py](file:///Users/vanshpatel/Downloads/SIH/module2_intent/offline_extractor.py)

Keyword/regex-based slot extraction. Hindi + English keyword dictionaries for business types, cost patterns (`₹`, `lakh`, `hazar`), education keywords. No network dependency — survives a live demo without internet.

---

### Module 3: Eligibility Matching & Explainable Ranking

#### [NEW] [scheme_knowledge_base.json](file:///Users/vanshpatel/Downloads/SIH/module3_matching/scheme_knowledge_base.json)

Each scheme record contains:
```json
{
  "scheme_id": "NSFDC_MCF",
  "corporation": "NSFDC",
  "name": "Micro Credit Finance",
  "target_category": ["SC"],
  "income_ceiling": 500000,
  "project_cost_min": 0,
  "project_cost_max": 140000,
  "loan_ceiling": 140000,
  "loan_percentage": 90,
  "interest_rate": 6.5,
  "interest_rebate_women": 0.5,
  "moratorium_months": 6,
  "repayment_years": 5,
  "purpose_types": ["business_start", "business_expansion"],
  "gender_restriction": null,
  "disability_provisions": null,
  "education_requirement": null,
  "existing_loan_restriction": false,
  "required_documents": ["caste_certificate", "income_certificate", "aadhaar", "project_report"],
  "source_url": "https://nsfdc.nic.in",
  "source_notes": "MCF scheme details from NSFDC official website",
  "version": "2026-01"
}
```

**Researched schemes to include (~12):**

| ID | Corporation | Name | Cost Band | Rate | Category |
|---|---|---|---|---|---|
| `NSFDC_MCF` | NSFDC | Micro Credit Finance | ≤₹1.4L | 6.5% | SC |
| `NSFDC_TL` | NSFDC | Term Loan | ₹1.4L–₹50L | 8% | SC |
| `NSFDC_ELS` | NSFDC | Education Loan | ≤₹40L | 4% | SC |
| `NSFDC_MSY` | NSFDC | Mahila Samriddhi Yojana | micro | 6% | SC (women only) |
| `NBCFDC_GL` | NBCFDC | General Loan | ≤₹15L | 6–8% | OBC |
| `NBCFDC_SL` | NBCFDC | Small Loan | ≤₹1.25L | 6% | OBC |
| `NBCFDC_NSW` | NBCFDC | New Swarnima (Women) | ≤₹2L | 5% | OBC (women only) |
| `NBCFDC_EL` | NBCFDC | Education Loan | ≤₹10L/₹20L | 4% | OBC |
| `NSKFDC_GTL` | NSKFDC | General Term Loan | ≤₹15L | 6–9% | SafaiKaramchari |
| `NSKFDC_SUY` | NSKFDC | Swachhta Udyami Yojana | varies | 6% | SafaiKaramchari |
| `NSKFDC_EL` | NSKFDC | Education Loan | ≤₹10L/₹20L | 4% | SafaiKaramchari |
| `VISVAS` | NBCFDC/NSFDC | VISVAS Interest Subvention | ≤₹2L (indiv) / ≤₹4L (SHG) | 5% subvention | SC/OBC/SK |

#### [NEW] [hard_filter.py](file:///Users/vanshpatel/Downloads/SIH/module3_matching/hard_filter.py)

Strict pass/fail checks (never soft-ranked):
1. **Category match** — profile category ∈ scheme's `target_category`
2. **Income ceiling** — `annual_family_income` ≤ scheme's `income_ceiling`
3. **Project cost band** — `estimated_cost` within `[project_cost_min, project_cost_max]`
4. **Gender restriction** — if scheme is women-only, check `gender == "female"`
5. **Existing loan restriction** — if scheme prohibits, check `existing_loan_flag == false`

Each check returns a `FilterResult(passed: bool, rule: str, detail: str)`.

#### [NEW] [soft_ranker.py](file:///Users/vanshpatel/Downloads/SIH/module3_matching/soft_ranker.py)

Among eligible schemes, rank by weighted fit score:

| Factor | Weight | Rationale |
|---|---|---|
| Purpose alignment | 0.35 | Does stated purpose match scheme's `purpose_types`? |
| Cost-band fit | 0.25 | How well does project cost sit within the scheme band? (center = best) |
| Interest rate | 0.20 | Lower rate = higher score (direct financial benefit) |
| Gender/special benefits | 0.10 | Extra score if women-specific rebates apply |
| Verification confidence | 0.10 | Verified profile scores higher than self-reported |

All weights are documented constants, easily tunable.

#### [NEW] [explainer.py](file:///Users/vanshpatel/Downloads/SIH/module3_matching/explainer.py)

Generates human-readable explanation objects per recommendation:
```json
{
  "scheme_id": "NSFDC_MCF",
  "rank": 1,
  "score": 0.87,
  "explanation": {
    "eligible_because": [
      "Category SC matches scheme requirement",
      "Income ₹4.2L < ₹5L ceiling",
      "Project cost ₹80K fits Micro Finance band (≤₹1.4L)"
    ],
    "advantages": [
      "Lowest interest rate at 6.5% (6.0% with women's rebate)",
      "90% loan coverage of project cost"
    ],
    "considerations": [
      "Maximum loan amount ₹1.4L — verify if sufficient for your project"
    ]
  }
}
```

**No-match handling:** When no scheme qualifies, returns the nearest-miss explanation (e.g., "Income ₹5.2L exceeds ₹5L ceiling by ₹20K — a revised income certificate may help").

---

### Module 4: Partner Ranking & Routing

#### [NEW] [partner_schema.json](file:///Users/vanshpatel/Downloads/SIH/module4_partners/partner_schema.json)

```json
{
  "partner_id": "SCA_MH_001",
  "name": "Maharashtra SC Development Corporation",
  "type": "SCA",
  "state": "MH",
  "district": "Mumbai",
  "pin_code": "400001",
  "latitude": 19.076,
  "longitude": 72.8777,
  "scheme_categories_processed": ["NSFDC_MCF", "NSFDC_TL", "NSFDC_ELS"],
  "fund_utilization_pct": 62,
  "npa_pct": 8.5,
  "is_active": true,
  "contact_phone": "022-XXXXXXXX",
  "source": "synthetic (grounded in NSFDC SCA list structure)"
}
```

#### [NEW] [partner_dataset.json](file:///Users/vanshpatel/Downloads/SIH/module4_partners/partner_dataset.json)

~50 synthetic partners across Maharashtra, UP, Tamil Nadu, Rajasthan, Bihar, Karnataka. Mix of SCAs, PSBs (SBI, PNB, BOB), RRBs, NBFC-MFIs. Realistic fund utilization (40–95%) and NPA ranges (2–25%).

#### [NEW] [partner_ranker.py](file:///Users/vanshpatel/Downloads/SIH/module4_partners/partner_ranker.py)

Two-stage pipeline:
1. **Hard filter:** Remove partners where:
   - `is_active == false`
   - `npa_pct ≥ 15%` (threshold from NSFDC's own RRB eligibility rule: Net NPA < 15%)
   - `fund_utilization_pct ≥ 90%` (capacity exhausted)
   - Scheme not in `scheme_categories_processed`
2. **Rank by distance** using Haversine formula (BallTree from scikit-learn for efficiency, with fallback to raw Haversine for small datasets).
3. **Location fallback:** If no GPS coordinates, use pin code centroid lookup (seeded mapping).

Output per partner:
```json
{
  "partner_id": "SCA_MH_001",
  "name": "Maharashtra SC Development Corporation",
  "distance_km": 2.1,
  "reason": "2.1 km away, currently accepting Micro Finance applications, 62% fund utilization, NPA 8.5%"
}
```

**Edge case:** When all partners exceed thresholds → return explicit message with nearest partners and their threshold violations, so the user isn't left with a dead end.

---

### Integration & Documentation

#### [NEW] [pipeline_runner.py](file:///Users/vanshpatel/Downloads/SIH/pipeline_runner.py)

End-to-end demo: takes a raw profile dict + freeform text → runs all 4 modules → prints full output with all intermediate explanation objects.

#### [NEW] [pipeline.md](file:///Users/vanshpatel/Downloads/SIH/pipeline.md)

Documents:
- JSON handoff schemas: Module 1→3, Module 2→3, Module 3→4
- One complete end-to-end worked example
- API contract for frontend/backend integration

#### [NEW] [assumptions.md](file:///Users/vanshpatel/Downloads/SIH/assumptions.md)

Consolidates every synthetic data point, judgment call, and unverified figure.

---

## Verification Plan

### Automated Tests
```bash
# Run all module tests
cd /Users/vanshpatel/Downloads/SIH
pip install -r requirements.txt
pytest module1_profile/tests/ -v
pytest module2_intent/tests/ -v
pytest module3_matching/tests/ -v
pytest module4_partners/tests/ -v

# End-to-end pipeline test
python pipeline_runner.py
```

### Test Case Coverage

| Module | Min Cases | Key Edge Cases |
|---|---|---|
| 1: Profile | 5 | Missing fields, stale income cert, OBC-NCL expiry, consent missing, boundary age |
| 2: Intent | 5 | Code-mixed Hindi/English, ambiguous cost, all slots missing, voice-transcription noise, pre-filled profile overlap |
| 3: Matching | 8 | Clean match, multi-scheme overlap, no-match, boundary income (₹5L exactly), women-only scheme, education vs. business, VISVAS convergence, missing verification |
| 4: Partners | 5 | Normal ranking, all-over-NPA-threshold, no GPS (pin code fallback), no partners process scheme, tie-breaking by utilization |

### Manual Verification
- Run `pipeline_runner.py` with 3 distinct personas (SC male micro-business, OBC woman education, Safai Karamchari sanitation)
- Verify every output includes human-readable explanations
- Confirm all scheme figures in `scheme_knowledge_base.json` have source citations
