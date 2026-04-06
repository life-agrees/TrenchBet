// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BetVouchers
 * @notice Non-withdrawable voucher system for free bet credits
 * @dev Users can earn vouchers through insurance, promotions, or contests
 * @dev Vouchers can only be spent on bets (not withdrawn as tokens)
 */
contract BetVouchers is Ownable, ReentrancyGuard {

    // Tokens
    IERC20 public immutable usdc;
    
    // Constants
    uint256 public constant MAX_FIRST_BET_VOUCHER = 100 * 1e6; // $100 USDC equivalent voucher
    
    // State
    mapping(address => uint256) public voucherBalance;         // Non-withdrawable bet credits
    mapping(address => uint256) public voucherSpent;           // Total vouchers used
    mapping(address => bool) public hasReceivedFirstBetVoucher;
    mapping(address => uint256) public firstBetAmount;
    mapping(address => bool) public firstBetLost;
    
    // PredictionMarket reference
    address public predictionMarket;
    
    // Events
    event VoucherAwarded(address indexed user, uint256 amount, string reason);
    event VoucherSpent(address indexed user, uint256 amount, uint256 marketId);
    event VoucherTransferred(address indexed from, address indexed to, uint256 amount);
    event FirstBetRecorded(address indexed user, uint256 amount);
    event FirstBetResult(address indexed user, bool won);
    event BatchVouchersDistributed(uint256 count, string campaignId, uint256 totalAmount);
    
    // Errors
    error InsufficientVouchers();
    error VoucherAlreadyUsed();
    error NoFirstBet();
    error FirstBetNotLost();
    error InvalidAmount();
    error TransferFailed();
    
    /**
     * @notice Constructor
     * @param _usdc Address of USDC token
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
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
     * @notice Award voucher to user (internal or admin call)
     * @param user User address
     * @param amount Voucher amount in USDC (6 decimals)
     * @param reason Reason for voucher (e.g., "first_bet_loss", "promotion", "contest_winner")
     */
    function awardVoucher(address user, uint256 amount, string memory reason) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        
        voucherBalance[user] += amount;
        emit VoucherAwarded(user, amount, reason);
    }
    
    /**
     * @notice Claim voucher after first bet loss (automatic flow)
     * Called by owner/backend when first bet resolves as loss
     */
    function claimFirstBetVoucher(address user) external onlyOwner {
        // Check eligibility
        if (hasReceivedFirstBetVoucher[user]) {
            revert VoucherAlreadyUsed();
        }
        if (firstBetAmount[user] == 0) {
            revert NoFirstBet();
        }
        if (!firstBetLost[user]) {
            revert FirstBetNotLost();
        }
        
        // Calculate voucher amount
        uint256 betAmount = firstBetAmount[user];
        uint256 voucherAmount = betAmount > MAX_FIRST_BET_VOUCHER 
            ? MAX_FIRST_BET_VOUCHER 
            : betAmount;
        
        // Mark as used
        hasReceivedFirstBetVoucher[user] = true;
        
        // Award voucher (non-withdrawable credit)
        voucherBalance[user] += voucherAmount;
        
        emit VoucherAwarded(user, voucherAmount, "first_bet_loss_insurance");
    }
    
    /**
     * @notice Spend voucher on a bet
     * Called by PredictionMarket when user places a bet
     * @param user User address
     * @param amount Amount of voucher to spend (in USDC, 6 decimals)
     * @param marketId Market ID where voucher is being used
     * @return amountSpent Amount actually spent from voucher
     */
    function spendVoucher(address user, uint256 amount, uint256 marketId) external nonReentrant returns (uint256 amountSpent) {
        require(msg.sender == predictionMarket || msg.sender == owner(), "Unauthorized");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");
        
        // Spend only what's available
        uint256 canSpend = voucherBalance[user];
        amountSpent = amount > canSpend ? canSpend : amount;
        
        if (amountSpent > 0) {
            voucherBalance[user] -= amountSpent;
            voucherSpent[user] += amountSpent;
            emit VoucherSpent(user, amountSpent, marketId);
        }
        
        return amountSpent;
    }
    
    /**
     * @notice Get voucher balance for a user
     * @param user User address
     * @return Current voucher balance (in USDC, 6 decimals)
     */
    function getVoucherBalance(address user) external view returns (uint256) {
        return voucherBalance[user];
    }
    
    /**
     * @notice Get complete voucher status for user
     * @param user User address
     * @return balance Current voucher balance
     * @return spent Total vouchers already spent
     * @return canClaimFirstBet Whether user can claim first bet voucher
     */
    function getVoucherStatus(address user) external view returns (
        uint256 balance,
        uint256 spent,
        bool canClaimFirstBet
    ) {
        balance = voucherBalance[user];
        spent = voucherSpent[user];
        
        // Can claim if: first bet recorded, lost, and not yet claimed
        canClaimFirstBet = firstBetAmount[user] > 0 
            && firstBetLost[user] 
            && !hasReceivedFirstBetVoucher[user];
    }
    
    /**
     * @notice Manual voucher adjustment (admin only, for corrections/promotions)
     * @param user User address
     * @param amount Amount to add (positive) or remove (negative converted to uint)
     * @param reason Reason for adjustment
     */
    function adjustVoucher(address user, int256 amount, string memory reason) external onlyOwner {
        require(user != address(0), "Invalid user");
        
        if (amount > 0) {
            voucherBalance[user] += uint256(amount);
            emit VoucherAwarded(user, uint256(amount), reason);
        } else if (amount < 0) {
            uint256 deduction = uint256(-amount);
            require(voucherBalance[user] >= deduction, "Insufficient balance");
            voucherBalance[user] -= deduction;
        }
    }
    
    /**
     * @notice Batch distribute vouchers to multiple users
     * @dev Perfect for waitlist campaigns: $10, $15, $20 vouchers to 2k+ wallets
     * @param users Array of user addresses
     * @param amounts Array of voucher amounts (in USDC, 6 decimals)
     * @param campaignId Campaign identifier (e.g., "waitlist_2025" or "launch_promo")
     * @return distributedCount Number of vouchers successfully distributed
     */
    function batchDistributeVouchers(
        address[] calldata users,
        uint256[] calldata amounts,
        string memory campaignId
    ) external onlyOwner returns (uint256 distributedCount) {
        require(users.length == amounts.length, "Array length mismatch");
        require(users.length > 0, "Empty arrays");
        require(users.length <= 500, "Max 500 per batch"); // Prevent out-of-gas
        
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 amount = amounts[i];
            
            // Skip invalid entries
            if (user == address(0) || amount == 0) continue;
            
            // Award voucher
            voucherBalance[user] += amount;
            totalDistributed += amount;
            
            emit VoucherAwarded(user, amount, campaignId);
        }
        
        require(totalDistributed > 0, "No valid vouchers distributed");
        
        emit BatchVouchersDistributed(users.length, campaignId, totalDistributed);
        return users.length;
    }
}
