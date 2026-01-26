import logger from '../utils/logger.js';

const SPACEX_API_BASE = 'https://api.spacexdata.com';
const SPACEX_API_VERSION = 'v5';

/**
 * 🚀 Fetch all SpaceX launches with payload data
 * @returns {Promise<Array>} - Array of launches with payload details
 */
export async function fetchSpaceXLaunches() {
  try {
    logger.info('🚀 Fetching SpaceX launches...');

    // Fetch all launches
    const launchesUrl = `${SPACEX_API_BASE}/${SPACEX_API_VERSION}/launches`;
    const launchesResponse = await fetch(launchesUrl);

    if (!launchesResponse.ok) {
      throw new Error(`SpaceX API error: ${launchesResponse.status}`);
    }

    const launches = await launchesResponse.json();
    logger.info(`📥 Fetched ${launches.length} SpaceX launches`);

    // Fetch payload details for each launch
    const launchesWithPayloads = [];

    for (const launch of launches) {
      if (!launch.payloads || launch.payloads.length === 0) {
        continue;
      }

      // Fetch all payloads for this launch
      const payloadPromises = launch.payloads.map(async (payloadId) => {
        const payloadUrl = `${SPACEX_API_BASE}/v4/payloads/${payloadId}`;
        const response = await fetch(payloadUrl);
        if (response.ok) {
          return response.json();
        }
        return null;
      });

      const payloads = await Promise.all(payloadPromises);
      const validPayloads = payloads.filter(p => p !== null);

      // Calculate total payload mass for this launch
      const totalMassKg = validPayloads.reduce((sum, payload) => {
        return sum + (payload.mass_kg || 0);
      }, 0);

      if (totalMassKg > 0) {
        launchesWithPayloads.push({
          name: launch.name,
          date: launch.date_utc,
          payloads: validPayloads,
          totalMassKg: totalMassKg,
          totalMassLbs: validPayloads.reduce((sum, p) => sum + (p.mass_lbs || 0), 0)
        });
      }
    }

    logger.info(`✅ Found ${launchesWithPayloads.length} SpaceX launches with payload mass data`);
    return launchesWithPayloads;

  } catch (error) {
    logger.error('❌ SpaceX API error:', error.message);
    throw error;
  }
}

/**
 * 🔍 Match SpaceX launch name with Launch Library launch name
 * SpaceX uses different naming conventions, so we need fuzzy matching
 *
 * Examples:
 * - SpaceX: "CRS-10" -> LL2: "Falcon 9 v1.2 | SpX CRS-10"
 * - SpaceX: "Starlink 6-13" -> LL2: "Falcon 9 Block 5 | Starlink Group 6-13"
 *
 * @param {string} spacexName - SpaceX launch name
 * @param {string} ll2Name - Launch Library 2 launch name
 * @returns {boolean} - True if names match
 */
export function matchLaunchNames(spacexName, ll2Name) {
  if (!spacexName || !ll2Name) return false;

  // Normalize names (lowercase, remove special chars)
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedSpaceX = normalize(spacexName);
  const normalizedLL2 = normalize(ll2Name);

  // Check if SpaceX name is contained in LL2 name
  if (normalizedLL2.includes(normalizedSpaceX)) {
    return true;
  }

  // Handle common patterns
  // CRS-10 -> "crs10" should match "spxcrs10"
  const spacexPattern = normalizedSpaceX.replace(/^(crs|starlink|crew)/, 'spx$1');
  if (normalizedLL2.includes(spacexPattern)) {
    return true;
  }

  // Starlink Group 6-13 -> "starlink613" should match "starlinkgroup613"
  const starlinkMatch = spacexName.match(/starlink.*?(\d+-\d+)/i);
  if (starlinkMatch) {
    const starlinkNumber = normalize(starlinkMatch[1]);
    if (normalizedLL2.includes(starlinkNumber) && normalizedLL2.includes('starlink')) {
      return true;
    }
  }

  return false;
}

/**
 * 🔍 Find SpaceX launch by date and name matching
 * @param {Array} spacexLaunches - Array of SpaceX launches
 * @param {Object} ll2Launch - Launch Library launch object
 * @returns {Object|null} - Matching SpaceX launch or null
 */
export function findMatchingSpaceXLaunch(spacexLaunches, ll2Launch) {
  // First try exact date + name match
  const ll2Date = new Date(ll2Launch.net);
  const ll2DateStr = ll2Date.toISOString().split('T')[0]; // YYYY-MM-DD

  for (const spacexLaunch of spacexLaunches) {
    const spacexDate = new Date(spacexLaunch.date);
    const spacexDateStr = spacexDate.toISOString().split('T')[0];

    // Check if dates match (within same day)
    if (spacexDateStr === ll2DateStr) {
      // Check if names match
      if (matchLaunchNames(spacexLaunch.name, ll2Launch.name)) {
        return spacexLaunch;
      }
    }
  }

  // If no exact match, try name-only matching (for cases where dates might differ slightly)
  for (const spacexLaunch of spacexLaunches) {
    if (matchLaunchNames(spacexLaunch.name, ll2Launch.name)) {
      // Check if dates are within 7 days
      const spacexDate = new Date(spacexLaunch.date);
      const ll2Date = new Date(ll2Launch.net);
      const daysDiff = Math.abs((spacexDate - ll2Date) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 7) {
        return spacexLaunch;
      }
    }
  }

  return null;
}
