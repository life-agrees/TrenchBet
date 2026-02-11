// scripts/deploy-claims.cjs
// Deploy TrenchyPointsClaim contract

const hre = require("hardhat");

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  TrenchyBet Points Claiming Contract Deploy ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // ==================== CONFIGURATION ====================
  // ⚠️  UPDATE THESE VALUES BEFORE DEPLOYING ⚠️
  
  const TRENCHY_TOKEN_ADDRESS = process.env.TRENCHY_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  const BACKEND_SIGNER = process.env.BACKEND_SIGNER_ADDRESS || "0x0000000000000000000000000000000000000000";
  const STAKING_CONTRACT = "0x0000000000000000000000000000000000000000"; // Set later via setStakingContract()
  const OWNER = process.env.OWNER_ADDRESS || "0x0000000000000000000000000000000000000000";

  // Validate configuration
  if (TRENCHY_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: TRENCHY_TOKEN_ADDRESS not set!");
    console.log("Set it in your .env file or hardhat.config.js");
    process.exit(1);
  }

  if (BACKEND_SIGNER === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: BACKEND_SIGNER_ADDRESS not set!");
    console.log("Generate a backend signer wallet first.");
    process.exit(1);
  }

  if (OWNER === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: OWNER_ADDRESS not set!");
    process.exit(1);
  }

  console.log("📋 Configuration:");
  console.log("  TRENCHY Token:", TRENCHY_TOKEN_ADDRESS);
  console.log("  Backend Signer:", BACKEND_SIGNER);
  console.log("  Staking Contract:", STAKING_CONTRACT, "(can be set later)");
  console.log("  Owner:", OWNER);
  console.log("");

  // ==================== DEPLOYMENT ====================
  
  console.log("🚀 Deploying TrenchyPointsClaim...");

  const TrenchyPointsClaim = await hre.ethers.getContractFactory("TrenchyPointsClaim");
  
  const claim = await TrenchyPointsClaim.deploy(
    TRENCHY_TOKEN_ADDRESS,
    BACKEND_SIGNER,
    STAKING_CONTRACT,
    OWNER
  );

  await claim.waitForDeployment();

  const address = await claim.getAddress();
  
  console.log("✅ Contract deployed to:", address);
  console.log("");

  // ==================== VERIFICATION ====================
  
  console.log("⏳ Waiting for block confirmations...");
  await claim.deploymentTransaction().wait(5);
  console.log("✅ 5 blocks confirmed");
  console.log("");

  console.log("🔍 Verifying contract on BaseScan...");
  
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [
        TRENCHY_TOKEN_ADDRESS,
        BACKEND_SIGNER,
        STAKING_CONTRACT,
        OWNER
      ],
    });
    console.log("✅ Contract verified on BaseScan");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract already verified");
    } else {
      console.log("⚠️  Verification failed:", error.message);
      console.log("You can verify manually later on BaseScan");
    }
  }

  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  DEPLOYMENT SUCCESSFUL! 🎉                   ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Contract Address:", address);
  console.log("🔗 BaseScan:", `https://sepolia.basescan.org/address/${address}`);
  console.log("");
  console.log("📝 NEXT STEPS:");
  console.log("");
  console.log("1. Fund the contract with TRENCHY tokens:");
  console.log(`   → Transfer 70M TRENCHY to ${address}`);
  console.log("");
  console.log("2. Add to your .env file:");
  console.log(`   CLAIMS_CONTRACT_ADDRESS=${address}`);
  console.log("");
  console.log("3. Add to Vercel environment variables:");
  console.log(`   CLAIMS_CONTRACT_ADDRESS=${address}`);
  console.log("   BACKEND_SIGNER_PRIVATE_KEY=0x... (from your signer wallet)");
  console.log("");
  console.log("4. Test the contract:");
  console.log("   → Check contract balance");
  console.log("   → Try a test claim");
  console.log("");
  console.log("🎯 Contract is ready for use!");
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
