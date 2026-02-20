const fs = require("fs");
const path = require("path");

/**
 * Deprecation Script for Legacy PredictionMarket.sol
 * 
 * This script:
 * 1. Moves PredictionMarket.sol to deprecated/ folder
 * 2. Updates ABIs to mark it as deprecated
 * 3. Updates constants.js to remove old address
 * 4. Creates migration guide
 */

async function main() {
  console.log("========================================");
  console.log("Deprecating Legacy PredictionMarket.sol");
  console.log("========================================\n");

  const rootDir = path.join(__dirname, "..");
  const contractsDir = path.join(rootDir, "contracts");
  const deprecatedDir = path.join(contractsDir, "deprecated");

  // Step 1: Create deprecated folder if not exists
  console.log("📁 Step 1: Creating deprecated folder...");
  if (!fs.existsSync(deprecatedDir)) {
    fs.mkdirSync(deprecatedDir, { recursive: true });
    console.log("✅ Created contracts/deprecated/");
  }

  // Step 2: Move PredictionMarket.sol to deprecated
  console.log("\n📦 Step 2: Moving PredictionMarket.sol to deprecated...");
  const oldContractPath = path.join(contractsDir, "PredictionMarket.sol");
  const deprecatedContractPath = path.join(deprecatedDir, "PredictionMarket.sol.deprecated");

  if (fs.existsSync(oldContractPath)) {
    // Read the content and add deprecation notice
    let content = fs.readFileSync(oldContractPath, "utf8");
    
    const deprecationNotice = `// SPDX-License-Identifier: MIT
// ⚠️ DEPRECATED: This contract has been replaced by the modular Prediction Market system
// ⚠️ DO NOT USE FOR NEW DEPLOYMENTS
// 
// Replacement contracts:
// - PredictionMarketCore.sol: Binary markets (14KB - deployable)
// - PredictionMarketTypes.sol: MultiChoice/Range/TimeBased markets (20KB - deployable)
// - PredictionMarketPayoutLib.sol: Shared calculation library
// - PredictionMarketBase.sol: Abstract base with shared storage
//
// Migration Date: ${new Date().toISOString()}
// Reason: Contract size 25,956 bytes exceeds Ethereum mainnet limit (24,576 bytes)
//

`;
    
    // Replace SPDX line with deprecation notice
    content = content.replace(/\/\/ SPDX-License-Identifier: MIT\n/, deprecationNotice);
    
    // Write to deprecated location
    fs.writeFileSync(deprecatedContractPath, content);
    
    // Remove original file
    fs.unlinkSync(oldContractPath);
    
    console.log("✅ Moved to contracts/deprecated/PredictionMarket.sol.deprecated");
  } else {
    console.log("⚠️ PredictionMarket.sol not found, may already be deprecated");
  }

  // Step 3: Update ABIs file to mark as deprecated
  console.log("\n📝 Step 3: Updating ABIs file...");
  const abisPath = path.join(rootDir, "src", "contracts", "abis.js");
  
  if (fs.existsSync(abisPath)) {
    let abisContent = fs.readFileSync(abisPath, "utf8");
    
    // Add deprecation comment to PREDICTION_MARKET_ABI
    abisContent = abisContent.replace(
      /export const PREDICTION_MARKET_ABI = /,
      `// ⚠️ DEPRECATED: Use PREDICTION_MARKET_CORE_ABI or PREDICTION_MARKET_TYPES_ABI instead\n// This ABI is for the legacy monolithic contract that exceeds size limits\nexport const PREDICTION_MARKET_ABI = `
    );
    
    fs.writeFileSync(abisPath, abisContent);
    console.log("✅ Updated src/contracts/abis.js with deprecation notice");
  }

  // Step 4: Update constants.js to mark as deprecated
  console.log("\n📝 Step 4: Updating constants.js...");
  const constantsPath = path.join(rootDir, "src", "utils", "constants.js");
  
  if (fs.existsSync(constantsPath)) {
    let constantsContent = fs.readFileSync(constantsPath, "utf8");
    
    // Comment out or mark old PREDICTION_MARKET_ADDRESS as deprecated
    constantsContent = constantsContent.replace(
      /export const PREDICTION_MARKET_ADDRESS = /g,
      `// ⚠️ DEPRECATED: Use PREDICTION_MARKET_CORE_ADDRESS or PREDICTION_MARKET_TYPES_ADDRESS\n// export const PREDICTION_MARKET_ADDRESS = `
    );
    
    fs.writeFileSync(constantsPath, constantsContent);
    console.log("✅ Updated src/utils/constants.js with deprecation notice");
  }

  // Step 5: Create migration guide
  console.log("\n📖 Step 5: Creating migration guide...");
  const migrationGuide = `# PredictionMarket Migration Guide

## ⚠️ Legacy Contract Deprecated

The monolithic \`PredictionMarket.sol\` contract has been **deprecated** due to size constraints.

### Why?

- **Legacy Size**: 25,956 bytes
- **Mainnet Limit**: 24,576 bytes
- **Status**: ❌ Cannot deploy to mainnet

### Replacement Architecture

| Contract | Size | Purpose | Status |
|----------|------|---------|--------|
| \`PredictionMarketCore\` | 14,018 bytes | Binary markets (up/down) | ✅ Deployable |
| \`PredictionMarketTypes\` | 20,776 bytes | MultiChoice/Range/TimeBased | ✅ Deployable |
| \`PredictionMarketPayoutLib\` | Library | Shared calculations | ✅ Library |
| \`PredictionMarketBase\` | Abstract | Shared storage | ✅ Base contract |

### Migration Steps

#### 1. Update Contract Addresses

Replace in your frontend code:

\`\`\`javascript
// OLD (Deprecated)
const PREDICTION_MARKET_ADDRESS = "0x..."; // 25KB - too big

// NEW (Modular)
const PREDICTION_MARKET_CORE_ADDRESS = "0x...";      // 14KB - binary markets
const PREDICTION_MARKET_TYPES_ADDRESS = "0x...";     // 20KB - advanced markets
\`\`\`

#### 2. Update ABIs

\`\`\`javascript
// OLD
import { PREDICTION_MARKET_ABI } from './abis';

// NEW
import { 
  PREDICTION_MARKET_CORE_ABI,
  PREDICTION_MARKET_TYPES_ABI 
} from './abis';
\`\`\`

#### 3. Update Function Calls

| Old Function | New Location | New Function |
|--------------|--------------|--------------|
| \`createMarket()\` | Core | \`createMarketWithOdds()\` |
| \`placeBet()\` | Core | \`placeBet()\` |
| \`resolveMarket()\` | Core | \`resolveMarket()\` |
| \`claimWinnings()\` | Core | \`claimWinnings()\` |
| \`createMultiChoiceMarket()\` | Types | \`createMultiChoiceMarketWithOdds()\` |
| \`createRangeMarket()\` | Types | \`createRangeMarketWithOdds()\` |
| \`createTimeMarket()\` | Types | \`createTimeMarketWithOdds()\` |
| \`placeBetAdvanced()\` | Types | \`placeBetAdvanced()\` |

#### 4. Data Migration

Existing markets in the old contract will need to be:
1. Resolved (if active)
2. Migrated manually (user positions)
3. Or users can claim winnings before deprecation

### New Features Available

1. **ChainlinkResolver**: Automated market resolution via Chainlink Automation
2. **TrenchyStaking**: 4-tier staking with points boost and fee discounts
3. **Time-Decay Multipliers**: Dynamic odds that decay over time
4. **Bet Credits**: Award and use bet credits for free bets

### Deployment Info

- **Migration Date**: ${new Date().toISOString()}
- **Deprecated File**: \`contracts/deprecated/PredictionMarket.sol.deprecated\`
- **New Contracts**: See \`deployments/\` folder for latest addresses

### Support

For migration assistance, refer to:
- \`implementation_plan_2.md\` - Full implementation details
- \`DEPLOYMENT_GUIDE.md\` - Deployment instructions
- \`scripts/deploy-modular-prediction-market.cjs\` - Deployment script
`;

  const migrationPath = path.join(rootDir, "MIGRATION_GUIDE.md");
  fs.writeFileSync(migrationPath, migrationGuide);
  console.log("✅ Created MIGRATION_GUIDE.md");

  // Step 6: Update TODO.md to reflect deprecation
  console.log("\n📝 Step 6: Updating TODO.md...");
  const todoPath = path.join(rootDir, "TODO.md");
  
  if (fs.existsSync(todoPath)) {
    let todoContent = fs.readFileSync(todoPath, "utf8");
    
    const deprecationEntry = `
## Phase 3: Contract Deprecation ✅ COMPLETED
- [x] Move PredictionMarket.sol to deprecated/
- [x] Add deprecation notices to ABIs
- [x] Update constants.js
- [x] Create migration guide
- [x] Document new contract architecture

`;
    
    todoContent = deprecationEntry + todoContent;
    fs.writeFileSync(todoPath, todoContent);
    console.log("✅ Updated TODO.md");
  }

  console.log("\n========================================");
  console.log("🎉 DEPRECATION COMPLETE!");
  console.log("========================================");
  console.log("\nSummary:");
  console.log("--------");
  console.log("✅ PredictionMarket.sol moved to deprecated/");
  console.log("✅ ABIs updated with deprecation notices");
  console.log("✅ Constants updated");
  console.log("✅ Migration guide created (MIGRATION_GUIDE.md)");
  console.log("✅ TODO.md updated");
  console.log("\nNext Steps:");
  console.log("-----------");
  console.log("1. Deploy new modular contracts to testnet");
  console.log("2. Update frontend to use new contract addresses");
  console.log("3. Test all functionality with new contracts");
  console.log("4. Plan migration of existing markets (if any)");
  console.log("5. Remove deprecated file after full migration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
