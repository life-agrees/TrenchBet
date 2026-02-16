import React from 'react';
import { Wallet, TrendingUp, Award, Coins } from 'lucide-react';

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: Wallet,
      title: 'Connect Wallet',
      description: 'Connect your Web3 wallet to access the platform and start predicting.'
    },
    {
      icon: TrendingUp,
      title: 'Make Predictions',
      description: 'Browse 15-minute markets and bet on price movements with USDC.'
    },
    {
      icon: Award,
      title: 'Earn Points',
      description: 'Win bets to earn points. 5x multiplier on wins, streak bonuses, and referrals.'
    },
    {
      icon: Coins,
      title: 'Claim $TRENCHY',
      description: 'Convert 10,000 points to 100 TRENCHY tokens. Stake or trade your rewards.'
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Get started with TrenchyBet in four simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative h-full">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-[#c0ff00]/50 transition-all group h-full flex flex-col">

                <div className="w-12 h-12 bg-[#c0ff00]/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#c0ff00]/30 transition-colors">
                  <step.icon className="w-6 h-6 text-[#c0ff00]" />
                </div>
                <div className="mb-2 text-sm font-bold text-[#c0ff00]">Step {index + 1}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-[#c0ff00]/50 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
