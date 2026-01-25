/**
 * 📝 Simple logger utility with emojis for debugging
 */

import config from '../config.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

function timestamp() {
  return new Date().toISOString();
}

export const logger = {
  error: (...args) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(`[${timestamp()}] ❌`, ...args);
    }
  },

  warn: (...args) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(`[${timestamp()}] ⚠️ `, ...args);
    }
  },

  info: (...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(`[${timestamp()}] ℹ️ `, ...args);
    }
  },

  debug: (...args) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(`[${timestamp()}] 🔍`, ...args);
    }
  },

  // Special purpose loggers with emojis
  rocket: (...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(`[${timestamp()}] 🚀`, ...args);
    }
  },

  sync: (...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(`[${timestamp()}] 🔄`, ...args);
    }
  },

  success: (...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(`[${timestamp()}] ✅`, ...args);
    }
  },

  database: (...args) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(`[${timestamp()}] 🗄️ `, ...args);
    }
  },

  api: (...args) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(`[${timestamp()}] 🌐`, ...args);
    }
  }
};

export default logger;
