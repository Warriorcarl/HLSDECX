// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTestToken.sol";

contract TestETH is BaseTestToken {
    constructor() BaseTestToken("Test Ethereum", "ETH") {
        // Mint initial supply to deployer
        _mint(msg.sender, 120000000 * 10**decimals());
    }
}