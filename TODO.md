# Fix Missing Bet Issue - Implementation Plan

## Problem
- Total bets: 3, Wins: 2, Losses: 0, Streak: 2
- 1 bet is "orphaned" - resolved but missing outcome data (priceWentUp/winningChoice is null/undefined)
- Bet doesn't show in any category (ongoing, wins, or losses)

## Implementation Steps

### ✅ Step 1: Fix useUserBets.js
- [x] Add `pendingBets` category for bets on resolved markets with missing outcome data
- [x] Fix categorization logic to handle null/undefined outcome data
- [x] Return `pendingBets` from the hook


### ✅ Step 2: Update useUserStats.js  
- [x] Include `pendingBets` in stats calculation
- [x] Add `pending` count to returned stats object
- [x] Update totalBets to include pending


### ✅ Step 3: Update app.jsx
- [x] Add "Pending" tab to show uncategorized bets
- [x] Update stats cards to show pending count
- [x] Add visual indicator for pending bets
- [x] Update bet view tabs to include pending count

### ✅ Step 4: Testing & Verification
- [x] Verify all 3 bets now show in appropriate categories
- [x] Check that math adds up: wins + losses + pending = total
- [x] Ensure UI displays correctly


## Files to Edit
1. `src/hooks/useUserBets.js` - Main categorization fix
2. `src/hooks/useUserStats.js` - Stats calculation update  
3. `src/app.jsx` - UI updates for pending bets
