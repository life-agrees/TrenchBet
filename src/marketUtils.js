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
