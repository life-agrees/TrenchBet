// src/components/PointsBalance.jsx
// Enhanced points balance component with gamification, real-time updates, and mobile responsiveness
import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  TrendingUp,
  Loader2,
  RefreshCw,
  Share2,
  Trophy,
  Target,
  Zap,
  Gift,
  Flame,
  ChevronDown,
  ChevronUp,
  Coins
} from 'lucide-react';
import { usePointsData } from '../hooks/usePointsData';
import PointsShareModal from './PointsShareModal';
import PointsClaimModal from './PointsClaimModal';
import { createLogger } from '../utils/logger';
import { ENV } from '../utils/constants';


const logger = createLogger('PointsBalance');



// Error Boundary Wrapper
class PointsBalanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('PointsBalance Error', error, errorInfo);
  }


  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/50 px-4 py-2 rounded-lg">
          <span className="text-sm text-red-400">Points display error</span>
        </div>
      );
    }

    return this.props.children;
  }
}

const PointsBalance = ({ walletAddress, onOpenHistory }) => {
  const {
    pointsData,
    isLoading,
    error,
    tier,
    progress,
    isOptimisticUpdate,
    refreshPoints,
    updatePointsOptimistically,
    retryCount
  } = usePointsData(walletAddress);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const tooltipRef = useRef(null);
  const previousPointsRef = useRef(0);


  // WebSocket for real-time updates (only in production)
  useEffect(() => {
    if (!walletAddress || ENV.IS_DEV) return;


    const ws = new WebSocket(`wss://${window.location.host}/ws/points/${walletAddress}`);

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.type === 'points_update') {
          updatePointsOptimistically(update.data);
          // Trigger confetti animation
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
        }
      } catch (err) {
        logger.error('WebSocket message error', err);
      }

    };

    ws.onerror = (error) => {
      logger.error('WebSocket error', error);
    };


    return () => {
      ws.close();
    };
  }, [walletAddress, updatePointsOptimistically]);

  // Track points changes for animations
  useEffect(() => {
    if (pointsData && previousPointsRef.current !== pointsData.total_points) {
      if (pointsData.total_points > previousPointsRef.current) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
      previousPointsRef.current = pointsData.total_points;
    }
  }, [pointsData]);

  // Claim all available points
  const handleClaimAll = async () => {
    if (!pointsData?.points_available || pointsData.points_available <= 0) return;

    try {
      const response = await fetch('/api/points/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletAddress })
      });

      if (response.ok) {
        // Optimistic update
        updatePointsOptimistically({
          points_available: 0,
          total_points: pointsData.total_points + pointsData.points_available
        });

        // Analytics tracking
        if (window.gtag) {
          window.gtag('event', 'points_claimed', {
            value: pointsData.points_available,
            currency: 'POINTS'
          });
        }
      }
    } catch (err) {
      logger.error('Claim error', err);
    }

  };

  // Touch feedback for mobile
  const handleTouchFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  // Motivational messages based on streak
  const getMotivationalMessage = (streak) => {
    if (streak >= 30) return "Legendary! You're unstoppable! 🔥";
    if (streak >= 14) return "Epic streak! Keep the fire burning! 🔥";
    if (streak >= 7) return "Amazing streak! You're on fire! 🔥";
    if (streak >= 3) return "Great streak! Keep it up! 🔥";
    if (streak > 0) return "Good start! Build that streak! 🔥";
    return "Ready to start your winning streak? 🎯";
  };

  if (!walletAddress) return null;

  if (isLoading && !pointsData) {
    return (
      <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="text-sm text-gray-400">Loading points...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-900/20 border border-red-500/50 px-4 py-2 rounded-lg">
        <span className="text-sm text-red-400">Failed to load points</span>
        {retryCount > 0 && (
          <button
            onClick={refreshPoints}
            className="ml-2 text-red-400 hover:text-red-300"
            aria-label="Retry loading points"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    );
  }

  const totalPoints = pointsData?.total_points || 0;
  const availablePoints = pointsData?.points_available || 0;
  const currentStreak = pointsData?.current_streak || 0;

  return (
    <PointsBalanceErrorBoundary>
      <div className="flex items-center gap-2 sm:gap-3 relative">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="text-2xl animate-spin">🎉</div>
            </div>
          </div>
        )}

        {/* Main Points Balance */}
        <div className="relative">
          <button
            onClick={() => {
              handleTouchFeedback();
              setIsExpanded(!isExpanded);
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={`flex items-center gap-2 bg-gradient-to-r from-primary/20 to-success/20 border-2 border-primary hover:border-success px-3 sm:px-4 py-2 rounded-xl transition-all hover:scale-105 group ${isOptimisticUpdate ? 'animate-pulse' : ''}`}
            aria-label={`Points balance: ${totalPoints.toLocaleString()}. Click to expand details.`}
          >
            {/* Tier Badge */}
            {tier && (
              <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${tier.bgColor} border-2 ${tier.borderColor} flex items-center justify-center text-xs animate-pulse`}>
                {tier.name === 'Diamond' && '💎'}
                {tier.name === 'Gold' && '🥇'}
                {tier.name === 'Silver' && '🥈'}
                {tier.name === 'Bronze' && '🥉'}
              </div>
            )}

            <Star className={`w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:rotate-12 transition-transform ${showConfetti ? 'animate-bounce' : ''}`} />
            <div className="text-left">
              <div className="text-xs text-gray-400 flex items-center gap-1">
                Points
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
              <div className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                {totalPoints.toLocaleString()}
              </div>
            </div>
            {availablePoints > 0 && (
              <div className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-success/20 border border-success rounded-full text-xs font-bold text-success animate-pulse">
                {availablePoints.toLocaleString()}
              </div>
            )}
          </button>

          {/* Enhanced Tooltip */}
          {showTooltip && (
            <div
              ref={tooltipRef}
              className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-dark-800 border border-primary/30 rounded-lg p-3 shadow-xl animate-in slide-in-from-top-2 duration-200 min-w-[200px]"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Points:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{totalPoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Available:</span>
                  <span className="font-bold text-success">{availablePoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Streak:</span>
                  <span className="font-bold text-orange-400">{currentStreak}d</span>
                </div>
                {tier && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Tier:</span>
                    <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Expanded Details Panel */}
        {isExpanded && (
          <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-dark-800 border border-primary/30 rounded-xl p-4 shadow-xl animate-in slide-in-from-top-2 duration-300 min-w-[280px]">
            {/* Progress Bar */}
            {progress && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Progress to {tier?.name === 'Diamond' ? 'Max Level' : 'Next Tier'}</span>
                  <span className="text-xs text-gray-500">{progress.current}/{progress.target}</span>
                </div>
                <div className="w-full bg-neutral-100 dark:bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-success h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Motivational Message */}
            <div className="mb-4 p-3 bg-orange-900/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-400 font-medium">
                {getMotivationalMessage(currentStreak)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setShowClaimModal(true)}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-2 px-3 rounded-lg text-sm transition-all hover:scale-105 flex items-center justify-center gap-1"
                aria-label="Claim TRENCHY tokens"
              >
                <Coins size={14} />
                Claim TRENCHY
              </button>
              <button
                onClick={() => setShowShareModal(true)}
                className="flex-1 bg-primary hover:bg-primary-400 text-dark-950 font-bold py-2 px-3 rounded-lg text-sm transition-all hover:scale-105 flex items-center justify-center gap-1"
                aria-label="Share your achievement"
              >
                <Share2 size={14} />
                Share
              </button>
            </div>


            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={onOpenHistory}
                className="flex-1 bg-neutral-100 dark:bg-dark-700 hover:bg-neutral-200 dark:bg-dark-600 border border-neutral-200 dark:border-dark-600 hover:border-primary text-neutral-900 dark:text-white font-bold py-2 px-3 rounded-lg text-sm transition-all flex items-center justify-center gap-1"
                aria-label="View points history"
              >
                <Target size={14} />
                History
              </button>
              <button
                onClick={refreshPoints}
                className="bg-neutral-100 dark:bg-dark-700 hover:bg-neutral-200 dark:bg-dark-600 border border-neutral-200 dark:border-dark-600 hover:border-primary text-neutral-900 dark:text-white font-bold py-2 px-3 rounded-lg text-sm transition-all hover:scale-105 flex items-center justify-center"
                aria-label="Refresh points data"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}

        {/* Streak Indicator (Enhanced) */}
        {currentStreak > 0 && (
          <div className="flex items-center gap-1 bg-orange-900/20 border border-orange-500/50 px-2 sm:px-3 py-2 rounded-lg hover:scale-105 transition-all cursor-pointer group">
            <Flame className={`text-xl ${currentStreak >= 7 ? 'animate-pulse' : ''}`} />
            <div className="text-left hidden sm:block">
              <div className="text-xs text-orange-400">Streak</div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">{currentStreak}d</div>
            </div>
            <div className="text-sm font-bold text-neutral-900 dark:text-white sm:hidden">{currentStreak}d</div>
          </div>
        )}

        {/* Share Modal */}
        <PointsShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          pointsData={pointsData}
          walletAddress={walletAddress}
        />

        {/* Claim Modal */}
        <PointsClaimModal
          isOpen={showClaimModal}
          onClose={() => setShowClaimModal(false)}
          walletAddress={walletAddress}
        />
      </div>
    </PointsBalanceErrorBoundary>
  );
};


export default PointsBalance;
