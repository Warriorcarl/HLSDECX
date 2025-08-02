// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../interfaces/IUniswapV2Pair.sol';
import '../interfaces/IUniswapV2Factory.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title PriceFeed
 * @dev Price oracle using Uniswap V2 TWAP (Time-Weighted Average Price)
 * Provides price feeds for tokens against WDEX (HLS)
 */
contract PriceFeed is Ownable {
    struct PriceData {
        uint256 price0CumulativeLast;
        uint256 price1CumulativeLast;
        uint32 blockTimestampLast;
        uint256 price; // Latest calculated price
        bool isToken0; // True if token is token0 in the pair
    }

    // Mapping from token address to price data
    mapping(address => PriceData) public priceData;
    
    // Uniswap V2 Factory address
    address public immutable factory;
    
    // WDEX address (base currency)
    address public immutable WDEX;
    
    // Minimum time period for TWAP calculation (default 1 hour)
    uint32 public minimumPeriod = 3600;
    
    // Maximum allowed price deviation (default 10% = 1000 basis points)
    uint256 public maxPriceDeviation = 1000;
    
    // Price staleness threshold (default 24 hours)
    uint32 public stalenessThreshold = 86400;

    event PriceUpdated(address indexed token, uint256 price, uint32 timestamp);
    event PeriodUpdated(uint32 newPeriod);
    event DeviationUpdated(uint256 newDeviation);

    constructor(address _factory, address _WDEX) Ownable(msg.sender) {
        factory = _factory;
        WDEX = _WDEX;
    }

    /**
     * @dev Initialize price feed for a token
     * @param token Token address to create price feed for
     */
    function initializePriceFeed(address token) external {
        require(token != WDEX, "PriceFeed: Cannot create feed for WDEX");
        require(priceData[token].blockTimestampLast == 0, "PriceFeed: Already initialized");
        
        address pair = IUniswapV2Factory(factory).getPair(token, WDEX);
        require(pair != address(0), "PriceFeed: Pair does not exist");
        
        // Get initial cumulative prices
        uint256 price0Cumulative = IUniswapV2Pair(pair).price0CumulativeLast();
        uint256 price1Cumulative = IUniswapV2Pair(pair).price1CumulativeLast();
        (, , uint32 blockTimestamp) = IUniswapV2Pair(pair).getReserves();
        
        // Determine if token is token0 or token1
        bool isToken0 = IUniswapV2Pair(pair).token0() == token;
        
        priceData[token] = PriceData({
            price0CumulativeLast: price0Cumulative,
            price1CumulativeLast: price1Cumulative,
            blockTimestampLast: blockTimestamp,
            price: 0, // Will be set after first update
            isToken0: isToken0
        });
    }

    /**
     * @dev Update price for a token using TWAP
     * @param token Token address to update price for
     */
    function updatePrice(address token) external {
        PriceData storage data = priceData[token];
        require(data.blockTimestampLast > 0, "PriceFeed: Not initialized");
        
        address pair = IUniswapV2Factory(factory).getPair(token, WDEX);
        
        uint256 price0Cumulative = IUniswapV2Pair(pair).price0CumulativeLast();
        uint256 price1Cumulative = IUniswapV2Pair(pair).price1CumulativeLast();
        (, , uint32 blockTimestamp) = IUniswapV2Pair(pair).getReserves();
        
        uint32 timeElapsed = blockTimestamp - data.blockTimestampLast;
        require(timeElapsed >= minimumPeriod, "PriceFeed: Period too short");
        
        uint256 newPrice;
        if (data.isToken0) {
            // token is token0, so we want price1 (WDEX per token)
            newPrice = (price1Cumulative - data.price1CumulativeLast) / timeElapsed;
        } else {
            // token is token1, so we want price0 (WDEX per token)
            newPrice = (price0Cumulative - data.price0CumulativeLast) / timeElapsed;
        }
        
        // Check for reasonable price deviation (if not first update)
        if (data.price > 0) {
            uint256 deviation = _calculateDeviation(data.price, newPrice);
            require(deviation <= maxPriceDeviation, "PriceFeed: Price deviation too high");
        }
        
        // Update stored data
        data.price0CumulativeLast = price0Cumulative;
        data.price1CumulativeLast = price1Cumulative;
        data.blockTimestampLast = blockTimestamp;
        data.price = newPrice;
        
        emit PriceUpdated(token, newPrice, blockTimestamp);
    }

    /**
     * @dev Get current price for a token in WDEX
     * @param token Token address
     * @return price Price in WDEX (scaled by 2^112)
     * @return lastUpdate Timestamp of last update
     */
    function getPrice(address token) external view returns (uint256 price, uint32 lastUpdate) {
        PriceData memory data = priceData[token];
        require(data.blockTimestampLast > 0, "PriceFeed: Not initialized");
        require(
            block.timestamp - data.blockTimestampLast <= stalenessThreshold,
            "PriceFeed: Price is stale"
        );
        
        return (data.price, data.blockTimestampLast);
    }

    /**
     * @dev Get current price in USD terms (assuming HLS = $10,000)
     * @param token Token address
     * @return priceInUSD Price in USD (scaled by 10^18)
     */
    function getPriceInUSD(address token) external view returns (uint256 priceInUSD) {
        (uint256 priceInWDEX, ) = this.getPrice(token);
        // Convert from WDEX to USD: priceInWDEX * $10,000
        // Note: This assumes WDEX price is fixed at $10,000
        priceInUSD = (priceInWDEX * 10000 * 1e18) / (2**112);
    }

    /**
     * @dev Get spot price (current reserves ratio) for comparison
     * @param token Token address
     * @return spotPrice Current spot price from reserves
     */
    function getSpotPrice(address token) external view returns (uint256 spotPrice) {
        address pair = IUniswapV2Factory(factory).getPair(token, WDEX);
        require(pair != address(0), "PriceFeed: Pair does not exist");
        
        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();
        bool isToken0 = IUniswapV2Pair(pair).token0() == token;
        
        if (isToken0) {
            spotPrice = (uint256(reserve1) * 2**112) / uint256(reserve0);
        } else {
            spotPrice = (uint256(reserve0) * 2**112) / uint256(reserve1);
        }
    }

    /**
     * @dev Calculate percentage deviation between two prices
     */
    function _calculateDeviation(uint256 oldPrice, uint256 newPrice) internal pure returns (uint256) {
        uint256 diff = oldPrice > newPrice ? oldPrice - newPrice : newPrice - oldPrice;
        return (diff * 10000) / oldPrice; // Return in basis points
    }

    // Admin functions
    function setMinimumPeriod(uint32 _period) external onlyOwner {
        require(_period > 0, "PriceFeed: Invalid period");
        minimumPeriod = _period;
        emit PeriodUpdated(_period);
    }

    function setMaxPriceDeviation(uint256 _deviation) external onlyOwner {
        require(_deviation > 0 && _deviation <= 5000, "PriceFeed: Invalid deviation"); // Max 50%
        maxPriceDeviation = _deviation;
        emit DeviationUpdated(_deviation);
    }

    function setStalenessThreshold(uint32 _threshold) external onlyOwner {
        require(_threshold > 0, "PriceFeed: Invalid threshold");
        stalenessThreshold = _threshold;
    }
}