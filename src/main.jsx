import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { sdk } from '@farcaster/miniapp-sdk';
import App from './app';
import ErrorBoundary from './components/ErrorBoundary';
import PreLoader from './components/PreLoader';
import { config } from './config/wagmi';
import { Analytics } from '@vercel/analytics/react';
import { DURATIONS, CACHE } from './utils/constants';
import { createLogger } from './utils/logger';
import { initSentry } from './config/sentry';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';


// Initialize Sentry error tracking
initSentry();


const logger = createLogger('main');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DURATIONS.REFRESH_INTERVAL, // Data stays fresh for 30 seconds
      cacheTime: CACHE.POINTS_TTL, // Cache for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      retry: 2, // Retry failed requests twice
    },
  },
});

// Initialize Farcaster SDK
const initFarcaster = async () => {
  try {
    // Signal that the app is ready
    await sdk.actions.ready();
    logger.info('Farcaster SDK initialized');
    
    // Get user context
    const context = await sdk.context;
    logger.info('User context retrieved', context);
  } catch (error) {
    logger.error('Error initializing Farcaster SDK', error);
  }
};

initFarcaster();

// Root component with PreLoader
const Root = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <React.StrictMode>
      {isLoading && <PreLoader onLoadingComplete={handleLoadingComplete} />}
      <ErrorBoundary>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider 
              theme={darkTheme({
                accentColor: '#CDFF00',
                accentColorForeground: '#0a0e12',
                borderRadius: 'large',
              })}
            >
              <App />
              <Analytics />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
