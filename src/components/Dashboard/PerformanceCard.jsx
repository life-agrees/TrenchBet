import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, Target, Zap, DollarSign } from 'lucide-react';

/**
 * Performance Card Component
 */
const PerformanceCard = ({ userStats = {} }) => {
  const {
    totalBets    = 0,
    wins         = 0,
    losses       = 0,
    streak       = 0,
    totalWinnings = 0,
    totalLosses  = 0,
    totalWagered = 0,
    roi          = 0,
    winRate      = 0,
  } = userStats;

  const stats = useMemo(() => [
    {
      id: 'winrate',
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      trend: 'up',
      icon: TrendingUp,
      color: 'text-success',
      shadowColor: 'shadow-success/20',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    {
      id: 'roi',
      label: 'ROI',
      value: `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`,
      trend: roi > 0 ? 'up' : 'down',
      icon: roi > 0 ? TrendingUp : TrendingDown,
      color: roi > 0 ? 'text-success' : 'text-red-400',
      shadowColor: roi > 0 ? 'shadow-success/20' : 'shadow-red-500/20',
      bgColor: roi > 0 ? 'bg-success/10' : 'bg-red-500/10',
      borderColor: roi > 0 ? 'border-success/20' : 'border-red-500/20',
    },
    {
      id: 'streak',
      label: 'Current Streak',
      value: `${streak}`,
      trend: streak > 0 ? 'up' : 'neutral',
      icon: Zap,
      color: 'text-yellow-400',
      shadowColor: 'shadow-yellow-400/20',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/20',
    },
    {
      id: 'winnings',
      label: 'Total Winnings',
      value: `$${totalWinnings.toFixed(2)}`,
      trend: totalWinnings > 0 ? 'up' : 'neutral',
      icon: DollarSign,
      color: 'text-primary',
      shadowColor: 'shadow-primary/20',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
  ], [winRate, roi, streak, totalWinnings]);

  const avgBetSize = totalBets > 0 ? (totalWagered / totalBets).toFixed(2) : '0.00';

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      {/* Main KPI Cards */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              variants={item}
              key={stat.id}
              className={`relative overflow-hidden group ${stat.bgColor} border ${stat.borderColor} rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${stat.shadowColor} backdrop-blur-md`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <div className="text-4xl font-black text-neutral-900 dark:text-white mb-2 relative z-10 tracking-tight">
                {stat.value}
              </div>
              
              <div className="relative z-10">
                {stat.trend === 'up' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-success">
                    <TrendingUp size={12} strokeWidth={3} /> Momentum High
                  </div>
                )}
                {stat.trend === 'down' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                    <TrendingDown size={12} strokeWidth={3} /> Decreased
                  </div>
                )}
                {stat.trend === 'neutral' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Stable Profile
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Secondary Stats Row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white/40 dark:bg-dark-900/40 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 rounded-2xl p-6 hover:border-secondary/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Total Bets</span>
            <Target size={20} className="text-secondary/60 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{totalBets}</div>
          {wins > 0 && (
            <div className="flex items-center gap-2 mt-3">
               <span className="px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold rounded uppercase border border-success/20">{wins} Wins</span>
               <span className="px-2 py-0.5 bg-red-400/10 text-red-400 text-[10px] font-bold rounded uppercase border border-red-400/20">{losses} Losses</span>
            </div>
          )}
        </div>

        <div className="bg-white/40 dark:bg-dark-900/40 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 rounded-2xl p-6 hover:border-red-400/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Wagered Vol</span>
            <TrendingDown size={20} className="text-red-400/60 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">${totalWagered.toFixed(2)}</div>
          <div className="text-[10px] text-neutral-500 mt-3 font-bold uppercase tracking-widest">Across {totalBets} markets</div>
        </div>

        <div className="bg-white/40 dark:bg-dark-900/40 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 rounded-2xl p-6 hover:border-primary/40 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">Avg Stake</span>
            <DollarSign size={20} className="text-primary/60 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">${avgBetSize}</div>
          <div className="text-[10px] text-primary mt-3 font-bold uppercase tracking-widest italic">Moderate Risk</div>
        </div>
      </motion.div>
    </div>
  );
};

export default PerformanceCard;