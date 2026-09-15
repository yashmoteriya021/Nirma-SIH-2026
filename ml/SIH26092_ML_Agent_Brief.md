# Agent Task Brief: Build the ML/Matching Pipeline for SIH PS 26092

Paste this whole document to your coding agent (Claude Code or similar) as the task. It is self-contained — the agent does not need prior conversation context.

---

## 0. Context (read first)

You are building the decision-logic core of a platform for Smart India Hackathon PS 26092, "AI-Driven Scheme Matching for Marginalized Entrepreneurs," issued by India's Ministry of Social Justice and Empowerment (MoSJE).

**The real-world situation:** Scheduled Caste citizens with family income up to ₹5 lakh/year can get concessional loans (up to 90% of project/education cost, 6.5–8%+ interest) routed through NSFDC, NBCFDC, and NSKFDC — three corporations under MoSJE — via 100+ Channel Partners (State Channelizing Agencies, Public Sector Banks, Regional Rural Banks, NBFC-MFIs). Citizens don't know which scheme fits them (Micro Finance ≤₹1.4 lakh / Term Loan ≤₹50 lakh / Education Loan / VISVAS interest-subvention convergence with MUDRA/NRLM) and don't know which nearby Channel Partner can actually process it. This causes misrouted applications and delayed disbursement.

**What you are building is NOT the whole app.** Ignore frontend styling and backend deployment concerns unless a task below explicitly asks for an interface. You are building four connected ML/logic modules that form a decision pipeline:

```
Verified Profile  ─┐
                    ├─► Eligibility Matching & Ranking ─► Partner Ranking & Routing
Extracted Intent   ─┘         (explainable)                  (geo + capacity)
```

**Non-negotiable operating rules for every module below:**

1. **Research before you build.** For each module, do the specified research first and produce a short `research_notes_<module>.md` file citing every source URL you used, before writing implementation code. Do not invent scheme rates, income ceilings, loan caps, or interest bands from memory — these are real financial/legal figures; get them from official sources (NSFDC, NBCFDC, NSKFDC, MoSJE, myScheme.gov.in, RBI/scheme guideline PDFs) or clearly label anything you couldn't verify as an assumption.
2. **Never fabricate silently.** If a piece of data (e.g., a Channel Partner's live NPA percentage, or a live DigiLocker feed) isn't realistically obtainable in a hackathon build, generate clearly-labeled synthetic data whose *structure and value ranges* are still grounded in what you researched — and say so explicitly in `assumptions.md`.
3. **Explainability is a hard requirement, not a nice-to-have.** Every recommendation or ranking this pipeline produces must return the *reason* (which rule/criterion fired), not just a bare answer.
4. **Every module needs a documented input/output JSON schema and at least 5 test cases**, including edge cases (missing data, boundary values, conflicting eligibility signals) — provide these as runnable tests, not prose.
5. **If something is genuinely ambiguous** (e.g., how to weight distance vs. partner health in ranking) and there's no clear right answer from research, pick a reasonable default, document it as an assumption, and proceed — do not stop and wait for clarification unless truly blocked.
6. **Prefer deterministic, auditable logic as the core**, with ML/LLM components layered on top only where they add real value (e.g., natural-language intent extraction). A rule engine that always produces the same correct output for the same input is safer for a live demo than a black box.

---

## Module 1: Verified Profile Acquisition

**Goal:** Produce a verified, structured citizen profile (the "fixed" attributes) before matching begins.

**Research first:**
- Look up DigiLocker's API/OAuth model (what document types it exposes: caste certificate, income certificate, Aadhaar-linked DOB/address, education certificates) and its typical integration flow for third-party apps.
- Look up validity periods for income certificates and caste certificates in India (they expire — find the typical renewal window).
- Check whether NSFDC/NBCFDC/NSKFDC scheme eligibility criteria reference gender-specific provisions (e.g., women-specific schemes/rebates), disability status, or existing-loan restrictions, and note them.

**Build:**
- A profile schema covering at minimum: age/DOB, gender, category (SC/OBC/Safai Karamchari/etc.), domicile state (distinct from live GPS location), annual family income + certificate issue date, education status, disability status, existing-loan flag.
- A **mock verification service** that simulates a DigiLocker-style OAuth callback returning this schema, clearly labeled as a stand-in for the real integration — do not attempt to call any real government API.
- A **manual fallback path**: the same schema fillable by direct user input, for users without digital document access, with a `verification_status: "verified" | "self_reported"` field so downstream modules know the confidence level.
- A staleness check: if `income_certificate_issue_date` is older than the researched validity window, flag `needs_reverification: true`.
- A consent-tracking field (`consent_given_at`) since this handles sensitive caste/income data — the profile should never store raw document images, only the derived structured fields.

**Deliverables:** `profile_schema.json`, mock verification service code + tests, manual fallback form logic + tests, `research_notes_profile.md`.

---

## Module 2: Intent Extraction Engine

**Goal:** From a citizen's freeform explanation of their need (typed or transcribed voice, possibly code-mixed Hindi/English or another regional language), extract structured intent slots — treat this as slot-filling, not open-ended chat.

**Research first:**
- Identify the minimum slot set actually needed downstream: purpose/project type, rough estimated cost, self vs. dependent, urgency, and loan type if the user already has a guess (education vs. business).
- Research typical cost ranges for common micro-business categories relevant to this scheme family (tailoring, small retail/kirana, vehicle-based livelihood, food stall, agri-allied) from scheme handbooks or public MSME/PMEGP project-cost references, so the agent can suggest an estimate when the user doesn't know their own project cost.
- Look at how existing government multilingual assistants (e.g., Bhashini, or chatbot patterns on myScheme.gov.in if documented) handle regional-language and code-mixed input, for a realistic approach.

**Build:**
- A slot-filling state machine: track which of the required slots are filled, ask a targeted follow-up (in the user's language) for missing/low-confidence ones, and stop after a bounded number of turns, falling back to a short explicit form if slots remain unfilled.
- Use an LLM call constrained to return **structured JSON only** (the slot schema) for extraction — do not let the model free-generate the final scheme recommendation; that belongs to Module 3.
- A confidence score per extracted slot; anything below a threshold you define (document the threshold and why) triggers a clarifying question instead of being accepted.
- Pre-fill from Module 1's profile anything already known (income, category) — the intent engine must not re-ask for data the verified profile already has.
- A final confirmation-summary step ("So you want ~₹X for Y, correct?") before intent is finalized.
- A non-LLM fallback (keyword/rule-based slot extraction) for offline/degraded-connectivity operation, since this must survive a live demo without reliable internet.

**Deliverables:** `intent_schema.json`, slot-filling logic + tests (including a code-mixed-language and an ambiguous-cost test case), LLM prompt template for structured extraction, offline fallback implementation, `research_notes_intent.md`.

---

## Module 3: Eligibility Matching & Explainable Ranking Engine

**Goal:** Given Module 1's verified profile + Module 2's extracted intent, output a ranked, explained list of eligible schemes. This is the core "AI-Driven Scheme Matching" the PS is named for.

**Research first:**
- Build a real Scheme Knowledge Base by researching actual current NSFDC, NBCFDC, and NSKFDC scheme documents (and the VISVAS umbrella scheme) — for each scheme, capture: target category, income ceiling, project-cost band, loan ceiling, interest rate (or range), moratorium period, required documents, and any gender/disability-specific variants.
- Note where schemes overlap or compete for the same use case (this ambiguity is explicitly the problem MoSJE described) so your ranking logic has real overlaps to resolve, not invented ones.

**Build:**
- Represent every scheme as a structured, versioned rule record (not inline if/else) — this is what makes the system auditable.
- **Hard-constraint filtering first**: eliminate any scheme the profile is legally/financially ineligible for (income ceiling, category, project-cost band) — these must never be soft-ranked, only pass/fail, since recommending an ineligible scheme is a real-world harm, not just a UX miss.
- **Soft ranking second**: among eligible schemes, rank by fit to the stated intent (does the project cost and purpose align with this scheme's typical use) — weight and document your ranking function.
- **Every output item must include an explanation object**: which specific rule(s) matched (e.g., `"income ₹4.2L < ₹5L ceiling"`, `"project cost ₹80k fits Micro Finance band ≤₹1.4L"`), not just a score.
- Handle the "no eligible scheme found" case explicitly and helpfully (e.g., explain the nearest threshold the user is missing, rather than a dead end).
- Optional stretch, only if time allows: an LLM/retrieval layer over the same structured knowledge base to handle fuzzy intent (e.g., "I want to open a small shop") — but it must still resolve to the same structured rule IDs for explanation, never invent a scheme.

**Deliverables:** `scheme_knowledge_base.json` (with source citations per scheme), hard-filter + ranking implementation, explanation-generation logic, at least 8 test cases (including a clean match, a multi-scheme overlap, a no-match case, and a boundary-value income case), `research_notes_matching.md`.

---

## Module 4: Partner Ranking & Routing Engine

**Goal:** Given an eligible scheme + user location, output a ranked list of nearby Channel Partners who can actually process that scheme right now.

**Research first:**
- Research what Channel Partner types exist (SCAs, PSBs, RRBs, NBFC-MFIs) and, if any public data exists on NSFDC/NBCFDC/NSKFDC channel partner lists or their disbursement/NPA reporting, note it — even aggregate/sample figures help ground your synthetic data.
- Look at how geospatial "nearest eligible provider" systems are typically built (spatial indexing, distance queries) so your design choice is grounded, not arbitrary.

**Build:**
- A partner schema: name, type, geo-coordinates, which scheme categories they process, and a capacity/health field (fund-utilization % or NPA-proximity flag) — clearly label this as synthetic/seeded data grounded in your research if you don't have a live feed.
- Ranking logic that **filters out partners over a documented capacity/NPA threshold before ranking by distance** — this exact "don't route to an overloaded partner" behavior is what the PS calls out by name, so it must be a real filter step, not decoration.
- A location fallback (pin code/district) for users without live GPS.
- Output each ranked partner with a short reason ("2.1 km away, currently accepting Micro Finance applications, 62% fund utilization").

**Deliverables:** `partner_schema.json`, partner dataset (seeded, sources/assumptions documented), ranking + filtering implementation, at least 5 test cases (including an all-partners-over-threshold case), `research_notes_partners.md`.

---

## 5. Integration Contract

After building all four modules, produce one `pipeline.md` documenting:
- The exact JSON handoff between Module 1→3, Module 2→3, and Module 3→4 (so frontend/backend engineers on the team can wire this up without re-reading your code).
- A single end-to-end example: one full run from a raw profile + freeform user statement through to a final ranked partner list, with every intermediate explanation object shown.
- A short `assumptions.md` consolidating every place you used synthetic data or made a judgment call, so the team can address these before the Grand Finale if real data becomes available.

## 6. Definition of done

- All four `research_notes_*.md` files exist with real, checkable source URLs.
- All four modules have passing tests including edge cases.
- Every recommendation/ranking output includes a human-readable explanation, not just a score.
- `pipeline.md` and `assumptions.md` exist and are consistent with the code.
- Nothing in the codebase hardcodes a scheme rate, ceiling, or partner fact without either a cited source or an explicit assumption note.
