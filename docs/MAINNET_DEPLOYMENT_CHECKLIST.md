# TrenchyBet Mainnet Deployment Checklist

## Pre-Deployment Preparation (Do This Now on Testnet)

### 1. Contract Testing ✅
- [ ] Deploy all contracts to testnet using `deploy-all-contracts.cjs`
- [ ] Test referral registration flow
- [ ] Test achievement unlocking
- [ ] Test airdrop claiming (with bet verification)
- [ ] Test first bet insurance claims
- [ ] Test streak tracking and rewards
- [ ] Verify all contract integrations work together

### 2. Security Audit Preparation
- [ ] Run Slither static analysis on all contracts
- [ ] Run Mythril security analysis
- [ ] Check for common vulnerabilities (reentrancy, overflow, access control)
- [ ] Verify all external calls have proper error handling

### 3. Token Economics Validation
- [ ] Calculate total TRENCHY needed for launch:
  - Airdrop: 1000 users × 100 TRENCHY = 100,000 TRENCHY
  - Referral rewards: Estimate 500 referrals × 10 TRENCHY = 5,000 TRENCHY
  - Achievement rewards: 11 achievements × avg 100 points = 1,100 TRENCHY
  - Insurance fund: 100 users × 100 TRENCHY = 10,000 TRENCHY
  - Streak rewards: Buffer 5,000 TRENCHY
  - **Total Recommended: 150,000 TRENCHY minimum**

## Mainnet Deployment Steps

### Phase 1: Pre-Deployment (T-7 Days)

#### 1.1 Environment Setup
```bash
# Set environment variables
export MAINNET_RPC_URL="https://mainnet.base.org"
export PRIVATE_KEY="your-secure-private-key"
export TRENCHY_TOKEN_ADDRESS="0x...your-mainnet-token..."
export USDC_TOKEN_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" # Base Mainnet USDC
export PREDICTION_MARKET_ADDRESS="0x...your-mainnet-prediction-market..."
export VERIFY_CONTRACTS="true"
export ETHERSCAN_API_KEY="your-etherscan-api-key"
```

#### 1.2 Contract Verification Prep
- [ ] Verify all contract source code is final
- [ ] Ensure no test code or debug functions remain
- [ ] Confirm all constants are set to production values
- [ ] Double-check all token addresses

### Phase 2: Deployment Day (T-0)

#### 2.1 Pre-Deployment Checks
- [ ] Check gas prices (aim for < 50 gwei on Base)
- [ ] Verify deployer wallet has sufficient ETH for gas
- [ ] Confirm TRENCHY token contract is deployed and verified
- [ ] Have emergency contact ready

#### 2.2 Execute Deployment
```bash
# Run full deployment
npx hardhat run scripts/deploy-all-contracts.cjs --network base-mainnet
```

#### 2.3 Post-Deployment Verification
- [ ] Save deployment JSON file securely
- [ ] Verify all contracts on BaseScan
- [ ] Set PredictionMarket addresses in airdrop and insurance contracts
- [ ] Fund all contracts with TRENCHY tokens
- [ ] Test each contract function manually

### Phase 3: Integration (T+1 to T+3 Days)

#### 3.1 Frontend Integration
- [ ] Update all environment variables in Vercel/production
- [ ] Update contract addresses in frontend config
- [ ] Test all user flows on mainnet
- [ ] Enable error monitoring (Sentry)

#### 3.2 Backend Setup
- [ ] Deploy API endpoints to production
- [ ] Configure Supabase production tables
- [ ] Set up scheduled jobs for achievement checking
- [ ] Configure monitoring and alerts

#### 3.3 Monitoring Setup
- [ ] Set up contract balance monitoring
- [ ] Configure alerts for low balances
- [ ] Set up transaction monitoring
- [ ] Create incident response plan

## Contract Addresses Template

Fill this in after deployment:

| Contract | Testnet Address | Mainnet Address | Status |
|----------|----------------|-----------------|--------|
| TRENCHY Token | `0x...` | `0x...` | ⬜ |
| TrenchyReferrals | `0x...` | `0x...` | ⬜ |
| TrenchyAchievements | `0x...` | `0x...` | ⬜ |
| TrenchyStreaks | `0x...` | `0x...` | ⬜ |
| LaunchAirdrop | `0x...` | `0x...` | ⬜ |
| FirstBetInsurance | `0x...` | `0x...` | ⬜ |
| PredictionMarket | `0x...` | `0x...` | ⬜ |

## Emergency Procedures

### Contract Pause/Upgrade
All contracts have `emergencyWithdraw()` and `transferOwnership()` functions:
1. Call `emergencyWithdraw()` to recover funds if critical bug found
2. Transfer ownership to multisig for better security
3. Deploy new contract version and update frontend

### Low Balance Alert Thresholds
- LaunchAirdrop: Alert when < 10,000 TRENCHY remaining
- TrenchyReferrals: Alert when < 1,000 TRENCHY remaining
- TrenchyAchievements: Alert when < 500 TRENCHY remaining
- FirstBetInsurance: Alert when < 1,000 TRENCHY remaining

## Post-Launch Monitoring

### Daily Checks
- [ ] Contract balances
- [ ] User activity metrics
- [ ] Error rates
- [ ] Gas costs

### Weekly Reviews
- [ ] Achievement unlock rates
- [ ] Referral conversion rates
- [ ] Insurance claim rates
- [ ] Airdrop claim progress

### Monthly Analysis
- [ ] Token economics health
- [ ] Contract upgrade needs
- [ ] New feature prioritization

## Security Best Practices

1. **Use Multisig**: Transfer contract ownership to a Gnosis Safe multisig
2. **Timelock**: Consider adding timelock for critical functions
3. **Monitoring**: Use Tenderly or similar for real-time monitoring
4. **Insurance**: Consider smart contract insurance (e.g., Nexus Mutual)

## Contact & Resources

- **Deployer Wallet**: `0x...`
- **Multisig Address**: `0x...` (set after deployment)
- **Emergency Contact**: [Your contact]
- **Deployment Logs**: `./deployments/`
- **Verification URLs**: [Add BaseScan links after deployment]

---

## Quick Reference Commands

```bash
# Testnet deployment
npx hardhat run scripts/deploy-all-contracts.cjs --network base-sepolia

# Mainnet deployment
npx hardhat run scripts/deploy-all-contracts.cjs --network base-mainnet

# Verify single contract
npx hardhat verify --network base-mainnet CONTRACT_ADDRESS "constructor_arg1" "constructor_arg2"

# Check contract balance
npx hardhat run scripts/check-balances.cjs --network base-mainnet
```

---

**Last Updated**: [Date]
**Next Review**: [Date + 1 week]
