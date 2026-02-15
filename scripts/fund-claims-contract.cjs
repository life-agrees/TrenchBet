// scripts/fund-claims-contract.cjs
require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("💰 Funding TrenchyPointsClaim contract with TRENCHY tokens...\n");

  const TRENCHY_TOKEN_ADDRESS = process.env.TRENCHY_TOKEN_ADDRESS;
  const CLAIMS_CONTRACT_ADDRESS = process.env.VITE_CLAIMS_CONTRACT_ADDRESS;
  
  if (!TRENCHY_TOKEN_ADDRESS || !CLAIMS_CONTRACT_ADDRESS) {
    console.error("❌ Error: Missing environment variables");
    console.log("   Required: TRENCHY_TOKEN_ADDRESS, VITE_CLAIMS_CONTRACT_ADDRESS");
    process.exit(1);
  }

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Funding from:", deployer.address);
  console.log("🎯 Claims Contract:", CLAIMS_CONTRACT_ADDRESS);
  console.log("🪙 Token Address:", TRENCHY_TOKEN_ADDRESS, "\n");

  // Get TRENCHY token contract
  const TestTRENCHY = await hre.ethers.getContractAt("TestTRENCHY", TRENCHY_TOKEN_ADDRESS);
  
  // Check current balances
  const deployerBalance = await TestTRENCHY.balanceOf(deployer.address);
  const claimsBalance = await TestTRENCHY.balanceOf(CLAIMS_CONTRACT_ADDRESS);
  
  console.log("📊 Current Balances:");
  console.log("   Your balance:", hre.ethers.formatEther(deployerBalance), "TRENCHY");
  console.log("   Claims contract balance:", hre.ethers.formatEther(claimsBalance), "TRENCHY\n");
  
  // Transfer 70% of supply to claims contract (7M tokens)
  const amountToTransfer = hre.ethers.parseEther("7000000"); // 7M TRENCHY
  
  console.log("💸 Transferring 7,000,000 TRENCHY to claims contract...");
  const tx = await TestTRENCHY.transfer(CLAIMS_CONTRACT_ADDRESS, amountToTransfer);
  
  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  
  console.log("✅ Transfer complete!");
  console.log("   Transaction:", tx.hash);
  
  // Check new balances
  const newDeployerBalance = await TestTRENCHY.balanceOf(deployer.address);
  const newClaimsBalance = await TestTRENCHY.balanceOf(CLAIMS_CONTRACT_ADDRESS);
  
  console.log("\n📊 New Balances:");
  console.log("   Your balance:", hre.ethers.formatEther(newDeployerBalance), "TRENCHY");
  console.log("   Claims contract balance:", hre.ethers.formatEther(newClaimsBalance), "TRENCHY");
  
  console.log("\n✅ Claims contract is now funded and ready to distribute tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
