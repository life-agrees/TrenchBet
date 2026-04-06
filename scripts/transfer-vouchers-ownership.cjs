/**
 * Transfer BetVouchers Ownership to Admin
 */

const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const BET_VOUCHERS_ADDRESS = "0xC6989A4D70560413C7Db582352C3fCb0D440D915";
  const NEW_OWNER = "0x52ceb1cc4fe3cfacc5f0cd12ea7215734cb0aa3d";

  console.log("🔑 Transferring BetVouchers Ownership...\n");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  if (!adminPrivateKey) {
    throw new Error("ADMIN_PRIVATE_KEY not found in .env");
  }
  
  const signer = new hre.ethers.Wallet(adminPrivateKey, hre.ethers.provider);
  console.log(`Caller: ${signer.address}`);
  console.log(`New Owner: ${NEW_OWNER}\n`);

  const BetVouchersFactory = await hre.ethers.getContractFactory("BetVouchers");
  const vouchers = BetVouchersFactory.attach(BET_VOUCHERS_ADDRESS).connect(signer);

  try {
    console.log("⏳ Calling transferOwnership()...");
    const tx = await vouchers.transferOwnership(NEW_OWNER);
    console.log(`   Tx: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Success! Block: ${receipt.blockNumber}\n`);

    console.log(`🎉 ${NEW_OWNER} is now owner of BetVouchers`);
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    process.exitCode = 1;
  }
}

main().catch(console.error);
