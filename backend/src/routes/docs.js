/**
 * 📚 Machine-readable API Documentation Endpoint
 * Useful for AI agents and tooling to auto-discover capabilities.
 */

import express from 'express';

const router = express.Router();

const COMMON_FILTER_PARAMS = [
  { name: 'upcoming', type: 'boolean', default: false, description: 'Only return future launches (NET >= now)' },
  { name: 'past', type: 'boolean', default: false, description: 'Only return past launches (NET < now)' },
  { name: 'provider', type: 'string', default: null, description: 'Launch service provider name (case-insensitive partial match, e.g. SpaceX)' },
  { name: 'country', type: 'string', default: null, description: 'Provider country code (e.g. US, RU, CN)' },
  { name: 'state', type: 'string', default: null, description: 'US state abbreviation (e.g. FL, CA)' },
  { name: 'location', type: 'string', default: null, description: 'Launch pad or location name (case-insensitive partial match)' },
  { name: 'rocket', type: 'string', default: null, description: 'Rocket name or family (case-insensitive partial match, e.g. Falcon 9)' },
  { name: 'status', type: 'string', default: null, description: 'Launch status name or abbreviation (e.g. Success, Failure, Go)' },
  { name: 'from', type: 'string (ISO 8601 date)', default: null, description: 'Filter launches on or after this date (e.g. 2025-01-01)' },
  { name: 'to', type: 'string (ISO 8601 date)', default: null, description: 'Filter launches on or before this date (e.g. 2025-12-31)' },
  { name: 'search', type: 'string', default: null, description: 'Full-text search across launch name, rocket, provider, and mission description' },
];

const docs = {
  version: '1.0',
  title: 'World Rocket Launch API',
  baseUrl: '/api',
  description: 'REST API for rocket launch data worldwide. Contains 7,700+ historical and upcoming launches, synced daily from Launch Library 2 (TheSpaceDevs). All dates are UTC. No authentication required.',
  dataSource: 'https://thespacedevs.com/',
  endpoints: [
    {
      method: 'GET',
      path: '/launches',
      description: 'List rocket launches with filtering, sorting, and pagination. All filter parameters are optional and combinable.',
      parameters: [
        ...COMMON_FILTER_PARAMS,
        { name: 'limit', type: 'integer', default: 20, description: 'Number of results per page (max 100, requests above 100 are silently capped)' },
        { name: 'offset', type: 'integer', default: 0, description: 'Pagination offset (number of records to skip)' },
        { name: 'sort', type: 'string', default: 'net', description: 'Sort field. Options: net, name, provider_name' },
        { name: 'order', type: 'string', default: 'asc', description: 'Sort direction. Options: asc, desc' },
      ],
      examples: [
        { description: 'Upcoming launches (default view)', url: '/api/launches?upcoming=true&limit=20' },
        { description: 'Upcoming SpaceX launches', url: '/api/launches?upcoming=true&provider=SpaceX' },
        { description: 'Next 5 launches worldwide', url: '/api/launches?upcoming=true&limit=5' },
        { description: 'All launches from Kennedy Space Center', url: '/api/launches?location=Kennedy' },
        { description: 'SpaceX Falcon 9 launches in 2025', url: '/api/launches?rocket=Falcon+9&from=2025-01-01&to=2025-12-31' },
        { description: 'Launches from Florida this year', url: '/api/launches?state=FL&from=2026-01-01&to=2026-12-31' },
        { description: 'Search for Starship launches', url: '/api/launches?search=Starship' },
        { description: 'Most recent 10 launches (newest first)', url: '/api/launches?past=true&sort=net&order=desc&limit=10' },
        { description: 'Second page of results', url: '/api/launches?upcoming=true&limit=20&offset=20' },
      ],
      response: {
        success: true,
        data: {
          launches: '[array of launch objects — see field descriptions below]',
          pagination: { total: 7750, limit: 20, offset: 0, hasMore: true },
        },
      },
    },
    {
      method: 'GET',
      path: '/launches/:id',
      description: 'Get full details for a single launch by its UUID.',
      parameters: [
        { name: 'id', in: 'path', type: 'string (UUID)', description: 'Launch UUID obtained from /api/launches list results' },
      ],
      examples: [
        { description: 'Get details for a specific launch', url: '/api/launches/5e9d0d95-f567-56cb-b784-f48f1234abcd' },
      ],
    },
    {
      method: 'GET',
      path: '/launches/:id/ics',
      description: 'Download an ICS calendar file for a single launch event. Returns text/calendar content.',
      parameters: [
        { name: 'id', in: 'path', type: 'string (UUID)', description: 'Launch UUID' },
      ],
      examples: [
        { description: 'Download calendar file for a specific launch', url: '/api/launches/5e9d0d95-f567-56cb-b784-f48f1234abcd/ics' },
      ],
    },
    {
      method: 'GET',
      path: '/launches/ics',
      description: 'Download an ICS calendar file for multiple filtered launches. Returns text/calendar. Hard-capped at 50 events to prevent calendar bloat.',
      parameters: [
        ...COMMON_FILTER_PARAMS,
        { name: 'maxEvents', type: 'integer', default: 50, description: 'Maximum number of events to include (hard cap: 50)' },
      ],
      examples: [
        { description: 'Upcoming Rocket Lab launches to calendar', url: '/api/launches/ics?upcoming=true&provider=Rocket+Lab' },
        { description: 'All upcoming launches (next 50)', url: '/api/launches/ics?upcoming=true' },
        { description: 'Upcoming launches from Cape Canaveral', url: '/api/launches/ics?upcoming=true&location=Cape+Canaveral' },
      ],
    },
    {
      method: 'GET',
      path: '/launches/stats',
      description: 'Get summary statistics including total launch count, upcoming count, and last sync timestamp.',
      parameters: [],
      examples: [
        { description: 'Get database statistics', url: '/api/launches/stats' },
      ],
    },
    {
      method: 'GET',
      path: '/launches/chart',
      description: 'Get aggregated launch counts grouped by a dimension. Supports the same filter params as /launches (excluding pagination/sort). Useful for charts and analytics.',
      parameters: [
        { name: 'groupBy', type: 'string', default: 'year', description: 'Grouping dimension. Options: year, month, provider, country' },
        ...COMMON_FILTER_PARAMS,
      ],
      examples: [
        { description: 'Launch counts by year (all time)', url: '/api/launches/chart?groupBy=year' },
        { description: 'Launch counts by provider', url: '/api/launches/chart?groupBy=provider' },
        { description: 'SpaceX launches by year', url: '/api/launches/chart?groupBy=year&provider=SpaceX' },
        { description: 'Launch counts by country', url: '/api/launches/chart?groupBy=country' },
        { description: 'Upcoming launches by provider', url: '/api/launches/chart?groupBy=provider&upcoming=true' },
      ],
    },
    {
      method: 'GET',
      path: '/filters',
      description: 'Get all available filter option values for populating dropdowns. Returns lists of providers, countries, locations, rocket families, and statuses.',
      parameters: [],
      examples: [
        { description: 'Get all filter options', url: '/api/filters' },
      ],
    },
    {
      method: 'GET',
      path: '/docs',
      description: 'This endpoint. Returns machine-readable JSON documentation of the entire API. Useful for AI agents to auto-discover endpoints and parameters before querying.',
      parameters: [],
      examples: [
        { description: 'Get API documentation', url: '/api/docs' },
      ],
    },
  ],
  launchFields: {
    id: 'UUID string — use as :id in /launches/:id and /launches/:id/ics',
    name: 'Full launch name (e.g. "Falcon 9 Block 5 | Starlink Group 6-1")',
    net: 'No Earlier Than launch time, UTC ISO 8601 string',
    windowStart: 'Launch window start, UTC ISO 8601 string',
    windowEnd: 'Launch window end, UTC ISO 8601 string',
    'status.abbrev': 'Short status code: Go, TBD, Hold, Success, Failure, etc.',
    'status.name': 'Full status description',
    'rocket.name': 'Rocket configuration name (e.g. Falcon 9 Block 5)',
    'rocket.family': 'Rocket family (e.g. Falcon, Soyuz, Long March)',
    'provider.name': 'Launch service provider (e.g. SpaceX, Roscosmos)',
    'provider.countryCode': 'Provider country code (e.g. USA, RUS, CHN)',
    'location.name': 'Launch site name with country (e.g. Kennedy Space Center, FL, USA)',
    'mission.type': 'Mission category (e.g. Communications, ISS Resupply, Earth Science)',
    'mission.description': 'Mission details and payload description',
    imageUrl: 'Launch image URL (may be null)',
    webcastLive: 'Boolean — true if a live stream is expected',
  },
  notes: [
    'All dates and times are UTC.',
    'String filters (provider, location, rocket, search) use case-insensitive partial matching — no need for exact values.',
    'Use GET /api/filters to discover the exact available values for dropdowns.',
    'upcoming=true and past=true are mutually exclusive. Omitting both returns all launches (historical and upcoming).',
    'The ICS bulk export (/launches/ics) is hard-capped at 50 events.',
    'Maximum limit for /launches is 100 per page.',
    'Data is synced daily from Launch Library 2 at 4 AM UTC.',
    'The dateFrom/dateTo query params are accepted as aliases for from/to.',
  ],
};

/**
 * GET /api/docs
 * Machine-readable API documentation for AI agents and tooling
 */
router.get('/', (req, res) => {
  res.json(docs);
});

export default router;
