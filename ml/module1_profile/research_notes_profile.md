# Research Notes: Module 1 — Verified Profile Acquisition

## DigiLocker API / OAuth Integration

**Source:** [DigiLocker Partner Portal (API Setu)](https://partners.apisetu.gov.in/)

- DigiLocker uses **OAuth 2.0** and **OpenID Connect** for third-party app integration.
- Flow: Register as Requester → obtain Client ID/Secret → redirect user to consent page → user authenticates via Aadhaar/mobile + OTP → callback with auth code → exchange for access token → fetch documents.
- Documents fetched are **digitally signed by issuers** (e.g., state government departments) and carry same legal validity as physical originals.
- Available document types include: Aadhaar, PAN, Caste Certificate, Income Certificate, Domicile Certificate, Education Certificates (marksheets), Driving License, etc.
- Compliance with **Digital Personal Data Protection (DPDP) Act, 2023** is mandatory — clear consent management required, users can grant/revoke access.
- **Sandbox environment** available for testing before production.

## Certificate Validity Periods

### Income Certificate
**Sources:** [bankbazaar.com](https://bankbazaar.com), [herofincorp.com](https://herofincorp.com), [indiacertify.com](https://indiacertify.com), [careers360.com](https://careers360.com)

- Valid for **1 financial year** from date of issue (most states).
- Indian financial year: April 1 – March 31.
- Some states/schemes may specify 3 months to several years, but 1 FY is the standard.
- Renewal recommended **1–2 months before expiry** to avoid processing delays.

### Caste Certificate (SC/ST)
**Sources:** [godigit.com](https://godigit.com), [jaagrukbharat.com](https://jaagrukbharat.com), [sarkaridoc.com](https://sarkaridoc.com)

- SC/ST certificates: **lifetime validity**, no renewal required.
- Once issued by a competent authority, they do not expire.

### Caste Certificate (OBC-NCL)
**Sources:** [bharatnotes.com](https://bharatnotes.com), [careers360.com](https://careers360.com), [collegedekho.com](https://collegedekho.com)

- OBC **Non-Creamy Layer** certificates: **valid for 1 financial year**.
- Tied to annual income verification (family income must remain below the creamy-layer threshold of ₹8 lakh for central government purposes).
- Must be renewed annually.
- For central exams/admissions (UPSC, IIT, NIT), certificate often must be from recent financial years.

## Gender-Specific Provisions (NSFDC/NBCFDC/NSKFDC)

### NSFDC
**Source:** [nsfdc.nic.in](https://nsfdc.nic.in)

- **Interest rebate of 0.5%** for women beneficiaries across credit schemes.
- **40% of funds** under Term Loan and Micro Finance earmarked for women.
- Dedicated women-only schemes:
  - **Mahila Samriddhi Yojana (MSY):** Micro-finance for women.
  - **Mahila Kisan Yojana (MKY):** Women in agriculture.
  - **Nari Arthik Sashaktikaran Yojana (NASY):** Single women, widows, female heads of household.

### NBCFDC
**Source:** [nbcfdc.gov.in](https://nbcfdc.gov.in)

- **New Swarnima for Women:** Up to ₹2 lakh at 5% interest (lower than general schemes).
- Education loan: **3.5% for girl students** (vs. 4% general).

### NSKFDC
**Source:** [nskfdc.nic.in](https://nskfdc.nic.in)

- **1% interest rebate** for women beneficiaries.
- **Mahila Samriddhi Yojana:** Targeted support for women.

## Disability Provisions

**Source:** NSFDC and NHFDC (National Handicapped Finance and Development Corporation)

- NSFDC's primary mandate is SC, not disability-specific.
- **NHFDC** (separate corporation) handles PwD loans — **1% special interest rebate** for women with disabilities.
- However, disability status is still relevant to capture in the profile schema because:
  - Some schemes under PMEGP give special subsidy rates for PwD (SC + PwD = cumulative benefit).
  - NSKFDC considers disability among Safai Karamcharis.

## Implementation Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Staleness period for income cert | 1 financial year (Apr–Mar) | Most common standard across states |
| SC cert validity | Lifetime | Universally recognized across all states |
| OBC-NCL cert validity | 1 financial year | Tied to annual creamy-layer verification |
| Raw documents storage | Not stored | DPDP Act compliance — only structured derived fields |
| Consent tracking | `consent_given_at` timestamp | Legal requirement under DPDP Act 2023 |
