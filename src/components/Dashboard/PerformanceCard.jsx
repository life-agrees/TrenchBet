import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Award, Target, Zap, DollarSign } from 'lucide-react';

/**
 * Performance Card Component
 */
const PerformanceCard = ({ userStats = {}, userPoints = 0 }) => {
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
      color: 'text-green-600 dark:text-success',
      shadowColor: 'shadow-green-500/10 dark:shadow-success/20',
      bgColor: 'bg-green-50 dark:bg-success/10',
      borderColor: 'border-green-100 dark:border-success/20',
    },
    {
      id: 'roi',
      label: 'ROI',
      value: `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`,
      trend: roi > 0 ? 'up' : 'down',
      icon: roi > 0 ? TrendingUp : TrendingDown,
      color: roi > 0 ? 'text-green-600 dark:text-success' : 'text-red-600 dark:text-red-400',
      shadowColor: roi > 0 ? 'shadow-green-500/10 dark:shadow-success/20' : 'shadow-red-500/10 dark:shadow-red-500/20',
      bgColor: roi > 0 ? 'bg-green-50 dark:bg-success/10' : 'bg-red-50 dark:bg-red-500/10',
      borderColor: roi > 0 ? 'border-green-100 dark:border-success/20' : 'border-red-100 dark:border-red-500/20',
    },
    {
      id: 'streak',
      label: 'Current Streak',
      value: `${streak}`,
      trend: streak > 0 ? 'up' : 'neutral',
      icon: Zap,
      color: 'text-yellow-600 dark:text-yellow-400',
      shadowColor: 'shadow-yellow-500/10 dark:shadow-yellow-400/20',
      bgColor: 'bg-yellow-50 dark:bg-yellow-400/10',
      borderColor: 'border-yellow-100 dark:border-yellow-400/20',
    },
    {
      id: 'winnings',
      label: 'Total Winnings',
      value: `$${totalWinnings.toFixed(2)}`,
      trend: totalWinnings > 0 ? 'up' : 'neutral',
      icon: DollarSign,
      color: 'text-primary-dark dark:text-primary',
      shadowColor: 'shadow-primary/10 dark:shadow-primary/20',
      bgColor: 'bg-primary/5 dark:bg-primary/10',
      borderColor: 'border-primary/20 dark:border-primary/20',
    },
    {
      id: 'points',
      label: 'Platform Points',
      value: userPoints.toLocaleString(),
      trend: 'neutral',
      icon: Star,
      color: 'text-amber-500 dark:text-yellow-400',
      shadowColor: 'shadow-yellow-500/10 dark:shadow-yellow-400/20',
      bgColor: 'bg-yellow-50 dark:bg-yellow-400/10',
      borderColor: 'border-yellow-100 dark:border-yellow-400/20',
    },
  ], [winRate, roi, streak, totalWinnings, userPoints]);

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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              variants={item}
              key={stat.id}
              className={`relative overflow-hidden group ${stat.bgColor} border ${stat.borderColor} rounded-2xl p-6 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${stat.shadowColor} backdrop-blur-md shadow-sm dark:shadow-none`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-white/10 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <div className="text-4xl font-black text-neutral-900 dark:text-white mb-2 relative z-10 tracking-tight">
                {stat.value}
              </div>
              
              <div className="relative z-10">
                {stat.trend === 'up' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-success">
                    <TrendingUp size={12} strokeWidth={3} /> Momentum High
                  </div>
                )}
                {stat.trend === 'down' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    <TrendingDown size={12} strokeWidth={3} /> Decreased
                  </div>
                )}
                {stat.trend === 'neutral' && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-500">
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
        <div className="bg-white dark:bg-dark-900/40 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-6 hover:border-secondary transition-all group shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest">Total Bets</span>
            <Target size={20} className="text-secondary group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">{totalBets}</div>
          {wins > 0 && (
            <div className="flex items-center gap-2 mt-3">
               <span className="px-2 py-0.5 bg-green-100 dark:bg-success/10 text-green-700 dark:text-success text-[10px] font-bold rounded uppercase border border-green-200 dark:border-success/20">{wins} Wins</span>
               <span className="px-2 py-0.5 bg-red-100 dark:bg-red-400/10 text-red-700 dark:text-red-400 text-[10px] font-bold rounded uppercase border border-red-200 dark:border-red-400/20">{losses} Losses</span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-dark-900/40 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-6 hover:border-red-400 transition-all group shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest">Wagered Vol</span>
            <TrendingDown size={20} className="text-red-500 dark:text-red-400/60 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">${totalWagered.toFixed(2)}</div>
          <div className="text-[10px] text-neutral-600 dark:text-neutral-500 mt-3 font-bold uppercase tracking-widest">Across {totalBets} markets</div>
        </div>

        <div className="bg-white dark:bg-dark-900/40 backdrop-blur-xl border border-neutral-200 dark:border-white/5 rounded-2xl p-6 hover:border-primary transition-all group shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest">Avg Stake</span>
            <DollarSign size={20} className="text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">${avgBetSize}</div>
          <div className="text-[10px] text-primary-dark dark:text-primary mt-3 font-bold uppercase tracking-widest italic">Moderate Risk</div>
        </div>
      </motion.div>
    </div>
  );
};

export default PerformanceCard;