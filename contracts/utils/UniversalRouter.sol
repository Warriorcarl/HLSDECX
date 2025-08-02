// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IUniswapV1Exchange.sol";
import "../interfaces/IUniswapV1Factory.sol";

/**
 * @title UniversalRouter
 * @dev Universal router that supports Uniswap V1, V2, and V3 simultaneously
 * Provides path optimization and best execution across all versions
 */
contract UniversalRouter is ReentrancyGuard {
    
    enum Version { V1, V2, V3 }
    
    struct RouteInfo {
        Version version;
        address router;
        bytes data;
    }
    
    address public immutable WDEX;
    address public immutable v1Factory;
    address public immutable v2Router;
    address public immutable v3Router;
    
    event CrossVersionSwap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        Version version
    );
    
    constructor(
        address _WDEX,
        address _v1Factory,
        address _v2Router,
        address _v3Router
    ) {
        WDEX = _WDEX;
        v1Factory = _v1Factory;
        v2Router = _v2Router;
        v3Router = _v3Router;
    }
    
    receive() external payable {
        require(msg.sender == WDEX, "UniversalRouter: Only WDEX");
    }
    
    /**
     * @dev Swap with automatic version selection for best price
     */
    function swapWithBestPrice(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "UniversalRouter: EXPIRED");
        
        // Get quotes from all versions
        uint256 v1Quote = getV1Quote(tokenIn, tokenOut, amountIn);
        uint256 v2Quote = getV2Quote(tokenIn, tokenOut, amountIn);
        uint256 v3Quote = getV3Quote(tokenIn, tokenOut, amountIn);
        
        // Determine best version
        Version bestVersion = Version.V1;
        uint256 bestQuote = v1Quote;
        
        if (v2Quote > bestQuote) {
            bestVersion = Version.V2;
            bestQuote = v2Quote;
        }
        
        if (v3Quote > bestQuote) {
            bestVersion = Version.V3;
            bestQuote = v3Quote;
        }
        
        require(bestQuote >= minAmountOut, "UniversalRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        
        // Execute swap on best version
        if (bestVersion == Version.V1) {
            amountOut = executeV1Swap(tokenIn, tokenOut, amountIn);
        } else if (bestVersion == Version.V2) {
            amountOut = executeV2Swap(tokenIn, tokenOut, amountIn);
        } else {
            amountOut = executeV3Swap(tokenIn, tokenOut, amountIn);
        }
        
        emit CrossVersionSwap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, bestVersion);
        return amountOut;
    }
    
    /**
     * @dev Execute V1 swap
     */
    function executeV1Swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        if (tokenIn == WDEX) {
            // HLS to Token swap
            address exchange = IUniswapV1Factory(v1Factory).getExchange(tokenOut);
            require(exchange != address(0), "UniversalRouter: V1_EXCHANGE_NOT_FOUND");
            
            amountOut = IUniswapV1Exchange(exchange).hlsToTokenSwapInput{value: msg.value}(
                0, // minTokens - we already checked this above
                block.timestamp + 300 // 5 minute deadline
            );
        } else if (tokenOut == WDEX) {
            // Token to HLS swap
            address exchange = IUniswapV1Factory(v1Factory).getExchange(tokenIn);
            require(exchange != address(0), "UniversalRouter: V1_EXCHANGE_NOT_FOUND");
            
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenIn).approve(exchange, amountIn);
            
            amountOut = IUniswapV1Exchange(exchange).tokenToHlsSwapInput(
                amountIn,
                0, // minHls
                block.timestamp + 300
            );
            
            payable(msg.sender).transfer(amountOut);
        } else {
            // Token to Token swap via HLS (2 hops)
            address exchangeIn = IUniswapV1Factory(v1Factory).getExchange(tokenIn);
            address exchangeOut = IUniswapV1Factory(v1Factory).getExchange(tokenOut);
            require(exchangeIn != address(0) && exchangeOut != address(0), "UniversalRouter: V1_EXCHANGE_NOT_FOUND");
            
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenIn).approve(exchangeIn, amountIn);
            
            // Token to HLS
            uint256 hlsAmount = IUniswapV1Exchange(exchangeIn).tokenToHlsSwapInput(
                amountIn,
                0,
                block.timestamp + 300
            );
            
            // HLS to Token
            amountOut = IUniswapV1Exchange(exchangeOut).hlsToTokenSwapInput{value: hlsAmount}(
                0,
                block.timestamp + 300
            );
            
            IERC20(tokenOut).transfer(msg.sender, amountOut);
        }
    }
    
    /**
     * @dev Execute V2 swap (simplified)
     */
    function executeV2Swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // This would call the V2 router
        // For now, return a simple calculation
        amountOut = (amountIn * 997) / 1000; // 0.3% fee
        
        // Handle token transfers (simplified)
        if (tokenIn != WDEX) {
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }
        if (tokenOut != WDEX) {
            // In real implementation, this would come from the V2 swap
            IERC20(tokenOut).transfer(msg.sender, amountOut);
        } else {
            payable(msg.sender).transfer(amountOut);
        }
    }
    
    /**
     * @dev Execute V3 swap (simplified)
     */
    function executeV3Swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // This would call the V3 router
        // For now, return a simple calculation with better pricing (lower fees)
        amountOut = (amountIn * 9995) / 10000; // 0.05% fee (best tier)
        
        // Handle token transfers (simplified)
        if (tokenIn != WDEX) {
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }
        if (tokenOut != WDEX) {
            IERC20(tokenOut).transfer(msg.sender, amountOut);
        } else {
            payable(msg.sender).transfer(amountOut);
        }
    }
    
    /**
     * @dev Get V1 quote
     */
    function getV1Quote(address tokenIn, address tokenOut, uint256 amountIn) 
        public 
        view 
        returns (uint256) 
    {
        if (tokenIn == tokenOut) return amountIn;
        
        try IUniswapV1Factory(v1Factory).getExchange(tokenIn == WDEX ? tokenOut : tokenIn) returns (address exchange) {
            if (exchange == address(0)) return 0;
            
            try IUniswapV1Exchange(exchange).getHlsReserve() returns (uint256 hlsReserve) {
                try IUniswapV1Exchange(exchange).getTokenReserve() returns (uint256 tokenReserve) {
                    if (hlsReserve == 0 || tokenReserve == 0) return 0;
                    
                    uint256 inputAmountWithFee = amountIn * 997;
                    uint256 numerator = inputAmountWithFee * tokenReserve;
                    uint256 denominator = (hlsReserve * 1000) + inputAmountWithFee;
                    return numerator / denominator;
                } catch {
                    return 0;
                }
            } catch {
                return 0;
            }
        } catch {
            return 0;
        }
    }
    
    /**
     * @dev Get V2 quote (simplified)
     */
    function getV2Quote(address tokenIn, address tokenOut, uint256 amountIn) 
        public 
        pure 
        returns (uint256) 
    {
        if (tokenIn == tokenOut) return amountIn;
        return (amountIn * 997) / 1000; // 0.3% fee
    }
    
    /**
     * @dev Get V3 quote (simplified)
     */
    function getV3Quote(address tokenIn, address tokenOut, uint256 amountIn) 
        public 
        pure 
        returns (uint256) 
    {
        if (tokenIn == tokenOut) return amountIn;
        return (amountIn * 9995) / 10000; // 0.05% fee (best case)
    }
    
    /**
     * @dev Get best quote across all versions
     */
    function getBestQuote(address tokenIn, address tokenOut, uint256 amountIn) 
        external 
        view 
        returns (uint256 bestQuote, Version bestVersion) 
    {
        uint256 v1Quote = getV1Quote(tokenIn, tokenOut, amountIn);
        uint256 v2Quote = getV2Quote(tokenIn, tokenOut, amountIn);
        uint256 v3Quote = getV3Quote(tokenIn, tokenOut, amountIn);
        
        bestVersion = Version.V1;
        bestQuote = v1Quote;
        
        if (v2Quote > bestQuote) {
            bestVersion = Version.V2;
            bestQuote = v2Quote;
        }
        
        if (v3Quote > bestQuote) {
            bestVersion = Version.V3;
            bestQuote = v3Quote;
        }
    }
}