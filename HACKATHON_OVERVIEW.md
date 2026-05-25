# 🏆 TrenchyBet V4 — Hackathon Overview & Solutions

## 📖 Project Vision: Hook the Future
**TrenchyBet V4** merges the expressive liquidity execution of **Uniswap V4 Hooks** with the scalability and low fees of **X Layer** (OKX's L2). 

Traditional token launches (e.g., pump.fun style bonding curves) offer raw speculation but lack alignment between creators and token holders. TrenchyBet V4 solves this by turning every token launch into a self-governing, milestone-bound prediction market. 

By leveraging a custom **Dual-Hook System**, TrenchyBet V4 locks creator incentives, siphons launch tax to fund real milestones, and creates an automated binary prediction market (YES/NO outcome pools) for milestone resolution using advanced V4 primitives.

---

## 🛠️ The Dual-Hook Architecture

TrenchyBet V4 separates responsibilities into two distinct, highly optimized Uniswap V4 hook contracts deployed on X Layer Testnet:

```
                          ┌──────────────────────────┐
                          │   Uniswap V4 Swap/Trade  │
                          └─────────────┬────────────┘
                                        │
                         afterSwap      │      beforeSwap
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
     ┌───────────────────────┐                     ┌───────────────────────┐
     │ TrenchyMilestoneHook  │                     │   TrenchyBinaryAMM    │
     │                       │                     │                       │
     │ • Siphons 1.5% Tax    │                     │ • Outcome YES/NO Pools│
     │ • Tracks Milestones   │                     │ • Custom Invariant    │
     │ • Seeds Binary AMM    │ ─── Seeds Seed ───► │ • Flash Accounting    │
     └───────────────────────┘                     └───────────────────────┘
```

### 1. `TrenchyMilestoneHook` (Fair Launch & Milestone Vault)
* **Hook Permissions**: Strictly overrides `afterSwap` to minimize gas overhead and reduce the contract's attack surface.
* **Mechanism**: 
  * Siphons a **1.5% USDC tax** from all trades in the primary token pool into a secure Milestone Vault.
  * Links project execution to financial incentive: the creator cannot dump their tokens or claim the launch tax until specific project milestones are met.
  * **Oracle Resolution**: A `resolveMilestone()` function accepts milestone outcomes. In production, this resolves via decentralized oracles (e.g., Chainlink, Pyth) or sequencer feeds; for the demo, it is admin-controlled.
  * **Seeding Mechanism**: If a milestone fails, or upon specific trigger conditions, the hook calls `seedPredictionMarket()` to deploy the siphoned vault funds as liquidity directly into the prediction market AMM.

### 2. `TrenchyBinaryAMM` (Binary Outcome Market)
* **Hook Permissions**: Strictly overrides `beforeSwap` and `beforeSwapReturnDelta` to intercept standard pool execution.
* **Flash Accounting**: 
  * Implements Uniswap V4's **Flash Accounting** via `BeforeSwapDelta` returning custom balances. By returning delta values, it instructs the Uniswap V4 `PoolManager` to bypass standard constant-product ($x \times y = k$) pool math.
  * Trades outcome tokens (**YES** and **NO** outcome shares) against virtual reserves using a custom invariant curve designed for prediction probabilities ($P(\text{YES}) + P(\text{NO}) = 100\%$).
* **Exact Input & Output**: The hook mathematically evaluates both exact input swaps (`amountSpecified > 0`) and exact output swaps (`amountSpecified < 0`).
* **Slippage & Extreme Imbalance Protection**: Internal checks ensure that virtual reserves never drop below 1% of total pool depth, preventing division-by-zero errors or pool draining at extreme 99% probability boundaries.

---

## ⛓️ Multichain Deployment & Dynamic Routing

TrenchyBet V4 is engineered to support multiple execution environments, dynamically routing users based on their active wallet network:

1. **Base Sepolia (Chain ID: 84532)**: The fully featured Prediction Market platform supporting Core Bet creation, streaks, and Chainlink-backed price resolver feeds.
2. **Arc Testnet (Chain ID: 8543)**: Fully integrated prediction market.
3. **X Layer Testnet (Chain ID: 195)**: The cutting-edge Uniswap V4 hook deployment hosting the `TrenchyMilestoneHook` and `TrenchyBinaryAMM`.

### Frontend Dynamic Orchestration (`useContractAddresses.js`)
* Dynamically parses the wallet's active connection.
* Routes contract interactions instantly:
  * For standard prediction market activities, uses Base Sepolia or Arc contracts.
  * For token launch and V4 dual-hook mechanics, dynamically binds and targets the X Layer Testnet V4 hook addresses.

---

## 🔒 Security Hardening & Performance Optimizations

To deliver a production-ready hackathon submission, we resolved critical security and efficiency concerns:
* **Custom Reentrancy Guards**: Implemented gas-efficient `nonReentrant` checks on hook swaps and milestone resolutions to protect against MEV flash-loan reentrancy vectors.
* **Cryptographically Secure Nonces**: Replaced pseudo-random client-side nonces with server-generated, database-backed **UUID v4 cryptographically secure nonces** to prevent replay attacks during reward claims.
* **Chart Data Caching**: Added in-memory and local storage caching (5-minute TTL) for admin dashboard metrics, lowering frontend RPC load and eliminating random re-renders.

---

## 🚀 Deployed Contracts Summary (X Layer Testnet)

| Contract | Address | Purpose |
|---|---|---|
| **Mock USDC** | `0x523B64b0f9f30A2c3F944E4Db7eCd7C5A760FD3a` | Stablecoin denominator for trades |
| **$TRENCHY Token** | `0x296B995bFd4274c4Cee9737976eCc9Fd58b54460` | Launch token registered with milestone tracking |
| **Mock PoolManager** | `0x8062df67e2a969C89B59D017D31969d7B47C5776` | Uniswap V4 Core Pool Manager |
| **TrenchyMilestoneHook** | `0x29F98013f9A737119f3dB10b106C8ED7e793F317` | Milestone vault & launch tax collector |
| **TrenchyBinaryAMM** | `0xe8BeA54C919D945DE8979e2736C701B4D8Dcd55A` | Flash accounting binary outcome swap hook |
