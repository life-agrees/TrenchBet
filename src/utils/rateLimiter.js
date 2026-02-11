/**
 * Simple rate limiting utility for API calls
 */

class RateLimiter {
  constructor(maxRequests = 3, windowMs = 120000) { // 2 minutes
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // Check if under the limit
    return this.requests.length < this.maxRequests;
  }

  recordRequest() {
    this.requests.push(Date.now());
  }

  getRemainingTime() {
    if (this.requests.length === 0) return 0;

    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    const timePassed = now - oldestRequest;

    return Math.max(0, this.windowMs - timePassed);
  }
}

// Export a singleton instance
export const rateLimiter = new RateLimiter();
