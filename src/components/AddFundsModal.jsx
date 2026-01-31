import React from 'react';
import { X, Copy, ExternalLink, DollarSign, ArrowRightLeft, Zap } from 'lucide-react';

const AddFundsModal = ({ isOpen, onClose, network, address }) => {
  if (!isOpen) return null;

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    alert('Address copied!');
  };

  // Helper function to open Uniswap swap interface with pre-filled params
  const openUniswapSwap = () => {
    const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base Mainnet
    const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia
    
    if (network === 'Base Sepolia') {
      // For testnet, open Uniswap testnet or use a DEX aggregator
      const uniswapUrl = `https://app.uniswap.org/#/swap?chain=base-sepolia&inputCurrency=ETH&outputCurrency=${USDC_BASE_SEPOLIA}`;
      window.open(uniswapUrl, '_blank');
    } else {
      // For mainnet, use Uniswap with Base chain
      const uniswapUrl = `https://app.uniswap.org/#/swap?chain=base&inputCurrency=ETH&outputCurrency=${USDC_BASE}`;
      window.open(uniswapUrl, '_blank');
    }
  };

  // Open 1inch swap (alternative to Uniswap)
  const open1inchSwap = () => {
    const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const url = `https://app.1inch.io/#/8453/simple/swap/ETH/USDC`;
    window.open(url, '_blank');
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
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-dark-800 to-dark-700 border-2 border-primary rounded-2xl w-full max-w-2xl shadow-2xl glow-primary relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Scrollable Content */}
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                <DollarSign size={32} className="text-primary" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Add Funds</h2>
              <p className="text-neutral-400">Get USDC to start betting on {networkInfo.name}</p>
            </div>

            {/* Wallet Address */}
            <div className="bg-dark-900 border border-dark-600 rounded-xl p-4 mb-6">
              <p className="text-xs text-neutral-400 mb-2">Your Wallet Address:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-dark-950 px-3 py-2 rounded-lg text-primary break-all">
                  {address}
                </code>
                <button
                  onClick={() => handleCopyAddress(address)}
                  className="bg-primary hover:bg-primary-400 text-dark-950 p-2 rounded-lg transition-all hover:scale-110 shrink-0"
                  title="Copy address"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* PRIORITY: Swap ETH to USDC */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">Fastest Option: Swap Your ETH</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Uniswap Option */}
                <button
                  onClick={openUniswapSwap}
                  className="group bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-2 border-pink-700/50 hover:border-pink-500 rounded-xl p-4 transition-all duration-200 hover:scale-105 text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                      <ArrowRightLeft className="w-6 h-6 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">Uniswap</div>
                      <div className="text-xs text-neutral-400">Best rates, most trusted</div>
                    </div>
                  </div>
                  <div className="bg-dark-900/50 rounded-lg p-2 border border-pink-700/30">
                    <div className="text-xs text-neutral-400">ETH → USDC</div>
                    <div className="text-sm text-pink-400 font-semibold">Recommended ⭐</div>
                  </div>
                </button>

                {/* 1inch Option */}
                {!networkInfo.testnet && (
                  <button
                    onClick={open1inchSwap}
                    className="group bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-2 border-blue-700/50 hover:border-blue-500 rounded-xl p-4 transition-all duration-200 hover:scale-105 text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <ArrowRightLeft className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold text-lg">1inch</div>
                        <div className="text-xs text-neutral-400">DEX aggregator</div>
                      </div>
                    </div>
                    <div className="bg-dark-900/50 rounded-lg p-2 border border-blue-700/30">
                      <div className="text-xs text-neutral-400">ETH → USDC</div>
                      <div className="text-sm text-blue-400 font-semibold">Best price finder</div>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-xs text-neutral-300">
                  💡 <span className="font-bold">Quick Tip:</span> Already have ETH in your wallet? 
                  Swap it to USDC instantly and start betting in under 2 minutes!
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-dark-800 text-neutral-400">Other Options</span>
              </div>
            </div>

            {/* Other Funding Options */}
            <div className="space-y-4">
              {/* Testnet Faucet */}
              {networkInfo.testnet && (
                <div className="bg-dark-900 border-2 border-success/30 rounded-xl p-4 hover:border-success/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-success/20 border-2 border-success flex items-center justify-center text-2xl">
                      🚰
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">Testnet Faucet</h3>
                      <p className="text-sm text-neutral-400">Get free test {networkInfo.nativeToken} for testing</p>
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

              {/* Bridge from Ethereum */}
              <div className="bg-dark-900 border-2 border-primary/30 rounded-xl p-4 hover:border-primary/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl">
                    🌉
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">Bridge from Ethereum</h3>
                    <p className="text-sm text-neutral-400">Transfer USDC from Ethereum L1 to {networkInfo.name}</p>
                  </div>
                </div>
                <a
                  href={networkInfo.bridgeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  Open Base Bridge
                  <ExternalLink size={16} />
                </a>
                <p className="text-xs text-neutral-500 mt-2 text-center">
                  Bridge time: ~10 minutes
                </p>
              </div>

              {/* Buy on Exchanges */}
              <div className="bg-dark-900 border-2 border-secondary/30 rounded-xl p-4 hover:border-secondary/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 border-2 border-secondary flex items-center justify-center text-2xl">
                    💱
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">Buy on Exchanges</h3>
                    <p className="text-sm text-neutral-400">Purchase USDC and withdraw to {networkInfo.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="https://www.binance.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-secondary hover:bg-secondary-500 text-dark-950 font-bold py-3 px-4 rounded-xl text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    Binance
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href="https://www.coinbase.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-secondary hover:bg-secondary-500 text-dark-950 font-bold py-3 px-4 rounded-xl text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    Coinbase
                    <ExternalLink size={14} />
                  </a>
                </div>
                <p className="text-xs text-neutral-500 mt-3 text-center">
                  ⚠️ Make sure to select <span className="text-primary font-semibold">{networkInfo.name}</span> network when withdrawing
                </p>
              </div>
            </div>

            {/* Network Info Footer */}
            <div className="mt-6 p-4 bg-dark-900/50 rounded-xl border border-dark-600">
              <p className="text-sm text-neutral-400 text-center">
                <span className="text-white font-semibold">Network:</span> <span className="text-primary font-bold">{networkInfo.name}</span>
                {networkInfo.testnet && <span className="text-secondary ml-2 font-semibold">(Testnet)</span>}
              </p>
              <p className="text-xs text-neutral-500 text-center mt-2">
                ⚡ TrenchyBet only accepts <span className="text-primary font-semibold">USDC</span> for betting
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c0ff00;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4ff33;
        }
      `}</style>
    </div>
  );
};

export default AddFundsModal;