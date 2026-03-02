/**
 * 🌐 API Client
 * Handles communication with the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Fetch launches with filters
 */
export async function fetchLaunches(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const url = `${API_BASE_URL}/launches?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch launches');
  }

  return response.json();
}

/**
 * Fetch a single launch by ID
 */
export async function fetchLaunchById(id) {
  const response = await fetch(`${API_BASE_URL}/launches/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch launch');
  }

  return response.json();
}

/**
 * Fetch filter options
 */
export async function fetchFilters() {
  const response = await fetch(`${API_BASE_URL}/filters`);

  if (!response.ok) {
    throw new Error('Failed to fetch filters');
  }

  return response.json();
}

/**
 * Fetch stats
 */
export async function fetchStats() {
  const response = await fetch(`${API_BASE_URL}/launches/stats`);

  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }

  return response.json();
}

/**
 * Fetch chart data (aggregated launch counts)
 */
export async function fetchChartData(filters = {}, groupBy = 'year') {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  params.append('groupBy', groupBy);

  const url = `${API_BASE_URL}/launches/chart?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch chart data');
  }

  return response.json();
}

/**
 * Get ICS download URL for a launch
 */
export function getICSDownloadUrl(id) {
  return `${API_BASE_URL}/launches/${id}/ics`;
}

/**
 * Fetch agencies with filters
 */
export async function fetchAgencies(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const url = `${API_BASE_URL}/agencies?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch agencies');
  }

  return response.json();
}

/**
 * Fetch a single agency by slug
 */
export async function fetchAgencyBySlug(slug) {
  const response = await fetch(`${API_BASE_URL}/agencies/${slug}`);

  if (!response.ok) {
    throw new Error('Failed to fetch agency');
  }

  return response.json();
}

/**
 * Fetch agency filter options
 */
export async function fetchAgencyFilters() {
  const response = await fetch(`${API_BASE_URL}/agencies/filters`);

  if (!response.ok) {
    throw new Error('Failed to fetch agency filters');
  }

  return response.json();
}

/**
 * Get bulk ICS download URL with filters
 */
export function getBulkICSDownloadUrl(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  return `${API_BASE_URL}/launches/ics?${params.toString()}`;
}
