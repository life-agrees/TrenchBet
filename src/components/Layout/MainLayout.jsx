import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ActivityFeed from './ActivityFeed';
import { Bell, Wallet, Plus, Coins, Sun, Moon } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AnimatePresence, motion } from 'framer-motion';

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
}) => {
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
    <div className="min-h-screen bg-white dark:bg-dark-950 text-neutral-900 dark:text-white flex flex-col">
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <Sidebar
          currentView={currentView}
          onNavigate={onNavigate}
          isConnected={isConnected}
          isOwner={isOwner}
        />

        {/* ── Main Content ─────────────────────────────────────────────── */}
        {/*
          FIX 1: We use padding-left + padding-right to push content away from
          the fixed sidebar and fixed activity feed, instead of relying on flex
          spacers that don't account for fixed-position children.
        */}
        <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 w-full ${SIDEBAR_W} ${ACTIVITY_W}`}>

          {/* ── Top Header ───────────────────────────────────────────────── */}
          <header
            role="banner"
            className="sticky top-0 z-30 bg-neutral-50 dark:bg-dark-900/95 border-b border-neutral-200 dark:border-dark-700 backdrop-blur-md"
          >
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">

              {/* LEFT: Page Title + BETA badge */}
              {/* FIX 3: Added pl-10 on mobile so title doesn't sit under hamburger */}
              <div className="flex items-center gap-3 pl-10 md:pl-0">
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
              <div className="flex items-center gap-2" role="toolbar" aria-label="User controls">

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-white dark:bg-dark-800 hover:bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 text-neutral-400 hover:text-primary transition-all"
                  aria-label="Toggle theme"
                >
                  {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {/* Activity Feed toggle — mobile only */}
                <button
                  onClick={() => setActivityFeedOpen(!activityFeedOpen)}
                  className="md:hidden relative p-2 rounded-lg bg-white dark:bg-dark-800 hover:bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 text-neutral-400 hover:text-primary transition-all"
                  aria-label="Toggle activity feed"
                >
                  <Bell size={17} />
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
                </button>

                {/* Stats — desktop only, connected only */}
                {isConnected && (
                  <div className="hidden md:flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700">
                      <Coins size={14} className="text-yellow-400" />
                      <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Points</span>
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{userPoints.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700">
                      <Wallet size={14} className="text-primary" />
                      <div className="flex flex-col leading-none">
                        <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Balance</span>
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{formattedUsdcBalance}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compact points — mobile only, connected only */}
                {isConnected && (
                  <div className="flex md:hidden items-center gap-1 px-2 py-1.5 bg-white dark:bg-dark-800 rounded-lg border border-neutral-200 dark:border-dark-700">
                    <Coins size={13} className="text-yellow-400" />
                    <span className="text-xs font-semibold">{userPoints}</span>
                  </div>
                )}

                {/* Add Funds — unified style matching Points/Balance */}
                {isConnected && (
                  <>
                    <div 
                      onClick={onAddFunds}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700 hover:bg-neutral-100 dark:bg-dark-700 transition-all group cursor-pointer select-none" 
                      role="button" 
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAddFunds(); }}
                      aria-label="Add funds to wallet"
                    >
                      <Plus size={14} className="text-primary group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors">Add Funds</span>
                    </div>
                    <button
                      onClick={onAddFunds}
                      className="flex sm:hidden items-center justify-center p-2.5 bg-white dark:bg-dark-800 rounded-xl border border-neutral-200 dark:border-dark-700 hover:bg-neutral-100 dark:bg-dark-700 transition-all group"
                      aria-label="Add funds"
                    >
                      <Plus size={16} className="text-primary group-hover:scale-110 transition-transform" />
                    </button>
                  </>
                )}

                {/* Chain status — desktop */}
                {isConnected && (
                  <>
                    <div className="hidden md:block w-px h-7 bg-neutral-100 dark:bg-dark-700 mx-1" />
                    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700/50">
                      <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                      <span className="text-xs text-neutral-300 font-medium">{chainName}</span>
                    </div>
                  </>
                )}

                {/* Wallet connect button */}
                <div className="hidden sm:block">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                </div>
                <div className="flex sm:hidden">
                  <ConnectButton chainStatus="icon" accountStatus="avatar" />
                </div>
              </div>
            </div>
          </header>

          {/* ── Scrollable Content ───────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-950">
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
        />
      </div>
    </div>
  );
};

export default MainLayout;