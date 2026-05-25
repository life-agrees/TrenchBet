# 🔄 Supabase Schema Migration Guide

**Date:** March 7, 2026  
**Purpose:** Add new tables to support Phase 1 and Phase 2 implementations  
**Status:** PENDING - Execute these SQL statements in Supabase

---

## 📋 Required Schema Changes

### 1. Create `claim_nonces` Table
**Purpose:** Store cryptographically secure nonces for points claims  
**Replaces:** Math.random()-based session IDs  

```sql
CREATE TABLE IF NOT EXISTS claim_nonces (
  id BIGSERIAL PRIMARY KEY,
  nonce UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  points_amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_tx_hash VARCHAR(66),
  
  -- Indexes for fast lookup
  CONSTRAINT valid_points CHECK (points_amount > 0),
  CONSTRAINT valid_timeline CHECK (expires_at > created_at)
);

CREATE INDEX idx_claim_nonces_wallet ON claim_nonces(wallet_address);
CREATE INDEX idx_claim_nonces_nonce ON claim_nonces(nonce);
CREATE INDEX idx_claim_nonces_expires ON claim_nonces(expires_at);
CREATE INDEX idx_claim_nonces_used ON claim_nonces(used);
```

---

### 2. Add Activity Type Tracking to `points_ledger`
**Purpose:** Categorize activities for activity feed  
**New Columns:**

```sql
ALTER TABLE points_ledger 
ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50) 
  CHECK (activity_type IN (
    'bet_placed', 'bet_won', 'bet_lost',
    'market_created', 'achievement_unlocked',
    'streak_milestone', 'referral_bonus', 'other'
  )) DEFAULT 'other';

-- Index for activity feed filtering
CREATE INDEX IF NOT EXISTS idx_points_ledger_activity_type 
  ON points_ledger(wallet_address, activity_type, created_at DESC);
```

---

### 3. Update `pending_claims` Table
**Purpose:** Store claim metadata and track verification  

```sql
-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS pending_claims (
  id BIGSERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address),
  points_amount BIGINT NOT NULL,
  trenchy_amount BIGINT NOT NULL,
  nonce UUID REFERENCES claim_nonces(nonce),
  signature VARCHAR(132),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'claimed', 'expired', 'failed')),
  completed_at TIMESTAMPTZ,
  tx_hash VARCHAR(66),
  
  CONSTRAINT valid_amounts CHECK (points_amount > 0 AND trenchy_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_pending_claims_wallet 
  ON pending_claims(wallet_address, status);
CREATE INDEX IF NOT EXISTS idx_pending_claims_nonce 
  ON pending_claims(nonce);
CREATE INDEX IF NOT EXISTS idx_pending_claims_expires 
  ON pending_claims(expires_at);
```

---

### 4. Enable RLS (Row-Level Security) for New Tables
**Purpose:** Ensure users can only see their own claims and nonces

```sql
-- Enable RLS
ALTER TABLE claim_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_claims ENABLE ROW LEVEL SECURITY;

-- Policies for claim_nonces
CREATE POLICY "Users can view only their nonces"
  ON claim_nonces
  FOR SELECT
  USING (auth.uid()::text = wallet_address);

CREATE POLICY "Service role can insert nonces"
  ON claim_nonces
  FOR INSERT
  WITH CHECK (TRUE); -- Restrict to service role in production

-- Policies for pending_claims
CREATE POLICY "Users can view only their claims"
  ON pending_claims
  FOR SELECT
  USING (auth.uid()::text = wallet_address);

CREATE POLICY "Service role can manage claims"
  ON pending_claims
  FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role can update claims"
  ON pending_claims
  FOR UPDATE
  WITH CHECK (TRUE);
```

---

## 🔐 Security Notes

1. **Nonce Expiry:** Set to 5 minutes (NONCE_EXPIRY = 5 * 60 * 1000)
   - Reduces window for replay attacks
   - Prevents claim stale-ness

2. **One-Time Use:** Nonce marked as `used: true` after successful claim
   - Prevents double-spending
   - Locked to first transaction

3. **Signature Validation:** Backend must verify:
   - Nonce exists and not expired
   - Nonce not already used
   - Nonce matches user + points amount
   - Signature valid and from backend signer

---

## 📊 Migration Steps

**Step 1:** Execute the SQL statements above in Supabase SQL Editor  
**Step 2:** Verify tables created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('claim_nonces', 'pending_claims');
```

**Step 3:** Test API endpoint `/api/points/prepare-claim`  
**Step 4:** Verify nonce is stored in `claim_nonces` table  
**Step 5:** Test claim completion and verify `used: true` flag set  

---

## ✅ Verification Checklist

Before deploying to production:
- [ ] All tables created successfully
- [ ] Indexes created for performance
- [ ] RLS policies enabled
- [ ] Test nonce generation (UUID format)
- [ ] Test nonce expiry (5 minutes)
- [ ] Test one-time use enforcement
- [ ] Test user isolation (RLS policies)

---

## 🔄 Rollback Plan

If issues arise, run:
```sql
DROP TABLE IF EXISTS claim_nonces CASCADE;
DROP TABLE IF EXISTS pending_claims CASCADE;
DROP INDEX IF EXISTS idx_claim_nonces_wallet;
DROP INDEX IF EXISTS idx_claim_nonces_nonce;
```

---

**Status:** Ready for execution  
**Priority:** HIGH - Required before Phase 1/2 production deployment
