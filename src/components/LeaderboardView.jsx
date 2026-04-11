import React from 'react';
import { Trophy, RefreshCw, Loader2 } from 'lucide-react';

const LeaderboardView = ({ data, isLoading, currentUserAddress }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="mt-4 text-neutral-400">Loading leaderboard...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-800 rounded-2xl border-2 border-neutral-200 dark:border-dark-600">
        <Trophy size={48} className="text-primary mb-4" />
        <p className="text-xl text-neutral-900 dark:text-white mb-2">No Rankings Yet</p>
        <p className="text-neutral-400">Be the first to place a bet and climb the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {data.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="pt-8">
            <div className="bg-gradient-to-br from-neutral-600 to-neutral-700 border-2 border-neutral-500 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-neutral-500 rounded-full flex items-center justify-center text-2xl font-black border-4 border-dark-950">
                2
              </div>
              <div className="text-4xl mb-2">🥈</div>
              <p className="font-mono text-sm text-neutral-900 dark:text-white mb-2">{data[1].displayAddress}</p>
              <div className="space-y-1">
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{data[1].wins} Wins</p>
                <p className="text-sm text-neutral-300">{data[1].winRate}% Win Rate</p>
                <p className="text-xs text-neutral-400">${data[1].totalVolume.toFixed(2)} Volume</p>
              </div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="pt-0">
            <div className="bg-gradient-to-br from-primary to-success border-2 border-primary rounded-2xl p-8 text-center relative glow-primary">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl font-black border-4 border-dark-950 animate-pulse-slow">
                1
              </div>
              <div className="text-5xl mb-3">👑</div>
              <p className="font-mono text-sm text-dark-950 mb-3 font-bold">{data[0].displayAddress}</p>
              <div className="space-y-1">
                <p className="text-3xl font-black text-dark-950">{data[0].wins} Wins</p>
                <p className="text-sm text-dark-950 font-semibold">{data[0].winRate}% Win Rate</p>
                <p className="text-xs text-dark-900 font-medium">${data[0].totalVolume.toFixed(2)} Volume</p>
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="pt-8">
            <div className="bg-gradient-to-br from-amber-700 to-amber-800 border-2 border-amber-600 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-2xl font-black border-4 border-dark-950">
                3
              </div>
              <div className="text-4xl mb-2">🥉</div>
              <p className="font-mono text-sm text-neutral-900 dark:text-white mb-2">{data[2].displayAddress}</p>
              <div className="space-y-1">
                <p className="text-2xl font-black text-neutral-900 dark:text-white">{data[2].wins} Wins</p>
                <p className="text-sm text-neutral-200">{data[2].winRate}% Win Rate</p>
                <p className="text-xs text-neutral-300">${data[2].totalVolume.toFixed(2)} Volume</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rest of Rankings */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border-2 border-neutral-200 dark:border-dark-600 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-dark-700 px-6 py-4 border-b border-neutral-200 dark:border-dark-600">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Trophy className="text-secondary" size={24} />
            Full Rankings
          </h3>
        </div>

        <div className="divide-y divide-dark-600">
          {data.slice(data.length >= 3 ? 3 : 0).map((user, index) => {
            const rank = (data.length >= 3 ? 3 : 0) + index + 1;
            const isCurrentUser = currentUserAddress && user.address.toLowerCase() === currentUserAddress.toLowerCase();

            return (
              <div
                key={user.address}
                className={`px-6 py-4 flex items-center justify-between transition-all ${
                  isCurrentUser ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-neutral-100 dark:bg-dark-700'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    isCurrentUser ? 'bg-primary text-dark-950' : 'bg-neutral-100 dark:bg-dark-700 text-neutral-400'
                  }`}>
                    {rank}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-mono font-semibold ${isCurrentUser ? 'text-primary' : 'text-neutral-900 dark:text-white'}`}>
                        {user.displayAddress}
                      </p>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 bg-primary/20 border border-primary text-primary text-xs font-bold rounded-full">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">{user.totalBets} total bets</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{user.wins} Wins</p>
                    <p className="text-xs text-neutral-500">{user.losses} Losses</p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">{user.winRate}%</p>
                    <p className="text-xs text-neutral-500">Win Rate</p>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="text-lg font-bold text-secondary">${user.totalVolume.toFixed(2)}</p>
                    <p className="text-xs text-neutral-500">Volume</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardView;
