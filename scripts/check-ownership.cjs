// scripts/check-ownership.cjs
// Quick check of current contract ownership (no verification, just info)
// Usage: npx hardhat run scripts/check-ownership.cjs --network baseSepolia

require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("🔍 Current Ownership Status\n");

  const contracts = [
    { name: "PredictionMarketCore", address: process.env.VITE_PREDICTION_MARKET_CORE_ADDRESS },
    { name: "PredictionMarketTypes", address: process.env.VITE_PREDICTION_MARKET_TYPES_ADDRESS },
    { name: "ChainlinkResolver", address: process.env.VITE_CHAINLINK_RESOLVER_ADDRESS },
    { name: "TrenchyStaking", address: process.env.VITE_STAKING_CONTRACT_ADDRESS },
    { name: "TrenchyReferrals", address: process.env.VITE_REFERRALS_CONTRACT_ADDRESS },
    { name: "TrenchyAchievements", address: process.env.VITE_ACHIEVEMENTS_CONTRACT_ADDRESS },
    { name: "TrenchyStreaks", address: process.env.VITE_STREAKS_CONTRACT_ADDRESS },
    { name: "LaunchAirdrop", address: process.env.VITE_AIRDROP_CONTRACT_ADDRESS },
    { name: "TrenchyPointsClaim", address: process.env.VITE_CLAIMS_CONTRACT_ADDRESS },
  ];

  const [deployer] = await hre.ethers.getSigners();
  const expectedOwner = process.env.OWNER_ADDRESS;

  console.log(`Network:        ${hre.network.name}`);
  console.log(`Deployer:       ${deployer.address}`);
  console.log(`Expected Owner: ${expectedOwner}\n`);

  for (const contract of contracts) {
    if (!contract.address || contract.address === "0x0000000000000000000000000000000000000000") {
      console.log(`⏭️  ${contract.name.padEnd(30)} - Not deployed`);
      continue;
    }

    try {
      const instance = await hre.ethers.getContractAt("Ownable", contract.address);
      const owner = await instance.owner();
      
      let status = "";
      if (owner.toLowerCase() === deployer.address.toLowerCase()) {
        status = "🟡 Deployer";
      } else if (owner.toLowerCase() === expectedOwner?.toLowerCase()) {
        status = "✅ Owner";
      } else {
        status = "⚠️  Unknown";
      }
      
      console.log(`${status} ${contract.name.padEnd(27)} ${owner}`);
    } catch (error) {
      console.log(`❌ ${contract.name.padEnd(30)} - Error: ${error.message.substring(0, 40)}`);
    }
  }
  
  console.log("\nLegend:");
  console.log("  ✅ Owner     = Controlled by OWNER_ADDRESS");
  console.log("  🟡 Deployer  = Controlled by deployer (needs transfer)");
  console.log("  ⚠️  Unknown   = Controlled by unknown address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
