// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTestToken.sol";

contract TestBTC is BaseTestToken {
    constructor() BaseTestToken("Test Bitcoin", "BTC") {
        // Mint initial supply to deployer
        _mint(msg.sender, 21000 * 10**decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 8; // Bitcoin uses 8 decimals
    }
}