import React from 'react';
import { Users, Target, DollarSign } from 'lucide-react';

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
      value: isLoading ? null : (stats.activeMarkets || 0).toLocaleString(),
      color: 'text-[#c0ff00]'
    },
    {
      icon: Users,
      label: 'Total Bets',
      value: isLoading ? null : (stats.totalBets || 0).toLocaleString(),
      color: 'text-[#00FF88]'
    },
    {
      icon: DollarSign,
      label: 'Total Volume',
      value: isLoading ? null : `$${((stats.totalVolume || 0) / 1e6).toFixed(2)}M`,
      color: 'text-[#c0ff00]'
    }
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#00FF88]/5 pointer-events-none blur-[100px]" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight">Live Platform Stats</h2>
          <p className="text-neutral-300 font-medium">Real-time data directly from the Base network</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {statItems.map((item, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 text-center hover:border-[#c0ff00]/40 hover:bg-white/10 transition-all duration-300 group shadow-2xl"
            >
              <item.icon className={`w-10 h-10 ${item.color} mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`} />
              <div className="text-3xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">
                {isLoading ? (
                  <span className="inline-block w-20 h-9 bg-white/10 rounded-lg animate-pulse"></span>
                ) : (
                  item.value
                )}
              </div>
              <div className="text-neutral-400 text-xs font-bold uppercase tracking-widest">{item.label}</div>
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