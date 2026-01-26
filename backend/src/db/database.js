import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

/**
 * 🗄️ Initialize database connection
 * @param {string} dbPath - Path to SQLite database file
 * @returns {Database} - Bun SQLite database instance
 */
export function initDatabase(dbPath) {
  if (db) {
    return db;
  }

  console.log(`🗄️ Connecting to database at ${dbPath}`);

  db = new Database(dbPath, { create: true });

  // Enable WAL mode for better concurrency
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA synchronous = NORMAL;');
  db.run('PRAGMA foreign_keys = ON;');

  console.log('✅ Database connection established');

  return db;
}

/**
 * 🏗️ Initialize database schema from schema.sql
 */
export function initSchema() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  console.log('🏗️ Initializing database schema...');

  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Execute schema (split by semicolons and run each statement)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    db.run(statement);
  }

  console.log('✅ Database schema initialized');
}

/**
 * Get the current database instance
 * @returns {Database}
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * 🚀 Insert or update a launch record
 * @param {Object} launch - Launch data object
 * @returns {Object} - Result with changes info
 */
export function upsertLaunch(launch) {
  const stmt = db.prepare(`
    INSERT INTO launches (
      id, name, slug, status_id, status_name, status_abbrev, status_description,
      net, window_start, window_end,
      rocket_id, rocket_name, rocket_family, rocket_variant, rocket_full_name,
      provider_id, provider_name, provider_abbrev, provider_type, provider_country_code,
      pad_id, pad_name, pad_wiki_url, pad_map_url, pad_latitude, pad_longitude,
      location_id, location_name, location_country_code, location_map_image, location_timezone,
      mission_id, mission_name, mission_description, mission_type,
      mission_orbit_id, mission_orbit_name, mission_orbit_abbrev,
      spacecraft_stage_id, spacecraft_name, spacecraft_serial_number, spacecraft_status,
      spacecraft_description, spacecraft_destination, payload_count, payload_total_mass_kg,
      image_url, infographic_url, webcast_live, slug_url,
      last_updated, updated_at
    ) VALUES (
      $id, $name, $slug, $status_id, $status_name, $status_abbrev, $status_description,
      $net, $window_start, $window_end,
      $rocket_id, $rocket_name, $rocket_family, $rocket_variant, $rocket_full_name,
      $provider_id, $provider_name, $provider_abbrev, $provider_type, $provider_country_code,
      $pad_id, $pad_name, $pad_wiki_url, $pad_map_url, $pad_latitude, $pad_longitude,
      $location_id, $location_name, $location_country_code, $location_map_image, $location_timezone,
      $mission_id, $mission_name, $mission_description, $mission_type,
      $mission_orbit_id, $mission_orbit_name, $mission_orbit_abbrev,
      $spacecraft_stage_id, $spacecraft_name, $spacecraft_serial_number, $spacecraft_status,
      $spacecraft_description, $spacecraft_destination, $payload_count, $payload_total_mass_kg,
      $image_url, $infographic_url, $webcast_live, $slug_url,
      $last_updated, CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      name = $name,
      slug = $slug,
      status_id = $status_id,
      status_name = $status_name,
      status_abbrev = $status_abbrev,
      status_description = $status_description,
      net = $net,
      window_start = $window_start,
      window_end = $window_end,
      rocket_id = $rocket_id,
      rocket_name = $rocket_name,
      rocket_family = $rocket_family,
      rocket_variant = $rocket_variant,
      rocket_full_name = $rocket_full_name,
      provider_id = $provider_id,
      provider_name = $provider_name,
      provider_abbrev = $provider_abbrev,
      provider_type = $provider_type,
      provider_country_code = $provider_country_code,
      pad_id = $pad_id,
      pad_name = $pad_name,
      pad_wiki_url = $pad_wiki_url,
      pad_map_url = $pad_map_url,
      pad_latitude = $pad_latitude,
      pad_longitude = $pad_longitude,
      location_id = $location_id,
      location_name = $location_name,
      location_country_code = $location_country_code,
      location_map_image = $location_map_image,
      location_timezone = $location_timezone,
      mission_id = $mission_id,
      mission_name = $mission_name,
      mission_description = $mission_description,
      mission_type = $mission_type,
      mission_orbit_id = $mission_orbit_id,
      mission_orbit_name = $mission_orbit_name,
      mission_orbit_abbrev = $mission_orbit_abbrev,
      spacecraft_stage_id = $spacecraft_stage_id,
      spacecraft_name = $spacecraft_name,
      spacecraft_serial_number = $spacecraft_serial_number,
      spacecraft_status = $spacecraft_status,
      spacecraft_description = $spacecraft_description,
      spacecraft_destination = $spacecraft_destination,
      payload_count = $payload_count,
      payload_total_mass_kg = $payload_total_mass_kg,
      image_url = $image_url,
      infographic_url = $infographic_url,
      webcast_live = $webcast_live,
      slug_url = $slug_url,
      last_updated = $last_updated,
      updated_at = CURRENT_TIMESTAMP
  `);

  // Convert keys to include $ prefix for Bun SQLite
  const params = {};
  for (const [key, value] of Object.entries(launch)) {
    params[`$${key}`] = value;
  }

  return stmt.run(params);
}

/**
 * 📊 Create a new sync log entry
 * @param {string} syncType - 'full', 'incremental', or 'manual'
 * @returns {number} - Sync log ID
 */
export function createSyncLog(syncType) {
  const stmt = db.prepare(`
    INSERT INTO sync_log (sync_type, started_at, status)
    VALUES (?, CURRENT_TIMESTAMP, 'running')
  `);

  const result = stmt.run(syncType);
  return result.lastInsertRowid;
}

/**
 * 📝 Update sync log entry
 * @param {number} syncId - Sync log ID
 * @param {Object} updates - Fields to update
 */
export function updateSyncLog(syncId, updates) {
  const fields = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    params.push(value);
  }

  // Add syncId as the last parameter for the WHERE clause
  params.push(syncId);

  const stmt = db.prepare(`
    UPDATE sync_log
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...params);
}

/**
 * 🔍 Get launch by ID
 * @param {string} id - Launch ID
 * @returns {Object|null} - Launch object or null
 */
export function getLaunchById(id) {
  const stmt = db.prepare(`
    SELECT
      launches.*,
      manual_payloads.payload_mass_kg as manual_payload_mass_kg,
      manual_payloads.source as manual_payload_source
    FROM launches
    LEFT JOIN manual_payloads ON launches.name LIKE manual_payloads.mission_pattern
    WHERE launches.id = ?
  `);
  return stmt.get(id);
}

/**
 * 📋 Query launches with filters
 * @param {Object} filters - Query filters and pagination
 * @returns {Object} - { launches: [], total: number }
 */
export function queryLaunches(filters = {}) {
  const {
    upcoming = false,
    past = false,
    provider,
    country,
    location,
    rocket,
    status,
    from,
    to,
    search,
    limit = 20,
    offset = 0,
    sort = 'net',
    order = 'asc'
  } = filters;

  const whereClauses = [];
  const params = [];

  // Time-based filters
  if (upcoming) {
    whereClauses.push("net >= datetime('now')");
  } else if (past) {
    whereClauses.push("net < datetime('now')");
  }

  if (from) {
    whereClauses.push('net >= ?');
    params.push(from);
  }

  if (to) {
    whereClauses.push('net <= ?');
    params.push(to);
  }

  // Provider filter
  if (provider) {
    whereClauses.push('provider_name LIKE ?');
    params.push(`%${provider}%`);
  }

  // Country filter
  if (country) {
    whereClauses.push('location_country_code = ?');
    params.push(country);
  }

  // Location filter
  if (location) {
    whereClauses.push('location_name LIKE ?');
    params.push(`%${location}%`);
  }

  // Rocket filter
  if (rocket) {
    whereClauses.push('(rocket_name LIKE ? OR rocket_family LIKE ?)');
    params.push(`%${rocket}%`, `%${rocket}%`);
  }

  // Status filter
  if (status) {
    whereClauses.push('status_abbrev = ?');
    params.push(status);
  }

  // Search filter
  if (search) {
    whereClauses.push(`(
      name LIKE ? OR
      mission_name LIKE ? OR
      mission_description LIKE ? OR
      provider_name LIKE ?
    )`);
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  // Validate sort field
  const validSortFields = ['net', 'provider_name', 'location_name', 'rocket_name'];
  const sortField = validSortFields.includes(sort) ? sort : 'net';
  const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  // Get total count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM launches
    ${whereClause}
  `);
  const { total } = countStmt.get(...params);

  // Get paginated results with manual payload data
  const dataStmt = db.prepare(`
    SELECT
      launches.*,
      manual_payloads.payload_mass_kg as manual_payload_mass_kg,
      manual_payloads.source as manual_payload_source
    FROM launches
    LEFT JOIN manual_payloads ON launches.name LIKE manual_payloads.mission_pattern
    ${whereClause}
    ORDER BY ${sortField} ${sortOrder}
    LIMIT ? OFFSET ?
  `);

  const launches = dataStmt.all(...params, limit, offset);

  return { launches, total };
}

/**
 * 📊 Get filter options for dropdowns
 * @returns {Object} - Filter options with counts
 */
export function getFilterOptions() {
  const providers = db.prepare(`
    SELECT
      provider_name as name,
      provider_abbrev as abbrev,
      COUNT(*) as count
    FROM launches
    WHERE provider_name IS NOT NULL
    GROUP BY provider_name, provider_abbrev
    ORDER BY count DESC
  `).all();

  const countries = db.prepare(`
    SELECT
      location_country_code as code,
      location_country_code as name,
      COUNT(*) as count
    FROM launches
    WHERE location_country_code IS NOT NULL
    GROUP BY location_country_code
    ORDER BY count DESC
  `).all();

  const locations = db.prepare(`
    SELECT
      location_name as name,
      location_country_code as countryCode,
      COUNT(*) as count
    FROM launches
    WHERE location_name IS NOT NULL
    GROUP BY location_name, location_country_code
    ORDER BY count DESC
  `).all();

  const statuses = db.prepare(`
    SELECT
      status_abbrev as abbrev,
      status_name as name,
      COUNT(*) as count
    FROM launches
    WHERE status_abbrev IS NOT NULL
    GROUP BY status_abbrev, status_name
    ORDER BY count DESC
  `).all();

  const rocketFamilies = db.prepare(`
    SELECT
      rocket_family as family,
      COUNT(*) as count
    FROM launches
    WHERE rocket_family IS NOT NULL
    GROUP BY rocket_family
    ORDER BY count DESC
  `).all();

  return {
    providers,
    countries,
    locations,
    statuses,
    rocketFamilies
  };
}

/**
 * 📈 Get statistics
 * @returns {Object} - Stats object
 */
export function getStats() {
  const totalStmt = db.prepare('SELECT COUNT(*) as total FROM launches');
  const { total: totalLaunches } = totalStmt.get();

  const upcomingStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM launches
    WHERE net >= datetime('now')
  `);
  const { total: upcomingLaunches } = upcomingStmt.get();

  const thisYearStmt = db.prepare(`
    SELECT COUNT(*) as total
    FROM launches
    WHERE strftime('%Y', net) = strftime('%Y', 'now')
  `);
  const { total: launchesThisYear } = thisYearStmt.get();

  const lastSyncStmt = db.prepare(`
    SELECT completed_at as lastSync
    FROM sync_log
    WHERE status = 'success'
    ORDER BY completed_at DESC
    LIMIT 1
  `);
  const lastSyncResult = lastSyncStmt.get();

  const nextLaunchStmt = db.prepare(`
    SELECT id, name, net
    FROM launches
    WHERE net >= datetime('now')
    ORDER BY net ASC
    LIMIT 1
  `);
  const nextLaunch = nextLaunchStmt.get();

  return {
    totalLaunches,
    upcomingLaunches,
    launchesThisYear,
    lastSync: lastSyncResult?.lastSync || null,
    nextLaunch
  };
}

/**
 * 🧹 Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('🔌 Database connection closed');
  }
}
