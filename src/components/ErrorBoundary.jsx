import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { createLogger } from '../utils/logger';

const logger = createLogger('ErrorBoundary');


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Error caught by boundary', error, errorInfo);
  }


  render() {
    if (this.state.hasError) {
      if (this.props.variant === 'inline') {
        return (
          <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/50 border-dashed rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center min-h-[250px]">
             <AlertTriangle size={32} className="text-red-500 mb-3" />
             <h3 className="text-red-500 font-bold mb-2">Display Error</h3>
             <p className="text-red-400 text-xs mb-4">This module failed to load properly.</p>
             <button onClick={() => this.setState({ hasError: false })} className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 px-3 py-1 border border-red-200 dark:border-red-800 rounded-lg transition-colors hover:bg-red-200 dark:hover:bg-red-900">
               Retry Render
             </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-white dark:bg-dark-950 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 border-2 border-danger rounded-2xl p-8 max-w-md w-full text-center">
            <AlertTriangle size={64} className="text-danger mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">Something Went Wrong</h2>
            <p className="text-neutral-400 mb-6">
              The app encountered an error. This is usually due to network issues or RPC rate limiting.
            </p>
            <div className="bg-neutral-50 dark:bg-dark-900 border border-neutral-200 dark:border-dark-600 rounded-xl p-4 mb-6 text-left overflow-x-auto">
              <p className="text-xs text-neutral-500 font-mono break-all whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mx-auto transition-all hover:scale-105"
            >
              <RefreshCw size={20} />
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
