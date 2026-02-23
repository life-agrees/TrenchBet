const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Helper function to add delay between transactions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Deploying Prediction Market with Proxy Pattern...\n");

  // Get deployment account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, `(chainId: ${network.chainId})`);
  
  // Get USDC address from environment or use default for baseSepolia
  let usdcAddress = process.env.USDC_ADDRESS;
  if (!usdcAddress) {
    // Default USDC address for baseSepolia testnet
    // Convert chainId from BigInt to Number for comparison
    const chainIdNum = Number(network.chainId);
    if (chainIdNum === 84532) {
      usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
      console.log("Using default Base Sepolia USDC address");
    } else {
      throw new Error("USDC_ADDRESS not set in environment");
    }
  }

  console.log("USDC Address:", usdcAddress);


  try {
    // Step 1: Deploy library first (but don't link it - it's used internally)
    console.log("\n📚 Deploying PredictionMarketPayoutLib...");
    const PayoutLib = await ethers.getContractFactory("PredictionMarketPayoutLib");
    const payoutLib = await PayoutLib.deploy();
    await payoutLib.waitForDeployment();
    const payoutLibAddress = await payoutLib.getAddress();
    console.log("✅ PredictionMarketPayoutLib deployed:", payoutLibAddress);

    // Wait for transaction to be mined and avoid nonce issues
    await sleep(5000);

    // Step 2: Deploy PredictionMarketCore implementation (no library linking needed)
    console.log("\n🎯 Deploying PredictionMarketCore implementation...");
    const Core = await ethers.getContractFactory("PredictionMarketCore");
    const coreImpl = await Core.deploy(usdcAddress, deployer.address);
    await coreImpl.waitForDeployment();
    const coreImplAddress = await coreImpl.getAddress();
    console.log("✅ PredictionMarketCore implementation:", coreImplAddress);

    // Wait before next deployment
    await sleep(5000);

    // Step 3: Deploy PredictionMarketTypes implementation
    console.log("\n🎨 Deploying PredictionMarketTypes implementation...");
    const Types = await ethers.getContractFactory("PredictionMarketTypes");
    const typesImpl = await Types.deploy(usdcAddress, deployer.address);
    await typesImpl.waitForDeployment();
    const typesImplAddress = await typesImpl.getAddress();
    console.log("✅ PredictionMarketTypes implementation:", typesImplAddress);

    // Wait before proxy deployment
    await sleep(5000);

    // Step 4: Deploy Proxy contract
    // Note: PredictionMarketProxy constructor only takes 2 arguments:
    // _coreImplementation and _admin
    console.log("\n🔗 Deploying PredictionMarketProxy...");
    const Proxy = await ethers.getContractFactory("PredictionMarketProxy");
    const proxy = await Proxy.deploy(
      coreImplAddress,  // _coreImplementation
      deployer.address  // _admin
    );
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log("✅ PredictionMarketProxy deployed:", proxyAddress);

    // Step 5: Configure the proxy to route calls to Types contract
    console.log("\n⚙️  Configuring proxy to route Types functions...");
    
    // Get function selectors for Types contract functions
    const typesSelectors = [
      "createMultiChoiceMarketWithOdds(string,string[],string,uint256,uint256[],bool,uint256,uint256)",
      "createRangeMarketWithOdds(string,uint256[],uint256[],string,uint256,uint256[],bool,uint256,uint256)",
      "createTimeMarketWithOdds(string,uint256,uint256[],string,uint256,uint256[],bool,uint256,uint256)",
      "placeMultiChoiceBet(uint256,uint8,uint256)",
      "placeRangeBet(uint256,uint8,uint256)",
      "placeTimeBet(uint256,uint8,uint256)",
      "getMultiChoiceMultipliers(uint256)",
      "getRangeMultipliers(uint256)",
      "getTimeMultipliers(uint256)"
    ];
    
    // Set implementations for Types functions
    for (const selector of typesSelectors) {
      const sigHash = ethers.id(selector).slice(0, 10); // Get 4-byte selector
      const tx = await proxy.setImplementation(sigHash, typesImplAddress);
      await tx.wait();
      console.log(`   Set ${selector.slice(0, 30)}... -> Types`);
      await sleep(1000);
    }
    
    console.log("✅ Proxy configuration complete");

    // Step 6: Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: Number(network.chainId),
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        payoutLib: payoutLibAddress,
        coreImplementation: coreImplAddress,
        typesImplementation: typesImplAddress,
        proxy: proxyAddress
      },
      usdc: usdcAddress
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filename = `proxy-deployment-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentsDir, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    // Also save as latest
    fs.writeFileSync(
      path.join(deploymentsDir, "proxy-deployment-latest.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n" + "=".repeat(60));
    console.log("🎉 PROXY PATTERN DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📋 IMPORTANT ADDRESSES:");
    console.log("   Proxy (USE THIS FOR ALL INTERACTIONS):", proxyAddress);
    console.log("   Core Implementation:", coreImplAddress);
    console.log("   Types Implementation:", typesImplAddress);
    console.log("\n⚠️  UPDATE YOUR FRONTEND CONFIG:");
    console.log("   - Set PROXY_ADDRESS:", proxyAddress);
    console.log("   - Remove separate CORE/Types addresses");
    console.log("\n📁 Deployment saved to:", filename);
    console.log("=".repeat(60));

    // Return the proxy address for programmatic use
    return deploymentInfo;

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
