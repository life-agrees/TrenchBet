const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const ADMIN_ADDRESS = "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d";
  
  console.log("Testing proxy admin mechanism...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);

  console.log(`Signer: ${signer.address}`);
  console.log(`Expected Admin: ${ADMIN_ADDRESS}`);
  console.log(`Match: ${signer.address.toLowerCase() === ADMIN_ADDRESS.toLowerCase()}\n`);

  // Simple ABI with just getAdmin function
  const simpleABI = [
    {
      inputs: [],
      name: "getAdmin",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];

  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, simpleABI, signer);

  try {
    const admin = await proxy.getAdmin();
    console.log(`✅ getAdmin() returned: ${admin}`);
    console.log(`   Admin is correct: ${admin.toLowerCase() === ADMIN_ADDRESS.toLowerCase()}`);
  } catch (e) {
    console.log(`❌ getAdmin() failed: ${e.message}`);
  }
}

main().catch(console.error);
