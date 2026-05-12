/**
 * Arc Testnet - placeBet Diagnostic Script
 * 
 * HOW TO USE:
 * 1. Open your app in Chrome with Arc Testnet connected
 * 2. Open DevTools → Console
 * 3. Copy-paste the entire block below and press Enter
 * 4. Share the console output with your developer
 */

(async () => {
  const RPC = 'https://rpc.testnet.arc.network';
  const PROXY = '0xa9d3532401E3DAF004C3031A3715c7bb311CD38f';
  const USDC  = '0x3600000000000000000000000000000000000000';
  const USER  = '0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d';
  const MARKET_ID = 639; // <-- Change this to the market you're trying to bet on

  const call = async (id, to, data) => {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, jsonrpc: '2.0', method: 'eth_call', params: [{ to, data }, 'latest'] })
    });
    return (await res.json()).result;
  };

  const pad = (hex) => hex.replace('0x', '').padStart(64, '0');
  const toNum = (hex) => parseInt(hex, 16);
  const toUsdc = (hex) => (toNum(hex) / 1e6).toFixed(6) + ' USDC';

  console.group('🔍 Arc Testnet Diagnostic');

  // 1. USDC Balance
  const balHex = await call(1, USDC, '0x70a08231' + pad(USER));
  console.log('💰 USDC Balance:', toUsdc(balHex), '(raw:', toNum(balHex), ')');

  // 2. USDC Allowance for Proxy
  const allowHex = await call(2, USDC, '0xdd62ed3e' + pad(USER) + pad(PROXY));
  console.log('✅ USDC Allowance for Proxy:', toUsdc(allowHex), '(raw:', toNum(allowHex), ')');

  // 3. Market State
  // markets(uint256) selector = 0x9b03b27c... actually let's compute:
  // keccak256("markets(uint256)") first 4 bytes
  const marketData = pad(MARKET_ID.toString(16));
  const mktHex = await call(3, PROXY, '0x9b03b27c' + marketData);
  console.log('📊 Market raw data (first 256 chars):', mktHex?.slice(0, 256));

  // 4. Try to simulate placeBet(marketId, choice=1, amount=3000000)
  // placeBet(uint256,uint8,uint256) selector
  const selector = '0x0ba7f70c'; // keccak256("placeBet(uint256,uint8,uint256)")[0:4]
  const args = pad(MARKET_ID.toString(16)) + pad('1') + pad((3000000).toString(16));
  
  const simRes = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 4, jsonrpc: '2.0', method: 'eth_call',
      params: [{ from: USER, to: PROXY, data: selector + args }, 'latest']
    })
  });
  const simJson = await simRes.json();
  console.log('🧪 Simulate placeBet result:', simJson);
  if (simJson.error) {
    console.error('❌ Revert reason:', simJson.error.message || simJson.error.data);
  } else {
    console.log('✅ Simulation succeeded! Should be able to place bet.');
  }

  // 5. Check if contract is paused (if paused() exists)
  const pauseHex = await call(5, PROXY, '0x5c975abb'); // paused()
  console.log('⏸️  Contract paused?', pauseHex === '0x' + '1'.padStart(64, '0') ? 'YES ⚠️' : 'No');

  console.groupEnd();
  console.log('\n📋 Summary complete. Share the output above with your developer.');
})();
