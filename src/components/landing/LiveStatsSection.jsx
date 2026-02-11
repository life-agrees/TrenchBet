import React from 'react';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';

export const LiveStatsSection = ({ liveStats, isLoading }) => {
  const stats = liveStats || {
    activeMarkets: 0,
    totalVolume: 0,
    totalBets: 0
  };

  const statItems = [
    {
      icon: Target,
      label: 'Active Markets',
      value: stats.activeMarkets || 0,
      color: 'text-[#c0ff00]'
    },
    {
      icon: Users,
      label: 'Total Bets',
      value: stats.totalBets || 0,
      color: 'text-[#00FF88]'
    },
    {
      icon: DollarSign,
      label: 'Total Volume',
      value: `$${((stats.totalVolume || 0) / 1e6).toFixed(2)}M`,
      color: 'text-[#c0ff00]'
    },
    {
      icon: TrendingUp,
      label: '24h Change',
      value: '+12.5%',
      color: 'text-[#00FF88]'
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Live Platform Stats</h2>
          <p className="text-gray-400">Real-time data from Base network</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((item, index) => (
            <div
              key={index}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center hover:border-[#c0ff00]/30 transition-colors group"
            >
              <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-4 group-hover:scale-110 transition-transform`} />
              <div className="text-3xl font-bold text-white mb-2">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-gray-700 rounded animate-pulse"></span>
                ) : (
                  item.value
                )}
              </div>
              <div className="text-gray-500 text-sm">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-full">
            <span className="w-2 h-2 bg-[#c0ff00] rounded-full animate-pulse"></span>
            <span className="text-[#c0ff00] text-sm font-medium">Live Data • Updates Every 30s</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveStatsSection;