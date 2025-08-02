// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTestToken.sol";

contract TestSOL is BaseTestToken {
    constructor() BaseTestToken("Test Solana", "SOL") {
        // Mint initial supply to deployer
        _mint(msg.sender, 500000000 * 10**decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 9; // Solana uses 9 decimals
    }
}