import React, { useState } from 'react';
import { Loader2, AlertTriangle, Trophy, Settings, Eye, EyeOff } from 'lucide-react';
import PerformanceCard from './PerformanceCard';
import AchievementsWidget from './AchievementsWidget';
import StatsTabs from './StatsTabs';
import WinLossChart from './WinLossChart';
import PerformanceTrendChart from './PerformanceTrendChart';
import useUserPreferences from '../../hooks/useUserPreferences';
import { useAccount } from 'wagmi';

/**
 * Dashboard View Component
 *
 * FIX 1: Corrected check order — loading → error → empty → content.
 *         Previously empty-stats check fired first, hiding spinner and errors.
 * FIX 2: "Customize Dashboard" footer button now correctly toggles edit mode
 *         (was calling setEditMode(false), always exiting instead of entering).
 * FIX 3: preferences.visibleWidgets guarded with ?? [] so .includes() never
 *         throws when the hook returns undefined.
 * FIX 4: preferences.toggleWidget guarded with optional chaining.
 */
const DashboardView = ({
  userStats = {},
  userBets = [],
  achievements = [],
  isLoading = false,
  error = null,
  onViewAchievements = () => {}
}) => {
  const { address } = useAccount();
  const preferences = useUserPreferences(address);
  const [editMode, setEditMode] = useState(false);

  // FIX 1: loading and error checks BEFORE the empty-stats early return
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-4 animate-fade-in">
        <AlertTriangle size={32} className="text-red-400 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-red-400 mb-1">Error Loading Dashboard</h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!userStats || Object.keys(userStats).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500 animate-fade-in">
        <Trophy size={64} className="mb-4 opacity-30" />
        <h2 className="text-2xl font-bold mb-2">Welcome to Your Dashboard</h2>
        <p>Place some bets to see your performance metrics here</p>
      </div>
    );
  }

  // FIX 3: guard against undefined visibleWidgets
  const isWidgetVisible = (widgetId) =>
    (preferences?.visibleWidgets ?? []).includes(widgetId);

  // FIX 4: guard toggleWidget call
  const handleToggleWidget = (widgetId) =>
    preferences?.toggleWidget?.(widgetId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header with Edit Mode */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-black text-neutral-900 dark:text-white mb-2">Your Dashboard</h1>
          <p className="text-neutral-400">Track your betting performance and achievements</p>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            editMode
              ? 'bg-success/20 border border-success text-success'
              : 'bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 text-neutral-400 hover:text-neutral-900 dark:text-white'
          }`}
        >
          {editMode ? (
            <><Eye size={16} /> Done Editing</>
          ) : (
            <><Settings size={16} /> Customize</>
          )}
        </button>
      </div>

      {/* Performance Metrics */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">📊 Performance Overview</h2>
          {editMode && (
            <button
              onClick={() => handleToggleWidget('performance')}
              className="p-2 hover:bg-neutral-100 dark:bg-dark-700 rounded-lg transition-colors"
              title={isWidgetVisible('performance') ? 'Hide widget' : 'Show widget'}
            >
              {isWidgetVisible('performance')
                ? <Eye size={18} className="text-primary" />
                : <EyeOff size={18} className="text-neutral-600" />}
            </button>
          )}
        </div>
        {isWidgetVisible('performance') && <PerformanceCard userStats={userStats} />}
      </section>

      {/* Charts Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">📈 Analytics</h2>
          {editMode && (
            <span className="text-xs text-neutral-500 px-3 py-1 bg-white dark:bg-dark-800 rounded-lg">Edit Mode</span>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={editMode ? 'relative' : ''}>
            {editMode && (
              <button
                onClick={() => handleToggleWidget('winloss')}
                className="absolute top-4 right-4 z-10 p-2 hover:bg-neutral-100 dark:bg-dark-700 rounded-lg transition-colors"
              >
                {isWidgetVisible('winloss')
                  ? <Eye size={18} className="text-primary" />
                  : <EyeOff size={18} className="text-neutral-600" />}
              </button>
            )}
            {isWidgetVisible('winloss') && (
              <WinLossChart wins={userStats.wins || 0} losses={userStats.losses || 0} isLoading={isLoading} />
            )}
          </div>
          <div className={editMode ? 'relative' : ''}>
            {editMode && (
              <button
                onClick={() => handleToggleWidget('trends')}
                className="absolute top-4 right-4 z-10 p-2 hover:bg-neutral-100 dark:bg-dark-700 rounded-lg transition-colors"
              >
                {isWidgetVisible('trends')
                  ? <Eye size={18} className="text-primary" />
                  : <EyeOff size={18} className="text-neutral-600" />}
              </button>
            )}
            {isWidgetVisible('trends') && (
              <PerformanceTrendChart userBets={userBets} isLoading={isLoading} />
            )}
          </div>
        </div>
      </section>

      {/* Stats by Time Period */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">📊 Betting Statistics</h2>
          {editMode && (
            <button
              onClick={() => handleToggleWidget('stats')}
              className="p-2 hover:bg-neutral-100 dark:bg-dark-700 rounded-lg transition-colors"
            >
              {isWidgetVisible('stats')
                ? <Eye size={18} className="text-primary" />
                : <EyeOff size={18} className="text-neutral-600" />}
            </button>
          )}
        </div>
        {isWidgetVisible('stats') && <StatsTabs userBets={userBets} />}
      </section>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Achievements */}
        <div className="lg:col-span-2 relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">🏆 Your Achievements</h2>
            {editMode && (
              <button
                onClick={() => handleToggleWidget('achievements')}
                className="p-2 hover:bg-neutral-100 dark:bg-dark-700 rounded-lg transition-colors"
              >
                {isWidgetVisible('achievements')
                  ? <Eye size={18} className="text-primary" />
                  : <EyeOff size={18} className="text-neutral-600" />}
              </button>
            )}
          </div>
          {isWidgetVisible('achievements') && (
            <AchievementsWidget
              achievements={achievements}
              onViewAll={onViewAchievements}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Quick Stats */}
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">⚡ Quick Stats</h2>
            {editMode && (
              <button
                onClick={() => handleToggleWidget('quickstats')}
                className="p-2 hover:bg-neutral-100 dark:bg-dark-700 rounded-lg transition-colors"
              >
                {isWidgetVisible('quickstats')
                  ? <Eye size={18} className="text-primary" />
                  : <EyeOff size={18} className="text-neutral-600" />}
              </button>
            )}
          </div>
          {isWidgetVisible('quickstats') && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary/50 transition-all">
                <p className="text-xs text-neutral-400 mb-2 font-semibold">Most Traded</p>
                <p className="text-2xl font-black text-primary">BTC/USD</p>
                <p className="text-xs text-neutral-500 mt-2">
                  {userBets.filter(b => b.asset === 'BTC').length} bets
                </p>
              </div>

              <div className="bg-white dark:bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary/50 transition-all">
                <p className="text-xs text-neutral-400 mb-2 font-semibold">Avg Multiplier</p>
                <p className="text-2xl font-black text-primary">
                  {userBets.length > 0
                    ? (userBets.reduce((sum, b) => sum + (b.multiplier || 1), 0) / userBets.length).toFixed(2)
                    : '0.00'}x
                </p>
                <p className="text-xs text-neutral-500 mt-2">Weighted average</p>
              </div>

              <div className="bg-white dark:bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary/50 transition-all">
                <p className="text-xs text-neutral-400 mb-2 font-semibold">Risk Profile</p>
                <div className="text-2xl font-black text-yellow-400">MODERATE</div>
                <p className="text-xs text-neutral-500 mt-2">Based on bets</p>
              </div>

              <div className="bg-white dark:bg-dark-800 border border-primary/30 rounded-xl p-5 relative overflow-hidden hover:border-primary/50 transition-all">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-8 -mt-8" />
                <p className="text-xs text-neutral-400 mb-2 font-semibold">Next Milestone</p>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-primary font-bold">50 Total Bets</p>
                  <p className="text-xs text-neutral-500">{userBets.length || 0}/50</p>
                </div>
                <div className="h-2 bg-neutral-100 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min((userBets.length / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-8 text-center hover:border-primary/40 transition-all">
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Keep Pushing Forward! 🚀</h3>
        <p className="text-neutral-300 mb-6 max-w-2xl mx-auto">
          You're building an impressive track record. Stay consistent, make strategic bets, and watch your portfolio grow.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button className="px-8 py-3 bg-primary hover:bg-primary/90 text-dark-950 font-bold rounded-lg transition-all hover:scale-105">
            Explore Markets
          </button>
          {/* FIX 2: was setEditMode(false) — now correctly toggles */}
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-8 py-3 bg-white dark:bg-dark-800 hover:bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 text-neutral-900 dark:text-white font-bold rounded-lg transition-all"
          >
            {editMode ? 'Exit Customize' : 'Customize Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;