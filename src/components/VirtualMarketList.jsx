import React from 'react';
import MarketCard from './MarketCard';

/**
 * Virtual/Regular Market List Component
 * Simplified to work with Enhanced MarketCard
 */
export const VirtualMarketList = ({ 
  markets, 
  currentPrices = {},
  onBetClick, 
  usdcBalance,
  isLoading = false,
  isPlacingBet = false
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Active markets">
      {markets.map((market) => (
        <MarketCard
          key={market.id}
          market={market}
          currentPrice={currentPrices[market.asset]}
          onBetClick={onBetClick}
          usdcBalance={usdcBalance}
          isLoading={isLoading}
          isPlacingBet={isPlacingBet}
        />
      ))}
    </div>
  );
};

export default VirtualMarketList;