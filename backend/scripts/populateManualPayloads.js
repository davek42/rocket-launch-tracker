import { Database } from 'bun:sqlite';
import logger from '../src/utils/logger.js';

/**
 * 📝 Manually curated payload data for common satellite types
 * Sources: Wikipedia, manufacturer specs, launch provider press releases
 */
const MANUAL_PAYLOADS = [
  // GPS Satellites
  {
    mission_pattern: 'GPS III%',
    payload_mass_kg: 4400,
    source: 'https://en.wikipedia.org/wiki/GPS_Block_III',
    notes: 'GPS III satellite series (SV01-SV10). Lockheed Martin built.'
  },
  {
    mission_pattern: 'GPS IIF%',
    payload_mass_kg: 1630,
    source: 'https://en.wikipedia.org/wiki/GPS_Block_IIF',
    notes: 'GPS IIF satellite series. Boeing built.'
  },
  {
    mission_pattern: 'GPS IIR%',
    payload_mass_kg: 1080,
    source: 'https://en.wikipedia.org/wiki/GPS_Block_IIR',
    notes: 'GPS IIR satellite series. Lockheed Martin built.'
  },

  // Starlink (typical v1.0 and v2.0)
  {
    mission_pattern: 'Starlink%v1.0',
    payload_mass_kg: 260,
    source: 'https://en.wikipedia.org/wiki/Starlink',
    notes: 'Starlink v1.0 satellite (per satellite). Typical batch: ~15,600 kg (60 sats)'
  },
  {
    mission_pattern: 'Starlink%v2.0',
    payload_mass_kg: 800,
    source: 'https://en.wikipedia.org/wiki/Starlink',
    notes: 'Starlink v2.0 satellite (per satellite, heavier than v1.0)'
  },

  // OneWeb
  {
    mission_pattern: 'OneWeb%',
    payload_mass_kg: 148,
    source: 'https://en.wikipedia.org/wiki/OneWeb_satellite_constellation',
    notes: 'OneWeb satellite (per satellite). Typical batch: ~5,000 kg (34 sats)'
  },

  // Iridium NEXT
  {
    mission_pattern: 'Iridium NEXT%',
    payload_mass_kg: 860,
    source: 'https://en.wikipedia.org/wiki/Iridium_NEXT',
    notes: 'Iridium NEXT satellite (per satellite). Typical batch: ~9,600 kg (10 sats)'
  },

  // Commercial GEO Communications Satellites (typical ranges)
  {
    mission_pattern: 'Intelsat%',
    payload_mass_kg: 6500,
    source: 'https://en.wikipedia.org/wiki/Intelsat',
    notes: 'Typical Intelsat GEO communications satellite (varies 5,000-7,000 kg)'
  },
  {
    mission_pattern: 'SES-%',
    payload_mass_kg: 5500,
    source: 'https://en.wikipedia.org/wiki/SES_S.A.',
    notes: 'Typical SES GEO communications satellite (varies 4,000-6,500 kg)'
  },
  {
    mission_pattern: 'Eutelsat%',
    payload_mass_kg: 5000,
    source: 'https://en.wikipedia.org/wiki/Eutelsat',
    notes: 'Typical Eutelsat GEO communications satellite'
  },

  // Military/Intelligence
  {
    mission_pattern: 'NROL-%',
    payload_mass_kg: 5000,
    source: 'Estimated based on launch vehicle capacity',
    notes: 'NRO reconnaissance satellite (mass classified, estimated)'
  },
  {
    mission_pattern: 'SBIRS%',
    payload_mass_kg: 4500,
    source: 'https://en.wikipedia.org/wiki/Space-Based_Infrared_System',
    notes: 'SBIRS GEO satellite for missile warning'
  },

  // Weather Satellites
  {
    mission_pattern: 'GOES-%',
    payload_mass_kg: 5200,
    source: 'https://en.wikipedia.org/wiki/Geostationary_Operational_Environmental_Satellite',
    notes: 'GOES-R series weather satellite'
  },

  // Science Missions (examples)
  {
    mission_pattern: 'JWST%',
    payload_mass_kg: 6500,
    source: 'https://en.wikipedia.org/wiki/James_Webb_Space_Telescope',
    notes: 'James Webb Space Telescope'
  },
  {
    mission_pattern: 'Hubble%',
    payload_mass_kg: 11110,
    source: 'https://en.wikipedia.org/wiki/Hubble_Space_Telescope',
    notes: 'Hubble Space Telescope'
  },
];

async function populateManualPayloads() {
  logger.info('📝 Populating manual payload data...');

  const db = new Database('./data/launches.db');

  try {
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO manual_payloads
      (mission_pattern, payload_mass_kg, source, notes, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    let added = 0;

    for (const payload of MANUAL_PAYLOADS) {
      insertStmt.run(
        payload.mission_pattern,
        payload.payload_mass_kg,
        payload.source,
        payload.notes
      );
      added++;
      logger.info(`✅ ${payload.mission_pattern}: ${payload.payload_mass_kg} kg`);
    }

    logger.info(`\n✅ Added ${added} manual payload entries`);

    // Show how many launches can now use this data
    const counts = [];
    for (const payload of MANUAL_PAYLOADS) {
      const pattern = payload.mission_pattern;
      const count = db.query(`
        SELECT COUNT(*) as count
        FROM launches
        WHERE name LIKE ?
      `).get(pattern);

      if (count.count > 0) {
        counts.push({ pattern, count: count.count, mass: payload.payload_mass_kg });
      }
    }

    logger.info('\n📊 Launch coverage:');
    counts.forEach(c => {
      logger.info(`   ${c.pattern}: ${c.count} launches × ${c.mass} kg`);
    });

  } catch (error) {
    logger.error('❌ Error populating manual payloads:', error.message);
    throw error;
  } finally {
    db.close();
  }
}

populateManualPayloads();
