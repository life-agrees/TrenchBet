// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredictionMarketBase.sol";
import "./PredictionMarketPayoutLib.sol";

/**
 * @title PredictionMarketTypes
 * @notice Extension contract for advanced market types - UPDATED for split storage
 */
contract PredictionMarketTypes is PredictionMarketStorage, PredictionMarketBase {
    
    using PredictionMarketPayoutLib for *;

    constructor(address _usdc, address _proxy) PredictionMarketBase(_usdc, _proxy) {}

    // ==================== MULTI-CHOICE MARKETS ====================
    
    function createMultiChoiceMarketWithOdds(
        string memory asset,
        string[] memory options,
        string memory question,
        uint256 duration,
        uint256[] memory multipliers,
        bool useTimeDecay,
        uint256 decayStartPercent,
        uint256 minMultiplier
    ) external onlyProxyOwner whenNotPaused returns (uint256) {
        require(options.length >= 2 && options.length <= 10, "2-10 options required");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        require(decayStartPercent <= 100, "Invalid decay start percent");
        
        for (uint8 i = 0; i < multipliers.length; i++) {
            require(multipliers[i] >= MIN_MULTIPLIER && multipliers[i] <= MAX_MULTIPLIER, "Multiplier out of range");
        }
        
        if (minMultiplier > 0) {
            require(minMultiplier >= MIN_MULTIPLIER && minMultiplier <= MAX_MULTIPLIER, "Min multiplier out of range");
        }
        
        uint256 marketId = marketCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = multipliers.length == options.length;
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        // Set market using helper (question as asset for multi-choice)
        _setMarket(
            marketId,
            question,
            MarketType.MULTI_CHOICE,
            startTime,
            endTime,
            0, // no start price for multi-choice
            0, // no yes multiplier
            0, // no no multiplier
            useFixedOdds,
            useTimeDecay,
            decayStartTime,
            finalMinMultiplier
        );
        
        marketCounter++;
        
        MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
        mcMarket.options = options;
        
        if (useFixedOdds) {
            for (uint8 i = 0; i < options.length; i++) {
                mcMarket.optionMultipliers[i] = multipliers[i];
            }
        }
        
        emit MarketCreated(marketId, MarketType.MULTI_CHOICE, question, useFixedOdds, useTimeDecay);
        return marketId;
    }
    
    function resolveMultiChoiceMarket(uint256 marketId, uint8 winningOption) external onlyProxyOwner {
        MarketCore storage core = marketCore[marketId];
        require(core.marketType == MarketType.MULTI_CHOICE, "Not a multi-choice market");
        require(block.timestamp >= core.endTime, "Market has not ended yet");
        require(!core.resolved, "Market already resolved");
        require(winningOption < multiChoiceMarkets[marketId].options.length, "Invalid option");
        
        multiChoiceMarkets[marketId].winningOption = winningOption;
        
        MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
        uint256 losingPool = 0;
        for (uint8 i = 0; i < mcMarket.options.length; i++) {
            if (i != winningOption) {
                losingPool += mcMarket.optionPools[i];
            }
        }
        
        MarketPools storage pools = marketPools[marketId];
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        pools.protocolFee = fee;
        accumulatedFees += fee;
        
        core.resolved = true;
        
        emit MarketResolved(marketId, winningOption, fee);
    }

    // ==================== RANGE MARKETS ====================
    
    function createRangeMarketWithOdds(
        string memory asset,
        uint256[] memory rangeMins,
        uint256[] memory rangeMaxs,
        uint256 duration,
        uint256[] memory multipliers,
        bool useTimeDecay,
        uint256 decayStartPercent,
        uint256 minMultiplier
    ) external onlyProxyOwner whenNotPaused returns (uint256) {
        require(rangeMins.length == rangeMaxs.length, "Mismatched ranges");
        require(rangeMins.length >= 2 && rangeMins.length <= 10, "2-10 ranges required");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        require(decayStartPercent <= 100, "Invalid decay start percent");
        
        for (uint8 i = 0; i < multipliers.length; i++) {
            require(multipliers[i] >= MIN_MULTIPLIER && multipliers[i] <= MAX_MULTIPLIER, "Multiplier out of range");
        }
        
        if (minMultiplier > 0) {
            require(minMultiplier >= MIN_MULTIPLIER && minMultiplier <= MAX_MULTIPLIER, "Min multiplier out of range");
        }
        
        int256 currentPrice = getCurrentPrice(asset);
        require(currentPrice > 0, "Invalid price");
        
        uint256 marketId = marketCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = multipliers.length == rangeMins.length;
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        _setMarket(
            marketId,
            asset,
            MarketType.RANGE,
            startTime,
            endTime,
            currentPrice,
            0,
            0,
            useFixedOdds,
            useTimeDecay,
            decayStartTime,
            finalMinMultiplier
        );
        
        marketCounter++;
        
        RangeMarket storage rMarket = rangeMarkets[marketId];
        rMarket.rangeMins = rangeMins;
        rMarket.rangeMaxs = rangeMaxs;
        
        if (useFixedOdds) {
            for (uint8 i = 0; i < rangeMins.length; i++) {
                rMarket.rangeMultipliers[i] = multipliers[i];
            }
        }
        
        emit MarketCreated(marketId, MarketType.RANGE, asset, useFixedOdds, useTimeDecay);
        return marketId;
    }
    
    function resolveRangeMarket(uint256 marketId) external {
        MarketCore storage core = marketCore[marketId];
        require(core.marketType == MarketType.RANGE, "Not a range market");
        require(block.timestamp >= core.endTime, "Market has not ended yet");
        require(!core.resolved, "Market already resolved");
        
        int256 endPrice = getCurrentPrice(core.asset);
        require(endPrice > 0, "Invalid end price");
        
        core.endPrice = endPrice;
        uint256 finalPrice = uint256(endPrice);
        
        RangeMarket storage rMarket = rangeMarkets[marketId];
        bool foundWinner = false;
        
        for (uint8 i = 0; i < rMarket.rangeMins.length; i++) {
            if (finalPrice >= rMarket.rangeMins[i] && finalPrice <= rMarket.rangeMaxs[i]) {
                rMarket.winningRange = i;
                foundWinner = true;
                break;
            }
        }
        
        require(foundWinner, "Price not in any range");
        
        uint256 losingPool = 0;
        for (uint8 i = 0; i < rMarket.rangeMins.length; i++) {
            if (i != rMarket.winningRange) {
                losingPool += rMarket.rangePools[i];
            }
        }
        
        MarketPools storage pools = marketPools[marketId];
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        pools.protocolFee = fee;
        accumulatedFees += fee;
        
        core.resolved = true;
        
        emit MarketResolved(marketId, rMarket.winningRange, fee);
    }

    // ==================== TIME-BASED MARKETS ====================
    
    function createTimeMarketWithOdds(
        string memory asset,
        uint256 targetPrice,
        uint256[] memory timeframes,
        uint256[] memory multipliers,
        bool useTimeDecay,
        uint256 decayStartPercent,
        uint256 minMultiplier
    ) external onlyProxyOwner whenNotPaused returns (uint256) {
        require(timeframes.length >= 2 && timeframes.length <= 5, "2-5 timeframes required");
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        require(decayStartPercent <= 100, "Invalid decay start percent");
        
        for (uint8 i = 0; i < multipliers.length; i++) {
            require(multipliers[i] >= MIN_MULTIPLIER && multipliers[i] <= MAX_MULTIPLIER, "Multiplier out of range");
        }
        
        if (minMultiplier > 0) {
            require(minMultiplier >= MIN_MULTIPLIER && minMultiplier <= MAX_MULTIPLIER, "Min multiplier out of range");
        }
        
        int256 currentPrice = getCurrentPrice(asset);
        require(currentPrice > 0, "Invalid price");
        
        uint256 marketId = marketCounter;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + timeframes[timeframes.length - 1];
        
        bool useFixedOdds = multipliers.length == timeframes.length;
        uint256 duration = endTime - startTime;
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        _setMarket(
            marketId,
            asset,
            MarketType.TIME_BASED,
            startTime,
            endTime,
            currentPrice,
            0,
            0,
            useFixedOdds,
            useTimeDecay,
            decayStartTime,
            finalMinMultiplier
        );
        
        marketCounter++;
        
        TimeMarket storage tMarket = timeMarkets[marketId];
        tMarket.targetPrice = targetPrice;
        tMarket.timeframes = timeframes;
        
        if (useFixedOdds) {
            for (uint8 i = 0; i < timeframes.length; i++) {
                tMarket.timeframeMultipliers[i] = multipliers[i];
            }
        }
        
        emit MarketCreated(marketId, MarketType.TIME_BASED, asset, useFixedOdds, useTimeDecay);
        return marketId;
    }
    
    function resolveTimeMarket(uint256 marketId) external {
        MarketCore storage core = marketCore[marketId];
        require(core.marketType == MarketType.TIME_BASED, "Not a time-based market");
        require(block.timestamp >= core.endTime, "Market has not ended yet");
        require(!core.resolved, "Market already resolved");
        
        TimeMarket storage tMarket = timeMarkets[marketId];
        int256 currentPrice = getCurrentPrice(core.asset);
        require(currentPrice > 0, "Invalid price");
        
        if (uint256(currentPrice) >= tMarket.targetPrice) {
            tMarket.eventTimestamp = block.timestamp;
            
            for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
                if (block.timestamp <= core.startTime + tMarket.timeframes[i]) {
                    tMarket.winningTimeframe = i;
                    break;
                }
            }
        } else {
            tMarket.winningTimeframe = type(uint8).max;
        }
        
        uint256 losingPool = 0;
        for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
            if (i != tMarket.winningTimeframe) {
                losingPool += tMarket.timeframePools[i];
            }
        }
        
        MarketPools storage pools = marketPools[marketId];
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        pools.protocolFee = fee;
        accumulatedFees += fee;
        
        core.resolved = true;
        
        emit MarketResolved(marketId, tMarket.winningTimeframe, fee);
    }

    // ==================== PLACE BETS ====================
    
    function placeBetAdvanced(uint256 marketId, uint8 choice, uint256 amount) external nonReentrant whenNotPaused {
        MarketCore memory core = marketCore[marketId];
        require(core.startTime > 0, "Market does not exist");
        require(block.timestamp < core.endTime, "Market has ended");
        require(!core.resolved, "Market already resolved");
        require(amount > 0 && amount <= MAX_BET_AMOUNT, "Invalid amount");
        
        if (core.marketType == MarketType.MULTI_CHOICE) {
            require(choice < multiChoiceMarkets[marketId].options.length, "Invalid option");
        } else if (core.marketType == MarketType.RANGE) {
            require(choice < rangeMarkets[marketId].rangeMins.length, "Invalid range");
        } else if (core.marketType == MarketType.TIME_BASED) {
            require(choice < timeMarkets[marketId].timeframes.length, "Invalid timeframe");
        } else {
            revert("Use PredictionMarketCore for binary markets");
        }
        
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        if (core.marketType == MarketType.MULTI_CHOICE) {
            multiChoiceMarkets[marketId].optionPools[choice] += amount;
        } else if (core.marketType == MarketType.RANGE) {
            rangeMarkets[marketId].rangePools[choice] += amount;
        } else if (core.marketType == MarketType.TIME_BASED) {
            timeMarkets[marketId].timeframePools[choice] += amount;
        }
        
        MarketPools storage pools = marketPools[marketId];
        pools.totalBets++;
        
        uint256 effectiveMultiplier = 0;
        MarketOdds memory odds = marketOdds[marketId];
        if (odds.useFixedOdds) {
            MarketDecay memory decay = marketDecay[marketId];
            uint256 baseMultiplier;
            if (core.marketType == MarketType.MULTI_CHOICE) {
                baseMultiplier = multiChoiceMarkets[marketId].optionMultipliers[choice];
            } else if (core.marketType == MarketType.RANGE) {
                baseMultiplier = rangeMarkets[marketId].rangeMultipliers[choice];
            } else {
                baseMultiplier = timeMarkets[marketId].timeframeMultipliers[choice];
            }
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
            predictedUp: false,
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

    // ==================== CLAIM WINNINGS ====================
    
    function claimWinningsAdvanced(uint256 marketId) external nonReentrant whenNotPaused {
        MarketCore memory core = marketCore[marketId];
        require(core.resolved, "Market not resolved yet");
        require(
            core.marketType == MarketType.MULTI_CHOICE || 
            core.marketType == MarketType.RANGE || 
            core.marketType == MarketType.TIME_BASED,
            "Use PredictionMarketCore for binary markets"
        );
        
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
            
            bool userWon = false;
            uint256 payout = 0;
            
            if (core.marketType == MarketType.MULTI_CHOICE) {
                userWon = position.choice == multiChoiceMarkets[marketId].winningOption;
                
                if (userWon) {
                    if (odds.useFixedOdds) {
                        uint256 multiplier = multiChoiceMarkets[marketId].optionMultipliers[position.choice];
                        uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                            multiplier,
                            decay.decayStartTime,
                            core.endTime,
                            decay.minMultiplier,
                            decay.useTimeDecay
                        );
                        payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                    } else {
                        payout = _calculateMultiChoicePoolPayout(marketId, position, pools);
                    }
                }
            } else if (core.marketType == MarketType.RANGE) {
                userWon = position.choice == rangeMarkets[marketId].winningRange;
                
                if (userWon) {
                    if (odds.useFixedOdds) {
                        uint256 multiplier = rangeMarkets[marketId].rangeMultipliers[position.choice];
                        uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                            multiplier,
                            decay.decayStartTime,
                            core.endTime,
                            decay.minMultiplier,
                            decay.useTimeDecay
                        );
                        payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                    } else {
                        payout = _calculateRangePoolPayout(marketId, position, pools);
                    }
                }
            } else if (core.marketType == MarketType.TIME_BASED) {
                userWon = position.choice == timeMarkets[marketId].winningTimeframe;
                
                if (userWon) {
                    if (odds.useFixedOdds) {
                        uint256 multiplier = timeMarkets[marketId].timeframeMultipliers[position.choice];
                        uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                            multiplier,
                            decay.decayStartTime,
                            core.endTime,
                            decay.minMultiplier,
                            decay.useTimeDecay
                        );
                        payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                    } else {
                        payout = _calculateTimePoolPayout(marketId, position, pools);
                    }
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
    
    function _calculateMultiChoicePoolPayout(uint256 marketId, Position memory position, MarketPools memory pools) internal view returns (uint256) {
        MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
        
        uint256 winningPool = mcMarket.optionPools[position.choice];
        uint256 losingPool = 0;
        
        for (uint8 j = 0; j < mcMarket.options.length; j++) {
            if (j != position.choice) {
                losingPool += mcMarket.optionPools[j];
            }
        }
        
        return PredictionMarketPayoutLib.calculateMultiChoicePayout(
            position.amount,
            position.choice,
            winningPool,
            losingPool,
            pools.protocolFee,
            FEE_PERCENTAGE
        );
    }
    
    function _calculateRangePoolPayout(uint256 marketId, Position memory position, MarketPools memory pools) internal view returns (uint256) {
        RangeMarket storage rMarket = rangeMarkets[marketId];
        
        uint256 winningPool = rMarket.rangePools[position.choice];
        uint256 losingPool = 0;
        
        for (uint8 j = 0; j < rMarket.rangeMins.length; j++) {
            if (j != position.choice) {
                losingPool += rMarket.rangePools[j];
            }
        }
        
        return PredictionMarketPayoutLib.calculateRangePayout(
            position.amount,
            winningPool,
            losingPool,
            pools.protocolFee,
            FEE_PERCENTAGE
        );
    }
    
    function _calculateTimePoolPayout(uint256 marketId, Position memory position, MarketPools memory pools) internal view returns (uint256) {
        TimeMarket storage tMarket = timeMarkets[marketId];
        
        uint256 winningPool = tMarket.timeframePools[position.choice];
        uint256 losingPool = 0;
        
        for (uint8 j = 0; j < tMarket.timeframes.length; j++) {
            if (j != position.choice) {
                losingPool += tMarket.timeframePools[j];
            }
        }
        
        return PredictionMarketPayoutLib.calculateTimePayout(
            position.amount,
            winningPool,
            losingPool,
            pools.protocolFee,
            FEE_PERCENTAGE
        );
    }

    // ==================== VIEW FUNCTIONS ====================
    
    function getMultiChoiceOptions(uint256 marketId) external view returns (string[] memory) {
        return multiChoiceMarkets[marketId].options;
    }
    
    function getRangeMarketData(uint256 marketId) external view returns (uint256[] memory mins, uint256[] memory maxs) {
        return (rangeMarkets[marketId].rangeMins, rangeMarkets[marketId].rangeMaxs);
    }
    
    function getTimeMarketData(uint256 marketId) external view returns (uint256 targetPrice, uint256[] memory timeframes) {
        return (timeMarkets[marketId].targetPrice, timeMarkets[marketId].timeframes);
    }
    
    function calculatePotentialPayoutAdvanced(uint256 marketId, uint8 choice, uint256 amount) external view returns (uint256) {
        MarketCore memory core = marketCore[marketId];
        MarketOdds memory odds = marketOdds[marketId];
        MarketDecay memory decay = marketDecay[marketId];
        
        if (core.marketType == MarketType.MULTI_CHOICE) {
            if (odds.useFixedOdds) {
                uint256 baseMultiplier = multiChoiceMarkets[marketId].optionMultipliers[choice];
                uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                    baseMultiplier,
                    decay.decayStartTime,
                    core.endTime,
                    decay.minMultiplier,
                    decay.useTimeDecay
                );
                return PredictionMarketPayoutLib.calculateFixedOddsPayout(amount, effectiveMultiplier);
            } else {
                MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
                uint256 winningPool = mcMarket.optionPools[choice] + amount;
                uint256 totalPool = amount;
                
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    totalPool += mcMarket.optionPools[i];
                }
                
                uint256 losingPool = totalPool - winningPool;
                if (winningPool == 0) return amount;
                
                uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
                uint256 losingPoolAfterFee = losingPool - fee;
                uint256 share = (amount * losingPoolAfterFee) / winningPool;
                return amount + share;
            }
        } else if (core.marketType == MarketType.RANGE) {
            if (odds.useFixedOdds) {
                uint256 baseMultiplier = rangeMarkets[marketId].rangeMultipliers[choice];
                uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                    baseMultiplier,
                    decay.decayStartTime,
                    core.endTime,
                    decay.minMultiplier,
                    decay.useTimeDecay
                );
                return PredictionMarketPayoutLib.calculateFixedOddsPayout(amount, effectiveMultiplier);
            }
        } else if (core.marketType == MarketType.TIME_BASED) {
            if (odds.useFixedOdds) {
                uint256 baseMultiplier = timeMarkets[marketId].timeframeMultipliers[choice];
                uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                    baseMultiplier,
                    decay.decayStartTime,
                    core.endTime,
                    decay.minMultiplier,
                    decay.useTimeDecay
                );
                return PredictionMarketPayoutLib.calculateFixedOddsPayout(amount, effectiveMultiplier);
            }
        }
        
        return amount;
    }
    
    function getCurrentOddsAdvanced(uint256 marketId) external view returns (uint256[] memory multipliers) {
        MarketCore memory core = marketCore[marketId];
        MarketOdds memory odds = marketOdds[marketId];
        MarketDecay memory decay = marketDecay[marketId];
        
        if (core.marketType == MarketType.MULTI_CHOICE) {
            MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
            multipliers = new uint256[](mcMarket.options.length);
            
            if (odds.useFixedOdds) {
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    multipliers[i] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        mcMarket.optionMultipliers[i],
                        decay.decayStartTime,
                        core.endTime,
                        decay.minMultiplier,
                        decay.useTimeDecay
                    );
                }
            } else {
                uint256 totalPool = 0;
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    totalPool += mcMarket.optionPools[i];
                }
                
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    if (totalPool == 0) {
                        multipliers[i] = 200;
                    } else {
                        multipliers[i] = totalPool > 0 ? (totalPool * 200) / (mcMarket.optionPools[i] + 1) : 200;
                    }
                }
            }
        } else if (core.marketType == MarketType.RANGE) {
            RangeMarket storage rMarket = rangeMarkets[marketId];
            multipliers = new uint256[](rMarket.rangeMins.length);
            
            if (odds.useFixedOdds) {
                for (uint8 i = 0; i < rMarket.rangeMins.length; i++) {
                    multipliers[i] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        rMarket.rangeMultipliers[i],
                        decay.decayStartTime,
                        core.endTime,
                        decay.minMultiplier,
                        decay.useTimeDecay
                    );
                }
            } else {
                uint256 totalPool = 0;
                for (uint8 i = 0; i < rMarket.rangeMins.length; i++) {
                    totalPool += rMarket.rangePools[i];
                }
                
                for (uint8 i = 0; i < rMarket.rangeMins.length; i++) {
                    if (totalPool == 0) {
                        multipliers[i] = 200;
                    } else {
                        multipliers[i] = totalPool > 0 ? (totalPool * 200) / (rMarket.rangePools[i] + 1) : 200;
                    }
                }
            }
        } else if (core.marketType == MarketType.TIME_BASED) {
            TimeMarket storage tMarket = timeMarkets[marketId];
            multipliers = new uint256[](tMarket.timeframes.length);
            
            if (odds.useFixedOdds) {
                for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
                    multipliers[i] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        tMarket.timeframeMultipliers[i],
                        decay.decayStartTime,
                        core.endTime,
                        decay.minMultiplier,
                        decay.useTimeDecay
                    );
                }
            } else {
                uint256 totalPool = 0;
                for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
                    totalPool += tMarket.timeframePools[i];
                }
                
                for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
                    if (totalPool == 0) {
                        multipliers[i] = 200;
                    } else {
                        multipliers[i] = totalPool > 0 ? (totalPool * 200) / (tMarket.timeframePools[i] + 1) : 200;
                    }
                }
            }
        }
        
        return multipliers;
    }
}