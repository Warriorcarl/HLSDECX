// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTestToken.sol";

contract TestUSDC is BaseTestToken {
    constructor() BaseTestToken("Test USD Coin", "USDC") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDC uses 6 decimals
    }
}