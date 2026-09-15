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
- **Confidence Threshold:** A confidence threshold of `0.6` is used to determine if a slot is filled or if a follow-up question is needed.
- **LLM vs Rule-based:** The pipeline defaults to LLM extraction if an OpenAI API key is present, but seamlessly falls back to offline keyword-based extraction to ensure demo reliability in no-internet environments.

## Module 3: Eligibility Matching & Ranking
- **Income Ceiling:** Assumed to be ₹5,00,000 across the board for NSFDC/NBCFDC/NSKFDC general schemes, based on a PIB circular from Jan 2026. (Legacy limits of ₹3L were ignored in favor of the newer limit).
- **VISVAS Subvention:** The VISVAS scheme is treated uniquely. It provides a -5.0% interest rate (subvention) and has a strict ₹3,00,000 income ceiling. It is marked as a `convergence_scheme` because it layers on top of other loans.
- **Ranking Weights:**
  - `purpose_alignment` (0.35): Heavily weighted. A business loan isn't helpful for an education need.
  - `cost_band_fit` (0.25): Important to route users to the right-sized scheme.
  - `interest_rate` (0.20): Lower rate = higher score.
  - `gender_special` (0.10): Bonus for women to align with government 40% allocation goals.
  - `verification_confidence` (0.10): Slight bonus if the profile is fully verified via DigiLocker.
- **Tiered Rates:** If a scheme has tiered interest rates (e.g., NBCFDC General Loan), we use the lowest tier for ranking calculations, assuming the exact rate will be calculated at the partner level.

## Module 4: Partner Routing
- **Capacity Limits:**
  - **NPA Threshold:** 15.0%. (Based on NSFDC guidelines requiring RRBs to have Net NPA < 15%).
  - **Fund Utilization:** 90.0%. Above this, we assume the partner cannot process new applications promptly.
- **Geolocation:**
  - We use the Haversine formula for distance ranking.
  - **Fallback:** If GPS coordinates are unavailable, we map the first 2 digits of the user's PIN code to an approximate state/regional centroid. (In production, this needs a full PIN-to-LatLong database).
- **Synthetic Partner Data:** The 50 partners in `partner_dataset.json` are completely synthetic, designed to cover 6 states and various edge cases (high NPA, inactive, over-capacity).

## Handoff Contract
The modules communicate strictly via typed JSON dictionaries matching the schemas in their respective directories (`profile_schema.json`, `intent_schema.json`, `partner_schema.json`).
