// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PredictionMarket with Custom Odds
 * @notice Enhanced prediction market with 4 bet types and customizable odds
 */
contract PredictionMarket is ReentrancyGuard, Ownable {
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
        uint256 yesMultiplier;  // e.g., 200 = 2.0x (in basis points)
        uint256 noMultiplier;   // e.g., 150 = 1.5x
    }
    
    struct MultiChoiceMarket {
        string[] options;
        mapping(uint8 => uint256) optionPools;
        mapping(uint8 => uint256) optionMultipliers; // Fixed odds per option
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
    }
    
    uint256 public marketCounter;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => MultiChoiceMarket) public multiChoiceMarkets;
    mapping(uint256 => RangeMarket) public rangeMarkets;
    mapping(uint256 => TimeMarket) public timeMarkets;
    mapping(uint256 => Position[]) public marketPositions;
    mapping(address => uint256[]) public userPositions;
    mapping(uint256 => mapping(address => uint256[])) public userMarketPositions;
    
    uint256 public constant MAX_BET_AMOUNT = 1000 * 10**6;
    uint256 public constant MAX_POOL_SIZE = 50000 * 10**6;
    uint256 public constant FEE_PERCENTAGE = 2;
    uint256 public constant WITHDRAWAL_DELAY = 48 hours;
    
    uint256 public accumulatedFees;
    uint256 public lastFeeWithdrawal;
    
    mapping(address => UserStats) public userStats;
    
    struct UserStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalLosses;
        uint256 totalEarnings;
        uint256 currentStreak;
        uint256 bestStreak;
    }
    
    address[] public leaderboard;
    mapping(address => uint256) public leaderboardPosition;
    
    event MarketCreated(uint256 indexed marketId, MarketType marketType, string asset, bool useFixedOdds);
    event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint8 winningChoice);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    
    constructor(address _usdc, address _owner) {
        usdc = IERC20(_usdc);
        transferOwnership(_owner);
        lastFeeWithdrawal = block.timestamp;
    }
    
    function setPriceFeed(string memory asset, address feedAddress) external onlyOwner {
        priceFeeds[asset] = AggregatorV3Interface(feedAddress);
    }
    
    // ==================== CREATE MARKETS WITH ODDS ====================
    
    /**
     * @notice Create binary market with optional fixed odds
     * @param asset The crypto asset
     * @param duration Market duration in seconds
     * @param yesMultiplier Fixed multiplier for UP (0 = use pool odds)
     * @param noMultiplier Fixed multiplier for DOWN (0 = use pool odds)
     */
    function createMarketWithOdds(
        string memory asset,
        uint256 duration,
        uint256 yesMultiplier,
        uint256 noMultiplier
    ) public onlyOwner returns (uint256) {
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        
        int256 currentPrice = getCurrentPrice(asset);
        require(currentPrice > 0, "Invalid price");
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = (yesMultiplier > 0 && noMultiplier > 0);
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.BINARY,
            asset: asset,
            startTime: startTime,
            endTime: endTime,
            startPrice: currentPrice,
            endPrice: 0,
            yesPool: 0,
            noPool: 0,
            resolved: false,
            priceWentUp: false,
            totalBets: 0,
            useFixedOdds: useFixedOdds,
            yesMultiplier: yesMultiplier,
            noMultiplier: noMultiplier
        });
        
        emit MarketCreated(marketId, MarketType.BINARY, asset, useFixedOdds);
        return marketId;
    }
    
    /**
     * @notice Create multi-choice market with optional fixed odds
     */
    function createMultiChoiceMarketWithOdds(
        string memory asset,
        string[] memory options,
        string memory question,
        uint256 duration,
        uint256[] memory multipliers
    ) external onlyOwner returns (uint256) {
        require(options.length >= 2 && options.length <= 10, "2-10 options required");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = multipliers.length == options.length;
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.MULTI_CHOICE,
            asset: question,
            startTime: startTime,
            endTime: endTime,
            startPrice: 0,
            endPrice: 0,
            yesPool: 0,
            noPool: 0,
            resolved: false,
            priceWentUp: false,
            totalBets: 0,
            useFixedOdds: useFixedOdds,
            yesMultiplier: 0,
            noMultiplier: 0
        });
        
        MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
        mcMarket.options = options;
        
        if (useFixedOdds) {
            for (uint8 i = 0; i < options.length; i++) {
                mcMarket.optionMultipliers[i] = multipliers[i];
            }
        }
        
        emit MarketCreated(marketId, MarketType.MULTI_CHOICE, question, useFixedOdds);
        return marketId;
    }
    
    /**
     * @notice Create range market with optional fixed odds
     */
    function createRangeMarketWithOdds(
        string memory asset,
        uint256[] memory rangeMins,
        uint256[] memory rangeMaxs,
        uint256 duration,
        uint256[] memory multipliers
    ) external onlyOwner returns (uint256) {
        require(rangeMins.length == rangeMaxs.length, "Mismatched ranges");
        require(rangeMins.length >= 2 && rangeMins.length <= 10, "2-10 ranges required");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        
        int256 currentPrice = getCurrentPrice(asset);
        require(currentPrice > 0, "Invalid price");
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = multipliers.length == rangeMins.length;
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.RANGE,
            asset: asset,
            startTime: startTime,
            endTime: endTime,
            startPrice: currentPrice,
            endPrice: 0,
            yesPool: 0,
            noPool: 0,
            resolved: false,
            priceWentUp: false,
            totalBets: 0,
            useFixedOdds: useFixedOdds,
            yesMultiplier: 0,
            noMultiplier: 0
        });
        
        RangeMarket storage rMarket = rangeMarkets[marketId];
        rMarket.rangeMins = rangeMins;
        rMarket.rangeMaxs = rangeMaxs;
        
        if (useFixedOdds) {
            for (uint8 i = 0; i < rangeMins.length; i++) {
                rMarket.rangeMultipliers[i] = multipliers[i];
            }
        }
        
        emit MarketCreated(marketId, MarketType.RANGE, asset, useFixedOdds);
        return marketId;
    }
    
    /**
     * @notice Create time-based market with optional fixed odds
     */
    function createTimeMarketWithOdds(
        string memory asset,
        uint256 targetPrice,
        uint256[] memory timeframes,
        uint256[] memory multipliers
    ) external onlyOwner returns (uint256) {
        require(timeframes.length >= 2 && timeframes.length <= 5, "2-5 timeframes required");
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        
        int256 currentPrice = getCurrentPrice(asset);
        require(currentPrice > 0, "Invalid price");
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + timeframes[timeframes.length - 1];
        
        bool useFixedOdds = multipliers.length == timeframes.length;
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.TIME_BASED,
            asset: asset,
            startTime: startTime,
            endTime: endTime,
            startPrice: currentPrice,
            endPrice: 0,
            yesPool: 0,
            noPool: 0,
            resolved: false,
            priceWentUp: false,
            totalBets: 0,
            useFixedOdds: useFixedOdds,
            yesMultiplier: 0,
            noMultiplier: 0
        });
        
        TimeMarket storage tMarket = timeMarkets[marketId];
        tMarket.targetPrice = targetPrice;
        tMarket.timeframes = timeframes;
        
        if (useFixedOdds) {
            for (uint8 i = 0; i < timeframes.length; i++) {
                tMarket.timeframeMultipliers[i] = multipliers[i];
            }
        }
        
        emit MarketCreated(marketId, MarketType.TIME_BASED, asset, useFixedOdds);
        return marketId;
    }
    
    // ==================== PLACE BETS ====================
    
    function placeBet(uint256 marketId, uint8 choice, uint256 amount) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.startTime > 0, "Market does not exist");
        require(block.timestamp < market.endTime, "Market has ended");
        require(!market.resolved, "Market already resolved");
        require(amount > 0 && amount <= MAX_BET_AMOUNT, "Invalid amount");
        
        if (market.marketType == MarketType.BINARY) {
            require(choice <= 1, "Invalid binary choice");
        } else if (market.marketType == MarketType.MULTI_CHOICE) {
            require(choice < multiChoiceMarkets[marketId].options.length, "Invalid option");
        } else if (market.marketType == MarketType.RANGE) {
            require(choice < rangeMarkets[marketId].rangeMins.length, "Invalid range");
        } else if (market.marketType == MarketType.TIME_BASED) {
            require(choice < timeMarkets[marketId].timeframes.length, "Invalid timeframe");
        }
        
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        if (market.marketType == MarketType.BINARY) {
            if (choice == 1) {
                market.yesPool += amount;
            } else {
                market.noPool += amount;
            }
        } else if (market.marketType == MarketType.MULTI_CHOICE) {
            multiChoiceMarkets[marketId].optionPools[choice] += amount;
        } else if (market.marketType == MarketType.RANGE) {
            rangeMarkets[marketId].rangePools[choice] += amount;
        } else if (market.marketType == MarketType.TIME_BASED) {
            timeMarkets[marketId].timeframePools[choice] += amount;
        }
        
        market.totalBets++;
        
        Position memory position = Position({
            marketId: marketId,
            user: msg.sender,
            predictedUp: (choice == 1 && market.marketType == MarketType.BINARY),
            choice: choice,
            amount: amount,
            claimed: false
        });
        
        uint256 positionIndex = marketPositions[marketId].length;
        marketPositions[marketId].push(position);
        
        if (userMarketPositions[marketId][msg.sender].length == 0) {
            userPositions[msg.sender].push(marketId);
        }
        userMarketPositions[marketId][msg.sender].push(positionIndex);
        
        userStats[msg.sender].totalBets++;
        
        emit BetPlaced(marketId, msg.sender, choice, amount);
    }
    
    // ==================== RESOLVE MARKETS ====================
    
    function resolveMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.BINARY, "Not a binary market");
        require(market.startTime > 0, "Market does not exist");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        
        int256 endPrice = getCurrentPrice(market.asset);
        require(endPrice > 0, "Invalid end price");
        
        market.endPrice = endPrice;
        market.priceWentUp = endPrice > market.startPrice;
        market.resolved = true;
        
        emit MarketResolved(marketId, market.priceWentUp ? 1 : 0);
    }
    
    function resolveMultiChoiceMarket(uint256 marketId, uint8 winningOption) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.MULTI_CHOICE, "Not a multi-choice market");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        require(winningOption < multiChoiceMarkets[marketId].options.length, "Invalid option");
        
        multiChoiceMarkets[marketId].winningOption = winningOption;
        market.resolved = true;
        
        emit MarketResolved(marketId, winningOption);
    }
    
    function resolveRangeMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.RANGE, "Not a range market");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        
        int256 endPrice = getCurrentPrice(market.asset);
        require(endPrice > 0, "Invalid end price");
        
        market.endPrice = endPrice;
        uint256 finalPrice = uint256(endPrice);
        
        RangeMarket storage rMarket = rangeMarkets[marketId];
        bool foundWinner = false;
        
        for (uint8 i = 0; i < rMarket.rangeMins.length; i++) {
            if (finalPrice >= rMarket.rangeMins[i] && finalPrice <= rMarket.rangeMaxs[i]) {
                rMarket.winningRange = i;
                foundWinner = true;
                break;
            }
        }
        
        require(foundWinner, "Price not in any range");
        market.resolved = true;
        
        emit MarketResolved(marketId, rMarket.winningRange);
    }
    
    function resolveTimeMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.TIME_BASED, "Not a time-based market");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        
        TimeMarket storage tMarket = timeMarkets[marketId];
        int256 currentPrice = getCurrentPrice(market.asset);
        require(currentPrice > 0, "Invalid price");
        
        if (uint256(currentPrice) >= tMarket.targetPrice) {
            tMarket.eventTimestamp = block.timestamp;
            
            for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
                if (block.timestamp <= market.startTime + tMarket.timeframes[i]) {
                    tMarket.winningTimeframe = i;
                    break;
                }
            }
        } else {
            tMarket.winningTimeframe = type(uint8).max;
        }
        
        market.resolved = true;
        emit MarketResolved(marketId, tMarket.winningTimeframe);
    }
    
    // ==================== CLAIM WINNINGS WITH ODDS ====================
    
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved yet");
        
        uint256[] memory positionIndices = userMarketPositions[marketId][msg.sender];
        require(positionIndices.length > 0, "No positions in this market");
        
        uint256 totalWinnings = 0;
        bool hadWin = false;
        bool hadLoss = false;
        
        for (uint256 i = 0; i < positionIndices.length; i++) {
            Position storage position = marketPositions[marketId][positionIndices[i]];
            
            if (position.claimed) continue;
            
            bool userWon = false;
            uint256 payout = 0;
            
            if (market.marketType == MarketType.BINARY) {
                userWon = position.predictedUp == market.priceWentUp;
                
                if (userWon) {
                    if (market.useFixedOdds) {
                        // Fixed odds payout
                        uint256 multiplier = position.predictedUp ? market.yesMultiplier : market.noMultiplier;
                        payout = (position.amount * multiplier) / 100;
                    } else {
                        // Pool-based payout
                        uint256 winningPool = position.predictedUp ? market.yesPool : market.noPool;
                        uint256 losingPool = position.predictedUp ? market.noPool : market.yesPool;
                        
                        if (winningPool > 0) {
                            uint256 share = (position.amount * losingPool) / winningPool;
                            uint256 fee = (share * FEE_PERCENTAGE) / 100;
                            payout = position.amount + share - fee;
                            accumulatedFees += fee;
                        }
                    }
                }
            } else if (market.marketType == MarketType.MULTI_CHOICE) {
                userWon = position.choice == multiChoiceMarkets[marketId].winningOption;
                
                if (userWon) {
                    if (market.useFixedOdds) {
                        uint256 multiplier = multiChoiceMarkets[marketId].optionMultipliers[position.choice];
                        payout = (position.amount * multiplier) / 100;
                    } else {
                        payout = _calculatePoolPayout(marketId, position, true);
                    }
                }
            } else if (market.marketType == MarketType.RANGE) {
                userWon = position.choice == rangeMarkets[marketId].winningRange;
                
                if (userWon) {
                    if (market.useFixedOdds) {
                        uint256 multiplier = rangeMarkets[marketId].rangeMultipliers[position.choice];
                        payout = (position.amount * multiplier) / 100;
                    } else {
                        payout = _calculatePoolPayout(marketId, position, false);
                    }
                }
            } else if (market.marketType == MarketType.TIME_BASED) {
                userWon = position.choice == timeMarkets[marketId].winningTimeframe;
                
                if (userWon) {
                    if (market.useFixedOdds) {
                        uint256 multiplier = timeMarkets[marketId].timeframeMultipliers[position.choice];
                        payout = (position.amount * multiplier) / 100;
                    } else {
                        payout = _calculateTimePoolPayout(marketId, position);
                    }
                }
            }
            
            if (userWon) {
                hadWin = true;
                totalWinnings += payout;
            } else {
                hadLoss = true;
            }
            
            position.claimed = true;
        }
        
        UserStats storage stats = userStats[msg.sender];
        if (hadWin) {
            stats.totalWins++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
            stats.totalEarnings += totalWinnings;
            _updateLeaderboard(msg.sender);
        }
        if (hadLoss) {
            stats.totalLosses++;
            stats.currentStreak = 0;
        }
        
        require(totalWinnings > 0, "No winnings to claim");
        require(usdc.transfer(msg.sender, totalWinnings), "USDC transfer failed");
        
        emit WinningsClaimed(marketId, msg.sender, totalWinnings);
    }
    
    function _calculatePoolPayout(uint256 marketId, Position memory position, bool isMultiChoice) internal returns (uint256) {
        uint256 winningPool;
        uint256 losingPool;
        
        if (isMultiChoice) {
            MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
            winningPool = mcMarket.optionPools[position.choice];
            for (uint8 j = 0; j < mcMarket.options.length; j++) {
                if (j != position.choice) {
                    losingPool += mcMarket.optionPools[j];
                }
            }
        } else {
            RangeMarket storage rMarket = rangeMarkets[marketId];
            winningPool = rMarket.rangePools[position.choice];
            for (uint8 j = 0; j < rMarket.rangeMins.length; j++) {
                if (j != position.choice) {
                    losingPool += rMarket.rangePools[j];
                }
            }
        }
        
        if (winningPool > 0) {
            uint256 share = (position.amount * losingPool) / winningPool;
            uint256 fee = (share * FEE_PERCENTAGE) / 100;
            accumulatedFees += fee;
            return position.amount + share - fee;
        }
        
        return 0;
    }
    
    function _calculateTimePoolPayout(uint256 marketId, Position memory position) internal returns (uint256) {
        TimeMarket storage tMarket = timeMarkets[marketId];
        uint256 winningPool = tMarket.timeframePools[position.choice];
        uint256 losingPool;
        
        for (uint8 j = 0; j < tMarket.timeframes.length; j++) {
            if (j != position.choice) {
                losingPool += tMarket.timeframePools[j];
            }
        }
        
        if (winningPool > 0) {
            uint256 share = (position.amount * losingPool) / winningPool;
            uint256 fee = (share * FEE_PERCENTAGE) / 100;
            accumulatedFees += fee;
            return position.amount + share - fee;
        }
        
        return 0;
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    function getCurrentPrice(string memory asset) public view returns (int256) {
        AggregatorV3Interface priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "Price feed not set");
        
        (, int256 price, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(updatedAt > 0, "Invalid price data");
        require(block.timestamp - updatedAt < 1 hours, "Price data stale");
        
        return price;
    }
    
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }
    
    function getMultiChoiceOptions(uint256 marketId) external view returns (string[] memory) {
        return multiChoiceMarkets[marketId].options;
    }
    
    function getRangeMarketData(uint256 marketId) external view returns (uint256[] memory mins, uint256[] memory maxs) {
        return (rangeMarkets[marketId].rangeMins, rangeMarkets[marketId].rangeMaxs);
    }
    
    function getTimeMarketData(uint256 marketId) external view returns (uint256 targetPrice, uint256[] memory timeframes) {
        return (timeMarkets[marketId].targetPrice, timeMarkets[marketId].timeframes);
    }
    
    function getMarketPositions(uint256 marketId) external view returns (Position[] memory) {
        return marketPositions[marketId];
    }
    
    function getUserMarkets(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    function getUserPositionsInMarket(uint256 marketId, address user) external view returns (Position[] memory) {
        uint256[] memory indices = userMarketPositions[marketId][user];
        Position[] memory positions = new Position[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            positions[i] = marketPositions[marketId][indices[i]];
        }
        
        return positions;
    }
    
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }
    
    function getLeaderboard(uint256 count) external view returns (address[] memory topUsers, uint256[] memory earnings) {
        uint256 length = leaderboard.length < count ? leaderboard.length : count;
        topUsers = new address[](length);
        earnings = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            topUsers[i] = leaderboard[i];
            earnings[i] = userStats[leaderboard[i]].totalEarnings;
        }
        
        return (topUsers, earnings);
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
    
    function withdrawFees() external onlyOwner {
        require(block.timestamp >= lastFeeWithdrawal + WITHDRAWAL_DELAY, "Withdrawal delay not met");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        lastFeeWithdrawal = block.timestamp;
        
        require(usdc.transfer(msg.sender, amount), "USDC transfer failed");
        emit FeesWithdrawn(msg.sender, amount);
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    /**
     * @notice Calculate potential payout for a bet
     * @param marketId The market ID
     * @param choice The choice (0/1 for binary, index for others)
     * @param amount Bet amount
     * @return payout Estimated payout amount
     */
    function calculatePotentialPayout(
        uint256 marketId,
        uint8 choice,
        uint256 amount
    ) external view returns (uint256) {
        Market memory market = markets[marketId];
        
        if (market.marketType == MarketType.BINARY) {
            if (market.useFixedOdds) {
                uint256 multiplier = choice == 1 ? market.yesMultiplier : market.noMultiplier;
                return (amount * multiplier) / 100;
            } else {
                uint256 winningPool = choice == 1 ? market.yesPool + amount : market.noPool + amount;
                uint256 losingPool = choice == 1 ? market.noPool : market.yesPool;
                
                if (winningPool == 0) return amount;
                
                uint256 share = (amount * losingPool) / winningPool;
                uint256 fee = (share * FEE_PERCENTAGE) / 100;
                return amount + share - fee;
            }
        } else if (market.marketType == MarketType.MULTI_CHOICE) {
            if (market.useFixedOdds) {
                uint256 multiplier = multiChoiceMarkets[marketId].optionMultipliers[choice];
                return (amount * multiplier) / 100;
            } else {
                // Pool-based calculation
                uint256 winningPool = multiChoiceMarkets[marketId].optionPools[choice] + amount;
                uint256 totalPool = amount;
                
                for (uint8 i = 0; i < multiChoiceMarkets[marketId].options.length; i++) {
                    totalPool += multiChoiceMarkets[marketId].optionPools[i];
                }
                
                uint256 losingPool = totalPool - winningPool;
                if (winningPool == 0) return amount;
                
                uint256 share = (amount * losingPool) / winningPool;
                uint256 fee = (share * FEE_PERCENTAGE) / 100;
                return amount + share - fee;
            }
        }
        
        return amount; // Default return
    }
    
    /**
     * @notice Get current multipliers/odds for a market
     * @param marketId The market ID
     * @return multipliers Array of current multipliers (in basis points)
     */
    function getCurrentOdds(uint256 marketId) external view returns (uint256[] memory multipliers) {
        Market memory market = markets[marketId];
        
        if (market.marketType == MarketType.BINARY) {
            multipliers = new uint256[](2);
            
            if (market.useFixedOdds) {
                multipliers[0] = market.noMultiplier;
                multipliers[1] = market.yesMultiplier;
            } else {
                // Calculate dynamic odds based on pools
                uint256 total = market.yesPool + market.noPool;
                if (total == 0) {
                    multipliers[0] = 200; // 2.0x
                    multipliers[1] = 200; // 2.0x
                } else {
                    // Simplified: higher pool = lower multiplier
                    multipliers[0] = total > 0 ? (total * 200) / (market.noPool + 1) : 200;
                    multipliers[1] = total > 0 ? (total * 200) / (market.yesPool + 1) : 200;
                }
            }
        } else if (market.marketType == MarketType.MULTI_CHOICE) {
            MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
            multipliers = new uint256[](mcMarket.options.length);
            
            if (market.useFixedOdds) {
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    multipliers[i] = mcMarket.optionMultipliers[i];
                }
            } else {
                uint256 totalPool = 0;
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    totalPool += mcMarket.optionPools[i];
                }
                
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    if (totalPool == 0) {
                        multipliers[i] = 200;
                    } else {
                        multipliers[i] = totalPool > 0 ? (totalPool * 200) / (mcMarket.optionPools[i] + 1) : 200;
                    }
                }
            }
        }
        
        return multipliers;
    }
}