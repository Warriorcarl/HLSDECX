// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV1Exchange {
    // Events
    event TokenPurchase(address indexed buyer, uint256 indexed hlsIn, uint256 indexed tokensOut);
    event HlsPurchase(address indexed buyer, uint256 indexed tokensIn, uint256 indexed hlsOut);
    event AddLiquidity(address indexed provider, uint256 indexed hlsAmount, uint256 indexed tokenAmount);
    event RemoveLiquidity(address indexed provider, uint256 indexed hlsAmount, uint256 indexed tokenAmount);
    
    // Exchange functions
    function hlsToTokenSwapInput(uint256 minTokens, uint256 deadline) external payable returns (uint256);
    function hlsToTokenSwapOutput(uint256 tokensBought, uint256 deadline) external payable returns (uint256);
    function tokenToHlsSwapInput(uint256 tokensSold, uint256 minHls, uint256 deadline) external returns (uint256);
    function tokenToHlsSwapOutput(uint256 hlsBought, uint256 maxTokens, uint256 deadline) external returns (uint256);
    
    // Liquidity functions
    function addLiquidity(uint256 minLiquidity, uint256 maxTokens, uint256 deadline) external payable returns (uint256);
    function removeLiquidity(uint256 amount, uint256 minHls, uint256 minTokens, uint256 deadline) external returns (uint256, uint256);
    
    // Price functions
    function getInputPrice(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) external pure returns (uint256);
    function getOutputPrice(uint256 outputAmount, uint256 inputReserve, uint256 outputReserve) external pure returns (uint256);
    function getHlsToTokenInputPrice(uint256 hlsSold) external view returns (uint256);
    function getTokenToHlsInputPrice(uint256 tokensSold) external view returns (uint256);
    
    // Reserve functions
    function getHlsReserve() external view returns (uint256);
    function getTokenReserve() external view returns (uint256);
    function token() external view returns (address);
}