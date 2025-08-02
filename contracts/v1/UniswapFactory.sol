// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UniswapExchange.sol";

/**
 * @title UniswapFactory
 * @dev Uniswap V1 Factory contract adapted for Helios Testnet
 * Creates and manages Uniswap V1 exchanges
 */
contract UniswapFactory {
    
    // Events
    event NewExchange(address indexed token, address indexed exchange);
    
    // Token => Exchange address mapping
    mapping(address => address) public getExchange;
    // Exchange => Token address mapping  
    mapping(address => address) public getToken;
    // List of all tokens with exchanges
    address[] public tokenList;
    
    /**
     * @dev Create exchange for a token
     */
    function createExchange(address token) external returns (address) {
        require(token != address(0), "UniswapFactory: ZERO_ADDRESS");
        require(getExchange[token] == address(0), "UniswapFactory: EXCHANGE_EXISTS");
        
        // Deploy new exchange
        UniswapExchange exchange = new UniswapExchange(token);
        address exchangeAddress = address(exchange);
        
        // Update mappings
        getExchange[token] = exchangeAddress;
        getToken[exchangeAddress] = token;
        tokenList.push(token);
        
        emit NewExchange(token, exchangeAddress);
        return exchangeAddress;
    }
    
    /**
     * @dev Get number of tokens with exchanges
     */
    function tokenCount() external view returns (uint256) {
        return tokenList.length;
    }
    
    /**
     * @dev Get token address by index
     */
    function getTokenWithId(uint256 tokenId) external view returns (address) {
        require(tokenId < tokenList.length, "UniswapFactory: INVALID_TOKEN_ID");
        return tokenList[tokenId];
    }
}