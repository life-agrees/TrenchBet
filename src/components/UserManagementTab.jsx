import React, { useState } from 'react';
import { Search, Filter, Eye, Trash2, AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { formatUnits } from 'viem';

/**
 * User Management Component for Admin Dashboard
 * Tier 5: Advanced user administration and monitoring
 */
const UserManagementTab = ({ users, isLoading, onSuspend, onVerify }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('volume');

  const filteredUsers = (users || [])
    .filter(user => {
      if (filterType === 'active') return true;
      if (filterType === 'suspicious') return user.bets > 50 && !user.verified;
      if (filterType === 'high-volume') return user.volume > 10000;
      return true;
    })
    .filter(user => user.address.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'volume') return b.volume - a.volume;
      if (sortBy === 'bets') return b.bets - a.bets;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-1">User Management</h2>
        <p className="text-sm text-gray-400">Monitor and manage platform users</p>
      </div>

      {/* User Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
          <p className="text-gray-400 text-xs uppercase font-bold mb-2">Total Users</p>
          <p className="text-2xl font-black text-primary">{users?.length || 0}</p>
        </div>
        <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
          <p className="text-gray-400 text-xs uppercase font-bold mb-2">Active (7d)</p>
          <p className="text-2xl font-black text-secondary">{users?.filter(u => u.lastActive > Date.now() - 7 * 86400000).length || 0}</p>
        </div>
        <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
          <p className="text-gray-400 text-xs uppercase font-bold mb-2">High Activity</p>
          <p className="text-2xl font-black text-yellow-400">{users?.filter(u => u.bets > 50).length || 0}</p>
        </div>
        <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
          <p className="text-gray-400 text-xs uppercase font-bold mb-2">Flagged</p>
          <p className="text-2xl font-black text-red-400">{users?.filter(u => u.suspicious).length || 0}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search by address or ENS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-600 rounded-lg text-neutral-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-600 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white text-sm font-semibold"
        >
          <option value="all">All Users</option>
          <option value="active">Active (7d)</option>
          <option value="high-volume">High Volume</option>
          <option value="suspicious">Suspicious Activity</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-600 rounded-lg px-4 py-2.5 text-neutral-900 dark:text-white text-sm font-semibold"
        >
          <option value="volume">Sort by Volume</option>
          <option value="bets">Sort by Bets</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-dark-900/50 border-b border-neutral-200 dark:border-dark-700">
              <tr className="text-left text-xs text-gray-400 font-bold uppercase">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Bets Placed</th>
                <th className="px-6 py-3">Total Volume</th>
                <th className="px-6 py-3">Win Rate</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Last Active</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredUsers.map((user) => (
                <tr key={user.address} className="hover:bg-neutral-100 dark:bg-dark-700/30 transition">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-mono text-neutral-900 dark:text-white text-sm">{user.address.slice(0, 10)}...</p>
                      <p className="text-xs text-gray-500">{user.ens || 'No ENS'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-900 dark:text-white font-bold">{user.bets}</td>
                  <td className="px-6 py-4 text-primary font-bold">${(user.volume / 1000).toFixed(1)}K</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-12 h-2 bg-neutral-100 dark:bg-dark-700 rounded-full overflow-hidden">
                        <div className="h-full bg-success" style={{ width: `${user.winRate || 0}%` }}></div>
                      </div>
                      <span className="ml-2 text-xs text-gray-400">{user.winRate || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{new Date(user.joinedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {Date.now() - user.lastActive < 3600000 ? 'Online' : Math.floor((Date.now() - user.lastActive) / 3600000) + 'h ago'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.suspicious && (
                        <div className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Alert
                        </div>
                      )}
                      {user.verified && (
                        <div className="px-2 py-1 bg-success/10 border border-success/30 rounded text-xs text-success flex items-center gap-1">
                          <Shield size={12} />
                          Verified
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {!user.verified && (
                        <button
                          onClick={() => onVerify?.(user.address)}
                          title="Verify user"
                          className="p-1.5 hover:bg-success/20 text-success rounded transition"
                        >
                          <Shield size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => onSuspend?.(user.address)}
                        title="Suspend user"
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No users found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;
