import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// Replace with your real VAPID Public Key from your push service (e.g. Firebase, OneSignal, or custom)
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

export const usePushSubscription = (address) => {
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Check if we already have a subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications are not supported in this browser.');
      return;
    }

    setIsSubscribing(true);
    try {
      // 1. Request permission
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      // 2. Register service worker (if not already)
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      
      // 3. Subscribe to push manager
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      };

      const newSubscription = await registration.pushManager.subscribe(subscribeOptions);
      setSubscription(newSubscription);

      // 4. Save to database (Supabase)
      if (address) {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            wallet_address: address.toLowerCase(),
            subscription: JSON.stringify(newSubscription),
            updated_at: new Date().toISOString()
          }, { onConflict: 'wallet_address' });

        if (error) throw error;
      }

      toast.success('Push notifications enabled! 🔔');
    } catch (err) {
      console.error('Push Subscription Error:', err);
      toast.error(err.message || 'Failed to enable push notifications');
    } finally {
      setIsSubscribing(false);
    }
  }, [address]);

  const unsubscribeUser = useCallback(async () => {
    if (!subscription) return;
    
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      
      if (address) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('wallet_address', address.toLowerCase());
      }
      
      toast.success('Push notifications disabled');
    } catch (err) {
      toast.error('Failed to unsubscribe');
    }
  }, [subscription, address]);

  return {
    permission,
    subscription,
    isSubscribing,
    subscribeUser,
    unsubscribeUser,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator
  };
};
