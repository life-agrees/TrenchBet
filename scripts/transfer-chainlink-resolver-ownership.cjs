// scripts/transfer-chainlink-resolver-ownership.cjs
// Transfer ownership of the new ChainlinkResolver contract to the owner wallet
// Usage: npx hardhat run scripts/transfer-chainlink-resolver-ownership.cjs --network baseSepolia

require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("═".repeat(70));
  console.log("🔐 CHAINLINK RESOLVER OWNERSHIP TRANSFER");
  console.log("═".repeat(70));
  console.log("");

  // Get contract address from environment
  const CHAINLINK_RESOLVER_ADDRESS = process.env.VITE_CHAINLINK_RESOLVER_ADDRESS;
  
  // Get new owner address from environment
  const NEW_OWNER = process.env.OWNER_ADDRESS;

  
  if (!NEW_OWNER) {
    console.error("❌ ERROR: OWNER_ADDRESS not set in .env file");
    console.log("💡 Add this to your .env:");
    console.log("   OWNER_ADDRESS=0x...");
    process.exit(1);
  }

  if (!CHAINLINK_RESOLVER_ADDRESS) {
    console.error("❌ ERROR: VITE_CHAINLINK_RESOLVER_ADDRESS not set in .env file");
    console.log("💡 Add this to your .env:");
    console.log("   VITE_CHAINLINK_RESOLVER_ADDRESS=0x...");
    process.exit(1);
  }

  // Validate address format
  if (!hre.ethers.isAddress(NEW_OWNER)) {
    console.error("❌ ERROR: Invalid address format for OWNER_ADDRESS");
    console.log(`   Given: ${NEW_OWNER}`);
    process.exit(1);
  }

  if (!hre.ethers.isAddress(CHAINLINK_RESOLVER_ADDRESS)) {
    console.error("❌ ERROR: Invalid address format for VITE_CHAINLINK_RESOLVER_ADDRESS");
    console.log(`   Given: ${CHAINLINK_RESOLVER_ADDRESS}`);
    process.exit(1);
  }


  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  
  console.log("📊 TRANSFER DETAILS");
  console.log("─".repeat(70));
  console.log(`Network:              ${network}`);
  console.log(`Contract:             ChainlinkResolver`);
  console.log(`Contract Address:     ${CHAINLINK_RESOLVER_ADDRESS}`);
  console.log(`Current Owner:        ${deployer.address}`);
  console.log(`New Owner:            ${NEW_OWNER}`);
  console.log("");

  // Check if new owner is same as deployer
  if (deployer.address.toLowerCase() === NEW_OWNER.toLowerCase()) {
    console.log("⚠️  WARNING: New owner is same as deployer!");
    console.log("   This defeats the purpose of transferring ownership.");
    console.log("");
  }

  // Check new owner balance
  try {
    const balance = await hre.ethers.provider.getBalance(NEW_OWNER);
    console.log(`💰 New Owner Balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      console.log("⚠️  WARNING: New owner has 0 ETH!");
      console.log("   Send some ETH for future gas costs.");
    }
    console.log("");
  } catch (error) {
    console.log("⚠️  Could not check new owner balance");
    console.log("");
  }

  try {
    console.log("🔸 Transferring ChainlinkResolver ownership...");
    console.log("");

    // Get contract instance with Ownable interface
    const ownableContract = await hre.ethers.getContractAt("Ownable", CHAINLINK_RESOLVER_ADDRESS);
    
    // Check current owner
    const currentOwner = await ownableContract.owner();
    console.log(`   Current Owner: ${currentOwner}`);

    // Check if already transferred
    if (currentOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
      console.log(`   ✅ Already owned by new owner`);
      console.log("");
      console.log("═".repeat(70));
      console.log("✅ OWNERSHIP ALREADY TRANSFERRED");
      console.log("═".repeat(70));
      return;
    }

    // Check if deployer is the owner
    if (currentOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log(`   ❌ ERROR: Deployer is not the owner!`);
      console.log(`   Current owner: ${currentOwner}`);
      console.log(`   Deployer:      ${deployer.address}`);
      console.log("");
      console.log("You need to connect with the wallet that is the current owner.");
      process.exit(1);
    }

    // Transfer ownership
    console.log(`   📝 Sending transfer transaction...`);
    const tx = await ownableContract.transferOwnership(NEW_OWNER);
    console.log(`   ⏳ Waiting for confirmation...`);
    console.log(`   TX Hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log("");

    // Verify transfer
    const newOwner = await ownableContract.owner();
    if (newOwner.toLowerCase() === NEW_OWNER.toLowerCase()) {
      console.log("═".repeat(70));
      console.log("✅ OWNERSHIP TRANSFERRED SUCCESSFULLY");
      console.log("═".repeat(70));
      console.log("");
      console.log(`New Owner: ${newOwner}`);
      console.log(`TX Hash:   ${tx.hash}`);
      console.log("");
      console.log("Next Steps:");
      console.log("1. Verify ownership with:");
      console.log("   npx hardhat run scripts/verify-ownership.cjs --network", network);
      console.log("");
      console.log("2. Configure price feeds (if not done):");
      console.log("   npx hardhat run scripts/configure-price-feeds.cjs --network", network);
    } else {
      console.log("❌ ERROR: Ownership transfer verification failed!");
      console.log(`Expected: ${NEW_OWNER}`);
      console.log(`Got:      ${newOwner}`);
      process.exit(1);
    }

  } catch (error) {
    console.log("");
    console.log("═".repeat(70));
    console.log("❌ TRANSFER FAILED");
    console.log("═".repeat(70));
    console.log("");
    console.error("Error:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("");
      console.log("💡 You need ETH for gas fees. Get some from:");
      console.log("   https://www.coinbase.com/faucets/base-sepolia-faucet");
    }
    
    if (error.message.includes("user rejected")) {
      console.log("");
      console.log("💡 Transaction was rejected in your wallet.");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 FATAL ERROR:");
    console.error(error);
    process.exit(1);
  });
