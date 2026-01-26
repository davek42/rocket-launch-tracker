import { Database } from 'bun:sqlite';
import { fetchLaunches, mapLaunchToDb } from '../src/services/launchLibrary.js';
import { initDatabase, upsertLaunch } from '../src/db/database.js';
import logger from '../src/utils/logger.js';

const DELAY_MS = parseInt(process.env.SYNC_DELAY_MS || '300000');
const BATCH_SIZE = 100;

async function updateSpacecraftPayload() {
  logger.info('🔄 Updating spacecraft records with payload capacity...');
  logger.info(`⏱️  Using ${DELAY_MS / 1000}s delay between API calls`);

  const db = initDatabase('./data/launches.db');

  // Get count of spacecraft launches
  const count = db.query(
    'SELECT COUNT(*) as total FROM launches WHERE spacecraft_stage_id IS NOT NULL'
  ).get();

  logger.info(`📊 Found ${count.total} launches with spacecraft`);
  const totalBatches = Math.ceil(count.total / BATCH_SIZE);
  logger.info(`📦 Will process in ${totalBatches} batches of ${BATCH_SIZE}`);

  let updated = 0;
  let withPayload = 0;
  let apiCalls = 0;

  // Fetch launches in batches with spacecraft_stage filter
  for (let offset = 0; offset < count.total; offset += BATCH_SIZE) {
    const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
    logger.info(`\n🔄 Processing batch ${batchNum}/${totalBatches} (offset ${offset})...`);

    try {
      // Fetch launches with spacecraft_stage
      const response = await fetchLaunches({
        limit: BATCH_SIZE,
        offset: offset,
        rocket__spacecraft_stage__isnull: false, // Filter for launches with spacecraft
        ordering: 'id' // Consistent ordering
      });
      apiCalls++;

      if (response.results && response.results.length > 0) {
        logger.info(`  📥 Received ${response.results.length} launches`);

        for (const apiLaunch of response.results) {
          const mappedLaunch = mapLaunchToDb(apiLaunch);
          upsertLaunch(mappedLaunch);
          updated++;

          if (mappedLaunch.payload_total_mass_kg) {
            withPayload++;
            logger.info(`  ✅ ${mappedLaunch.name}: ${mappedLaunch.payload_total_mass_kg} kg`);
          }
        }
      }

      // Rate limiting delay (except for last batch)
      if (offset + BATCH_SIZE < count.total) {
        logger.info(`  ⏳ Waiting ${DELAY_MS / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }

    } catch (error) {
      logger.error(`  ❌ Failed to fetch batch at offset ${offset}:`, error.message);

      if (error.message.includes('429')) {
        logger.warn('  ⚠️  Rate limit hit. Waiting 5 minutes...');
        await new Promise(resolve => setTimeout(resolve, 300000));
      }
    }
  }

  logger.info('\n✅ Update complete!');
  logger.info(`📊 Summary:`);
  logger.info(`   - Launches processed: ${updated}`);
  logger.info(`   - With payload capacity: ${withPayload}`);
  logger.info(`   - API calls made: ${apiCalls}`);

  db.close();
}

updateSpacecraftPayload();
