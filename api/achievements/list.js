/**
 * API Endpoint: List Achievements
 * Gets all achievements and user progress
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

    // All possible achievements
    const allAchievements = [
      {
        id: 0,
        name: 'First Bet',
        description: 'Place your first bet on any market',
        icon: '🎯',
        points: 50,
        color: 'bg-blue-500',
        unlocked: true,
        unlockedAt: new Date(Date.now() - 86400000).toISOString(),
        progress: 100
      },
      {
        id: 1,
        name: 'Win Streak 3',
        description: 'Win 3 bets in a row',
        icon: '🔥',
        points: 100,
        color: 'bg-orange-500',
        unlocked: true,
        unlockedAt: new Date(Date.now() - 43200000).toISOString(),
        progress: 100
      },
      {
        id: 2,
        name: 'Win Streak 5',
        description: 'Win 5 bets in a row',
        icon: '🏆',
        points: 200,
        color: 'bg-yellow-500',
        unlocked: false,
        progress: 60,
        current: 3,
        target: 5
      },
      {
        id: 3,
        name: 'Whale',
        description: 'Place a bet of $1,000 or more',
        icon: '🐋',
        points: 150,
        color: 'bg-purple-500',
        unlocked: false,
        progress: 45,
        current: 450,
        target: 1000
      },
      {
        id: 4,
        name: 'Sharpshooter',
        description: 'Achieve 80% win rate over 20 bets',
        icon: '🎯',
        points: 300,
        color: 'bg-red-500',
        unlocked: false,
        progress: 75,
        current: 15,
        target: 20
      },
      {
        id: 5,
        name: 'Early Bird',
        description: 'Place a bet within the first 60 seconds of market creation',
        icon: '🐦',
        points: 50,
        color: 'bg-green-500',
        unlocked: true,
        unlockedAt: new Date(Date.now() - 172800000).toISOString(),
        progress: 100
      },
      {
        id: 6,
        name: 'Speed Demon',
        description: 'Place 10 bets in a single day',
        icon: '⚡',
        points: 100,
        color: 'bg-pink-500',
        unlocked: false,
        progress: 70,
        current: 7,
        target: 10
      },
      {
        id: 7,
        name: 'Social Butterfly',
        description: 'Refer 5 friends to TrenchyBet',
        icon: '🦋',
        points: 150,
        color: 'bg-indigo-500',
        unlocked: false,
        progress: 40,
        current: 2,
        target: 5
      },
      {
        id: 8,
        name: 'Diamond Hands',
        description: 'Hold locked TRENCHY tokens for 30 days',
        icon: '💎',
        points: 250,
        color: 'bg-cyan-500',
        unlocked: false,
        progress: 0,
        current: 0,
        target: 30
      },
      {
        id: 9,
        name: 'Oracle',
        description: 'Correctly predict 10 markets',
        icon: '🔮',
        points: 500,
        color: 'bg-amber-500',
        unlocked: false,
        progress: 60,
        current: 6,
        target: 10
      },
      {
        id: 10,
        name: 'Trendsetter',
        description: 'Be the first to bet on a market',
        icon: '👑',
        points: 75,
        color: 'bg-rose-500',
        unlocked: true,
        unlockedAt: new Date(Date.now() - 259200000).toISOString(),
        progress: 100
      },
      {
        id: 11,
        name: 'Founder',
        description: 'Be among the first 1000 users to claim the airdrop',
        icon: '🚀',
        points: 1000,
        color: 'bg-emerald-500',
        unlocked: false,
        progress: 0,
        current: 0,
        target: 1
      }
    ];

    const unlockedAchievements = allAchievements.filter(a => a.unlocked);
    const lockedAchievements = allAchievements.filter(a => !a.unlocked);
    const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);

    return res.status(200).json({
      success: true,
      data: {
        address: normalizedAddress,
        achievements: allAchievements,
        unlocked: unlockedAchievements,
        locked: lockedAchievements,
        stats: {
          totalAchievements: allAchievements.length,
          unlockedCount: unlockedAchievements.length,
          lockedCount: lockedAchievements.length,
          totalPoints,
          nextAchievement: lockedAchievements[0] || null,
          rank: Math.floor(totalPoints / 100) + 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
