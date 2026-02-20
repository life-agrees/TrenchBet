// scripts/verify-ownership.cjs
// Verify that all contracts have the correct owner
// Usage: npx hardhat run scripts/verify-ownership.cjs --network baseSepolia

require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("═".repeat(70));
  console.log("🔍 TRENCHYBET OWNERSHIP VERIFICATION");
  console.log("═".repeat(70));
  console.log("");

  const EXPECTED_OWNER = process.env.OWNER_ADDRESS;
  
  if (!EXPECTED_OWNER) {
    console.error("❌ ERROR: OWNER_ADDRESS not set in .env file");
    process.exit(1);
  }

  const network = hre.network.name;
  
  console.log("📊 VERIFICATION DETAILS");
  console.log("─".repeat(70));
  console.log(`Network:         ${network}`);
  console.log(`Expected Owner:  ${EXPECTED_OWNER}`);
  console.log("");

  // List of all contracts
  const contracts = [
    {
      name: "PredictionMarketCore",
      address: process.env.VITE_PREDICTION_MARKET_CORE_ADDRESS,
      priority: "CRITICAL",
    },
    {
      name: "PredictionMarketTypes",
      address: process.env.VITE_PREDICTION_MARKET_TYPES_ADDRESS,
      priority: "CRITICAL",
    },
    {
      name: "ChainlinkResolver",
      address: process.env.VITE_CHAINLINK_RESOLVER_ADDRESS,
      priority: "HIGH",
    },
    {
      name: "TrenchyStaking",
      address: process.env.VITE_STAKING_CONTRACT_ADDRESS,
      priority: "HIGH",
    },
    {
      name: "TrenchyReferrals",
      address: process.env.VITE_REFERRALS_CONTRACT_ADDRESS,
      priority: "MEDIUM",
    },
    {
      name: "TrenchyAchievements",
      address: process.env.VITE_ACHIEVEMENTS_CONTRACT_ADDRESS,
      priority: "MEDIUM",
    },
    {
      name: "TrenchyStreaks",
      address: process.env.VITE_STREAKS_CONTRACT_ADDRESS,
      priority: "LOW",
    },
    {
      name: "LaunchAirdrop",
      address: process.env.VITE_AIRDROP_CONTRACT_ADDRESS,
      priority: "MEDIUM",
    },
    {
      name: "TrenchyPointsClaim",
      address: process.env.VITE_CLAIMS_CONTRACT_ADDRESS,
      priority: "HIGH",
    },
  ];

  console.log("📋 CHECKING OWNERSHIP");
  console.log("─".repeat(70));
  console.log("");

  let correctCount = 0;
  let incorrectCount = 0;
  let skipCount = 0;
  let failedCount = 0;
  const results = [];

  for (const contract of contracts) {
    // Skip if not deployed
    if (!contract.address || contract.address === "0x0000000000000000000000000000000000000000") {
      console.log(`⏭️  ${contract.name.padEnd(30)} - NOT DEPLOYED`);
      skipCount++;
      continue;
    }

    try {
      // Get contract instance
      const instance = await hre.ethers.getContractAt(
        "Ownable", 
        contract.address
      );

      // Get current owner
      const currentOwner = await instance.owner();
      
      // Check if owner is correct
      const isCorrect = currentOwner.toLowerCase() === EXPECTED_OWNER.toLowerCase();
      
      if (isCorrect) {
        console.log(`✅ ${contract.name.padEnd(30)} - ${currentOwner}`);
        correctCount++;
        results.push({ 
          name: contract.name, 
          status: "CORRECT", 
          address: contract.address,
          owner: currentOwner,
          priority: contract.priority
        });
      } else {
        console.log(`❌ ${contract.name.padEnd(30)} - ${currentOwner}`);
        console.log(`   └─ Expected: ${EXPECTED_OWNER}`);
        incorrectCount++;
        results.push({ 
          name: contract.name, 
          status: "INCORRECT", 
          address: contract.address,
          owner: currentOwner,
          expected: EXPECTED_OWNER,
          priority: contract.priority
        });
      }
      
    } catch (error) {
      console.log(`⚠️  ${contract.name.padEnd(30)} - FAILED TO CHECK`);
      console.log(`   └─ Error: ${error.message}`);
      failedCount++;
      results.push({ 
        name: contract.name, 
        status: "FAILED", 
        address: contract.address,
        error: error.message,
        priority: contract.priority
      });
    }
  }

  console.log("");
  console.log("═".repeat(70));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("═".repeat(70));
  console.log("");
  console.log(`✅ Correct Owner:     ${correctCount}`);
  console.log(`❌ Incorrect Owner:   ${incorrectCount}`);
  console.log(`⚠️  Failed to Check:   ${failedCount}`);
  console.log(`⏭️  Skipped:           ${skipCount}`);
  console.log(`📊 Total:             ${contracts.length}`);
  console.log("");

  // Show detailed issues if any
  if (incorrectCount > 0) {
    console.log("═".repeat(70));
    console.log("⚠️  INCORRECT OWNERSHIP DETAILS");
    console.log("═".repeat(70));
    console.log("");
    
    results
      .filter(r => r.status === "INCORRECT")
      .forEach(result => {
        console.log(`❌ ${result.name} [${result.priority}]`);
        console.log(`   Address:  ${result.address}`);
        console.log(`   Current:  ${result.owner}`);
        console.log(`   Expected: ${result.expected}`);
        console.log("");
      });
    
    console.log("🔧 ACTION REQUIRED:");
    console.log("   Run transfer-ownership.cjs script to fix these contracts");
    console.log("");
  }

  if (failedCount > 0) {
    console.log("═".repeat(70));
    console.log("⚠️  FAILED CHECKS");
    console.log("═".repeat(70));
    console.log("");
    
    results
      .filter(r => r.status === "FAILED")
      .forEach(result => {
        console.log(`⚠️  ${result.name}`);
        console.log(`   Address: ${result.address}`);
        console.log(`   Error:   ${result.error}`);
        console.log("");
      });
  }

  // Overall status
  console.log("═".repeat(70));
  
  if (incorrectCount === 0 && failedCount === 0 && correctCount > 0) {
    console.log("✅ SUCCESS: All contracts have the correct owner!");
    console.log("");
    console.log("🎯 NEXT STEPS:");
    console.log("   1. Secure the old deployer wallet private key");
    console.log("   2. Test admin functions with new owner wallet");
    console.log("   3. Update deployment documentation");
  } else if (incorrectCount > 0) {
    console.log("❌ FAILURE: Some contracts have incorrect owners!");
    console.log("");
    console.log("🔧 REQUIRED ACTION:");
    console.log("   Run: npx hardhat run scripts/transfer-ownership.cjs --network", network);
  } else if (failedCount > 0) {
    console.log("⚠️  WARNING: Could not verify some contracts");
    console.log("");
    console.log("🔍 CHECK:");
    console.log("   1. Contract addresses in .env are correct");
    console.log("   2. Network RPC is working");
    console.log("   3. Contracts are deployed");
  }
  
  console.log("═".repeat(70));

  // Export results to JSON for automation
  const fs = require('fs');
  const resultsFile = `ownership-verification-${network}-${Date.now()}.json`;
  
  const report = {
    network,
    timestamp: new Date().toISOString(),
    expectedOwner: EXPECTED_OWNER,
    summary: {
      correct: correctCount,
      incorrect: incorrectCount,
      failed: failedCount,
      skipped: skipCount,
      total: contracts.length
    },
    results: results
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${resultsFile}`);
  console.log("");

  // Exit with error code if there are issues
  if (incorrectCount > 0 || failedCount > 0) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 FATAL ERROR:");
    console.error(error);
    process.exit(1);
  });
