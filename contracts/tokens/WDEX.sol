// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title WDEX (Wrapped DEX)
 * @dev Wrapped version of HLS (Helios native token) for use in DEX operations
 * Similar to WETH9 but for Helios Testnet
 */
contract WDEX is ERC20, ERC20Permit {
    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);

    constructor() ERC20("Wrapped DEX", "WDEX") ERC20Permit("Wrapped DEX") {}

    /**
     * @dev Deposit HLS and mint WDEX tokens
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw HLS by burning WDEX tokens
     */
    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "WDEX: insufficient balance");
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @dev Allow direct HLS deposits
     */
    receive() external payable {
        deposit();
    }

    /**
     * @dev Fallback function
     */
    fallback() external payable {
        deposit();
    }
}