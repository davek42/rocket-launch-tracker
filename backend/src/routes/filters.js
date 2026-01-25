/**
 * 🎛️ Filter Options API Routes
 */

import express from 'express';
import { getFilterOptions } from '../db/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/filters
 * Get available filter options for populating dropdowns
 */
router.get('/', (req, res) => {
  try {
    const filters = getFilterOptions();

    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    logger.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
