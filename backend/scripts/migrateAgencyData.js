/**
 * 🏢 Migrate agency data (description, status, country, slug)
 *
 * - Adds new columns to the providers table (if missing)
 * - Imports/upserts data from launch-agencies.csv
 *
 * Usage:
 *   cd backend && bun scripts/migrateAgencyData.js
 */

import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/launches.db');
const CSV_PATH = '/Users/davidk/dev/docs/projects/web-rocket-launch/launch-agencies.csv';

const NEW_COLUMNS = ['description', 'status', 'country', 'slug'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert "null" string or empty string to actual null */
function nullify(value) {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'null') {
    return null;
  }
  return value.trim();
}

/** Generate a URL-safe slug from a name */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // Remove special characters
    .trim()
    .replace(/\s+/g, '-')            // Spaces → hyphens
    .replace(/-+/g, '-');            // Collapse multiple hyphens
}

/** Parse a CSV line handling RFC-4180 quoted fields with embedded commas */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

/** Parse the full CSV text into an array of row objects */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('🏢 Migrating agency data...\n');

const db = new Database(DB_PATH);
db.run('PRAGMA journal_mode = WAL;');

// 1. Add new columns if they don't exist yet
console.log('📦 Adding columns to providers table...');
for (const col of NEW_COLUMNS) {
  try {
    db.run(`ALTER TABLE providers ADD COLUMN ${col} TEXT`);
    console.log(`  ✅ Added column: ${col}`);
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log(`  ⏭️  Column already exists: ${col}`);
    } else {
      throw err;
    }
  }
}

// 2. Parse CSV
console.log('\n📂 Reading CSV...');
const csvText = await Bun.file(CSV_PATH).text();
const rows = parseCSV(csvText);
console.log(`  Found ${rows.length} agency rows`);

// 3. Upsert each agency
console.log('\n⬆️  Upserting agencies...');

const upsert = db.prepare(`
  INSERT INTO providers (name, description, status, country, slug, website_url)
  VALUES ($name, $description, $status, $country, $slug, $website_url)
  ON CONFLICT(name) DO UPDATE SET
    description = excluded.description,
    status      = excluded.status,
    country     = excluded.country,
    slug        = excluded.slug,
    website_url = COALESCE(excluded.website_url, providers.website_url)
`);

let upserted = 0;

for (const row of rows) {
  if (!row.provider_name) continue;

  const slug = generateSlug(row.provider_name);

  const params = {
    $name:        row.provider_name,
    $description: nullify(row.description),
    $status:      nullify(row.status),
    $country:     nullify(row.country),
    $slug:        slug,
    $website_url: nullify(row.website_url),
  };

  upsert.run(params);
  upserted++;
  console.log(`  🔄 Upserted: ${row.provider_name} (${row.status}, ${row.country}) → slug: ${slug}`);
}

console.log(`\n✅ Done! ${upserted} agencies upserted`);

// 4. Add slug index for fast lookups
console.log('\n🔍 Ensuring slug index...');
try {
  db.run('CREATE INDEX IF NOT EXISTS idx_providers_slug ON providers (slug)');
  console.log('  ✅ Index idx_providers_slug ready');
} catch (err) {
  console.log(`  ⚠️  Index note: ${err.message}`);
}

// 5. Spot-check
console.log('\n🔭 Spot-check — first 5 agencies with slug:');
const sample = db.prepare(`
  SELECT name, slug, status, country
  FROM providers
  WHERE slug IS NOT NULL
  LIMIT 5
`).all();

for (const p of sample) {
  console.log(`  ${p.name} → /${p.slug} (${p.status}, ${p.country})`);
}

db.close();
console.log('\n🚀 Agency migration complete!');
