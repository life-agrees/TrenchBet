const hre = require("hardhat");

async function main() {
  console.log("🚀 Initializing Arc Testnet Oracles...");

  // Use the funded ADMIN_PRIVATE_KEY specifically
  const pk = process.env.ADMIN_PRIVATE_KEY;
  if (!pk) throw new Error("ADMIN_PRIVATE_KEY not found in .env");
  const deployer = new hre.ethers.Wallet(pk, hre.ethers.provider);
  
  console.log("Deployer (Funded Wallet):", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Current Balance:", hre.ethers.formatUnits(balance, 18), "USDC (Native Gas)");

  if (balance === 0n) {
    throw new Error("❌ Deployer has 0 balance. Please ensure the wallet is funded.");
  }

  // Addresses from Docs
  const feeds = {
    BTC: "0x794017C8A6B29E306E5D7270f808A6318359489A",
    ETH: "0x1921F7730e6983A899385C6114e9A1009040108A",
    LINK: "0x247A83818e698066f809D6997B822608A7C64969" 
  };

  const finalFeeds = {};
  const aggregatorAbi = [
    "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)"
  ];

  // Force the factory to use our funded deployer
  const MockAggregator = await hre.ethers.getContractFactory("MockAggregator", deployer);

  for (const [symbol, address] of Object.entries(feeds)) {
    console.log(`\nTesting ${symbol} at ${address}...`);
    try {
      const contract = await hre.ethers.getContractAt(aggregatorAbi, address, deployer);
      const data = await contract.latestRoundData();
      console.log(`✅ ${symbol} supports latestRoundData! Price: ${data[1].toString()}`);
      finalFeeds[symbol] = address;
    } catch (err) {
      console.log(`❌ ${symbol} does not support latestRoundData or address is wrong.`);
      console.log(`🛠️ Deploying Mock for ${symbol}...`);
      
      const initialPrice = symbol === "BTC" ? 6500000000000n : (symbol === "ETH" ? 350000000000n : 1500000000n);
      const mock = await MockAggregator.deploy(`${symbol}/USD`, initialPrice);
      await mock.waitForDeployment();
      const mockAddr = await mock.getAddress();
      console.log(`✅ Mock ${symbol} deployed to: ${mockAddr}`);
      finalFeeds[symbol] = mockAddr;
    }
  }

  // Link to Proxy
  const proxyAddress = "0xa9d3532401E3DAF004C3031A3715c7bb311CD38f";
  console.log(`\n🔗 Linking Feeds to PredictionMarket at ${proxyAddress}...`);

  const coreAbi = ["function setPriceFeed(string asset, address feed)"];
  const proxy = await hre.ethers.getContractAt(coreAbi, proxyAddress, deployer);

  for (const [symbol, address] of Object.entries(finalFeeds)) {
    console.log(`Setting feed for ${symbol}...`);
    const tx = await proxy.setPriceFeed(symbol, address);
    await tx.wait();
    console.log(`✅ ${symbol} feed set.`);
  }

  console.log("\n🎉 ORACLES SYNCED ON ARC TESTNET!");
  console.log(JSON.stringify(finalFeeds, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
