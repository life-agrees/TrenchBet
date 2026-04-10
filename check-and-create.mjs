// Check bot status, trigger market creation, and verify new market appears
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const PROXY_ADDRESS = '0x2d1d11Fb8A0C899c681C2D66b555eF37650fdFC8';
const BOT_URL = 'https://site--trenchybet-bot--cx2vhxmd6byn.code.run';
const BOT_KEY = 'trenchybet-bot-secret';

const ABI = [
  { name: 'marketCounter', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'markets', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'id', type: 'uint256' }, { name: 'marketType', type: 'uint8' }, { name: 'asset', type: 'string' },
      { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' },
      { name: 'startPrice', type: 'int256' }, { name: 'endPrice', type: 'int256' },
      { name: 'yesPool', type: 'uint256' }, { name: 'noPool', type: 'uint256' },
      { name: 'resolved', type: 'bool' }, { name: 'priceWentUp', type: 'bool' },
      { name: 'totalBets', type: 'uint256' }, { name: 'useFixedOdds', type: 'bool' },
      { name: 'yesMultiplier', type: 'uint256' }, { name: 'noMultiplier', type: 'uint256' },
      { name: 'protocolFee', type: 'uint256' }, { name: 'useTimeDecay', type: 'bool' },
      { name: 'decayStartTime', type: 'uint256' }, { name: 'minMultiplier', type: 'uint256' },
    ]}]
  },
];

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

async function fetchJson(url, options = {}) {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: text }; }
  } catch (e) {
    return { status: 0, data: null, error: e.message };
  }
}

async function main() {
  // ── 1. Get current market counter ──
  console.log('=== STEP 1: Current on-chain state ===');
  const counterBefore = Number(await publicClient.readContract({
    address: PROXY_ADDRESS, abi: ABI, functionName: 'marketCounter',
  }));
  console.log(`Market counter BEFORE: ${counterBefore}`);

  // Check last 3 markets
  const now = Math.floor(Date.now() / 1000);
  console.log(`Current time (unix seconds): ${now}`);
  console.log(`Current time (ms for frontend): ${Date.now()}`);
  
  for (let i = Math.max(0, counterBefore - 3); i < counterBefore; i++) {
    try {
      const m = await publicClient.readContract({
        address: PROXY_ADDRESS, abi: ABI, functionName: 'markets', args: [BigInt(i)],
      });
      const endSec = Number(m.endTime);
      const endMs = endSec * 1000;
      const nowMs = Date.now();
      const live = !m.resolved && endSec > now;
      console.log(`  Market #${i}: ${m.asset} | type=${m.marketType} | end=${endSec} (${new Date(endSec*1000).toISOString()}) | resolved=${m.resolved} | LIVE=${live}`);
      console.log(`    Frontend check: endTime*1000=${endMs} vs Date.now()=${nowMs} → ${endMs > nowMs ? '🟢 LIVE' : '🔴 EXPIRED'}`);
    } catch (e) {
      console.log(`  Market #${i}: ERROR - ${e.message.slice(0, 80)}`);
    }
  }

  // ── 2. Check bot status ──
  console.log('\n=== STEP 2: Bot health check ===');
  const health = await fetchJson(`${BOT_URL}/health`);
  console.log(`Health: ${JSON.stringify(health)}`);

  const status = await fetchJson(`${BOT_URL}/status`, {
    headers: { 'x-bot-key': BOT_KEY },
  });
  console.log(`Status: ${JSON.stringify(status)}`);

  // ── 3. Trigger binary market creation ──
  console.log('\n=== STEP 3: Triggering binary market creation ===');
  const triggerRes = await fetchJson(`${BOT_URL}/run/binary`, {
    method: 'POST',
    headers: { 'x-bot-key': BOT_KEY, 'Content-Type': 'application/json' },
  });
  console.log(`Trigger result: ${JSON.stringify(triggerRes)}`);

  if (triggerRes.error) {
    console.log('\n⚠️  Bot appears to be unreachable. Creating market directly...');
    // We won't do this here - just report it
    console.log('Please check if the bot is deployed and running.');
  }

  // ── 4. Wait and verify new market ──
  console.log('\n=== STEP 4: Waiting 30s for market creation... ===');
  await new Promise(r => setTimeout(r, 30000));

  const counterAfter = Number(await publicClient.readContract({
    address: PROXY_ADDRESS, abi: ABI, functionName: 'marketCounter',
  }));
  console.log(`Market counter AFTER: ${counterAfter} (was ${counterBefore})`);

  if (counterAfter > counterBefore) {
    console.log(`\n✅ ${counterAfter - counterBefore} NEW market(s) created!`);
    
    // Check the new markets
    for (let i = counterBefore; i < counterAfter; i++) {
      try {
        const m = await publicClient.readContract({
          address: PROXY_ADDRESS, abi: ABI, functionName: 'markets', args: [BigInt(i)],
        });
        const endSec = Number(m.endTime);
        const endMs = endSec * 1000;
        const nowMs = Date.now();
        const live = !m.resolved && endSec > now;
        console.log(`  NEW Market #${i}: ${m.asset} | type=${m.marketType}`);
        console.log(`    startTime=${m.startTime} endTime=${endSec}`);
        console.log(`    resolved=${m.resolved}`);
        console.log(`    Frontend: endTime*1000=${endMs} vs Date.now()=${nowMs}`);
        console.log(`    → ${endMs > nowMs ? '🟢 SHOULD APPEAR AS LIVE' : '🔴 WOULD SHOW AS EXPIRED'}`);
      } catch (e) {
        console.log(`  NEW Market #${i}: ERROR - ${e.message.slice(0, 80)}`);
      }
    }
  } else {
    console.log(`\n❌ No new markets were created. Bot may not be running or the creation failed.`);
    console.log('Checking last market again...');
    const lastId = counterBefore - 1;
    const m = await publicClient.readContract({
      address: PROXY_ADDRESS, abi: ABI, functionName: 'markets', args: [BigInt(lastId)],
    });
    const endSec = Number(m.endTime);
    console.log(`  Last market #${lastId}: ${m.asset} | endTime=${endSec} (${new Date(endSec*1000).toISOString()}) | resolved=${m.resolved}`);
    console.log(`  This market ended ${Math.floor((now - endSec)/60)} minutes ago`);
  }

  // ── 5. Simulate frontend logic ──
  console.log('\n=== STEP 5: Frontend simulation ===');
  console.log('The frontend useMarkets hook does:');
  console.log('  1. Reads marketCounter → gets total count');
  console.log('  2. Scans last 50 IDs (counter-1 down to counter-50)');
  console.log('  3. For each, reads markets(id) from contract');
  console.log('  4. Converts endTime: rawEndTime * 1000 (seconds → ms)');
  console.log('  5. Filters: if (!resolved && endTime > Date.now()) → LIVE');
  console.log('');
  console.log('If ALL markets have endTime in the past, liveMarkets = [] = empty screen');
}

main().catch(e => console.error('Fatal:', e.message));
