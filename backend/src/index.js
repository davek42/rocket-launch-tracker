/**
 * 🚀 World Rocket Launch - Backend API Server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config.js';
import logger from './utils/logger.js';
import { initDatabase } from './db/database.js';

// Import routes
import launchesRoutes from './routes/launches.js';
import filtersRoutes from './routes/filters.js';
import docsRoutes from './routes/docs.js';
import agenciesRoutes from './routes/agencies.js';

const app = express();

// Trust the Nginx reverse proxy so rate limiting uses the real client IP
// (X-Forwarded-For header) rather than the loopback address
app.set('trust proxy', 1);

// Initialize database
try {
  initDatabase(config.dbPath);
  logger.success('Database initialized');
} catch (error) {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
}

// Rate limiting — applied before any route handler
// Allows 120 requests per minute per IP (2/sec average).
// ICS export endpoint gets a tighter limit since it does more work.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down' }
});
const icsLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down' }
});

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  }
}));

// CORS — allow only the production frontend in prod, all origins in dev
app.use(cors({
  origin: config.isDevelopment ? true : config.allowedOrigins,
  methods: ['GET'],
  optionsSuccessStatus: 200
}));

app.use(express.json()); // Parse JSON bodies

// Request logging
app.use((req, res, next) => {
  logger.api(`${req.method} ${req.path}`);
  next();
});

// Health check — no environment info exposed publicly
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API routes — rate limited
app.use('/api/launches/ics', icsLimiter);  // tighter limit for ICS export
app.use('/api/launches', apiLimiter, launchesRoutes);
app.use('/api/filters', apiLimiter, filtersRoutes);
app.use('/api/docs', apiLimiter, docsRoutes);
app.use('/api/agencies', apiLimiter, agenciesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: config.isDevelopment ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(config.port, () => {
  logger.rocket(`🚀 World Rocket Launch API running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Database: ${config.dbPath}`);
  logger.info(`\nAPI endpoints:`);
  logger.info(`  GET  /api/launches - List launches with filters`);
  logger.info(`  GET  /api/launches/:id - Get launch details`);
  logger.info(`  GET  /api/launches/:id/ics - Download launch ICS file`);
  logger.info(`  GET  /api/launches/ics - Download filtered launches ICS file`);
  logger.info(`  GET  /api/filters - Get filter options`);
  logger.info(`  GET  /api/docs - Machine-readable API documentation`);
  logger.info(`  GET  /api/agencies - List agencies with filters`);
  logger.info(`  GET  /api/agencies/filters - Agency filter options`);
  logger.info(`  GET  /api/agencies/:slug - Single agency details`);
  logger.info(`  GET  /health - Health check\n`);
});

export default app;
