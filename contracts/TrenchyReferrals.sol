// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TrenchyReferrals
 * @notice On-chain referral tracking system for TrenchyBet
 * @dev Tracks referral relationships and rewards referrers with TRENCHY tokens
 */
contract TrenchyReferrals is Ownable, ReentrancyGuard {

    // Token interface
    IERC20 public immutable trenchyToken;
    
    // Referral configuration
    uint256 public constant REFERRAL_REWARD = 10 * 1e18; // 10 TRENCHY per referral
    uint256 public constant MAX_REFERRALS_PER_USER = 100;
    
    // State mappings
    mapping(address => address) public referredBy;
    mapping(address => uint256) public referralCount;
    mapping(address => uint256) public referralEarnings;
    mapping(address => bool) public hasReferred;
    
    // Tracking
    address[] public referrers;
    mapping(address => bool) public isReferrer;
    
    // Events
    event ReferralRegistered(address indexed user, address indexed referrer);
    event ReferralRewardClaimed(address indexed referrer, address indexed user, uint256 amount);
    event RewardDistributed(address indexed referrer, uint256 totalAmount);
    
    // Errors
    error AlreadyReferred();
    error CannotReferSelf();
    error InvalidReferrer();
    error NoReferralToClaim();
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
     * @notice Register a referral relationship
     * @param referrer The address of the referrer
     */
    function registerReferral(address referrer) external {
        // Validation
        require(referrer != address(0), "Invalid referrer");
        require(referrer != msg.sender, "Cannot refer yourself");
        require(referredBy[msg.sender] == address(0), "Already referred");
        
        // Check referrer is valid (has placed a bet before - tracked via hasReferred)
        // For now, we allow any address to be a referrer
        
        // Register the referral
        referredBy[msg.sender] = referrer;
        referralCount[referrer]++;
        hasReferred[msg.sender] = true;
        
        // Track referrer
        if (!isReferrer[referrer]) {
            isReferrer[referrer] = true;
            referrers.push(referrer);
        }
        
        emit ReferralRegistered(msg.sender, referrer);
    }
    
    /**
     * @notice Claim referral reward (called by contract owner/trigger)
     * @dev In practice, this would be called by the backend or automated system
     * @param user The user who was referred
     */
    function claimReferralReward(address user) external onlyOwner nonReentrant {
        address referrer = referredBy[user];
        require(referrer != address(0), "No referrer");
        require(referralEarnings[referrer] == 0, "Already claimed");
        
        // Award the referrer
        referralEarnings[referrer] += REFERRAL_REWARD;
        
        // Transfer tokens (if contract has tokens)
        if (trenchyToken.balanceOf(address(this)) >= REFERRAL_REWARD) {
            require(
                trenchyToken.transfer(referrer, REFERRAL_REWARD),
                "Transfer failed"
            );
        }
        
        emit ReferralRewardClaimed(referrer, user, REFERRAL_REWARD);
    }
    
    /**
     * @notice Batch award referral rewards (for efficiency)
     * @param users Array of users who were referred
     */
    function batchAwardReferralRewards(address[] calldata users) external onlyOwner nonReentrant {
        uint256 totalReward = REFERRAL_REWARD * users.length;
        require(trenchyToken.balanceOf(address(this)) >= totalReward, "Insufficient balance");
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            address referrer = referredBy[user];
            
            if (referrer != address(0) && referralEarnings[referrer] == 0) {
                referralEarnings[referrer] += REFERRAL_REWARD;
                require(
                    trenchyToken.transfer(referrer, REFERRAL_REWARD),
                    "Transfer failed"
                );
                emit ReferralRewardClaimed(referrer, user, REFERRAL_REWARD);
            }
        }
        
        emit RewardDistributed(msg.sender, totalReward);
    }
    
    /**
     * @notice Get the referrer for a user
     * @param user The user address
     * @return The referrer address
     */
    function getReferrer(address user) external view returns (address) {
        return referredBy[user];
    }
    
    /**
     * @notice Get total number of referrals for a referrer
     * @param referrer The referrer address
     * @return Number of referrals
     */
    function getReferralCount(address referrer) external view returns (uint256) {
        return referralCount[referrer];
    }
    
    /**
     * @notice Get total earnings from referrals
     * @param referrer The referrer address
     * @return Total earnings
     */
    function getReferralEarnings(address referrer) external view returns (uint256) {
        return referralEarnings[referrer];
    }
    
    /**
     * @notice Check if a user has been referred
     * @param user The user address
     * @return Whether the user has been referred
     */
    function hasBeenReferred(address user) external view returns (bool) {
        return hasReferred[user];
    }
    
    /**
     * @notice Get total number of referrers
     * @return Number of referrers
     */
    function getTotalReferrers() external view returns (uint256) {
        return referrers.length;
    }
    
    /**
     * @notice Get paginated list of referrers
     * @param start Start index
     * @param count Number of referrers to return
     * @return Array of referrer addresses
     */
    function getReferrers(uint256 start, uint256 count) external view returns (address[] memory) {
        uint256 end = start + count;
        if (end > referrers.length) {
            end = referrers.length;
        }
        
        address[] memory result = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = referrers[i];
        }
        
        return result;
    }
    
    /**
     * @notice Fund the referral contract with TRENCHY tokens
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
