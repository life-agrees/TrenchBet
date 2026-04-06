/**
 * Deploy PredictionMarketTypes & Upgrade Proxy
 * 
 * Steps:
 * 1. Deploy PredictionMarketTypes with (USDC, PROXY)
 * 2. Call upgradeTypes on proxy (admin only)
 * 3. Verify upgrade
 * 
 * Usage: npx hardhat run scripts/deploy-and-upgrade-types.cjs --network baseSepolia
 */

const hre = require("hardhat");
const fs = require("fs");
require('dotenv').config();

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  baseSepolia: {
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    proxy: "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581",
    betvouchers: "0xC6989A4D70560413C7Db582352C3fCb0D440D915",
    admin: "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d",
    explorerUrl: "https://sepolia.basescan.org"
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ️ ",
    success: "✅",
    error: "❌",
    warning: "⚠️ ",
    section: "\n" + "=".repeat(60) + "\n"
  }[type] || "";
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function saveDeployment(network, data) {
  const deploymentsDir = "deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const filename = `${network}-types-upgrade-${timestamp}.json`;
  
  const deploymentData = {
    ...data,
    timestamp: new Date().toISOString(),
    network,
    version: "1.0.0"
  };
  
  fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
  log(`Deployment saved: ${filename}`, "success");
  
  return filename;
}

// ============================================================
// STEP 1: Deploy PredictionMarketTypes
// ============================================================

async function deployTypes(usdc, proxyAddr, deployer) {
  log("=".repeat(60), "section");
  log("STEP 1: Deploying PredictionMarketTypes");
  log("=".repeat(60), "section");
  
  log(`USDC:  ${usdc}`);
  log(`Proxy: ${proxyAddr}`);
  
  log("\n⏳ Deploying PredictionMarketTypes...");
  
  const TypesFactory = await hre.ethers.getContractFactory("PredictionMarketTypes");
  const types = await TypesFactory.connect(deployer).deploy(usdc, proxyAddr);
  
  const deployTx = await types.deploymentTransaction();
  log(`   Tx: ${deployTx.hash}`);
  
  await types.waitForDeployment();
  const address = await types.getAddress();
  
  log(`✅ Types deployed: ${address}`, "success");
  
  return {
    address: address,
    tx: deployTx.hash
  };
}

// ============================================================
// STEP 2: Upgrade Proxy to Use New Types
// ============================================================

async function upgradeProxyTypes(proxyAddr, typesAddr, admin, explorerUrl) {
  log("=".repeat(60), "section");
  log("STEP 2: Upgrading Proxy to Use New Types");
  log("=".repeat(60), "section");
  
  log(`Proxy:     ${proxyAddr}`);
  log(`New Types: ${typesAddr}`);
  
  const ProxyABI = [
    {
      inputs: [{ internalType: "address", name: "newImplementation", type: "address" }],
      name: "upgradeTypes",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "getTypesImplementation",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];
  
  const proxy = new hre.ethers.Contract(proxyAddr, ProxyABI, admin);
  
  // Get current implementation before upgrade
  const oldTypes = await proxy.getTypesImplementation();
  log(`\nCurrent Types Implementation: ${oldTypes}`);
  
  log("\n⏳ Calling upgradeTypes...");
  const tx = await proxy.upgradeTypes(typesAddr);
  log(`   Tx: ${tx.hash}`);
  
  const receipt = await tx.wait();
  log(`✅ Types upgraded! Block: ${receipt.blockNumber}`, "success");
  
  // Verify new implementation
  const newTypes = await proxy.getTypesImplementation();
  const verified = newTypes.toLowerCase() === typesAddr.toLowerCase();
  log(`\nNew Types Implementation: ${newTypes}`);
  log(`Verified: ${verified ? "✅" : "❌"}`);
  
  return {
    address: proxyAddr,
    oldImplementation: oldTypes,
    newImplementation: typesAddr,
    tx: tx.hash,
    block: receipt.blockNumber,
    verified: verified
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  log("=".repeat(60), "section");
  log("DEPLOY & UPGRADE TYPES");
  log("=".repeat(60), "section");
  
  const network = hre.network.name;
  const config = CONFIG[network];
  
  if (!config) {
    throw new Error(`Network ${network} not configured`);
  }
  
  log(`Network: ${network}`);
  
  // Get signers from environment variables
  const deployerPrivateKey = process.env.PRIVATE_KEY;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  
  if (!deployerPrivateKey) throw new Error("PRIVATE_KEY not found in .env");
  if (!adminPrivateKey) throw new Error("ADMIN_PRIVATE_KEY not found in .env");
  
  const deployer = new hre.ethers.Wallet(deployerPrivateKey, hre.ethers.provider);
  const admin = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);
  
  const deployerAddr = await deployer.getAddress();
  const adminAddr = await admin.getAddress();
  const deployerBalance = await hre.ethers.provider.getBalance(deployerAddr);
  const adminBalance = await hre.ethers.provider.getBalance(adminAddr);
  
  log(`Deployer: ${deployerAddr}`);
  log(`Deployer Balance: ${hre.ethers.formatEther(deployerBalance)} ETH`);
  log(`Admin: ${adminAddr}`);
  log(`Admin Balance: ${hre.ethers.formatEther(adminBalance)} ETH`);
  
  const deployment = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployerAddr,
    admin: adminAddr,
    usdc: config.usdc,
    proxy: config.proxy,
    betvouchers: config.betvouchers
  };
  
  try {
    // ============================================================
    // STEP 1: Deploy Types
    // ============================================================
    const typesDeployment = await deployTypes(
      config.usdc,
      config.proxy,
      deployer
    );
    deployment.types = typesDeployment;
    
    await sleep(3000);
    
    // ============================================================
    // STEP 2: Upgrade Proxy
    // ============================================================
    const proxyUpgrade = await upgradeProxyTypes(
      config.proxy,
      typesDeployment.address,
      admin,
      config.explorerUrl
    );
    deployment.proxyUpgrade = proxyUpgrade;
    
    // ============================================================
    // SUMMARY
    // ============================================================
    log("=".repeat(60), "section");
    log("✅ DEPLOYMENT COMPLETE!", "success");
    log("=".repeat(60), "section");
    
    log("\n📋 WHAT WAS DONE:");
    log(`  1. ✅ PredictionMarketTypes deployed`);
    log(`  2. ✅ Proxy upgraded to use new Types`);
    
    log("\n📋 CONTRACT ADDRESSES:");
    log(`  Proxy:      ${config.proxy}`);
    log(`  New Types:  ${typesDeployment.address}`);
    log(`  Old Types:  ${proxyUpgrade.oldImplementation}`);
    log(`  BetVouchers: ${config.betvouchers}`);
    log(`  Admin:      ${adminAddr}`);
    
    log("\n🔗 VERIFICATION LINKS:");
    log(`  Proxy:  ${config.explorerUrl}/address/${config.proxy}`);
    log(`  Types:  ${config.explorerUrl}/address/${typesDeployment.address}`);
    
    log("\n✨ SYSTEM READY!");
    log(`  • Advanced market types now support vouchers`);
    log(`  • Spending sequence: Vouchers → Credits → USDC`);
    log(`  • Ready for CSV upload and campaign launch`);
    
    log("\n📄 NEXT STEPS:");
    log(`  1. Update VITE_PREDICTION_MARKET_TYPES_ADDRESS in .env`);
    log(`  2. Upload 2000 waitlist addresses via AdminPanel`);
    log(`  3. Test with small bet to verify spending sequence`);
    log(`  4. Monitor events: BatchVouchersDistributed, VoucherSpent`);
    
    log("=".repeat(60), "section");
    
    // Save
    const filepath = saveDeployment(network, deployment);
    
  } catch (error) {
    log("=".repeat(60), "section");
    log("DEPLOYMENT FAILED", "error");
    log("=".repeat(60), "section");
    log(`Error: ${error.message}`, "error");
    
    if (error.stack) {
      log(`\nStack trace:\n${error.stack}`, "error");
    }
    
    deployment.error = {
      message: error.message,
      stack: error.stack
    };
    saveDeployment(network, deployment);
    
    process.exit(1);
  }
}

// ============================================================
// EXECUTE
// ============================================================

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
