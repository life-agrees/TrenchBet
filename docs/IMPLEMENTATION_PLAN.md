# TrenchyBet Implementation Plan

## Overview
This document outlines the implementation plan for adding new features to the TrenchyBet prediction market application.

---

## Week 1: Core Features (Days 1-7)

### Day 1-2: On-Chain Referral Tracking

#### Smart Contract: `contracts/TrenchyReferrals.sol`
```
solidity
// Key functions:
- registerReferral(address referrer) - Register a referral relationship
- getReferrer(address user) - Get who referred a user
- getReferralCount(address referrer) - Get number of referrals
- getReferralEarnings(address referrer) - Get total earnings from referrals
- emit ReferralRegistered event
- emit ReferralReward event
```

#### Frontend: Referral System
- **New Component**: `src/components/ReferralDashboard.jsx`
  - Display referral code (keccak256 hash of address)
  - Share links (Twitter, Telegram, copy to clipboard)
  - Referral earnings display
  - List of referred users

- **New Hook**: `src/hooks/useReferrals.js`
  - Generate referral code
  - Register referral on-chain
  - Fetch referral stats
  - Share functionality

#### Database (Supabase)
- Table: `referrals`
  - id, referrer_address, referred_address, timestamp, earnings

---

### Day 3-4: Enhanced Notifications

#### New Hook: `src/hooks/useEnhancedNotifications.js`
```
javascript
// Notification Types:
- BET_PLACED: { icon: '🎯', priority: 'low' }
- BET_WON: { icon: '🎉', priority: 'high', sound: 'success.mp3' }
- BET_LOST: { icon: '😔', priority: 'medium' }
- MARKET_ENDING: { icon: '⏰', priority: 'high' }
- REFERRAL_JOINED: { icon: '👥', priority: 'medium' }
- POINTS_EARNED: { icon: '⭐', priority: 'low' }
- ACHIEVEMENT_UNLOCKED: { icon: '🏆', priority: 'high', sound: 'achievement.mp3' }
```

#### Features:
- Market ending reminders (30 mins, 5 mins, 1 min)
- Win/loss notifications with confetti/animation
- Referral notifications
- Daily reminder if user hasn't bet
- Notification center (see all past notifications)

#### New Component: `src/components/NotificationCenter.jsx`
- List all past notifications
- Filter by type
- Mark as read
- Clear all

---

### Day 5-7: Achievements & Badges System

#### Smart Contract: `contracts/TrenchyAchievements.sol`
```
solidity
// Achievement Enum:
enum Achievement {
    FIRST_BET,           // Place first bet
    WIN_STREAK_3,        // Win 3 in a row
    WIN_STREAK_5,        // Win 5 in a row
    WHALE,               // Bet $1000+
    SHARPSHOOTER,        // 80% win rate over 20 bets
    EARLY_BIRD,          // Bet in first 60s
    SPEED_DEMON,         // Place 10 bets in 1 day
    SOCIAL_BUTTERFLY,    // Refer 5 friends
    DIAMOND_HANDS,       // Hold locked TRENCHY 30 days
    ORACLE,              // Predict 10 markets correctly
    TRENDSETTER,         // Be first to bet on market
    FOUNDER              // Early supporter (airdrop claimer)
}

// Key functions:
- unlockAchievement(address user, Achievement achievement)
- hasAchievement(address user, Achievement achievement) view
- getAchievementCount(address user) view
- getAchievementPoints(Achievement achievement) view
```

#### Frontend: Achievements System
- **New Component**: `src/components/AchievementsPage.jsx`
  - Grid of all achievements with progress bars
  - Badge collection display (Xbox-style)
  - Share to Twitter button
  
- **New Hook**: `src/hooks/useAchievements.js`
  - Fetch user achievements
  - Check for new achievements
  - Get achievement progress

- **Profile Badge Display**: Update `src/components/PointsBalance.jsx`
  - Show badges next to username

---

## Week 2: Launch Incentives (Days 8-10)

### Day 8: Airdrop System

#### Smart Contract: `contracts/LaunchAirdrop.sol`
```
solidity
// Constants:
- AIRDROP_AMOUNT = 100 * 1e18 (100 TRENCHY)
- MAX_RECIPIENTS = 1000

// Key functions:
- claimAirdrop() - Claim airdrop (requires prior bet)
- hasClaimed(address user) view
- recipientCount() view

// Events:
- AirdropClaimed(address indexed user, uint256 amount)
```

#### Frontend: Airdrop UI
- **New Component**: `src/components/AirdropClaimModal.jsx`
  - Check eligibility
  - Claim button
  - Founder badge preview

---

### Day 9: First Bet Insurance

#### Smart Contract: `contracts/FirstBetInsurance.sol`
```
solidity
// Constants:
- MAX_INSURANCE = 100 * 1e6 ($100 USDC)

// Key functions:
- claimInsurance(uint256 betAmount)
- hasUsedInsurance(address user) view

// Events:
- InsuranceClaimed(address indexed user, uint256 amount)
```

#### Frontend: Insurance UI
- **Update BetModal.jsx**
  - Show "First Bet Insurance" indicator
  - Explain insurance terms

---

### Day 10: Bet Credits System

#### Smart Contract Updates: `contracts/PredictionMarket.sol`
```
solidity
// Add to existing contract:
mapping(address => uint256) public betCredits;

// New functions:
- awardBetCredit(address user, uint256 amount) external onlyOwner
- placeBetWithCredits(uint256 marketId, uint8 choice, uint256 usdcAmount, uint256 creditAmount)
```

#### Backend: Credit Award Logic
```
javascript
// Criteria for $20 Credit:
- Bet 3+ days in a row (daily streak)
- OR placed 10+ bets
- OR referred 2+ friends
```

---

## File Structure Changes

### New Files to Create:
```
contracts/
  - TrenchyReferrals.sol (NEW)
  - TrenchyAchievements.sol (NEW)
  - LaunchAirdrop.sol (NEW)
  - FirstBetInsurance.sol (NEW)

src/
  components/
    - ReferralDashboard.jsx (NEW)
    - NotificationCenter.jsx (NEW)
    - AchievementsPage.jsx (NEW)
    - AirdropClaimModal.jsx (NEW)
    - AchievementBadge.jsx (NEW)
  
  hooks/
    - useReferrals.js (NEW)
    - useEnhancedNotifications.js (NEW)
    - useAchievements.js (NEW)
    - useBetCredits.js (NEW)
    - useFirstBetInsurance.js (NEW)
  
  services/
    - referralService.js (NEW)
    - achievementService.js (NEW)
  
  utils/
    - notificationTypes.js (NEW)
    - achievementConfig.js (NEW)

api/
  referrals/
    - create.js (NEW)
    - list.js (NEW)
  achievements/
    - check.js (NEW)
    - list.js (NEW)
```

### Files to Modify:
```
src/
  app.jsx
  utils/constants.js
  config/wagmi.js
  store/useAppStore.js
  hooks/useNotifications.js
  components/PointsBalance.jsx
  components/NotificationSettings.jsx
```

---

## Implementation Order

### Phase 1: Smart Contracts (Days 1-2)
1. Deploy TrenchyReferrals.sol
2. Integrate with PredictionMarket.sol

### Phase 2: Referral System (Days 2-3)
1. Create useReferrals hook
2. Create ReferralDashboard component
3. Add to app navigation

### Phase 3: Enhanced Notifications (Days 3-5)
1. Upgrade useNotifications to useEnhancedNotifications
2. Create NotificationCenter
3. Add market ending reminders

### Phase 4: Achievements (Days 5-7)
1. Deploy TrenchyAchievements.sol
2. Create useAchievements hook
3. Create AchievementsPage component
4. Integrate with existing betting flow

### Phase 5: Launch Incentives (Days 8-10)
1. Deploy LaunchAirdrop.sol
2. Deploy FirstBetInsurance.sol
3. Add bet credits to PredictionMarket.sol
4. Create UI components

### Phase 6: Testing & Integration (Days 10-12)
1. End-to-end testing
2. Bug fixes
3. UI polish
4. Documentation

---

## Dependencies

### NPM Packages to Install:
- `canvas-confetti` - For win celebration animations
- `@solana/web3.js` - Not needed (Base chain)
- Additional toast library features

### Environment Variables:
```
VITE_REFERRALS_CONTRACT_ADDRESS=
VITE_ACHIEVEMENTS_CONTRACT_ADDRESS=
VITE_AIRDROP_CONTRACT_ADDRESS=
VITE_INSURANCE_CONTRACT_ADDRESS=
```

---

## Success Criteria

1. ✅ Referral system working with on-chain tracking
2. ✅ 8 notification types with sounds and animations
3. ✅ 11 achievements unlockable by users
4. ✅ Airdrop claimable by first 1000 users
5. ✅ First bet insurance claimable
6. ✅ Bet credits awardable and usable

---

## Notes

- All smart contracts should be verified on BaseScan
- Frontend should handle contract not deployed gracefully
- Use existing error handling patterns from codebase
- Follow existing code style and conventions

