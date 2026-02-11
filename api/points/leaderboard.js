// api/points/leaderboard.js
// Get global points leaderboard
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
    const { limit = '100' } = req.query;
    
    // Get top users by total points
    const { data: leaders, error } = await supabase
      .from('users')
      .select('wallet_address, total_points, points_claimed, current_streak, best_streak')
      .order('total_points', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Format the leaderboard
    const leaderboard = (leaders || []).map((user, index) => ({
      rank: index + 1,
      wallet_address: user.wallet_address,
      display_address: `${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`,
      total_points: user.total_points,
      points_claimed: user.points_claimed,
      points_available: user.total_points - user.points_claimed,
      current_streak: user.current_streak || 0,
      best_streak: user.best_streak || 0
    }));
    
    return res.status(200).json({
      leaderboard,
      total_users: leaderboard.length,
      updated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}