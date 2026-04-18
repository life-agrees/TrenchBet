import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect if device is iOS (iPhone/iPad/iPod)
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Detect if the app is already installed or running as a standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setIsInstallable(true); // iOS theoretically can always attempt to install via Share button
    }

    // Capture standard PWA installation event triggered by Chrome/Android
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome from automatically displaying the native prompt banner
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Clean up
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isIOS) {
      // iOS doesn't support programmatic install initiation
      toast('Tap the Share icon below ➦ and select "Add to Home Screen" to install TrenchyBet!', {
        duration: 6000,
        icon: '📱',
      });
      return;
    }

    if (!deferredPrompt) {
      toast.error('The App is already installed or your browser does not support automatic installation.');
      return;
    }

    // Show the native browser installation prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      // The user accepted the PWA installation
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  }, [deferredPrompt, isIOS]);

  return { isInstallable, handleInstallClick, isIOS };
};
