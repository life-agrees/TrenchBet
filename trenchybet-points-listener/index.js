// =====================================================
// TRENCHYBET POINTS - EVENT LISTENER 
// =====================================================
import { createPublicClient, http, parseAbiItem, formatUnits, getAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// === CONFIG ===
const ALCHEMY_URL = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
const CORE_CONTRACT_ADDRESS = process.env.PREDICTION_MARKET_CORE_ADDRESS;
const TYPES_CONTRACT_ADDRESS = process.env.PREDICTION_MARKET_TYPES_ADDRESS;


// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Viem client
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(ALCHEMY_URL),
});

// === POINTS CALCULATION ===
const POINTS_PER_DOLLAR = 10; // 10 points per $1 USDC
const WIN_MULTIPLIER = 5; // 5x points on wins

// === ENSURE USER EXISTS ===
async function ensureUserExists(wallet) {
  const address = wallet.toLowerCase();

  // Upsert the user to ensure they exist
  const { error } = await supabase
    .from('users')
    .upsert({
      wallet_address: address,
      total_points: 0,
      last_bet_timestamp: new Date().toISOString()
    }, {
      onConflict: 'wallet_address'
    });

  if (error) {
    console.error('Error upserting user:', error);
    throw error;
  }

  console.log(`✅ User ensured: ${address.slice(0, 6)}...${address.slice(-4)}`);
}

// === AWARD POINTS FUNCTION ===
async function awardPoints(wallet, points, source, metadata = {}) {
  try {
    const address = wallet.toLowerCase();
    
    // 1. FIRST ensure user exists (critical!)
    await ensureUserExists(address);
    
    // 2. Insert into ledger
    const { error: ledgerError } = await supabase
      .from('points_ledger')
      .insert({
        wallet_address: address,
        points_earned: points,
        source: source,
        bet_id: metadata.betId || null,
        market_id: metadata.marketId || null,
        metadata: metadata
      });

    if (ledgerError) {
      console.error('Ledger error:', ledgerError);
      return;
    }

    // 3. Update user's total points
    const { data: user } = await supabase
      .from('users')
      .select('total_points')
      .eq('wallet_address', address)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({ 
          total_points: user.total_points + points,
          last_bet_timestamp: new Date().toISOString()
        })
        .eq('wallet_address', address);
    }

    console.log(`💰 Awarded ${points} points to ${address.slice(0, 6)}...${address.slice(-4)} (${source})`);
  } catch (error) {
    console.error('❌ Error awarding points:', error.message);
  }
}

// === EVENT HANDLERS ===

// Handler for BetPlaced event
async function handleBetPlaced(log) {
  try {
    // Safely extract args
    if (!log.args || !log.args.user || !log.args.amount) {
      console.log('⚠️  Skipping invalid BetPlaced event');
      return;
    }

    const { marketId, user, amount } = log.args;
    
    // Calculate base points (10 points per $1 USDC)
    const usdcAmount = Number(formatUnits(amount, 6));
    const basePoints = Math.floor(usdcAmount * POINTS_PER_DOLLAR);
    
    console.log(`📊 Bet detected: Market ${marketId}, ${usdcAmount} USDC → ${basePoints} points`);
    
    await awardPoints(user, basePoints, 'bet_volume', {
      marketId: Number(marketId),
      betAmount: usdcAmount,
      txHash: log.transactionHash
    });
  } catch (error) {
    console.error('❌ Error in handleBetPlaced:', error.message);
  }
}

// Handler for WinningsClaimed event (detects wins)
async function handleWinningsClaimed(log) {
  try {
    // Safely extract args
    if (!log.args || !log.args.user || !log.args.amount) {
      console.log('⚠️  Skipping invalid WinningsClaimed event');
      return;
    }

    const { marketId, user, amount: payout } = log.args;
    
    // Skip if payout is 0 (means they lost)
    if (payout === 0n) return;
    
    // Get the original bet amount from the ledger
    const { data: betRecord } = await supabase
      .from('points_ledger')
      .select('metadata')
      .eq('wallet_address', user.toLowerCase())
      .eq('market_id', Number(marketId))
      .eq('source', 'bet_volume')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (betRecord && betRecord.metadata?.betAmount) {
      const originalBet = betRecord.metadata.betAmount;
      const winBonus = Math.floor(originalBet * POINTS_PER_DOLLAR * WIN_MULTIPLIER);
      
      console.log(`🏆 Win detected: Market ${marketId}, ${Number(formatUnits(payout, 6))} USDC → ${winBonus} bonus points`);
      
      await awardPoints(user, winBonus, 'win_bonus', {
        marketId: Number(marketId),
        payout: Number(formatUnits(payout, 6)),
        txHash: log.transactionHash
      });
    }
  } catch (error) {
    console.error('❌ Error in handleWinningsClaimed:', error.message);
  }
}

// === POLLING LISTENER ===
async function startListener() {
  console.log('🚀 TrenchyBet Points Listener Starting...');
  console.log(`📍 Watching Core: ${CORE_CONTRACT_ADDRESS}`);
  console.log(`📍 Watching Types: ${TYPES_CONTRACT_ADDRESS}`);
  
  // Get the latest block number
  const latestBlock = await publicClient.getBlockNumber();
  console.log(`📦 Starting from block: ${latestBlock}`);
  
  let lastProcessedBlock = latestBlock;
  
  console.log('✅ Listening for events...');
  console.log('');
  
  // Poll every 5 seconds for new events
  setInterval(async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      
      // Skip if no new blocks
      if (currentBlock <= lastProcessedBlock) return;
      
      console.log(`🔍 Scanning blocks ${lastProcessedBlock + 1n} to ${currentBlock}...`);
      
      // Fetch BetPlaced events from BOTH contracts
      const [coreBetLogs, typesBetLogs] = await Promise.all([
        publicClient.getLogs({
          address: CORE_CONTRACT_ADDRESS,
          event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
          fromBlock: lastProcessedBlock + 1n,
          toBlock: currentBlock,
        }),
        publicClient.getLogs({
          address: TYPES_CONTRACT_ADDRESS,
          event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
          fromBlock: lastProcessedBlock + 1n,
          toBlock: currentBlock,
        })
      ]);
      
      // Fetch WinningsClaimed events from BOTH contracts
      const [coreWinLogs, typesWinLogs] = await Promise.all([
        publicClient.getLogs({
          address: CORE_CONTRACT_ADDRESS,
          event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
          fromBlock: lastProcessedBlock + 1n,
          toBlock: currentBlock,
        }),
        publicClient.getLogs({
          address: TYPES_CONTRACT_ADDRESS,
          event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
          fromBlock: lastProcessedBlock + 1n,
          toBlock: currentBlock,
        })
      ]);
      
      // Combine logs from both contracts
      const allBetLogs = [...coreBetLogs, ...typesBetLogs];
      const allWinLogs = [...coreWinLogs, ...typesWinLogs];
      
      // Process events sequentially (to avoid race conditions)
      for (const log of allBetLogs) {
        await handleBetPlaced(log);
      }
      
      for (const log of allWinLogs) {
        await handleWinningsClaimed(log);
      }
      
      if (allBetLogs.length > 0 || allWinLogs.length > 0) {
        console.log(`✅ Processed ${allBetLogs.length} bets (${coreBetLogs.length} core, ${typesBetLogs.length} types), ${allWinLogs.length} wins (${coreWinLogs.length} core, ${typesWinLogs.length} types)`);
        console.log('');
      }
      
      lastProcessedBlock = currentBlock;
      
    } catch (error) {
      console.error('❌ Error in polling loop:', error.message);
      // Don't update lastProcessedBlock on error - will retry next poll
    }
  }, 5000); // Poll every 5 seconds
}


// === STARTUP ===
async function main() {
  try {
    // Test Supabase connection
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) throw new Error('Supabase connection failed: ' + error.message);
    
    console.log('✅ Connected to Supabase');
    
    // Start the listener
    await startListener();
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start
main();
