# TrenchyBet — Smart Contract Architecture

## Proxy Pattern

TrenchyBet uses an **upgradeable proxy pattern** where a single proxy contract holds all storage, and logic is delegated to implementation contracts via `delegatecall`.

```
┌─────────────────────────────────────────┐
│         Frontend (React/Wagmi)          │
│   ONLY interacts with PROXY_ADDRESS     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      PredictionMarketProxy (Storage)    │
│  Address: 0x2d1d11Fb8A0C899c...fdFC8   │
│  - Holds ALL market data                │
│  - Holds ALL user positions             │
│  - Delegates logic via delegatecall     │
└──────────┬──────────────┬───────────────┘
           │              │
           ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│ Core (Binary)    │  │ Types (Advanced) │
│ 0x49E8CB...BB8f8 │  │ 0xC58A97...8E16  │
│ - UP/DOWN bets   │  │ - Multi-choice   │
│                  │  │ - Range markets  │
│                  │  │ - Time-based     │
└──────────────────┘  └──────────────────┘
```

> **KEY RULE**: Never read from implementation contracts directly — they return empty data. Always use the proxy address.

## Contract Inventory

| Contract | Address | Purpose |
|----------|---------|---------|
| **Proxy** | `0x2d1d11Fb8A0C899c681C2D66b555eF37650fdFC8` | Main entry point for all interactions |
| **Core** | `0x49E8CBe89934FD2b53aCEcaA05c1DCfE747BB8f8` | Binary market logic |
| **Types** | `0xC58A97aA13103474401A83c9DD2739c6e2788E16` | Multi/Range/Time logic |
| **ChainlinkResolver** | `0x2Faee1c49d6E4ec7908800e971448B675782ab84` | Automated price resolution |
| **Referrals** | `0xF5f960a38d6cCF8EabD06fF6fcB15Ee1bBA4021f` | Referral tracking |
| **Achievements** | `0x52D0F8A6c40807d149f382E89949511378056781` | Badge system |
| **Streaks** | `0xcBB0b5e027a4C2baFCAa928949d889B577646C70` | Daily streak tracking |
| **Airdrop** | `0x0971F70091Dc0F956033e991FBF8A9e803a5Ff3b` | Early user airdrop |
| **Staking** | `0x2513f27B994523B2DB87dE2F3c6C79d6E1557228` | Tiered staking |
| **USDC** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Testnet USDC |

## Solidity Files

| File | Description |
|------|-------------|
| `PredictionMarketProxy.sol` | Proxy with EIP-1967 admin slot, delegatecall routing |
| `PredictionMarketStorage.sol` | Shared storage layout (markets mapping, positions) |
| `PredictionMarketBase.sol` | Base contract with shared modifiers and helpers |
| `PredictionMarketCore.sol` | Binary (UP/DOWN) market creation, betting, resolution |
| `PredictionMarketTypes.sol` | Multi-choice, range, and time-based market logic |
| `PredictionMarketPayoutLib.sol` | Payout calculation library (embedded at compile time) |
| `ChainlinkResolver.sol` | Automated resolution using Chainlink price feeds |
| `TrenchyReferrals.sol` | On-chain referral tracking and rewards |
| `TrenchyAchievements.sol` | Badge/achievement NFT system |
| `TrenchyStreaks.sol` | Daily betting streak tracker |
| `TrenchyStaking.sol` | Tiered staking (Bronze/Silver/Gold/Diamond) |
| `TrenchyPointsClaim.sol` | Points-to-TRENCHY token conversion |
| `LaunchAirdrop.sol` | One-time airdrop for early users |
| `BetVouchers.sol` | Bet voucher/credit system |
| `TestTRENCHY.sol` | Test ERC-20 token for testnet |

## Market Types

| Type | ID | Description |
|------|----|-------------|
| Binary | 0 | Will price go UP or DOWN? |
| Multi-choice | 1 | Multiple outcome options |
| Range | 2 | Price lands in a specific range |
| Time-based | 3 | Time-dependent outcomes |

## Market Lifecycle

1. **Created** → Admin/bot creates market with asset, duration, multipliers
2. **Active** → Users place bets (USDC) choosing an outcome
3. **Ended** → Timer expires, Chainlink provides the settlement price
4. **Resolved** → Smart contract determines winners based on price movement
5. **Claimed** → Winners withdraw payouts directly from the contract

## Key Parameters

| Parameter | Value |
|-----------|-------|
| Min bet | 1 USDC |
| Max bet | 1,000 USDC |
| Min duration | 15 minutes |
| Max duration | 24 hours |
| Platform fee | 2% |
| USDC decimals | 6 |
