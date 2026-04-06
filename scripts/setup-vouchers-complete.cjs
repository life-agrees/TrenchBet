/**
 * Complete Setup: Transfer Ownership + Deploy Types
 * 
 * Steps:
 * 1. Transfer BetVouchers ownership (deployer → admin)
 * 2. Deploy PredictionMarketTypes
 * 3. Verify everything
 * 
 * Usage: npx hardhat run scripts/setup-vouchers-complete.cjs --network baseSepolia
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
  const filename = `${network}-vouchers-setup-${timestamp}.json`;
  
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
// STEP 1: Transfer BetVouchers Ownership
// ============================================================

async function transferOwnership(betvouchersAddr, deployerSigner, newOwner) {
  log("=".repeat(60), "section");
  log("STEP 1: Transferring BetVouchers Ownership");
  log("=".repeat(60), "section");
  
  const deployerAddr = await deployerSigner.getAddress();
  log(`Current Owner (Deployer): ${deployerAddr}`);
  log(`New Owner (Admin):        ${newOwner}`);
  
  const BetVouchersABI = [
    {
      inputs: [],
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];
  
  const betvouchers = new hre.ethers.Contract(betvouchersAddr, BetVouchersABI, deployerSigner);
  
  // Check current owner
  const currentOwner = await betvouchers.owner();
  log(`Verified current owner: ${currentOwner}`);
  
  if (currentOwner.toLowerCase() !== deployerAddr.toLowerCase()) {
    throw new Error(`Current owner ${currentOwner} is not the deployer ${deployerAddr}`);
  }
  
  // Transfer ownership
  log("\n⏳ Sending transferOwnership transaction...");
  const tx = await betvouchers.transferOwnership(newOwner);
  log(`   Tx: ${tx.hash}`);
  
  const receipt = await tx.wait();
  log(`✅ Ownership transferred! Block: ${receipt.blockNumber}`, "success");
  
  return {
    address: betvouchersAddr,
    previousOwner: currentOwner,
    newOwner: newOwner,
    tx: tx.hash,
    block: receipt.blockNumber
  };
}

// ============================================================
// STEP 2: Deploy PredictionMarketTypes
// ============================================================

async function deployTypes(usdc, proxyAddr, deployer) {
  log("=".repeat(60), "section");
  log("STEP 2: Deploying PredictionMarketTypes");
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
// STEP 3: Update Proxy to Use New Types
// ============================================================

async function updateProxyTypes(proxyAddr, typesAddr, deployer) {
  log("=".repeat(60), "section");
  log("STEP 3: Updating Proxy to Use New Types");
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
    }
  ];
  
  const proxy = new hre.ethers.Contract(proxyAddr, ProxyABI, deployer);
  
  log("\n⏳ Calling upgradeTypes...");
  const tx = await proxy.upgradeTypes(typesAddr);
  log(`   Tx: ${tx.hash}`);
  
  const receipt = await tx.wait();
  log(`✅ Types updated! Block: ${receipt.blockNumber}`, "success");
  
  return {
    address: proxyAddr,
    newTypesImplementation: typesAddr,
    tx: tx.hash,
    block: receipt.blockNumber
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  log("=".repeat(60), "section");
  log("COMPLETE VOUCHERS SETUP");
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
    // STEP 1: Transfer Ownership
    // ============================================================
    const ownershipTransfer = await transferOwnership(
      config.betvouchers,
      deployer,
      config.admin
    );
    deployment.ownershipTransfer = ownershipTransfer;
    
    await sleep(3000);
    
    // ============================================================
    // STEP 2: Deploy Types
    // ============================================================
    const typesDeployment = await deployTypes(
      config.usdc,
      config.proxy,
      deployer
    );
    deployment.types = typesDeployment;
    
    await sleep(3000);
    
    // ============================================================
    // STEP 3: Update Proxy
    // ============================================================
    const proxyUpdate = await updateProxyTypes(
      config.proxy,
      typesDeployment.address,
      admin
    );
    deployment.proxyUpdate = proxyUpdate;
    
    // ============================================================
    // SUMMARY
    // ============================================================
    log("=".repeat(60), "section");
    log("✅ COMPLETE SETUP SUCCESSFUL!", "success");
    log("=".repeat(60), "section");
    
    log("\n📋 WHAT WAS DONE:");
    log(`  1. ✅ BetVouchers transferred to admin`);
    log(`  2. ✅ PredictionMarketTypes deployed`);
    log(`  3. ✅ Proxy updated to use new Types`);
    
    log("\n📋 CONTRACT ADDRESSES:");
    log(`  Proxy:      ${config.proxy}`);
    log(`  Types:      ${typesDeployment.address}`);
    log(`  BetVouchers: ${config.betvouchers}`);
    log(`  Admin:      ${adminAddr}`);
    log(`  Deployer:   ${deployerAddr}`);
    
    log("\n🔗 VERIFICATION LINKS:");
    log(`  Proxy:  ${config.explorerUrl}/address/${config.proxy}`);
    log(`  Types:  ${config.explorerUrl}/address/${typesDeployment.address}`);
    log(`  Vouchers: ${config.explorerUrl}/address/${config.betvouchers}`);
    
    log("\n✨ SYSTEM IS NOW READY!");
    log(`  • Vouchers can be distributed to waitlist`);
    log(`  • AdminPanel Vouchers tab can upload CSV`);
    log(`  • Spending sequence active: Vouchers → Credits → USDC`);
    
    log("\n📄 NEXT STEPS:");
    log(`  1. Upload 2000 waitlist addresses via AdminPanel`);
    log(`  2. Test with small bet`);
    log(`  3. Monitor spending sequence`);
    
    log("=".repeat(60), "section");
    
    // Save
    const filepath = saveDeployment(network, deployment);
    
  } catch (error) {
    log("=".repeat(60), "section");
    log("SETUP FAILED", "error");
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
