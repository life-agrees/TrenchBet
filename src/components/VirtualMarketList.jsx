import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import MarketCard from './MarketCard';
import { VIRTUAL_SCROLL } from '../utils/constants';

/**
 * VirtualMarketList
 *
 * FIX 1: layout="horizontal" removed — was rendering cards in a single
 *         left-to-right row instead of a scrollable vertical list.
 *
 * FIX 2: itemSize calculation corrected. Previously `itemHeight / columns`
 *         made each row only ~140px tall with 3 columns, severely clipping
 *         cards. itemSize is now the full row height (ITEM_HEIGHT + gap).
 *
 * FIX 3: isFavorite and onToggleFavorite now forwarded to MarketCard.
 *         Favorites were silently broken for all virtualized lists.
 *
 * FIX 4: Virtualization threshold now uses VIRTUAL_SCROLL.MIN_ITEMS_FOR_VIRTUALIZATION
 *         from constants (was hardcoded to 12, conflicting with the constant's 20).
 *
 * APPROACH: FixedSizeList renders ONE item per row. For a multi-column grid,
 * we group markets into rows of N columns, then each list item renders a
 * full row. This is the correct pattern for react-window grids.
 */
const VirtualMarketList = ({
  markets,
  currentPrices = {},
  onBetClick,
  usdcBalance,
  isLoading     = false,
  isPlacingBet  = false,
  isFavorite,          // FIX 3: accept and forward
  onToggleFavorite,    // FIX 3: accept and forward
  recentlyActiveMarketIds = new Set(),
}) => {
  const useVirtualization = markets.length >= VIRTUAL_SCROLL.MIN_ITEMS_FOR_VIRTUALIZATION; // FIX 4

  // Small lists — regular grid, no virtualization needed
  if (!useVirtualization) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        role="list"
        aria-label="Active markets"
      >
        {markets.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            currentPrice={currentPrices[market.asset]}
            onBetClick={onBetClick}
            usdcBalance={usdcBalance}
            isLoading={isLoading}
            isPlacingBet={isPlacingBet}
            isFavorite={isFavorite?.(market.id)}           // FIX 3
            onToggleFavorite={() => onToggleFavorite?.(market.id)} // FIX 3
            isRecentlyActive={recentlyActiveMarketIds.has(market.id)}
          />
        ))}
      </div>
    );
  }

  // Large lists — virtualized
  return (
    <div
      className="w-full"
      style={{ height: '80vh' }}
      role="list"
      aria-label="Active markets"
    >
      <AutoSizer>
        {({ height, width }) => {
          // Derive column count from container width
          let columns = 1;
          if (width >= 1024) columns = 3;
          else if (width >= 768) columns = 2;

          // FIX 2: itemSize = full card height + gap (NOT height / columns)
          const ITEM_HEIGHT  = VIRTUAL_SCROLL.ITEM_HEIGHT; // e.g. 400
          const GAP          = 24;                          // matches gap-6 (1.5rem)
          const COLUMN_WIDTH = (width - GAP * (columns - 1)) / columns;

          // Group markets into rows of `columns` items each
          // Each list row renders up to `columns` cards side by side
          const rows = [];
          for (let i = 0; i < markets.length; i += columns) {
            rows.push(markets.slice(i, i + columns));
          }

          const ROW_HEIGHT = ITEM_HEIGHT + GAP; // FIX 2: correct row height

          const RowRenderer = ({ index, style }) => {
            const row = rows[index];
            return (
              <div
                style={{
                  ...style,
                  display: 'flex',
                  gap: `${GAP}px`,
                  paddingBottom: `${GAP}px`,
                }}
              >
                {row.map((market) => (
                  <div
                    key={market.id}
                    style={{ width: COLUMN_WIDTH, flexShrink: 0 }}
                  >
                    <MarketCard
                      market={market}
                      currentPrice={currentPrices[market.asset]}
                      onBetClick={onBetClick}
                      usdcBalance={usdcBalance}
                      isLoading={isLoading}
                      isPlacingBet={isPlacingBet}
                      isFavorite={isFavorite?.(market.id)}              // FIX 3
                      onToggleFavorite={() => onToggleFavorite?.(market.id)} // FIX 3
                      isRecentlyActive={recentlyActiveMarketIds.has(market.id)}
                    />
                  </div>
                ))}
              </div>
            );
          };

          return (
            <List
              height={height}
              itemCount={rows.length}
              itemSize={ROW_HEIGHT}   // FIX 2: correct height per row
              width={width}
              // FIX 1: layout defaults to "vertical" — removed "horizontal"
              overscanCount={8}

            >
              {RowRenderer}
            </List>
          );
        }}
      </AutoSizer>
    </div>
  );
};

export { VirtualMarketList };
export default VirtualMarketList;