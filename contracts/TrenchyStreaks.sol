// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TrenchyStreaks
 * @notice Daily streak system for user engagement
 * @dev Tracks consecutive daily check-ins and rewards users
 */
contract TrenchyStreaks is Ownable, ReentrancyGuard {

    // Token
    IERC20 public immutable trenchyToken;
    
    // Streak configuration
    uint256 public constant CHECK_IN_COOLDOWN = 24 hours; // Must wait 24h between check-ins
    uint256 public constant STREAK_RESET_TIME = 48 hours; // Reset if not checked in for 48h
    
    // Reward tiers (points)
    uint256[7] public dailyRewards = [5, 5, 10, 10, 15, 20, 50]; // Days 1-7
    
    // User streak data
    struct StreakData {
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 lastCheckIn;
        uint256 totalCheckIns;
        uint256 totalPointsEarned;
    }
    
    mapping(address => StreakData) public userStreaks;
    
    // Events
    event CheckIn(address indexed user, uint256 streak, uint256 points);
    event StreakReset(address indexed user, uint256 oldStreak);
    event RewardsUpdated(uint256[7] newRewards);
    
    // Errors
    error TooSoon();
    error NoTokensToClaim();
    
    constructor(address _trenchyToken) {
        require(_trenchyToken != address(0), "Invalid token address");
        trenchyToken = IERC20(_trenchyToken);
        transferOwnership(msg.sender);
    }
    
    /**
     * @notice Check in to maintain or start streak
     */
    function checkIn() external nonReentrant {
        StreakData storage user = userStreaks[msg.sender];
        uint256 now_ = block.timestamp;
        
        // Check if too soon (must wait at least 24h)
        if (user.lastCheckIn > 0 && now_ < user.lastCheckIn + CHECK_IN_COOLDOWN) {
            revert TooSoon();
        }
        
        // Check if streak should reset (more than 48h since last check-in)
        if (user.lastCheckIn > 0 && now_ > user.lastCheckIn + STREAK_RESET_TIME) {
            emit StreakReset(msg.sender, user.currentStreak);
            user.currentStreak = 0;
        }
        
        // Increment streak
        user.currentStreak++;
        if (user.currentStreak > user.longestStreak) {
            user.longestStreak = user.currentStreak;
        }
        
        user.lastCheckIn = now_;
        user.totalCheckIns++;
        
        // Calculate reward
        uint256 rewardIndex = (user.currentStreak - 1) % 7;
        uint256 points = dailyRewards[rewardIndex];
        user.totalPointsEarned += points;
        
        emit CheckIn(msg.sender, user.currentStreak, points);
    }
    
    /**
     * @notice Get streak data for a user
     */
    function getStreakData(address user) external view returns (StreakData memory) {
        return userStreaks[user];
    }
    
    /**
     * @notice Check if user can check in
     */
    function canCheckIn(address user) external view returns (bool) {
        StreakData memory data = userStreaks[user];
        
        if (data.lastCheckIn == 0) return true;
        
        uint256 now_ = block.timestamp;
        
        // Can check in if 24h has passed
        return now_ >= data.lastCheckIn + CHECK_IN_COOLDOWN;
    }
    
    /**
     * @notice Get time until next check-in
     */
    function timeUntilNextCheckIn(address user) external view returns (uint256) {
        StreakData memory data = userStreaks[user];
        
        if (data.lastCheckIn == 0) return 0;
        
        uint256 nextCheckIn = data.lastCheckIn + CHECK_IN_COOLDOWN;
        uint256 now_ = block.timestamp;
        
        if (now_ >= nextCheckIn) return 0;
        return nextCheckIn - now_;
    }
    
    /**
     * @notice Get today's reward based on current streak
     */
    function getTodayReward(address user) external view returns (uint256) {
        StreakData memory data = userStreaks[user];
        uint256 rewardIndex = data.currentStreak % 7;
        return dailyRewards[rewardIndex];
    }
    
    /**
     * @notice Update reward tiers (admin only)
     */
    function updateRewards(uint256[7] calldata newRewards) external onlyOwner {
        dailyRewards = newRewards;
        emit RewardsUpdated(newRewards);
    }
    
    /**
     * @notice Fund contract with TRENCHY tokens
     */
    function fund(uint256 amount) external onlyOwner {
        require(
            trenchyToken.transferFrom(msg.sender, address(this), amount),
            "Funding failed"
        );
    }
    
    /**
     * @notice Emergency withdraw
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = trenchyToken.balanceOf(address(this));
        require(
            trenchyToken.transfer(msg.sender, balance),
            "Withdraw failed"
        );
    }
}
