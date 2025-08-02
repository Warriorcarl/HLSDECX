# Helios DEX - Complete Uniswap V1/V2 Implementation

A comprehensive DeFi ecosystem implementation for Helios Testnet, including Uniswap V1/V2 compatible contracts, test tokens, staking mechanisms, and utility contracts.

## 🌟 Features

- **Uniswap V2 Core & Periphery**: Factory, Pair, Router02 adapted for HLS (Helios native token)
- **WDEX Token**: Wrapped DEX token for HLS (similar to WETH)
- **Test Tokens**: USDT, USDC, DAI, BTC, SOL, BNB, ETH with faucet functionality
- **Staking Contracts**: LP token staking with HLS rewards
- **Utility Contracts**: Multicall, PriceFeed with TWAP oracle
- **HLS Native Support**: All swap functions adapted for `swapExactHLSForTokens`

## 🔧 Helios Testnet Configuration

- **Network**: Helios Testnet
- **Chain ID**: 42000
- **RPC URL**: https://testnet1.helioschainlabs.org/
- **Explorer**: https://explorer.helioschainlabs.org/
- **Native Token**: HLS (Helios), 18 decimals
- **HLS Price**: $10,000 USD

## 📁 Project Structure

```
contracts/
├── v2/
│   ├── core/
│   │   ├── UniswapV2Factory.sol
│   │   └── UniswapV2Pair.sol
│   └── periphery/
│       └── UniswapV2Router02.sol
├── tokens/
│   ├── WDEX.sol
│   ├── BaseTestToken.sol
│   └── Test*.sol (USDT, USDC, DAI, BTC, SOL, BNB, ETH)
├── staking/
│   └── LPStaking.sol
├── utils/
│   ├── Multicall.sol
│   └── PriceFeed.sol
└── interfaces/

scripts/
├── deploy/
│   ├── 01-deploy-tokens.js
│   ├── 03-deploy-v2.js
│   ├── 06-deploy-utils.js
│   └── deploy-all.js
└── initialize/
    └── init-pools-v2.js

test/
└── tokens/
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
INITIALIZE_POOLS=true  # Set to true to initialize pools with liquidity
```

### Deployment

#### Deploy All Contracts

```bash
# Deploy to Helios Testnet
npx hardhat run scripts/deploy/deploy-all.js --network helios

# Deploy to local network for testing
npx hardhat run scripts/deploy/deploy-all.js --network hardhat
```

#### Step-by-Step Deployment

```bash
# 1. Deploy tokens (WDEX + test tokens)
npx hardhat run scripts/deploy/01-deploy-tokens.js --network helios

# 2. Deploy Uniswap V2
npx hardhat run scripts/deploy/03-deploy-v2.js --network helios

# 3. Deploy utilities
npx hardhat run scripts/deploy/06-deploy-utils.js --network helios

# 4. Initialize pools (requires HLS balance)
npx hardhat run scripts/initialize/init-pools-v2.js --network helios
```

### Testing

```bash
# Run all tests
npx hardhat test

# Run specific test files
npx hardhat test test/tokens/WDEX.test.js
npx hardhat test test/tokens/TestTokens.test.js
```

## 📋 Contract Addresses

After deployment, addresses are saved in `./deployments/`:

- `tokens.json` - WDEX and test token addresses
- `uniswap-v2.json` - Factory and Router addresses
- `utils.json` - Utility contract addresses
- `pairs.json` - Trading pair addresses
- `summary.json` - Complete deployment summary

## 🔄 Key Functions

### WDEX (Wrapped DEX)

```solidity
// Wrap HLS to WDEX
function deposit() external payable

// Unwrap WDEX to HLS
function withdraw(uint256 amount) external
```

### Test Tokens

```solidity
// Get free tokens (1000 tokens, 24h cooldown)
function faucet() external

// Admin mint (owner only)
function adminFaucet(address to, uint256 amount) external
```

### Uniswap V2 Router

```solidity
// Swap HLS for tokens (key function for Helios)
function swapExactHLSForTokens(
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external payable

// Add liquidity with HLS
function addLiquidityETH(
    address token,
    uint amountTokenDesired,
    uint amountTokenMin,
    uint amountETHMin,
    address to,
    uint deadline
) external payable
```

## 💰 Token Economics

### Initial Supplies
- **USDT**: 1,000,000 (6 decimals)
- **USDC**: 1,000,000 (6 decimals)
- **DAI**: 1,000,000 (18 decimals)
- **BTC**: 21,000 (8 decimals)
- **SOL**: 500,000,000 (9 decimals)
- **BNB**: 200,000,000 (18 decimals)
- **ETH**: 120,000,000 (18 decimals)

### Faucet Amounts
- **All tokens**: 1,000 tokens per request
- **Cooldown**: 24 hours
- **Admin override**: No cooldown for contract owner

## 🏊 Liquidity Pools

Default pools created with $100,000 initial liquidity each:

- USDT/WDEX
- USDC/WDEX  
- DAI/WDEX
- BTC/WDEX
- SOL/WDEX
- BNB/WDEX
- ETH/WDEX

## 📊 Price Oracle

The `PriceFeed` contract provides TWAP (Time-Weighted Average Price) using Uniswap V2 pairs:

```solidity
// Get token price in WDEX
function getPrice(address token) external view returns (uint256 price, uint32 lastUpdate)

// Get token price in USD (assuming HLS = $10,000)
function getPriceInUSD(address token) external view returns (uint256 priceInUSD)
```

## 🥩 Staking

LP token staking with customizable rewards:

```solidity
// Stake LP tokens
function deposit(uint256 _pid, uint256 _amount) external

// Withdraw LP tokens and claim rewards
function withdraw(uint256 _pid, uint256 _amount) external

// View pending rewards
function pendingReward(uint256 _pid, address _user) external view returns (uint256)
```

## 🛠️ Utility Contracts

### Multicall
Batch multiple contract calls in a single transaction:

```solidity
function aggregate(Call[] calldata calls) external payable
function aggregateWithValue(CallWithValue[] calldata calls) external payable
```

## 🔐 Security Features

- **Pausable tokens**: Emergency pause functionality
- **Blacklist**: Prevent malicious addresses from trading
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Access Control**: Owner-only admin functions
- **Emergency withdrawals**: Emergency LP token withdrawal with fees

## 🧪 Development

### Local Testing

```bash
# Start local node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy/deploy-all.js --network localhost
```

### Verification on Helios Explorer

Deployment scripts generate verification JSON files in `./deployments/verification/` for manual verification on the Helios explorer.

## 📚 Documentation

- [Hardhat Documentation](https://hardhat.org/docs)
- [Uniswap V2 Documentation](https://docs.uniswap.org/protocol/V2/introduction)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## ⚠️ Disclaimer

This project is for educational and testing purposes on Helios Testnet. Do not use in production without thorough security audits.

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ for the Helios ecosystem
