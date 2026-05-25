# 🚀 TrenchyBet V4

Welcome to **TrenchyBet V4** — a dual-hook Uniswap V4 protocol built on **X Layer** (OKX's L2) for the **[Build X: Hook the Future] Hackathon** (co-launched by Uniswap, OKX, and Flap).

TrenchyBet V4 pioneers a novel market model where token launches are seamlessly tied to self-governing, milestone-bound prediction markets. By locking creator incentives in a milestone vault and seeding outcome pools directly from swap activity, we create a fair, aligned, and highly interactive launch experience.

---

## 📖 Key Documentation

* **[🏆 Hackathon Overview & Architecture (HACKATHON_OVERVIEW.md)](./HACKATHON_OVERVIEW.md)**: A detailed breakdown of our dual-hook architecture, custom AMM mathematical formulas, flash accounting implementation, and security hardening.
* **[📁 Deep-Dive Project Documentation (docs/)](./docs/)**: Contains detailed logs, audit reports, database schemas, and guides generated during our engineering journey:
  * [DEPLOYMENT_AND_TESTING_GUIDE.md](./docs/DEPLOYMENT_AND_TESTING_GUIDE.md) — Comprehensive guide to local testing and contract interactions.
  * [SUPABASE_SCHEMA_MIGRATION.md](./docs/SUPABASE_SCHEMA_MIGRATION.md) — Points database setup.
  * [IMPLEMENTATION_COMPLETION_REPORT.md](./docs/IMPLEMENTATION_COMPLETION_REPORT.md) — Phase 1 & 2 mock data elimination and security hardening logs.

---

## 🛠️ The Architecture at a Glance

TrenchyBet V4 utilizes two specialized Uniswap V4 hooks:

1. **`TrenchyMilestoneHook`**:
   * Collects a **1.5% USDC launch/swap tax** on all transactions.
   * Tracks project milestones (volume, time, and deliverables).
   * Escrows funds, ensuring creators cannot dump tokens before milestones are verified.
   * Seeds the prediction market outcome pool dynamically upon milestone resolution.
2. **`TrenchyBinaryAMM`**:
   * Overrides Uniswap V4 pool logic using **Flash Accounting** (returning custom `BeforeSwapDelta` on `beforeSwap`).
   * Sells **YES** and **NO** outcome tokens based on a custom binary probability pricing curve ($P(\text{YES}) + P(\text{NO}) = 1.00$ USDC).
   * Implements custom mathematical limits to prevent pool draining under extreme imbalances.

---

## ⛓️ Deployed Contracts (X Layer Testnet)

| Contract | Address | Purpose |
|---|---|---|
| **Mock USDC** | `0x523B64b0f9f30A2c3F944E4Db7eCd7C5A760FD3a` | Stablecoin denominator for trades |
| **$TRENCHY Token** | `0x296B995bFd4274c4Cee9737976eCc9Fd58b54460` | Launch token registered with milestone tracking |
| **Mock PoolManager** | `0x8062df67e2a969C89B59D017D31969d7B47C5776` | Uniswap V4 Core Pool Manager |
| **TrenchyMilestoneHook** | `0x29F98013f9A737119f3dB10b106C8ED7e793F317` | Milestone vault & launch tax collector |
| **TrenchyBinaryAMM** | `0xe8BeA516Bd335C860529f087dd891B1096fD955A` | Flash accounting binary outcome swap hook |

---

## 🚀 Running Locally

### Frontend Mini-App
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   * Copy `.env` locally and populate required environment variables (e.g., `VITE_PROXY_ADDRESS`, `SUPABASE_URL`, `SUPABASE_KEY`).
3. Start the development server:
   ```bash
   npm run dev
   ```

### Smart Contracts (Hardhat)
1. Compile the contracts:
   ```bash
   npx hardhat compile
   ```
2. Deploy or run scripts:
   ```bash
   npx hardhat run scripts/deploy_v4_hooks.cjs --network xlayerTestnet
   ```

---

## 🤝 Partners & Ecosystem
Special thanks to the teams at **Uniswap**, **OKX Web3 / X Layer**, and **Flap** for providing the infrastructure, L2 execution environment, and support for the next generation of Uniswap V4 Hook developers!
