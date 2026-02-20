// scripts/transfer-ownership.cjs
// Transfer ownership of all TrenchyBet contracts to a new owner wallet
// Usage: npx hardhat run scripts/transfer-ownership.cjs --network baseSepolia

require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("═".repeat(70));
  console.log("🔐 TRENCHYBET OWNERSHIP TRANSFER SCRIPT");
  console.log("═".repeat(70));
  console.log("");

  // Get new owner address from environment
  const NEW_OWNER = process.env.OWNER_ADDRESS;
  
  if (!NEW_OWNER) {
    console.error("❌ ERROR: OWNER_ADDRESS not set in .env file");
    console.log("💡 Add this to your .env:");
    console.log("   OWNER_ADDRESS=0x...");
    process.exit(1);
  }

  // Validate address format
  if (!hre.ethers.isAddress(NEW_OWNER)) {
    console.error("❌ ERROR: Invalid address format for OWNER_ADDRESS");
    console.log(`   Given: ${NEW_OWNER}`);
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  
  console.log("📊 DEPLOYMENT DETAILS");
  console.log("─".repeat(70));
  console.log(`Network:        ${network}`);
  console.log(`Current Owner:  ${deployer.address}`);
  console.log(`New Owner:      ${NEW_OWNER}`);
  console.log("");

  // Check if new owner is same as deployer
  if (deployer.address.toLowerCase() === NEW_OWNER.toLowerCase()) {
    console.log("⚠️  WARNING: New owner is same as deployer!");
    console.log("   This defeats the purpose of transferring ownership.");
    console.log("");
  }

  // Get balance of new owner
  try {
    const balance = await hre.ethers.provider.getBalance(NEW_OWNER);
    console.log(`💰 New Owner Balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      console.log("⚠️  WARNING: New owner has 0 ETH!");
      console.log("   Send some ETH for future gas costs.");
    }
    console.log("");
  } catch (error) {
    console.log("⚠️  Could not check new owner balance");
    console.log("");
  }

  // List of all contracts to transfer
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

  console.log("📋 CONTRACTS TO TRANSFER");
  console.log("─".repeat(70));
  
  let validContracts = 0;
  contracts.forEach(contract => {
    if (contract.address && contract.address !== "0x0000000000000000000000000000000000000000") {
      console.log(`   [${contract.priority}] ${contract.name}`);
      console.log(`   └─ ${contract.address}`);
      validContracts++;
    } else {
      console.log(`   [SKIP] ${contract.name} - Not deployed`);
    }
  });
  
  console.log("");
  console.log(`Total contracts to transfer: ${validContracts}`);
  console.log("");

  // Confirmation prompt (in production, you might want to add readline here)
  console.log("⚠️  FINAL WARNING");
  console.log("─".repeat(70));
  console.log("This action is IRREVERSIBLE!");
  console.log("Once transferred, only the new owner can control these contracts.");
  console.log("");
  console.log("Press Ctrl+C now to cancel, or wait 5 seconds to continue...");
  console.log("");

  // 5 second delay
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("🚀 Starting ownership transfer...");
  console.log("");

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const results = [];

  for (const contract of contracts) {
    // Skip if not deployed
    if (!contract.address || contract.address === "0x0000000000000000000000000000000000000000") {
      console.log(`⏭️  Skipping ${contract.name} (not deployed)`);
      console.log("");
      skipCount++;
      continue;
    }

    console.log("─".repeat(70));
    console.log(`🔄 Processing: ${contract.name}`);
    console.log(`   Address: ${contract.address}`);
    console.log(`   Priority: ${contract.priority}`);

    try {
      // Get contract instance using Ownable interface
      const instance = await hre.ethers.getContractAt(
        "Ownable", 
        contract.address
      );

      // Check current owner
      const currentOwner = await instance.owner();
      console.log(`   Current Owner: ${currentOwner}`);

      // Check if already transferred
      if (currentOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
        console.log(`   ✅ Already owned by new owner - SKIPPING`);
        console.log("");
        successCount++;
        results.push({ 
          name: contract.name, 
          status: "ALREADY_TRANSFERRED", 
          address: contract.address 
        });
        continue;
      }

      // Check if deployer is current owner
      if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log(`   ⚠️  Not owned by deployer! Current owner: ${currentOwner}`);
        console.log(`   ❌ SKIPPING - Cannot transfer`);
        console.log("");
        failCount++;
        results.push({ 
          name: contract.name, 
          status: "NOT_OWNER", 
          address: contract.address,
          currentOwner 
        });
        continue;
      }

      // Transfer ownership
      console.log(`   ⏳ Transferring ownership to ${NEW_OWNER}...`);
      const tx = await instance.transferOwnership(NEW_OWNER);
      console.log(`   📝 Transaction hash: ${tx.hash}`);
      
      console.log(`   ⏳ Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      
      // Verify new owner
      const newOwner = await instance.owner();
      
      if (newOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
        console.log(`   ✅ VERIFIED: New owner is correct`);
        console.log(`   ✓ ${newOwner}`);
        successCount++;
        results.push({ 
          name: contract.name, 
          status: "SUCCESS", 
          address: contract.address,
          txHash: tx.hash 
        });
      } else {
        console.log(`   ❌ VERIFICATION FAILED: Owner is ${newOwner}`);
        failCount++;
        results.push({ 
          name: contract.name, 
          status: "VERIFICATION_FAILED", 
          address: contract.address,
          actualOwner: newOwner 
        });
      }
      
      console.log("");
      
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      console.log("");
      failCount++;
      results.push({ 
        name: contract.name, 
        status: "FAILED", 
        address: contract.address,
        error: error.message 
      });
    }
  }

  // Final summary
  console.log("═".repeat(70));
  console.log("📊 OWNERSHIP TRANSFER SUMMARY");
  console.log("═".repeat(70));
  console.log("");
  console.log(`Network:           ${network}`);
  console.log(`New Owner:         ${NEW_OWNER}`);
  console.log("");
  console.log("Results:");
  console.log(`   ✅ Successfully transferred:  ${successCount}`);
  console.log(`   ❌ Failed:                    ${failCount}`);
  console.log(`   ⏭️  Skipped:                   ${skipCount}`);
  console.log(`   📊 Total processed:           ${contracts.length}`);
  console.log("");

  // Detailed results
  if (results.length > 0) {
    console.log("Detailed Results:");
    console.log("─".repeat(70));
    results.forEach(result => {
      const statusEmoji = result.status === "SUCCESS" || result.status === "ALREADY_TRANSFERRED" 
        ? "✅" 
        : "❌";
      console.log(`${statusEmoji} ${result.name}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Address: ${result.address}`);
      if (result.txHash) console.log(`   TX: ${result.txHash}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.currentOwner) console.log(`   Current Owner: ${result.currentOwner}`);
      console.log("");
    });
  }

  // Next steps
  console.log("═".repeat(70));
  console.log("🎯 NEXT STEPS");
  console.log("═".repeat(70));
  console.log("");
  
  if (failCount === 0) {
    console.log("✅ All contracts successfully transferred!");
    console.log("");
    console.log("1. Run verification script:");
    console.log("   npx hardhat run scripts/verify-ownership.cjs --network", network);
    console.log("");
    console.log("2. Update your deployment scripts to use new owner");
    console.log("");
    console.log("3. Secure the deployer wallet private key (remove from .env)");
    console.log("");
    console.log("4. Test admin functions with new owner wallet");
  } else {
    console.log("⚠️  Some transfers failed!");
    console.log("");
    console.log("1. Review the errors above");
    console.log("2. Fix any issues");
    console.log("3. Run this script again");
    console.log("");
  }
  
  console.log("═".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 FATAL ERROR:");
    console.error(error);
    process.exit(1);
  });
