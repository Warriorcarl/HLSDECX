// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Multicall
 * @dev Allows batching multiple contract calls into a single transaction
 * Optimized for Helios Testnet
 */
contract Multicall {
    struct Call {
        address target;
        bytes callData;
    }

    struct CallWithValue {
        address target;
        uint256 value;
        bytes callData;
    }

    /**
     * @dev Executes multiple calls in a single transaction
     * @param calls Array of Call structs containing target address and call data
     * @return blockNumber The block number when the calls were executed
     * @return returnData Array of return data from each call
     */
    function aggregate(Call[] calldata calls)
        external
        payable
        returns (uint256 blockNumber, bytes[] memory returnData)
    {
        blockNumber = block.number;
        returnData = new bytes[](calls.length);
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call(calls[i].callData);
            require(success, "Multicall: call failed");
            returnData[i] = ret;
        }
    }

    /**
     * @dev Executes multiple calls with HLS value in a single transaction
     * @param calls Array of CallWithValue structs containing target address, value, and call data
     * @return blockNumber The block number when the calls were executed
     * @return returnData Array of return data from each call
     */
    function aggregateWithValue(CallWithValue[] calldata calls)
        external
        payable
        returns (uint256 blockNumber, bytes[] memory returnData)
    {
        blockNumber = block.number;
        returnData = new bytes[](calls.length);
        uint256 totalValue = 0;
        
        // Calculate total value needed
        for (uint256 i = 0; i < calls.length; i++) {
            totalValue += calls[i].value;
        }
        require(msg.value >= totalValue, "Multicall: insufficient HLS sent");
        
        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory ret) = calls[i].target.call{value: calls[i].value}(calls[i].callData);
            require(success, "Multicall: call failed");
            returnData[i] = ret;
        }
        
        // Refund excess HLS
        if (msg.value > totalValue) {
            payable(msg.sender).transfer(msg.value - totalValue);
        }
    }

    /**
     * @dev Executes multiple calls but doesn't revert if any call fails
     * @param calls Array of Call structs containing target address and call data
     * @return blockNumber The block number when the calls were executed
     * @return returnData Array of return data from each call (empty if failed)
     * @return success Array of success status for each call
     */
    function tryAggregate(Call[] calldata calls)
        external
        payable
        returns (
            uint256 blockNumber,
            bytes[] memory returnData,
            bool[] memory success
        )
    {
        blockNumber = block.number;
        returnData = new bytes[](calls.length);
        success = new bool[](calls.length);
        
        for (uint256 i = 0; i < calls.length; i++) {
            (success[i], returnData[i]) = calls[i].target.call(calls[i].callData);
        }
    }

    /**
     * @dev Gets basic blockchain information
     * @return blockNumber Current block number
     * @return blockHash Current block hash  
     * @return blockTimestamp Current block timestamp
     * @return chainId Current chain ID (should be 42000 for Helios)
     */
    function getBlockInfo()
        external
        view
        returns (
            uint256 blockNumber,
            bytes32 blockHash,
            uint256 blockTimestamp,
            uint256 chainId
        )
    {
        blockNumber = block.number;
        blockHash = blockhash(block.number);
        blockTimestamp = block.timestamp;
        chainId = block.chainid;
    }

    /**
     * @dev Gets the HLS balance of an address
     * @param account The address to check
     * @return balance The HLS balance
     */
    function getEthBalance(address account) external view returns (uint256 balance) {
        balance = account.balance;
    }

    /**
     * @dev Gets multiple HLS balances at once
     * @param accounts Array of addresses to check
     * @return balances Array of HLS balances
     */
    function getEthBalances(address[] calldata accounts)
        external
        view
        returns (uint256[] memory balances)
    {
        balances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            balances[i] = accounts[i].balance;
        }
    }

    // Allow contract to receive HLS
    receive() external payable {}
    fallback() external payable {}
}