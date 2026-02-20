// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TrenchyStaking - Tiered Staking System
 * @notice Stake TRENCHY tokens for benefits: points boost & fee discounts
 * @dev 4-tier system: Bronze → Silver → Gold → Diamond
 */
contract TrenchyStaking is ReentrancyGuard, Ownable, Pausable {
    
    IERC20 public trenchyToken;
    
    // Stake info per user
    struct Stake {
        uint256 amount;           // Staked amount
        uint256 since;            // Stake start timestamp
        uint256 tier;             // 0=None, 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
        uint256 pointsBoost;      // Percentage boost (10, 25, 50, 100)
        uint256 feeDiscount;      // Percentage discount (0, 25, 50, 75)
        uint256 lastUnstakeRequest; // Timestamp of unstake request
    }
    
    mapping(address => Stake) public stakes;
    
    // Tier thresholds (in TRENCHY tokens, 18 decimals)
    uint256 public constant BRONZE_THRESHOLD = 1_000 * 1e18;    // 1K TRENCHY
    uint256 public constant SILVER_THRESHOLD = 5_000 * 1e18;    // 5K TRENCHY
    uint256 public constant GOLD_THRESHOLD = 10_000 * 1e18;      // 10K TRENCHY
    uint256 public constant DIAMOND_THRESHOLD = 50_000 * 1e18;   // 50K TRENCHY
    
    // Cooldown period
    uint256 public constant UNSTAKE_COOLDOWN = 7 days;
    
    // Total staked
    uint256 public totalStaked;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 tier);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 unlockTime);
    event Unstaked(address indexed user, uint256 amount);
    event TierUpdated(address indexed user, uint256 newTier);
    
    constructor(address _trenchyToken) {
        trenchyToken = IERC20(_trenchyToken);
    }
    
    /**
     * @notice Stake TRENCHY tokens
     * @param amount Amount to stake
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot stake 0");
        
        // Transfer tokens from user
        require(
            trenchyToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        Stake storage userStake = stakes[msg.sender];
        
        // Update stake amount
        userStake.amount += amount;
        
        // Set start time if first stake
        if (userStake.since == 0) {
            userStake.since = block.timestamp;
        }
        
        // Update tier based on new amount
        _updateTier(msg.sender);
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, userStake.tier);
    }
    
    /**
     * @notice Request unstake (starts cooldown)
     * @param amount Amount to unstake
     */
    function requestUnstake(uint256 amount) external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient stake");
        require(amount > 0, "Cannot unstake 0");
        
        userStake.lastUnstakeRequest = block.timestamp;
        
        emit UnstakeRequested(
            msg.sender, 
            amount, 
            block.timestamp + UNSTAKE_COOLDOWN
        );
    }
    
    /**
     * @notice Complete unstake after cooldown
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        Stake storage userStake = stakes[msg.sender];
        
        require(userStake.amount >= amount, "Insufficient stake");
        require(amount > 0, "Cannot unstake 0");
        require(
            block.timestamp >= userStake.lastUnstakeRequest + UNSTAKE_COOLDOWN,
            "Cooldown period not met"
        );
        require(userStake.lastUnstakeRequest > 0, "No unstake requested");
        
        // Update stake
        userStake.amount -= amount;
        
        // Reset tier if fully unstaked
        if (userStake.amount == 0) {
            userStake.since = 0;
            userStake.tier = 0;
            userStake.pointsBoost = 0;
            userStake.feeDiscount = 0;
        } else {
            _updateTier(msg.sender);
        }
        
        // Reset unstake request
        userStake.lastUnstakeRequest = 0;
        
        totalStaked -= amount;
        
        // Transfer tokens back
        require(trenchyToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    /**
     * @notice Update user's tier based on staked amount
     * @param user User address
     */
    function _updateTier(address user) internal {
        Stake storage userStake = stakes[user];
        uint256 amount = userStake.amount;
        uint256 newTier;
        uint256 newBoost;
        uint256 newDiscount;
        
        if (amount >= DIAMOND_THRESHOLD) {
            newTier = 4;
            newBoost = 100;  // 2x points (100% boost)
            newDiscount = 75; // 75% fee reduction
        } else if (amount >= GOLD_THRESHOLD) {
            newTier = 3;
            newBoost = 50;   // 1.5x points (50% boost)
            newDiscount = 50;  // 50% fee reduction
        } else if (amount >= SILVER_THRESHOLD) {
            newTier = 2;
            newBoost = 25;   // 1.25x points (25% boost)
            newDiscount = 25; // 25% fee reduction
        } else if (amount >= BRONZE_THRESHOLD) {
            newTier = 1;
            newBoost = 10;   // 1.1x points (10% boost)
            newDiscount = 0;  // No fee discount
        } else {
            newTier = 0;
            newBoost = 0;
            newDiscount = 0;
        }
        
        // Only emit if tier changed
        if (userStake.tier != newTier) {
            userStake.tier = newTier;
            emit TierUpdated(user, newTier);
        }
        
        userStake.pointsBoost = newBoost;
        userStake.feeDiscount = newDiscount;
    }
    
    /**
     * @notice Get stake info for a user
     * @param user User address
     * @return tier Current tier (0-4)
     * @return pointsBoost Points boost percentage
     * @return feeDiscount Fee discount percentage
     * @return amount Staked amount
     * @return unlockTime When unstake is available (0 if not requested)
     */
    function getStakeInfo(address user) external view returns (
        uint256 tier,
        uint256 pointsBoost,
        uint256 feeDiscount,
        uint256 amount,
        uint256 unlockTime
    ) {
        Stake memory userStake = stakes[user];
        
        unlockTime = userStake.lastUnstakeRequest > 0 
            ? userStake.lastUnstakeRequest + UNSTAKE_COOLDOWN 
            : 0;
        
        return (
            userStake.tier,
            userStake.pointsBoost,
            userStake.feeDiscount,
            userStake.amount,
            unlockTime
        );
    }
    
    /**
     * @notice Check if user can unstake
     * @param user User address
     * @return canUnstake Whether unstake is available
     * @return timeRemaining Seconds until unstake available (0 if ready)
     */
    function canUnstake(address user) external view returns (bool canUnstake, uint256 timeRemaining) {
        Stake memory userStake = stakes[user];
        
        if (userStake.lastUnstakeRequest == 0) {
            return (false, UNSTAKE_COOLDOWN);
        }
        
        uint256 unlockTime = userStake.lastUnstakeRequest + UNSTAKE_COOLDOWN;
        
        if (block.timestamp >= unlockTime) {
            return (true, 0);
        } else {
            return (false, unlockTime - block.timestamp);
        }
    }
    
    /**
     * @notice Get tier thresholds
     */
    function getTierThresholds() external pure returns (
        uint256 bronze,
        uint256 silver,
        uint256 gold,
        uint256 diamond
    ) {
        return (BRONZE_THRESHOLD, SILVER_THRESHOLD, GOLD_THRESHOLD, DIAMOND_THRESHOLD);
    }
    
    /**
     * @notice Calculate effective fee with discount
     * @param user User address
     * @param baseFee Base fee amount
     * @return effectiveFee Fee after discount
     */
    function calculateEffectiveFee(address user, uint256 baseFee) external view returns (uint256) {
        uint256 discount = stakes[user].feeDiscount;
        return baseFee * (100 - discount) / 100;
    }
    
    /**
     * @notice Calculate points with boost
     * @param user User address
     * @param basePoints Base points earned
     * @return boostedPoints Points after boost
     */
    function calculateBoostedPoints(address user, uint256 basePoints) external view returns (uint256) {
        uint256 boost = stakes[user].pointsBoost;
        return basePoints * (100 + boost) / 100;
    }
    
    // Admin functions
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(trenchyToken.transfer(owner(), amount), "Transfer failed");
    }
}
