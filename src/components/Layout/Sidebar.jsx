import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useAccount } from 'wagmi';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import {
  Home, BarChart3, Target, Users, Trophy, Zap, Settings
} from 'lucide-react';
import { useUserPreferences } from '../../hooks/useUserPreferences';

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
        'w-full flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 relative',
        isSubmenu ? 'ml-4 text-sm px-3' : 'px-3',
        // FIX 2: Active state now correctly applied with left border glow
        isActive
          ? 'text-white bg-primary/10 border-l-4 border-primary pl-2'
          : isDisabled
          ? 'text-neutral-600 cursor-not-allowed opacity-40'
          : 'text-neutral-400 hover:text-white hover:bg-dark-700/60',
      ].join(' ')}
    >
      {/* Active background glow — spring animated */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute inset-0 bg-primary/5 rounded-xl pointer-events-none"
          transition={{ type: 'spring', duration: 0.5 }}
        />
      )}

      {/* Icon */}
      <div className={`relative z-10 flex-shrink-0 ${isActive ? 'text-primary drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : ''}`}>
        <Icon size={isCollapsed ? 22 : 19} />
      </div>

      {/* Label */}
      {!isCollapsed && (
        <span className="relative z-10 flex-1 text-left font-medium text-sm leading-none">
          {item.label}
        </span>
      )}

      {/* Badge */}
      {!isCollapsed && item.badge && (
        <span className="relative z-10 ml-auto text-[10px] px-1.5 py-0.5 bg-primary/25 text-primary rounded-full font-bold tracking-wide">
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
              className="px-3 py-1.5 bg-dark-700 text-white text-xs rounded-lg shadow-2xl z-[100] border border-dark-600"
            >
              {item.label}
              {item.badge && (
                <span className="ml-1.5 text-[9px] bg-primary/30 text-primary px-1 rounded">
                  {item.badge}
                </span>
              )}
              <Tooltip.Arrow className="fill-dark-700" />
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
    onNavigate(id);
    setIsMobileOpen(false);
  }, [onNavigate]);

  // ── Nav item definitions ────────────────────────────────────────────────
  const mainItems = [
    { id: 'dashboard',   label: 'Dashboard',    icon: Home,    requiresConnect: true  },
    { id: 'portfolio',   label: 'My Portfolio', icon: BarChart3, requiresConnect: true },
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
        className="md:hidden fixed top-3.5 left-3 z-50 p-2 bg-dark-800 rounded-lg border border-dark-700 text-neutral-400 hover:text-white transition-colors"
        aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Mobile backdrop ──────────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 md:hidden z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={[
          'fixed left-0 top-0 h-screen bg-dark-900 border-r border-dark-700',
          'transition-all duration-300 z-40 flex flex-col',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="h-14 px-3 border-b border-dark-700 flex items-center justify-between flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-black text-base leading-none">T</span>
              </div>
              <span className="font-black text-white text-sm tracking-widest uppercase">Trenchy</span>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex ml-auto p-1.5 hover:bg-dark-700 rounded-lg transition-colors text-neutral-400 hover:text-white"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" role="menu">

          {/* Main group */}
          {!isCollapsed && (
            <p className="px-2 pb-1 text-[9px] text-neutral-600 uppercase tracking-[0.15em] font-bold">
              Main
            </p>
          )}
          {mainItems.map(item => (
            <NavItem key={item.id} item={item} isActive={currentView === item.id} {...navItemProps} />
          ))}

          {/* Divider */}
          <div className="my-3 h-px bg-dark-700/80" />

          {/* Community group */}
          {!isCollapsed && (
            <p className="px-2 pb-1 text-[9px] text-neutral-600 uppercase tracking-[0.15em] font-bold">
              Community
            </p>
          )}
          {communityItems.map(item => (
            <NavItem key={item.id} item={item} isActive={currentView === item.id} {...navItemProps} />
          ))}
        </nav>

        {/* Settings section */}
        <div className="border-t border-dark-700 py-3 px-2 space-y-1 flex-shrink-0">
          {!isCollapsed && (
            <p className="px-2 pb-1 text-[9px] text-neutral-600 uppercase tracking-[0.15em] font-bold">
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
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isConnected ? 'bg-success/10 border border-success/20' : 'bg-dark-800 border border-dark-700'}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-success animate-pulse' : 'bg-neutral-600'}`} />
              <span className={`text-xs font-medium ${isConnected ? 'text-success' : 'text-neutral-500'}`}>
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

export default Sidebar;