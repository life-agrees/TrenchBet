/**
 * Check Contract Balances Script
 * Monitors TRENCHY token balances across all deployed contracts
 * 
 * Usage: npx hardhat run scripts/check-balances.cjs --network <network>
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// ERC20 ABI for balance checking
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          TrenchyBet Contract Balance Monitor               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nNetwork: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Load deployment file
  const deploymentPath = path.join(__dirname, '..', 'deployments', `latest-${network.name}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ No deployment file found at: ${deploymentPath}`);
    console.log('   Run deploy-all-contracts.cjs first or specify contract addresses manually.');
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

  // Check balances for each contract
  const balances = [];
  
  for (const [name, address] of Object.entries(contracts)) {
    try {
      const balance = await trenchyToken.balanceOf(address);
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      balances.push({
        name,
        address,
        balance,
        formattedBalance,
        needsFunding: false
      });
    } catch (err) {
      console.error(`❌ Error checking ${name}: ${err.message}`);
    }
  }

  // Define alert thresholds (in token units)
  const thresholds = {
    LaunchAirdrop: ethers.parseUnits('10000', decimals),     // Alert if < 10k
    TrenchyReferrals: ethers.parseUnits('1000', decimals),    // Alert if < 1k
    TrenchyAchievements: ethers.parseUnits('500', decimals),  // Alert if < 500
    FirstBetInsurance: ethers.parseUnits('1000', decimals), // Alert if < 1k
    TrenchyStreaks: ethers.parseUnits('1000', decimals),       // Alert if < 1k
  };

  // Display results
  console.log('📊 Contract Balances');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`${'Contract'.padEnd(25)} ${'Address'.padEnd(42)} ${'Balance'.padEnd(15)} Status`);
  console.log('────────────────────────────────────────────────────────────────');

  let alerts = [];

  for (const item of balances) {
    const threshold = thresholds[item.name];
    let status = '✅ OK';
    
    if (threshold && item.balance < threshold) {
      status = '⚠️  LOW';
      item.needsFunding = true;
      alerts.push({
        name: item.name,
        current: item.formattedBalance,
        recommended: ethers.formatUnits(threshold, decimals)
      });
    }

    const shortAddress = `${item.address.slice(0, 6)}...${item.address.slice(-4)}`;
    console.log(`${item.name.padEnd(25)} ${shortAddress.padEnd(42)} ${item.formattedBalance.padEnd(15)} ${status}`);
  }

  console.log('────────────────────────────────────────────────────────────────');

  // Display alerts
  if (alerts.length > 0) {
    console.log('\n🚨 LOW BALANCE ALERTS');
    console.log('────────────────────────────────────────────────────────────────');
    for (const alert of alerts) {
      console.log(`⚠️  ${alert.name}: ${alert.current} ${symbol} (Recommended: ${alert.recommended} ${symbol})`);
    }
    console.log('────────────────────────────────────────────────────────────────');
    console.log('\n💡 Run fund-contracts.cjs to add more funds');
  } else {
    console.log('\n✅ All contract balances are healthy');
  }

  // Check deployer balance
  const deployerBalance = await trenchyToken.balanceOf(deployer.address);
  const deployerEthBalance = await deployer.provider.getBalance(deployer.address);
  
  console.log('\n👤 Deployer Wallet');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`Address: ${deployer.address}`);
  console.log(`${symbol} Balance: ${ethers.formatUnits(deployerBalance, decimals)}`);
  console.log(`ETH Balance: ${ethers.formatEther(deployerEthBalance)}`);
  console.log('────────────────────────────────────────────────────────────────');

  // Save report
  const reportPath = path.join(__dirname, '..', 'deployments', `balance-report-${Date.now()}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    network: network.name,
    token: {
      address: trenchyTokenAddress,
      symbol,
      decimals: Number(decimals)
    },
    balances: balances.map(b => ({
      name: b.name,
      address: b.address,
      balance: b.formattedBalance,
      needsFunding: b.needsFunding
    })),
    deployer: {
      address: deployer.address,
      tokenBalance: ethers.formatUnits(deployerBalance, decimals),
      ethBalance: ethers.formatEther(deployerEthBalance)
    },
    alerts: alerts
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Balance report saved to: ${reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
