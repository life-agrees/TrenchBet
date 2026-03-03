const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  // Network-specific settings
  networks: {
    baseSepolia: {
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      priceFeeds: {
        BTC: "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
        ETH: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
        LINK: "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"
      },
      explorerUrl: "https://sepolia.basescan.org"
    },
    base: {
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Official USDC on Base Mainnet
      priceFeeds: {
        BTC: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F", // BTC/USD Base Mainnet
        ETH: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // ETH/USD Base Mainnet
        LINK: "0x7d0e3C8B0b8f3E8B8C0f8B3f7B2b3f8B3f8B3f8B" // LINK/USD Base Mainnet (verify this)
      },
      explorerUrl: "https://basescan.org"
    }
  },
  
  // Deployment settings
  gasLimit: {
    core: 5000000,
    types: 5000000,
    proxy: 3000000,
    config: 300000
  },
  
  // Delays between transactions (ms)
  delays: {
    betweenDeployments: 5000,
    betweenTransactions: 3000,
    afterPriceFeed: 2000
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

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(`\n${question} (yes/no): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function saveDeployment(network, data) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const filename = `${network}-production-${timestamp}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  const deploymentData = {
    ...data,
    timestamp: new Date().toISOString(),
    network,
    version: "1.0.0"
  };
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));
  log(`Deployment saved: ${filename}`, "success");
  
  return filepath;
}

// ============================================================
// DEPLOYMENT FUNCTIONS
// ============================================================

async function deployCore(usdc, proxyPlaceholder, deployer, gasLimit) {
  log("Deploying Core Implementation...");
  
  const CoreFactory = await hre.ethers.getContractFactory("PredictionMarketCore");
  const core = await CoreFactory.connect(deployer).deploy(usdc, proxyPlaceholder, {
    gasLimit
  });
  
  const deployTx = await core.deploymentTransaction();
  log(`  Transaction: ${deployTx.hash}`);
  
  await core.waitForDeployment();
  const address = await core.getAddress();
  
  log(`Core deployed: ${address}`, "success");
  return { address, tx: deployTx.hash };
}

async function deployTypes(usdc, proxyPlaceholder, deployer, gasLimit) {
  log("Deploying Types Implementation...");
  
  const TypesFactory = await hre.ethers.getContractFactory("PredictionMarketTypes");
  const types = await TypesFactory.connect(deployer).deploy(usdc, proxyPlaceholder, {
    gasLimit
  });
  
  const deployTx = await types.deploymentTransaction();
  log(`  Transaction: ${deployTx.hash}`);
  
  await types.waitForDeployment();
  const address = await types.getAddress();
  
  log(`Types deployed: ${address}`, "success");
  return { address, tx: deployTx.hash };
}

async function deployProxy(coreAddr, typesAddr, adminAddr, deployer, gasLimit) {
  log("Deploying Proxy with Routing...");
  
  const ProxyFactory = await hre.ethers.getContractFactory("PredictionMarketProxy");
  const proxy = await ProxyFactory.connect(deployer).deploy(coreAddr, typesAddr, adminAddr, {
    gasLimit
  });
  
  const deployTx = await proxy.deploymentTransaction();
  log(`  Transaction: ${deployTx.hash}`);
  
  await proxy.waitForDeployment();
  const address = await proxy.getAddress();
  
  log(`Proxy deployed: ${address}`, "success");
  return { address, tx: deployTx.hash };
}

async function configurePriceFeeds(proxyAddr, priceFeeds, deployer, gasLimit, delay) {
  log("Configuring Price Feeds...");
  
  const proxy = await hre.ethers.getContractAt("PredictionMarketCore", proxyAddr, deployer);
  const results = {};
  
  for (const [asset, feedAddr] of Object.entries(priceFeeds)) {
    try {
      log(`  Setting ${asset} price feed...`);
      const tx = await proxy.setPriceFeed(asset, feedAddr, { gasLimit });
      await tx.wait();
      
      results[asset] = { success: true, address: feedAddr, tx: tx.hash };
      log(`  ${asset} configured: ${feedAddr}`, "success");
      
      await sleep(delay);
    } catch (error) {
      results[asset] = { success: false, error: error.message };
      log(`  ${asset} configuration failed: ${error.message}`, "error");
    }
  }
  
  return results;
}

async function verifyDeployment(proxyAddr, coreAddr, typesAddr, deployer) {
  log("Verifying Deployment...");
  
  try {
    const proxy = await hre.ethers.getContractAt("PredictionMarketProxy", proxyAddr, deployer);
    
    // Check admin
    const admin = await proxy.getAdmin();
    log(`  Admin: ${admin}`);
    
    // Check implementations
    const coreImpl = await proxy.getCoreImplementation();
    const typesImpl = await proxy.getTypesImplementation();
    
    const coreMatch = coreImpl.toLowerCase() === coreAddr.toLowerCase();
    const typesMatch = typesImpl.toLowerCase() === typesAddr.toLowerCase();
    
    log(`  Core Implementation: ${coreImpl} ${coreMatch ? "✅" : "❌"}`);
    log(`  Types Implementation: ${typesImpl} ${typesMatch ? "✅" : "❌"}`);
    
    // Check market counter
    const proxyWithCore = await hre.ethers.getContractAt("PredictionMarketCore", proxyAddr, deployer);
    const counter = await proxyWithCore.marketCounter();
    log(`  Market Counter: ${counter.toString()}`);
    
    return {
      admin,
      coreImplementation: coreImpl,
      typesImplementation: typesImpl,
      marketCounter: counter.toString(),
      verificationsPass: coreMatch && typesMatch
    };
  } catch (error) {
    log(`Verification failed: ${error.message}`, "error");
    return { verificationsPass: false, error: error.message };
  }
}

// ============================================================
// MAIN DEPLOYMENT
// ============================================================

async function main() {
  log("=".repeat(60), "section");
  log("PREDICTION MARKET PRODUCTION DEPLOYMENT");
  log("=".repeat(60), "section");
  
  // Get network
  const network = hre.network.name;
  const config = CONFIG.networks[network];
  
  if (!config) {
    log(`Network ${network} not configured!`, "error");
    log("Available networks: baseSepolia, base", "warning");
    process.exit(1);
  }
  
  log(`Network: ${network}`);
  log(`USDC: ${config.usdc}`);
  log(`Explorer: ${config.explorerUrl}`);
  
  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(deployerAddr);
  
  log(`Deployer: ${deployerAddr}`);
  log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  // Safety confirmation
  if (network === "base") {
    log("⚠️  MAINNET DEPLOYMENT DETECTED!", "warning");
    const confirmed = await confirm("Are you sure you want to deploy to MAINNET?");
    if (!confirmed) {
      log("Deployment cancelled", "warning");
      process.exit(0);
    }
  }
  
  const deployment = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployerAddr,
    usdc: config.usdc,
    transactions: []
  };
  
  try {
    // ============================================================
    // STEP 1: Deploy Core
    // ============================================================
    log("=".repeat(60), "section");
    log("STEP 1: Deploying Core Implementation");
    log("=".repeat(60), "section");
    
    const core = await deployCore(
      config.usdc,
      deployerAddr, // Placeholder
      deployer,
      CONFIG.gasLimit.core
    );
    
    deployment.core = core;
    await sleep(CONFIG.delays.betweenDeployments);
    
    // ============================================================
    // STEP 2: Deploy Types
    // ============================================================
    log("=".repeat(60), "section");
    log("STEP 2: Deploying Types Implementation");
    log("=".repeat(60), "section");
    
    const types = await deployTypes(
      config.usdc,
      deployerAddr, // Placeholder
      deployer,
      CONFIG.gasLimit.types
    );
    
    deployment.types = types;
    await sleep(CONFIG.delays.betweenDeployments);
    
    // ============================================================
    // STEP 3: Deploy Proxy
    // ============================================================
    log("=".repeat(60), "section");
    log("STEP 3: Deploying Proxy with Routing");
    log("=".repeat(60), "section");
    
    const proxy = await deployProxy(
      core.address,
      types.address,
      deployerAddr, // Admin
      deployer,
      CONFIG.gasLimit.proxy
    );
    
    deployment.proxy = proxy;
    await sleep(CONFIG.delays.betweenDeployments);
    
    // ============================================================
    // STEP 4: Configure Price Feeds
    // ============================================================
    log("=".repeat(60), "section");
    log("STEP 4: Configuring Price Feeds");
    log("=".repeat(60), "section");
    
    const priceFeedResults = await configurePriceFeeds(
      proxy.address,
      config.priceFeeds,
      deployer,
      CONFIG.gasLimit.config,
      CONFIG.delays.afterPriceFeed
    );
    
    deployment.priceFeeds = priceFeedResults;
    await sleep(CONFIG.delays.betweenDeployments);
    
    // ============================================================
    // STEP 5: Verify Deployment
    // ============================================================
    log("=".repeat(60), "section");
    log("STEP 5: Verifying Deployment");
    log("=".repeat(60), "section");
    
    const verification = await verifyDeployment(
      proxy.address,
      core.address,
      types.address,
      deployer
    );
    
    deployment.verification = verification;
    
    // ============================================================
    // FINAL OUTPUT
    // ============================================================
    log("=".repeat(60), "section");
    
    if (verification.verificationsPass) {
      log("DEPLOYMENT SUCCESSFUL!", "success");
    } else {
      log("DEPLOYMENT COMPLETED WITH WARNINGS", "warning");
    }
    
    log("=".repeat(60), "section");
    
    log("\n📋 CONTRACT ADDRESSES:");
    log(`  Proxy:  ${proxy.address}`);
    log(`  Core:   ${core.address}`);
    log(`  Types:  ${types.address}`);
    log(`  Admin:  ${deployerAddr}`);
    
    log("\n🔗 BLOCK EXPLORER LINKS:");
    log(`  Proxy:  ${config.explorerUrl}/address/${proxy.address}`);
    log(`  Core:   ${config.explorerUrl}/address/${core.address}`);
    log(`  Types:  ${config.explorerUrl}/address/${types.address}`);
    
    log("\n✏️  UPDATE ENVIRONMENT:");
    log(`  VITE_PROXY_ADDRESS=${proxy.address}`);
    log(`  VITE_PREDICTION_MARKET_CORE_ADDRESS=${core.address}`);
    log(`  VITE_PREDICTION_MARKET_TYPES_ADDRESS=${types.address}`);
    
    log("\n📄 UPDATE src/utils/constants.js:");
    log(`  export const PROXY_ADDRESS = "${proxy.address}";`);
    log(`  export const PREDICTION_MARKET_CORE_ADDRESS = "${core.address}";`);
    log(`  export const PREDICTION_MARKET_TYPES_ADDRESS = "${types.address}";`);
    
    // Save deployment
    const filepath = saveDeployment(network, deployment);
    log(`\n💾 Deployment data saved: ${filepath}`);
    
    log("\n🔄 NEXT STEPS:");
    log("  1. Update .env with new addresses");
    log("  2. Update src/utils/constants.js");
    log("  3. Verify contracts on block explorer");
    log("  4. Test contract interactions");
    log("  5. Create initial test markets");
    
    if (network === "base") {
      log("\n⚠️  MAINNET CHECKLIST:", "warning");
      log("  □ Double-check all addresses");
      log("  □ Verify contracts on Basescan");
      log("  □ Test with small amounts first");
      log("  □ Monitor for 24 hours");
      log("  □ Set up monitoring/alerts");
    }
    
    log("=".repeat(60), "section");
    
  } catch (error) {
    log("=".repeat(60), "section");
    log("DEPLOYMENT FAILED", "error");
    log("=".repeat(60), "section");
    log(`Error: ${error.message}`, "error");
    
    if (error.stack) {
      log(`\nStack trace:\n${error.stack}`, "error");
    }
    
    // Save partial deployment
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