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
      title: 'Base Network',
      description: 'Lightning-fast transactions with minimal fees. Built on Coinbase L2.'
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Why TrenchyBet?</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            The most advanced prediction market platform on Base
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 p-6 bg-gray-800/30 border border-gray-700/50 rounded-xl hover:border-[#c0ff00]/30 transition-all group"
            >
              <div className="w-12 h-12 bg-[#c0ff00]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#c0ff00]/20 transition-colors">
                <feature.icon className="w-6 h-6 text-[#c0ff00]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onLaunchApp}
            className="px-8 py-4 bg-[#c0ff00] hover:bg-[#d4ff33] text-gray-900 font-bold rounded-xl transition-all hover:scale-105"
          >
            Start Predicting Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;