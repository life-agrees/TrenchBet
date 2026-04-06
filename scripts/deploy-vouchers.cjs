const hre = require("hardhat");

async function main() {
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Your USDC address on Base Sepolia

  console.log("Deploying BetVouchers contract...");
  
  const BetVouchers = await hre.ethers.getContractFactory("BetVouchers");
  const vouchers = await BetVouchers.deploy(USDC_ADDRESS);
  
  // Wait for deployment to finish (ethers v6 syntax)
  await vouchers.waitForDeployment();
  
  const deployedAddress = await vouchers.getAddress();
  console.log("✅ BetVouchers deployed to:", deployedAddress);

  // Transfer ownership to admin wallet
  console.log("Transferring ownership...");
  const tx = await vouchers.transferOwnership("0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d");
  await tx.wait();
  console.log("✅ Ownership transferred");

  // Save deployment info
  const fs = require('fs');
  const deploymentData = {
    contract: 'BetVouchers',
    address: deployedAddress,
    usdc: USDC_ADDRESS,
    network: 'baseSepolia',
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('deployments/betvouchers-deployment.json', JSON.stringify(deploymentData, null, 2));
  console.log("✅ Deployment info saved to deployments/betvouchers-deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});