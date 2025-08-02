// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTestToken.sol";

contract TestDAI is BaseTestToken {
    constructor() BaseTestToken("Test Dai Stablecoin", "DAI") {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }
}