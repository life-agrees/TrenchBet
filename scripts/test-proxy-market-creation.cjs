const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Market Creation Through Proxy...");
  
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
  const { proxy } = deploymentInfo.contracts;
  
  console.log(`\n📋 Using proxy at: ${proxy}`);
  
  // Connect to proxy as Core
  const coreContract = await ethers.getContractAt("PredictionMarketCore", proxy);
  
  // Check initial state
  console.log("\n📊 Initial State:");
  const initialCounter = await coreContract.marketCounter();
  console.log(`   Market counter: ${initialCounter.toString()}`);
  
  // Test 1: Create a binary market
  console.log("\n🎯 Test 1: Creating Binary Market...");
  try {
    const tx = await coreContract.createMarketWithOdds(
      "BTC",           // asset
      900,             // duration (15 minutes)
      200,             // yesMultiplier (2.00x)
      200,             // noMultiplier (2.00x)
      false,           // useTimeDecay
      50,              // decayStartPercent
      120              // minMultiplier
    );
    
    const receipt = await tx.wait();
    console.log(`   ✅ Market created! Tx: ${receipt.hash}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    // Parse event to get market ID
    const event = receipt.logs.find(
      log => {
        try {
          const parsed = coreContract.interface.parseLog(log);
          return parsed && parsed.name === "MarketCreated";
        } catch (e) {
          return false;
        }
      }
    );
    
    if (event) {
      const parsedEvent = coreContract.interface.parseLog(event);
      console.log(`   📈 Market ID: ${parsedEvent.args.marketId.toString()}`);
      console.log(`   Asset: ${parsedEvent.args.asset}`);
      console.log(`   End Time: ${parsedEvent.args.endTime.toString()}`);
    }
  } catch (error) {
    console.error(`   ❌ Failed to create market: ${error.message}`);
    if (error.reason) console.error(`   Reason: ${error.reason}`);
  }
  
  // Check state after creation
  console.log("\n📊 State After Creation:");
  const afterCounter = await coreContract.marketCounter();
  console.log(`   Market counter: ${afterCounter.toString()}`);
  
  // Test 2: Read the newly created market
  console.log("\n📖 Test 2: Reading Created Market...");
  try {
    const marketId = Number(initialCounter); // First market ID
    const market = await coreContract.markets(marketId);
    
    console.log(`   ✅ Market ${marketId} data:`);
    console.log(`      - Asset: ${market.asset}`);
    console.log(`      - Type: ${market.marketType}`);
    console.log(`      - Start Time: ${market.startTime.toString()}`);
    console.log(`      - End Time: ${market.endTime.toString()}`);
    console.log(`      - Start Price: ${market.startPrice.toString()}`);
    console.log(`      - Resolved: ${market.resolved}`);
    console.log(`      - Use Fixed Odds: ${market.useFixedOdds}`);
    console.log(`      - Yes Multiplier: ${market.yesMultiplier.toString()}`);
    console.log(`      - No Multiplier: ${market.noMultiplier.toString()}`);
    
    // Verify market data is valid
    const isValid = market.startTime > 0 && market.endTime > market.startTime;
    console.log(`   ✅ Market data valid: ${isValid ? "YES" : "NO"}`);
    
  } catch (error) {
    console.error(`   ❌ Failed to read market: ${error.message}`);
  }
  
  // Test 3: Create multiple markets
  console.log("\n🎯 Test 3: Creating Multiple Markets...");
  const marketsToCreate = 3;
  
  for (let i = 0; i < marketsToCreate; i++) {
    try {
      const tx = await coreContract.createMarketWithOdds(
        "ETH",           // asset
        1800,            // duration (30 minutes)
        250,             // yesMultiplier (2.50x)
        150,             // noMultiplier (1.50x)
        true,            // useTimeDecay
        50,              // decayStartPercent
        120              // minMultiplier
      );
      
      const receipt = await tx.wait();
      console.log(`   ✅ Market ${i + 2} created! Gas: ${receipt.gasUsed.toString()}`);
    } catch (error) {
      console.error(`   ❌ Failed to create market ${i + 2}: ${error.message}`);
    }
  }
  
  // Final state check
  console.log("\n📊 Final State:");
  const finalCounter = await coreContract.marketCounter();
  console.log(`   Market counter: ${finalCounter.toString()}`);
  console.log(`   Markets created: ${Number(finalCounter) - Number(initialCounter)}`);
  
  // Test 4: Read all markets
  console.log("\n📖 Test 4: Reading All Markets...");
  const count = Number(finalCounter);
  
  for (let i = 0; i < count; i++) {
    try {
      const market = await coreContract.markets(i);
      const status = market.startTime > 0 ? "✅ VALID" : "❌ INVALID";
      console.log(`   Market ${i}: ${market.asset} - ${status}`);
    } catch (error) {
      console.error(`   ❌ Market ${i}: ${error.message}`);
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Initial markets: ${initialCounter.toString()}`);
  console.log(`Final markets: ${finalCounter.toString()}`);
  console.log(`New markets created: ${Number(finalCounter) - Number(initialCounter)}`);
  console.log("\n✅ Proxy market creation test complete!");
  console.log("=".repeat(60));
  
  // Verify all markets are accessible
  let allValid = true;
  for (let i = 0; i < count; i++) {
    try {
      const market = await coreContract.markets(i);
      if (market.startTime === 0n) {
        allValid = false;
        console.error(`❌ Market ${i} has invalid data!`);
      }
    } catch (error) {
      allValid = false;
      console.error(`❌ Market ${i} cannot be read: ${error.message}`);
    }
  }
  
  if (allValid) {
    console.log("\n🎉 SUCCESS! All markets are accessible and valid!");
    console.log("The proxy pattern is working correctly.");
  } else {
    console.log("\n⚠️  WARNING: Some markets have issues.");
    console.log("Please check the contract implementation.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
