/**
 * 💰 Migrate company financial data into providers table
 *
 * Adds 6 new columns and populates from two CSVs:
 *   - rocket-launch-providers-public.csv  (public companies)
 *   - rocket-launch-providers-private.csv (private/JV/subsidiary)
 *
 * Usage:
 *   cd backend && bun scripts/migrateCompanyFinancials.js
 */

import { Database } from 'bun:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/launches.db');
const DOCS_DIR = '/Users/davidk/dev/docs/projects/web-rocket-launch';
const PUBLIC_CSV = join(DOCS_DIR, 'rocket-launch-providers-public.csv');
const PRIVATE_CSV = join(DOCS_DIR, 'rocket-launch-providers-private.csv');

// ─── Name remaps: CSV name → DB name ─────────────────────────────────────────
// Add entries here if the CSV name doesn't exactly match the DB provider name.
const NAME_REMAPS = {
  'PLD Space (Payload Aerospace S.L.)': 'PLD Space',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nullify(value) {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'null') {
    return null;
  }
  return value.trim();
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

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('💰 Migrating company financial data...\n');

const db = new Database(DB_PATH);
db.run('PRAGMA journal_mode = WAL;');

// 1. Add new columns
console.log('📦 Adding columns to providers table...');
const NEW_COLUMNS = [
  'company_type',
  'stock_exchange',
  'ticker',
  'ir_url',
  'key_investors',
  'total_funding',
];

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

// Prepare update statement
const updateStmt = db.prepare(`
  UPDATE providers SET
    company_type   = $company_type,
    stock_exchange = $stock_exchange,
    ticker         = $ticker,
    ir_url         = $ir_url,
    key_investors  = $key_investors,
    total_funding  = $total_funding
  WHERE name = $name
`);

/** Resolve CSV name → DB name and run update; returns true if a row was updated */
function applyUpdate(csvName, fields) {
  const dbName = NAME_REMAPS[csvName] ?? csvName;

  const result = updateStmt.run({
    $name:          dbName,
    $company_type:  nullify(fields.company_type),
    $stock_exchange: nullify(fields.stock_exchange),
    $ticker:        nullify(fields.ticker),
    $ir_url:        nullify(fields.ir_url),
    $key_investors: nullify(fields.key_investors),
    $total_funding: nullify(fields.total_funding),
  });

  if (result.changes === 0) {
    // Fallback: partial match (contains the first word of the CSV name)
    const fallbackName = db.prepare(
      `SELECT name FROM providers WHERE name LIKE ? LIMIT 1`
    ).get(`%${dbName.split(' ')[0]}%${dbName.split(' ').slice(-1)[0]}%`);

    if (fallbackName) {
      updateStmt.run({ ...{
        $name:          fallbackName.name,
        $company_type:  nullify(fields.company_type),
        $stock_exchange: nullify(fields.stock_exchange),
        $ticker:        nullify(fields.ticker),
        $ir_url:        nullify(fields.ir_url),
        $key_investors: nullify(fields.key_investors),
        $total_funding: nullify(fields.total_funding),
      }});
      console.log(`  ⚠️  Fuzzy matched "${csvName}" → "${fallbackName.name}"`);
      return true;
    }

    console.log(`  ❌ No DB match for: "${csvName}" (tried "${dbName}")`);
    return false;
  }

  return true;
}

// 2. Process public companies CSV
console.log('\n📈 Processing public companies...');
const publicText = await Bun.file(PUBLIC_CSV).text();
const publicRows = parseCSV(publicText);
console.log(`  Found ${publicRows.length} rows`);

let publicOk = 0;
for (const row of publicRows) {
  if (!row.provider_name) continue;
  const ok = applyUpdate(row.provider_name, {
    company_type:   'Public',
    stock_exchange: row.stock_exchange,
    ticker:         row.ticker,
    ir_url:         row.investor_relations_url,
    key_investors:  null,
    total_funding:  null,
  });
  if (ok) {
    console.log(`  ✅ ${row.provider_name} → Public, ${row.stock_exchange}: ${row.ticker}`);
    publicOk++;
  }
}

// 3. Process private companies CSV
console.log('\n🔒 Processing private/JV/subsidiary companies...');
const privateText = await Bun.file(PRIVATE_CSV).text();
const privateRows = parseCSV(privateText);
console.log(`  Found ${privateRows.length} rows`);

let privateOk = 0;
for (const row of privateRows) {
  if (!row.provider_name) continue;
  const ok = applyUpdate(row.provider_name, {
    company_type:   row.company_type,
    stock_exchange: null,
    ticker:         null,
    ir_url:         null,
    key_investors:  row.key_investors,
    total_funding:  row.total_funding_approx,
  });
  if (ok) {
    console.log(`  ✅ ${row.provider_name} → ${row.company_type}`);
    privateOk++;
  }
}

// 4. Spot-check
console.log('\n🔭 Spot-check — providers with financial data:');
const sample = db.prepare(`
  SELECT name, company_type, stock_exchange, ticker, total_funding
  FROM providers
  WHERE company_type IS NOT NULL
  LIMIT 10
`).all();

for (const p of sample) {
  const fin = p.ticker
    ? `${p.stock_exchange}: ${p.ticker}`
    : (p.total_funding || '—');
  console.log(`  ${p.name} → ${p.company_type} | ${fin}`);
}

db.close();
console.log(`\n🚀 Done! Public: ${publicOk} updated, Private/JV: ${privateOk} updated`);
