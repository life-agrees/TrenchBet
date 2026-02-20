/**
 * Fund Contracts Script
 * Adds TRENCHY tokens to deployed contracts
 * 
 * Usage: npx hardhat run scripts/fund-contracts.cjs --network <network>
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

// Default funding amounts (can be overridden via env vars)
const DEFAULT_FUNDING = {
  LaunchAirdrop: '100000',      // 100k TRENCHY (1000 users × 100 TRENCHY)
  TrenchyReferrals: '10000',    // 10k TRENCHY for referrals
  TrenchyAchievements: '5000',  // 5k TRENCHY for achievements
  FirstBetInsurance: '5000',     // 5k TRENCHY for insurance
  TrenchyStreaks: '5000',       // 5k TRENCHY for streaks
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Fund TrenchyBet Contracts                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nNetwork: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}\n`);

  // Load deployment file
  const deploymentPath = path.join(__dirname, '..', 'deployments', `latest-${network.name}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ No deployment file found at: ${deploymentPath}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const contracts = deployment.contracts;
  const trenchyTokenAddress = deployment.config.TRENCHY_TOKEN;

  if (!trenchyTokenAddress) {
    console.error('❌ TRENCHY token address not found in deployment file');
    process.exit(1);
  }

  // Connect to TRENCHY token
  const trenchyToken = await ethers.getContractAt(ERC20_ABI, trenchyTokenAddress);
  const decimals = await trenchyToken.decimals();
  const symbol = await trenchyToken.symbol();

  console.log(`Token: ${symbol} (${trenchyTokenAddress})`);
  console.log(`Decimals: ${decimals}\n`);

  // Check deployer balance
  const deployerBalance = await trenchyToken.balanceOf(deployer.address);
  console.log(`Your ${symbol} balance: ${ethers.formatUnits(deployerBalance, decimals)}\n`);

  // Calculate total needed
  let totalNeeded = BigInt(0);
  const fundingPlan = [];

  for (const [name, amount] of Object.entries(DEFAULT_FUNDING)) {
    if (contracts[name]) {
      const amountWei = ethers.parseUnits(amount, decimals);
      totalNeeded += amountWei;
      fundingPlan.push({
        name,
        address: contracts[name],
        amount,
        amountWei
      });
    }
  }

  console.log('💰 Funding Plan');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`${'Contract'.padEnd(25)} ${'Amount'.padEnd(15)} ${'Address'.padEnd(42)}`);
  console.log('────────────────────────────────────────────────────────────────');

  for (const item of fundingPlan) {
    const shortAddress = `${item.address.slice(0, 6)}...${item.address.slice(-4)}`;
    console.log(`${item.name.padEnd(25)} ${item.amount.padEnd(15)} ${shortAddress}`);
  }

  console.log('────────────────────────────────────────────────────────────────');
  console.log(`Total needed: ${ethers.formatUnits(totalNeeded, decimals)} ${symbol}\n`);

  // Check if deployer has enough
  if (deployerBalance < totalNeeded) {
    console.error(`❌ Insufficient balance!`);
    console.error(`   Needed: ${ethers.formatUnits(totalNeeded, decimals)} ${symbol}`);
    console.error(`   Have: ${ethers.formatUnits(deployerBalance, decimals)} ${symbol}`);
    console.error(`   Missing: ${ethers.formatUnits(totalNeeded - deployerBalance, decimals)} ${symbol}`);
    process.exit(1);
  }

  // Confirm funding
  console.log('📝 Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Execute funding
  console.log('\n🚀 Executing funding transactions...\n');

  const results = [];

  for (const item of fundingPlan) {
    try {
      console.log(`💸 Funding ${item.name} with ${item.amount} ${symbol}...`);
      
      const tx = await trenchyToken.transfer(item.address, item.amountWei);
      console.log(`   ⏳ Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      
      // Verify new balance
      const newBalance = await trenchyToken.balanceOf(item.address);
      console.log(`   📊 New balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}\n`);
      
      results.push({
        name: item.name,
        success: true,
        txHash: tx.hash,
        amount: item.amount
      });
    } catch (err) {
      console.error(`   ❌ Failed to fund ${item.name}: ${err.message}\n`);
      results.push({
        name: item.name,
        success: false,
        error: err.message
      });
    }
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              FUNDING COMPLETE                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}\n`);

  if (successful.length > 0) {
    console.log('Successful transactions:');
    successful.forEach(r => {
      console.log(`  • ${r.name}: ${r.amount} ${symbol} (${r.txHash.slice(0, 10)}...)`);
    });
  }

  if (failed.length > 0) {
    console.log('\nFailed transactions:');
    failed.forEach(r => {
      console.log(`  • ${r.name}: ${r.error}`);
    });
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'deployments', `funding-report-${Date.now()}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    network: network.name,
    deployer: deployer.address,
    token: {
      address: trenchyTokenAddress,
      symbol,
      decimals: Number(decimals)
    },
    results
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Funding report saved to: ${reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
