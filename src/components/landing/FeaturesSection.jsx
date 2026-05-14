import React from 'react';
import { Shield, Zap, Globe, Lock, Star, TrendingUp } from 'lucide-react';

export const FeaturesSection = ({ onLaunchApp }) => {
  const features = [
    {
      icon: Zap,
      title: '15-Min Markets',
      description: 'Ultra-fast prediction cycles with instant settlements. No waiting days for results.'
    },
    {
      icon: Star,
      title: 'Points-to-Earn',
      description: 'Earn points with every bet. Convert to $TRENCHY tokens and unlock exclusive rewards.'
    },
    {
      icon: Shield,
      title: 'Provably Fair',
      description: 'Chainlink oracles ensure accurate, tamper-proof price feeds and outcomes.'
    },
    {
      icon: TrendingUp,
      title: 'PVP Betting',
      description: 'Player vs Player - you compete against other users, not the house. Fair peer-to-peer wagering.'
    },
    {
      icon: Lock,
      title: 'Non-Custodial',
      description: 'Your funds stay in your wallet until you bet. Full control, zero custody risk.'
    },
    {
      icon: Globe,
      title: 'Multi-Chain Ready',
      description: 'High-speed execution across leading L2 networks. Low fees, instant finality.'
    }
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative bg-dark-900/20">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#c0ff00]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Why TrenchyBet?</h2>
          <p className="text-neutral-300 font-medium max-w-2xl mx-auto">
            The most advanced multi-chain prediction market platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col gap-5 p-8 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl hover:border-[#c0ff00]/40 transition-all duration-300 group shadow-lg"
            >
              <div className="w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#c0ff00]/20 transition-colors">
                <feature.icon className="w-6 h-6 text-[#c0ff00]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed font-medium">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onLaunchApp}
            className="px-10 py-4 bg-[#CDFF00] hover:bg-[#d4ff33] text-dark-950 font-black rounded-xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(205,255,0,0.15)]"
          >
            Start Predicting Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;