# TrenchyBet — Environment & Configuration

## Environment Variables

### Frontend (`.env` in project root)

| Variable | Description |
|----------|-------------|
| `VITE_PROXY_ADDRESS` | Prediction market proxy contract |
| `VITE_PREDICTION_MARKET_CORE_ADDRESS` | Core implementation |
| `VITE_PREDICTION_MARKET_TYPES_ADDRESS` | Types implementation |
| `VITE_USDC_CONTRACT_ADDRESS` | USDC token address |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |
| `VITE_CHAINLINK_RESOLVER_ADDRESS` | ChainlinkResolver contract |
| `VITE_REFERRALS_CONTRACT_ADDRESS` | Referrals contract |
| `VITE_ACHIEVEMENTS_CONTRACT_ADDRESS` | Achievements contract |
| `VITE_STREAKS_CONTRACT_ADDRESS` | Streaks contract |
| `VITE_AIRDROP_CONTRACT_ADDRESS` | Airdrop contract |
| `VITE_STAKING_CONTRACT_ADDRESS` | Staking contract |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Indexer (`trenchybet-points-listener/.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `VITE_PROXY_ADDRESS` | Proxy contract to watch |
| `BASE_SEPOLIA_RPC_URL` | RPC endpoint |

### Bot (`trenchybet-bot/.env`)

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Bot wallet private key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |

---

## Network Configuration

### Testnet (Current)
- **Chain**: Base Sepolia (Chain ID: 84532)
- **Set**: `APP_ENV = 'testnet'` in `src/config/assets.js`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Mainnet (Future)
- **Chain**: Base (Chain ID: 8453)
- **Set**: `APP_ENV = 'mainnet'` in `src/config/assets.js`
- **Assets**: SOL, XRP, BNB, DOGE, ARB, PEPE become active
- **Requires**: New contract deployments + updated addresses

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `src/config/assets.js` | Asset definitions, Chainlink feeds, env toggle |
| `src/config/wagmi.js` | Wallet & RPC provider configuration |
| `src/config/features.js` | Feature flags (Farcaster, Telegram, etc.) |
| `src/utils/constants.js` | All contract addresses & app-wide constants |
| `hardhat.config.cjs` | Solidity compiler & deployment config |
| `vite.config.js` | Vite build config + PWA plugin |
| `tailwind.config.js` | TailwindCSS theme customization |
| `vercel.json` | Vercel deployment & API route config |

---

## Development Commands

```bash
# Start development server
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Compile smart contracts
npm run compile

# Deploy contracts to Base Sepolia
npm run deploy
```

---

## Repository Structure

| Repo | Platform | Purpose |
|------|----------|---------|
| `TrenchBet` (GitHub) | Vercel | Frontend + API routes |
| `trenchybet-points-listener` (GitHub) | Northflank | Blockchain indexer |
| `trenchybet-bot` (GitHub) | Northflank | Market automation bot |
