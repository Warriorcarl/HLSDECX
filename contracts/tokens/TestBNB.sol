// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTestToken.sol";

contract TestBNB is BaseTestToken {
    constructor() BaseTestToken("Test BNB", "BNB") {
        // Mint initial supply to deployer
        _mint(msg.sender, 200000000 * 10**decimals());
    }
}