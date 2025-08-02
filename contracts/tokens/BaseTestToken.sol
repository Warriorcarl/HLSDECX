// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BaseTestToken
 * @dev Base contract for test tokens with faucet and burn functionality
 */
abstract contract BaseTestToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    mapping(address => bool) public blacklisted;
    mapping(address => uint256) public lastFaucetTime;
    
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 1000 tokens
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    
    event Faucet(address indexed to, uint256 amount);
    event Blacklisted(address indexed account, bool status);

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) {}

    /**
     * @dev Faucet function - allows users to mint tokens to themselves
     */
    function faucet() external whenNotPaused {
        require(!blacklisted[msg.sender], "BaseTestToken: account blacklisted");
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "BaseTestToken: faucet cooldown active"
        );
        
        lastFaucetTime[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Faucet(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @dev Admin faucet - owner can mint tokens to any address
     */
    function adminFaucet(address to, uint256 amount) external onlyOwner {
        require(!blacklisted[to], "BaseTestToken: account blacklisted");
        _mint(to, amount);
        emit Faucet(to, amount);
    }

    /**
     * @dev Blacklist/unblacklist an account
     */
    function setBlacklisted(address account, bool status) external onlyOwner {
        blacklisted[account] = status;
        emit Blacklisted(account, status);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override _update to include pausable and blacklist checks
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        require(!blacklisted[from] && !blacklisted[to], "BaseTestToken: account blacklisted");
        super._update(from, to, value);
    }
}