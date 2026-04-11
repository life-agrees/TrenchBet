import React from 'react';
import { Bell, X } from 'lucide-react';

/**
 * NotificationSettings
 *
 * FIX: Component previously used its own isolated `useState` and ignored
 *      all props from App.jsx. App.jsx passes:
 *        settings={notificationSettings}    ← from useEnhancedNotifications
 *        onUpdateSettings={updateSettings}  ← from useEnhancedNotifications
 *      Both were silently discarded. Every toggle change was lost the moment
 *      the modal closed because the state lived only inside this component.
 *
 *      Fix: remove local useState entirely. Read from `settings` prop,
 *      write through `onUpdateSettings` prop. Changes now persist in
 *      useEnhancedNotifications (and to localStorage via that hook).
 */
export const NotificationSettings = ({
  isOpen,
  onClose,
  settings      = {},       // from App.jsx's useEnhancedNotifications
  onUpdateSettings,         // from App.jsx's useEnhancedNotifications
}) => {
  if (!isOpen) return null;

  // Map internal setting keys to human-readable labels
  const SETTING_LABELS = {
    enabled:              'Notifications Enabled',
    desktop:              'Desktop Notifications',
    betPlaced:            'Bet Placed',
    betWon:               'Bet Won',
    betLost:              'Bet Lost',
    marketEnding:         'Market Ending Soon',
    referralJoined:       'Referral Joined',
    pointsEarned:         'Points Earned',
    achievementUnlocked:  'Achievement Unlocked',
    airdropClaimable:     'Airdrop Claimable',
    insuranceActivated:   'Insurance Activated',
    creditAwarded:        'Credit Awarded',
  };

  const handleToggle = (key) => {
    if (typeof onUpdateSettings === 'function') {
      onUpdateSettings({ [key]: !settings[key] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-50 dark:bg-dark-900 border border-neutral-200 dark:border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Notification Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 dark:text-white hover:bg-white dark:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {Object.entries(SETTING_LABELS).map(([key, label]) => {
            const value = settings[key] ?? true;
            return (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-neutral-300 text-sm">{label}</span>
                {/* FIX: toggle calls onUpdateSettings instead of local setState */}
                <button
                  onClick={() => handleToggle(key)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    value ? 'bg-primary' : 'bg-neutral-200 dark:bg-dark-600'
                  }`}
                  aria-label={`Toggle ${label}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;