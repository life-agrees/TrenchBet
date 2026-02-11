/**
 * Input sanitization utilities for preventing XSS and injection attacks
 */

// Sanitize string input to prevent XSS
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Sanitize HTML content (allows safe HTML tags)
export const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove script tags and event handlers
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<script[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\w+/gi, '');
};

// Validate and sanitize wallet address
export const sanitizeAddress = (address) => {
  if (typeof address !== 'string') return '';
  
  // Remove all non-hex characters except 0x prefix
  const sanitized = address.toLowerCase().trim();
  
  // Check if it's a valid Ethereum address format
  if (!/^0x[a-f0-9]{40}$/.test(sanitized)) {
    return '';
  }
  
  return sanitized;
};

// Sanitize number input
export const sanitizeNumber = (input, options = {}) => {
  const { min = 0, max = Infinity, decimals = 0 } = options;
  
  let num = parseFloat(input);
  
  if (isNaN(num)) return min;
  
  // Round to specified decimals
  if (decimals > 0) {
    num = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  } else {
    num = Math.floor(num);
  }
  
  // Clamp to range
  return Math.max(min, Math.min(max, num));
};

// Sanitize URL
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Only allow http/https URLs
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  
  // Remove potential javascript: protocol
  if (/^javascript:/i.test(trimmed)) {
    return '';
  }
  
  return trimmed;
};

// Validate email format
export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Sanitize object keys and values recursively
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(String(obj));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  
  return sanitized;
};

// Create a safe filename
export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return '';
  
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

// Alias for backward compatibility
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
  sanitizeFilename
};
