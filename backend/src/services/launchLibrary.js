/**
 * 🌐 Launch Library 2 API Client
 * Handles communication with TheSpaceDevs Launch Library 2 API
 */

import config from '../config.js';
import logger from '../utils/logger.js';

const BASE_URL = config.ll2ApiBaseUrl;
const API_KEY = config.ll2ApiKey;

/**
 * 🔄 Make a request to the Launch Library 2 API
 * @param {string} endpoint - API endpoint (e.g., '/launch/')
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - API response
 */
async function apiRequest(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);

  // Add API key if available
  if (API_KEY) {
    params.mode = 'detailed';
  }

  // Add query parameters
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  }

  logger.api(`GET ${url.pathname}${url.search}`);

  try {
    const headers = {};
    if (API_KEY) {
      headers['Authorization'] = `Token ${API_KEY}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('API request error:', error.message);
    throw error;
  }
}

/**
 * 🚀 Fetch launches from the API
 * @param {Object} options - Query options
 * @param {number} options.limit - Results per page (max 100)
 * @param {number} options.offset - Pagination offset
 * @param {string} options.ordering - Sort field (e.g., 'net', '-net')
 * @param {string} options.last_updated__gte - Filter by last updated date (ISO)
 * @param {string} options.net__gte - Filter by NET date greater than or equal
 * @param {string} options.net__lte - Filter by NET date less than or equal
 * @param {string} options.search - Full-text search
 * @returns {Promise<Object>} - { count, next, previous, results }
 */
export async function fetchLaunches(options = {}) {
  const params = {
    limit: Math.min(options.limit || 100, 100),
    offset: options.offset || 0,
    ...options
  };

  const data = await apiRequest('/launch/', params);

  logger.debug(`Fetched ${data.results?.length || 0} launches (total: ${data.count})`);

  return data;
}

/**
 * 🎯 Fetch a single launch by ID
 * @param {string} id - Launch UUID
 * @returns {Promise<Object>} - Launch object
 */
export async function fetchLaunchById(id) {
  const data = await apiRequest(`/launch/${id}/`);
  logger.debug(`Fetched launch: ${data.name}`);
  return data;
}

/**
 * 🗺️ Map API launch object to database schema
 * Transforms nested API response into flat database record
 * @param {Object} apiLaunch - Launch object from API
 * @returns {Object} - Flattened launch object for database
 */
export function mapLaunchToDb(apiLaunch) {
  return {
    id: apiLaunch.id,
    name: apiLaunch.name || null,
    slug: apiLaunch.slug || null,

    // Status
    status_id: apiLaunch.status?.id || null,
    status_name: apiLaunch.status?.name || null,
    status_abbrev: apiLaunch.status?.abbrev || null,
    status_description: apiLaunch.status?.description || null,

    // Timing
    net: apiLaunch.net || null,
    window_start: apiLaunch.window_start || null,
    window_end: apiLaunch.window_end || null,

    // Rocket
    rocket_id: apiLaunch.rocket?.configuration?.id || null,
    rocket_name: apiLaunch.rocket?.configuration?.name || null,
    rocket_family: apiLaunch.rocket?.configuration?.family || null,
    rocket_variant: apiLaunch.rocket?.configuration?.variant || null,
    rocket_full_name: apiLaunch.rocket?.configuration?.full_name || null,

    // Provider
    provider_id: apiLaunch.launch_service_provider?.id || null,
    provider_name: apiLaunch.launch_service_provider?.name || null,
    provider_abbrev: apiLaunch.launch_service_provider?.abbrev || null,
    provider_type: apiLaunch.launch_service_provider?.type || null,
    provider_country_code: apiLaunch.launch_service_provider?.country_code || null,

    // Pad
    pad_id: apiLaunch.pad?.id || null,
    pad_name: apiLaunch.pad?.name || null,
    pad_wiki_url: apiLaunch.pad?.wiki_url || null,
    pad_map_url: apiLaunch.pad?.map_url || null,
    pad_latitude: apiLaunch.pad?.latitude || null,
    pad_longitude: apiLaunch.pad?.longitude || null,

    // Location
    location_id: apiLaunch.pad?.location?.id || null,
    location_name: apiLaunch.pad?.location?.name || null,
    location_country_code: apiLaunch.pad?.location?.country_code || null,
    location_map_image: apiLaunch.pad?.location?.map_image || null,
    location_timezone: apiLaunch.pad?.location?.timezone_name || null,

    // Mission
    mission_id: apiLaunch.mission?.id || null,
    mission_name: apiLaunch.mission?.name || null,
    mission_description: apiLaunch.mission?.description || null,
    mission_type: apiLaunch.mission?.type || null,
    mission_orbit_id: apiLaunch.mission?.orbit?.id || null,
    mission_orbit_name: apiLaunch.mission?.orbit?.name || null,
    mission_orbit_abbrev: apiLaunch.mission?.orbit?.abbrev || null,

    // Spacecraft/Payload (from rocket.spacecraft_stage)
    spacecraft_stage_id: apiLaunch.rocket?.spacecraft_stage?.id || null,
    spacecraft_name: apiLaunch.rocket?.spacecraft_stage?.spacecraft?.name || null,
    spacecraft_serial_number: apiLaunch.rocket?.spacecraft_stage?.spacecraft?.serial_number || null,
    spacecraft_status: apiLaunch.rocket?.spacecraft_stage?.spacecraft?.status?.name || null,
    spacecraft_description: apiLaunch.rocket?.spacecraft_stage?.spacecraft?.description || null,
    spacecraft_destination: apiLaunch.rocket?.spacecraft_stage?.destination || null,
    payload_count: apiLaunch.rocket?.spacecraft_stage?.spacecraft_count || null,
    payload_total_mass_kg: apiLaunch.rocket?.spacecraft_stage?.spacecraft?.spacecraft_config?.payload_capacity || null,

    // Media
    image_url: apiLaunch.image || null,
    infographic_url: apiLaunch.infographic || null,
    webcast_live: apiLaunch.webcast_live ? 1 : 0,

    // URLs
    slug_url: apiLaunch.url || null,

    // Metadata
    last_updated: apiLaunch.last_updated || null
  };
}

/**
 * ⏱️ Sleep utility for rate limiting
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 📊 Get API rate limit status
 * @returns {Object} - Rate limit info
 */
export function getRateLimitInfo() {
  return {
    hasApiKey: !!API_KEY,
    limits: API_KEY
      ? { requests: 300, period: 'day' }
      : { requests: 15, period: 'hour' },
    recommendedDelay: config.syncDelayMs
  };
}

export default {
  fetchLaunches,
  fetchLaunchById,
  mapLaunchToDb,
  sleep,
  getRateLimitInfo
};
