import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Zap, Trophy, Target } from 'lucide-react';
import { useAccount } from 'wagmi';
import useActivityFeed from '../../hooks/useActivityFeed';

/**
 * GlobalActivityTicker
 * 
 * A premium, sportsbook-style marquee that scrolls through global platform activity.
 * Uses real-time data from the useActivityFeed hook.
 */
const GlobalActivityTicker = () => {
  const { address } = useAccount();
  const { activities, isLoading } = useActivityFeed(address, true);

  // Filter for key activities to display in the ticker (bets and wins)
  const tickerItems = useMemo(() => {
    return activities
      .filter(a => a.type === 'bet_placed' || a.type === 'bet_won' || a.type === 'resolution')
      .slice(0, 10);
  }, [activities]);

  if (isLoading && tickerItems.length === 0) return null;

  return (
    <div className="w-full bg-neutral-900/50 dark:bg-dark-950/50 backdrop-blur-md border-b border-primary/10 h-10 overflow-hidden flex items-center relative z-20">
      {/* Label */}
      <div className="flex-shrink-0 bg-primary/20 px-4 h-full flex items-center gap-2 border-r border-primary/20 relative z-10">
        <Zap size={14} className="text-primary animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Feed</span>
      </div>

      {/* Marquee Container */}
      <div className="flex-1 relative overflow-hidden h-full">
        <motion.div 
          className="flex items-center gap-12 whitespace-nowrap px-8 h-full"
          animate={{ x: [0, -1000] }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {tickerItems.length > 0 ? (
            // Duplicate items to ensure smooth infinite loop
            [...tickerItems, ...tickerItems].map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex items-center gap-3 text-[11px] font-semibold">
                <div className="p-1 rounded bg-dark-800/50 border border-neutral-700/50">
                  {item.type === 'bet_won' ? <Trophy size={10} className="text-success" /> : 
                   item.type === 'resolution' ? <TrendingUp size={10} className="text-blue-400" /> : 
                   <Target size={10} className="text-primary" />}
                </div>
                <span className="text-neutral-400">
                  <span className="text-neutral-100">{item.title}</span>: {item.desc}
                </span>
                {item.amount && (
                  <span className={item.type === 'bet_won' ? 'text-success' : 'text-primary'}>
                    {item.amount}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-neutral-500 italic text-[11px]">Waiting for new activity...</div>
          )}
        </motion.div>
      </div>

      {/* Fade Gradients */}
      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-neutral-900/80 dark:from-dark-950/80 to-transparent pointer-events-none" />
    </div>
  );
};

export default GlobalActivityTicker;
