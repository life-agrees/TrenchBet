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
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

// FIX: No top-level await (not supported in ES2020 / your Vite target).
// Since config/sentry.js exists, import it statically and guard the init call.
import { initSentry } from './config/sentry';
try { initSentry(); } catch (e) { console.warn('Sentry init failed:', e); }

const logger = createLogger('main');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            DURATIONS.REFRESH_INTERVAL,
      cacheTime:            CACHE.POINTS_TTL,
      refetchOnWindowFocus: false,
      retry:                2,
    },
  },
});

const initFarcaster = async () => {
  try {
    await sdk.actions.ready();
    logger.info('Farcaster SDK initialized');
    const context = await sdk.context;
    logger.info('User context retrieved', context);
  } catch (error) {
    logger.error('Error initializing Farcaster SDK', error);
  }
};

initFarcaster();

const Root = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <React.StrictMode>
      {isLoading && <PreLoader onLoadingComplete={() => setIsLoading(false)} />}
      <ErrorBoundary>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor:           '#CDFF00',
                accentColorForeground: '#0a0e12',
                borderRadius:          'large',
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