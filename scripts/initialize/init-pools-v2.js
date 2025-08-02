const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("Initializing Uniswap V2 pools...");

    // Load deployment addresses
    const tokensPath = './deployments/tokens.json';
    const v2Path = './deployments/uniswap-v2.json';
    
    if (!fs.existsSync(tokensPath) || !fs.existsSync(v2Path)) {
        console.error("Deployment files not found. Please run deployment scripts first.");
        process.exit(1);
    }

    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));

    // Get contracts
    const factory = await hre.ethers.getContractAt("UniswapV2Factory", v2.factory);
    const router = await hre.ethers.getContractAt("UniswapV2Router02", v2.router);
    const wdex = await hre.ethers.getContractAt("WDEX", tokens.WDEX);

    // Get signer
    const [deployer] = await hre.ethers.getSigners();
    console.log("Initializing pools with account:", deployer.address);

    // Token prices in USD (for calculating initial liquidity)
    const tokenPrices = {
        USDT: 1,
        USDC: 1,
        DAI: 1,
        BTC: 45000,
        SOL: 100,
        BNB: 300,
        ETH: 2500
    };

    const hlsPrice = 10000; // HLS = $10,000

    // Create pairs and add initial liquidity
    const pairs = [];
    const tokenSymbols = Object.keys(tokenPrices);

    for (const symbol of tokenSymbols) {
        console.log(`\n--- Setting up ${symbol}/WDEX pair ---`);
        
        const tokenAddress = tokens[symbol];
        const token = await hre.ethers.getContractAt("BaseTestToken", tokenAddress);
        
        // Check if pair already exists
        const existingPair = await factory.getPair(tokenAddress, tokens.WDEX);
        let pairAddress;
        
        if (existingPair === "0x0000000000000000000000000000000000000000") {
            // Create pair
            console.log(`Creating ${symbol}/WDEX pair...`);
            const tx = await factory.createPair(tokenAddress, tokens.WDEX);
            await tx.wait();
            pairAddress = await factory.getPair(tokenAddress, tokens.WDEX);
            console.log(`${symbol}/WDEX pair created at:`, pairAddress);
        } else {
            pairAddress = existingPair;
            console.log(`${symbol}/WDEX pair already exists at:`, pairAddress);
        }

        // Calculate initial liquidity amounts
        // We'll add $100,000 worth of liquidity for each pair
        const liquidityValueUSD = 100000;
        const hlsAmount = hre.ethers.parseEther((liquidityValueUSD / 2 / hlsPrice).toString()); // $50k worth of HLS
        
        // Get token decimals
        const tokenDecimalsBN = await token.decimals();
        const tokenDecimals = Number(tokenDecimalsBN);
        const tokenPrice = tokenPrices[symbol];
        const tokenAmount = hre.ethers.parseUnits(
            (liquidityValueUSD / 2 / tokenPrice).toString(),
            tokenDecimals
        ); // $50k worth of token

        console.log(`HLS amount: ${hre.ethers.formatEther(hlsAmount)} HLS`);
        console.log(`${symbol} amount: ${hre.ethers.formatUnits(tokenAmount, tokenDecimals)} ${symbol}`);

        // Check balances
        const hlsBalance = await hre.ethers.provider.getBalance(deployer.address);
        const tokenBalance = await token.balanceOf(deployer.address);

        console.log(`Deployer HLS balance: ${hre.ethers.formatEther(hlsBalance)}`);
        console.log(`Deployer ${symbol} balance: ${hre.ethers.formatUnits(tokenBalance, tokenDecimals)}`);

        if (hlsBalance < hlsAmount) {
            console.log(`Warning: Insufficient HLS balance for ${symbol} pair`);
            continue;
        }

        if (tokenBalance < tokenAmount) {
            console.log(`Minting additional ${symbol} tokens...`);
            const mintTx = await token.adminFaucet(deployer.address, tokenAmount);
            await mintTx.wait();
        }

        // Approve token for router
        console.log(`Approving ${symbol} for router...`);
        const approveTx = await token.approve(v2.router, tokenAmount);
        await approveTx.wait();

        // Add liquidity
        console.log(`Adding liquidity to ${symbol}/WDEX pair...`);
        try {
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            
            const addLiquidityTx = await router.addLiquidityETH(
                tokenAddress,
                tokenAmount,
                0, // amountTokenMin
                0, // amountETHMin
                deployer.address,
                deadline,
                { value: hlsAmount }
            );
            
            const receipt = await addLiquidityTx.wait();
            console.log(`Liquidity added successfully. Gas used: ${receipt.gasUsed}`);

            // Get pair info
            const pair = await hre.ethers.getContractAt("UniswapV2Pair", pairAddress);
            const reserves = await pair.getReserves();
            const totalSupply = await pair.totalSupply();
            
            console.log(`Total LP tokens: ${hre.ethers.formatEther(totalSupply)}`);
            console.log(`Reserves - Token0: ${reserves[0]}, Token1: ${reserves[1]}`);

            pairs.push({
                symbol: symbol,
                token: tokenAddress,
                pair: pairAddress,
                reserves: {
                    reserve0: reserves[0].toString(),
                    reserve1: reserves[1].toString()
                },
                totalSupply: totalSupply.toString()
            });

        } catch (error) {
            console.error(`Error adding liquidity for ${symbol}:`, error.message);
        }
    }

    // Save pair information
    const pairsPath = './deployments/pairs.json';
    fs.writeFileSync(pairsPath, JSON.stringify(pairs, null, 2));
    console.log("\nPair information saved to:", pairsPath);
    
    console.log("\n=== Pool Initialization Complete ===");
    console.log(`Total pairs created: ${pairs.length}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });