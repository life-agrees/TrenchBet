// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./PredictionMarketStorage.sol";

// ============ BetVouchers Interface (Minimal) ============
interface IBetVouchers {
    function spendVoucher(address user, uint256 amount, uint256 marketId) external returns (uint256 amountSpent);
}

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

    /**
     * @notice Set the BetVouchers contract address
     * @param _vouchersContract Address of the deployed BetVouchers contract
     */
    function setVouchersContract(address _vouchersContract) external onlyOwner {
        require(_vouchersContract != address(0), "Invalid vouchers contract");
        vouchersContract = _vouchersContract;
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

    /**
     * @notice Internal helper to deduct bet amount from multiple sources
     * @dev CRITICAL: Spending order is: Vouchers → BetCredits → USDC
     * @param user User placing the bet
     * @param amount Total bet amount (should already be validated)
     * @param marketId Market ID (used for voucher tracking)
     * 
     * This ensures users burn through vouchers first (non-withdrawable)
     * before using paid bet credits and USDC
     */
    function _deductBetAmount(address user, uint256 amount, uint256 marketId) internal {
        uint256 remaining = amount;
        
        // Step 1: Try to spend from vouchers (if contract set)
        if (vouchersContract != address(0)) {
            try IBetVouchers(vouchersContract).spendVoucher(user, remaining, marketId) returns (uint256 voucherSpent) {
                if (voucherSpent > 0) {
                    remaining -= voucherSpent;
                }
            } catch {
                // If vouchers contract call fails, just continue without vouchers
                // This is safe - the bet will proceed with credits/USDC
            }
        }
        
        // Step 2: Deduct from bet credits
        if (remaining > 0 && betCredits[user] > 0) {
            uint256 creditSpent = remaining <= betCredits[user] ? remaining : betCredits[user];
            betCredits[user] -= creditSpent;
            emit BetCreditUsed(user, creditSpent);
            remaining -= creditSpent;
        }
        
        // Step 3: Deduct from USDC (final amount)
        if (remaining > 0) {
            require(usdc.transferFrom(user, address(this), remaining), "USDC transfer failed");
        }
    }
}
