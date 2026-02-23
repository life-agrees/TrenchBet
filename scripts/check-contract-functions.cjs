// scripts/check-contract-functions.cjs
// Check which functions are actually available on the deployed contracts
// This helps diagnose ABI mismatches

require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking available functions on deployed contracts...");
  console.log("");
  
  // Contract addresses
  const predictionMarketCoreAddress = process.env.VITE_PREDICTION_MARKET_CORE_ADDRESS || "0xb8f08E9CF766389A534dcE49C72E33F92fC4bc30";
  
  console.log("Contract:", predictionMarketCoreAddress);
  console.log("");
  
  // Get provider
  const provider = ethers.provider;
  
  // Check contract code
  const code = await provider.getCode(predictionMarketCoreAddress);
  if (code === '0x') {
    console.log("❌ No contract found at this address!");
    process.exit(1);
  }
  
  console.log("✅ Contract exists");
  console.log(`   Code size: ${code.length / 2 - 1} bytes`);
  console.log("");
  
  // Get contract instance
  const PredictionMarketCore = await ethers.getContractFactory("PredictionMarketCore");
  const contract = PredictionMarketCore.attach(predictionMarketCoreAddress);
  
  // Functions to check
  const functionsToCheck = [
    'marketCounter',
    'markets',
    'getMarket',
    'owner',
    'priceFeeds',
    'getCurrentPrice',
    'createMarketWithOdds',
    'placeBet',
    'resolveMarket',
    'claimWinnings',
    'getCurrentOdds',
    'getUserPositionsInMarket',
    'accumulatedFees',
    'withdrawFees',
    'setPriceFeed',
  ];
  
  console.log("═".repeat(70));
  console.log("FUNCTION AVAILABILITY CHECK");
  console.log("═".repeat(70));
  console.log("");
  
  for (const funcName of functionsToCheck) {
    try {
      // Try to get the function fragment
      const fragment = contract.interface.getFunction(funcName);
      const inputs = fragment.inputs.map(i => i.type).join(', ');
      const outputs = fragment.outputs ? fragment.outputs.map(o => o.type).join(', ') : 'void';
      
      console.log(`✅ ${funcName}`);
      console.log(`   Inputs:  (${inputs})`);
      console.log(`   Outputs: ${outputs}`);
    } catch (e) {
      console.log(`❌ ${funcName} - NOT FOUND in ABI`);
    }
    console.log("");
  }
  
  console.log("═".repeat(70));
  console.log("KEY FINDINGS");
  console.log("═".repeat(70));
  console.log("");
  console.log("1. If 'markets' is ✅ and 'getMarket' is ❌:");
  console.log("   → Contract uses public mapping, not a getter function");
  console.log("   → Frontend should use 'markets' instead of 'getMarket'");
  console.log("");
  console.log("2. If 'priceFeeds' is ✅:");
  console.log("   → Contract has price feed mapping");
  console.log("   → Check if price feeds are configured with check-price-feeds-core.cjs");
  console.log("");
  console.log("3. If 'createMarketWithOdds' is ✅:");
  console.log("   → Market creation function exists");
  console.log("   → Requires price feeds to be configured first");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n💥 Check failed:", error);
    process.exit(1);
  });
