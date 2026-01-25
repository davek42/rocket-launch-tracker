/**
 * ⚙️ Application Configuration
 * Loads environment variables (Bun automatically loads .env)
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Database
  dbPath: process.env.DB_PATH || join(__dirname, '../data/launches.db'),

  // Launch Library 2 API
  ll2ApiBaseUrl: process.env.LL2_API_BASE_URL || 'https://ll.thespacedevs.com/2.2.0',
  ll2ApiKey: process.env.LL2_API_KEY || '',

  // Sync settings
  syncDelayMs: parseInt(process.env.SYNC_DELAY_MS || '5000', 10),
  syncLookbackHours: parseInt(process.env.SYNC_LOOKBACK_HOURS || '48', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required config
if (!config.ll2ApiBaseUrl) {
  console.warn('⚠️  LL2_API_BASE_URL not set, using default');
}

if (!config.ll2ApiKey) {
  console.warn('⚠️  LL2_API_KEY not set. API requests will be rate-limited to 15/hour.');
}

export default config;
