/**
 * Analytics Service for TrenchyBet
 * Tracks user actions, errors, and performance metrics
 * Can be integrated with Google Analytics, Mixpanel, or custom analytics
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('Analytics');

// Analytics configuration
const ANALYTICS_CONFIG = {
  enabled: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  debug: import.meta.env.DEV,
  endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT,
};

// In-memory queue for batching events
let eventQueue = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 5000; // 5 seconds

/**
 * Initialize analytics
 */
export const initAnalytics = () => {
  if (!ANALYTICS_CONFIG.enabled) {
    logger.info('Analytics disabled');
    return;
  }

  // Start batch processing
  setInterval(flushEvents, BATCH_INTERVAL);
  
  // Track page views
  trackPageView(window.location.pathname);
  
  logger.info('Analytics initialized');
};

/**
 * Track a page view
 */
export const trackPageView = (path, metadata = {}) => {
  trackEvent('page_view', {
    path,
    title: document.title,
    referrer: document.referrer,
    ...metadata,
  });
};

/**
 * Track a custom event
 */
export const trackEvent = (eventName, properties = {}) => {
  const event = {
    event: eventName,
    properties: {
      ...properties,
      timestamp: Date.now(),
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
    },
  };

  if (ANALYTICS_CONFIG.debug) {
    logger.info('Analytics event:', event);
  }

  eventQueue.push(event);

  // Flush immediately if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  }
};

/**
 * Track bet placement
 */
export const trackBetPlaced = (marketId, amount, choice, odds) => {
  trackEvent('bet_placed', {
    market_id: marketId,
    amount: amount,
    choice: choice,
    odds: odds,
    category: 'betting',
  });
};

/**
 * Track market creation (admin)
 */
export const trackMarketCreated = (marketId, marketType, asset) => {
  trackEvent('market_created', {
    market_id: marketId,
    market_type: marketType,
    asset: asset,
    category: 'admin',
  });
};

/**
 * Track wallet connection
 */
export const trackWalletConnected = (walletAddress, connector) => {
  trackEvent('wallet_connected', {
    connector: connector,
    wallet_address_hash: hashAddress(walletAddress), // Hash for privacy
    category: 'wallet',
  });
};

/**
 * Track errors
 */
export const trackError = (error, context = {}) => {
  trackEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    error_name: error.name,
    context: JSON.stringify(context),
    category: 'error',
  });
};

/**
 * Track performance metrics
 */
export const trackPerformance = (metricName, value, metadata = {}) => {
  trackEvent('performance', {
    metric_name: metricName,
    value: value,
    ...metadata,
    category: 'performance',
  });
};

/**
 * Flush events to analytics endpoint
 */
const flushEvents = async () => {
  if (eventQueue.length === 0) return;
  if (!ANALYTICS_CONFIG.enabled) {
    eventQueue = [];
    return;
  }

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    if (ANALYTICS_CONFIG.endpoint) {
      await fetch(ANALYTICS_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      });
    } else {
      // Log to console if no endpoint configured
      logger.info('Analytics batch:', eventsToSend);
    }
  } catch (error) {
    logger.error('Failed to send analytics:', error);
    // Re-queue events for retry
    eventQueue = [...eventsToSend, ...eventQueue];
  }
};

/**
 * Get or create session ID
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

/**
 * Hash wallet address for privacy
 */
const hashAddress = (address) => {
  if (!address) return null;
  // Simple hash - in production use proper hashing
  return address.slice(0, 6) + '...' + address.slice(-4);
};

/**
 * Track user engagement time
 */
export const trackEngagement = () => {
  let startTime = Date.now();
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      const duration = Date.now() - startTime;
      trackEvent('engagement', {
        duration_ms: duration,
        category: 'engagement',
      });
    } else {
      startTime = Date.now();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};

// Auto-initialize if enabled
if (ANALYTICS_CONFIG.enabled) {
  initAnalytics();
}

export default {
  trackEvent,
  trackPageView,
  trackBetPlaced,
  trackMarketCreated,
  trackWalletConnected,
  trackError,
  trackPerformance,
  trackEngagement,
  flushEvents,
};
