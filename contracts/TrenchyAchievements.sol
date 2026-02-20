// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TrenchyAchievements
 * @notice Achievements and badges system for TrenchyBet
 * @dev Tracks user achievements and awards points for unlocking them
 */
contract TrenchyAchievements is Ownable, ReentrancyGuard {

    // Token interface
    IERC20 public immutable trenchyToken;
    
    // Achievement enum
    enum Achievement {
        FIRST_BET,           // Place first bet
        WIN_STREAK_3,        // Win 3 in a row
        WIN_STREAK_5,        // Win 5 in a row
        WHALE,               // Bet $1000+
        SHARPSHOOTER,        // 80% win rate over 20 bets
        EARLY_BIRD,          // Bet in first 60s
        SPEED_DEMON,         // Place 10 bets in 1 day
        SOCIAL_BUTTERFLY,    // Refer 5 friends
        DIAMOND_HANDS,       // Hold locked TRENCHY 30 days
        ORACLE,              // Predict 10 markets correctly
        TRENDSETTER,         // Be first to bet on market
        FOUNDER              // Early supporter (airdrop claimer)
    }
    
    // Achievement points
    mapping(Achievement => uint256) public achievementPoints;
    
    // User achievements
    mapping(address => mapping(Achievement => bool)) public hasAchievement;
    mapping(address => uint256) public achievementCount;
    mapping(address => uint256) public totalAchievementPoints;
    
    // Leaderboard
    address[] public leaderboard;
    mapping(address => uint256) public leaderboardPosition;
    
    // Events
    event AchievementUnlocked(address indexed user, Achievement achievement, uint256 points);
    event PointsAwarded(address indexed user, uint256 points, string reason);
    
    // Errors
    error AchievementAlreadyUnlocked();
    error InvalidAchievement();
    error TransferFailed();
    
    /**
     * @notice Constructor
     * @param _trenchyToken Address of the TRENCHY token
     */
    constructor(address _trenchyToken) {
        require(_trenchyToken != address(0), "Invalid token address");
        trenchyToken = IERC20(_trenchyToken);
        transferOwnership(msg.sender);
        
        // Initialize achievement points
        achievementPoints[Achievement.FIRST_BET] = 50;
        achievementPoints[Achievement.WIN_STREAK_3] = 100;
        achievementPoints[Achievement.WIN_STREAK_5] = 200;
        achievementPoints[Achievement.WHALE] = 150;
        achievementPoints[Achievement.SHARPSHOOTER] = 300;
        achievementPoints[Achievement.EARLY_BIRD] = 50;
        achievementPoints[Achievement.SPEED_DEMON] = 100;
        achievementPoints[Achievement.SOCIAL_BUTTERFLY] = 150;
        achievementPoints[Achievement.DIAMOND_HANDS] = 250;
        achievementPoints[Achievement.ORACLE] = 500;
        achievementPoints[Achievement.TRENDSETTER] = 75;
        achievementPoints[Achievement.FOUNDER] = 1000;
    }
    
    /**
     * @notice Unlock an achievement for a user
     * @param user The user address
     * @param achievement The achievement to unlock
     */
    function unlockAchievement(address user, Achievement achievement) external onlyOwner {
        require(uint8(achievement) <= 12, "Invalid achievement");
        
        if (hasAchievement[user][achievement]) {
            revert AchievementAlreadyUnlocked();
        }
        
        // Mark achievement as unlocked
        hasAchievement[user][achievement] = true;
        achievementCount[user]++;
        
        // Award points
        uint256 points = achievementPoints[achievement];
        totalAchievementPoints[user] += points;
        
        // Update leaderboard
        _updateLeaderboard(user);
        
        emit AchievementUnlocked(user, achievement, points);
    }
    
    /**
     * @notice Batch unlock achievements
     * @param users Array of user addresses
     * @param achievements Array of achievements to unlock
     */
    function batchUnlockAchievements(address[] calldata users, Achievement[] calldata achievements) 
        external 
        onlyOwner 
    {
        require(users.length == achievements.length, "Length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (!hasAchievement[users[i]][achievements[i]]) {
                hasAchievement[users[i]][achievements[i]] = true;
                achievementCount[users[i]]++;
                
                uint256 points = achievementPoints[achievements[i]];
                totalAchievementPoints[users[i]] += points;
                
                _updateLeaderboard(users[i]);
                
                emit AchievementUnlocked(users[i], achievements[i], points);
            }
        }
    }
    
    /**
     * @notice Award points without achievement (for other actions)
     * @param user The user address
     * @param points Amount of points to award
     * @param reason Reason for points
     */
    function awardPoints(address user, uint256 points, string calldata reason) 
        external 
        onlyOwner 
    {
        require(points > 0, "Points must be > 0");
        
        totalAchievementPoints[user] += points;
        _updateLeaderboard(user);
        
        emit PointsAwarded(user, points, reason);
    }
    
    /**
     * @notice Check if user has a specific achievement
     * @param user The user address
     * @param achievement The achievement to check
     * @return Whether the user has the achievement
     */
    function checkAchievement(address user, Achievement achievement) 
        external 
        view 
        returns (bool) 
    {
        return hasAchievement[user][achievement];
    }
    
    /**
     * @notice Get all achievements for a user
     * @param user The user address
     * @return Array of unlocked achievements
     */
    function getUserAchievements(address user) 
        external 
        view 
        returns (bool[13] memory) 
    {
        bool[13] memory achievements;
        for (uint8 i = 0; i <= 12; i++) {
            achievements[i] = hasAchievement[user][Achievement(i)];
        }
        return achievements;
    }
    
    /**
     * @notice Get achievement points
     * @param achievement The achievement
     * @return Points awarded for the achievement
     */
    function getAchievementPoints(Achievement achievement) 
        external 
        view 
        returns (uint256) 
    {
        return achievementPoints[achievement];
    }
    
    /**
     * @notice Get leaderboard
     * @param count Number of top users to return
     * @return topUsers Array of top user addresses
     * @return points Array of points for each user
     */
    function getLeaderboard(uint256 count) 
        external 
        view 
        returns (address[] memory topUsers, uint256[] memory points) 
    {
        uint256 length = leaderboard.length < count ? leaderboard.length : count;
        topUsers = new address[](length);
        points = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            topUsers[i] = leaderboard[i];
            points[i] = totalAchievementPoints[leaderboard[i]];
        }
        
        return (topUsers, points);
    }
    
    /**
     * @notice Get user's rank on leaderboard
     * @param user The user address
     * @return User's rank (1-based), 0 if not on leaderboard
     */
    function getUserRank(address user) external view returns (uint256) {
        return leaderboardPosition[user];
    }
    
    /**
     * @notice Update leaderboard
     * @param user The user address
     */
    function _updateLeaderboard(address user) internal {
        uint256 userPoints = totalAchievementPoints[user];
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
        
        // Bubble up if user has more points
        while (currentPosition > 1) {
            address aboveUser = leaderboard[currentPosition - 2];
            if (userPoints > totalAchievementPoints[aboveUser]) {
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
     * @notice Fund the contract with TRENCHY tokens
     * @param amount Amount of tokens to fund
     */
    function fund(uint256 amount) external onlyOwner {
        require(
            trenchyToken.transferFrom(msg.sender, address(this), amount),
            "Funding transfer failed"
        );
    }
    
    /**
     * @notice Withdraw tokens from contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(msg.sender, amount), "Withdraw failed");
    }
}
