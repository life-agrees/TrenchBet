// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredictionMarketProxy
 * @notice Proxy contract that delegates calls to implementation contracts
 * @dev Uses OpenZeppelin's Proxy pattern for shared storage
 */
contract PredictionMarketProxy is Proxy, Ownable {
    
    // Storage slot for the implementation address
    bytes32 private constant _IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    
    // Storage slot for the admin address
    bytes32 private constant _ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
    
    // Mapping to route calls to different implementations
    mapping(bytes4 => address) public implementations;
    
    // Default implementation (Core contract)
    address public defaultImplementation;
    
    event ImplementationSet(bytes4 indexed selector, address indexed implementation);
    event DefaultImplementationSet(address indexed implementation);
    
    constructor(address _coreImplementation, address _admin) {
        require(_coreImplementation != address(0), "Invalid core implementation");
        require(_admin != address(0), "Invalid admin");
        
        defaultImplementation = _coreImplementation;
        
        // Set admin in EIP-1967 slot
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            sstore(slot, _admin)
        }
        
        // Transfer ownership to admin
        transferOwnership(_admin);
        
        emit DefaultImplementationSet(_coreImplementation);
    }
    
    /**
     * @notice Set implementation for a specific function selector
     * @param selector Function selector
     * @param implementation Implementation contract address
     */
    function setImplementation(bytes4 selector, address implementation) external onlyOwner {
        require(implementation != address(0), "Invalid implementation");
        implementations[selector] = implementation;
        emit ImplementationSet(selector, implementation);
    }
    
    /**
     * @notice Set the default implementation (Core contract)
     * @param implementation Core contract address
     */
    function setDefaultImplementation(address implementation) external onlyOwner {
        require(implementation != address(0), "Invalid implementation");
        defaultImplementation = implementation;
        emit DefaultImplementationSet(implementation);
    }
    
    /**
     * @notice Get the implementation address for a given call
     * @return impl Implementation contract address
     */
    function _implementation() internal view override returns (address impl) {
        // Get the function selector from msg.data
        bytes4 selector;
        if (msg.data.length >= 4) {
            selector = bytes4(msg.data[0:4]);
        }
        
        // Check if there's a specific implementation for this selector
        address specificImpl = implementations[selector];
        if (specificImpl != address(0)) {
            return specificImpl;
        }
        
        // Return default implementation
        return defaultImplementation;
    }
    
    /**
     * @notice Get the admin address
     * @return admin Admin address
     */
    function getAdmin() external view returns (address admin) {
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            admin := sload(slot)
        }
    }
    
    /**
     * @notice Upgrade the proxy to a new implementation
     * @param newImplementation New implementation address
     */
    function upgradeTo(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "Invalid implementation");
        defaultImplementation = newImplementation;
        emit DefaultImplementationSet(newImplementation);
    }
    
    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable override {}

}
