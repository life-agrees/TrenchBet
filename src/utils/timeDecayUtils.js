/**
 * Time Decay Utilities
 * 
 * Client-side calculations that mirror the smart contract logic
 * for instant UI feedback while maintaining on-chain verification
 */

// Default configuration matching contract defaults
export const DEFAULT_DECAY_CONFIG = {
  enabled: true,
  decayStartPercent: 50,  // 50% of duration
  finalCutoffPercent: 5,  // Last 5% - betting cutoff
  minMultiplier: 120,     // 1.2x floor
};

/**
 * Calculate time-decayed multiplier
 * Mirrors _calculateDecayedMultiplier in PredictionMarket.sol
 * 
 * @param {number} baseMultiplier - Original multiplier (e.g., 200 for 2.0x)
 * @param {number} endTime - Market end timestamp (ms)
 * @param {number} startTime - Market start timestamp (ms)
 * @param {number} decayStartPercent - When decay starts (0-100)
 * @param {number} minMultiplier - Floor multiplier
 * @returns {number} Decayed multiplier
 */
export function calculateTimeDecay(
  baseMultiplier,
  endTime,
  startTime,
  decayStartPercent = DEFAULT_DECAY_CONFIG.decayStartPercent,
  minMultiplier = DEFAULT_DECAY_CONFIG.minMultiplier
) {
  const now = Date.now();
  
  // Calculate decay start time
  const duration = endTime - startTime;
  const decayStartTime = startTime + (duration * decayStartPercent / 100);
  
  // If decay hasn't started, return base multiplier
  if (now < decayStartTime) {
    return baseMultiplier;
  }
  
  // If past end time, return minimum
  if (now >= endTime) {
    return minMultiplier;
  }
  
  // Calculate decay progress (0 to 1)
  const decayDuration = endTime - decayStartTime;
  const timeElapsed = now - decayStartTime;
  const decayProgress = timeElapsed / decayDuration;
  
  // Linear decay
  const maxDecay = baseMultiplier - minMultiplier;
  const actualDecay = maxDecay * decayProgress;
  const decayedMultiplier = baseMultiplier - actualDecay;
  
  // Ensure we don't go below minimum
  return Math.max(decayedMultiplier, minMultiplier);
}

/**
 * Get decay status and phase information
 * 
 * @param {number} endTime - Market end timestamp (ms)
 * @param {number} startTime - Market start timestamp (ms)
 * @param {number} decayStartPercent - When decay starts
 * @returns {Object} Decay status information
 */
export function getDecayStatus(endTime, startTime, decayStartPercent = 50) {
  const now = Date.now();
  const duration = endTime - startTime;
  const decayStartTime = startTime + (duration * decayStartPercent / 100);
  
  // Calculate time remaining
  const totalRemaining = Math.max(0, endTime - now);
  const timeUntilDecay = Math.max(0, decayStartTime - now);
  
  // Determine phase
  let phase = 'early';
  if (now >= endTime) {
    phase = 'ended';
  } else if (now >= decayStartTime) {
    phase = 'decaying';
  }
  
  // Calculate progress percentage
  let progress = 0;
  if (now >= decayStartTime && now < endTime) {
    progress = ((now - decayStartTime) / (endTime - decayStartTime)) * 100;
  } else if (now >= endTime) {
    progress = 100;
  }
  
  return {
    phase,
    isDecaying: phase === 'decaying',
    isEnded: phase === 'ended',
    progress: Math.round(progress),
    totalRemaining,
    timeUntilDecay,
    decayStartTime,
  };
}

/**
 * Format multiplier for display
 * 
 * @param {number} multiplier - Multiplier in basis points (e.g., 200)
 * @returns {string} Formatted string (e.g., "2.0x")
 */
export function formatMultiplier(multiplier) {
  return `${(multiplier / 100).toFixed(1)}x`;
}

/**
 * Calculate potential payout with time decay
 * 
 * @param {number} amount - Bet amount
 * @param {number} baseMultiplier - Original multiplier
 * @param {number} endTime - Market end timestamp
 * @param {number} startTime - Market start timestamp
 * @returns {number} Potential payout
 */
export function calculateDecayedPayout(amount, baseMultiplier, endTime, startTime) {
  const effectiveMultiplier = calculateTimeDecay(baseMultiplier, endTime, startTime);
  return (amount * effectiveMultiplier) / 100;
}

/**
 * Get urgency color based on decay phase
 * 
 * @param {string} phase - Decay phase
 * @returns {string} Tailwind color class
 */
export function getDecayUrgencyColor(phase) {
  switch (phase) {
    case 'early':
      return 'text-green-400';
    case 'decaying':
      return 'text-yellow-400';
    case 'ended':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get decay badge text
 * 
 * @param {string} phase - Decay phase
 * @returns {string} Badge text
 */
export function getDecayBadgeText(phase) {
  switch (phase) {
    case 'early':
      return 'FULL ODDS';
    case 'decaying':
      return 'ODDS REDUCING';
    case 'ended':
      return 'BETTING CLOSED';
    default:
      return '';
  }
}

/**
 * Format time remaining for display
 * 
 * @param {number} milliseconds - Time in ms
 * @returns {string} Formatted time
 */
export function formatTimeRemaining(milliseconds) {
  if (milliseconds <= 0) return '0s';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
