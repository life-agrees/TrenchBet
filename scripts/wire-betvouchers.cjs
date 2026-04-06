/**
 * Wire BetVouchers contract to PredictionMarket proxy
 * Calls setVouchersContract() which now exists in the new Core
 * 
 * Usage: npx hardhat run scripts/wire-betvouchers.cjs --network baseSepolia
 */

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const BET_VOUCHERS_ADDRESS = "0xC6989A4D70560413C7Db582352C3fCb0D440D915";

  console.log("🔗 Wiring BetVouchers to PredictionMarket...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);

  console.log(`Admin:      ${signer.address}`);
  console.log(`Proxy:      ${PROXY_ADDRESS}`);
  console.log(`Vouchers:   ${BET_VOUCHERS_ADDRESS}\n`);

  const proxyABI = [
    {
      inputs: [{ internalType: "address", name: "_vouchersContract", type: "address" }],
      name: "setVouchersContract",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function"
    }
  ];

  const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, signer);

  try {
    console.log("⏳ Calling setVouchersContract()...");
    const tx = await proxy.setVouchersContract(BET_VOUCHERS_ADDRESS);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Success! Block: ${receipt.blockNumber}\n`);

    console.log("🎉 BetVouchers wired to proxy!");
    console.log("   Spending sequence now active: Vouchers → BetCredits → USDC\n");

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

main().catch(console.error);
