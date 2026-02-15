// scripts/deploy-test-trenchy.cjs
require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TestTRENCHY token to Base Sepolia...\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy TestTRENCHY
  const TestTRENCHY = await hre.ethers.getContractFactory("TestTRENCHY");
  const trenchy = await TestTRENCHY.deploy(deployer.address);
  
  await trenchy.waitForDeployment();
  const trenchyAddress = await trenchy.getAddress();
  
  console.log("✅ TestTRENCHY deployed to:", trenchyAddress);
  
  // Verify initial state
  const totalSupply = await trenchy.totalSupply();
  const ownerBalance = await trenchy.balanceOf(deployer.address);
  
  console.log("\n📊 Token Details:");
  console.log("   Name:", await trenchy.name());
  console.log("   Symbol:", await trenchy.symbol());
  console.log("   Total Supply:", hre.ethers.formatEther(totalSupply), "TRENCHY");
  console.log("   Owner Balance:", hre.ethers.formatEther(ownerBalance), "TRENCHY");
  
  console.log("\n⏳ Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Verify on BaseScan
  console.log("\n🔍 Verifying contract on BaseScan...");
  try {
    await hre.run("verify:verify", {
      address: trenchyAddress,
      constructorArguments: [deployer.address],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    console.log("⚠️  Verification failed:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("TestTRENCHY Address:", trenchyAddress);
  console.log("Total Supply: 10,000,000 TRENCHY");
  console.log("Owner:", deployer.address);
  console.log("\n🔧 NEXT STEPS:");
  console.log("1. Add to .env:");
  console.log(`   TRENCHY_TOKEN_ADDRESS=${trenchyAddress}`);
  console.log("\n2. Transfer tokens to claims contract:");
  console.log(`   npx hardhat run scripts/fund-claims-contract.cjs --network baseSepolia`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
