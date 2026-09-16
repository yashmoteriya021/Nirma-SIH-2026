# SchemeSetu Backend API

Node.js + Express + MongoDB backend for SchemeSetu — a bilingual platform helping Scheduled Caste (SC) beneficiaries find concessional credit/education loan schemes and locate eligible Channel Partners.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (edit .env as needed)
cp .env.example .env

# 3. Start MongoDB (must be running on localhost:27017)
# e.g. mongosh, mongod, or MongoDB Compass

# 4. Seed the database with mock data
npm run seed

# 5. Start the development server
npm run dev
```

The API will be available at **http://localhost:5000**.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |
| `MONGODB_URI` | `mongodb://localhost:27017/schemesetu` | MongoDB connection string |
| `JWT_SECRET` | — | Secret key for JWT signing (change in production!) |
| `JWT_EXPIRES_IN` | `7d` | JWT token expiry duration |
| `OTP_EXPIRY_MINUTES` | `5` | OTP validity period in minutes |
| `OTP_MOCK_MODE` | `true` | `true` = OTP logged to console; `false` = real SMS provider |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed CORS origins |

## API Endpoints

All responses follow a consistent envelope:

```json
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Uptime check |

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/send-otp` | `{ mobile_number }` | Send OTP (rate-limited: 3/hr) |
| POST | `/api/auth/verify-otp` | `{ mobile_number, otp_code }` | Verify OTP → returns JWT |
| POST | `/api/auth/register` | `{ full_name, mobile_number, email?, password? }` | Register new user |
| POST | `/api/auth/login` | `{ email, password }` | Email/password login |
| GET | `/api/auth/me` | — (JWT required) | Current user profile |

### Schemes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schemes?lang=en&category=business` | List schemes (optional filters) |
| GET | `/api/schemes/search?q=education&lang=en` | Text search on name + descriptions |
| GET | `/api/schemes/:scheme_id?lang=hi` | Single scheme |
| POST | `/api/schemes/recommend` | Recommendation engine (body: `{ category, project_cost, annual_income }`) |

### Channel Partners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partners?type=SCA&scheme_id=mcf_01` | List partners (optional filters) |
| GET | `/api/partners/nearby?lat=23.02&lng=72.57&radius_km=10&scheme_id=mcf_01` | Geospatial nearby search |
| GET | `/api/partners/:partner_id` | Single partner |

### Calculator

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/calculator/emi` | EMI calculator (body: `{ principal, annual_rate_pct, tenure_years, moratorium_months? }`) |

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Aggregate platform statistics |

## Folder Structure

```
/backend
  /src
    /config        env.js, db.js
    /models        Scheme.js, ChannelPartner.js, User.js, Otp.js, Application.js
    /controllers   auth.controller.js, scheme.controller.js, partner.controller.js,
                   calculator.controller.js, stats.controller.js
    /routes        auth.routes.js, scheme.routes.js, partner.routes.js,
                   calculator.routes.js, stats.routes.js
    /middleware    auth.middleware.js, error.middleware.js, validate.middleware.js,
                   rateLimiter.middleware.js
    /services      otp.service.js, emi.service.js, recommendation.service.js
    /utils         asyncHandler.js, apiResponse.js
    /seed          seed.js
    app.js
  server.js
  .env.example
  package.json
  README.md
```

## Business Logic

### Recommendation Engine
- Income > ₹5,00,000 → **Not eligible**
- Category = `education` → **Education Loan Scheme**
- Category = `business`, cost ≤ ₹1,40,000 → **Micro Credit Finance**
- Category = `business`, cost ≤ ₹50,00,000 → **Term Loan**
- Cost > ₹50,00,000 → **Manual review**

### Partner Search Filters
The geospatial `/nearby` endpoint automatically excludes:
- Partners with `npa_rate > 7%`
- Partners with `fund_status: "exhausted"`

### EMI Calculator
Standard reducing-balance formula. If `moratorium_months` is provided, interest accrues during the moratorium and is added to the principal before EMI calculation begins.

## Security
- **helmet** — HTTP security headers
- **cors** — restricted to configured origins
- **express-rate-limit** — OTP abuse prevention (3/hr), auth rate limiting (10/15min)
- **express-validator** — input validation on all POST endpoints
- **bcrypt** — password hashing (10 salt rounds)
- **JWT** — stateless authentication
- Centralized error handler — never leaks stack traces in production
