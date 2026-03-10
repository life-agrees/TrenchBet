import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import * as Tooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import {
  Home, BarChart3, Target, Users, Trophy, Zap, Settings, Menu, X
} from 'lucide-react';
import { useUserPreferences } from '../../hooks/useUserPreferences';

/**
 * Persistent Sidebar Navigation Component
 * Provides quick access to all major features
 * Enhanced with:
 * - Visual Grouping with Dividers
 * - Tooltips for Collapsed State
 * - Active Indicator Enhancement
 * - Keyboard Navigation
 */
const Sidebar = ({ currentView, onNavigate, isConnected, isOwner }) => {
  const { address } = useAccount();
  const preferences = useUserPreferences(address);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Use persisted sidebar state from preferences
  const isCollapsed = preferences.sidebarCollapsed || false;

  // Main Navigation Items
  const mainItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      requiresConnect: true,
      badge: null
    },
    {
      id: 'portfolio',
      label: 'My Portfolio',
      icon: BarChart3,
      requiresConnect: true,
      badge: null
    },
    {
      id: 'markets',
      label: 'Markets',
      icon: Target,
      requiresConnect: false,
      badge: 'LIVE'
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: Trophy,
      requiresConnect: false,
      badge: null
    }
  ];

  // Community Navigation Items
  const communityItems = [
    {
      id: 'community',
      label: 'Community',
      icon: Users,
      requiresConnect: true,
      submenu: [
        { id: 'referrals', label: 'Referrals' },
        { id: 'friends', label: 'Friends' }
      ]
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
      requiresConnect: true,
      badge: '🔥'
    },
    {
      id: 'streaks',
      label: 'Streaks',
      icon: Zap,
      requiresConnect: true,
      badge: null
    }
  ];

  const settingsItems = [
    { id: 'settings', label: 'Settings', icon: Settings, requiresConnect: false }
  ];

  if (isOwner) {
    settingsItems.unshift({
      id: 'admin',
      label: 'Admin Panel',
      icon: Settings,
      requiresConnect: false,
      badge: 'ADMIN'
    });
  }

  const handleNavigate = (id) => {
    onNavigate(id);
    setIsMobileOpen(false);
  };

  // Enhanced NavItem with Tooltip, Active Indicator, and Keyboard Navigation
  const NavItem = ({ item, isSubmenu = false }) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    const isDisabled = item.requiresConnect && !isConnected;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isDisabled) {
          handleNavigate(item.id);
        }
      }
    };

    const navItemBaseClass = `
      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 
      relative
      ${isSubmenu ? 'ml-4 text-sm' : 'text-base'}
      ${isActive 
        ? '' 
        : isDisabled 
        ? 'text-neutral-600 cursor-not-allowed opacity-50' 
        : 'text-neutral-400 hover:text-white hover:bg-dark-700/50'
      }
    `;

    const navItemContent = (
      <button
        onClick={() => !isDisabled && handleNavigate(item.id)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        role="menuitem"
        tabIndex={0}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={isDisabled}
        className={navItemBaseClass}
        title={isDisabled ? 'Connect wallet to access' : undefined}
      >
        {/* Active Indicator Glow Effect */}
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute inset-0 bg-primary/5 rounded-xl"
            transition={{ type: "spring", duration: 0.6 }}
          />
        )}
        
        {/* Icon with conditional glow for active state */}
        <div className={`relative z-10 flex-shrink-0 ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''}`}>
          <Icon size={20} />
        </div>

        {/* Label - Hidden when collapsed */}
        {!isCollapsed && (
          <span className="relative z-10 flex-1 text-left">{item.label}</span>
        )}

        {/* Badge - Hidden when collapsed */}
        {!isCollapsed && item.badge && (
          <span className="relative z-10 ml-auto text-xs px-2 py-1 bg-primary/30 rounded-full">
            {item.badge}
          </span>
        )}
      </button>
    );

    // Wrap with Tooltip when collapsed
    if (isCollapsed) {
      return (
        <Tooltip.Provider delayDuration={100} key={item.id}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              {navItemContent}
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="right"
                className="px-3 py-2 bg-dark-700 text-white text-sm rounded-lg shadow-xl z-50"
                sideOffset={8}
              >
                {item.label}
                <Tooltip.Arrow className="fill-dark-700" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      );
    }

    return (
      <div key={item.id}>
        {navItemContent}
      </div>
    );
  };

  const sidebarClasses = `
    fixed left-0 top-0 h-screen bg-dark-900 border-r border-dark-700 
    transition-all duration-300 z-40 flex flex-col
    ${isCollapsed ? 'w-20' : 'w-64'}
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
  `;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-dark-800 rounded-lg border border-dark-700 text-neutral-400 hover:text-white transition-colors"
        aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 md:hidden z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">T</span>
              </div>
              <span className="font-bold text-white text-sm">TRENCHY</span>
            </div>
          )}
          <button
            onClick={() => preferences.setSidebarCollapsed?.(!isCollapsed)}
            className="hidden md:flex p-2 hover:bg-dark-700 rounded-lg transition-colors text-neutral-400 hover:text-white"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Main Navigation with Visual Grouping */}
        <nav className="flex-1 overflow-y-auto p-3" role="menu">
          {/* Main Navigation Group */}
          <div className="space-y-1 mb-4">
            {!isCollapsed && (
              <p className="px-4 py-2 text-[10px] text-neutral-600 uppercase tracking-wider font-bold">
                Main
              </p>
            )}
            {mainItems.map((item) => (
              <NavItem 
                key={item.id} 
                item={item}
                className={`
                  relative transition-all duration-200
                  ${currentView === item.id 
                    ? 'bg-gradient-to-r from-primary/20 to-transparent text-white border-l-4 border-primary' 
                    : ''
                  }
                `}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-dark-700 my-4" />

          {/* Community Group */}
          <div className="space-y-1 mb-4">
            {!isCollapsed && (
              <p className="px-4 py-2 text-[10px] text-neutral-600 uppercase tracking-wider font-bold">
                Community
              </p>
            )}
            {communityItems.map((item) => (
              <div key={item.id}>
                <NavItem 
                  item={item}
                  className={`
                    relative transition-all duration-200
                    ${currentView === item.id 
                      ? 'bg-gradient-to-r from-primary/20 to-transparent text-white border-l-4 border-primary' 
                      : ''
                    }
                  `}
                />
                {/* Submenu */}
                {item.submenu && !isCollapsed && (
                  <div className="mt-1 space-y-1">
                    {item.submenu.map((subitem) => (
                      <NavItem 
                        key={subitem.id} 
                        item={{ ...subitem, icon: Users }} 
                        isSubmenu 
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Settings Section */}
        <div className="border-t border-dark-700 p-3 space-y-1">
          {!isCollapsed && (
            <p className="px-4 py-2 text-[10px] text-neutral-600 uppercase tracking-wider font-bold">
              Settings
            </p>
          )}
          {settingsItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        {/* Footer Info */}
        {!isCollapsed && isConnected && (
          <div className="p-3 border-t border-dark-700 text-xs text-neutral-500 text-center">
            <p>Connected & Ready</p>
          </div>
        )}
      </aside>

      {/* Spacer for collapsed state */}
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`} />
    </>
  );
};

export default Sidebar;

