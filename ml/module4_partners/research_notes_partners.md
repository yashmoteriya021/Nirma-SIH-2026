# Research Notes: Module 4 — Partner Routing & Capacity Checks

## Channel Partner Types

NSFDC, NBCFDC, and NSKFDC execute schemes via "Channel Partners", not directly.

1. **State Channelizing Agencies (SCAs):** State-level govt bodies (e.g., MP SC Finance and Development Corporation). Historically the primary route.
2. **Public Sector Banks (PSBs):** SBI, PNB, Canara Bank, etc.
3. **Regional Rural Banks (RRBs):** E.g., Aryavart Bank, Baroda UP Gramin Bank.
4. **NBFC-MFIs / Cooperatives:** Microfinance institutions.

### Active/Inactive Status
SCAs often face suspension if they fail to furnish Utilization Certificates (UCs) for previous drawdowns. A digital system MUST verify `is_active` status before routing to prevent black-hole applications.

### NPA Thresholds (The "Healthy Partner" Check)
- **NSFDC Guideline:** RRBs and cooperative banks must have Net NPA of less than 15% in at least 3 out of the last 6 financial years to be eligible for drawing funds.
- **Why it matters:** If an applicant is routed to a branch with 20% NPA, that branch is likely blocked from disbursing new NSFDC funds, even if the scheme exists on paper.

### Fund Utilization (The "Capacity" Check)
- Funds are allocated annually.
- SCAs/Banks have a fixed corpus. Once utilization exceeds ~90-95%, they halt new approvals until the next financial year or a fresh tranche is released.
- Routing to a 98%-utilized partner guarantees a long waitlist.

## Our Approach (Module 4)

We implemented a two-stage filter:
1. **Hard Filter:** Remove inactive, high-NPA (≥15%), over-capacity (≥90%), or wrong-scheme partners.
2. **Geo-Ranking:** Sort the remaining eligible partners by Haversine distance.

This directly addresses the PS requirement to "not route to an overloaded partner" and solves real-world pain points of scheme execution.

## Geolocation Handling
- Primary: GPS coordinates (`latitude`, `longitude`).
- Fallback: 6-digit PIN code mapped to approximate state/region centroids. (In a production system, this would be a full postal code DB).

## Synthetic Dataset
We generated a 50-partner synthetic dataset covering 6 states with realistic coordinates, mixed NPA levels, and various utilization percentages to demonstrate the filtering and ranking logic.
