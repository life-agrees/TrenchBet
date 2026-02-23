# Proxy Pattern Fix Guide - Market Visibility Issue

## Problem Summary

The issue was that newly created markets were not appearing in the active markets list. The root cause was a **storage isolation problem** in the modular contract architecture.

### Root Cause

1. **Both `PredictionMarketCore` and `PredictionMarketTypes` inherit from `PredictionMarketBase`**
2. **Each contract has its own separate storage** for `marketCounter` and `markets` mapping
3. When you create a market via `PredictionMarketCore.createMarketWithOdds()`, it stores the market in Core's storage
4. The frontend was reading from the wrong contract or the storage was isolated
5. The error "Position `155649` is out of bounds" indicated the `markets` mapping slot was corrupted or empty

## Solution: Proxy Pattern

We implemented an **EIP-1967 Proxy Pattern** that allows both Core and Types contracts to share the same storage while maintaining modularity.

### How It Works

1. **Proxy Contract**: Acts as the entry point for all interactions
2. **Shared Storage**: Both implementations read/write to the same storage slots through the proxy
3. **Function Routing**: The proxy routes calls to the appropriate implementation based on function selectors
4. **Single Source of Truth**: All market data is stored in one place

## Files Created

### 1. `contracts/PredictionMarketProxy.sol`
The proxy contract that:
- Extends OpenZeppelin's Proxy contract
- Implements selector-based routing
- Routes unknown functions to Core (default)
- Routes Types-specific functions to Types contract

### 2. `scripts/deploy-proxy-pattern.cjs`
Deployment script that:
- Deploys PayoutLib
- Deploys Core implementation
- Deploys Types implementation
- Deploys Proxy contract
- Configures function selector routing
- Saves deployment info

### 3. `scripts/verify-proxy-deployment.cjs`
Verification script that:
- Checks proxy configuration
- Verifies market counter
- Tests reading existing markets
- Validates routing setup

### 4. `scripts/test-proxy-market-creation.cjs`
Test script that:
- Creates test markets through proxy
- Verifies markets are accessible
- Tests multiple market creation
- Validates all market data

## Deployment Steps

### Step 1: Deploy the Proxy Pattern

```bash
npx hardhat run scripts/deploy-proxy-pattern.cjs --network core
```

This will:
- Deploy all implementations
- Deploy the proxy
- Configure routing
- Save deployment addresses

### Step 2: Verify the Deployment

```bash
npx hardhat run scripts/verify-proxy-deployment.cjs --network core
```

This checks:
- Proxy is properly configured
- Implementations are set correctly
- Markets can be read

### Step 3: Test Market Creation

```bash
npx hardhat run scripts/test-proxy-market-creation.cjs --network core
```

This creates test markets and verifies they appear correctly.

## Frontend Configuration

### Update Contract Addresses

After deployment, update your frontend configuration to use the **Proxy address** for all interactions:

```javascript
// config/contracts.js
export const CONTRACTS = {
  // OLD - Separate contracts (BROKEN)
  // core: "0xb8f08E9CF766389A534dcE49C72E33F92fC4bc30",
  // types: "0x5BdD5381a283Fb04167019BE35b2102429c8d621",
  
  // NEW - Use Proxy for everything (FIXED)
  proxy: "0x...proxy-address-from-deployment...",
};
```

### Update Hooks

Modify `useMarkets.js` and other hooks to use the proxy:

```javascript
// OLD
const coreContract = useContract({
  address: CONTRACTS.core,
  abi: CORE_ABI,
});

// NEW
const contract = useContract({
  address: CONTRACTS.proxy,  // Use proxy!
  abi: CORE_ABI,             // ABI remains the same
});
```

### Update Admin Panel

In `AdminPanel.jsx`, update the contract references:

```javascript
// OLD
const { coreContract, typesContract } = useContracts();

// NEW
const { proxyContract } = useContracts();  // Single proxy contract
```

## Key Changes Summary

| Aspect | Before (Broken) | After (Fixed) |
|--------|----------------|---------------|
| **Storage** | Isolated per contract | Shared through proxy |
| **Market Creation** | Core contract only | Through proxy |
| **Market Reading** | Wrong contract | Always through proxy |
| **Contract Addresses** | Multiple addresses | Single proxy address |
| **Modularity** | Separate contracts | Maintained via proxy |

## Testing Checklist

After deploying the proxy pattern:

- [ ] Deploy proxy pattern successfully
- [ ] Verify proxy configuration
- [ ] Create a test market through proxy
- [ ] Verify market appears in active markets
- [ ] Create multiple markets
- [ ] Verify all markets are accessible
- [ ] Test market resolution
- [ ] Test betting functionality
- [ ] Update frontend to use proxy
- [ ] Test complete user flow

## Troubleshooting

### Issue: Markets still not appearing

**Solution**: Ensure frontend is using the proxy address, not the old Core/Types addresses.

### Issue: "Function not found" errors

**Solution**: Check that the proxy has the correct implementation set for that function selector. Run `verify-proxy-deployment.cjs`.

### Issue: Markets created before proxy deployment are missing

**Solution**: The proxy shares storage with the original Core contract if deployed with the same storage layout. If not, you'll need to migrate markets or start fresh.

## Benefits of This Fix

1. **Single Storage**: All markets stored in one place
2. **Modularity Maintained**: Core and Types remain separate implementations
3. **Upgradeable**: Can upgrade implementations without losing data
4. **Gas Efficient**: No cross-contract calls needed
5. **Simple Frontend**: Only one contract address to manage

## Next Steps

1. Deploy the proxy pattern to your network
2. Update frontend configuration
3. Test thoroughly
4. Consider migrating existing markets if needed
5. Document the new architecture for your team

## Support

If you encounter issues:

1. Run `verify-proxy-deployment.cjs` to check configuration
2. Check that all function selectors are properly routed
3. Verify the proxy has the correct default implementation
4. Ensure frontend is using the proxy address exclusively

---

**Remember**: Always use the Proxy address for all interactions. Never interact directly with the implementation contracts (Core/Types) after deploying the proxy.
