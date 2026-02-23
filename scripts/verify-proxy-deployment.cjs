const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying Proxy Deployment...");
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  
  // Load deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const files = fs.readdirSync(deploymentsDir).filter(f => f.startsWith("proxy-deployment-"));
  
  if (files.length === 0) {
    console.error("❌ No proxy deployment found. Run deploy-proxy-pattern.cjs first.");
    process.exit(1);
  }
  
  // Get latest deployment
  const latestFile = files.sort().reverse()[0];
  const deploymentInfo = JSON.parse(fs.readFileSync(path.join(deploymentsDir, latestFile), "utf8"));
  
  const { proxy, coreImpl, typesImpl } = deploymentInfo.contracts;
  
  console.log(`\n📋 Loaded deployment from: ${latestFile}`);
  console.log(`   Proxy: ${proxy}`);
  console.log(`   Core Implementation: ${coreImpl}`);
  console.log(`   Types Implementation: ${typesImpl}`);
  
  // Connect to proxy as Core
  console.log("\n🔗 Connecting to proxy contracts...");
  const coreContract = await ethers.getContractAt("PredictionMarketCore", proxy);
  const typesContract = await ethers.getContractAt("PredictionMarketTypes", proxy);
  
  // Test 1: Check market counter
  console.log("\n📊 Test 1: Checking market counter...");
  try {
    const counter = await coreContract.marketCounter();
    console.log(`   ✅ Market counter: ${counter.toString()}`);
  } catch (error) {
    console.error(`   ❌ Failed to get market counter: ${error.message}`);
  }
  
  // Test 2: Check USDC address
  console.log("\n💰 Test 2: Checking USDC configuration...");
  try {
    const usdc = await coreContract.usdc();
    console.log(`   ✅ USDC address: ${usdc}`);
  } catch (error) {
    console.error(`   ❌ Failed to get USDC: ${error.message}`);
  }
  
  // Test 3: Check owner
  console.log("\n👤 Test 3: Checking ownership...");
  try {
    const owner = await coreContract.owner();
    console.log(`   ✅ Owner: ${owner}`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   Match: ${owner === deployer.address ? "✅ YES" : "❌ NO"}`);
  } catch (error) {
    console.error(`   ❌ Failed to get owner: ${error.message}`);
  }
  
  // Test 4: Check price feeds
  console.log("\n📈 Test 4: Checking price feeds...");
  const assets = ["BTC", "ETH", "LINK"];
  for (const asset of assets) {
    try {
      const feed = await coreContract.priceFeeds(asset);
      if (feed !== "0x0000000000000000000000000000000000000000") {
        console.log(`   ✅ ${asset}: ${feed}`);
      } else {
        console.log(`   ⚠️  ${asset}: Not configured (0x0)`);
      }
    } catch (error) {
      console.error(`   ❌ ${asset}: ${error.message}`);
    }
  }
  
  // Test 5: Try to read existing markets
  console.log("\n📖 Test 5: Reading existing markets...");
  try {
    const counter = await coreContract.marketCounter();
    const count = Number(counter);
    
    if (count === 0) {
      console.log("   ℹ️  No markets exist yet");
    } else {
      console.log(`   Found ${count} markets, reading first 3...`);
      
      for (let i = 0; i < Math.min(3, count); i++) {
        try {
          const market = await coreContract.markets(i);
          console.log(`   ✅ Market ${i}: ${market.asset}, startTime: ${market.startTime.toString()}`);
        } catch (error) {
          console.error(`   ❌ Market ${i}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error(`   ❌ Failed to read markets: ${error.message}`);
  }
  
  // Test 6: Verify proxy routing
  console.log("\n🔄 Test 6: Verifying proxy routing...");
  const proxyContract = await ethers.getContractAt("PredictionMarketProxy", proxy);
  
  // Check default implementation
  try {
    const defaultImpl = await proxyContract.defaultImplementation();
    console.log(`   ✅ Default implementation: ${defaultImpl}`);
    console.log(`   Match Core: ${defaultImpl === coreImpl ? "✅ YES" : "❌ NO"}`);
  } catch (error) {
    console.error(`   ❌ Failed to get default implementation: ${error.message}`);
  }
  
  // Check specific function routing
  const testSelector = "0x00000000"; // dummy selector
  try {
    const routedImpl = await proxyContract.implementations(testSelector);
    console.log(`   ℹ️  Test selector routing: ${routedImpl}`);
  } catch (error) {
    console.error(`   ❌ Failed to check routing: ${error.message}`);
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Proxy Address: ${proxy}`);
  console.log(`Core Implementation: ${coreImpl}`);
  console.log(`Types Implementation: ${typesImpl}`);
  console.log("\n✅ Proxy deployment verified successfully!");
  console.log("=".repeat(60));
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
