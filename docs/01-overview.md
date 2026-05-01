# TrenchyBet — Product Overview

## What is TrenchyBet?

TrenchyBet is a decentralized prediction market platform built on **Base** (Ethereum L2). Users predict crypto price movements over short timeframes (as low as 15 minutes), place bets using USDC, and earn TRENCHY points for participation.

## Core Value Proposition

- **Speed**: Markets settle in minutes via Chainlink price feeds — no manual resolution
- **Transparency**: Every bet, market, and payout lives on-chain and is verifiable on BaseScan
- **PVP (Player vs Player)**: Users bet against each other, not the house
- **Non-custodial**: Funds go into smart contracts; the platform never holds user assets
- **Points-to-Earn**: Every bet earns TRENCHY points, convertible to $TRENCHY tokens

## Current Status

- **Network**: Base Sepolia (Testnet)
- **Currency**: USDC (testnet)
- **Frontend**: Deployed on Vercel
- **Indexer**: Running on Northflank
- **Database**: Supabase (PostgreSQL)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base (Ethereum L2) |
| Smart Contracts | Solidity + Hardhat |
| Frontend | React 18 + Vite + TailwindCSS |
| Wallet | RainbowKit + wagmi + viem |
| Price Feeds | Chainlink Oracles |
| Database | Supabase (PostgreSQL) |
| Backend Indexer | Node.js (Northflank) |
| Hosting | Vercel (frontend) |
| PWA | vite-plugin-pwa |

## Supported Assets

### Active (Testnet)
| Asset | Chainlink Feed |
|-------|---------------|
| BTC | `0x0FB9...0298` |
| ETH | `0x4aDC...7cb1` |
| LINK | `0xb113...5A61` |

### Upcoming (Mainnet only)
SOL, XRP, BNB, DOGE, ARB, PEPE

Environment toggle: `src/config/assets.js` → `APP_ENV = 'testnet' | 'mainnet'`
