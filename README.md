# 🚀 Rocket Launch Tracker

A full-stack web application to track rocket launches worldwide using the Launch Library 2 API.

## Features

- 📊 Browse ~7,000+ historical and upcoming rocket launches
- 🔍 Search and filter by provider, location, country, status
- 📅 Export launches to ICS calendar format
- 🔄 Daily automated data sync
- 📱 Responsive design with Tailwind CSS

## Tech Stack

**Backend:**
- Node.js + Express
- Bun runtime
- SQLite (bun:sqlite)
- Launch Library 2 API integration

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- TanStack Query (React Query)
- date-fns

### How to connect to Prod
- ssh -i ~/.ssh/YOUR-KEY-FILE.pem ubuntu@123.456.789.0

## Quick Start


### Prerequisites

- [Bun](https://bun.sh/) installed
- Launch Library 2 API key (get one at https://thespacedevs.com/llapi)

### Setup

1. **Add your API key**

   Edit `backend/.env` and add your Launch Library 2 API key:
   ```bash
   LL2_API_KEY=your_api_key_here
   ```

2. **Initialize the database**

   ```bash
   cd backend
   bun run setup-db
   ```

3. **Load launch data** (this will take ~30-60 minutes for ~7,000+ launches)

   ```bash
   bun run initial-load
   ```

   This fetches all launches with rate limiting (5 seconds between requests).

4. **Start the backend server**

   ```bash
   bun run dev
   ```

   Backend will run on http://localhost:3001

5. **Start the frontend** (in a new terminal)

   ```bash
   cd frontend
   bun run dev
   ```

   Frontend will run on http://localhost:5173

6. **Visit the app**

   Open http://localhost:5173 in your browser

## Available Commands

### Backend

```bash
cd backend

bun run dev           # Start development server with hot reload
bun run start         # Start production server
bun run setup-db      # Initialize database schema
bun run initial-load  # One-time load of all launches (~7,000+)
bun run daily-sync    # Incremental sync of updated launches
```

### Frontend

```bash
cd frontend

bun run dev      # Start development server
bun run build    # Build for production
bun run preview  # Preview production build
```

## API Endpoints

- `GET /api/launches` - List launches with filters
  - Query params: `upcoming`, `provider`, `country`, `location`, `rocket`, `status`, `from`, `to`, `search`, `limit`, `offset`, `sort`, `order`
- `GET /api/launches/:id` - Get launch details
- `GET /api/launches/:id/ics` - Download single launch ICS file
- `GET /api/launches/ics` - Download filtered launches ICS file (max 50)
- `GET /api/filters` - Get filter options
- `GET /api/launches/stats` - Get statistics
- `GET /health` - Health check

## Daily Sync

To keep data up-to-date, set up a daily cron job:

```bash
0 4 * * * cd /path/to/backend && bun run daily-sync >> /var/log/rocket-sync.log 2>&1
```

This runs at 4 AM UTC daily and updates launches modified in the last 48 hours.

## Project Structure

```
rocket-launches/
├── backend/
│   ├── src/
│   │   ├── db/              # Database schema and queries
│   │   ├── services/        # API client and sync logic
│   │   ├── routes/          # Express routes
│   │   ├── utils/           # ICS generator, logger
│   │   ├── config.js        # Configuration
│   │   └── index.js         # Server entry point
│   ├── scripts/             # Setup and sync scripts
│   └── data/                # SQLite database (gitignored)
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # API client
│   │   └── App.jsx          # Main app component
│   └── index.html
└── CLAUDE.md                # Project documentation for Claude Code
```

## Deployment

See `deploy/` directory for:
- `nginx.conf` - Nginx configuration
- `ecosystem.config.js` - PM2 configuration
- `setup.sh` - Server setup script

Designed for AWS Lightsail ($5/month Ubuntu instance).

## License

MIT

## Credits

Launch data provided by [TheSpaceDevs Launch Library 2 API](https://thespacedevs.com/)
