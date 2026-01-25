# Rocket Launch Tracker - Implementation Plan

## Project Overview

A web application to track rocket launches worldwide, with data sourced from Launch Library 2 API (TheSpaceDevs). Users can query launches by location, company, or time, with a default view showing upcoming launches.

### Key Features (MVP)
- Load all historical and upcoming launch data (~7,000+ records)
- Daily automated data sync
- Search/filter by provider, location, date range
- Default view: upcoming launches
- Export launches to ICS calendar format
- Anonymous public access (no auth)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) |
| Frontend | React (Vite build tool) |
| Hosting | AWS Lightsail ($5/month instance) |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt (certbot) |

### Data Source

**Launch Library 2 API** (TheSpaceDevs)
- Base URL: `https://ll.thespacedevs.com/2.2.0/`
- Documentation: https://thespacedevs.com/llapi
- Rate Limits (unauthenticated): 15 requests/hour
- Rate Limits (authenticated): 300 requests/day
- Free API key available upon request

---

## Directory Structure

```
rocket-launches/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry point
│   │   ├── config.js             # Environment configuration
│   │   ├── db/
│   │   │   ├── schema.sql        # Table definitions
│   │   │   ├── database.js       # SQLite connection & query helpers
│   │   ├── services/
│   │   │   ├── launchLibrary.js  # API client for TheSpaceDevs
│   │   │   ├── sync.js           # Daily sync logic
│   │   ├── routes/
│   │   │   ├── launches.js       # Launch API endpoints
│   │   │   ├── ics.js            # Calendar export endpoints
│   │   │   ├── filters.js        # Filter options endpoint
│   │   ├── utils/
│   │   │   ├── icsGenerator.js   # ICS file generation
│   │   │   ├── logger.js         # Logging utility
│   ├── package.json
│   ├── .env.example
│   ├── data/
│   │   └── launches.db           # SQLite database file (gitignored)
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # React entry point
│   │   ├── App.jsx               # Main app component
│   │   ├── components/
│   │   │   ├── LaunchList.jsx    # List of launch cards
│   │   │   ├── LaunchCard.jsx    # Individual launch display
│   │   │   ├── LaunchDetail.jsx  # Full launch details modal/page
│   │   │   ├── SearchFilters.jsx # Filter controls
│   │   │   ├── DateRangePicker.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── CountdownTimer.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   ├── hooks/
│   │   │   ├── useLaunches.js    # Data fetching hook
│   │   │   ├── useFilters.js     # Filter state management
│   │   ├── utils/
│   │   │   ├── api.js            # API client
│   │   │   ├── formatters.js     # Date/text formatting
│   │   ├── styles/
│   │       ├── index.css         # Global styles (Tailwind or vanilla)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
├── scripts/
│   ├── initialLoad.js            # One-time historical data load
│   ├── dailySync.js              # Cron job script for daily updates
│   ├── setupDb.js                # Initialize database schema
├── deploy/
│   ├── nginx.conf                # Nginx configuration
│   ├── ecosystem.config.js       # PM2 configuration
│   ├── setup.sh                  # Server setup script
├── .gitignore
├── README.md
└── package.json                  # Root package.json for workspace
```

---

## Database Schema

Create this as `backend/src/db/schema.sql`:

```sql
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

-- Compound index for common query: upcoming launches sorted by date
CREATE INDEX IF NOT EXISTS idx_launches_upcoming ON launches(net, status_abbrev) 
    WHERE net >= datetime('now');

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
```

---

## Backend API Specification

### Base URL
```
Production: https://yourdomain.com/api
Development: http://localhost:3001/api
```

### Endpoints

#### GET /api/launches
List launches with filtering, sorting, and pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| upcoming | boolean | true | Only show future launches |
| past | boolean | false | Only show past launches (overrides upcoming) |
| provider | string | - | Filter by provider name (partial match) |
| country | string | - | Filter by launch location country code (e.g., "USA") |
| location | string | - | Filter by location name (partial match) |
| rocket | string | - | Filter by rocket name/family (partial match) |
| status | string | - | Filter by status abbrev (Go, TBD, Success, Failure) |
| from | ISO date | - | Launches on or after this date |
| to | ISO date | - | Launches on or before this date |
| search | string | - | Full-text search across name, mission, provider |
| limit | integer | 20 | Results per page (max 100) |
| offset | integer | 0 | Pagination offset |
| sort | string | net | Sort field: net, provider_name, location_name, rocket_name |
| order | string | asc | Sort order: asc, desc |

**Response:**
```json
{
  "success": true,
  "data": {
    "launches": [
      {
        "id": "e3df2ecd-c239-472f-95e4-2b89b4f75800",
        "name": "Falcon 9 Block 5 | Starlink Group 6-14",
        "status": {
          "id": 1,
          "name": "Go for Launch",
          "abbrev": "Go"
        },
        "net": "2025-01-28T14:30:00Z",
        "windowStart": "2025-01-28T14:30:00Z",
        "windowEnd": "2025-01-28T18:30:00Z",
        "rocket": {
          "name": "Falcon 9 Block 5",
          "family": "Falcon",
          "variant": "Block 5"
        },
        "provider": {
          "name": "SpaceX",
          "abbrev": "SpX",
          "type": "Commercial",
          "countryCode": "USA"
        },
        "pad": {
          "name": "Space Launch Complex 40",
          "latitude": 28.5618,
          "longitude": -80.577
        },
        "location": {
          "name": "Cape Canaveral, FL, USA",
          "countryCode": "USA"
        },
        "mission": {
          "name": "Starlink Group 6-14",
          "description": "A batch of satellites for Starlink mega-constellation...",
          "type": "Communications",
          "orbit": "LEO"
        },
        "imageUrl": "https://...",
        "webcastLive": false
      }
    ],
    "pagination": {
      "total": 7423,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### GET /api/launches/:id
Get detailed information for a single launch.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "e3df2ecd-c239-472f-95e4-2b89b4f75800",
    "name": "Falcon 9 Block 5 | Starlink Group 6-14",
    // ... full launch object with all fields
  }
}
```

#### GET /api/launches/:id/ics
Download ICS calendar file for a single launch.

**Response:** 
- Content-Type: `text/calendar`
- Content-Disposition: `attachment; filename="launch-{id}.ics"`

#### GET /api/launches/ics
Download ICS calendar file for multiple launches (filtered).

**Query Parameters:** Same as GET /api/launches (filters apply)

**Additional Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| maxEvents | integer | 50 | Maximum events in ICS file |

**Response:** 
- Content-Type: `text/calendar`
- Content-Disposition: `attachment; filename="rocket-launches.ics"`

#### GET /api/filters
Get available filter options (for populating dropdowns).

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      { "name": "SpaceX", "abbrev": "SpX", "count": 342 },
      { "name": "NASA", "abbrev": "NASA", "count": 215 },
      // ...
    ],
    "countries": [
      { "code": "USA", "name": "United States", "count": 1523 },
      { "code": "RUS", "name": "Russia", "count": 1102 },
      { "code": "CHN", "name": "China", "count": 876 },
      // ...
    ],
    "locations": [
      { "name": "Cape Canaveral, FL, USA", "countryCode": "USA", "count": 823 },
      { "name": "Kennedy Space Center, FL, USA", "countryCode": "USA", "count": 412 },
      // ...
    ],
    "statuses": [
      { "abbrev": "Success", "name": "Launch Successful", "count": 6102 },
      { "abbrev": "Go", "name": "Go for Launch", "count": 45 },
      { "abbrev": "TBD", "name": "To Be Determined", "count": 312 },
      // ...
    ],
    "rocketFamilies": [
      { "family": "Falcon", "count": 342 },
      { "family": "Soyuz", "count": 298 },
      // ...
    ]
  }
}
```

#### GET /api/stats
Get summary statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLaunches": 7423,
    "upcomingLaunches": 156,
    "launchesThisYear": 89,
    "lastSync": "2025-01-25T04:00:00Z",
    "nextLaunch": {
      "id": "...",
      "name": "...",
      "net": "2025-01-26T14:30:00Z"
    }
  }
}
```

---

## Launch Library 2 API Client

### Key Endpoints to Use

**Launches (main endpoint):**
```
GET https://ll.thespacedevs.com/2.2.0/launch/
GET https://ll.thespacedevs.com/2.2.0/launch/?limit=100&offset=0
GET https://ll.thespacedevs.com/2.2.0/launch/?last_updated__gte=2025-01-24
```

**Query Parameters for Launch Library 2:**
| Parameter | Description |
|-----------|-------------|
| limit | Results per page (max 100) |
| offset | Pagination offset |
| ordering | Sort field (net, -net for descending) |
| last_updated__gte | Filter: updated after date (for incremental sync) |
| net__gte | Filter: launches after date |
| net__lte | Filter: launches before date |
| search | Full-text search |
| lsp__name | Filter by launch service provider name |
| location__name | Filter by location |

### API Response Structure
The Launch Library 2 API returns nested objects. Key fields to extract:

```javascript
// Mapping from API response to our database
const mapLaunchToDb = (apiLaunch) => ({
  id: apiLaunch.id,                              // UUID string
  name: apiLaunch.name,
  slug: apiLaunch.slug,
  status_id: apiLaunch.status?.id,
  status_name: apiLaunch.status?.name,
  status_abbrev: apiLaunch.status?.abbrev,
  status_description: apiLaunch.status?.description,
  net: apiLaunch.net,
  window_start: apiLaunch.window_start,
  window_end: apiLaunch.window_end,
  
  rocket_id: apiLaunch.rocket?.configuration?.id,
  rocket_name: apiLaunch.rocket?.configuration?.name,
  rocket_family: apiLaunch.rocket?.configuration?.family,
  rocket_variant: apiLaunch.rocket?.configuration?.variant,
  rocket_full_name: apiLaunch.rocket?.configuration?.full_name,
  
  provider_id: apiLaunch.launch_service_provider?.id,
  provider_name: apiLaunch.launch_service_provider?.name,
  provider_abbrev: apiLaunch.launch_service_provider?.abbrev,
  provider_type: apiLaunch.launch_service_provider?.type,
  provider_country_code: apiLaunch.launch_service_provider?.country_code,
  
  pad_id: apiLaunch.pad?.id,
  pad_name: apiLaunch.pad?.name,
  pad_wiki_url: apiLaunch.pad?.wiki_url,
  pad_map_url: apiLaunch.pad?.map_url,
  pad_latitude: apiLaunch.pad?.latitude,
  pad_longitude: apiLaunch.pad?.longitude,
  
  location_id: apiLaunch.pad?.location?.id,
  location_name: apiLaunch.pad?.location?.name,
  location_country_code: apiLaunch.pad?.location?.country_code,
  location_map_image: apiLaunch.pad?.location?.map_image,
  location_timezone: apiLaunch.pad?.location?.timezone_name,
  
  mission_id: apiLaunch.mission?.id,
  mission_name: apiLaunch.mission?.name,
  mission_description: apiLaunch.mission?.description,
  mission_type: apiLaunch.mission?.type,
  mission_orbit_id: apiLaunch.mission?.orbit?.id,
  mission_orbit_name: apiLaunch.mission?.orbit?.name,
  mission_orbit_abbrev: apiLaunch.mission?.orbit?.abbrev,
  
  image_url: apiLaunch.image,
  infographic_url: apiLaunch.infographic,
  webcast_live: apiLaunch.webcast_live ? 1 : 0,
  
  last_updated: apiLaunch.last_updated
});
```

---

## Data Sync Strategy

### Initial Load (One-time)

The initial load must handle ~7,000+ records with API rate limits.

**Strategy:**
1. Use pagination: 100 records per request
2. Sleep between requests to respect rate limits
3. Track progress to allow resume if interrupted
4. Log all operations

**Pseudocode:**
```javascript
async function initialLoad() {
  const syncLog = createSyncLogEntry('full');
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  
  while (hasMore) {
    try {
      // Fetch page from API
      const response = await fetchLaunches({ limit, offset });
      
      // Insert/update each launch
      for (const launch of response.results) {
        upsertLaunch(mapLaunchToDb(launch));
      }
      
      // Update progress
      syncLog.records_fetched += response.results.length;
      syncLog.api_calls_made++;
      syncLog.last_api_offset = offset;
      
      // Check if more pages exist
      hasMore = response.next !== null;
      offset += limit;
      
      // Respect rate limits (15 req/hour = 1 per 4 minutes for unauth)
      // With API key: 300/day = 1 per ~5 minutes sustained
      await sleep(5000); // 5 seconds between requests with API key
      
    } catch (error) {
      syncLog.status = 'failed';
      syncLog.error_message = error.message;
      throw error;
    }
  }
  
  syncLog.status = 'success';
  syncLog.completed_at = new Date();
  saveSyncLog(syncLog);
}
```

**Important:** Request an API key from TheSpaceDevs before initial load:
- Email: [See their website for contact]
- Explain the project, request temporary elevated limits for initial load
- They're generally supportive of community projects

### Daily Incremental Sync

**Schedule:** Run daily at 04:00 UTC via cron

**Strategy:**
1. Query API for launches modified in last 48 hours (buffer for timezone/timing)
2. Upsert all returned records
3. Log sync results

**Pseudocode:**
```javascript
async function dailySync() {
  const syncLog = createSyncLogEntry('incremental');
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
  
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetchLaunches({
      limit,
      offset,
      last_updated__gte: since.toISOString()
    });
    
    for (const launch of response.results) {
      const existing = getLaunchById(launch.id);
      const mapped = mapLaunchToDb(launch);
      
      if (!existing) {
        insertLaunch(mapped);
        syncLog.records_added++;
      } else if (existing.last_updated !== mapped.last_updated) {
        updateLaunch(mapped);
        syncLog.records_updated++;
      } else {
        syncLog.records_unchanged++;
      }
    }
    
    hasMore = response.next !== null;
    offset += limit;
    
    await sleep(5000);
  }
  
  syncLog.status = 'success';
  syncLog.completed_at = new Date();
  saveSyncLog(syncLog);
}
```

---

## ICS Calendar Generation

### ICS File Format

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rocket Launch Tracker//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Rocket Launches
X-WR-TIMEZONE:UTC
BEGIN:VEVENT
UID:e3df2ecd-c239-472f-95e4-2b89b4f75800@rocketlaunches.example.com
DTSTAMP:20250125T120000Z
DTSTART:20250128T143000Z
DTEND:20250128T153000Z
SUMMARY:Falcon 9 Block 5 | Starlink Group 6-14
DESCRIPTION:Provider: SpaceX\nLocation: Cape Canaveral, FL, USA\nMission: A batch of satellites for Starlink...
LOCATION:Cape Canaveral, FL, USA
GEO:28.5618;-80.577
URL:https://rocketlaunches.example.com/launch/e3df2ecd-c239-472f-95e4-2b89b4f75800
STATUS:TENTATIVE
END:VEVENT
END:VCALENDAR
```

### Implementation Notes

- Use a library like `ics` (npm) for proper formatting
- Set DTEND to 1 hour after DTSTART (approximate launch duration)
- Use STATUS:TENTATIVE for upcoming, STATUS:CONFIRMED for past successful
- Include lat/long in GEO field for calendar apps that support it
- Escape special characters in DESCRIPTION

---

## Frontend Components

### Component Specifications

#### LaunchCard
Compact card showing key launch info.

**Props:**
```typescript
interface LaunchCardProps {
  launch: {
    id: string;
    name: string;
    net: string;
    status: { abbrev: string; name: string };
    provider: { name: string; countryCode: string };
    location: { name: string };
    rocket: { name: string };
    imageUrl?: string;
  };
  onClick: (id: string) => void;
}
```

**Display:**
- Status badge (color-coded: green=Go, yellow=TBD, blue=Success, red=Failure)
- Launch date/time (formatted for user's timezone)
- Countdown if upcoming (T-2d 5h 30m)
- Mission name
- Provider + flag emoji
- Location
- Rocket name
- Thumbnail image (lazy loaded)

#### SearchFilters
Collapsible sidebar with filter controls.

**State:**
```typescript
interface FilterState {
  upcoming: boolean;
  provider: string;
  country: string;
  location: string;
  rocket: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}
```

**Controls:**
- Toggle: Upcoming / Past / All
- Dropdown: Provider (populated from /api/filters)
- Dropdown: Country
- Autocomplete: Location
- Autocomplete: Rocket
- Date range picker
- Search input
- Clear filters button

#### LaunchDetail
Full launch information (modal or page).

**Sections:**
1. Header: Name, status badge, countdown/date
2. Mission: Description, type, orbit
3. Vehicle: Rocket details, provider
4. Location: Pad name, facility, map (static image or Leaflet)
5. Media: Launch image, webcast link if available
6. Actions: Download ICS button, share button

#### CountdownTimer
Live countdown to launch.

**Props:**
```typescript
interface CountdownProps {
  targetDate: string; // ISO date
  onComplete?: () => void;
}
```

**Display:** "T-2d 14h 32m 15s" or "Launched" if past

---

## Deployment Configuration

### AWS Lightsail Setup

**Instance:**
- OS: Ubuntu 22.04 LTS
- Plan: $5/month (1 GB RAM, 1 vCPU, 40 GB SSD)
- Region: Choose based on primary audience (us-east-1 for US)

**Setup Script (deploy/setup.sh):**
```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Create app directory
sudo mkdir -p /var/www/rocket-launches
sudo chown -R $USER:$USER /var/www/rocket-launches

# Clone repository (replace with your repo)
cd /var/www/rocket-launches
git clone https://github.com/yourusername/rocket-launches.git .

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && npm run build

# Setup PM2
cd ../backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx (see nginx.conf)
sudo cp deploy/nginx.conf /etc/nginx/sites-available/rocket-launches
sudo ln -s /etc/nginx/sites-available/rocket-launches /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Setup SSL (replace with your domain)
# sudo certbot --nginx -d yourdomain.com

# Setup cron for daily sync
(crontab -l 2>/dev/null; echo "0 4 * * * cd /var/www/rocket-launches && /usr/bin/node scripts/dailySync.js >> /var/log/rocket-sync.log 2>&1") | crontab -
```

### Nginx Configuration (deploy/nginx.conf)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    # Frontend static files
    location / {
        root /var/www/rocket-launches/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PM2 Configuration (deploy/ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: 'rocket-launches-api',
      cwd: '/var/www/rocket-launches/backend',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/rocket-launches-error.log',
      out_file: '/var/log/pm2/rocket-launches-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

---

## Environment Variables

### Backend (.env)
```bash
# Server
NODE_ENV=production
PORT=3001

# Database
DB_PATH=./data/launches.db

# Launch Library 2 API
LL2_API_BASE_URL=https://ll.thespacedevs.com/2.2.0
LL2_API_KEY=your_api_key_here  # Optional but recommended

# Sync settings
SYNC_DELAY_MS=5000  # Delay between API calls
SYNC_LOOKBACK_HOURS=48  # How far back to check for updates

# Logging
LOG_LEVEL=info
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=/api
VITE_APP_NAME=Rocket Launch Tracker
```

---

## Build Order

Execute these steps in order:

### Step 1: Project Initialization
1. Create root directory structure
2. Initialize npm workspaces (optional) or separate package.json files
3. Set up .gitignore
4. Create README.md

### Step 2: Database Setup
1. Create `backend/src/db/schema.sql`
2. Create `backend/src/db/database.js` with connection and query helpers
3. Create `scripts/setupDb.js` to initialize database
4. Test: Run setupDb.js and verify tables created

### Step 3: Launch Library 2 API Client
1. Create `backend/src/services/launchLibrary.js`
2. Implement: fetchLaunches(), fetchLaunchById()
3. Implement: mapLaunchToDb() transformation
4. Test: Fetch and log a few launches

### Step 4: Initial Data Load
1. Create `scripts/initialLoad.js`
2. Implement pagination and rate limiting
3. Implement progress tracking and resume capability
4. Test: Run partial load, verify data in SQLite

### Step 5: Backend API
1. Create Express app in `backend/src/index.js`
2. Implement `backend/src/routes/launches.js`
   - GET /api/launches with all filters
   - GET /api/launches/:id
3. Implement `backend/src/routes/filters.js`
   - GET /api/filters
4. Test: All endpoints via curl or Postman

### Step 6: ICS Export
1. Create `backend/src/utils/icsGenerator.js`
2. Implement `backend/src/routes/ics.js`
   - GET /api/launches/:id/ics
   - GET /api/launches/ics
3. Test: Download and import ICS into Google Calendar

### Step 7: Daily Sync
1. Create `scripts/dailySync.js`
2. Create `backend/src/services/sync.js` with shared logic
3. Test: Run manually, verify updates

### Step 8: Frontend Scaffold
1. Create Vite + React project in `frontend/`
2. Set up routing (React Router or simple state)
3. Create API client `frontend/src/utils/api.js`
4. Test: Fetch and display raw launch data

### Step 9: Frontend Components
1. Build LaunchCard component
2. Build LaunchList component
3. Build SearchFilters component
4. Build Pagination component
5. Build LaunchDetail component
6. Build CountdownTimer component
7. Style all components (Tailwind CSS recommended)

### Step 10: Frontend Integration
1. Wire up useLaunches hook with filters
2. Implement filter state management
3. Add ICS download buttons
4. Test: Full user flow

### Step 11: Deployment Preparation
1. Create deploy/nginx.conf
2. Create deploy/ecosystem.config.js
3. Create deploy/setup.sh
4. Build frontend for production

### Step 12: Lightsail Deployment
1. Create Lightsail instance
2. Run setup script
3. Configure domain (if available)
4. Set up SSL with Certbot
5. Configure cron job
6. Test: Production site

### Step 13: Monitoring & Polish
1. Set up basic logging
2. Add error handling throughout
3. Test edge cases
4. Performance optimization if needed

---

## Testing Checklist

### Backend
- [ ] Database schema creates without errors
- [ ] Initial load completes successfully
- [ ] GET /api/launches returns paginated results
- [ ] GET /api/launches?upcoming=true filters correctly
- [ ] GET /api/launches?provider=SpaceX filters correctly
- [ ] GET /api/launches?country=USA filters correctly
- [ ] GET /api/launches?from=2025-01-01&to=2025-12-31 filters correctly
- [ ] GET /api/launches/:id returns single launch
- [ ] GET /api/launches/:id/ics downloads valid ICS file
- [ ] GET /api/filters returns all filter options
- [ ] Daily sync updates existing records
- [ ] Daily sync adds new records

### Frontend
- [ ] Launch list displays on page load
- [ ] Pagination works
- [ ] Filter by provider works
- [ ] Filter by country works
- [ ] Date range filter works
- [ ] Search works
- [ ] Launch detail modal/page opens
- [ ] ICS download works
- [ ] Countdown timer displays correctly
- [ ] Responsive on mobile

### Deployment
- [ ] Backend starts with PM2
- [ ] Nginx serves frontend
- [ ] API proxy works
- [ ] SSL certificate valid
- [ ] Cron job runs daily sync
- [ ] Logs are being written

---

## Future Enhancements (Post-MVP)

These features were discussed but deferred:

1. **Email/Notification Alerts** - Subscribe to launches by provider/location
2. **Favorites/Watchlist** - Requires user accounts
3. **Map Visualization** - Interactive map of launch sites
4. **Near Real-time Updates** - WebSocket or polling for launch day updates
5. **Launch Statistics Dashboard** - Charts and analytics
6. **Webcast Embedding** - Embed YouTube streams for upcoming launches
7. **Social Sharing** - Share launches to Twitter/Facebook
8. **PWA Support** - Offline capability, push notifications

---

## Resources

### Launch Library 2 Documentation
- API Docs: https://thespacedevs.com/llapi
- Interactive Docs: https://ll.thespacedevs.com/2.2.0/swagger/

### Libraries to Use
- **Backend:**
  - express - Web framework
  - better-sqlite3 - SQLite driver (sync, fast)
  - ics - ICS file generation
  - node-cron - Cron scheduling (optional, can use system cron)
  - dotenv - Environment variables
  - cors - CORS middleware
  - helmet - Security headers
  
- **Frontend:**
  - react - UI framework
  - react-router-dom - Routing
  - @tanstack/react-query - Data fetching
  - tailwindcss - Styling
  - date-fns - Date formatting
  - lucide-react - Icons

### Reference Implementations
- Space Launch Now: https://spacelaunchnow.me/
- Next Spaceflight: https://nextspaceflight.com/
- RocketLaunch.Live: https://www.rocketlaunch.live/
