// api/points/history.js
// Get user's point earning history
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { wallet, limit = '50' } = req.query;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    const address = wallet.toLowerCase();
    
    // Get points history
    const { data: history, error } = await supabase
      .from('points_ledger')
      .select('*')
      .eq('wallet_address', address)
      .order('id', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Format the response
    const formattedHistory = (history || []).map(entry => ({
      id: entry.id,
      points_earned: entry.points_earned,
      source: entry.source,
      market_id: entry.market_id,
      bet_amount: entry.metadata?.betAmount || null,
      timestamp: entry.created_at,
      tx_hash: entry.metadata?.txHash || null
    }));
    
    return res.status(200).json({
      wallet_address: address,
      history: formattedHistory,
      total_entries: formattedHistory.length
    });
    
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}