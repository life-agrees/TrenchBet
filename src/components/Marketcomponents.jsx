import React, { useMemo, useId } from 'react';

/**
 * MiniPriceChart
 *
 * FIX 1: Gradient ID collision — every chart was using `id="gradient-up"` or
 *         `id="gradient-down"` as global SVG IDs. SVG gradient IDs must be
 *         unique in the DOM. With 10+ market cards all rendered simultaneously,
 *         every chart shared the same 2 gradient definitions — cards stole
 *         each other's gradients and rendered the wrong colors.
 *         Fixed by using React's `useId()` to generate a unique ID per instance.
 *
 * FIX 2: End-circle `cy` was parsed from the SVG path string with
 *         `points.split(' ').pop().split(',')[1]` — would throw if `points`
 *         was an empty string. Now uses a stored `endY` value instead.
 */
export const MiniPriceChart = ({
  startPrice,
  currentPrice,
  isPositive = true,
  width      = 60,
  height     = 24,
}) => {
  // FIX 1: unique ID per chart instance
  const uid = useId().replace(/:/g, '');

  const { pathD, endY } = useMemo(() => {
    if (!startPrice || !currentPrice) return { pathD: '', endY: height / 2 };

    const x1 = 0;
    const y1 = height / 2;
    const x2 = width;

    const priceChange = ((currentPrice - startPrice) / startPrice) * 100;
    const maxMove     = height * 0.4;
    const yMove       = Math.min(Math.abs(priceChange) * 2, maxMove);
    const y2          = priceChange > 0 ? y1 - yMove : y1 + yMove;

    return {
      pathD: `M ${x1},${y1} L ${x2},${y2}`,
      endY:  y2, // FIX 2: stored directly, not re-parsed from string
    };
  }, [startPrice, currentPrice, width, height]);

  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const gradientId  = `gradient-${uid}-${isPositive ? 'up' : 'down'}`; // FIX 1

  if (!startPrice || !currentPrice) return null;

  return (
    <svg
      width={width}
      height={height}
      className="inline-block"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {/* FIX 1: unique gradient ID per instance */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0"   />
        </linearGradient>
      </defs>

      <path
        d={`${pathD} L ${width},${height} L 0,${height} Z`}
        fill={`url(#${gradientId})`} // FIX 1
      />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* FIX 2: use stored endY, not re-parsed from string */}
      <circle cx={width} cy={endY} r="2" fill={strokeColor} />
    </svg>
  );
};

/**
 * ActivityBadge — no changes needed, clean as-is.
 */
export const ActivityBadge = ({ totalBets, resolved = false }) => {
  if (resolved) {
    return (
      <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">
        RESOLVED
      </div>
    );
  }
  if (totalBets >= 50) return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">🔥 HOT</div>;
  if (totalBets >= 20) return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">⚡ ACTIVE</div>;
  if (totalBets >= 5)  return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">📊 POPULAR</div>;
  return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">🆕 NEW</div>;
};

/**
 * WinProbability — no changes needed, clean as-is.
 */
export const WinProbability = ({ market, choice = 'yes' }) => {
  const probability = useMemo(() => {
    if (!market) return 50;

    if (market.marketType === 0) {
      if (market.useFixedOdds) {
        const multiplier = choice === 'yes'
          ? (market.yesMultiplier || 200) / 100
          : (market.noMultiplier  || 200) / 100;
        return Math.round(100 / multiplier);
      } else {
        const yesPool = market.yesPool || 0;
        const noPool  = market.noPool  || 0;
        const total   = yesPool + noPool;
        if (total === 0) return 50;
        return choice === 'yes'
          ? Math.round((noPool  / total) * 100)
          : Math.round((yesPool / total) * 100);
      }
    }

    if (market.useFixedOdds && market.multipliers) {
      const idx        = typeof choice === 'number' ? choice : 0;
      const multiplier = (market.multipliers[idx] || 200) / 100;
      return Math.round(100 / multiplier);
    }

    return 50;
  }, [market, choice]);

  const getConfidence = (p) => {
    if (p >= 70) return { label: 'High',   color: 'text-green-400',  bars: 3 };
    if (p >= 50) return { label: 'Medium', color: 'text-yellow-400', bars: 2 };
    return              { label: 'Low',    color: 'text-orange-400', bars: 1 };
  };

  const confidence = getConfidence(probability);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
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
      <span className={`text-xs font-medium ${confidence.color}`}>{probability}%</span>
    </div>
  );
};

export default MiniPriceChart;