# TrenchyBet — Frontend Architecture

## Project Structure

```
src/
├── app.jsx                 # Main app component (routing, state, views)
├── main.jsx                # React entry point (providers, RainbowKit)
├── LandingPage.jsx         # Public landing page
├── index.css               # Global styles + design tokens
├── marketUtils.js          # Market display/calculation utilities
│
├── components/
│   ├── landing/            # Landing page sections
│   │   ├── HeroSection.jsx
│   │   ├── LiveStatsSection.jsx
│   │   ├── HowItWorksSection.jsx
│   │   ├── FeaturesSection.jsx
│   │   ├── AboutSection.jsx
│   │   ├── TestimonialsSection.jsx
│   │   └── LandingHeader.jsx
│   │
│   ├── Dashboard/          # Dashboard views
│   │   ├── DashboardView.jsx
│   │   └── PerformanceCard.jsx
│   │
│   ├── Layout/             # App shell
│   │   ├── MainLayout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── ActivityFeed.jsx
│   │   └── GlobalActivityTicker.jsx
│   │
│   ├── Portfolio/          # Portfolio/bets views
│   │   ├── PortfolioView.jsx
│   │   └── PortfolioBetCard.jsx
│   │
│   ├── legal/              # Legal pages
│   │   ├── TermsOfUse.jsx
│   │   └── ResponsibleGambling.jsx
│   │
│   ├── MarketCard.jsx      # Individual market card
│   ├── BetModal.jsx        # Bet placement modal
│   ├── AdminPanel.jsx      # Admin controls (create/resolve markets)
│   ├── CreateTab.jsx       # Market creation form
│   ├── ManageTab.jsx       # Market management
│   ├── DashboardTabV2.jsx  # Admin analytics dashboard
│   ├── LeaderboardView.jsx # Leaderboard display
│   ├── PointsBalance.jsx   # Points display widget
│   ├── AchievementsPage.jsx# Achievements/badges
│   ├── StakingDashboard.jsx# Staking interface
│   ├── ReferralDashboard.jsx# Referral system UI
│   ├── VouchersTab.jsx     # Bet vouchers
│   ├── Footer.jsx          # App footer
│   └── ... (40+ components total)
│
├── hooks/                  # Custom React hooks
│   ├── useMarkets.js       # Market fetching & discovery (primary)
│   ├── useUserBets.js      # User bet history (Supabase)
│   ├── useLeaderboard.js   # Leaderboard data (Supabase view)
│   ├── useBetPlacement.js  # Bet transaction logic
│   ├── useCurrentPrice.js  # Live Chainlink price polling
│   ├── usePointsData.js    # Points balance fetching
│   ├── useAdminOwner.js    # Admin permission checks
│   ├── useAchievements.js  # Achievement tracking
│   ├── useReferrals.js     # Referral system
│   ├── useStaking.js       # Staking interactions
│   ├── useBalance.js       # USDC balance
│   └── ... (37 hooks total)
│
├── config/
│   ├── wagmi.js            # Wallet config (RainbowKit, RPC providers)
│   ├── assets.js           # Asset definitions & Chainlink feeds
│   └── features.js         # Feature flags
│
├── services/
│   ├── achievementService.js
│   ├── analyticsService.js
│   ├── marketService.js
│   └── referralService.js
│
├── utils/
│   ├── constants.js        # All contract addresses & app constants
│   ├── logger.js           # Structured logging
│   ├── rateLimiter.js      # RPC rate limiting
│   └── ... (9 utility files)
│
├── lib/
│   └── supabase.js         # Supabase client initialization
│
└── store/
    └── useAppStore.js      # Zustand global state
```

## Key Design Patterns

### 1. Market Discovery (Counter-First)
Markets are discovered by reading `marketCounter` from the proxy contract, then fetching the last N market IDs directly. This is more reliable than `getLogs` which fails on free RPC tiers.

### 2. Data Sources
| Data | Source | Why |
|------|--------|-----|
| Active markets | RPC (contract reads) | Needs real-time pool sizes |
| User bet history | Supabase `user_bets` table | Instant load, no RPC |
| Leaderboard | Supabase `leaderboard_stats` view | Server-side aggregation |
| Points balance | Supabase `users` table (via API) | Consistent across sessions |
| Live prices | Chainlink (via RPC) | Tamper-proof oracle data |

### 3. RPC Resilience
- Multiple fallback RPC providers (Infura → PublicNode → Base public)
- Ranked by latency/stability with automatic failover
- Batching disabled to prevent silent payload drops on free tiers
- Rate limiter utility prevents 429 errors

### 4. State Management
- **React hooks + context** for most component state
- **Zustand** (`useAppStore.js`) for global shared state
- **React Query** for server state caching

## Feature Flags

Controlled in `src/config/features.js`:

| Flag | Status | Purpose |
|------|--------|---------|
| `STATUS_APP_LIVE` | ✅ On | Master kill switch |
| `ENABLE_FARCASTER_MINIAPP` | ❌ Off | Farcaster integration |
| `ENABLE_TELEGRAM_MINIAPP` | ❌ Off | Telegram mini-app |
| `ENABLE_RAINBOWKIT` | ✅ On | Wallet connection |
| `ENABLE_EMBEDDED_WALLET` | ❌ Off | Embedded wallet |
| `ENABLE_CAPACITOR_NATIVE` | ❌ Off | Native mobile wrapper |

## Wallet Configuration

- **Provider**: RainbowKit v2 + wagmi v2
- **Chain**: Base Sepolia (testnet)
- **RPC Providers**:
  1. Infura (`base-sepolia.infura.io`)
  2. PublicNode (`base-sepolia-rpc.publicnode.com`)
  3. Base Public (`sepolia.base.org`)
- **WalletConnect**: Project ID via `VITE_WALLETCONNECT_PROJECT_ID` env var
