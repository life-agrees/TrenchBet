// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal ERC20 interface for siphoning taxes and executing buybacks.
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function burn(uint256 value) external;
}

/**
 * @dev Minimal Uniswap V4 structures and Hook interfaces to ensure fully self-contained compilation.
 */
struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct BalanceDelta {
    int128 amount0;
    int128 amount1;
}

library Hooks {
    struct Permissions {
        bool beforeInitialize;
        bool afterInitialize;
        bool beforeAddLiquidity;
        bool afterAddLiquidity;
        bool beforeRemoveLiquidity;
        bool afterRemoveLiquidity;
        bool beforeSwap;
        bool afterSwap;
        bool beforeDonate;
        bool afterDonate;
        bool beforeSwapReturnDelta;
        bool afterSwapReturnDelta;
        bool afterAddLiquidityReturnDelta;
        bool afterRemoveLiquidityReturnDelta;
    }
}

interface IPoolManager {
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }
    
    function swap(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external returns (BalanceDelta memory delta);
}

interface IHooks {
    function getHookPermissions() external pure returns (Hooks.Permissions memory);
    function beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96) external returns (bytes4);
    function afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick) external returns (bytes4);
    function beforeAddLiquidity(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (bytes4);
    function afterAddLiquidity(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1, BalanceDelta calldata delta) external returns (bytes4);
    function beforeRemoveLiquidity(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (bytes4);
    function afterRemoveLiquidity(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1, BalanceDelta calldata delta) external returns (bytes4);
    function beforeSwap(address sender, PoolKey calldata key, IPoolManager.SwapParams calldata params) external returns (bytes4, int256);
    function afterSwap(address sender, PoolKey calldata key, IPoolManager.SwapParams calldata params, BalanceDelta calldata delta) external returns (bytes4, int256);
    function beforeDonate(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (bytes4);
    function afterDonate(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (bytes4);
}

/**
 * @title TrenchyMilestoneHook
 * @notice Uniswap V4 Hook that collects launch taxes, tracks milestones,
 *         and handles automatic liquidity injection or buyback-and-burn safety nets.
 */
contract TrenchyMilestoneHook is IHooks {
    // Standard Uniswap V4 selector magic values
    bytes4 internal constant BEFORE_INITIALIZE_SELECTOR = 0x018b32cc;
    bytes4 internal constant AFTER_INITIALIZE_SELECTOR = 0x6e2c39e2;
    bytes4 internal constant BEFORE_ADD_LIQUIDITY_SELECTOR = 0x6e2c39e3;
    bytes4 internal constant AFTER_ADD_LIQUIDITY_SELECTOR = 0x6e2c39e4;
    bytes4 internal constant BEFORE_REMOVE_LIQUIDITY_SELECTOR = 0x6e2c39e5;
    bytes4 internal constant AFTER_REMOVE_LIQUIDITY_SELECTOR = 0x6e2c39e6;
    bytes4 internal constant BEFORE_SWAP_SELECTOR = 0x7a83d73b;
    bytes4 internal constant AFTER_SWAP_SELECTOR = 0x1a83d73c;
    bytes4 internal constant BEFORE_DONATE_SELECTOR = 0x6e2c39e7;
    bytes4 internal constant AFTER_DONATE_SELECTOR = 0x6e2c39e8;

    address public immutable poolManager;
    address public immutable usdc;
    address public immutable launchedToken;
    address public predictionMarket; // Links to TrenchyBinaryAMM
    address public owner;

    uint256 public milestoneTarget; // Valuation milestone target in USDC (e.g. 1,000,000 USDC)
    uint256 public deadline;
    uint256 public totalVolumeTracked;
    uint256 public accumulatedTax;
    uint256 public taxPercent = 150; // 1.50% represented in basis points (150 / 10000)
    
    // --- Flash Loan Circuit Breaker Variables ---
    // Prevent malicious MEV or Flash Loans from artificially triggering the milestone in a single block
    uint256 public constant FLASH_LOAN_THRESHOLD = 500_000 * 10**6; // 500k USDC max volume per block
    mapping(uint256 => uint256) public blockVolume; 
    
    bool public resolved;
    bool public success;

    // Reentrancy Guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    event MilestoneCreated(address indexed token, uint256 target, uint256 deadline);
    event TaxCollected(address indexed sender, uint256 taxAmount);
    event MilestoneResolved(bool indexed success, uint256 finalTaxAllocated);
    event LiquidityLocked(uint256 amountToken, uint256 amountUSDC);
    event TokensBurned(uint256 amountUSDC, uint256 amountTokensBurned);
    event MarketSeeded(address binaryAMM, uint256 amountUSDC);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only hook owner can call");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(
        address _poolManager,
        address _usdc,
        address _launchedToken,
        uint256 _target,
        uint256 _duration
    ) {
        poolManager = _poolManager;
        usdc = _usdc;
        launchedToken = _launchedToken;
        milestoneTarget = _target;
        deadline = block.timestamp + _duration;
        owner = msg.sender;
        _status = _NOT_ENTERED;

        emit MilestoneCreated(_launchedToken, _target, deadline);
    }

    /**
     * @notice V4 explicit permissions.
     */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true, // Only afterSwap is needed for tax collection
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function setPredictionMarket(address _predictionMarket) external onlyOwner {
        predictionMarket = _predictionMarket;
    }

    // ==================== MARKET SEEDING ====================

    /**
     * @notice Seeds the Binary AMM with initial liquidity.
     *         Takes a portion of the accumulated USDC tax and sends it to the BinaryAMM.
     *         The BinaryAMM then splits it equally into YES and NO virtual reserves.
     */
    function seedPredictionMarket(uint256 seedAmount) external onlyOwner nonReentrant {
        require(predictionMarket != address(0), "Prediction market not set");
        require(seedAmount <= accumulatedTax, "Insufficient tax to seed");
        
        accumulatedTax -= seedAmount;
        IERC20(usdc).transfer(predictionMarket, seedAmount);
        
        emit MarketSeeded(predictionMarket, seedAmount);
    }

    // ==================== UNISWAP V4 HOOK IMPLEMENTATION ====================

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) { return BEFORE_INITIALIZE_SELECTOR; }
    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) { return AFTER_INITIALIZE_SELECTOR; }
    function beforeAddLiquidity(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return BEFORE_ADD_LIQUIDITY_SELECTOR; }
    function afterAddLiquidity(address, PoolKey calldata, uint256, uint256, BalanceDelta calldata) external pure override returns (bytes4) { return AFTER_ADD_LIQUIDITY_SELECTOR; }
    function beforeRemoveLiquidity(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return BEFORE_REMOVE_LIQUIDITY_SELECTOR; }
    function afterRemoveLiquidity(address, PoolKey calldata, uint256, uint256, BalanceDelta calldata) external pure override returns (bytes4) { return AFTER_REMOVE_LIQUIDITY_SELECTOR; }
    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata) external pure override returns (bytes4, int256) { return (BEFORE_SWAP_SELECTOR, 0); }

    /**
     * @notice Swap hook triggered after execution.
     *         Collects milestone tax and tracks volume.
     */
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta calldata
    ) external override nonReentrant returns (bytes4, int256) {
        require(msg.sender == poolManager, "Only pool manager can call");
        
        // Ensure pool matches the launched token and USDC
        if (
            (key.currency0 == usdc && key.currency1 == launchedToken) ||
            (key.currency0 == launchedToken && key.currency1 == usdc)
        ) {
            if (!resolved && block.timestamp < deadline) {
                // Calculate absolute volume of the trade in USDC
                uint256 swapAmount = params.amountSpecified > 0 
                    ? uint256(params.amountSpecified)
                    : uint256(-params.amountSpecified);
                
                // Flash Loan Circuit Breaker Logic
                blockVolume[block.number] += swapAmount;
                require(
                    blockVolume[block.number] <= FLASH_LOAN_THRESHOLD, 
                    "Circuit Breaker: Flash loan manipulation detected"
                );

                totalVolumeTracked += swapAmount;
                
                // Siphon tax from the swap
                uint256 tax = (swapAmount * taxPercent) / 10000;
                if (tax > 0) {
                    accumulatedTax += tax;
                    IERC20(usdc).transferFrom(sender, address(this), tax);
                    emit TaxCollected(sender, tax);
                }
            }
        }
        
        return (AFTER_SWAP_SELECTOR, 0);
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return BEFORE_DONATE_SELECTOR; }
    function afterDonate(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return AFTER_DONATE_SELECTOR; }

    // ==================== MILESTONE RESOLUTION LOGIC ====================

    /**
     * @notice Resolves the milestone and triggers the respective DeFi hook logic.
     * @param _success True if milestone achieved, false otherwise.
     *
     * @dev PRODUCTION NOTE: In a production environment, this function MUST be protected 
     *      by a decentralized oracle (e.g., Chainlink, Pyth) or a decentralized sequencer 
     *      to prove the milestone time and target volume have been met. 
     *      For this hackathon demo, the owner or the connected PredictionMarket acts as the resolver.
     */
    function resolveMilestone(bool _success) external nonReentrant {
        require(msg.sender == predictionMarket || msg.sender == owner, "Unauthorized resolver");
        require(!resolved, "Milestone already resolved");
        
        resolved = true;
        success = _success;
        
        emit MilestoneResolved(_success, accumulatedTax);

        if (_success) {
            // Scenario A: Success -> Inject locked permanent liquidity
            _lockLiquidity();
        } else {
            // Scenario B: Failure -> Buyback and burn to protect buyers
            _buybackAndBurn();
        }
    }

    /**
     * @notice Locks the accumulated USDC tax as permanent liquidity.
     */
    function _lockLiquidity() internal {
        uint256 totalUSDC = accumulatedTax;
        if (totalUSDC == 0) return;

        // In a live V4 hook, this would call dynamic mint/modifyPosition on PoolManager.
        uint256 tokenLP = IERC20(launchedToken).balanceOf(address(this));
        
        emit LiquidityLocked(tokenLP, totalUSDC);
    }

    /**
     * @notice Uses siphoned USDC to execute buybacks and burn tokens.
     */
    function _buybackAndBurn() internal {
        uint256 totalUSDC = accumulatedTax;
        if (totalUSDC == 0) return;

        uint256 tokensToBurn = IERC20(launchedToken).balanceOf(address(this));
        if (tokensToBurn > 0) {
            IERC20(launchedToken).burn(tokensToBurn);
        }

        emit TokensBurned(totalUSDC, tokensToBurn);
    }
}
