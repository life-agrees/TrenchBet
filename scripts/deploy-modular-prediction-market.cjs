const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Base Sepolia testnet configuration
const BASE_SEPOLIA = {
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  priceFeeds: {
    "ETH-USD": "0x4aDC67696bA383F43DD60A9e78F306971eE0d43c",
    "BTC-USD": "0x0C466540f2f993D3dA3B951c7Cb4a035E3C1C35e",
    "LINK-USD": "0x59D46b0Cb5659Da2E79a0Bde27C0cdFBbA9d2C8E"
  }
};

// Helper to ensure proper address checksum
function getAddress(address) {
  return ethers.getAddress(address);
}


async function main() {
  console.log("========================================");
  console.log("Deploying Modular Prediction Market Contracts");
  console.log("Network:", network.name);
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const deployedContracts = {};

  try {
    // Step 1: Deploy PredictionMarketBase (Abstract - no deployment needed)
    console.log("\n📋 Step 1: PredictionMarketBase is abstract, skipping deployment");

    // Step 2: PredictionMarketPayoutLib is embedded at compile time (using ... for * syntax)
    // No separate deployment needed - it's compiled into the contracts that use it
    console.log("\n📚 Step 2: PredictionMarketPayoutLib is embedded at compile time, skipping deployment");

    // Step 3: Deploy PredictionMarketCore

    console.log("\n🎯 Step 3: Deploying PredictionMarketCore...");
    const Core = await ethers.getContractFactory("PredictionMarketCore");

    const core = await Core.deploy(BASE_SEPOLIA.usdc, deployer.address, {
      gasLimit: 5000000,
      maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei")
    });

    await core.waitForDeployment();
    const coreAddress = await core.getAddress();
    console.log("✅ PredictionMarketCore deployed to:", coreAddress);
    deployedContracts.core = coreAddress;

    // Step 4: Deploy PredictionMarketTypes
    console.log("\n🎲 Step 4: Deploying PredictionMarketTypes...");
    const Types = await ethers.getContractFactory("PredictionMarketTypes");

    const types = await Types.deploy(BASE_SEPOLIA.usdc, deployer.address, {
      gasLimit: 5000000,
      maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei")
    });

    await types.waitForDeployment();
    const typesAddress = await types.getAddress();
    console.log("✅ PredictionMarketTypes deployed to:", typesAddress);
    deployedContracts.types = typesAddress;

    // Step 5: Deploy ChainlinkResolver
    console.log("\n🔗 Step 5: Deploying ChainlinkResolver...");
    const Resolver = await ethers.getContractFactory("ChainlinkResolver");
    const resolver = await Resolver.deploy(coreAddress, {
      gasLimit: 3000000,
      maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei")
    });

    await resolver.waitForDeployment();
    const resolverAddress = await resolver.getAddress();
    console.log("✅ ChainlinkResolver deployed to:", resolverAddress);
    deployedContracts.resolver = resolverAddress;

    // Step 6: Deploy TrenchyStaking
    console.log("\n💎 Step 6: Deploying TrenchyStaking...");
    // Note: Need TRENCHY token address - using placeholder for now
    const trenchyTokenAddress = process.env.TRENCHY_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
    const Staking = await ethers.getContractFactory("TrenchyStaking");
    const staking = await Staking.deploy(trenchyTokenAddress, {
      gasLimit: 3000000,
      maxFeePerGas: ethers.parseUnits("0.1", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("0.01", "gwei")
    });

    await staking.waitForDeployment();
    const stakingAddress = await staking.getAddress();
    console.log("✅ TrenchyStaking deployed to:", stakingAddress);
    deployedContracts.staking = stakingAddress;

    // Step 7: Configure Price Feeds on Core
    console.log("\n⚙️ Step 7: Configuring price feeds on Core...");
    for (const [asset, feed] of Object.entries(BASE_SEPOLIA.priceFeeds)) {
      const checksummedFeed = getAddress(feed);
      const tx = await core.setPriceFeed(asset, checksummedFeed);
      await tx.wait();
      console.log(`  ✅ Set ${asset} price feed: ${checksummedFeed}`);
    }

    // Step 8: Configure Price Feeds on Types
    console.log("\n⚙️ Step 8: Configuring price feeds on Types...");
    for (const [asset, feed] of Object.entries(BASE_SEPOLIA.priceFeeds)) {
      const checksummedFeed = getAddress(feed);
      const tx = await types.setPriceFeed(asset, checksummedFeed);
      await tx.wait();
      console.log(`  ✅ Set ${asset} price feed: ${checksummedFeed}`);
    }


    // Step 9: Set up ChainlinkResolver on Core
    console.log("\n⚙️ Step 9: Setting up ChainlinkResolver...");
    const setResolverTx = await core.setAutoResolver(resolverAddress);
    await setResolverTx.wait();
    console.log("✅ ChainlinkResolver authorized on Core");

    // Step 10: Save deployment info
    console.log("\n💾 Step 10: Saving deployment info...");
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts,
      config: BASE_SEPOLIA,
      note: "PredictionMarketPayoutLib is embedded at compile time"
    };


    const deploymentPath = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }

    const filename = `modular-prediction-market-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentPath, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`✅ Deployment info saved to: deployments/${filename}`);

    // Step 11: Update constants.js
    console.log("\n📝 Step 11: Updating constants.js...");
    await updateConstants(deployedContracts);
    console.log("✅ constants.js updated");

    // Print summary
    console.log("\n========================================");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("========================================");
    console.log("\nDeployed Contracts:");
    console.log("-------------------");
    console.log(`PredictionMarketCore:      ${coreAddress}`);
    console.log(`PredictionMarketTypes:     ${typesAddress}`);
    console.log(`ChainlinkResolver:         ${resolverAddress}`);
    console.log(`TrenchyStaking:            ${stakingAddress}`);
    console.log("\nNote: PredictionMarketPayoutLib is embedded at compile time");
    console.log("\nNext Steps:");

    console.log("-----------");
    console.log("1. Verify contracts on BaseScan");
    console.log("2. Fund contracts with USDC for testing");
    console.log("3. Register ChainlinkResolver with Chainlink Automation");
    console.log("4. Test market creation and resolution");
    console.log("5. Update frontend to use new contract addresses");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

async function updateConstants(deployedContracts) {
  const constantsPath = path.join(__dirname, "..", "src", "utils", "constants.js");
  
  if (!fs.existsSync(constantsPath)) {
    console.log("⚠️ constants.js not found, skipping update");
    return;
  }

  let content = fs.readFileSync(constantsPath, "utf8");

  // Add new contract addresses
  const newConstants = `
// Modular Prediction Market Contracts (NEW - Phase 2)
export const PREDICTION_MARKET_CORE_ADDRESS = "${deployedContracts.core}";
export const PREDICTION_MARKET_TYPES_ADDRESS = "${deployedContracts.types}";
export const CHAINLINK_RESOLVER_ADDRESS = "${deployedContracts.resolver}";
export const TRENCHY_STAKING_ADDRESS = "${deployedContracts.staking}";
// Note: PredictionMarketPayoutLib is embedded at compile time, no separate address needed

// Legacy Prediction Market (DEPRECATED - will be migrated)
// export const PREDICTION_MARKET_ADDRESS = "..."; // Old contract - do not use
`;


  // Find the export section and add new constants before it
  const exportMatch = content.match(/export const/);
  if (exportMatch) {
    const insertIndex = exportMatch.index;
    content = content.slice(0, insertIndex) + newConstants + "\n" + content.slice(insertIndex);
  } else {
    content += newConstants;
  }

  fs.writeFileSync(constantsPath, content);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
