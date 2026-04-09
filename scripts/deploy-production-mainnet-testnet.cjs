const hre = require("hardhat");
const { ethers } = require("hardhat");

// ── Config ────────────────────────────────────────────────────────────────────
const USDC    = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const ADMIN   = "0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d";

const PRICE_FEEDS = {
  BTC:  "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
  ETH:  "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
  LINK: "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function main() {
  const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, hre.ethers.provider);
  log(`Deploying with: ${await adminWallet.getAddress()}`);

  // ── 1. Deploy Core ──────────────────────────────────────────────────────────
  log("\n1. Deploying Core...");
  const Core = await hre.ethers.getContractFactory("PredictionMarketCore", adminWallet);
  const core = await Core.deploy(USDC, ADMIN);
  await core.waitForDeployment();
  const coreAddr = await core.getAddress();
  log(`✅ Core: ${coreAddr}`);
  await sleep(4000);

  // ── 2. Deploy Types ─────────────────────────────────────────────────────────
  log("\n2. Deploying Types...");
  const Types = await hre.ethers.getContractFactory("PredictionMarketTypes", adminWallet);
  const types = await Types.deploy(USDC, ADMIN);
  await types.waitForDeployment();
  const typesAddr = await types.getAddress();
  log(`✅ Types: ${typesAddr}`);
  await sleep(4000);

  // ── 3. Deploy Proxy ─────────────────────────────────────────────────────────
  log("\n3. Deploying Proxy...");
  const Proxy = await hre.ethers.getContractFactory("PredictionMarketProxy", adminWallet);
  const proxy = await Proxy.deploy(coreAddr, typesAddr, ADMIN);
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  log(`✅ Proxy: ${proxyAddr}`);
  await sleep(4000);

  // ── 4. Deploy BetVouchers ───────────────────────────────────────────────────
  log("\n4. Deploying BetVouchers...");
  const Vouchers = await hre.ethers.getContractFactory("BetVouchers", adminWallet);
  const vouchers = await Vouchers.deploy(USDC);
  await vouchers.waitForDeployment();
  const vouchersAddr = await vouchers.getAddress();
  log(`✅ BetVouchers: ${vouchersAddr}`);
  await sleep(4000);

  // ── 5. Set USDC on Proxy ────────────────────────────────────────────────────
  log("\n5. Setting USDC on Proxy...");
  const storage = await hre.ethers.getContractAt("PredictionMarketStorage", proxyAddr, adminWallet);
  const tx1 = await storage.setUSDC(USDC);
  await tx1.wait();
  log(`✅ USDC set`);
  await sleep(4000);

  // ── 6. Set Price Feeds ──────────────────────────────────────────────────────
  log("\n6. Setting price feeds...");
  const coreProxy = await hre.ethers.getContractAt("PredictionMarketCore", proxyAddr, adminWallet);
  for (const [asset, feed] of Object.entries(PRICE_FEEDS)) {
    const tx = await coreProxy.setPriceFeed(asset, feed);
    await tx.wait();
    log(`✅ ${asset} feed set`);
    await sleep(3000);
  }

  // ── 7. Wire BetVouchers → Proxy ─────────────────────────────────────────────
  log("\n7. Wiring BetVouchers to Proxy...");
  // Set prediction market on vouchers contract
  const vouchersContract = await hre.ethers.getContractAt("BetVouchers", vouchersAddr, adminWallet);
  const tx2 = await vouchersContract.setPredictionMarket(proxyAddr);
  await tx2.wait();
  log(`✅ BetVouchers.predictionMarket = ${proxyAddr}`);
  await sleep(3000);

  // Set vouchers contract on proxy
  const baseProxy = await hre.ethers.getContractAt("PredictionMarketBase", proxyAddr, adminWallet);
  const tx3 = await baseProxy.setVouchersContract(vouchersAddr);
  await tx3.wait();
  log(`✅ Proxy.vouchersContract = ${vouchersAddr}`);
  await sleep(3000);

  // ── 8. Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`Proxy:       ${proxyAddr}`);
  console.log(`Core:        ${coreAddr}`);
  console.log(`Types:       ${typesAddr}`);
  console.log(`BetVouchers: ${vouchersAddr}`);
  console.log("\nUpdate frontend:");
  console.log(`VITE_PROXY_ADDRESS=${proxyAddr}`);
  console.log(`PROXY_ADDRESS = "${proxyAddr}"`);
  console.log("\nVerify commands:");
  console.log(`npx hardhat verify --network baseSepolia ${proxyAddr} "${coreAddr}" "${typesAddr}" "${ADMIN}"`);
  console.log(`npx hardhat verify --network baseSepolia ${coreAddr} "${USDC}" "${ADMIN}"`);
  console.log(`npx hardhat verify --network baseSepolia ${typesAddr} "${USDC}" "${ADMIN}"`);
  console.log(`npx hardhat verify --network baseSepolia ${vouchersAddr} "${USDC}"`);
}

main().catch(err => { console.error("❌ FAILED:", err.message); process.exit(1); });
