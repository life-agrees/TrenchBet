const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const PROXY = "0x4be536dcEFc7172D86e0db24D5C15E808F0491c9";
  
  const adminWallet = new ethers.Wallet(
    process.env.ADMIN_PRIVATE_KEY,
    hre.ethers.provider
  );
  
  console.log("Using admin:", await adminWallet.getAddress());

  const proxy = await hre.ethers.getContractAt("PredictionMarketCore", PROXY, adminWallet);

  // Only set ETH and LINK — BTC already done
  const feeds = {
    ETH:  "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    LINK: "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61"
  };

  for (const [asset, feed] of Object.entries(feeds)) {
    const tx = await proxy.setPriceFeed(asset, feed);
    await tx.wait(); // wait for full confirmation before next tx
    console.log(`✅ ${asset} price feed set`);
    await new Promise(r => setTimeout(r, 3000)); // 3s delay between txs
  }
}

main().catch(console.error);