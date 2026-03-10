import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import MarketCard from './MarketCard';

/**
 * Virtual/Regular Market List Component
 * Uses virtualization for better performance with long lists
 * Falls back to regular grid for small lists
 */
export const VirtualMarketList = ({ 
  markets, 
  currentPrices = {},
  onBetClick, 
  usdcBalance,
  isLoading = false,
  isPlacingBet = false
}) => {
  // Use virtualization for lists with more than 12 items
  const useVirtualization = markets.length > 12;

  // Render a single market card
  const renderMarketCard = ({ index, style }) => {
    const market = markets[index];
    return (
      <div style={{ ...style, paddingRight: '8px', paddingLeft: '8px' }}>
        <MarketCard
          market={market}
          currentPrice={currentPrices[market.asset]}
          onBetClick={onBetClick}
          usdcBalance={usdcBalance}
          isLoading={isLoading}
          isPlacingBet={isPlacingBet}
        />
      </div>
    );
  };

  // For small lists, use regular grid
  if (!useVirtualization) {
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
  }

  // For large lists, use virtualization
  return (
    <div className="h-full w-full" role="list" aria-label="Active markets">
      <AutoSizer>
        {({ height, width }) => {
          // Calculate number of columns based on available width
          let columns = 1;
          if (width >= 1024) columns = 3;
          else if (width >= 768) columns = 2;
          
          const itemHeight = 420; // Approximate height of MarketCard
          const listHeight = Math.min(height, markets.length * itemHeight / columns);
          
          return (
            <List
              height={listHeight}
              itemCount={markets.length}
              itemSize={itemHeight / columns + 16} // Account for gap
              width={width}
              layout="horizontal"
            >
              {renderMarketCard}
            </List>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default VirtualMarketList;
