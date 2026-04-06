/**
 * Diagnostic Script - Check PredictionMarket State
 * Verifies if proxy is set up correctly and vouchersContract can be called
 */

const hre = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x40c64085FEA4b46494e7674d2f8EE1f6C24c9581";
  const BET_VOUCHERS_ADDRESS = "0xC6989A4D70560413C7Db582352C3fCb0D440D915";

  console.log("📋 Diagnostic Check\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Your wallet: ${deployer.address}`);
  console.log(`Network: ${(await hre.ethers.provider.getNetwork()).name}`);

  // Check if we can read the proxy
  try {
    console.log("\n🔍 Checking proxy...");
    const codeAtProxy = await hre.ethers.provider.getCode(PROXY_ADDRESS);
    console.log(`   Proxy exists: ${codeAtProxy !== '0x'}`);

    // Try to get the current vouchersContract value
    const proxyABI = [
      {
        inputs: [],
        name: "vouchersContract",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
      }
    ];

    const proxy = new hre.ethers.Contract(PROXY_ADDRESS, proxyABI, deployer);
    try {
      const currentVouchers = await proxy.vouchersContract();
      console.log(`   Current vouchersContract: ${currentVouchers}`);
    } catch (e) {
      console.log(`   vouchersContract not readable (might not be set yet)`);
    }

  } catch (error) {
    console.error("Error:", error.message);
  }

  // Check BetVouchers contract exists
  try {
    console.log("\n🔍 Checking BetVouchers...");
    const code = await hre.ethers.provider.getCode(BET_VOUCHERS_ADDRESS);
    console.log(`   BetVouchers exists: ${code !== '0x'}`);
  } catch (error) {
    console.error("Error:", error.message);
  }

  console.log("\n💡 If vouchersContract is currently 0x0000000000000000000000000000000000000000,");
  console.log("   then setVouchersContract should work.");
  console.log("\n   If you got 'execution reverted', check if your account is the owner.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
