import React from 'react';
import { formatUnits } from 'viem';
import { Trophy, CheckCircle, XCircle } from 'lucide-react';
import { formatOddsDisplay, calculateMarketPercentages } from '../../marketUtils';

// Helper to get time remaining formatting
const getMarketTimeRemaining = (market) => {
  if (market.marketType === 3) return market.resolved ? 'Ended' : 'Active Target';
  if (market.resolved) return 'Market Ended';

  const now = Date.now();
  const endTimeMs = Number(market.endTime); // already in ms from useMarkets
  const remaining = Math.max(0, endTimeMs - now);

  if (remaining <= 0) return 'Market Ended';

  const seconds = Math.floor((remaining / 1000) % 60);
  const minutes = Math.floor((remaining / 1000 / 60) % 60);
  const hours   = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const days    = Math.floor(remaining / (1000 * 60 * 60 * 24));

  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
};

const PortfolioBetCard = ({ bet, handleClaim, handleClaimAdvanced }) => {
  const market = bet.market;
  const claimed = bet.claimed;
  const canClaim = bet.isClaimableConfirmed && !bet.claimed;

  let isWin = false;
  let isLoss = false;
  
  if (market?.resolved) {
    if (market.marketType === 0) {
      const predictedUp = bet.choice === 1;
      isWin = predictedUp === market.priceWentUp;
      isLoss = !isWin;
    } else if (market.marketType === 1 || market.marketType === 2 || market.marketType === 3) {
      if (market.winningChoice !== null && market.winningChoice !== undefined) {
        isWin = Number(bet.choice) === Number(market.winningChoice);
        isLoss = !isWin;
      }
    }
  }

  let oddsDisplay = '';
  if (market && !market.resolved) {
    const isUp = bet.choice === 1;
    const oddsData = formatOddsDisplay({
      useFixedOdds: market.useFixedOdds,
      multiplier: isUp ? market.yesMultiplier : market.noMultiplier,
      poolPercentage: isUp
        ? calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).upPercentage
        : calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).downPercentage,
      choice: bet.choice,
    });
    oddsDisplay = oddsData.text;
  }

  // Calculate potential/actual payout
  const amountWagered = Number(formatUnits(bet.amount, 6));
  const multiplier = Number(bet.multiplier) || 1.5;
  const payoutAmount = (amountWagered * multiplier).toFixed(2);

  return (
    <div className={`bg-white dark:bg-dark-800 p-5 rounded-2xl border border-neutral-200 dark:border-dark-700 hover:border-primary/50 transition-all duration-300 ${claimed && isWin ? 'opacity-70' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        
        <div className="flex flex-col">
          <span className="text-lg font-bold text-neutral-900 dark:text-white mb-1">{bet.marketLabel}</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              Position: <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{bet.choiceLabel}</span>
            </span>
            <span className="flex items-center gap-1">
              Wagered: <span className="font-bold text-neutral-900 dark:text-white">${amountWagered.toFixed(2)}</span>
            </span>
            {!market.resolved && oddsDisplay && (
              <span className="flex items-center gap-1">
                Odds: <span className="font-bold text-secondary">{oddsDisplay}</span>
              </span>
            )}
            {isWin && (
              <span className="flex items-center gap-1">
                Payout: <span className="font-bold text-success">${payoutAmount}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center md:flex-col md:items-end gap-3 self-start md:self-auto w-full md:w-auto pt-4 md:pt-0 border-t border-neutral-100 dark:border-dark-700 md:border-t-0 mt-2 md:mt-0">
          {!market.resolved ? (
            <div className="flex flex-col items-end w-full md:w-auto">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Time Remaining</span>
              <span className="px-3 py-1.5 text-sm font-bold rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                {getMarketTimeRemaining(market)}
              </span>
            </div>
          ) : isWin && canClaim ? (
            <button 
              onClick={() => {
                if (market.marketType === 0) handleClaim(market.id);
                else handleClaimAdvanced(market.id);
              }} 
              className="w-full md:w-auto bg-secondary hover:bg-secondary-500 text-neutral-900 font-black py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(205,255,0,0.3)] hover:shadow-[0_0_25px_rgba(205,255,0,0.5)] hover:-translate-y-0.5"
            >
              <Trophy size={18} /> Claim ${payoutAmount}
            </button>
          ) : isWin && claimed ? (
            <div className="flex flex-col items-end w-full md:w-auto">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Status</span>
              <span className="w-full md:w-auto px-4 py-1.5 text-sm font-bold rounded-lg bg-success/10 text-success border border-success/20 flex items-center justify-center gap-2">
                <CheckCircle size={16} /> Claimed
              </span>
            </div>
          ) : isLoss ? (
            <div className="flex flex-col items-end w-full md:w-auto">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Status</span>
              <span className="w-full md:w-auto px-4 py-1.5 text-sm font-bold rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 flex items-center justify-center gap-2">
                <XCircle size={16} /> Lost
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end w-full md:w-auto">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Status</span>
              <span className="w-full md:w-auto px-4 py-1.5 text-sm font-bold rounded-lg bg-neutral-100 dark:bg-dark-700 text-neutral-500 border border-neutral-200 dark:border-dark-600 flex items-center justify-center">
                Resolving...
              </span>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default PortfolioBetCard;
