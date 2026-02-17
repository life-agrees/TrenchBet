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


## Phase 2: Frontend Utilities (marketUtils.js) ✅ COMPLETE
- [x] Add `calculateTimeDecayedMultiplier()` function
- [x] Add `getDecayPhase()` function to determine current phase
- [x] Add `formatDecayDisplay()` helper for UI formatting
- [x] Add `getTimeUntilDecay()` helper for countdowns
- [x] Add `getEffectiveMultiplierDisplay()` for bet modal odds display

## Phase 3: React Hooks ✅ COMPLETE
- [x] Create `useTimeDecay.js` hook
  - Calculate current decayed odds
  - Return time remaining until next decay phase
  - Track decay status

## Phase 4: UI Components ✅ COMPLETE
- [x] Update `CreateTab.jsx`
  - Add "Enable Time-Decaying Odds" toggle
  - Add decay start percentage selector (50%, 60%, 70%, 80%)
  - Add minimum odds floor input (1.1x - 1.5x)
- [x] Update `BetModal.jsx`
  - Display current effective odds vs base odds
  - Show countdown timer: "Odds drop to X.x in MM:SS"
  - Visual indicator of decay phases
  - Warning banner when betting in late phase
- [x] Update `MarketCard.jsx`
  - Show decay indicator badge
  - Display current effective odds

## Phase 5: Contract ABI Updates ✅ COMPLETE
- [x] Update `src/contracts/abis.js` with new function signatures
- [x] Add new view functions to ABI

## Phase 6: Testing & Integration
- [x] Test market creation with decay enabled
- [x] Test betting at different time phases
- [x] Verify payout calculations use correct multipliers
- [x] Test UI countdown and decay indicators

## Bug Fixes Applied ✅
- [x] **Fixed time unit inconsistency**: All time values now use milliseconds consistently
  - `useMarkets.js`: Converts `startTime`, `endTime`, `decayStartTime` to milliseconds
  - `useTimeDecay.js`: Uses `Date.now()` (milliseconds) instead of `Math.floor(Date.now() / 1000)`
  - `marketUtils.js`: All time decay calculations use milliseconds
- [x] **Fixed BetModal odds display**: Now uses `getEffectiveMultiplier` from `useTimeDecay` hook to show decayed odds
- [x] **Fixed payout calculation**: Uses decayed multiplier for accurate payout estimates

## Default Configuration
- Decay Start: 50% of market duration
- Decay Curve: Linear
- Minimum Odds: 1.2x (120 basis points)
- Example: 15-min market → decay starts at 7.5 mins, reaches 1.2x at 14 mins
