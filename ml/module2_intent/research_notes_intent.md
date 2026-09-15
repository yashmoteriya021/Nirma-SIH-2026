# Research Notes: Module 2 — Intent Extraction Engine

## Slot Set Design

**Minimum downstream slots needed (for Module 3 matching):**
- `purpose` — determines which scheme category applies (business vs education vs sanitation)
- `estimated_cost` — determines which loan band (Micro Credit ≤₹1.4L vs Term Loan vs Education)
- `beneficiary` — self vs dependent (relevant for education loans)
- `loan_type_guess` — optional, non-binding user hint
- `urgency` — not used for eligibility but helps user experience

## Typical Micro-Business Cost Ranges

**Sources:** PMEGP e-portal (kviconline.gov.in), MSME project reports, various industry resources

| Business Type | Estimated Cost Range | Key Drivers |
|---|---|---|
| Tailoring (home-based) | ₹20K – ₹1L | Domestic sewing machine, basic setup |
| Tailoring (shop) | ₹1L – ₹5L | Industrial machines, shop rent, interiors |
| Kirana store | ₹3.5L – ₹15L | Initial stock (largest cost), shelving, rent |
| Food stall/kiosk | ₹1.5L – ₹5L | Equipment, FSSAI license, location/cart |
| Beauty parlour | ₹1L – ₹5L | Equipment, cosmetics, shop setup |
| Mobile repair | ₹50K – ₹3L | Tools, components, small shop |
| Dairy business | ₹1L – ₹5L | Cattle, shed, equipment |
| Poultry farm | ₹50K – ₹5L | Birds, feed, shed |
| Auto transport | ₹2L – ₹8L | Vehicle cost, permits |
| Welding/fabrication | ₹1L – ₹5L | Welding machines, raw material |

**PMEGP scheme reference:**
- Service/trading sector max: ₹20L project cost
- Manufacturing sector max: ₹50L project cost
- SC/OBC get 25% (rural) / 15% (urban) subsidy as special category

## Multilingual / Code-Mixed Input Handling

**Sources:** Bhashini portal (bhashini.gov.in), MeitY documentation

### Bhashini (Government India's language AI platform)
- Provides APIs for: ASR (speech-to-text), TTS, Machine Translation, Transliteration
- Supports all 22 scheduled Indian languages
- Actively working on code-mixed datasets (Hinglish, etc.)
- Integrated with UMANG, DigiLocker, CSCs
- Deployed chatbots (e.g., Kumbh Sah'AI'yak) demonstrate real-world multilingual capability

### Our Approach
For a hackathon build, we use two strategies:

1. **LLM-based extraction (primary):** Modern LLMs (GPT-4, Gemini) handle Hindi, English, and code-mixed input natively. We constrain output to structured JSON.

2. **Offline rule-based extraction (fallback):** Keyword dictionaries in:
   - English
   - Hindi (Devanagari script: सिलाई, दुकान, पढ़ाई, etc.)
   - Hinglish (Roman transliteration: silai, dukaan, padhai, etc.)

   This ensures the system works without internet during a live demo.

### Code-Mixed Input Patterns
Common patterns in Indian users' text:
- "Mujhe ek dukaan kholni hai" (Hinglish — want to open a shop)
- "tailoring ka kaam shuru karna hai, 80 hazar chahiye" (mixed English+Hindi in Roman)
- "मेरे बेटे की पढ़ाई के लिए 5 lakh चाहिए" (Hindi + English cost figure)

Our regex patterns handle ₹ symbol, "lakh/lac/लाख", "hazar/हज़ार", and plain numbers.

## Confidence Threshold Decision

**Chosen threshold: 0.6**

| Threshold | Trade-off |
|---|---|
| 0.5 | Too aggressive — accepts weak matches, may misclassify |
| 0.6 | **Balanced** — accepts reasonably confident matches, asks for ambiguous ones |
| 0.8 | Too conservative — over-questions the user, poor UX |

Rationale: In a government assistance context, it's better to ask one clarifying question than to misroute a loan application. But asking too many questions creates friction for users who may have limited digital literacy. 0.6 balances these concerns.

## Implementation Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Max clarification turns | 5 | Prevents infinite loops; sufficient for all required slots |
| LLM temperature | 0.1 | Low temperature for deterministic extraction |
| Fallback strategy | Auto-fallback to offline on LLM error | Demo reliability |
| Cost estimation | Suggest typical ranges from PMEGP data | Helps users who don't know their project cost |
| Pre-fill from profile | Income, category, gender, state | Never re-ask data the verified profile already has |
