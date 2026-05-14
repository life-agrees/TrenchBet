import React from 'react';
import { X, Copy, ExternalLink, DollarSign, ArrowRightLeft, Zap, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useContractAddresses } from '../hooks/useContractAddresses';

const AddFundsModal = ({ isOpen, onClose, network, address, formattedUsdcBalance, usdcBalanceNum }) => {

  if (!isOpen) return null;

  const { explorerUrl, networkName, isArc, isBase, chainId, USDC: USDC_CONTRACT } = useContractAddresses();

  const handleCopyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard!');
  };

  const isTestnet = chainId === 84532 || chainId === 5042002;

  // Helper function to open Uniswap swap interface
  const openUniswapSwap = () => {
    const uniswapUrl = `https://app.uniswap.org/#/swap?chain=${isBase ? 'base' : isArc ? 'arc' : 'base'}&outputCurrency=${USDC_CONTRACT}`;
    window.open(uniswapUrl, '_blank');
  };

  // Open 1inch swap
  const open1inchSwap = () => {
    const chainIdMap = { 84532: '84532', 5042002: '5042002', 8453: '8453' };
    const id = chainIdMap[chainId] || '8453';
    const url = `https://app.1inch.io/#/${id}/simple/swap/ETH/USDC`;
    window.open(url, '_blank');
  };

  const getNetworkInfo = () => {
    if (isArc) {
      return {
        name: 'Arc Testnet',
        faucetUrl: 'https://faucet.arc.net/', // Placeholder for Arc faucet
        bridgeUrl: 'https://bridge.arc.net/',
        explorerUrl: explorerUrl,
        nativeToken: 'ARC',
        testnet: true
      };
    }
    if (isBase) {
      return {
        name: 'Base Sepolia',
        faucetUrl: 'https://sepoliafaucet.com/',
        bridgeUrl: 'https://bridge.base.org/',
        explorerUrl: explorerUrl,
        nativeToken: 'ETH',
        testnet: true
      };
    }
    return {
      name: networkName || 'Network',
      faucetUrl: null,
      bridgeUrl: '#',
      explorerUrl: explorerUrl,
      nativeToken: 'ETH',
      testnet: !networkName?.includes('Mainnet')
    };
  };


  const networkInfo = getNetworkInfo();

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-funds-title"
      aria-describedby="add-funds-description"
    >
      <div className="bg-gradient-to-br from-dark-800 to-dark-700 border-2 border-primary rounded-2xl w-full max-w-2xl shadow-2xl glow-primary relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors z-10"
          aria-label="Close add funds modal"
        >
          <X size={24} aria-hidden="true" />
        </button>

        {/* Scrollable Content */}
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center" aria-hidden="true">
                <DollarSign size={32} className="text-primary" />
              </div>
              <h2 id="add-funds-title" className="text-3xl font-black text-neutral-900 dark:text-white mb-2">Add Funds</h2>
              <p id="add-funds-description" className="text-neutral-400">Get USDC to start betting on {networkInfo.name}</p>
            </div>

            {/* Current Balance Display */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-neutral-400">Current Balance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-xl ${usdcBalanceNum > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {formattedUsdcBalance || '0.00'}
                  </span>
                  <span className="text-sm text-neutral-400">USDC</span>
                </div>
              </div>
              {usdcBalanceNum > 0 ? (
                <p className="mt-2 text-xs text-green-400/80 text-center">
                  ✓ You have funds available for betting
                </p>
              ) : (
                <p className="mt-2 text-xs text-yellow-400/80 text-center">
                  ⚠ No USDC balance detected. Add funds below to start betting.
                </p>
              )}
            </div>


            {/* Wallet Address */}
            <div className="bg-neutral-50 dark:bg-dark-900 border border-neutral-200 dark:border-dark-600 rounded-xl p-4 mb-6">
              <p className="text-xs text-neutral-400 mb-2">Your Wallet Address:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white dark:bg-dark-950 px-3 py-2 rounded-lg text-primary break-all">
                  {address}
                </code>
                <button
                  onClick={() => handleCopyAddress(address)}
                  className="bg-primary hover:bg-primary-400 text-dark-950 p-2 rounded-lg transition-all hover:scale-110 shrink-0"
                  title="Copy address"
                  aria-label="Copy wallet address to clipboard"
                >
                  <Copy size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* PRIORITY: Swap ETH to USDC */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Fastest Option: Swap Your ETH</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Uniswap Option */}
                <button
                  onClick={openUniswapSwap}
                  className="group bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-2 border-pink-700/50 hover:border-pink-500 rounded-xl p-4 transition-all duration-200 hover:scale-105 text-left"
                  aria-label="Swap ETH to USDC on Uniswap"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500/30 transition-colors" aria-hidden="true">
                      <ArrowRightLeft className="w-6 h-6 text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-neutral-900 dark:text-white font-bold text-lg">Uniswap</div>
                      <div className="text-xs text-neutral-400">Best rates, most trusted</div>
                    </div>
                  </div>
                  <div className="bg-neutral-50 dark:bg-dark-900/50 rounded-lg p-2 border border-pink-700/30">
                    <div className="text-xs text-neutral-400">ETH → USDC</div>
                    <div className="text-sm text-pink-400 font-semibold">Recommended ⭐</div>
                  </div>
                </button>

                {/* 1inch Option */}
                {!networkInfo.testnet && (
                  <button
                    onClick={open1inchSwap}
                    className="group bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-2 border-blue-700/50 hover:border-blue-500 rounded-xl p-4 transition-all duration-200 hover:scale-105 text-left"
                    aria-label="Swap ETH to USDC on 1inch"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors" aria-hidden="true">
                        <ArrowRightLeft className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-neutral-900 dark:text-white font-bold text-lg">1inch</div>
                        <div className="text-xs text-neutral-400">DEX aggregator</div>
                      </div>
                    </div>
                    <div className="bg-neutral-50 dark:bg-dark-900/50 rounded-lg p-2 border border-blue-700/30">
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
                <div className="w-full border-t border-neutral-200 dark:border-dark-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-dark-800 text-neutral-400">Other Options</span>
              </div>
            </div>

            {/* Other Funding Options */}
            <div className="space-y-4">
              {/* Testnet Faucet */}
              {networkInfo.testnet && (
                <div className="bg-neutral-50 dark:bg-dark-900 border-2 border-success/30 rounded-xl p-4 hover:border-success/50 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-success/20 border-2 border-success flex items-center justify-center text-2xl" aria-hidden="true">
                      🚰
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Testnet Faucet</h3>
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
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </div>
              )}

              {/* Bridge from Ethereum */}
              <div className="bg-neutral-50 dark:bg-dark-900 border-2 border-primary/30 rounded-xl p-4 hover:border-primary/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl" aria-hidden="true">
                    🌉
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Bridge from Ethereum</h3>
                    <p className="text-sm text-neutral-400">Transfer USDC from Ethereum L1 to {networkInfo.name}</p>
                  </div>
                </div>
                <a
                  href={networkInfo.bridgeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  Open {networkName} Bridge
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
                <p className="text-xs text-neutral-500 mt-2 text-center">
                  Bridge time: ~10 minutes
                </p>
              </div>

              {/* Buy on Exchanges */}
              <div className="bg-neutral-50 dark:bg-dark-900 border-2 border-secondary/30 rounded-xl p-4 hover:border-secondary/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 border-2 border-secondary flex items-center justify-center text-2xl" aria-hidden="true">
                    💱
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Buy on Exchanges</h3>
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
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                  <a
                    href="https://www.coinbase.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-secondary hover:bg-secondary-500 text-dark-950 font-bold py-3 px-4 rounded-xl text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    Coinbase
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
                <p className="text-xs text-neutral-500 mt-3 text-center">
                  ⚠️ Make sure to select <span className="text-primary font-semibold">{networkInfo.name}</span> network when withdrawing
                </p>
              </div>
            </div>

            {/* Network Info Footer */}
            <div className="mt-6 p-4 bg-neutral-50 dark:bg-dark-900/50 rounded-xl border border-neutral-200 dark:border-dark-600">
              <p className="text-sm text-neutral-400 text-center">
                <span className="text-neutral-900 dark:text-white font-semibold">Network:</span> <span className="text-primary font-bold">{networkInfo.name}</span>
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
