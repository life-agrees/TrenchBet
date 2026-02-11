// api/points/balance.js
// Get user's point balance
import { createClient } from '@supabase/supabase-js';

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and/or SUPABASE_KEY');
}

// Initialize Supabase client with error handling
let supabase;
try {
  supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}


export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Health check endpoint
  if (req.method === 'HEAD' || req.query.health === 'true') {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      supabaseConnected: !!supabase && !!SUPABASE_URL && !!SUPABASE_KEY
    };
    return res.status(200).json(healthStatus);
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check if Supabase is properly initialized
  if (!supabase || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase not properly initialized. Check environment variables.');
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'Database connection not configured'
    });
  }
  
  try {

    const { wallet } = req.query;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    const address = wallet.toLowerCase();
    
    // Get user data
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', address)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // User doesn't exist yet - return zeros
      return res.status(200).json({
        wallet_address: address,
        total_points: 0,
        points_claimed: 0,
        points_available: 0,
        current_streak: 0,
        best_streak: 0,
        last_bet_timestamp: null
      });
    }
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Return user data
    return res.status(200).json({
      wallet_address: user.wallet_address,
      total_points: user.total_points || 0,
      points_claimed: user.points_claimed || 0,
      points_available: (user.total_points || 0) - (user.points_claimed || 0),
      current_streak: user.current_streak || 0,
      best_streak: user.best_streak || 0,
      last_bet_timestamp: user.last_bet_timestamp,
      referral_code: user.referral_code || null
    });
    
  } catch (error) {
    console.error('API error:', error);
    console.error('Error stack:', error.stack);
    
    // Return more detailed error in development
    const isDev = process.env.NODE_ENV === 'development';
    return res.status(500).json({ 
      error: 'Internal server error',
      message: isDev ? error.message : 'An unexpected error occurred',
      ...(isDev && { stack: error.stack })
    });
  }
}
