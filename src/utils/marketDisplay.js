/**
 * Generate human-readable title for market based on type and data
 */
export const generateMarketTitle = (market) => {
  const asset = market.asset || 'BTC';
  const type = market.marketType || 0;

  switch (type) {
    case 0: // Binary
      return `${asset} Price Movement`;
    
    case 1: // Multi-Choice
      return market.question || `${asset} Multi-Choice Prediction`;
    
    case 2: // Range
      return `${asset} Price Range Prediction`;
    
    case 3: // Time-Based
      return market.targetPrice 
        ? `Will ${asset} hit $${formatTargetPrice(market.targetPrice)}?`
        : `${asset} Time-Based Prediction`;
    
    default:
      return `${asset} Market`;
  }
};

/**
 * Generate descriptive subtitle for market
 */
export const generateMarketDescription = (market, currentPrice = null) => {
  const asset = market.asset || 'BTC';
  const type = market.marketType || 0;
  const start = market.startPrice ? formatPriceShort(market.startPrice) : '---';

  switch (type) {
    case 0: // Binary
      return currentPrice
        ? `Will ${asset} go UP or DOWN from $${formatPriceShort(currentPrice)}?`
        : `Started at $${start}. Predict price direction.`;
    
    case 1: // Multi-Choice
      return market.options && market.options.length > 0
        ? `Choose from ${market.options.length} options`
        : 'Select the most likely outcome';
    
    case 2: // Range
      if (market.ranges && market.ranges.length > 0 && currentPrice) {
        return `Current: $${formatPriceShort(currentPrice)}. Predict final range.`;
      }
      return market.ranges && market.ranges.length > 0
        ? `Predict which range ${asset} lands in`
        : `Select a price range`;
    
    case 3: // Time-Based
      if (market.targetPrice) {
        const target = formatPriceShort(market.targetPrice);
        return currentPrice
          ? `Current: $${formatPriceShort(currentPrice)} → Target: $${target}`
          : `Target: $${target}. Predict when it hits.`;
      }
      return market.timeframes && market.timeframes.length > 0
        ? `Predict when target is reached`
        : 'Time-based prediction market';
    
    default:
      return 'Prediction market';
  }
};

/**
 * Calculate total pool from yes/no pools
 */
export const calculateTotalPool = (market) => {
  if (market.totalPool !== undefined && market.totalPool !== null) {
    return market.totalPool;
  }
  
  const yesPool = market.yesPool || 0;
  const noPool = market.noPool || 0;
  return yesPool + noPool;
};

/**
 * Calculate volume - for now same as total pool
 * In future could track separate volume metric
 */
export const calculateVolume = (market) => {
  return calculateTotalPool(market);
};

/**
 * Format price for short display
 */
const formatPriceShort = (price) => {
  if (!price) return '0';
  
  if (price >= 100000) {
    return Math.round(price).toLocaleString();
  } else if (price >= 1000) {
    return Math.round(price).toLocaleString();
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
};

/**
 * Format target price for display
 */
const formatTargetPrice = (price) => {
  if (!price) return '0';
  if (price >= 1000) {
    return Math.round(price).toLocaleString();
  }
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

/**
 * Get status badge color based on time remaining
 */
export const getTimeBasedStatusColor = (endTime) => {
  const now = Date.now();
  const remaining = endTime - now;
  const hours = remaining / (1000 * 60 * 60);

  if (hours < 1) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (hours < 6) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (hours < 24) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-green-500/20 text-green-400 border-green-500/30';
};

/**
 * Format time remaining
 */
export const formatTimeRemaining = (endTime) => {
  const now = Date.now();
  const remaining = Math.max(0, endTime - now);
  
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Get market urgency label
 */
export const getMarketUrgency = (endTime) => {
  const now = Date.now();
  const remaining = endTime - now;
  const hours = remaining / (1000 * 60 * 60);

  if (hours < 1) return { text: 'Closing Soon!', color: 'text-red-400' };
  if (hours < 6) return { text: 'Last Hours', color: 'text-orange-400' };
  if (hours < 24) return { text: 'Ending Today', color: 'text-yellow-400' };
  return null; // No urgency label needed
};

/**
 * Calculate price change percentage
 */
export const calculatePriceChange = (currentPrice, startPrice) => {
  if (!currentPrice || !startPrice || startPrice === 0) return null;
  
  const change = ((currentPrice - startPrice) / startPrice) * 100;
  return {
    value: change,
    formatted: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
    isPositive: change >= 0,
    color: change >= 0 ? 'text-green-400' : 'text-red-400',
    icon: change >= 0 ? '↗' : '↘'
  };
};

/**
 * Get price trend indicator
 */
export const getPriceTrend = (changePercent) => {
  if (changePercent === null || changePercent === undefined) return null;
  
  const abs = Math.abs(changePercent);
  
  if (abs < 1) return { label: 'Stable', color: 'text-gray-400' };
  if (abs < 5) {
    return changePercent > 0 
      ? { label: 'Rising', color: 'text-green-400' }
      : { label: 'Falling', color: 'text-red-400' };
  }
  return changePercent > 0
    ? { label: 'Surging', color: 'text-green-500' }
    : { label: 'Dropping', color: 'text-red-500' };
};