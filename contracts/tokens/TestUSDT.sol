// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTestToken.sol";

contract TestUSDT is BaseTestToken {
    constructor() BaseTestToken("Test Tether USD", "USDT") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDT typically uses 6 decimals
    }
}