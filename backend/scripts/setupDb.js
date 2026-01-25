#!/usr/bin/env bun

import { initDatabase, initSchema } from '../src/db/database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../data/launches.db');

console.log('🚀 Setting up Rocket Launch Tracker database...\n');

try {
  // Ensure data directory exists
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) {
    console.log(`📁 Creating data directory: ${dataDir}`);
    mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database connection
  initDatabase(DB_PATH);

  // Create schema
  initSchema();

  console.log('\n✅ Database setup complete!');
  console.log(`📍 Database location: ${DB_PATH}\n`);

  process.exit(0);
} catch (error) {
  console.error('❌ Database setup failed:', error);
  process.exit(1);
}
