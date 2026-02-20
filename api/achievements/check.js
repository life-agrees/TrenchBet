/**
 * API Endpoint: Check Achievements
 * Checks which achievements a user has unlocked
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    // Validate required fields
    if (!address) {
      return res.status(400).json({ 
        error: 'Missing required parameter',
        details: 'address is required'
      });
    }

    // Validate Ethereum address (basic check)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      return res.status(400).json({ 
        error: 'Invalid address format',
        details: 'Address must be a valid Ethereum address'
      });
    }

    const normalizedAddress = address.toLowerCase();

    // Here you would typically query your database and check on-chain
    // Example with Supabase:
    // const { data: userBets, error: betsError } = await supabase
    //   .from('bets')
    //   .select('*')
    //   .eq('wallet_address', normalizedAddress);
    //
    // const { data: referrals, error: referralsError } = await supabase
    //   .from('referrals')
    //   .select('*')
    //   .eq('referrer_address', normalizedAddress);

    // Mock achievement checking logic
    const unlockedAchievements = [];
    const newlyUnlocked = [];

    // Check FIRST_BET (always unlocked for demo)
    unlockedAchievements.push({
      id: 0,
      name: 'First Bet',
      unlockedAt: new Date(Date.now() - 86400000).toISOString(),
      points: 50
    });

    // Check WIN_STREAK_3
    unlockedAchievements.push({
      id: 1,
      name: 'Win Streak 3',
      unlockedAt: new Date(Date.now() - 43200000).toISOString(),
      points: 100
    });

    // Check SOCIAL_BUTTERFLY (referral count)
    const referralCount = 2; // Mock data
    if (referralCount >= 5) {
      newlyUnlocked.push({
        id: 7,
        name: 'Social Butterfly',
        unlockedAt: new Date().toISOString(),
        points: 150
      });
    }

    const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0) +
                       newlyUnlocked.reduce((sum, a) => sum + a.points, 0);

    return res.status(200).json({
      success: true,
      data: {
        address: normalizedAddress,
        achievements: [...unlockedAchievements, ...newlyUnlocked],
        newlyUnlocked,
        stats: {
          totalAchievements: unlockedAchievements.length + newlyUnlocked.length,
          totalPoints,
          rank: Math.floor(totalPoints / 100) + 1
        }
      }
    });

  } catch (error) {
    console.error('Error checking achievements:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
