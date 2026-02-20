// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredictionMarketBase.sol";
import "./PredictionMarketPayoutLib.sol";

/**
 * @title PredictionMarketTypes
 * @notice Extension contract for advanced market types (MultiChoice, Range, TimeBased)
 * @dev Inherits from PredictionMarketBase to share storage with Core contract
 */
contract PredictionMarketTypes is PredictionMarketBase {
    
    using PredictionMarketPayoutLib for *;

    constructor(address _usdc, address _owner) PredictionMarketBase(_usdc, _owner) {}

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
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(options.length >= 2 && options.length <= 10, "2-10 options required");
        require(duration >= 60 && duration <= 7 days, "Invalid duration");
        require(decayStartPercent <= 100, "Invalid decay start percent");
        
        for (uint8 i = 0; i < multipliers.length; i++) {
            require(multipliers[i] >= MIN_MULTIPLIER && multipliers[i] <= MAX_MULTIPLIER, "Multiplier out of range");
        }
        
        if (minMultiplier > 0) {
            require(minMultiplier >= MIN_MULTIPLIER && minMultiplier <= MAX_MULTIPLIER, "Min multiplier out of range");
        }
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = multipliers.length == options.length;
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.MULTI_CHOICE,
            asset: question,
            startTime: startTime,
            endTime: endTime,
            startPrice: 0,
            endPrice: 0,
            yesPool: 0,
            noPool: 0,
            resolved: false,
            priceWentUp: false,
            totalBets: 0,
            useFixedOdds: useFixedOdds,
            yesMultiplier: 0,
            noMultiplier: 0,
            protocolFee: 0,
            useTimeDecay: useTimeDecay,
            decayStartTime: decayStartTime,
            minMultiplier: finalMinMultiplier
        });
        
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
    
    function resolveMultiChoiceMarket(uint256 marketId, uint8 winningOption) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.MULTI_CHOICE, "Not a multi-choice market");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        require(winningOption < multiChoiceMarkets[marketId].options.length, "Invalid option");
        
        multiChoiceMarkets[marketId].winningOption = winningOption;
        
        MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
        uint256 losingPool = 0;
        for (uint8 i = 0; i < mcMarket.options.length; i++) {
            if (i != winningOption) {
                losingPool += mcMarket.optionPools[i];
            }
        }
        
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        market.protocolFee = fee;
        accumulatedFees += fee;
        
        market.resolved = true;
        
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
    ) external onlyOwner whenNotPaused returns (uint256) {
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
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;
        
        bool useFixedOdds = multipliers.length == rangeMins.length;
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.RANGE,
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
            yesMultiplier: 0,
            noMultiplier: 0,
            protocolFee: 0,
            useTimeDecay: useTimeDecay,
            decayStartTime: decayStartTime,
            minMultiplier: finalMinMultiplier
        });
        
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
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.RANGE, "Not a range market");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        
        int256 endPrice = getCurrentPrice(market.asset);
        require(endPrice > 0, "Invalid end price");
        
        market.endPrice = endPrice;
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
        
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        market.protocolFee = fee;
        accumulatedFees += fee;
        
        market.resolved = true;
        
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
    ) external onlyOwner whenNotPaused returns (uint256) {
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
        
        uint256 marketId = marketCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + timeframes[timeframes.length - 1];
        
        bool useFixedOdds = multipliers.length == timeframes.length;
        uint256 duration = endTime - startTime;
        uint256 decayStartTime = useTimeDecay ? 
            startTime + (duration * (decayStartPercent > 0 ? decayStartPercent : DEFAULT_DECAY_START_PERCENT) / 100) : 0;
        uint256 finalMinMultiplier = minMultiplier > 0 ? minMultiplier : DEFAULT_MIN_MULTIPLIER;
        
        markets[marketId] = Market({
            id: marketId,
            marketType: MarketType.TIME_BASED,
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
            yesMultiplier: 0,
            noMultiplier: 0,
            protocolFee: 0,
            useTimeDecay: useTimeDecay,
            decayStartTime: decayStartTime,
            minMultiplier: finalMinMultiplier
        });
        
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
        Market storage market = markets[marketId];
        require(market.marketType == MarketType.TIME_BASED, "Not a time-based market");
        require(block.timestamp >= market.endTime, "Market has not ended yet");
        require(!market.resolved, "Market already resolved");
        
        TimeMarket storage tMarket = timeMarkets[marketId];
        int256 currentPrice = getCurrentPrice(market.asset);
        require(currentPrice > 0, "Invalid price");
        
        if (uint256(currentPrice) >= tMarket.targetPrice) {
            tMarket.eventTimestamp = block.timestamp;
            
            for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
                if (block.timestamp <= market.startTime + tMarket.timeframes[i]) {
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
        
        uint256 fee = (losingPool * FEE_PERCENTAGE) / 100;
        market.protocolFee = fee;
        accumulatedFees += fee;
        
        market.resolved = true;
        
        emit MarketResolved(marketId, tMarket.winningTimeframe, fee);
    }

    // ==================== PLACE BETS FOR ADVANCED TYPES ====================
    
    function placeBetAdvanced(uint256 marketId, uint8 choice, uint256 amount) external nonReentrant whenNotPaused {
        Market storage market = markets[marketId];
        require(market.startTime > 0, "Market does not exist");
        require(block.timestamp < market.endTime, "Market has ended");
        require(!market.resolved, "Market already resolved");
        require(amount > 0 && amount <= MAX_BET_AMOUNT, "Invalid amount");
        
        if (market.marketType == MarketType.MULTI_CHOICE) {
            require(choice < multiChoiceMarkets[marketId].options.length, "Invalid option");
        } else if (market.marketType == MarketType.RANGE) {
            require(choice < rangeMarkets[marketId].rangeMins.length, "Invalid range");
        } else if (market.marketType == MarketType.TIME_BASED) {
            require(choice < timeMarkets[marketId].timeframes.length, "Invalid timeframe");
        } else {
            revert("Use PredictionMarketCore for binary markets");
        }
        
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        
        if (market.marketType == MarketType.MULTI_CHOICE) {
            multiChoiceMarkets[marketId].optionPools[choice] += amount;
        } else if (market.marketType == MarketType.RANGE) {
            rangeMarkets[marketId].rangePools[choice] += amount;
        } else if (market.marketType == MarketType.TIME_BASED) {
            timeMarkets[marketId].timeframePools[choice] += amount;
        }
        
        market.totalBets++;
        
        uint256 effectiveMultiplier = 0;
        if (market.useFixedOdds) {
            uint256 baseMultiplier;
            if (market.marketType == MarketType.MULTI_CHOICE) {
                baseMultiplier = multiChoiceMarkets[marketId].optionMultipliers[choice];
            } else if (market.marketType == MarketType.RANGE) {
                baseMultiplier = rangeMarkets[marketId].rangeMultipliers[choice];
            } else {
                baseMultiplier = timeMarkets[marketId].timeframeMultipliers[choice];
            }
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
            predictedUp: false,
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

    // ==================== CLAIM WINNINGS FOR ADVANCED TYPES ====================
    
    function claimWinningsAdvanced(uint256 marketId) external nonReentrant whenNotPaused {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved yet");
        require(
            market.marketType == MarketType.MULTI_CHOICE || 
            market.marketType == MarketType.RANGE || 
            market.marketType == MarketType.TIME_BASED,
            "Use PredictionMarketCore for binary markets"
        );
        
        uint256[] memory positionIndices = userMarketPositions[marketId][msg.sender];
        require(positionIndices.length > 0, "No positions in this market");
        
        uint256 totalWinnings = 0;
        bool hadWin = false;
        bool hadLoss = false;
        
        for (uint256 i = 0; i < positionIndices.length; i++) {
            Position storage position = marketPositions[marketId][positionIndices[i]];
            
            if (position.claimed) continue;
            
            bool userWon = false;
            uint256 payout = 0;
            
            if (market.marketType == MarketType.MULTI_CHOICE) {
                userWon = position.choice == multiChoiceMarkets[marketId].winningOption;
                
                if (userWon) {
                    if (market.useFixedOdds) {
                        uint256 multiplier = multiChoiceMarkets[marketId].optionMultipliers[position.choice];
                        uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                            multiplier,
                            market.decayStartTime,
                            market.endTime,
                            market.minMultiplier,
                            market.useTimeDecay
                        );
                        payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                    } else {
                        payout = _calculateMultiChoicePoolPayout(marketId, position);
                    }
                }
            } else if (market.marketType == MarketType.RANGE) {
                userWon = position.choice == rangeMarkets[marketId].winningRange;
                
                if (userWon) {
                    if (market.useFixedOdds) {
                        uint256 multiplier = rangeMarkets[marketId].rangeMultipliers[position.choice];
                        uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                            multiplier,
                            market.decayStartTime,
                            market.endTime,
                            market.minMultiplier,
                            market.useTimeDecay
                        );
                        payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                    } else {
                        payout = _calculateRangePoolPayout(marketId, position);
                    }
                }
            } else if (market.marketType == MarketType.TIME_BASED) {
                userWon = position.choice == timeMarkets[marketId].winningTimeframe;
                
                if (userWon) {
                    if (market.useFixedOdds) {
                        uint256 multiplier = timeMarkets[marketId].timeframeMultipliers[position.choice];
                        uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                            multiplier,
                            market.decayStartTime,
                            market.endTime,
                            market.minMultiplier,
                            market.useTimeDecay
                        );
                        payout = PredictionMarketPayoutLib.calculateFixedOddsPayout(position.amount, effectiveMultiplier);
                    } else {
                        payout = _calculateTimePoolPayout(marketId, position);
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
    
    function _calculateMultiChoicePoolPayout(uint256 marketId, Position memory position) internal view returns (uint256) {
        Market memory market = markets[marketId];
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
            market.protocolFee,
            FEE_PERCENTAGE
        );
    }
    
    function _calculateRangePoolPayout(uint256 marketId, Position memory position) internal view returns (uint256) {
        Market memory market = markets[marketId];
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
            market.protocolFee,
            FEE_PERCENTAGE
        );
    }
    
    function _calculateTimePoolPayout(uint256 marketId, Position memory position) internal view returns (uint256) {
        Market memory market = markets[marketId];
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
            market.protocolFee,
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
        Market memory market = markets[marketId];
        
        if (market.marketType == MarketType.MULTI_CHOICE) {
            if (market.useFixedOdds) {
                uint256 baseMultiplier = multiChoiceMarkets[marketId].optionMultipliers[choice];
                uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                    baseMultiplier,
                    market.decayStartTime,
                    market.endTime,
                    market.minMultiplier,
                    market.useTimeDecay
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
        } else if (market.marketType == MarketType.RANGE) {
            if (market.useFixedOdds) {
                uint256 baseMultiplier = rangeMarkets[marketId].rangeMultipliers[choice];
                uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                    baseMultiplier,
                    market.decayStartTime,
                    market.endTime,
                    market.minMultiplier,
                    market.useTimeDecay
                );
                return PredictionMarketPayoutLib.calculateFixedOddsPayout(amount, effectiveMultiplier);
            }
        } else if (market.marketType == MarketType.TIME_BASED) {
            if (market.useFixedOdds) {
                uint256 baseMultiplier = timeMarkets[marketId].timeframeMultipliers[choice];
                uint256 effectiveMultiplier = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                    baseMultiplier,
                    market.decayStartTime,
                    market.endTime,
                    market.minMultiplier,
                    market.useTimeDecay
                );
                return PredictionMarketPayoutLib.calculateFixedOddsPayout(amount, effectiveMultiplier);
            }
        }
        
        return amount;
    }
    
    function getCurrentOddsAdvanced(uint256 marketId) external view returns (uint256[] memory multipliers) {
        Market memory market = markets[marketId];
        
        if (market.marketType == MarketType.MULTI_CHOICE) {
            MultiChoiceMarket storage mcMarket = multiChoiceMarkets[marketId];
            multipliers = new uint256[](mcMarket.options.length);
            
            if (market.useFixedOdds) {
                for (uint8 i = 0; i < mcMarket.options.length; i++) {
                    multipliers[i] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        mcMarket.optionMultipliers[i],
                        market.decayStartTime,
                        market.endTime,
                        market.minMultiplier,
                        market.useTimeDecay
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
        } else if (market.marketType == MarketType.RANGE) {
            RangeMarket storage rMarket = rangeMarkets[marketId];
            multipliers = new uint256[](rMarket.rangeMins.length);
            
            if (market.useFixedOdds) {
                for (uint8 i = 0; i < rMarket.rangeMins.length; i++) {
                    multipliers[i] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        rMarket.rangeMultipliers[i],
                        market.decayStartTime,
                        market.endTime,
                        market.minMultiplier,
                        market.useTimeDecay
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
        } else if (market.marketType == MarketType.TIME_BASED) {
            TimeMarket storage tMarket = timeMarkets[marketId];
            multipliers = new uint256[](tMarket.timeframes.length);
            
            if (market.useFixedOdds) {
                for (uint8 i = 0; i < tMarket.timeframes.length; i++) {
                    multipliers[i] = PredictionMarketPayoutLib.calculateDecayedMultiplier(
                        tMarket.timeframeMultipliers[i],
                        market.decayStartTime,
                        market.endTime,
                        market.minMultiplier,
                        market.useTimeDecay
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
