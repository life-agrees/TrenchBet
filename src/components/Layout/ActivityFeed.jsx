import React, { useState, useMemo, useRef, memo, useCallback } from 'react';
import {
  Bell, TrendingUp, Target, Award, Users,
  X, RefreshCw, Loader2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useActivityFeed from '../../hooks/useActivityFeed';
import { useAccount } from 'wagmi';

/**
 * Shared helpers
 */
const getActivityIcon = (type) => {
  switch (type) {
    case 'market':
    case 'resolution':
      return <TrendingUp size={18} className="text-blue-400" />;
    case 'achievement':
      return <Award size={18} className="text-yellow-400" />;
    case 'bet_won':
      return <Zap size={18} className="text-success" />;
    case 'bet_placed':
      return <Target size={18} className="text-primary" />;
    case 'referral':
      return <Users size={18} className="text-secondary" />;
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
      <span className="px-1.5 py-0.5 bg-success/20 text-success text-[9px] font-bold rounded uppercase tracking-wide border border-success/20">
        Win!
      </span>
    );
  }
  if (type === 'resolution') {
    return (
      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded uppercase tracking-wide border border-blue-500/20">
        Resolved
      </span>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ActivityCard — memoized individual activity item.
 */
const ActivityCard = memo(({ activity, index, onMarkRead }) => {
  const [isRead, setIsRead] = useState(activity.read ?? false);

  const handleMarkRead = useCallback((e) => {
    e.stopPropagation();
    setIsRead(true);
    onMarkRead?.(activity.id);
  }, [activity.id, onMarkRead]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={[
        'relative p-3.5 rounded-2xl transition-all cursor-pointer group mb-2',
        isRead
          ? 'bg-white/50 dark:bg-dark-800/40 opacity-70 border border-neutral-200/50 dark:border-dark-700/50'
          : 'bg-white dark:bg-dark-800 border-l-4 border-primary shadow-xl shadow-primary/5',
        'hover:scale-[1.02] hover:bg-white dark:hover:bg-dark-700 active:scale-[0.98]',
      ].join(' ')}
    >
      {/* Unread dot */}
      {!isRead && (
        <div className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm shadow-primary" />
      )}

      <div className="flex gap-4">
        {/* Icon container with glass effect */}
        <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-dark-700/80 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
          {getActivityIcon(activity.type)}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors">
              {activity.title}
            </p>
            {getPriorityBadge(activity.type)}
          </div>
          <p className="text-xs text-neutral-500 truncate dark:text-neutral-400">{activity.desc}</p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-600 flex items-center gap-1">
               {formatTime(activity.time)}
            </p>
            {activity.amount && (
              <span className="text-[10px] font-bold text-success">{activity.amount}</span>
            )}
            {activity.points && (
              <span className="px-1.5 py-0.5 bg-yellow-500/15 text-yellow-500 text-[9px] font-bold rounded border border-yellow-500/20">
                ⭐ {activity.points}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ActivityCard.displayName = 'ActivityCard';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ActivityFeed sidebar component.
 */
const ActivityFeed = ({ isOpen, onClose, isConnected, markets = [] }) => {
  const { address } = useAccount();
  const { activities, isLoading, refresh } = useActivityFeed(address, isConnected, markets);
  const [activeTab, setActiveTab] = useState('live');

  const contentRef = useRef(null);

  // Categorise activities by tab
  const categorizedActivities = useMemo(() => ({
    live:         activities.filter(a => a.type === 'bet_placed' || a.type === 'resolution' || a.type === 'referral'),
    achievements: activities.filter(a => a.type === 'achievement' || a.type === 'bet_won'),
    friends:      activities.filter(a => a.type === 'bet_placed' && a.user?.toLowerCase() !== address?.toLowerCase()),
  }), [activities, address]);

  const handleMarkRead = useCallback((activityId) => {
    console.log('Marked as read:', activityId);
  }, []);

  const renderTimeGroupedActivities = useCallback((items) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <ActivityCard key={item.id} index={idx} activity={item} onMarkRead={handleMarkRead} />
        ))}
      </div>
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
      {/* Mobile backdrop with heavy blur */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-30"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Feed panel - Glassmorphic design */}
      <aside
        className={[
          'fixed right-0 top-0 h-screen border-l border-neutral-200/50 dark:border-dark-700/50 flex flex-col',
          'bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl',
          'w-full sm:w-96 md:w-80 z-40',
          'transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)',
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary/50 opacity-40" />

        {/* Header */}
        <div className="h-20 px-6 border-b border-neutral-200/50 dark:border-dark-700/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Bell size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-extrabold text-neutral-900 dark:text-white text-base leading-none tracking-tight">Activity Feed</h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                 <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                 <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                  {isConnected ? 'Real-time syncing' : 'Wallet disconnected'}
                </p>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-neutral-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex p-1 bg-neutral-100 dark:bg-dark-950/50 rounded-xl gap-1">
            {tabs.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all',
                    isActive
                      ? 'bg-white dark:bg-dark-800 text-primary shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4 scrollbar-none"
        >
          {/* Connection status */}
          {!isConnected && (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500 text-center px-6">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-dark-800 rounded-full flex items-center justify-center mb-4">
                 <Users size={32} className="opacity-20" />
              </div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white mb-2">Connect to Track Props</p>
              <p className="text-xs">Join the real-time activity stream to see global betting trends.</p>
            </div>
          )}

          {/* Loading state */}
          {isConnected && isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-primary mb-4" />
              <p className="text-[10px] uppercase font-black text-neutral-500 tracking-widest">Scanning History...</p>
            </div>
          )}

          {/* Activity List */}
          {isConnected && !isLoading && (
            <AnimatePresence mode="popLayout">
              {currentActivities.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-64 text-neutral-500 text-center opacity-40 px-6"
                >
                  <TrendingUp size={48} className="mb-4" />
                  <p className="text-sm font-bold">Quiet on the chain...</p>
                  <p className="text-xs mt-1">Be the first to place a bet in this category!</p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="pb-10"
                >
                  {renderTimeGroupedActivities(currentActivities)}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-6 bg-gradient-to-t from-white dark:from-dark-900 to-transparent flex-shrink-0">
          <button 
             onClick={refresh}
             className="w-full py-3 px-4 bg-primary text-dark-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
             <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
             {isLoading ? 'Syncing...' : 'Refresh Logs'}
          </button>
        </div>
      </aside>
    </>
  );
};

export default ActivityFeed;