const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying PredictionMarket contract...");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer account:", deployer.address);

  // Contract addresses on Base Sepolia
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

  // Chainlink Price Feeds on Base Sepolia
  const BTC_PRICE_FEED = "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298";
  const ETH_PRICE_FEED = "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1";

  // Deploy PredictionMarket
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    USDC_ADDRESS,
    deployer.address
  );

  await predictionMarket.waitForDeployment();
  const contractAddress = await predictionMarket.getAddress();

  console.log("✅ PredictionMarket deployed to:", contractAddress);

  // Set price feeds
  console.log("\n🔧 Setting price feeds...");
  await predictionMarket.setPriceFeed("BTC", BTC_PRICE_FEED);
  console.log("✅ BTC price feed set");
  await predictionMarket.setPriceFeed("ETH", ETH_PRICE_FEED);
  console.log("✅ ETH price feed set");

  // Create initial markets
  console.log("\n🎯 Creating initial markets...");

  // Binary market (BTC up/down)
  const btcTx = await predictionMarket.createMarketWithOdds(
    "BTC",
    15 * 60,   // duration in seconds
    200,       // yesMultiplier (2.0x)
    200        // noMultiplier (2.0x)
  );
  await btcTx.wait();
  console.log("✅ BTC binary market created");

  // Binary market (ETH up/down)
  const ethTx = await predictionMarket.createMarketWithOdds(
    "ETH",
    15 * 60,
    200,
    200
  );
  await ethTx.wait();
  console.log("✅ ETH binary market created");

  // Multi-choice market
  const multiTx = await predictionMarket.createMultiChoiceMarketWithOdds(
    "CRYPTO",
    ["BTC", "ETH", "SOL"],
    "Which coin will gain the most this week?",
    60 * 60, // 1 hour
    [200, 200, 200]
  );
  await multiTx.wait();
  console.log("✅ Multi-choice market created");

  // Range market (ETH price ranges)
  const rangeTx = await predictionMarket.createRangeMarketWithOdds(
    "ETH",
    [BigInt(2500e8), BigInt(3000e8), BigInt(3500e8)], // mins
    [BigInt(3000e8), BigInt(3500e8), BigInt(4000e8)], // maxs
    30 * 60, // 30 minutes
    [200, 200, 200]
  );
  await rangeTx.wait();
  console.log("✅ Range market created");

  // Time-based market (SOL target price)
  /*
  const timeTx = await predictionMarket.createTimeMarketWithOdds(
    "SOL",
    BigInt(200e8), // target price
    [86400, 604800, 2592000], // 24h, 7d, 30d
    [300, 200, 150]
  );
  await timeTx.wait();
  console.log("✅ Time-based market created");
  */

  console.log("\n📍 Deployment Summary:");
  console.log("========================");
  console.log("Network:", hre.network.name);
  console.log("PredictionMarket:", contractAddress);
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("\n⚠️  IMPORTANT: Add this to your .env file:");
  console.log(`VITE_PREDICTION_MARKET_ADDRESS=${contractAddress}`);
  console.log("\n✅ Deployment complete!");

  // Verify on Basescan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await predictionMarket.deploymentTransaction().wait(5);

    console.log("\nVerifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [USDC_ADDRESS, deployer.address],
      });
      console.log("✅ Contract verified on Basescan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
      console.log("You can verify manually later on Basescan");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
