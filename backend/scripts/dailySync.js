#!/usr/bin/env bun

/**
 * 🔄 Daily Sync Script
 * Incremental update of launches modified in the last 48 hours
 * Designed to run via cron: 0 4 * * * (4 AM UTC daily)
 */

import { initDatabase } from '../src/db/database.js';
import { upsertLaunch, createSyncLog, updateSyncLog, getLaunchById } from '../src/db/database.js';
import { fetchLaunches, mapLaunchToDb, sleep } from '../src/services/launchLibrary.js';
import config from '../src/config.js';
import logger from '../src/utils/logger.js';

const BATCH_SIZE = 100;
const DELAY_MS = config.syncDelayMs;
const LOOKBACK_HOURS = config.syncLookbackHours;

async function dailySync() {
  logger.sync('Starting daily incremental sync...\n');

  // Initialize database
  initDatabase(config.dbPath);

  // Create sync log entry
  const syncId = createSyncLog('incremental');

  // Calculate lookback time
  const lookbackTime = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const lookbackISO = lookbackTime.toISOString();

  logger.info(`Looking for launches updated since: ${lookbackISO}`);
  logger.info(`Lookback period: ${LOOKBACK_HOURS} hours\n`);

  let offset = 0;
  let hasMore = true;
  let totalFetched = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;
  let apiCalls = 0;
  const startTime = Date.now();

  try {
    while (hasMore) {
      logger.sync(`Fetching batch ${offset / BATCH_SIZE + 1}...`);

      // Fetch launches updated since lookback time
      const response = await fetchLaunches({
        limit: BATCH_SIZE,
        offset,
        last_updated__gte: lookbackISO,
        ordering: '-last_updated' // Most recently updated first
      });

      apiCalls++;

      if (!response.results || response.results.length === 0) {
        logger.info('No more updated launches to fetch');
        break;
      }

      // Process each launch
      for (const apiLaunch of response.results) {
        try {
          const mapped = mapLaunchToDb(apiLaunch);
          const existing = getLaunchById(apiLaunch.id);

          totalFetched++;

          if (!existing) {
            // New launch
            upsertLaunch(mapped);
            totalAdded++;
            logger.rocket(`New: ${mapped.name}`);
          } else if (existing.last_updated !== mapped.last_updated) {
            // Updated launch
            upsertLaunch(mapped);
            totalUpdated++;
            logger.info(`Updated: ${mapped.name}`);
          } else {
            // Unchanged
            totalUnchanged++;
          }
        } catch (error) {
          logger.error(`Failed to process launch ${apiLaunch.id}:`, error.message);
        }
      }

      // Update sync log with progress
      updateSyncLog(syncId, {
        records_fetched: totalFetched,
        records_added: totalAdded,
        records_updated: totalUpdated,
        records_unchanged: totalUnchanged,
        api_calls_made: apiCalls,
        last_api_offset: offset
      });

      // Check if there are more pages
      hasMore = response.next !== null;
      offset += BATCH_SIZE;

      // Rate limiting
      if (hasMore) {
        logger.debug(`Waiting ${DELAY_MS}ms...`);
        await sleep(DELAY_MS);
      }
    }

    // Mark sync as successful
    updateSyncLog(syncId, {
      status: 'success',
      completed_at: new Date().toISOString(),
      records_fetched: totalFetched,
      records_added: totalAdded,
      records_updated: totalUpdated,
      records_unchanged: totalUnchanged,
      api_calls_made: apiCalls
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.success(`\n✅ Daily sync complete!`);
    logger.info(`📊 Summary:`);
    logger.info(`   - Launches checked: ${totalFetched}`);
    logger.info(`   - New launches: ${totalAdded}`);
    logger.info(`   - Updated launches: ${totalUpdated}`);
    logger.info(`   - Unchanged: ${totalUnchanged}`);
    logger.info(`   - API calls: ${apiCalls}`);
    logger.info(`   - Time elapsed: ${elapsed}s\n`);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Daily sync failed:', error);

    // Mark sync as failed
    updateSyncLog(syncId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      records_fetched: totalFetched,
      records_added: totalAdded,
      records_updated: totalUpdated,
      api_calls_made: apiCalls
    });

    process.exit(1);
  }
}

// Run the daily sync
dailySync();
