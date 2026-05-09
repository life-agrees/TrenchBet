// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockAggregator
 * @dev Mock Chainlink Aggregator for testing on new networks like Arc.
 */
contract MockAggregator {
    int256 public price;
    uint8 public decimals = 8;
    string public description;
    uint256 public version = 1;

    constructor(string memory _description, int256 _initialPrice) {
        description = _description;
        price = _initialPrice;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, price, block.timestamp, block.timestamp, 1);
    }

    function updatePrice(int256 _newPrice) external {
        price = _newPrice;
    }
}
