/**
 * Simple logging utility for the application
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = LOG_LEVELS.INFO; // Change this to control log verbosity

export const createLogger = (moduleName) => {
  return {
    debug: (message, ...args) => {
      if (currentLogLevel <= LOG_LEVELS.DEBUG) {
        console.debug(`[${moduleName}]`, message, ...args);
      }
    },
    info: (message, ...args) => {
      if (currentLogLevel <= LOG_LEVELS.INFO) {
        console.info(`[${moduleName}]`, message, ...args);
      }
    },
    warn: (message, ...args) => {
      if (currentLogLevel <= LOG_LEVELS.WARN) {
        console.warn(`[${moduleName}]`, message, ...args);
      }
    },
    error: (message, ...args) => {
      if (currentLogLevel <= LOG_LEVELS.ERROR) {
        console.error(`[${moduleName}]`, message, ...args);
      }
    },
  };
};
