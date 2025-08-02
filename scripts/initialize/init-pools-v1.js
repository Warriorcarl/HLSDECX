const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Initializing Uniswap V1 pools with liquidity...");

    // Load deployment files
    const tokensPath = './deployments/tokens.json';
    const v1Path = './deployments/uniswap-v1.json';
    
    if (!fs.existsSync(tokensPath) || !fs.existsSync(v1Path)) {
        console.error("Required deployment files not found.");
        process.exit(1);
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const v1 = JSON.parse(fs.readFileSync(v1Path, 'utf8'));

    const [deployer] = await hre.ethers.getSigners();
    console.log("Initializing with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "HLS");

    // Token prices in USD (for liquidity calculation)
    const tokenPrices = {
        USDT: 1,
        USDC: 1, 
        DAI: 1,
        BTC: 45000,
        SOL: 100,
        BNB: 300,
        ETH: 2500
    };

    const hlsPriceUSD = 10000; // HLS = $10,000
    const initialLiquidityUSD = 10000; // $10,000 per pool

    const initializedPools = [];

    for (const [symbol, tokenAddress] of Object.entries(tokens)) {
        if (symbol === 'WDEX' || !v1.exchanges[symbol]) continue;

        try {
            console.log(`\nInitializing ${symbol} exchange...`);
            
            const exchangeAddress = v1.exchanges[symbol];
            const exchange = await hre.ethers.getContractAt("UniswapExchange", exchangeAddress);
            const token = await hre.ethers.getContractAt("contracts/tokens/TestUSDT.sol:TestUSDT", tokenAddress);

            // Check if exchange already has liquidity
            const hlsReserve = await exchange.getHlsReserve();
            if (hlsReserve > 0) {
                console.log(`${symbol} exchange already has liquidity, skipping...`);
                continue;
            }

            // Calculate amounts for initial liquidity
            const tokenPrice = tokenPrices[symbol] || 1;
            const hlsAmount = hre.ethers.parseEther((initialLiquidityUSD / hlsPriceUSD).toString());
            
            // Get token decimals
            const decimals = await token.decimals();
            const tokenAmount = hre.ethers.parseUnits(
                (initialLiquidityUSD / tokenPrice).toString(),
                decimals
            );

            console.log(`Adding liquidity: ${hre.ethers.formatEther(hlsAmount)} HLS + ${hre.ethers.formatUnits(tokenAmount, decimals)} ${symbol}`);

            // Mint tokens to deployer if needed
            try {
                const deployerBalance = await token.balanceOf(deployer.address);
                if (deployerBalance < tokenAmount) {
                    console.log(`Minting ${symbol} tokens...`);
                    const mintTx = await token.adminFaucet(deployer.address, tokenAmount);
                    await mintTx.wait();
                }
            } catch (error) {
                console.log(`Could not mint ${symbol} tokens:`, error.message);
                continue;
            }

            // Approve tokens
            console.log(`Approving ${symbol} tokens...`);
            const approveTx = await token.approve(exchangeAddress, tokenAmount);
            await approveTx.wait();

            // Add initial liquidity
            console.log(`Adding initial liquidity to ${symbol} exchange...`);
            const addLiquidityTx = await exchange.addLiquidity(
                1, // minLiquidity (for initial liquidity)
                tokenAmount,
                Math.floor(Date.now() / 1000) + 600, // 10 minute deadline
                { value: hlsAmount }
            );
            await addLiquidityTx.wait();

            // Verify liquidity was added
            const newHlsReserve = await exchange.getHlsReserve();
            const newTokenReserve = await exchange.getTokenReserve();
            
            console.log(`✅ ${symbol} exchange initialized!`);
            console.log(`   HLS Reserve: ${hre.ethers.formatEther(newHlsReserve)}`);
            console.log(`   Token Reserve: ${hre.ethers.formatUnits(newTokenReserve, decimals)}`);

            initializedPools.push({
                symbol,
                token: tokenAddress,
                exchange: exchangeAddress,
                hlsReserve: newHlsReserve.toString(),
                tokenReserve: newTokenReserve.toString(),
                decimals: decimals.toString()
            });

        } catch (error) {
            console.error(`❌ Error initializing ${symbol} exchange:`, error.message);
        }
    }

    // Save initialized pools info
    const poolsPath = './deployments/v1-pools.json';
    fs.writeFileSync(poolsPath, JSON.stringify(initializedPools, null, 2));
    console.log(`\n📄 V1 pools information saved to: ${poolsPath}`);
    console.log(`✅ Initialized ${initializedPools.length} V1 exchanges`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });