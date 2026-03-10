// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PredictionMarketStorage
 * @notice Shared storage contract for Proxy and Implementation contracts
 * @dev This contract contains ONLY storage variables, NO logic
 * @dev Both Proxy and Implementation inherit this to ensure storage layout alignment
 * @dev CRITICAL: Storage variables must be in exact same order in all contracts
 */
contract PredictionMarketStorage {

    // ============ Enums ============
    
    enum MarketType { BINARY, MULTI_CHOICE, RANGE, TIME_BASED }

    // ============ Structs ============
    
    // Split Market into smaller pieces to avoid stack too deep
    struct MarketCore {
        uint256 id;
        string asset;
        uint256 startTime;
        uint256 endTime;
        int256 startPrice;
        int256 endPrice;
        MarketType marketType;
        bool resolved;
    }
    
    struct MarketPools {
        uint256 yesPool;
        uint256 noPool;
        uint256 totalBets;
        uint256 protocolFee;
    }
    
    struct MarketOdds {
        uint256 yesMultiplier;
        uint256 noMultiplier;
        bool useFixedOdds;
        bool priceWentUp;
    }
    
    struct MarketDecay {
        uint256 decayStartTime;
        uint256 minMultiplier;
        bool useTimeDecay;
    }
    
    // Combined view struct (for external returns only, not stored)
    struct Market {
        uint256 id;
        MarketType marketType;
        string asset;
        uint256 startTime;
        uint256 endTime;
        int256 startPrice;
        int256 endPrice;
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool priceWentUp;
        uint256 totalBets;
        bool useFixedOdds;
        uint256 yesMultiplier;
        uint256 noMultiplier;
        uint256 protocolFee;
        bool useTimeDecay;
        uint256 decayStartTime;
        uint256 minMultiplier;
    }

    struct MultiChoiceMarket {
        string[] options;
        mapping(uint8 => uint256) optionPools;
        mapping(uint8 => uint256) optionMultipliers;
        uint8 winningOption;
    }
    
    struct RangeMarket {
        uint256[] rangeMins;
        uint256[] rangeMaxs;
        mapping(uint8 => uint256) rangePools;
        mapping(uint8 => uint256) rangeMultipliers;
        uint8 winningRange;
    }
    
    struct TimeMarket {
        uint256 targetPrice;
        uint256[] timeframes;
        mapping(uint8 => uint256) timeframePools;
        mapping(uint8 => uint256) timeframeMultipliers;
        uint8 winningTimeframe;
        uint256 eventTimestamp;
    }
    
    struct Position {
        uint256 marketId;
        address user;
        bool predictedUp;
        uint8 choice;
        uint256 amount;
        bool claimed;
        uint256 effectiveMultiplier;
    }

    struct UserStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalEarnings;
        uint256 currentStreak;
        uint256 bestStreak;
    }

    // ============ State Variables ============
    

    IERC20 public usdc;
    
    /**
     * @dev Set USDC address (only needed once during deployment)
     */
    function setUSDC(address _usdc) external {
        require(_usdc != address(0), "Invalid USDC address");
        require(address(usdc) == address(0), "USDC already set");
        usdc = IERC20(_usdc);
    }
    
    mapping(string => AggregatorV3Interface) public priceFeeds;
    uint256 public marketCounter;
    
    // Split market storage
    mapping(uint256 => MarketCore) public marketCore;
    mapping(uint256 => MarketPools) public marketPools;
    mapping(uint256 => MarketOdds) public marketOdds;
    mapping(uint256 => MarketDecay) public marketDecay;
    
    mapping(uint256 => mapping(address => Position[])) public userPositions;
    mapping(address => UserStats) public userStats;
    address[] public leaderboard;
    mapping(address => uint256) public leaderboardPosition;
    
    mapping(uint256 => MultiChoiceMarket) public multiChoiceMarkets;
    mapping(uint256 => RangeMarket) public rangeMarkets;
    mapping(uint256 => TimeMarket) public timeMarkets;
    
    mapping(uint256 => Position[]) public marketPositions;
    mapping(uint256 => mapping(address => uint256[])) public userMarketPositions;
    mapping(address => uint256[]) public userPositionsList;
    mapping(address => uint256) public betCredits;
    
    uint256 public accumulatedFees;
    uint256 public lastFeeWithdrawal;

    // Constants
    uint256 public constant WITHDRAWAL_DELAY = 1 days;
    uint256 public constant PROTOCOL_FEE_PERCENT = 5;
    uint256 public constant MIN_MULTIPLIER = 120;
    uint256 public constant MAX_MULTIPLIER = 1000;
    uint256 public constant DEFAULT_DECAY_START_PERCENT = 50;
    uint256 public constant DEFAULT_MIN_MULTIPLIER = 120;
    uint256 public constant MAX_BET_AMOUNT = 10000 * 1e6;
    uint256 public constant FEE_PERCENTAGE = 5;

    // ============ Helper Functions ============
    
    /**
     * @notice Internal helper to write market data to split storage
     */
    function _setMarket(
        uint256 marketId,
        string memory asset,
        MarketType marketType,
        uint256 startTime,
        uint256 endTime,
        int256 startPrice,
        uint256 yesMultiplier,
        uint256 noMultiplier,
        bool useFixedOdds,
        bool useTimeDecay,
        uint256 decayStartTime,
        uint256 minMultiplier
    ) internal {
        marketCore[marketId] = MarketCore({
            id: marketId,
            asset: asset,
            startTime: startTime,
            endTime: endTime,
            startPrice: startPrice,
            endPrice: 0,
            marketType: marketType,
            resolved: false
        });
        
        marketPools[marketId] = MarketPools({
            yesPool: 0,
            noPool: 0,
            totalBets: 0,
            protocolFee: 0
        });
        
        marketOdds[marketId] = MarketOdds({
            yesMultiplier: yesMultiplier,
            noMultiplier: noMultiplier,
            useFixedOdds: useFixedOdds,
            priceWentUp: false
        });
        
        marketDecay[marketId] = MarketDecay({
            decayStartTime: decayStartTime,
            minMultiplier: minMultiplier,
            useTimeDecay: useTimeDecay
        });
    }
    
    /**
     * @notice Simple view - just returns if market exists
     * @dev Frontend should use marketCore/marketPools/marketOdds/marketDecay directly
     */
    function markets(uint256 marketId) public view returns (Market memory) {
        MarketCore memory core = marketCore[marketId];
        MarketPools memory pools = marketPools[marketId];
        MarketOdds memory odds = marketOdds[marketId];  
        MarketDecay memory decay = marketDecay[marketId];
        
        Market memory market;
        market.id = core.id;
        market.marketType = core.marketType;
        market.asset = core.asset;
        market.startTime = core.startTime;
        market.endTime = core.endTime;
        market.startPrice = core.startPrice;
        market.endPrice = core.endPrice;
        market.yesPool = pools.yesPool;
        market.noPool = pools.noPool;
        market.resolved = core.resolved;
        market.priceWentUp = odds.priceWentUp;
        market.totalBets = pools.totalBets;
        market.useFixedOdds = odds.useFixedOdds;
        market.yesMultiplier = odds.yesMultiplier;
        market.noMultiplier = odds.noMultiplier;
        market.protocolFee = pools.protocolFee;
        market.useTimeDecay = decay.useTimeDecay;
        market.decayStartTime = decay.decayStartTime;
        market.minMultiplier = decay.minMultiplier;
        
        return market;
    }
}
