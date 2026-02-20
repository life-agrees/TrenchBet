// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PredictionMarketBase
 * @notice Abstract base contract with shared storage and structs
 * @dev All PredictionMarket contracts inherit from this
 */
abstract contract PredictionMarketBase is ReentrancyGuard, Ownable, Pausable {

    IERC20 public immutable usdc;
    
    mapping(string => AggregatorV3Interface) public priceFeeds;
    
    enum MarketType { BINARY, MULTI_CHOICE, RANGE, TIME_BASED }
    
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

    // Core storage
    uint256 public marketCounter;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => MultiChoiceMarket) public multiChoiceMarkets;
    mapping(uint256 => RangeMarket) public rangeMarkets;
    mapping(uint256 => TimeMarket) public timeMarkets;
    mapping(uint256 => Position[]) public marketPositions;
    mapping(address => uint256[]) public userPositions;
    mapping(uint256 => mapping(address => uint256[])) public userMarketPositions;
    
    // Constants
    uint256 public constant MAX_BET_AMOUNT = 1000 * 10**6;
    uint256 public constant MAX_POOL_SIZE = 50000 * 10**6;
    uint256 public constant FEE_PERCENTAGE = 2;
    uint256 public constant WITHDRAWAL_DELAY = 48 hours;
    uint256 public constant MIN_MULTIPLIER = 101;
    uint256 public constant MAX_MULTIPLIER = 1000;
    uint256 public constant DEFAULT_DECAY_START_PERCENT = 50;
    uint256 public constant DEFAULT_MIN_MULTIPLIER = 120;
    
    // State
    uint256 public accumulatedFees;
    uint256 public lastFeeWithdrawal;
    mapping(address => uint256) public betCredits;
    mapping(address => UserStats) public userStats;
    
    address[] public leaderboard;
    mapping(address => uint256) public leaderboardPosition;

    // Events
    event MarketCreated(uint256 indexed marketId, MarketType marketType, string asset, bool useFixedOdds, bool useTimeDecay);
    event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier);
    event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event BetCreditAwarded(address indexed user, uint256 amount);
    event BetCreditUsed(address indexed user, uint256 amount);

    constructor(address _usdc, address _owner) {
        usdc = IERC20(_usdc);
        transferOwnership(_owner);
        lastFeeWithdrawal = block.timestamp;
    }
    
    function setPriceFeed(string memory asset, address feedAddress) external onlyOwner {
        priceFeeds[asset] = AggregatorV3Interface(feedAddress);
    }

    function getCurrentPrice(string memory asset) public view returns (int256) {
        AggregatorV3Interface priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "Price feed not set");
        
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(updatedAt > 0, "Invalid price data");
        require(block.timestamp - updatedAt < 1 hours, "Price data stale");
        
        return price;
    }

    function _updateLeaderboard(address user) internal {
        uint256 userEarnings = userStats[user].totalEarnings;
        uint256 currentPosition = leaderboardPosition[user];
        
        if (currentPosition == 0 && leaderboard.length == 0) {
            leaderboard.push(user);
            leaderboardPosition[user] = 1;
            return;
        }
        
        if (currentPosition == 0) {
            leaderboard.push(user);
            currentPosition = leaderboard.length;
            leaderboardPosition[user] = currentPosition;
        }
        
        while (currentPosition > 1) {
            address aboveUser = leaderboard[currentPosition - 2];
            if (userEarnings > userStats[aboveUser].totalEarnings) {
                leaderboard[currentPosition - 1] = aboveUser;
                leaderboard[currentPosition - 2] = user;
                leaderboardPosition[aboveUser] = currentPosition;
                leaderboardPosition[user] = currentPosition - 1;
                currentPosition--;
            } else {
                break;
            }
        }
    }
}
