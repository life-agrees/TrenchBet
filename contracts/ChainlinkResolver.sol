// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Interface for PredictionMarket
interface IPredictionMarket {
    struct Market {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        int256 startPrice;
        int256 endPrice;
        bool resolved;
        string asset;
    }
    
    function markets(uint256 marketId) external view returns (Market memory);
    function marketCounter() external view returns (uint256);
    function resolveMarket(uint256 marketId) external;
    function getCurrentPrice(string memory asset) external view returns (int256);
}

/**
 * @title Chainlink Auto-Resolver for TrenchyBet
 * @notice Automated market resolution using Chainlink Keepers
 * @dev This makes the platform truly trustless - no manual resolution needed
 */
contract ChainlinkResolver is AutomationCompatibleInterface, Ownable, ReentrancyGuard {
    
    // Reference to PredictionMarket contract
    IPredictionMarket public predictionMarket;
    
    // Chainlink price feeds for different assets
    mapping(string => AggregatorV3Interface) public priceFeeds;
    
    // Configuration
    uint256 public constant MAX_BATCH_SIZE = 10; // Max markets to resolve per upkeep
    uint256 public constant MIN_CHECK_INTERVAL = 5 minutes; // Minimum time between checks
    
    // Market tracking
    mapping(uint256 => bool) public marketQueuedForResolution;
    uint256[] public pendingMarkets;
    
    // Statistics
    uint256 public totalMarketsResolved;
    uint256 public lastUpkeepTimestamp;
    
    // Events
    event MarketQueued(uint256 indexed marketId, uint256 timestamp);
    event MarketResolved(uint256 indexed marketId, int256 endPrice, bool priceWentUp);
    event BatchResolved(uint256 count, uint256 timestamp);
    event PriceFeedUpdated(string asset, address feed);

    
    constructor(address _predictionMarket) {
        predictionMarket = IPredictionMarket(_predictionMarket);
    }
    
    /**
     * @notice Set price feed for an asset
     * @param asset Asset symbol (e.g., "ETH", "BTC")
     * @param feedAddress Chainlink price feed address
     */
    function setPriceFeed(string memory asset, address feedAddress) external onlyOwner {
        require(feedAddress != address(0), "Invalid feed address");
        priceFeeds[asset] = AggregatorV3Interface(feedAddress);
        emit PriceFeedUpdated(asset, feedAddress);
    }
    
    /**
     * @notice Get the latest price for an asset
     * @param asset Asset symbol (e.g., "ETH", "BTC")
     * @return The latest price from Chainlink (with 8 decimals)
     */
    function getLatestPrice(string memory asset) external view returns (int256) {
        AggregatorV3Interface priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "Price feed not found");
        
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        require(price > 0, "Invalid price");
        require(timeStamp > 0, "Round not complete");
        
        return price;
    }
    
    /**
     * @notice Chainlink Keepers check function

     * @dev Scans for markets that need resolution
     * @return upkeepNeeded True if there are markets to resolve
     * @return performData Encoded array of market IDs to resolve
     */
    function checkUpkeep(bytes calldata) 
        external 
        view 
        override 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        // Rate limiting
        if (block.timestamp < lastUpkeepTimestamp + MIN_CHECK_INTERVAL) {
            return (false, "");
        }
        
        uint256[] memory marketsToResolve = new uint256[](MAX_BATCH_SIZE);
        uint256 count = 0;
        
        uint256 marketCount = predictionMarket.marketCounter();
        
        for (uint256 i = 1; i <= marketCount && count < MAX_BATCH_SIZE; i++) {
            IPredictionMarket.Market memory market = predictionMarket.markets(i);
            
            // Check if market needs resolution
            if (!market.resolved && block.timestamp >= market.endTime) {
                marketsToResolve[count] = i;
                count++;
            }
        }
        
        if (count > 0) {
            upkeepNeeded = true;
            performData = abi.encode(marketsToResolve, count);
        }
    }
    
    /**
     * @notice Chainlink Keepers perform function
     * @dev Resolves markets in batch
     * @param performData Encoded array of market IDs
     */
    function performUpkeep(bytes calldata performData) 
        external 
        override 
        nonReentrant 
    {
        (uint256[] memory marketIds, uint256 count) = abi.decode(
            performData, 
            (uint256[], uint256)
        );
        
        require(count > 0, "No markets to resolve");
        require(count <= MAX_BATCH_SIZE, "Batch too large");
        
        lastUpkeepTimestamp = block.timestamp;
        
        uint256 resolvedCount = 0;
        
        for (uint256 i = 0; i < count; i++) {
            uint256 marketId = marketIds[i];
            
            // Double-check market state
            IPredictionMarket.Market memory market = predictionMarket.markets(marketId);
            
            if (!market.resolved && block.timestamp >= market.endTime) {
                try this.resolveMarket(marketId) {
                    resolvedCount++;
                } catch {
                    // Continue with next market if one fails
                    continue;
                }
            }
        }
        
        totalMarketsResolved += resolvedCount;
        
        emit BatchResolved(resolvedCount, block.timestamp);
    }
    
    /**
     * @notice Resolve a single market
     * @param marketId Market ID to resolve
     */
    function resolveMarket(uint256 marketId) external {
        IPredictionMarket.Market memory market = predictionMarket.markets(marketId);
        
        require(!market.resolved, "Market already resolved");
        require(block.timestamp >= market.endTime, "Market not ended yet");
        
        // Get end price from Chainlink
        int256 endPrice = predictionMarket.getCurrentPrice(market.asset);
        require(endPrice > 0, "Invalid price");
        
        // Call prediction market to resolve
        predictionMarket.resolveMarket(marketId);
        
        // Determine if price went up
        bool priceWentUp = endPrice > market.startPrice;
        
        emit MarketResolved(marketId, endPrice, priceWentUp);
    }
    
    /**
     * @notice Manually queue a market for resolution
     * @param marketId Market ID to queue
     */
    function queueMarket(uint256 marketId) external {
        require(!marketQueuedForResolution[marketId], "Already queued");
        
        IPredictionMarket.Market memory market = predictionMarket.markets(marketId);
        require(market.startTime > 0, "Market does not exist");
        require(!market.resolved, "Already resolved");
        
        marketQueuedForResolution[marketId] = true;
        pendingMarkets.push(marketId);
        
        emit MarketQueued(marketId, block.timestamp);
    }
    
    /**
     * @notice Get pending markets count
     * @return Number of markets pending resolution
     */
    function getPendingMarketsCount() external view returns (uint256) {
        return pendingMarkets.length;
    }
    
    /**
     * @notice Get all pending markets
     * @return Array of pending market IDs
     */
    function getPendingMarkets() external view returns (uint256[] memory) {
        return pendingMarkets;
    }
    
    /**
     * @notice Emergency manual resolution (owner only)
     * @param marketId Market ID to resolve
     */
    function emergencyResolve(uint256 marketId) external onlyOwner {
        predictionMarket.resolveMarket(marketId);
    }
    
    /**
     * @notice Update prediction market address
     * @param _predictionMarket New prediction market address
     */
    function setPredictionMarket(address _predictionMarket) external onlyOwner {
        require(_predictionMarket != address(0), "Invalid address");
        predictionMarket = IPredictionMarket(_predictionMarket);
    }
}
