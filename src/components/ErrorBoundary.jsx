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
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="bg-dark-800 border-2 border-danger rounded-2xl p-8 max-w-md w-full text-center">
            <AlertTriangle size={64} className="text-danger mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Something Went Wrong</h2>
            <p className="text-neutral-400 mb-6">
              The app encountered an error. This is usually due to network issues or RPC rate limiting.
            </p>
            <div className="bg-dark-900 border border-dark-600 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-neutral-500 font-mono break-all">
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
