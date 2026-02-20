/**
 * API Endpoint: Create Referral
 * Creates a new referral record in the database
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referrer_address, referred_address } = req.body;

    // Validate required fields
    if (!referrer_address || !referred_address) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'referrer_address and referred_address are required'
      });
    }

    // Validate Ethereum addresses (basic check)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(referrer_address) || !addressRegex.test(referred_address)) {
      return res.status(400).json({ 
        error: 'Invalid address format',
        details: 'Both addresses must be valid Ethereum addresses'
      });
    }

    // Prevent self-referral
    if (referrer_address.toLowerCase() === referred_address.toLowerCase()) {
      return res.status(400).json({ 
        error: 'Self-referral not allowed',
        details: 'You cannot refer yourself'
      });
    }

    // Here you would typically insert into your database
    // Example with Supabase:
    // const { data, error } = await supabase
    //   .from('referrals')
    //   .insert([
    //     { 
    //       referrer_address: referrer_address.toLowerCase(),
    //       referred_address: referred_address.toLowerCase(),
    //       timestamp: new Date().toISOString(),
    //       earnings: 0
    //     }
    //   ])
    //   .select();

    // if (error) throw error;

    // For now, return success response
    return res.status(200).json({
      success: true,
      message: 'Referral created successfully',
      data: {
        referrer_address: referrer_address.toLowerCase(),
        referred_address: referred_address.toLowerCase(),
        timestamp: new Date().toISOString(),
        earnings: 0
      }
    });

  } catch (error) {
    console.error('Error creating referral:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
