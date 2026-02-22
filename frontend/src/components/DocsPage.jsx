import { FileText, Terminal, Zap, BookOpen, Code2, AlertCircle } from 'lucide-react';

const BASE_URL = '/api';

const ENDPOINTS = [
  { method: 'GET', path: '/api/launches', description: 'List launches with filters, sorting, pagination' },
  { method: 'GET', path: '/api/launches/:id', description: 'Full details for a single launch' },
  { method: 'GET', path: '/api/launches/:id/ics', description: 'Download ICS calendar file for one launch' },
  { method: 'GET', path: '/api/launches/ics', description: 'Download ICS calendar for filtered launches (max 50)' },
  { method: 'GET', path: '/api/launches/stats', description: 'Summary statistics (totals, last sync time)' },
  { method: 'GET', path: '/api/launches/chart', description: 'Aggregated counts grouped by year / month / provider / country' },
  { method: 'GET', path: '/api/filters', description: 'Available filter options for dropdowns' },
  { method: 'GET', path: '/api/docs', description: 'Machine-readable API docs (this endpoint)' },
];

const LAUNCH_PARAMS = [
  { name: 'upcoming', type: 'boolean', default: 'false', description: 'Only future launches (NET ≥ now)' },
  { name: 'past', type: 'boolean', default: 'false', description: 'Only past launches (NET < now)' },
  { name: 'provider', type: 'string', default: '—', description: 'Provider name partial match (e.g. SpaceX)' },
  { name: 'country', type: 'string', default: '—', description: 'Provider country code (e.g. US, RU, CN)' },
  { name: 'state', type: 'string', default: '—', description: 'US state abbreviation (e.g. FL, CA)' },
  { name: 'location', type: 'string', default: '—', description: 'Launch pad/location name partial match' },
  { name: 'rocket', type: 'string', default: '—', description: 'Rocket name or family partial match (e.g. Falcon 9)' },
  { name: 'status', type: 'string', default: '—', description: 'Launch status (e.g. Success, Failure, GO)' },
  { name: 'from', type: 'ISO 8601 date', default: '—', description: 'Start date filter (e.g. 2025-01-01)' },
  { name: 'to', type: 'ISO 8601 date', default: '—', description: 'End date filter (e.g. 2025-12-31)' },
  { name: 'search', type: 'string', default: '—', description: 'Full-text search across name, rocket, provider, mission' },
  { name: 'limit', type: 'integer', default: '20', description: 'Results per page (max 100)' },
  { name: 'offset', type: 'integer', default: '0', description: 'Pagination offset' },
  { name: 'sort', type: 'string', default: 'net', description: 'Sort field: net | name | provider_name' },
  { name: 'order', type: 'string', default: 'asc', description: 'Sort direction: asc | desc' },
];

const ICS_PARAMS = [
  { name: 'upcoming', type: 'boolean', default: 'false', description: 'Only future launches' },
  { name: 'past', type: 'boolean', default: 'false', description: 'Only past launches' },
  { name: 'provider', type: 'string', default: '—', description: 'Provider name partial match' },
  { name: 'country', type: 'string', default: '—', description: 'Provider country code' },
  { name: 'state', type: 'string', default: '—', description: 'US state abbreviation' },
  { name: 'location', type: 'string', default: '—', description: 'Launch pad/location partial match' },
  { name: 'rocket', type: 'string', default: '—', description: 'Rocket name or family partial match' },
  { name: 'status', type: 'string', default: '—', description: 'Launch status' },
  { name: 'from', type: 'ISO 8601 date', default: '—', description: 'Start date filter' },
  { name: 'to', type: 'ISO 8601 date', default: '—', description: 'End date filter' },
  { name: 'search', type: 'string', default: '—', description: 'Full-text search' },
  { name: 'maxEvents', type: 'integer', default: '50', description: 'Max events to include (hard cap: 50)' },
];

const CHART_PARAMS = [
  { name: 'groupBy', type: 'string', default: 'year', description: 'Grouping: year | month | provider | country' },
  { name: 'upcoming', type: 'boolean', default: 'false', description: 'Only future launches' },
  { name: 'past', type: 'boolean', default: 'false', description: 'Only past launches' },
  { name: 'provider', type: 'string', default: '—', description: 'Provider name partial match' },
  { name: 'country', type: 'string', default: '—', description: 'Provider country code' },
  { name: 'from', type: 'ISO 8601 date', default: '—', description: 'Start date filter' },
  { name: 'to', type: 'ISO 8601 date', default: '—', description: 'End date filter' },
  { name: 'search', type: 'string', default: '—', description: 'Full-text search' },
];

const EXAMPLE_QUERIES = [
  { intent: 'Show me upcoming SpaceX launches', url: '/api/launches?upcoming=true&provider=SpaceX' },
  { intent: 'Launches from Florida this year', url: '/api/launches?state=FL&from=2026-01-01&to=2026-12-31' },
  { intent: 'Next 5 launches worldwide', url: '/api/launches?upcoming=true&limit=5' },
  { intent: 'All launches from Kennedy Space Center', url: '/api/launches?location=Kennedy' },
  { intent: 'Export upcoming Rocket Lab launches to calendar', url: '/api/launches/ics?upcoming=true&provider=Rocket+Lab' },
  { intent: 'SpaceX Falcon 9 launches in 2025', url: '/api/launches?rocket=Falcon+9&from=2025-01-01&to=2025-12-31' },
  { intent: 'Stats grouped by country', url: '/api/launches/chart?groupBy=country' },
  { intent: 'Most recent 10 launches', url: '/api/launches?past=true&sort=net&order=desc&limit=10' },
];

const RESPONSE_EXAMPLE = `{
  "success": true,
  "data": {
    "launches": [
      {
        "id": "5e9d0d95-f567-56cb-b784-f48f12abc123",
        "name": "Falcon 9 Block 5 | Starlink Group 6-1",
        "net": "2026-03-15T14:30:00Z",
        "status": {
          "id": 1,
          "name": "Go for Launch",
          "abbrev": "Go"
        },
        "rocket": {
          "name": "Falcon 9 Block 5",
          "family": "Falcon",
          "fullName": "Falcon 9 Block 5"
        },
        "provider": {
          "name": "SpaceX",
          "abbrev": "SpX",
          "countryCode": "USA"
        },
        "location": {
          "name": "Kennedy Space Center, FL, USA"
        },
        "mission": {
          "name": "Starlink Group 6-1",
          "description": "...",
          "type": "Communications"
        }
      }
    ],
    "pagination": {
      "total": 7750,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}`;

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center space-x-3 mb-4">
      <div className="p-2 bg-blue-100 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
    </div>
  );
}

function MethodBadge({ method }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 font-mono">
      {method}
    </span>
  );
}

function CodeBlock({ children, className = '' }) {
  return (
    <pre className={`bg-gray-900 text-green-400 rounded-lg p-4 text-sm font-mono overflow-x-auto leading-relaxed ${className}`}>
      {children}
    </pre>
  );
}

function ParamTable({ params }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/5">Parameter</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/5">Type</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 w-1/6">Default</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={p.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 font-mono text-blue-700 font-medium">{p.name}</td>
              <td className="px-3 py-2 text-gray-500 font-mono text-xs">{p.type}</td>
              <td className="px-3 py-2 text-gray-500 font-mono text-xs">{p.default}</td>
              <td className="px-3 py-2 text-gray-600">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">

      {/* Page title */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center space-x-3 mb-3">
          <FileText className="w-8 h-8" />
          <h1 className="text-3xl font-bold">API Documentation</h1>
        </div>
        <p className="text-blue-100 text-lg">
          World Rocket Launch REST API — 7,700+ launches, synced daily from TheSpaceDevs
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="bg-white bg-opacity-20 rounded-lg px-3 py-1">Base URL: <code className="font-mono font-bold">/api</code></span>
          <span className="bg-white bg-opacity-20 rounded-lg px-3 py-1">Format: JSON</span>
          <span className="bg-white bg-opacity-20 rounded-lg px-3 py-1">No auth required</span>
          <span className="bg-white bg-opacity-20 rounded-lg px-3 py-1">Machine docs: <code className="font-mono font-bold">GET /api/docs</code></span>
        </div>
      </div>

      {/* Quick Start */}
      <div className="bg-white rounded-xl shadow p-6">
        <SectionHeader icon={Terminal} title="Quick Start" />
        <p className="text-gray-600 mb-4">Copy-paste these curl commands to get started immediately.</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Upcoming launches</p>
            <CodeBlock>{`curl "https://worldrocketlaunch.com/api/launches?upcoming=true&limit=5"`}</CodeBlock>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">SpaceX launches only</p>
            <CodeBlock>{`curl "https://worldrocketlaunch.com/api/launches?upcoming=true&provider=SpaceX"`}</CodeBlock>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Available filter options</p>
            <CodeBlock>{`curl "https://worldrocketlaunch.com/api/filters"`}</CodeBlock>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Machine-readable API docs</p>
            <CodeBlock>{`curl "https://worldrocketlaunch.com/api/docs"`}</CodeBlock>
          </div>
        </div>
      </div>

      {/* Endpoint Overview */}
      <div className="bg-white rounded-xl shadow p-6">
        <SectionHeader icon={BookOpen} title="API Endpoints" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-16">Method</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-2/5">Path</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep, i) => (
                <tr key={ep.path} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2"><MethodBadge method={ep.method} /></td>
                  <td className="px-3 py-2 font-mono text-sm text-gray-800">{ep.path}</td>
                  <td className="px-3 py-2 text-gray-600">{ep.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GET /api/launches parameters */}
      <div className="bg-white rounded-xl shadow p-6">
        <SectionHeader icon={Code2} title="Query Parameters" />

        <div className="space-y-8">
          <div>
            <h3 className="font-bold text-gray-800 mb-1">
              <MethodBadge method="GET" /> <code className="text-gray-700 ml-2">/api/launches</code>
            </h3>
            <p className="text-gray-600 text-sm mb-3">All parameters are optional and combinable.</p>
            <ParamTable params={LAUNCH_PARAMS} />
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-1">
              <MethodBadge method="GET" /> <code className="text-gray-700 ml-2">/api/launches/ics</code>
            </h3>
            <p className="text-gray-600 text-sm mb-3">Same filter params as above, plus <code className="bg-gray-100 px-1 rounded text-xs">maxEvents</code>. Returns <code className="bg-gray-100 px-1 rounded text-xs">text/calendar</code>.</p>
            <ParamTable params={ICS_PARAMS} />
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-1">
              <MethodBadge method="GET" /> <code className="text-gray-700 ml-2">/api/launches/chart</code>
            </h3>
            <p className="text-gray-600 text-sm mb-3">Returns aggregated counts. Accepts the same filter params as <code className="bg-gray-100 px-1 rounded text-xs">/launches</code>, plus <code className="bg-gray-100 px-1 rounded text-xs">groupBy</code>.</p>
            <ParamTable params={CHART_PARAMS} />
          </div>
        </div>
      </div>

      {/* Example Queries */}
      <div className="bg-white rounded-xl shadow p-6">
        <SectionHeader icon={Zap} title="Example Queries" />
        <p className="text-gray-600 text-sm mb-4">
          Natural language intent mapped to API calls — useful for AI agents building queries.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-2/5">Intent</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">API Call</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLE_QUERIES.map((ex, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 text-gray-700 italic">"{ex.intent}"</td>
                  <td className="px-3 py-2 font-mono text-blue-700 text-xs break-all">{ex.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Format */}
      <div className="bg-white rounded-xl shadow p-6">
        <SectionHeader icon={FileText} title="Response Format" />
        <p className="text-gray-600 mb-4">
          All endpoints return JSON. List responses include a <code className="bg-gray-100 px-1 rounded text-xs">pagination</code> object for cursor-free paging via <code className="bg-gray-100 px-1 rounded text-xs">offset</code>.
        </p>
        <CodeBlock className="text-xs">{RESPONSE_EXAMPLE}</CodeBlock>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Key launch fields</h4>
            <ul className="space-y-1 text-gray-600 font-mono text-xs">
              <li><span className="text-blue-700">id</span> — UUID (use for ICS download)</li>
              <li><span className="text-blue-700">net</span> — No Earlier Than (UTC ISO 8601)</li>
              <li><span className="text-blue-700">status.abbrev</span> — Go / TBD / Hold / etc.</li>
              <li><span className="text-blue-700">rocket.family</span> — e.g. Falcon, Soyuz</li>
              <li><span className="text-blue-700">provider.name</span> — launch company</li>
              <li><span className="text-blue-700">location.name</span> — launch site</li>
              <li><span className="text-blue-700">mission.type</span> — Communications, ISS, etc.</li>
            </ul>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Pagination</h4>
            <ul className="space-y-1 text-gray-600 font-mono text-xs">
              <li><span className="text-blue-700">total</span> — total matching records</li>
              <li><span className="text-blue-700">limit</span> — page size requested</li>
              <li><span className="text-blue-700">offset</span> — current page start</li>
              <li><span className="text-blue-700">hasMore</span> — true if more pages exist</li>
            </ul>
            <p className="text-gray-500 text-xs mt-3">Next page: add <code className="bg-white px-1 rounded">offset=20</code> (or whatever limit is) to your request.</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow p-6">
        <SectionHeader icon={AlertCircle} title="Notes & Limits" />
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>All dates and times are <strong>UTC</strong>. The <code className="bg-gray-100 px-1 rounded text-xs">net</code> field is the "No Earlier Than" launch time.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>String filters (<code className="bg-gray-100 px-1 rounded text-xs">provider</code>, <code className="bg-gray-100 px-1 rounded text-xs">location</code>, <code className="bg-gray-100 px-1 rounded text-xs">rocket</code>, <code className="bg-gray-100 px-1 rounded text-xs">search</code>) use <strong>case-insensitive partial matching</strong>.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Maximum <code className="bg-gray-100 px-1 rounded text-xs">limit</code> is <strong>100</strong> per page. Requests above 100 are silently capped.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>ICS bulk export is hard-capped at <strong>50 events</strong> to prevent calendar app bloat.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span><code className="bg-gray-100 px-1 rounded text-xs">upcoming=true</code> and <code className="bg-gray-100 px-1 rounded text-xs">past=true</code> are mutually exclusive. Omitting both returns all launches.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>Data is synced daily from <strong>Launch Library 2</strong> (TheSpaceDevs) at 4 AM UTC.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>For AI agents: <code className="bg-gray-100 px-1 rounded text-xs">GET /api/docs</code> returns a machine-readable JSON description of all endpoints and parameters.</span>
          </li>
        </ul>
      </div>

    </div>
  );
}
