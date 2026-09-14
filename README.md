# SchemeSetu 🌉

**SchemeSetu** ("Setu" = Bridge) is a full-stack bilingual (English / Hindi) web platform that helps Scheduled Caste (SC) beneficiaries discover the right concessional credit or education loan scheme and locate the nearest authorized Channel Partner to apply through.

## Features

- 🔍 **Smart Scheme Recommender** — Answer a few questions to get a personalized scheme recommendation
- 💰 **EMI Calculator** — Interactive calculator using the reducing-balance formula
- 🗺️ **Channel Partner Locator** — Find the nearest SCA, Bank, RRB, or NBFC-MFI with geospatial search, automatically excluding high-NPA or exhausted partners.
- 🌐 **Bilingual** — Full English/Hindi support with `localStorage` persistence
- 📱 **Mobile-first** — Responsive design tested at 360px, 768px, 1024px, 1440px
- ♿ **Accessible** — WCAG AA contrast, 44×44px tap targets, semantic HTML
- 🔐 **Auth API** — OTP and email/password authentication endpoints (JWT based)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Tailwind CSS v4, Vite |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose |
| **Database** | MongoDB Atlas (Mongoose ODM, `2dsphere` geospatial index) |
| **Auth & Security**| JWT, bcrypt, helmet, cors, express-rate-limit |
| **Validation** | express-validator |
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
│   └── src/
│       ├── main.jsx            # Entry point + router
│       ├── App.jsx             # Layout (Navbar + Outlet + Footer)
│       ├── index.css           # Tailwind v4 @theme + base styles
│       ├── context/            # LanguageContext.jsx
│       ├── components/         # Reusable UI components
│       └── pages/              # Home, Login, SchemeDetails
│
└── backend/                    # Express + MongoDB API
    ├── package.json
    ├── server.js               # Entry point (connects DB, starts Express)
    ├── .env                    # Config (PORT, MongoDB URI, JWT, OTP)
    ├── README.md               # Backend-specific documentation
    └── src/
        ├── app.js              # Express app (middleware, routes)
        ├── config/             # env.js, db.js
        ├── controllers/        # auth, scheme, partner, calculator, stats
        ├── middleware/         # auth, error, rateLimiter, validate
        ├── models/             # Application, ChannelPartner, Otp, Scheme, User
        ├── routes/             # API route definitions
        ├── seed/               # Database seed script
        ├── services/           # emi, otp, recommendation logic
        └── utils/              # apiResponse, asyncHandler
```

## Quick Start

### Prerequisites
- Node.js installed.
- MongoDB connection string (set up in `backend/.env`). A free MongoDB Atlas cluster is recommended.

### Run both frontend + backend (development)

```bash
# Terminal 1 — Backend API (port 5000)
cd backend
npm install
npm run seed          # Populate MongoDB with mock data (run once)
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

All responses follow a standard envelope: `{ "success": true/false, "data" | "error": { ... }, "message": "..." }`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Uptime and health check |
| `POST` | `/api/auth/send-otp` | Send OTP (`{ mobile_number }`) — Rate limited (3/hr) |
| `POST` | `/api/auth/verify-otp` | Verify OTP (`{ mobile_number, otp_code }`) → JWT |
| `POST` | `/api/auth/register` | Email register (`{ full_name, mobile_number, email?, password? }`) |
| `POST` | `/api/auth/login` | Email login (`{ email, password }`) |
| `GET` | `/api/auth/me` | Current user profile (JWT required) |
| `GET` | `/api/schemes` | All schemes (filters: `?lang=en&category=business`) |
| `GET` | `/api/schemes/search` | Text search on name & descriptions (`?q=education`) |
| `GET` | `/api/schemes/:scheme_id` | Single scheme by ID |
| `POST` | `/api/schemes/recommend` | Rule-based recommender (`{ category, project_cost, annual_income }`) |
| `GET` | `/api/partners` | All partners (filters: `?type=SCA&scheme_id=mcf_01`) |
| `GET` | `/api/partners/nearby` | Geospatial search (`?lat=&lng=&radius_km=10`) |
| `GET` | `/api/partners/:partner_id`| Single partner by ID |
| `POST` | `/api/calculator/emi` | EMI calculator (`{ principal, annual_rate_pct, tenure_years, moratorium_months? }`) |
| `GET` | `/api/stats` | Aggregate platform statistics |

### Frontend Routes

| Path | Page |
|------|------|
| `/` | Home (8 sections) |
| `/login` | Login (OTP + Email) |
| `/schemes/:schemeId` | Scheme Details (8 tabs) |

Valid scheme IDs: `micro-finance`, `term-loan`, `education-loan`

## License

This project is for demonstration purposes.
