/**
 * Deploy Fixed Implementations
 * 
 * This script deploys the fixed PredictionMarketCore and PredictionMarketTypes
 * contracts that are compatible with the proxy pattern (no Ownable storage collision).
 * 
 * After deployment, you'll need to upgrade the proxy to use these new implementations.
 */

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("========================================");
  console.log("🔧 DEPLOYING FIXED IMPLEMENTATIONS");
  console.log("========================================\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`Deployer: ${deployerAddress}`);
  
  // Get network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  
  // Contract addresses (Base Sepolia)
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const PROXY = "0x804F5711BA094BF5faf9aBc8bE02983662C2C034";
  
  console.log(`\nUsing addresses:`);
  console.log(`  USDC: ${USDC}`);
  console.log(`  PROXY: ${PROXY}`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`\nDeployer balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Low balance! You may need more ETH for gas.");

  }

  // ==========================================
  // STEP 1: Deploy PredictionMarketCore (Fixed)
  // ==========================================
  console.log("\n----------------------------------------");
  console.log("STEP 1: Deploying PredictionMarketCore (Fixed)");
  console.log("----------------------------------------");
  
  try {
    const CoreFactory = await ethers.getContractFactory("PredictionMarketCore");
    console.log("Deploying Core implementation...");
    
    const core = await CoreFactory.deploy(USDC, PROXY);
    await core.waitForDeployment();
    
    const coreAddress = await core.getAddress();
    console.log(`✅ Core deployed: ${coreAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: Number(network.chainId),
      timestamp: new Date().toISOString(),
      deployer: deployerAddress,
      contracts: {
        core: coreAddress,
        proxy: PROXY,
        usdc: USDC
      }
    };
    
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const filename = `fixed-core-deployment-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentsDir, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`📄 Deployment saved: deployments/${filename}`);
    
    // ==========================================
    // STEP 2: Verify Core is readable
    // ==========================================
    console.log("\n----------------------------------------");
    console.log("STEP 2: Verifying Core Deployment");
    console.log("----------------------------------------");
    
    // Check if we can read from the contract
    const marketCounter = await core.marketCounter();
    console.log(`✅ Core marketCounter: ${marketCounter}`);
    
    const owner = await core.owner();
    console.log(`✅ Core owner(): ${owner}`);
    
    const admin = await core.getAdmin();
    console.log(`✅ Core getAdmin(): ${admin}`);
    
    // Verify admin matches proxy
    if (admin.toLowerCase() !== PROXY.toLowerCase()) {
      console.warn(`⚠️  Warning: Core admin (${admin}) doesn't match proxy (${PROXY})`);
    } else {
      console.log(`✅ Core admin matches proxy address`);
    }

    // ==========================================
    // STEP 3: Test ownership check
    // ==========================================
    console.log("\n----------------------------------------");
    console.log("STEP 3: Testing Ownership Check");
    console.log("----------------------------------------");
    
    // Check if deployer is owner (should be false since proxy is owner)
    const isOwner = await core.isOwner(deployerAddress);
    console.log(`Is deployer owner? ${isOwner}`);
    
    // Check if proxy is owner (should be true)
    const isProxyOwner = await core.isOwner(PROXY);
    console.log(`Is proxy owner? ${isProxyOwner}`);

    // ==========================================
    // STEP 4: Upgrade Proxy to New Core
    // ==========================================
    console.log("\n----------------------------------------");
    console.log("STEP 4: Upgrading Proxy to New Core");
    console.log("----------------------------------------");
    
    // Connect to proxy with deployer (IMPORTANT: must use deployer as signer)
    const ProxyFactory = await ethers.getContractFactory("PredictionMarketProxy");
    const proxy = ProxyFactory.attach(PROXY).connect(deployer);
    
    // Check current implementation
    const currentImpl = await proxy.defaultImplementation();
    console.log(`Current implementation: ${currentImpl}`);
    
    // Check proxy owner
    const proxyOwner = await proxy.owner();
    console.log(`Proxy owner: ${proxyOwner}`);
    console.log(`Deployer address: ${deployerAddress}`);
    
    if (proxyOwner.toLowerCase() !== deployerAddress.toLowerCase()) {
      console.error(`\n❌ DEPLOYER IS NOT PROXY OWNER!`);
      console.error(`   Proxy owner: ${proxyOwner}`);
      console.error(`   Your address: ${deployerAddress}`);
      console.error(`\n   You cannot upgrade the proxy. Options:`);
      console.error(`   1. Use the owner account to run this script`);
      console.error(`   2. Transfer proxy ownership to your deployer first`);
      console.error(`   3. Ask the current owner to run the upgrade`);
      process.exit(1);
    }
    
    // Upgrade to new implementation
    console.log(`\nUpgrading to: ${coreAddress}`);
    try {
      const upgradeTx = await proxy.upgradeTo(coreAddress);
      console.log(`   Transaction sent: ${upgradeTx.hash}`);
      const receipt = await upgradeTx.wait();
      console.log(`   Transaction confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`\n❌ Upgrade transaction failed: ${error.message}`);
      if (error.message.includes("Ownable")) {
        console.error(`   This is an ownership error - you are not the proxy owner`);
      }
      process.exit(1);
    }
    
    const newImpl = await proxy.defaultImplementation();
    console.log(`\n✅ New implementation: ${newImpl}`);
    
    if (newImpl.toLowerCase() === coreAddress.toLowerCase()) {
      console.log("✅ Upgrade successful!");
    } else {
      console.error("❌ Upgrade failed - implementation didn't change");
      process.exit(1);
    }


    // ==========================================
    // STEP 5: Test Market Creation Through Proxy
    // ==========================================
    console.log("\n----------------------------------------");
    console.log("STEP 5: Testing Market Creation Through Proxy");
    console.log("----------------------------------------");
    
    // Get proxy owner
    const proxyOwner = await proxy.owner();
    console.log(`Proxy owner: ${proxyOwner}`);
    
    // Check if deployer is proxy owner
    if (proxyOwner.toLowerCase() !== deployerAddress.toLowerCase()) {
      console.log(`\n⚠️  IMPORTANT: You are not the proxy owner!`);
      console.log(`   Proxy owner: ${proxyOwner}`);
      console.log(`   Your address: ${deployerAddress}`);
      console.log(`\n   To test market creation, you need to:`);
      console.log(`   1. Connect to Hardhat console with the owner private key:`);
      console.log(`      npx hardhat console --network baseSepolia`);
      console.log(`   2. Run the test commands from PROXY_PATTERN_FIX_GUIDE.md`);
    } else {
      console.log("✅ You are the proxy owner! Testing market creation...");
      
      try {
        // Test createMarketWithOdds through proxy
        const proxyAsCore = CoreFactory.attach(PROXY);
        
        // First check if price feed is set
        try {
          const btcPrice = await proxyAsCore.getCurrentPrice("BTC");
          console.log(`✅ BTC Price feed working: $${ethers.formatUnits(btcPrice, 8)}`);
        } catch (e) {
          console.log(`⚠️  Price feed not set for BTC. Run configure-price-feeds first.`);
        }
        
        // Try to create a market
        console.log("\nAttempting to create test market...");
        const createTx = await proxyAsCore.createMarketWithOdds(
          "BTC",           // asset
          900,             // duration (15 minutes)
          200,             // yesMultiplier (2.0x)
          200,             // noMultiplier (2.0x)
          false,           // useTimeDecay
          50,              // decayStartPercent
          120              // minMultiplier
        );
        
        const receipt = await createTx.wait();
        console.log(`✅ Market created! Tx: ${receipt.hash}`);
        
        // Check market counter
        const newCounter = await proxyAsCore.marketCounter();
        console.log(`✅ New market counter: ${newCounter}`);
        
      } catch (error) {
        console.error(`❌ Market creation failed: ${error.message}`);
        console.log("\nTroubleshooting:");
        console.log("1. Check if price feed is configured for BTC");
        console.log("2. Verify you have enough ETH for gas");
        console.log("3. Check proxy ownership");
      }
    }

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    console.log("\n========================================");
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("========================================");
    console.log(`New Core Implementation: ${coreAddress}`);
    console.log(`Proxy Address: ${PROXY}`);
    console.log(`Proxy Owner: ${proxyOwner}`);
    console.log("");
    console.log("✅ Fixed implementation deployed and proxy upgraded!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Test market creation through the frontend");
    console.log("2. If issues persist, check PROXY_PATTERN_FIX_GUIDE.md");
    console.log("3. Deploy PredictionMarketTypes if needed for multi/range/time markets");
    console.log("========================================");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
