const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", await deployer.getAddress());

  // Same existing Core and Types — DO NOT change these
  const CORE_ADDRESS  = "0xeD7E731289980D206a62cB3dca145BdA003A4177";
  const TYPES_ADDRESS = "0x91d9d263771E75a74793d22ceC52e29bFeE7d9C4";
  const ADMIN_ADDRESS = "0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d";

  const ProxyFactory = await hre.ethers.getContractFactory("PredictionMarketProxy");
  const proxy = await ProxyFactory.deploy(CORE_ADDRESS, TYPES_ADDRESS, ADMIN_ADDRESS);

  await proxy.waitForDeployment();
  const address = await proxy.getAddress();

  console.log("✅ New Proxy deployed:", address);
  console.log("\nUpdate these in your frontend:");
  console.log(`VITE_PROXY_ADDRESS=${address}`);
  console.log(`PROXY_ADDRESS = "${address}"`);
}

main().catch(console.error);