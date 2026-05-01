# TrenchyBet — Backend & Infrastructure

## Architecture Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │   Indexer    │    │  Bot Server  │
│   (Vercel)   │    │ (Northflank) │    │ (Northflank) │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │  Direct queries   │  Writes events    │  Creates markets
       │                   │                   │
       └───────────┬───────┴───────────────────┘
                   │
                   ▼
          ┌──────────────────┐
          │     Supabase     │
          │   (PostgreSQL)   │
          │                  │
          │  Tables:         │
          │  - users         │
          │  - user_bets     │
          │  - markets       │
          │  - points_ledger │
          │                  │
          │  Views:          │
          │  - leaderboard_  │
          │    stats         │
          └──────────────────┘
```

## 1. Blockchain Indexer (`trenchybet-points-listener/`)

**Deployed on**: Northflank
**Entry point**: `index.js`

### What it does:
Listens to on-chain events and persists them into Supabase. This eliminates the need for the frontend to make expensive `getLogs` RPC calls.

### Events indexed:

| Event | Action |
|-------|--------|
| `MarketCreated` | Inserts market into `markets` table |
| `BetPlaced` | Inserts bet into `user_bets` + awards TRENCHY points |
| `MarketResolved` | Updates market `resolved` status + `winning_choice` |
| `WinningsClaimed` | Marks bet as `claimed` + awards win bonus points |

### Key features:
- **Rate-limit protection**: `isProcessing` lock prevents overlapping scans; 300ms delay between chunks
- **Self-healing**: If a bet references a market not yet in the DB, the indexer auto-fetches and inserts that market before retrying the bet
- **Points mutex**: Prevents race conditions when awarding points to the same user from concurrent events
- **Ledger-sum accuracy**: Points total is always derived from `SUM(points_ledger)`, never from increment math

### Points Economy:

| Action | Points Awarded |
|--------|---------------|
| Place a bet | `floor(USDC_amount × 10)` |
| Win a bet | `floor(original_bet × 10 × 2)` (2x win multiplier) |

### Environment Variables (Northflank):
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJ...
VITE_PROXY_ADDRESS=0x2d1d11Fb...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

---

## 2. Market Bot (`trenchybet-bot/`)

**Deployed on**: Northflank
**Entry point**: `bot.js`

### What it does:
- Automatically creates prediction markets at regular intervals
- Resolves expired markets using Chainlink price data
- Also serves as API server for points/activities endpoints

### Key behaviors:
- Uses `200` (2.0x) as default multiplier (contract requires non-zero)
- Simulation errors are non-fatal (testnet simulations are unreliable)

---

## 3. Serverless API (`api/`)

**Deployed on**: Vercel (alongside frontend)

| Endpoint | Purpose |
|----------|---------|
| `api/points/balance.js` | Get user's point balance |
| `api/activities/` | Activity feed data |
| `api/achievements/` | Achievement status |
| `api/referrals/` | Referral tracking |
| `api/push/notify.js` | Push notification dispatch |

---

## 4. Supabase Database

### Tables

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| `wallet_address` | text (PK) | Lowercase wallet address |
| `total_points` | integer | Derived from points_ledger sum |
| `points_claimed` | integer | Points converted to tokens |
| `current_streak` | integer | Current daily streak |
| `best_streak` | integer | All-time best streak |
| `last_bet_timestamp` | timestamp | Last bet placed |

#### `markets`
| Column | Type | Description |
|--------|------|-------------|
| `id` | integer (PK) | On-chain market ID |
| `market_type` | integer | 0=Binary, 1=Multi, 2=Range, 3=Time |
| `asset` | text | Asset symbol (BTC, ETH, etc.) |
| `start_time` | timestamp | Market start |
| `end_time` | timestamp | Market end |
| `resolved` | boolean | Whether market is resolved |
| `winning_choice` | integer | Winning outcome (null if unresolved) |
| `price_went_up` | boolean | Binary market result |

#### `user_bets`
| Column | Type | Description |
|--------|------|-------------|
| `tx_hash` | text (PK) | Transaction hash (unique) |
| `market_id` | integer (FK) | References markets.id |
| `wallet_address` | text | User's wallet |
| `choice` | integer | User's chosen outcome |
| `amount` | numeric | Bet amount in USDC |
| `multiplier` | integer | Effective multiplier (basis points) |
| `block_number` | bigint | Block number of transaction |
| `claimed` | boolean | Whether winnings were claimed |

#### `points_ledger`
| Column | Type | Description |
|--------|------|-------------|
| `id` | serial (PK) | Auto-increment ID |
| `wallet_address` | text | User's wallet |
| `points_earned` | integer | Points awarded |
| `source` | text | `bet_volume` or `win_bonus` |
| `market_id` | integer | Associated market |
| `metadata` | jsonb | Additional context |

### Views

#### `leaderboard_stats`
Aggregates win/loss/volume stats per user. Frontend queries this view directly for the leaderboard page.

### Row-Level Security (RLS)
- `SELECT` is allowed for all users (public reads)
- `INSERT`/`UPDATE` policies allow the indexer (using anon key) to write data
- Users cannot modify other users' data

---

## 5. Deployment Checklist

### Frontend (Vercel)
1. Push to `master` branch → auto-deploys
2. Environment variables set in Vercel dashboard

### Indexer (Northflank)
1. Push to `trenchybet-points-listener` repo → auto-builds
2. Runs as a persistent service (not serverless)

### Bot (Northflank)
1. Push to `trenchybet-bot` repo → auto-builds
2. Runs as a persistent service

### Smart Contracts (Hardhat)
```bash
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network baseSepolia
```
