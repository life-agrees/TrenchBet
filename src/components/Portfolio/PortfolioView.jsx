import React, { useState } from 'react';
import { Clock, AlertTriangle, Trophy, XCircle, RefreshCw, BarChart3, Download, Award, DollarSign } from 'lucide-react';
import PortfolioBetCard from './PortfolioBetCard';

/**
 * PortfolioView Component
 * Replaces the old myBets tab with a full portfolio dashboard.
 */
const PortfolioView = ({
  userBets = [],
  ongoingBets = [],
  pendingBets = [],
  wonBets = [],
  lostBets = [],
  isLoadingUserBets = false,
  userBetsError = null,
  refreshUserBets = () => {},
  userStats = {},
  handleClaim = () => {},
  handleClaimAdvanced = () => {},
}) => {
  const [betView, setBetView] = useState('ongoing');

  // Calculate un-realized P&L (total wagered on ongoing/pending)
  const unrealizedWagered = [...ongoingBets, ...pendingBets].reduce(
    (sum, bet) => sum + (Number(bet.amount) / 1e6), 0
  );

  const getFilteredBets = () => {
    switch (betView) {
      case 'ongoing': return ongoingBets;
      case 'pending': return pendingBets;
      case 'wins': return wonBets;
      case 'losses': return lostBets;
      default: return userBets;
    }
  };

  const hasClaimable = wonBets.some(bet => bet.isClaimableConfirmed && !bet.claimed);

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-800 rounded-2xl border border-neutral-200 dark:border-dark-700">
      <RefreshCw className="animate-spin text-primary mb-4" size={32} />
      <p className="text-neutral-500 font-medium">Loading your portfolio...</p>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/30">
      <AlertTriangle className="text-red-500 mb-3" size={32} />
      <p className="text-red-600 dark:text-red-400 font-bold mb-2">Failed to load portfolio</p>
      <p className="text-sm text-red-500/80 mb-4">{userBetsError}</p>
      <button
        onClick={refreshUserBets}
        className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
      >
        Try Again
      </button>
    </div>
  );

  const renderEmpty = (message) => (
    <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-800 rounded-2xl border border-neutral-200 dark:border-dark-700 text-neutral-400">
      <div className="w-16 h-16 bg-neutral-100 dark:bg-dark-700 rounded-full flex items-center justify-center mb-4">
        <BarChart3 size={28} className="text-neutral-400" />
      </div>
      <p className="text-lg font-bold text-neutral-900 dark:text-white mb-1">{message}</p>
      <p className="text-sm text-neutral-500">Place a bet to see it tracked here</p>
    </div>
  );

  return (
    <section id="portfolio-panel" role="tabpanel" className="animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="text-primary" size={36} />
            My Portfolio
          </h2>
          <p className="text-neutral-500 font-medium mt-1">Track your active positions and performance</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refreshUserBets()}
            disabled={isLoadingUserBets}
            className="flex items-center justify-center w-12 h-12 bg-white dark:bg-dark-800 hover:bg-neutral-50 dark:hover:bg-dark-700 border border-neutral-200 dark:border-dark-700 rounded-xl transition-all disabled:opacity-50"
            title="Refresh Portfolio"
          >
            <RefreshCw size={20} className={`text-neutral-600 dark:text-neutral-300 ${isLoadingUserBets ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 font-bold rounded-xl transition-all">
            <Download size={18} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Claimable Winnings Banner */}
      {hasClaimable && (
        <div className="mb-8 p-4 bg-secondary/10 border-2 border-secondary/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
              <Trophy className="text-secondary" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white">You have claimable winnings!</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Check the "Wins" tab below to claim your USDC.</p>
            </div>
          </div>
          <button 
            onClick={() => setBetView('wins')}
            className="w-full sm:w-auto px-6 py-2 bg-secondary hover:bg-secondary-500 text-neutral-900 font-bold rounded-xl transition-all whitespace-nowrap"
          >
            View Winnings
          </button>
        </div>
      )}

      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <DollarSign size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Wagered</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            ${(userStats.totalWagered || 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <Trophy size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Won</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-green-600 dark:text-success">
            ${(userStats.totalWinnings || 0).toFixed(2)}
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <Clock size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Active Exposure</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary-dark dark:text-primary">
            ${unrealizedWagered.toFixed(2)}
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <Award size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Win Rate</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {(userStats.winRate || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 p-1 bg-neutral-100 dark:bg-dark-800 rounded-2xl border border-neutral-200 dark:border-dark-700 w-fit">
        {[
          { key: 'ongoing', label: 'Active Positions', count: ongoingBets.length, icon: Clock },
          { key: 'pending', label: 'Pending', count: pendingBets.length, icon: AlertTriangle, hidden: pendingBets.length === 0 },
          { key: 'wins', label: 'Wins', count: wonBets.length, icon: Trophy },
          { key: 'losses', label: 'Losses', count: lostBets.length, icon: XCircle },
        ].filter(item => !item.hidden).map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setBetView(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              betView === key 
                ? 'bg-white dark:bg-dark-700 text-neutral-900 dark:text-white shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Icon size={16} className={betView === key ? 'text-primary' : 'opacity-70'} />
            {label}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${
              betView === key ? 'bg-primary/20 text-primary-dark dark:text-primary' : 'bg-neutral-200 dark:bg-dark-600 text-neutral-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Bets List */}
      <div className="flex flex-col gap-4">
        {isLoadingUserBets ? renderLoading()
          : userBetsError ? renderError()
          : (() => {
            const filteredBets = getFilteredBets();
            if (filteredBets.length === 0) return renderEmpty(`No ${betView === 'ongoing' ? 'active' : betView} bets found`);
            return filteredBets.map(bet => (
              <PortfolioBetCard 
                key={bet.txHash || bet.id} 
                bet={bet} 
                handleClaim={handleClaim} 
                handleClaimAdvanced={handleClaimAdvanced} 
              />
            ));
          })()
        }
      </div>
    </section>
  );
};

export default PortfolioView;
