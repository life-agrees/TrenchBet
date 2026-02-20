/**
 * API Endpoint: List Referrals
 * Gets referral list and stats for a user
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

    // Here you would typically query your database
    // Example with Supabase:
    // const { data: referrals, error } = await supabase
    //   .from('referrals')
    //   .select('*')
    //   .eq('referrer_address', normalizedAddress)
    //   .order('timestamp', { ascending: false });

    // if (error) throw error;

    // Mock data for demonstration
    const mockReferrals = [
      {
        id: 1,
        referrer_address: normalizedAddress,
        referred_address: '0x1234567890abcdef1234567890abcdef12345678',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        earnings: 10
      },
      {
        id: 2,
        referrer_address: normalizedAddress,
        referred_address: '0xabcdef1234567890abcdef1234567890abcdef12',
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        earnings: 10
      }
    ];

    // Calculate stats
    const totalReferrals = mockReferrals.length;
    const totalEarnings = mockReferrals.reduce((sum, ref) => sum + ref.earnings, 0);

    return res.status(200).json({
      success: true,
      data: {
        referrals: mockReferrals,
        stats: {
          totalReferrals,
          totalEarnings,
          referralCode: normalizedAddress.slice(2, 10).toUpperCase()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching referrals:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
