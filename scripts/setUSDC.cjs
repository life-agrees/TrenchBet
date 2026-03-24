const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const adminWallet = new ethers.Wallet(
    process.env.ADMIN_PRIVATE_KEY,
    hre.ethers.provider
  );

  console.log("Using admin:", await adminWallet.getAddress());

  const PROXY = "0x4be536dcEFc7172D86e0db24D5C15E808F0491c9";
  const USDC  = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  const proxy = await hre.ethers.getContractAt(
    "PredictionMarketStorage", PROXY, adminWallet
  );

  const tx = await proxy.setUSDC(USDC);
  await tx.wait();
  console.log("✅ USDC set on new proxy:", USDC);
}

main().catch(console.error);