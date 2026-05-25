# Proxy Pattern Deployment Guide

## Overview

This guide will walk you through deploying the fixed contracts with the proxy pattern to resolve the "Position out of bounds" errors.

## Prerequisites

1. **Node.js and npm installed**
2. **Hardhat configured** with Base Sepolia network
3. **Private key** with Base Sepolia ETH for gas
4. **USDC on Base Sepolia** for testing

## Step 1: Environment Setup

Create a `.env` file in your project root:

```env
# Required
PRIVATE_KEY=your_private_key_here

# Optional - will use defaults if not set
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## Step 2: Compile Contracts

```bash
npx hardhat compile
```

## Step 3: Deploy Implementation Contracts

Run the deployment script:

```bash
npx hardhat run scripts/deploy-proxy-pattern.cjs --network baseSepolia
```

This will deploy:
1. **PredictionMarketPayoutLib** - Library for payout calculations
2. **PredictionMarketCore** - Implementation for binary markets
3. **PredictionMarketTypes** - Implementation for multi/range/time markets
4. **PredictionMarketProxy** - Proxy contract (your main interface)

## Step 4: Update Frontend Constants

After deployment, update `src/utils/constants.js`:

```javascript
// PROXY ADDRESS - Use this for ALL interactions
export const PROXY_ADDRESS = "0x..."; // From deployment output

// Legacy contracts (for reading old markets only)
export const CONTRACTS = {
  PREDICTION_MARKET: "0x...", // Old contract
  PREDICTION_MARKET_CORE: "0x...", // Implementation (not for direct use)
  PREDICTION_MARKET_TYPES: "0x...", // Implementation (not for direct use)
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  // ... other contracts
};
```

## Step 5: Configure Price Feeds

Run the configuration script:

```bash
npx hardhat run scripts/configure-price-feeds-proxy.cjs --network baseSepolia
```

This sets up price feeds for BTC, ETH, and LINK on the proxy contract.

## Step 6: Test Deployment

### Test 1: Create a Binary Market
```bash
npx hardhat run scripts/test-proxy-market-creation.cjs --network baseSepolia
```

### Test 2: Verify Market Counter
Check that `marketCounter` matches actual markets:
- Should return 1 after creating 1 market
- Should return 2 after creating 2 markets
- No drift on failed transactions

### Test 3: Read Markets
Verify markets can be read from proxy:
```javascript
const market = await proxy.markets(0);
console.log("Market 0:", market);
```

## Step 7: Verify on BaseScan

1. Go to https://sepolia.basescan.org
2. Verify each contract:
   - PredictionMarketCore
   - PredictionMarketTypes
   - PredictionMarketProxy

## Troubleshooting

### Issue: "Position out of bounds" still occurs
**Cause**: Old contracts still have the counter drift bug
**Solution**: 
1. Ensure you're using the NEW proxy address
2. Clear browser cache
3. Refresh the page to load new contract addresses

### Issue: Markets not appearing in UI
**Cause**: Frontend still reading from old contracts
**Solution**:
1. Check `src/utils/constants.js` has correct `PROXY_ADDRESS`
2. Verify `useMarkets.js` is reading from proxy
3. Check browser console for errors

### Issue: Cannot create markets
**Cause**: Price feeds not configured
**Solution**:
```bash
npx hardhat run scripts/configure-price-feeds-proxy.cjs --network baseSepolia
```

## Deployment Checklist

- [ ] Contracts compiled successfully
- [ ] Proxy pattern deployed
- [ ] Price feeds configured
- [ ] Frontend constants updated
- [ ] Test market created successfully
- [ ] Market counter verified
- [ ] Markets readable from proxy
- [ ] Betting works through proxy
- [ ] Contracts verified on BaseScan

## Expected Output

After successful deployment, you should see:

```
🎉 PROXY PATTERN DEPLOYMENT COMPLETE!

📋 IMPORTANT ADDRESSES:
   Proxy (USE THIS FOR ALL INTERACTIONS): 0x...
   Core Implementation: 0x...
   Types Implementation: 0x...

⚠️  UPDATE YOUR FRONTEND CONFIG:
   - Set PROXY_ADDRESS: 0x...
   - Remove separate CORE/Types addresses
```

## Next Steps

1. **Test all market types**: Binary, Multi-Choice, Range, Time-Based
2. **Test betting flow**: Place bets on each market type
3. **Test resolution**: Resolve markets and claim winnings
4. **Monitor for errors**: Check for any "Position out of bounds" errors
5. **Production deployment**: Once tested, deploy to Base mainnet

## Support

If you encounter issues:
1. Check `PROXY_PATTERN_ISSUE_ANALYSIS.md` for detailed explanation
2. Review contract code in `contracts/PredictionMarketCore.sol`
3. Check frontend hooks in `src/hooks/useMarkets.js`
