import React, { useState, useMemo, useRef, memo, useCallback } from 'react';
import {
  Bell, TrendingUp, Target, Award, Users,
  X, RefreshCw, Loader2
} from 'lucide-react';
import useActivityFeed from '../../hooks/useActivityFeed';
import { useAccount } from 'wagmi';

/**
 * Shared helpers — defined once at module level, used by both
 * ActivityCard and ActivityFeed.
 *
 * FIX 4: getActivityIcon and formatTime were defined twice each (once in
 *         ActivityCard, once in ActivityFeed body). Now defined once here.
 */
const getActivityIcon = (type) => {
  switch (type) {
    case 'market':
    case 'resolution':
      return <TrendingUp size={18} className="text-green-400" />;
    case 'achievement':
      return <Award size={18} className="text-yellow-400" />;
    case 'bet_won':
      return <TrendingUp size={18} className="text-success" />;
    case 'bet_placed':
      return <Target size={18} className="text-primary" />;
    default:
      return <Bell size={18} className="text-neutral-400" />;
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'just now';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const getPriorityBadge = (type) => {
  if (type === 'bet_won') {
    return (
      <span className="px-1.5 py-0.5 bg-success/20 text-success text-[9px] font-bold rounded uppercase tracking-wide">
        Win!
      </span>
    );
  }
  if (type === 'resolution') {
    return (
      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded uppercase tracking-wide">
        Resolved
      </span>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ActivityCard — memoized individual activity item.
 * Read state is local for instant feedback; real sync would go to backend.
 */
const ActivityCard = memo(({ activity, onMarkRead }) => {
  const [isRead, setIsRead] = useState(activity.read ?? false);

  const handleMarkRead = useCallback((e) => {
    e.stopPropagation();
    setIsRead(true);
    onMarkRead?.(activity.id);
  }, [activity.id, onMarkRead]);

  return (
    <div
      className={[
        'relative p-3.5 rounded-xl transition-all cursor-pointer group',
        isRead
          ? 'bg-dark-800 opacity-60 border border-dark-700'
          : 'bg-dark-800 border-l-4 border-primary shadow-md shadow-primary/5',
        'hover:opacity-100 active:scale-[0.98]',
      ].join(' ')}
    >
      {/* Unread dot */}
      {!isRead && (
        <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
          {getActivityIcon(activity.type)}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
              {activity.title}
            </p>
            {getPriorityBadge(activity.type)}
          </div>
          <p className="text-xs text-neutral-400 truncate">{activity.desc}</p>
          <p className="text-[10px] text-neutral-600 mt-1.5">{formatTime(activity.time)}</p>
        </div>
      </div>

      {!isRead && (
        <button
          onClick={handleMarkRead}
          className="absolute bottom-2 right-2.5 text-[10px] text-primary hover:underline"
        >
          Mark read
        </button>
      )}
    </div>
  );
});

ActivityCard.displayName = 'ActivityCard';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ActivityFeed sidebar component.
 *
 * FIX 4: Removed dead `groupedActivities` useMemo (was computed, never used).
 *         Grouping now happens only in renderTimeGroupedActivities.
 * FIX 5: Removed duplicate getActivityIcon / formatTime definitions.
 * FIX 6: Pull-to-refresh guarded so rapid touch events don't double-fire.
 */
const ActivityFeed = ({ isOpen, onClose, isConnected }) => {
  const { address } = useAccount();
  const { activities, isLoading, refresh } = useActivityFeed(address, isConnected);
  const [activeTab, setActiveTab] = useState('live');

  // Pull-to-refresh
  const [isPulling, setIsPulling]   = useState(false);
  const startY    = useRef(0);
  const contentRef = useRef(null);
  const hasRefreshed = useRef(false); // FIX 6: prevents double-fire

  const handleTouchStart = useCallback((e) => {
    startY.current = e.touches[0].clientY;
    hasRefreshed.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    const diff = e.touches[0].clientY - startY.current;
    const atTop = (contentRef.current?.scrollTop ?? 0) === 0;
    if (diff > 70 && atTop) setIsPulling(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (isPulling && !hasRefreshed.current) {
      hasRefreshed.current = true;
      refresh();
    }
    setIsPulling(false);
  }, [isPulling, refresh]);

  // Categorise activities by tab
  const categorizedActivities = useMemo(() => ({
    live:         activities.filter(a => a.type === 'market' || a.type === 'resolution'),
    achievements: activities.filter(a => a.type === 'achievement' || a.type === 'bet_won'),
    friends:      activities.filter(a => a.type === 'bet_placed' || a.type === 'social'),
  }), [activities]);

  const handleMarkRead = useCallback((activityId) => {
    // TODO: sync to backend
    console.log('Marked as read:', activityId);
  }, []);

  // Group a flat activity list into time buckets and render them
  const renderTimeGroupedActivities = useCallback((items) => {
    const now = Date.now();
    const H = 3_600_000;
    const buckets = {
      '🔥 Today':    items.filter(a => now - new Date(a.time) <  24 * H),
      'Yesterday':   items.filter(a => { const d = now - new Date(a.time); return d >= 24*H && d < 48*H; }),
      'This Week':   items.filter(a => { const d = now - new Date(a.time); return d >= 48*H && d < 168*H; }),
      'Older':       items.filter(a => now - new Date(a.time) >= 168 * H),
    };

    return Object.entries(buckets).map(([label, group]) =>
      group.length > 0 && (
        <div key={label}>
          <p className="px-1 py-2 text-[9px] text-neutral-500 uppercase tracking-[0.15em] font-bold sticky top-0 bg-dark-900 z-10">
            {label}
          </p>
          <div className="space-y-2">
            {group.map(item => (
              <ActivityCard key={item.id} activity={item} onMarkRead={handleMarkRead} />
            ))}
          </div>
        </div>
      )
    );
  }, [handleMarkRead]);

  const currentActivities = categorizedActivities[activeTab] ?? [];

  const tabs = [
    { key: 'live',         label: '🔴 Live',   icon: null },
    { key: 'achievements', label: '🏆 Wins',   icon: null },
    { key: 'friends',      label: '👥 Social', icon: null },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 md:hidden z-30"
          onClick={onClose}
        />
      )}

      {/* Feed panel */}
      <aside
        className={[
          'fixed right-0 top-0 h-screen bg-dark-900 border-l border-dark-700',
          'w-full sm:w-96 md:w-80 z-40 flex flex-col',
          'transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-dark-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Bell size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm leading-none">Activity Feed</h3>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {isConnected ? 'Live updates' : 'Connect wallet'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isConnected && (
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-40"
                aria-label="Refresh feed"
              >
                <RefreshCw size={15} className={`text-neutral-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 hover:bg-dark-700 rounded-lg transition-colors"
              aria-label="Close activity feed"
            >
              <X size={15} className="text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700 flex-shrink-0">
          {tabs.map(tab => {
            const count = categorizedActivities[tab.key]?.length ?? 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  activeTab === tab.key
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-neutral-500 hover:text-neutral-300',
                ].join(' ')}
              >
                {tab.label}
                {count > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] bg-primary/20 text-primary rounded-full font-bold">
                    {Math.min(count, 9)}{count > 9 ? '+' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-track-dark-900 scrollbar-thumb-dark-700"
        >
          {/* Pull-to-refresh indicator */}
          {isPulling && (
            <div className="flex justify-center py-3">
              <RefreshCw size={20} className="animate-spin text-primary" />
            </div>
          )}

          {/* Not connected */}
          {!isConnected && (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-600">
              <Bell size={28} className="mb-2 opacity-40" />
              <p className="text-sm text-center">Connect wallet to see activity</p>
            </div>
          )}

          {/* Loading */}
          {isConnected && isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}

          {/* Activities */}
          {isConnected && !isLoading && (
            currentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                {activeTab === 'achievements'
                  ? <Award size={28} className="mb-2 opacity-30" />
                  : activeTab === 'friends'
                  ? <Users size={28} className="mb-2 opacity-30" />
                  : <Bell size={28} className="mb-2 opacity-30" />
                }
                <p className="text-sm">
                  {activeTab === 'live'         && 'No live activity'}
                  {activeTab === 'achievements' && 'No achievements yet'}
                  {activeTab === 'friends'      && 'No friend activity'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {renderTimeGroupedActivities(currentActivities)}
              </div>
            )
          )}
        </div>

        {/* Footer CTA */}
        {isConnected && (
          <div className="p-3 border-t border-dark-700 flex-shrink-0">
            <button className="w-full py-2 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary text-xs font-bold transition-all active:scale-95">
              View All Activity →
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default ActivityFeed;