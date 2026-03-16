/**
 * Logging utility
 *
 * FIX: `currentLogLevel` was hardcoded to INFO regardless of environment.
 * Every logger.info() call across 40+ files flooded the production console.
 * Now reads from the environment:
 *   - production → WARN (only warnings and errors)
 *   - development → DEBUG (everything)
 * Can still be overridden by setting VITE_LOG_LEVEL env var.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO:  1,
  WARN:  2,
  ERROR: 3,
};

const resolveLogLevel = () => {
  // Explicit override via env var (e.g. VITE_LOG_LEVEL=DEBUG)
  const override = import.meta.env?.VITE_LOG_LEVEL?.toUpperCase();
  if (override && LOG_LEVELS[override] !== undefined) return LOG_LEVELS[override];

  // FIX: default to WARN in production, DEBUG in development
  return import.meta.env?.MODE === 'production'
    ? LOG_LEVELS.WARN
    : LOG_LEVELS.DEBUG;
};

const currentLogLevel = resolveLogLevel();

export const createLogger = (moduleName) => ({
  debug: (message, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG)
      console.debug(`[${moduleName}]`, message, ...args);
  },
  info: (message, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.INFO)
      console.info(`[${moduleName}]`, message, ...args);
  },
  warn: (message, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.WARN)
      console.warn(`[${moduleName}]`, message, ...args);
  },
  error: (message, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR)
      console.error(`[${moduleName}]`, message, ...args);
  },
});