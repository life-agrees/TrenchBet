/**
 * Wire BetVouchers Contract to PredictionMarket
 * This sets the vouchersContract address on the PredictionMarketProxy
 * 
 * Usage: npx hardhat run scripts/wire-vouchers.cjs --network baseSepolia
 */

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  // Addresses
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const BET_VOUCHERS_ADDRESS = "0xC6989A4D70560413C7Db582352C3fCb0D440D915";
  const ADMIN_ADDRESS = "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d";

  console.log("🔗 Wiring BetVouchers to PredictionMarket...");
  console.log(`   Proxy:      ${PROXY_ADDRESS}`);
  console.log(`   Vouchers:   ${BET_VOUCHERS_ADDRESS}`);
  console.log(`   Admin:      ${ADMIN_ADDRESS}`);

  // Get admin signer from .env
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) {
    throw new Error("ADMIN_PRIVATE_KEY not found in .env");
  }
  
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);
  console.log(`   Using:      ${signer.address}`);

  // Get the proxy ABI (we'll use minimal ABI with just setVouchersContract)
  const proxyABI = [
    {
      inputs: [{ internalType: "address", name: "_vouchersContract", type: "address" }],
      name: "setVouchersContract",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  // Connect to proxy
  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, signer);

  try {
    console.log("\n⏳ Sending transaction...");
    const tx = await proxy.setVouchersContract(BET_VOUCHERS_ADDRESS);
    console.log(`   Tx Hash: ${tx.hash}`);

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    
    console.log(`\n✅ SUCCESS! Transaction confirmed`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    console.log("\n🎉 BetVouchers is now wired to PredictionMarket!");
    console.log("   Users can now spend vouchers when placing bets.");
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    if (error.reason) console.error("   Reason:", error.reason);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
