// Prediction Market ABI (Complete with Custom Odds Support)
// ⚠️ DEPRECATED: Use PREDICTION_MARKET_CORE_ABI or PREDICTION_MARKET_TYPES_ABI instead
// This ABI is for the legacy monolithic contract that exceeds size limits
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
          {"internalType": "uint256","name": "protocolFee","type": "uint256"},
          {"internalType": "bool","name": "useTimeDecay","type": "bool"},
          {"internalType": "uint256","name": "decayStartTime","type": "uint256"},
          {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
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
          {"internalType": "bool","name": "claimed","type": "bool"},
          {"internalType": "uint256","name": "effectiveMultiplier","type": "uint256"}
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
    "inputs": [],
    "name": "withdrawFees",
    "outputs": [],
    "stateMutability": "nonpayable",
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

  
  // Binary Market with Custom Odds and Time Decay
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256","name": "yesMultiplier","type": "uint256"},
      {"internalType": "uint256","name": "noMultiplier","type": "uint256"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  
  // Multi-Choice Market with Custom Odds and Time Decay
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "string[]","name": "options","type": "string[]"},
      {"internalType": "string","name": "question","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createMultiChoiceMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  
  // Range Market with Custom Odds and Time Decay
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256[]","name": "rangeMins","type": "uint256[]"},
      {"internalType": "uint256[]","name": "rangeMaxs","type": "uint256[]"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createRangeMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  
  // Time-Based Market with Custom Odds and Time Decay
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "targetPrice","type": "uint256"},
      {"internalType": "uint256[]","name": "timeframes","type": "uint256[]"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
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
  
  // ==================== TIME DECAY FUNCTIONS ====================
  
  // Get Effective Multiplier with Time Decay Applied
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"}
    ],
    "name": "getEffectiveMultiplier",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Get Decay Status
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getDecayStatus",
    "outputs": [
      {"internalType": "bool","name": "isDecaying","type": "bool"},
      {"internalType": "uint256","name": "decayProgress","type": "uint256"},
      {"internalType": "uint256","name": "currentMultiplier","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },


  // ==================== BET CREDITS FUNCTIONS ====================
  
  // Get Bet Credits Balance
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getBetCredits",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Place Bet with Credits Only
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"},
      {"internalType": "uint256","name": "creditAmount","type": "uint256"}
    ],
    "name": "placeBetWithCredits",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Place Bet with Mixed Credits and USDC
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"},
      {"internalType": "uint256","name": "usdcAmount","type": "uint256"},
      {"internalType": "uint256","name": "creditAmount","type": "uint256"}
    ],
    "name": "placeBetWithMixed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Award Bet Credits (Admin only)
  {
    "inputs": [
      {"internalType": "address","name": "user","type": "address"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "awardBetCredit",
    "outputs": [],
    "stateMutability": "nonpayable",
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
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "BetCreditAwarded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "BetCreditUsed",
    "type": "event"
  }
];


// ==========================================
// MODULAR PREDICTION MARKET ABIs (Phase 2)
// ==========================================

// PredictionMarketCore ABI - Handles binary (UP/DOWN) markets
export const PREDICTION_MARKET_CORE_ABI = [
  // View Functions
  {
    "inputs": [],
    "name": "marketCounter",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // markets mapping - public getter for Market struct
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "markets",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256","name": "id","type": "uint256"},
          {"internalType": "enum PredictionMarketCore.MarketType","name": "marketType","type": "uint8"},
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
          {"internalType": "uint256","name": "protocolFee","type": "uint256"},
          {"internalType": "bool","name": "useTimeDecay","type": "bool"},
          {"internalType": "uint256","name": "decayStartTime","type": "uint256"},
          {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
        ],
        "internalType": "struct PredictionMarketCore.Market",
        "name": "",
        "type": "tuple"
      }
    ],
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
          {"internalType": "bool","name": "claimed","type": "bool"},
          {"internalType": "uint256","name": "effectiveMultiplier","type": "uint256"}
        ],
        "internalType": "struct PredictionMarketCore.Position[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getCurrentOdds",
    "outputs": [{"internalType": "uint256[]","name": "multipliers","type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"}
    ],
    "name": "getEffectiveMultiplier",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getDecayStatus",
    "outputs": [
      {"internalType": "bool","name": "isDecaying","type": "bool"},
      {"internalType": "uint256","name": "decayProgress","type": "uint256"},
      {"internalType": "uint256","name": "currentMultiplier","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
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
  // Write Functions
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256","name": "yesMultiplier","type": "uint256"},
      {"internalType": "uint256","name": "noMultiplier","type": "uint256"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
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
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": false,"internalType": "enum PredictionMarketCore.MarketType","name": "marketType","type": "uint8"},
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
  }
];

// PredictionMarketTypes ABI - Handles multi-choice, range, and time-based markets
export const PREDICTION_MARKET_TYPES_ABI = [
  // View Functions
  {
    "inputs": [],
    "name": "marketCounter",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  // markets mapping - public getter for Market struct
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "markets",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256","name": "id","type": "uint256"},
          {"internalType": "enum PredictionMarketTypes.MarketType","name": "marketType","type": "uint8"},
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
          {"internalType": "uint256","name": "protocolFee","type": "uint256"},
          {"internalType": "bool","name": "useTimeDecay","type": "bool"},
          {"internalType": "uint256","name": "decayStartTime","type": "uint256"},
          {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
        ],
        "internalType": "struct PredictionMarketTypes.Market",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getMultiChoiceOptions",
    "outputs": [{"internalType": "string[]","name": "","type": "string[]"}],
    "stateMutability": "view",
    "type": "function"
  },
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
          {"internalType": "bool","name": "claimed","type": "bool"},
          {"internalType": "uint256","name": "effectiveMultiplier","type": "uint256"}
        ],
        "internalType": "struct PredictionMarketTypes.Position[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getCurrentOdds",
    "outputs": [{"internalType": "uint256[]","name": "multipliers","type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint8"}
    ],
    "name": "getEffectiveMultiplier",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "getDecayStatus",
    "outputs": [
      {"internalType": "bool","name": "isDecaying","type": "bool"},
      {"internalType": "uint256","name": "decayProgress","type": "uint256"},
      {"internalType": "uint256","name": "currentMultiplier","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
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
  // Write Functions - Market Creation
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "string[]","name": "options","type": "string[]"},
      {"internalType": "string","name": "question","type": "string"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createMultiChoiceMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256[]","name": "rangeMins","type": "uint256[]"},
      {"internalType": "uint256[]","name": "rangeMaxs","type": "uint256[]"},
      {"internalType": "uint256","name": "duration","type": "uint256"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createRangeMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "uint256","name": "targetPrice","type": "uint256"},
      {"internalType": "uint256[]","name": "timeframes","type": "uint256[]"},
      {"internalType": "uint256[]","name": "multipliers","type": "uint256[]"},
      {"internalType": "bool","name": "useTimeDecay","type": "bool"},
      {"internalType": "uint256","name": "decayStartPercent","type": "uint256"},
      {"internalType": "uint256","name": "minMultiplier","type": "uint256"}
    ],
    "name": "createTimeMarketWithOdds",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Write Functions - Betting & Resolution
  {
    "inputs": [
      {"internalType": "uint256","name": "marketId","type": "uint256"},
      {"internalType": "uint8","name": "choice","type": "uint256"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "placeBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveRangeMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "marketId","type": "uint256"}],
    "name": "resolveTimeMarket",
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
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": false,"internalType": "enum PredictionMarketTypes.MarketType","name": "marketType","type": "uint8"},
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

// TrenchyReferrals ABI
export const TRENCHY_REFERRALS_ABI = [
  {
    "inputs": [{"internalType": "address","name": "_trenchyToken","type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyReferred",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotReferSelf",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidReferrer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoReferralToClaim",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": true,"internalType": "address","name": "referrer","type": "address"}
    ],
    "name": "ReferralRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "referrer","type": "address"},
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "ReferralRewardClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "referrer","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "totalAmount","type": "uint256"}
    ],
    "name": "RewardDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "previousOwner","type": "address"},
      {"indexed": true,"internalType": "address","name": "newOwner","type": "address"}
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getReferrer",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "referrer","type": "address"}],
    "name": "getReferralCount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "referrer","type": "address"}],
    "name": "getReferralEarnings",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "hasBeenReferred",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalReferrers",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256","name": "start","type": "uint256"},
      {"internalType": "uint256","name": "count","type": "uint256"}
    ],
    "name": "getReferrers",
    "outputs": [{"internalType": "address[]","name": "","type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "referrer","type": "address"}],
    "name": "registerReferral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "claimReferralReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address[]","name": "users","type": "address[]"}],
    "name": "batchAwardReferralRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "fund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "token","type": "address"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "newOwner","type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "REFERRAL_REWARD",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "trenchyToken",
    "outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "","type": "address"}],
    "name": "referredBy",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "","type": "address"}],
    "name": "referralCount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "","type": "address"}],
    "name": "referralEarnings",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "","type": "address"}],
    "name": "isReferrer",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "name": "referrers",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// TrenchyAchievements ABI
export const TRENCHY_ACHIEVEMENTS_ABI = [
  {
    "inputs": [{"internalType": "address","name": "_trenchyToken","type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AchievementAlreadyUnlocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAchievement",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint8","name": "achievement","type": "uint8"},
      {"indexed": false,"internalType": "uint256","name": "points","type": "uint256"}
    ],
    "name": "AchievementUnlocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "points","type": "uint256"},
      {"indexed": false,"internalType": "string","name": "reason","type": "string"}
    ],
    "name": "PointsAwarded",
    "type": "event"
  },
  {
    "inputs": [
      {"internalType": "address","name": "user","type": "address"},
      {"internalType": "uint256","name": "points","type": "uint256"},
      {"internalType": "string","name": "reason","type": "string"}
    ],
    "name": "awardPoints",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address[]","name": "users","type": "address[]"},
      {"internalType": "uint8[]","name": "achievements","type": "uint8[]"}
    ],
    "name": "batchUnlockAchievements",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "user","type": "address"},
      {"internalType": "uint8","name": "achievement","type": "uint8"}
    ],
    "name": "checkAchievement",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "token","type": "address"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "fund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint8","name": "achievement","type": "uint8"}],
    "name": "getAchievementPoints",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "count","type": "uint256"}],
    "name": "getLeaderboard",
    "outputs": [
      {"internalType": "address[]","name": "topUsers","type": "address[]"},
      {"internalType": "uint256[]","name": "points","type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getUserAchievements",
    "outputs": [{"internalType": "bool[13]","name": "","type": "bool[13]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getUserRank",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "achievementCount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "","type": "address"},
      {"internalType": "uint8","name": "","type": "uint8"}
    ],
    "name": "hasAchievement",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "name": "leaderboard",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "","type": "address"},
      {"internalType": "uint8","name": "","type": "uint8"}
    ],
    "name": "achievementPoints",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "","type": "address"}],
    "name": "leaderboardPosition",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
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
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "trenchyToken",
    "outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "totalAchievementPoints",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "newOwner","type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "user","type": "address"},
      {"internalType": "uint8","name": "achievement","type": "uint8"}
    ],
    "name": "unlockAchievement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// LaunchAirdrop ABI
export const LAUNCH_AIRDROP_ABI = [
  {
    "inputs": [{"internalType": "address","name": "_trenchyToken","type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AirdropEnded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyClaimed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MustPlaceBetFirst",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "AirdropClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "market","type": "address"}
    ],
    "name": "PredictionMarketSet",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "AIRDROP_AMOUNT",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_RECIPIENTS",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimAirdrop",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "fund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getRemainingSlots",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStats",
    "outputs": [
      {"internalType": "uint256","name": "totalRecipients","type": "uint256"},
      {"internalType": "uint256","name": "remainingSlots","type": "uint256"},
      {"internalType": "uint256","name": "totalFunded","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "hasClaimed",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "hasPlacedBet",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "isEligible",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
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
    "inputs": [],
    "name": "predictionMarket",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "recipientCount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "_predictionMarket","type": "address"}],
    "name": "setPredictionMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "trenchyToken",
    "outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "newOwner","type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// FirstBetInsurance ABI
export const FIRST_BET_INSURANCE_ABI = [
  {
    "inputs": [
      {"internalType": "address","name": "_usdc","type": "address"},
      {"internalType": "address","name": "_trenchyToken","type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "FirstBetNotLost",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsuranceAlreadyUsed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoFirstBet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "usdcAmount","type": "uint256"},
      {"indexed": false,"internalType": "uint256","name": "trenchyAmount","type": "uint256"}
    ],
    "name": "InsuranceClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "FirstBetRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "bool","name": "won","type": "bool"}
    ],
    "name": "FirstBetResult",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_INSURANCE_USDC",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TRENCHY_PER_USDC",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "canClaimInsurance",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimInsurance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "fund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "firstBetAmount",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "firstBetLost",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getInsuranceStatus",
    "outputs": [
      {"internalType": "bool","name": "hasInsurance","type": "bool"},
      {"internalType": "uint256","name": "betAmount","type": "uint256"},
      {"internalType": "bool","name": "betLost","type": "bool"},
      {"internalType": "bool","name": "claimed","type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "hasUsedInsurance",
    "outputs": [{"internalType": "bool","name": "","type": "bool"}],
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
    "inputs": [],
    "name": "predictionMarket",
    "outputs": [{"internalType": "address","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "user","type": "address"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "recordFirstBet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "user","type": "address"},
      {"internalType": "bool","name": "won","type": "bool"}
    ],
    "name": "recordFirstBetResult",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "_predictionMarket","type": "address"}],
    "name": "setPredictionMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "trenchyToken",
    "outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "newOwner","type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdrawTrenchy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdrawUSDC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// ChainlinkResolver ABI
export const CHAINLINK_RESOLVER_ABI = [
  {
    "inputs": [{"internalType": "address","name": "_predictionMarket","type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InvalidPrice",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MarketAlreadyResolved",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MarketNotExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoMarketsToResolve",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceFeedNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RoundNotComplete",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "uint256","name": "marketId","type": "uint256"},
      {"indexed": false,"internalType": "int256","name": "endPrice","type": "int256"},
      {"indexed": false,"internalType": "bool","name": "priceWentUp","type": "bool"}
    ],
    "name": "MarketAutoResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "string","name": "asset","type": "string"},
      {"indexed": true,"internalType": "address","name": "priceFeed","type": "address"}
    ],
    "name": "PriceFeedAdded",
    "type": "event"
  },
  {
    "inputs": [{"internalType": "string","name": "asset","type": "string"}],
    "name": "getLatestPrice",
    "outputs": [{"internalType": "int256","name": "","type": "int256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string","name": "","type": "string"}],
    "name": "priceFeeds",
    "outputs": [{"internalType": "contract AggregatorV3Interface","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "predictionMarket",
    "outputs": [{"internalType": "contract PredictionMarket","name": "","type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string","name": "asset","type": "string"},
      {"internalType": "address","name": "priceFeed","type": "address"}
    ],
    "name": "addPriceFeed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes","name": "","type": "bytes"}],
    "name": "checkUpkeep",
    "outputs": [
      {"internalType": "bool","name": "upkeepNeeded","type": "bool"},
      {"internalType": "bytes","name": "performData","type": "bytes"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes","name": "performData","type": "bytes"}],
    "name": "performUpkeep",
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
  }
];

// TrenchyStaking ABI
export const TRENCHY_STAKING_ABI = [
  {
    "inputs": [{"internalType": "address","name": "_trenchyToken","type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "CooldownPeriodNotMet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientStake",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoStakeToUnstake",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "Staked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "Unstaked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType": "address","name": "user","type": "address"},
      {"indexed": false,"internalType": "uint256","name": "unlockTime","type": "uint256"}
    ],
    "name": "UnstakeRequested",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BRONZE_THRESHOLD",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "COOLDOWN_PERIOD",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DIAMOND_THRESHOLD",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "GOLD_THRESHOLD",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SILVER_THRESHOLD",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "canUnstake",
    "outputs": [
      {"internalType": "bool","name": "canUnstake","type": "bool"},
      {"internalType": "uint256","name": "timeRemaining","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "user","type": "address"}],
    "name": "getStakeInfo",
    "outputs": [
      {"internalType": "uint256","name": "tier","type": "uint256"},
      {"internalType": "uint256","name": "pointsBoost","type": "uint256"},
      {"internalType": "uint256","name": "feeDiscount","type": "uint256"},
      {"internalType": "uint256","name": "amount","type": "uint256"},
      {"internalType": "uint256","name": "unlockTime","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "requestUnstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "amount","type": "uint256"}],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "","type": "address"}],
    "name": "stakes",
    "outputs": [
      {"internalType": "uint256","name": "amount","type": "uint256"},
      {"internalType": "uint256","name": "since","type": "uint256"},
      {"internalType": "uint256","name": "tier","type": "uint256"},
      {"internalType": "uint256","name": "pointsBoost","type": "uint256"},
      {"internalType": "uint256","name": "feeDiscount","type": "uint256"},
      {"internalType": "uint256","name": "unlockTime","type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "trenchyToken",
    "outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],
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
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address","name": "newOwner","type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "token","type": "address"},
      {"internalType": "uint256","name": "amount","type": "uint256"}
    ],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
