import React, { useState, useMemo, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle, Bitcoin, CircleDollarSign, Layers, DollarSign, Users, PlayCircle, Clock, Wallet, Calculator, Sparkles, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { useBetPlacement } from '../hooks/useBetPlacement';
import { formatOddsDisplay, calculateMarketPercentages, safeToFixed, calculatePayout } from '../marketUtils';
import { createLogger } from '../utils/logger';

const logger = createLogger('BetModal');

// Helper to get asset display info
const getAssetInfo = (asset) => {
  const assetColors = {
    'BTC': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'ETH': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'SOL': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'CRYPTO': 'bg-[#c0ff00]/20 text-[#c0ff00] border-[#c0ff00]/30',
  };
  return {
    color: assetColors[asset] || 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: asset === 'BTC' ? Bitcoin : asset === 'ETH' ? CircleDollarSign : Layers
  };
};

// Helper to get market type label
const getMarketTypeLabel = (type) => {
  const labels = {
    0: 'Binary',
    1: 'Multi-Choice',
    2: 'Range',
    3: 'Time-Based'
  };
  return labels[type] || 'Unknown';
};

export const BetModal = ({ isOpen, onClose, market, usdcBalance, formattedUsdcBalance, usdcBalanceNum, onBetPlaced }) => {
  const [position, setPosition] = useState('yes');
  const [amount, setAmount] = useState('');
  const [inputError, setInputError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const { placeBet, isPlacingBet, isPending, isConfirming, needsApproval, error, reset, isSuccess } = useBetPlacement();

  // Clear input error when amount changes
  useEffect(() => {
    if (amount && parseFloat(amount) > usdcBalanceNum) {
      setInputError(`Insufficient balance. You have ${formattedUsdcBalance} USDC`);
    } else if (amount && parseFloat(amount) <= 0) {
      setInputError('Amount must be greater than 0');
    } else {
      setInputError('');
    }
  }, [amount, usdcBalanceNum, formattedUsdcBalance]);

  // Reset retry count when modal opens
  useEffect(() => {
    if (isOpen) {
      setRetryCount(0);
      reset();
    }
  }, [isOpen, reset]);

  if (!isOpen || !market) return null;

  const assetInfo = getAssetInfo(market.asset);
  const AssetIcon = assetInfo.icon;

  // Calculate odds for display
  const yesOdds = useMemo(() => {
    return formatOddsDisplay({
      useFixedOdds: market.useFixedOdds,
      multiplier: market.yesMultiplier,
      poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).upPercentage,
      choice: 1
    });
  }, [market]);

  const noOdds = useMemo(() => {
    return formatOddsDisplay({
      useFixedOdds: market.useFixedOdds,
      multiplier: market.noMultiplier,
      poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).downPercentage,
      choice: 0
    });
  }, [market]);

  // Calculate potential payout based on current input
  const potentialPayout = useMemo(() => {
    const betAmount = parseFloat(amount) || 0;
    if (betAmount <= 0) return 0;
    
    const selectedOdds = position === 'yes' ? yesOdds : noOdds;
    const multiplier = selectedOdds.multiplier || 1;
    
    return calculatePayout(betAmount, multiplier);
  }, [amount, position, yesOdds, noOdds]);

  const potentialProfit = useMemo(() => {
    const betAmount = parseFloat(amount) || 0;
    return potentialPayout - betAmount;
  }, [potentialPayout, amount]);

  const handleMaxClick = () => {
    const maxBet = Math.max(0, usdcBalanceNum - 0.01);
    setAmount(maxBet > 0 ? maxBet.toFixed(2) : '0');
  };

  const handlePlaceBet = async () => {
    const betAmount = parseFloat(amount);
    if (!betAmount || betAmount <= 0) {
      setInputError('Please enter a valid amount');
      return;
    }
    if (betAmount > usdcBalanceNum) {
      setInputError(`Insufficient balance. You have ${formattedUsdcBalance} USDC`);
      return;
    }
    
    // Convert position string to numeric choice (0 = no/down, 1 = yes/up)
    const choice = position === 'yes' ? 1 : 0;
    
    logger.info('Placing bet with:', { marketId: market.id, choice, amount: betAmount });
    
    const result = await placeBet(market, choice, betAmount);
    if (result.success) {
      // Notify parent component that bet was placed successfully
      if (onBetPlaced) {
        onBetPlaced(result);
      }
      onClose();
      setAmount('');
      setRetryCount(0);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    reset();
    // Small delay before allowing retry
    setTimeout(() => {
      handlePlaceBet();
    }, 500);
  };

  // Determine balance status color
  const getBalanceStatusColor = () => {
    if (!usdcBalanceNum || usdcBalanceNum === 0) return 'text-red-400';
    if (usdcBalanceNum < 10) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Get detailed status message
  const getStatusMessage = () => {
    if (needsApproval) {
      return {
        title: 'Approving USDC...',
        description: 'Please confirm the approval in your wallet. This allows the contract to spend your USDC.',
        icon: <Shield className="w-5 h-5 text-yellow-400 animate-pulse" />
      };
    }
    if (isPending) {
      return {
        title: 'Submitting Transaction...',
        description: 'Waiting for wallet confirmation. Please check your wallet popup.',
        icon: <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      };
    }
    if (isConfirming) {
      return {
        title: 'Confirming on Blockchain...',
        description: 'Transaction submitted. Waiting for blockchain confirmation.',
        icon: <CheckCircle className="w-5 h-5 text-green-400" />
      };
    }
    return null;
  };

  const status = getStatusMessage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Place Bet</h2>
            {/* Asset Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${assetInfo.color}`}>
              <AssetIcon className="w-3.5 h-3.5" />
              <span>{market.asset || 'Unknown'}</span>
            </div>
            {/* Market Type Badge */}
            <div className="px-2 py-1 rounded-md bg-gray-700/50 text-gray-400 text-xs font-medium border border-gray-600">
              {getMarketTypeLabel(market.marketType)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-gray-400 text-sm">{market.title}</p>

          {/* Balance Display */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Your Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${getBalanceStatusColor()}`}>
                  {formattedUsdcBalance || '0.00'}
                </span>
                <span className="text-sm text-gray-400">USDC</span>
              </div>
            </div>
            {(!usdcBalanceNum || usdcBalanceNum === 0) && (
              <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Insufficient balance to place bets
              </div>
            )}
          </div>

          {/* Market Stats Grid */}
          <div className="grid grid-cols-2 gap-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            {/* Start Price */}
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">Start Price</div>
                <div className="text-white font-semibold text-sm">
                  ${market.startPrice ? safeToFixed(market.startPrice, 0) : '---'}
                </div>
              </div>
            </div>

            {/* Pool Size */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">Pool Size</div>
                <div className="text-white font-semibold text-sm">
                  {market.totalPool ? safeToFixed(market.totalPool, 2) : '0.00'} USDC
                </div>
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2 col-span-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">Ends</div>
                <div className="text-white font-semibold text-sm">
                  {market.endDate ? new Date(market.endDate).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '---'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPosition('yes')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-200 ${
                position === 'yes'
                  ? 'bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/20'
                  : 'bg-gray-800 border-2 border-transparent hover:bg-gray-750'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Yes</span>
              </div>
              <span className="text-xs text-green-400/80 font-semibold">{yesOdds.text}</span>
              {yesOdds.isFixed && (
                <span className="text-[10px] text-green-300/60">Fixed Odds</span>
              )}
            </button>
            <button
              onClick={() => setPosition('no')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-200 ${
                position === 'no'
                  ? 'bg-red-500/20 border-2 border-red-500 shadow-lg shadow-red-500/20'
                  : 'bg-gray-800 border-2 border-transparent hover:bg-gray-750'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                <span className="text-white font-medium">No</span>
              </div>
              <span className="text-xs text-red-400/80 font-semibold">{noOdds.text}</span>
              {noOdds.isFixed && (
                <span className="text-[10px] text-red-300/60">Fixed Odds</span>
              )}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400">
                Bet Amount (USDC)
              </label>
              <button
                onClick={handleMaxClick}
                disabled={!usdcBalanceNum || usdcBalanceNum <= 0}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                disabled={isPlacingBet}
                className={`w-full bg-gray-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors ${
                  inputError ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-blue-500'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                USDC
              </span>
            </div>
            {inputError && (
              <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                {inputError}
              </div>
            )}
          </div>

          {/* Potential Payout Calculator */}
          {amount && parseFloat(amount) > 0 && !inputError && (
            <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-400">Potential Winnings</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Your Bet</span>
                  <span className="text-white font-medium">{safeToFixed(parseFloat(amount), 2)} USDC</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Multiplier</span>
                  <span className="text-blue-400 font-medium">
                    {position === 'yes' ? yesOdds.multiplier?.toFixed(2) : noOdds.multiplier?.toFixed(2)}x
                  </span>
                </div>
                <div className="h-px bg-green-500/20 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Total Return</span>
                  <span className="text-green-400 font-bold text-lg">
                    {safeToFixed(potentialPayout, 2)} USDC
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Net Profit</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    +{safeToFixed(potentialProfit, 2)} USDC
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Status Indicator */}
          {isPlacingBet && status && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                {status.icon}
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{status.title}</div>
                  <div className="text-xs text-gray-400">{status.description}</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display with Retry */}
          {(error || inputError) && (
            <div className="flex flex-col gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error || inputError}</span>
              </div>
              {error && !isPlacingBet && (
                <button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/30 hover:bg-red-500/40 text-red-300 rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Transaction
                </button>
              )}
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm">Bet placed successfully!</span>
            </div>
          )}

          <button
            onClick={handlePlaceBet}
            disabled={!amount || isPlacingBet || !!inputError || parseFloat(amount) <= 0 || parseFloat(amount) > usdcBalanceNum}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isPlacingBet ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {needsApproval ? 'Approve USDC...' : isPending ? 'Submitting...' : isConfirming ? 'Confirming...' : 'Processing...'}
              </span>
            ) : !amount || parseFloat(amount) <= 0 ? (
              'Enter Amount to Bet'
            ) : parseFloat(amount) > usdcBalanceNum ? (
              'Insufficient Balance'
            ) : (
              `Place Bet for ${safeToFixed(parseFloat(amount), 2)} USDC`
            )}
          </button>

          {/* Help Text */}
          <div className="text-xs text-gray-500 text-center">
            {needsApproval 
              ? "First, you'll approve USDC spending, then place your bet in a second transaction."
              : "Transactions are processed on Base Sepolia network."
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetModal;
