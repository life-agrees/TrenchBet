# TrenchyBet — Points, Rewards & Gamification

## Points System

### How Points Are Earned

| Action | Formula | Example |
|--------|---------|---------|
| **Place a bet** | `floor(USDC_amount × 10)` | $3 bet = 30 points |
| **Win a bet** | `floor(original_bet × 10 × 2)` | $3 win = 60 bonus points |

Points are tracked in the `points_ledger` table (append-only) and the `users.total_points` field is always derived by summing the ledger.

### Points Tiers

| Tier | Threshold |
|------|-----------|
| Bronze | 0 points |
| Silver | 1,000 points |
| Gold | 5,000 points |
| Diamond | 10,000 points |

### Points-to-Token Conversion
- **Rate**: 100 points = 1 TRENCHY token
- **Minimum claim**: 100 points
- **Monthly cap**: 10,000 TRENCHY
- **Lock period**: 15 days for standard claims
- **Contract**: `TrenchyPointsClaim.sol`

---

## Achievement System

On-chain badges tracked by `TrenchyAchievements.sol`:

| ID | Name | Points | Condition |
|----|------|--------|-----------|
| 0 | First Bet | 50 | Place your first bet |
| 1 | Win Streak 3 | 100 | Win 3 in a row |
| 2 | Win Streak 5 | 200 | Win 5 in a row |
| 3 | Whale | 150 | Place a large bet |
| 4 | Sharpshooter | 300 | High win rate |
| 5 | Early Bird | 50 | Bet in the first minute |
| 6 | Speed Demon | 100 | Quick bet placement |
| 7 | Social Butterfly | 150 | Refer multiple users |
| 8 | Diamond Hands | 250 | Long-term participation |
| 9 | Oracle | 500 | Exceptional prediction accuracy |
| 10 | Trendsetter | 75 | First to bet on a new market |
| 11 | Founder | 1,000 | Early platform user |

---

## Referral System

- **Contract**: `TrenchyReferrals.sol`
- **Reward**: 1,000 points per successful referral
- **Max referrals**: 100 per user
- **Frontend**: `ReferralDashboard.jsx` + `useReferrals.js`

---

## Streak System

- **Contract**: `TrenchyStreaks.sol`
- **Mechanic**: Place at least one bet per day to maintain streak
- **Tracked**: `current_streak` and `best_streak` in `users` table

---

## Staking

- **Contract**: `TrenchyStaking.sol` at `0x2513...7228`
- **Tiers**: Bronze → Silver → Gold → Diamond
- **Frontend**: `StakingDashboard.jsx` + `useStaking.js`

---

## Vouchers

- **Contract**: `BetVouchers.sol`
- **Purpose**: Free bet credits for promotions
- **Frontend**: `VouchersTab.jsx` + `useVouchers.js`

---

## Airdrop

- **Contract**: `LaunchAirdrop.sol` at `0x0971...5Ff3b`
- **Amount**: 100 TRENCHY tokens per recipient
- **Max recipients**: 1,000
- **Frontend**: `AirdropClaimModal.jsx`

---

## Bet Credits

| Trigger | Credit Amount |
|---------|--------------|
| Default award | 20 USDC equivalent |
| Streak requirement | 3 consecutive days |
| Volume requirement | 10 bets placed |
| Referral requirement | 2 friends referred |
