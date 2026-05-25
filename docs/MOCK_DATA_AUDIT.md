# 🔍 Mock Data Audit Report

**Date:** March 7, 2026  
**Status:** COMPLETE SCAN  
**Total Files with Mock Data:** 10+

---

## 📋 Executive Summary

Your codebase contains **multiple instances of mock/placeholder data** used for:
- Development & testing
- Fallback when APIs are unavailable
- Dashboard visualization demonstrations
- Real-time notification simulations

**Critical Finding:** Most mock data is properly documented with TODO comments and clearly marked as non-production. However, some instances need attention before mainnet deployment.

---

## 🚨 CRITICAL MOCK DATA (Must Fix Before Mainnet)

### 1. **src/App.jsx - Line 820**
**Severity:** ⚠️ MEDIUM  
**Issue:** Random placeholder points generation

```javascript
// CURRENT (WRONG FOR PRODUCTION):
userPoints={Math.floor(Math.random() * 5000)}

// This generates random points on every render
// Should pull from actual points contract/API
```

**Impact:**
- User points display inconsistent every render
- Not persisted between page refreshes
- Misleading to users

**Recommendation:**
```javascript
// SHOULD BE:
userPoints={userPoints}  // from usePointsData hook or contract

// Or if testing:
userPoints={userPoints !== undefined ? userPoints : 0}
```

---

## ⚠️ MODERATE MOCK DATA (In Development Components)

### 2. **src/hooks/useActivityFeed.js - Lines 20-85**
**Severity:** ⚠️ MEDIUM  
**Status:** Development fallback  
**Description:** Mock market and bet activities

```javascript
const mockMarketActivities = [
  {
    id: 'market-1',
    type: 'market',
    title: 'BTC/USD Market',
    desc: 'Price moved 2.3% up in last hour',
    time: new Date(Date.now() - 2 * 60000),
    // ... more properties
  },
  // ... 2 more markets
];

const mockBetActivities = [
  {
    id: 'bet-1',
    type: 'bet_placed',
    title: 'Bet Placed',
    // ... more properties
  },
  // ... 1 more bet
];
```

**When Used:** When `isConnected` is false or API fails  
**Impact:** Users see generic "fake" activities instead of their real data  
**Recommendation:** Replace with actual API calls to your backend or subgraph

---

### 3. **src/utils/adminDashboardUtils.js - Lines 14, 25, 29**
**Severity:** ⚠️ MEDIUM  
**Status:** Chart data generation with randomization  
**Description:** Generates 7-day trend data with random variations

```javascript
// Line 14 - Volume trend
volume: Math.round(baseVolume * (0.8 + Math.random() * 0.6))

// Line 25, 29 - User growth
cumulativeUsers += Math.max(1, Math.floor(baseUsers + (Math.random() * 15 - 5)));
```

**When Used:** Admin dashboard chart rendering  
**Impact:** Charts show different data on every page reload (not deterministic)  
**Recommendation:** Cache chart data or use historical blockchain data instead

---

### 4. **src/utils/adminDashboardUtils.js - Lines 133-134**
**Severity:** 🟢 LOW  
**Status:** Properly commented  
**Description:** Win rate and period change metadata

```javascript
winRate: '47.2%', // Mock - would come from actual bet outcomes
periodChange: '+18.5%', // Mock - would calculate from time periods
```

**When Used:** Admin dashboard KPI cards  
**Impact:** Shows hardcoded example values  
**Recommendation:** Replace with calculated values from actual bet data

---

### 5. **src/components/DashboardTab.jsx - Lines 71-75**
**Severity:** ⚠️ MEDIUM  
**Status:** Random previous stats for trend calculation  
**Description:** Mock previous period data for calculating trends

```javascript
const previousStats = useMemo(() => ({
  totalUsers: Math.max(0, (stats?.totalUsers || 0) - Math.floor(Math.random() * 5)),
  totalVolume: Math.max(0, (stats?.totalVolume || 0) - Math.floor(Math.random() * 1000)),
  totalBets: Math.max(0, (stats?.totalBets || 0) - Math.floor(Math.random() * 10)),
  pendingFees: (stats?.pendingFees || 0n) > BigInt(Math.floor(Math.random() * 100) * 1e6) 
    ? (stats?.pendingFees || 0n) - BigInt(Math.floor(Math.random() * 100) * 1e6)
    : 0n
}), [stats]);
```

**When Used:** Dashboard trend calculation (% change)  
**Impact:** Trends are meaningless (random vs current stats)  
**Recommendation:** Store previous period data and calculate actual deltas

---

## 🟢 LOW-PRIORITY MOCK DATA (Fallbacks & Demos)

### 6. **src/hooks/usePointsData.js - Lines 101-110**
**Severity:** 🟢 LOW  
**Status:** Fallback for development  
**Description:** Mock points data when API is unavailable

```javascript
const mockData = {
  wallet_address: walletAddress,
  total_points: Math.floor(Math.random() * 5000) + 1000,
  points_claimed: Math.floor(Math.random() * 500),
  points_available: Math.floor(Math.random() * 300),
  current_streak: Math.floor(Math.random() * 15) + 1,
  best_streak: Math.floor(Math.random() * 30) + 5,
  last_bet_timestamp: new Date().toISOString()
};
```

**When Used:** When `/api/points/balance` API fails (dev environment)  
**Impact:** Users see random points instead of real data  
**Recommendation:** This is acceptable for dev, but log a warning (already done ✅)

---

### 7. **src/components/PointsHistoryModal.jsx - Lines 8-18**
**Severity:** 🟡 MEDIUM  
**Status:** Demonstration data  
**Description:** Hardcoded transaction history for UI demo

```javascript
const history = [
  {
    id: 1,
    type: 'earned',
    amount: 100,
    description: 'Daily login bonus',
    timestamp: new Date(Date.now() - 86400000),
    status: 'completed'
  },
  {
    id: 2,
    type: 'spent',
    amount: -50,
    description: 'Market bet',
    timestamp: new Date(Date.now() - 172800000),
    status: 'completed'
  }
];
```

**When Used:** PointsHistoryModal component render  
**Impact:** Always shows same 2 fake transactions  
**Recommendation:** Fetch from API or contract event logs

---

### 8. **src/hooks/useRealtimeNotifications.jsx - Lines 49-90**
**Severity:** 🔴 CRITICAL  
**Status:** Entire hook is mock (important!)  
**Description:** Simulated WebSocket with fake notification events

```javascript
// Line 49 comment: Initialize WebSocket connection (mock for now)

// Lines 85-86: Simulated random events
if (Math.random() > 0.85) {
  const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
```

**When Used:** Real-time activity feed notifications  
**Impact:** Users see completely fake notifications (no real market data)  
**Recommendation:** Replace with actual WebSocket or polling backend

---

### 9. **src/components/PreLoader.jsx - Line 25**
**Severity:** 🟢 LOW  
**Status:** UI animation  
**Description:** Random progress increment for loading bar

```javascript
return prev + Math.random() * 15 + 5;  // Used for animated progress
```

**When Used:** During app initialization  
**Impact:** Progress bar animation looks natural (acceptable)  
**Recommendation:** Keep as-is (good UX for perceived performance)

---

### 10. **src/utils/adminDashboardUtils.js - Lines 151-159**
**Severity:** 🟢 LOW  
**Status:** Utility function with hardcoded reasons  
**Description:** Alert reason examples

```javascript
export const generateMockAlertReasons = () => {
  return [
    'Markets ending in next hour',
    'Unusual bet volume detected',
    'New user registration spike',
    'Contract gas optimization alert',
    'Protocol update available'
  ];
};
```

**When Used:** Admin dashboard alerts sidebar  
**Impact:** Shows placeholder alert descriptions  
**Recommendation:** Replace with actual alert logic based on real metrics

---

### 11. **scripts/deploy-chainlink-resolver.cjs - Line 37**
**Severity:** ⚠️ MEDIUM  
**Status:** Deployment configuration  
**Description:** Placeholder Chainlink price feed address

```javascript
"SOL": "0x0E9C9c5b1d4E4A8B7c6D5E4F3A2B1C0D9E8F7A6B",  // SOL/USD (placeholder - verify on Base Sepolia)
```

**When Used:** Chainlink resolver deployment  
**Impact:** Price feed may be invalid on mainnet  
**Recommendation:** Verify actual SOL/USD feed address on deployment chain

---

### 12. **api/points/prepare-claim.js - Line 105**
**Severity:** 🟡 MEDIUM  
**Status:** Session ID generation  
**Description:** Random session ID for claims

```javascript
`${address}-${pointsAmount}-${Date.now()}-${Math.random()}`
```

**When Used:** Points claim session tracking  
**Impact:** Relies on random for uniqueness (risky)  
**Recommendation:** Use crypto.randomUUID() or server-generated nonce instead

---

---

## 📊 Summary Table

| File | Location | Type | Severity | Status | Action |
|------|----------|------|----------|--------|--------|
| **App.jsx** | Line 820 | Random points | 🔴 CRITICAL | Active | ⚠️ Remove before mainnet |
| **useActivityFeed.js** | Lines 20-85 | Mock activities | ⚠️ MEDIUM | Fallback | ✅ OK for dev |
| **adminDashboardUtils.js** | Lines 14,25 | Chart data | ⚠️ MEDIUM | Demo | ⚠️ Cache or use history |
| **DashboardTab.jsx** | Lines 71-75 | Previous stats | ⚠️ MEDIUM | Calculation | ⚠️ Use actual history |
| **usePointsData.js** | Lines 101-110 | Fallback points | 🟢 LOW | Dev only | ✅ Acceptable |
| **PointsHistoryModal.jsx** | Lines 8-18 | Demo data | 🟡 MEDIUM | UI demo | ⚠️ Fetch real data |
| **useRealtimeNotifications.jsx** | Full file | WebSocket mock | 🔴 CRITICAL | Mock | ⚠️ Implement real WS |
| **PreLoader.jsx** | Line 25 | Progress animation | 🟢 LOW | UX | ✅ Keep as-is |
| **adminDashboardUtils.js** | Lines 151-159 | Alert reasons | 🟢 LOW | Demo | ✅ OK for now |
| **deploy-chainlink-resolver.cjs** | Line 37 | Feed address | ⚠️ MEDIUM | Config | ⚠️ Verify feeds |
| **prepare-claim.js** | Line 105 | Session ID | 🟡 MEDIUM | Security | ⚠️ Use crypto UUID |

---

## 🎯 Action Items Before Mainnet

### 🔴 CRITICAL (Must Fix)
- [ ] Remove random `userPoints` generation in App.jsx line 820
- [ ] Implement real WebSocket in useRealtimeNotifications.jsx
- [ ] Replace mock activity feed with real API calls

### ⚠️ HIGH (Strongly Recommended)
- [ ] Replace random previous stats with actual historical data (DashboardTab.jsx)
- [ ] Verify Chainlink feed addresses for deployment chain
- [ ] Replace session ID random with crypto.randomUUID()
- [ ] Cache or persist chart trend data (adminDashboardUtils.js)

### 🟡 MEDIUM (Before Production)
- [ ] Fetch real points history from API/contract
- [ ] Replace hardcoded alert reasons with calculated metrics
- [ ] Document all remaining mock data with TODOs

### 🟢 LOW (Nice to Have)
- [ ] Keep PreLoader progress animation as-is ✅
- [ ] usePointsData fallback is acceptable for dev ✅

---

## 🔧 How to Find More Mock Data

To audit for future mock data, search for:
```bash
# Search for mock patterns
grep -r "mock\|Mock\|MOCK" src/
grep -r "dummy\|Dummy\|DUMMY" src/
grep -r "fake\|Fake\|FAKE" src/
grep -r "TODO.*mock\|FIXME.*data" src/
grep -r "Math.random()" src/
```

---

## ✅ Verification Checklist

After removing mock data:
- [ ] Test with real contract on testnet
- [ ] Verify all API endpoints are returning data
- [ ] No console warnings about mock data
- [ ] All user-facing data is from contracts/APIs (never random)
- [ ] Charts show deterministic historical data
- [ ] WebSocket properly connects and streams events
- [ ] Points sync with contract state

---

**Report Generated:** March 7, 2026  
**Next Review:** Post-mainnet launch  
**Last Updated:** Current scan
