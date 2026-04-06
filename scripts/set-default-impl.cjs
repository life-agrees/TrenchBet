const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const CORE_ADDRESS = "0xBa3D3c292FA270240153eF5F161d394B6682F8E7";

  console.log("🔗 Attempting setDefaultImplementation...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);

  console.log(`Signer:      ${signer.address}`);
  console.log(`Proxy:       ${PROXY_ADDRESS}`);
  console.log(`New Core:    ${CORE_ADDRESS}\n`);

  // Full ABI
  const proxyABI = [
    {
      inputs: [{ internalType: "address", name: "implementation", type: "address" }],
      name: "setDefaultImplementation",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    },
    {
      inputs: [],
      name: "getCoreImplementation",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];

  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, signer);

  try {
    // Check current Core
    const currentCore = await proxy.getCoreImplementation();
    console.log(`Current Core: ${currentCore}`);
    console.log(`Will set to: ${CORE_ADDRESS}\n`);

    // Try the call
    console.log("⏳ Sending setDefaultImplementation...");
    const tx = await proxy.setDefaultImplementation(CORE_ADDRESS);
    console.log(`Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`\n✅ SUCCESS!`);
    console.log(`Block: ${receipt.blockNumber}`);
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    if (error.data) {
      console.error(`Data: ${error.data}`);
    }
    if (error.reason) {
      console.error(`Reason: ${error.reason}`);
    }
    console.error(`\nFull error:`, error);
  }
}

main().catch(console.error);
