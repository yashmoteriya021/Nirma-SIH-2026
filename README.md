# SchemeSetu 🌉

**SchemeSetu** ("Setu" = Bridge) is a full-stack bilingual (English / Hindi) web platform that helps Scheduled Caste (SC) beneficiaries discover the right concessional credit or education loan scheme and locate the nearest authorized Channel Partner to apply through.

## Features

- 🔍 **Smart Scheme Recommender** — Answer a few questions to get a personalized scheme recommendation
- 💰 **EMI Calculator** — Interactive calculator using the reducing-balance formula
- 🗺️ **Channel Partner Locator** — Find the nearest SCA, Bank, RRB, or NBFC-MFI with geolocation
- 🌐 **Bilingual** — Full English/Hindi support with `localStorage` persistence
- 📱 **Mobile-first** — Responsive design tested at 360px, 768px, 1024px, 1440px
- ♿ **Accessible** — WCAG AA contrast, 44×44px tap targets, semantic HTML
- 🔐 **Auth API** — OTP and email/password authentication endpoints

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Tailwind CSS v4, Vite |
| **Backend** | Node.js, Express 5 |
| **i18n** | React Context API |
| **Build** | Vite (frontend), Node.js (backend) |

## Project Structure

```
d:\SIH\
├── brain.md                    # Project architecture & workflow docs
├── README.md                   # This file
├── .gitignore
│
├── frontend/                   # React + Tailwind (Vite)
│   ├── package.json
│   ├── vite.config.js          # Includes /api proxy to backend
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx            # Entry point + router
│       ├── App.jsx             # Layout (Navbar + Outlet + Footer)
│       ├── index.css           # Tailwind v4 @theme + base styles
│       ├── context/
│       │   └── LanguageContext.jsx
│       ├── data/
│       │   ├── schemes.json
│       │   ├── partners.json
│       │   └── translations.json
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Footer.jsx
│       │   ├── LanguageToggle.jsx
│       │   ├── SearchBar.jsx
│       │   ├── SchemeCard.jsx
│       │   ├── SchemeRecommender.jsx
│       │   ├── EMICalculator.jsx
│       │   ├── PartnerLocator.jsx
│       │   ├── Accordion.jsx
│       │   ├── StatChip.jsx
│       │   └── OTPInput.jsx
│       └── pages/
│           ├── Home.jsx
│           ├── Login.jsx
│           └── SchemeDetails.jsx
│
└── backend/                    # Express API
    ├── package.json
    ├── server.js               # Entry point
    ├── .env                    # Environment variables
    ├── config/
    │   └── index.js            # Config loader
    ├── middleware/
    │   └── errorHandler.js     # Error & 404 handlers
    ├── routes/
    │   ├── schemes.js          # /api/schemes endpoints
    │   ├── partners.js         # /api/partners endpoints
    │   └── auth.js             # /api/auth endpoints
    └── data/
        ├── schemes.json        # 3 seeded schemes
        └── partners.json       # 5 seeded partners
```

## Quick Start

### Run both frontend + backend (development)

```bash
# Terminal 1 — Backend API (port 5000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (port 5173, proxies /api → backend)
cd frontend
npm install
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health check**: http://localhost:5000/api/health

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/schemes` | All schemes (supports `?category`, `?maxAmount`, `?incomeLimit` filters) |
| `GET` | `/api/schemes/:id` | Single scheme by ID |
| `POST` | `/api/schemes/recommend` | Rule-based recommender (`{ purpose, estimatedCost, annualIncome }`) |
| `GET` | `/api/partners` | All partners (supports `?scheme`, `?type`, `?city`, `?lat&lng` filters) |
| `GET` | `/api/partners/:id` | Single partner by ID |
| `POST` | `/api/auth/send-otp` | Send OTP (`{ phone }`) — demo OTP: `123456` |
| `POST` | `/api/auth/verify-otp` | Verify OTP (`{ phone, otp }`) |
| `POST` | `/api/auth/login` | Email login (`{ email, password }`) |

### Frontend Routes

| Path | Page |
|------|------|
| `/` | Home (8 sections) |
| `/login` | Login (OTP + Email) |
| `/schemes/:schemeId` | Scheme Details (8 tabs) |

Valid scheme IDs: `micro-finance`, `term-loan`, `education-loan`

## License

This project is for demonstration purposes.
