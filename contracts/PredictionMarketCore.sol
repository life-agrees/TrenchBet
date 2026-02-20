// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredictionMarketBase.sol";
import "./PredictionMarketPayoutLib.sol";

/**
 * @title PredictionMarketCore
 * @notice Core contract for binary markets, betting, and claiming
 * @dev Handles 80% of use cases - binary up/down markets
 */
contract PredictionMarketCore is PredictionMarketBase {
    
    using PredictionMarketPayoutLib for *;

    constructor(address _usdc, address _owner) PredictionMarketBase(_usdc, _owner) {}

    // ==================== BINARY MARKET CREATION ====================
    
    function createMarketWithOdds(
        string memory asset,
        uint256 duration,
        uint256 yesMultiplier,
        uint256 noMultiplier,
        bool useTimeDecay,
        uint256 decayStartPercent,
        uint256 minMultiplier
    ) public onlyOwner returns (uint256) {
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        require(decayStartPercent <= 100, "Invalid decay start percent");
        
        if (minMultiplier > 0) {
            require(minMultiplier >= MIN_MULTIPLIER && minMultiplier <= MAX_MULTIPLIER, "Min multiplier out of range");
        }
        
        int256 currentPrice = getCurrentPrice(asset);
        require(currentPrice > 0, "Invalid price");
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = (yesMultiplier > 0 && noMultiplier > 0);
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.BINARY,
            asset: asset,
            startTime: startTime,
            endTime: endTime,
            startPrice: currentPrice,
            endPrice: 0,
            yesPool: 0,
            noPool: 0,
            resolved: false,
            priceWentUp: false,
            totalBets: 0,
            useFixedOdds: useFixedOdds,
            yesMultiplier: yesMultiplier,
            noMultiplier: noMultiplier,
            protocolFee: 0,
            useTimeDecay: useTimeDecay,
            decayStartTime: decayStartTime,
            minMultiplier: finalMinMultiplier
        });
        
        emit MarketCreated(marketId, MarketType.BINARY, asset, useFixedOdds, useTimeDecay);
        return marketId;
    }

    // ==================== PLACE BETS ====================
    
    function placeBet(uint256 marketId, uint8 choice, uint256 amount) external nonReentrant whenNotPaused {
        Market storage market = markets[marketId];
        require(market.startTime > 0, "Market does not exist");
        require(block.timestamp < market.endTime, "Market has ended");
        require(!market.resolved, "Market already resolved");
        require(amount > 0 && amount <= MAX_BET_AMOUNT, "Invalid amount");
        require(market.marketType == MarketType.BINARY, "Not a binary market");
        require(choice <= 1, "Invalid binary choice");
        
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        if (choice == 1) {
            market.yesPool += amount;
        } else {
            market.noPool += amount;
        }
        
        market.totalBets++;
        
        uint256 effectiveMultiplier = 0;
        if (market.useFixedOdds) {
            uint256 baseMultiplier = choice == 1 ? market.yesMultiplier : market.noMultiplier;
            effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                baseMultiplier,
                market.decayStartTime,
                market.endTime,
                market.minMultiplier,
                market.useTimeDecay
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
            userPositions[msg.sender].push(marketId);
        }
        userMarketPositions[marketId][msg.sender].push(positionIndex);
        
        userStats[msg.sender].totalBets++;
        
        emit BetPlaced(marketId, msg.sender, choice, amount, effectiveMultiplier);
    }

    // ==================== RESOLVE MARKETS ====================
    
    function resolveMarket(uint256 marketId) external {
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.BINARY, "Not a binary market");
        require(market.startTime > 0, "Market does not exist");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        
        int256 endPrice = getCurrentPrice(market.asset);
        require(endPrice > 0, "Invalid end price");
        
        market.endPrice = endPrice;
        market.priceWentUp = endPrice > market.startPrice;
        
        uint256 losingPool = market.priceWentUp ? market.noPool : market.yesPool;
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        market.protocolFee = fee;
        accumulatedFees += fee;
        
        market.resolved = true;
        
        emit MarketResolved(marketId, market.priceWentUp ? 1 : 0, fee);
    }

    // ==================== CLAIM WINNINGS ====================
    
    function claimWinnings(uint256 marketId) external nonReentrant whenNotPaused {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved yet");
        
        uint256[] memory positionIndices = userMarketPositions[marketId][msg.sender];
        require(positionIndices.length > 0, "No positions in this market");
        
        uint256 totalWinnings = 0;
        bool hadWin = false;
        bool hadLoss = false;
        
        for (uint256 i = 0; i < positionIndices.length; i++) {
            Position storage position = marketPositions[marketId][positionIndices[i]];
            
            if (position.claimed) continue;
            
            bool userWon = position.predictedUp == market.priceWentUp;
            uint256 payout = 0;
            
            if (userWon) {
                if (market.useFixedOdds) {
                    uint256 multiplier = position.predictedUp ? market.yesMultiplier : market.noMultiplier;
                    uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        multiplier,
                        market.decayStartTime,
                        market.endTime,
                        market.minMultiplier,
                        market.useTimeDecay
                    );
                    payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                } else {
                    payout = PredictionMarketPayoutLib.calculateBinaryPoolPayout(
                        position.amount,
                        position.predictedUp,
                        market.yesPool,
                        market.noPool,
                        market.protocolFee,
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

    // ==================== BET CREDITS SYSTEM ====================
    
    function awardBetCredit(address user, uint256 amount) external onlyOwner {
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
        Market storage market = markets[marketId];
        require(market.startTime > 0, "Market does not exist");
        require(block.timestamp < market.endTime, "Market has ended");
        require(!market.resolved, "Market already resolved");
        require(amount > 0 && amount <= MAX_BET_AMOUNT, "Invalid amount");
        require(market.marketType == MarketType.BINARY, "Not a binary market");
        require(choice <= 1, "Invalid binary choice");
        
        if (choice == 1) {
            market.yesPool += amount;
        } else {
            market.noPool += amount;
        }
        
        market.totalBets++;
        
        uint256 effectiveMultiplier = 0;
        if (market.useFixedOdds) {
            uint256 baseMultiplier = choice == 1 ? market.yesMultiplier : market.noMultiplier;
            effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                baseMultiplier,
                market.decayStartTime,
                market.endTime,
                market.minMultiplier,
                market.useTimeDecay
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
            userPositions[msg.sender].push(marketId);
        }
        userMarketPositions[marketId][msg.sender].push(positionIndex);
        
        userStats[msg.sender].totalBets++;
        
        emit BetPlaced(marketId, msg.sender, choice, amount, effectiveMultiplier);
    }

    // ==================== VIEW FUNCTIONS ====================
    
    function calculatePotentialPayout(uint256 marketId, uint8 choice, uint256 amount) external view returns (uint256) {
        Market memory market = markets[marketId];
        require(market.marketType == MarketType.BINARY, "Not a binary market");
        
        if (market.useFixedOdds) {
            uint256 baseMultiplier = choice == 1 ? market.yesMultiplier : market.noMultiplier;
            uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                baseMultiplier,
                market.decayStartTime,
                market.endTime,
                market.minMultiplier,
                market.useTimeDecay
            );
            return PredictionMarketPayoutLib.calculateFixedOddsPayout(amount, effectiveMultiplier);
        } else {
            uint256 winningPool = choice == 1 ? market.yesPool + amount : market.noPool + amount;
            uint256 losingPool = choice == 1 ? market.noPool : market.yesPool;
            
            if (winningPool == 0) return amount;
            
            uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
            uint256 losingPoolAfterFee = losingPool - fee;
            uint256 share = (amount * losingPoolAfterFee) / winningPool;
            return amount + share;
        }
    }
    
    function getCurrentOdds(uint256 marketId) external view returns (uint256[] memory multipliers) {
        Market memory market = markets[marketId];
        require(market.marketType == MarketType.BINARY, "Not a binary market");
        
        multipliers = new uint256[](2);
        
        if (market.useFixedOdds) {
            multipliers[0] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                market.noMultiplier,
                market.decayStartTime,
                market.endTime,
                market.minMultiplier,
                market.useTimeDecay
            );
            multipliers[1] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                market.yesMultiplier,
                market.decayStartTime,
                market.endTime,
                market.minMultiplier,
                market.useTimeDecay
            );
        } else {
            uint256 total = market.yesPool + market.noPool;
            if (total == 0) {
                multipliers[0] = 200;
                multipliers[1] = 200;
            } else {
                multipliers[0] = total > 0 ? (total * 200) / (market.noPool + 1) : 200;
                multipliers[1] = total > 0 ? (total * 200) / (market.yesPool + 1) : 200;
            }
        }
        
        return multipliers;
    }
    
    function getDecayStatus(uint256 marketId) external view returns (bool isDecaying, uint256 decayProgress, uint256 currentMultiplier) {
        Market memory market = markets[marketId];
        return PredictionMarketPayoutLib.getDecayStatus(
            market.decayStartTime,
            market.endTime,
            market.minMultiplier,
            market.useTimeDecay
        );
    }

    // ==================== ADMIN FUNCTIONS ====================
    
    function withdrawFees() external onlyOwner whenNotPaused {
        require(block.timestamp >= lastFeeWithdrawal + WITHDRAWAL_DELAY, "Withdrawal delay not met");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        lastFeeWithdrawal = block.timestamp;
        
        require(usdc.transfer(msg.sender, amount), "USDC transfer failed");
        emit FeesWithdrawn(msg.sender, amount);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
}
