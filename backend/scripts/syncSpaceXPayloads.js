import { initDatabase } from '../src/db/database.js';
import { fetchSpaceXLaunches, findMatchingSpaceXLaunch } from '../src/services/spacex.js';
import logger from '../src/utils/logger.js';

async function syncSpaceXPayloads() {
  logger.info('🚀 Starting SpaceX payload sync...');

  const db = initDatabase('./data/launches.db');

  try {
    // Fetch all SpaceX launches with payload data
    const spacexLaunches = await fetchSpaceXLaunches();

    if (spacexLaunches.length === 0) {
      logger.warn('⚠️  No SpaceX launches with payload data found');
      return;
    }

    // Get all SpaceX launches from our database (provider = SpaceX)
    const ourLaunches = db.query(`
      SELECT id, name, net, payload_total_mass_kg
      FROM launches
      WHERE provider_name LIKE '%SpaceX%'
      ORDER BY net DESC
    `).all();

    logger.info(`📊 Found ${ourLaunches.length} SpaceX launches in our database`);

    let matched = 0;
    let updated = 0;
    let alreadyHadData = 0;
    let noMatch = 0;

    for (const ourLaunch of ourLaunches) {
      // Try to find matching SpaceX launch
      const spacexLaunch = findMatchingSpaceXLaunch(spacexLaunches, ourLaunch);

      if (spacexLaunch) {
        matched++;

        // Check if we already have payload data
        if (ourLaunch.payload_total_mass_kg && ourLaunch.payload_total_mass_kg > 0) {
          // We have data - check if SpaceX data is different (actual vs capacity)
          const diff = Math.abs(ourLaunch.payload_total_mass_kg - spacexLaunch.totalMassKg);

          if (diff > 1) { // More than 1kg difference
            logger.info(`🔄 Updating ${ourLaunch.name}`);
            logger.info(`   Old: ${ourLaunch.payload_total_mass_kg} kg (capacity)`);
            logger.info(`   New: ${spacexLaunch.totalMassKg} kg (actual from SpaceX)`);

            db.query(`
              UPDATE launches
              SET payload_total_mass_kg = ?
              WHERE id = ?
            `).run(spacexLaunch.totalMassKg, ourLaunch.id);

            updated++;
          } else {
            alreadyHadData++;
          }
        } else {
          // No payload data yet - add it
          logger.info(`✅ Adding payload data for ${ourLaunch.name}: ${spacexLaunch.totalMassKg} kg`);

          db.query(`
            UPDATE launches
            SET payload_total_mass_kg = ?
            WHERE id = ?
          `).run(spacexLaunch.totalMassKg, ourLaunch.id);

          updated++;
        }
      } else {
        noMatch++;
        // logger.debug(`❌ No SpaceX match for: ${ourLaunch.name}`);
      }
    }

    logger.info('\n✅ SpaceX payload sync complete!');
    logger.info(`📊 Summary:`);
    logger.info(`   - Total SpaceX launches in DB: ${ourLaunches.length}`);
    logger.info(`   - Matched with SpaceX API: ${matched}`);
    logger.info(`   - Updated with new data: ${updated}`);
    logger.info(`   - Already had correct data: ${alreadyHadData}`);
    logger.info(`   - No match found: ${noMatch}`);

    // Show some examples of updated launches
    const examples = db.query(`
      SELECT name, payload_total_mass_kg
      FROM launches
      WHERE provider_name LIKE '%SpaceX%'
        AND payload_total_mass_kg IS NOT NULL
        AND payload_total_mass_kg > 0
      ORDER BY net DESC
      LIMIT 5
    `).all();

    logger.info('\n🎯 Recent SpaceX launches with payload data:');
    examples.forEach(l => {
      logger.info(`   - ${l.name}: ${l.payload_total_mass_kg} kg`);
    });

  } catch (error) {
    logger.error('❌ Error during SpaceX sync:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

syncSpaceXPayloads();
