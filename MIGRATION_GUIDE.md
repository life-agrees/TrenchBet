# PredictionMarket Migration Guide

## ⚠️ Legacy Contract Deprecated

The monolithic `PredictionMarket.sol` contract has been **deprecated** due to size constraints.

### Why?

- **Legacy Size**: 25,956 bytes
- **Mainnet Limit**: 24,576 bytes
- **Status**: ❌ Cannot deploy to mainnet

### Replacement Architecture

| Contract | Size | Purpose | Status |
|----------|------|---------|--------|
| `PredictionMarketCore` | 14,018 bytes | Binary markets (up/down) | ✅ Deployable |
| `PredictionMarketTypes` | 20,776 bytes | MultiChoice/Range/TimeBased | ✅ Deployable |
| `PredictionMarketPayoutLib` | Library | Shared calculations | ✅ Library |
| `PredictionMarketBase` | Abstract | Shared storage | ✅ Base contract |

### Migration Steps

#### 1. Update Contract Addresses

Replace in your frontend code:

```javascript
// OLD (Deprecated)
const PREDICTION_MARKET_ADDRESS = "0x..."; // 25KB - too big

// NEW (Modular)
const PREDICTION_MARKET_CORE_ADDRESS = "0x...";      // 14KB - binary markets
const PREDICTION_MARKET_TYPES_ADDRESS = "0x...";     // 20KB - advanced markets
```

#### 2. Update ABIs

```javascript
// OLD
import { PREDICTION_MARKET_ABI } from './abis';

// NEW
import { 
  PREDICTION_MARKET_CORE_ABI,
  PREDICTION_MARKET_TYPES_ABI 
} from './abis';
```

#### 3. Update Function Calls

| Old Function | New Location | New Function |
|--------------|--------------|--------------|
| `createMarket()` | Core | `createMarketWithOdds()` |
| `placeBet()` | Core | `placeBet()` |
| `resolveMarket()` | Core | `resolveMarket()` |
| `claimWinnings()` | Core | `claimWinnings()` |
| `createMultiChoiceMarket()` | Types | `createMultiChoiceMarketWithOdds()` |
| `createRangeMarket()` | Types | `createRangeMarketWithOdds()` |
| `createTimeMarket()` | Types | `createTimeMarketWithOdds()` |
| `placeBetAdvanced()` | Types | `placeBetAdvanced()` |

#### 4. Data Migration

Existing markets in the old contract will need to be:
1. Resolved (if active)
2. Migrated manually (user positions)
3. Or users can claim winnings before deprecation

### New Features Available

1. **ChainlinkResolver**: Automated market resolution via Chainlink Automation
2. **TrenchyStaking**: 4-tier staking with points boost and fee discounts
3. **Time-Decay Multipliers**: Dynamic odds that decay over time
4. **Bet Credits**: Award and use bet credits for free bets

### Deployment Info

- **Migration Date**: 2026-02-19T16:23:38.927Z
- **Deprecated File**: `contracts/deprecated/PredictionMarket.sol.deprecated`
- **New Contracts**: See `deployments/` folder for latest addresses

### Support

For migration assistance, refer to:
- `implementation_plan_2.md` - Full implementation details
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `scripts/deploy-modular-prediction-market.cjs` - Deployment script
