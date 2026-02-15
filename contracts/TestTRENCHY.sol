// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestTRENCHY
 * @notice Simple ERC20 token for testing the points claim system on Base Sepolia
 * @dev Mints 10M tokens to deployer
 */
contract TestTRENCHY is ERC20, Ownable {
    
    constructor(address initialOwner) ERC20("Test TRENCHY", "TRENCHY") {
        // Mint 10 million tokens (with 18 decimals)
        _mint(initialOwner, 10_000_000 * 10**18);
        transferOwnership(initialOwner);
    }
    
    /**
     * @notice Allows owner to mint additional tokens if needed for testing
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Allows owner to burn tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
