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
 * @title FirstBetInsurance
 * @notice Insurance system for first-time bettors
 * @dev Covers up to $100 USDC worth of losses on first bet
 */
contract FirstBetInsurance is Ownable, ReentrancyGuard {


    // Tokens
    IERC20 public immutable usdc;
    IERC20 public immutable trenchyToken;
    
    // Constants
    uint256 public constant MAX_INSURANCE_USDC = 100 * 1e6; // $100 USDC
    uint256 public constant TRENCHY_PER_USDC = 1e12; // Conversion rate (TRENCHY has 18 decimals, USDC has 6)
    
    // State
    mapping(address => bool) public hasUsedInsurance;
    mapping(address => uint256) public firstBetAmount;
    mapping(address => bool) public firstBetLost;
    
    // PredictionMarket reference
    address public predictionMarket;
    
    // Events
    event InsuranceClaimed(address indexed user, uint256 usdcAmount, uint256 trenchyAmount);
    event FirstBetRecorded(address indexed user, uint256 amount);
    event FirstBetResult(address indexed user, bool won);
    
    // Errors
    error InsuranceAlreadyUsed();
    error NoFirstBet();
    error FirstBetNotLost();
    error TransferFailed();
    error InvalidAmount();
    
    /**
     * @notice Constructor
     * @param _usdc Address of USDC token
     * @param _trenchyToken Address of TRENCHY token
     */
    constructor(address _usdc, address _trenchyToken) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_trenchyToken != address(0), "Invalid TRENCHY address");
        usdc = IERC20(_usdc);
        trenchyToken = IERC20(_trenchyToken);
        transferOwnership(msg.sender);
    }
    
    /**
     * @notice Set PredictionMarket contract
     * @param _predictionMarket Address of PredictionMarket contract
     */
    function setPredictionMarket(address _predictionMarket) external onlyOwner {
        require(_predictionMarket != address(0), "Invalid address");
        predictionMarket = _predictionMarket;
    }
    
    /**
     * @notice Record a user's first bet (called by PredictionMarket)
     * @param user User address
     * @param amount Bet amount in USDC
     */
    function recordFirstBet(address user, uint256 amount) external {
        require(msg.sender == predictionMarket || msg.sender == owner(), "Unauthorized");
        require(firstBetAmount[user] == 0, "First bet already recorded");
        require(amount > 0, "Invalid amount");
        
        firstBetAmount[user] = amount;
        emit FirstBetRecorded(user, amount);
    }
    
    /**
     * @notice Record first bet result (called by PredictionMarket)
     * @param user User address
     * @param won Whether the bet was won
     */
    function recordFirstBetResult(address user, bool won) external {
        require(msg.sender == predictionMarket || msg.sender == owner(), "Unauthorized");
        require(firstBetAmount[user] > 0, "No first bet recorded");
        
        firstBetLost[user] = !won;
        emit FirstBetResult(user, won);
    }
    
    /**
     * @notice Claim insurance for lost first bet
     */
    function claimInsurance() external nonReentrant {
        // Check if insurance already used
        if (hasUsedInsurance[msg.sender]) {
            revert InsuranceAlreadyUsed();
        }
        
        // Check if first bet was recorded
        if (firstBetAmount[msg.sender] == 0) {
            revert NoFirstBet();
        }
        
        // Check if first bet was lost
        if (!firstBetLost[msg.sender]) {
            revert FirstBetNotLost();
        }
        
        // Calculate insurance amount
        uint256 betAmount = firstBetAmount[msg.sender];
        uint256 insuranceAmount = betAmount > MAX_INSURANCE_USDC 
            ? MAX_INSURANCE_USDC 
            : betAmount;
        
        // Mark as used
        hasUsedInsurance[msg.sender] = true;
        
        // Calculate TRENCHY amount (1:1 at launch)
        uint256 trenchyAmount = insuranceAmount * TRENCHY_PER_USDC;
        
        // Transfer TRENCHY tokens
        bool success = trenchyToken.transfer(msg.sender, trenchyAmount);
        if (!success) {
            revert TransferFailed();
        }
        
        emit InsuranceClaimed(msg.sender, insuranceAmount, trenchyAmount);
    }
    
    /**
     * @notice Check if user can claim insurance
     * @param user User address
     * @return Whether user is eligible for insurance claim
     */
    function canClaimInsurance(address user) external view returns (bool) {
        if (hasUsedInsurance[user]) return false;
        if (firstBetAmount[user] == 0) return false;
        return firstBetLost[user];
    }
    
    /**
     * @notice Check if a user has placed their first bet via PredictionMarket
     * @param user User address to check
     * @return hasBet Whether user has placed at least one bet
     * @return betAmount Amount of first bet
     */
    function checkFirstBetViaMarket(address user) external view returns (bool hasBet, uint256 betAmount) {
        if (predictionMarket == address(0)) return (false, 0);
        
        // Try to get user stats from PredictionMarket
        try IPredictionMarket(predictionMarket).userStats(user) returns (
            uint256 totalBets,
            uint256, // totalWins
            uint256, // totalLosses
            uint256, // totalEarnings
            uint256, // currentStreak
            uint256  // bestStreak
        ) {
            if (totalBets > 0 && firstBetAmount[user] == 0) {
                // User has bets but we haven't recorded first bet
                // This shouldn't happen if integration is working
                return (true, 0);
            }
        } catch {
            // Contract call failed
        }
        
        return (firstBetAmount[user] > 0, firstBetAmount[user]);
    }

    
    /**
     * @notice Get insurance status for a user
     */
    function getInsuranceStatus(address user) external view returns (
        bool hasInsurance,
        uint256 betAmount,
        bool betLost,
        bool claimed
    ) {
        hasInsurance = firstBetAmount[user] > 0 && !hasUsedInsurance[user];
        betAmount = firstBetAmount[user];
        betLost = firstBetLost[user];
        claimed = hasUsedInsurance[user];
    }
    
    /**
     * @notice Fund the insurance contract with TRENCHY tokens
     * @param amount Amount of TRENCHY to fund
     */
    function fund(uint256 amount) external onlyOwner {
        require(
            trenchyToken.transferFrom(msg.sender, address(this), amount),
            "Funding failed"
        );
    }
    
    /**
     * @notice Emergency withdraw TRENCHY tokens
     */
    function emergencyWithdrawTrenchy() external onlyOwner {
        uint256 balance = trenchyToken.balanceOf(address(this));
        require(
            trenchyToken.transfer(msg.sender, balance),
            "Withdraw failed"
        );
    }
    
    /**
     * @notice Emergency withdraw USDC tokens
     */
    function emergencyWithdrawUSDC() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(
            usdc.transfer(msg.sender, balance),
            "Withdraw failed"
        );
    }
}
