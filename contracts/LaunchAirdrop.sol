// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Interface for PredictionMarket
interface IPredictionMarket {
    function userStats(address user) external view returns (
        uint256 totalBets,
        uint256 totalWins,
        uint256 totalLosses,
        uint256 totalEarnings,
        uint256 currentStreak,
        uint256 bestStreak
    );
    function getUserMarkets(address user) external view returns (uint256[] memory);
}

/**
 * @title LaunchAirdrop
 * @notice Airdrop system for TrenchyBet launch
 * @dev First 1000 users who place a bet can claim 100 TRENCHY
 */
contract LaunchAirdrop is Ownable, ReentrancyGuard {

    // Token
    IERC20 public immutable trenchyToken;
    
    // Airdrop amount per user
    uint256 public constant AIRDROP_AMOUNT = 100 * 1e18; // 100 TRENCHY
    
    // Maximum recipients
    uint256 public constant MAX_RECIPIENTS = 1000;
    
    // State
    uint256 public recipientCount;
    mapping(address => bool) public hasClaimed;
    
    // PredictionMarket contract reference
    address public predictionMarket;


    
    // Events
    event AirdropClaimed(address indexed user, uint256 amount);
    event PredictionMarketSet(address indexed market);
    
    // Errors
    error AirdropEnded();
    error AlreadyClaimed();
    error MustPlaceBetFirst();
    error TransferFailed();
    
    /**
     * @notice Constructor
     * @param _trenchyToken Address of the TRENCHY token
     */
    constructor(address _trenchyToken) {
        require(_trenchyToken != address(0), "Invalid token address");
        trenchyToken = IERC20(_trenchyToken);
        transferOwnership(msg.sender);
    }
    
    /**
     * @notice Set the PredictionMarket contract address
     * @param _predictionMarket Address of the PredictionMarket contract
     */
    function setPredictionMarket(address _predictionMarket) external onlyOwner {
        require(_predictionMarket != address(0), "Invalid address");
        predictionMarket = _predictionMarket;
        emit PredictionMarketSet(_predictionMarket);
    }
    
    /**
     * @notice Check if user has placed a bet
     * @param user User address to check
     * @return Whether user has placed at least one bet
     */
    function hasPlacedBet(address user) public view returns (bool) {
        if (predictionMarket == address(0)) return false;
        
        // Check if user has any bets via PredictionMarket
        try IPredictionMarket(predictionMarket).userStats(user) returns (
            uint256 totalBets,
            uint256, // totalWins
            uint256, // totalLosses
            uint256, // totalEarnings
            uint256, // currentStreak
            uint256  // bestStreak
        ) {
            return totalBets > 0;
        } catch {
            // Fallback: check if user has any market positions
            try IPredictionMarket(predictionMarket).getUserMarkets(user) returns (uint256[] memory markets) {
                return markets.length > 0;
            } catch {
                return false;
            }
        }
    }

    
    /**
     * @notice Claim airdrop
     */
    function claimAirdrop() external nonReentrant {
        // Check if airdrop has ended
        if (recipientCount >= MAX_RECIPIENTS) {
            revert AirdropEnded();
        }
        
        // Check if already claimed
        if (hasClaimed[msg.sender]) {
            revert AlreadyClaimed();
        }
        
        // Check if user has placed a bet
        if (!hasPlacedBet(msg.sender)) {
            revert MustPlaceBetFirst();
        }
        
        // Mark as claimed
        hasClaimed[msg.sender] = true;
        recipientCount++;
        
        // Transfer tokens
        bool success = trenchyToken.transfer(msg.sender, AIRDROP_AMOUNT);
        if (!success) {
            revert TransferFailed();
        }
        
        emit AirdropClaimed(msg.sender, AIRDROP_AMOUNT);
    }
    
    /**
     * @notice Get remaining airdrop slots
     * @return Number of remaining slots
     */
    function getRemainingSlots() external view returns (uint256) {
        if (recipientCount >= MAX_RECIPIENTS) return 0;
        return MAX_RECIPIENTS - recipientCount;
    }
    
    /**
     * @notice Check if user is eligible for airdrop
     * @param user User address to check
     * @return Whether user can claim airdrop
     */
    function isEligible(address user) external view returns (bool) {
        if (recipientCount >= MAX_RECIPIENTS) return false;
        if (hasClaimed[user]) return false;
        return hasPlacedBet(user);
    }
    
    /**
     * @notice Fund the airdrop contract
     * @param amount Amount of tokens to fund
     */
    function fund(uint256 amount) external onlyOwner {
        require(
            trenchyToken.transferFrom(msg.sender, address(this), amount),
            "Funding failed"
        );
    }
    
    /**
     * @notice Emergency withdraw remaining tokens
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = trenchyToken.balanceOf(address(this));
        require(
            trenchyToken.transfer(msg.sender, balance),
            "Withdraw failed"
        );
    }
    
    /**
     * @notice Get airdrop stats
     */
    function getStats() external view returns (
        uint256 totalRecipients,
        uint256 remainingSlots,
        uint256 totalFunded
    ) {
        totalRecipients = recipientCount;
        remainingSlots = MAX_RECIPIENTS - recipientCount;
        totalFunded = trenchyToken.balanceOf(address(this));
    }
}
