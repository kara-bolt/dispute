// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IKARA
 * @notice Interface for the $KARA token on Base
 * @dev Token address: 0x99926046978e9fB6544140982fB32cddC7e86b07
 */
interface IKARA is IERC20 {
    /**
     * @notice Check if an address is a KARA holder with minimum balance
     * @param account Address to check
     * @param minBalance Minimum balance required
     * @return True if account holds at least minBalance KARA
     */
    function isHolder(address account, uint256 minBalance) external view returns (bool);
}

/**
 * @title KARAConstants
 * @notice Constants for $KARA token integration
 */
library KARAConstants {
    /// @notice $KARA token address on Base mainnet
    address constant KARA_TOKEN = 0x99926046978e9fB6544140982fB32cddC7e86b07;
    
    /// @notice Discount tiers for KARA holders (in basis points, 10000 = 100%)
    uint256 constant TIER1_THRESHOLD = 1000 * 1e18;    // 1,000 KARA
    uint256 constant TIER1_DISCOUNT = 500;             // 5% discount
    
    uint256 constant TIER2_THRESHOLD = 10000 * 1e18;   // 10,000 KARA
    uint256 constant TIER2_DISCOUNT = 1000;            // 10% discount
    
    uint256 constant TIER3_THRESHOLD = 100000 * 1e18;  // 100,000 KARA
    uint256 constant TIER3_DISCOUNT = 2000;            // 20% discount
    
    uint256 constant TIER4_THRESHOLD = 1000000 * 1e18; // 1,000,000 KARA
    uint256 constant TIER4_DISCOUNT = 3000;            // 30% discount
    
    /// @notice Minimum KARA stake required for arbitrators/relayers
    uint256 constant MIN_ARBITRATOR_STAKE = 50000 * 1e18; // 50,000 KARA
    
    /// @notice Basis points denominator
    uint256 constant BASIS_POINTS = 10000;
}
