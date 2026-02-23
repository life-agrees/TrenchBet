// scripts/configure-price-feeds-proxy.cjs
// Configure Chainlink price feeds for PROXY PATTERN implementation contracts
// This script is specifically designed for the new proxy pattern architecture
// IMPORTANT: Price feeds must be set on implementation contracts (Core/Types), not the proxy itself

require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Configuring price feeds for PROXY PATTERN contracts...");
  console.log("");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Configuring with account:", deployer.address);
  console.log("");
  
  // NEW PROXY PATTERN CONTRACT ADDRESSES
  // These are the implementation contracts behind the proxy
  // IMPORTANT: Using hardcoded new addresses to avoid env var conflicts with old legacy addresses
  const ADDRESSES = {
    // Proxy (for reference - not used for price feed configuration)
    PROXY: "0x9F710F341dD6b2d9ec20843B28180F5C6C2B0a97",
    
    // Implementation contracts (price feeds are configured HERE)
    // These are the NEW proxy implementation contracts (NOT the legacy ones)
    CORE: "0x7516355A46a3D5122Fb76252619dC5E62e98C0f0",
    TYPES: "0xdd73a5D6e22260446A0e6DC4e3BE918498248020",
    
    // Chainlink Resolver
    RESOLVER: process.env.VITE_CHAINLINK_RESOLVER_ADDRESS || "0x2Faee1c49d6E4ec7908800e971448B675782ab84",
  };
  
  // Log warning if env vars contain old addresses
  const envCore = process.env.VITE_PREDICTION_MARKET_CORE_ADDRESS;
  const envTypes = process.env.VITE_PREDICTION_MARKET_TYPES_ADDRESS;
  if (envCore && envCore !== ADDRESSES.CORE) {
    console.log("⚠️  WARNING: VITE_PREDICTION_MARKET_CORE_ADDRESS env var contains different address:");
    console.log("   Env var:", envCore);
    console.log("   Using:   ", ADDRESSES.CORE, "(NEW proxy implementation)");
    console.log("");
  }
  if (envTypes && envTypes !== ADDRESSES.TYPES) {
    console.log("⚠️  WARNING: VITE_PREDICTION_MARKET_TYPES_ADDRESS env var contains different address:");
    console.log("   Env var:", envTypes);
    console.log("   Using:   ", ADDRESSES.TYPES, "(NEW proxy implementation)");
    console.log("");
  }
  
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log("🔧 PROXY PATTERN PRICE FEED CONFIGURATION");
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log("Proxy Address (for reference):", ADDRESSES.PROXY);
  console.log("");
  console.log("Implementation Contracts (price feeds configured here):");
  console.log("  PredictionMarketCore: ", ADDRESSES.CORE);
  console.log("  PredictionMarketTypes:", ADDRESSES.TYPES);
  console.log("  ChainlinkResolver:    ", ADDRESSES.RESOLVER);
  console.log("");
  console.log("⚠️  IMPORTANT: Price feeds are stored in implementation contract storage");
  console.log("   The proxy uses delegatecall, so it accesses these price feeds");
  console.log("══════════════════════════════════════════════════════════════════════");
  console.log("");

  // Get contract instances
  const PredictionMarketCore = await ethers.getContractFactory("PredictionMarketCore");
  const core = PredictionMarketCore.attach(ADDRESSES.CORE);
  
  const PredictionMarketTypes = await ethers.getContractFactory("PredictionMarketTypes");
  const types = PredictionMarketTypes.attach(ADDRESSES.TYPES);
  
  const ChainlinkResolver = await ethers.getContractFactory("ChainlinkResolver");
  const resolver = ChainlinkResolver.attach(ADDRESSES.RESOLVER);
  
  // ✅ Base Sepolia Chainlink Price Feed addresses
  // Source: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1#base-sepolia-testnet
  const PRICE_FEEDS = [
    { 
      asset: "BTC", 
      feed: "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298", // BTC/USD (Base Sepolia Official)
      name: "BTC/USD"
    },
    { 
      asset: "ETH", 
      feed: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1", // ETH/USD (Base Sepolia Official)
      name: "ETH/USD"
    },
    { 
      asset: "LINK", 
      feed: "0xb113F5A928BCfF189C998ab20d753a47F9dE5A61", // LINK/USD (Base Sepolia Official)
      name: "LINK/USD"
    },
  ];
  
  // Track results
  const results = {
    resolver: { success: 0, fail: 0 },
    core: { success: 0, fail: 0 },
    types: { success: 0, fail: 0 },
  };
  
  // ==========================================
  // STEP 1: Configure ChainlinkResolver
  // ==========================================
  console.log("═".repeat(70));
  console.log("📊 STEP 1: Configuring ChainlinkResolver");
  console.log("═".repeat(70));
  
  for (const { asset, feed, name } of PRICE_FEEDS) {
    try {
      console.log(`\n🔄 ${asset} (${name})`);
      console.log(`   Feed: ${feed}`);
      
      // Check if already set
      const currentFeed = await resolver.priceFeeds(asset);
      if (currentFeed !== ethers.ZeroAddress) {
        console.log(`   ℹ️  Already configured: ${currentFeed}`);
        results.resolver.success++;
        continue;
      }
      
      // Set the price feed
      const tx = await resolver.setPriceFeed(asset, feed);
      console.log(`   ⏳ Tx: ${tx.hash.substring(0, 30)}...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      results.resolver.success++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message.substring(0, 80)}`);
      results.resolver.fail++;
    }
  }
  
  // ==========================================
  // STEP 2: Configure PredictionMarketCore
  // ==========================================
  console.log("\n" + "═".repeat(70));
  console.log("📊 STEP 2: Configuring PredictionMarketCore");
  console.log("═".repeat(70));
  
  for (const { asset, feed, name } of PRICE_FEEDS) {
    try {
      console.log(`\n🔄 ${asset} (${name})`);
      
      // Check if already set
      const currentFeed = await core.priceFeeds(asset);
      if (currentFeed !== ethers.ZeroAddress) {
        console.log(`   ℹ️  Already configured: ${currentFeed}`);
        results.core.success++;
        continue;
      }
      
      // Set the price feed
      const tx = await core.setPriceFeed(asset, feed);
      console.log(`   ⏳ Tx: ${tx.hash.substring(0, 30)}...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      results.core.success++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message.substring(0, 80)}`);
      results.core.fail++;
    }
  }
  
  // ==========================================
  // STEP 3: Configure PredictionMarketTypes
  // ==========================================
  console.log("\n" + "═".repeat(70));
  console.log("📊 STEP 3: Configuring PredictionMarketTypes");
  console.log("═".repeat(70));
  
  for (const { asset, feed, name } of PRICE_FEEDS) {
    try {
      console.log(`\n🔄 ${asset} (${name})`);
      
      // Check if already set
      const currentFeed = await types.priceFeeds(asset);
      if (currentFeed !== ethers.ZeroAddress) {
        console.log(`   ℹ️  Already configured: ${currentFeed}`);
        results.types.success++;
        continue;
      }
      
      // Set the price feed
      const tx = await types.setPriceFeed(asset, feed);
      console.log(`   ⏳ Tx: ${tx.hash.substring(0, 30)}...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      results.types.success++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message.substring(0, 80)}`);
      results.types.fail++;
    }
  }
  
  // ==========================================
  // SUMMARY
  // ==========================================
  console.log("\n" + "═".repeat(70));
  console.log("📊 CONFIGURATION SUMMARY");
  console.log("═".repeat(70));
  console.log(`ChainlinkResolver:     ✅ ${results.resolver.success}  ❌ ${results.resolver.fail}`);
  console.log(`PredictionMarketCore:  ✅ ${results.core.success}  ❌ ${results.core.fail}`);
  console.log(`PredictionMarketTypes: ✅ ${results.types.success}  ❌ ${results.types.fail}`);
  console.log("");
  
  // ==========================================
  // VERIFICATION
  // ==========================================
  console.log("🔍 VERIFICATION");
  console.log("═".repeat(70));
  
  for (const { asset, name } of PRICE_FEEDS) {
    console.log(`\n${asset} (${name}):`);
    
    // Check ChainlinkResolver
    try {
      const resolverFeed = await resolver.priceFeeds(asset);
      const resolverStatus = resolverFeed !== ethers.ZeroAddress ? "✅" : "❌";
      console.log(`  ChainlinkResolver:     ${resolverStatus} ${resolverFeed.substring(0, 25)}...`);
    } catch (e) {
      console.log(`  ChainlinkResolver:     ❌ Error`);
    }
    
    // Check PredictionMarketCore
    try {
      const coreFeed = await core.priceFeeds(asset);
      const coreStatus = coreFeed !== ethers.ZeroAddress ? "✅" : "❌";
      console.log(`  PredictionMarketCore:  ${coreStatus} ${coreFeed.substring(0, 25)}...`);
      
      // Try to get price
      if (coreFeed !== ethers.ZeroAddress) {
        try {
          const price = await core.getCurrentPrice(asset);
          const priceFormatted = ethers.formatUnits(price, 8);
          console.log(`    💰 Current price: $${parseFloat(priceFormatted).toLocaleString()}`);
        } catch (priceError) {
          console.log(`    ⚠️  Price fetch failed`);
        }
      }
    } catch (e) {
      console.log(`  PredictionMarketCore:  ❌ Error`);
    }
    
    // Check PredictionMarketTypes
    try {
      const typesFeed = await types.priceFeeds(asset);
      const typesStatus = typesFeed !== ethers.ZeroAddress ? "✅" : "❌";
      console.log(`  PredictionMarketTypes: ${typesStatus} ${typesFeed.substring(0, 25)}...`);
    } catch (e) {
      console.log(`  PredictionMarketTypes: ❌ Error`);
    }
  }
  
  // ==========================================
  // NEXT STEPS
  // ==========================================
  console.log("\n" + "═".repeat(70));
  console.log("✨ Price feed configuration complete!");
  console.log("═".repeat(70));
  console.log("");
  console.log("🎯 NEXT STEPS:");
  console.log("   1. Verify all price feeds show ✅ above");
  console.log("   2. Restart your frontend: npm run dev");
  console.log("   3. Open Admin Panel");
  console.log("   4. Create a BTC, ETH, or LINK market through the PROXY");
  console.log("   5. Market creation should work without 'Price feed not set' error!");
  console.log("");
  console.log("💡 PROXY PATTERN ARCHITECTURE:");
  console.log("   ┌─────────────────────────────────────┐");
  console.log("   │  Proxy: 0x9F710F341dD6b2d9ec208...  │  ← All interactions go here");
  console.log("   │  (Entry point for all calls)        │");
  console.log("   └──────────────────┬──────────────────┘");
  console.log("                      │ delegatecall");
  console.log("          ┌───────────┴───────────┐");
  console.log("          ▼                       ▼");
  console.log("   ┌──────────────┐      ┌──────────────┐");
  console.log("   │  Core Impl   │      │  Types Impl  │  ← Price feeds stored here");
  console.log("   │  0x7516...   │      │  0xdd73...   │");
  console.log("   └──────────────┘      └──────────────┘");
  console.log("");
  console.log("   • Markets are created THROUGH the proxy");
  console.log("   • Price feeds are stored IN implementation contracts");
  console.log("   • Proxy uses delegatecall to access implementation storage");
  console.log("");
  console.log("═".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n💥 Configuration failed:", error);
    process.exit(1);
  });
