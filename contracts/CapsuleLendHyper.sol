// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./CapsuleLend.sol";

/// @title CapsuleLendHyper
/// @notice The same card loan as CapsuleLend, fixed to HyperEVM and Circle USDC.
/// @dev Chain id 999. USDC is Circle native USDC, 6 decimals, so a $17 buyback is
///      still 17_000_000 units, the funder fee is 510_000, and the protocol fee is 170_000.
///      This file adds no loan rules. It only refuses to deploy on another chain
///      or with another stablecoin.
contract CapsuleLendHyper is CapsuleLend {
    address public constant USDC = 0xb88339CB7199b77E23DB6E890353E22632Ba630f;
    uint256 public constant CHAIN_ID = 999;

    error WrongChain();

    constructor(address protocol_, address admin_) CapsuleLend(USDC, protocol_, admin_) {
        if (block.chainid != CHAIN_ID) revert WrongChain();
    }
}
