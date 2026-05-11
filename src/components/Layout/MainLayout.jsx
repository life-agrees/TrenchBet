import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ActivityFeed from './ActivityFeed';
import GlobalActivityTicker from './GlobalActivityTicker';
import { Bell, Wallet, Plus, Coins, Sun, Moon, LogOut } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AnimatePresence, motion } from 'framer-motion';
import { useDisconnect } from 'wagmi';
import toast from 'react-hot-toast';

/**
 * HeaderStats — memoized component to prevent re-rendering the whole layout
 * when points or balance update via background polling.
 */
const HeaderStats = React.memo(({ userPoints, formattedUsdcBalance }) => (
  <>
    <div className="hidden md:flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700 shadow-sm dark:shadow-none">
        <Coins size={14} className="text-yellow-500" />
        <div className="flex flex-col leading-none text-left">
          <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold">Points</span>
          <span className="text-sm font-bold text-neutral-900 dark:text-white">{userPoints.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700 shadow-sm dark:shadow-none">
        <Wallet size={14} className="text-primary" />
        <div className="flex flex-col leading-none text-left">
          <span className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold">Balance</span>
          <span className="text-sm font-bold text-neutral-900 dark:text-white">{formattedUsdcBalance}</span>
        </div>
      </div>
    </div>

    <div className="flex md:hidden items-center gap-1 px-1.5 py-1 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-1 px-1.5 py-0.5">
        <Coins size={12} className="text-yellow-500 flex-shrink-0" />
        <span className="text-[11px] font-black text-neutral-900 dark:text-white whitespace-nowrap">{userPoints.toLocaleString()}</span>
      </div>
      <div className="w-px h-3 bg-neutral-200 dark:bg-dark-700 mx-0.5" />
      <div className="flex items-center gap-1 px-1.5 py-0.5">
        <Wallet size={12} className="text-primary flex-shrink-0" />
        <span className="text-[11px] font-black text-neutral-900 dark:text-white whitespace-nowrap">{formattedUsdcBalance}</span>
      </div>
    </div>
  </>
));
HeaderStats.displayName = 'HeaderStats';

/**
 * Main Layout Component
 * Wraps the entire app with sidebar navigation and activity feed
 *
 * FIX 1: Added right-side spacer for ActivityFeed (was overlapping content on desktop)
 * FIX 2: Removed duplicate viewNames + inline emoji switch (now single source of truth)
 * FIX 3: Cleaned up mobile layout so sidebar hamburger doesn't conflict with header
 */

const VIEW_META = {
  dashboard:    { label: 'Dashboard',    emoji: '📊' },
  portfolio:    { label: 'My Portfolio', emoji: '📈' },
  markets:      { label: 'Markets',      emoji: '🎯' },
  leaderboard:  { label: 'Leaderboard',  emoji: '🏆' },
  referrals:    { label: 'Referrals',    emoji: '👥' },
  achievements: { label: 'Achievements', emoji: '🏆' },
  streaks:      { label: 'Streaks',      emoji: '⚡' },
  settings:     { label: 'Settings',     emoji: '⚙️' },
  admin:        { label: 'Admin Panel',  emoji: '🔧' },
};

const MainLayout = ({
  children,
  currentView,
  onNavigate,
  isConnected,
  isOwner = false,
  formattedUsdcBalance = '$0.00',
  userPoints = 0,
  onAddFunds = () => {},
  chainName = 'Network',
  isSidebarCollapsed = false,
  isWalletReconnecting = false,
  markets = [],
}) => {
  const { disconnect } = useDisconnect();
  const [activityFeedOpen, setActivityFeedOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark) || savedTheme === null; // default dark
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const viewMeta = VIEW_META[currentView] || { label: currentView, emoji: '' };

  // Width constants — must match Sidebar and ActivityFeed widths
  const SIDEBAR_W   = isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64';
  const ACTIVITY_W  = 'md:pr-80'; // ActivityFeed is w-80 on desktop

  return (
    <div className="main-container min-h-screen text-neutral-900 dark:text-white flex flex-col relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-40 dark:opacity-20 animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] opacity-40 dark:opacity-20 animate-pulse" />
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <Sidebar
          currentView={currentView}
          onNavigate={onNavigate}
          isConnected={isConnected}
          isWalletReconnecting={isWalletReconnecting}
          isOwner={isOwner}
          onAddFunds={onAddFunds}
        />

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <main className={`app-main flex-1 transition-all duration-300 w-full ${SIDEBAR_W} ${ACTIVITY_W}`}>
          
          {/* Global Activity Ticker */}
          <GlobalActivityTicker markets={markets} />

          {/* ── Top Header ───────────────────────────────────────────────── */}
          <header
            role="banner"
            className="app-header sticky top-0 bg-white/80 dark:bg-dark-900/60 border-b border-neutral-200 dark:border-white/5 backdrop-blur-xl"
          >
            <div className="px-3 sm:px-6 py-3 flex items-center justify-between gap-1 sm:gap-3">

              {/* LEFT: Page Title + BETA badge */}
              <div className="flex items-center gap-2 sm:gap-3 pl-10 md:pl-0">
                <h1
                  className="text-xl font-bold text-neutral-900 dark:text-white"
                  aria-label={`Current page: ${viewMeta.label}`}
                >
                  {viewMeta.emoji} {viewMeta.label}
                </h1>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 bg-gradient-to-r from-primary/30 to-primary/10 border border-primary/50 rounded-full text-[10px] font-bold text-primary tracking-widest">
                  BETA v1.0
                </span>
              </div>

              {/* RIGHT: User controls */}
              <div className="flex items-center gap-1 sm:gap-2" role="toolbar" aria-label="User controls">

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="hidden sm:block p-2 rounded-lg bg-white dark:bg-dark-800 hover:bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 text-neutral-400 hover:text-primary transition-all shadow-sm dark:shadow-none"
                  aria-label="Toggle theme"
                >
                  {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {/* Activity Feed toggle — mobile only */}
                <button
                  onClick={() => setActivityFeedOpen(!activityFeedOpen)}
                  className="md:hidden relative p-2 rounded-lg bg-white dark:bg-dark-800 hover:bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 text-neutral-400 hover:text-primary transition-all shadow-sm dark:shadow-none"
                  aria-label="Toggle activity feed"
                >
                  <Bell size={17} />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                </button>

                {/* Account Details & Connect Button */}
                {isConnected && (
                  <HeaderStats 
                    userPoints={userPoints} 
                    formattedUsdcBalance={formattedUsdcBalance} 
                  />
                )}

                {/* Add Funds - DESKTOP ONLY in header */}
                {isConnected && (
                  <div 
                    onClick={onAddFunds}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700 hover:bg-neutral-100 dark:bg-dark-700 transition-all group cursor-pointer select-none shadow-sm dark:shadow-none" 
                    role="button" 
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAddFunds(); }}
                    aria-label="Add funds to wallet"
                  >
                    <Plus size={14} className="text-primary group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">Add Funds</span>
                  </div>
                )}

                {/* Chain status */}
                {isConnected && (
                  <>
                    <div className="hidden md:block w-px h-7 bg-neutral-200 dark:bg-dark-700 mx-1" />
                    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700/50 shadow-sm dark:shadow-none">
                      <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,136,0.4)]" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-300 font-bold whitespace-nowrap">{chainName}</span>
                    </div>
                  </>
                )}

                {/* Wallet connect button */}
                <div className="hidden sm:flex items-center gap-2">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                  {isConnected && (
                    <button
                      onClick={() => {
                        console.log('Disconnecting wallet...');
                        disconnect();
                        toast.success('Wallet disconnected');
                      }}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 transition-all shadow-sm group"
                      title="Disconnect Wallet"
                    >
                      <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
                <div className="flex sm:hidden items-center gap-2">
                  <ConnectButton chainStatus="none" accountStatus="avatar" />
                  {isConnected && (
                    <button
                      onClick={() => {
                        console.log('Disconnecting wallet...');
                        disconnect();
                        toast.success('Wallet disconnected');
                      }}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 transition-all shadow-sm group"
                      title="Disconnect Wallet"
                    >
                      <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ── Scrollable Content ───────────────────────────────────────── */}
          <div className="app-content bg-transparent">
            <div className="px-4 sm:px-6 lg:px-8 py-6 w-full">

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.18 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        {/* ── Right Activity Feed ───────────────────────────────────────── */}
        <ActivityFeed
          isOpen={activityFeedOpen}
          onClose={() => setActivityFeedOpen(false)}
          isConnected={isConnected}
          markets={markets}
        />
      </div>
    </div>
  );
};

export default React.memo(MainLayout);