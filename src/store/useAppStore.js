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
      notificationCenter: [], // Persistent notification history
      unreadNotifications: 0,
      
      addNotification: (notification) => {
        const id = Date.now();
        const notificationWithId = { id, ...notification, timestamp: Date.now(), read: false };
        
        set((state) => ({
          notifications: [
            ...state.notifications,
            notificationWithId
          ],
          notificationCenter: [
            notificationWithId,
            ...state.notificationCenter
          ].slice(0, 100), // Keep last 100 notifications
          unreadNotifications: state.unreadNotifications + 1
        }));
        
        // Auto-remove toast after 5 seconds
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
      
      markNotificationRead: (id) => {
        set((state) => ({
          notificationCenter: state.notificationCenter.map(n => 
            n.id === id ? { ...n, read: true } : n
          ),
          unreadNotifications: Math.max(0, state.unreadNotifications - 1)
        }));
      },
      
      markAllNotificationsRead: () => {
        set((state) => ({
          notificationCenter: state.notificationCenter.map(n => ({ ...n, read: true })),
          unreadNotifications: 0
        }));
      },
      
      clearNotificationCenter: () => {
        set({ notificationCenter: [], unreadNotifications: 0 });
      },

      // ==================== REFERRAL STATE ====================
      referralStats: null,
      isLoadingReferrals: false,
      
      setReferralStats: (stats) => {
        set({ referralStats: stats, isLoadingReferrals: false });
        logger.info('Referral stats updated', stats);
      },
      
      setReferralsLoading: (isLoading) => set({ isLoadingReferrals: isLoading }),

      // ==================== ACHIEVEMENTS STATE ====================
      achievements: [],
      achievementStats: null,
      isLoadingAchievements: false,
      newlyUnlockedAchievements: [],
      
      setAchievements: (achievements) => {
        set({ achievements, isLoadingAchievements: false });
        logger.info('Achievements updated', { count: achievements.length });
      },
      
      setAchievementStats: (stats) => set({ achievementStats: stats }),
      
      setAchievementsLoading: (isLoading) => set({ isLoadingAchievements: isLoading }),
      
      addNewlyUnlockedAchievement: (achievement) => {
        set((state) => ({
          newlyUnlockedAchievements: [...state.newlyUnlockedAchievements, achievement]
        }));
      },
      
      clearNewlyUnlockedAchievements: () => {
        set({ newlyUnlockedAchievements: [] });
      },

      // ==================== BET CREDITS STATE ====================
      betCredits: 0,
      isLoadingBetCredits: false,
      
      setBetCredits: (credits) => {
        set({ betCredits: credits, isLoadingBetCredits: false });
        logger.info('Bet credits updated', { credits });
      },
      
      setBetCreditsLoading: (isLoading) => set({ isLoadingBetCredits: isLoading }),

      // ==================== AIRDROP STATE ====================
      airdropStatus: null,
      isLoadingAirdrop: false,
      
      setAirdropStatus: (status) => {
        set({ airdropStatus: status, isLoadingAirdrop: false });
        logger.info('Airdrop status updated', status);
      },
      
      setAirdropLoading: (isLoading) => set({ isLoadingAirdrop: isLoading }),

      // ==================== INSURANCE STATE ====================
      insuranceStatus: null,
      isLoadingInsurance: false,
      
      setInsuranceStatus: (status) => {
        set({ insuranceStatus: status, isLoadingInsurance: false });
        logger.info('Insurance status updated', status);
      },
      
      setInsuranceLoading: (isLoading) => set({ isLoadingInsurance: isLoading }),


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
      
      shouldRefetch: (key, cacheTime) => {
        // Per-key default cache times (ms)
        const defaults = {
          markets: 5000,  // 5s for markets (fast refresh)
          userBets: 30000,
          leaderboard: 60000,
          default: 60000,
        };
        const effectiveCacheTime = cacheTime ?? defaults[key] ?? defaults.default;
        
        const lastFetch = get().lastFetch[key];
        if (!lastFetch) return true;
        return Date.now() - lastFetch > effectiveCacheTime;
      },

      // ==================== RESET ====================
      reset: () => {
        set({
          markets: [],
          selectedMarket: null,
          userBets: [],
          userStats: null,
          notifications: [],
          notificationCenter: [],
          unreadNotifications: 0,
          referralStats: null,
          achievements: [],
          achievementStats: null,
          newlyUnlockedAchievements: [],
          betCredits: 0,
          airdropStatus: null,
          insuranceStatus: null,
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

// New selectors for new features
export const selectNotifications = (state) => state.notifications;
export const selectNotificationCenter = (state) => state.notificationCenter;
export const selectUnreadNotifications = (state) => state.unreadNotifications;
export const selectReferralStats = (state) => state.referralStats;
export const selectAchievements = (state) => state.achievements;
export const selectAchievementStats = (state) => state.achievementStats;
export const selectNewlyUnlockedAchievements = (state) => state.newlyUnlockedAchievements;
export const selectBetCredits = (state) => state.betCredits;
export const selectAirdropStatus = (state) => state.airdropStatus;
export const selectInsuranceStatus = (state) => state.insuranceStatus;


export default useAppStore;
