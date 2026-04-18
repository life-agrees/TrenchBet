import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useAccount } from 'wagmi';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import {
  Home, BarChart3, Target, Users, Trophy, Zap, Settings, Download
} from 'lucide-react';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { TrenchyBetLogo } from '../TrenchyBetLogo.jsx';

/**
 * NavItem — defined OUTSIDE Sidebar so it isn't re-created on every render.
 *
 * FIX 1: Moved out of Sidebar component (was recreated every render)
 * FIX 2: Active border-l-4 now rendered inside NavItem using `isActive` (was
 *         passed as ignored `className` prop before — never rendered)
 * FIX 3: Tooltip wrapping properly handles collapsed state
 */
const NavItem = ({ item, isActive, isCollapsed, isConnected, onNavigate, isSubmenu = false }) => {
  const Icon = item.icon;
  const isDisabled = item.requiresConnect && !isConnected;

  const handleKeyDown = useCallback((e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
      e.preventDefault();
      onNavigate(item.id);
    }
  }, [isDisabled, onNavigate, item.id]);

  const button = (
    <button
      onClick={() => !isDisabled && onNavigate(item.id)}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      role="menuitem"
      tabIndex={isDisabled ? -1 : 0}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={isDisabled}
      title={isDisabled ? 'Connect wallet to access' : undefined}
      className={[
        'w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 relative nav-item-btn',
        isSubmenu ? 'ml-4 text-sm px-3' : 'px-3',
        isActive
          ? 'text-neutral-900 dark:text-white bg-primary/20 dark:bg-primary/10 border-l-4 border-primary pl-2'
          : isDisabled
          ? 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-40'
          : 'text-neutral-500 hover:text-neutral-900 dark:text-white hover:bg-neutral-200/50 dark:hover:bg-dark-700/60',
      ].join(' ')}
    >
      {/* Active background glow — spring animated */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute inset-0 bg-primary/10 dark:bg-primary/5 rounded-xl pointer-events-none"
          transition={{ type: 'spring', duration: 0.5 }}
        />
      )}

      {/* Icon */}
      <div className={`relative z-10 flex-shrink-0 ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(205,255,0,0.4)]' : ''}`}>
        <Icon size={isCollapsed ? 22 : 19} />
      </div>

      {/* Label */}
      {!isCollapsed && (
        <span className="relative z-10 flex-1 text-left font-bold text-sm leading-none">
          {item.label}
        </span>
      )}

      {/* Badge */}
      {!isCollapsed && item.badge && (
        <span className="relative z-10 ml-auto text-[10px] px-1.5 py-0.5 bg-primary/30 dark:bg-primary/25 text-neutral-900 dark:text-primary rounded-full font-bold tracking-wide">
          {item.badge}
        </span>
      )}
    </button>
  );

  // Wrap with tooltip when sidebar is collapsed
  if (isCollapsed) {
    return (
      <Tooltip.Provider delayDuration={80}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              sideOffset={10}
              className="px-3 py-1.5 bg-neutral-900 dark:bg-dark-700 text-white text-xs rounded-lg shadow-2xl z-[100] border border-dark-600"
            >
              {item.label}
              {item.badge && (
                <span className="ml-1.5 text-[9px] bg-primary/30 text-primary px-1 rounded">
                  {item.badge}
                </span>
              )}
              <Tooltip.Arrow className="fill-neutral-900 dark:fill-dark-700" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return button;
};

// ─────────────────────────────────────────────────────────────────────────────

const Sidebar = ({ currentView, onNavigate, isConnected, isOwner }) => {
  const { address } = useAccount();
  const preferences = useUserPreferences(address);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isInstallable, handleInstallClick } = usePWAInstall();

  // FIX 3: Guard against missing setter — fall back to local state if hook
  // doesn't expose setSidebarCollapsed
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const isCollapsed = preferences?.sidebarCollapsed ?? localCollapsed;
  const toggleCollapsed = useCallback(() => {
    if (typeof preferences?.setSidebarCollapsed === 'function') {
      preferences.setSidebarCollapsed(!isCollapsed);
    } else {
      setLocalCollapsed(v => !v);
    }
  }, [isCollapsed, preferences]);

  const handleNavigate = useCallback((id) => {
    if (id === 'install') {
      handleInstallClick();
      return;
    }
    onNavigate(id);
    setIsMobileOpen(false);
  }, [onNavigate, handleInstallClick]);

  // ── Nav item definitions ────────────────────────────────────────────────
  const mainItems = [
    { id: 'dashboard',   label: 'Dashboard',    icon: Home,    requiresConnect: true  },
    { id: 'myBets',      label: 'My Portfolio', icon: BarChart3, requiresConnect: true },
    { id: 'markets',     label: 'Markets',      icon: Target,  requiresConnect: false, badge: 'LIVE' },
    { id: 'leaderboard', label: 'Leaderboard',  icon: Trophy,  requiresConnect: false },
  ];

  const communityItems = [
    { id: 'referrals',    label: 'Referrals',    icon: Users,  requiresConnect: true },
    { id: 'achievements', label: 'Achievements', icon: Trophy, requiresConnect: true, badge: '🔥' },
    { id: 'streaks',      label: 'Streaks',      icon: Zap,    requiresConnect: true },
  ];

  const settingsItems = [
    { id: 'settings', label: 'Settings', icon: Settings, requiresConnect: false },
  ];
  if (isInstallable) {
    settingsItems.unshift({
      id: 'install', label: 'Install App', icon: Download, requiresConnect: false, badge: 'PWA'
    });
  }
  if (isOwner) {
    settingsItems.unshift({
      id: 'admin', label: 'Admin Panel', icon: Settings, requiresConnect: false, badge: 'ADMIN'
    });
  }

  // Shared props for NavItem
  const navItemProps = { isCollapsed, isConnected, onNavigate: handleNavigate };

  return (
    <>
      {/* ── Mobile hamburger ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-3.5 left-3 z-50 p-2 bg-white dark:bg-dark-800 rounded-lg border border-neutral-200 dark:border-dark-700 text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors shadow-sm"
        aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Mobile backdrop ──────────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 md:hidden z-30 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={[
          'app-sidebar fixed left-0 top-0 h-screen bg-neutral-50 dark:bg-dark-900 border-r border-neutral-200 dark:border-dark-700',
          'transition-all duration-300 z-40 flex flex-col',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="h-14 px-3 border-b border-neutral-200 dark:border-dark-700 flex items-center justify-between flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <TrenchyBetLogo className="w-7 h-7" />
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex ml-auto p-1.5 hover:bg-neutral-200 dark:bg-dark-700 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900 dark:text-white"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" role="menu">

          {/* Main group */}
          {!isCollapsed && (
            <p className="px-2 pb-1 text-[9px] text-neutral-500 dark:text-neutral-600 uppercase tracking-[0.15em] font-bold">
              Main
            </p>
          )}
          {mainItems.map(item => (
            <NavItem key={item.id} item={item} isActive={currentView === item.id} {...navItemProps} />
          ))}

          {/* Divider */}
          <div className="my-3 h-px bg-neutral-200 dark:bg-dark-700/80" />

          {/* Community group */}
          {!isCollapsed && (
            <p className="px-2 pb-1 text-[9px] text-neutral-500 dark:text-neutral-600 uppercase tracking-[0.15em] font-bold">
              Community
            </p>
          )}
          {communityItems.map(item => (
            <NavItem key={item.id} item={item} isActive={currentView === item.id} {...navItemProps} />
          ))}
        </nav>

        {/* Settings section */}
        <div className="border-t border-neutral-200 dark:border-dark-700 py-3 px-2 space-y-1 flex-shrink-0">
          {!isCollapsed && (
            <p className="px-2 pb-1 text-[9px] text-neutral-500 dark:text-neutral-600 uppercase tracking-[0.15em] font-bold">
              System
            </p>
          )}
          {settingsItems.map(item => (
            <NavItem key={item.id} item={item} isActive={currentView === item.id} {...navItemProps} />
          ))}
        </div>

        {/* Connected status footer */}
        {!isCollapsed && (
          <div className="px-3 pb-3 flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-success/10 border border-success/20' : 'bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 shadow-sm dark:shadow-none'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-success animate-pulse' : 'bg-neutral-600'}`} title={isConnected ? 'Connected' : 'Disconnected'} />
              <span className={`text-xs font-bold ${isConnected ? 'text-success' : 'text-neutral-500'}`}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Spacer — mirrors sidebar width in document flow */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
    </>
  );
};

export default React.memo(Sidebar);