/**
 * Deploy PredictionMarketTypes and upgrade proxy
 */

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const CORE_ADDRESS = "0xBa3D3c292FA270240153eF5F161d394B6682F8E7"; // Just deployed
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const ADMIN_ADDRESS = "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d";

  console.log("📦 Deploying PredictionMarketTypes...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);
  console.log(`Using signer: ${signer.address}\n`);

  // Deploy PredictionMarketTypes
  console.log("⏳ Deploying PredictionMarketTypes...");
  const TypesFactory = await hre.ethers.getContractFactory("PredictionMarketTypes");
  const newTypes = await TypesFactory.connect(signer).deploy(USDC_ADDRESS, ADMIN_ADDRESS);
  await newTypes.waitForDeployment();
  const typesAddress = await newTypes.getAddress();
  console.log(`✅ PredictionMarketTypes: ${typesAddress}\n`);

  // Upgrade proxy
  console.log("🔄 Upgrading proxy...");

  const proxyABI = [
    {
      inputs: [{ internalType: "address", name: "implementation", type: "address" }],
      name: "setDefaultImplementation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, signer);

  try {
    // Set Core (which now has setVouchersContract)
    console.log(`⏳ Setting Core as default: ${CORE_ADDRESS}`);
    let tx = await proxy.setDefaultImplementation(CORE_ADDRESS);
    await tx.wait();
    console.log(`✅ Done`);

    console.log("\n✅ SUCCESS!");
    console.log(`   Core:  ${CORE_ADDRESS}`);
    console.log(`   Types: ${typesAddress}`);
    console.log("\n🎉 setVouchersContract() is now available on proxy!");

  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    process.exitCode = 1;
  }
}

main().catch(console.error);
