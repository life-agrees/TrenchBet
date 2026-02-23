# Market Visibility Troubleshooting Guide

## Quick Diagnosis

### Problem: Market created but not showing in active markets list

#### Step 1: Check Browser Console Logs
Open browser DevTools (F12) → Console and look for:

```
✅ Successfully fetched X markets (Y core, Z types, W legacy)
```

**If you see this with X > 0:**
- Markets ARE being fetched
- Issue is likely filtering or display logic
- Check if markets are being filtered out (expired, wrong asset, etc.)

**If you see X = 0:**
- Markets are NOT being fetched
- Issue is likely in contract interaction or validation logic

#### Step 2: Check Individual Market Logs
Look for logs like:

```
Fetching market N from core contract...
Raw market N data: {"id":"0","asset":"BTC","startTime":"1234567890",...}
Market N data: id=0, startTime=1234567890
```

**If you see "startTime=0":**
- Market slot is empty/uninitialized
- This is expected for markets that were never created

**If you see "startTime > 0" but market not showing:**
- Validation logic is working
- Check filtering logic (endTime, resolved status, etc.)

#### Step 3: Check AdminPanel Manage Tab
- Open AdminPanel → Manage tab
- If market appears there but not on main page:
  - Market is valid but may be expired or filtered
  - Check `endTime` vs current time

## Common Issues & Solutions

### Issue 1: Market 0 Not Showing (Fixed ✅)

**Symptoms:**
- Market 0 exists in contract but doesn't appear in UI
- Logs show "Successfully fetched 0 markets"

**Root Cause:**
Validation logic was checking `if (market.id === 0n)` which rejected Market 0.

**Solution:**
Changed validation to check `startTime > 0` instead:

```javascript
// ❌ OLD (Broken)
if (!market || market.id === 0n) {
  return null;
}

// ✅ NEW (Fixed)
if (!market || market.startTime === undefined || market.startTime === 0n) {
  return null;
}
```

**Files Updated:**
- `src/hooks/useMarkets.js` - `fetchSingleMarket()` function
- `src/components/AdminPanel.jsx` - `fetchSingleMarket()` function

### Issue 2: Expired Markets Not Showing

**Symptoms:**
- Market appears in AdminPanel but not on main page
- Market status shows "expired" or "pending"

**Root Cause:**
Main page only shows active markets (not resolved, not expired).

**Expected Behavior:**
- Expired markets should appear in AdminPanel Manage tab
- Expired markets should NOT appear on main page
- This is correct behavior!

**Check Market Status:**
```javascript
const now = Date.now();
const isExpired = market.endTime <= now;
const isResolved = market.resolved;
const isActive = !isResolved && !isExpired;
```

### Issue 3: Empty Market Slots

**Symptoms:**
- Contract shows `marketCounter: 9`
- Only 1 market appears in UI
- Logs show many "EMPTY SLOT" messages

**Root Cause:**
Contract counter includes all slots, but only some have valid data.

**Explanation:**
- Markets are stored in an array
- `marketCounter` is the next available slot index
- Empty slots have `startTime = 0`
- This is normal - not all slots are used

**Example:**
```
marketCounter: 9
Market 0: VALID (startTime > 0)
Markets 1-8: EMPTY (startTime = 0)
```

### Issue 4: Markets Not Appearing After Creation

**Symptoms:**
- "Market created successfully" message appears
- Market doesn't appear in list immediately
- Refreshing page shows the market

**Root Cause:**
Timing issue between transaction confirmation and market fetching.

**Solution:**
The fix includes:
1. Delay before refreshing (2 seconds)
2. Force refresh trigger
3. Global refresh callback

**Check Implementation:**
In `AdminPanel.jsx`:
```javascript
// Wait for blockchain state to settle
await new Promise(resolve => setTimeout(resolve, 2000));

// Refresh markets list
await fetchMarkets();

// Notify parent component
if (onMarketCreated) {
  onMarketCreated();
}
```

In `app.jsx`:
```javascript
const handleMarketCreated = useCallback(() => {
  console.log('🔄 Market created - refreshing markets...');
  refreshMarkets();
}, [refreshMarkets]);
```

## Debugging Commands

### Check Contract State
```bash
# Check market counter
node scripts/test-market-creation.cjs

# Check specific market
node scripts/check-contract-functions.cjs
```

### Check Frontend State
Open browser console and run:
```javascript
// Check markets in state
const markets = JSON.parse(localStorage.getItem('markets') || '[]');
console.log('Markets:', markets);

// Check current time vs market end times
const now = Date.now();
markets.forEach(m => {
  const endTime = Number(m.endTime);
  console.log(`Market ${m.id}: endTime=${new Date(endTime).toISOString()}, expired=${endTime <= now}`);
});
```

## Validation Logic Reference

### Market Validation (Frontend)
```javascript
// A market is VALID if:
market.startTime > 0

// A market is ACTIVE if:
!market.resolved && market.endTime > Date.now()

// A market is EXPIRED if:
market.endTime <= Date.now()
```

### Market Validation (Contract)
```solidity
// In PredictionMarketCore.sol:
struct Market {
    uint256 id;           // Market ID (can be 0)
    uint256 startTime;    // Block timestamp when created (> 0 for valid markets)
    uint256 endTime;      // When market expires
    bool resolved;        // Whether market has been resolved
    // ... other fields
}

// When creating a market:
market.startTime = block.timestamp;  // Always > 0 for valid markets
```

## Testing Checklist

When testing market creation:

- [ ] Create market with 1 hour duration
- [ ] Check AdminPanel Manage tab immediately
- [ ] Check main page Active Markets immediately
- [ ] Wait 5 seconds and refresh both
- [ ] Check browser console for logs
- [ ] Verify market has `startTime > 0`
- [ ] Verify market has `endTime > Date.now()`
- [ ] Verify market has `resolved = false`

## Need More Help?

If issues persist:

1. Check browser console for errors
2. Run `node scripts/test-market-creation.cjs`
3. Check contract state with Hardhat console
4. Review recent changes to `useMarkets.js` or `AdminPanel.jsx`
