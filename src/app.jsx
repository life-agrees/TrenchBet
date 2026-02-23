import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import {
  TrendingUp, Clock, DollarSign, Wallet, Trophy,
  Target, BarChart3, Settings, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Loader2
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
import NotificationCenter from './components/NotificationCenter';
import ReferralDashboard from './components/ReferralDashboard';
import AchievementsPage from './components/AchievementsPage';
import AirdropClaimModal from './components/AirdropClaimModal';
import MarketCard from './components/MarketCard';
import BetModal from './components/BetModal';
import VirtualMarketList from './components/VirtualMarketList';
import { PREDICTION_MARKET_ABI } from './contracts/abis';
import { sdk } from '@farcaster/miniapp-sdk';
import LandingPage from './LandingPage';
import EmptyState from './components/EmptyState';
import { calculateMarketPercentages, formatOddsDisplay } from './marketUtils';

// Custom hooks
import { useMarkets } from './hooks/useMarkets';
import { useUserBets } from './hooks/useUserBets';
import { useEnhancedNotifications } from './hooks/useEnhancedNotifications';
import { useUserStats } from './hooks/useUserStats';
import { useReferrals } from './hooks/useReferrals';
import { useAchievements } from './hooks/useAchievements';
import { useBetCredits } from './hooks/useBetCredits';
import { useFirstBetInsurance } from './hooks/useFirstBetInsurance';
import { useBetPlacement } from './hooks/useBetPlacement';
import { useAdminOwner } from './hooks/useAdminOwner';
import { useBalance } from './hooks/useBalance';
import { useDebounce } from './hooks/useDebounce';
import { usePrefetchMarket } from './hooks/usePrefetchMarket';
import { useCurrentPrices } from './hooks/useCurrentPrice';
import { useFavorites } from './hooks/useFavorites';
import { trackBetPlaced } from './services/analyticsService';

// Skeleton components
import { MarketCardSkeleton } from './components/SkeletonLoader';

// Constants and logger
import { DURATIONS, VIRTUAL_SCROLL } from './utils/constants';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

// = UTILITY FUNCTIONS =

const getMarketLabel = (marketType, asset) => {
  const typeMap = {
    0: 'Binary UP/DOWN',
    1: 'Multi-Choice',
    2: 'Range Market',
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

// ==================== MAIN COMPONENT ====================
const App = () => {
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Custom hooks - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { markets, liveMarkets, isLoading: isLoadingMarkets, refresh: refreshMarkets, forceRefresh } = useMarkets();

  // Handle market creation callback to refresh markets
  const handleMarketCreated = useCallback(() => {
    console.log('🔄 Market created - refreshing markets...');
    forceRefresh();
  }, [forceRefresh]);

  const { userBets, ongoingBets, pendingBets, wonBets, lostBets, isLoading: isLoadingUserBets, error: userBetsError, refresh: refreshUserBets } = useUserBets(address, markets);
  const { enabled: notificationsEnabled, showNotification, isSupported: notificationsSupported, notificationCenter, unreadCount, markAsRead, markAllAsRead } = useEnhancedNotifications();
  const userStats = useUserStats(userBets, wonBets, lostBets, pendingBets);
  const { stats: referralStats, generateReferralCode, shareReferral } = useReferrals();
  const { achievements, checkAchievements, shareAchievement } = useAchievements();
  const { credits: betCredits, placeBetWithCredits } = useBetCredits();
  const { insuranceStatus, claimInsurance } = useFirstBetInsurance();



  const { placeBet, isSuccess, hash, lastBetRef, reset: resetBetPlacement } = useBetPlacement();
  const { isOwner } = useAdminOwner(CONTRACTS.PREDICTION_MARKET_CORE, CONTRACTS.PREDICTION_MARKET_TYPES);
  
  // Debug admin status
  console.log('[App] Admin status:', { isOwner, core: CONTRACTS.PREDICTION_MARKET_CORE, types: CONTRACTS.PREDICTION_MARKET_TYPES });

  const { formattedUsdcBalance, usdcBalanceNum, isLoading: isLoadingBalance } = useBalance();

  const { handleMouseEnter, handleMouseLeave } = usePrefetchMarket();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Fetch current prices for all assets
  const { prices: currentPrices, isLoading: isPricesLoading } = useCurrentPrices(['BTC', 'ETH', 'SOL']);

  // Sort markets function
  const sortMarkets = (markets) => {
    switch (sortBy) {
      case 'endingSoon':
        return [...markets].sort((a, b) => a.endTime - b.endTime);
      case 'mostActive':
        return [...markets].sort((a, b) => (b.totalBets || 0) - (a.totalBets || 0));
      case 'highestPool':
        const getPool = (m) => (m.yesPool || 0) + (m.noPool || 0);
        return [...markets].sort((a, b) => getPool(b) - getPool(a));
      default:
        return markets;
    }
  };


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
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showReferralDashboard, setShowReferralDashboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showAirdropModal, setShowAirdropModal] = useState(false);

  const [sortBy, setSortBy] = useState('endingSoon');


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
    
    // Track the action
    trackBetPlaced(market.id, defaultBet, choiceLabel, multiplier);
  }, []);


  const handleBetPlaced = useCallback(() => {
    setTimeout(() => {
      refreshMarkets();
      refreshUserBets();
    }, 1000);
  }, [refreshMarkets, refreshUserBets]);

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
    
    // Determine if this bet was a win or loss based on market outcome
    let isWin = false;
    let isLoss = false;
    if (market && market.resolved) {
      if (market.marketType === 0) { // Binary
        const predictedUp = bet.choice === 1;
        isWin = predictedUp === market.priceWentUp;
        isLoss = !isWin;
      } else if (market.marketType === 1) { // Multi-choice
        isWin = bet.choice === market.winningChoice;
        isLoss = !isWin;
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
        choice: bet.choice
      });
      oddsDisplay = oddsData.text;
    }

    return (
      <div key={bet.txHash} className={`bg-dark-800 p-4 rounded-xl shadow-md flex justify-between items-center transition-all duration-300 ${claimed && isWin ? 'opacity-70' : ''}`}>
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
          ) : isWin && canClaim ? (
            <button onClick={() => handleClaim(market.id)} className="bg-secondary hover:bg-secondary-500 text-neutral-900 font-bold py-2 px-4 rounded-lg flex items-center gap-1 text-sm">
              <Trophy size={16} /> Claim Winnings
            </button>
          ) : isWin && claimed ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-success text-white flex items-center gap-1"><CheckCircle size={14} /> Claimed</span>
          ) : isLoss ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white flex items-center gap-1"><XCircle size={14} /> Lost</span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-neutral-500 text-white flex items-center gap-1">Unknown</span>
          )}
        </div>
      </div>
    );
  };


  // Render loading state for user bets
  const renderUserBetsLoading = () => (
    <div className="flex flex-col items-center justify-center h-48 bg-dark-800 rounded-xl">
      <Loader2 className="animate-spin text-primary mb-3" size={32} />
      <p className="text-neutral-400">Loading your bets...</p>
    </div>
  );

  // Render error state for user bets
  const renderUserBetsError = () => (
    <div className="flex flex-col items-center justify-center h-48 bg-dark-800 rounded-xl border border-red-500/30">
      <AlertTriangle className="text-red-500 mb-3" size={32} />
      <p className="text-red-400 mb-2">Failed to load bets</p>
      <p className="text-sm text-neutral-500 mb-3">{userBetsError}</p>
      <button 
        onClick={() => refreshUserBets()}
        className="px-4 py-2 bg-primary hover:bg-primary-400 text-dark-950 font-bold rounded-lg flex items-center gap-2 transition-all"
      >
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );

  // Render empty state for user bets
  const renderUserBetsEmpty = (message) => (
    <div className="flex flex-col items-center justify-center h-48 bg-dark-800 rounded-xl text-neutral-400" role="status" aria-live="polite">
      <BarChart3 size={32} aria-hidden="true" className="mb-3 opacity-50" />
      <p className="text-lg">{message}</p>
      <p className="text-sm text-neutral-500 mt-2">Place a bet to see it here</p>
    </div>
  );

  // Get filtered bets based on current view
  const getFilteredBets = useCallback(() => {
    switch (betView) {
      case 'ongoing':
        return ongoingBets;
      case 'pending':
        return pendingBets;
      case 'wins':
        return wonBets;
      case 'losses':
        return lostBets;
      default:
        return userBets;
    }
  }, [betView, ongoingBets, pendingBets, wonBets, lostBets, userBets]);


  // ==== MAIN RENDER ====
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
                console.log('[App] Admin button clicked, opening panel');
                setShowAdminPanel(true);
              }}
              className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-secondary transition-all hover:scale-110 active:scale-95 cursor-pointer relative group"
              title="Open Admin Panel"
            >
              <Settings size={20} className="text-secondary group-hover:rotate-90 transition-transform duration-300" />
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-dark-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Admin
              </span>
            </button>
          )}
          {!isOwner && console.log('[App] Not showing admin button, isOwner is false')}

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
                  {userStats.pending > 0 && (
                    <div className="text-xs text-yellow-400 font-semibold mt-1">
                      {userStats.pending} pending
                    </div>
                  )}
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
            >
              <Icon size={20} className={currentView === key ? 'text-primary' : 'text-neutral-500'} />
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
                  <div className="flex items-center gap-4">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-400">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-dark-800 border-2 border-dark-600 rounded-xl text-sm text-white focus:border-primary focus:outline-none cursor-pointer"
                      >
                        <option value="endingSoon">Ending Soon</option>
                        <option value="mostActive">Most Active</option>
                        <option value="highestPool">Highest Pool</option>
                      </select>
                    </div>
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
              let filteredMarkets = selectedAssetFilter === 'ALL' ? currentLiveMarkets : currentLiveMarkets.filter(m => m.asset === selectedAssetFilter);

              if (debouncedSearchQuery.trim()) {
                const query = debouncedSearchQuery.toLowerCase();
                filteredMarkets = filteredMarkets.filter(m =>
                  m.asset.toLowerCase().includes(query) ||
                  getMarketLabel(m.marketType, m.asset).toLowerCase().includes(query)
                );
              }

              // Apply sorting
              const sortedMarkets = sortMarkets(filteredMarkets);


              if (!isLoadingMarkets && currentLiveMarkets.length === 0) return <EmptyState isConnected={isConnected} variant="empty" />;
              if (!isLoadingMarkets && sortedMarkets.length === 0) return <div className="flex flex-col items-center justify-center h-64 bg-dark-800 rounded-2xl border-2 border-dark-600"><AlertTriangle size={48} className="text-primary mb-4" /><p className="text-xl text-neutral-400">No markets available</p></div>;

              return sortedMarkets.length >= VIRTUAL_SCROLL.MIN_ITEMS_FOR_VIRTUALIZATION ? (
                <VirtualMarketList
                  markets={sortedMarkets}
                  currentPrices={currentPrices}
                  onBetClick={handleBetClick}
                  usdcBalance={usdcBalanceNum}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                />


              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Active markets">
                  {sortedMarkets.map((market, index) => (
                    <MarketCard
                      key={Number(market.id)}
                      market={market}
                      currentPrice={currentPrices[market.asset]}
                      onClick={() => handleOpenShareModal(market)}
                      onBetClick={handleBetClick}
                      usdcBalance={usdcBalanceNum}
                      isLoading={false}
                      isPlacingBet={false}
                      isFavorite={isFavorite(market.id)}
                      onToggleFavorite={() => toggleFavorite(market.id)}
                    />
                  ))}
                </div>


              );
            })()}
          </section>
        )}

        {isConnected && currentView === 'myBets' && (
          <section id="myBets-panel" role="tabpanel" aria-labelledby="myBets-tab" className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-primary">My Bets</h2>
              <button 
                onClick={() => refreshUserBets()}
                disabled={isLoadingUserBets}
                className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoadingUserBets ? 'animate-spin' : ''} /> 
                {isLoadingUserBets ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="flex border-b border-dark-600 mb-6 overflow-x-auto" role="tablist" aria-label="Bet categories">
              {[{ key: 'ongoing', label: `Ongoing (${ongoingBets.length})`, icon: Clock }, { key: 'pending', label: `Pending (${pendingBets.length})`, icon: AlertTriangle, hidden: pendingBets.length === 0 }, { key: 'wins', label: `Wins (${wonBets.length})`, icon: Trophy }, { key: 'losses', label: `Losses (${lostBets.length})`, icon: XCircle }].filter(item => !item.hidden).map(({ key, label, icon: Icon }) => (
                <button 
                  key={key} 
                  onClick={() => setBetView(key)} 
                  className={`py-3 px-6 text-lg font-semibold transition-all duration-300 flex items-center gap-2 relative ${betView === key ? 'text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white hover:bg-primary/5'}`}
                  role="tab"
                  aria-selected={betView === key}
                >
                  <Icon size={20} className={betView === key ? 'text-primary' : 'text-neutral-500'} />{label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4" role="list" aria-label={`${betView} bets`}>
              {isLoadingUserBets ? (
                renderUserBetsLoading()
              ) : userBetsError ? (
                renderUserBetsError()
              ) : (() => {
                const filteredBets = getFilteredBets();
                if (filteredBets.length === 0) {
                  return renderUserBetsEmpty(`No ${betView} bets found`);
                }
                return filteredBets.map(renderUserBet);
              })()}
            </div>
          </section>
        )}

        {currentView === 'leaderboard' && (
          <section id="leaderboard-panel" role="tabpanel" aria-labelledby="leaderboard-tab" className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-primary flex items-center gap-3"><Trophy size={32} className="text-secondary" />Top Predictors</h2>
              <button disabled className="flex items-center gap-2 px-4 py-2 bg-dark-700 border-2 border-dark-600 rounded-xl transition-all opacity-50 cursor-not-allowed">
                <RefreshCw size={16} /> Refresh
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
          onBetPlaced={handleBetPlaced}
        />
      )}

      {showAdminPanel && (
        <AdminPanel 
          isOpen={showAdminPanel} 
          onClose={handleCloseAdminPanel}
          onMarketCreated={forceRefresh}
        />
      )}


      
      <NotificationCenter 
        isOpen={showNotificationCenter} 
        onClose={() => setShowNotificationCenter(false)}
        notifications={notificationCenter}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
      
      <ReferralDashboard 
        isOpen={showReferralDashboard} 
        onClose={() => setShowReferralDashboard(false)}
        stats={referralStats}
        onShare={shareReferral}
      />
      
      <AchievementsPage 
        isOpen={showAchievements} 
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
        onShare={shareAchievement}
      />
      
      <AirdropClaimModal 
        isOpen={showAirdropModal} 
        onClose={() => setShowAirdropModal(false)}
      />

      <AddFundsModal 

        isOpen={showAddFundsModal} 
        onClose={() => setShowAddFundsModal(false)} 
        network={chain?.name || 'Base Sepolia'} 
        address={address}
        formattedUsdcBalance={formattedUsdcBalance}
        usdcBalanceNum={usdcBalanceNum}
      />

      <ShareModal market={shareModalData} isOpen={!!shareModalData} onClose={() => setShareModalData(null)} />
      <NotificationSettings isOpen={showNotificationSettings} onClose={() => setShowNotificationSettings(false)} enabled={notificationsEnabled} onToggle={() => {}} permission="default" />
      <PointsHistoryModal isOpen={showPointsHistory} onClose={() => setShowPointsHistory(false)} walletAddress={address} />
      {!showLanding && <Footer />}
    </div>
  );
};

export default App;
