import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Sentry Error Tracking Configuration
 * Captures errors, performance metrics, and user context
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE || 'development';

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance monitoring
    integrations: [new BrowserTracing()],
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Error sampling
    sampleRate: 1.0,
    
    // Before sending, filter out sensitive data
    beforeSend(event) {
      // Remove user IP
      if (event.request) {
        delete event.request.headers?.['X-Forwarded-For'];
      }
      
      // Scrub wallet addresses from error messages
      if (event.exception?.values) {
        event.exception.values.forEach(value => {
          if (value.stacktrace?.frames) {
            value.stacktrace.frames.forEach(frame => {
              if (frame.vars) {
                Object.keys(frame.vars).forEach(key => {
                  // Scrub potential wallet addresses
                  if (typeof frame.vars[key] === 'string' && 
                      frame.vars[key].match(/^0x[a-fA-F0-9]{40}$/)) {
                    frame.vars[key] = '[WALLET_ADDRESS_REDACTED]';
                  }
                });
              }
            });
          }
        });
      }
      
      return event;
    },
    
    // Ignore common non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      'User rejected the request',
      'User denied transaction signature',
    ],
  });

  console.log('✅ Sentry initialized');
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (address) => {
  if (!SENTRY_DSN) return;
  
  // Create a simple hash of the address for privacy
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };
  
  Sentry.setUser({
    id: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'anonymous',
    wallet_hash: address ? simpleHash(address) : null,
  });
};


/**
 * Clear user context on disconnect
 */
export const clearSentryUser = () => {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
};

/**
 * Capture custom error with context
 */
export const captureError = (error, context = {}) => {
  if (!SENTRY_DSN) {
    console.error('Error (Sentry not configured):', error, context);
    return;
  }
  
  Sentry.captureException(error, {
    extra: context,
    tags: {
      component: context.component || 'unknown',
      action: context.action || 'unknown',
    },
  });
};

/**
 * Capture message for non-error events
 */
export const captureMessage = (message, level = 'info') => {
  if (!SENTRY_DSN) {
    console.log(`[${level}]`, message);
    return;
  }
  
  Sentry.captureMessage(message, level);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message, category = 'default', data = {}) => {
  if (!SENTRY_DSN) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

/**
 * Performance monitoring helper
 * Note: Uses Sentry.startSpan API (v8+) instead of deprecated startTransaction
 */
export const startSpan = (name, op = 'custom') => {
  if (!SENTRY_DSN) return null;
  
  // Sentry v8+ uses startSpan instead of startTransaction
  if (Sentry.startSpan) {
    return Sentry.startSpan({ name, op }, () => {});
  }
  
  // Fallback for older versions
  return null;
};


export default {
  initSentry,
  setSentryUser,
  clearSentryUser,
  captureError,
  captureMessage,
  addBreadcrumb,
  startSpan,
};
