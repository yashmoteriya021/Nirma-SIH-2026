# AI-Driven Scheme Matching for Marginalized Entrepreneurs
**Project for SIH PS 26092**

This repository contains the prototype implementation for an intelligent matching engine that connects marginalized entrepreneurs (SC, OBC, Safai Karamcharis) with the most appropriate government loan schemes from NSFDC, NBCFDC, and NSKFDC, and routes them to healthy channel partners with active capacity.

## Core Architecture

The system is built as a robust, 4-stage deterministic pipeline augmented with LLM intent extraction. This hybrid approach ensures high explainability, legal compliance, and offline capability.

### 1. Module 1: Verified Profile (`module1_profile/`)
Extracts and validates user identity and socio-economic data.
- **DigiLocker Mock Integration:** Simulates fetching digitally signed documents (`verification_service.py`).
- **Staleness Logic:** Uses Indian Financial Year logic to determine if income/OBC certificates are still valid (`staleness.py`).
- **Manual Fallback:** Ensures users without DigiLocker can still self-report or upload documents manually (`manual_fallback.py`).

### 2. Module 2: Intent Extraction Engine (`module2_intent/`)
Understands what the user wants to do, handling unstructured, code-mixed language.
- **LLM Extractor:** Uses an LLM constrained to output strictly structured JSON (never generates unauthorized financial advice) (`llm_extractor.py`).
- **Offline Rule-Based Extractor:** Keyword and Regex fallback for English, Hindi (Devanagari), and Hinglish (Roman) to ensure the system works without internet/API keys (`offline_extractor.py`).
- **Slot Filling State Machine:** Tracks missing parameters (like cost or purpose) and asks targeted follow-up questions for up to 5 turns (`slot_machine.py`).

### 3. Module 3: Eligibility Matching & Ranking (`module3_matching/`)
Matches the user's verified profile and intent against government schemes.
- **Scheme Knowledge Base:** Curated JSON database of 13 actual schemes from NSFDC, NBCFDC, NSKFDC, and the VISVAS convergence scheme (`scheme_knowledge_base.json`).
- **Hard Filter:** Strict legal/financial checks (Income ceiling, category, gender restrictions). Failing any check immediately disqualifies a scheme to prevent false recommendations (`hard_filter.py`).
- **Soft Ranker:** Ranks eligible schemes based on a weighted scoring system (purpose fit, cost-band fit, interest rate, gender benefits) (`soft_ranker.py`).
- **Explainer:** Generates human-readable explanations of exactly *why* a scheme is recommended, what the advantages are, and any considerations. If no scheme fits, it identifies the nearest miss and provides actionable advice (`explainer.py`).

### 4. Module 4: Partner Ranking & Routing (`module4_partners/`)
Finds the nearest active Channel Partner that can actually process the loan.
- **Capacity & Health Checks:** Filters out partners that are inactive, have high Net NPAs (>15%), or are over their fund utilization capacity (>90%) (`partner_ranker.py`).
- **Geo-Routing:** Uses Haversine distance to rank healthy partners closest to the user's GPS coordinates or PIN code fallback.
- **Synthetic Dataset:** Includes 50 synthetic Channel Partners across 6 states representing SCAs, PSBs, RRBs, and NBFC-MFIs (`partner_dataset.json`).

## Running the Pipeline

The entire flow is integrated into `pipeline.py`.

### Prerequisites
Make sure you have `pytest` installed to run the tests. 
```bash
pip install -r requirements.txt
```
*(Optional)* If you want to test the LLM extraction in Module 2, export your OpenAI API key:
```bash
export OPENAI_API_KEY="your-api-key"
```
If no key is present, the system gracefully falls back to the offline intent extractor.

### Run the Demo
```bash
python pipeline.py
```
This will run a simulated user flow from Profile Verification -> Intent Extraction -> Scheme Matching -> Partner Routing, and output the top recommended scheme as JSON.

### Run the Tests
We have built 57 unit tests across all modules. Run them via pytest:
```bash
python -m pytest -v
```

## Research & Assumptions
Each module contains a `research_notes_*.md` file detailing the real-world government guidelines, sources, and scheme overlaps that informed the logic. A global `assumptions.md` tracks all synthetic data points (e.g., cost estimates, mock NPA rates) used for this hackathon prototype.
