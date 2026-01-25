# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web application to track rocket launches worldwide using the Launch Library 2 API (TheSpaceDevs). The app displays ~7,000+ historical and upcoming rocket launches with search/filter capabilities and calendar export functionality.

**Key Features:**
- Daily automated data sync from Launch Library 2 API
- Search/filter by provider, location, date range
- Default view shows upcoming launches
- Export launches to ICS calendar format
- Anonymous public access (no authentication)

## Workspace Directories
- Main project directory: /Users/davidk/dev/web-rocket-launch/
- Extra Documentation directory:
  - /Users/davidk/dev/docs/projects/web-rocket-launch/
  - Used for extra documentation only that is NOT under the git repo
  - Only place documentation when requested.
  - Developer "Dev logs" notes are stored here:
    - /Users/davidk/dev/docs/projects/web-rocket-launch/rocket-launch-DevLogs/


## Tech Stack

- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** React + Vite + Tailwind CSS
- **Hosting:** AWS Lightsail ($5/month) + Nginx + PM2
- **Data Source:** Launch Library 2 API (https://ll.thespacedevs.com/2.2.0/)

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
│   │   └── launches.db           # SQLite database (gitignored)
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # React entry point
│   │   ├── App.jsx               # Main app component
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Frontend utilities
│   ├── package.json
│   ├── vite.config.js
├── scripts/
│   ├── initialLoad.js            # One-time historical data load
│   ├── dailySync.js              # Cron job for daily updates
│   ├── setupDb.js                # Initialize database schema
├── deploy/
│   ├── nginx.conf                # Nginx configuration
│   ├── ecosystem.config.js       # PM2 configuration
│   ├── setup.sh                  # Server setup script
└── rocket-launches-plan.md       # Detailed implementation plan
```

## Common Development Commands

### Backend

```bash
# Setup database (first time only)
cd backend
bun run scripts/setupDb.js

# Start development server
bun run dev

# Run initial data load (one-time, ~7000+ records)
# IMPORTANT: Request API key from TheSpaceDevs first
bun run scripts/initialLoad.js

# Run daily sync manually
bun run scripts/dailySync.js

# Test API endpoints
curl http://localhost:3001/api/launches?limit=5
curl http://localhost:3001/api/launches?upcoming=true
curl http://localhost:3001/api/filters
```

### Frontend

```bash
cd frontend
bun install
bun run dev          # Start development server
bun run build        # Build for production
bun run preview      # Preview production build
```

### Deployment

```bash
# Build frontend for production
cd frontend && bun run build

# Start backend with PM2
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 logs rocket-launches-api

# Restart after code changes
pm2 restart rocket-launches-api
```

## Architecture Patterns

### Data Flow

1. **Data Ingestion:** Launch Library 2 API → `launchLibrary.js` → SQLite database
2. **API Layer:** SQLite → Express routes → Frontend
3. **Sync Strategy:**
   - Initial load: Paginated fetch of all records (100/page, 5s delay between requests)
   - Daily sync: Incremental updates via `last_updated__gte` parameter (48-hour lookback)

### API Client Pattern

The `backend/src/services/launchLibrary.js` client handles:
- Rate limiting (15 req/hour unauthenticated, 300/day with API key)
- Response transformation from nested API objects to flat database schema
- Pagination handling with offset/limit
- Error handling and retry logic

**Key transformation:** API returns deeply nested objects (launch.rocket.configuration.name, launch.pad.location.name, etc.). The `mapLaunchToDb()` function flattens these into a single-level schema for SQLite storage.

### Database Schema

Single denormalized `launches` table with all launch data flattened for query performance. Optional normalized `providers` and `locations` tables for filter dropdowns.

**Key indexes:**
- `idx_launches_net` - Time-based queries (upcoming launches)
- `idx_launches_provider_name` - Filter by company
- `idx_launches_location_name` - Filter by location
- `idx_launches_upcoming` - Compound index for default view

See `backend/src/db/schema.sql` for complete schema (lines 110-274 of rocket-launches-plan.md).

### Frontend Component Architecture

**Data fetching pattern:**
- Use `@tanstack/react-query` for server state management
- Custom hook `useLaunches()` encapsulates API calls and caching
- `useFilters()` hook manages filter state and URL sync

**Component hierarchy:**
```
App
├── Header
├── SearchFilters
│   ├── DateRangePicker
│   └── [Filter dropdowns]
├── LaunchList
│   ├── LaunchCard (repeated)
│   └── Pagination
└── LaunchDetail (modal/page)
    ├── CountdownTimer
    └── [Launch details sections]
```

## API Endpoints

**GET /api/launches** - List launches with filters
- Query params: `upcoming`, `provider`, `country`, `location`, `rocket`, `from`, `to`, `search`, `limit`, `offset`, `sort`, `order`
- Returns: Paginated launch array with total count

**GET /api/launches/:id** - Single launch details

**GET /api/launches/:id/ics** - Download ICS file for single launch

**GET /api/launches/ics** - Download ICS file for filtered launches (max 50 events)

**GET /api/filters** - Get available filter options (providers, countries, locations, statuses, rocket families)

**GET /api/stats** - Summary statistics (total launches, upcoming count, last sync time)

See lines 278-460 of rocket-launches-plan.md for complete API specification.

## Launch Library 2 API Integration

**Base URL:** `https://ll.thespacedevs.com/2.2.0/`

**Rate Limits:**
- Unauthenticated: 15 requests/hour
- With API key: 300 requests/day
- **Important:** Request free API key before initial data load

**Key endpoints:**
- `GET /launch/` - Paginated launches (max 100/page)
- `GET /launch/?last_updated__gte=2025-01-24` - Incremental sync
- `GET /launch/?net__gte=2025-01-01&net__lte=2025-12-31` - Date range

**Response structure:** Deeply nested objects requiring transformation:
- `launch.rocket.configuration.name` → `rocket_name`
- `launch.launch_service_provider.name` → `provider_name`
- `launch.pad.location.name` → `location_name`
- `launch.mission.orbit.abbrev` → `mission_orbit_abbrev`

See `mapLaunchToDb()` function specification (lines 492-543 of plan).

## Data Sync Strategy

### Initial Load
- Fetch ~7,000+ records in batches of 100
- 5-second delay between requests to respect rate limits
- Track progress in `sync_log` table for resume capability
- Run as one-time script: `scripts/initialLoad.js`

### Daily Incremental Sync
- Query launches updated in last 48 hours
- Upsert records (insert new, update changed, skip unchanged)
- Log results to `sync_log` table
- Scheduled via cron: `0 4 * * *` (4 AM UTC daily)
- Script: `scripts/dailySync.js`

## ICS Calendar Export

**Library:** Use `ics` npm package for RFC 5545 compliance

**Event structure:**
- UID: Launch UUID from database
- DTSTART: Launch NET (No Earlier Than) time
- DTEND: NET + 1 hour (approximate)
- SUMMARY: Launch name
- LOCATION: Pad location name
- GEO: Latitude/longitude coordinates
- DESCRIPTION: Provider, mission description
- STATUS: TENTATIVE (upcoming) or CONFIRMED (past)

**File limits:**
- Single launch: 1 event
- Filtered export: Max 50 events to prevent calendar bloat

## Development Workflow

### Build Order (for new features)

1. **Database changes:** Update `schema.sql`, run migration
2. **API client:** Add/modify functions in `launchLibrary.js`
3. **Backend routes:** Implement endpoint in `routes/`
4. **Test backend:** Use curl or Postman
5. **Frontend API client:** Update `utils/api.js`
6. **React components:** Build/modify UI components
7. **Integration test:** Test full user flow

### Testing Strategy

**Backend:**
- Test API endpoints manually with curl
- Verify database queries return expected results
- Test sync scripts with small data samples first

**Frontend:**
- Test all filter combinations
- Verify responsive design on mobile
- Test ICS download in Google Calendar/Outlook
- Check countdown timer accuracy

## Environment Variables

### Backend (.env)
```bash
NODE_ENV=production
PORT=3001
DB_PATH=./data/launches.db
LL2_API_BASE_URL=https://ll.thespacedevs.com/2.2.0
LL2_API_KEY=your_api_key_here
SYNC_DELAY_MS=5000
SYNC_LOOKBACK_HOURS=48
LOG_LEVEL=info
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=/api
VITE_APP_NAME=Rocket Launch Tracker
```

## Deployment

**Platform:** AWS Lightsail ($5/month Ubuntu instance)

**Stack:**
- Nginx: Reverse proxy + static file serving
- PM2: Process manager for Node.js backend
- Certbot: SSL certificates (Let's Encrypt)
- Cron: Daily sync scheduling

**Deployment steps:**
1. Run `deploy/setup.sh` on fresh Ubuntu instance
2. Configure domain DNS to point to instance
3. Run `certbot --nginx -d yourdomain.com`
4. Verify cron job: `crontab -l`

**Key files:**
- `deploy/nginx.conf` - Frontend at `/`, API proxy at `/api`
- `deploy/ecosystem.config.js` - PM2 configuration
- `deploy/setup.sh` - Automated server setup

## Logging Guidelines

- Use emojis in log messages for easier debugging (🚀 launches, 🔄 sync, ✅ success, ❌ error)
- Log levels: error, warn, info, debug
- Include timestamps and context in all logs
- Sync operations should log: records fetched/added/updated, API calls made, errors

## Git Commit Conventions

From ~/.claude/CLAUDE.md:
- With task ID: `[#task ID] descriptive message`
- Bug fixes: `[BugFix] description of fix`
- No task ID: `[Ad Hoc] message`

## Important Notes

- Always use `bun` instead of `npm` for package management
- Use `uv` for Python packages (if adding Python tooling)
- Never commit `.env` files or `data/launches.db`
- Request API key from TheSpaceDevs before initial data load
- Test ICS exports in actual calendar apps (Google Calendar, Outlook) to verify compatibility
- Frontend must handle loading states (initial load can take several seconds)
- All dates are UTC; convert to user timezone in frontend display only
