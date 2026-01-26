-- ============================================
-- LAUNCHES TABLE
-- Core table storing all rocket launch data
-- ============================================
CREATE TABLE IF NOT EXISTS launches (
    -- Primary identifier from Launch Library 2
    id TEXT PRIMARY KEY,

    -- Basic launch info
    name TEXT NOT NULL,
    slug TEXT,
    status_id INTEGER,
    status_name TEXT,              -- Go, TBD, Success, Failure, Hold, In Flight, Partial Failure
    status_abbrev TEXT,            -- Go, TBD, Success, etc.
    status_description TEXT,

    -- Launch timing
    net DATETIME,                  -- No Earlier Than (primary launch time)
    window_start DATETIME,
    window_end DATETIME,

    -- Rocket information
    rocket_id INTEGER,
    rocket_name TEXT,              -- e.g., "Falcon 9 Block 5"
    rocket_family TEXT,            -- e.g., "Falcon"
    rocket_variant TEXT,           -- e.g., "Block 5"
    rocket_full_name TEXT,

    -- Launch Service Provider (company/agency)
    provider_id INTEGER,
    provider_name TEXT,            -- e.g., "SpaceX", "NASA", "Roscosmos"
    provider_abbrev TEXT,          -- e.g., "SpX", "NASA"
    provider_type TEXT,            -- Commercial, Government, Multinational, etc.
    provider_country_code TEXT,    -- USA, RUS, CHN, etc.

    -- Launch pad information
    pad_id INTEGER,
    pad_name TEXT,                 -- e.g., "Space Launch Complex 40"
    pad_wiki_url TEXT,
    pad_map_url TEXT,
    pad_latitude REAL,
    pad_longitude REAL,

    -- Launch location (facility)
    location_id INTEGER,
    location_name TEXT,            -- e.g., "Cape Canaveral, FL, USA"
    location_country_code TEXT,    -- USA, RUS, CHN, KAZ, etc.
    location_map_image TEXT,
    location_timezone TEXT,

    -- Mission information
    mission_id INTEGER,
    mission_name TEXT,
    mission_description TEXT,
    mission_type TEXT,             -- Communications, Earth Science, Navigation, etc.
    mission_orbit_id INTEGER,
    mission_orbit_name TEXT,       -- LEO, GEO, SSO, etc.
    mission_orbit_abbrev TEXT,

    -- Spacecraft/Payload information
    spacecraft_stage_id INTEGER,
    spacecraft_name TEXT,          -- Primary spacecraft name
    spacecraft_serial_number TEXT,
    spacecraft_status TEXT,        -- Active, Inactive, Lost, etc.
    spacecraft_description TEXT,
    spacecraft_destination TEXT,   -- e.g., "International Space Station", "Mars"
    payload_count INTEGER,         -- Number of payloads
    payload_total_mass_kg REAL,    -- Total payload mass in kilograms

    -- Media
    image_url TEXT,                -- Launch/mission image
    infographic_url TEXT,
    webcast_live INTEGER DEFAULT 0,

    -- URLs for more info
    slug_url TEXT,

    -- Metadata
    last_updated DATETIME,         -- From API
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- Optimize common query patterns
-- ============================================

-- Time-based queries (upcoming launches, date ranges)
CREATE INDEX IF NOT EXISTS idx_launches_net ON launches(net);
CREATE INDEX IF NOT EXISTS idx_launches_window_start ON launches(window_start);

-- Filter by provider/company
CREATE INDEX IF NOT EXISTS idx_launches_provider_name ON launches(provider_name);
CREATE INDEX IF NOT EXISTS idx_launches_provider_country ON launches(provider_country_code);

-- Filter by location
CREATE INDEX IF NOT EXISTS idx_launches_location_name ON launches(location_name);
CREATE INDEX IF NOT EXISTS idx_launches_location_country ON launches(location_country_code);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_launches_status ON launches(status_abbrev);

-- Filter by rocket
CREATE INDEX IF NOT EXISTS idx_launches_rocket_name ON launches(rocket_name);
CREATE INDEX IF NOT EXISTS idx_launches_rocket_family ON launches(rocket_family);

-- Filter by spacecraft/payload
CREATE INDEX IF NOT EXISTS idx_launches_spacecraft_name ON launches(spacecraft_name);
CREATE INDEX IF NOT EXISTS idx_launches_spacecraft_destination ON launches(spacecraft_destination);

-- Compound index for common query: upcoming launches sorted by date
CREATE INDEX IF NOT EXISTS idx_launches_upcoming ON launches(net, status_abbrev);

-- ============================================
-- SYNC LOG TABLE
-- Track data synchronization history
-- ============================================
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL,       -- 'full', 'incremental', 'manual'
    started_at DATETIME NOT NULL,
    completed_at DATETIME,

    -- Statistics
    records_fetched INTEGER DEFAULT 0,
    records_added INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_unchanged INTEGER DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'running', -- 'running', 'success', 'failed', 'partial'
    error_message TEXT,

    -- API details
    api_calls_made INTEGER DEFAULT 0,
    last_api_offset INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);

-- ============================================
-- PROVIDERS TABLE (Optional - for filter dropdowns)
-- Denormalized for faster filter queries
-- ============================================
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    abbrev TEXT,
    type TEXT,
    country_code TEXT,
    logo_url TEXT,
    wiki_url TEXT,
    UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_providers_country ON providers(country_code);

-- ============================================
-- LOCATIONS TABLE (Optional - for filter dropdowns)
-- Denormalized for faster filter queries
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    country_code TEXT,
    map_image TEXT,
    timezone TEXT,
    latitude REAL,
    longitude REAL,
    UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country_code);

-- ============================================
-- MANUAL PAYLOADS TABLE
-- Manually curated payload mass data for missions
-- that don't have it in the API
-- ============================================
CREATE TABLE IF NOT EXISTS manual_payloads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Pattern to match launch/mission names
    -- Use SQL LIKE patterns (e.g., "GPS III%", "Starlink%", or exact names)
    mission_pattern TEXT NOT NULL UNIQUE,

    -- Payload mass in kilograms
    payload_mass_kg REAL NOT NULL,

    -- Data source (URL, reference, documentation)
    source TEXT,

    -- Additional notes about the payload
    notes TEXT,

    -- Timestamps for audit trail
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_manual_payloads_pattern ON manual_payloads(mission_pattern);
