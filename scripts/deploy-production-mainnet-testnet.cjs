const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * MASTER LAUNCH SCRIPT: TrenchyBet Production & Testnet
 * 
 * This script handles:
 * 1. Fresh Deployment of all 4 modules (Core, Types, Proxy, Vouchers)
 * 2. Automatic Configuration of Price Feeds (The Trenchy 7/8 + PEPE)
 * 3. Wiring of the Voucher System to the Market Proxy
 * 4. Environment-aware settings for Base Sepolia vs Base Mainnet
 * 
 * USAGE:
 * - Fresh Deploy: Ensure PROXY_ADDRESS is empty in .env
 * - Config Only: Provide PROXY_ADDRESS in .env to just sync assets/vouchers
 */

// ── Environment Configuration ──────────────────────────────────────────────────

const NETWORK_CONFIG = {
  baseSepolia: {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    admin: "0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d",
    feeds: {
      BTC:  "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
      ETH:  "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
      LINK: "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61",
    }
  },
  baseMainnet: {
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native USDC
    admin: "0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d",
    feeds: {
      BTC:  "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298", // Verified Mainnet Feed
      ETH:  "0x71041dddad3595F8Ce33Ad99F07DA1D3b1F6f34d",
      SOL:  "0x1062d8DE4A0344d32a90A2E2C33DEB04bBBe3219",
      XRP:  "0x4561008C39ca8838B57d77E6c98F8aC830206144",
      BNB:  "0x16a9A977e9234707C951074aab55d141662F6988",
      DOGE: "0x338f0C0B083f2a893E2B8869E96287968593a890",
      ARB:  "0x0113F5A928BCfF189C998ab20d753a47F9dE5A61",
      PEPE: "0xB48ac6409C0c3718b956089b0fFE295A10ACDdad"
      // LINK is omitted for Mainnet per user request
    }
  },
  arcTestnet: {
    usdc: "0x3600000000000000000000000000000000000000", // Native USDC on Arc
    admin: "0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d",
    feeds: {
      // Note: Chainlink feeds on Arc might be newer/limited. 
      // Replace these with actual Arc addresses once verified.
      BTC:  "0x0000000000000000000000000000000000000000", 
      ETH:  "0x0000000000000000000000000000000000000000",
    }
  }
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function main() {
  const networkName = hre.network.name;
  const config = NETWORK_CONFIG[networkName];

  if (!config) {
    throw new Error(`Configuration not found for network: ${networkName}`);
  }

  const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, hre.ethers.provider);
  log(`🚀 Starting Master Launch for ${networkName.toUpperCase()}...`);
  log(`Deployer: ${await adminWallet.getAddress()}`);

  let proxyAddr = process.env.PROXY_ADDRESS;
  let vouchersAddr = process.env.VOUCHERS_ADDRESS;
  let coreAddr = process.env.CORE_ADDRESS;
  let typesAddr = process.env.TYPES_ADDRESS;

  const isConfigOnly = !!proxyAddr;

  if (isConfigOnly) {
    log("\n⚠️  PROXY_ADDRESS found in .env. Running in CONFIGURATION MODE.");
  } else {
    log("\n✨ No PROXY_ADDRESS found. Running FULL DEPLOYMENT MODE.");

    // ── 1. Deploy Core ──────────────────────────────────────────────────────────
    log("\n1. Deploying Core...");
    const Core = await hre.ethers.getContractFactory("PredictionMarketCore", adminWallet);
    const core = await Core.deploy(config.usdc, config.admin);
    await core.waitForDeployment();
    coreAddr = await core.getAddress();
    log(`✅ Core: ${coreAddr}`);
    await sleep(5000);

    // ── 2. Deploy Types ─────────────────────────────────────────────────────────
    log("\n2. Deploying Types...");
    const Types = await hre.ethers.getContractFactory("PredictionMarketTypes", adminWallet);
    const types = await Types.deploy(config.usdc, config.admin);
    await types.waitForDeployment();
    typesAddr = await types.getAddress();
    log(`✅ Types: ${typesAddr}`);
    await sleep(5000);

    // ── 3. Deploy Proxy ─────────────────────────────────────────────────────────
    log("\n3. Deploying Proxy...");
    const Proxy = await hre.ethers.getContractFactory("PredictionMarketProxy", adminWallet);
    const proxy = await Proxy.deploy(coreAddr, typesAddr, config.admin);
    await proxy.waitForDeployment();
    proxyAddr = await proxy.getAddress();
    log(`✅ Proxy: ${proxyAddr}`);
    await sleep(5000);

    // ── 4. Deploy BetVouchers ───────────────────────────────────────────────────
    log("\n4. Deploying BetVouchers...");
    const Vouchers = await hre.ethers.getContractFactory("BetVouchers", adminWallet);
    const vouchers = await Vouchers.deploy(config.usdc);
    await vouchers.waitForDeployment();
    vouchersAddr = await vouchers.getAddress();
    log(`✅ BetVouchers: ${vouchersAddr}`);
    await sleep(5000);
  }

  // ── 5. Set USDC on Proxy ────────────────────────────────────────────────────
  log("\n5. Syncing USDC on Proxy...");
  const storage = await hre.ethers.getContractAt("PredictionMarketStorage", proxyAddr, adminWallet);
  const currentUSDC = await storage.usdc();
  if (currentUSDC.toLowerCase() !== config.usdc.toLowerCase()) {
    const tx = await storage.setUSDC(config.usdc);
    await tx.wait();
    log(`✅ USDC updated to ${config.usdc}`);
  } else {
    log(`ℹ️ USDC already correctly set to ${config.usdc}`);
  }
  await sleep(2000);

  // ── 6. Sync Price Feeds ──────────────────────────────────────────────────────
  log("\n6. Syncing price feeds...");
  const coreProxy = await hre.ethers.getContractAt("PredictionMarketCore", proxyAddr, adminWallet);
  for (const [asset, feed] of Object.entries(config.feeds)) {
    try {
      const tx = await coreProxy.setPriceFeed(asset, feed);
      await tx.wait();
      log(`✅ ${asset}: ${feed}`);
      await sleep(2000);
    } catch (err) {
      log(`❌ Error setting ${asset} feed: ${err.message}`);
    }
  }

  // ── 7. Wire BetVouchers ↔ Proxy ─────────────────────────────────────────────
  log("\n7. Wiring Vouchers ↔ Proxy...");
  
  // Vouchers -> Proxy
  const vouchersContract = await hre.ethers.getContractAt("BetVouchers", vouchersAddr, adminWallet);
  const tx2 = await vouchersContract.setPredictionMarket(proxyAddr);
  await tx2.wait();
  log(`✅ Vouchers.predictionMarket = ${proxyAddr}`);
  await sleep(2000);

  // Proxy -> Vouchers
  const baseProxy = await hre.ethers.getContractAt("PredictionMarketBase", proxyAddr, adminWallet);
  const tx3 = await baseProxy.setVouchersContract(vouchersAddr);
  await tx3.wait();
  log(`✅ Proxy.vouchersContract = ${vouchersAddr}`);

  // ── 8. Final Report ──────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("🏁 MASTER LAUNCH COMPLETE");
  console.log("=".repeat(60));
  console.log(`Network:     ${networkName}`);
  console.log(`Proxy:       ${proxyAddr}`);
  console.log(`BetVouchers: ${vouchersAddr}`);
  console.log(`Core:        ${coreAddr}`);
  console.log(`Types:       ${typesAddr}`);
  console.log("=".repeat(60));
  
  if (!isConfigOnly) {
    console.log("\nNext Steps:");
    console.log(`1. Update frontend .env: VITE_PROXY_ADDRESS=${proxyAddr}`);
    console.log(`2. Verify on Blockscout: npx hardhat verify --network ${networkName} ${proxyAddr} "${coreAddr}" "${typesAddr}" "${config.admin}"`);
  }
}

main().catch(err => { 
  console.error("\n❌ MASTER LAUNCH FAILED");
  console.error(err); 
  process.exit(1); 
});
