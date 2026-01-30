import React from 'react';
import { X, Copy, ExternalLink, DollarSign } from 'lucide-react';

const AddFundsModal = ({ isOpen, onClose, network, address }) => {
  if (!isOpen) return null;

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address)
    alert('Address copied!');
  };

  const getNetworkInfo = () => {
    if (network === 'Base Sepolia') {
      return {
        name: 'Base Sepolia',
        faucetUrl: 'https://sepoliafaucet.com/',
        bridgeUrl: 'https://bridge.base.org/',
        explorerUrl: 'https://sepolia.basescan.org/',
        nativeToken: 'ETH',
        testnet: true
      };
    }
    return {
      name: network || 'Base',
      faucetUrl: null,
      bridgeUrl: 'https://bridge.base.org/',
      explorerUrl: 'https://basescan.org/',
      nativeToken: 'ETH',
      testnet: false
    };
  };

  const networkInfo = getNetworkInfo();

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-dark-800 to-dark-700 border-2 border-primary rounded-2xl p-6 w-full max-w-lg shadow-2xl glow-primary relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
            <DollarSign size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Add Funds</h2>
          <p className="text-neutral-400">Get USDC to start betting on {networkInfo.name}</p>
        </div>

        {/* Wallet Address */}
        <div className="bg-dark-900 border border-dark-600 rounded-xl p-4 mb-4">
          <p className="text-xs text-neutral-400 mb-2">Your Wallet Address:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-dark-950 px-3 py-2 rounded-lg text-primary break-all">
              {address}
            </code>
            <button
              onClick={() => handleCopyAddress(address)}
              className="bg-primary hover:bg-primary-400 text-dark-950 p-2 rounded-lg transition-all hover:scale-110"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>

        {/* Funding Options */}
        <div className="space-y-4">
          {/* Testnet Faucet */}
          {networkInfo.testnet && (
            <div className="bg-dark-900 border border-success/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-success/20 border border-success flex items-center justify-center">
                  <span className="text-success font-bold">🚰</span>
                </div>
                <div>
                  <h3 className="font-bold text-white">Testnet Faucet</h3>
                  <p className="text-xs text-neutral-400">Get free test {networkInfo.nativeToken}</p>
                </div>
              </div>
              <a
                href={networkInfo.faucetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-success hover:bg-success-dark text-dark-950 font-bold py-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Get Test {networkInfo.nativeToken}
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          {/* Bridge from Mainnet */}
          <div className="bg-dark-900 border border-primary/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center">
                <span className="text-primary font-bold">🌉</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Bridge from Ethereum</h3>
                <p className="text-xs text-neutral-400">Bridge {networkInfo.nativeToken} to {networkInfo.name}</p>
              </div>
            </div>
            <a
              href={networkInfo.bridgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Bridge {networkInfo.nativeToken}
              <ExternalLink size={16} />
            </a>
          </div>

          {/* Centralized Exchanges */}
          <div className="bg-dark-900 border border-secondary/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary flex items-center justify-center">
                <span className="text-secondary font-bold">💱</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Buy on Exchanges</h3>
                <p className="text-xs text-neutral-400">Purchase USDC on major exchanges</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://www.binance.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-secondary hover:bg-secondary-500 text-dark-950 font-bold py-2 px-3 rounded-lg text-sm transition-all hover:scale-105 flex items-center justify-center gap-1"
              >
                Binance
                <ExternalLink size={12} />
              </a>
              <a
                href="https://www.coinbase.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-secondary hover:bg-secondary-500 text-dark-950 font-bold py-2 px-3 rounded-lg text-sm transition-all hover:scale-105 flex items-center justify-center gap-1"
              >
                Coinbase
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Network Info */}
        <div className="mt-6 p-4 bg-dark-900/50 rounded-xl border border-dark-600">
          <p className="text-xs text-neutral-400 text-center">
            Network: <span className="text-primary font-semibold">{networkInfo.name}</span>
            {networkInfo.testnet && <span className="text-secondary ml-2">(Testnet)</span>}
          </p>
          <p className="text-xs text-neutral-500 text-center mt-1">
            Make sure you're sending USDC to the correct network
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddFundsModal;
