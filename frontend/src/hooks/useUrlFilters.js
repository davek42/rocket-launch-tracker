import { useState, useEffect, useRef } from 'react';

const FILTER_DEFAULTS = {
  upcoming: true,
  limit: 20,
  offset: 0,
  sort: 'net',
  order: 'asc',
  search: '',
  provider: '',
  country: '',
  state: '',
  location: '',
  rocket: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

const STRING_KEYS = ['search', 'provider', 'country', 'state', 'location', 'rocket', 'status', 'dateFrom', 'dateTo', 'sort', 'order'];
const INT_KEYS = ['limit', 'offset'];

function parseFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  const filters = { ...FILTER_DEFAULTS };

  for (const key of STRING_KEYS) {
    if (params.has(key)) {
      filters[key] = params.get(key);
    }
  }

  for (const key of INT_KEYS) {
    if (params.has(key)) {
      const parsed = parseInt(params.get(key), 10);
      filters[key] = isNaN(parsed) ? FILTER_DEFAULTS[key] : parsed;
    }
  }

  if (params.has('upcoming')) {
    const val = params.get('upcoming');
    filters.upcoming = val === 'true';
    filters.past = val === 'false';
  }

  // Date range overrides upcoming/past
  if (filters.dateFrom || filters.dateTo) {
    filters.upcoming = undefined;
    filters.past = undefined;
  }

  return filters;
}

function filtersToSearchString(filters, view) {
  const params = new URLSearchParams();

  for (const key of STRING_KEYS) {
    const val = filters[key];
    if (val !== undefined && val !== '' && val !== FILTER_DEFAULTS[key]) {
      params.set(key, val);
    }
  }

  for (const key of INT_KEYS) {
    const val = filters[key];
    if (val !== undefined && val !== FILTER_DEFAULTS[key]) {
      params.set(key, String(val));
    }
  }

  // Only serialize upcoming if it differs from default and no date range is set
  if (!filters.dateFrom && !filters.dateTo) {
    if (filters.upcoming !== undefined && filters.upcoming !== FILTER_DEFAULTS.upcoming) {
      params.set('upcoming', String(filters.upcoming));
    }
  }
  // Never serialize 'past' — it's derived from 'upcoming'

  if (view && view !== 'launches') {
    params.set('view', view);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default function useUrlFilters() {
  const isInitialMount = useRef(true);

  const initialView = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'launches';
  })();

  const [filters, setFilters] = useState(() => parseFiltersFromURL());
  const [currentView, setCurrentView] = useState(initialView);

  // Sync URL whenever filters or view change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const search = filtersToSearchString(filters, currentView);
    const newUrl = window.location.pathname + search;
    window.history.replaceState(null, '', newUrl);
  }, [filters, currentView]);

  return { filters, setFilters, currentView, setCurrentView };
}
