import React from 'react';
import { Users, Zap, Shield, Globe, Lock, ChevronRight } from 'lucide-react';

const AboutSection = ({ onLaunchApp }) => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c0ff00]/5 to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">About TrenchyBet</h2>
          <p className="text-neutral-300 font-medium max-w-2xl mx-auto">
            We're Building Markets for Everything
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* We're Building Markets for Everything */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-10 shadow-2xl">
            <p className="text-neutral-200 leading-relaxed text-xl drop-shadow-sm">
              TrenchyBet started with a simple idea: prediction markets shouldn't be complicated, slow, or expensive.
            </p>
            <p className="text-neutral-200 leading-relaxed text-xl mt-6 drop-shadow-sm">
              We're a team of builders who got tired of centralized prediction platforms where outcomes take forever to settle, fees eat your profits, and you're never quite sure if the house is playing fair. So we built something better.
            </p>
          </div>

          {/* What We Do */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-10 shadow-xl">
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight">What We Do</h3>
            <p className="text-neutral-200 leading-relaxed text-xl">
              TrenchyBet is a decentralized prediction market platform built for a multi-chain future. We let you bet on crypto price movements, create custom markets, and settle everything on-chain with zero middlemen.
            </p>
            <p className="text-neutral-200 leading-relaxed text-xl mt-6">
              No KYC. No withdrawal limits. No "trust us, bro." Just you, your wallet, and Chainlink price feeds that don't lie.
            </p>
          </div>

          {/* Why We're Different */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-10 shadow-xl">
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-8 tracking-tight">Why We're Different</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-neutral-900 dark:text-white font-bold text-lg mb-2 tracking-tight">Speed</h4>
                  <p className="text-neutral-300 text-sm leading-relaxed font-medium">Markets settle in minutes, not days. When the timer hits zero, Chainlink tells us the price, and winners get paid. Simple.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-neutral-900 dark:text-white font-bold text-lg mb-2 tracking-tight">Transparency</h4>
                  <p className="text-neutral-300 text-sm leading-relaxed font-medium">Every bet, every market, every payout lives on-chain. You can verify everything yourself on the block explorer.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-neutral-900 dark:text-white font-bold text-lg mb-2 tracking-tight">PVP (Player vs Player)</h4>
                  <p className="text-neutral-300 text-sm leading-relaxed font-medium">It's you vs other players, not vs the house. We don't take bets against you - we just facilitate fair peer-to-peer wagering.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div>
                  <h4 className="text-neutral-900 dark:text-white font-bold text-lg mb-2 tracking-tight">Your Keys, Your Crypto</h4>
                  <p className="text-neutral-300 text-sm leading-relaxed font-medium">We never custody your funds. Bets go into smart contracts, winners withdraw directly. We literally can't touch your money even if we wanted to.</p>
                </div>
              </div>
            </div>
          </div>

          {/* The Tech */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-10 shadow-xl">
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight">The Tech</h3>
            <p className="text-neutral-200 leading-relaxed text-xl">
              Built on high-performance L2s for low fees and fast finality. Powered by Chainlink for tamper-proof price data. Smart contracts audited and battle-tested.
            </p>
            <p className="text-neutral-200 leading-relaxed text-xl mt-6">
              We're not trying to be Wall Street. We're trying to be better than Wall Street.
            </p>
          </div>

          {/* What's Next */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-10 shadow-xl">
            <h3 className="text-3xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight">What's Next</h3>
            <p className="text-neutral-300 font-bold uppercase text-xs tracking-widest mb-6">Our Roadmap: Just getting started</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {['Sports markets', 'Political events', 'Community-created markets', 'Mobile app', 'Staking rewards'].map((item, index) => (
                <div key={index} className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-neutral-200 font-medium flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#c0ff00]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Join the Trenches */}
          <div className="text-center py-16">
            <h3 className="text-4xl font-black text-neutral-900 dark:text-white mb-6 tracking-tight">Join the Trenches</h3>
            <p className="text-neutral-300 mb-8 max-w-xl mx-auto font-medium text-lg leading-relaxed">
              TrenchyBet isn't just a platform—it's a bet on a future where financial markets are open to everyone, not just the suits.
            </p>
            <p className="text-white mb-10 font-black text-2xl tracking-tight">Ready to get in the trenches?</p>
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
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-neutral-900 dark:text-white font-bold rounded-xl transition-all border border-gray-700 hover:border-[#c0ff00]"
              >
                Join Telegram
              </a>
              <a
                href="https://trench-bet.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-neutral-900 dark:text-white font-bold rounded-xl transition-all border border-gray-700 hover:border-[#c0ff00]"
              >
                Read Docs
              </a>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-gray-700/50 pt-8">
            <p className="text-neutral-400 text-sm text-center mb-4 font-medium">
              <strong className="text-neutral-200">Got questions?</strong> We're active on Discord/Twitter. No question is too basic—we were all beginners once.
            </p>
            <p className="text-neutral-400 text-sm text-center mb-6 font-medium">
              <strong className="text-neutral-200">Want to contribute?</strong> We're open source. Check out our GitHub and submit a PR.
            </p>
            <p className="text-neutral-500 text-xs text-center italic max-w-2xl mx-auto leading-relaxed border-t border-white/5 pt-6">
              *TrenchyBet is experimental software. Only bet what you can afford to lose. We're not financial advisors—we just build the tools.*
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
