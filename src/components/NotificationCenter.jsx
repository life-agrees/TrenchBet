import React, { useState, useMemo } from 'react';
import { Bell, X, Check, Trash2, Filter } from 'lucide-react';
import { NOTIFICATION_TYPES } from '../utils/notificationTypes';

/**
 * NotificationCenter
 *
 * FIX 1: Previously called `useEnhancedNotifications()` internally, completely
 *         ignoring the `notifications`, `unreadCount`, `onMarkAsRead`, and
 *         `onMarkAllAsRead` props passed from App.jsx. This created a second
 *         isolated hook instance — the panel always showed empty because its
 *         private instance had no notifications, while App's instance did.
 *         Now uses props exclusively. No hook call inside this component.
 *
 * FIX 2: `filteredNotifications` was `useState + useEffect` — always one
 *         render behind. Replaced with `useMemo` (computed synchronously).
 *
 * Props expected (all passed from App.jsx's useEnhancedNotifications call):
 *   isOpen, onClose, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead
 */
const NotificationCenter = ({
  isOpen,
  onClose,
  notifications    = [],   // FIX 1: from App.jsx's hook instance
  unreadCount      = 0,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [filter, setFilter] = useState('all');

  // FIX 2: useMemo instead of useState + useEffect — always in sync
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const getNotificationIcon = (type) => NOTIFICATION_TYPES[type]?.icon || '📌';

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    if (diff < 60_000)   return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Unique types present in current notifications
  const notificationTypes = useMemo(
    () => [...new Set(notifications.map(n => n.type))],
    [notifications]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-neutral-50 dark:bg-dark-900 border-2 border-primary/30 rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-dark-700 bg-white dark:bg-dark-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="text-primary" size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-neutral-900 dark:text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Notifications</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:bg-dark-700 transition-colors">
            <X size={18} className="text-neutral-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-dark-700 bg-white dark:bg-dark-800/50">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-neutral-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-600 rounded-lg px-2 py-1 text-sm text-neutral-900 dark:text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All</option>
              {notificationTypes.map(type => (
                <option key={type} value={type}>
                  {NOTIFICATION_TYPES[type]?.title || type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="p-2 hover:bg-neutral-100 dark:bg-dark-700 rounded-lg transition-colors"
              title="Mark all as read"
            >
              <Check size={14} className="text-neutral-400" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <Bell size={48} className="mb-3 opacity-30" />
              <p className="text-lg">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => onMarkAsRead?.(notification.id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-white dark:bg-dark-800 ${
                    !notification.read ? 'bg-primary/5 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-900 dark:text-white truncate">{notification.title}</h3>
                        <span className="text-xs text-neutral-500 whitespace-nowrap">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-400 line-clamp-2">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-dark-700 bg-white dark:bg-dark-800/50 text-center">
          <p className="text-xs text-neutral-500">{notifications.length} notifications</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;