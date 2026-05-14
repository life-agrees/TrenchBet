import React from 'react';
import { Rocket, Trophy, Zap, ArrowRight } from 'lucide-react';

export const TestimonialsSection = ({ onLaunchApp }) => {
  const perks = [
    {
      icon: Rocket,
      title: 'First Mover Advantage',
      description: 'Early users accumulate points and build leaderboard ranking before the crowd arrives.',
    },
    {
      icon: Trophy,
      title: 'Points That Matter',
      description: 'Every bet you place now earns TRENCHY points. These convert to tokens at launch.',
    },
    {
      icon: Zap,
      title: 'Instant Settlements',
      description: '15-minute markets mean you\'re never waiting long. Place a bet, check the price, collect your win.',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-full mb-6">
            <span className="w-2 h-2 bg-[#c0ff00] rounded-full animate-pulse" />
            <span className="text-[#c0ff00] text-sm font-semibold tracking-wide">Early Access — Multi-Chain Testnet Live</span>
          </div>
          <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">
            Be Among the First
          </h2>
          <p className="text-neutral-300 font-medium max-w-xl mx-auto">
            TrenchyBet is live and growing. Early adopters earn the most points and shape the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {perks.map((perk, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 hover:border-[#c0ff00]/40 transition-all duration-300 group shadow-xl flex flex-col gap-4"
            >
              <div className="w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center group-hover:bg-[#c0ff00]/20 transition-colors">
                <perk.icon className="w-6 h-6 text-[#c0ff00]" />
              </div>
              <h3 className="text-white font-black text-lg tracking-tight">{perk.title}</h3>
              <p className="text-neutral-300 text-sm leading-relaxed font-medium">{perk.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onLaunchApp}
            className="group inline-flex items-center gap-3 px-10 py-4 bg-[#c0ff00] hover:bg-[#d4ff33] text-gray-900 font-black rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#c0ff00]/20 text-lg"
          >
            Start Predicting Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-neutral-500 text-sm mt-4">No sign-up. Just connect your wallet and go.</p>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;