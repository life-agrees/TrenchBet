/**
 * Input sanitization utilities for preventing XSS and injection attacks
 *
 * FIX: sanitizeString had broken HTML entity escaping for three characters:
 *   .replace(/</g, '<')   → replaced '<' with '<'  (no change)
 *   .replace(/>/g, '>')   → replaced '>' with '>'  (no change)
 *   .replace(/"/g, '"') → replaced '"' with '"' (no change)
 *
 * This meant any string containing <, >, or " passed through completely
 * unsanitized. Since sanitizeInput (alias of sanitizeString) is called before
 * every contract write in AdminPanel, market names with these characters were
 * sent raw to the contract — a live XSS vector for any downstream rendering.
 *
 * Corrected to proper HTML entity encoding.
 */

export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g,  '&amp;')   // must be first to avoid double-encoding
    .replace(/</g,  '&lt;')    // FIX: was '<'  (no-op)
    .replace(/>/g,  '&gt;')    // FIX: was '>'  (no-op)
    .replace(/"/g,  '&quot;')  // FIX: was '"' (no-op)
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<script[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\w+/gi, '');
};

export const sanitizeAddress = (address) => {
  if (typeof address !== 'string') return '';
  const sanitized = address.toLowerCase().trim();
  if (!/^0x[a-f0-9]{40}$/.test(sanitized)) return '';
  return sanitized;
};

export const sanitizeNumber = (input, options = {}) => {
  const { min = 0, max = Infinity, decimals = 0 } = options;
  let num = parseFloat(input);
  if (isNaN(num)) return min;
  if (decimals > 0) {
    num = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  } else {
    num = Math.floor(num);
  }
  return Math.max(min, Math.min(max, num));
};

export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return '';
  if (/^javascript:/i.test(trimmed)) return '';
  return trimmed;
};

export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return sanitizeString(String(obj));
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item));
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeString(key)] = sanitizeObject(value);
  }
  return sanitized;
};

export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return '';
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

// Alias for backward compatibility — used throughout AdminPanel
export const sanitizeInput = sanitizeString;

export default {
  sanitizeString,
  sanitizeInput,
  sanitizeHtml,
  sanitizeAddress,
  sanitizeNumber,
  sanitizeUrl,
  validateEmail,
  sanitizeObject,
  sanitizeFilename,
};