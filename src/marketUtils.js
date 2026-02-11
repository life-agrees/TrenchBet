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
