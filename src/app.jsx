import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import {
  TrendingUp, Clock, DollarSign, Wallet, Trophy, Star,
  Target, BarChart3, Settings, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Loader2, Bitcoin, Users, Bell,
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
import TermsOfUse from './components/legal/TermsOfUse';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import ResponsibleGambling from './components/legal/ResponsibleGambling';
import useActivityFeed from './hooks/useActivityFeed';
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
import PortfolioView from './components/Portfolio/PortfolioView';
import WinShareCard from './components/WinShareCard';

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

// Constants, config and logger
import { DURATIONS, VIRTUAL_SCROLL } from './utils/constants';
import { createLogger } from './utils/logger';
import { ASSET_CONFIG, ASSET_STATUS } from './config/assets';

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
  const { address, isConnected, chain, isReconnecting } = useAccount();
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
    isLoading: isLoadingUserBets, error: userBetsError, refresh: refreshUserBets, markAsClaimed
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

  const { placeBet, isSuccess, hash, lastBetRef, reset: resetBetPlacement, isReconnecting: isBettingReconnecting } = useBetPlacement();
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
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter]   = useState('ALL');
  const [shareModalData, setShareModalData]         = useState(null);
  const [showPointsHistory, setShowPointsHistory]   = useState(false);
  const [showLanding, setShowLanding]               = useState(true);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showAirdropModal, setShowAirdropModal]     = useState(false);
  const [winShareBet, setWinShareBet]               = useState(null);
  const [sortBy, setSortBy]                         = useState('endingSoon');

  const previousAchievementsCount = useRef(0);

  // FIX 5: Track which bets have had notifications sent via a Set ref instead
  // of directly mutating bet objects from state (React state must not be mutated)
  const notifiedBetIds = useRef(new Set());

  // \u2500\u2500 Scroll Tracking for Filter Bar \u2500\u2500
  const filterScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = filterScrollRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = filterScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll, liveMarkets]);

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
    const market = markets.find(m => m.id === marketId);
    const isBinary = !market || Number(market.marketType) === 0;
    const functionName = isBinary ? 'claimWinnings' : 'claimWinningsAdvanced';

    const claimArgs = {
      address: CONTRACTS.PROXY,
      abi: PREDICTION_MARKET_PROXY_ABI,
      functionName,
      args: [BigInt(marketId)],
    };

    try {
      toast.loading('Claiming winnings...', { id: `claim-${marketId}` });

      // Try without gas first, then fall back with manual gas for Arc InternalRpcError
      let txHash;
      try {
        txHash = await writeContractAsync(claimArgs);
      } catch (claimErr) {
        const isRpcSim = claimErr.message?.includes('Internal error') ||
          claimErr.message?.includes('InternalRpcError') ||
          (claimErr.cause?.message || '').includes('Transaction failed');
        if (isRpcSim) {
          logger.warn('Claim simulation failed on Arc, retrying with manual gas...');
          // Use 500k gas limit for claims to be safe
          txHash = await writeContractAsync({ ...claimArgs, gas: 500000n });
        } else {
          throw claimErr;
        }
      }

      toast.success('Winnings claimed! 🎉', { id: `claim-${marketId}` });
      
      // Optimistically update UI
      markAsClaimed(marketId);
      
      // Show win share card for won bets
      // FIX: Use loose comparison or Number() for ID safety
      const bet = wonBets.find(b => Number(b.market?.id) === Number(marketId));
      if (bet) {
        setTimeout(() => setWinShareBet(bet), 2000);
      }

      // Wait 2 seconds for Arc state propagation before background refresh
      logger.info('Waiting 2s for Arc state propagation before refresh...');
      setTimeout(() => { refreshUserBets(); refetchBalance(); }, 2000);
    } catch (error) {
      toast.dismiss(`claim-${marketId}`);
      const msg = error.shortMessage || error.message || 'Claim failed';
      if (msg.includes('already claimed') || msg.includes('No winnings')) {
        toast.error('No claimable winnings for this bet.');
      } else if (msg.includes('User rejected')) {
        toast.error('Claim cancelled.');
      } else {
        toast.error(`Claim failed: ${msg}`);
      }
    }
  };

  // handleClaimAdvanced is now unified into handleClaim (auto-detects market type)
  const handleClaimAdvanced = handleClaim;

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
      terms:       'terms',
      privacy:     'privacy',
      'responsible-gambling': 'responsible-gambling',
    };
    if (viewMap[viewId]) setCurrentView(viewMap[viewId]);
  }, []);

  // Track previous connection state to detect a real "disconnect" event
  const wasConnected = useRef(isConnected);

  useEffect(() => {
    // If user was connected and is now disconnected (and not just reconnecting)
    if (wasConnected.current && !isConnected && !isReconnecting && !showLanding) {
      logger.info('User explicitly disconnected, redirecting to landing page');
      setShowLanding(true);
      setCurrentView('markets'); // Reset view to default
    }
    
    // Update the ref for next render
    wasConnected.current = isConnected;
  }, [isConnected, isReconnecting, showLanding]);

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

  // Social Proof Logic
  const { activities } = useActivityFeed();
  const recentlyActiveMarketIds = useMemo(() => {
    if (!activities) return new Set();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const activeIds = activities
      .filter(a => new Date(a.timestamp).getTime() > fiveMinutesAgo)
      .map(a => a.marketId);
    return new Set(activeIds);
  }, [activities]);

  // Derived bet states for sharing/claiming
  const claimableBets = useMemo(() => {
    return (wonBets || []).filter(bet => !bet.claimed);
  }, [wonBets]);

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
        return isConnected ? (
          <PortfolioView
            userBets={userBets}
            ongoingBets={ongoingBets}
            pendingBets={pendingBets}
            wonBets={wonBets}
            lostBets={lostBets}
            isLoadingUserBets={isLoadingUserBets}
            userBetsError={userBetsError}
            refreshUserBets={refreshUserBets}
            userStats={userStats}
            handleClaim={handleClaim}
            handleClaimAdvanced={handleClaimAdvanced}
          />
        ) : <EmptyState isConnected={isConnected} variant="empty" />;

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

      case 'terms':
        return <TermsOfUse />;
      case 'privacy':
        return <PrivacyPolicy />;
      case 'responsible-gambling':
        return <ResponsibleGambling />;

      // FIX 2: Streaks view now reachable via handleSidebarNavigation
      case 'referrals':
        return isConnected ? (
          <ReferralDashboard inline />
        ) : <EmptyState isConnected={isConnected} variant="empty" />;

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
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
                    Active Markets
                    {searchQuery !== debouncedSearchQuery && (
                      <span className="text-sm text-neutral-400 flex items-center gap-2 font-medium">
                        <Clock size={16} className="animate-spin" /> Searching...
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Sort moved inside Discovery Bar */}
                    
                    {/* Filter Container with Premium Dynamic Mask */}
                    <div className="flex flex-col gap-6 w-full">
                      
                      {/* Topic Strip (Iconic) */}
                      <div className="relative group">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                          {[
                            { id: 'ALL',      label: 'All Markets', icon: Target },
                            { id: 'CRYPTO',   label: 'Crypto',      icon: Bitcoin },
                            { id: 'SPORTS',   label: 'Sports',      icon: Trophy },
                            { id: 'POLITICS', label: 'Politics',    icon: Users },
                            { id: 'ENTERTAINMENT', label: 'Fun',    icon: Zap },
                          ].map((topic) => {
                            const Icon = topic.icon;
                            const isActive = selectedTopicFilter === topic.id;
                            return (
                              <button
                                key={topic.id}
                                onClick={() => setSelectedTopicFilter(topic.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all border-2 whitespace-nowrap ${
                                  isActive
                                    ? 'bg-primary border-primary text-dark-950 shadow-[0_0_20px_rgba(205,255,0,0.2)]'
                                    : 'bg-white/5 border-white/5 text-neutral-400 hover:border-white/10 hover:bg-white/10'
                                }`}
                              >
                                <Icon size={16} className={isActive ? 'text-dark-950' : 'text-primary'} />
                                {topic.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sub-Filters: Type & Sort */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center p-1 bg-dark-800/80 backdrop-blur-md rounded-2xl border border-white/5">
                          {[
                            { id: 'ALL', label: 'All' },
                            { id: '0',   label: 'Binary' },
                            { id: '1',   label: 'Multi' },
                            { id: '2',   label: 'Range' },
                            { id: '3',   label: 'Time' },
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setSelectedTypeFilter(type.id)}
                              className={`px-4 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all ${
                                selectedTypeFilter === type.id
                                  ? 'bg-secondary text-dark-950 shadow-lg'
                                  : 'text-neutral-500 hover:text-white'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>

                        <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block"></div>

                        <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Sort:</span>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
                          >
                            <option value="endingSoon">Ending Soon</option>
                            <option value="mostActive">Most Active</option>
                            <option value="highestPool">Highest Pool</option>
                          </select>
                        </div>
                      </div>
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
              let filteredMarkets = currentLiveMarkets;

              if (selectedTopicFilter !== 'ALL') {
                // For now, most markets are CRYPTO.
                if (selectedTopicFilter === 'CRYPTO') {
                  // Keep crypto assets
                  const cryptoAssets = ['BTC', 'ETH', 'SOL', 'LINK', 'PEPE', 'DOGE'];
                  filteredMarkets = filteredMarkets.filter(m => cryptoAssets.includes(m.asset));
                } else {
                  // Other topics might be empty for now
                  filteredMarkets = filteredMarkets.filter(m => m.category === selectedTopicFilter);
                }
              }

              if (selectedTypeFilter !== 'ALL') {
                filteredMarkets = filteredMarkets.filter(m => String(m.marketType) === selectedTypeFilter);
              }

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
              if (!isLoadingMarkets && sortedMarkets.length === 0) {
                const isComingSoon = ['SPORTS', 'POLITICS', 'ENTERTAINMENT'].includes(selectedTopicFilter);
                
                if (isComingSoon) {
                  const categoryMeta = {
                    SPORTS: { icon: Trophy, color: 'text-orange-400', label: 'Sports Betting' },
                    POLITICS: { icon: Users, color: 'text-blue-400', label: 'Political Markets' },
                    ENTERTAINMENT: { icon: Zap, color: 'text-purple-400', label: 'Entertainment' }
                  }[selectedTopicFilter];
                  const Icon = categoryMeta.icon;

                  return (
                    <div className="flex flex-col items-center justify-center py-16 px-6 bg-dark-800/50 backdrop-blur-md rounded-3xl border-2 border-dashed border-white/5 text-center animate-in fade-in zoom-in duration-500">
                      <div className={`w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 ${categoryMeta.color}`}>
                        <Icon size={40} />
                      </div>
                      <h3 className="text-3xl font-black text-white mb-2">Coming Soon 🚀</h3>
                      <p className="text-neutral-400 max-w-md mx-auto mb-8">
                        Our experts are curating the best {categoryMeta.label} markets for the Mainnet launch. Stay tuned!
                      </p>
                      <button 
                        onClick={() => setCurrentView('settings')}
                        className="px-8 py-3 bg-white text-dark-950 font-black rounded-2xl hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        <Bell size={18} /> Enable Notifications
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-dark-800 rounded-2xl border-2 border-neutral-200 dark:border-dark-600">
                    <AlertTriangle size={48} className="text-primary mb-4" />
                    <p className="text-xl text-neutral-400">No matching markets found</p>
                    <button onClick={() => { setSelectedTopicFilter('ALL'); setSelectedTypeFilter('ALL'); }} className="mt-4 text-primary font-bold">Clear Filters</button>
                  </div>
                );
              }

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
                          <VirtualMarketList 
                            markets={pinned} 
                            currentPrices={currentPrices} 
                            onBetClick={handleBetClick} 
                            usdcBalance={usdcBalanceNum} 
                            isFavorite={isFavorite} 
                            onToggleFavorite={toggleFavorite} 
                            recentlyActiveMarketIds={recentlyActiveMarketIds}
                            pinned 
                          />
                        </ErrorBoundary>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {pinned.map(market => (
                            <ErrorBoundary variant="inline" key={Number(market.id) + "-eb"}>
                              <MarketCard 
                                key={Number(market.id)} 
                                market={market} 
                                currentPrice={currentPrices[market.asset]} 
                                onClick={() => handleOpenShareModal(market)} 
                                onBetClick={handleBetClick} 
                                usdcBalance={usdcBalanceNum} 
                                isFavorite={isFavorite(market.id)} 
                                onToggleFavorite={() => toggleFavorite(market.id)} 
                                isRecentlyActive={recentlyActiveMarketIds.has(market.id)}
                                pinned 
                              />
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
                        recentlyActiveMarketIds={recentlyActiveMarketIds}
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
                            isRecentlyActive={recentlyActiveMarketIds.has(market.id)}
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
        isWalletReconnecting={isReconnecting}
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
            hasClaimableWins={claimableBets.length > 0}
            onShareWin={() => {
              if (claimableBets.length > 0) {
                setWinShareBet(claimableBets[0]);
                setSelectedBet(null);
              }
            }}
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

        <WinShareCard 
          bet={winShareBet} 
          isVisible={!!winShareBet} 
          onClose={() => setWinShareBet(null)} 
        />
      </MainLayout>

      <Footer onNavigate={handleSidebarNavigation} />
    </>
  );
};

export default App;