// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrenchyPointsClaim
 * @notice Allows users to claim $TRENCHY tokens from accumulated points
 * @dev Features:
 * - 10,000 points = 100 TRENCHY (rate: 100 points per TRENCHY)
 * - 15-day transfer lock on claimed tokens (unless auto-staked)
 * - Monthly claim cap: 10,000 TRENCHY per user
 * - Backend signature verification (prevents unauthorized claims)
 * - Optional auto-stake for immediate token utility
 */
contract TrenchyPointsClaim is ReentrancyGuard, Ownable {
    
    // ==================== STATE VARIABLES ====================
    
    IERC20 public immutable trenchyToken;
    address public stakingContract;
    address public backendSigner;
    
    uint256 public constant POINTS_PER_TRENCHY = 100; // 10,000 points = 100 TRENCHY
    uint256 public constant LOCK_PERIOD = 15 days;
    uint256 public constant MONTHLY_CLAIM_CAP = 10_000 * 1e18; // 10,000 TRENCHY
    uint256 public constant MONTH_DURATION = 30 days;
    
    // User claim tracking
    struct UserClaim {
        uint256 totalClaimed;      // Total TRENCHY claimed all-time
        uint256 monthlyClaimAmount; // Amount claimed this month
        uint256 monthStartTime;     // When current month started
        uint256 lockedBalance;      // Tokens locked (not yet transferable)
    }
    
    // Individual claim records
    struct ClaimRecord {
        uint256 amount;         // TRENCHY amount claimed
        uint256 claimTime;      // When claimed
        uint256 unlockTime;     // When tokens unlock (0 if auto-staked)
        bool autoStaked;        // If tokens were auto-staked
        bool withdrawn;         // If locked tokens were withdrawn
    }
    
    mapping(address => UserClaim) public userClaims;
    mapping(address => ClaimRecord[]) public claimRecords;
    mapping(bytes32 => bool) public usedNonces; // Prevent signature replay
    
    // Admin controls
    bool public claimingEnabled = true;
    uint256 public totalDistributed;
    
    // ==================== EVENTS ====================
    
    event PointsClaimed(
        address indexed user,
        uint256 pointsSpent,
        uint256 trenchyAmount,
        bool autoStaked
    );
    
    event TokensUnlocked(
        address indexed user,
        uint256 amount
    );
    
    event StakingContractUpdated(address newStaking);
    event BackendSignerUpdated(address newSigner);
    event ClaimingToggled(bool enabled);
    event EmergencyWithdraw(address token, uint256 amount);
    
    // ==================== CONSTRUCTOR ====================
    
    constructor(
        address _trenchyToken,
        address _backendSigner,
        address _stakingContract,
        address _owner
    ) {
        require(_trenchyToken != address(0), "Invalid token");
        require(_backendSigner != address(0), "Invalid signer");
        
        trenchyToken = IERC20(_trenchyToken);
        backendSigner = _backendSigner;
        stakingContract = _stakingContract;
        
        transferOwnership(_owner);
    }
    
    // ==================== CORE CLAIM FUNCTION ====================
    
    /**
     * @notice Claim TRENCHY tokens using accumulated points
     * @param pointsAmount Points to spend (must be verified by backend)
     * @param autoStake If true, tokens are immediately staked (no lock)
     * @param nonce Unique nonce to prevent replay attacks
     * @param signature Backend signature proving user has enough points
     */
    function claimPoints(
        uint256 pointsAmount,
        bool autoStake,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(claimingEnabled, "Claiming disabled");
        require(!usedNonces[nonce], "Nonce already used");
        require(pointsAmount >= POINTS_PER_TRENCHY, "Minimum 100 points required");
        
        // Verify backend signature
        require(
            _verifySignature(msg.sender, pointsAmount, nonce, signature),
            "Invalid signature"
        );
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        
        // Calculate TRENCHY amount (rounded down)
        uint256 trenchyAmount = (pointsAmount / POINTS_PER_TRENCHY) * 1e18;
        
        // Check monthly cap
        UserClaim storage userClaim = userClaims[msg.sender];
        
        // Reset monthly tracking if new month
        if (block.timestamp >= userClaim.monthStartTime + MONTH_DURATION) {
            userClaim.monthlyClaimAmount = 0;
            userClaim.monthStartTime = block.timestamp;
        }
        
        require(
            userClaim.monthlyClaimAmount + trenchyAmount <= MONTHLY_CLAIM_CAP,
            "Monthly claim cap exceeded"
        );
        
        // Update user tracking
        userClaim.totalClaimed += trenchyAmount;
        userClaim.monthlyClaimAmount += trenchyAmount;
        totalDistributed += trenchyAmount;
        
        if (autoStake) {
            // Auto-stake: immediate utility, no lock
            require(stakingContract != address(0), "Staking not configured");
            
            // Transfer tokens to staking contract
            require(
                trenchyToken.transfer(stakingContract, trenchyAmount),
                "Token transfer failed"
            );
            
            // Call staking contract's stakeFor function
            (bool success, ) = stakingContract.call(
                abi.encodeWithSignature("stakeFor(address,uint256)", msg.sender, trenchyAmount)
            );
            require(success, "Staking failed");
            
            // Record the claim
            claimRecords[msg.sender].push(ClaimRecord({
                amount: trenchyAmount,
                claimTime: block.timestamp,
                unlockTime: 0, // No unlock needed
                autoStaked: true,
                withdrawn: true // Already "withdrawn" (staked)
            }));
            
        } else {
            // Standard claim: 15-day lock
            userClaim.lockedBalance += trenchyAmount;
            
            // Record the claim
            claimRecords[msg.sender].push(ClaimRecord({
                amount: trenchyAmount,
                claimTime: block.timestamp,
                unlockTime: block.timestamp + LOCK_PERIOD,
                autoStaked: false,
                withdrawn: false
            }));
        }
        
        emit PointsClaimed(msg.sender, pointsAmount, trenchyAmount, autoStake);
    }
    
    // ==================== WITHDRAW UNLOCKED TOKENS ====================
    
    /**
     * @notice Withdraw tokens that have passed the 15-day lock period
     */
    function withdrawUnlocked() external nonReentrant {
        ClaimRecord[] storage records = claimRecords[msg.sender];
        require(records.length > 0, "No claims found");
        
        uint256 withdrawableAmount = 0;
        
        // Check all claims for unlocked tokens
        for (uint256 i = 0; i < records.length; i++) {
            ClaimRecord storage record = records[i];
            
            // Skip if already withdrawn or auto-staked
            if (record.withdrawn || record.autoStaked) continue;
            
            // Check if unlock time has passed
            if (block.timestamp >= record.unlockTime) {
                withdrawableAmount += record.amount;
                record.withdrawn = true;
            }
        }
        
        require(withdrawableAmount > 0, "No unlocked tokens");
        
        // Update locked balance
        userClaims[msg.sender].lockedBalance -= withdrawableAmount;
        
        // Transfer tokens to user
        require(
            trenchyToken.transfer(msg.sender, withdrawableAmount),
            "Token transfer failed"
        );
        
        emit TokensUnlocked(msg.sender, withdrawableAmount);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @notice Get user's total claimable (unlocked) balance
     */
    function getUnlockedBalance(address user) external view returns (uint256) {
        ClaimRecord[] storage records = claimRecords[user];
        uint256 unlocked = 0;
        
        for (uint256 i = 0; i < records.length; i++) {
            ClaimRecord storage record = records[i];
            
            if (!record.withdrawn && !record.autoStaked && block.timestamp >= record.unlockTime) {
                unlocked += record.amount;
            }
        }
        
        return unlocked;
    }
    
    /**
     * @notice Get user's claim history
     */
    function getUserClaimHistory(address user) external view returns (ClaimRecord[] memory) {
        return claimRecords[user];
    }
    
    /**
     * @notice Get user's monthly claim status
     */
    function getMonthlyClaimStatus(address user) external view returns (
        uint256 claimedThisMonth,
        uint256 remainingCap,
        uint256 monthEndsAt
    ) {
        UserClaim storage userClaim = userClaims[user];
        
        claimedThisMonth = userClaim.monthlyClaimAmount;
        remainingCap = MONTHLY_CLAIM_CAP - claimedThisMonth;
        monthEndsAt = userClaim.monthStartTime + MONTH_DURATION;
        
        // Reset if month expired
        if (block.timestamp >= monthEndsAt) {
            claimedThisMonth = 0;
            remainingCap = MONTHLY_CLAIM_CAP;
            monthEndsAt = block.timestamp + MONTH_DURATION;
        }
    }
    
    /**
     * @notice Check if user can claim a specific amount
     */
    function canClaim(address user, uint256 trenchyAmount) external view returns (bool) {
        if (!claimingEnabled) return false;
        
        UserClaim storage userClaim = userClaims[user];
        
        // Check monthly cap
        if (block.timestamp < userClaim.monthStartTime + MONTH_DURATION) {
            if (userClaim.monthlyClaimAmount + trenchyAmount > MONTHLY_CLAIM_CAP) {
                return false;
            }
        }
        
        // Check contract has enough tokens
        if (trenchyToken.balanceOf(address(this)) < trenchyAmount) {
            return false;
        }
        
        return true;
    }
    
    // ==================== SIGNATURE VERIFICATION ====================
    
    /**
     * @notice Verify backend signature
     * @dev Backend signs: keccak256(user, pointsAmount, nonce)
     */
    function _verifySignature(
        address user,
        uint256 pointsAmount,
        bytes32 nonce,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(user, pointsAmount, nonce));
        bytes32 ethSignedMessageHash = _getEthSignedMessageHash(messageHash);
        
        return _recoverSigner(ethSignedMessageHash, signature) == backendSigner;
    }
    
    function _getEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }
    
    function _recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature) internal pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }
    
    function _splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    function setStakingContract(address _stakingContract) external onlyOwner {
        stakingContract = _stakingContract;
        emit StakingContractUpdated(_stakingContract);
    }
    
    function setBackendSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid signer");
        backendSigner = _newSigner;
        emit BackendSignerUpdated(_newSigner);
    }
    
    function toggleClaiming(bool _enabled) external onlyOwner {
        claimingEnabled = _enabled;
        emit ClaimingToggled(_enabled);
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit EmergencyWithdraw(token, amount);
    }
    
    // ==================== CONTRACT INFO ====================
    
    function getContractInfo() external view returns (
        uint256 totalDistributedAmount,
        uint256 contractBalance,
        bool isClaimingEnabled,
        address currentBackendSigner,
        address currentStakingContract
    ) {
        return (
            totalDistributed,
            trenchyToken.balanceOf(address(this)),
            claimingEnabled,
            backendSigner,
            stakingContract
        );
    }
}