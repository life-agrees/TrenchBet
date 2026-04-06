// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredictionMarketBase.sol";
import "./PredictionMarketPayoutLib.sol";

/**
 * @title PredictionMarketCore
 * @notice Core contract for binary markets - UPDATED for split storage
 */
contract PredictionMarketCore is PredictionMarketStorage, PredictionMarketBase {
    
    using PredictionMarketPayoutLib for *;

    constructor(address _usdc, address _proxy) PredictionMarketBase(_usdc, _proxy) {}

    // ==================== BINARY MARKET CREATION ====================
    
    function createMarketWithOdds(
        string memory asset,
        uint256 duration,
        uint256 yesMultiplier,
        uint256 noMultiplier,
        bool useTimeDecay,
        uint256 decayStartPercent,
        uint256 minMultiplier
    ) public onlyProxyOwner returns (uint256) {
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        require(decayStartPercent <= 100, "Invalid decay start percent");
        
        if (minMultiplier > 0) {
            require(minMultiplier >= MIN_MULTIPLIER && minMultiplier <= MAX_MULTIPLIER, "Min multiplier out of range");
        }
        
        int256 currentPrice = getCurrentPrice(asset);
        require(currentPrice > 0, "Invalid price");
        
        uint256 marketId = marketCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = (yesMultiplier > 0 && noMultiplier > 0);
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        // Use helper to set split storage
        _setMarket(
            marketId,
            asset,
            MarketType.BINARY,
            startTime,
            endTime,
            currentPrice,
            yesMultiplier,
            noMultiplier,
            useFixedOdds,
            useTimeDecay,
            decayStartTime,
            finalMinMultiplier
        );
        
        marketCounter++;
        
        emit MarketCreated(marketId, MarketType.BINARY, asset, useFixedOdds, useTimeDecay);
        return marketId;
    }

    // ==================== PLACE BETS ====================
    
    function placeBet(uint256 marketId, uint8 choice, uint256 amount) external nonReentrant whenNotPaused {
        MarketCore memory core = marketCore[marketId];
        require(core.startTime > 0, "Market does not exist");
        require(block.timestamp < core.endTime, "Market has ended");
        require(!core.resolved, "Market already resolved");
        require(amount > 0 && amount <= MAX_BET_AMOUNT, "Invalid amount");
        require(core.marketType == MarketType.BINARY, "Not a binary market");
        require(choice <= 1, "Invalid binary choice");
        
        // UPDATED: Use helper to deduct from vouchers → betCredits → USDC
        _deductBetAmount(msg.sender, amount, marketId);
        
        MarketPools storage pools = marketPools[marketId];
        if (choice == 1) {
            pools.yesPool += amount;
        } else {
            pools.noPool += amount;
        }
        pools.totalBets++;
        
        uint256 effectiveMultiplier = 0;
        MarketOdds memory odds = marketOdds[marketId];
        if (odds.useFixedOdds) {
            MarketDecay memory decay = marketDecay[marketId];
            uint256 baseMultiplier = choice == 1 ? odds.yesMultiplier : odds.noMultiplier;
            effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                baseMultiplier,
                decay.decayStartTime,
                core.endTime,
                decay.minMultiplier,
                decay.useTimeDecay
            );
        }
        
        Position memory position = Position({
            marketId: marketId,
            user: msg.sender,
            predictedUp: choice == 1,
            choice: choice,
            amount: amount,
            claimed: false,
            effectiveMultiplier: effectiveMultiplier
        });
        
        uint256 positionIndex = marketPositions[marketId].length;
        marketPositions[marketId].push(position);
        
        if (userMarketPositions[marketId][msg.sender].length == 0) {
            userPositionsList[msg.sender].push(marketId);
        }
        userMarketPositions[marketId][msg.sender].push(positionIndex);
        
        userStats[msg.sender].totalBets++;
        
        emit BetPlaced(marketId, msg.sender, choice, amount, effectiveMultiplier);
    }

    // ==================== RESOLVE MARKETS ====================
    
    function resolveMarket(uint256 marketId) external {
        MarketCore storage core = marketCore[marketId];
        require(core.marketType == MarketType.BINARY, "Not a binary market");
        require(core.startTime > 0, "Market does not exist");
        require(block.timestamp >= core.endTime, "Market has not ended yet");
        require(!core.resolved, "Market already resolved");
        
        int256 endPrice = getCurrentPrice(core.asset);
        require(endPrice > 0, "Invalid end price");
        
        core.endPrice = endPrice;
        bool priceWentUp = endPrice > core.startPrice;
        
        MarketOdds storage odds = marketOdds[marketId];
        odds.priceWentUp = priceWentUp;
        
        MarketPools storage pools = marketPools[marketId];
        uint256 losingPool = priceWentUp ? pools.noPool : pools.yesPool;
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        pools.protocolFee = fee;
        accumulatedFees += fee;
        
        core.resolved = true;
        
        emit MarketResolved(marketId, priceWentUp ? 1 : 0, fee);
    }

    // ==================== CLAIM WINNINGS ====================
    
    function claimWinnings(uint256 marketId) external nonReentrant whenNotPaused {
        MarketCore memory core = marketCore[marketId];
        require(core.resolved, "Market not resolved yet");
        
        uint256[] memory positionIndices = userMarketPositions[marketId][msg.sender];
        require(positionIndices.length > 0, "No positions in this market");
        
        MarketPools memory pools = marketPools[marketId];
        MarketOdds memory odds = marketOdds[marketId];
        MarketDecay memory decay = marketDecay[marketId];
        
        uint256 totalWinnings = 0;
        bool hadWin = false;
        bool hadLoss = false;
        
        for (uint256 i = 0; i < positionIndices.length; i++) {
            Position storage position = marketPositions[marketId][positionIndices[i]];
            
            if (position.claimed) continue;
            
            bool userWon = position.predictedUp == odds.priceWentUp;
            uint256 payout = 0;
            
            if (userWon) {
                if (odds.useFixedOdds) {
                    uint256 multiplier = position.predictedUp ? odds.yesMultiplier : odds.noMultiplier;
                    uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        multiplier,
                        decay.decayStartTime,
                        core.endTime,
                        decay.minMultiplier,
                        decay.useTimeDecay
                    );
                    payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                } else {
                    payout = PredictionMarketPayoutLib.calculateBinaryPoolPayout(
                        position.amount,
                        position.predictedUp,
                        pools.yesPool,
                        pools.noPool,
                        pools.protocolFee,
                        FEE_PERCENTAGE
                    );
                }
            }
            
            if (userWon) {
                hadWin = true;
                totalWinnings += payout;
            } else {
                hadLoss = true;
            }
            
            position.claimed = true;
        }
        
        UserStats storage stats = userStats[msg.sender];
        if (hadWin) {
            stats.totalWins++;
            stats.currentStreak++;
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
            stats.totalEarnings += totalWinnings;
            _updateLeaderboard(msg.sender);
        }
        if (hadLoss) {
            stats.totalLosses++;
            stats.currentStreak = 0;
        }
        
        require(totalWinnings > 0, "No winnings to claim");
        require(usdc.transfer(msg.sender, totalWinnings), "USDC transfer failed");
        
        emit WinningsClaimed(marketId, msg.sender, totalWinnings);
    }

    // ==================== BET CREDITS ====================
    
    function awardBetCredit(address user, uint256 amount) external onlyProxyOwner {
        require(amount > 0, "Amount must be > 0");
        require(user != address(0), "Invalid user address");
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        betCredits[user] += amount;
        emit BetCreditAwarded(user, amount);
    }
    
    function placeBetWithCredits(uint256 marketId, uint8 choice, uint256 creditAmount) external nonReentrant whenNotPaused {
        require(creditAmount > 0, "Credit amount must be > 0");
        require(betCredits[msg.sender] >= creditAmount, "Insufficient bet credits");
        
        betCredits[msg.sender] -= creditAmount;
        emit BetCreditUsed(msg.sender, creditAmount);
        
        _placeBetInternal(marketId, choice, creditAmount);
    }
    
    function placeBetWithMixed(uint256 marketId, uint8 choice, uint256 usdcAmount, uint256 creditAmount) external nonReentrant whenNotPaused {
        require(usdcAmount > 0 || creditAmount > 0, "Must bet something");
        
        if (creditAmount > 0) {
            require(betCredits[msg.sender] >= creditAmount, "Insufficient bet credits");
            betCredits[msg.sender] -= creditAmount;
            emit BetCreditUsed(msg.sender, creditAmount);
        }
        
        if (usdcAmount > 0) {
            require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        }
        
        _placeBetInternal(marketId, choice, usdcAmount + creditAmount);
    }
    
    function _placeBetInternal(uint256 marketId, uint8 choice, uint256 amount) internal {
        MarketCore memory core = marketCore[marketId];
        require(core.startTime > 0, "Market does not exist");
        require(block.timestamp < core.endTime, "Market has ended");
        require(!core.resolved, "Market already resolved");
        require(amount > 0 && amount <= MAX_BET_AMOUNT, "Invalid amount");
        require(core.marketType == MarketType.BINARY, "Not a binary market");
        require(choice <= 1, "Invalid binary choice");
        
        MarketPools storage pools = marketPools[marketId];
        if (choice == 1) {
            pools.yesPool += amount;
        } else {
            pools.noPool += amount;
        }
        pools.totalBets++;
        
        uint256 effectiveMultiplier = 0;
        MarketOdds memory odds = marketOdds[marketId];
        if (odds.useFixedOdds) {
            MarketDecay memory decay = marketDecay[marketId];
            uint256 baseMultiplier = choice == 1 ? odds.yesMultiplier : odds.noMultiplier;
            effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                baseMultiplier,
                decay.decayStartTime,
                core.endTime,
                decay.minMultiplier,
                decay.useTimeDecay
            );
        }
        
        Position memory position = Position({
            marketId: marketId,
            user: msg.sender,
            predictedUp: choice == 1,
            choice: choice,
            amount: amount,
            claimed: false,
            effectiveMultiplier: effectiveMultiplier
        });
        
        uint256 positionIndex = marketPositions[marketId].length;
        marketPositions[marketId].push(position);
        
        if (userMarketPositions[marketId][msg.sender].length == 0) {
            userPositionsList[msg.sender].push(marketId);
        }
        userMarketPositions[marketId][msg.sender].push(positionIndex);
        
        userStats[msg.sender].totalBets++;
        
        emit BetPlaced(marketId, msg.sender, choice, amount, effectiveMultiplier);
    }

    // ==================== VIEW FUNCTIONS ====================
    
    function calculatePotentialPayout(uint256 marketId, uint8 choice, uint256 amount) external view returns (uint256) {
        MarketCore memory core = marketCore[marketId];
        require(core.marketType == MarketType.BINARY, "Not a binary market");
        
        MarketOdds memory odds = marketOdds[marketId];
        if (odds.useFixedOdds) {
            MarketDecay memory decay = marketDecay[marketId];
            uint256 baseMultiplier = choice == 1 ? odds.yesMultiplier : odds.noMultiplier;
            uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                baseMultiplier,
                decay.decayStartTime,
                core.endTime,
                decay.minMultiplier,
                decay.useTimeDecay
            );
            return PredictionMarketPayoutLib.calculateFixedOddsPayout(amount, effectiveMultiplier);
        } else {
            MarketPools memory pools = marketPools[marketId];
            uint256 winningPool = choice == 1 ? pools.yesPool + amount : pools.noPool + amount;
            uint256 losingPool = choice == 1 ? pools.noPool : pools.yesPool;
            
            if (winningPool == 0) return amount;
            
            uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
            uint256 losingPoolAfterFee = losingPool - fee;
            uint256 share = (amount * losingPoolAfterFee) / winningPool;
            return amount + share;
        }
    }
    
    function getCurrentOdds(uint256 marketId) external view returns (uint256[] memory multipliers) {
        MarketCore memory core = marketCore[marketId];
        require(core.marketType == MarketType.BINARY, "Not a binary market");
        
        multipliers = new uint256[](2);
        
        MarketOdds memory odds = marketOdds[marketId];
        if (odds.useFixedOdds) {
            MarketDecay memory decay = marketDecay[marketId];
            multipliers[0] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                odds.noMultiplier,
                decay.decayStartTime,
                core.endTime,
                decay.minMultiplier,
                decay.useTimeDecay
            );
            multipliers[1] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                odds.yesMultiplier,
                decay.decayStartTime,
                core.endTime,
                decay.minMultiplier,
                decay.useTimeDecay
            );
        } else {
            MarketPools memory pools = marketPools[marketId];
            uint256 total = pools.yesPool + pools.noPool;
            if (total == 0) {
                multipliers[0] = 200;
                multipliers[1] = 200;
            } else {
                multipliers[0] = total > 0 ? (total * 200) / (pools.noPool + 1) : 200;
                multipliers[1] = total > 0 ? (total * 200) / (pools.yesPool + 1) : 200;
            }
        }
        
        return multipliers;
    }
    
    function getDecayStatus(uint256 marketId) external view returns (bool isDecaying, uint256 decayProgress, uint256 currentMultiplier) {
        MarketCore memory core = marketCore[marketId];
        MarketDecay memory decay = marketDecay[marketId];
        return PredictionMarketPayoutLib.getDecayStatus(
            decay.decayStartTime,
            core.endTime,
            decay.minMultiplier,
            decay.useTimeDecay
        );
    }

    // ==================== ADMIN FUNCTIONS ====================
    
    function withdrawFees() external onlyProxyOwner whenNotPaused {
        require(block.timestamp >= lastFeeWithdrawal + WITHDRAWAL_DELAY, "Withdrawal delay not met");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        lastFeeWithdrawal = block.timestamp;
        
        require(usdc.transfer(msg.sender, amount), "USDC transfer failed");
        emit FeesWithdrawn(msg.sender, amount);
    }
    
    function pause() external onlyProxyOwner {
        _pause();
    }
    
    function unpause() external onlyProxyOwner {
        _unpause();
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyProxyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
}