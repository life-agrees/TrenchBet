const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const adminWallet = new ethers.Wallet(
    process.env.ADMIN_PRIVATE_KEY,
    hre.ethers.provider
  );
  console.log("Using admin:", await adminWallet.getAddress());

  const USDC  = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const PROXY = "0x4be536dcEFc7172D86e0db24D5C15E808F0491c9";

  // Step 1: Deploy new Types
  console.log("\n1. Deploying new Types implementation...");
  const TypesFactory = await hre.ethers.getContractFactory("PredictionMarketTypes", adminWallet);
  const types = await TypesFactory.deploy(USDC, PROXY);
  await types.waitForDeployment();
  const typesAddress = await types.getAddress();
  console.log("✅ New Types deployed:", typesAddress);

  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Deploy new Proxy (with getCurrentOddsAdvanced routing)
  console.log("\n2. Deploying new Proxy...");
  const CORE = "0xeD7E731289980D206a62cB3dca145BdA003A4177"; // existing Core unchanged
  const ADMIN = await adminWallet.getAddress();
  const ProxyFactory = await hre.ethers.getContractFactory("PredictionMarketProxy", adminWallet);
  const proxy = await ProxyFactory.deploy(CORE, typesAddress, ADMIN);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  console.log("✅ New Proxy deployed:", proxyAddress);

  await new Promise(r => setTimeout(r, 3000));

  // Step 3: Set USDC
  console.log("\n3. Setting USDC...");
  const storage = await hre.ethers.getContractAt("PredictionMarketStorage", proxyAddress, adminWallet);
  const tx1 = await storage.setUSDC(USDC);
  await tx1.wait();
  console.log("✅ USDC set");

  await new Promise(r => setTimeout(r, 3000));

  // Step 4: Set price feeds
  console.log("\n4. Setting price feeds...");
  const core = await hre.ethers.getContractAt("PredictionMarketCore", proxyAddress, adminWallet);
  const feeds = {
    BTC:  "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298",
    ETH:  "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    LINK: "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"
  };
  for (const [asset, feed] of Object.entries(feeds)) {
    const tx = await core.setPriceFeed(asset, feed);
    await tx.wait();
    console.log(`✅ ${asset} feed set`);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log("\n=============================");
  console.log("✅ ALL DONE");
  console.log("New Proxy:  ", proxyAddress);
  console.log("New Types:  ", typesAddress);
  console.log("Core (unchanged):", CORE);
  console.log("\nUpdate frontend:");
  console.log(`VITE_PROXY_ADDRESS=${proxyAddress}`);
  console.log(`PROXY_ADDRESS = "${proxyAddress}"`);
  console.log("\nVerify commands:");
  console.log(`npx hardhat verify --network baseSepolia ${proxyAddress} "${CORE}" "${typesAddress}" "${ADMIN}"`);
  console.log(`npx hardhat verify --network baseSepolia ${typesAddress} "${USDC}" "${proxyAddress}"`);
}

main().catch(console.error);