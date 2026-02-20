// scripts/configure-price-feeds.cjs
// Configure Chainlink price feeds for Base Sepolia
// IMPORTANT: Only BTC, ETH, and LINK have feeds on Base Sepolia testnet

require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Configuring Chainlink price feeds for Base Sepolia...");
  console.log("");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Configuring with account:", deployer.address);
  console.log("");
  
  // ChainlinkResolver address (from .env or constants)
  const chainlinkResolverAddress = process.env.VITE_CHAINLINK_RESOLVER_ADDRESS || "0x2Faee1c49d6E4ec7908800e971448B675782ab84";
  console.log("ChainlinkResolver address:", chainlinkResolverAddress);
  console.log("");
  
  // Get contract instance
  const ChainlinkResolver = await ethers.getContractFactory("ChainlinkResolver");
  const chainlinkResolver = ChainlinkResolver.attach(chainlinkResolverAddress);
  
  // ✅ CORRECT Base Sepolia Chainlink Price Feed addresses
  // Verified from: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1#base-sepolia-testnet
  const priceFeeds = [
    { 
      asset: "BTC", 
      feed: "0x0c466540F2f993d3DDA3b951c7Cb4a035E3c1C35",
      name: "BTC/USD"
    },
    { 
      asset: "ETH", 
      feed: "0x4aDC67696bA383F43DD60A9e78F306971eE0d43c",
      name: "ETH/USD"
    },
    { 
      asset: "LINK", 
      feed: "0x59D46b0Cb5659Da2E79a0Bde27C0cdFBbA9d2C8E",
      name: "LINK/USD"
    },
  ];

  
  console.log("📊 Setting up price feeds...");
  console.log("─".repeat(70));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const { asset, feed, name } of priceFeeds) {
    try {
      console.log(`\n🔄 Setting price feed for ${asset} (${name})`);
      console.log(`   Feed address: ${feed}`);
      
      // Set the price feed
      const tx = await chainlinkResolver.setPriceFeed(asset, feed);
      console.log(`   ⏳ Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }
  
  console.log("");
  console.log("═".repeat(70));
  console.log("📊 CONFIGURATION SUMMARY");
  console.log("═".repeat(70));
  console.log(`✅ Successfully configured: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log("");
  
  // Verify configuration
  console.log("🔍 Verifying configuration...");
  console.log("─".repeat(70));
  
  for (const { asset, name } of priceFeeds) {
    try {
      const feedAddress = await chainlinkResolver.priceFeeds(asset);
      
      if (feedAddress !== ethers.ZeroAddress) {
        console.log(`✅ ${asset.padEnd(6)} (${name.padEnd(15)}): ${feedAddress}`);
        
        // Try to get current price
        try {
          const price = await chainlinkResolver.getLatestPrice(asset);
          const priceFormatted = ethers.formatUnits(price, 8);
          console.log(`   💰 Current price: $${parseFloat(priceFormatted).toLocaleString()}`);
        } catch (priceError) {
          console.log(`   ⚠️  Could not fetch price: ${priceError.message.substring(0, 50)}`);
        }
      } else {
        console.log(`❌ ${asset.padEnd(6)} (${name.padEnd(15)}): Not configured`);
      }
    } catch (error) {
      console.error(`❌ Error checking ${asset}:`, error.message);
    }
  }
  
  console.log("");
  console.log("═".repeat(70));
  console.log("✨ Price feed configuration complete!");
  console.log("");
  console.log("📝 Note: Only BTC, ETH, and LINK have Chainlink feeds on Base Sepolia.");
  console.log("   For other assets (SOL, UNI, AAVE, etc.), you'll need to:");
  console.log("   - Use a different oracle (e.g., Pyth Network)");
  console.log("   - Manually input prices");
  console.log("   - Wait for Chainlink to add more feeds");
  console.log("");
  console.log("🎯 Next steps:");
  console.log("   1. Restart your frontend: npm run dev");
  console.log("   2. Open Admin Panel");
  console.log("   3. Create a BTC, ETH, or LINK market");
  console.log("   4. Price should load automatically!");
  console.log("═".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n💥 Configuration failed:", error);
    process.exit(1);
  });
