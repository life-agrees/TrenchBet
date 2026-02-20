import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, Filter, Clock, Trophy, DollarSign, Users, Gift, Target } from 'lucide-react';
import useEnhancedNotifications from '../hooks/useEnhancedNotifications';
import { NOTIFICATION_TYPES } from '../utils/notificationTypes';

/**
 * NotificationCenter Component
 * Displays notification history with filtering and management
 */
const NotificationCenter = ({ isOpen, onClose }) => {
  const {
    notificationHistory,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useEnhancedNotifications();

  const [filter, setFilter] = useState('all');
  const [filteredNotifications, setFilteredNotifications] = useState([]);

  // Filter notifications
  useEffect(() => {
    if (filter === 'all') {
      setFilteredNotifications(notificationHistory);
    } else {
      setFilteredNotifications(
        notificationHistory.filter(n => n.type === filter)
      );
    }
  }, [notificationHistory, filter]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const config = NOTIFICATION_TYPES[type];
    return config?.icon || '📌';
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Get unique notification types for filter
  const getNotificationTypes = () => {
    const types = new Set(notificationHistory.map(n => n.type));
    return Array.from(types);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative bg-dark-900 border-2 border-primary/30 rounded-2xl w-full max-w-md shadow-2xl glow-primary animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="text-primary" size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">Notifications</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <X size={18} className="text-neutral-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-3 border-b border-dark-700 bg-dark-800/50">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-neutral-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-dark-700 border border-dark-600 rounded-lg px-2 py-1 text-sm text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All</option>
              {getNotificationTypes().map(type => (
                <option key={type} value={type}>
                  {NOTIFICATION_TYPES[type]?.title || type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              title="Mark all as read"
            >
              <Check size={14} className="text-neutral-400" />
            </button>
            <button
              onClick={clearAll}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              title="Clear all"
            >
              <Trash2 size={14} className="text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Notification List */}
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
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-dark-800 ${
                    !notification.read ? 'bg-primary/5 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                          {notification.title}
                        </h3>
                        <span className="text-xs text-neutral-500 whitespace-nowrap">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-400 line-clamp-2">
                        {notification.message}
                      </p>
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
        <div className="p-3 border-t border-dark-700 bg-dark-800/50 text-center">
          <p className="text-xs text-neutral-500">
            {notificationHistory.length} notifications
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
