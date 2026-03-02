/**
 * 🚀 Migrate provider social media links
 *
 * - Adds social URL columns to the providers table (if missing)
 * - Imports/upserts data from provider-social-media.csv
 *
 * Usage:
 *   cd backend && bun scripts/migrateProviderSocials.js
 */

import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/launches.db');
const CSV_PATH = '/Users/davidk/dev/docs/projects/web-rocket-launch/provider-social-media.csv';

const SOCIAL_COLUMNS = [
  'twitter_x_url',
  'instagram_url',
  'facebook_url',
  'bluesky_url',
  'youtube_url',
  'linkedin_url',
  'website_url',
  'notes',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert "null" string (from CSV) or empty string to actual null */
function nullify(value) {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'null') {
    return null;
  }
  return value.trim();
}

/** Parse a simple CSV file (no embedded commas in quoted fields needed here) */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    // Use a basic split — values in this CSV don't contain commas
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('🔧 Migrating provider social media links...\n');

const db = new Database(DB_PATH);
db.run('PRAGMA journal_mode = WAL;');

// 1. Add columns if they don't exist yet
console.log('📦 Adding social URL columns to providers table...');
for (const col of SOCIAL_COLUMNS) {
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
console.log(`  Found ${rows.length} provider rows`);

// 3. Upsert each provider
console.log('\n⬆️  Upserting providers...');

const upsert = db.prepare(`
  INSERT INTO providers (name, abbrev, twitter_x_url, instagram_url, facebook_url, bluesky_url, youtube_url, linkedin_url, website_url, notes)
  VALUES ($name, $abbrev, $twitter_x_url, $instagram_url, $facebook_url, $bluesky_url, $youtube_url, $linkedin_url, $website_url, $notes)
  ON CONFLICT(name) DO UPDATE SET
    abbrev        = excluded.abbrev,
    twitter_x_url = excluded.twitter_x_url,
    instagram_url = excluded.instagram_url,
    facebook_url  = excluded.facebook_url,
    bluesky_url   = excluded.bluesky_url,
    youtube_url   = excluded.youtube_url,
    linkedin_url  = excluded.linkedin_url,
    website_url   = excluded.website_url,
    notes         = excluded.notes
`);

let inserted = 0;
let updated = 0;

for (const row of rows) {
  const params = {
    $name:          row.provider_name,
    $abbrev:        nullify(row.provider_abbrev),
    $twitter_x_url: nullify(row.twitter_x),
    $instagram_url: nullify(row.instagram),
    $facebook_url:  nullify(row.facebook),
    $bluesky_url:   nullify(row.bluesky),
    $youtube_url:   nullify(row.youtube),
    $linkedin_url:  nullify(row.linkedin),
    $website_url:   nullify(row.website),
    $notes:         nullify(row.notes),
  };

  const result = upsert.run(params);
  if (result.changes > 0) {
    updated++;
    console.log(`  🔄 Upserted: ${row.provider_name}`);
  } else {
    inserted++;
  }
}

console.log(`\n✅ Done! ${rows.length} providers processed (${updated} upserted, ${rows.length - updated} unchanged)`);

// 4. Spot-check
console.log('\n🔍 Spot-check — first 5 providers with any social link:');
const sample = db.prepare(`
  SELECT name, twitter_x_url, website_url
  FROM providers
  WHERE twitter_x_url IS NOT NULL OR website_url IS NOT NULL
  LIMIT 5
`).all();

for (const p of sample) {
  console.log(`  ${p.name}: twitter=${p.twitter_x_url ?? 'null'}, website=${p.website_url ?? 'null'}`);
}

db.close();
console.log('\n🎉 Migration complete!');
