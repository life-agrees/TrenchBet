const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const ADMIN_ADDRESS = "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d";
  
  console.log("🔍 Checking Proxy Owner...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);

  // Read the proxy code
  const code = await hre.ethers.provider.getCode(PROXY_ADDRESS);
  console.log(`Proxy deployed: ${code !== '0x' ? '✅ YES' : '❌ NO'}`);

  // Try to call owner() function
  const proxyABI = [
    {
      inputs: [],
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    },
    {
      inputs: [],
      name: "getAdmin",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];

  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, signer);

  try {
    const owner = await proxy.owner();
    console.log(`owner() returns: ${owner}`);
  } catch (e) {
    console.log(`owner() failed:`, e.reason || e.message);
  }

  try {
    const admin = await proxy.getAdmin();
    console.log(`getAdmin() returns: ${admin}`);
  } catch (e) {
    console.log(`getAdmin() failed:`, e.reason || e.message);
  }

  console.log(`\nExpected admin: ${ADMIN_ADDRESS}`);
  console.log(`Signer address: ${signer.address}`);
  console.log(`Match: ${signer.address.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ? '✅ YES' : '❌ NO'}`);
}

main().catch(console.error);
