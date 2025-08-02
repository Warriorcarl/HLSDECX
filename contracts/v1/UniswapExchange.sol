// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UniswapExchange
 * @dev Uniswap V1 Exchange contract adapted for Helios Testnet
 * Uses HLS as the native currency instead of ETH
 */
contract UniswapExchange is ERC20, ReentrancyGuard {
    
    // Events
    event TokenPurchase(address indexed buyer, uint256 indexed hlsIn, uint256 indexed tokensOut);
    event HlsPurchase(address indexed buyer, uint256 indexed tokensIn, uint256 indexed hlsOut);
    event AddLiquidity(address indexed provider, uint256 indexed hlsAmount, uint256 indexed tokenAmount);
    event RemoveLiquidity(address indexed provider, uint256 indexed hlsAmount, uint256 indexed tokenAmount);
    
    IERC20 public immutable token;
    address public immutable factory;
    
    constructor(address _token) ERC20("Uniswap V1", "UNI-V1") {
        require(_token != address(0), "UniswapExchange: ZERO_ADDRESS");
        token = IERC20(_token);
        factory = msg.sender;
    }
    
    /**
     * @dev Get input price for HLS to token swap
     */
    function getInputPrice(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) 
        public 
        pure 
        returns (uint256) 
    {
        require(inputReserve > 0 && outputReserve > 0, "UniswapExchange: INSUFFICIENT_LIQUIDITY");
        uint256 inputAmountWithFee = inputAmount * 997;
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (inputReserve * 1000) + inputAmountWithFee;
        return numerator / denominator;
    }
    
    /**
     * @dev Get output price for token to HLS swap
     */
    function getOutputPrice(uint256 outputAmount, uint256 inputReserve, uint256 outputReserve) 
        public 
        pure 
        returns (uint256) 
    {
        require(inputReserve > 0 && outputReserve > 0, "UniswapExchange: INSUFFICIENT_LIQUIDITY");
        require(outputAmount < outputReserve, "UniswapExchange: INSUFFICIENT_OUTPUT_LIQUIDITY");
        uint256 numerator = inputReserve * outputAmount * 1000;
        uint256 denominator = (outputReserve - outputAmount) * 997;
        return (numerator / denominator) + 1;
    }
    
    /**
     * @dev Swap HLS for tokens with exact input
     */
    function hlsToTokenSwapInput(uint256 minTokens, uint256 deadline) 
        external 
        payable 
        nonReentrant 
        returns (uint256) 
    {
        require(deadline >= block.timestamp, "UniswapExchange: EXPIRED");
        require(msg.value > 0, "UniswapExchange: INSUFFICIENT_INPUT_AMOUNT");
        
        uint256 hlsReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 tokensBought = getInputPrice(msg.value, hlsReserve, tokenReserve);
        
        require(tokensBought >= minTokens, "UniswapExchange: INSUFFICIENT_OUTPUT_AMOUNT");
        require(token.transfer(msg.sender, tokensBought), "UniswapExchange: TRANSFER_FAILED");
        
        emit TokenPurchase(msg.sender, msg.value, tokensBought);
        return tokensBought;
    }
    
    /**
     * @dev Swap HLS for tokens with exact output
     */
    function hlsToTokenSwapOutput(uint256 tokensBought, uint256 deadline) 
        external 
        payable 
        nonReentrant 
        returns (uint256) 
    {
        require(deadline >= block.timestamp, "UniswapExchange: EXPIRED");
        require(tokensBought > 0, "UniswapExchange: INSUFFICIENT_OUTPUT_AMOUNT");
        
        uint256 hlsReserve = address(this).balance - msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 hlsSold = getOutputPrice(tokensBought, hlsReserve, tokenReserve);
        
        require(msg.value >= hlsSold, "UniswapExchange: INSUFFICIENT_INPUT_AMOUNT");
        uint256 hlsRefund = msg.value - hlsSold;
        
        if (hlsRefund > 0) {
            payable(msg.sender).transfer(hlsRefund);
        }
        
        require(token.transfer(msg.sender, tokensBought), "UniswapExchange: TRANSFER_FAILED");
        
        emit TokenPurchase(msg.sender, hlsSold, tokensBought);
        return hlsSold;
    }
    
    /**
     * @dev Swap tokens for HLS with exact input
     */
    function tokenToHlsSwapInput(uint256 tokensSold, uint256 minHls, uint256 deadline) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(deadline >= block.timestamp, "UniswapExchange: EXPIRED");
        require(tokensSold > 0 && minHls > 0, "UniswapExchange: INVALID_AMOUNT");
        
        uint256 hlsReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 hlsBought = getInputPrice(tokensSold, tokenReserve, hlsReserve);
        
        require(hlsBought >= minHls, "UniswapExchange: INSUFFICIENT_OUTPUT_AMOUNT");
        require(token.transferFrom(msg.sender, address(this), tokensSold), "UniswapExchange: TRANSFER_FROM_FAILED");
        
        payable(msg.sender).transfer(hlsBought);
        
        emit HlsPurchase(msg.sender, tokensSold, hlsBought);
        return hlsBought;
    }
    
    /**
     * @dev Swap tokens for HLS with exact output
     */
    function tokenToHlsSwapOutput(uint256 hlsBought, uint256 maxTokens, uint256 deadline) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(deadline >= block.timestamp, "UniswapExchange: EXPIRED");
        require(hlsBought > 0, "UniswapExchange: INSUFFICIENT_OUTPUT_AMOUNT");
        
        uint256 hlsReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 tokensSold = getOutputPrice(hlsBought, tokenReserve, hlsReserve);
        
        require(maxTokens >= tokensSold, "UniswapExchange: INSUFFICIENT_INPUT_AMOUNT");
        require(token.transferFrom(msg.sender, address(this), tokensSold), "UniswapExchange: TRANSFER_FROM_FAILED");
        
        payable(msg.sender).transfer(hlsBought);
        
        emit HlsPurchase(msg.sender, tokensSold, hlsBought);
        return tokensSold;
    }
    
    /**
     * @dev Add liquidity to the exchange
     */
    function addLiquidity(uint256 minLiquidity, uint256 maxTokens, uint256 deadline) 
        external 
        payable 
        nonReentrant 
        returns (uint256) 
    {
        require(deadline >= block.timestamp, "UniswapExchange: EXPIRED");
        require(maxTokens > 0 && msg.value > 0, "UniswapExchange: INVALID_AMOUNT");
        
        uint256 totalLiquidity = totalSupply();
        
        if (totalLiquidity > 0) {
            // Add liquidity proportionally
            require(minLiquidity > 0, "UniswapExchange: INSUFFICIENT_LIQUIDITY_MINTED");
            
            uint256 hlsReserve = address(this).balance - msg.value;
            uint256 tokenReserve = token.balanceOf(address(this));
            uint256 tokenAmount = (msg.value * tokenReserve) / hlsReserve + 1;
            uint256 liquidityMinted = (msg.value * totalLiquidity) / hlsReserve;
            
            require(maxTokens >= tokenAmount, "UniswapExchange: INSUFFICIENT_TOKEN_AMOUNT");
            require(liquidityMinted >= minLiquidity, "UniswapExchange: INSUFFICIENT_LIQUIDITY_MINTED");
            
            require(token.transferFrom(msg.sender, address(this), tokenAmount), "UniswapExchange: TRANSFER_FROM_FAILED");
            _mint(msg.sender, liquidityMinted);
            
            emit AddLiquidity(msg.sender, msg.value, tokenAmount);
            return liquidityMinted;
            
        } else {
            // Initial liquidity
            require(factory != address(0), "UniswapExchange: INVALID_FACTORY");
            require(msg.value >= 1000000000, "UniswapExchange: INVALID_VALUE"); // Min 1 Gwei
            
            require(token.transferFrom(msg.sender, address(this), maxTokens), "UniswapExchange: TRANSFER_FROM_FAILED");
            uint256 initialLiquidity = address(this).balance;
            _mint(msg.sender, initialLiquidity);
            
            emit AddLiquidity(msg.sender, msg.value, maxTokens);
            return initialLiquidity;
        }
    }
    
    /**
     * @dev Remove liquidity from the exchange
     */
    function removeLiquidity(uint256 amount, uint256 minHls, uint256 minTokens, uint256 deadline) 
        external 
        nonReentrant 
        returns (uint256, uint256) 
    {
        require(deadline >= block.timestamp, "UniswapExchange: EXPIRED");
        require(amount > 0 && minHls > 0 && minTokens > 0, "UniswapExchange: INVALID_AMOUNT");
        
        uint256 totalLiquidity = totalSupply();
        require(totalLiquidity > 0, "UniswapExchange: NO_LIQUIDITY");
        
        uint256 hlsAmount = (amount * address(this).balance) / totalLiquidity;
        uint256 tokenAmount = (amount * token.balanceOf(address(this))) / totalLiquidity;
        
        require(hlsAmount >= minHls, "UniswapExchange: INSUFFICIENT_HLS_AMOUNT");
        require(tokenAmount >= minTokens, "UniswapExchange: INSUFFICIENT_TOKEN_AMOUNT");
        
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(hlsAmount);
        require(token.transfer(msg.sender, tokenAmount), "UniswapExchange: TRANSFER_FAILED");
        
        emit RemoveLiquidity(msg.sender, hlsAmount, tokenAmount);
        return (hlsAmount, tokenAmount);
    }
    
    /**
     * @dev Get HLS reserve
     */
    function getHlsReserve() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get token reserve
     */
    function getTokenReserve() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    /**
     * @dev Get price to buy tokens with HLS
     */
    function getHlsToTokenInputPrice(uint256 hlsSold) external view returns (uint256) {
        require(hlsSold > 0, "UniswapExchange: INVALID_AMOUNT");
        uint256 hlsReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));
        return getInputPrice(hlsSold, hlsReserve, tokenReserve);
    }
    
    /**
     * @dev Get price to buy HLS with tokens
     */
    function getTokenToHlsInputPrice(uint256 tokensSold) external view returns (uint256) {
        require(tokensSold > 0, "UniswapExchange: INVALID_AMOUNT");
        uint256 hlsReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));
        return getInputPrice(tokensSold, tokenReserve, hlsReserve);
    }
}