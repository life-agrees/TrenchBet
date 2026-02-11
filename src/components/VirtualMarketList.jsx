import React from 'react';
import { MarketCard } from './MarketCard';

export const VirtualMarketList = ({ 
  markets, 
  onBetClick, 
  usdcBalance,
  isOwner,
  address,
  onResolve,
  onShare,
  onOpenAdmin,
  onMouseEnter,
  onMouseLeave
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((market, index) => (
        <MarketCard
          key={market.id}
          market={market}
          onClick={() => onShare && onShare(market)}
          onBetClick={onBetClick}
          usdcBalance={usdcBalance}
          isOwner={isOwner}
          address={address}
          onResolve={onResolve}
          onShare={onShare}
          onOpenAdmin={onOpenAdmin}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          index={index}
        />
      ))}
    </div>
  );
};


export default VirtualMarketList;
