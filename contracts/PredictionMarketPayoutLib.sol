// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredictionMarketBase.sol";

/**
 * @title PredictionMarketPayoutLib
 * @notice Library for shared payout and time decay calculations
 * @dev Reduces code duplication across Core and Types contracts
 */
library PredictionMarketPayoutLib {
    
    /**
     * @notice Calculate time-decayed multiplier
     */
    function calculateDecayedMultiplier(
        uint256 baseMultiplier,
        uint256 decayStartTime,
        uint256 endTime,
        uint256 minMultiplier,
        bool useTimeDecay
    ) internal view returns (uint256) {
        if (!useTimeDecay || block.timestamp < decayStartTime) {
            return baseMultiplier;
        }
        
        if (block.timestamp >= endTime) {
            return minMultiplier;
        }
        
        uint256 decayDuration = endTime - decayStartTime;
        uint256 timeElapsed = block.timestamp - decayStartTime;
        uint256 decayProgress = (timeElapsed * 10000) / decayDuration;
        
        uint256 maxDecay = baseMultiplier - minMultiplier;
        uint256 actualDecay = (maxDecay * decayProgress) / 10000;
        
        uint256 decayedMultiplier = baseMultiplier - actualDecay;
        
        return decayedMultiplier > minMultiplier ? decayedMultiplier : minMultiplier;
    }
    
    /**
     * @notice Calculate pool-based payout for multi-choice markets
     */
    function calculateMultiChoicePayout(
        uint256 positionAmount,
        uint8 positionChoice,
        uint256 winningPool,
        uint256 totalLosingPool,
        uint256 protocolFee,
        uint256 feePercentage
    ) internal pure returns (uint256) {
        if (winningPool == 0) return 0;
        
        uint256 fee = (totalLosingPool * feePercentage) / 100;
        uint256 losingPoolAfterFee = totalLosingPool - fee;
        uint256 share = (positionAmount * losingPoolAfterFee) / winningPool;
        
        return positionAmount + share;
    }
    
    /**
     * @notice Calculate pool-based payout for range markets
     */
    function calculateRangePayout(
        uint256 positionAmount,
        uint256 winningPool,
        uint256 totalLosingPool,
        uint256 protocolFee,
        uint256 feePercentage
    ) internal pure returns (uint256) {
        return calculateMultiChoicePayout(
            positionAmount,
            0,
            winningPool,
            totalLosingPool,
            protocolFee,
            feePercentage
        );
    }
    
    /**
     * @notice Calculate pool-based payout for time markets
     */
    function calculateTimePayout(
        uint256 positionAmount,
        uint256 winningPool,
        uint256 totalLosingPool,
        uint256 protocolFee,
        uint256 feePercentage
    ) internal pure returns (uint256) {
        return calculateMultiChoicePayout(
            positionAmount,
            0,
            winningPool,
            totalLosingPool,
            protocolFee,
            feePercentage
        );
    }
    
    /**
     * @notice Calculate binary market payout with fixed odds
     */
    function calculateFixedOddsPayout(
        uint256 amount,
        uint256 multiplier
    ) internal pure returns (uint256) {
        return (amount * multiplier) / 100;
    }
    
    /**
     * @notice Calculate binary market pool-based payout
     */
    function calculateBinaryPoolPayout(
        uint256 positionAmount,
        bool isYesPosition,
        uint256 yesPool,
        uint256 noPool,
        uint256 protocolFee,
        uint256 feePercentage
    ) internal pure returns (uint256) {
        uint256 winningPool = isYesPosition ? yesPool : noPool;
        uint256 losingPool = isYesPosition ? noPool : yesPool;
        
        if (winningPool == 0) return positionAmount;
        
        uint256 fee = (losingPool * feePercentage) / 100;
        uint256 losingPoolAfterFee = losingPool - fee;
        uint256 share = (positionAmount * losingPoolAfterFee) / winningPool;
        
        return positionAmount + share;
    }
    
    /**
     * @notice Get decay status for a market
     */
    function getDecayStatus(
        uint256 decayStartTime,
        uint256 endTime,
        uint256 minMultiplier,
        bool useTimeDecay
    ) internal view returns (bool isDecaying, uint256 decayProgress, uint256 currentMultiplier) {
        if (!useTimeDecay) {
            return (false, 0, 0);
        }
        
        if (block.timestamp < decayStartTime) {
            return (false, 0, minMultiplier);
        }
        
        if (block.timestamp >= endTime) {
            return (true, 10000, minMultiplier);
        }
        
        uint256 decayDuration = endTime - decayStartTime;
        uint256 timeElapsed = block.timestamp - decayStartTime;
        uint256 progress = (timeElapsed * 10000) / decayDuration;
        
        return (true, progress, minMultiplier);
    }
}
