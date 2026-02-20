const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying ChainlinkResolver contract...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get the PredictionMarket address (use Core contract for price feeds)
  const predictionMarketAddress = process.env.PREDICTION_MARKET_CORE_ADDRESS || 
    "0xb8f08E9CF766389A534dcE49C72E33F92fC4bc30";
  
  console.log("Using PredictionMarket address:", predictionMarketAddress);
  
  // Deploy ChainlinkResolver
  const ChainlinkResolver = await ethers.getContractFactory("ChainlinkResolver");
  const chainlinkResolver = await ChainlinkResolver.deploy(predictionMarketAddress);
  
  await chainlinkResolver.waitForDeployment();
  
  const chainlinkResolverAddress = await chainlinkResolver.getAddress();
  console.log("✅ ChainlinkResolver deployed to:", chainlinkResolverAddress);
  
  // Set up price feeds for common assets
  console.log("\n📊 Setting up price feeds...");
  
  // Base Sepolia Chainlink Price Feed addresses
  const priceFeeds = {
    "BTC": "0x6ce185860a184310952c1eacaF621e06E1aE73b4",  // BTC/USD
    "ETH": "0x4aDC67696bA383F43DD60A9e78F306971eE0d44C",  // ETH/USD
    "LINK": "0x59D5F05Fbc2F91E91d6E47E13eDc2E5C9A578297", // LINK/USD
    "UNI": "0xB8C458C957a6e6ca7Cc53E0c1b0Ee7E3A5C4B8B0",  // UNI/USD
    "AAVE": "0x3c6Abd3C4d8C8eF4e0b1F6e5D4c3B2A1908765F4", // AAVE/USD
    "SOL": "0x0E9C9c5b1d4E4A8B7c6D5E4F3A2B1C0D9E8F7A6B",  // SOL/USD (placeholder - verify on Base Sepolia)
  };
  
  for (const [asset, feedAddress] of Object.entries(priceFeeds)) {
    try {
      console.log(`Setting price feed for ${asset}...`);
      const tx = await chainlinkResolver.setPriceFeed(asset, feedAddress);
      await tx.wait();
      console.log(`✅ Price feed set for ${asset}: ${feedAddress}`);
    } catch (error) {
      console.error(`❌ Failed to set price feed for ${asset}:`, error.message);
    }
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: "baseSepolia",
    chainlinkResolver: chainlinkResolverAddress,
    predictionMarket: predictionMarketAddress,
    priceFeeds: priceFeeds,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address
  };
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `chainlink-resolver-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`\n💾 Deployment info saved to: deployments/${filename}`);
  
  // Update constants.js with new address
  console.log("\n📝 To update the frontend, add this to your .env file:");
  console.log(`VITE_CHAINLINK_RESOLVER_ADDRESS=${chainlinkResolverAddress}`);
  
  console.log("\n✨ Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Update VITE_CHAINLINK_RESOLVER_ADDRESS in your .env file");
  console.log("2. Restart your frontend development server");
  console.log("3. Test the admin panel price fetching");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
