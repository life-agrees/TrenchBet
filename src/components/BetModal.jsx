import React, { useState, useMemo, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Zap, AlertCircle, Bitcoin, CircleDollarSign, Layers, DollarSign, Users, PlayCircle, Clock, Wallet, Calculator, Sparkles, Shield, CheckCircle, RefreshCw, BarChart3, Target, Timer, TrendingDown as DecayIcon } from 'lucide-react';

import { useBetPlacement } from '../hooks/useBetPlacement';
import { useTimeDecay } from '../hooks/useTimeDecay';
import { useVouchers } from '../hooks/useVouchers';
import { VoucherBalance } from './VoucherBalance';
import { formatOddsDisplay, calculateMarketPercentages, safeToFixed, calculatePayout, getEffectiveMultiplierDisplay } from '../marketUtils';
import { createLogger } from '../utils/logger';
import { MARKET } from '../utils/constants';
import { ASSET_CONFIG, ASSET_STATUS } from '../config/assets';


const logger = createLogger('BetModal');

// Helper to get asset display info from centralized config
const getAssetInfo = (symbol) => {
  const config = ASSET_CONFIG[symbol];
  if (!config) {
    return {
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      icon: Layers
    };
  }
  return {
    color: config.style.badge,
    icon: config.icon
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

export const BetModal = ({ isOpen, onClose, market, usdcBalance, 
  formattedUsdcBalance, usdcBalanceNum, onBetPlaced, initialChoice, userAddress,
  hasClaimableWins = false, onShareWin }) => {
  const [position, setPosition] = useState('yes');
  const [selectedChoice, setSelectedChoice] = useState(0);
  const [amount, setAmount] = useState('');
  const [inputError, setInputError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isApproved, setIsApproved] = useState(false); // Track if user has approved USDC
  const { placeBet, placeBetAfterApproval, isPlacingBet, isPending, isConfirming, needsApproval, error, reset, isSuccess, checkAllowance, isReconnecting, isConnecting, address } = useBetPlacement();
  
  // Time decay tracking
  const { 
    decayDisplay, 
    isLatePhase, 
    isDecaying, 
    timeUntilDecayDisplay,
    getEffectiveMultiplier,
    getOddsDropCountdown 
  } = useTimeDecay(market);
  
  // Voucher balance tracking for unified validation
  const { voucherBalance, voucherBalanceFormatted, isSystemActive: vouchersActive } = useVouchers(userAddress);
  const voucherBalanceNum = useMemo(() => voucherBalance ? Number(voucherBalance) / 1e6 : 0, [voucherBalance]);
  
  // Unified balance for validation
  const totalBalanceNum = useMemo(() => usdcBalanceNum + voucherBalanceNum, [usdcBalanceNum, voucherBalanceNum]);
  const totalBalanceFormatted = useMemo(() => (totalBalanceNum).toFixed(2), [totalBalanceNum]);



  // Clear input error when amount changes
  useEffect(() => {
    const betAmount = parseFloat(amount);
    if (amount && betAmount < MARKET.MIN_BET_AMOUNT) {
      setInputError(`Minimum bet is ${MARKET.MIN_BET_AMOUNT} USDC`);
    } else if (amount && betAmount > MARKET.MAX_BET_AMOUNT) {
      setInputError(`Maximum bet is ${MARKET.MAX_BET_AMOUNT.toLocaleString()} USDC`);
    } else if (amount && betAmount <= 0) {
      setInputError('Amount must be greater than 0');
    } else {
      setInputError('');
    }
  }, [amount]); // Only depend on amount to keep UI responsive

  // Reset and check allowance when modal opens
  useEffect(() => {
    if (isOpen) {
      setRetryCount(0);
      setIsApproved(false);
      reset();
      
      // Auto-check allowance if amount and address are present
      const checkInitialAllowance = async () => {
        if (address && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
          try {
            const hasAllowance = await checkAllowance(parseFloat(amount));
            if (hasAllowance) {
              setIsApproved(true);
            }
          } catch (err) {
            logger.error('Error auto-checking allowance:', err);
          }
        }
      };
      
      checkInitialAllowance();
    }
  }, [isOpen, reset, address, checkAllowance]); // Note: amount is not here to avoid constant checking while typing
  
  // Also check allowance when amount typing stops or settles
  useEffect(() => {
    if (isOpen && address && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
      const timer = setTimeout(async () => {
        try {
          const hasAllowance = await checkAllowance(parseFloat(amount));
          setIsApproved(hasAllowance);
        } catch (err) {
          // Silent fail for auto-check
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [amount, isOpen, address, checkAllowance]);

  // Restore initial choice when modal opens
  useEffect(() => {
    if (isOpen && initialChoice !== undefined && initialChoice !== null) {
      if (market?.marketType === 0) {
        setPosition(initialChoice === 1 ? 'yes' : 'no');
      } else {
        setSelectedChoice(initialChoice);
      }
    }
  }, [isOpen, initialChoice, market?.marketType]);

  
  // Helper to get option color based on index (Brand-aligned)
  const getOptionColor = (index, isSelected) => {
    const baseColors = [
      'bg-primary/20 text-primary border-primary/30',
      'bg-secondary/20 text-secondary border-secondary/30',
      'bg-success/20 text-success border-success/30',
      'bg-danger/20 text-danger border-danger/30',
    ];
    const selectedColors = [
      'bg-primary/40 text-primary border-primary shadow-lg shadow-primary/20',
      'bg-secondary/40 text-secondary border-secondary shadow-lg shadow-secondary/20',
      'bg-success/40 text-success border-success shadow-lg shadow-success/20',
      'bg-danger/40 text-danger border-danger shadow-lg shadow-danger/20',
    ];
    return isSelected ? selectedColors[index % selectedColors.length] : baseColors[index % baseColors.length];
  };


  if (!isOpen || !market) return null;

  const assetInfo = getAssetInfo(market.asset);
  const AssetIcon = assetInfo.icon;

  // Calculate odds for display with time decay applied
  const yesOdds = useMemo(() => {
    // When time decay is enabled, always use the effective multiplier
    if (market.useTimeDecay) {
      const effectiveMultiplier = getEffectiveMultiplier(1);
      return {
        text: `${safeToFixed(effectiveMultiplier, 2)}x Odds`,
        percentage: Math.round(100 / effectiveMultiplier),
        isFixed: true,
        multiplier: effectiveMultiplier
      };
    }
    
    // Otherwise use standard format
    return formatOddsDisplay({
      useFixedOdds: market.useFixedOdds,
      multiplier: market.yesMultiplier || 200,
      poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).upPercentage,
      choice: 1
    });
  }, [market, getEffectiveMultiplier]);

  const noOdds = useMemo(() => {
    // When time decay is enabled, always use the effective multiplier
    if (market.useTimeDecay) {
      const effectiveMultiplier = getEffectiveMultiplier(0);
      return {
        text: `${safeToFixed(effectiveMultiplier, 2)}x Odds`,
        percentage: Math.round(100 / effectiveMultiplier),
        isFixed: true,
        multiplier: effectiveMultiplier
      };
    }
    
    // Otherwise use standard format
    return formatOddsDisplay({
      useFixedOdds: market.useFixedOdds,
      multiplier: market.noMultiplier || 200,
      poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).downPercentage,
      choice: 0
    });
  }, [market, getEffectiveMultiplier]);


  // Get odds countdown for display
  const oddsCountdown = useMemo(() => {
    if (!market?.useTimeDecay || !market.useFixedOdds) return null;
    const baseMultiplier = market.marketType === 0 
      ? (position === 'yes' ? market.yesMultiplier : market.noMultiplier) || 200
      : (market.multipliers?.[selectedChoice] || 200);
    return getOddsDropCountdown(baseMultiplier, 10);
  }, [market, position, selectedChoice, getOddsDropCountdown]);


  // Calculate potential payout based on current input and market type
  const potentialPayout = useMemo(() => {
    const betAmount = parseFloat(amount) || 0;
    if (betAmount <= 0) return 0;
    
    let multiplier = 1;
    
    if (market.marketType === 0) {
      // Binary market
      const selectedOdds = position === 'yes' ? yesOdds : noOdds;
      multiplier = selectedOdds.multiplier || 1;
    } else if (market.useFixedOdds && market.multipliers) {
      // Other market types with fixed odds - apply time decay if enabled
      const baseMultiplier = market.multipliers[selectedChoice] || 200;
      multiplier = market.useTimeDecay 
        ? getEffectiveMultiplier(selectedChoice)
        : baseMultiplier / 100;
    } else {

      // Dynamic odds default
      multiplier = 2.0;
    }
    
    return calculatePayout(betAmount, multiplier);
  }, [amount, position, selectedChoice, yesOdds, noOdds, market, getEffectiveMultiplier]);



  const potentialProfit = useMemo(() => {
    const betAmount = parseFloat(amount) || 0;
    return potentialPayout - betAmount;
  }, [potentialPayout, amount]);

  const handleMaxClick = () => {
    const balanceMax = Math.max(0, usdcBalanceNum - 0.01);
    const cappedMax = Math.min(balanceMax, MARKET.MAX_BET_AMOUNT);
    setAmount(cappedMax > 0 ? cappedMax.toFixed(2) : '0');
  };

  const handlePlaceBet = async () => {
    const betAmount = parseFloat(amount);
    if (!betAmount || betAmount <= 0) {
      setInputError('Please enter a valid amount');
      return;
    }
    if (betAmount < MARKET.MIN_BET_AMOUNT) {
      setInputError(`Minimum bet is ${MARKET.MIN_BET_AMOUNT} USDC`);
      return;
    }
    if (betAmount > MARKET.MAX_BET_AMOUNT) {
      setInputError(`Maximum bet is ${MARKET.MAX_BET_AMOUNT.toLocaleString()} USDC`);
      return;
    }
    if (betAmount > usdcBalanceNum) {
      setInputError(`Insufficient balance. You have ${formattedUsdcBalance} USDC`);
      return;
    }
    
    // Determine choice based on market type
    let choice;
    if (market.marketType === 0) {
      choice = position === 'yes' ? 1 : 0;
    } else {
      choice = selectedChoice;
    }
    
    logger.info('Starting bet approval:', { marketId: market.id, choice, amount: betAmount, marketType: market.marketType });
    
    const result = await placeBet(market, choice, betAmount);

    if (result.success) {
      setIsApproved(true);
    }
  };

  // NEW FUNCTION: Handle the actual bet placement (second button)
  const handleConfirmBet = async () => {
    const betAmount = parseFloat(amount);
    
    if (betAmount > usdcBalanceNum) {
      setInputError(`Insufficient balance. You have ${formattedUsdcBalance} USDC`);
      return;
    }
    
    let choice;
    if (market.marketType === 0) {
      choice = position === 'yes' ? 1 : 0;
    } else {
      choice = selectedChoice;
    }
    
    logger.info('Placing bet after approval:', { marketId: market.id, choice, amount: betAmount });
    
    const result = await placeBetAfterApproval(market, choice, betAmount);

    if (result.success) {
      // Notify parent component that bet was placed successfully
      if (onBetPlaced) {
        onBetPlaced(result);
      }
      onClose();
      setAmount('');
      setRetryCount(0);
      setIsApproved(false);
    }
  };

  const handleRetry = () => {
    if (!isOpen) return; // ← guard
    setRetryCount(prev => prev + 1);
    reset();
    setTimeout(() => {
        if (!isOpen) return; // ← guard again inside timeout
        handlePlaceBet();
    }, 500);
  };

  // Determine balance status color
  const getBalanceStatusColor = () => {
    if (isReconnecting) return 'text-neutral-400 animate-pulse';
    if (!usdcBalanceNum || usdcBalanceNum === 0) return 'text-red-400';
    if (usdcBalanceNum < 10) return 'text-secondary';
    return 'text-green-400';
  };

  // Get detailed status message
  const getStatusMessage = () => {
    if (isReconnecting || (isConnecting && !address)) {
      return {
        title: 'Resyncing Wallet...',
        description: 'Restoring your session connection. Please wait...',
        icon: <RefreshCw className="w-5 h-5 text-primary animate-spin" />
      };
    }
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
<div className="relative w-full max-w-md bg-gradient-to-br from-dark-900/95 via-dark-800 to-dark-900 border border-primary/20 rounded-2xl shadow-2xl shadow-primary/10 hover:shadow-primary/20 hover:border-primary/40 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300">
<div className="flex items-center justify-between p-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Place Bet</h2>
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
            className="p-2 text-gray-400 hover:text-neutral-900 dark:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-gray-400 text-sm">{market.title}</p>

          {/* Market Type Indicator */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="px-2 py-1 rounded-md bg-gray-700/50 text-gray-400 text-xs font-medium border border-gray-600">
              {getMarketTypeLabel(market.marketType)}
            </div>
            {market.marketType === 2 && market.targetPrice && (
              <div className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-xs font-medium border border-purple-500/30">
                Target: ${market.targetPrice.toLocaleString?.() || market.targetPrice}
              </div>
            )}
            {/* Time Decay Badge */}
            {decayDisplay.showBadge && (
              <div className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${decayDisplay.badgeColor}`}>
                <DecayIcon className="w-3 h-3" />
                {decayDisplay.label}
                {timeUntilDecayDisplay && (
                  <span className="opacity-75">({timeUntilDecayDisplay})</span>
                )}
              </div>
            )}
          </div>


          {/* Balance Display */}

<div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 border border-primary/30 rounded-xl p-3 hover:shadow-primary/20 transition-all hover:border-primary/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm text-gray-400">Your Balance</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-lg ${getBalanceStatusColor()}`}>
                  {isConnecting && !formattedUsdcBalance ? 'Syncing...' : (formattedUsdcBalance || '0.00')}
                </span>
                {(!isConnecting || formattedUsdcBalance) && <span className="text-sm text-gray-400">USDC</span>}
              </div>
            </div>
            {(!totalBalanceNum || totalBalanceNum === 0) && (
              <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                No funds available. Deposit USDC or use a voucher.
              </div>
            )}
          </div>

          {/* Voucher Balance Display (if available) */}
          <VoucherBalance userAddress={userAddress} />

          {/* Market Stats Grid */}
          <div className="grid grid-cols-2 gap-2 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            {/* Start Price */}
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">Start Price</div>
                <div className="text-neutral-900 dark:text-white font-semibold text-sm">
                  ${market.startPrice ? safeToFixed(market.startPrice, 0) : '---'}
                </div>
              </div>
            </div>

            {/* Pool Size */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">Pool Size</div>
                <div className="text-neutral-900 dark:text-white font-semibold text-sm">
                  {market.totalPool ? safeToFixed(market.totalPool, 2) : '0.00'} USDC
                </div>
              </div>
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2 col-span-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-xs text-gray-500">Ends</div>
                <div className="text-neutral-900 dark:text-white font-semibold text-sm">
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

          {/* Market Type Specific Selection UI */}
          {market.marketType === 0 && (
            /* Binary Market - Yes/No Selection */
            <div className="flex gap-2">
              <button
                onClick={() => setPosition('yes')}
                className={`flex-1 flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-200 ${
                  position === 'yes'
                    ? 'bg-success/20 border-2 border-success shadow-lg shadow-success/20'
                    : 'bg-white dark:bg-dark-800 border-2 border-transparent hover:bg-dark-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-neutral-900 dark:text-white font-medium">Yes</span>
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
                    ? 'bg-danger/20 border-2 border-danger shadow-lg shadow-danger/20'
                    : 'bg-white dark:bg-dark-800 border-2 border-transparent hover:bg-dark-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <span className="text-neutral-900 dark:text-white font-medium">No</span>
                </div>
                <span className="text-xs text-red-400/80 font-semibold">{noOdds.text}</span>
                {noOdds.isFixed && (
                  <span className="text-[10px] text-red-300/60">Fixed Odds</span>
                )}
              </button>
            </div>
          )}

          {market.marketType === 1 && market.options && (
            /* Multi-Choice Market - Option Selection */
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Select an option:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {market.options.map((option, idx) => {
                  // When time decay is enabled, always show the decayed multiplier
                  const effectiveMultiplier = market.useTimeDecay 
                    ? getEffectiveMultiplier(idx)
                    : (market.multipliers?.[idx] || 200) / 100;
                  const oddsText = `${safeToFixed(effectiveMultiplier, 2)}x`;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedChoice(idx)}
                      className={`${getOptionColor(idx, selectedChoice === idx)} border rounded-lg p-3 text-center transition-all duration-200 hover:scale-105`}
                    >
                      <div className="font-bold text-sm text-neutral-900 dark:text-white">{option}</div>
                      <div className="text-xs opacity-80">{oddsText}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}



          {market.marketType === 2 && market.ranges && (
            /* Range Market - Range Selection */
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400">Select a price range:</span>
              </div>
              <div className="space-y-2">
                {market.ranges.map((range, idx) => {
                  // When time decay is enabled, always show the decayed multiplier
                  const effectiveMultiplier = market.useTimeDecay 
                    ? getEffectiveMultiplier(idx)
                    : (market.multipliers?.[idx] || 200) / 100;
                  const oddsText = `${safeToFixed(effectiveMultiplier, 2)}x`;
                  const rangeLabel = `$${range.min?.toLocaleString?.() || range.min} - $${range.max?.toLocaleString?.() || range.max}`;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedChoice(idx)}
                      className={`w-full ${getOptionColor(idx, selectedChoice === idx)} border rounded-lg p-3 text-center transition-all duration-200 hover:scale-[1.02]`}
                    >
                      <div className="font-bold text-sm text-neutral-900 dark:text-white">{rangeLabel}</div>
                      <div className="text-xs opacity-80">{oddsText}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}



          {market.marketType === 3 && market.timeframes && (
            /* Time-Based Market - Timeframe Selection */
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-400">Select a timeframe:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {market.timeframes.map((tf, idx) => {
                  // When time decay is enabled, always show the decayed multiplier
                  const effectiveMultiplier = market.useTimeDecay 
                    ? getEffectiveMultiplier(idx)
                    : (market.multipliers?.[idx] || 200) / 100;
                  const oddsText = `${safeToFixed(effectiveMultiplier, 2)}x`;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedChoice(idx)}
                      className={`${getOptionColor(idx, selectedChoice === idx)} border rounded-lg p-3 text-center transition-all duration-200 hover:scale-105`}
                    >
                      <div className="font-bold text-sm text-neutral-900 dark:text-white">{tf.label}</div>
                      <div className="text-xs opacity-80">{oddsText}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}




          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400">
                Bet Amount (USDC)
              </label>
              <button
                onClick={handleMaxClick}
                disabled={!usdcBalanceNum || usdcBalanceNum <= 0}
                className="text-xs text-secondary hover:text-primary disabled:text-gray-600 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${MARKET.MIN_BET_AMOUNT}.00`}
                step="0.01"
                min={MARKET.MIN_BET_AMOUNT}
                max={MARKET.MAX_BET_AMOUNT}
                disabled={isPlacingBet}
                className={`w-full bg-gray-800 border rounded-lg px-6 py-3 text-neutral-900 dark:text-white placeholder-gray-500 focus:outline-none transition-colors ${
                  inputError ? 'border-red-500 focus:border-red-500' : 'border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/30'
                } pr-16`}
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

          {/* Time Decay Warning */}
          {isLatePhase && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="text-red-400 font-semibold">Late Phase Warning:</span>
                  <span className="text-red-300/80"> Odds have significantly decayed. You're betting with reduced returns due to limited time remaining.</span>
                </div>
              </div>
            </div>
          )}

          {/* Odds Decay Countdown */}
          {oddsCountdown && oddsCountdown.secondsUntil > 0 && oddsCountdown.secondsUntil < 300 && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-400">
                  Odds drop to <span className="font-bold">{oddsCountdown.futureMultiplier}x</span> in {oddsCountdown.display}!
                </span>
              </div>
            </div>
          )}

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
                  <span className="text-neutral-900 dark:text-white font-medium">{safeToFixed(parseFloat(amount), 2)} USDC</span>
                </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Multiplier</span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-medium">
                    {market.marketType === 0 
                      ? (position === 'yes' ? yesOdds.multiplier?.toFixed(2) : noOdds.multiplier?.toFixed(2))
                      : getEffectiveMultiplier(selectedChoice).toFixed(2)
                    }x
                  </span>
                  {market.useTimeDecay && isDecaying && (
                    <span className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
                      Decayed
                    </span>
                  )}
                </div>
              </div>

                {/* Show base odds if decayed */}
                {market.useTimeDecay && isDecaying && (
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Base Odds</span>
                    <span className="line-through">
                      {market.marketType === 0 
                        ? ((position === 'yes' ? market.yesMultiplier : market.noMultiplier) / 100).toFixed(2)
                        : (market.multipliers?.[selectedChoice] / 100).toFixed(2)
                      }x
                    </span>
                  </div>
                )}


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
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">{status.title}</div>
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

          {isSuccess && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm">Bet placed successfully!</span>
              </div>
              
              {hasClaimableWins && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg animate-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs text-primary font-bold uppercase tracking-wider">Claimable Win Detected!</span>
                    </div>
                    <button 
                      onClick={onShareWin}
                      className="px-3 py-1 bg-primary text-dark-950 text-[10px] font-black rounded uppercase hover:scale-105 transition-transform"
                    >
                      Share Win 🎉
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">You have unclaimed winnings. Brag about them while your new bet processes!</p>
                </div>
              )}
            </div>
          )}

          {/* TWO-BUTTON APPROACH: Industry Standard - Separate Approval and Bet Placement */}
          
          <div className="flex flex-col gap-3 pt-2">
            {/* Step 1: Approve USDC - Shows when approval is needed */}
            <div className="relative group">
              {!isApproved && !isSuccess && (
                <div className="absolute -top-3 left-4 px-2 bg-dark-900 border border-primary/20 rounded text-[10px] font-bold text-primary uppercase tracking-tighter z-10">
                  Step 1: Authorization
                </div>
              )}
              <button
                onClick={handlePlaceBet}
                disabled={isApproved || !amount || isPlacingBet || !!inputError || isReconnecting || parseFloat(amount) <= 0}
                className={`w-full py-3 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  isApproved 
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400 cursor-default' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-lg shadow-yellow-500/10'
                }`}
              >
                {isApproved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    USDC Approved
                  </>
                ) : isPlacingBet && needsApproval ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Approving USDC...
                  </>
                ) : (
                  `Approve ${amount ? safeToFixed(parseFloat(amount), 2) : '---'} USDC`
                )}
              </button>
            </div>

            {/* Step 2: Place Bet - Only enabled AFTER approval is successful */}
            <div className="relative group">
              {isApproved && !isSuccess && (
                <div className="absolute -top-3 left-4 px-2 bg-dark-900 border border-primary/20 rounded text-[10px] font-bold text-primary uppercase tracking-tighter z-10 group-hover:block hidden">
                  Step 2: Confirm Transaction
                </div>
              )}
              <button
                onClick={handleConfirmBet}
                disabled={!isApproved || !amount || isPlacingBet || !!inputError || parseFloat(amount) <= 0}
                className={`w-full py-3 font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                  !isApproved 
                    ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed' 
                    : 'bg-primary hover:bg-primary-dark text-black shadow-primary/20'
                }`}
              >
                {isPlacingBet && !needsApproval ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Placing Bet...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Place Bet
                  </>
                )}
              </button>
            </div>
          </div>

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
