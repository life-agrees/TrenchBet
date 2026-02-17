/**
 * Calculate market probability percentages from pool sizes
 * Uses industry-standard implied probability calculation
 */
export const calculateMarketPercentages = (upPool, downPool) => {
  const totalPool = upPool + downPool;
  
  if (totalPool === 0) {
    return { upPercentage: 50, downPercentage: 50 };
  }
  
  // Calculate implied probability (what the market thinks will happen)
  // Higher pool = lower probability (because odds are worse)
  const upPercentage = Math.round((downPool / totalPool) * 100);
  const downPercentage = Math.round((upPool / totalPool) * 100);
  
  return { upPercentage, downPercentage };
};

/**
 * Calculate multiplier from pool sizes
 * Multiplier = (Total Pool / Your Pool Size)
 * Example: If 40% is in UP, multiplier for UP = 100 / 40 = 2.5x
 */
export const calculateMultiplier = (totalPool, choicePool) => {
  if (choicePool === 0) return 1.0;
  
  const multiplier = totalPool / choicePool;
  return Math.max(1.0, multiplier); // Always at least 1.0x
};

/**
 * Format percentage for display
 */
export const formatPercentage = (percentage) => {
  return `${percentage}%`;
};

/**
 * Format multiplier for display
 */
export const formatMultiplier = (multiplier) => {
  return `${multiplier.toFixed(2)}x`;
};

/**
 * Calculate potential payout
 */
export const calculatePayout = (betAmount, multiplier) => {
  return betAmount * multiplier;
};

/**
 * Get market sentiment based on percentage
 */
export const getMarketSentiment = (upPercentage) => {
  if (upPercentage >= 70) return { text: 'Strong Bullish', color: '#10b981' };
  if (upPercentage >= 55) return { text: 'Bullish', color: '#34d399' };
  if (upPercentage >= 45) return { text: 'Neutral', color: '#fbbf24' };
  if (upPercentage >= 30) return { text: 'Bearish', color: '#f87171' };
  return { text: 'Strong Bearish', color: '#ef4444' };
};

/**
 * Safely format a number to fixed decimal places without returning NaN
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number or '0.00' if invalid
 */
export const safeToFixed = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return '0.00';
  }
  return Number(value).toFixed(decimals);
};

/**
 * Calculate implied percentage from fixed odds multiplier
 * @param {number} multiplier - The odds multiplier (e.g., 2.0 for 2x)
 * @returns {number} Implied probability percentage (e.g., 50 for 2x odds)
 */
export const calculateFixedOddsPercentage = (multiplier) => {
  if (!multiplier || multiplier <= 0 || isNaN(multiplier)) {
    return 50; // Default to 50% if invalid
  }
  // Implied probability = 100 / multiplier
  // e.g., 2x odds = 50% probability, 3x odds = 33.33% probability
  return Math.min(100, Math.max(0, 100 / multiplier));
};

/**
 * Format odds for display - handles both fixed odds and pool-based odds
 * @param {Object} params - Parameters object
 * @param {boolean} params.useFixedOdds - Whether market uses fixed odds
 * @param {number} params.multiplier - Fixed odds multiplier (e.g., 200 for 2.0x)
 * @param {number} params.poolPercentage - Pool-based percentage (if not fixed odds)
 * @param {number} params.choice - Choice index (0 or 1 for binary)
 * @returns {Object} Display data { text: string, percentage: number, isFixed: boolean }
 */
export const formatOddsDisplay = ({ useFixedOdds, multiplier, poolPercentage, choice = 0 }) => {
  // Handle fixed odds markets
  if (useFixedOdds && multiplier > 0) {
    // Convert basis points to multiplier (e.g., 200 -> 2.0)
    const multiplierValue = multiplier / 100;
    const percentage = calculateFixedOddsPercentage(multiplierValue);
    
    return {
      text: `${safeToFixed(multiplierValue, 2)}x Odds`,
      percentage: Math.round(percentage),
      isFixed: true,
      multiplier: multiplierValue
    };
  }
  
  // Handle pool-based markets
  const safePercentage = (poolPercentage === undefined || poolPercentage === null || isNaN(poolPercentage)) 
    ? 50 
    : Math.min(100, Math.max(0, poolPercentage));
  
  return {
    text: `${Math.round(safePercentage)}%`,
    percentage: Math.round(safePercentage),
    isFixed: false,
    multiplier: safePercentage > 0 ? 100 / safePercentage : 2.0
  };
};

/**
 * Get display label for bet choice with odds
 * @param {Object} market - Market object
 * @param {number} choice - Choice index
 * @returns {string} Formatted label with odds
 */
export const getBetDisplayWithOdds = (market, choice) => {
  if (!market) return 'Unknown';
  
  const isBinary = market.marketType === 0 || market.marketType === undefined;
  const choiceLabel = isBinary 
    ? (choice === 1 ? 'UP' : 'DOWN')
    : `Choice ${choice + 1}`;
  
  // Check for fixed odds
  if (market.useFixedOdds) {
    const multiplier = choice === 1 
      ? (market.yesMultiplier || 200) 
      : (market.noMultiplier || 200);
    const multiplierValue = multiplier / 100;
    return `${choiceLabel} (${safeToFixed(multiplierValue, 2)}x)`;
  }
  
  // Pool-based percentage
  const { upPercentage, downPercentage } = calculateMarketPercentages(
    market.yesPool || 0, 
    market.noPool || 0
  );
  const percentage = choice === 1 ? upPercentage : downPercentage;
  return `${choiceLabel} (${percentage}%)`;
};

/**
 * Format seconds into human-readable duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2h 30m", "1d 6h")
 */
export const formatTimeDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 && parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ') || '0s';
};

/**
 * Calculate where current price sits relative to ranges
 * @param {number} currentPrice - Current market price
 * @param {Array} ranges - Array of range objects with min and max
 * @returns {Object} Position info { inRange: boolean, rangeIndex: number, percentThrough: number }
 */
export const calculateRangePosition = (currentPrice, ranges) => {
  if (!currentPrice || !ranges || ranges.length === 0) {
    return { inRange: false, rangeIndex: -1, percentThrough: 0 };
  }
  
  // Find which range contains the current price
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const min = parseFloat(range.min) || 0;
    const max = parseFloat(range.max) || 0;
    
    if (currentPrice >= min && currentPrice <= max) {
      // Calculate percentage through the range
      const rangeSize = max - min;
      const percentThrough = rangeSize > 0 
        ? ((currentPrice - min) / rangeSize) * 100 
        : 0;
      
      return { 
        inRange: true, 
        rangeIndex: i, 
        percentThrough: Math.min(100, Math.max(0, percentThrough))
      };
    }
  }
  
  // Price is outside all ranges - determine if above or below
  const firstRange = ranges[0];
  const lastRange = ranges[ranges.length - 1];
  
  if (currentPrice < (parseFloat(firstRange.min) || 0)) {
    return { inRange: false, rangeIndex: -1, percentThrough: 0, position: 'below' };
  }
  
  if (currentPrice > (parseFloat(lastRange.max) || 0)) {
    return { inRange: false, rangeIndex: -1, percentThrough: 100, position: 'above' };
  }
  
  return { inRange: false, rangeIndex: -1, percentThrough: 0 };
};

/**
 * Generate quick range presets around current price
 * @param {number} currentPrice - Current market price
 * @param {string} percent - Percentage deviation (5, 10, 20)
 * @param {number} numRanges - Number of ranges to generate (default 3)
 * @returns {Array} Array of range objects
 */
export const generateQuickRanges = (currentPrice, percent, numRanges = 3) => {
  if (!currentPrice || currentPrice <= 0) return [];
  
  const deviation = parseFloat(percent) / 100;
  const minPrice = currentPrice * (1 - deviation);
  const maxPrice = currentPrice * (1 + deviation);
  const rangeSize = (maxPrice - minPrice) / numRanges;
  
  const ranges = [];
  for (let i = 0; i < numRanges; i++) {
    const rangeMin = minPrice + (rangeSize * i);
    const rangeMax = rangeMin + rangeSize;
    
    // Format based on price magnitude
    const decimals = currentPrice > 1000 ? 0 : 2;
    
    ranges.push({
      min: parseFloat(rangeMin.toFixed(decimals)),
      max: parseFloat(rangeMax.toFixed(decimals))
    });
  }
  
  return ranges;
};

/**
 * Get preset timeframe options
 * @returns {Array} Array of timeframe presets with label and seconds
 */
export const getTimeframePresets = () => [
  { label: '1 Hour', seconds: 3600, description: 'Quick prediction' },
  { label: '6 Hours', seconds: 21600, description: 'Short term' },
  { label: '24 Hours', seconds: 86400, description: 'Daily prediction' },
  { label: '7 Days', seconds: 604800, description: 'Weekly outlook' },
  { label: '30 Days', seconds: 2592000, description: 'Monthly forecast' }
];

/**
 * Calculate countdown time remaining
 * @param {number} endTime - End timestamp in seconds
 * @returns {Object} Time remaining { days, hours, minutes, seconds, total, expired }
 */
export const calculateCountdown = (endTime) => {
  const now = Math.floor(Date.now() / 1000);
  const total = endTime - now;
  
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
  }
  
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  
  return { days, hours, minutes, seconds, total, expired: false };
};

/**
 * Format price with appropriate decimals based on magnitude
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
export const formatPriceDisplay = (price) => {
  if (!price || price === 0) return '---';
  
  if (price >= 100000) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } else if (price >= 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }
};

/**
 * Get range status label and color
 * @param {number} currentPrice - Current market price
 * @param {Object} range - Range object with min and max
 * @returns {Object} Status info { label, color, inRange }
 */
export const getRangeStatus = (currentPrice, range) => {
  if (!currentPrice || !range) {
    return { label: 'Unknown', color: 'gray', inRange: false };
  }
  
  const min = parseFloat(range.min) || 0;
  const max = parseFloat(range.max) || 0;
  
  if (currentPrice >= min && currentPrice <= max) {
    return { 
      label: 'Price in Range', 
      color: 'green', 
      inRange: true,
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      borderColor: 'border-green-500/30'
    };
  }
  
  if (currentPrice < min) {
    return { 
      label: 'Price Below', 
      color: 'blue', 
      inRange: false,
      position: 'below',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    };
  }
  
  return { 
    label: 'Price Above', 
    color: 'orange', 
    inRange: false,
    position: 'above',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30'
  };
};

// ==================== TIME DECAY UTILITIES ====================

/**
 * Calculate time-decayed multiplier based on current time
 * @param {Object} market - Market object with decay configuration
 * @param {number} baseMultiplier - Original multiplier before decay (in basis points, e.g., 200 = 2.0x)
 * @param {number} currentTime - Current timestamp in milliseconds (optional, defaults to now)
 * @returns {number} Decayed multiplier in basis points
 */
export const calculateTimeDecayedMultiplier = (market, baseMultiplier, currentTime = null) => {
  if (!market || !market.useTimeDecay || !baseMultiplier) {
    return baseMultiplier;
  }
  
  // Use milliseconds consistently (matching market.startTime, endTime, decayStartTime)
  const now = currentTime || Date.now();
  const endTime = market.endTime;
  const decayStartTime = market.decayStartTime;
  const minMultiplier = market.minMultiplier || 120; // Default 1.2x
  
  // If decay hasn't started yet, return base multiplier
  if (now < decayStartTime) {
    return baseMultiplier;
  }
  
  // If market has ended, return minimum multiplier
  if (now >= endTime) {
    return minMultiplier;
  }
  
  // Calculate decay progress (0 to 1)
  const decayDuration = endTime - decayStartTime;
  const timeElapsed = now - decayStartTime;
  const decayProgress = Math.min(1, Math.max(0, timeElapsed / decayDuration));
  
  // Linear decay calculation
  const maxDecay = baseMultiplier - minMultiplier;
  const actualDecay = Math.floor(maxDecay * decayProgress);
  const decayedMultiplier = baseMultiplier - actualDecay;
  
  // Ensure we don't go below minimum
  return Math.max(minMultiplier, decayedMultiplier);
};

/**
 * Get the current decay phase for a market
 * @param {Object} market - Market object with decay configuration
 * @param {number} currentTime - Current timestamp in milliseconds (optional)
 * @returns {Object} Decay phase info { phase, progress, isDecaying, timeUntilDecay }
 */
export const getDecayPhase = (market, currentTime = null) => {
  if (!market || !market.useTimeDecay) {
    return { 
      phase: 'no_decay', 
      progress: 0, 
      isDecaying: false, 
      timeUntilDecay: 0,
      timeUntilEnd: 0
    };
  }
  
  // Use milliseconds consistently
  const now = currentTime || Date.now();
  const endTime = market.endTime;
  const decayStartTime = market.decayStartTime;
  
  const timeUntilDecay = Math.max(0, decayStartTime - now);
  const timeUntilEnd = Math.max(0, endTime - now);
  
  // Phase 1: Before decay starts
  if (now < decayStartTime) {
    return {
      phase: 'pre_decay',
      progress: 0,
      isDecaying: false,
      timeUntilDecay,
      timeUntilEnd,
      decayStartTime
    };
  }
  
  // Phase 2: During decay
  if (now < endTime) {
    const decayDuration = endTime - decayStartTime;
    const timeElapsed = now - decayStartTime;
    const progress = Math.min(1, timeElapsed / decayDuration);
    
    return {
      phase: 'decaying',
      progress: Math.round(progress * 100), // 0-100%
      isDecaying: true,
      timeUntilDecay: 0,
      timeUntilEnd,
      decayStartTime
    };
  }
  
  // Phase 3: After market ends
  return {
    phase: 'ended',
    progress: 100,
    isDecaying: true,
    timeUntilDecay: 0,
    timeUntilEnd: 0,
    decayStartTime
  };
};

/**
 * Format decay information for display
 * @param {Object} decayPhase - Result from getDecayPhase()
 * @returns {Object} Display info { label, color, countdownText, warning }
 */
export const formatDecayDisplay = (decayPhase) => {
  if (!decayPhase || decayPhase.phase === 'no_decay') {
    return { 
      label: 'Fixed Odds', 
      color: 'gray',
      countdownText: '',
      warning: false,
      showBadge: false
    };
  }
  
  if (decayPhase.phase === 'pre_decay') {
    // Convert milliseconds to minutes for display
    const minutes = Math.ceil(decayPhase.timeUntilDecay / 60000);
    return {
      label: 'Full Odds',
      color: 'green',
      countdownText: minutes > 0 ? `Decays in ${minutes}m` : 'Decaying soon',
      warning: false,
      showBadge: true,
      badgeColor: 'bg-green-500/20 text-green-400'
    };
  }
  
  if (decayPhase.phase === 'decaying') {
    // Convert milliseconds to minutes for display
    const minutes = Math.ceil(decayPhase.timeUntilEnd / 60000);
    const progress = decayPhase.progress;
    
    // Color changes based on progress
    let color = 'yellow';
    let badgeColor = 'bg-yellow-500/20 text-yellow-400';
    if (progress > 75) {
      color = 'red';
      badgeColor = 'bg-red-500/20 text-red-400';
    } else if (progress > 50) {
      color = 'orange';
      badgeColor = 'bg-orange-500/20 text-orange-400';
    }
    
    return {
      label: 'Decaying',
      color,
      countdownText: minutes > 0 ? `${minutes}m left` : 'Ending soon',
      warning: progress > 75,
      showBadge: true,
      badgeColor,
      progress
    };
  }
  
  // Ended
  return {
    label: 'Ended',
    color: 'gray',
    countdownText: 'Market closed',
    warning: false,
    showBadge: true,
    badgeColor: 'bg-gray-500/20 text-gray-400'
  };
};

/**
 * Calculate time remaining until odds decay starts
 * @param {Object} market - Market object with decay configuration
 * @returns {number} Milliseconds until decay starts (0 if already started)
 */
export const getTimeUntilDecay = (market) => {
  if (!market || !market.useTimeDecay) {
    return 0;
  }
  
  const now = Date.now();
  return Math.max(0, market.decayStartTime - now);
};

/**
 * Calculate the effective multiplier at a specific time for display
 * @param {Object} market - Market object
 * @param {number} choice - Choice index
 * @param {number} currentTime - Current timestamp in milliseconds (optional)
 * @returns {number} Effective multiplier value (e.g., 2.0 for 2x)
 */
export const getEffectiveMultiplierDisplay = (market, choice, currentTime = null) => {
  if (!market) return 2.0;
  
  let baseMultiplier;
  
  // Get base multiplier based on market type and choice
  if (market.marketType === 0) { // Binary
    baseMultiplier = choice === 1 ? (market.yesMultiplier || 200) : (market.noMultiplier || 200);
  } else if (market.multipliers && market.multipliers[choice] !== undefined) {
    baseMultiplier = market.multipliers[choice];
  } else {
    baseMultiplier = 200; // Default 2.0x
  }
  
  // Apply time decay if enabled
  const decayedMultiplier = calculateTimeDecayedMultiplier(market, baseMultiplier, currentTime);
  
  // Convert from basis points to decimal
  return decayedMultiplier / 100;
};

/**
 * Default decay configuration options
 */
export const DECAY_CONFIG = {
  DEFAULT_START_PERCENT: 50, // 50% of duration
  DEFAULT_MIN_MULTIPLIER: 120, // 1.2x
  MIN_MULTIPLIER: 101, // 1.01x minimum
  MAX_MULTIPLIER: 1000, // 10x maximum
  START_PERCENT_OPTIONS: [50, 60, 70, 80],
  MIN_ODDS_OPTIONS: [
    { value: 110, label: '1.1x' },
    { value: 120, label: '1.2x' },
    { value: 130, label: '1.3x' },
    { value: 150, label: '1.5x' }
  ]
};
