// Prediction Market ABI
export const PREDICTION_MARKET_ABI = [
    "function createMarket(string memory asset) external returns (uint256)",
    "function placeBet(uint256 marketId, bool predictedUp, uint256 amount) external",
    "function resolveMarket(uint256 marketId) external",
    "function claimWinnings(uint256 marketId) external",
    "function getMarket(uint256 marketId) external view returns (tuple(uint256 id, string asset, uint256 startTime, uint256 endTime, int256 startPrice, int256 endPrice, uint256 yesPool, uint256 noPool, bool resolved, bool priceWentUp, uint256 totalBets))",
    "function getUserPositionsInMarket(uint256 marketId, address user) external view returns (tuple(uint256 marketId, address user, bool predictedUp, uint256 amount, bool claimed)[])",
    "function getUserMarkets(address user) external view returns (uint256[])",
    "function calculatePotentialWinnings(uint256 marketId, bool predictedUp, uint256 amount) external view returns (uint256)",
    "function getOdds(uint256 marketId) external view returns (uint256 yesOdds, uint256 noOdds)",
    "function getCurrentPrice(string memory asset) external view returns (int256)",
    "event MarketCreated(uint256 indexed marketId, string asset, uint256 startTime, uint256 endTime, int256 startPrice)",
    "event BetPlaced(uint256 indexed marketId, address indexed user, bool predictedUp, uint256 amount)",
    "event MarketResolved(uint256 indexed marketId, bool priceWentUp, int256 endPrice)",
    "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)"
  ];
  
  // ERC20 USDC ABI (minimal)
  export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function transfer(address to, uint256 amount) external returns (bool)"
  ];