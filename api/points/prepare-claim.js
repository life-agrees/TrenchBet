// api/points/prepare-claim.js
// Generate signature for claiming points (ETHERS V6 FIXED)
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Backend wallet that signs claim requests
const BACKEND_PRIVATE_KEY = process.env.BACKEND_SIGNER_PRIVATE_KEY;
const POINTS_PER_TRENCHY = 100;
const MONTHLY_CLAIM_CAP = 10000; // 10k TRENCHY

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { wallet, pointsAmount } = req.body;
    
    if (!wallet || !pointsAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Backend signer not configured' });
    }
    
    const address = wallet.toLowerCase();
    
    // 1. Verify user has enough points
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_points, points_claimed')
      .eq('wallet_address', address)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const availablePoints = user.total_points - (user.points_claimed || 0);
    
    if (availablePoints < pointsAmount) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        available: availablePoints,
        requested: pointsAmount
      });
    }
    
    // 2. Calculate TRENCHY amount
    const trenchyAmount = Math.floor(pointsAmount / POINTS_PER_TRENCHY);
    
    if (trenchyAmount === 0) {
      return res.status(400).json({ 
        error: 'Minimum 100 points required',
        note: '100 points = 1 TRENCHY'
      });
    }
    
    // 3. Check monthly claim limit
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const { data: monthlyClaims, error: claimsError } = await supabase
      .from('claims')
      .select('trenchy_amount')
      .eq('wallet_address', address)
      .gte('claimed_at', monthStart.toISOString());
    
    if (claimsError) {
      console.error('Error checking monthly claims:', claimsError);
    }
    
    const monthlyTotal = (monthlyClaims || []).reduce(
      (sum, claim) => sum + parseFloat(claim.trenchy_amount || 0),
      0
    );
    
    if (monthlyTotal + trenchyAmount > MONTHLY_CLAIM_CAP) {
      return res.status(400).json({
        error: 'Monthly claim cap exceeded',
        claimedThisMonth: monthlyTotal,
        cap: MONTHLY_CLAIM_CAP,
        remaining: MONTHLY_CLAIM_CAP - monthlyTotal
      });
    }
    
    // 4. Generate unique nonce (ETHERS V6 SYNTAX)
    const nonce = ethers.id(
      `${address}-${pointsAmount}-${Date.now()}-${Math.random()}`
    );
    
    // 5. Create signature (ETHERS V6 SYNTAX)
    const signer = new ethers.Wallet(BACKEND_PRIVATE_KEY);
    
    // Message format: keccak256(user, pointsAmount, nonce)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'bytes32'],
      [address, pointsAmount, nonce]
    );
    
    const signature = await signer.signMessage(
      ethers.getBytes(messageHash)
    );
    
    // 6. Store pending claim (for tracking)
    const { error: pendingError } = await supabase
      .from('pending_claims')
      .insert({
        wallet_address: address,
        points_amount: pointsAmount,
        trenchy_amount: trenchyAmount,
        nonce: nonce,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min expiry
      });
    
    if (pendingError) {
      console.warn('Failed to store pending claim:', pendingError);
      // Continue anyway - not critical
    }
    
    // 7. Return signature and claim data
    return res.status(200).json({
      success: true,
      wallet: address,
      pointsAmount: pointsAmount,
      trenchyAmount: trenchyAmount,
      nonce: nonce,
      signature: signature,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      monthlyStatus: {
        claimedThisMonth: monthlyTotal,
        remainingCap: MONTHLY_CLAIM_CAP - monthlyTotal - trenchyAmount,
        cap: MONTHLY_CLAIM_CAP
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}