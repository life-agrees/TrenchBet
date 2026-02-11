// Prediction Market ABI (Complete with Custom Odds Support)
export const PREDICTION_MARKET_ABI = [
  // ==================== EXISTING FUNCTIONS (Keep these) ====================
  {
    "inputs": [{"internalType": "string","name": "asset","type": "string"}],
    "name": "createMarket",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "count","type": "uint256"}
    ],
    "name": "batchCreateMarkets",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"}, 
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "claimWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getMarket",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256","name": "id","type": "uint256"},
          {"internalType": "enum PredictionMarket.MarketType","name": "marketType","type": "uint8"},
          {"internalType": "string","name": "asset","type": "string"},
          {"internalType": "uint256","name": "startTime","type": "uint256"},
          {"internalType": "uint256","name": "endTime","type": "uint256"},
          {"internalType": "int256","name": "startPrice","type": "int256"},
          {"internalType": "int256","name": "endPrice","type": "int256"},
          {"internalType": "uint256","name": "yesPool","type": "uint256"},
          {"internalType": "uint256","name": "noPool","type": "uint256"},
          {"internalType": "bool","name": "resolved","type": "bool"},
          {"internalType": "bool","name": "priceWentUp","type": "bool"},
          {"internalType": "uint256","name": "totalBets","type": "uint256"},
          {"internalType": "bool","name": "useFixedOdds","type": "bool"},
          {"internalType": "uint256","name": "yesMultiplier","type": "uint256"},
          {"internalType": "uint256","name": "noMultiplier","type": "uint256"},
          {"internalType": "uint256","name": "protocolFee","type": "uint256"}
        ],
        "internalType": "struct PredictionMarket.Market",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "accumulatedFees",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "marketCounter",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [{"internalType": "string","name": "asset","type": "string"}],
    "name": "getCurrentPrice",
    "outputs": [{"internalType": "int256","name": "","type": "int256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getUserMarkets",
    "outputs": [{"internalType": "uint256[]","name": "","type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "address","name": "user","type": "address"}
    ],
    "name": "getUserPositionsInMarket",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256","name": "marketId","type": "uint256"},
          {"internalType": "address","name": "user","type": "address"},
          {"internalType": "bool","name": "predictedUp","type": "bool"},
          {"internalType": "uint8","name": "choice","type": "uint8"},
          {"internalType": "uint256","name": "amount","type": "uint256"},
          {"internalType": "bool","name": "claimed","type": "bool"}
        ],
        "internalType": "struct PredictionMarket.Position[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "bool","name": "predictedUp","type": "bool"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "calculatePotentialWinnings",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getOdds",
    "outputs": [
      {"internalType": "uint256","name": "yesOdds","type": "uint256"},
      {"internalType": "uint256","name": "noOdds","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "count","type": "uint256"}],
    "name": "getLeaderboard",
    "outputs": [
      {"internalType": "address[]","name": "topUsers","type": "address[]"},
      {"internalType": "uint256[]","name": "earnings","type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ==================== NEW FUNCTIONS FOR CUSTOM ODDS ====================

  
  // Binary Market with Custom Odds
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256","name": "yesMultiplier","type": "uint256"},
      {"internalType": "uint256","name": "noMultiplier","type": "uint256"}
    ],
    "name": "createMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Multi-Choice Market with Custom Odds
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "string[]","name": "options","type": "string[]"},
      {"internalType": "string","name": "question","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"}
    ],
    "name": "createMultiChoiceMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Range Market with Custom Odds
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256[]","name": "rangeMins","type": "uint256[]"},
      {"internalType": "uint256[]","name": "rangeMaxs","type": "uint256[]"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"}
    ],
    "name": "createRangeMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Time-Based Market with Custom Odds
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "targetPrice","type": "uint256"},
      {"internalType": "uint256[]","name": "timeframes","type": "uint256[]"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"}
    ],
    "name": "createTimeMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Get Multi-Choice Options
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getMultiChoiceOptions",
    "outputs": [{"internalType": "string[]","name": "","type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Get Range Market Data
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getRangeMarketData",
    "outputs": [
      {"internalType": "uint256[]","name": "mins","type": "uint256[]"},
      {"internalType": "uint256[]","name": "maxs","type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Get Time Market Data
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getTimeMarketData",
    "outputs": [
      {"internalType": "uint256","name": "targetPrice","type": "uint256"},
      {"internalType": "uint256[]","name": "timeframes","type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Resolve Multi-Choice Market
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "winningOption","type": "uint8"}
    ],
    "name": "resolveMultiChoiceMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Resolve Range Market
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveRangeMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Resolve Time Market
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveTimeMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Calculate Potential Payout (New version for all market types)
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "calculatePotentialPayout",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Get Current Odds (Shows multipliers for all choices)
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getCurrentOdds",
    "outputs": [{"internalType": "uint256[]","name": "multipliers","type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ==================== EVENTS ====================
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": false,"internalType": "enum PredictionMarket.MarketType","name": "marketType","type": "uint8"},
      {"indexed": false,"internalType": "string","name": "asset","type": "string"},
      {"indexed": false,"internalType": "bool","name": "useFixedOdds","type": "bool"}
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint8","name": "choice","type": "uint8"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": false,"internalType": "uint8","name": "winningChoice","type": "uint8"}
    ],
    "name": "MarketResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "WinningsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "owner","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "FeesWithdrawn",
    "type": "event"
  }
];

// TrenchyPointsClaim ABI
export const TRENCHY_POINTS_CLAIM_ABI = [
  {
    "inputs": [
      {"internalType": "uint256","name": "pointsAmount","type": "uint256"},
      {"internalType": "bool","name": "autoStake","type": "bool"},
      {"internalType": "bytes32","name": "nonce","type": "bytes32"},
      {"internalType": "bytes","name": "signature","type": "bytes"}
    ],
    "name": "claimPoints",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawUnlocked",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getUnlockedBalance",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getUserClaimHistory",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256","name": "amount","type": "uint256"},
          {"internalType": "uint256","name": "claimTime","type": "uint256"},
          {"internalType": "uint256","name": "unlockTime","type": "uint256"},
          {"internalType": "bool","name": "autoStaked","type": "bool"},
          {"internalType": "bool","name": "withdrawn","type": "bool"}
        ],
        "internalType": "struct TrenchyPointsClaim.ClaimRecord[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getMonthlyClaimStatus",
    "outputs": [
      {"internalType": "uint256","name": "claimedThisMonth","type": "uint256"},
      {"internalType": "uint256","name": "remainingCap","type": "uint256"},
      {"internalType": "uint256","name": "monthEndsAt","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "user","type": "address"},
      {"internalType": "uint256","name": "trenchyAmount","type": "uint256"}
    ],
    "name": "canClaim",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractInfo",
    "outputs": [
      {"internalType": "uint256","name": "totalDistributedAmount","type": "uint256"},
      {"internalType": "uint256","name": "contractBalance","type": "uint256"},
      {"internalType": "bool","name": "isClaimingEnabled","type": "bool"},
      {"internalType": "address","name": "currentBackendSigner","type": "address"},
      {"internalType": "address","name": "currentStakingContract","type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimingEnabled",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POINTS_PER_TRENCHY",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LOCK_PERIOD",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MONTHLY_CLAIM_CAP",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "pointsSpent","type": "uint256"},
      {"indexed": false,"internalType": "uint256","name": "trenchyAmount","type": "uint256"},
      {"indexed": false,"internalType": "bool","name": "autoStaked","type": "bool"}
    ],
    "name": "PointsClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "TokensUnlocked",
    "type": "event"
  }
];

// ERC20 USDC ABI (Minimal for approve, allowance, balanceOf)
export const ERC20_ABI = [

  {
    "inputs": [
      {"internalType": "address","name": "spender","type": "address"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "owner","type": "address"},
      {"internalType": "address","name": "spender","type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "account","type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8","name": "","type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
];
