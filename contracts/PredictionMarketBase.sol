// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./PredictionMarketStorage.sol";

/**
 * @title PredictionMarketBase
 * @notice Abstract base contract with shared logic
 * @dev All PredictionMarket contracts inherit from this
 * @dev CRITICAL: Inherits from PredictionMarketStorage for storage layout alignment
 * @dev Uses EIP-1967 admin slot for ownership checks when called through proxy
 */
abstract contract PredictionMarketBase is PredictionMarketStorage, ReentrancyGuard, Pausable {

    // ============ EIP-1967 Storage Slots (Compatible with Proxy) ============
    
    // Storage slot for the admin address (EIP-1967 standard)
    bytes32 private constant _ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);

    // ============ Events ============
    
    event MarketCreated(uint256 indexed marketId, MarketType marketType, string asset, bool useFixedOdds, bool useTimeDecay);
    event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier);
    event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event BetCreditAwarded(address indexed user, uint256 amount);
    event BetCreditUsed(address indexed user, uint256 amount);

    // ============ Constructor ============
    
    constructor(address _usdc, address _owner) {
        usdc = IERC20(_usdc);
        // Note: We don't call transferOwnership here anymore
        // Ownership is managed through the proxy's EIP-1967 admin slot
        lastFeeWithdrawal = block.timestamp;
    }

    
    // ============ Ownership Functions (Proxy-Compatible) ============
    
    /**
     * @notice Get the admin address from EIP-1967 slot
     * @return admin The admin address (owner)
     */
    function getAdmin() public view returns (address admin) {
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            admin := sload(slot)
        }
    }
    
    /**
     * @notice Check if caller is the owner (admin)
     * @return bool True if caller is the admin
     */
    function isOwner(address caller) public view returns (bool) {
        return caller == getAdmin();
    }
    
    /**
     * @notice Get the owner address (alias for getAdmin)
     * @return owner The owner address
     */
    function owner() public view returns (address) {
        return getAdmin();
    }
    
    // ============ Modifiers ============
    
    /**
     * @notice Modifier to restrict function access to proxy admin only
     * @dev Reads admin from EIP-1967 slot instead of local storage
     */
    modifier onlyOwner() {
        require(msg.sender == getAdmin(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @notice Modifier to restrict function access to proxy admin only
     * @dev Alias for onlyOwner, used for clarity in implementation contracts
     */
    modifier onlyProxyOwner() {
        require(msg.sender == getAdmin(), "Ownable: caller is not the owner");
        _;
    }


    // ============ Admin Functions ============
    
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
