# 🧠 SchemeSetu — Project Brain

> This file documents the workflow, architecture, data flow, and component structure of the SchemeSetu web application. Use it as the single source of truth when reviewing or extending the codebase.

---

## 1. Project Overview

**SchemeSetu** ("Setu" = Bridge) is a bilingual (English / Hindi) web platform that helps Scheduled Caste (SC) beneficiaries:

1. **Discover** the right concessional credit / education loan scheme.
2. **Understand** eligibility, EMI, and required documents.
3. **Locate** the nearest authorized Channel Partner (SCA / Bank / RRB / NBFC-MFI) to apply through.

### Target Audience
- First-time digital users from semi-urban / rural India
- Primary language: Hindi (with English fallback)
- Devices: low-to-mid-range Android phones (360px viewport is the baseline)

### Core Principles
| Principle | Implementation |
|-----------|---------------|
| Clarity over flair | No parallax, no carousels, no scroll-jacking |
| Trust first | Lock icons, reassurance copy, no dark patterns |
| Bilingual always | Every user-facing string in EN + HI via LanguageContext |
| Accessibility | WCAG AA contrast, 44×44px tap targets, semantic HTML |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 (functional components + hooks) |
| **Routing** | React Router v7 (3 routes) |
| **Styling** | Tailwind CSS v4 (`@theme` in `index.css`) |
| **i18n** | React Context API (`LanguageContext`) + `localStorage` |
| **Build** | Vite 8 |
| **Backend** | Node.js + Express 5 + MongoDB + Mongoose |
| **Database** | MongoDB (Mongoose ODM, 2dsphere geospatial index) |
| **Auth** | JWT (jsonwebtoken) + OTP (mock/real SMS) |
| **Security** | helmet, cors, express-rate-limit, bcrypt |
| **Validation** | express-validator |
| **Logging** | morgan (dev only) |
| **CORS** | `cors` package |
| **Config** | `dotenv` |
| **Fonts** | Inter / Poppins (EN), Noto Sans Devanagari (HI) via Google Fonts |

---

## 3. Folder Structure (Full-Stack)

```
d:\SIH\
├── brain.md                        ← This file
├── README.md                       ← Setup & run instructions
├── .gitignore
│
├── frontend/                       ← React + Tailwind (Vite)
│   ├── package.json
│   ├── vite.config.js              ← Includes /api proxy to backend
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx                ← Entry point + router
│       ├── App.jsx                 ← Layout (Navbar + Outlet + Footer)
│       ├── index.css               ← Tailwind v4 @theme + base styles
│       ├── context/
│       │   └── LanguageContext.jsx  ← EN/HI state + localStorage
│       ├── data/
│       │   ├── schemes.json        ← 3 seeded schemes
│       │   ├── partners.json       ← 5 seeded partners
│       │   └── translations.json   ← All UI strings { en, hi }
│       ├── components/
│       │   ├── Navbar.jsx          ← Sticky nav, search, hamburger
│       │   ├── Footer.jsx          ← Links, helpline, accessibility
│       │   ├── LanguageToggle.jsx  ← EN | हिं pill toggle
│       │   ├── SearchBar.jsx       ← Autocomplete search
│       │   ├── SchemeCard.jsx      ← Scheme card with icon + tags
│       │   ├── SchemeRecommender.jsx ← 4-input rule engine
│       │   ├── EMICalculator.jsx   ← Sliders + reducing-balance EMI
│       │   ├── PartnerLocator.jsx  ← City search + geolocation
│       │   ├── Accordion.jsx       ← Click-to-expand
│       │   ├── StatChip.jsx        ← Trust strip chip
│       │   └── OTPInput.jsx        ← 6-digit OTP boxes
│       └── pages/
│           ├── Home.jsx            ← 8-section landing page
│           ├── Login.jsx           ← OTP + email tabs
│           └── SchemeDetails.jsx   ← Dynamic route, 8 tabs
│
└── backend/                        ← Express + MongoDB API
    ├── package.json
    ├── server.js                   ← Entry point (connects DB, starts Express)
    ├── .env                        ← PORT, CORS, JWT, MongoDB, OTP config
    ├── .env.example                ← Template for env vars
    ├── README.md                   ← Setup + endpoint reference
    └── src/
        ├── app.js                  ← Express app (helmet, cors, routes, error handling)
        ├── config/
        │   ├── env.js              ← Centralized config loader (dotenv)
        │   └── db.js               ← MongoDB/Mongoose connection
        ├── models/
        │   ├── Scheme.js           ← Scheme schema (text index)
        │   ├── ChannelPartner.js   ← Partner schema (2dsphere index)
        │   ├── User.js             ← User schema (bcrypt hashing)
        │   ├── Otp.js              ← OTP schema (TTL auto-cleanup)
        │   └── Application.js      ← Application tracking schema
        ├── controllers/
        │   ├── auth.controller.js
        │   ├── scheme.controller.js
        │   ├── partner.controller.js
        │   ├── calculator.controller.js
        │   └── stats.controller.js
        ├── routes/
        │   ├── auth.routes.js
        │   ├── scheme.routes.js
        │   ├── partner.routes.js
        │   ├── calculator.routes.js
        │   └── stats.routes.js
        ├── middleware/
        │   ├── auth.middleware.js       ← JWT verification
        │   ├── error.middleware.js      ← Centralized error handler
        │   ├── validate.middleware.js   ← express-validator chains
        │   └── rateLimiter.middleware.js ← OTP abuse prevention
        ├── services/
        │   ├── otp.service.js           ← Mock/real SMS abstraction
        │   ├── emi.service.js           ← Reducing-balance EMI formula
        │   └── recommendation.service.js ← Rule-based scheme matcher
        ├── utils/
        │   ├── asyncHandler.js
        │   └── apiResponse.js
        └── seed/
            └── seed.js              ← Populates mock schemes + partners
```

---

## 4. Routing Map

### Frontend Routes
```
/                       → Home.jsx
/login                  → Login.jsx
/schemes/:schemeId      → SchemeDetails.jsx
```

Valid `:schemeId` values: `micro-finance`, `term-loan`, `education-loan`

### Backend API Endpoints
```
GET    /api/health                          → Uptime check
POST   /api/auth/send-otp                   → Send OTP { mobile_number } (rate-limited 3/hr)
POST   /api/auth/verify-otp                 → Verify OTP { mobile_number, otp_code } → JWT
POST   /api/auth/register                   → Register { full_name, mobile_number, email?, password? }
POST   /api/auth/login                      → Email login { email, password }
GET    /api/auth/me                         → Current user profile (JWT required)
GET    /api/schemes?lang=en&category=business → List schemes (optional filters)
GET    /api/schemes/search?q=education&lang=en → Text search on name + descriptions
GET    /api/schemes/:scheme_id?lang=hi       → Single scheme
POST   /api/schemes/recommend               → Rule engine { category, project_cost, annual_income }
GET    /api/partners?type=SCA&scheme_id=mcf_01 → Filtered partner list
GET    /api/partners/nearby?lat=&lng=&radius_km=10&scheme_id= → Geospatial search
GET    /api/partners/:partner_id            → Single partner
POST   /api/calculator/emi                  → EMI calculator { principal, annual_rate_pct, tenure_years, moratorium_months? }
GET    /api/stats                           → Aggregate platform statistics
```

### Response Envelope
```json
{ "success": true,  "data": { ... }, "message": "..." }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

### Dev Proxy
Frontend Vite config proxies `/api/*` requests to `http://localhost:5000` during development.

---

## 5. Data Flow Diagram

```mermaid
graph TD
    A[User opens SchemeSetu] --> B{Language preference in localStorage?}
    B -->|Yes| C[Load saved language]
    B -->|No| D[Default to English]
    C --> E[Render App with LanguageContext]
    D --> E

    E --> F[Home Page]
    F --> G[Scheme Recommender Widget]
    G --> H{User inputs: Purpose, Cost, Income}
    H --> I{Income > 5L?}
    I -->|Yes| J[Show 'Not Eligible' message]
    I -->|No| K{Purpose = Education?}
    K -->|Yes| L[Recommend Education Loan]
    K -->|No| M{Cost ≤ 1.4L?}
    M -->|Yes| N[Recommend Micro Finance]
    M -->|No| O[Recommend Term Loan]

    L --> P[Link to /schemes/education-loan]
    N --> Q[Link to /schemes/micro-finance]
    O --> R[Link to /schemes/term-loan]

    E --> S[Scheme Details Page]
    S --> T[EMI Calculator]
    T --> U[EMI = P × r × (1+r)^n / ((1+r)^n − 1)]
    S --> V[Partner Locator]
    V --> W[Filter partners by scheme eligibility + distance]
```

---

## 6. Scheme Recommender — Rule Engine

```
INPUT:  purpose (enum), estimatedCost (number), annualIncome (number), isStudying (bool)

RULES (evaluated top-to-bottom, first match wins):
  1. annualIncome > 500000       → INELIGIBLE
  2. purpose === 'education'     → education-loan
  3. estimatedCost <= 140000     → micro-finance
  4. estimatedCost <= 5000000    → term-loan
  5. estimatedCost > 5000000    → INELIGIBLE (exceeds max term loan)
```

---

## 7. EMI Calculator — Formula

**Reducing Balance Method:**

```
r = annualRate / 12 / 100       // monthly interest rate
n = tenureInMonths
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)

Total Repayment = EMI × n
Total Interest  = Total Repayment − P
```

**Default values per scheme:**

| Scheme | Default P | Default Rate | Default Tenure |
|--------|-----------|-------------|----------------|
| Micro Finance | ₹1,00,000 | 6.5% | 36 months |
| Term Loan | ₹5,00,000 | 6.5% | 84 months |
| Education Loan | ₹3,00,000 | 4.0% | 60 months |

---

## 8. Component Dependency Graph

```
App.jsx
├── Navbar.jsx
│   ├── SearchBar.jsx
│   └── LanguageToggle.jsx
├── <Outlet /> (React Router)
│   ├── Home.jsx
│   │   ├── SchemeRecommender.jsx
│   │   ├── SchemeCard.jsx (×3)
│   │   ├── StatChip.jsx (×4)
│   │   └── Accordion.jsx (×5)
│   ├── Login.jsx
│   │   └── OTPInput.jsx
│   └── SchemeDetails.jsx
│       ├── EMICalculator.jsx
│       ├── PartnerLocator.jsx
│       ├── Accordion.jsx (×N)
│       └── SchemeCard.jsx (×2–3 related)
└── Footer.jsx
    └── LanguageToggle.jsx
```

---

## 9. Design Tokens (Tailwind Config)

| Token | Hex | CSS Variable |
|-------|-----|-------------|
| `navy-900` | `#0A2647` | `--color-navy-900` |
| `navy-700` | `#14395B` | `--color-navy-700` |
| `navy-100` | `#D8E1EA` | `--color-navy-100` |
| `offwhite-50` | `#FAF8F3` | `--color-offwhite-50` |
| `offwhite-0` | `#FFFFFF` | `--color-offwhite-0` |
| `ink-900` | `#1C2530` | `--color-ink-900` |
| `accent-gold` | `#C9982A` | `--color-accent-gold` |

---

## 10. Language System

- All UI strings live in `src/data/translations.json`
- `LanguageContext` provides `{ lang, setLang, t(key) }` to all components
- `lang` is persisted to `localStorage('schemesetu-lang')`
- Toggle updates `lang` → all components re-render with new strings
- Scheme data has inline `{ en, hi }` name fields; descriptions follow the same pattern

---

## 11. Build & Run

```bash
# Terminal 1 — Backend API (port 5000)
cd d:\SIH\backend
npm install
npm run seed          # Populate MongoDB with mock data (run once)
npm run dev

# Terminal 2 — Frontend (port 5173, proxies /api → :5000)
cd d:\SIH\frontend
npm install
npm run dev
```

**Prerequisites**: MongoDB must be running on `localhost:27017` (or update `MONGODB_URI` in `.env`).

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health check**: http://localhost:5000/api/health

---

## 12. Accessibility Checklist

- [x] Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- [x] WCAG AA contrast on all text/background pairs
- [x] 44×44px minimum tap targets
- [x] Icon buttons always have visible text labels
- [x] Focus-visible outlines on all interactive elements
- [x] `aria-label` on icon-only elements (if any)
- [x] Language toggle persists across pages and reloads
- [x] Plain-language tooltips for financial terms

---

## 13. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `SchemeCard.jsx` |
| Files (data) | kebab-case | `schemes.json` |
| CSS classes | Tailwind utilities | `bg-navy-900 text-offwhite-50` |
| Translation keys | dot-notation | `home.hero.title` |
| Route params | kebab-case | `:schemeId` = `micro-finance` |

---

*Last updated: 2026-09-13*
