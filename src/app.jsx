import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useAccount, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import {
  TrendingUp, Clock, DollarSign, Wallet, Trophy,
  Target, BarChart3, Settings, AlertTriangle, CheckCircle,
  XCircle, RefreshCw
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { CONTRACTS } from './config/wagmi';
import AdminPanel from './components/AdminPanel';
import AddFundsModal from './components/AddFundsModal';
import LeaderboardView from './components/LeaderboardView';
import Footer from './components/Footer';
import PointsBalance from './components/PointsBalance';
import PointsHistoryModal from './components/PointsHistoryModal';
import ShareModal from './components/ShareModal';
import NotificationSettings from './components/NotificationSettings';
import MarketCard from './components/MarketCard';
import BetModal from './components/BetModal';
import VirtualMarketList from './components/VirtualMarketList';
import { PREDICTION_MARKET_ABI } from './contracts/abis';
import { sdk } from '@farcaster/miniapp-sdk';
import LandingPage from './LandingPage';
import EmptyState from './components/EmptyState';
import { calculateMarketPercentages, calculateMultiplier, formatMultiplier, formatOddsDisplay, safeToFixed, getBetDisplayWithOdds } from './marketUtils';


// Custom hooks
import { useMarkets } from './hooks/useMarkets';
import { useUserBets } from './hooks/useUserBets';
import { useNotifications } from './hooks/useNotifications';
import { useUserStats } from './hooks/useUserStats';
import { useBetPlacement } from './hooks/useBetPlacement';
import { useAdminOwner } from './hooks/useAdminOwner';
import { useBalance } from './hooks/useBalance';
import { useDebounce } from './hooks/useDebounce';
import { usePrefetchMarket } from './hooks/usePrefetchMarket';


// Skeleton components
import { MarketCardSkeleton } from './components/SkeletonLoader';

// Constants and logger
import { DURATIONS, TIME, VIRTUAL_SCROLL } from './utils/constants';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

// = UTILITY FUNCTIONS =

const formatPrice = (price) => {
  return parseFloat(formatUnits(BigInt(price), 8)).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getMarketLabel = (marketType, asset) => {
  const typeMap = {
    0: 'Binary UP/DOWN',
    1: 'Multi-Choice',
    2: 'Range Market',
    3: 'Time-Based',
  };
  return `${asset} - ${typeMap[marketType] || 'Unknown Market'}`;
};

const getMarketTimeRemaining = (market) => {
  if (market.marketType === 3) {
    return market.resolved ? "Ended" : "Active Target";
  }

  const now = Date.now();
  const end = Number(market.endTime);
  const remaining = end - now;

  if (remaining <= 0) return 'Market Ended';

  const seconds = Math.floor((remaining / 1000) % 60);
  const minutes = Math.floor((remaining / 1000 / 60) % 60);
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
};

const getChoiceLabel = (market, choiceIndex) => {
  if (market.marketType === 0) {
    return choiceIndex === 0 ? 'UP' : 'DOWN';
  }
  if (market.marketType === 1 && market.options && market.options[choiceIndex]) {
  }
  if (market.marketType === 3 && market.timeframes && market.timeframes[choiceIndex] !== undefined) {
    const formatDuration = (seconds) => {
      if (seconds >= 86400) return `${(seconds / 86400).toFixed(0)} Days`;
      if (seconds >= 3600) return `${(seconds / 3600).toFixed(0)} Hours`;
      return `${(seconds / 60).toFixed(0)} Mins`;
    };
    return `Hit by ${formatDuration(Number(market.timeframes[choiceIndex]))}`;
  }
  return `Choice ${choiceIndex + 1}`;
};

// ==================== MAIN COMPONENT ====================

const App = () => {
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Custom hooks - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { markets, liveMarkets, expiredMarkets, isLoading: isLoadingMarkets, refresh: refreshMarkets } = useMarkets();
  const { userBets, ongoingBets, wonBets, lostBets, refresh: refreshUserBets } = useUserBets(address, markets);
  const { enabled: notificationsEnabled, permission: notificationPermission, showNotification, enable: enableNotifications, isSupported: notificationsSupported } = useNotifications();
  const userStats = useUserStats(userBets);
  const { placeBet, isPending, isConfirming, isPlacingBet, isSuccess, hash, lastBetRef, reset: resetBetPlacement } = useBetPlacement();
  const { isOwner } = useAdminOwner(CONTRACTS.PREDICTION_MARKET);
  const { 
    formattedUsdcBalance, 
    usdcBalanceNum,
    formattedEthBalance,
    isLoading: isLoadingBalance, 
    refreshBalance 
  } = useBalance();
  const { handleMouseEnter, handleMouseLeave } = usePrefetchMarket();


  // UI state
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, DURATIONS.DEBOUNCE);


  const [currentView, setCurrentView] = useState('markets');
  const [betView, setBetView] = useState('ongoing');
  const [farcasterUser, setFarcasterUser] = useState(null);
  const [betAmount, setBetAmount] = useState('10');
  const [selectedBet, setSelectedBet] = useState(null);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState('ALL');
  const [shareModalData, setShareModalData] = useState(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // Calculate live stats for landing page
  const liveStats = useMemo(() => {
    const activeMarkets = (liveMarkets || []).length;
    const totalVolume = (markets || []).reduce((sum, m) =>
      sum + (parseFloat(m?.yesPool || 0) + parseFloat(m?.noPool || 0)), 0
    );
    const totalBets = (markets || []).reduce((sum, m) =>
      sum + (parseInt(m?.totalBets || 0)), 0
    );

    return { activeMarkets, totalVolume: Math.round(totalVolume), totalBets };
  }, [markets, liveMarkets]);


  // ==== HANDLERS ====

  const handlePlaceBet = useCallback(async () => {
    if (!selectedBet) return;

    try {
      await placeBet(selectedBet.market, selectedBet.choice, betAmount);
      toast.success('Bet placed successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to place bet');
    }
  }, [selectedBet, betAmount, placeBet]);

  const handleResolve = async (marketId, winningChoice) => {
    if (!isOwner) {
      toast.error('Admin only.');
      return;
    }
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    let functionName = 'resolveMarket';
    let args = [marketId];

    if (market.marketType === 1) {
      functionName = 'resolveMultiChoiceMarket';
      args = [marketId, winningChoice];
    } else if (market.marketType === 2) {
      functionName = 'resolveRangeMarket';
    } else if (market.marketType === 3) {
      functionName = 'resolveTimeMarket';
    }

    try {
      await writeContractAsync({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: functionName,
        args: args,
      });
      toast.success('Resolution sent.');
    } catch (error) {
      toast.error(`Resolution failed: ${error.shortMessage || error.message}`);
    }
  };

  const handleClaim = async (marketId) => {
    if (!address) {
      toast.error('Please connect your wallet first.');
      return;
    }
    try {
      await writeContractAsync({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'claimWinnings',
        args: [marketId],
      });
      toast.success('Claim sent. Your winnings will be available shortly.');
    } catch (error) {
      toast.error(`Claim failed: ${error.shortMessage || error.message}`);
    }
  };

  // ==== EVENT HANDLERS ====

  const handleBetClick = useCallback((market, choiceIndex, choiceLabel, multiplier, defaultBet) => {
    setBetAmount(defaultBet?.toString() || '10');
    setSelectedBet({
      market,
      choice: choiceIndex,
      choiceLabel,
      multiplier,
      yesPool: market.yesPool,
      noPool: market.noPool
    });
  }, []);


  const handleBetAmountChange = useCallback((value) => {
    setBetAmount(value);
  }, []);

  // Stable callbacks for modal handlers
  const handleOpenShareModal = useCallback((market) => {
    setShareModalData(market);
  }, []);

  const handleOpenAdminPanel = useCallback(() => {
    setShowAdminPanel(true);
  }, []);

  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
    refreshMarkets();
    refreshUserBets();
  }, [refreshMarkets, refreshUserBets]);

  // ==== EFFECTS ====

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      logger.error('Unhandled promise rejection', event.reason);
      if (event.reason?.message?.includes('503') ||
          event.reason?.message?.includes('rate limit')) {

        toast.error('Network congestion detected. Please wait a moment and try again.');
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  useEffect(() => {
    if (isSuccess && lastBetRef.current === hash) {
      setSelectedBet(null);
      if (notificationsEnabled && notificationsSupported) {
        showNotification('✅ Bet Placed!', {
          body: `Your bet of $${betAmount} has been placed successfully. Good luck!`,
          tag: 'bet-placed',
        });
      }
      refreshMarkets();
      refreshUserBets();
      resetBetPlacement();
    } else if (isSuccess) {
      refreshMarkets();
      refreshUserBets();
    }
  }, [isSuccess, hash, refreshMarkets, refreshUserBets, notificationsEnabled, notificationsSupported, showNotification, betAmount, resetBetPlacement]);

  useEffect(() => {
    if (sdk.isFarcaster) {
      sdk.getUserContext().then(setFarcasterUser).catch(e => logger.error('Failed to get Farcaster user context', e));
    }
  }, []);


  // ==== RENDER HELPERS ====

  const renderUserBet = (bet) => {
    const market = bet.market;
    const claimed = bet.claimed;
    const canClaim = bet.isClaimableConfirmed;
    
    // Calculate odds display for active markets
    let oddsDisplay = '';
    if (market && !market.resolved) {
      const isUp = bet.choice === 1;
      const oddsData = formatOddsDisplay({
        useFixedOdds: market.useFixedOdds,
        multiplier: isUp ? market.yesMultiplier : market.noMultiplier,
        poolPercentage: isUp 
          ? calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).upPercentage
          : calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).downPercentage,
        choice: bet.choice
      });
      oddsDisplay = oddsData.text;
    }

    return (
      <div key={bet.txHash} className={`bg-dark-800 p-4 rounded-xl shadow-md flex justify-between items-center transition-all duration-300 ${claimed ? 'opacity-70' : ''}`}>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white">{bet.marketLabel}</span>
          <span className="text-sm text-neutral-400">
            Bet on: <span className="font-semibold text-primary">{bet.choiceLabel}</span>
            {!market.resolved && oddsDisplay && (
              <span className="ml-2 text-secondary font-medium">• {oddsDisplay}</span>
            )}
          </span>
          <span className="text-sm text-neutral-400">Amount: <span className="font-semibold text-success">{formatUnits(bet.amount, 6)} USDC</span></span>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!market.resolved ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-white">{getMarketTimeRemaining(market)}</span>
          ) : canClaim ? (
            <button onClick={() => handleClaim(market.id)} className="bg-secondary hover:bg-secondary-500 text-neutral-900 font-bold py-2 px-4 rounded-lg flex items-center gap-1 text-sm">
              <Trophy size={16} /> Claim Winnings
            </button>
          ) : claimed ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-success text-white flex items-center gap-1"><CheckCircle size={14} /> Claimed</span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white flex items-center gap-1"><XCircle size={14} /> Lost</span>
          )}
        </div>
      </div>
    );
  };


  // ==== MAIN RENDER ====
  // NO EARLY RETURNS - All hooks are called above, now we can conditionally render

  // Show landing page if not connected and landing is enabled
  if (showLanding && !isConnected) {
    return <LandingPage onLaunchApp={() => setShowLanding(false)} liveStats={liveStats} />;
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white font-sans p-4 sm:p-8">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: DURATIONS.NOTIFICATION_AUTO_CLOSE,

          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(205, 255, 0, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#00FF88',
              secondary: '#1a1a1a',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF4757',
              secondary: '#1a1a1a',
            },
          },
        }}
      />
      <header className="flex justify-between items-center mb-8" role="banner">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-extrabold text-gradient-primary">TrenchyBet</h1>
          <span className="px-3 py-1 bg-secondary/20 border border-secondary text-secondary text-xs font-bold rounded-full animate-pulse-slow">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isConnected && (
            <PointsBalance walletAddress={address} onOpenHistory={() => setShowPointsHistory(true)} />
          )}
          {isOwner && (
            <button
              onClick={() => {
                console.log('Admin button clicked, opening admin panel');
                setShowAdminPanel(true);
              }}
              className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-secondary transition-all hover:scale-110 active:scale-95 cursor-pointer relative group"
              title="Open Admin Panel"
              aria-label="Open Admin Panel"
            >
              <Settings size={20} className="text-secondary group-hover:rotate-90 transition-transform duration-300" aria-hidden="true" />
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-dark-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Admin
              </span>
            </button>
          )}

          <ConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {isConnected && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1 bg-gradient-to-br from-primary/20 via-primary/10 to-success/10 border-2 border-primary p-6 rounded-2xl shadow-xl glow-primary hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wide">Your Balance</h3>
                  <Wallet size={32} className="text-primary" />
                </div>
                <div className="text-4xl md:text-5xl font-black text-white mb-4">
                  {isLoadingBalance ? (
                    <>Loading... <span className="text-2xl text-primary">USDC</span></>
                  ) : (
                    <>{formattedUsdcBalance} <span className="text-2xl text-primary">USDC</span></>
                  )}
                </div>

                <div className="text-xs text-neutral-400 mb-2">
                  {isLoadingBalance ? 'Balance loading...' : 'Your USDC balance'}
                </div>
                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="w-full bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 rounded-xl text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} /> Add Funds
                </button>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-dark-800 border border-success/30 p-5 rounded-xl hover:border-success hover:glow-success transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400 font-semibold">Wins</span>
                    <Trophy size={24} className="text-secondary" />
                  </div>
                  <div className="text-3xl font-black text-white mb-1">{userStats.wins}</div>
                  <div className="text-xs text-success font-semibold">
                    {userStats.totalBets > 0 ? `${((userStats.wins / userStats.totalBets) * 100).toFixed(0)}% Win Rate` : 'No bets yet'}
                  </div>
                </div>

                <div className="bg-dark-800 border border-danger/30 p-5 rounded-xl hover:border-danger hover:glow-danger transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400 font-semibold">Losses</span>
                    <XCircle size={24} className="text-danger" />
                  </div>
                  <div className="text-3xl font-black text-white mb-1">{userStats.losses}</div>
                  <div className="text-xs text-danger font-semibold">
                    {userStats.totalBets > 0 ? `${((userStats.losses / userStats.totalBets) * 100).toFixed(0)}% Loss Rate` : 'Clean slate'}
                  </div>
                </div>

                <div className="bg-dark-800 border border-primary/30 p-5 rounded-xl hover:border-primary hover:glow-primary transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400 font-semibold">Total Bets</span>
                    <DollarSign size={24} className="text-primary" />
                  </div>
                  <div className="text-3xl font-black text-white">{userStats.totalBets}</div>
                </div>

                <div className="bg-dark-800 border border-secondary/30 p-5 rounded-xl hover:border-secondary hover:glow-secondary transition-all duration-300 cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400 font-semibold">Streak</span>
                    <Clock size={24} className="text-secondary" />
                  </div>
                  <div className="text-3xl font-black text-white flex items-center gap-2">
                    {userStats.streak} <TrendingUp size={20} className="text-secondary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex border-b border-dark-600 mb-8 overflow-x-auto" role="tablist" aria-label="Main navigation">
          {(isConnected ? [
            { key: 'markets', label: 'All Markets', icon: Target },
            { key: 'myBets', label: `My Bets (${userBets.length})`, icon: BarChart3 },
            { key: 'leaderboard', label: 'Leaderboard', icon: Trophy }
          ] : [
            { key: 'markets', label: 'All Markets', icon: Target },
            { key: 'leaderboard', label: 'Leaderboard', icon: Trophy }
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCurrentView(key)}
              className={`py-3 px-6 text-lg font-semibold transition-all duration-300 flex items-center gap-2 relative ${
                currentView === key ? 'text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white hover:bg-primary/5'
              }`}
              role="tab"
              aria-selected={currentView === key}
              aria-controls={`${key}-panel`}
              id={`${key}-tab`}
            >
              <Icon size={20} className={currentView === key ? 'text-primary' : 'text-neutral-500'} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        {!isConnected && (
          <div className="bg-gradient-to-r from-primary/10 to-success/10 border-2 border-primary rounded-2xl p-8 mb-8 text-center relative overflow-hidden glow-primary animate-in slide-in-from-top-4">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-success/5 animate-pulse-slow"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse-slow">
                <Wallet size={32} className="text-primary" />
              </div>
              <h3 className="text-3xl font-black text-white mb-3">Ready to start winning?</h3>
              <p className="text-lg text-neutral-300 mb-6 max-w-2xl mx-auto">
                Connect your wallet to place bets, track your performance, and join the action
              </p>
              <div className="flex justify-center"><ConnectButton /></div>
            </div>
          </div>
        )}

        {(!isConnected || currentView === 'markets') && (
          <section id="markets-panel" role="tabpanel" aria-labelledby="markets-tab">
            {!isLoadingMarkets && (markets || []).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    Active Markets
                    {searchQuery !== debouncedSearchQuery && (
                      <span className="text-sm text-neutral-400 search-loading flex items-center gap-2">
                        <Clock size={16} /> Searching...
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2" role="group" aria-label="Filter markets by asset">

                    <span className="text-sm text-neutral-400 mr-2">Filter by:</span>
                    {['ALL', 'BTC', 'ETH', 'SOL'].map((asset) => {
                      const now = Date.now();
                      const safeMarkets = markets || [];
                      const activeMarkets = safeMarkets.filter(m => !m.resolved && Number(m.endTime) * 1000 > now);

                      const count = asset === 'ALL' ? activeMarkets.length : activeMarkets.filter(m => m.asset === asset).length;
                      return (
                        <button
                          key={asset}
                          onClick={() => setSelectedAssetFilter(asset)}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                            selectedAssetFilter === asset ? 'bg-primary text-dark-950 scale-105 glow-primary' : 'bg-dark-800 border-2 border-dark-600 text-neutral-400 hover:border-primary hover:text-white'
                          }`}
                          aria-pressed={selectedAssetFilter === asset}
                          aria-label={`Filter by ${asset} (${count} markets)`}
                        >
                          {asset === 'BTC' && '₿'}{asset === 'ETH' && 'Ξ'}{asset === 'SOL' && '◎'}{asset === 'ALL' && '🌐'}
                          <span>{asset}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${selectedAssetFilter === asset ? 'bg-dark-950/30' : 'bg-dark-700'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {isLoadingMarkets && (markets || []).length === 0 && (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MarketCardSkeleton /><MarketCardSkeleton /><MarketCardSkeleton />
              </div>
            )}

            {(() => {
              const now = Date.now();
              const safeMarkets = markets || [];
              const currentLiveMarkets = safeMarkets.filter(m => !m.resolved && Number(m.endTime) > now);
              const currentExpiredMarkets = safeMarkets.filter(m => !m.resolved && Number(m.endTime) <= now);


              let filteredMarkets = selectedAssetFilter === 'ALL' ? currentLiveMarkets : currentLiveMarkets.filter(m => m.asset === selectedAssetFilter);

              if (debouncedSearchQuery.trim()) {
                const query = debouncedSearchQuery.toLowerCase();
                filteredMarkets = filteredMarkets.filter(m =>
                  m.asset.toLowerCase().includes(query) ||
                  getMarketLabel(m.marketType, m.asset).toLowerCase().includes(query)
                );
              }

              if (!isLoadingMarkets && currentLiveMarkets.length === 0) return <EmptyState isConnected={isConnected} variant="empty" />;

              if (!isLoadingMarkets && filteredMarkets.length === 0) return <div className="flex flex-col items-center justify-center h-64 bg-dark-800 rounded-2xl border-2 border-dark-600"><AlertTriangle size={48} className="text-primary mb-4" /><p className="text-xl text-neutral-400">No markets available</p></div>;

              return filteredMarkets.length >= VIRTUAL_SCROLL.MIN_ITEMS_FOR_VIRTUALIZATION ? (
                <VirtualMarketList
                  markets={filteredMarkets}
                  isOwner={isOwner}
                  address={address}
                  usdcBalance={usdcBalanceNum}
                  onBetClick={handleBetClick}
                  onResolve={handleResolve}
                  onShare={handleOpenShareModal}
                  onOpenAdmin={handleOpenAdminPanel}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Active markets">
                  {filteredMarkets.map((market, index) => (
                    <MarketCard
                      key={Number(market.id)}
                      market={market}
                      isOwner={isOwner}
                      address={address}
                      usdcBalance={usdcBalanceNum}
                      onBetClick={handleBetClick}
                      onResolve={handleResolve}
                      onShare={() => handleOpenShareModal(market)}
                      onOpenAdmin={handleOpenAdminPanel}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      index={index}
                    />
                  ))}
                </div>
              );


            })()}
          </section>
        )}

        {isConnected && currentView === 'myBets' && (
          <section id="myBets-panel" role="tabpanel" aria-labelledby="myBets-tab" className="animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold mb-6 text-primary">My Bets</h2>
            <div className="flex border-b border-dark-600 mb-6 overflow-x-auto" role="tablist" aria-label="Bet categories">
              {[{ key: 'ongoing', label: 'Ongoing Markets', icon: Clock }, { key: 'wins', label: 'Wins', icon: Trophy }, { key: 'losses', label: 'Losses', icon: XCircle }].map(({ key, label, icon: Icon }) => (
                <button 
                  key={key} 
                  onClick={() => setBetView(key)} 
                  className={`py-3 px-6 text-lg font-semibold transition-all duration-300 flex items-center gap-2 relative ${betView === key ? 'text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white hover:bg-primary/5'}`}
                  role="tab"
                  aria-selected={betView === key}
                  aria-controls={`${key}-bets-panel`}
                  id={`${key}-bets-tab`}
                >
                  <Icon size={20} className={betView === key ? 'text-primary' : 'text-neutral-500'} aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-4" role="list" aria-label={`${betView} bets`}>
              {(() => {
                const filteredBets = userBets.filter(bet => {
                  const market = bet.market;
                  if (!market) return false;
                  if (betView === 'ongoing') return !market.resolved;
                  if (betView === 'wins') return market.resolved && (bet.claimed || bet.isClaimableConfirmed);
                  if (betView === 'losses') return market.resolved && !bet.claimed && !bet.isClaimableConfirmed;
                  return true;
                });
                if (filteredBets.length === 0) return <div className="flex flex-col items-center justify-center h-48 bg-dark-800 rounded-xl text-neutral-400" role="status" aria-live="polite"><BarChart3 size={32} aria-hidden="true" /><p className="mt-3 text-lg">No bets found</p></div>;
                return filteredBets.map(renderUserBet);
              })()}
            </div>
          </section>
        )}

        {currentView === 'leaderboard' && (
          <section id="leaderboard-panel" role="tabpanel" aria-labelledby="leaderboard-tab" className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Trophy size={32} className="text-secondary" aria-hidden="true" />Top Predictors</h2>
              <button disabled className="flex items-center gap-2 px-4 py-2 bg-dark-700 border-2 border-dark-600 rounded-xl transition-all opacity-50 cursor-not-allowed" aria-label="Refresh leaderboard (disabled)">
                <RefreshCw size={16} aria-hidden="true" /> Refresh
              </button>
            </div>
            <LeaderboardView data={[]} isLoading={false} currentUserAddress={address} />
          </section>
        )}
      </main>

      {selectedBet && (
        <BetModal
          isOpen={!!selectedBet}
          onClose={() => setSelectedBet(null)}
          market={selectedBet.market}
          usdcBalance={usdcBalanceNum}
          formattedUsdcBalance={formattedUsdcBalance}
          usdcBalanceNum={usdcBalanceNum}
        />
      )}


      {showAdminPanel && <AdminPanel isOpen={showAdminPanel} onClose={handleCloseAdminPanel} />}


      <AddFundsModal 
        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
        network={chain?.name || 'Base Sepolia'} 
        address={address}
        formattedUsdcBalance={formattedUsdcBalance}
        usdcBalanceNum={usdcBalanceNum}
      />

      <ShareModal market={shareModalData} isOpen={!!shareModalData} onClose={() => setShareModalData(null)} />
      <NotificationSettings isOpen={showNotificationSettings} onClose={() => setShowNotificationSettings(false)} enabled={notificationsEnabled} onToggle={enableNotifications} permission={notificationPermission} />
      <PointsHistoryModal isOpen={showPointsHistory} onClose={() => setShowPointsHistory(false)} walletAddress={address} />
      {!showLanding && <Footer />}
    </div>
  );
};

export default App;
