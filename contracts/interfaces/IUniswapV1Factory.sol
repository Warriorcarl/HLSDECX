// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV1Factory {
    event NewExchange(address indexed token, address indexed exchange);
    
    function createExchange(address token) external returns (address);
    function getExchange(address token) external view returns (address);
    function getToken(address exchange) external view returns (address);
    function tokenCount() external view returns (uint256);
    function getTokenWithId(uint256 tokenId) external view returns (address);
}