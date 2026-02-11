import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createLogger } from '../utils/logger';

const logger = createLogger('AppStore');

/**
 * Global Application State Store using Zustand
 * Replaces scattered state across multiple hooks with centralized state management
 */
export const useAppStore = create(
  persist(
    (set, get) => ({
      // ==================== MARKET STATE ====================
      markets: [],
      selectedMarket: null,
      isLoadingMarkets: false,
      marketsError: null,
      
      setMarkets: (markets) => {
        set({ markets, isLoadingMarkets: false, marketsError: null });
        logger.info('Markets updated', { count: markets.length });
      },
      
      setSelectedMarket: (market) => {
        set({ selectedMarket: market });
        logger.info('Market selected', { id: market?.id });
      },
      
      setMarketsLoading: (isLoading) => set({ isLoadingMarkets: isLoading }),
      
      setMarketsError: (error) => {
        set({ marketsError: error, isLoadingMarkets: false });
        logger.error('Markets error', error);
      },
      
      updateMarket: (marketId, updates) => {
        set((state) => ({
          markets: state.markets.map(m => 
            m.id === marketId ? { ...m, ...updates } : m
          )
        }));
      },

      // ==================== USER STATE ====================
      userBets: [],
      userStats: null,
      isLoadingUserData: false,
      
      setUserBets: (bets) => {
        set({ userBets: bets, isLoadingUserData: false });
        logger.info('User bets updated', { count: bets.length });
      },
      
      setUserStats: (stats) => set({ userStats: stats }),
      
      addUserBet: (bet) => {
        set((state) => ({
          userBets: [bet, ...state.userBets]
        }));
        logger.info('New bet added', { marketId: bet.marketId });
      },

      // ==================== WALLET STATE ====================
      usdcBalance: 0,
      isLoadingBalance: false,
      
      setUsdcBalance: (balance) => set({ usdcBalance: balance }),
      
      setBalanceLoading: (isLoading) => set({ isLoadingBalance: isLoading }),

      // ==================== UI STATE ====================
      activeView: 'markets', // 'markets', 'my-bets', 'leaderboard', 'admin'
      modals: {
        betModal: { isOpen: false, market: null },
        addFundsModal: { isOpen: false },
        adminPanel: { isOpen: false },
        shareModal: { isOpen: false, market: null },
        pointsHistory: { isOpen: false },
        notificationSettings: { isOpen: false },
      },
      
      setActiveView: (view) => set({ activeView: view }),
      
      openModal: (modalName, data = {}) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalName]: { isOpen: true, ...data }
          }
        }));
        logger.info('Modal opened', { modal: modalName });
      },
      
      closeModal: (modalName) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalName]: { isOpen: false }
          }
        }));
      },
      
      closeAllModals: () => {
        set((state) => ({
          modals: Object.keys(state.modals).reduce((acc, key) => ({
            ...acc,
            [key]: { isOpen: false }
          }), {})
        }));
      },

      // ==================== NOTIFICATIONS ====================
      notifications: [],
      
      addNotification: (notification) => {
        const id = Date.now();
        set((state) => ({
          notifications: [
            ...state.notifications,
            { id, ...notification, timestamp: Date.now() }
          ]
        }));
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          get().removeNotification(id);
        }, 5000);
        
        return id;
      },
      
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },

      // ==================== CACHE STATE ====================
      lastFetch: {
        markets: null,
        userBets: null,
        leaderboard: null,
      },
      
      setLastFetch: (key, timestamp) => {
        set((state) => ({
          lastFetch: { ...state.lastFetch, [key]: timestamp }
        }));
      },
      
      shouldRefetch: (key, cacheTime = 60000) => {
        const lastFetch = get().lastFetch[key];
        if (!lastFetch) return true;
        return Date.now() - lastFetch > cacheTime;
      },

      // ==================== RESET ====================
      reset: () => {
        set({
          markets: [],
          selectedMarket: null,
          userBets: [],
          userStats: null,
          notifications: [],
        });
        logger.info('Store reset');
      },
    }),
    {
      name: 'trenchybet-storage',
      partialize: (state) => ({
        // Only persist UI preferences, not data
        activeView: state.activeView,
      }),
    }
  )
);

// Selectors for better performance
export const selectMarkets = (state) => state.markets;
export const selectSelectedMarket = (state) => state.selectedMarket;
export const selectUserBets = (state) => state.userBets;
export const selectUsdcBalance = (state) => state.usdcBalance;
export const selectActiveView = (state) => state.activeView;
export const selectModals = (state) => state.modals;
export const selectIsLoadingMarkets = (state) => state.isLoadingMarkets;

export default useAppStore;
