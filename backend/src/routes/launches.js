/**
 * 🚀 Launch API Routes
 */

import express from 'express';
import {
  queryLaunches,
  getLaunchById,
  getStats
} from '../db/database.js';
import { generateICS, generateBulkICS } from '../utils/icsGenerator.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/launches
 * List launches with filtering, sorting, and pagination
 */
router.get('/', (req, res) => {
  try {
    const {
      upcoming,
      past,
      provider,
      country,
      location,
      rocket,
      status,
      from,
      to,
      search,
      limit,
      offset,
      sort,
      order
    } = req.query;

    const filters = {
      upcoming: upcoming === 'true',
      past: past === 'true',
      provider,
      country,
      location,
      rocket,
      status,
      from,
      to,
      search,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
      sort: sort || 'net',
      order: order || 'asc'
    };

    // Validate limit
    if (filters.limit > 100) {
      filters.limit = 100;
    }

    const { launches, total } = queryLaunches(filters);

    // Transform launches to API format
    const formattedLaunches = launches.map(formatLaunchForAPI);

    res.json({
      success: true,
      data: {
        launches: formattedLaunches,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < total
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching launches:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/launches/stats
 * Get summary statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/launches/ics
 * Download ICS file for multiple filtered launches
 */
router.get('/ics', (req, res) => {
  try {
    const {
      upcoming,
      past,
      provider,
      country,
      location,
      rocket,
      status,
      from,
      to,
      search,
      maxEvents
    } = req.query;

    const filters = {
      upcoming: upcoming === 'true',
      past: past === 'true',
      provider,
      country,
      location,
      rocket,
      status,
      from,
      to,
      search,
      limit: parseInt(maxEvents) || 50,
      offset: 0,
      sort: 'net',
      order: 'asc'
    };

    // Limit to 50 events max
    if (filters.limit > 50) {
      filters.limit = 50;
    }

    const { launches } = queryLaunches(filters);

    if (launches.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No launches found matching filters'
      });
    }

    const icsContent = generateBulkICS(launches);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rocket-launches.ics"');
    res.send(icsContent);
  } catch (error) {
    logger.error('Error generating bulk ICS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/launches/:id
 * Get detailed information for a single launch
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const launch = getLaunchById(id);

    if (!launch) {
      return res.status(404).json({
        success: false,
        error: 'Launch not found'
      });
    }

    res.json({
      success: true,
      data: formatLaunchForAPI(launch)
    });
  } catch (error) {
    logger.error('Error fetching launch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/launches/:id/ics
 * Download ICS calendar file for a single launch
 */
router.get('/:id/ics', (req, res) => {
  try {
    const { id } = req.params;
    const launch = getLaunchById(id);

    if (!launch) {
      return res.status(404).json({
        success: false,
        error: 'Launch not found'
      });
    }

    const icsContent = generateICS(launch);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="launch-${id}.ics"`);
    res.send(icsContent);
  } catch (error) {
    logger.error('Error generating ICS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Format launch data for API response
 * Transforms flat database record to nested JSON structure
 */
function formatLaunchForAPI(launch) {
  return {
    id: launch.id,
    name: launch.name,
    slug: launch.slug,
    status: {
      id: launch.status_id,
      name: launch.status_name,
      abbrev: launch.status_abbrev,
      description: launch.status_description
    },
    net: launch.net,
    windowStart: launch.window_start,
    windowEnd: launch.window_end,
    rocket: {
      id: launch.rocket_id,
      name: launch.rocket_name,
      family: launch.rocket_family,
      variant: launch.rocket_variant,
      fullName: launch.rocket_full_name
    },
    provider: {
      id: launch.provider_id,
      name: launch.provider_name,
      abbrev: launch.provider_abbrev,
      type: launch.provider_type,
      countryCode: launch.provider_country_code
    },
    pad: {
      id: launch.pad_id,
      name: launch.pad_name,
      wikiUrl: launch.pad_wiki_url,
      mapUrl: launch.pad_map_url,
      latitude: launch.pad_latitude,
      longitude: launch.pad_longitude
    },
    location: {
      id: launch.location_id,
      name: launch.location_name,
      countryCode: launch.location_country_code,
      mapImage: launch.location_map_image,
      timezone: launch.location_timezone
    },
    mission: {
      id: launch.mission_id,
      name: launch.mission_name,
      description: launch.mission_description,
      type: launch.mission_type,
      orbit: {
        id: launch.mission_orbit_id,
        name: launch.mission_orbit_name,
        abbrev: launch.mission_orbit_abbrev
      }
    },
    imageUrl: launch.image_url,
    infographicUrl: launch.infographic_url,
    webcastLive: launch.webcast_live === 1,
    slugUrl: launch.slug_url,
    lastUpdated: launch.last_updated,
    importedAt: launch.imported_at,
    updatedAt: launch.updated_at
  };
}

export default router;
