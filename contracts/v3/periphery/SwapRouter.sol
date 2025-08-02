// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Uniswap V3 Swap Router
/// @notice Router for stateless execution of swaps against Uniswap V3
contract SwapRouter is ReentrancyGuard {
    
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    address public immutable factory;
    address public immutable WDEX; // WDEX for HLS wrapping

    modifier checkDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, 'Transaction too old');
        _;
    }

    constructor(address _factory, address _WDEX) {
        factory = _factory;
        WDEX = _WDEX;
    }

    receive() external payable {
        require(msg.sender == WDEX, 'Not WDEX');
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {
        // For HLS input, wrap to WDEX first
        if (params.tokenIn == WDEX && msg.value > 0) {
            require(params.amountIn == msg.value, 'Inconsistent HLS amount');
            // Wrap HLS to WDEX
            (bool success,) = WDEX.call{value: msg.value}("");
            require(success, 'WDEX deposit failed');
        } else {
            require(msg.value == 0, 'Unexpected HLS sent');
            // Transfer token from user
            IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        }

        // Simple mock swap logic - in real V3, this would interact with pools
        // For now, return a simple calculation based on input amount
        amountOut = (params.amountIn * 997) / 1000; // 0.3% fee
        require(amountOut >= params.amountOutMinimum, 'Too little received');

        // Transfer output token to recipient
        if (params.tokenOut == WDEX && params.recipient != address(this)) {
            // Unwrap WDEX to HLS if needed
            (bool success,) = WDEX.call(abi.encodeWithSignature("withdraw(uint256)", amountOut));
            require(success, 'WDEX withdrawal failed');
            payable(params.recipient).transfer(amountOut);
        } else {
            IERC20(params.tokenOut).transfer(params.recipient, amountOut);
        }

        return amountOut;
    }

    /// @notice Swaps as little as possible of one token for `amountOut` of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactOutputSingleParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutputSingle(ExactOutputSingleParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountIn)
    {
        // Simple mock calculation - in real V3, this would be more complex
        amountIn = (params.amountOut * 1000) / 997; // Reverse of 0.3% fee
        require(amountIn <= params.amountInMaximum, 'Too much requested');

        // Handle HLS input
        if (params.tokenIn == WDEX && msg.value > 0) {
            require(msg.value >= amountIn, 'Insufficient HLS sent');
            // Wrap HLS to WDEX
            (bool success,) = WDEX.call{value: amountIn}("");
            require(success, 'WDEX deposit failed');
            
            // Refund excess HLS
            if (msg.value > amountIn) {
                payable(msg.sender).transfer(msg.value - amountIn);
            }
        } else {
            require(msg.value == 0, 'Unexpected HLS sent');
            IERC20(params.tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }

        // Transfer exact output amount
        if (params.tokenOut == WDEX && params.recipient != address(this)) {
            // Unwrap WDEX to HLS if needed
            (bool success,) = WDEX.call(abi.encodeWithSignature("withdraw(uint256)", params.amountOut));
            require(success, 'WDEX withdrawal failed');
            payable(params.recipient).transfer(params.amountOut);
        } else {
            IERC20(params.tokenOut).transfer(params.recipient, params.amountOut);
        }

        return amountIn;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInput(ExactInputParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {
        // Simplified multi-hop implementation
        // In a real implementation, this would decode the path and execute multiple swaps
        
        // For now, just apply the fee multiple times based on path length
        uint256 pathLength = params.path.length / 23; // Each hop is ~23 bytes (address + fee)
        amountOut = params.amountIn;
        
        for (uint i = 0; i < pathLength; i++) {
            amountOut = (amountOut * 997) / 1000; // 0.3% fee per hop
        }
        
        require(amountOut >= params.amountOutMinimum, 'Too little received');
        
        // Transfer output to recipient (simplified)
        return amountOut;
    }

    /// @notice Swaps as little as possible of one token for `amountOut` of another along the specified path (reversed)
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactOutputParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutput(ExactOutputParams calldata params)
        external
        payable
        checkDeadline(params.deadline)
        returns (uint256 amountIn)
    {
        // Simplified multi-hop implementation
        uint256 pathLength = params.path.length / 23;
        amountIn = params.amountOut;
        
        for (uint i = 0; i < pathLength; i++) {
            amountIn = (amountIn * 1000) / 997; // Reverse fee calculation
        }
        
        require(amountIn <= params.amountInMaximum, 'Too much requested');
        
        return amountIn;
    }

    /// @notice Unwraps the contract's WDEX balance and sends it to recipient as HLS.
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing WDEX from users.
    function unwrapWDEX(uint256 amountMinimum, address recipient) external payable {
        uint256 balanceWDEX = IERC20(WDEX).balanceOf(address(this));
        require(balanceWDEX >= amountMinimum, 'Insufficient WDEX');

        if (balanceWDEX > 0) {
            (bool success,) = WDEX.call(abi.encodeWithSignature("withdraw(uint256)", balanceWDEX));
            require(success, 'WDEX withdrawal failed');
            payable(recipient).transfer(balanceWDEX);
        }
    }

    /// @notice Refunds any HLS balance held by this contract to the `msg.sender`
    /// @dev Useful for recovering HLS sent to the contract in an invalid transaction
    function refundHLS() external payable {
        if (address(this).balance > 0) payable(msg.sender).transfer(address(this).balance);
    }

    /// @notice Transfers the full amount of a token held by this contract to recipient
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing the token from users
    function sweepToken(
        address token,
        uint256 amountMinimum,
        address recipient
    ) external payable {
        uint256 balanceToken = IERC20(token).balanceOf(address(this));
        require(balanceToken >= amountMinimum, 'Insufficient token');

        if (balanceToken > 0) {
            IERC20(token).transfer(recipient, balanceToken);
        }
    }
}