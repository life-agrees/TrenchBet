/**
 * Complete Deployment Script for TrenchyBet Contracts
 * Deploys all contracts in the correct order with proper initialization
 * 
 * Usage: npx hardhat run scripts/deploy-all-contracts.cjs --network <network>
 */

const { ethers, run } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Token addresses - UPDATE THESE FOR YOUR NETWORK
  TRENCHY_TOKEN: process.env.TRENCHY_TOKEN_ADDRESS || '0x...', // Your TRENCHY token
  USDC_TOKEN: process.env.USDC_TOKEN_ADDRESS || '0x...', // USDC on your network
  
  // Deployment settings
  VERIFY_CONTRACTS: process.env.VERIFY_CONTRACTS === 'true',
  SAVE_DEPLOYMENT: true,
  
  // Contract-specific settings
  AIRDROP_MAX_RECIPIENTS: 1000,
  AIRDROP_AMOUNT: ethers.parseEther('100'), // 100 TRENCHY
  REFERRAL_REWARD: ethers.parseEther('10'), // 10 TRENCHY per referral
  INSURANCE_MAX_USDC: ethers.parseUnits('100', 6), // $100 USDC
};

// Deployment state
const deploymentState = {
  network: '',
  timestamp: new Date().toISOString(),
  contracts: {},
  config: {},
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     TrenchyBet Complete Contract Deployment                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nNetwork: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  // Validate configuration
  if (CONFIG.TRENCHY_TOKEN === '0x...' || !CONFIG.TRENCHY_TOKEN) {
    throw new Error('TRENCHY_TOKEN_ADDRESS not configured! Set it in environment variables.');
  }

  deploymentState.network = network.name;
  deploymentState.config = { ...CONFIG, TRENCHY_TOKEN: CONFIG.TRENCHY_TOKEN };

  try {
    // ========================================
    // PHASE 1: Deploy Core Utility Contracts
    // ========================================
    
    console.log('\n📦 PHASE 1: Deploying Core Contracts\n');
    
    // 1. Deploy TrenchyReferrals
    console.log('1️⃣  Deploying TrenchyReferrals...');
    const TrenchyReferrals = await ethers.getContractFactory('TrenchyReferrals');
    const referrals = await TrenchyReferrals.deploy(CONFIG.TRENCHY_TOKEN);
    await referrals.waitForDeployment();
    const referralsAddress = await referrals.getAddress();
    console.log(`   ✅ TrenchyReferrals: ${referralsAddress}`);
    deploymentState.contracts.TrenchyReferrals = referralsAddress;
    
    // 2. Deploy TrenchyAchievements
    console.log('2️⃣  Deploying TrenchyAchievements...');
    const TrenchyAchievements = await ethers.getContractFactory('TrenchyAchievements');
    const achievements = await TrenchyAchievements.deploy(CONFIG.TRENCHY_TOKEN);
    await achievements.waitForDeployment();
    const achievementsAddress = await achievements.getAddress();
    console.log(`   ✅ TrenchyAchievements: ${achievementsAddress}`);
    deploymentState.contracts.TrenchyAchievements = achievementsAddress;
    
    // 3. Deploy TrenchyStreaks
    console.log('3️⃣  Deploying TrenchyStreaks...');
    const TrenchyStreaks = await ethers.getContractFactory('TrenchyStreaks');
    const streaks = await TrenchyStreaks.deploy(CONFIG.TRENCHY_TOKEN);
    await streaks.waitForDeployment();
    const streaksAddress = await streaks.getAddress();
    console.log(`   ✅ TrenchyStreaks: ${streaksAddress}`);
    deploymentState.contracts.TrenchyStreaks = streaksAddress;

    // ========================================
    // PHASE 2: Deploy Launch Incentive Contracts
    // ========================================
    
    console.log('\n📦 PHASE 2: Deploying Launch Incentive Contracts\n');
    
    // 4. Deploy LaunchAirdrop
    console.log('4️⃣  Deploying LaunchAirdrop...');
    const LaunchAirdrop = await ethers.getContractFactory('LaunchAirdrop');
    const airdrop = await LaunchAirdrop.deploy(CONFIG.TRENCHY_TOKEN);
    await airdrop.waitForDeployment();
    const airdropAddress = await airdrop.getAddress();
    console.log(`   ✅ LaunchAirdrop: ${airdropAddress}`);
    deploymentState.contracts.LaunchAirdrop = airdropAddress;
    
    // 5. Deploy FirstBetInsurance
    console.log('5️⃣  Deploying FirstBetInsurance...');
    if (CONFIG.USDC_TOKEN === '0x...' || !CONFIG.USDC_TOKEN) {
      console.log('   ⚠️  USDC token not configured, skipping FirstBetInsurance');
    } else {
      const FirstBetInsurance = await ethers.getContractFactory('FirstBetInsurance');
      const insurance = await FirstBetInsurance.deploy(CONFIG.USDC_TOKEN, CONFIG.TRENCHY_TOKEN);
      await insurance.waitForDeployment();
      const insuranceAddress = await insurance.getAddress();
      console.log(`   ✅ FirstBetInsurance: ${insuranceAddress}`);
      deploymentState.contracts.FirstBetInsurance = insuranceAddress;
    }

    // ========================================
    // PHASE 3: Configure Contract Relationships
    // ========================================
    
    console.log('\n⚙️  PHASE 3: Configuring Contract Relationships\n');
    
    // Set PredictionMarket in LaunchAirdrop (if available)
    if (process.env.PREDICTION_MARKET_ADDRESS) {
      console.log('🔗 Setting PredictionMarket in LaunchAirdrop...');
      const tx1 = await airdrop.setPredictionMarket(process.env.PREDICTION_MARKET_ADDRESS);
      await tx1.wait();
      console.log(`   ✅ PredictionMarket set: ${process.env.PREDICTION_MARKET_ADDRESS}`);
    } else {
      console.log('   ⚠️  PREDICTION_MARKET_ADDRESS not set, skipping airdrop configuration');
      console.log('   📝 Run: airdrop.setPredictionMarket(address) after deployment');
    }
    
    // Set PredictionMarket in FirstBetInsurance (if available)
    if (deploymentState.contracts.FirstBetInsurance && process.env.PREDICTION_MARKET_ADDRESS) {
      console.log('🔗 Setting PredictionMarket in FirstBetInsurance...');
      const insurance = await ethers.getContractAt('FirstBetInsurance', deploymentState.contracts.FirstBetInsurance);
      const tx2 = await insurance.setPredictionMarket(process.env.PREDICTION_MARKET_ADDRESS);
      await tx2.wait();
      console.log(`   ✅ PredictionMarket set in insurance contract`);
    }

    // ========================================
    // PHASE 4: Fund Contracts
    // ========================================
    
    console.log('\n💰 PHASE 4: Funding Contracts\n');
    
    // Fund LaunchAirdrop
    const airdropTotalNeeded = CONFIG.AIRDROP_AMOUNT * BigInt(CONFIG.AIRDROP_MAX_RECIPIENTS);
    console.log(`💸 Funding LaunchAirdrop with ${ethers.formatEther(airdropTotalNeeded)} TRENCHY...`);
    const trenchyToken = await ethers.getContractAt('IERC20', CONFIG.TRENCHY_TOKEN);
    const fundTx1 = await trenchyToken.transfer(airdropAddress, airdropTotalNeeded);
    await fundTx1.wait();
    console.log(`   ✅ Funded with ${ethers.formatEther(airdropTotalNeeded)} TRENCHY`);
    
    // Fund TrenchyReferrals
    const referralFundAmount = ethers.parseEther('10000'); // 10k TRENCHY for referrals
    console.log(`💸 Funding TrenchyReferrals with ${ethers.formatEther(referralFundAmount)} TRENCHY...`);
    const fundTx2 = await trenchyToken.transfer(referralsAddress, referralFundAmount);
    await fundTx2.wait();
    console.log(`   ✅ Funded with ${ethers.formatEther(referralFundAmount)} TRENCHY`);
    
    // Fund TrenchyAchievements
    const achievementFundAmount = ethers.parseEther('5000'); // 5k TRENCHY for achievements
    console.log(`💸 Funding TrenchyAchievements with ${ethers.formatEther(achievementFundAmount)} TRENCHY...`);
    const fundTx3 = await trenchyToken.transfer(achievementsAddress, achievementFundAmount);
    await fundTx3.wait();
    console.log(`   ✅ Funded with ${ethers.formatEther(achievementFundAmount)} TRENCHY`);
    
    // Fund FirstBetInsurance (if deployed)
    if (deploymentState.contracts.FirstBetInsurance) {
      const insuranceFundAmount = ethers.parseEther('5000'); // 5k TRENCHY for insurance payouts
      console.log(`💸 Funding FirstBetInsurance with ${ethers.formatEther(insuranceFundAmount)} TRENCHY...`);
      const fundTx4 = await trenchyToken.transfer(deploymentState.contracts.FirstBetInsurance, insuranceFundAmount);
      await fundTx4.wait();
      console.log(`   ✅ Funded with ${ethers.formatEther(insuranceFundAmount)} TRENCHY`);
    }

    // ========================================
    // PHASE 5: Verify Contracts (if enabled)
    // ========================================
    
    if (CONFIG.VERIFY_CONTRACTS) {
      console.log('\n🔍 PHASE 5: Verifying Contracts on Etherscan\n');
      
      const contractsToVerify = [
        { name: 'TrenchyReferrals', address: referralsAddress, args: [CONFIG.TRENCHY_TOKEN] },
        { name: 'TrenchyAchievements', address: achievementsAddress, args: [CONFIG.TRENCHY_TOKEN] },
        { name: 'TrenchyStreaks', address: streaksAddress, args: [CONFIG.TRENCHY_TOKEN] },
        { name: 'LaunchAirdrop', address: airdropAddress, args: [CONFIG.TRENCHY_TOKEN] },
      ];
      
      if (deploymentState.contracts.FirstBetInsurance) {
        contractsToVerify.push({
          name: 'FirstBetInsurance',
          address: deploymentState.contracts.FirstBetInsurance,
          args: [CONFIG.USDC_TOKEN, CONFIG.TRENCHY_TOKEN]
        });
      }
      
      for (const contract of contractsToVerify) {
        try {
          console.log(`🔍 Verifying ${contract.name}...`);
          await run('verify:verify', {
            address: contract.address,
            constructorArguments: contract.args,
          });
          console.log(`   ✅ ${contract.name} verified`);
        } catch (err) {
          console.log(`   ⚠️  ${contract.name} verification failed: ${err.message}`);
        }
      }
    }

    // ========================================
    // Save Deployment State
    // ========================================
    
    if (CONFIG.SAVE_DEPLOYMENT) {
      const deploymentPath = path.join(__dirname, '..', 'deployments');
      if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath, { recursive: true });
      }
      
      const filename = `deployment-${network.name}-${Date.now()}.json`;
      const filepath = path.join(deploymentPath, filename);
      
      // Custom replacer to handle BigInt serialization
      const bigIntReplacer = (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };
      
      fs.writeFileSync(filepath, JSON.stringify(deploymentState, bigIntReplacer, 2));
      console.log(`\n💾 Deployment state saved to: ${filepath}`);
      
      // Also save as latest.json
      const latestPath = path.join(deploymentPath, `latest-${network.name}.json`);
      fs.writeFileSync(latestPath, JSON.stringify(deploymentState, bigIntReplacer, 2));
    }


    // ========================================
    // Print Summary
    // ========================================
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              DEPLOYMENT COMPLETE ✅                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n📋 Contract Addresses:');
    console.log('─────────────────────────────────────────────────────────────');
    Object.entries(deploymentState.contracts).forEach(([name, address]) => {
      console.log(`  ${name.padEnd(25)} ${address}`);
    });
    console.log('─────────────────────────────────────────────────────────────');
    
    console.log('\n📝 Next Steps:');
    console.log('  1. Update frontend environment variables with contract addresses');
    console.log('  2. Set PredictionMarket address in LaunchAirdrop and FirstBetInsurance');
    console.log('  3. Test all contract functions on testnet');
    console.log('  4. Verify contracts on block explorer (if not auto-verified)');
    console.log('  5. Monitor contract balances and fund as needed');
    
    console.log('\n⚠️  IMPORTANT: Save the deployment JSON file for mainnet migration!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    
    // Save partial deployment state for recovery
    if (CONFIG.SAVE_DEPLOYMENT && Object.keys(deploymentState.contracts).length > 0) {
      const recoveryPath = path.join(__dirname, '..', 'deployments', `failed-${Date.now()}.json`);
      // Custom replacer to handle BigInt serialization
      const bigIntReplacer = (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };
      fs.writeFileSync(recoveryPath, JSON.stringify(deploymentState, bigIntReplacer, 2));
      console.log(`\n💾 Partial deployment state saved to: ${recoveryPath}`);
    }

    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
