#!/usr/bin/env bun

/**
 * 📥 Initial Data Load Script
 * Fetches all historical and upcoming launches from Launch Library 2 API
 * ~7,000+ records with pagination and rate limiting
 */

import { initDatabase } from '../src/db/database.js';
import { upsertLaunch, createSyncLog, updateSyncLog } from '../src/db/database.js';
import { fetchLaunches, mapLaunchToDb, sleep } from '../src/services/launchLibrary.js';
import config from '../src/config.js';
import logger from '../src/utils/logger.js';

const BATCH_SIZE = 100; // API max per request
const DELAY_MS = config.syncDelayMs; // Delay between requests

async function initialLoad() {
  logger.rocket('Starting initial data load from Launch Library 2 API...\n');

  // Initialize database
  const db = initDatabase(config.dbPath);

  // Check for incomplete sync to resume
  const incompleteSyncStmt = db.prepare(`
    SELECT id, last_api_offset, records_fetched, records_added, api_calls_made
    FROM sync_log
    WHERE sync_type = 'full' AND status = 'running'
    ORDER BY started_at DESC
    LIMIT 1
  `);
  const incompleteSync = incompleteSyncStmt.get();

  let syncId;
  let offset = 0;
  let totalFetched = 0;
  let totalAdded = 0;
  let totalUpdated = 0;
  let apiCalls = 0;

  if (incompleteSync) {
    // Resume from incomplete sync
    syncId = incompleteSync.id;
    offset = (incompleteSync.last_api_offset || 0) + BATCH_SIZE; // Resume from next batch
    totalFetched = incompleteSync.records_fetched || 0;
    totalAdded = incompleteSync.records_added || 0;
    apiCalls = incompleteSync.api_calls_made || 0;

    logger.info(`📥 Resuming incomplete sync #${syncId} from offset ${offset}`);
    logger.info(`   Already processed: ${totalFetched} launches in ${apiCalls} API calls`);
  } else {
    // Create new sync log entry
    syncId = createSyncLog('full');
    logger.info(`Sync log ID: ${syncId}`);
  }

  let hasMore = true;
  const startTime = Date.now();

  try {
    while (hasMore) {
      logger.sync(`Fetching launches ${offset} to ${offset + BATCH_SIZE}...`);

      // Fetch batch from API with retry logic
      let response;
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          response = await fetchLaunches({
            limit: BATCH_SIZE,
            offset,
            ordering: 'net' // Sort by launch time
          });
          break; // Success, exit retry loop
        } catch (error) {
          // Check if it's a rate limit error
          if (error.message.includes('429') || error.message.includes('throttled')) {
            const waitTime = 300000; // 5 minutes default
            logger.warn(`⏳ Rate limit hit. Waiting ${waitTime / 1000} seconds before retry...`);
            await sleep(waitTime);
            retries++;

            if (retries > maxRetries) {
              throw new Error(`Rate limit exceeded after ${maxRetries} retries. Please try again later.`);
            }
          } else {
            // Non-rate-limit error, throw immediately
            throw error;
          }
        }
      }

      apiCalls++;

      if (!response.results || response.results.length === 0) {
        logger.info('No more launches to fetch');
        break;
      }

      // Process each launch in the batch
      for (const apiLaunch of response.results) {
        try {
          const launch = mapLaunchToDb(apiLaunch);
          const result = upsertLaunch(launch);

          totalFetched++;

          // Determine if it was an insert or update
          if (result.changes > 0) {
            totalAdded++;
          }

          // Log progress every 100 launches
          if (totalFetched % 100 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (totalFetched / elapsed).toFixed(1);
            logger.info(
              `Progress: ${totalFetched}/${response.count} launches ` +
              `(${rate}/s, ${elapsed}s elapsed)`
            );
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
        api_calls_made: apiCalls,
        last_api_offset: offset
      });

      // Check if there are more pages
      hasMore = response.next !== null;
      offset += BATCH_SIZE;

      // Rate limiting: delay before next request
      if (hasMore) {
        const delayMinutes = (DELAY_MS / 60000).toFixed(1);
        logger.info(`⏳ Waiting ${delayMinutes} minutes before next API call (rate limiting)...`);
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
      api_calls_made: apiCalls
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.success(`\n✅ Initial load complete!`);
    logger.info(`📊 Summary:`);
    logger.info(`   - Total launches fetched: ${totalFetched}`);
    logger.info(`   - New launches added: ${totalAdded}`);
    logger.info(`   - Launches updated: ${totalUpdated}`);
    logger.info(`   - API calls made: ${apiCalls}`);
    logger.info(`   - Time elapsed: ${elapsed}s`);
    logger.info(`   - Average rate: ${(totalFetched / elapsed).toFixed(1)} launches/s\n`);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Initial load failed:', error);

    // Mark sync as failed
    updateSyncLog(syncId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      records_fetched: totalFetched,
      records_added: totalAdded,
      api_calls_made: apiCalls
    });

    process.exit(1);
  }
}

// Run the initial load
initialLoad();
