import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('useNotifications');

export const useNotifications = () => {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      setEnabled(Notification.permission === 'granted');
    }
  }, []);

  const enable = useCallback(async () => {
    if (!isSupported) {
      logger.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      const isEnabled = result === 'granted';
      setEnabled(isEnabled);
      return isEnabled;
    } catch (err) {
      logger.error('Error requesting notification permission:', err);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title, options = {}) => {
    if (!isSupported || !enabled) {
      logger.warn('Cannot show notification - not supported or not enabled');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'trenchybet-notification',
        requireInteraction: false,
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (err) {
      logger.error('Error showing notification:', err);
    }
  }, [isSupported, enabled]);

  return {
    enabled,
    permission,
    isSupported,
    enable,
    showNotification
  };
};

export default useNotifications;
