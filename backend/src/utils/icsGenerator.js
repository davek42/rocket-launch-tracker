/**
 * 📅 ICS Calendar File Generator
 * Generates RFC 5545 compliant ICS files for calendar import
 */

import { createEvents } from 'ics';
import logger from './logger.js';

/**
 * 🚀 Generate ICS file for a single launch
 * @param {Object} launch - Launch database record
 * @returns {string} - ICS file content
 */
export function generateICS(launch) {
  const event = launchToICSEvent(launch);

  const { error, value } = createEvents([event]);

  if (error) {
    logger.error('ICS generation error:', error);
    throw new Error('Failed to generate ICS file');
  }

  return value;
}

/**
 * 📅 Generate ICS file for multiple launches
 * @param {Array} launches - Array of launch database records
 * @returns {string} - ICS file content
 */
export function generateBulkICS(launches) {
  const events = launches.map(launchToICSEvent);

  const { error, value } = createEvents(events);

  if (error) {
    logger.error('Bulk ICS generation error:', error);
    throw new Error('Failed to generate ICS file');
  }

  return value;
}

/**
 * 🗺️ Convert launch record to ICS event format
 * @param {Object} launch - Launch database record
 * @returns {Object} - ICS event object
 */
function launchToICSEvent(launch) {
  // Parse launch time (NET - No Earlier Than)
  const startTime = launch.net ? new Date(launch.net) : new Date();

  // Duration: 1 hour (approximate)
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  // Determine status (TENTATIVE for upcoming, CONFIRMED for past)
  const isPast = startTime < new Date();
  const status = isPast ? 'CONFIRMED' : 'TENTATIVE';

  // Build description
  const description = buildDescription(launch);

  // Build event object
  const event = {
    uid: `${launch.id}@rocketlaunch.finder`,
    start: dateToICSArray(startTime),
    end: dateToICSArray(endTime),
    title: launch.name || 'Rocket Launch',
    description,
    location: launch.location_name || launch.pad_name || 'Unknown Location',
    status,
    busyStatus: 'FREE',
    productId: '-//Rocket Launch Finder//EN',
    calName: 'Rocket Launches'
  };

  // Add geo coordinates if available
  if (launch.pad_latitude && launch.pad_longitude) {
    event.geo = {
      lat: launch.pad_latitude,
      lon: launch.pad_longitude
    };
  }

  // Add URL if available
  if (launch.slug_url) {
    event.url = launch.slug_url;
  }

  return event;
}

/**
 * 📝 Build event description from launch data
 * @param {Object} launch - Launch database record
 * @returns {string} - Formatted description
 */
function buildDescription(launch) {
  const parts = [];

  if (launch.provider_name) {
    parts.push(`Provider: ${launch.provider_name}`);
  }

  if (launch.rocket_name) {
    parts.push(`Rocket: ${launch.rocket_name}`);
  }

  if (launch.location_name) {
    parts.push(`Location: ${launch.location_name}`);
  }

  if (launch.pad_name) {
    parts.push(`Pad: ${launch.pad_name}`);
  }

  if (launch.mission_name) {
    parts.push(`\\nMission: ${launch.mission_name}`);
  }

  if (launch.mission_description) {
    // Clean and truncate description
    const cleanDesc = launch.mission_description
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const truncated = cleanDesc.length > 200
      ? cleanDesc.substring(0, 197) + '...'
      : cleanDesc;
    parts.push(`\\n${truncated}`);
  }

  if (launch.mission_orbit_abbrev) {
    parts.push(`\\nOrbit: ${launch.mission_orbit_abbrev}`);
  }

  if (launch.status_name) {
    parts.push(`\\nStatus: ${launch.status_name}`);
  }

  return parts.join('\\n');
}

/**
 * 📆 Convert JavaScript Date to ICS date array
 * @param {Date} date - JavaScript Date object
 * @returns {Array} - [year, month, day, hour, minute]
 */
function dateToICSArray(date) {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1, // Months are 0-indexed
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes()
  ];
}

export default {
  generateICS,
  generateBulkICS
};
