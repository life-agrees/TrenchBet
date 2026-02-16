# Time-Decaying Odds Implementation

## Phase 1: Smart Contract Updates (PredictionMarket.sol) ✅ COMPLETE
- [x] Add decay configuration fields to Market struct
  - `decayStartTime` - timestamp when decay begins
  - `minMultiplier` - floor for decayed odds (basis points, e.g., 120 = 1.2x)
  - `useTimeDecay` - boolean flag to enable/disable decay
- [x] Create `_calculateDecayedMultiplier()` function with linear decay curve
- [x] Create `getEffectiveMultiplier()` view function
- [x] Create `getDecayStatus()` view function
- [x] Update `placeBet()` to emit effective multiplier
- [x] Update `calculatePotentialPayout()` to return time-adjusted odds
- [x] Update `getCurrentOdds()` to return decayed multipliers
- [x] Update all market creation functions to accept decay parameters
- [x] Add default constants for decay configuration


## Phase 2: Frontend Utilities (marketUtils.js)
- [ ] Add `calculateTimeDecayedMultiplier()` function
- [ ] Add `getDecayPhase()` function to determine current phase
- [ ] Add `formatDecayDisplay()` helper for UI formatting
- [ ] Add `getTimeUntilDecay()` helper for countdowns

## Phase 3: React Hooks
- [ ] Create `useTimeDecay.js` hook
  - Calculate current decayed odds
  - Return time remaining until next decay phase
  - Track decay status

## Phase 4: UI Components
- [ ] Update `CreateTab.jsx`
  - Add "Enable Time-Decaying Odds" toggle
  - Add decay start percentage selector (50%, 60%, 70%, 80%)
  - Add minimum odds floor input (1.1x - 1.5x)
- [ ] Update `BetModal.jsx`
  - Display current effective odds vs base odds
  - Show countdown timer: "Odds drop to X.x in MM:SS"
  - Visual indicator of decay phases
  - Warning banner when betting in late phase
- [ ] Update `MarketCard.jsx`
  - Show decay indicator badge
  - Display current effective odds

## Phase 5: Contract ABI Updates
- [ ] Update `src/contracts/abis.js` with new function signatures
- [ ] Add new view functions to ABI

## Phase 6: Testing & Integration
- [ ] Test market creation with decay enabled
- [ ] Test betting at different time phases
- [ ] Verify payout calculations use correct multipliers
- [ ] Test UI countdown and decay indicators

## Default Configuration
- Decay Start: 50% of market duration
- Decay Curve: Linear
- Minimum Odds: 1.2x (120 basis points)
- Example: 15-min market → decay starts at 7.5 mins, reaches 1.2x at 14 mins
