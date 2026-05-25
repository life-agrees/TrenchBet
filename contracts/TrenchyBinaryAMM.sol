// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal interfaces to keep this contract fully self-contained and compilation-friendly.
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

struct PoolKey {
    address currency0; // YES outcome token
    address currency1; // NO outcome token
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
        bool zeroForOne; // true if YES -> NO, false if NO -> YES
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }
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
 * @title TrenchyBinaryAMM
 * @notice A specialized Uniswap V4 Hook for trading YES and NO prediction outcome tokens.
 *         Implements custom AMM invariant and BeforeSwapDelta flash accounting overrides.
 */
contract TrenchyBinaryAMM is IHooks {
    // Magic selector codes for Uniswap V4 Hooks
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
    address public owner;
    
    // Virtual reserves to enforce P_yes + P_no = 1 USDC
    uint256 public virtualReserveYES = 500000 * 10**6; // 6 decimals for USDC scale
    uint256 public virtualReserveNO = 500000 * 10**6;
    uint256 public totalCollateral = 1000000 * 10**6; // Virtual pool size
    
    uint256 public constant SCALE = 10**6; // USDC decimal factor

    // Reentrancy Guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    event CustomSwap(address indexed swapper, bool zeroForOne, int256 amountSpecified, uint256 amountOut);
    event VirtualReservesUpdated(uint256 reserveYES, uint256 reserveNO);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(address _poolManager) {
        poolManager = _poolManager;
        owner = msg.sender;
        _status = _NOT_ENTERED;
    }

    /**
     * @notice V4 explicit permissions. Only beforeSwap is enabled.
     *         We specify beforeSwapReturnDelta to override flash accounting.
     */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true, // Custom pricing curve
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true, // Important for BeforeSwapDelta
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function getPrices() public view returns (uint256 priceYES, uint256 priceNO) {
        priceYES = (virtualReserveYES * SCALE) / totalCollateral;
        priceNO = SCALE - priceYES; // Ensures P_yes + P_no = SCALE (1.00 USDC)
    }

    // ==================== UNISWAP V4 HOOK OVERRIDES ====================

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) { return BEFORE_INITIALIZE_SELECTOR; }
    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) { return AFTER_INITIALIZE_SELECTOR; }
    function beforeAddLiquidity(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return BEFORE_ADD_LIQUIDITY_SELECTOR; }
    function afterAddLiquidity(address, PoolKey calldata, uint256, uint256, BalanceDelta calldata) external pure override returns (bytes4) { return AFTER_ADD_LIQUIDITY_SELECTOR; }
    function beforeRemoveLiquidity(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return BEFORE_REMOVE_LIQUIDITY_SELECTOR; }
    function afterRemoveLiquidity(address, PoolKey calldata, uint256, uint256, BalanceDelta calldata) external pure override returns (bytes4) { return AFTER_REMOVE_LIQUIDITY_SELECTOR; }

    /**
     * @notice Hook executed BEFORE a swap occurs.
     *         Overrides exact input and exact output swaps via BeforeSwapDelta.
     */
    function beforeSwap(
        address sender,
        PoolKey calldata,
        IPoolManager.SwapParams calldata params
    ) external override nonReentrant returns (bytes4, int256) {
        require(msg.sender == poolManager, "Only pool manager can call");
        
        bool zeroForOne = params.zeroForOne; // true if YES -> NO, false if NO -> YES
        bool exactInput = params.amountSpecified > 0;
        
        uint256 amountIn;
        uint256 amountOut;

        if (exactInput) {
            amountIn = uint256(params.amountSpecified);
            // Dynamic curve formula: amountOut = reserve_out * amountIn / (reserve_in + amountIn)
            if (zeroForOne) {
                amountOut = (virtualReserveNO * amountIn) / (virtualReserveYES + amountIn);
                _enforceSlippage(virtualReserveYES + amountIn, virtualReserveNO > amountOut ? virtualReserveNO - amountOut : 1);
                virtualReserveYES += amountIn;
                virtualReserveNO -= amountOut;
            } else {
                amountOut = (virtualReserveYES * amountIn) / (virtualReserveNO + amountIn);
                _enforceSlippage(virtualReserveYES > amountOut ? virtualReserveYES - amountOut : 1, virtualReserveNO + amountIn);
                virtualReserveNO += amountIn;
                virtualReserveYES -= amountOut;
            }
        } else {
            // EXACT OUTPUT swap (params.amountSpecified < 0)
            amountOut = uint256(-params.amountSpecified);
            // Formula: amountIn = reserve_in * amountOut / (reserve_out - amountOut)
            if (zeroForOne) {
                require(virtualReserveNO > amountOut, "Insufficient NO liquidity");
                amountIn = (virtualReserveYES * amountOut) / (virtualReserveNO - amountOut);
                _enforceSlippage(virtualReserveYES + amountIn, virtualReserveNO - amountOut);
                virtualReserveYES += amountIn;
                virtualReserveNO -= amountOut;
            } else {
                require(virtualReserveYES > amountOut, "Insufficient YES liquidity");
                amountIn = (virtualReserveNO * amountOut) / (virtualReserveYES - amountOut);
                _enforceSlippage(virtualReserveYES - amountOut, virtualReserveNO + amountIn);
                virtualReserveNO += amountIn;
                virtualReserveYES -= amountOut;
            }
        }

        // Emit specialized swap event
        emit CustomSwap(sender, zeroForOne, params.amountSpecified, amountOut);
        emit VirtualReservesUpdated(virtualReserveYES, virtualReserveNO);

        // V4 Alpha Flash Accounting Override.
        // Returning a non-zero BeforeSwapDelta int256 instructs the PoolManager
        // to bypass the core AMM logic and settle directly based on our amounts.
        int128 delta0;
        int128 delta1;

        // amountIn is positive to the user, amountOut is negative to the user
        if (zeroForOne) {
            delta0 = exactInput ? int128(uint128(amountIn)) : int128(uint128(amountIn));
            delta1 = exactInput ? -int128(uint128(amountOut)) : -int128(uint128(amountOut));
        } else {
            delta0 = exactInput ? -int128(uint128(amountOut)) : -int128(uint128(amountOut));
            delta1 = exactInput ? int128(uint128(amountIn)) : int128(uint128(amountIn));
        }
        
        // Pack into BeforeSwapDelta (int256)
        int256 beforeSwapDelta = (int256(delta0) << 128) | (int256(delta1) & 0x000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
        
        return (BEFORE_SWAP_SELECTOR, beforeSwapDelta);
    }

    /**
     * @dev Prevent extreme pool drainage where one asset goes < 1% of total.
     */
    function _enforceSlippage(uint256 newReserveYES, uint256 newReserveNO) internal view {
        uint256 total = newReserveYES + newReserveNO;
        require(total > 0, "Invalid reserves");
        
        uint256 minReserve = total / 100; // 1%
        require(newReserveYES >= minReserve && newReserveNO >= minReserve, "Extreme imbalance protection");
    }

    function afterSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, BalanceDelta calldata) external pure override returns (bytes4, int256) { return (AFTER_SWAP_SELECTOR, 0); }
    function beforeDonate(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return BEFORE_DONATE_SELECTOR; }
    function afterDonate(address, PoolKey calldata, uint256, uint256) external pure override returns (bytes4) { return AFTER_DONATE_SELECTOR; }
    
    // ==================== MANUAL RESERVE ADJUSTMENT (ORACLE) ====================
    
    function adjustVirtualReserves(uint256 newReserveYES, uint256 newReserveNO) external onlyOwner {
        require(newReserveYES > 0 && newReserveNO > 0, "Reserves must be > 0");
        virtualReserveYES = newReserveYES;
        virtualReserveNO = newReserveNO;
        totalCollateral = newReserveYES + newReserveNO;
        
        emit VirtualReservesUpdated(newReserveYES, newReserveNO);
    }
}
