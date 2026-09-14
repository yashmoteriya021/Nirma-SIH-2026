import app from './src/app.js';
import config from './src/config/env.js';
import connectDB from './src/config/db.js';
import { seedDatabase } from './src/seed/seed.js';

const startServer = async () => {
  // Connect to MongoDB (falls back to in-memory if local MongoDB isn't running)
  await connectDB();

  // Auto-seed if database is empty (useful for in-memory mode)
  await seedDatabase();

  // Start Express server
  app.listen(config.port, () => {
    console.log(`
  ┌─────────────────────────────────────────────┐
  │  SchemeSetu API Server                      │
  │  Environment: ${config.nodeEnv.padEnd(29)}│
  │  Port:        ${String(config.port).padEnd(29)}│
  │  CORS:        ${config.corsOrigin[0].padEnd(29)}│
  │  OTP Mock:    ${String(config.otp.mockMode).padEnd(29)}│
  │                                             │
  │  Endpoints:                                 │
  │    GET  /api/health                         │
  │    POST /api/auth/send-otp                  │
  │    POST /api/auth/verify-otp                │
  │    POST /api/auth/register                  │
  │    POST /api/auth/login                     │
  │    GET  /api/auth/me                        │
  │    GET  /api/schemes                        │
  │    GET  /api/schemes/search                 │
  │    GET  /api/schemes/:scheme_id             │
  │    POST /api/schemes/recommend              │
  │    GET  /api/partners                       │
  │    GET  /api/partners/nearby                │
  │    GET  /api/partners/:partner_id           │
  │    POST /api/calculator/emi                 │
  │    GET  /api/stats                          │
  └─────────────────────────────────────────────┘
    `);
  });
};

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
