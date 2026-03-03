/**
 * Test Proxy Market Creation
 * 
 * This script tests if market creation works through the proxy after
 * configuring the function selectors.
 * 
 * Usage: npx hardhat run scripts/test-proxy-market-creation.cjs --network baseSepolia
 */

const { ethers } = require("hardhat");
require("dotenv").config();

// Contract addresses
const PROXY_ADDRESS = "0x804F5711BA094BF5faf9aBc8bE02983662C2C034";
const CORE_IMPLEMENTATION = "0xb2cdFD0D8ceFda3EbC291E2C98a8324e4b3BA6c8";

// Admin private key
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "9cd97938f0d142a2fd0febbe83d6924be882dd58f86fd443e57f423d6a440f8d";

// ABI for testing
const PROXY_ABI = [
  "function owner() external view returns (address)",
  "function implementations(bytes4) external view returns (address)",
  "function defaultImplementation() external view returns (address)",
  "function createMarketWithOdds(string asset, uint256 duration, uint256 yesMultiplier, uint256 noMultiplier, bool useTimeDecay, uint256 decayStartPercent, uint256 minMultiplier) external returns (uint256)",
  "function marketCounter() external view returns (uint256)",
  "function markets(uint256) external view returns (tuple(uint256 id, uint8 marketType, string asset, uint256 startTime, uint256 endTime, int256 startPrice, int256 endPrice, uint256 yesPool, uint256 noPool, bool resolved, bool priceWentUp, uint256 totalBets, bool useFixedOdds, uint256 yesMultiplier, uint256 noMultiplier, uint256 protocolFee, bool useTimeDecay, uint256 decayStartTime, uint256 minMultiplier))",
];

async function main() {
  console.log("🧪 Testing Proxy Market Creation");
  console.log("==================================\n");

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org");
  
  // Create admin wallet
  const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  const adminAddress = await adminWallet.getAddress();
  
  console.log("Admin wallet:", adminAddress);
  console.log("Proxy address:", PROXY_ADDRESS);
  console.log("");

  // Connect to proxy contract
  const proxy = new ethers.Contract(PROXY_ADDRESS, PROXY_ABI, adminWallet);

  // Verify admin is owner
  const owner = await proxy.owner();
  console.log("Proxy owner:", owner);
  
  if (owner.toLowerCase() !== adminAddress.toLowerCase()) {
    console.error("❌ ERROR: Admin wallet is not the proxy owner!");
    process.exit(1);
  }
  console.log("✅ Admin is proxy owner\n");

  // Check function selector configuration
  const createMarketSelector = "0xb8653a7f"; // createMarketWithOdds(string,uint256,uint256,uint256,bool,uint256,uint256)
  const implementation = await proxy.implementations(createMarketSelector);
  console.log("createMarketWithOdds selector:", createMarketSelector);
  console.log("Implementation for selector:", implementation);
  
  if (implementation.toLowerCase() !== CORE_IMPLEMENTATION.toLowerCase()) {
    console.warn("⚠️ WARNING: Selector not configured correctly!");
    console.warn("  Expected:", CORE_IMPLEMENTATION);
    console.warn("  Actual:  ", implementation);
    console.log("\nThe selector may need to be configured.");
  } else {
    console.log("✅ Selector configured correctly\n");
  }

  // Get current market counter
  const marketCounterBefore = await proxy.marketCounter();
  console.log("Market counter before:", marketCounterBefore.toString());

  // Test market creation parameters
  const testParams = {
    asset: "BTC",
    duration: 900, // 15 minutes
    yesMultiplier: 200,
    noMultiplier: 200,
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  };

  console.log("\n📋 Test market parameters:");
  console.log("  Asset:", testParams.asset);
  console.log("  Duration:", testParams.duration, "seconds");
  console.log("  Yes Multiplier:", testParams.yesMultiplier);
  console.log("  No Multiplier:", testParams.noMultiplier);
  console.log("  Use Time Decay:", testParams.useTimeDecay);

  // Try to simulate the transaction first
  console.log("\n🔍 Simulating transaction...");
  try {
    // Use staticCall to simulate without sending
    const result = await proxy.createMarketWithOdds.staticCall(
      testParams.asset,
      testParams.duration,
      testParams.yesMultiplier,
      testParams.noMultiplier,
      testParams.useTimeDecay,
      testParams.decayStartPercent,
      testParams.minMultiplier
    );
    console.log("✅ Simulation successful! Would create market ID:", result.toString());
  } catch (error) {
    console.error("❌ Simulation failed:", error.message);
    if (error.message.includes("caller is not the owner")) {
      console.error("\n🔴 CRITICAL: The 'caller is not the owner' error persists!");
      console.error("This means the proxy is not correctly routing the call.");
      console.error("\nPossible causes:");
      console.error("1. The function selector is not configured in the proxy");
      console.error("2. The proxy is using the wrong implementation");
      console.error("3. The ownership chain is broken");
    }
    process.exit(1);
  }

  // If simulation passed, try actual transaction
  console.log("\n🚀 Sending actual transaction...");
  try {
    const tx = await proxy.createMarketWithOdds(
      testParams.asset,
      testParams.duration,
      testParams.yesMultiplier,
      testParams.noMultiplier,
      testParams.useTimeDecay,
      testParams.decayStartPercent,
      testParams.minMultiplier
    );
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // Verify market was created
    const marketCounterAfter = await proxy.marketCounter();
    console.log("\nMarket counter after:", marketCounterAfter.toString());
    
    if (marketCounterAfter > marketCounterBefore) {
      console.log("✅ Market counter incremented!");
      
      // Try to read the new market
      const newMarketId = marketCounterBefore;
      try {
        const market = await proxy.markets(newMarketId);
        console.log("\n📊 New market details:");
        console.log("  ID:", market.id.toString());
        console.log("  Asset:", market.asset);
        console.log("  Start Time:", new Date(Number(market.startTime) * 1000).toISOString());
        console.log("  End Time:", new Date(Number(market.endTime) * 1000).toISOString());
        console.log("  Start Price:", market.startPrice.toString());
        console.log("  Yes Multiplier:", market.yesMultiplier.toString());
        console.log("  No Multiplier:", market.noMultiplier.toString());
        
        console.log("\n🎉 SUCCESS! Market creation through proxy is working!");
      } catch (readError) {
        console.warn("⚠️ Could not read market details:", readError.message);
        console.log("But transaction was successful!");
      }
    } else {
      console.error("❌ Market counter did not increment!");
    }
  } catch (error) {
    console.error("❌ Transaction failed:", error.message);
    process.exit(1);
  }

  console.log("\n==================================");
  console.log("✅ Proxy Market Creation Test Complete!");
  console.log("==================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
