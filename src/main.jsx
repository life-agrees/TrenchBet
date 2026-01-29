import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { sdk } from '@farcaster/miniapp-sdk';
import App from './app';
import ErrorBoundary from './components/ErrorBoundary';
import { config } from './config/wagmi';
import { Analytics } from '@vercel/analytics/react';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const queryClient = new QueryClient();

// Initialize Farcaster SDK
const initFarcaster = async () => {
  try {
    // Signal that the app is ready
    await sdk.actions.ready();
    console.log('Farcaster SDK initialized');
    
    // Get user context
    const context = await sdk.context;
    console.log('User context:', context);
  } catch (error) {
    console.error('Error initializing Farcaster SDK:', error);
  }
};

initFarcaster();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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