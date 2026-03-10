// api/activities/index.js
// Fetch user activity feed from Points Listener service
// Real-time activities: bets placed, bets won/lost, markets created, achievements unlocked

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
    const { wallet, limit = '20', offset = '0' } = req.query;
    
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }
    
    const address = wallet.toLowerCase();
    const pageLimit = Math.min(parseInt(limit), 100); // Max 100 per request
    const pageOffset = parseInt(offset);
    
    // Fetch activities from points_ledger (source of truth from points-listener)
    // This includes: bets placed, bets won/lost, markets created, achievements, etc.
    const { data: activities, error, count } = await supabase
      .from('points_ledger')
      .select('*', { count: 'exact' })
      .eq('wallet_address', address)
      .order('created_at', { ascending: false })
      .range(pageOffset, pageOffset + pageLimit - 1);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Format activities for frontend consumption
    const formattedActivities = (activities || []).map(entry => {
      // Determine activity type from source
      let type = 'activity';
      let icon = 'Activity';
      let color = 'text-neutral-400';
      
      if (entry.source === 'bet_placed') {
        type = 'bet_placed';
        icon = 'TrendingUp';
        color = 'text-blue-400';
      } else if (entry.source === 'bet_won') {
        type = 'bet_won';
        icon = 'Trophy';
        color = 'text-success';
      } else if (entry.source === 'bet_lost') {
        type = 'bet_lost';
        icon = 'XCircle';
        color = 'text-danger';
      } else if (entry.source === 'market_created') {
        type = 'market_created';
        icon = 'Target';
        color = 'text-primary';
      } else if (entry.source === 'achievement_unlocked') {
        type = 'achievement_unlocked';
        icon = 'Trophy';
        color = 'text-yellow-400';
      } else if (entry.source === 'streak_milestone') {
        type = 'streak_milestone';
        icon = 'Zap';
        color = 'text-yellow-400';
      }
      
      // Extract metadata
      const metadata = entry.metadata || {};
      
      return {
        id: entry.id,
        type,
        icon,
        color,
        title: getTitleFromSource(entry.source, metadata),
        description: getDescriptionFromSource(entry.source, metadata),
        points_earned: entry.points_earned || 0,
        source: entry.source,
        market_id: entry.market_id || null,
        timestamp: new Date(entry.created_at).getTime(),
        metadata
      };
    });
    
    return res.status(200).json({
      wallet_address: address,
      activities: formattedActivities,
      total: count,
      limit: pageLimit,
      offset: pageOffset,
      hasMore: pageOffset + pageLimit < count
    });
    
  } catch (error) {
    console.error('Activities endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get human-readable title from activity source
 */
function getTitleFromSource(source, metadata) {
  switch (source) {
    case 'bet_placed':
      return `Bet Placed (${metadata?.bidAmount || 'unknown'} USDC)`;
    case 'bet_won':
      return `Bet Won! ${metadata?.multiplier ? `${metadata.multiplier}x` : ''}`;
    case 'bet_lost':
      return 'Bet Lost';
    case 'market_created':
      return `Market Created: ${metadata?.asset || 'Unknown'}`;
    case 'achievement_unlocked':
      return `🏆 ${metadata?.achievementName || 'Achievement Unlocked'}`;
    case 'streak_milestone':
      return `⚡ Streak Milestone: ${metadata?.streak || '0'} wins!`;
    default:
      return 'Activity';
  }
}

/**
 * Get human-readable description from activity source
 */
function getDescriptionFromSource(source, metadata) {
  switch (source) {
    case 'bet_placed':
      return `You bet ${metadata?.bidAmount || 'unknown'} USDC on ${metadata?.choice || 'a choice'}`;
    case 'bet_won':
      return `You won ${metadata?.winAmount || 'rewards'} with ${metadata?.multiplier || 'unknown'}x multiplier`;
    case 'bet_lost':
      return `You lost your bet of ${metadata?.lossAmount || 'unknown'} USDC`;
    case 'market_created':
      return `New market created for ${metadata?.asset || 'Assets'} • Ends ${metadata?.endTime || 'soon'}`;
    case 'achievement_unlocked':
      return metadata?.description || 'You unlocked a new achievement!';
    case 'streak_milestone':
      return `Amazing! You've reached a ${metadata?.streak || 'great'}-win streak!`;
    default:
      return 'No description available';
  }
}
