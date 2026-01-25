/**
 * 🚀 Rocket Launch Tracker - Backend API Server
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config.js';
import logger from './utils/logger.js';
import { initDatabase } from './db/database.js';

// Import routes
import launchesRoutes from './routes/launches.js';
import filtersRoutes from './routes/filters.js';

const app = express();

// Initialize database
try {
  initDatabase(config.dbPath);
  logger.success('Database initialized');
} catch (error) {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// Request logging
app.use((req, res, next) => {
  logger.api(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API routes
app.use('/api/launches', launchesRoutes);
app.use('/api/filters', filtersRoutes);

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
  logger.rocket(`🚀 Rocket Launch Tracker API running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Database: ${config.dbPath}`);
  logger.info(`\nAPI endpoints:`);
  logger.info(`  GET  /api/launches - List launches with filters`);
  logger.info(`  GET  /api/launches/:id - Get launch details`);
  logger.info(`  GET  /api/launches/:id/ics - Download launch ICS file`);
  logger.info(`  GET  /api/launches/ics - Download filtered launches ICS file`);
  logger.info(`  GET  /api/filters - Get filter options`);
  logger.info(`  GET  /health - Health check\n`);
});

export default app;
