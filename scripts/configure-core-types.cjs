/**
 * Configure New Core & Types with USDC and Price Feeds
 * 
 * Steps:
 * 1. Set USDC on Storage
 * 2. Set Price Feeds (BTC, ETH, LINK)
 * 3. Verify configuration
 * 
 * Usage: npx hardhat run scripts/configure-core-types.cjs --network baseSepolia
 */

const hre = require("hardhat");
require('dotenv').config();

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  baseSepolia: {
    proxy: "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    priceFeeds: {
      BTC: "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
      ETH: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
      LINK: "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"
    },
    admin: "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d"
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

// ============================================================
// STEP 1: Set USDC
// ============================================================

async function setUSDC(proxyAddr, usdcAddr, admin) {
  log("=".repeat(60), "section");
  log("STEP 1: Setting USDC Address");
  log("=".repeat(60), "section");
  
  log(`Proxy: ${proxyAddr}`);
  log(`USDC:  ${usdcAddr}`);
  
  const StorageABI = [
    {
      inputs: [{ internalType: "address", name: "_usdc", type: "address" }],
      name: "setUSDC",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "usdc",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];
  
  const storage = new hre.ethers.Contract(proxyAddr, StorageABI, admin);
  
  // Check current USDC
  const currentUSDC = await storage.usdc();
  log(`\nCurrent USDC: ${currentUSDC}`);
  
  if (currentUSDC.toLowerCase() === usdcAddr.toLowerCase()) {
    log("✅ USDC already set correctly", "success");
    return { address: proxyAddr, usdc: currentUSDC, alreadySet: true };
  }
  
  log("\n⏳ Setting USDC...");
  const tx = await storage.setUSDC(usdcAddr);
  log(`   Tx: ${tx.hash}`);
  
  const receipt = await tx.wait();
  log(`✅ USDC set! Block: ${receipt.blockNumber}`, "success");
  
  // Verify
  const newUSDC = await storage.usdc();
  const verified = newUSDC.toLowerCase() === usdcAddr.toLowerCase();
  log(`Verified: ${verified ? "✅" : "❌"}`);
  
  return {
    address: proxyAddr,
    usdc: newUSDC,
    tx: tx.hash,
    block: receipt.blockNumber,
    verified: verified
  };
}

// ============================================================
// STEP 2: Set Price Feeds
// ============================================================

async function setPriceFeeds(proxyAddr, feeds, admin) {
  log("=".repeat(60), "section");
  log("STEP 2: Setting Price Feeds");
  log("=".repeat(60), "section");
  
  log(`Proxy: ${proxyAddr}`);
  
  const CoreABI = [
    {
      inputs: [
        { internalType: "string", name: "asset", type: "string" },
        { internalType: "address", name: "feed", type: "address" }
      ],
      name: "setPriceFeed",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [{ internalType: "string", name: "asset", type: "string" }],
      name: "priceFeeds",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];
  
  const core = new hre.ethers.Contract(proxyAddr, CoreABI, admin);
  const results = {};
  
  for (const [asset, feedAddr] of Object.entries(feeds)) {
    log(`\n⏳ Setting ${asset}...`);
    
    // Check current feed
    const currentFeed = await core.priceFeeds(asset);
    log(`   Current: ${currentFeed}`);
    log(`   New:     ${feedAddr}`);
    
    if (currentFeed.toLowerCase() === feedAddr.toLowerCase()) {
      log(`   ✅ ${asset} already set correctly`, "success");
      results[asset] = { feed: feedAddr, alreadySet: true };
      continue;
    }
    
    try {
      log(`   Setting...`);
      const tx = await core.setPriceFeed(asset, feedAddr);
      log(`   Tx: ${tx.hash}`);
      
      const receipt = await tx.wait();
      log(`   ✅ ${asset} set! Block: ${receipt.blockNumber}`, "success");
      
      // Verify
      const newFeed = await core.priceFeeds(asset);
      const verified = newFeed.toLowerCase() === feedAddr.toLowerCase();
      log(`   Verified: ${verified ? "✅" : "❌"}`);
      
      results[asset] = {
        feed: newFeed,
        tx: tx.hash,
        block: receipt.blockNumber,
        verified: verified
      };
      
      await sleep(2000);
    } catch (error) {
      log(`   ❌ Error: ${error.message}`, "error");
      results[asset] = { error: error.message };
    }
  }
  
  return results;
}

// ============================================================
// STEP 3: Verify Configuration
// ============================================================

async function verifyConfiguration(proxyAddr, usdcAddr, feeds, admin) {
  log("=".repeat(60), "section");
  log("STEP 3: Verifying Configuration");
  log("=".repeat(60), "section");
  
  const StorageABI = [
    {
      inputs: [],
      name: "usdc",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];
  
  const CoreABI = [
    {
      inputs: [{ internalType: "string", name: "asset", type: "string" }],
      name: "priceFeeds",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];
  
  const storage = new hre.ethers.Contract(proxyAddr, StorageABI, admin);
  const core = new hre.ethers.Contract(proxyAddr, CoreABI, admin);
  
  // Check USDC
  const currentUSDC = await storage.usdc();
  const usdcMatch = currentUSDC.toLowerCase() === usdcAddr.toLowerCase();
  log(`USDC: ${currentUSDC}`);
  log(`Expected: ${usdcAddr}`);
  log(`Match: ${usdcMatch ? "✅" : "❌"}`);
  
  // Check feeds
  log(`\nPrice Feeds:`);
  const feedResults = {};
  for (const [asset, expectedFeed] of Object.entries(feeds)) {
    const currentFeed = await core.priceFeeds(asset);
    const feedMatch = currentFeed.toLowerCase() === expectedFeed.toLowerCase();
    feedResults[asset] = {
      current: currentFeed,
      expected: expectedFeed,
      verified: feedMatch
    };
    
    log(`  ${asset}:`);
    log(`    Current: ${currentFeed}`);
    log(`    Expected: ${expectedFeed}`);
    log(`    Match: ${feedMatch ? "✅" : "❌"}`);
  }
  
  const allVerified = usdcMatch && Object.values(feedResults).every(r => r.verified);
  
  return {
    usdc: { current: currentUSDC, expected: usdcAddr, verified: usdcMatch },
    feeds: feedResults,
    allVerified: allVerified
  };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  log("=".repeat(60), "section");
  log("CONFIGURE CORE & TYPES");
  log("=".repeat(60), "section");
  
  const network = hre.network.name;
  const config = CONFIG[network];
  
  if (!config) {
    throw new Error(`Network ${network} not configured`);
  }
  
  log(`Network: ${network}`);
  
  // Get admin signer
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) throw new Error("ADMIN_PRIVATE_KEY not found in .env");
  
  const admin = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);
  const adminAddr = await admin.getAddress();
  const balance = await hre.ethers.provider.getBalance(adminAddr);
  
  log(`Admin: ${adminAddr}`);
  log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  const summary = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    admin: adminAddr,
    proxy: config.proxy,
    timestamp: new Date().toISOString()
  };
  
  try {
    // ============================================================
    // STEP 1: Set USDC
    // ============================================================
    const usdcResult = await setUSDC(config.proxy, config.usdc, admin);
    summary.usdc = usdcResult;
    
    await sleep(3000);
    
    // ============================================================
    // STEP 2: Set Price Feeds
    // ============================================================
    const feedsResult = await setPriceFeeds(config.proxy, config.priceFeeds, admin);
    summary.feeds = feedsResult;
    
    await sleep(3000);
    
    // ============================================================
    // STEP 3: Verify
    // ============================================================
    const verification = await verifyConfiguration(
      config.proxy,
      config.usdc,
      config.priceFeeds,
      admin
    );
    summary.verification = verification;
    
    // ============================================================
    // FINAL OUTPUT
    // ============================================================
    log("=".repeat(60), "section");
    
    if (verification.allVerified) {
      log("✅ ALL CONFIGURATION VERIFIED!", "success");
    } else {
      log("⚠️  SOME CONFIGURATION ISSUES DETECTED", "warning");
    }
    
    log("=".repeat(60), "section");
    
    log("\n📋 CONFIGURATION STATUS:");
    log(`  USDC:  ${verification.usdc.verified ? "✅" : "❌"} ${verification.usdc.current}`);
    
    for (const [asset, result] of Object.entries(verification.feeds)) {
      log(`  ${asset}: ${result.verified ? "✅" : "❌"} ${result.current}`);
    }
    
    log("\n✨ SYSTEM READY!");
    log(`  • Core & Types now have USDC configured`);
    log(`  • Price feeds ready for all market types`);
    log(`  • Ready to accept user bets`);
    
    log("=".repeat(60), "section");
    
  } catch (error) {
    log("=".repeat(60), "section");
    log("CONFIGURATION FAILED", "error");
    log("=".repeat(60), "section");
    log(`Error: ${error.message}`, "error");
    
    if (error.stack) {
      log(`\nStack trace:\n${error.stack}`, "error");
    }
    
    summary.error = {
      message: error.message,
      stack: error.stack
    };
    
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
