/**
 * 🏢 Agency API Routes
 */

import express from 'express';
import { getDatabase } from '../db/database.js';
import logger from '../utils/logger.js';
import config from '../config.js';

const router = express.Router();

/**
 * GET /api/agencies/filters
 * Get available filter options for agencies
 * NOTE: This route must be registered before /:slug
 */
router.get('/filters', (req, res) => {
  try {
    const db = getDatabase();

    const countries = db.prepare(`
      SELECT DISTINCT country FROM providers
      WHERE country IS NOT NULL AND slug IS NOT NULL
      ORDER BY country
    `).all().map(r => r.country);

    const statuses = db.prepare(`
      SELECT DISTINCT status FROM providers
      WHERE status IS NOT NULL AND slug IS NOT NULL
      ORDER BY status
    `).all().map(r => r.status);

    const locations = db.prepare(`
      SELECT DISTINCT l.location_name
      FROM launches l
      JOIN providers p ON l.provider_name = p.name
      WHERE p.slug IS NOT NULL AND l.location_name IS NOT NULL
      ORDER BY l.location_name
    `).all().map(r => r.location_name);

    const names = db.prepare(`
      SELECT name FROM providers
      WHERE slug IS NOT NULL
      ORDER BY name
    `).all().map(r => r.name);

    res.json({
      success: true,
      data: { countries, statuses, locations, names }
    });
  } catch (error) {
    logger.error('❌ Error fetching agency filters:', error);
    res.status(500).json({
      success: false,
      error: config.isDevelopment ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/agencies
 * List agencies with optional filtering and pagination
 * Query params: search, status, country, location, limit, offset
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { search, name, status, country, location, limit, offset } = req.query;

    const lim = Math.min(parseInt(limit) || 50, 100);
    const off = parseInt(offset) || 0;

    const conditions = ['p.slug IS NOT NULL'];
    const params = [];

    if (name) {
      conditions.push('p.name = ?');
      params.push(name);
    } else if (search) {
      conditions.push('p.name LIKE ?');
      params.push(`%${search}%`);
    }
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (country) {
      conditions.push('p.country = ?');
      params.push(country);
    }
    if (location) {
      conditions.push(`p.name IN (
        SELECT DISTINCT provider_name FROM launches WHERE location_name = ?
      )`);
      params.push(location);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const { total } = db.prepare(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM providers p
      ${whereClause}
    `).get(...params);

    const agencies = db.prepare(`
      SELECT p.*, COUNT(DISTINCT l.id) as launch_count
      FROM providers p
      LEFT JOIN launches l ON l.provider_name = p.name
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.name
      LIMIT ? OFFSET ?
    `).all(...params, lim, off);

    res.json({
      success: true,
      data: {
        agencies: agencies.map(a => formatAgencyForAPI(a)),
        pagination: {
          total,
          limit: lim,
          offset: off,
          hasMore: off + lim < total
        }
      }
    });
  } catch (error) {
    logger.error('❌ Error fetching agencies:', error);
    res.status(500).json({
      success: false,
      error: config.isDevelopment ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/agencies/:slug
 * Get a single agency by its slug
 */
router.get('/:slug', (req, res) => {
  try {
    const db = getDatabase();
    const { slug } = req.params;

    const agency = db.prepare(`
      SELECT p.*, COUNT(DISTINCT l.id) as launch_count
      FROM providers p
      LEFT JOIN launches l ON l.provider_name = p.name
      WHERE p.slug = ?
      GROUP BY p.id
    `).get(slug);

    if (!agency) {
      return res.status(404).json({ success: false, error: 'Agency not found' });
    }

    const locations = db.prepare(`
      SELECT DISTINCT location_name
      FROM launches
      WHERE provider_name = ? AND location_name IS NOT NULL
      ORDER BY location_name
    `).all(agency.name).map(r => r.location_name);

    res.json({
      success: true,
      data: formatAgencyForAPI(agency, locations)
    });
  } catch (error) {
    logger.error('❌ Error fetching agency:', error);
    res.status(500).json({
      success: false,
      error: config.isDevelopment ? error.message : 'Internal server error'
    });
  }
});

/**
 * Format an agency database row for API response
 */
function formatAgencyForAPI(agency, locations = []) {
  return {
    id: agency.id,
    name: agency.name,
    slug: agency.slug,
    abbrev: agency.abbrev || null,
    description: agency.description || null,
    status: agency.status || null,
    country: agency.country || null,
    websiteUrl: agency.website_url || null,
    launchCount: agency.launch_count || 0,
    socialLinks: {
      twitterX:  agency.twitter_x_url  || null,
      instagram: agency.instagram_url  || null,
      facebook:  agency.facebook_url   || null,
      bluesky:   agency.bluesky_url    || null,
      youtube:   agency.youtube_url    || null,
      linkedin:  agency.linkedin_url   || null,
      website:   agency.website_url    || null,
    },
    locations,
  };
}

export default router;
