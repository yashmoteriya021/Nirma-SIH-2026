import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import schemeRoutes from './routes/scheme.routes.js';
import partnerRoutes from './routes/partner.routes.js';
import calculatorRoutes from './routes/calculator.routes.js';
import statsRoutes from './routes/stats.routes.js';

const app = express();

// ─── Security Middleware ────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(generalLimiter);

// ─── Body Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ───────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Logging ────────────────────────────────────────────────────
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check & Root ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('/api/health');
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    message: 'SchemeSetu API is running',
  });
});

// ─── API Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/stats', statsRoutes);

// ─── Error Handling ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
