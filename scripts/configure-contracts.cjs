const { ethers, network } = require("hardhat");

// Already deployed contract addresses
const DEPLOYED_CONTRACTS = {
  core: "0xb8f08E9CF766389A534dcE49C72E33F92fC4bc30",
  types: "0x5BdD5381a283Fb04167019BE35b2102429c8d621",
  resolver: "0xd7DF4928590768666A427605BeCE3156C22D199E",
  staking: "0x2513f27B994523B2DB87dE2F3c6C79d6E1557228"
};

// Base Sepolia testnet configuration
const BASE_SEPOLIA = {
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  priceFeeds: {
    "ETH-USD": "0x4aDC67696bA383F43DD60A9e78F306971eE0d43c",
    "BTC-USD": "0x0C466540f2f993D3dA3B951c7Cb4a035E3C1C35e",
    "LINK-USD": "0x59D46b0Cb5659Da2E79a0Bde27C0cdFBbA9d2C8E"
  }
};

async function main() {
  console.log("========================================");
  console.log("Configuring Deployed Contracts");
  console.log("Network:", network.name);
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  try {
    // Get contract instances
    const core = await ethers.getContractAt("PredictionMarketCore", DEPLOYED_CONTRACTS.core);
    const types = await ethers.getContractAt("PredictionMarketTypes", DEPLOYED_CONTRACTS.types);

    // Step 1: Configure Price Feeds on Core
    console.log("\n⚙️ Step 1: Configuring price feeds on Core...");
    for (const [asset, feed] of Object.entries(BASE_SEPOLIA.priceFeeds)) {
      try {
        const checksummedFeed = ethers.getAddress(feed);
        const tx = await core.setPriceFeed(asset, checksummedFeed);
        await tx.wait();
        console.log(`  ✅ Set ${asset} price feed: ${checksummedFeed}`);
      } catch (error) {
        console.log(`  ⚠️ Failed to set ${asset}: ${error.message}`);
      }
    }

    // Step 2: Configure Price Feeds on Types
    console.log("\n⚙️ Step 2: Configuring price feeds on Types...");
    for (const [asset, feed] of Object.entries(BASE_SEPOLIA.priceFeeds)) {
      try {
        const checksummedFeed = ethers.getAddress(feed);
        const tx = await types.setPriceFeed(asset, checksummedFeed);
        await tx.wait();
        console.log(`  ✅ Set ${asset} price feed: ${checksummedFeed}`);
      } catch (error) {
        console.log(`  ⚠️ Failed to set ${asset}: ${error.message}`);
      }
    }

    // Step 3: Set up ChainlinkResolver on Core
    console.log("\n⚙️ Step 3: Setting up ChainlinkResolver...");
    try {
      const setResolverTx = await core.setAutoResolver(DEPLOYED_CONTRACTS.resolver);
      await setResolverTx.wait();
      console.log("✅ ChainlinkResolver authorized on Core");
    } catch (error) {
      console.log(`  ⚠️ Failed to set resolver: ${error.message}`);
    }

    console.log("\n========================================");
    console.log("🎉 CONFIGURATION COMPLETE!");
    console.log("========================================");

  } catch (error) {
    console.error("\n❌ Configuration failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
