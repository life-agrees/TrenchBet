// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "./PredictionMarketStorage.sol";

/**
 * @title PredictionMarketProxy
 * @notice FIXED: Inherits PredictionMarketStorage for storage layout alignment
 * @dev All storage variables are inherited from PredictionMarketStorage
 * @dev EIP-1967 slots are used for proxy-specific data (admin, implementation)
 */
contract PredictionMarketProxy is PredictionMarketStorage, Proxy {

    
    // EIP-1967 Storage Slots (won't collide with implementation storage)
    bytes32 private constant _IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 private constant _ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);
    
    // Store Core and Types implementations in EIP-1967 slots too
    bytes32 private constant _CORE_IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.coreImplementation")) - 1);
    bytes32 private constant _TYPES_IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.typesImplementation")) - 1);
    
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event ImplementationUpgraded(address indexed implementation);
    
    constructor(address _coreImplementation, address _typesImplementation, address _admin) {
        require(_coreImplementation != address(0), "Invalid core");
        require(_typesImplementation != address(0), "Invalid types");
        require(_admin != address(0), "Invalid admin");
        
        // Set admin
        bytes32 adminSlot = _ADMIN_SLOT;
        assembly {
            sstore(adminSlot, _admin)
        }
        
        // Set Core as default implementation
        bytes32 implSlot = _IMPLEMENTATION_SLOT;
        assembly {
            sstore(implSlot, _coreImplementation)
        }
        
        // Store both implementations
        bytes32 coreSlot = _CORE_IMPLEMENTATION_SLOT;
        assembly {
            sstore(coreSlot, _coreImplementation)
        }
        
        bytes32 typesSlot = _TYPES_IMPLEMENTATION_SLOT;
        assembly {
            sstore(typesSlot, _typesImplementation)
        }
    }
    
    modifier onlyAdmin() {
        require(msg.sender == getAdmin(), "Only admin");
        _;
    }
    
    function getAdmin() public view returns (address admin) {
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            admin := sload(slot)
        }
    }
    
    function owner() public view returns (address) {
        return getAdmin();
    }
    
    function _implementation() internal view override returns (address impl) {
        bytes4 selector = msg.sig;
        
        // Route to Types implementation for advanced market types
        if (
            selector == bytes4(keccak256("createMultiChoiceMarketWithOdds(string,string[],string,uint256,uint256[],bool,uint256,uint256)")) ||
            selector == bytes4(keccak256("createRangeMarketWithOdds(string,uint256[],uint256[],uint256,uint256[],bool,uint256,uint256)")) ||
            selector == bytes4(keccak256("createTimeMarketWithOdds(string,uint256,uint256[],uint256[],bool,uint256,uint256)")) ||
            selector == bytes4(keccak256("placeBetAdvanced(uint256,uint8,uint256)")) ||
            selector == bytes4(keccak256("claimWinningsAdvanced(uint256)")) ||
            selector == bytes4(keccak256("resolveMultiChoiceMarket(uint256,uint8)")) ||
            selector == bytes4(keccak256("resolveRangeMarket(uint256)")) ||
            selector == bytes4(keccak256("resolveTimeMarket(uint256)"))
        ) {
            bytes32 typesSlot = _TYPES_IMPLEMENTATION_SLOT;
            assembly {
                impl := sload(typesSlot)
            }
        } else {
            // Default to Core for all other functions
            bytes32 coreSlot = _CORE_IMPLEMENTATION_SLOT;
            assembly {
                impl := sload(coreSlot)
            }
        }
    }
    
    function getCoreImplementation() public view returns (address impl) {
        bytes32 slot = _CORE_IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    function getTypesImplementation() public view returns (address impl) {
        bytes32 slot = _TYPES_IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }
    
    // ==================== VIEW FUNCTIONS - READ STORAGE DIRECTLY ====================
    
    /**
     * @notice Get multi-choice options directly from proxy storage
     */
    function getMultiChoiceOptions(uint256 marketId) public view returns (string[] memory) {
        return multiChoiceMarkets[marketId].options;
    }
    
    /**
     * @notice Get range market data directly from proxy storage
     */
    function getRangeMarketData(uint256 marketId) public view returns (uint256[] memory mins, uint256[] memory maxs) {
        return (rangeMarkets[marketId].rangeMins, rangeMarkets[marketId].rangeMaxs);
    }
    
    /**
     * @notice Get time market data directly from proxy storage
     */
    function getTimeMarketData(uint256 marketId) public view returns (uint256 targetPrice, uint256[] memory timeframes) {
        return (timeMarkets[marketId].targetPrice, timeMarkets[marketId].timeframes);
    }
    
    function upgradeCore(address newImplementation) external onlyAdmin {
        require(newImplementation != address(0), "Invalid implementation");
        
        bytes32 coreSlot = _CORE_IMPLEMENTATION_SLOT;
        assembly {
            sstore(coreSlot, newImplementation)
        }
        
        // Also update default implementation
        bytes32 implSlot = _IMPLEMENTATION_SLOT;
        assembly {
            sstore(implSlot, newImplementation)
        }
        
        emit ImplementationUpgraded(newImplementation);
    }
    
    function upgradeTypes(address newImplementation) external onlyAdmin {
        require(newImplementation != address(0), "Invalid implementation");
        
        bytes32 typesSlot = _TYPES_IMPLEMENTATION_SLOT;
        assembly {
            sstore(typesSlot, newImplementation)
        }
        
        emit ImplementationUpgraded(newImplementation);
    }
    
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");
        address previousAdmin = getAdmin();
        
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            sstore(slot, newAdmin)
        }
        
        emit AdminChanged(previousAdmin, newAdmin);
    }
    
    receive() external payable override {}
}
