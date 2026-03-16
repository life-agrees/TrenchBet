import React, { useState, useEffect } from 'react';
import { Flame, Clock, CheckCircle, Gift } from 'lucide-react';
import { useAccount } from 'wagmi';

/**
 * StreakTracker
 *
 * FIX: `countdown` state initialised from `timeUntilNext` prop but the
 *      useEffect only watched `[canCheckIn, timeUntilNext]` for starting
 *      the interval — it didn't reset `countdown` when `timeUntilNext`
 *      changed (e.g. parent re-renders after a check-in or data refresh).
 *      Displayed countdown would stay stale.
 *
 *      Fix: added `setCountdown(timeUntilNext)` at the top of the effect so
 *      the displayed value always resets to the latest prop value whenever
 *      either `canCheckIn` or `timeUntilNext` changes.
 */
const StreakTracker = ({ streakData, onCheckIn, isCheckingIn, canCheckIn, timeUntilNext }) => {
  const { isConnected } = useAccount();
  const [countdown, setCountdown] = useState(timeUntilNext);

  useEffect(() => {
    // FIX: reset countdown to latest prop value on every relevant change
    setCountdown(timeUntilNext);

    if (canCheckIn || timeUntilNext <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canCheckIn, timeUntilNext]); // FIX: timeUntilNext already in deps, now also resets state

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const getRewardForDay = (day) => [5, 5, 10, 10, 15, 20, 50][(day - 1) % 7];

  if (!isConnected) {
    return (
      <div className="bg-dark-800 border border-dark-600 rounded-2xl p-4">
        <p className="text-neutral-400 text-center">Connect wallet to track streak</p>
      </div>
    );
  }

  const currentStreak = streakData?.currentStreak  || 0;
  const longestStreak = streakData?.longestStreak  || 0;
  const totalPoints   = streakData?.totalPointsEarned || 0;

  return (
    <div className="bg-gradient-to-br from-orange-500/10 via-red-500/10 to-purple-500/10 border border-orange-500/30 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Flame className="text-orange-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Daily Streak</h3>
            <p className="text-xs text-neutral-400">Longest: {longestStreak} days</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-orange-500">{currentStreak}</div>
          <div className="text-xs text-neutral-400">days</div>
        </div>
      </div>

      {/* Day indicators */}
      <div className="flex justify-between mb-4">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isCompleted = currentStreak >= day;
          const isCurrent   = currentStreak + 1 === day;
          return (
            <div key={day} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                isCompleted
                  ? 'bg-orange-500 text-white'
                  : isCurrent
                  ? 'bg-orange-500/30 border-2 border-orange-500 text-orange-500'
                  : 'bg-dark-700 text-neutral-500'
              }`}>
                {isCompleted ? <CheckCircle size={14} /> : day}
              </div>
              <span className="text-[10px] text-neutral-400">{getRewardForDay(day)} pts</span>
            </div>
          );
        })}
      </div>

      {/* Check-in button */}
      <button
        onClick={onCheckIn}
        disabled={!canCheckIn || isCheckingIn}
        className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          canCheckIn
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-dark-700 text-neutral-400 cursor-not-allowed'
        }`}
      >
        {isCheckingIn ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Checking in...
          </>
        ) : canCheckIn ? (
          <>
            <Gift size={18} />
            Check In (+{getRewardForDay(currentStreak + 1)} pts)
          </>
        ) : (
          <>
            <Clock size={18} />
            Next check-in: {formatTime(countdown)}
          </>
        )}
      </button>

      <div className="mt-3 text-center">
        <span className="text-xs text-neutral-400">
          Total earned: <span className="text-orange-500 font-bold">{totalPoints} points</span>
        </span>
      </div>
    </div>
  );
};

export default StreakTracker;