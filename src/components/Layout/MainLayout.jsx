import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ActivityFeed from './ActivityFeed';
import { Bell, Wallet, Plus, Coins, ChevronDown } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Main Layout Component
 * Wraps the entire app with sidebar navigation and activity feed
 */
const MainLayout = ({
  children,
  currentView,
  onNavigate,
  isConnected,
  isOwner = false,
  formattedUsdcBalance = '$0.00',
  userPoints = 0,
  onAddFunds = () => {},
  chainName = 'Network'
}) => {
  const [activityFeedOpen, setActivityFeedOpen] = useState(false);

  // Map currentView to display name
  const viewNames = {
    dashboard: 'Dashboard',
    portfolio: 'My Portfolio',
    markets: 'Markets',
    leaderboard: 'Leaderboard',
    referrals: 'Referrals',
    achievements: 'Achievements',
    streaks: 'Streaks',
    settings: 'Settings',
    admin: 'Admin Panel'
  };
  const viewName = viewNames[currentView] || currentView;

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={onNavigate}
          isConnected={isConnected}
          isOwner={isOwner}
        />

        {/* Main Content Area */}
        <main
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        >
          {/* Top Header Bar - Complete with all user controls */}
          <header role="banner" className="sticky top-0 z-30 bg-dark-900 border-b border-dark-700 backdrop-blur-md">
            <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
              {/* LEFT SECTION: Page Title + BETA Badge */}
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white capitalize" aria-label={`Current page: ${viewName}`}>
                  {currentView === 'dashboard' && '📊 Dashboard'}
                  {currentView === 'portfolio' && '📈 My Portfolio'}
                  {currentView === 'markets' && '🎯 Markets'}
                  {currentView === 'leaderboard' && '🏆 Leaderboard'}
                  {currentView === 'referrals' && '👥 Referrals'}
                  {currentView === 'achievements' && '🏆 Achievements'}
                  {currentView === 'streaks' && '⚡ Streaks'}
                  {currentView === 'settings' && '⚙️ Settings'}
                  {currentView === 'admin' && '🔧 Admin Panel'}
                </h1>
                {/* BETA Badge */}
                <div className="px-3 py-1 bg-gradient-to-r from-primary/30 to-primary/10 border border-primary/50 rounded-full text-xs font-bold text-primary">
                  BETA v1.0
                </div>
              </div>

              {/* RIGHT SECTION: User Controls - Grouped & Hierarchical */}
              <div className="flex items-center gap-2.5" role="toolbar" aria-label="User controls">
                {/* Mobile Activity Feed Toggle - visible on mobile */}
                <button
                  onClick={() => setActivityFeedOpen(!activityFeedOpen)}
                  className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 text-neutral-400 hover:text-primary transition-all md:hidden relative"
                  title="Toggle activity feed"
                  aria-label="Toggle activity feed"
                >
                  <Bell size={18} />
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </button>

                {/* Group 1: User Stats - Only visible when connected */}
                {isConnected && (
                  <div className="hidden md:flex items-center gap-2">
                    {/* Points Card - Stacked Labels */}
                    <div className="px-3 py-2 bg-dark-800 rounded-xl border border-dark-700">
                      <Coins size={16} className="text-yellow-400 mb-1" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 leading-none">Points</span>
                        <span className="text-sm font-bold text-white">{userPoints}</span>
                      </div>
                    </div>
                    
                    {/* Balance Card */}
                    <div className="px-3 py-2 bg-dark-800 rounded-xl border border-dark-700">
                      <Wallet size={16} className="text-primary mb-1" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 leading-none">Balance</span>
                        <span className="text-sm font-bold text-white">{formattedUsdcBalance}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile: Show compact stats when connected */}
                {isConnected && (
                  <div className="flex md:hidden items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1.5 bg-dark-800 rounded-lg border border-dark-700">
                      <Coins size={14} className="text-yellow-400" />
                      <span className="text-xs font-semibold">{userPoints}</span>
                    </div>
                  </div>
                )}

                {/* Group 2: Primary Action - Add Funds Button */}
                {isConnected && (
                  <button
                    onClick={onAddFunds}
                    className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-primary rounded-xl hover:bg-primary/90 transition-all text-white font-semibold text-sm"
                    aria-label="Add funds to wallet"
                  >
                    <Plus size={16} />
                    <span>Add Funds</span>
                  </button>
                )}

                {/* Mobile: Compact Add Funds */}
                {isConnected && (
                  <button
                    onClick={onAddFunds}
                    className="flex sm:hidden items-center justify-center p-2 bg-primary rounded-lg hover:bg-primary/90 transition-all text-white"
                    aria-label="Add funds"
                  >
                    <Plus size={18} />
                  </button>
                )}

                {/* Divider */}
                {isConnected && <div className="hidden md:block w-px h-8 bg-dark-700" />}

                {/* Group 3: Status & Connection */}
                {isConnected && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-dark-800/50 rounded-xl border border-dark-700/50">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    <span className="text-xs text-neutral-300 font-medium">{chainName}</span>
                  </div>
                )}

                {/* Wallet Connect/Disconnect - Full Button */}
                <div className="hidden sm:block">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                </div>

                {/* Mobile: Compact Connect Button */}
                <div className="flex sm:hidden">
                  <ConnectButton chainStatus="icon" accountStatus="avatar" />
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content Area with Smooth Transitions */}
          <div className="flex-1 overflow-y-auto bg-dark-950">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* Right Activity Feed Sidebar - Fixed on desktop, modal on mobile */}
        <ActivityFeed
          isOpen={activityFeedOpen}
          onClose={() => setActivityFeedOpen(false)}
          isConnected={isConnected}
        />
      </div>

      {/* Footer - Always at bottom */}
      <footer className="mt-auto border-t border-dark-700">
        {/* Footer will be handled by parent App.jsx or imported here if needed */}
      </footer>
    </div>
  );
};

export default MainLayout;
