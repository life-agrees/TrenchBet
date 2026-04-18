import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import {
  TrendingUp, Clock, DollarSign, Wallet, Trophy, Star,
  Target, BarChart3, Settings, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Loader2,
  Zap  // FIX 1: Added missing Zap import (was crashing the Streaks view)
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
import ErrorBoundary from './components/ErrorBoundary';
import { PREDICTION_MARKET_PROXY_ABI } from './contracts/proxyAbi';
import { sdk } from '@farcaster/miniapp-sdk';
import LandingPage from './LandingPage';
import EmptyState from './components/EmptyState';
import { calculateMarketPercentages, formatOddsDisplay } from './marketUtils';

// New Layout & Dashboard Components
import MainLayout from './components/Layout/MainLayout';
import DashboardView from './components/Dashboard/DashboardView';

// Custom hooks
import { useMarkets } from './hooks/useMarkets';
import { useUserBets } from './hooks/useUserBets';
import { useEnhancedNotifications } from './hooks/useEnhancedNotifications';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications.jsx';
import { useUserStats } from './hooks/useUserStats';
import { useReferrals } from './hooks/useReferrals';
import { useAchievements } from './hooks/useAchievements';
import { useBetPlacement } from './hooks/useBetPlacement';
import { useAdminOwner } from './hooks/useAdminOwner';
import { useBalance } from './hooks/useBalance';
import { usePointsData } from './hooks/usePointsData';
import { useDebounce } from './hooks/useDebounce';
import { useCurrentPrices } from './hooks/useCurrentPrice';
import { useFavorites } from './hooks/useFavorites';
import { useUserPreferences } from './hooks/useUserPreferences';
import { useLeaderboard } from './hooks/useLeaderboard';
import { trackBetPlaced } from './services/analyticsService';

// Skeleton components
import { MarketCardSkeleton } from './components/SkeletonLoader';

// Constants and logger
import { DURATIONS, VIRTUAL_SCROLL } from './utils/constants';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

const VOUCHERS_CONTRACT_ADDRESS = "0x0FcdB56b713a12a6C11Efa33d6DE1CAA1947294c";

// ── Utility functions ──────────────────────────────────────────────────────

const getMarketLabel = (marketType, asset) => {
  const typeMap = { 0: 'Binary UP/DOWN', 1: 'Multi-Choice', 2: 'Range Market' };
  return `${asset} - ${typeMap[marketType] || 'Unknown Market'}`;
};

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

// ── Main component ─────────────────────────────────────────────────────────

const App = () => {
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // ── All hooks — must be called before any conditional returns ──
  const { markets, liveMarkets, isLoading: isLoadingMarkets, refresh: refreshMarkets, immediateRefresh, forceRefresh } = useMarkets();

const handleMarketCreated = useCallback(() => {
  forceRefresh();
  setTimeout(() => forceRefresh(), 3000);
  setTimeout(() => forceRefresh(), 8000);
}, [forceRefresh]);

  const {
    userBets, ongoingBets, pendingBets, wonBets, lostBets,
    isLoading: isLoadingUserBets, error: userBetsError, refresh: refreshUserBets
  } = useUserBets(address, markets);

const {
  enabled: notificationsEnabled,
  isSupported: notificationsSupported,
  sendNotification,
  notificationHistory,
  unreadCount, markAsRead, markAllAsRead,
  settings: notificationSettings,
  updateSettings: updateNotificationSettings,
} = useEnhancedNotifications();

  const rtNotifications = useRealtimeNotifications(address, isConnected);
  const userStats = useUserStats(userBets, wonBets, lostBets, pendingBets);

  const { stats: referralStats, shareReferral, refresh: refreshReferrals } = useReferrals();
  const { achievements, totalPoints: achievementPoints, shareAchievement, refresh: refreshAchievements } = useAchievements();

  const { placeBet, isSuccess, hash, lastBetRef, reset: resetBetPlacement } = useBetPlacement();
  const { leaderboard, isLoading: isLoadingLeaderboard } = useLeaderboard(10);
  const { isOwner } = useAdminOwner();

  const { formattedUsdcBalance, usdcBalanceNum, refetchBalance } = useBalance();
  const { pointsData, refreshPoints } = usePointsData(address);

  // Unified Points Balance: API Points + Referral Points + Achievement Points
  const unifiedPoints = useMemo(() => {
    const apiPoints = pointsData?.total_points || 0;
    const referralPoints = (referralStats?.referralEarnings || 0) * 100;
    const achPoints = achievementPoints || 0;
    return apiPoints + referralPoints + achPoints;
  }, [pointsData, referralStats, achievementPoints]);

  const { toggleFavorite, isFavorite } = useFavorites();

  const { prices: currentPrices } = useCurrentPrices(['BTC', 'ETH', 'LINK']);

  // PREDICTION_MARKET_PROXY_ABI included via proxyAbi.js (Line 30)

  // ── Achievement & Referral Wiring ──────────────────────────────────────────
  
  // Consolidate all stats needed for achievements
  const achievementStats = useMemo(() => ({
    ...userStats,
    referralCount: referralStats?.referralCount || 0,
    hasReferrer: referralStats?.hasReferrer || false,
    // Add placeholders or derived stats for other achievements
    earlyBets: 0, 
    betsInADay: 0,
    stakedDuration: 0,
    firstBettorCount: 0,
    hasClaimedAirdrop: false, 
  }), [userStats, referralStats]);

  const { registerReferral } = useReferrals();

  // Capture referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref') || params.get('referral');
    if (refCode) {
      logger.info('Referral code detected in URL:', refCode);
      sessionStorage.setItem('pending_referral_code', refCode);
    }
  }, []);

  // Auto-register referral when user connects
  useEffect(() => {
    if (isConnected && address) {
      const pendingRef = sessionStorage.getItem('pending_referral_code');
      if (pendingRef) {
        logger.info('Auto-registering pending referral:', pendingRef);
        registerReferral(pendingRef)
          .then(() => {
            sessionStorage.removeItem('pending_referral_code');
            toast.success('Referral registered!');
          })
          .catch(err => {
            logger.warn('Auto-referral failed:', err.message);
            // Don't remove so we can retry if it was just a network issue? 
            // Better to remove to avoid spamming failed calls.
            sessionStorage.removeItem('pending_referral_code');
          });
      }
    }
  }, [isConnected, address, registerReferral]);

  // FIX 4: Read sidebarCollapsed from preferences so MainLayout can apply
  // correct padding. Previously isSidebarCollapsed was never passed to MainLayout,
  // so content never adjusted when sidebar collapsed.
  const preferences = useUserPreferences(address);
  const isSidebarCollapsed = preferences?.sidebarCollapsed ?? false;

  // ── UI state ───────────────────────────────────────────────────────────────

  const [showAdminPanel, setShowAdminPanel]         = useState(false);
  const [showAddFundsModal, setShowAddFundsModal]   = useState(false);
  const [searchQuery, setSearchQuery]               = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, DURATIONS.DEBOUNCE);
  const [currentView, setCurrentView]               = useState('markets');
  const [betView, setBetView]                       = useState('ongoing');
  const [farcasterUser, setFarcasterUser]           = useState(null);
  const [betAmount, setBetAmount]                   = useState('10');
  const [selectedBet, setSelectedBet]               = useState(null);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState('ALL');
  const [shareModalData, setShareModalData]         = useState(null);
  const [showPointsHistory, setShowPointsHistory]   = useState(false);
  const [showLanding, setShowLanding]               = useState(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showAirdropModal, setShowAirdropModal]     = useState(false);
  const [sortBy, setSortBy]                         = useState('endingSoon');

  const previousAchievementsCount = useRef(0);

  // FIX 5: Track which bets have had notifications sent via a Set ref instead
  // of directly mutating bet objects from state (React state must not be mutated)
  const notifiedBetIds = useRef(new Set());

  // ── Derived data ───────────────────────────────────────────────────────────

  const liveStats = useMemo(() => {
    const activeMarkets = (liveMarkets || []).length;
    const totalVolume = (markets || []).reduce(
      (sum, m) => sum + (parseFloat(m?.yesPool || 0) + parseFloat(m?.noPool || 0)), 0
    );
    const totalBets = (markets || []).reduce(
      (sum, m) => sum + (parseInt(m?.totalBets || 0)), 0
    );
    return { activeMarkets, totalVolume: Math.round(totalVolume), totalBets };
  }, [markets, liveMarkets]);

  const sortMarkets = (marketsToSort) => {
    switch (sortBy) {
      case 'endingSoon':
        return [...marketsToSort].sort((a, b) => a.endTime - b.endTime);
      case 'mostActive':
        return [...marketsToSort].sort((a, b) => (b.totalBets || 0) - (a.totalBets || 0));
      case 'highestPool':
        return [...marketsToSort].sort((a, b) =>
          ((b.yesPool || 0) + (b.noPool || 0)) - ((a.yesPool || 0) + (a.noPool || 0))
        );
      default:
        return marketsToSort;
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    if (!isOwner) { toast.error('Admin only.'); return; }
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    let functionName = 'resolveMarket';
    let args = [BigInt(marketId)];
    if (market.marketType === 1) { 
      functionName = 'resolveMultiChoiceMarket'; 
      args = [BigInt(marketId), winningChoice]; 
    }
    else if (market.marketType === 2) { functionName = 'resolveRangeMarket'; }
    else if (market.marketType === 3) { functionName = 'resolveTimeMarket'; }

    try {
      await writeContractAsync({
        address: CONTRACTS.PROXY,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName,
        args,
      });
      toast.success('Resolution sent.');
    } catch (error) {
      toast.error(`Resolution failed: ${error.shortMessage || error.message}`);
    }
  };

  const handleClaim = async (marketId) => {
    if (!address) { toast.error('Please connect your wallet first.'); return; }
    try {
      await writeContractAsync({
        address: CONTRACTS.PROXY,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'claimWinnings',
        args: [BigInt(marketId)],
      });
      toast.success('Claim sent. Your winnings will be available shortly.');
      setTimeout(() => { refreshUserBets(); refetchBalance(); }, 2000);
    } catch (error) {
      toast.error(`Claim failed: ${error.shortMessage || error.message}`);
    }
  };

const handleClaimAdvanced = async (marketId) => {
    if (!address) { toast.error('Please connect your wallet first.'); return; }
    try {
      await writeContractAsync({
        address: CONTRACTS.PROXY,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'claimWinningsAdvanced',
        args: [BigInt(marketId)],
      });
      toast.success('Claim sent. Your winnings will be available shortly.');
      setTimeout(() => { refreshUserBets(); refetchBalance(); }, 2000);
    } catch (error) {
      toast.error(`Claim failed: ${error.shortMessage || error.message}`);
    }
  };

  const handleBetClick = useCallback((market, choiceIndex, choiceLabel, multiplier, defaultBet) => {
    setBetAmount(defaultBet?.toString() || '10');
    setSelectedBet({ market, choice: choiceIndex, choiceLabel, multiplier, yesPool: market.yesPool, noPool: market.noPool });
    trackBetPlaced(market.id, defaultBet, choiceLabel, multiplier);
  }, []);

  const handleBetPlaced = useCallback(() => {
    rtNotifications?.addNotification?.('bet_placed', {
      title: 'Bet Placed',
      description: `Your $${selectedBet?.market?.displayName || 'prediction'} bet has been placed!`,
      amount: betAmount,
    });
    setTimeout(() => {
      refreshMarkets();
      refreshUserBets();
      refetchBalance(); // ← ADD THIS
      refreshPoints();
      refreshAchievements();
      refreshReferrals();
    }, 1000);
}, [refreshMarkets, refreshUserBets, refetchBalance, refreshPoints, refreshAchievements, refreshReferrals, rtNotifications, selectedBet, betAmount]);

  const handleOpenShareModal = useCallback((market) => { setShareModalData(market); }, []);
  const handleOpenAdminPanel  = useCallback(() => { setShowAdminPanel(true); }, []);
  const handleCloseAdminPanel = useCallback(() => {
    setShowAdminPanel(false);
    refreshMarkets();
    refreshUserBets();
  }, [refreshMarkets, refreshUserBets]);

  // FIX : Added 'streaks' case so the Streaks sidebar item actually navigates
  const handleSidebarNavigation = useCallback((viewId) => {
    const viewMap = {
      dashboard:   'dashboard',
      myBets:      'myBets',
      markets:     'markets',
      leaderboard: 'leaderboard',
      referrals:   'referrals',
      achievements:'achievements',
      streaks:     'streaks',   // FIX  was missing
      admin:       'admin',
      settings:    'settings',
    };
    if (viewMap[viewId]) setCurrentView(viewMap[viewId]);
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      logger.error('Unhandled promise rejection', event.reason);
      if (event.reason?.message?.includes('503') || event.reason?.message?.includes('rate limit')) {
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
        sendNotification('✅ Bet Placed!', {
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
  }, [isSuccess, hash, refreshMarkets, refreshUserBets, notificationsEnabled, notificationsSupported, sendNotification, betAmount, resetBetPlacement]);

  // Farcaster Frame Initialization
  useEffect(() => {
    let isMounted = true;
    const initFarcaster = async () => {
      try {
        if (sdk?.actions?.ready) {
          sdk.actions.ready();
        }
        
        // Ensure graceful failure if not inside Farcaster client
        const ctx = await sdk.context;
        if (isMounted && ctx?.user) {
          setFarcasterUser(ctx.user);
          logger.info('Farcaster Context Loaded', ctx.user);
        }
      } catch (error) {
        logger.warn('Not running inside Farcaster Frame or context error', error);
      }
    };

    initFarcaster();
    return () => { isMounted = false; };
  }, []);

  // FIX 5: use notifiedBetIds ref instead of mutating bet objects
  useEffect(() => {
    if (!wonBets?.length || !rtNotifications) return;
    wonBets.forEach((bet) => {
      if (bet.market && !notifiedBetIds.current.has(`won-${bet.txHash}`)) {
        notifiedBetIds.current.add(`won-${bet.txHash}`);
        const amountNum = Number(formatUnits(bet.amount, 6));
        const payout = Number(bet.amountWon) || (amountNum * (bet.multiplier || 1.5));
        rtNotifications.notifyBetWon?.(
          `+$${payout.toFixed(2)}`,
          `${bet.multiplier || 1.5}x on ${bet.market.displayName || 'prediction'}`
        );
      }
    });
  }, [wonBets, rtNotifications]);

  useEffect(() => {
    if (!lostBets?.length || !rtNotifications) return;
    lostBets.forEach((bet) => {
      if (bet.market && !notifiedBetIds.current.has(`lost-${bet.txHash}`)) {
        notifiedBetIds.current.add(`lost-${bet.txHash}`);
        const amountNum = Number(formatUnits(bet.amount, 6));
        rtNotifications.notifyBetLost?.(
          `-$${amountNum.toFixed(2)}`,
          `${bet.market.displayName || 'prediction'}`
        );
      }
    });
  }, [lostBets, rtNotifications]);

  useEffect(() => {
    if (achievements?.length > previousAchievementsCount.current && rtNotifications) {
      const newAchievements = achievements.slice(previousAchievementsCount.current);
      newAchievements.forEach((achievement) => {
        rtNotifications.notifyAchievement?.(achievement.name, achievement.description || 'Great job!');
      });
      previousAchievementsCount.current = achievements.length;
    }
  }, [achievements, rtNotifications]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderUserBet = (bet) => {
    const market  = bet.market;
    const claimed = bet.claimed;
    const canClaim = bet.isClaimableConfirmed && !bet.claimed;

    let isWin = false;
    let isLoss = false;
if (market?.resolved) {
  if (market.marketType === 0) {
    const predictedUp = bet.choice === 1;
    isWin  = predictedUp === market.priceWentUp;
    isLoss = !isWin;
  } else if (market.marketType === 1 || 
             market.marketType === 2 || 
             market.marketType === 3) {  // ← ADD types 2 & 3
    if (market.winningChoice !== null && market.winningChoice !== undefined) {
      isWin  = Number(bet.choice) === Number(market.winningChoice);
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

    return (
      <div key={bet.txHash} className={`bg-white dark:bg-dark-800 p-4 rounded-xl shadow-md flex justify-between items-center transition-all duration-300 ${claimed && isWin ? 'opacity-70' : ''}`}>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-neutral-900 dark:text-white">{bet.marketLabel}</span>
          <span className="text-sm text-neutral-400">
            Bet on: <span className="font-semibold text-primary">{bet.choiceLabel}</span>
            {!market.resolved && oddsDisplay && (
              <span className="ml-2 text-secondary font-medium">• {oddsDisplay}</span>
            )}
          </span>
          <span className="text-sm text-neutral-400">
            Amount: <span className="font-semibold text-success">{formatUnits(bet.amount, 6)} USDC</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!market.resolved ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-neutral-900 dark:text-white">
              {getMarketTimeRemaining(market)}
            </span>
          ) : isWin && canClaim ? (
            <button onClick={() => {
  if (market.marketType === 0) {
    handleClaim(market.id);
  } else {
    handleClaimAdvanced(market.id); // ← need to add this handler
  }
}} className="bg-secondary hover:bg-secondary-500 text-neutral-900 font-bold py-2 px-4 rounded-lg flex items-center gap-1 text-sm">
              <Trophy size={16} /> Claim Winnings
            </button>
          ) : isWin && claimed ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-success text-neutral-900 dark:text-white flex items-center gap-1">
              <CheckCircle size={14} /> Claimed
            </span>
          ) : isLoss ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-neutral-900 dark:text-white flex items-center gap-1">
              <XCircle size={14} /> Lost
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-neutral-500 text-neutral-900 dark:text-white">Unknown</span>
          )}
        </div>
      </div>
    );
  };

  const renderUserBetsLoading = () => (
    <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-dark-800 rounded-xl">
      <Loader2 className="animate-spin text-primary mb-3" size={32} />
      <p className="text-neutral-400">Loading your bets...</p>
    </div>
  );

  const renderUserBetsError = () => (
    <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-dark-800 rounded-xl border border-red-500/30">
      <AlertTriangle className="text-red-500 mb-3" size={32} />
      <p className="text-red-400 mb-2">Failed to load bets</p>
      <p className="text-sm text-neutral-500 mb-3">{userBetsError}</p>
      <button
        onClick={() => refreshUserBets()}
        className="px-4 py-2 bg-primary hover:bg-primary/90 text-dark-950 font-bold rounded-lg flex items-center gap-2"
      >
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );

  const renderUserBetsEmpty = (message) => (
    <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-dark-800 rounded-xl text-neutral-400">
      <BarChart3 size={32} className="mb-3 opacity-50" />
      <p className="text-lg">{message}</p>
      <p className="text-sm text-neutral-500 mt-2">Place a bet to see it here</p>
    </div>
  );

  const getFilteredBets = useCallback(() => {
    switch (betView) {
      case 'ongoing':  return ongoingBets;
      case 'pending':  return pendingBets;
      case 'wins':     return wonBets;
      case 'losses':   return lostBets;
      default:         return userBets;
    }
  }, [betView, ongoingBets, pendingBets, wonBets, lostBets, userBets]);

  // ── Early return (after all hooks) ────────────────────────────────────────


  // ── Content renderer ───────────────────────────────────────────────────────

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return isConnected ? (
          <DashboardView
            userStats={userStats}
            userBets={userBets}
            achievements={achievements}
            isLoading={isLoadingUserBets}
            userPoints={unifiedPoints}
            onViewAchievements={() => setCurrentView('achievements')}
            onExploreMarkets={() => setCurrentView('markets')}
          />
        ) : <EmptyState isConnected={isConnected} variant="empty" />;

      case 'myBets':
        return (
          <section id="myBets-panel" role="tabpanel" className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-primary">My Bets</h2>
              <button
                onClick={() => refreshUserBets()}
                disabled={isLoadingUserBets}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-dark-700 hover:bg-neutral-200 dark:bg-dark-600 border-2 border-neutral-200 dark:border-dark-600 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoadingUserBets ? 'animate-spin' : ''} />
                {isLoadingUserBets ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="flex border-b border-neutral-200 dark:border-dark-600 mb-6 overflow-x-auto" role="tablist">
              {[
                { key: 'ongoing', label: `Ongoing (${ongoingBets.length})`,  icon: Clock },
                { key: 'pending', label: `Pending (${pendingBets.length})`,  icon: AlertTriangle, hidden: pendingBets.length === 0 },
                { key: 'wins',    label: `Wins (${wonBets.length})`,         icon: Trophy },
                { key: 'losses',  label: `Losses (${lostBets.length})`,      icon: XCircle },
              ].filter(item => !item.hidden).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setBetView(key)}
                  className={`py-3 px-6 text-lg font-semibold transition-all flex items-center gap-2 ${
                    betView === key ? 'text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-neutral-900 dark:text-white hover:bg-primary/5'
                  }`}
                >
                  <Icon size={20} className={betView === key ? 'text-primary' : 'text-neutral-500'} />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {isLoadingUserBets ? renderUserBetsLoading()
               : userBetsError ? renderUserBetsError()
               : (() => {
                  const filteredBets = getFilteredBets();
                  if (filteredBets.length === 0) return renderUserBetsEmpty(`No ${betView} bets found`);
                  return filteredBets.map(renderUserBet);
                })()}
            </div>
          </section>
        );

      case 'leaderboard':
        return (
          <section id="leaderboard-panel" role="tabpanel" className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
                <Trophy size={32} className="text-secondary" /> Top Predictors
              </h2>
            </div>
<LeaderboardView data={leaderboard} isLoading={isLoadingLeaderboard} currentUserAddress={address} />
          </section>
        );

      case 'achievements':
        return isConnected
          ? <AchievementsPage isOpen achievements={achievements} stats={achievementStats} onClose={() => setCurrentView('dashboard')} onShare={shareAchievement} />
          : <EmptyState isConnected={isConnected} variant="empty" />;

      case 'referrals':
        return isConnected
          ? <ReferralDashboard isOpen stats={referralStats} onClose={() => setCurrentView('dashboard')} onShare={shareReferral} />
          : <EmptyState isConnected={isConnected} variant="empty" />;

      case 'admin':
        return isOwner
? <AdminPanel 
  isOpen={true}
  onClose={() => setCurrentView('markets')}
  onMarketCreated={handleMarketCreated}
  vouchersContractAddress={VOUCHERS_CONTRACT_ADDRESS}
/>
          : <EmptyState isConnected={isConnected} variant="empty" />;

      case 'settings':
        return (
          <NotificationSettings
            isOpen
            onClose={() => setCurrentView('dashboard')}
            settings={notificationSettings}
            onUpdateSettings={updateNotificationSettings}
          />
        );

      // FIX 2: Streaks view now reachable via handleSidebarNavigation
      case 'streaks':
        return isConnected ? (
          <section id="streaks-panel" className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
                <Zap size={32} className="text-yellow-400" /> Your Streaks
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-dark-800 border-2 border-yellow-400/30 rounded-2xl p-6 hover:border-yellow-400/60 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                    <Zap size={24} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Current Streak</p>
                    <p className="text-3xl font-black text-yellow-400">0</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-400">Win consecutive bets to build your streak</p>
              </div>
              <div className="bg-white dark:bg-dark-800 border-2 border-yellow-400/20 rounded-2xl p-6 hover:border-yellow-400/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                    <Trophy size={24} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Best Streak</p>
                    <p className="text-3xl font-black text-yellow-400">0</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-400">Your personal best streak record</p>
              </div>
              <div className="bg-white dark:bg-dark-800 border-2 border-yellow-400/20 rounded-2xl p-6 hover:border-yellow-400/40 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                    <Clock size={24} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Status</p>
                    <p className="text-lg font-bold text-neutral-300">Not Active</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-400">Start betting to activate your streak</p>
              </div>
            </div>
          </section>
        ) : <EmptyState isConnected={isConnected} variant="empty" />;

      case 'markets':
      default:
        return (
          <section id="markets-panel" role="tabpanel">

            {!isLoadingMarkets && (markets || []).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                    Active Markets
                    {searchQuery !== debouncedSearchQuery && (
                      <span className="text-sm text-neutral-400 flex items-center gap-2">
                        <Clock size={16} /> Searching...
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-400">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-dark-800 border-2 border-neutral-200 dark:border-dark-600 rounded-xl text-sm text-neutral-900 dark:text-white focus:border-primary focus:outline-none cursor-pointer"
                      >
                        <option value="endingSoon">Ending Soon</option>
                        <option value="mostActive">Most Active</option>
                        <option value="highestPool">Highest Pool</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2" role="group">
                      <span className="text-sm text-neutral-400 mr-2">Filter by:</span>
                      {['ALL', 'BTC', 'ETH', 'LINK'].map((asset) => {
                        // FIXED: Use liveMarkets from hook (already filtered for active)
                        const activeMarkets = liveMarkets || [];
                        const count = asset === 'ALL' ? activeMarkets.length : activeMarkets.filter(m => m.asset === asset).length;
                        return (
                          <button
                            key={asset}
                            onClick={() => setSelectedAssetFilter(asset)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                              selectedAssetFilter === asset
                                ? 'bg-primary text-dark-950 scale-105'
                                : 'bg-white dark:bg-dark-800 border-2 border-neutral-200 dark:border-dark-600 text-neutral-400 hover:border-primary hover:text-neutral-900 dark:text-white'
                            }`}
                          >
                            {asset === 'BTC' && '₿'}{asset === 'ETH' && 'Ξ'}
                            {asset === 'SOL' && '◎'}{asset === 'ALL' && '🌐'}
                            <span>{asset}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedAssetFilter === asset ? 'bg-white dark:bg-dark-950/30' : 'bg-neutral-100 dark:bg-dark-700'}`}>
                              {count}
                            </span>
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
              const currentLiveMarkets = liveMarkets || [];
              let filteredMarkets = selectedAssetFilter === 'ALL'
                ? currentLiveMarkets
                : currentLiveMarkets.filter(m => m.asset === selectedAssetFilter);

              if (debouncedSearchQuery.trim()) {
                const query = debouncedSearchQuery.toLowerCase();
                filteredMarkets = filteredMarkets.filter(m => m.title.toLowerCase().includes(query));
              }

              const sortedMarkets = [...filteredMarkets].sort((a, b) => {
                if (sortBy === 'endingSoon') return Number(a.endTime) - Number(b.endTime);
                if (sortBy === 'highestPool') return Number(b.poolSize) - Number(a.poolSize);
                return 0;
              });

              const pinned = sortedMarkets.filter(m => isFavorite(m.id));
              const rest = sortedMarkets.filter(m => !isFavorite(m.id));

              if (!isLoadingMarkets && currentLiveMarkets.length === 0) return <EmptyState isConnected={isConnected} variant="empty" />;
              if (!isLoadingMarkets && sortedMarkets.length === 0) return (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-800 rounded-2xl border-2 border-neutral-200 dark:border-dark-600">
                  <AlertTriangle size={48} className="text-primary mb-4" />
                  <p className="text-xl text-neutral-400">No markets available</p>
                </div>
              );

              return (
                <div className="space-y-6">
                  {pinned.length > 0 && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-400/20 rounded-3xl">
                      <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                        ⭐ Pinned ({pinned.length})
                        <button onClick={() => {/* clear all? */}} className="ml-auto text-xs text-yellow-300 hover:text-yellow-200">Clear</button>
                      </h3>
                      {pinned.length >= VIRTUAL_SCROLL.MIN_ITEMS_FOR_VIRTUALIZATION ? (
                        <ErrorBoundary variant="inline">
                          <VirtualMarketList markets={pinned} currentPrices={currentPrices} onBetClick={handleBetClick} usdcBalance={usdcBalanceNum} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} pinned />
                        </ErrorBoundary>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {pinned.map(market => (
                            <ErrorBoundary variant="inline" key={Number(market.id) + "-eb"}>
                              <MarketCard key={Number(market.id)} market={market} currentPrice={currentPrices[market.asset]} onClick={() => handleOpenShareModal(market)} onBetClick={handleBetClick} usdcBalance={usdcBalanceNum} isFavorite={isFavorite(market.id)} onToggleFavorite={() => toggleFavorite(market.id)} pinned />
                            </ErrorBoundary>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {pinned.length > 0 && rest.length > 0 && (
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-dark-600 to-transparent my-8"></div>
                  )}
                  {rest.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500">
                      <Star size={48} className="mx-auto mb-4 opacity-30 text-yellow-400" />
                      <p>No unpinned markets. ⭐ Favorite some to keep them at top!</p>
                    </div>
                  ) : rest.length >= VIRTUAL_SCROLL.MIN_ITEMS_FOR_VIRTUALIZATION ? (
                    <ErrorBoundary variant="inline">
                      <VirtualMarketList
                        markets={rest}
                        currentPrices={currentPrices}
                        onBetClick={handleBetClick}
                        usdcBalance={usdcBalanceNum}
                        isFavorite={isFavorite}
                        onToggleFavorite={toggleFavorite}
                      />
                    </ErrorBoundary>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
                      {rest.map((market) => (
                        <ErrorBoundary variant="inline" key={Number(market.id) + "-eb"}>
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
                        </ErrorBoundary>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </section>
        );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const handleAddFunds = useCallback(() => setShowAddFundsModal(true), []);
  const chainName = useMemo(() => chain?.name || 'Network', [chain?.name]);

  if (showLanding && !isConnected) {
    return <LandingPage onLaunchApp={() => setShowLanding(false)} liveStats={liveStats} isLoadingStats={isLoadingMarkets} />;
  }

  return (
    <>
      <MainLayout
        currentView={currentView}
        onNavigate={handleSidebarNavigation}
        isConnected={isConnected}
        isOwner={isOwner}
        formattedUsdcBalance={formattedUsdcBalance}
        userPoints={unifiedPoints}
        onAddFunds={handleAddFunds}
        chainName={chainName}
        isSidebarCollapsed={isSidebarCollapsed}
        markets={markets}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            duration: DURATIONS.NOTIFICATION_AUTO_CLOSE,
            style: {
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid rgba(205,255,0,0.3)',
            },
            success: { iconTheme: { primary: '#00FF88', secondary: '#1a1a1a' } },
            error:   { iconTheme: { primary: '#FF4757', secondary: '#1a1a1a' } },
          }}
        />

        {renderContent()}
        
        {selectedBet && (
          <BetModal
            isOpen={!!selectedBet}
            onClose={() => setSelectedBet(null)}
            market={selectedBet.market}
            initialChoice={selectedBet.choice}
            initialChoiceLabel={selectedBet.choiceLabel}
            usdcBalance={usdcBalanceNum}
            formattedUsdcBalance={formattedUsdcBalance}
            usdcBalanceNum={usdcBalanceNum}
            userAddress={address}
            onBetPlaced={handleBetPlaced}
          />
        )}

        <NotificationCenter
          isOpen={showNotificationCenter}
          onClose={() => setShowNotificationCenter(false)}
          notifications={notificationHistory}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />

        <AirdropClaimModal isOpen={showAirdropModal} onClose={() => setShowAirdropModal(false)} />

        <AddFundsModal
          isOpen={showAddFundsModal}
          onClose={() => setShowAddFundsModal(false)}
          network={chain?.name || 'Base Sepolia'}
          address={address}
          formattedUsdcBalance={formattedUsdcBalance}
          usdcBalanceNum={usdcBalanceNum}
        />

        <ShareModal market={shareModalData} isOpen={!!shareModalData} onClose={() => setShareModalData(null)} />
        <PointsHistoryModal isOpen={showPointsHistory} onClose={() => setShowPointsHistory(false)} walletAddress={address} />
      </MainLayout>

      <Footer />
    </>
  );
};

export default App;