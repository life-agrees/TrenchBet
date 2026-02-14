import React, { useMemo } from 'react';

/**
 * Mini sparkline chart component
 * Shows price trend over time
 */
export const MiniPriceChart = ({ 
  startPrice, 
  currentPrice, 
  isPositive = true,
  width = 60,
  height = 24
}) => {
  // Generate simple trend line from start to current
  const points = useMemo(() => {
    if (!startPrice || !currentPrice) return '';

    // Create a simple 2-point line for now
    // In production, you'd fetch historical data points
    const x1 = 0;
    const y1 = height / 2;
    const x2 = width;
    
    // Calculate y2 based on price change
    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;
    const maxMove = height * 0.4; // Max 40% of height
    const yMove = Math.min(Math.abs(priceChange) * 2, maxMove);
    const y2 = priceChange > 0 
      ? y1 - yMove  // Price up = line goes up
      : y1 + yMove; // Price down = line goes down

    return `M ${x1},${y1} L ${x2},${y2}`;
  }, [startPrice, currentPrice, width, height]);

  const strokeColor = isPositive ? '#10b981' : '#ef4444'; // green or red

  if (!startPrice || !currentPrice) {
    return null;
  }

  return (
    <svg 
      width={width} 
      height={height} 
      className="inline-block"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Gradient background */}
      <defs>
        <linearGradient id={`gradient-${isPositive ? 'up' : 'down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area under the line */}
      <path
        d={`${points} L ${width},${height} L 0,${height} Z`}
        fill={`url(#gradient-${isPositive ? 'up' : 'down'})`}
      />
      
      {/* Main trend line */}
      <path
        d={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* End point indicator */}
      <circle
        cx={width}
        cy={points.split(' ').pop().split(',')[1]}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
};

/**
 * Activity badge component
 * Shows market activity level
 */
export const ActivityBadge = ({ totalBets, resolved = false }) => {
  if (resolved) {
    return (
      <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
        RESOLVED
      </div>
    );
  }

  if (totalBets >= 50) {
    return (
      <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
        🔥 HOT
      </div>
    );
  }

  if (totalBets >= 20) {
    return (
      <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
        ⚡ ACTIVE
      </div>
    );
  }

  if (totalBets >= 5) {
    return (
      <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
        📊 POPULAR
      </div>
    );
  }

  // Check if market is new (created within last hour)
  // You'd need to pass createTime for this
  return (
    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
      🆕 NEW
    </div>
  );
};

/**
 * Win probability indicator
 * Shows pool distribution or fixed odds probability
 */
export const WinProbability = ({ market, choice = 'yes' }) => {
  const probability = useMemo(() => {
    if (!market) return 50;

    // For binary markets
    if (market.marketType === 0) {
      if (market.useFixedOdds) {
        // Calculate from fixed odds multiplier
        const multiplier = choice === 'yes' 
          ? (market.yesMultiplier || 200) / 100
          : (market.noMultiplier || 200) / 100;
        return Math.round((100 / multiplier));
      } else {
        // Use pool percentages
        const yesPool = market.yesPool || 0;
        const noPool = market.noPool || 0;
        const total = yesPool + noPool;
        
        if (total === 0) return 50;
        
        return choice === 'yes'
          ? Math.round((noPool / total) * 100) // Implied probability
          : Math.round((yesPool / total) * 100);
      }
    }

    // For other market types with multipliers
    if (market.useFixedOdds && market.multipliers) {
      const choiceIndex = typeof choice === 'number' ? choice : 0;
      const multiplier = (market.multipliers[choiceIndex] || 200) / 100;
      return Math.round(100 / multiplier);
    }

    return 50; // Default
  }, [market, choice]);

  const getConfidenceLevel = (prob) => {
    if (prob >= 70) return { label: 'High', color: 'text-green-400', bars: 3 };
    if (prob >= 50) return { label: 'Medium', color: 'text-yellow-400', bars: 2 };
    return { label: 'Low', color: 'text-orange-400', bars: 1 };
  };

  const confidence = getConfidenceLevel(probability);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`w-1 h-3 rounded-full transition-all ${
              i < confidence.bars
                ? confidence.color.replace('text-', 'bg-')
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${confidence.color}`}>
        {probability}%
      </span>
    </div>
  );
};

export default MiniPriceChart;