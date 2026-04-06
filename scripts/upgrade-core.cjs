/**
 * Deploy NEW Core with setVouchersContract and wire to proxy
 * 
 * CORRECT: Constructors take (_usdc, _proxy)
 * CORRECT: Use upgradeCore() function on proxy
 * 
 * Usage: npx hardhat run scripts/upgrade-core.cjs --network baseSepolia
 */

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("📦 Deploying New PredictionMarketCore...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) {
    throw new Error("ADMIN_PRIVATE_KEY not found in .env");
  }
  
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);
  console.log(`Admin: ${signer.address}`);
  console.log(`Proxy: ${PROXY_ADDRESS}\n`);

  // Deploy NEW PredictionMarketCore with correct constructor args: (_usdc, _proxy)
  console.log("⏳ Deploying PredictionMarketCore...");
  const CoreFactory = await hre.ethers.getContractFactory("PredictionMarketCore");
  const newCore = await CoreFactory.connect(signer).deploy(USDC_ADDRESS, PROXY_ADDRESS);
  await newCore.waitForDeployment();
  const coreAddress = await newCore.getAddress();
  console.log(`✅ New Core: ${coreAddress}`);
  console.log(`   (This has setVouchersContract function)\n`);

  // Call upgradeCore() on proxy
  console.log("🔄 Upgrading proxy to use new Core...");
  
  const proxyABI = [
    {
      inputs: [{ internalType: "address", name: "newImplementation", type: "address" }],
      name: "upgradeCore",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, signer);

  try {
    console.log(`⏳ Calling upgradeCore(${coreAddress})...`);
    const tx = await proxy.upgradeCore(coreAddress);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Success! Block: ${receipt.blockNumber}\n`);

    console.log("🎉 Proxy upgraded!");
    console.log(`   setVouchersContract() is now available\n`);

    // Save deployment
    const fs = require('fs');
    fs.writeFileSync('deployments/core-upgrade.json', JSON.stringify({
      oldCore: "0xeD7E731289980D206a62cB3dca145BdA003A4177",
      newCore: coreAddress,
      proxy: PROXY_ADDRESS,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log("   Saved to deployments/core-upgrade.json");

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    if (error.data) console.error(`Data: ${error.data}`);
    process.exitCode = 1;
  }
}

main().catch(console.error);
