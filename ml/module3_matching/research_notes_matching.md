# Research Notes: Module 3 — Eligibility Matching & Explainable Ranking

## Scheme Knowledge Base — Sources

### NSFDC (National Scheduled Castes Finance and Development Corporation)
**Source:** [nsfdc.nic.in](https://nsfdc.nic.in), [dosje.gov.in](https://dosje.gov.in), [myScheme.gov.in](https://myscheme.gov.in), [PIB](https://pib.gov.in)

| Scheme | Limit | Rate | Source Verified |
|---|---|---|---|
| Micro Credit Finance (MCF) | ≤₹1.4L | 6.5% | ✅ nsfdc.nic.in, myScheme.gov.in |
| Term Loan | ₹1.4L–₹50L | 8% | ✅ dosje.gov.in |
| Educational Loan (ELS) | ≤₹40L | 4% (3.5% women) | ✅ nsfdc.nic.in, propelld.com |
| Mahila Samriddhi Yojana | micro | 6% | ✅ nsfdc.nic.in |
| NASY (single women) | ≤₹3L | 5% | ⚠️ Assumption: exact ceiling/rate inferred from scheme description |

**Income ceiling:** ₹5,00,000 (revised from ₹3L per PIB circular Jan 2026).
**Women's rebate:** 0.5% across credit schemes.
**40% fund allocation** to women beneficiaries.

### NBCFDC (National Backward Classes Finance and Development Corporation)
**Source:** [nbcfdc.gov.in](https://nbcfdc.gov.in), [negd.in](https://negd.in), [umang.gov.in](https://umang.gov.in), [PIB](https://pib.gov.in)

| Scheme | Limit | Rate | Source Verified |
|---|---|---|---|
| General Loan | ≤₹15L | 6–8% (tiered) | ✅ nbcfdc.gov.in |
| Small Loan | ≤₹1.25L | 6% | ✅ nbcfdc.gov.in |
| New Swarnima (Women) | ≤₹2L | 5% | ✅ nbcfdc.gov.in, PIB |
| Education Loan | ≤₹10L/₹20L | 4% (3.5% girls) | ✅ negd.in |

**Income ceiling:** ₹5,00,000 (some legacy docs say ₹3L — using ₹5L per latest).
**Tiered rates:** 6% (≤5L), 7% (5-10L), 8% (10-15L).

### NSKFDC (National Safai Karamcharis Finance and Development Corporation)
**Source:** [nskfdc.nic.in](https://nskfdc.nic.in), general web searches

| Scheme | Limit | Rate | Source Verified |
|---|---|---|---|
| General Term Loan | ≤₹15L | 6–9% | ⚠️ Range from general web; exact tiers not found on official site |
| Swachhta Udyami Yojana | varies | 6% | ⚠️ Assumed same terms as GTL |
| Education Loan | ≤₹10L/₹20L | ~4% | ⚠️ Approximate from general sources |

**Women's rebate:** 1% (higher than NSFDC's 0.5%).
**Target:** Safai Karamcharis, manual scavengers (MS Act 2013), waste pickers, dependents.

### VISVAS (Interest Subvention)
**Source:** [nbcfdc.gov.in](https://nbcfdc.gov.in), [umang.gov.in](https://umang.gov.in), [PIB](https://pib.gov.in), [myScheme.gov.in](https://myScheme.gov.in)

- 5% p.a. interest subvention via DBT
- Individual limit: ₹2L, SHG limit: ₹4L
- **Income ceiling: ₹3,00,000** (lower than other schemes)
- Must have "standard" (regular repayment) loan account
- Converges with MUDRA, NRLM, NULM, NABARD
- Cannot claim multiple subventions simultaneously

## Scheme Overlaps Identified

The PS explicitly mentions scheme ambiguity as the core problem. Key overlaps:

1. **Micro Credit Finance (NSFDC MCF) vs Mahila Samriddhi (NSFDC MSY):**
   Both target SC, ≤₹1.4L band. MSY is women-only at 6% vs MCF at 6.5%. Women should be directed to MSY first.

2. **NSFDC MCF vs NBCFDC Small Loan:**
   Similar cost band (≤₹1.25L vs ≤₹1.4L) but target different categories (SC vs OBC). Category filter resolves this.

3. **Education loans across all three corporations:**
   NSFDC ELS (SC), NBCFDC EL (OBC), NSKFDC EL (SafaiKaramchari). All have similar terms (~4%). Category filter resolves.

4. **VISVAS convergence:**
   Can layer on top of existing MUDRA/NRLM loans for additional 5% subvention. Only for ≤₹3L income.

## Ranking Weight Rationale

| Factor | Weight | Why |
|---|---|---|
| Purpose alignment | 0.35 | Most important — wrong purpose = wrong scheme entirely |
| Cost-band fit | 0.25 | Being in the sweet spot of the band matters (not just eligible) |
| Interest rate | 0.20 | Direct financial impact on the citizen |
| Gender/special benefits | 0.10 | Important but secondary to core fit |
| Verification confidence | 0.10 | Verified profiles have higher processing success |

**Total: 1.00**

These weights are assumptions — documented in assumptions.md. They could be tuned with real user feedback data.

## Implementation Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Hard filter before soft rank | Yes | Ineligible schemes must never appear in recommendations |
| Cost=None handling | Pass with caveat | Don't block matching when cost is unknown; flag it |
| Tiered interest rates | Use lowest tier | For ranking purposes; actual rate determined at partner |
| VISVAS rate | -5.0 (negative) | Represents subvention, not a loan rate |
| Near-miss limit | Top 3 | Enough to be helpful without overwhelming |
