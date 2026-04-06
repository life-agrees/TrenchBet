/**
 * Deploy Updated PredictionMarketCore & Types with setVouchersContract
 * Then upgrade proxy to use new implementations
 * 
 * Usage: npx hardhat run scripts/deploy-updated-implementations.cjs --network baseSepolia
 */

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const ADMIN_ADDRESS = "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d";

  console.log("📦 Deploying Updated Implementations...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) {
    throw new Error("ADMIN_PRIVATE_KEY not found in .env");
  }
  
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);
  console.log(`Using signer: ${signer.address}\n`);

  // Deploy new PredictionMarketCore
  console.log("⏳ Deploying PredictionMarketCore...");
  const CoreFactory = await hre.ethers.getContractFactory("PredictionMarketCore");
  const newCore = await CoreFactory.connect(signer).deploy(USDC_ADDRESS, ADMIN_ADDRESS);
  await newCore.waitForDeployment();
  const coreAddress = await newCore.getAddress();
  console.log(`✅ PredictionMarketCore: ${coreAddress}`);

  // Wait a bit before deploying Types
  console.log("⏳ Waiting for nonce to settle...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Deploy new PredictionMarketTypes
  console.log("⏳ Deploying PredictionMarketTypes...");
  const TypesFactory = await hre.ethers.getContractFactory("PredictionMarketTypes");
  const newTypes = await TypesFactory.connect(signer).deploy(USDC_ADDRESS, ADMIN_ADDRESS);
  await newTypes.waitForDeployment();
  const typesAddress = await newTypes.getAddress();
  console.log(`✅ PredictionMarketTypes: ${typesAddress}\n`);

  // Now upgrade the proxy to use new implementations
  console.log("🔄 Upgrading proxy...");

  const proxyABI = [
    {
      inputs: [{ internalType: "address", name: "implementation", type: "address" }],
      name: "setDefaultImplementation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [
        { internalType: "bytes4", name: "selector", type: "bytes4" },
        { internalType: "address", name: "implementation", type: "address" }
      ],
      name: "setImplementation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, signer);

  try {
    // Set new default implementation (Core)
    console.log("⏳ Setting Core as default implementation...");
    let tx = await proxy.setDefaultImplementation(coreAddress);
    await tx.wait();
    console.log(`✅ Core set as default`);

    // Set Types for advanced market functions
    // The selector for createMultiChoiceMarketWithOdds
    const selector = hre.ethers.id("createMultiChoiceMarketWithOdds(string,string[],string,uint256,uint256[],bool,uint256,uint256)").slice(0, 10);
    console.log(`⏳ Setting Types for advanced markets...`);
    tx = await proxy.setImplementation(selector, typesAddress);
    await tx.wait();
    console.log(`✅ Types implementation set`);

    console.log("\n✅ SUCCESS! Proxy upgraded with new implementations");
    console.log(`   Core:  ${coreAddress}`);
    console.log(`   Types: ${typesAddress}`);
    console.log("\n🎉 setVouchersContract() is now available on the proxy!");

    // Save deployment info
    const fs = require('fs');
    const deploymentData = {
      coreImplementation: coreAddress,
      typesImplementation: typesAddress,
      proxy: PROXY_ADDRESS,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('deployments/updated-implementations.json', JSON.stringify(deploymentData, null, 2));
    console.log("\n📝 Saved to deployments/updated-implementations.json");

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
