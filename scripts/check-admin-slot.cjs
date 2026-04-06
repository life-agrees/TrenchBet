const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  
  console.log("🔍 Reading proxy admin from storage...\n");

  // EIP-1967 Admin slot
  const ADMIN_SLOT = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
  
  const admin = await hre.ethers.provider.getStorage(PROXY_ADDRESS, ADMIN_SLOT);
  const adminAddress = "0x" + admin.slice(-40);
  
  console.log(`Raw slot value: ${admin}`);
  console.log(`Admin address: ${adminAddress}`);
  console.log(`Expected:      0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d`);
  console.log(`Match: ${adminAddress.toLowerCase() === "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d"}}\n`);

  // Also try calling getAdmin()
  const proxyABI = [
    {
      inputs: [],
      name: "getAdmin",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function"
    }
  ];

  const provider = hre.ethers.provider;
  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, provider);

  try {
    const getAdminResult = await proxy.getAdmin();
    console.log(`getAdmin() result: ${getAdminResult}`);
    console.log(`Match: ${getAdminResult.toLowerCase() === "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d"}`);
  } catch (e) {
    console.log(`getAdmin() failed: ${e.message}`);
  }

  // Check if Core is callable
  console.log("\n🔍 Checking Core implementation...");
  const CORE_ADDRESS = "0xBa3D3c292FA270240153eF5F161d394B6682F8E7";
  const coreCode = await hre.ethers.provider.getCode(CORE_ADDRESS);
  console.log(`Core deployed: ${coreCode !== '0x' ? '✅ YES' : '❌ NO'}`);
}

main().catch(console.error);
