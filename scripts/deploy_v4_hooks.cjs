// scripts/deploy_v4_hooks.cjs
require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TrenchyV4 Hooks to X Layer Testnet...\n");

  const keyUsed = process.env.ADMIN_PRIVATE_KEY ? "ADMIN_PRIVATE_KEY" : "PRIVATE_KEY";
  console.log(`🔑 Using credential source: ${keyUsed}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "OKB\n");

  // ==================== 1. DEPLOY MOCK ENVIRONMENT ====================
  console.log("🛠️ Deploying Mock USDC & Mock PoolManager for V4 sandboxing...");
  
  // Deploy Mock USDC
  const TestTRENCHY = await hre.ethers.getContractFactory("TestTRENCHY");
  const usdc = await TestTRENCHY.deploy(deployer.address);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("   ✅ Mock USDC deployed to:", usdcAddress);

  // Deploy Mock Launched Token ($TRENCHY)
  const token = await TestTRENCHY.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("   ✅ Launched Token ($TRENCHY) deployed to:", tokenAddress);

  // Deploy Mock PoolManager
  // We deploy a simple mock pool manager for testnet hook trigger demonstration
  const MockPoolManager = await hre.ethers.getContractFactory("TestTRENCHY"); // We can use token address as a placeholder or deploy a dummy
  const mockPM = await MockPoolManager.deploy(deployer.address);
  await mockPM.waitForDeployment();
  const poolManagerAddress = await mockPM.getAddress();
  console.log("   ✅ Mock PoolManager deployed to:", poolManagerAddress);

  // ==================== 2. DEPLOY TRENCHYMILESTONEHOOK ====================
  console.log("\n🐳 Deploying TrenchyMilestoneHook...");
  
  const targetMilestone = hre.ethers.parseUnits("1000000", 6); // 1,000,000 USDC target
  const duration = 7 * 24 * 60 * 60; // 7 days in seconds
  
  const TrenchyMilestoneHook = await hre.ethers.getContractFactory("TrenchyMilestoneHook");
  const milestoneHook = await TrenchyMilestoneHook.deploy(
    poolManagerAddress,
    usdcAddress,
    tokenAddress,
    targetMilestone,
    duration
  );
  await milestoneHook.waitForDeployment();
  const milestoneHookAddress = await milestoneHook.getAddress();
  console.log("   ✅ TrenchyMilestoneHook deployed to:", milestoneHookAddress);

  // ==================== 3. DEPLOY TRENCHYBINARYAMM ====================
  console.log("\n⚖️ Deploying TrenchyBinaryAMM...");
  
  const TrenchyBinaryAMM = await hre.ethers.getContractFactory("TrenchyBinaryAMM");
  const binaryAMM = await TrenchyBinaryAMM.deploy(poolManagerAddress);
  await binaryAMM.waitForDeployment();
  const binaryAMMAddress = await binaryAMM.getAddress();
  console.log("   ✅ TrenchyBinaryAMM deployed to:", binaryAMMAddress);

  console.log("\n🔗 Linking Milestone Hook to Binary AMM...");
  const tx = await milestoneHook.setPredictionMarket(binaryAMMAddress);
  await tx.wait();
  console.log("   ✅ Prediction market linked for seeding!");

  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Mock USDC Address:      ", usdcAddress);
  console.log("Launched Token Address: ", tokenAddress);
  console.log("Pool Manager Address:   ", poolManagerAddress);
  console.log("TrenchyMilestoneHook:   ", milestoneHookAddress);
  console.log("TrenchyBinaryAMM:       ", binaryAMMAddress);
  console.log("=".repeat(60));
  console.log("\n🔧 NEXT STEPS:");
  console.log("1. Save these addresses in constants.js!");
  console.log("2. Set Hook addresses in wagmi.js chain configuration.");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
