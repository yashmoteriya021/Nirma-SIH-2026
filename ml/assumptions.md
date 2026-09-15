# System Design Assumptions & Constants

This document tracks all synthetic assumptions, constants, and data interpretations used in the ML Pipeline for SIH PS 26092. Because some precise internal government operational details are not public, these assumptions are clearly documented here so they can be replaced with real endpoints/data in a production environment.

## Module 1: Verified Profile
- **DigiLocker Mocking:** We assume DigiLocker or a similar identity gateway provides structured JSON claims. We assume the existence of an `income_certificate` and `caste_certificate` schema.
- **Staleness Logic (FY-based):**
  - Income and OBC certificates are tied to the Financial Year (April 1 - March 31).
  - A certificate issued on Jan 15, 2026 is valid until March 31, 2026 (the end of FY 25-26).
  - SC/ST certificates are considered valid for a lifetime and do not expire.
- **Data Gap:** We assume `is_single_woman`, `marital_status`, and `disability_status` can be inferred from identity documents or are captured via self-declaration during onboarding.

## Module 2: Intent Extraction
- **Cost Estimation Hints:** Synthetic typical cost ranges are provided in `COST_HINTS` (e.g., tailoring shop ~₹80k, kirana store ~₹5L). These are rough estimates based on PMEGP data.
- **Confidence Threshold:** A confidence threshold of `0.6` is used to determine if a slot is filled or if a follow-up question is needed. A purpose of `other` is never treated as filled, so the assistant always asks rather than guessing.
- **Beneficiary default:** "self" is assumed when nobody else is mentioned (asking every user "is this for you?" adds a turn for the common case). An explicit dependent mention in a later turn overrides it.
- **Student education:** For a dependent's education loan the scheme's education requirement applies to the *student*, so the assistant asks one extra question (`student_education_status`). If it remains unknown the check passes with a caveat and the channel partner verifies it.
- **LLM vs Rule-based:** Provider is chosen by `LLM_PROVIDER` (`openai`, `openrouter`, `anthropic`, `ollama`, `none`, or `auto` from the provider key env vars). Any failure or missing key falls back to the offline keyword extractor so a demo never depends on connectivity. Offline matching is whole-word (Latin + Devanagari) with light English inflection tolerance; a bare 4-digit number in 1900–2100 is treated as a year, not an amount, unless preceded by ₹/Rs.

## Module 3: Eligibility Matching & Ranking
- **Income Ceiling:** Assumed to be ₹5,00,000 across the board for NSFDC/NBCFDC/NSKFDC general schemes, based on a PIB circular from Jan 2026. (Legacy limits of ₹3L were ignored in favor of the newer limit).
- **VISVAS Subvention:** The VISVAS scheme is treated uniquely. It provides a -5.0% interest rate (subvention) and has a strict ₹3,00,000 income ceiling. It is marked as a `convergence_scheme` because it layers on top of other loans.
- **Ranking Weights:**
  - `purpose_alignment` (0.45): Heavily weighted. A business loan isn't helpful for an education need.
  - `cost_band_fit` (0.30): Important to route users to the right-sized scheme.
  - `interest_rate` (0.25): Lower *effective* rate = higher score.
  - Gender benefits and verification confidence are deliberately **not** weights: they are constant for a given applicant across every scheme, so they could never change the order — they only inflated every score equally. Women's rebates still affect ranking through the effective rate, and both facts are surfaced in the explanation.
- **Tiered Rates:** If a scheme has tiered interest rates (e.g., NBCFDC General Loan), the tier matching the requested amount is used (lowest tier when the amount is unknown) and the tier is stated in the explanation.
- **Frontend mapping:** `frontend_id` on each KB scheme links to the detail page in `frontend/src/data/schemes.json`. Only 4 of the 13 real schemes have a page; the other 36 frontend pages are illustrative and are not matched by the engine.

## Module 4: Partner Routing
- **Capacity Limits:**
  - **NPA Threshold:** 15.0%. (Based on NSFDC guidelines requiring RRBs to have Net NPA < 15%).
  - **Fund Utilization:** 90.0%. Above this, we assume the partner cannot process new applications promptly.
- **Geolocation:**
  - We use the Haversine formula for distance ranking.
  - **Fallback:** If GPS coordinates are unavailable, we map the first 2 digits of the user's PIN code to an approximate regional centroid (all 69 valid Indian 2-digit prefixes covered, accuracy ~50–150 km). In production this needs a full PIN-to-LatLong database.
  - **Radius:** 100 km default. Healthy partners beyond the radius are reported separately (`no_partners_in_range`) so the message never blames capacity when the real issue is distance.
- **Synthetic Partner Data:** The 50 partners in `partner_dataset.json` are completely synthetic, designed to cover 6 states and various edge cases (high NPA, inactive, over-capacity).

## Handoff Contract
The modules communicate strictly via typed JSON dictionaries matching the schemas in their respective directories (`profile_schema.json`, `intent_schema.json`, `partner_schema.json`). See `pipeline.md` for the exact handoffs and the HTTP surface (`service/`).

## Service
- Slot-filling sessions are held in memory with a 30-minute TTL (`service/sessions.py`) — fine for a single-process demo; use Redis if the service is scaled out.
- Applicants must be 18+ (all NSFDC/NBCFDC/NSKFDC schemes require an adult borrower).
