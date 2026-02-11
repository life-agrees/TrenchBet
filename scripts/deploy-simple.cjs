const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying PredictionMarket contract...");
  console.log("Network:", hre.network.name);

  try {
    // Get deployer
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer account:", deployer.address);
    
    // Check balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

    // Contract addresses on Base Sepolia
    const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

    // Deploy PredictionMarket
    console.log("\n📄 Deploying contract...");
    const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
    const predictionMarket = await PredictionMarket.deploy(
      USDC_ADDRESS,
      deployer.address
    );

    console.log("⏳ Waiting for deployment...");
    await predictionMarket.waitForDeployment();
    
    const contractAddress = await predictionMarket.getAddress();
    console.log("✅ PredictionMarket deployed to:", contractAddress);

    // Set price feeds
    console.log("\n🔧 Setting price feeds...");
    
    try {
      const BTC_PRICE_FEED = "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298";
      const btcFeedTx = await predictionMarket.setPriceFeed("BTC", BTC_PRICE_FEED);
      await btcFeedTx.wait();
      console.log("✅ BTC price feed set");
    } catch (error) {
      console.log("⚠️ BTC price feed failed:", error.message);
    }

    try {
      const ETH_PRICE_FEED = "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1";
      const ethFeedTx = await predictionMarket.setPriceFeed("ETH", ETH_PRICE_FEED);
      await ethFeedTx.wait();
      console.log("✅ ETH price feed set");
    } catch (error) {
      console.log("⚠️ ETH price feed failed:", error.message);
    }

    console.log("\n📍 Deployment Summary:");
    console.log("========================");
    console.log("Network:", hre.network.name);
    console.log("PredictionMarket:", contractAddress);
    console.log("USDC Address:", USDC_ADDRESS);
    console.log("\n⚠️  IMPORTANT: Update your .env file:");
    console.log(`VITE_PREDICTION_MARKET_ADDRESS=${contractAddress}`);
    console.log("\n✅ Deployment complete!");

    // Verify on Basescan (optional)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
      console.log("\n⏳ Waiting for block confirmations...");
      try {
        await predictionMarket.deploymentTransaction().wait(5);
        
        console.log("\n🔍 Verifying contract on Basescan...");
        await hre.run("verify:verify", {
          address: contractAddress,
          constructorArguments: [USDC_ADDRESS, deployer.address],
        });
        console.log("✅ Contract verified on Basescan");
      } catch (error) {
        console.log("⚠️ Verification failed or skipped:", error.message);
      }
    }

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
