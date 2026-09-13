import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import schemesRouter from './routes/schemes.js';
import partnersRouter from './routes/partners.js';
import authRouter from './routes/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SchemeSetu API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/schemes', schemesRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/auth', authRouter);

// ─── Error Handling ─────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │  SchemeSetu API Server                  │
  │  Environment: ${config.nodeEnv.padEnd(25)}│
  │  Port:        ${String(config.port).padEnd(25)}│
  │  CORS:        ${config.corsOrigin[0].padEnd(25)}│
  │                                         │
  │  Endpoints:                             │
  │    GET  /api/health                     │
  │    GET  /api/schemes                    │
  │    GET  /api/schemes/:id                │
  │    POST /api/schemes/recommend          │
  │    GET  /api/partners                   │
  │    GET  /api/partners/:id               │
  │    POST /api/auth/send-otp              │
  │    POST /api/auth/verify-otp            │
  │    POST /api/auth/login                 │
  └─────────────────────────────────────────┘
  `);
});

export default app;
