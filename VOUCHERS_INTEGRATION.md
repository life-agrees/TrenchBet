# BetVouchers Integration Guide

## Overview
The BetVouchers contract now supports batch distribution of non-withdrawable vouchers. Perfect for:
- ✅ Waitlist campaigns ($10, $15, $20 vouchers to 2k+ wallets)
- ✅ Promotions and contests
- ✅ Referral rewards
- ✅ Engagement bonuses

---

## Step 1: Update AdminPanel.jsx

Add the VouchersTab import and tab:

```javascript
// At the top with other imports
import VouchersTab from './VouchersTab';

// In the render section, add to tabs array (around line 1543-1557)
// Add 'vouchers' to the tabs list:
const tabs = ['dashboard', 'create', 'manage', 'bot', 'vouchers'];

// Then add the conditional render (around line 1615):
{activeTab === 'vouchers' && vouchersContractAddress && (
  <VouchersTab vouchersContractAddress={vouchersContractAddress} />
)}

// Add to AdminPanel props:
export default function AdminPanel({ 
  isOpen: propIsOpen, 
  onClose, 
  onMarketCreated, 
  markets: parentMarkets, 
  isLoadingMarkets: parentIsLoadingMarkets,
  vouchersContractAddress  // ADD THIS
})
```

---

## Step 2: Update app.jsx

Pass the vouchers contract address to AdminPanel:

```javascript
// In your constants or imports
const VOUCHERS_CONTRACT_ADDRESS = "0x..."; // Deploy BetVouchers contract first

// In AdminPanel render:
<AdminPanel 
  isOpen={showAdminPanel}
  onClose={() => setShowAdminPanel(false)}
  onMarketCreated={handleMarketCreated}
  vouchersContractAddress={VOUCHERS_CONTRACT_ADDRESS}
/>
```

---

## Step 3: Deploy BetVouchers Contract

Create `deploy-vouchers.cjs`:

```javascript
const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = "0x..."; // Your USDC address

  const BetVouchers = await hre.ethers.getContractFactory("BetVouchers");
  const vouchers = await BetVouchers.deploy(USDC_ADDRESS);
  
  await vouchers.deployed();
  console.log("BetVouchers deployed to:", vouchers.address);

  // Transfer ownership to admin wallet
  await vouchers.transferOwnership("0xYourAdminAddress");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run: `npx hardhat run deploy-vouchers.cjs --network baseSepolia`

---

## Step 4: Prepare CSV for Batch Distribution

Create a CSV file with format:

```
0x1234567890123456789012345678901234567890, 10
0x2345678901234567890123456789012345678901, 15
0x3456789012345678901234567890123456789012, 20
0x4567890123456789012345678901234567890123, 10
... (up to 2000 rows)
```

**Format:**
- Column 1: Ethereum address (0x...)
- Column 2: Amount in USD ($10, $15, $20, etc.)
- Decimal values work (e.g., 10.5 for $10.50)
- One entry per line

---

## Step 5: Use the Vouchers Tab

### Option A: Batch Upload (Best for campaigns)
1. Go to AdminPanel → **Vouchers** tab
2. Enter Campaign ID: `waitlist_2025`
3. Click "Upload CSV File"
4. Preview shows: addresses, amounts, total
5. Click "Distribute X Vouchers"
6. Confirm transaction in wallet

### Option B: Single Award (For individual rewards)
1. Go to AdminPanel → **Vouchers** tab
2. Enter wallet address
3. Enter amount ($)
4. Select reason (contest_winner, referral_bonus, etc.)
5. Click "Award $X Voucher"

---

## Contract Functions Reference

### For Frontend/Backend Integration

```solidity
// Award single voucher
function awardVoucher(
  address user,
  uint256 amount,  // In USDC (6 decimals): 10e6 = $10
  string memory reason
) external onlyOwner

// Batch distribute (max 500 per batch)
function batchDistributeVouchers(
  address[] calldata users,
  uint256[] calldata amounts,  // In USDC (6 decimals)
  string memory campaignId
) external onlyOwner returns (uint256 distributedCount)

// Check balance
function getVoucherBalance(address user) external view returns (uint256)

// Get full status
function getVoucherStatus(address user) external view returns (
  uint256 balance,
  uint256 spent,
  bool canClaimFirstBet
)

// Spend during bet (called by PredictionMarket)
function spendVoucher(
  address user,
  uint256 amount,
  uint256 marketId
) external returns (uint256 amountSpent)
```

---

## How Vouchers Work in Betting

When user places bet:

```
User wants to bet: $100
User has vouchers: $50
User has USDC: $60

Flow:
1. PredictionMarket calls spendVoucher(user, 100e6, marketId)
2. Contract deducts $50 from voucher balance
3. Returns: $50 spent
4. PredictionMarket takes remaining $50 from USDC
5. Bet placed with $100 total
```

---

## Campaign Ideas

### 🚀 Launch Campaign
```
Waitlist → 2000 wallets
Distribution:
- First 500: $20 vouchers
- Next 700: $15 vouchers  
- Last 800: $10 vouchers
Total: ~$22,000 in free bet credits
```

### 🎯 Referral Campaign
```
Each successful referral: $5 voucher
Tier bonuses:
- 5 referrals: +$10 bonus
- 10 referrals: +$25 bonus
```

### 🏆 Activity Rewards
```
Batch award active users:
- Win streak 3+: $10 voucher
- Bet volume >$500: $15 voucher
- Leaderboard top 100: $20 voucher
```

---

## Safety Checks

✅ Vouchers are **non-withdrawable** (can't be cashed out)  
✅ Vouchers **only work for bets** (not tradeable)  
✅ Batch limited to 500 per transaction (prevents gas issues)  
✅ All addresses validated before distribution  
✅ Campaign ID tracked for auditing  

---

## Troubleshooting

### "Array length mismatch"
→ Ensure same number of addresses and amounts

### "Max 500 per batch exceeded"
→ Split batch into multiple uploads (500 entries max)

### "Invalid address"
→ Check CSV has valid 0x... format, no spaces

### "Transaction failed"
→ Check you're the owner of the BetVouchers contract

---

## Next: Wire to PredictionMarket

Update `PredictionMarketCore.placeBet()`:

```solidity
function placeBet(uint256 marketId, uint8 choice, uint256 amount) external {
    // ... existing checks ...
    
    // NEW: Spend voucher if user has balance
    address vouchersContract = 0x...; // Set this
    uint256 voucherUsed = IBetVouchers(vouchersContract).spendVoucher(
        msg.sender,
        amount,
        marketId
    );
    
    // Charge remaining from USDC
    uint256 usdcNeeded = amount - voucherUsed;
    if (usdcNeeded > 0) {
        usdc.transferFrom(msg.sender, address(this), usdcNeeded);
    }
    // If voucher covered everything, no USDC charge
    
    // Continue with bet placement...
}
```

---

## Files Changed
- ✅ `contracts/FirstBetInsurance.sol` → Renamed to `BetVouchers.sol`, added `batchDistributeVouchers()`
- ✅ `src/components/VouchersTab.jsx` → NEW tab component
- ⏳ `src/components/AdminPanel.jsx` → ADD tab integration
- ⏳ `src/app.jsx` → ADD contract address prop
- ⏳ `contracts/PredictionMarketCore.sol` → ADD voucher spending logic
