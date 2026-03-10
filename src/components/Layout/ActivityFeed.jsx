import React, { useState, useMemo, useRef, memo } from 'react';
import { ChevronRight, Bell, TrendingUp, Target, Award, Zap, Users, X, RefreshCw, Loader2 } from 'lucide-react';
import useActivityFeed from '../../hooks/useActivityFeed';
import { useAccount } from 'wagmi';

/**
 * Activity Card Component
 * Displays individual activity with read/unread states and priority indicators
 * Memoized for performance optimization
 */
const ActivityCard = memo(({ activity, onMarkRead }) => {
  const [isRead, setIsRead] = useState(activity.read || false);
  
  const getActivityIcon = (type) => {
    const iconProps = { size: 18 };
    switch (type) {
      case 'market':
      case 'resolution':
        return <TrendingUp {...iconProps} className="text-green-400" />;
      case 'achievement':
        return <Award {...iconProps} className="text-yellow-400" />;
      case 'bet_won':
        return <TrendingUp {...iconProps} className="text-success" />;
      case 'bet_placed':
        return <Target {...iconProps} className="text-primary" />;
      default:
        return <Bell {...iconProps} className="text-neutral-400" />;
    }
  };
  
  const getPriorityBadge = (type) => {
    if (type === 'bet_won') {
      return (
        <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-bold rounded uppercase">
          Win!
        </span>
      );
    }
    if (type === 'resolution') {
      return (
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase">
          Resolved
        </span>
      );
    }
    return null;
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return 'just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };
  
  return (
    <div className={`
      relative p-4 rounded-lg transition-all cursor-pointer group
      ${isRead 
        ? 'bg-dark-800 opacity-70 border border-dark-700' 
        : 'bg-dark-800 border-l-4 border-primary shadow-lg'
      }
      hover:border-primary/30
      active:scale-95 sm:hover:scale-105
    `}>
      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
        </div>
      )}
      
      {/* Content */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
              {activity.title}
            </p>
            {getPriorityBadge(activity.type)}
          </div>
          <p className="text-xs text-neutral-400 mt-1 truncate">{activity.desc}</p>
          <p className="text-xs text-neutral-600 mt-2">{formatTime(activity.time)}</p>
        </div>
      </div>
      
      {/* Mark as read button */}
      {!isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRead(true);
            onMarkRead?.(activity.id);
          }}
          className="absolute bottom-2 right-2 text-xs text-primary hover:underline"
        >
          Mark read
        </button>
      )}
    </div>
  );
});

/**
 * Activity Feed Sidebar Component
 * Shows real-time market movements, achievements, and social activity
 * Features: Time grouping, read/unread states, pull-to-refresh, priority indicators
 */
const ActivityFeed = ({ isOpen, onClose, isConnected }) => {
  const { address } = useAccount();
  const { activities, isLoading, refresh } = useActivityFeed(address, isConnected);
  const [activeTab, setActiveTab] = useState('live'); // live, achievements, friends
  
  // Pull-to-refresh state
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  const contentRef = useRef(null);

  // Time Grouping - Group activities by time period
  const groupedActivities = useMemo(() => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };
    
    activities.forEach(activity => {
      const activityTime = new Date(activity.time).getTime();
      const diff = Date.now() - activityTime;
      const hours = diff / (1000 * 60 * 60);
      
      if (hours < 24) groups.today.push(activity);
      else if (hours < 48) groups.yesterday.push(activity);
      else if (hours < 168) groups.thisWeek.push(activity);
      else groups.older.push(activity);
    });
    
    return groups;
  }, [activities]);

  // Format time for display (legacy function for compatibility)
  const formatTime = (timestamp) => {
    if (!timestamp) return 'just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Categorize activities by type
  const categorizedActivities = useMemo(() => {
    const live = activities.filter(a => a.type === 'market' || a.type === 'resolution');
    const achievements = activities.filter(a => a.type === 'achievement' || a.type === 'bet_won');
    const friends = activities.filter(a => a.type === 'bet_placed' || a.type === 'social');

    return {
      live,
      achievements,
      friends
    };
  }, [activities]);

  // Handle mark as read
  const handleMarkRead = (activityId) => {
    // In a real app, this would update the backend
    console.log('Marked activity as read:', activityId);
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    scrollTop.current = contentRef.current?.scrollTop || 0;
  };
  
  const handleTouchMove = (e) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 80 && scrollTop.current === 0) {
      setIsPulling(true);
    }
  };
  
  const handleTouchEnd = () => {
    if (isPulling) {
      refresh();
      setIsPulling(false);
    }
  };

  // Get activities for current tab
  const getCurrentTabActivities = () => {
    const tabActivities = categorizedActivities[activeTab] || [];
    return tabActivities;
  };

  // Render time grouped activities
  const renderTimeGroupedActivities = (items) => {
    const filteredGrouped = {
      today: items.filter(a => {
        const diff = Date.now() - new Date(a.time).getTime();
        return diff < 24 * 60 * 60 * 1000;
      }),
      yesterday: items.filter(a => {
        const diff = Date.now() - new Date(a.time).getTime();
        return diff >= 24 * 60 * 60 * 1000 && diff < 48 * 60 * 60 * 1000;
      }),
      thisWeek: items.filter(a => {
        const diff = Date.now() - new Date(a.time).getTime();
        return diff >= 48 * 60 * 60 * 1000 && diff < 168 * 60 * 60 * 1000;
      }),
      older: items.filter(a => {
        const diff = Date.now() - new Date(a.time).getTime();
        return diff >= 168 * 60 * 60 * 1000;
      })
    };

    return Object.entries(filteredGrouped).map(([period, periodItems]) => 
      periodItems.length > 0 && (
        <div key={period}>
          <p className="px-4 py-2 text-xs text-neutral-600 uppercase font-bold sticky top-0 bg-dark-900 z-10">
            {period === 'today' ? '🔥 Today' : 
             period === 'yesterday' ? 'Yesterday' : 
             period === 'thisWeek' ? 'This Week' : 'Older'}
          </p>
          <div className="space-y-3 px-1">
            {periodItems.map(item => (
              <ActivityCard 
                key={item.id} 
                activity={item} 
                onMarkRead={handleMarkRead} 
              />
            ))}
          </div>
        </div>
      )
    );
  };

  const getActivityIcon = (type) => {
    const iconProps = { size: 18 };
    switch (type) {
      case 'market':
      case 'resolution':
        return <TrendingUp {...iconProps} className="text-green-400" />;
      case 'achievement':
        return <Award {...iconProps} className="text-yellow-400" />;
      case 'bet_won':
        return <TrendingUp {...iconProps} className="text-success" />;
      case 'bet_placed':
        return <Target {...iconProps} className="text-primary" />;
      default:
        return <Bell {...iconProps} className="text-neutral-400" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 md:hidden z-30"
          onClick={onClose}
        />
      )}

      {/* Activity Feed Sidebar - Fixed on desktop, modal on mobile */}
      <aside
        className={`fixed right-0 top-0 h-screen bg-dark-900 border-l border-dark-700 
          w-full sm:w-96 md:w-80 z-40 flex flex-col transition-all duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between sticky top-0 bg-dark-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bell size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Activity Feed</h3>
              <p className="text-xs text-neutral-500">{isConnected ? 'Live updates' : 'Connect wallet'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={`text-neutral-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="md:hidden p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X size={16} className="text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700 overflow-x-auto sticky top-14 bg-dark-900">
          {[
            { key: 'live', label: '🔴 Live', count: categorizedActivities.live.length },
            { key: 'achievements', label: '🏆 Wins', count: categorizedActivities.achievements.length },
            { key: 'friends', label: '👥 Social', count: categorizedActivities.friends.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-3 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                  {Math.min(tab.count, 9)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content with Pull-to-Refresh */}
        <div 
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
        >
          {/* Pull to refresh indicator */}
          {isPulling && (
            <div className="flex justify-center py-4">
              <RefreshCw className="animate-spin text-primary" size={24} />
            </div>
          )}
          {!isConnected && (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500">
              <Bell size={32} className="mb-2 opacity-50" />
              <p className="text-sm text-center">Connect wallet to see activity</p>
            </div>
          )}

          {isConnected && isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-primary" />
            </div>
          )}

          {isConnected && !isLoading && (
            <>
              {activeTab === 'live' && (
                <div className="space-y-1">
                  {categorizedActivities.live.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Bell size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No live activity</p>
                    </div>
                  ) : (
                    renderTimeGroupedActivities(categorizedActivities.live)
                  )}
                </div>
              )}

              {activeTab === 'achievements' && (
                <div className="space-y-1">
                  {categorizedActivities.achievements.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Award size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No achievements yet</p>
                    </div>
                  ) : (
                    renderTimeGroupedActivities(categorizedActivities.achievements)
                  )}
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="space-y-1">
                  {categorizedActivities.friends.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No friend activity</p>
                    </div>
                  ) : (
                    renderTimeGroupedActivities(categorizedActivities.friends)
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer CTA */}
        {isConnected && (
          <div className="p-4 border-t border-dark-700 sticky bottom-0 bg-dark-900">
            <button className="w-full py-2 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary text-sm font-bold transition-all active:scale-95">
              View All Activity →
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default ActivityFeed;
