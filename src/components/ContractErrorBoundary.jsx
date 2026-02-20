import React from 'react';
import { AlertTriangle, RefreshCw, Settings } from 'lucide-react';

/**
 * Error Boundary for contract-related errors
 * Catches errors from contract calls and shows user-friendly messages
 */
class ContractErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      contractName: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Log to console for debugging
    console.error('Contract Error Boundary caught an error:', error, errorInfo);
    
    // Extract contract name from error message if possible
    const contractMatch = error?.message?.match(/(Trenchy|Prediction|Referral|Achievement|Airdrop|Insurance)/i);
    if (contractMatch) {
      this.setState({ contractName: contractMatch[1] });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      contractName: null 
    });
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, contractName } = this.state;
      
      // Determine error type and message
      let title = 'Contract Error';
      let message = 'Something went wrong with the blockchain connection.';
      let action = 'retry';
      
      if (error?.message?.includes('contract not deployed') || error?.message?.includes('no code')) {
        title = 'Contract Not Deployed';
        message = `The ${contractName || 'smart'} contract is not deployed on this network. Please switch to the correct network or contact support.`;
        action = 'switch';
      } else if (error?.message?.includes('user rejected') || error?.message?.includes('User denied')) {
        title = 'Transaction Rejected';
        message = 'You rejected the transaction in your wallet. No changes were made.';
        action = 'dismiss';
      } else if (error?.message?.includes('insufficient funds')) {
        title = 'Insufficient Funds';
        message = 'You don\'t have enough funds to complete this transaction.';
        action = 'addFunds';
      } else if (error?.message?.includes('network') || error?.message?.includes('connection')) {
        title = 'Network Error';
        message = 'Unable to connect to the blockchain network. Please check your internet connection.';
        action = 'retry';
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="bg-dark-800 border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-neutral-400 mb-6 text-sm">{message}</p>
            
            <div className="flex gap-3 justify-center">
              {action === 'retry' && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-400 text-dark-950 font-bold rounded-xl transition-all"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
              )}
              
              {action === 'switch' && (
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-400 text-dark-950 font-bold rounded-xl transition-all"
                >
                  <Settings size={16} />
                  Switch Network
                </button>
              )}
              
              {action === 'addFunds' && (
                <button
                  onClick={() => this.props.onAddFunds?.()}
                  className="flex items-center gap-2 px-4 py-2 bg-success hover:bg-success-400 text-dark-950 font-bold rounded-xl transition-all"
                >
                  Add Funds
                </button>
              )}
              
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white font-semibold rounded-xl transition-all"
              >
                Dismiss
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-400">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 bg-dark-950 rounded-lg text-xs text-red-400 overflow-auto max-h-32">
                  {error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ContractErrorBoundary;
