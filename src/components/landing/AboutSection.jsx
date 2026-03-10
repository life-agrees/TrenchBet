import React from 'react';
import { Users, Zap, Shield, Globe, Lock, ChevronRight } from 'lucide-react';

const AboutSection = ({ onLaunchApp }) => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">About TrenchyBet</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            We're Building Markets for Everything
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* We're Building Markets for Everything */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8">
            <p className="text-gray-300 leading-relaxed text-lg">
              TrenchyBet started with a simple idea: prediction markets shouldn't be complicated, slow, or expensive.
            </p>
            <p className="text-gray-300 leading-relaxed text-lg mt-4">
              We're a team of builders who got tired of centralized prediction platforms where outcomes take forever to settle, fees eat your profits, and you're never quite sure if the house is playing fair. So we built something better.
            </p>
          </div>

          {/* What We Do */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">What We Do</h3>
            <p className="text-gray-300 leading-relaxed text-lg">
              TrenchyBet is a decentralized prediction market platform built on Base. We let you bet on crypto price movements, create custom markets, and settle everything on-chain with zero middlemen.
            </p>
            <p className="text-gray-300 leading-relaxed text-lg mt-4">
              No KYC. No withdrawal limits. No "trust us, bro." Just you, your wallet, and Chainlink price feeds that don't lie.
            </p>
          </div>

          {/* Why We're Different */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-6">Why We're Different</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Speed</h4>
                  <p className="text-gray-400 text-sm">Markets settle in minutes, not days. When the timer hits zero, Chainlink tells us the price, and winners get paid. Simple.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Transparency</h4>
                  <p className="text-gray-400 text-sm">Every bet, every market, every payout lives on-chain. You can verify everything yourself on BaseScan.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">PVP (Player vs Player)</h4>
                  <p className="text-gray-400 text-sm">It's you vs other players, not vs the house. We don't take bets against you - we just facilitate fair peer-to-peer wagering.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">Your Keys, Your Crypto</h4>
                  <p className="text-gray-400 text-sm">We never custody your funds. Bets go into smart contracts, winners withdraw directly. We literally can't touch your money even if we wanted to.</p>
                </div>
              </div>
            </div>
          </div>

          {/* The Tech */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">The Tech</h3>
            <p className="text-gray-300 leading-relaxed text-lg">
              Built on Base for low fees and fast finality. Powered by Chainlink for tamper-proof price data. Smart contracts audited and battle-tested (okay, still getting there, but we're transparent about it).
            </p>
            <p className="text-gray-300 leading-relaxed text-lg mt-4">
              We're not trying to be Wall Street. We're trying to be better than Wall Street.
            </p>
          </div>

          {/* What's Next */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">What's Next</h3>
            <p className="text-gray-400 mb-4">We're just getting started. Coming soon:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['Sports markets', 'Political events', 'Community-created markets', 'Mobile app', 'Staking rewards'].map((item, index) => (
                <div key={index} className="bg-gray-700/30 rounded-lg px-4 py-2 text-sm text-gray-300 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-[#c0ff00]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Join the Trenches */}
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold text-white mb-4">Join the Trenches</h3>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              TrenchyBet isn't just a platform—it's a bet on a future where financial markets are open to everyone, not just the suits.
            </p>
            <p className="text-gray-300 mb-8 font-medium">Ready to get in the trenches?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onLaunchApp}
                className="px-8 py-4 bg-[#c0ff00] hover:bg-[#d4ff33] text-gray-900 font-bold rounded-xl transition-all hover:scale-105"
              >
                Launch App
              </button>
              <a
                href="https://t.me/trenchybet"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all border border-gray-700 hover:border-[#c0ff00]"
              >
                Join Discord
              </a>
              <a
                href="https://trench-bet.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all border border-gray-700 hover:border-[#c0ff00]"
              >
                Read Docs
              </a>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-gray-700/50 pt-8">
            <p className="text-gray-500 text-sm text-center mb-4">
              <strong>Got questions?</strong> We're active on Discord/Twitter. No question is too basic—we were all beginners once.
            </p>
            <p className="text-gray-500 text-sm text-center mb-4">
              <strong>Want to contribute?</strong> We're open source. Check out our GitHub and submit a PR.
            </p>
            <p className="text-gray-600 text-xs text-center italic">
              *TrenchyBet is experimental software. Only bet what you can afford to lose. We're not financial advisors—we just build the tools.*
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
