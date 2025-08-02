# Helios DEX - Complete Multi-Version Uniswap Implementation

A comprehensive DeFi ecosystem implementation for Helios Testnet, featuring complete Uniswap V1, V2, and V3 compatibility with native HLS token support, test tokens, staking mechanisms, and cross-version routing.

## 🌟 Features

### Multi-Version DEX Support
- **Uniswap V1**: Simple exchange contracts with direct HLS trading
- **Uniswap V2**: AMM with pair-based liquidity pools  
- **Uniswap V3**: Concentrated liquidity with multiple fee tiers
- **Universal Router**: Automatic best-price routing across all versions

### Native HLS Integration
- **Complete HLS Support**: All swap functions adapted for Helios native token
- **WDEX Token**: Wrapped DEX token for HLS (similar to WETH)
- **Cross-Version Compatibility**: Seamless HLS trading across V1, V2, and V3

### Advanced Features
- **7 Test Tokens**: USDT, USDC, DAI, BTC, SOL, BNB, ETH with faucet functionality
- **Multiple Fee Tiers**: 0.05%, 0.3%, and 1% for different pair types
- **LP Staking**: Stake LP tokens to earn HLS rewards
- **Price Oracles**: TWAP price feeds with V3 enhancement
- **Multicall Support**: Batch transactions for gas efficiency


## 🔧 Helios Testnet Configuration

- **Network**: Helios Testnet
- **Chain ID**: 42000
- **RPC URL**: https://testnet1.helioschainlabs.org/
- **Explorer**: https://explorer.helioschainlabs.org/
- **Native Token**: HLS (Helios), 18 decimals
- **HLS Target Price**: $10,000 USD


## 📁 Project Structure

```
contracts/
├── v1/
│   ├── UniswapFactory.sol          # V1 factory for creating exchanges
│   └── UniswapExchange.sol         # V1 exchange with HLS support
├── v2/                             # (from existing implementation)

├── v3/
│   ├── core/
│   │   ├── UniswapV3Factory.sol    # V3 factory with fee tiers
│   │   └── libraries/
│   │       ├── BitMath.sol
│   │       ├── FullMath.sol
│   │       └── TickMath.sol
│   └── periphery/
│       └── SwapRouter.sol          # V3 swap router with HLS support
├── tokens/
│   ├── WDEX.sol                    # Wrapped DEX (HLS wrapper)
│   └── Test*.sol                   # Test tokens with faucets
├── utils/
│   ├── UniversalRouter.sol         # Cross-version router
│   ├── Multicall.sol               # Batch transaction utility
│   └── PriceFeed.sol               # TWAP price oracle
└── interfaces/                     # Contract interfaces

scripts/
├── deploy/
│   ├── 01-deploy-tokens.js         # Deploy WDEX and test tokens
│   ├── 02-deploy-v1.js             # Deploy V1 factory and exchanges
│   ├── 03-deploy-v2.js             # Deploy V2 contracts
│   ├── 04-deploy-v3-core.js        # Deploy V3 factory
│   ├── 05-deploy-v3-periphery.js   # Deploy V3 periphery
│   ├── 06-deploy-utils.js          # Deploy utilities
│   ├── 07-deploy-universal-router.js # Deploy universal router
│   └── deploy-all.js               # Deploy all contracts
├── initialize/
│   ├── init-pools-v1.js            # Initialize V1 exchanges
│   ├── init-pools-v2.js            # Initialize V2 pairs
│   └── init-pools-v3.js            # Initialize V3 pools
└── generate/
    └── generate-abi-bytecode.js     # Generate ABI exports

test/
├── v1/                             # V1 tests
├── v2/                             # V2 tests  
├── v3/                             # V3 tests
└── integration/                    # Cross-version tests

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

#### Deploy All Contracts (Recommended)

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

# 2. Deploy Uniswap V1
npx hardhat run scripts/deploy/02-deploy-v1.js --network helios

# 3. Deploy Uniswap V2
npx hardhat run scripts/deploy/03-deploy-v2.js --network helios

# 4. Deploy Uniswap V3 Core
npx hardhat run scripts/deploy/04-deploy-v3-core.js --network helios

# 5. Deploy Uniswap V3 Periphery
npx hardhat run scripts/deploy/05-deploy-v3-periphery.js --network helios

# 6. Deploy utilities
npx hardhat run scripts/deploy/06-deploy-utils.js --network helios

# 7. Deploy Universal Router
npx hardhat run scripts/deploy/07-deploy-universal-router.js --network helios
```

### Pool Initialization

```bash
# Initialize V1 exchanges with liquidity
npx hardhat run scripts/initialize/init-pools-v1.js --network helios

# Initialize V2 pairs
npx hardhat run scripts/initialize/init-pools-v2.js --network helios

# Initialize V3 pools
npx hardhat run scripts/initialize/init-pools-v3.js --network helios

```

### Testing

```bash
# Run all tests
npx hardhat test

# Run specific version tests
npx hardhat test test/v1/
npx hardhat test test/v3/core/
```

## 🔄 Key Contract Functions

### Uniswap V1 Exchange

```solidity
// Swap HLS for tokens
function hlsToTokenSwapInput(uint256 minTokens, uint256 deadline) external payable;

// Swap tokens for HLS
function tokenToHlsSwapInput(uint256 tokensSold, uint256 minHls, uint256 deadline) external;

// Add liquidity
function addLiquidity(uint256 minLiquidity, uint256 maxTokens, uint256 deadline) external payable;
```

### Uniswap V3 SwapRouter

```solidity
// Single-hop exact input swap
function exactInputSingle(ExactInputSingleParams calldata params) external payable;

// Single-hop exact output swap  
function exactOutputSingle(ExactOutputSingleParams calldata params) external payable;

// Multi-hop swaps
function exactInput(ExactInputParams calldata params) external payable;
function exactOutput(ExactOutputParams calldata params) external payable;
```

### Universal Router

```solidity
// Automatic best-price routing across V1, V2, V3
function swapWithBestPrice(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 deadline
) external payable;

// Get best quote across all versions
function getBestQuote(address tokenIn, address tokenOut, uint256 amountIn) 
    external view returns (uint256 bestQuote, Version bestVersion);
```

## 💰 Token Economics & Fee Tiers

### V1 Exchange Fees
- **0.3% trading fee** on all swaps
- Simple constant product formula: `x * y = k`

### V2 Pair Fees  
- **0.3% trading fee** on all swaps
- Automatic liquidity provider rewards

### V3 Pool Fee Tiers
- **0.05% (500)**: Stablecoin pairs (USDT/USDC, etc.)
- **0.30% (3000)**: Standard pairs (BTC/WDEX, ETH/WDEX)
- **1.00% (10000)**: Exotic pairs (SOL/WDEX, BNB/WDEX)

### Supported Trading Pairs

**Against WDEX (HLS):**
- USDT/WDEX, USDC/WDEX, DAI/WDEX (stablecoins)
- BTC/WDEX, ETH/WDEX (major cryptocurrencies)
- SOL/WDEX, BNB/WDEX (ecosystem tokens)

**Cross Pairs:**
- USDT/USDC (stablecoin pair)
- BTC/ETH (crypto majors)
- And more combinations

## 📊 Price Oracles & Liquidity

### TWAP Price Feeds
- **V2 Oracle**: Simple TWAP from V2 pairs
- **V3 Enhanced**: More accurate TWAP with concentrated liquidity
- **Fallback System**: V3 → V2 → V1 for price discovery

### Initial Liquidity
- **$100,000 initial liquidity** per trading pair
- **Automatic faucets**: 1,000 tokens per 24-hour period
- **Proportional reserves** based on token USD values

## 🛠️ Advanced Features

### Cross-Version Routing
The Universal Router automatically:
1. **Queries all versions** for best price
2. **Routes through optimal path** (V1, V2, or V3)
3. **Handles HLS wrapping/unwrapping** seamlessly
4. **Provides arbitrage protection** across versions

### Position Management (V3)
- **Concentrated liquidity positions** with custom ranges
- **NFT-based position tracking** (placeholder implementation)
- **Automated position management** utilities

### Staking & Rewards
- **LP token staking** with customizable reward rates
- **HLS rewards** for liquidity providers
- **Emergency withdrawal** with fees

## 🔐 Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks
- **Access Control**: Owner-only admin functions
- **Pausable Tokens**: Emergency pause functionality
- **Blacklist Support**: Prevent malicious addresses
- **Deadline Protection**: Time-bound transactions

## 🧪 Development & Testing

### Local Testing

```bash
# Start local node
npx hardhat node

# Deploy to local network
INITIALIZE_POOLS=true npx hardhat run scripts/deploy/deploy-all.js --network localhost

# Run comprehensive tests
npx hardhat test --network localhost
```

### Contract Verification
Deployment scripts generate verification JSON files in `./deployments/verification/` for manual verification on the Helios explorer.

### ABI Generation
```bash
# Generate JavaScript/TypeScript exports
npm run generate:abi

# Output includes organized exports by version:
# - contracts.v1.*
# - contracts.v2.*  
# - contracts.v3.*
```

## 📋 Contract Addresses

After deployment, addresses are saved in `./deployments/`:

- `tokens.json` - WDEX and test token addresses
- `uniswap-v1.json` - V1 factory and exchange addresses
- `uniswap-v2.json` - V2 factory and router addresses
- `uniswap-v3-core.json` - V3 factory and core contracts
- `uniswap-v3-periphery.json` - V3 router and periphery contracts
- `universal-router.json` - Universal router address
- `summary.json` - Complete deployment summary

## 📚 Implementation Notes

### Version Compatibility
- **Backward Compatible**: All V2 functionality remains unchanged
- **Native HLS**: Consistent HLS support across all versions
- **Gas Optimized**: Optimized for Helios Testnet gas costs
- **Exact Specifications**: Follows official Uniswap implementations

### V3 Concentrated Liquidity
- **Tick System**: Precise price ranges with tick spacing
- **Capital Efficiency**: Up to 4000x more capital efficient
- **Fee Collection**: Automatic fee collection for positions
- **Price Impact**: Reduced price impact for large trades

### Cross-Version Arbitrage
- **Price Discovery**: Automatic price balancing across versions
- **MEV Protection**: Built-in protection against MEV extraction
- **Slippage Minimization**: Optimal routing reduces slippage


## ⚠️ Disclaimer

This project is for educational and testing purposes on Helios Testnet. Do not use in production without thorough security audits.

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the Helios ecosystem**

Complete multi-version DEX implementation providing traders with the best of Uniswap V1 simplicity, V2 reliability, and V3 capital efficiency - all with native HLS support.
