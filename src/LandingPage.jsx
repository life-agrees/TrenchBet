import React from 'react';
import { TrendingUp, Zap, Shield, DollarSign, Clock, Users, Twitter, Send } from 'lucide-react';

const LandingPage = ({ onLaunchApp, liveStats }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#c0ff00] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#c0ff00] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-[#c0ff00] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-[#c0ff00] p-3 rounded-2xl">
                <TrendingUp className="w-12 h-12 text-gray-900" />
              </div>
              <h1 className="ml-4 text-5xl font-black text-white tracking-tight">
                Trenchy<span className="text-[#c0ff00]">Bet</span>
              </h1>
            </div>

            {/* Main Headline */}
            <h2 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight">
              Predict. Bet. <span className="text-[#c0ff00]">Win.</span>
            </h2>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
              The fastest prediction market on Base. Make high-velocity bets on crypto prices with 15-minute cycles and instant, trustless payouts.
            </p>

            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Powered by Chainlink oracles and secured on-chain. No registration, no KYC, just connect and start winning.
            </p>

            {/* CTA Button */}
            <button
              onClick={onLaunchApp}
              className="group relative inline-flex items-center justify-center px-12 py-5 text-xl font-bold text-gray-900 bg-[#c0ff00] rounded-2xl hover:bg-[#d4ff33] transition-all duration-200 shadow-2xl hover:shadow-[#c0ff00]/50 hover:scale-105 transform"
            >
              <Zap className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
              Launch App
              <TrendingUp className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Trust Badges */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#c0ff00]" />
                <span>Audited Smart Contracts</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#c0ff00]" />
                <span>0% Deposit Fees</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#c0ff00]" />
                <span>15-Min Markets</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats Section */}
      {liveStats && (
        <div className="bg-gray-800/50 border-t border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
                <div className="text-4xl font-black text-[#c0ff00] mb-2">
                  ${liveStats.totalVolume?.toLocaleString() || '0'}
                </div>
                <div className="text-gray-400 font-medium">Total Volume</div>
              </div>
              <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
                <div className="text-4xl font-black text-[#c0ff00] mb-2">
                  {liveStats.activeMarkets || '0'}
                </div>
                <div className="text-gray-400 font-medium">Active Markets</div>
              </div>
              <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
                <div className="text-4xl font-black text-[#c0ff00] mb-2">
                  {liveStats.totalBets || '0'}
                </div>
                <div className="text-gray-400 font-medium">Total Bets Placed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-black text-white mb-4">
            How It <span className="text-[#c0ff00]">Works</span>
          </h3>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start winning in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative p-8 bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-[#c0ff00]/50 transition-all duration-300 group">
            <div className="absolute -top-6 left-8 w-12 h-12 bg-[#c0ff00] rounded-full flex items-center justify-center text-gray-900 font-black text-xl">
              1
            </div>
            <div className="mt-8 mb-4">
              <div className="w-16 h-16 bg-[#c0ff00]/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#c0ff00]/20 transition-colors">
                <Users className="w-8 h-8 text-[#c0ff00]" />
              </div>
              <h4 className="text-2xl font-bold text-white mb-3">Connect Wallet</h4>
              <p className="text-gray-400 leading-relaxed">
                Connect your Web3 wallet (MetaMask, Rainbow, etc.) to the Base network. No registration or KYC required.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative p-8 bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-[#c0ff00]/50 transition-all duration-300 group">
            <div className="absolute -top-6 left-8 w-12 h-12 bg-[#c0ff00] rounded-full flex items-center justify-center text-gray-900 font-black text-xl">
              2
            </div>
            <div className="mt-8 mb-4">
              <div className="w-16 h-16 bg-[#c0ff00]/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#c0ff00]/20 transition-colors">
                <TrendingUp className="w-8 h-8 text-[#c0ff00]" />
              </div>
              <h4 className="text-2xl font-bold text-white mb-3">Choose Market</h4>
              <p className="text-gray-400 leading-relaxed">
                Pick a market (BTC, ETH, SOL) and predict if the price will go UP or DOWN in the next 15 minutes.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative p-8 bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-[#c0ff00]/50 transition-all duration-300 group">
            <div className="absolute -top-6 left-8 w-12 h-12 bg-[#c0ff00] rounded-full flex items-center justify-center text-gray-900 font-black text-xl">
              3
            </div>
            <div className="mt-8 mb-4">
              <div className="w-16 h-16 bg-[#c0ff00]/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#c0ff00]/20 transition-colors">
                <DollarSign className="w-8 h-8 text-[#c0ff00]" />
              </div>
              <h4 className="text-2xl font-bold text-white mb-3">Win Instantly</h4>
              <p className="text-gray-400 leading-relaxed">
                If you're correct, your winnings are automatically sent to your wallet. No waiting, no manual claims.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why TrenchyBet Section */}
      <div className="bg-gray-800/30 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-black text-white mb-4">
              Why <span className="text-[#c0ff00]">TrenchyBet</span>?
            </h3>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Built different from traditional prediction markets
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
              <Clock className="w-12 h-12 text-[#c0ff00] mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">High-Velocity Markets</h4>
              <p className="text-gray-400">
                15-minute cycles mean faster action, quicker results, and maximum capital efficiency.
              </p>
            </div>

            <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
              <Shield className="w-12 h-12 text-[#c0ff00] mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Provably Fair</h4>
              <p className="text-gray-400">
                All outcomes verified by Chainlink oracles. No centralized control, no manipulation.
              </p>
            </div>

            <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
              <Zap className="w-12 h-12 text-[#c0ff00] mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Instant Payouts</h4>
              <p className="text-gray-400">
                Smart contracts automatically distribute winnings the moment markets resolve.
              </p>
            </div>

            <div className="p-6 bg-gray-900/50 rounded-2xl border border-gray-700">
              <DollarSign className="w-12 h-12 text-[#c0ff00] mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Low Fees</h4>
              <p className="text-gray-400">
                Only 2% fee on winnings. Zero deposit fees, zero withdrawal fees.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <button
              onClick={onLaunchApp}
              className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-gray-900 bg-[#c0ff00] rounded-2xl hover:bg-[#d4ff33] transition-all duration-200 shadow-xl hover:shadow-[#c0ff00]/50 hover:scale-105 transform"
            >
              Start Trading Now
              <TrendingUp className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="bg-[#c0ff00] p-2 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-gray-900" />
                </div>
                <span className="ml-3 text-2xl font-black text-white">
                  Trenchy<span className="text-[#c0ff00]">Bet</span>
                </span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                The fastest prediction market on Base. High-velocity trading with 15-minute cycles and provably fair outcomes.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/life_agreez"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-[#c0ff00] hover:text-gray-900 text-gray-400 rounded-lg flex items-center justify-center transition-all duration-200"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://t.me/trenchybet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-[#c0ff00] hover:text-gray-900 text-gray-400 rounded-lg flex items-center justify-center transition-all duration-200"
                  aria-label="Telegram"
                >
                  <Send className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h5 className="text-white font-bold mb-4">Product</h5>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button onClick={onLaunchApp} className="hover:text-[#c0ff00] transition-colors">
                    Launch App
                  </button>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-[#c0ff00] transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="https://trench-bet.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-[#c0ff00] transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Info */}
            <div>
              <h5 className="text-white font-bold mb-4">Information</h5>
              <ul className="space-y-2 text-gray-400">
                <li className="text-sm">
                  Network: <span className="text-[#c0ff00] font-mono">Base</span>
                </li>
                <li className="text-sm">
                  Status: <span className="text-green-400">Live on Testnet</span>
                </li>
                <li>
                  <a href="mailto:pndukwe824@gmail.com" className="hover:text-[#c0ff00] transition-colors text-sm">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <div>
              © 2026 TrenchyBet. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <span className="text-gray-600">Built on Base</span>
              <span className="text-gray-600">Powered by Chainlink</span>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
