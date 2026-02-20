# TrenchyBet Contract Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying all TrenchyBet contracts to testnet and mainnet.

## Prerequisites

### 1. Environment Setup
Create a `.env` file in your project root:

```env
# Required for all deployments
PRIVATE_KEY=your_wallet_private_key_here

# Network RPC URLs
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# Contract Addresses (update after token deployment)
TRENCHY_TOKEN_ADDRESS=0x...
USDC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  # Base Mainnet USDC
PREDICTION_MARKET_ADDRESS=0x...

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
VERIFY_CONTRACTS=true
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Compile Contracts
```bash
npx hardhat compile
```

---

## Testnet Deployment (Base Sepolia)

### Step 1: Deploy Test TRENCHY Token (if needed)
```bash
npx hardhat run scripts/deploy-test-trenchy.cjs --network base-sepolia
```
Save the token address from the output.

### Step 2: Update Environment
Edit `.env` and set:
```env
TRENCHY_TOKEN_ADDRESS=0x...your_testnet_token_address...
```

### Step 3: Deploy All Contracts
```bash
npx hardhat run scripts/deploy-all-contracts.cjs --network base-sepolia
```

This will:
- Deploy all 5 contracts
- Fund them with TRENCHY tokens
- Save deployment state to `deployments/latest-base-sepolia.json`
- Verify contracts on BaseScan (if API key provided)

### Step 4: Check Balances
```bash
npx hardhat run scripts/check-balances.cjs --network base-sepolia
```

### Step 5: Test All Features
1. Register a referral
2. Place a bet (to qualify for airdrop)
3. Claim airdrop
4. Check achievements unlock
5. Test insurance (if first bet lost)

---

## Mainnet Deployment (Base Mainnet)

### Pre-Deployment Checklist
- [ ] All testnet tests passed
- [ ] Security audit completed (optional but recommended)
- [ ] TRENCHY token deployed on mainnet
- [ ] PredictionMarket deployed on mainnet
- [ ] Deployer wallet has sufficient ETH for gas
- [ ] Deployer wallet has 150,000+ TRENCHY for funding

### Step 1: Update Environment for Mainnet
```env
TRENCHY_TOKEN_ADDRESS=0x...your_mainnet_token_address...
USDC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
PREDICTION_MARKET_ADDRESS=0x...your_mainnet_prediction_market...
VERIFY_CONTRACTS=true
```

### Step 2: Deploy All Contracts
```bash
npx hardhat run scripts/deploy-all-contracts.cjs --network base-mainnet
```

⚠️ **Warning**: This will use real funds. Double-check all addresses before proceeding.

### Step 3: Verify Deployment
```bash
npx hardhat run scripts/check-balances.cjs --network base-mainnet
```

### Step 4: Set PredictionMarket Addresses
If not set during deployment:
```bash
# Use Hardhat console or write a script
npx hardhat console --network base-mainnet
```

```javascript
const airdrop = await ethers.getContractAt('LaunchAirdrop', '0x...airdrop_address...');
await airdrop.setPredictionMarket('0x...prediction_market...');

const insurance = await ethers.getContractAt('FirstBetInsurance', '0x...insurance_address...');
await insurance.setPredictionMarket('0x...prediction_market...');
```

### Step 5: Update Frontend
Copy contract addresses from `deployments/latest-base-mainnet.json` to your frontend environment variables.

---

## Contract Funding

### Automatic Funding (During Deployment)
The deployment script automatically funds contracts with:
- LaunchAirdrop: 100,000 TRENCHY (1000 users × 100 TRENCHY)
- TrenchyReferrals: 10,000 TRENCHY
- TrenchyAchievements: 5,000 TRENCHY
- FirstBetInsurance: 5,000 TRENCHY
- TrenchyStreaks: 5,000 TRENCHY

### Manual Funding (After Deployment)
If you need to add more funds later:
```bash
npx hardhat run scripts/fund-contracts.cjs --network base-mainnet
```

### Custom Funding Amounts
Edit `scripts/fund-contracts.cjs` and modify the `DEFAULT_FUNDING` object:
```javascript
const DEFAULT_FUNDING = {
  LaunchAirdrop: '200000',      // Increase to 200k TRENCHY
  TrenchyReferrals: '20000',    // Increase to 20k TRENCHY
  // ... etc
};
```

---

## Monitoring & Maintenance

### Check All Balances
```bash
npx hardhat run scripts/check-balances.cjs --network base-mainnet
```

This will:
- Show all contract balances
- Alert if any contract is low on funds
- Save a report to `deployments/balance-report-{timestamp}.json`

### Recommended Monitoring Schedule
- **Daily**: Run balance check
- **Weekly**: Review user activity and claim rates
- **Monthly**: Assess if additional funding needed

### Low Balance Thresholds
The balance checker alerts when:
- LaunchAirdrop < 10,000 TRENCHY
- TrenchyReferrals < 1,000 TRENCHY
- TrenchyAchievements < 500 TRENCHY
- FirstBetInsurance < 1,000 TRENCHY
- TrenchyStreaks < 1,000 TRENCHY

---

## Troubleshooting

### "No deployment file found"
Run the deployment script first, or check that you're using the correct network name.

### "Insufficient balance"
Ensure your wallet has enough TRENCHY tokens. Check with:
```bash
npx hardhat console --network base-mainnet
```
```javascript
const token = await ethers.getContractAt('IERC20', '0x...trenchy_token...');
await token.balanceOf('your_wallet_address');
```

### "Contract verification failed"
- Check your ETHERSCAN_API_KEY is valid
- Wait a few minutes after deployment before verifying
- Try manual verification on BaseScan

### "Transaction failed"
- Check gas prices (may be too high)
- Ensure you have enough ETH for gas
- Check if contracts are already funded (can't fund twice without reason)

---

## Security Best Practices

### 1. Use Multisig (Recommended)
After deployment, transfer contract ownership to a Gnosis Safe multisig:

```javascript
const referrals = await ethers.getContractAt('TrenchyReferrals', '0x...');
await referrals.transferOwnership('0x...multisig_address...');
```

### 2. Emergency Procedures
All contracts have `emergencyWithdraw()` functions:
- Only callable by owner
- Use if critical bug discovered
- Transfers all tokens back to owner

### 3. Access Control
- Never share your private key
- Use hardware wallet for mainnet deployments
- Store deployment JSON files securely

---

## Deployment Files Reference

After deployment, you'll find these files in `deployments/`:

| File | Purpose |
|------|---------|
| `latest-base-sepolia.json` | Current testnet addresses |
| `latest-base-mainnet.json` | Current mainnet addresses |
| `deployment-{timestamp}.json` | Historical deployment record |
| `balance-report-{timestamp}.json` | Balance monitoring report |
| `funding-report-{timestamp}.json` | Funding transaction record |

---

## Quick Reference

### Deploy to Testnet
```bash
npx hardhat run scripts/deploy-all-contracts.cjs --network base-sepolia
```

### Deploy to Mainnet
```bash
npx hardhat run scripts/deploy-all-contracts.cjs --network base-mainnet
```

### Check Balances
```bash
npx hardhat run scripts/check-balances.cjs --network base-mainnet
```

### Add Funds
```bash
npx hardhat run scripts/fund-contracts.cjs --network base-mainnet
```

---

## Support

For issues or questions:
1. Check `MAINNET_DEPLOYMENT_CHECKLIST.md` for detailed steps
2. Review contract source code in `contracts/`
3. Check deployment logs in `deployments/`

---

**Last Updated**: 2025
**Version**: 1.0.0
